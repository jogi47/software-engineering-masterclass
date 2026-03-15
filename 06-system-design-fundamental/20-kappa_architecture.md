# Kappa Architecture

[← Back to Index](README.md)

Imagine you are building a fraud detection and operational analytics pipeline for a payments platform. Risk analysts want alerts within seconds. Data engineering wants one processing model they can debug. Compliance wants a reproducible answer when someone asks why an alert fired yesterday.

Without a replayable streaming architecture, teams often split the world into separate "live" and "historical" code paths:

```typescript
// Bad example: real-time updates and historical rebuilds use different logic.
class FraudMetricsService {
  private liveTotals = new Map<string, number>();

  processLiveEvent(userId: string, amountCents: number): void {
    this.liveTotals.set(userId, (this.liveTotals.get(userId) ?? 0) + amountCents);
  }

  rebuildHistoricalTotals(rows: Array<{ userId: string; amountCents: number }>): Map<string, number> {
    const totals = new Map<string, number>();

    for (const row of rows) {
      totals.set(row.userId, (totals.get(row.userId) ?? 0) + row.amountCents);
    }

    return totals;
  }
}
```

This usually breaks in familiar ways:
- the live path and rebuild path drift apart
- late or duplicate events are handled differently in each path
- fixing a bug requires touching multiple pipelines
- operators stop trusting whether "real-time" and "correct" mean the same thing

This is where **Kappa Architecture** comes in. Kappa uses a **single primary stream-processing model** backed by a replayable event log. Instead of maintaining separate batch and speed implementations, you keep an append-only log, materialize views from that log, and reprocess history by replaying the same stream through the same logical pipeline.

