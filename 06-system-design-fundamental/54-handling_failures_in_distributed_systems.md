# Handling Failures in Distributed Systems

[← Back to Index](README.md)

Imagine you are building an order-fulfillment workflow. A customer checks out, the order service reserves inventory, charges the card, books shipment, and emails a confirmation. From the user's perspective, this should feel like one action with one trustworthy outcome.

Without disciplined failure handling, teams often write distributed workflows as if every dependency behaves like a reliable local function:

```typescript
type FulfillmentCommand = {
  orderId: string;
  customerId: string;
  sku: string;
  quantity: number;
  amountCents: number;
};

interface InventoryClient {
  reserve(input: {
    orderId: string;
    sku: string;
    quantity: number;
  }): Promise<void>;
}

interface PaymentsClient {
  charge(input: {
    orderId: string;
    customerId: string;
    amountCents: number;
  }): Promise<void>;
}

interface ShippingClient {
  createShipment(input: {
    orderId: string;
    customerId: string;
  }): Promise<void>;
}

interface OrdersRepository {
  markFulfilled(orderId: string): Promise<void>;
}

class NaiveFulfillmentService {
  constructor(
    private readonly inventory: InventoryClient,
    private readonly payments: PaymentsClient,
    private readonly shipping: ShippingClient,
    private readonly orders: OrdersRepository,
  ) {}

  async fulfill(command: FulfillmentCommand): Promise<void> {
    await this.inventory.reserve({
      orderId: command.orderId,
      sku: command.sku,
      quantity: command.quantity,
    });

    await this.payments.charge({
      orderId: command.orderId,
      customerId: command.customerId,
      amountCents: command.amountCents,
    });

    await this.shipping.createShipment({
      orderId: command.orderId,
      customerId: command.customerId,
    });

    await this.orders.markFulfilled(command.orderId);
  }
}
```

This looks straightforward, but it hides the real production questions:
- what if the payment succeeded but the response timed out
- what if a retry books shipment twice
- what if shipping is degraded and the backlog starts exhausting threads
- what if one dependency stays unavailable long enough that the workflow must be repaired later

This is where **handling failures in distributed systems** becomes a design discipline, not an afterthought. You do not prevent every failure. You design the system so that failures are detected, bounded, retried when safe, surfaced honestly, and repaired without silent corruption.

