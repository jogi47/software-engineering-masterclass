# Lambda Architecture

[← Back to Index](README.md)

Imagine you are building a payments analytics platform. Operations wants a live dashboard that updates within seconds. Finance wants end-of-day revenue numbers that can survive retries, late events, and historical corrections. Compliance wants a reproducible answer two weeks later when someone asks why a number changed.

If you force one pipeline to do everything, you usually create a bad compromise:

```typescript
// Bad example: only keep an in-memory real-time total.
// It is fast, but a restart, duplicate event, or late event can corrupt the answer.
class LiveRevenueOnly {
  private totalCents = 0;

  process(amountCents: number): void {
    this.totalCents += amountCents;
  }

  getTotal(): number {
    return this.totalCents;
  }
}
```

This looks simple until:
- the process restarts and loses state
- an event arrives twice and gets counted twice
- a payment created at `10:01` arrives at `10:07`
- you need to recompute last week after fixing a bug

This is where **Lambda Architecture** comes in. It keeps a **batch layer** for recomputing correct views from immutable history, a **speed layer** for low-latency updates, and a **serving layer** that combines them for queries. The trade-off is deliberate: you get fast answers and eventually corrected answers, but you also accept more system complexity.

In this chapter, you will learn:
  * [What problem Lambda Architecture solves](#1-what-lambda-architecture-solves)
  * [How the three layers fit together](#2-the-three-layers)
  * [What the batch layer is responsible for](#3-the-batch-layer)
  * [What the speed layer is responsible for](#4-the-speed-layer)
  * [How the serving layer merges results](#5-the-serving-layer)
  * [How data flows end to end through the architecture](#6-end-to-end-data-flow)
  * [How late events, duplicates, and recomputation are handled](#7-corrections-recomputation-and-consistency)
  * [What practical implementation patterns look like](#8-practical-typescript-and-storage-patterns)
  * [When Lambda Architecture is and is not a good fit](#9-trade-offs-and-when-to-use-it)
  * [What to keep on your implementation checklist](#10-summary)


# 1. What Lambda Architecture Solves

Lambda Architecture exists for workloads that need both:
- low-latency answers from continuously arriving data
- a path to correct or recompute those answers from full historical data

Classic examples include:
- transaction dashboards
- fraud and anomaly metrics
- ad impression and click analytics
- IoT telemetry rollups
- user activity counters

### The Core Tension

If you optimize only for latency, you often accept approximate or incomplete results.

If you optimize only for correctness, the answers often arrive too late to drive operations.

```text
Fast but fragile:
  stream updates a dashboard immediately
  -> duplicates or late events may distort the number

Accurate but slow:
  nightly batch recomputes the truth
  -> operators cannot act on stale information
```

### The Lambda Idea

Instead of picking one side, Lambda separates responsibilities:

```text
Immutable event history
  -> batch layer computes accurate historical views
  -> speed layer computes recent low-latency views
  -> serving layer combines them for reads
```

The system is intentionally redundant. The same logical outcome is produced through two paths:
- one optimized for correctness and replay
- one optimized for freshness

That duplication is the main benefit and the main cost.


# 2. The Three Layers

Lambda Architecture is usually explained through three layers:
- batch
- speed
- serving

### High-Level Diagram

```text
                         immutable event log
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
              ▼                                   ▼
      ┌────────────────┐                  ┌────────────────┐
      │ Batch layer    │                  │ Speed layer    │
      │ recompute from │                  │ process recent │
      │ full history   │                  │ events now     │
      └──────┬─────────┘                  └──────┬─────────┘
             │                                   │
             ▼                                   ▼
      batch views / snapshots              real-time views
              └─────────────────┬─────────────────┘
                                ▼
                        ┌──────────────┐
                        │ Serving layer│
                        │ merged query │
                        └──────────────┘
```

### Why the Input Should Be Immutable

The model works best when the source is an append-only event log or some other replayable source of truth.

That matters because:
- batch recomputation depends on reading the same history again
- corrections should be represented as new events or controlled rewrites
- auditability is easier when old input is preserved

### What Each Layer Optimizes For

```text
┌────────────────┬───────────────────────────────────────────────┐
│ Layer          │ Primary goal                                  │
├────────────────┼───────────────────────────────────────────────┤
│ Batch          │ correctness, replay, full historical context  │
├────────────────┼───────────────────────────────────────────────┤
│ Speed          │ low-latency updates on recent data            │
├────────────────┼───────────────────────────────────────────────┤
│ Serving        │ stable query interface over both results      │
└────────────────┴───────────────────────────────────────────────┘
```

### A Conservative Reading

Lambda is a pattern, not one product. Different teams implement it with different tools:
- files plus scheduled batch jobs
- message logs plus stream processors
- serving databases, warehouses, or search indexes

The durable concept is the split in responsibilities, not a specific vendor stack.


# 3. The Batch Layer

The batch layer stores the master dataset and periodically recomputes views from that dataset.

### Responsibilities

The batch layer usually handles:
- retaining full historical input
- computing authoritative aggregates
- backfills after code changes
- rebuilding views after corruption or data fixes
- publishing versioned or timestamped snapshots

### Why Batch Still Matters

A batch layer gives you a recovery path.

If the speed layer:
- misses events
- double-counts records
- applies a buggy transformation

the batch layer can rebuild the correct answer from source history.

### Batch Output Model

```text
Raw immutable events
  -> periodic recomputation
  -> authoritative batch view
  -> publish snapshot version
```

### TypeScript Example: Recompute Hourly Revenue

```typescript
type PaymentEvent = {
  paymentId: string;
  merchantId: string;
  amountCents: number;
  eventTimeMs: number;
  status: "authorized" | "captured" | "refunded";
};

type HourlyRevenueRow = {
  merchantId: string;
  hourBucketMs: number;
  netRevenueCents: number;
};

function recomputeHourlyRevenue(events: PaymentEvent[]): HourlyRevenueRow[] {
  const totals = new Map<string, number>();

  for (const event of events) {
    if (event.status !== "captured") {
      continue;
    }

    const hourBucketMs =
      Math.floor(event.eventTimeMs / 3_600_000) * 3_600_000;
    const key = `${event.merchantId}:${hourBucketMs}`;

    totals.set(key, (totals.get(key) ?? 0) + event.amountCents);
  }

  return [...totals.entries()].map(([key, netRevenueCents]) => {
    const [merchantId, hourBucketMs] = key.split(":");

    return {
      merchantId,
      hourBucketMs: Number(hourBucketMs),
      netRevenueCents,
    };
  });
}
```

This is intentionally simple. Real batch pipelines also handle:
- partitioning
- deduplication
- checkpointed inputs
- output versioning
- schema enforcement

### Operational Pattern

A common publication flow is:
1. read a bounded time range or the full source history
2. compute a new batch view offline
3. validate the output
4. atomically publish the new snapshot

That publication step matters because readers should not see half-written batch results.


# 4. The Speed Layer

The speed layer processes newly arrived events immediately so the system can answer fresh queries before the next batch recomputation finishes.

### Responsibilities

The speed layer usually handles:
- ingesting new events continuously
- maintaining recent aggregates
- pushing low-latency updates to dashboards or alerts
- covering the freshness gap between batch runs

### Why It Exists

If the batch layer updates every hour, then every query is otherwise up to one hour stale.

The speed layer closes that gap:

```text
Batch layer covers:
  historical data up to last published snapshot

Speed layer covers:
  events since the last snapshot
```

### TypeScript Example: Maintain Recent Deltas

```typescript
type RevenueDelta = {
  merchantId: string;
  hourBucketMs: number;
  deltaCents: number;
};

class SpeedRevenueView {
  private readonly deltas = new Map<string, number>();

  apply(event: PaymentEvent): void {
    if (event.status !== "captured") {
      return;
    }

    const hourBucketMs =
      Math.floor(event.eventTimeMs / 3_600_000) * 3_600_000;
    const key = `${event.merchantId}:${hourBucketMs}`;

    this.deltas.set(key, (this.deltas.get(key) ?? 0) + event.amountCents);
  }

  getDelta(view: RevenueDelta): number {
    const key = `${view.merchantId}:${view.hourBucketMs}`;
    return this.deltas.get(key) ?? 0;
  }

  resetCoveredByBatch(cutoffMs: number): void {
    for (const key of this.deltas.keys()) {
      const [, hourBucketMs] = key.split(":");
      if (Number(hourBucketMs) < cutoffMs) {
        this.deltas.delete(key);
      }
    }
  }
}
```

### Why the Speed Layer Is Harder

It must make fast state updates while handling:
- duplicate delivery
- out-of-order arrival
- recovery after crash
- expiration of stale recent state

This is why the speed layer is often the operationally hardest part of Lambda.


# 5. The Serving Layer

The serving layer presents a queryable result by combining the authoritative batch view with the recent speed-layer view.

### Merge Model

The usual rule is:

```text
final answer = batch view + speed-layer delta
```

The exact merge logic depends on the metric:
- sums may add batch totals and recent deltas
- distinct counts may need more careful state
- top-N rankings may require re-ranking after merge

### Query Path Diagram

```text
Query
  -> read last stable batch snapshot
  -> read recent speed-layer updates
  -> merge into one answer
  -> return response
```

### TypeScript Example: Merge Batch and Speed Results

```typescript
type BatchRevenueSnapshot = Map<string, number>;
type SpeedRevenueSnapshot = Map<string, number>;

function queryRevenue(
  batchView: BatchRevenueSnapshot,
  speedView: SpeedRevenueSnapshot,
  merchantId: string,
  hourBucketMs: number,
): number {
  const key = `${merchantId}:${hourBucketMs}`;

  return (batchView.get(key) ?? 0) + (speedView.get(key) ?? 0);
}
```

### Serving Layer Requirements

A practical serving layer often needs:
- a clear snapshot boundary
- predictable merge semantics
- cache invalidation rules
- query latency controls
- a way to drop speed-layer state after batch catches up

### Common Serving Stores

Teams often materialize serving views into:
- key-value stores
- analytical databases
- search indexes
- OLAP engines

The choice depends on query shape. The architecture pattern stays similar.


# 6. End-to-End Data Flow

To understand Lambda well, it helps to walk through one event from ingestion to corrected query result.

### Step-by-Step Flow

```text
1. Payment captured event arrives
2. Event is appended to immutable log
3. Speed layer updates recent aggregate immediately
4. User query sees batch snapshot + speed delta
5. Scheduled batch job later recomputes authoritative view
6. New batch snapshot is published
7. Speed-layer entries now covered by batch are removed
```

### Example Timeline

```text
10:00 batch snapshot published for data <= 09:59
10:02 payment event for $25 arrives
10:02 speed layer adds +2500 cents
10:03 dashboard query returns batch total + 2500
11:00 batch recomputes data through 10:59
11:01 serving layer can drop the 10:02 delta from speed state
```

### Why the Cutoff Boundary Matters

Every Lambda implementation needs a precise statement of what the current batch view covers.

For example:

```text
Batch snapshot version 42 covers event_time < 2026-03-15T11:00:00Z
Speed layer covers event_time >= 2026-03-15T11:00:00Z
```

Without that boundary, you risk:
- double-counting events included in both layers
- missing events included in neither layer

### A Small Snapshot Contract

```typescript
type PublishedBatchView = {
  snapshotVersion: number;
  coversEventsBeforeMs: number;
  totals: Map<string, number>;
};

function isCoveredByBatch(
  view: PublishedBatchView,
  eventTimeMs: number,
): boolean {
  return eventTimeMs < view.coversEventsBeforeMs;
}
```

This contract is simple, but it prevents many serving bugs.


# 7. Corrections, Recomputation, and Consistency

The real difficulty in Lambda is not the diagram. It is keeping the layers logically aligned when reality is messy.

### Late Events

An event may occur at `10:01` and arrive at `10:07`.

If the batch layer has not yet published that time range, the speed layer can still include it.

If the batch layer already published that time range, you need a policy:
- push a correction into the speed layer
- rerun the affected batch partition
- accept bounded temporary inconsistency until the next batch

### Duplicate Events

At-least-once delivery is common in distributed systems, so both layers should have a deduplication strategy.

```typescript
class Deduper {
  private readonly seenIds = new Set<string>();

  shouldApply(eventId: string): boolean {
    if (this.seenIds.has(eventId)) {
      return false;
    }

    this.seenIds.add(eventId);
    return true;
  }
}
```

A production system usually persists this state or uses idempotent writes instead of a process-local set.

### Recomputing After a Bug

Suppose a revenue job accidentally excluded one merchant class for three days.

The Lambda recovery pattern is:
1. fix the transformation logic
2. replay or rescan the affected source history
3. publish corrected batch views
4. realign the speed layer cutoff with the new snapshot

### Eventual Consistency Is Part of the Model

Lambda often gives you:
- low-latency provisional answers now
- corrected authoritative answers later

That means readers and stakeholders need to know which metrics are:
- real-time and still subject to correction
- finalized after batch publication

### A Useful Mental Model

```text
Speed layer:
  recent, low-latency, may be corrected

Batch layer:
  slower, authoritative, replayable
```

If your business cannot tolerate even short-lived inconsistency, Lambda may not be the right answer for that specific read path.


# 8. Practical TypeScript and Storage Patterns

The pattern is easier to operate when the storage model and code contracts are explicit.

### Pattern 1: Keep an Immutable Event Contract

```typescript
type LedgerEvent = {
  eventId: string;
  aggregateId: string;
  eventType: "payment_captured" | "payment_refunded";
  amountCents: number;
  eventTimeMs: number;
  ingestedAtMs: number;
};
```

Useful rules:
- never mutate an old event in place
- represent corrections as new events or controlled batch rewrites
- keep both event time and ingestion time

### Pattern 2: Publish Batch Views with Versioned Metadata

```typescript
type MaterializedViewMetadata = {
  name: string;
  snapshotVersion: number;
  coversEventsBeforeMs: number;
  createdAtMs: number;
};
```

This makes serving logic and rollback logic much clearer.

### Pattern 3: Separate Raw, Batch, and Serving Storage

```text
data-platform/
├── raw-events/
│   └── dt=2026-03-15/...
├── batch-views/
│   └── revenue_hourly/snapshot=42/...
└── serving/
    ├── batch-pointer.json
    └── speed-deltas/...
```

This separation helps with:
- replaying from raw history
- publishing new snapshots safely
- diagnosing whether an error came from input, batch compute, or serving merge

### Pattern 4: Use Batch-Friendly Schemas for Rebuilds

For the batch layer, it is often useful to store events with:
- stable identifiers
- event time
- partition fields such as day or hour
- fields needed for deterministic recomputation

### Pattern 5: Materialize Simple Serving Shapes

Lambda is easiest when the serving merge is simple.

Examples:
- counters by hour
- totals by merchant
- rolling aggregates with explicit time buckets

It becomes harder for:
- exact distinct counts
- complex joins over rapidly changing entities
- interactive queries that merge too many dimensions on the fly

### Example SQL Shape for a Batch View

```sql
CREATE TABLE revenue_hourly_batch (
  merchant_id VARCHAR(64) NOT NULL,
  hour_bucket TIMESTAMP NOT NULL,
  net_revenue_cents BIGINT NOT NULL,
  snapshot_version BIGINT NOT NULL
);
```

The exact serving database varies, so uniqueness may be enforced by the pipeline, the table format, or the storage engine. The important part is keeping version and coverage metadata explicit.


# 9. Trade-Offs and When to Use It

Lambda Architecture is useful, but it is not the default answer for every data system.

### Where It Fits Well

Lambda is often a reasonable fit when:
- you need second-level freshness and periodic authoritative correction
- you have replayable source history
- batch recomputation is part of your operational model
- the business understands provisional vs finalized numbers

### Where It Is Often Too Expensive

It is often a poor fit when:
- one consistent pipeline can already meet latency needs
- dual implementations would create too much maintenance burden
- the team cannot reliably operate both streaming and batch systems
- the query logic is too complex to merge cleanly in the serving layer

### Lambda vs Simpler Modern Alternatives

Many teams now prefer a unified stream processor with durable state and replay support, sometimes called a Kappa-style approach.

```text
Lambda:
  batch path + speed path + serving merge

Unified streaming approach:
  one main processing path with replay, backfill, and state recovery
```

A unified approach can reduce duplicated business logic, but it does not automatically remove the need for:
- replay
- correction handling
- state versioning
- batch-style backfills for historical repair

### Conservative Design Advice

Choose Lambda when its extra complexity is clearly justified by the business need for both:
- low-latency visibility
- authoritative recomputation from full history

Do not choose it only because it appears in architecture diagrams or historical big-data literature.


# 10. Summary

**Lambda Architecture separates the problem into three responsibilities:**
- a **batch layer** that recomputes correct views from historical data
- a **speed layer** that serves low-latency updates on recent data
- a **serving layer** that merges both into one query result

**The main benefit is resilience through replay and correction:**
- you can answer quickly now
- you can recompute accurately later
- you can recover from bugs, missed events, and stale state

**The main cost is duplicated logic and operational overhead:**
- two processing paths must stay logically aligned
- serving cutoffs must be explicit
- late events and duplicate handling must be designed up front

**Implementation checklist:**

```text
Source of truth:
  □ Store input as immutable, replayable events
  □ Keep stable event IDs for deduplication and audit
  □ Preserve both event time and ingestion time

Batch layer:
  □ Define how often authoritative views are recomputed
  □ Publish batch outputs with explicit snapshot version and coverage boundary
  □ Make backfills and historical reprocessing operationally safe

Speed layer:
  □ Define recent-state retention and expiration rules
  □ Make updates idempotent or persist dedupe state
  □ Decide how the layer behaves during restarts and catch-up

Serving layer:
  □ Specify the merge rule between batch output and recent deltas
  □ Prevent double-counting at the batch/speed cutoff
  □ Expose whether a metric is provisional or finalized

Operations:
  □ Test late events, duplicate delivery, and replay scenarios
  □ Monitor freshness lag for both layers
  □ Revisit whether a simpler unified architecture would meet the same need
```
