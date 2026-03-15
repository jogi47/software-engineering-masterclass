# Logging Best Practices

[← Back to Index](README.md)

Last Updated: March 15, 2026

Imagine you are debugging a checkout outage at 3 AM. The dashboard says error rate is up. Traces show the payment path is slow. You open the logs and find this:

```typescript
logger.error("something went wrong");
```

That log line is worse than useless. It consumes storage, creates noise, and still tells you nothing.

This is where **logging best practices** matter. Good logs are not about writing more lines. They are about writing the right events, at the right level, with the right context, in a format that both humans and machines can use.

In this chapter, you will learn:
  * [What makes a log useful](#1-what-good-logging-looks-like)
  * [How to choose the right log level](#2-choosing-log-levels)
  * [What context to include in each event](#3-what-to-log)
  * [Why structured logging matters](#4-structured-logging)
  * [How to avoid logging secrets and sensitive data](#5-logging-sensitive-data-safely)
  * [How to keep logging from hurting performance and cost](#6-performance-and-cost-considerations)
  * [How logs should connect to metrics and traces](#7-correlation-and-observability)
  * [Common logging mistakes in production systems](#8-common-mistakes)
  * [How to implement a practical logging approach](#9-practical-implementation-pattern)
  * [What to put on your implementation checklist](#10-summary)


# 1. What Good Logging Looks Like

Good logging is about **debuggability**, not verbosity.

A useful log should help answer:
- what happened
- where it happened
- when it happened
- which request, user, or resource was involved
- what changed or failed

### Bad vs Good

```
Bad:
├── "error occurred"
├── "request failed"
└── "null pointer"

Good:
├── "payment authorization failed"
├── request_id=req_91c2 trace_id=4a2f...
├── provider=stripe attempt=3 timeout_ms=5000
└── error_code=provider_timeout
```

### The Principle

The best mental model is simple:

```
If someone saw only this log line during an incident,
would they understand what happened?
```

If the answer is no, the log is missing context.

### Logs Are Events, Not Commentary

Useful logs describe events in the system:
- order created
- retry started
- dependency timeout
- token validation failed
- feature flag evaluated

They should not read like vague commentary from the programmer.


# 2. Choosing Log Levels

Log levels classify severity and expectedness.

They matter because they influence:
- what operators notice first
- what gets retained or sampled
- what triggers alerts
- how noisy production becomes

### Common Levels

Most systems use some variation of:

```
┌────────┬───────────────────────────────────────────────────┐
│ Level  │ Typical Meaning                                   │
├────────┼───────────────────────────────────────────────────┤
│ DEBUG  │ Detailed troubleshooting data                     │
├────────┼───────────────────────────────────────────────────┤
│ INFO   │ Normal business or lifecycle events               │
├────────┼───────────────────────────────────────────────────┤
│ WARN   │ Unexpected but recoverable conditions             │
├────────┼───────────────────────────────────────────────────┤
│ ERROR  │ Failed operation needing investigation            │
├────────┼───────────────────────────────────────────────────┤
│ FATAL  │ Process-terminating failure in some frameworks    │
└────────┴───────────────────────────────────────────────────┘
```

Not every framework defines `fatal` separately, so treat it as optional rather than universal.

### Practical Guidance

- Use `debug` for temporary or high-detail diagnostic data.
- Use `info` for normal system behavior worth recording.
- Use `warn` for degraded or unusual conditions that recovered or may self-heal.
- Use `error` for operations that failed and should be investigated.

### Expected vs Unexpected Matters

The most common mistake is treating expected conditions as errors.

Examples:
- cache miss: usually `debug` or sometimes `info`, not `error`
- invalid login attempt: often `warn` or `info`, depending on policy
- retryable timeout with successful retry: often `warn`
- dependency permanently unavailable for a user-facing request: likely `error`

### A Useful Question

Ask:

```
Would this event wake someone up or require follow-up?
```

If not, it probably should not be logged as `error`.


# 3. What to Log

The goal is to capture enough context to make the event actionable.

### Core Context Fields

High-value fields often include:
- timestamp
- level
- service or component name
- environment
- request ID
- trace ID / span ID
- user or tenant identifier when appropriate
- operation or event name
- error code / status

### Example Event Shape

```typescript
interface AppLogEvent {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  service: string;
  environment: "dev" | "staging" | "prod";
  event: string;
  message: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  attributes?: Record<string, unknown>;
}
```

### Good Examples

```text
payment authorization failed:
request_id=req_91c2 trace_id=4a2f provider=stripe timeout_ms=5000 attempt=3
```

```text
inventory reservation rejected:
order_id=ord_1832 product_id=sku_71 requested_qty=3 available_qty=1
```

### Too Little vs Too Much

```
Too little:
└── "order failed"

Too much:
└── full user profile, address, token, and entire request body

Just enough:
└── order_id, user_id, product_id, error_code, relevant quantities
```

Include what you need for diagnosis, not every field you happen to have.

### Prefer Stable Event Names

Event names such as:
- `payment_authorization_failed`
- `inventory_reservation_rejected`
- `session_refresh_started`

are better than relying only on free-form messages. They make queries and dashboards more stable over time.


# 4. Structured Logging

Structured logging means logs are emitted as machine-readable fields, commonly JSON.

### Why It Matters

Unstructured logs force operators to treat logs like ad hoc text files:
- regex parsing
- brittle pattern matching
- inconsistent field extraction

Structured logs make logs behave like queryable data.

### Unstructured vs Structured

Unstructured:

```text
2026-03-15 10:23:45 INFO Order 12345 placed by user 789 for $99.50
```

Structured:

```json
{
  "timestamp": "2026-03-15T10:23:45.123Z",
  "level": "info",
  "service": "order-service",
  "event": "order_placed",
  "order_id": "12345",
  "user_id": "789",
  "amount": 99.50,
  "currency": "USD"
}
```

### Benefits

- consistent parsing
- easier filtering and aggregation
- better correlation across services
- easier shipping into log backends and SIEMs

### Consistent Field Names Matter

Using `requestId` in one service and `request_id` in another creates avoidable friction.

You do not need one perfect global schema, but you do need consistency within your platform.

OpenTelemetry semantic conventions are useful here because they provide common attribute names across logs, metrics, traces, and resources.


# 5. Logging Sensitive Data Safely

One of the biggest logging failures is accidental data exposure.

Logs are copied into:
- centralized backends
- tickets
- chat channels
- incident timelines
- customer support workflows

If a secret lands in logs, assume its exposure radius is much larger than the original request.

### Do Not Log These Directly

OWASP guidance is clear that sensitive data should usually be removed, masked, sanitized, hashed, or encrypted before it is recorded.

Examples of high-risk data:
- passwords
- API keys and secrets
- access tokens and refresh tokens
- session identifiers
- payment card data
- health data
- government identifiers
- encryption keys
- database connection strings

### Be Careful With These Too

Depending on policy, regulation, and use case, even these may need masking or minimization:
- email addresses
- phone numbers
- IP addresses
- internal hostnames
- file paths

### Redaction by Default

Do not rely on individual developers to remember redaction every time.

Build sanitization into the logging wrapper or pipeline.

```typescript
const blockedKeys = new Set([
  "password",
  "authorization",
  "token",
  "access_token",
  "refresh_token",
  "api_key",
  "secret",
]);

function sanitizeLogFields(fields: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => {
      if (blockedKeys.has(key.toLowerCase())) {
        return [key, "[REDACTED]"];
      }

      return [key, value];
    }),
  );
}
```

### Mask When You Need Correlation

Sometimes you need partial visibility:

```
Bad:
├── card_number=4111111111111111
├── email=john.doe@example.com
└── token=eyJhbGci...

Better:
├── card_last4=1111
├── email_hash=...
└── token=[REDACTED]
```


# 6. Performance and Cost Considerations

Logging is not free.

Every log event can introduce:
- object allocation
- string formatting
- JSON serialization
- queueing
- disk or network I/O
- indexing and storage cost downstream

### Where the Cost Comes From

```
Application
  -> serialize log event
  -> enqueue / flush
  -> collector transports
  -> backend indexes and stores
  -> queries scan or search data
```

At high throughput, small per-request overhead adds up quickly.

### Practical Performance Rules

1. Avoid expensive log construction unless the level is enabled.
2. Prefer asynchronous or buffered logging in high-throughput paths.
3. Do not use logs as a substitute for metrics.
4. Sample high-volume low-value events when appropriate.
5. Keep debug logging scoped and time-limited in production.

### Avoid Eager Expensive Computation

```typescript
function debugUser(logger: { debugEnabled: boolean; debug: (message: string, fields?: object) => void }, user: object): void {
  if (!logger.debugEnabled) {
    return;
  }

  logger.debug("serialized user snapshot", {
    payload: JSON.stringify(user),
  });
}
```

### Logs vs Metrics for Counting

If you need accurate counts for:
- cache hits
- request totals
- latency distributions

use metrics, not logs.

Logs are for context. Metrics are for aggregate measurement.


# 7. Correlation and Observability

Logs become dramatically more useful when they connect to the rest of the observability stack.

### High-Value Correlation Fields

- `trace_id`
- `span_id`
- `request_id`
- deployment version
- region / zone
- service name
- tenant or account identifier where appropriate

### Typical Investigation Flow

```
Metric alert fires
  -> trace shows slow dependency call
  -> logs for the affected trace explain timeout reason
```

That workflow is much faster than searching raw logs first.

### Trace Context Standards

For distributed systems, W3C Trace Context is the standard way to propagate tracing context between services.

If your services already use a tracing standard, log the corresponding trace identifiers so operators can jump between signals.

### Example Correlated Log

```json
{
  "timestamp": "2026-03-15T10:23:45.123Z",
  "level": "error",
  "service": "payment-service",
  "event": "provider_timeout",
  "trace_id": "4a2f5d1b5f0f4c9cb018c0c58ed2e9ad",
  "span_id": "c0ffee1234567890",
  "request_id": "req_91c2",
  "provider": "stripe",
  "timeout_ms": 5000
}
```


# 8. Common Mistakes

### 1. Vague Messages

`"something went wrong"` is not a useful production log.

### 2. Logging Every Step at `info`

This creates noise and cost without adding diagnostic value.

### 3. Using `error` for Expected Conditions

Not every invalid user input or cache miss is an error.

### 4. Inconsistent Schemas Across Services

If every team names fields differently, cross-service search becomes painful.

### 5. Logging Secrets

This creates a security incident inside the logging system itself.

### 6. Missing Correlation IDs

A central log system without request or trace identifiers is much harder to use during incidents.

### 7. Treating Logs as the Only Telemetry Signal

Logs are essential, but they are not a replacement for metrics or traces.

### Good vs Bad

```
Bad:
├── inconsistent field names
├── plaintext stack dumps with secrets
├── debug noise in production
└── no request or trace identifiers

Good:
├── structured events with stable field names
├── sanitized payloads
├── clear level discipline
└── correlated logs tied to traces and requests
```


# 9. Practical Implementation Pattern

A pragmatic logging design usually has three layers:

```
Application code
  -> logging wrapper / SDK
  -> collector / agent
  -> centralized backend
```

### Logging Wrapper Responsibilities

- enforce structured shape
- inject shared context
- sanitize sensitive fields
- keep event names consistent

### Example TypeScript Logger Wrapper

```typescript
type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerContext {
  service: string;
  environment: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
}

class AppLogger {
  constructor(private readonly context: LoggerContext) {}

  log(level: LogLevel, event: string, message: string, attributes: Record<string, unknown> = {}): void {
    const entry = sanitizeLogFields({
      timestamp: new Date().toISOString(),
      level,
      event,
      message,
      ...this.context,
      ...attributes,
    });

    process.stdout.write(JSON.stringify(entry) + "\n");
  }
}
```

### Operational Guidelines

- default production level: usually `info` or `warn`, depending on service type
- enable `debug` temporarily and narrowly
- review top log volume drivers regularly
- test whether incident queries actually work before you need them


# 10. Summary

**Good logging:**
- is event-focused, structured, and contextual
- helps operators understand what happened from a single useful line
- supports both humans and machines

**Core practices:**
- choose levels carefully
- include stable identifiers and event names
- standardize fields across services
- sanitize sensitive data by default

**Operational reality:**
- logging has real performance and storage cost
- logs are strongest when connected to metrics and traces
- more logs do not automatically mean better observability

**Implementation checklist:**

```text
Event Design:
  □ Use stable event names for important system actions
  □ Include request_id, trace_id, service, and environment where relevant
  □ Write messages that are specific enough to be actionable

Level Discipline:
  □ Reserve error for failed operations that need investigation
  □ Keep debug logs off by default in production
  □ Review warn/error volume regularly for noise

Structure:
  □ Emit logs in structured JSON or another machine-readable format
  □ Standardize field names across services
  □ Add shared context through a logging wrapper or middleware

Security:
  □ Redact passwords, tokens, secrets, and session identifiers
  □ Minimize or mask PII based on policy
  □ Review logging pipelines for accidental sensitive data exposure

Operations:
  □ Use async or buffered logging where throughput is high
  □ Sample high-volume low-value events where appropriate
  □ Ensure logs can be correlated with traces and metrics
```
