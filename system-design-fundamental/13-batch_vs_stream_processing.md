# Batch vs Stream Processing

[← Back to Index](README.md)

Imagine you are building a payments platform. Finance wants a complete settlement report every morning. Risk wants to detect suspicious transactions within seconds. Product wants a live dashboard showing orders per minute.

If you treat every workload the same way, you usually get one of two bad outcomes:

```typescript
// Bad fit: use only daily batch jobs.
// Reports work, but fraud detection and live dashboards are delayed.

// Bad fit: use only real-time streaming.
// Low latency is great, but some workloads become needlessly complex
// and expensive when they only need hourly or daily results.
```

This is where **batch processing** and **stream processing** matter. They solve different classes of data problems. Good systems usually use both, and they choose each one based on latency needs, correctness needs, cost, and operational complexity.

In this chapter, you will learn:
  * [What batch processing is and where it fits](#1-what-batch-processing-is)
  * [What stream processing is and why it is harder](#2-what-stream-processing-is)
  * [How time, windows, and state affect streaming systems](#3-time-windows-and-state)
  * [How batch and stream compare across trade-offs](#4-batch-vs-stream-trade-offs)
  * [Where micro-batch fits between the two](#5-micro-batch-as-a-middle-ground)
  * [Which architecture patterns are common in practice](#6-common-architectures)
  * [What implementation choices matter most](#7-implementation-patterns)
  * [Which tools are commonly used in each model](#8-tooling-landscape)
  * [What mistakes teams make when choosing the wrong model](#9-common-pitfalls)
  * [What to put on your design checklist](#10-summary)


# 1. What Batch Processing Is

Batch processing collects a bounded dataset, processes it as a job, and writes the result somewhere else.

Typical examples:
- nightly ETL jobs
- daily sales reports
- billing runs
- payroll calculation
- machine learning training on historical data
- warehouse backfills

### The Core Idea

```
Raw data for a fixed period
  -> read all input
  -> transform and aggregate
  -> write final result
```

The input is finite. That matters because the system can reason about the whole dataset.

### Why Batch Is Attractive

Batch processing is often easier because:
- inputs are bounded
- retries are simpler
- full-table scans and multi-pass algorithms are possible
- results can be recomputed from source data
- debugging is easier when a job has a clear start and end

### Example Scenario

```
Transactions from March 14
  -> aggregate by merchant
  -> calculate fees
  -> write settlement file
```

For this workload, low latency is not important. Correctness and full coverage matter more.


# 2. What Stream Processing Is

Stream processing handles data continuously as events arrive.

Typical examples:
- fraud detection
- live operational dashboards
- clickstream enrichment
- anomaly detection
- IoT telemetry analysis
- alerting pipelines

### The Core Idea

```
Event arrives
  -> process immediately
  -> update state if needed
  -> emit result or trigger action
```

Unlike batch systems, streaming systems usually do not have a natural "all input is now available" moment.

### Why Streaming Exists

Streaming is useful when you care about:
- low-latency reactions
- continuous visibility
- event-driven workflows
- per-event decisions before the business action is complete

### Why Streaming Is Harder

Streaming introduces challenges batch systems often avoid:
- out-of-order events
- late arrivals
- state recovery after failure
- deduplication
- exactly-once or effectively-once delivery concerns


# 3. Time, Windows, and State

Most real stream workloads need more than "process one event and move on." They need time-aware aggregation and stateful logic.

### Event Time vs Processing Time

```
Event created at 10:01
Network delay
Processor receives it at 10:04

Event time:      10:01
Processing time: 10:04
```

This distinction matters because business correctness often depends on when the event happened, not when the processor received it.

### Windows

Since a stream is conceptually unbounded, you usually compute results over windows.

Common window types:
- tumbling windows
- sliding windows
- session windows

```
Tumbling windows, 5 minutes each:

10:00-10:05 | 10:05-10:10 | 10:10-10:15
```

### Late Events and Watermarks

Events do not always arrive before a window closes.

```
Window: 10:00-10:05
Result emitted around 10:06

Late event arrives at 10:07
  -> event timestamp is 10:03
```

A streaming system needs a policy for this.

Common choices:
- drop very late data
- update previous results
- allow a bounded lateness period before finalizing

In event-time systems, **watermarks** are a common mechanism for expressing how far processing has progressed in event time. In practice, they help operators decide when a window is ready to emit while still allowing some tolerance for out-of-order arrival.

### Stateful Processing

A processor may need to remember:
- counts
- rolling averages
- last seen event
- user session state
- deduplication keys

Without durable state, many streaming tasks are not reliable after restarts.

### TypeScript Example

```typescript
type PaymentEvent = {
  paymentId: string;
  merchantId: string;
  amount: number;
  eventTimeMs: number;
};

class MinuteWindowCounter {
  private counts = new Map<string, number>();

  process(event: PaymentEvent): void {
    const minuteBucket = Math.floor(event.eventTimeMs / 60_000);
    const key = `${event.merchantId}:${minuteBucket}`;

    this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
  }

  getCount(merchantId: string, minuteBucket: number): number {
    return this.counts.get(`${merchantId}:${minuteBucket}`) ?? 0;
  }
}
```

This is a simplified example. Real streaming systems also need checkpointing, expiration, and late-event handling.


# 4. Batch vs Stream Trade-Offs

Neither model is universally better. The right choice depends on the workload.

```
┌────────────────────┬────────────────────────────────────────────┬────────────────────────────────────────────┐
│ Dimension          │ Batch                                      │ Stream                                     │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Input              │ Bounded dataset                            │ Continuous unbounded events                │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Latency            │ Minutes to hours, sometimes longer         │ Milliseconds to seconds                    │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Throughput         │ Often very high for large jobs             │ High, but tied to low-latency constraints  │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Programming model  │ Usually simpler                            │ Usually more complex                       │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Reprocessing       │ Straightforward                            │ More involved                              │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Fault tolerance    │ Job retry is often simpler                 │ State recovery is more complex             │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Best fit           │ Reports, ETL, backfills, training          │ Detection, alerting, live reactions        │
└────────────────────┴────────────────────────────────────────────┴────────────────────────────────────────────┘
```

### A Simple Decision Rule

Use batch when:
- the data can wait
- you need full historical context
- recomputation is acceptable
- simpler operations matter more than immediacy

Use streaming when:
- value depends on reacting quickly
- stale output is harmful
- downstream actions must happen continuously


# 5. Micro-Batch as a Middle Ground

Micro-batch processing groups a small amount of incoming data and processes it every few seconds or minutes.

### Why Teams Choose It

Micro-batch often provides:
- lower complexity than true record-by-record streaming
- lower latency than traditional nightly batch
- a unified execution model for teams already using batch-style engines

### The Basic Flow

```
Events arrive continuously
  -> collect for 5 seconds
  -> process mini batch
  -> emit result
  -> repeat
```

### Where It Fits

Micro-batch is often good enough for:
- near-real-time dashboards
- operational analytics
- periodic enrichment
- pipelines where sub-second latency is not required

It is usually a poor fit when each event must trigger an immediate decision, such as high-speed fraud blocking or safety-critical control loops.


# 6. Common Architectures

Most production data platforms mix these models rather than picking only one.

### Pure Batch Architecture

```
Application databases / files
  -> scheduled extraction
  -> batch transform job
  -> warehouse / report tables
```

Good for reporting, compliance exports, and historical analysis.

### Pure Streaming Architecture

```
Applications
  -> event bus
  -> stream processor
  -> alerting / live store / downstream consumers
```

Good for low-latency reactions and continuous derived state.

### Combined Architecture

```
Applications
  -> event bus
     ├── stream processor -> real-time views / alerts
     └── object storage / lake -> batch jobs -> historical analytics
```

This is common because the same business domain often has both real-time and offline needs.

### Lambda and Kappa, Carefully Framed

You may encounter:
- **Lambda-style ideas**: separate real-time and batch paths with later reconciliation
- **Kappa-style ideas**: treat the event log as the primary source and reprocess from it when needed

The exact architecture varies by organization. The important point is the trade-off:
- multiple paths can improve flexibility
- multiple paths also increase operational and data-consistency complexity


# 7. Implementation Patterns

The hardest part is usually not the algorithm. It is choosing reliable data boundaries, semantics, and recovery behavior.

### Pattern 1: Make the Source of Truth Explicit

Decide whether your source is:
- OLTP database tables
- append-only object storage files
- an event log or message stream

This affects replay, backfill, and auditability.

### Pattern 2: Design for Reprocessing

Good systems assume you will need to:
- replay historical data
- fix a bug in a transformation
- rebuild a derived table
- change a business rule

Batch systems usually make this easier, but streaming systems can support replay if the event log is retained long enough.

### Pattern 3: Think About Delivery Semantics Early

In practice, you often design around:
- at-most-once
- at-least-once
- exactly-once or effectively-once behavior

The end-to-end result depends on the whole pipeline, not one component in isolation.

### Pattern 4: Make Outputs Idempotent

```typescript
type AggregatedMetric = {
  bucketId: string;
  count: number;
};

class MetricsWriter {
  private readonly store = new Map<string, AggregatedMetric>();

  upsert(metric: AggregatedMetric): void {
    this.store.set(metric.bucketId, metric);
  }
}
```

Idempotent writes reduce damage when retries happen.


# 8. Tooling Landscape

You do not need one specific vendor to understand the model. What matters is the category of system.

### Common Batch Tool Categories

- SQL warehouses
- distributed batch engines
- ETL orchestrators
- file-based data lake processing

Examples you may encounter in practice include:
- Apache Spark in batch mode
- Hadoop MapReduce in older ecosystems
- warehouse-native transformations
- scheduled SQL jobs

### Common Streaming Tool Categories

- message brokers or event logs
- stream processing engines
- stream-to-stream and stream-to-table pipelines
- real-time analytics databases

Examples you may encounter in practice include:
- Apache Kafka
- Apache Flink
- Spark Structured Streaming, which uses micro-batch by default and also supports a continuous mode for some workloads
- cloud-managed streaming services

### The Important Design Point

Do not choose a tool first and then invent a problem for it. Start with:
- required latency
- event volume
- correctness semantics
- replay requirements
- operational skill of the team


# 9. Common Pitfalls

### Pitfall 1: Using Streaming for a Purely Batch Problem

If the business only needs a daily number, a complex streaming pipeline may add cost and failure modes without real value.

### Pitfall 2: Using Batch for a Real-Time Control Problem

If fraud detection runs every 6 hours, the system may be technically correct and still operationally useless.

### Pitfall 3: Ignoring Late and Duplicate Events

This leads to silently wrong counts, wrong dashboards, and reconciliation pain later.

### Pitfall 4: Treating Exactly-Once as a Magic Checkbox

Exactly-once behavior is not just a broker feature. It depends on source, processor, state, sink, and write semantics.

### Pitfall 5: Forgetting Cost

Low-latency systems are often more expensive because they keep infrastructure, state, and operators active all the time.

### Pitfall 6: Forgetting Backfills

A design that handles the happy path but cannot rebuild history becomes fragile the first time a bug or schema change appears.


# 10. Summary

**Batch processing:**
- Works on bounded datasets.
- Usually simpler to build, debug, and replay.
- Fits reports, ETL, training, billing, and historical analytics.

**Stream processing:**
- Works on continuous event flows.
- Fits low-latency detection, alerting, live dashboards, and event-driven actions.
- Requires careful handling of time, windows, state, duplicates, and recovery.

**Micro-batch:**
- Sits between the two.
- Often gives a practical balance when seconds of latency are acceptable.

**The real-world pattern:**
- Most data platforms use both batch and stream because business workloads do not all have the same latency and correctness needs.

**Implementation checklist:**

```text
Workload fit:
  □ Define the maximum acceptable latency for the business use case
  □ Decide whether the input is bounded, unbounded, or both
  □ Confirm whether immediate reaction changes business outcomes

Correctness:
  □ Choose event time vs processing time intentionally
  □ Define late-event and duplicate-event handling
  □ Document delivery and write semantics clearly

Architecture:
  □ Choose the source of truth for replay and backfills
  □ Decide whether batch, stream, or micro-batch is the primary model
  □ Keep outputs idempotent where possible

Operations:
  □ Plan for recovery, replay, and schema evolution
  □ Measure latency, throughput, lag, and processing failures
  □ Revisit the design when workload scale or latency expectations change
```