In this chapter, you will learn:
  * [Why failure handling deserves first-class design](#1-why-failure-handling-deserves-first-class-design)
  * [What failure means in a distributed system](#2-what-failure-means-in-a-distributed-system)
  * [Which failure classes you should expect](#3-common-failure-classes)
  * [How strong failure-handling principles shape design](#4-failure-handling-principles)
  * [How timeouts, deadlines, retries, and backoff work together](#5-timeouts-deadlines-retries-and-backoff)
  * [How idempotency and deduplication protect side effects](#6-idempotency-deduplication-and-side-effect-safety)
  * [How isolation, degradation, and load shedding limit blast radius](#7-isolation-degradation-and-load-shedding)
  * [How detection, recovery, and reconciliation should work](#8-detection-recovery-and-reconciliation)
  * [What practical TypeScript patterns look like](#9-practical-typescript-patterns)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why Failure Handling Deserves First-Class Design

Failure handling matters because distributed systems are built from components that fail independently. If you treat failure as an exception path instead of a normal operating condition, the system often behaves worst exactly when it is under the most stress.

### Remote Calls Add Uncertainty, Not Just Latency

A local function call and a remote dependency call may look similar in code, but they have very different semantics:

```text
Local call:
  call -> return or throw

Remote call:
  send request
  maybe reach dependency
  maybe execute
  maybe return response
  maybe lose response
  maybe retry
```

That difference changes how you model correctness.

### Failures Hurt More When the System Lies About Them

An honest distributed system says:
- this step succeeded
- this step failed
- this step is still pending
- this step might have succeeded and needs reconciliation

A dishonest one compresses uncertainty into false certainty:
- "the charge failed" when it only timed out
- "the order is complete" before all downstream state converged
- "the worker is dead" after one missed heartbeat

Those lies produce duplicate work, inconsistent state, and unsafe automation.

### The Goal Is Not Perfect Uptime

A durable design goal is usually:

```text
When failure happens,
keep correctness clear,
limit blast radius,
and make recovery predictable.
```

That may mean:
- failing closed for exclusive writes
- failing open for low-risk reads
- degrading optional features
- delaying workflow completion until reconciliation is done

### Business Impact Often Comes From Secondary Effects

The direct dependency outage is only part of the problem. The larger cost often comes from:
- retry storms
- queue buildup
- blocked workers
- stale leadership decisions
- confused operators taking manual actions with incomplete information

This is why failure handling belongs in architecture, code, and operations together.


# 2. What Failure Means in a Distributed System

In a distributed system, failure does not just mean "a machine crashed." It means some assumption required for safe coordination no longer holds.

### Partial Failure Is the Default Challenge

One part of the system may be healthy while another is unavailable or unreachable:
- the caller is healthy, but the callee crashed
- the callee is healthy, but the network path is broken
- the primary is healthy, but followers cannot hear it
- the process is alive, but the database dependency is not

That is what makes failure handling different from simple crash recovery.

### The Caller Often Sees Ambiguous Outcomes

```text
Caller                         Dependency
  |                                 |
  |------ request ----------------->|
  |                                 | do work?
  |<----- timeout / lost reply -----X
  |                                 |
```

The caller may not know whether:
1. the dependency never received the request
2. the dependency received it and completed it
3. the dependency is still processing it

Those possibilities require different responses, but they can produce the same local symptom.

### Failure Is Also About Broken Guarantees

A component might still answer requests while violating assumptions you care about:
- a replica responds, but it is stale
- a leader still serves, but its lease expired
- a worker emits heartbeats, but it lost write access to storage
- an API returns 200, but the side effect is only queued and not durable yet

That is why health, correctness, and reachability are related but different.

### Useful State Models Admit Uncertainty

Distributed workflows often need explicit states such as:
- `PENDING`
- `IN_PROGRESS`
- `SUCCEEDED`
- `FAILED`
- `UNKNOWN`
- `RECONCILIATION_REQUIRED`

This is not overengineering. It is an honest way to represent outcomes that cannot always be observed immediately.


# 3. Common Failure Classes

You handle failures better when you separate them into classes instead of treating everything as "the dependency is down."

### Transport and Reachability Failures

These are communication failures:
- DNS lookup problems
- connection refusal
- timeout before response
- partition-like loss between two segments
- intermittent packet loss or high retransmission

These often look similar to the caller even when the underlying cause differs.

### Runtime and Resource Failures

A dependency may be reachable but not healthy enough to serve:
- CPU saturation
- memory pressure or garbage-collection pauses
- thread-pool exhaustion
- event-loop delay
- disk saturation

These failures often produce slow responses before they produce explicit errors.

### Dependency and Storage Failures

Many applications fail because a dependency below them becomes unavailable or inconsistent:
- database leader failover
- queue backlog or broker outage
- object-storage latency spike
- cache cluster eviction storm
- identity provider outage

A service may appear healthy until it touches one of these paths.

### Data and Semantic Failures

Some failures are not transport-level at all:
- duplicate command processing
- out-of-order events
- stale writes overwriting newer data
- replaying a side effect without idempotency protection
- accepting requests with expired authority or lease

These are often the most expensive because they can silently corrupt business state.

### Operational and Human Failures

Configuration mistakes and unsafe automation are common sources of distributed incidents:
- wrong firewall rules
- bad feature-flag rollout
- aggressive health-check thresholds
- broken retry policy pushed to every caller
- manual failover without fencing or reconciliation

A conservative design assumes these happen and limits how much damage one bad decision can cause.

### A Practical Comparison

```text
┌──────────────────────────────┬─────────────────────────────────────────────┬────────────────────────────────────────────┐
│ Failure class                │ Typical symptom                            │ Safer response                             │
├──────────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────────────┤
│ transport                    │ timeout, connection error                  │ bounded retry, alternate path if valid     │
├──────────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────────────┤
│ overload                     │ latency spike, queue growth                │ shed load, lower concurrency, backpressure │
├──────────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────────────┤
│ dependency outage            │ downstream errors                          │ degrade, queue, or fail clearly            │
├──────────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────────────┤
│ semantic duplication         │ repeated external effect                   │ idempotency and deduplication              │
├──────────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────────────┤
│ authority inconsistency      │ conflicting writes or leaders              │ fencing, quorum, conservative failover     │
└──────────────────────────────┴─────────────────────────────────────────────┴────────────────────────────────────────────┘
```


# 4. Failure-Handling Principles

Patterns help, but they work best when guided by a small set of durable principles.

### Prefer Clear Failure Domains

Separate the system so one failing path does not take unrelated work down with it:
- independent worker pools
- per-dependency connection pools
- queue boundaries between asynchronous stages
- explicit ownership of authoritative writes

```text
Client Requests
      |
      v
┌─────────────── API Layer ───────────────┐
│                                         │
│  pool A -> inventory                    │
│  pool B -> payments                     │
│  pool C -> shipping                     │
└─────────────────────────────────────────┘
```

If payments stall, inventory reads should not fail only because every shared thread is blocked.

### Fail With Truthful States

Avoid claiming more than the system knows. If a step timed out after sending work, prefer:
- `PENDING_CONFIRMATION`
- `UNKNOWN`
- `REQUIRES_RECONCILIATION`

over:
- `FAILED` when that is not established
- `SUCCEEDED` before downstream confirmation exists

### Separate Detection From Recovery

Detecting trouble and changing authority are different decisions.

```text
observe anomaly
  -> classify
  -> decide safe temporary behavior
  -> trigger recovery
  -> reconcile if needed
```

This separation reduces dangerous automation such as promoting a new writer immediately after one missed signal.

### Retry Only When the Operation and Context Allow It

Retries are not a universal reliability feature. They are safe only when:
- the operation is idempotent or deduplicated
- the caller still has deadline budget
- the dependency is likely to recover
- the retry will not amplify overload more than it helps

### Prefer Repairable Workflows Over Unobservable Side Effects

A repairable workflow usually has:
- durable workflow state
- explicit step transitions
- idempotent side effects
- a reconciliation path

An unrepairable workflow often consists of best-effort HTTP calls and log messages with no durable record of what was attempted.

### Degrade Intentionally

Not every failure requires the same response:

```text
Critical invariant:
  stop writes if authority is unclear

Optional feature:
  serve without recommendations

Slow dependency:
  queue work for later processing
```

The better your failure tiers, the less often you turn a partial outage into a full outage.


# 5. Timeouts, Deadlines, Retries, and Backoff

Most distributed failures first appear as waiting. That is why waiting policy is part of correctness design.

### Timeouts Bound How Long You Trust Silence

Without timeouts, callers can block indefinitely and tie up resources. With timeouts, callers regain control and can choose a safer next step.

Useful distinctions:
- `timeout`: how long one operation waits
- `deadline`: the total time budget for the whole request or workflow
- `cancellation`: the signal that tells downstream work the caller no longer wants the result

### Deadlines Are Stronger Than Per-Hop Timeouts

If every hop gets a fresh timeout, the total workflow can run much longer than the user or caller intended.

```text
Bad:
  gateway waits 2s
  service A waits 2s
  service B waits 2s
  service C waits 2s

Actual user wait can exceed 2s by a wide margin.
```

Passing a shrinking deadline downstream is usually safer than letting each dependency consume a full local timeout budget.

### Retries Need Classification

Not every error should be retried.

```text
┌──────────────────────────────┬─────────────────────────────────────────────┬────────────────────────────────────────────┐
│ Error shape                  │ Retry bias                                  │ Main caution                               │
├──────────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────────────┤
│ network timeout              │ sometimes retry                             │ original may still succeed                 │
├──────────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────────────┤
│ transient 5xx                │ often retry with limits                     │ avoid synchronized storms                  │
├──────────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────────────┤
│ validation error             │ do not retry                                │ caller must change request                 │
├──────────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────────────┤
│ rate limited                 │ maybe retry after backoff                   │ respect server guidance if available       │
├──────────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────────────┤
│ unknown commit state         │ retry only with idempotency or reconciliation│ duplicate effects otherwise                │
└──────────────────────────────┴─────────────────────────────────────────────┴────────────────────────────────────────────┘
```

### Backoff and Jitter Reduce Self-Inflicted Outages

When many callers retry at once, they can prolong the outage they are trying to survive.

```text
Without jitter:
  all clients retry at 100 ms, 200 ms, 400 ms

With jitter:
  clients spread retries across a window
```

That spread matters during overload and partial recovery.

### Retries Must Respect the Business Operation

Retrying a catalog read is different from retrying a payment charge.

```text
Read-only fetch:
  retry may be low risk

External side effect:
  retry can be dangerous unless the receiver supports idempotency
```

Good failure handling treats the business action, not just the transport error, as the unit of safety.


# 6. Idempotency, Deduplication, and Side-Effect Safety

Distributed systems often choose at-least-once delivery or retry-on-timeout because those are practical ways to survive unreliable networks. The trade-off is that receivers must handle duplicates safely.

### Idempotency Means Repeating the Same Intent Does Not Change the Final Outcome

For an idempotent operation:
- the caller can retry the same intent
- the receiver recognizes it as the same operation
- the final business outcome is stable

This is especially important for:
- charges
- reservations
- message consumers
- job processors
- webhook handlers

### Idempotency Requires More Than a Header

An idempotency key helps only if the receiver:
- stores it durably enough for the retry window
- binds it to the request semantics
- returns a consistent result for repeated submissions

If the receiver stores only "seen key" without validating the payload, callers can accidentally reuse a key for different intents.

### Deduplication Is Usually Time-Bounded

No system remembers duplicates forever. Practical designs choose:
- a dedupe key
- a retention window
- a storage location
- conflict behavior for mismatched payloads

That window should reflect how long retries, delayed responses, or message replays can realistically occur in the system.

### External Effects Often Need Their Own Protection

Even if your service is idempotent internally, downstream side effects may not be:
- email provider receives the same send twice
- shipping carrier receives duplicate label creation
- partner webhook is processed twice

This is why one common design is:

```text
commit local state + intent durably
  -> relay side effect asynchronously
  -> make relay and receiver idempotent
```

That does not eliminate all complexity, but it gives you repair points.

### Idempotency and Ordering Are Different

An operation can be idempotent and still be applied out of order.

Examples:
- `cancel order` arriving before `create order`
- old profile update replaying after a newer one
- lease-renewal message from a stale generation

When order matters, pair idempotency with:
- sequence numbers
- versions
- generation IDs
- leader-assigned offsets


# 7. Isolation, Degradation, and Load Shedding

Many failures become outages because systems keep trying to do everything even after evidence says they should narrow scope.

### Isolation Keeps One Bad Path From Taking the Rest Down

Isolation can happen at several levels:
- separate thread or worker pools
- separate queues
- dependency-specific concurrency caps
- read and write path separation
- tenant or shard-level partitioning

This is the basic idea behind bulkheads and other capacity-isolation patterns.

### Degrade Optional Features Before Critical Paths

When a non-critical dependency is slow or down, consider serving a reduced experience:
- hide recommendations
- delay analytics updates
- skip best-effort enrichment
- show cached profile metadata

That is often better than blocking a core user flow on optional work.

### Load Shedding Can Protect Recovery

If a system is overloaded, accepting more work may reduce the total amount of useful work completed.

```text
Incoming rate > sustainable rate
  -> queue grows
  -> latency grows
  -> callers time out
  -> callers retry
  -> load grows again
```

This positive feedback loop is why many systems reject excess load intentionally rather than fail slowly everywhere.

### Backpressure Should Flow Upstream

When a dependency slows down, upstream components should react rather than keep pushing at full speed.

Useful mechanisms include:
- bounded queues
- explicit concurrency limits
- deadline propagation
- rate limiting
- producer pause or slower polling

Without backpressure, the system often converts local saturation into global instability.

### Fallbacks Must Preserve Truth

Fallback behavior can help, but a fallback must not pretend to be authoritative when it is not.

```text
Good fallback:
  serve cached shipping estimate marked as approximate

Bad fallback:
  claim inventory is available without checking authoritative stock
```

The correctness bar depends on the business invariant.


# 8. Detection, Recovery, and Reconciliation

Handling failure well means planning for the whole lifecycle: detect, contain, recover, and repair.

### Detection Should Produce Actionable Signals

Detection inputs often include:
- heartbeats or lease renewals
- request error rates
- queue depth
- saturation metrics
- workflow state stuck beyond an expected threshold
- reconciliation mismatches

The goal is not to collect more signals. It is to trigger safer decisions sooner.

### Recovery Strategies Depend on the Failure Type

```text
┌──────────────────────────────┬─────────────────────────────────────────────┐
│ Failure type                 │ Typical recovery shape                      │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ transient network issue      │ bounded retry with backoff                  │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ instance crash               │ restart and re-register                     │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ dependency outage            │ degrade, queue, or redirect                 │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ unclear write ownership      │ stop writes, verify authority, then recover │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ ambiguous workflow outcome   │ reconcile with authoritative source         │
└──────────────────────────────┴─────────────────────────────────────────────┘
```

Fast recovery is useful, but unsafe recovery is often worse than a short outage.

### Reconciliation Turns Unknown Into Known

Reconciliation is the process that asks an authoritative source what really happened and repairs local state accordingly.

```text
Order service state: PAYMENT_UNKNOWN
         |
         v
reconciliation worker queries payment system
         |
         +--> charge found      -> mark paid
         |
         +--> charge not found  -> retry or fail
         |
         +--> still unclear     -> keep pending and alert if overdue
```

This is why durable workflow state is valuable. It gives the recovery process something concrete to inspect and advance.

### Recovery Needs Fences Around Authority Changes

If recovery includes failover or work reassignment, the system should avoid overlapping authority. Useful tools include:
- leases
- generation numbers
- fencing tokens
- quorum-based leadership decisions
- explicit worker ownership records

These mechanisms do not remove all failure risk, but they reduce the chance of concurrent actors performing the same exclusive work.

### Repair Paths Should Be Tested, Not Assumed

Many systems are tested only for happy-path success and catastrophic full outage. Real incidents often live in the middle:
- one service timed out after side effects
- one worker resumed after reassignment
- one replica came back with stale state
- one batch replay produced duplicates

If your recovery process exists only in design notes, it is probably not ready.


# 9. Practical TypeScript Patterns

The exact libraries vary, but the practical patterns are stable: classify failures, honor deadlines, retry conservatively, record durable workflow state, and reconcile ambiguous outcomes.

### A Small Failure Classification Model

```typescript
type FailureKind =
  | "timeout"
  | "transient"
  | "permanent"
  | "rate_limited"
  | "unknown_outcome";

type ClassifiedFailure = {
  kind: FailureKind;
  message: string;
  retryable: boolean;
};

function isAbortLikeError(error: unknown): error is { name: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof error.name === "string" &&
    error.name === "AbortError"
  );
}

function classifyError(error: unknown): ClassifiedFailure {
  if (isAbortLikeError(error)) {
    return {
      kind: "timeout",
      message: "Request exceeded deadline",
      retryable: true,
    };
  }

  if (error instanceof Error && /429/.test(error.message)) {
    return {
      kind: "rate_limited",
      message: error.message,
      retryable: true,
    };
  }

  if (error instanceof Error && /5\d\d/.test(error.message)) {
    return {
      kind: "transient",
      message: error.message,
      retryable: true,
    };
  }

  if (error instanceof Error && /unknown outcome/i.test(error.message)) {
    return {
      kind: "unknown_outcome",
      message: error.message,
      retryable: false,
    };
  }

  return {
    kind: "permanent",
    message: error instanceof Error ? error.message : "Unknown error",
    retryable: false,
  };
}
```

This model is intentionally small. The important part is that `unknown_outcome` is different from a clean failure.

### Deadline-Aware Retry With Jitter

```typescript
type RetryPolicy = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
};

type Clock = {
  nowMs(): number;
};

const systemClock: Clock = {
  nowMs: () => Date.now(),
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeBackoffDelayMs(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
): number {
  const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
  const jitter = Math.floor(Math.random() * Math.max(1, Math.floor(exponential * 0.25)));

  return exponential + jitter;
}

async function retryWithDeadline<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  deadlineAtMs: number,
  policy: RetryPolicy,
  clock: Clock = systemClock,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    const remainingMs = deadlineAtMs - clock.nowMs();

    if (remainingMs <= 0) {
      throw new Error("Deadline exhausted before retry could continue");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), remainingMs);

    try {
      return await operation(controller.signal);
    } catch (error) {
      lastError = error;

      const failure = classifyError(error);
      if (!failure.retryable || attempt === policy.maxAttempts) {
        throw error;
      }

      const delayMs = computeBackoffDelayMs(
        attempt,
        policy.baseDelayMs,
        policy.maxDelayMs,
      );

      if (clock.nowMs() + delayMs >= deadlineAtMs) {
        throw error;
      }

      await sleep(delayMs);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error("Retry failed without captured error");
}
```

This pattern keeps three important constraints together:
- one request-level deadline
- bounded retries
- jitter to reduce synchronized retry bursts

### Idempotency Records for Side Effects

```typescript
type IdempotencyRecord<T> = {
  key: string;
  requestHash: string;
  status: "started" | "completed";
  response?: T;
};

interface IdempotencyStore<T> {
  find(key: string): Promise<IdempotencyRecord<T> | null>;
  create(record: IdempotencyRecord<T>): Promise<void>;
  markCompleted(key: string, response: T): Promise<void>;
}

function serializeRequestForComparison(value: unknown): string {
  return JSON.stringify(value);
}

async function executeIdempotently<TInput, TResult>(
  key: string,
  input: TInput,
  store: IdempotencyStore<TResult>,
  handler: () => Promise<TResult>,
): Promise<TResult> {
  const requestHash = serializeRequestForComparison(input);
  const existing = await store.find(key);

  if (existing) {
    if (existing.requestHash !== requestHash) {
      throw new Error("Idempotency key reused for different input");
    }

    if (existing.status === "completed" && existing.response !== undefined) {
      return existing.response;
    }

    throw new Error("Operation already started and requires reconciliation");
  }

  await store.create({
    key,
    requestHash,
    status: "started",
  });

  const result = await handler();
  await store.markCompleted(key, result);

  return result;
}
```

This is simplified, but it demonstrates the core discipline:
- bind key to request semantics
- remember in-progress state
- return stable output when possible
- use a canonical request representation in production rather than a bare `JSON.stringify`

### Durable Workflow State With Reconciliation

```typescript
type FulfillmentState =
  | "PENDING"
  | "INVENTORY_RESERVED"
  | "PAYMENT_UNKNOWN"
  | "PAID"
  | "SHIPMENT_PENDING"
  | "FULFILLED"
  | "FAILED";

type FulfillmentRecord = {
  orderId: string;
  customerId: string;
  sku: string;
  quantity: number;
  amountCents: number;
  state: FulfillmentState;
};

interface FulfillmentRepository {
  find(orderId: string): Promise<FulfillmentRecord | null>;
  save(record: FulfillmentRecord): Promise<void>;
}

interface PaymentsGateway {
  charge(
    input: {
      orderId: string;
      customerId: string;
      amountCents: number;
    },
    options: {
      idempotencyKey: string;
      signal: AbortSignal;
    },
  ): Promise<{ chargeId: string }>;
  lookupChargeStatus(orderId: string): Promise<"paid" | "not_found" | "unknown">;
}

class FulfillmentWorkflowService {
  constructor(
    private readonly repository: FulfillmentRepository,
    private readonly payments: PaymentsGateway,
  ) {}

  async chargeOrder(record: FulfillmentRecord, deadlineAtMs: number): Promise<void> {
    try {
      await retryWithDeadline(
        (signal) =>
          this.payments.charge(
            {
              orderId: record.orderId,
              customerId: record.customerId,
              amountCents: record.amountCents,
            },
            {
              idempotencyKey: `payment:${record.orderId}`,
              signal,
            },
          ),
        deadlineAtMs,
        {
          maxAttempts: 3,
          baseDelayMs: 100,
          maxDelayMs: 1_000,
        },
      );

      await this.repository.save({
        ...record,
        state: "PAID",
      });
    } catch (error) {
      const failure = classifyError(error);

      await this.repository.save({
        ...record,
        state: failure.kind === "unknown_outcome" ? "PAYMENT_UNKNOWN" : "FAILED",
      });

      throw error;
    }
  }

  async reconcilePayment(orderId: string): Promise<void> {
    const record = await this.repository.find(orderId);
    if (!record || record.state !== "PAYMENT_UNKNOWN") {
      return;
    }

    const chargeStatus = await this.payments.lookupChargeStatus(orderId);

    if (chargeStatus === "unknown") {
      return;
    }

    await this.repository.save({
      ...record,
      state: chargeStatus === "paid" ? "PAID" : "FAILED",
    });
  }
}
```

This style is useful because it keeps ambiguous outcomes visible and repairable instead of burying them inside log lines.

### A Conservative Review Checklist for Code

When reading distributed workflow code, ask:
- where is the deadline budget enforced
- which errors are retried, and why
- which side effects are idempotent
- where unknown outcomes are recorded
- how reconciliation is triggered
- whether any fallback can violate a core invariant

If those answers are unclear in code, they are usually unclear in production behavior too.


# 10. Summary

**Failure handling is part of the normal design model:**
- Distributed systems fail through ambiguity, partial reachability, overload, stale authority, and semantic duplication.
- The question is rarely "Will something fail?" and more often "What will the system do when only part of it fails?"

**Truthful state matters more than optimistic messaging:**
- Timeouts do not automatically mean an operation failed.
- Durable workflows should represent unknown and reconciliation-required states explicitly.

**Retries help only when paired with safety controls:**
- Use deadlines, bounded retries, backoff, and jitter together.
- Retry only when the business operation is safe to repeat or protected by idempotency.

**Containment is as important as recovery:**
- Isolate failure domains, degrade optional work, propagate backpressure, and shed excess load when necessary.
- A smaller degraded service is often safer than a broader slow outage.

**Recovery must include reconciliation:**
- Recovery is not complete until the system resolves ambiguous outcomes and restores authoritative state.
- Failover, work reassignment, and side-effect replay should all have conservative safeguards.

**Implementation checklist:**

```text
Workflow Modeling:
  □ Define explicit states for pending, failed, unknown, and reconciliation-required outcomes
  □ Record durable workflow progress instead of relying on in-memory sequencing
  □ Identify which data source is authoritative for each recovery decision

Timeouts and Retries:
  □ Set request deadlines, not just per-hop timeouts
  □ Retry only classified transient failures and only within remaining deadline budget
  □ Add exponential backoff and jitter to avoid synchronized retry storms

Side-Effect Safety:
  □ Use idempotency keys or deduplication for retryable external effects
  □ Bind idempotency records to request semantics, not just a raw key
  □ Add ordering or generation checks where stale messages can arrive late

Containment:
  □ Isolate dependency pools, queues, or worker capacity to reduce blast radius
  □ Decide which features can degrade and which invariants must fail closed
  □ Propagate backpressure or shed load before saturation cascades outward

Recovery and Operations:
  □ Monitor stuck workflows, retries, queue growth, and reconciliation backlog
  □ Build reconciliation jobs for ambiguous outcomes instead of relying on manual log inspection
  □ Test partial-failure scenarios, not just happy paths and full outages
```
