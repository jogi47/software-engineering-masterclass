# Correlation IDs

[← Back to Index](README.md)

Imagine you are debugging a failed order in a microservices system. The API gateway handled the request, the order service called inventory, inventory called pricing, and payment later timed out. Every service wrote logs, but they are mixed with thousands of other requests from the same second.

Without a shared identifier, you end up doing this:

```text
10:23:45.101 gateway    POST /orders started
10:23:45.132 order      create order for user_789
10:23:45.181 inventory  check stock for sku_456
10:23:45.214 payment    authorize charge 99.50
10:23:45.367 payment    timeout calling provider
10:23:45.402 order      order failed
10:23:45.441 gateway    returned 500
```

At 500 requests per second, timestamps alone are not enough. This is where **correlation IDs** matter. They let you tie together all events caused by one user action so you can reconstruct the full path quickly and reliably.

In this chapter, you will learn:
  * [Why correlation IDs matter in distributed systems](#1-why-correlation-ids-matter)
  * [What a correlation ID is and what it is not](#2-what-a-correlation-id-is)
  * [How IDs are generated at the system edge](#3-generating-correlation-ids)
  * [How to propagate them across HTTP, queues, and async work](#4-propagating-correlation-ids)
  * [How they differ from request IDs and trace IDs](#5-correlation-id-vs-request-id-vs-trace-id)
  * [How to implement them in application code](#6-implementation-patterns)
  * [How they connect to distributed tracing](#7-relationship-to-distributed-tracing)
  * [What practices keep them useful in production](#8-best-practices)
  * [Which mistakes make them unreliable](#9-common-pitfalls)
  * [What to put on your implementation checklist](#10-summary)


# 1. Why Correlation IDs Matter

The core problem is simple: distributed systems break one user operation into many internal steps.

One checkout request may involve:
- API gateway
- auth service
- order service
- inventory service
- payment provider
- email worker
- audit log writer

Each component emits its own logs and metrics. If those events cannot be tied back to the same business flow, debugging becomes guesswork.

### The Failure Without Correlation

```
User action
  -> gateway log
  -> service A log
  -> service B log
  -> queue message
  -> worker log

Without shared context:
  -> each event looks isolated
  -> operators search by time window
  -> unrelated events get mixed together
```

### What Correlation IDs Give You

Correlation IDs turn isolated events into a sequence:

```
correlation_id=corr_7f83...
  -> gateway accepted request
  -> order created
  -> inventory reserved
  -> payment timed out
  -> order rolled back
  -> client received 500
```

That is useful for:
- incident response
- customer support investigations
- debugging retries and duplicate processing
- auditing cross-service workflows
- connecting logs from sync and async systems

### A Practical Mental Model

Think of a correlation ID as the case number for one business flow.

Every relevant system event should carry that case number so you can ask:

```text
Show me everything that happened for this operation.
```


# 2. What a Correlation ID Is

A correlation ID is a unique identifier attached to a request, workflow, or business operation and propagated through every participating component.

### Simple Definition

```
One logical operation
  -> one shared identifier
  -> many related logs, messages, and events
```

### Typical Properties

A good correlation ID should be:
- unique enough to avoid collisions in practice
- opaque to clients and developers
- stable for the whole operation lifetime
- easy to log and search

### Where You See It

Common places include:
- HTTP headers
- structured logs
- queue message metadata
- job payload metadata
- audit records
- error responses

### Example Structured Log

```json
{
  "timestamp": "2026-03-15T10:23:45.367Z",
  "level": "error",
  "service": "payment-service",
  "event": "provider_timeout",
  "correlation_id": "01JPDQKJXZQ7F1A9BV7AP4NNP3",
  "order_id": "ord_1832",
  "provider": "stripe",
  "timeout_ms": 5000
}
```

### What It Is Not

A correlation ID is not automatically:
- a database primary key
- a user identifier
- a security token
- proof that a request is authentic
- a replacement for tracing spans

It is an observability mechanism, not an authorization mechanism.


# 3. Generating Correlation IDs

The safest pattern is to generate a correlation ID at the system boundary if one does not already exist.

### Generate at the Edge

Typical entry points:
- API gateway
- load balancer with header injection
- backend-for-frontend
- message consumer that starts a new workflow
- scheduled job launcher

### Preferred Flow

```
Incoming request
  -> if trusted upstream already sent one, accept or map it
  -> otherwise generate a new one
  -> store in request context
  -> write to logs and outbound calls
```

### ID Format Options

Common choices:
- UUID v4
- UUID v7
- ULID
- provider-generated request IDs

There is no single universal winner. The important part is uniqueness, consistency, and operational usability.

### TypeScript Example

```typescript
import { randomUUID } from "node:crypto";

export function getOrCreateCorrelationId(headers: Record<string, string | string[] | undefined>): string {
  const raw = headers["x-correlation-id"];

  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim();
  }

  return randomUUID();
}
```

### Do Not Encode Meaning Unnecessarily

Avoid formats like:
- `tenant-123-user-456-order-789`
- `prod-us-east-1-mobile-ios-checkout-...`

Embedding business meaning makes IDs longer, leaks internal data, and creates migration problems later.


# 4. Propagating Correlation IDs

Generation is easy. Propagation is where most systems fail.

If even one hop drops the identifier, the debugging chain becomes incomplete.

### HTTP Propagation

The most common pattern is a header such as:

```text
x-correlation-id: 01JPDQKJXZQ7F1A9BV7AP4NNP3
```

### HTTP Request Flow

```
Client
  -> API Gateway
     x-correlation-id=01J...
        -> Order Service
           x-correlation-id=01J...
              -> Payment Service
                 x-correlation-id=01J...
```

### Message Queue Propagation

With async systems, put the ID in message metadata or envelope fields.

```json
{
  "event_type": "order.created",
  "correlation_id": "01JPDQKJXZQ7F1A9BV7AP4NNP3",
  "payload": {
    "order_id": "ord_1832"
  }
}
```

### Background Jobs

If a job is triggered by a user workflow, copy the same correlation ID into the job metadata.

If the job is a brand-new autonomous workflow, create a new one.

### TypeScript Outbound Propagation Example

```typescript
type RequestContext = {
  correlationId: string;
};

async function postPayment(context: RequestContext, body: unknown): Promise<Response> {
  return fetch("https://payments.internal/authorize", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": context.correlationId,
    },
    body: JSON.stringify(body),
  });
}
```

### Async Context Matters

In Node.js, request-scoped context is often carried with `AsyncLocalStorage` so application code and loggers can access the current correlation ID without passing it through every function manually.


# 5. Correlation ID vs Request ID vs Trace ID

These terms are often mixed together. They are related, but not identical.

### Comparison

```
┌────────────────┬────────────────────────────────────────────────────┐
│ Identifier     │ Typical Meaning                                    │
├────────────────┼────────────────────────────────────────────────────┤
│ Correlation ID │ One business flow or logical operation             │
├────────────────┼────────────────────────────────────────────────────┤
│ Request ID     │ One specific inbound request to one service        │
├────────────────┼────────────────────────────────────────────────────┤
│ Trace ID       │ One distributed trace across services              │
├────────────────┼────────────────────────────────────────────────────┤
│ Span ID        │ One unit of work inside a trace                    │
└────────────────┴────────────────────────────────────────────────────┘
```

### Practical Differences

- A request ID is usually per-hop or per-service-entry.
- A correlation ID may remain the same across multiple hops and async steps.
- A trace ID comes from distributed tracing instrumentation and follows trace standards.
- A span ID identifies one operation inside the trace tree.

### When They Can Match

In some systems, the `trace_id` is sufficient as the main correlation key.

That can work well when:
- tracing is deployed consistently
- trace context propagates across all relevant boundaries
- operators already use trace IDs in logs and dashboards

### When You May Keep Both

You may still want a separate correlation ID when:
- some systems are not fully instrumented for tracing
- business workflows continue across multiple traces
- async jobs outlive the original request
- support teams search by a stable workflow identifier


# 6. Implementation Patterns

The goal is to make correlation automatic, not dependent on developer discipline.

### Recommended Architecture

```
Incoming request
  -> middleware extracts or creates correlation ID
  -> request context stores correlation ID
  -> logger reads context automatically
  -> outbound clients add header automatically
  -> queue publishers include metadata automatically
```

### Express-Style Example with AsyncLocalStorage

```typescript
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

type RequestContext = {
  correlationId: string;
};

const requestContext = new AsyncLocalStorage<RequestContext>();

export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const inbound = req.header("x-correlation-id");
  const correlationId = inbound?.trim() || randomUUID();

  res.setHeader("x-correlation-id", correlationId);

  requestContext.run({ correlationId }, () => {
    next();
  });
}

export function getCorrelationId(): string | undefined {
  return requestContext.getStore()?.correlationId;
}
```

### Logging Wrapper Example

```typescript
type LogLevel = "debug" | "info" | "warn" | "error";

interface LogFields {
  [key: string]: unknown;
}

function log(level: LogLevel, event: string, fields: LogFields = {}): void {
  const correlationId = getCorrelationId();

  const record = {
    timestamp: new Date().toISOString(),
    level,
    event,
    correlation_id: correlationId,
    ...fields,
  };

  process.stdout.write(`${JSON.stringify(record)}\n`);
}
```

### Queue Publisher Example

```typescript
interface DomainEvent<TPayload> {
  eventType: string;
  correlationId: string;
  payload: TPayload;
}

function buildEvent<TPayload>(eventType: string, payload: TPayload): DomainEvent<TPayload> {
  return {
    eventType,
    correlationId: getCorrelationId() ?? randomUUID(),
    payload,
  };
}
```

### The Design Principle

Developers should need to remember correlation only at system boundaries and unusual integration points.

Everywhere else, the platform should do it for them.


# 7. Relationship to Distributed Tracing

Correlation IDs and distributed tracing solve related problems at different levels.

### Correlation IDs Give You Searchability

They help answer:

```text
Which logs, jobs, and events belong to this workflow?
```

### Tracing Gives You Causality and Timing

Tracing helps answer:

```text
Which service called which dependency, in what order, and how long did each step take?
```

### Together They Work Better

```
Metric alert
  -> open trace for slow checkout flow
  -> identify failing payment span
  -> search logs using trace_id and correlation_id
  -> inspect queue event and worker retries
```

### W3C Trace Context

For distributed tracing, W3C Trace Context defines `traceparent` as the common header format for propagating trace context between services.

If your system uses OpenTelemetry or another tracing stack, the most useful practice is usually:
- propagate trace context using the tracing standard
- include `trace_id` and `span_id` in logs
- include `correlation_id` when you need workflow-level grouping beyond one trace

### Do Not Force Them to Be Identical

You can choose to align them in some systems, but they represent different concepts.

Treating them as interchangeable without a clear design often creates confusion later.


# 8. Best Practices

### 1. Standardize the Header and Field Name

Pick one convention and use it everywhere.

Examples:
- HTTP header: `x-correlation-id`
- log field: `correlation_id`
- queue field: `correlation_id`

### 2. Generate at Trusted Boundaries

Create IDs at ingress points you control. If a client supplies one, validate or replace it according to your policy.

### 3. Echo It Back in Responses

Returning the correlation ID to the caller helps support teams and clients report failures with the right identifier.

### 4. Add It Automatically to Logs

Do not rely on handwritten log statements to include it manually.

### 5. Propagate Across Async Boundaries

HTTP is only half the story. The same ID often needs to move through:
- Kafka or RabbitMQ messages
- background jobs
- scheduled workflows
- webhook handlers

### 6. Keep It Opaque

Treat it as a random identifier, not a place to store business meaning.

### 7. Combine It with Trace and Business Context

The most useful logs often contain:
- `correlation_id`
- `trace_id`
- `request_id`
- service name
- operation name
- relevant business IDs such as `order_id`


# 9. Common Pitfalls

### 1. Generating a New ID at Every Hop

That breaks the chain immediately.

Generate once per workflow unless there is a clear reason to start a new one.

### 2. Forgetting Async Systems

Teams often propagate IDs through REST calls but lose them when publishing to queues or scheduling jobs.

### 3. Trusting Arbitrary Client Input Blindly

An attacker can send oversized, malformed, or misleading header values.

Validate length and character rules, or replace the inbound value entirely at the edge.

### 4. Logging the ID in Only Some Services

Propagation without logging still leaves blind spots.

### 5. Conflating Correlation with Identity

`correlation_id` should not be used as:
- a user ID
- an auth token
- proof of ownership
- an idempotency key

### 6. Missing Response Visibility

If support engineers and clients cannot see the correlation ID returned from the failing request, troubleshooting takes longer.

### Good vs Bad

```
Bad:
├── different header names in each service
├── new ID generated by every downstream hop
├── queue messages without correlation metadata
└── logs missing the field entirely

Good:
├── one ingress-generated ID per workflow
├── automatic propagation across sync and async calls
├── structured logs with consistent field names
└── correlation used alongside trace and business IDs
```


# 10. Summary

**Correlation IDs solve the disconnected-log problem:**
- They give one logical workflow a shared identifier.
- They make cross-service debugging much faster.
- They are especially useful when logs, queues, workers, and external calls are all involved.

**Correlation IDs are operational context, not security context:**
- They help you observe systems.
- They do not authenticate requests or authorize actions.
- They should stay opaque and easy to propagate.

**They work best when automation does the hard part:**
- Generate at ingress.
- Store in request context.
- Inject into logs and outbound calls automatically.
- Carry them through async workflows too.

**Implementation checklist:**

```text
Ingress:
  □ Generate a correlation ID at trusted entry points
  □ Validate or replace inbound client-provided IDs
  □ Return the correlation ID in responses when useful

Propagation:
  □ Forward the ID in HTTP headers
  □ Include it in queue or job metadata
  □ Preserve it across async processing boundaries

Logging:
  □ Emit `correlation_id` in all structured logs
  □ Standardize field names across services
  □ Log it together with `trace_id`, `request_id`, and business IDs where relevant

Platform:
  □ Use middleware or interceptors for automatic injection
  □ Use request-scoped context such as AsyncLocalStorage where appropriate
  □ Add tests so propagation is not broken by framework changes
```
