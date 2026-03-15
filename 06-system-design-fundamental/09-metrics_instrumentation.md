# Metrics Instrumentation

[← Back to Index](README.md)

Your API has logs for failed requests, traces for slow calls, and customer support says the site "feels slower than usual." That still leaves a basic question unanswered:

```text
How bad is it, how fast is it changing, and which part of the system is under stress?
```

Logs show individual events. Traces show request paths. But neither is the fastest tool for answering aggregate questions like request rate, error rate, latency percentiles, queue depth, or cache hit ratio.

This is where **metrics instrumentation** matters. Metrics turn system behavior into numeric time series that dashboards, alerts, and capacity planning can use.

In this chapter, you will learn:
  * [Why metrics matter in production systems](#1-why-metrics-matter)
  * [Which metric types exist and when to use them](#2-types-of-metrics)
  * [What the four golden signals are](#3-the-four-golden-signals)
  * [How instrumentation works inside application code](#4-how-instrumentation-works)
  * [How to name and label metrics effectively](#5-metric-naming-and-labels)
  * [Why cardinality becomes a scaling problem](#6-cardinality-the-hidden-killer)
  * [How a typical Prometheus-style pipeline works](#7-prometheus-style-architecture)
  * [What good instrumentation looks like in real systems](#8-best-practices)
  * [Which mistakes make metrics noisy or expensive](#9-common-pitfalls)
  * [What to put on your implementation checklist](#10-summary)


# 1. Why Metrics Matter

Metrics answer questions that are hard to answer quickly from raw logs:
- how many requests per second is the service handling
- how many requests are failing
- how long are requests taking at p50, p95, and p99
- how full is the queue
- how fast is memory or CPU usage increasing

### Logs vs Metrics

Consider a flash sale:

```text
Logs:
  -> order 123 completed in 250ms
  -> order 124 completed in 280ms
  -> order 125 completed in 310ms
  -> ...
  -> tens of thousands more events

Metrics:
  -> request_rate = 2500 req/s
  -> error_rate = 0.3%
  -> p99_latency = 450ms
  -> cpu_usage = 78%
```

The logs still matter, but metrics show the overall state immediately.

### What Metrics Are Good For

Metrics are especially useful for:
- alerting
- dashboards
- SLO tracking
- trend analysis
- capacity planning
- autoscaling signals

### A Practical Mental Model

```
Metrics:
  -> tell you that something is changing

Traces:
  -> show which path is slow or failing

Logs:
  -> explain the detailed event behind the failure
```

Good observability systems use all three together.


# 2. Types of Metrics

Different metric types represent different kinds of measurements.

### Counter

A counter only increases during normal operation.

Use it for:
- total HTTP requests
- total errors
- total jobs processed
- cache misses

```text
http_requests_total = 10521
payment_failures_total = 83
```

Counters are usually queried as rates over time rather than as raw totals.

### Gauge

A gauge goes up and down.

Use it for:
- memory usage
- active connections
- queue depth
- in-flight requests

```text
queue_depth = 812
active_websocket_connections = 4201
```

### Histogram

A histogram records observations into buckets and is commonly used for latency and payload sizes.

Use it for:
- request duration
- DB query duration
- response payload size
- job execution time

```text
request_duration_seconds_bucket{le="0.1"}  = 1200
request_duration_seconds_bucket{le="0.5"}  = 4820
request_duration_seconds_bucket{le="1.0"}  = 4991
request_duration_seconds_count             = 5000
request_duration_seconds_sum               = 913.2
```

Histograms make percentile-style analysis practical in many monitoring systems.

### Summary

A summary also tracks distributions, but it calculates quantiles on the client side instead of exposing bucket counts.

Whether summaries are a good fit depends on your monitoring backend and aggregation needs. In Prometheus-style systems, summaries are generally not aggregatable across instances, so histograms are often the more practical choice for fleet-level latency analysis.

### Comparison

```
┌───────────┬──────────────────────────────────────────────────────────┐
│ Type      │ Best For                                                 │
├───────────┼──────────────────────────────────────────────────────────┤
│ Counter   │ Monotonic totals and rate calculations                   │
├───────────┼──────────────────────────────────────────────────────────┤
│ Gauge     │ Current values that rise and fall                        │
├───────────┼──────────────────────────────────────────────────────────┤
│ Histogram │ Latency, size, and bucket-based distributions            │
├───────────┼──────────────────────────────────────────────────────────┤
│ Summary   │ Client-side quantiles in some instrumentations           │
└───────────┴──────────────────────────────────────────────────────────┘
```


# 3. The Four Golden Signals

Google SRE popularized four high-value service signals:
- latency
- traffic
- errors
- saturation

These are not the only metrics that matter, but they are a strong starting point for most services.

### 1. Latency

Latency measures how long work takes.

Useful cuts include:
- p50 for typical experience
- p95 for degraded experience
- p99 for tail latency

### 2. Traffic

Traffic measures demand on the service.

Examples:
- requests per second
- messages consumed per second
- bytes per second

### 3. Errors

Errors measure failed work.

Examples:
- 5xx rate
- failed job rate
- dependency timeout rate
- rejected message rate

### 4. Saturation

Saturation measures how close a resource is to its limit.

Examples:
- CPU utilization
- memory pressure
- thread pool exhaustion
- queue backlog
- database connection pool usage

### Example Service Dashboard

```
Checkout Service:
├── traffic: 1800 req/s
├── latency: p50 80ms | p95 220ms | p99 700ms
├── errors: 0.7% 5xx
└── saturation: db pool 92% busy
```

If you instrument only one baseline dashboard per service, this is usually the right place to start.


# 4. How Instrumentation Works

Instrumentation means placing measurement points in application code, libraries, runtimes, or infrastructure.

### The Basic Flow

```
Application code
  -> record measurements
  -> metrics SDK aggregates or exports
  -> collector or scraper gathers data
  -> backend stores time series
  -> dashboards and alerts evaluate them
```

### What to Instrument

Start with operations that define service health:
- inbound requests
- outbound dependency calls
- database queries
- queue publish and consume paths
- cache operations
- background jobs

### TypeScript Example

```typescript
type Labels = Record<string, string>;

class Counter {
  private value = 0;

  inc(amount = 1): void {
    this.value += amount;
  }

  snapshot(): number {
    return this.value;
  }
}

class Histogram {
  private readonly buckets: number[];
  private readonly counts: number[];

  constructor(buckets: number[]) {
    this.buckets = buckets;
    this.counts = new Array(buckets.length).fill(0);
  }

  observe(value: number): void {
    for (let i = 0; i < this.buckets.length; i += 1) {
      if (value <= this.buckets[i]) {
        this.counts[i] += 1;
      }
    }
  }

  snapshot(): Array<{ le: number; count: number }> {
    return this.buckets.map((bucket, index) => ({
      le: bucket,
      count: this.counts[index],
    }));
  }
}

const requestCounter = new Counter();
const requestLatencyMs = new Histogram([50, 100, 250, 500, 1000, 2000]);

async function instrumentedHandler<T>(operation: string, fn: () => Promise<T>, labels: Labels): Promise<T> {
  const startedAt = Date.now();
  requestCounter.inc();

  try {
    return await fn();
  } finally {
    requestLatencyMs.observe(Date.now() - startedAt);
    console.log({ operation, labels, durationMs: Date.now() - startedAt });
  }
}
```

The exact SDK will differ, but the pattern is the same:
- increment counters for totals
- observe histograms for latency
- set gauges for point-in-time resource values

### Manual vs Automatic Instrumentation

```
Manual instrumentation:
  -> your business logic emits service-specific metrics

Automatic instrumentation:
  -> libraries or agents emit common runtime or framework metrics
```

You usually want both. Automatic instrumentation provides baseline coverage. Manual instrumentation adds business context.


# 5. Metric Naming and Labels

Metrics are only useful if people can understand and query them correctly.

### Good Naming Principles

Use names that are:
- descriptive
- consistent
- unit-aware
- stable over time

### Example Naming Pattern

```text
http_server_requests_total
http_request_duration_seconds
db_query_duration_seconds
queue_messages_in_flight
cache_hits_total
```

### Units Matter

Include units in the metric name where the ecosystem expects them.

Common examples:
- `_seconds`
- `_bytes`
- `_total`

### Labels Add Dimensions

Labels let you slice a metric by attributes such as:
- service
- route
- method
- status_code
- region
- dependency

### Example

```text
http_request_duration_seconds{
  service="checkout",
  method="POST",
  route="/orders",
  status_code="500"
}
```

### Label Discipline

Labels are powerful, but every added dimension increases the number of time series.

That is useful only when:
- the dimension is operationally meaningful
- the value set stays bounded
- people actually query by it


# 6. Cardinality: The Hidden Killer

Cardinality is the number of unique label combinations your metric produces.

This is one of the most important scaling concerns in metrics systems.

### Why It Blows Up

Suppose you track:

```text
http_request_duration_seconds{
  service,
  route,
  method,
  status_code,
  pod,
  region
}
```

That may still be manageable.

Now add:
- `user_id`
- `session_id`
- `order_id`
- `request_id`

The number of series can explode.

### High Cardinality Example

```
Good labels:
├── method=GET
├── route=/orders/:id
├── status_code=200
└── region=us-east-1

Bad labels:
├── user_id=usr_183284
├── request_id=req_abc123
├── raw_path=/orders/183284
└── email=john@example.com
```

### Why This Hurts

High cardinality increases:
- memory use in the metrics backend
- query cost
- scrape and ingest overhead
- dashboard latency
- operator confusion

### The Rule

Metrics are for bounded dimensions.

If you need highly unique per-event context, use logs or traces instead.


# 7. Prometheus-Style Architecture

One common metrics architecture looks like this:

```
┌──────────────┐      ┌───────────────┐      ┌─────────────────┐
│ Application  │─────▶│ /metrics      │◀─────│ Prometheus      │
│ Instrumented │      │ endpoint      │      │ scraper/storage │
└──────────────┘      └───────────────┘      └─────────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │ Dashboards /    │
                                              │ Alerts          │
                                              └─────────────────┘
```

### Typical Flow

1. Your service exposes a metrics endpoint.
2. A scraper collects the exported values on an interval.
3. The backend stores the resulting time series.
4. Dashboards and alert rules query that data.

### Push vs Pull

Many teams learn metrics through Prometheus, which commonly uses pull-based scraping.

Other systems use push-based export through collectors or vendors. Both models exist in practice. The important design questions are:
- where aggregation happens
- how often export occurs
- how service discovery works
- what happens when endpoints are unavailable

### Where Collectors Fit

Collectors can help with:
- protocol translation
- batching
- enrichment
- fan-out to multiple backends

But they do not remove the need for good metric design inside the application.


# 8. Best Practices

### 1. Start with Service Health

Instrument:
- request count
- error count
- latency distribution
- saturation indicators

Do that before adding niche or low-value metrics.

### 2. Measure Dependencies

A healthy service still fails if its database, cache, queue, or third-party API is degrading.

Track dependency latency and failure rate explicitly.

### 3. Prefer Histograms for Latency

Latency distributions matter more than averages.

Average latency can look fine while tail latency is bad enough to hurt users.

### 4. Keep Labels Bounded

If a value can grow nearly unbounded with user activity, it is usually the wrong label for a metric.

### 5. Align Metrics with SLOs

If the team promises:
- 99.9% availability
- p95 latency under 300ms

then those exact indicators should be measurable from instrumentation.

### 6. Instrument Business Outcomes Too

Technical health is not enough.

Examples:
- checkout_success_total
- signup_completed_total
- payment_authorization_failures_total

These are often what product and operations teams actually care about.

### 7. Review Metric Value Periodically

Metrics that nobody dashboards, alerts on, or investigates should be candidates for removal.


# 9. Common Pitfalls

### 1. Measuring Only Infrastructure

CPU and memory matter, but they do not tell you whether checkout is failing or signups are dropping.

### 2. Using High-Cardinality Labels

This is one of the fastest ways to make a metrics backend expensive and slow.

### 3. Relying Only on Averages

Tail latency is often the real user experience problem.

### 4. Emitting Too Many Low-Value Metrics

Metrics are not free. Each series has storage, ingest, and query cost.

### 5. Naming Inconsistently

If teams use different names for the same concept, dashboards and alert reuse get harder.

### 6. Missing Error Context

Metrics can tell you error rate increased, but they usually cannot explain why by themselves.

That is where logs and traces still matter.

### Good vs Bad

```
Bad:
├── averages only
├── labels with user_id and request_id
├── no dependency metrics
└── hundreds of metrics nobody uses

Good:
├── golden signals for each service
├── latency histograms
├── bounded labels
└── metrics connected to SLOs and investigations
```


# 10. Summary

**Metrics provide the aggregate view of system behavior:**
- They show traffic, latency, error rate, and saturation over time.
- They are the foundation of dashboards, alerts, and SLO reporting.
- They complement logs and traces rather than replacing them.

**Metric design matters as much as metric collection:**
- Choose the right type for the job.
- Name metrics clearly.
- Use labels carefully.
- Avoid unbounded cardinality.

**Instrumentation should be intentional and operationally useful:**
- Measure service health first.
- Add dependency and business outcome metrics next.
- Remove noisy or unused series over time.

**Implementation checklist:**

```text
Baseline coverage:
  □ Instrument request count, error count, and latency
  □ Add saturation indicators such as queue depth or pool usage
  □ Measure important dependencies explicitly

Metric design:
  □ Use counters, gauges, and histograms intentionally
  □ Include units in names where appropriate
  □ Standardize labels across services
  □ Avoid high-cardinality labels like user_id or request_id

Operations:
  □ Build dashboards around golden signals
  □ Connect alerts to SLO-relevant metrics
  □ Review metric cost and usefulness periodically
  □ Pair metrics with logs and traces for diagnosis
```
