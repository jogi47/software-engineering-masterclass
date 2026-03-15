# Distributed Tracing

[← Back to Index](README.md)

Your metrics dashboard shows checkout `p99` latency jumped from 200 ms to 2 seconds. Logs show scattered timeout messages. Correlation IDs tell you which events belong to the same request, but they still do not tell you where the time actually went.

This is the gap between **knowing a request was slow** and **seeing the exact path that made it slow**.

This is where **distributed tracing** matters. Tracing records the journey of a request through multiple services, databases, queues, and external APIs, along with timing and causal relationships. It lets you see not just that a failure happened, but which step was slow, which call failed, and how the whole request unfolded.

In this chapter, you will learn:
  * [Why distributed tracing matters in microservices systems](#1-why-distributed-tracing-matters)
  * [What traces and spans are](#2-traces-and-spans)
  * [How trace context propagation works](#3-context-propagation)
  * [How services are instrumented for tracing](#4-instrumenting-for-tracing)
  * [Which sampling strategies are used in production](#5-sampling-strategies)
  * [How tracing backends and collectors fit together](#6-tracing-systems-and-architecture)
  * [How to analyze traces during incidents](#7-analyzing-traces)
  * [How traces connect to logs and metrics](#8-connecting-traces-to-logs-and-metrics)
  * [Which practices make tracing useful and affordable](#9-best-practices-and-pitfalls)
  * [What to put on your implementation checklist](#10-summary)


# 1. Why Distributed Tracing Matters

Distributed systems split one user action into many internal operations.

A single checkout may involve:
- API gateway
- auth service
- cart service
- inventory service
- payment provider
- database queries
- queue publish for notifications

Metrics tell you aggregate latency and error rate. Logs tell you what individual components recorded. But neither gives you a structured request timeline across the full path by default.

### The Visibility Problem

```
User request
  -> gateway
  -> checkout service
  -> inventory service
  -> payment service
  -> database
  -> notification worker

Without tracing:
  -> latency spike is visible
  -> root bottleneck is unclear
  -> operators jump between logs and dashboards
```

### What Tracing Adds

Tracing shows:
- the total request duration
- the exact order of operations
- parent-child relationships between steps
- how long each dependency took
- where errors or retries occurred

### Practical Benefits

Distributed tracing is especially useful for:
- latency investigations
- dependency bottleneck analysis
- debugging fan-out or retry storms
- understanding request flow through microservices
- finding where errors begin in a call chain


# 2. Traces and Spans

The two core concepts are **trace** and **span**.

### Trace

A trace represents the full lifecycle of one request or workflow as it moves through the system.

### Span

A span represents one unit of work inside that trace.

Examples of spans:
- inbound HTTP request
- call to another service
- database query
- cache lookup
- queue publish
- external API request

### Relationship Model

```
Trace
└── Span: POST /checkout
    ├── Span: validate session
    ├── Span: reserve inventory
    ├── Span: authorize payment
    │   └── Span: call payment provider
    └── Span: write order to database
```

### Typical Span Fields

A span commonly includes:
- trace ID
- span ID
- parent span ID
- operation name
- start time
- end time or duration
- status or error information
- attributes such as service name, route, DB system, or peer address

### Why Spans Matter

Spans turn a vague statement like "checkout is slow" into a precise statement like:

```text
Trace total: 1.9s
  -> inventory reserve: 60ms
  -> payment authorize: 1400ms
  -> database write: 280ms
```


# 3. Context Propagation

Tracing only works if every participating component can tell that its work belongs to the same trace.

That is what context propagation does.

### Basic Idea

```
Incoming request
  -> trace context extracted
  -> current span created
  -> outbound call includes trace context
  -> downstream service continues the trace
```

### HTTP Example

In modern systems, W3C Trace Context is the common standard for propagating trace context.

Example header:

```text
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

### Queue and Async Work

Tracing is not only for synchronous HTTP calls.

You often also propagate context through:
- message headers
- job metadata
- event envelopes
- workflow state

### Why Propagation Breaks

Common failure points:
- custom HTTP clients that drop headers
- async workers that start new traces incorrectly
- message consumers that do not extract context
- background tasks created without parent context

When propagation breaks, the trace becomes fragmented and much less useful.


# 4. Instrumenting for Tracing

Instrumentation means creating spans around meaningful work and propagating trace context correctly.

### The Typical Flow

```
Request enters service
  -> tracing middleware extracts context
  -> root span for request starts
  -> child spans wrap outbound calls and major internal operations
  -> context is propagated downstream
  -> spans are exported to collector or backend
```

### Automatic vs Manual Instrumentation

```
Automatic instrumentation:
  -> web frameworks
  -> HTTP clients
  -> database drivers
  -> messaging libraries

Manual instrumentation:
  -> business operations
  -> custom async workflows
  -> important internal code paths
```

You usually want both. Automatic instrumentation gives broad baseline coverage. Manual instrumentation adds domain-specific visibility.

### TypeScript Example

```typescript
type SpanAttributes = Record<string, string | number | boolean>;

interface Span {
  end(): void;
  recordException(error: unknown): void;
  setAttribute(key: string, value: string | number | boolean): void;
}

interface Tracer {
  startSpan(name: string, attributes?: SpanAttributes): Span;
}

async function instrumentedOperation<T>(
  tracer: Tracer,
  name: string,
  attributes: SpanAttributes,
  fn: () => Promise<T>,
): Promise<T> {
  const span = tracer.startSpan(name, attributes);

  try {
    return await fn();
  } catch (error) {
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}
```

### Good Instrumentation Targets

Start with:
- inbound request handlers
- outbound service calls
- database operations
- cache operations
- queue publish and consume paths
- external provider calls


# 5. Sampling Strategies

Tracing every request in a very high-volume system can be expensive.

Sampling controls how many traces are retained.

### Why Sampling Exists

Tracing data can be large because each request may create many spans.

Costs show up in:
- network overhead
- collector throughput
- backend storage
- query performance

### Common Sampling Approaches

#### Head-Based Sampling

The sampling decision is made near the start of the trace.

Examples:
- sample 1% of requests
- sample all requests for a specific environment

#### Tail-Based Sampling

The decision is made after more information about the trace is known.

This can be useful for keeping:
- slow traces
- error traces
- traces matching important routes or customers
- all traces containing certain high-value failure conditions

### Comparison

```
┌──────────────┬────────────────────────────────────────────────────┐
│ Strategy     │ Trade-off                                          │
├──────────────┼────────────────────────────────────────────────────┤
│ Head-based   │ Simple and cheap, but may miss interesting traces  │
├──────────────┼────────────────────────────────────────────────────┤
│ Tail-based   │ Higher fidelity, but more complex and expensive    │
└──────────────┴────────────────────────────────────────────────────┘
```

### Practical Guidance

- start simple
- keep all or most error traces if feasible
- sample healthy high-volume traffic
- review costs and usefulness regularly


# 6. Tracing Systems and Architecture

A common tracing pipeline looks like this:

```
┌──────────────┐      ┌───────────────┐      ┌─────────────────┐
│ Instrumented │─────▶│ Collector     │─────▶│ Tracing backend │
│ services     │      │ / agent       │      │ and UI          │
└──────────────┘      └───────────────┘      └─────────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │ Search, query,  │
                                              │ and analysis    │
                                              └─────────────────┘
```

### Typical Components

- instrumentation SDKs in services
- local or central collectors
- tracing storage and query backend
- UI for trace search and waterfall visualization

### Common Systems

Common tracing systems and ecosystems include:
- OpenTelemetry for instrumentation and telemetry pipelines
- Jaeger for distributed tracing storage and visualization
- Zipkin as another established tracing system
- vendor platforms that combine traces with logs and metrics

### Collector Responsibilities

Collectors commonly handle:
- receiving telemetry from services
- batching and export
- protocol translation
- enrichment
- sampling in some architectures

### Why Visualization Matters

The waterfall view is one of tracing's biggest advantages because it makes latency distribution and call ordering visible immediately.


# 7. Analyzing Traces

Tracing is most valuable when you know what questions to ask.

### Common Investigation Questions

- Which service is contributing most of the latency?
- Did the slowdown start in one dependency or across the stack?
- Is the issue isolated to one route, tenant, or region?
- Are retries multiplying request time?
- Did one slow call block many downstream steps?

### Example Waterfall Interpretation

```text
Trace total: 2.1s
  -> API gateway: 15ms
  -> checkout-service: 2.0s
     -> inventory-service: 55ms
     -> payment-service: 1.6s
        -> provider API: 1.5s
     -> db write: 210ms
```

From that one trace, you can usually form a much sharper hypothesis than from metrics alone.

### Look for Patterns

Useful patterns include:
- long dependency spans
- many retries
- unexpected fan-out
- serial calls that could be parallelized
- missing spans where propagation may be broken

### Trace Search Dimensions

Common filters include:
- service name
- route or operation
- error status
- duration threshold
- environment
- region
- trace ID from logs


# 8. Connecting Traces to Logs and Metrics

Tracing works best as part of a combined observability workflow.

### Metrics Tell You There Is a Problem

Examples:
- p99 latency is rising
- error rate is spiking
- queue backlog is growing

### Traces Show the Slow or Failing Path

They help identify:
- which dependency is responsible
- where time accumulates
- whether the issue is serial or parallel

### Logs Explain the Detailed Event

Once the trace identifies the bad span, logs often explain the underlying reason:
- timeout
- validation failure
- provider rejection
- connection exhaustion

### Practical Flow

```
Metric alert fires
  -> open slow traces for affected route
  -> identify slow span or failing dependency
  -> open logs using trace_id or correlation_id
  -> confirm cause and mitigation
```

### Use Shared Identifiers

The most useful setup usually includes:
- `trace_id` in structured logs
- `span_id` where log-to-span linking is supported
- correlation IDs when business-flow grouping is also needed


# 9. Best Practices and Pitfalls

### Best Practices

1. Instrument the main request path first.
2. Propagate context across every sync and async boundary.
3. Include service name, operation name, and error status clearly.
4. Keep span names stable and meaningful.
5. Link traces with logs and metrics instead of treating tracing as standalone.
6. Use sampling intentionally to control cost.

### Common Pitfalls

#### 1. Broken Propagation

If downstream services do not continue the trace, the visualization becomes incomplete.

#### 2. Too Many Low-Value Spans

Over-instrumentation creates noise and cost without improving diagnosis.

#### 3. Inconsistent Span Naming

If one service uses `POST /checkout` and another uses `checkoutHandler` and another uses `route-17`, searching becomes harder than it should be.

#### 4. No Link to Logs

Traces are excellent for timing and structure, but they are not always enough to explain the exact failure details.

#### 5. Sampling Away Important Traces

An overly aggressive sampling policy can hide the traces you care about most.

### Good vs Bad

```
Bad:
├── no context propagation through queues
├── random span names
├── every tiny function becomes a span
└── traces are isolated from logs and metrics

Good:
├── stable span names and service metadata
├── full propagation across service and async boundaries
├── focused instrumentation on important operations
└── traces searchable together with metrics and logs
```


# 10. Summary

**Distributed tracing gives structured visibility into request flow:**
- It shows how a request moves through services and dependencies.
- It records timing for each step.
- It is one of the fastest ways to find latency bottlenecks in distributed systems.

**Traces are built from spans and context propagation:**
- A trace represents the whole request.
- Spans represent units of work inside that request.
- Propagation keeps the trace connected across process boundaries.

**Tracing is strongest when combined with the other observability signals:**
- Metrics tell you that something changed.
- Traces show where the time or failure is concentrated.
- Logs explain the detailed event behind the failing span.

**Implementation checklist:**

```text
Core setup:
  □ Instrument inbound requests and major outbound dependencies
  □ Propagate trace context across HTTP, messaging, and background jobs
  □ Export spans to a collector or backend consistently

Design:
  □ Use clear and stable span names
  □ Include service, route, and error attributes where useful
  □ Avoid creating large volumes of low-value spans

Operations:
  □ Add trace IDs to structured logs
  □ Use sampling policies that preserve important traces
  □ Build dashboards and runbooks that link to tracing views
  □ Review broken or fragmented traces during incidents
```