In this chapter, you will learn:
  * [What problem Kappa Architecture solves](#1-the-problem-kappa-architecture-solves)
  * [What Kappa Architecture is and what it is not](#2-what-kappa-architecture-is)
  * [Why the event log is the foundation](#3-the-event-log-as-the-system-backbone)
  * [How data flows through a Kappa-style system](#4-end-to-end-data-flow)
  * [How state, checkpoints, and materialized views work](#5-state-checkpoints-and-materialized-views)
  * [How replay and reprocessing correct history](#6-replay-reprocessing-and-corrections)
  * [How Kappa compares with Lambda Architecture](#7-kappa-vs-lambda-architecture)
  * [What practical TypeScript and storage patterns look like](#8-practical-typescript-and-storage-patterns)
  * [Which best practices prevent common failures](#9-best-practices-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. The Problem Kappa Architecture Solves

Kappa Architecture is meant for systems that need:
- continuous event processing
- low-latency derived views or decisions
- a way to rebuild those views when logic changes or data is corrected

The main problem is not just scale. It is **operational duplication**.

### The Common Failure Mode

Many teams accidentally build this:

```text
Events arrive now
  -> stream job updates dashboards and alerts

Historical fixes arrive later
  -> separate batch job recomputes reports

Result
  -> two code paths
  -> two correctness models
  -> two operational runbooks
```

That split can be justified in some environments, but it often introduces:
- duplicated business logic
- inconsistent treatment of late events
- longer release cycles for data logic changes
- harder debugging because live and rebuild results come from different implementations

### The Core Kappa Idea

Kappa tries to simplify the architecture:

```text
Append-only event log
  -> one primary stream-processing path
  -> materialized outputs and state
  -> replay the log when you need to rebuild
```

The durable idea is simple: if the event log is retained and replayable, the same processing model can handle both fresh events and historical reprocessing.

### Where This Matters

Typical Kappa-style use cases include:
- fraud and anomaly detection
- clickstream and product analytics
- IoT telemetry aggregation
- order and inventory event pipelines
- operational metrics derived from event streams

Kappa is strongest when the business logic is naturally event-oriented and the system of record can be represented as a durable log of changes.


# 2. What Kappa Architecture Is

Kappa Architecture is an architectural pattern where a replayable event log is the source of truth and stream processing is the primary mechanism for both:
- processing newly arrived events
- rebuilding derived state by replaying historical events

### A Conservative Definition

The durable pattern is:

```text
Kappa = replayable event log + primary streaming pipeline + materialized views/state
```

This definition is intentionally conservative. Kappa does not mean:
- "no scheduled jobs ever"
- "no offline storage exists"
- "all processing must happen in one tool"

It means the **main business transformation logic** is expressed once in a streaming model and reused for replay whenever practical.

### What Kappa Usually Includes

A practical Kappa-style system often has:
- an append-only event log
- producers that publish immutable events
- stream processors that read partitions in order
- state stores or materialized views
- checkpoints or consumer offsets
- replay procedures for backfills and bug fixes

### What It Is Not

Kappa is usually not:
- a replacement for OLTP databases
- a guarantee that replay is cheap for arbitrarily long history
- a reason to ignore data modeling, idempotency, or retention strategy

### High-Level Model

```text
┌────────────────────┐
│ Producers          │
│ apps, services, CDC│
└─────────┬──────────┘
          ▼
┌────────────────────┐
│ Event log          │
│ ordered partitions │
│ replayable history │
└─────────┬──────────┘
          ▼
┌────────────────────┐
│ Stream processor   │
│ transforms + state │
└─────────┬──────────┘
          ▼
┌────────────────────┐
│ Materialized views │
│ alerts, search, BI │
└────────────────────┘
```


# 3. The Event Log as the System Backbone

Kappa depends on one design choice more than any other: the event log must be durable enough to replay and rich enough to rebuild useful state.

### Why the Log Matters

If you cannot replay history, Kappa becomes fragile. Replay is how you:
- rebuild state after corruption
- apply corrected logic to old events
- recover new downstream views without reimplementing transformations elsewhere

### Properties the Log Usually Needs

Useful event logs typically provide:
- append-only writes
- stable event identifiers
- ordering within a partition or key
- retention long enough for operational replay needs
- timestamps for both event time and ingestion time

### Immutable Event Design

Kappa works best when events describe facts or state changes without mutating old records in place.

```typescript
type OrderEvent = {
  eventId: string;
  orderId: string;
  customerId: string;
  eventType: "order_created" | "order_paid" | "order_cancelled";
  amountCents: number;
  eventTimeMs: number;
  ingestedAtMs: number;
};
```

Useful rules:
- keep identifiers stable
- avoid overwriting old events
- represent corrections as new events or controlled replay procedures

### Log-Centric Mental Model

```text
Current state is not the source of truth.

Source of truth:
  ordered history of events

Derived from history:
  caches
  aggregates
  alerts
  search indexes
  read models
```

That mental model is what makes replay operationally meaningful.


# 4. End-to-End Data Flow

Kappa becomes clearer when you trace one event from production to materialized output.

### Step-by-Step Flow

```text
1. A service emits an immutable event
2. The event is appended to the log
3. A stream processor reads the event in order
4. The processor updates state and emits derived records
5. Materialized views are updated
6. Consumers query those views
7. If logic changes, the system replays the log through the same processor
```

### Example Architecture

```text
┌──────────────┐    ┌──────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Checkout App │ -> │ Event Log    │ -> │ Stream Processor│ -> │ Fraud Score View │
└──────────────┘    └──────────────┘    └─────────────────┘    └─────────────────┘
                           │                      │
                           │                      └──────────────┐
                           ▼                                     ▼
                    ┌──────────────┐                      ┌─────────────────┐
                    │ Replay Input │                      │ Alerting Output │
                    └──────────────┘                      └─────────────────┘
```

### TypeScript Example: A Simple Processor

```typescript
type PaymentEvent = {
  eventId: string;
  userId: string;
  amountCents: number;
  eventType: "payment_captured" | "payment_refunded";
  eventTimeMs: number;
};

class RiskScoreProjector {
  private readonly scoreByUser = new Map<string, number>();

  apply(event: PaymentEvent): void {
    const currentScore = this.scoreByUser.get(event.userId) ?? 0;

    if (event.eventType === "payment_captured" && event.amountCents > 50_000) {
      this.scoreByUser.set(event.userId, currentScore + 25);
      return;
    }

    if (event.eventType === "payment_refunded") {
      this.scoreByUser.set(event.userId, Math.max(0, currentScore - 10));
    }
  }

  getScore(userId: string): number {
    return this.scoreByUser.get(userId) ?? 0;
  }
}
```

The same `apply` logic can process:
- events arriving now
- events replayed from last week
- events copied into a new downstream projection


# 5. State, Checkpoints, and Materialized Views

Most useful Kappa systems are stateful. They do more than stateless transforms.

### Why State Matters

You often need state for:
- counters and rolling aggregates
- fraud rules
- deduplication
- joins against reference data
- sessionization or time windows

### Core Runtime Concepts

```text
Input partitions
  -> processor reads ordered events
  -> updates local or remote state
  -> periodically checkpoints progress
  -> publishes derived output
```

Three concepts should stay separate:
- **state**: the current derived data for computation
- **checkpoint**: how far a processor has consumed
- **materialized view**: the external representation that readers query

### TypeScript Example: Checkpointed Processing

```typescript
type OffsetCheckpoint = {
  partition: number;
  offset: number;
};

class DeduplicatingProjector {
  private readonly totals = new Map<string, number>();
  private readonly seenEventIds = new Set<string>();
  private checkpoint: OffsetCheckpoint = { partition: 0, offset: -1 };

  apply(event: PaymentEvent, checkpoint: OffsetCheckpoint): void {
    if (this.seenEventIds.has(event.eventId)) {
      this.checkpoint = checkpoint;
      return;
    }

    this.seenEventIds.add(event.eventId);

    const next = (this.totals.get(event.userId) ?? 0) + event.amountCents;
    this.totals.set(event.userId, next);
    this.checkpoint = checkpoint;
  }

  snapshot(): { totals: Map<string, number>; checkpoint: OffsetCheckpoint } {
    return {
      totals: new Map(this.totals),
      checkpoint: { ...this.checkpoint },
    };
  }
}
```

This example keeps everything in memory for clarity. Real systems usually persist state, checkpoints, or both.

### Delivery Semantics Need Careful Wording

Teams often want "exactly once." In practice, what you can reliably achieve depends on the log, processor, sinks, and failure mode.

It is safer to reason in terms of:
- idempotent handlers
- deterministic replay
- transactional or atomic sink updates where available
- recovery procedures that can be tested


# 6. Replay, Reprocessing, and Corrections

Replay is the defining operational move in Kappa Architecture.

### Why Replay Exists

You replay when:
- processor logic changes
- a bug produced bad output
- a new materialized view needs to be built
- historical data was corrected upstream

### Replay Flow

```text
Historical log
  -> start processor from earlier offset or from zero
  -> rebuild state and outputs
  -> validate new results
  -> cut readers over to rebuilt views
```

### TypeScript Example: Rebuild from a Retained Log

```typescript
function rebuildRiskScores(events: PaymentEvent[]): Map<string, number> {
  const projector = new RiskScoreProjector();

  for (const event of events) {
    projector.apply(event);
  }

  const results = new Map<string, number>();

  for (const event of events) {
    results.set(event.userId, projector.getScore(event.userId));
  }

  return results;
}
```

### Reprocessing Usually Needs Isolation

Replaying into the same output tables that production readers use can be risky. Many teams rebuild into:
- versioned output topics
- shadow tables
- temporary indexes
- new snapshot paths

Then they validate and cut over.

### Late Events and Historical Corrections

Kappa does not make messy data disappear. You still need a policy for:
- late arrival
- duplicate delivery
- out-of-order events
- schema changes across retained history

A common conservative pattern is:

```text
immutable event history
  + stable IDs
  + explicit versioning
  + replay tested in staging
```

That combination reduces surprises when you need to rebuild.


# 7. Kappa vs Lambda Architecture

Kappa is often discussed as an alternative to Lambda Architecture, so the comparison needs to be precise.

### The Main Difference

```text
Lambda:
  batch path + speed path + serving merge

Kappa:
  one primary streaming path + replay for historical rebuild
```

### Comparison Table

```text
┌────────────────────┬────────────────────────────────────────────┬────────────────────────────────────────────┐
│ Dimension          │ Lambda Architecture                        │ Kappa Architecture                         │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Main processing    │ Separate batch and speed paths             │ Single primary stream path                 │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Historical rebuild │ Batch recomputation                        │ Replay the retained log                    │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Logic duplication  │ Usually higher                             │ Usually lower                              │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Operational risk   │ Merge consistency between layers           │ Replay cost and state management           │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Good fit           │ Dual freshness/correction model            │ Event-centric unified processing           │
└────────────────────┴────────────────────────────────────────────┴────────────────────────────────────────────┘
```

### Where Kappa Fits Well

Kappa is often a reasonable fit when:
- your source data is already event-driven
- retained log replay is operationally feasible
- the same logic can sensibly process both new and historical events
- reducing duplicated pipelines matters more than optimizing huge offline recomputations

### Where Kappa Is a Weak Fit

Kappa is often a poor fit when:
- replaying long history would be prohibitively slow or expensive
- core transformations depend on large offline joins better handled in batch systems
- source history is incomplete or retention is too short
- the team cannot operate stateful streaming reliably

### Conservative Design Advice

Kappa is not "more modern therefore better." It is a good choice when unified streaming and replay reduce more complexity than they create.

If your workload is dominated by large bounded recomputations, a batch-oriented design may still be the simpler answer.


# 8. Practical TypeScript and Storage Patterns

Kappa becomes easier to operate when the code contracts and storage boundaries are explicit.

### Pattern 1: Version Event Schemas

```typescript
type VersionedEvent<TPayload> = {
  eventId: string;
  aggregateId: string;
  schemaVersion: number;
  eventType: string;
  eventTimeMs: number;
  payload: TPayload;
};
```

Useful rules:
- add fields compatibly when possible
- keep deserialization logic version-aware
- test replay across older schema versions

### Pattern 2: Persist Replayable Offsets and Output Versions

```typescript
type ProjectionMetadata = {
  projectionName: string;
  sourceTopic: string;
  builtFromOffset: number;
  builtAtMs: number;
  outputVersion: string;
};
```

This helps answer:
- what history was consumed
- which output readers should trust
- whether a rebuild is complete

### Pattern 3: Keep Raw Log, State, and Query Views Separate

```text
data-platform/
├── event-log/
│   └── payments/partition=0/...
├── processor-state/
│   └── risk-score-projector/...
└── materialized-views/
    ├── risk_scores/version=v3/...
    └── alerts/version=v2/...
```

That separation helps with:
- safe rebuilds
- rollback and cutover
- debugging where corruption entered the pipeline

### Pattern 4: Store Checkpoints Explicitly

```sql
CREATE TABLE projection_checkpoints (
    projection_name VARCHAR(128) NOT NULL,
    partition_id INTEGER NOT NULL,
    last_processed_offset BIGINT NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    PRIMARY KEY (projection_name, partition_id)
);
```

Even if your streaming platform stores offsets elsewhere, making checkpoint ownership explicit improves operational clarity.

### Pattern 5: Prefer Deterministic Projection Functions

```typescript
function projectNetRevenue(
  currentCents: number,
  event: PaymentEvent,
): number {
  if (event.eventType === "payment_captured") {
    return currentCents + event.amountCents;
  }

  if (event.eventType === "payment_refunded") {
    return currentCents - event.amountCents;
  }

  return currentCents;
}
```

Projection logic is easier to replay safely when it is:
- deterministic
- explicit about ordering assumptions
- idempotent where possible
- isolated from side effects


# 9. Best Practices and Common Pitfalls

Kappa simplifies one part of the architecture, but it does not eliminate distributed-systems failure modes.

### Good Practices

```text
Good:
├── retain enough log history for realistic replay needs
├── design events with stable IDs and schema evolution in mind
├── rebuild outputs in isolation before cutover
├── separate processing state from reader-facing views
└── test replay, duplication, and out-of-order scenarios
```

### Common Pitfalls

```text
Bad:
├── assuming replay is always cheap
├── deleting history before the business replay window closes
├── mixing side effects directly into projection logic
├── relying on in-memory deduplication only
└── treating "exactly once" as a property you get automatically
```

### Operational Failure Cases to Plan For

- processor restarts mid-partition
- sink updates succeed but checkpoints do not
- schema evolution breaks older retained events
- replay produces different results because logic uses wall-clock time
- backfills overload downstream readers or alerting systems

### Real-World Implementation Notes

Many Kappa-style systems are built on:
- durable logs such as Kafka-compatible event streams or cloud-managed equivalents
- stateful stream processors
- compacted topics, key-value stores, analytical databases, or search indexes for views

The exact product mix matters less than these durable properties:
- replayable history
- explicit offsets or checkpoints
- deterministic projection logic
- controlled output cutover


# 10. Summary

**Kappa Architecture keeps one primary processing model centered on a replayable event log:**
- new events and historical rebuilds flow through the same logical pipeline
- materialized views are derived from retained history
- replay replaces much of the duplicated batch-versus-stream logic found in more split architectures

**The main benefit is architectural simplification where the workload is naturally event-driven:**
- less duplicated transformation logic
- clearer replay and recovery story
- easier alignment between live processing and rebuilds

**The main cost is that streaming correctness and replay operations become first-class engineering concerns:**
- state management must be durable and testable
- retention and schema evolution must support replay
- rebuilds need safe cutover procedures

**Implementation checklist:**

```text
Event model:
  □ Store source changes as immutable, replayable events
  □ Keep stable event IDs for deduplication and audit
  □ Preserve event time, ingestion time, and schema version

Log and replay:
  □ Retain history long enough for realistic rebuild windows
  □ Define when to replay from zero versus from a checkpoint
  □ Test replay against older event versions before production cutover

Processing:
  □ Keep projection logic deterministic and isolated from side effects
  □ Persist checkpoints and recovery metadata explicitly
  □ Decide how duplicates, out-of-order events, and late events are handled

Outputs:
  □ Materialize reader-facing views separately from processor state
  □ Rebuild into versioned outputs or shadow tables before cutover
  □ Document which projections are safe to recompute and how long it takes

Operations:
  □ Monitor lag, replay duration, checkpoint health, and sink consistency
  □ Rehearse bug-fix rebuilds in staging
  □ Re-evaluate whether Kappa remains the simplest fit as workload shape changes
```
