# Three Pillars of Observability

[← Back to Index](README.md)

Last Updated: March 15, 2026

Imagine you are on-call for a production checkout incident. The dashboard shows latency has jumped from 300ms to 4s. Users report timeouts. The API pods look healthy. CPU is fine. Nothing obvious is crashing.

Without observability, you end up debugging like this:

```typescript
async function investigateIncident(): Promise<void> {
  console.log("latency is high");
  console.log("maybe the database is slow?");
  console.log("maybe the payment provider is timing out?");
  console.log("maybe a deployment changed something?");
}
```

That is not debugging. That is guessing.

This is where **observability** comes in. It gives you enough telemetry from the system's outputs to explain why the system is behaving the way it is. The classic mental model is the **three pillars of observability**: **logs**, **metrics**, and **traces**.

In this chapter, you will learn:
  * [What observability means and why it matters](#1-what-is-observability)
  * [Why the three pillars model is useful but not exhaustive](#2-the-three-pillars-model)
  * [What logs are good at](#3-pillar-1-logs)
  * [What metrics are good at](#4-pillar-2-metrics)
  * [What traces are good at](#5-pillar-3-traces)
  * [How the pillars work together during incidents](#6-how-the-pillars-work-together)
  * [How observability differs from monitoring](#7-monitoring-vs-observability)
  * [How to instrument systems so the pillars connect](#8-building-an-observable-system)
  * [Common mistakes teams make](#9-common-mistakes)
  * [What to put on your implementation checklist](#10-summary)


# 1. What is Observability?

**Observability** is the ability to understand what is happening inside a system by examining the outputs it emits.

In practice, those outputs are telemetry signals such as:
- logs
- metrics
- traces
- and, in some platforms, additional context such as baggage, events, or profiles

### Why It Matters

In a simple monolith, you can often reproduce bugs locally or inspect one process.

In a distributed system, one request may cross:
- an edge proxy
- an API service
- multiple internal services
- a queue
- a cache
- a database
- one or more third-party APIs

When something slows down or fails, the problem might be in one component, between components, or in the interaction pattern itself.

```
User request
  -> API gateway
  -> auth service
  -> checkout service
  -> payment provider
  -> inventory service
  -> database
```

Without strong telemetry, root-cause analysis becomes guesswork.

### What Observability Helps You Answer

- Why did latency spike for this endpoint?
- Which dependency introduced the slowdown?
- Did the latest deployment change error behavior?
- Are all users affected or only one tenant/region?
- Did the failure happen in our code, infrastructure, or an external dependency?

### Outputs, Not Internals

The key idea is important:

```
You do not directly "see" the internal state of a distributed system.
You infer it from emitted signals.
```

That is why telemetry quality matters so much.


# 2. The Three Pillars Model

The three pillars model says observability is commonly built on:
- **logs**
- **metrics**
- **traces**

This is still a useful teaching model, but it is not the full story.

### Why the Model Is Useful

Each pillar answers a different class of question:

```
┌─────────┬──────────────────────────────────────────────┐
│ Pillar  │ Best At                                      │
├─────────┼──────────────────────────────────────────────┤
│ Logs    │ Rich event detail and debugging context      │
├─────────┼──────────────────────────────────────────────┤
│ Metrics │ Trends, alerts, SLOs, and aggregate health   │
├─────────┼──────────────────────────────────────────────┤
│ Traces  │ Request flow, latency breakdown, dependency  │
└─────────┴──────────────────────────────────────────────┘
```

### Why the Model Is Not Exhaustive

Modern observability platforms often include more than three signal types.

Examples:
- **baggage/context propagation** for correlated metadata
- **profiles** for code-level CPU and memory analysis
- **events** for deployments, feature flags, and infra changes

So the careful statement is:

```
Logs, metrics, and traces are the core telemetry pillars,
but mature observability usually includes more than just those three.
```

### A Better Way to Think About It

The three pillars are not competing tools. They are complementary lenses.

- Logs give narrative detail.
- Metrics give summarized health signals.
- Traces give execution flow.

If you use only one, you will have blind spots.


# 3. Pillar 1: Logs

Logs are timestamped records of discrete events in a system.

Whenever something meaningful happens, the application or platform emits a record.

### What Logs Look Like

```typescript
interface LogRecord {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  service: string;
  requestId?: string;
  traceId?: string;
  userId?: string;
  message: string;
  attributes?: Record<string, unknown>;
}
```

Example:

```json
{
  "timestamp": "2026-03-15T10:23:45.123Z",
  "level": "error",
  "service": "payment-service",
  "traceId": "5b7d2f4a91f8472c",
  "requestId": "req_92c1",
  "message": "payment provider timeout",
  "attributes": {
    "provider": "stripe",
    "attempt": 3,
    "timeoutMs": 5000
  }
}
```

### What Logs Are Good For

- debugging one specific failure
- reading rich contextual data
- capturing exceptions and stack traces
- auditing business or security events
- explaining *why* something failed

### Structured vs Unstructured Logs

```
Bad:
├── "payment failed for order 123"
└── hard to query consistently

Good:
├── {"event":"payment_failed","orderId":"123","provider":"stripe"}
└── easy to search, filter, and aggregate
```

### Limitations of Logs

- high volume and high storage cost
- noisy during incidents
- weak for trend analysis by themselves
- hard to correlate across services without shared IDs

Logs are where you usually land at the end of an investigation, not where you should start every investigation.


# 4. Pillar 2: Metrics

Metrics are numerical measurements collected over time.

They are ideal for dashboards, alerting, SLOs, and trend analysis.

### What Metrics Look Like

```text
http_requests_total{service="checkout",status="200"} 1823342
http_requests_total{service="checkout",status="500"} 421
active_connections{service="postgres"} 47
request_duration_seconds_bucket{service="checkout",le="0.5"} 18456
request_duration_seconds_bucket{service="checkout",le="1.0"} 19234
```

### Common Metric Types

Prometheus-style systems commonly use:
- **counter**: only increases until reset
- **gauge**: goes up or down
- **histogram**: bucketed distribution of observations
- **summary**: sampled quantiles over a time window

### What Metrics Are Good For

- alerting on known failure indicators
- measuring latency, traffic, errors, and saturation
- tracking business KPIs over time
- comparing behavior between releases or regions
- powering SLOs and error budgets

### The Four Golden Signals

A strong starting point for service health is:
- **latency**
- **traffic**
- **errors**
- **saturation**

These are commonly used because they cover the main ways services degrade.

### Limitations of Metrics

- aggregation hides request-level detail
- high-cardinality labels become expensive or unusable
- they tell you that something is wrong more often than why
- you can only query what you instrumented in advance

Metrics are the fastest way to detect trouble, but rarely the final explanation.


# 5. Pillar 3: Traces

Traces follow a single request or workflow through a distributed system.

A trace is made up of **spans**. Each span represents a unit of work, such as:
- an inbound HTTP request
- a database query
- a message queue publish
- a cache lookup
- a call to another service

### What Traces Look Like

```
Trace ID: abc-123
├── API Gateway (0-25ms)
│   └── Checkout Service (25-620ms)
│       ├── Auth Service (40-90ms)
│       ├── Inventory Service (100-180ms)
│       └── Payment Service (200-620ms)
│           └── External Provider Call (220-610ms)  <-- slow
```

### Span Data Usually Includes

- trace ID
- span ID
- parent span ID
- operation name
- start time and duration
- status
- attributes such as endpoint, region, retry count, db system

### What Traces Are Good For

- locating latency bottlenecks
- understanding service dependencies
- identifying fan-out and retry patterns
- showing where a request spent its time
- correlating one request across many services

### Context Propagation Is Required

Distributed tracing only works if services propagate trace context consistently.

That is why standards matter:
- **W3C Trace Context** for cross-service propagation
- shared instrumentation conventions across languages and teams

### Limitations of Traces

- sampling often means you do not keep every trace
- instrumentation gaps break end-to-end visibility
- large traces can be noisy or expensive
- traces are best for request flow, not aggregate health

Traces usually tell you where the problem is concentrated. Logs often explain the exact failure behind that span.


# 6. How the Pillars Work Together

The real value appears when logs, metrics, and traces are connected.

### A Typical Incident Workflow

```
1. Metrics detect the anomaly
   -> p99 latency spikes
   -> error rate increases

2. Traces narrow the search
   -> payment-service spans are slow
   -> external provider calls dominate latency

3. Logs explain the failure
   -> "provider timeout after 3 retries"
   -> "circuit breaker opened"
```

### Example Flow

Checkout incident:
- Metrics show checkout latency jumped from 400ms to 4s.
- Traces show most slow requests are spending time in `payment-service`.
- Logs show `payment-service` is retrying failed TLS handshakes to an external API.

That sequence is much faster than reading logs first across every service.

### Correlation Is the Force Multiplier

The pillars become much more useful when they share identifiers.

At minimum, try to connect telemetry through:
- `trace_id`
- `span_id`
- `request_id`
- service/resource metadata
- deployment version

OpenTelemetry-style correlation is useful here because logs, metrics, and traces can all carry shared resource or trace context.


# 7. Monitoring vs Observability

These terms are related but not identical.

### Monitoring

Monitoring is about watching for known conditions.

Examples:
- CPU above 85%
- error rate above 2%
- queue depth above threshold
- p99 latency above SLO target

Monitoring is excellent for:
- alerts
- dashboards
- routine operational health checks

### Observability

Observability is about explaining system behavior, especially when the failure mode was not predicted in advance.

Observability is excellent for:
- debugging novel incidents
- exploring unknown unknowns
- correlating behavior across components
- understanding emergent system behavior

### You Need Both

```
Monitoring:
  "Something is wrong."

Observability:
  "Here is how to explain what is wrong."
```

A mature system uses monitoring to detect symptoms and observability to investigate causes.


# 8. Building an Observable System

Observability does not emerge automatically. You have to design for it.

### 1. Instrument the Code

Applications should emit:
- structured logs
- business and system metrics
- distributed traces for important flows

### 2. Standardize Naming and Context

Use consistent conventions for:
- service names
- environments
- request and trace IDs
- metric names and units
- log field names

### 3. Connect the Signals

Include trace and span identifiers in logs where possible.

```typescript
interface TelemetryContext {
  service: string;
  environment: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  version?: string;
}
```

If your metrics backend supports exemplars, link interesting metric points back to traces.

### 4. Collect and Export Consistently

An OpenTelemetry-style architecture often looks like this:

```
Application Instrumentation
        │
        ▼
Telemetry SDK / Auto-Instrumentation
        │
        ▼
Collector / Agent
        │
        ├── logs backend
        ├── metrics backend
        └── traces backend
```

### 5. Observe the Observability Stack

You also need telemetry for the telemetry pipeline.

Monitor:
- dropped spans or logs
- metrics scrape failures
- collector backpressure
- ingest latency
- query latency
- storage growth

If your observability stack fails during an incident, your response quality drops immediately.


# 9. Common Mistakes

### 1. Treating the Three Pillars as Separate Projects

If each team implements logs, metrics, and traces differently, cross-signal debugging becomes painful.

### 2. Logging Without Correlation IDs

Centralized logs are much less useful if you cannot map them to a request or trace.

### 3. High-Cardinality Metrics Everywhere

Labels like raw `user_id` or `session_id` often create expensive, low-value metrics.

### 4. Tracing Only Part of the Request Path

If one important service drops trace propagation, the trace becomes fragmented.

### 5. Alerting on Everything

Too many noisy alerts produce fatigue. Observability is not better if every dashboard becomes an alert source.

### 6. Storing Everything Forever

Telemetry retention should be intentional. Logs, traces, and high-resolution metrics have real storage and query cost.

### Good vs Bad

```
Bad:
├── plaintext logs with no request IDs
├── ad hoc metric names
├── missing trace propagation
└── alerts on every minor fluctuation

Good:
├── structured logs with correlation fields
├── stable metric naming and units
├── consistent trace context propagation
└── focused alerts tied to user impact or SLOs
```


# 10. Summary

**Observability:**
- helps you explain internal system behavior from emitted telemetry
- matters most once systems become distributed and dynamic
- is broader than dashboards alone

**The three pillars:**
- **logs** give rich event detail
- **metrics** give aggregate health and trend signals
- **traces** give request flow and latency breakdowns

**How they work together:**
- metrics usually detect the symptom
- traces usually narrow the failing path
- logs usually explain the specific failure

**Implementation checklist:**

```text
Instrumentation:
  □ Emit structured logs from every important service
  □ Define service metrics for latency, traffic, errors, and saturation
  □ Instrument distributed traces for critical request paths

Correlation:
  □ Propagate trace context across service boundaries
  □ Include trace_id, span_id, and request_id where useful
  □ Standardize service, environment, and version metadata

Operations:
  □ Create dashboards for key golden signals
  □ Alert on user-impacting symptoms and SLO violations
  □ Use traces and logs as the default drill-down path from alerts

Platform:
  □ Use a consistent telemetry pipeline or collector pattern
  □ Monitor dropped telemetry, ingest delay, and backend health
  □ Define retention and cost controls for logs, metrics, and traces
```
