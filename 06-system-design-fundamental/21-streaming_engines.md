# Streaming Engines

[← Back to Index](README.md)

Imagine you are building a marketplace platform. Fraud checks should react in seconds, operations wants a live order backlog, and analytics wants rolling metrics without waiting for an hourly batch run. The first version often starts as a plain consumer that reads events and keeps counters in memory.

Without a real streaming engine, the pipeline usually looks simple until it meets failure, scale, and out-of-order data:

```typescript
// Bad example: one process consumes events and keeps state in memory.
// A restart loses state, duplicates can be counted twice, and partitions
// cannot be rebalanced safely without more coordination.
type OrderEvent = {
  eventId: string;
  merchantId: string;
  amountCents: number;
  eventTimeMs: number;
};

class NaiveLiveTotals {
  private readonly totalsByMerchant = new Map<string, number>();

  process(event: OrderEvent): void {
    const current = this.totalsByMerchant.get(event.merchantId) ?? 0;
    this.totalsByMerchant.set(event.merchantId, current + event.amountCents);
  }

  getTotal(merchantId: string): number {
    return this.totalsByMerchant.get(merchantId) ?? 0;
  }
}
```

This usually fails in familiar ways:
- a restart loses state unless you rebuild it manually
- duplicate delivery inflates totals
- a late event lands in the wrong time bucket
- scaling from one process to many introduces partition, checkpoint, and merge problems

This is where **streaming engines** come in. A streaming engine is a runtime for long-lived dataflow jobs that consume unbounded event streams, keep state, recover from failure, and produce low-latency outputs with explicit rules around time and correctness.

In this chapter, you will learn:
  * [Why streaming engines exist](#1-why-streaming-engines-exist)
  * [What a streaming engine is and what it is not](#2-what-a-streaming-engine-is)
  * [How the runtime model works](#3-the-runtime-model)
  * [How time windows and watermarks shape results](#4-time-windows-and-watermarks)
  * [How state checkpoints and recovery usually work](#5-state-checkpoints-and-recovery)
  * [What delivery guarantees really mean in practice](#6-processing-guarantees-and-correctness)
  * [How major engine styles compare](#7-common-engine-styles-and-trade-offs)
  * [What practical TypeScript patterns look like](#8-practical-typescript-patterns)
  * [Which best practices prevent common failures](#9-best-practices-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why Streaming Engines Exist

Stream processing becomes difficult when you need all of these at once:
- continuous input rather than bounded files
- low-latency outputs rather than hourly or daily jobs
- stateful logic such as counters, joins, sessions, or deduplication
- failure recovery without reimplementing the whole pipeline yourself

### The Core Problem

Processing one event at a time is easy.

Processing an unbounded stream of events while preserving ordering assumptions, managing state, recovering after restarts, and handling late arrivals is much harder.

```text
Unbounded event stream
  -> partitioned input
  -> stateful operators
  -> checkpoints and recovery
  -> materialized outputs
```

### What Teams Otherwise End Up Building

Without an engine, teams often have to hand-roll:
- consumer group coordination
- offset tracking
- state snapshots
- timers and window closing rules
- replay procedures
- backpressure controls
- sink consistency rules

That usually produces custom infrastructure that is harder to reason about than the business logic it was meant to support.

### Where Streaming Engines Fit

Streaming engines are a strong fit for:
- fraud and anomaly detection
- operational dashboards
- clickstream enrichment
- IoT telemetry aggregation
- CDC-driven projections
- alerting and near-real-time analytics

They are less compelling when the workload is naturally bounded, latency does not matter much, or the team mainly needs simple scheduled batch jobs.


# 2. What a Streaming Engine Is

A streaming engine is a runtime that executes long-lived processing topologies over event streams.

### A Conservative Definition

The durable idea is:

```text
Streaming engine = stream runtime + state management + time handling + recovery model
```

In practice, the engine usually provides:
- a programming model for transforms, joins, windows, and aggregations
- partition-aware execution across multiple workers
- durable state or recoverable state snapshots
- checkpointing or offset tracking
- APIs or connectors for reading from logs and writing to external sinks

### What It Is Not

A streaming engine is usually not:
- the same thing as the message broker feeding it
- a replacement for OLTP databases
- a guarantee of perfect ordering across all keys
- a magic source of "exactly once" behavior in every sink

### High-Level Architecture

```text
┌────────────────────┐    ┌────────────────────┐    ┌────────────────────┐
│ Event sources      │ -> │ Streaming engine   │ -> │ Materialized sinks │
│ logs, CDC, IoT     │    │ operators + state  │    │ DB, cache, alerts  │
└────────────────────┘    └────────────────────┘    └────────────────────┘
                                  │
                                  ▼
                         ┌────────────────────┐
                         │ Checkpoints /      │
                         │ recovery metadata  │
                         └────────────────────┘
```

### The Important Separation

Keep these concepts separate:
- **event log**: durable input history
- **streaming engine**: compute runtime
- **state store**: derived working state for operators
- **sink**: external system readers or downstream jobs use

Confusing those layers leads to brittle designs and vague failure handling.


# 3. The Runtime Model

Most streaming engines execute a **dataflow graph** made of operators connected by streams.

### Common Runtime Concepts

You will usually see:
- sources
- stateless transforms
- keyed repartition steps
- stateful operators
- sinks

```text
source -> parse -> keyBy(userId) -> aggregate -> enrich -> sink
```

### Partitioning and Parallelism

Throughput usually comes from splitting the stream into partitions and processing them in parallel.

```text
Input topic partitions:
  P0  P1  P2  P3

Workers:
  W1 handles P0, P1
  W2 handles P2
  W3 handles P3
```

Key points:
- ordering is usually strongest within a partition, not globally
- stateful operators often require all events for a key to land on the same worker
- repartitioning changes cost, latency, and failure behavior

### Backpressure

A slow operator should not silently let memory usage grow forever.

In a healthy engine, pressure from a slow downstream stage eventually propagates upstream:

```text
Fast source
  -> slow join
  -> sink saturation
  -> engine slows upstream consumption
```

Backpressure is one reason streaming engines behave like runtimes, not just libraries.

### Runtime Mental Model

```text
Read records
  -> assign partitions to workers
  -> route each record through operators
  -> update keyed state if needed
  -> emit derived records
  -> persist progress and recovery metadata
```


# 4. Time, Windows, and Watermarks

Most interesting stream workloads depend on time. That is where simple consumer loops usually break down.

### Event Time vs Processing Time

```text
Order created at 10:01
Network delay
Processor sees it at 10:04

Event time:      10:01
Processing time: 10:04
```

If you build business metrics from processing time alone, late events often land in the wrong bucket.

### Windows

Since streams are conceptually unbounded, engines usually compute over windows.

Common window types:
- tumbling windows
- sliding windows
- session windows

```text
Tumbling 5-minute windows:

10:00-10:05 | 10:05-10:10 | 10:10-10:15
```

### Watermarks

Many engines use watermarks as a practical signal of event-time progress.

Conservatively stated:
- a watermark is an engine estimate that events earlier than some event-time boundary have mostly arrived
- it is not a promise that no older event will ever appear

```text
Observed events up to around 10:09
Watermark advances to 10:07
  -> windows ending before 10:07 may now emit
```

### Late Data Policy

You need an explicit rule for late arrivals:
- drop them
- send them to a side output or dead-letter stream
- update already emitted results
- keep a bounded grace period before finalizing

### Why Time Handling Matters

Without explicit time semantics:
- dashboards disagree with batch recomputation
- sessionization breaks across retries
- alarms fire too early or too late
- backfills produce different results than live processing


# 5. State, Checkpoints, and Recovery

State is what turns a stream processor from a simple pipe into a useful system.

### What Stateful Operators Store

Common state includes:
- per-key counters
- rolling aggregates
- deduplication keys
- join buffers
- session state
- timers and window metadata

### Checkpoints vs State

These are related, but not the same:
- **state** is the current data the operator uses
- **checkpoint** is the recovery boundary that records progress and often state snapshot metadata

```text
Event stream
  -> operator updates state
  -> engine periodically creates checkpoint
  -> on failure, job restores state and resumes near checkpoint boundary
```

### Recovery Model

A common recovery sequence looks like this:

```text
1. Worker fails
2. Engine restarts the failed task elsewhere
3. State is restored from checkpoint or changelog
4. Input resumes from recorded offsets or sequence numbers
5. Some records may be replayed depending on the failure boundary
```

### Why State Backends Matter

Different engines and deployment models use different state strategies:
- in-memory state with snapshotting
- embedded local state with durable checkpoints
- changelog-backed state recovery
- remote state services in some managed designs

The exact mechanism varies, but the durable question is always the same: how fast can you recover without corrupting results?

### Conservative Design Advice

Plan for:
- state growth over time
- compaction or TTL for keys that should expire
- recovery duration after large checkpoints
- schema evolution for stateful jobs


# 6. Processing Guarantees and Correctness

Streaming guarantees are easy to oversimplify. It is safer to reason about failure cases than marketing terms.

### Common Delivery Models

```text
┌────────────────────┬────────────────────────────────────────────────────┐
│ Model              │ Meaning in practice                               │
├────────────────────┼────────────────────────────────────────────────────┤
│ At-most-once       │ records may be lost, duplicates are minimized      │
├────────────────────┼────────────────────────────────────────────────────┤
│ At-least-once      │ records are retried, duplicates are possible       │
├────────────────────┼────────────────────────────────────────────────────┤
│ Exactly-once-like  │ each logical result is applied once under specific │
│                    │ engine, state, and sink conditions                 │
└────────────────────┴────────────────────────────────────────────────────┘
```

### Why "Exactly Once" Needs Careful Wording

Whether a pipeline behaves like exactly-once depends on more than the engine:
- input replay behavior
- checkpoint boundaries
- operator determinism
- sink transaction or idempotency support
- what failure happens between compute and output commit

It is usually more durable to design for:
- deterministic transformations
- idempotent writes where practical
- deduplication using stable event IDs
- controlled output cutover during replay or rebuild

### Examples of Sink Behavior

```text
Safer sink patterns:
  -> upsert by business key
  -> append with stable event_id and dedupe later
  -> transactional write supported by the sink and runtime

Riskier sink patterns:
  -> fire-and-forget HTTP side effects per event
  -> non-idempotent increments in an external store
  -> outputs that depend on wall-clock time during replay
```

### The Real Goal

The real goal is not a slogan. It is **predictable correctness under restart, retry, and replay**.


# 7. Common Engine Styles and Trade-Offs

Not all streaming engines are built around the same model.

### Three Common Styles

```text
┌────────────────────────────┬──────────────────────────────────────────────┐
│ Engine style               │ Common shape                                 │
├────────────────────────────┼──────────────────────────────────────────────┤
│ Record-at-a-time runtime   │ low-latency operators, explicit state/time   │
├────────────────────────────┼──────────────────────────────────────────────┤
│ Library over a log         │ embedded processing close to the broker       │
├────────────────────────────┼──────────────────────────────────────────────┤
│ Micro-batch streaming      │ short scheduled batches over recent data      │
└────────────────────────────┴──────────────────────────────────────────────┘
```

### Representative Examples

You will often encounter these families:
- **Apache Flink**: a distributed stream-processing runtime with explicit state, windows, and checkpointing
- **Kafka Streams**: a library-oriented model for building stream applications around Kafka topics and local state stores
- **Spark Structured Streaming**: a streaming model that often executes with micro-batch semantics and integrates closely with Spark's broader data ecosystem

The durable lesson is not that one engine is universally best. It is that their trade-offs differ:
- latency profile
- operational model
- state size and recovery behavior
- connector ecosystem
- how naturally they fit your existing platform

### A Conservative Comparison

```text
┌─────────────────────────┬────────────────────────────────────────────┬────────────────────────────────────────────┐
│ Option                  │ Often attractive when                      │ Watch for                                  │
├─────────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Flink-style runtime     │ you need rich event-time and stateful ops  │ cluster operations and state management    │
├─────────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Kafka Streams-style app │ you want app-embedded processing on Kafka  │ tighter coupling to broker and JVM app     │
├─────────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Spark micro-batch style │ you already run Spark and can accept       │ window semantics and latency expectations  │
│                         │ second-level latency                        │ should be validated for the workload       │
└─────────────────────────┴────────────────────────────────────────────┴────────────────────────────────────────────┘
```

### Selection Questions

Ask these before choosing an engine:
- what latency target actually matters to the business
- how much keyed state the job will hold
- whether event-time windows and late data are central requirements
- whether you need embedded application processing or a separate compute runtime
- how replay, upgrades, and state migration will work operationally


# 8. Practical TypeScript Patterns

A TypeScript example will not replace a production streaming engine, but it helps make the runtime concepts concrete.

### Pattern 1: Deterministic Projection Logic

Keep the core projection function pure when possible.

```typescript
type PaymentEvent = {
  eventId: string;
  merchantId: string;
  amountCents: number;
  eventType: "payment_captured" | "payment_refunded";
  eventTimeMs: number;
};

function projectNetRevenue(currentCents: number, event: PaymentEvent): number {
  if (event.eventType === "payment_captured") {
    return currentCents + event.amountCents;
  }

  if (event.eventType === "payment_refunded") {
    return currentCents - event.amountCents;
  }

  return currentCents;
}
```

This makes replay and testing much safer.

### Pattern 2: Track Watermark-Like Progress Separately

```typescript
class WatermarkTracker {
  private maxEventTimeMs = 0;
  private readonly allowedLatenessMs: number;

  constructor(allowedLatenessMs: number) {
    this.allowedLatenessMs = allowedLatenessMs;
  }

  observe(eventTimeMs: number): void {
    this.maxEventTimeMs = Math.max(this.maxEventTimeMs, eventTimeMs);
  }

  currentWatermarkMs(): number {
    return this.maxEventTimeMs - this.allowedLatenessMs;
  }
}
```

This is intentionally simplified. Real engines compute watermarks across partitions and operators.

### Pattern 3: Idempotent Per-Event Processing

```typescript
class RevenueProjector {
  private readonly seenEventIds = new Set<string>();
  private readonly totalsByMerchant = new Map<string, number>();

  apply(event: PaymentEvent): void {
    if (this.seenEventIds.has(event.eventId)) {
      return;
    }

    this.seenEventIds.add(event.eventId);

    const current = this.totalsByMerchant.get(event.merchantId) ?? 0;
    const next = projectNetRevenue(current, event);

    this.totalsByMerchant.set(event.merchantId, next);
  }

  totalFor(merchantId: string): number {
    return this.totalsByMerchant.get(merchantId) ?? 0;
  }
}
```

### Pattern 4: Checkpoint the Minimal Recovery Boundary

```typescript
type Checkpoint = {
  partition: number;
  offset: number;
  capturedAtMs: number;
};

class PartitionProcessor {
  private checkpoint: Checkpoint = {
    partition: 0,
    offset: -1,
    capturedAtMs: 0,
  };

  apply(event: PaymentEvent, partition: number, offset: number): void {
    // Apply event to state first, then advance the checkpoint once safe.
    this.checkpoint = {
      partition,
      offset,
      capturedAtMs: Date.now(),
    };
  }

  snapshotCheckpoint(): Checkpoint {
    return { ...this.checkpoint };
  }
}
```

The durable lesson is to treat projection logic, state, and recovery metadata as explicit design elements rather than hidden side effects.


# 9. Best Practices and Common Pitfalls

Streaming engines help, but they do not remove distributed-systems failure modes.

### Good Practices

```text
Good:
├── define event-time and late-data policy up front
├── keep projection logic deterministic and testable
├── use stable event IDs for replay and deduplication
├── separate internal state from reader-facing outputs
└── rehearse restore, replay, and cutover procedures
```

### Common Pitfalls

```text
Bad:
├── assuming partition order means global order
├── storing unbounded state without TTL or compaction
├── relying on in-memory dedupe only
├── mixing side effects directly into operator logic
└── treating "exactly once" as guaranteed without sink analysis
```

### Operational Failure Cases to Plan For

- a worker fails after updating the sink but before checkpoint completion
- a state schema change makes old checkpoints unreadable
- one hot key overloads a single partition
- a replay floods downstream alerts or webhooks
- late events keep reopening windows longer than the business expects

### Real-World Implementation Notes

Teams commonly pair streaming engines with:
- Kafka-compatible logs or cloud-managed event streams
- CDC connectors for database changes
- key-value stores, analytical databases, search systems, or compacted topics for serving outputs
- object storage for long-term retention, replay inputs, or checkpoint artifacts

The exact stack varies. The durable requirements do not:
- clear time semantics
- recoverable state
- explicit replay procedures
- sink correctness under failure


# 10. Summary

**Streaming engines exist to make continuous, stateful event processing operationally manageable:**
- they execute long-lived topologies over unbounded streams
- they coordinate partitions, state, checkpoints, and recovery
- they let teams focus more on business projections and less on custom stream runtime code

**Their hardest problems are time, state, and correctness under failure:**
- event time and watermarks shape when results should be emitted
- state and checkpoints determine whether recovery is fast and safe
- delivery guarantees depend on the full path from source through sink

**Engine choice is mostly a trade-off decision, not a branding decision:**
- some runtimes optimize for rich stateful event-time processing
- some emphasize application-embedded processing close to the log
- some trade lower operational complexity for micro-batch semantics

**Implementation checklist:**

```text
Workload fit:
  □ Confirm the workload truly needs continuous low-latency processing
  □ Define latency, freshness, and replay requirements before choosing an engine
  □ Decide whether a separate streaming runtime or app-embedded model fits better

Data model:
  □ Keep stable event IDs, event time, and schema version in the event contract
  □ Define partition keys that balance ordering needs with hotspot risk
  □ Document how duplicates, late events, and corrections are represented

Time and state:
  □ Choose event-time, processing-time, or mixed semantics intentionally
  □ Define windowing, watermark, grace-period, and state-retention rules
  □ Estimate state growth and recovery time before production rollout

Correctness:
  □ Make projection logic deterministic and isolate side effects
  □ Verify sink behavior under retry, replay, and partial failure
  □ Rehearse restore-from-checkpoint and replay-from-history workflows

Operations:
  □ Monitor lag, watermark progress, checkpoint health, and hot partitions
  □ Test schema evolution for both events and stored state
  □ Build safe procedures for backfills, reprocessing, and reader cutover
```
