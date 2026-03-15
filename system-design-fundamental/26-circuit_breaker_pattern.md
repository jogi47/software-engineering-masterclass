# Circuit Breaker Pattern

[← Back to Index](README.md)

Imagine you run a checkout service that depends on payments, inventory, and fraud checks. Everything looks fine in staging, so the first production version simply calls downstream services and waits for them to respond.

Without a circuit breaker, one slow dependency can quietly turn into a system-wide incident:

```typescript
// Bad example: slow downstream calls consume capacity until the caller also becomes unhealthy.
class CheckoutService {
  async authorize(orderId: string, amountCents: number): Promise<void> {
    const response = await fetch("https://payments.internal/authorizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, amountCents }),
    });

    if (!response.ok) {
      throw new Error("Payment authorization failed");
    }
  }
}
```

This usually breaks in predictable ways:
- the caller keeps sending traffic to a dependency that is already slow or unavailable
- threads, sockets, and connection pools stay busy waiting for timeouts
- retries from many callers can increase pressure on the failing dependency
- failures spread outward until unrelated user paths also degrade

This is where the **Circuit Breaker pattern** comes in. A circuit breaker watches calls to a dependency and temporarily stops sending more traffic when failure signals cross a threshold. That gives the caller a controlled failure mode and gives the dependency room to recover.

In this chapter, you will learn:
  * [Why circuit breakers exist](#1-why-circuit-breakers-exist)
  * [What the circuit breaker pattern is and is not](#2-what-the-circuit-breaker-pattern-is)
  * [Which states and building blocks matter](#3-states-and-building-blocks)
  * [How circuit breaker flow works end to end](#4-how-circuit-breaker-flow-works)
  * [How to tune thresholds, windows, and fallback policy](#5-thresholds-windows-and-fallback-policy)
  * [How circuit breakers compare to retries, timeouts, and other resilience controls](#6-circuit-breaker-vs-adjacent-resilience-patterns)
  * [What practical TypeScript implementations look like](#7-practical-typescript-patterns)
  * [Which best practices make the pattern safer](#8-best-practices)
  * [Where circuit breakers fit and which pitfalls to avoid](#9-where-circuit-breakers-fit-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why Circuit Breakers Exist

Circuit breakers exist because failure in distributed systems is rarely isolated to a single call.

### The Core Problem

When one service depends on another, the caller often pays the cost of downstream instability:
- requests wait on timeouts
- worker pools stay occupied
- connection pools fill up
- retries amplify the original problem

```text
Without circuit breaker:

checkout service
  -> payment service is slow
  -> more requests pile up
  -> caller resources are consumed
  -> upstream requests start timing out too

Result:
  -> one dependency issue becomes a wider outage
```

### Cascading Failure Is Usually About Capacity

The pattern is not mainly about elegant error handling. It is about protecting limited resources:
- request concurrency
- CPU and memory
- connection slots
- thread or event-loop time

If you keep sending work into a failing dependency, the caller may become unhealthy before the dependency recovers.

### Why Retries Alone Are Not Enough

Retries can help when failures are rare and short. They can also make things worse:
- many clients retry at once
- each original request becomes several downstream attempts
- the dependency gets less recovery time, not more

### Where Circuit Breakers Help Most

Circuit breakers are most useful when:
- the dependency is remote and can fail independently
- the caller handles meaningful traffic volume
- timeout cost is significant
- the system needs an explicit degraded mode instead of indefinite waiting

If a dependency is local, cheap, and highly reliable, a breaker may add overhead without enough benefit.


# 2. What the Circuit Breaker Pattern Is

A circuit breaker is a guard around a dependency call that changes behavior based on recent failure signals.

### A Conservative Definition

The durable idea is:

```text
Circuit breaker = dependency call guard + failure tracking + temporary rejection of new calls
```

The breaker usually does three things:
- tracks recent outcomes such as timeouts, errors, or high latency
- opens when the failure signal crosses a configured threshold
- allows limited probes later to see whether the dependency has recovered

### What It Is Not

A circuit breaker is usually not:
- a replacement for timeouts
- a replacement for idempotency decisions
- a guarantee that downstream recovery is safe or complete
- something you should wrap around every function call by default

### The Electrical Analogy Is Useful but Imperfect

The name comes from electrical breakers:
- **closed** means current flows
- **open** means current stops

For software, translate that carefully:
- **closed** means calls are allowed
- **open** means calls are rejected quickly
- **half-open** means a small number of probe calls are allowed

### High-Level Model

```text
┌──────────────┐      protected call      ┌────────────────┐
│ Caller       │ -----------------------> │ Circuit breaker│
└──────────────┘                          └──────┬─────────┘
                                                │
                                  allowed       │        rejected fast
                                                ▼
                                         ┌──────────────┐
                                         │ Dependency   │
                                         └──────────────┘
```

The important point is not the exact algorithm. It is that the caller stops treating every request as if the dependency were healthy.


# 3. States and Building Blocks

Most circuit breaker designs can be understood through a few states and a few policy choices.

### The Three Common States

```text
CLOSED
  -- failures cross threshold --> OPEN

OPEN
  -- recovery timeout elapsed --> HALF-OPEN

HALF-OPEN
  -- probe succeeds enough --> CLOSED
  -- probe fails --> OPEN
```

### State 1: Closed

In the **closed** state:
- calls are allowed
- the breaker records outcomes
- normal traffic flows

Closed does not mean perfect health. It means recent behavior is still within acceptable limits.

### State 2: Open

In the **open** state:
- new calls are rejected immediately or routed to fallback behavior
- the dependency is protected from more load from this caller
- the caller preserves capacity for other work

This is often the most valuable state during an outage because it fails fast.

### State 3: Half-Open

In the **half-open** state:
- only a limited number of probe requests are allowed
- the system checks whether the dependency appears healthy again
- success may close the breaker
- failure reopens it

Half-open is important because a breaker should not stay open forever if the dependency has recovered.

### Supporting Building Blocks

A practical breaker usually needs:
- a **failure signal**: timeout, error rate, consecutive failures, or latency threshold
- an **observation window**: rolling time window or sliding request count
- an **open duration**: how long to reject before allowing probes
- a **probe policy**: how many half-open requests are allowed
- a **fallback policy**: fail fast, use cached data, return partial response, or enqueue work

### Failure Signals Need Careful Definitions

Not every non-`200` response should count the same way.

Examples:
- a timeout may indicate dependency health trouble
- a connection reset may indicate transport trouble
- a `429` may indicate quota enforcement rather than dependency failure
- a `400` from a bad caller request usually should not trip the breaker

The breaker only works well when failure classification matches the dependency contract.


# 4. How Circuit Breaker Flow Works

The basic request path is usually straightforward even if the implementation details vary.

### Step-by-Step Flow

```text
1. Caller prepares a dependency request
2. Circuit breaker checks current state
3. If open, the call is rejected immediately or routed to fallback
4. If closed or allowed in half-open, the call is attempted
5. The breaker records success, timeout, or failure
6. If failure metrics cross threshold, the breaker opens
7. After the open interval, limited probe calls are allowed
8. Probe results decide whether to close or reopen
```

### End-to-End Example

Consider a checkout service calling a payment authorization service:

```text
┌──────────────┐      call      ┌────────────────┐      call      ┌──────────────┐
│ Checkout     │ -------------> │ Circuit breaker│ -------------> │ Payments svc │
└──────────────┘                └────────────────┘                └──────────────┘
       │                                 │
       │ open breaker                    │ records timeout/error/success
       ▼                                 ▼
┌──────────────┐                ┌────────────────┐
│ fail fast or │                │ rolling window │
│ use fallback │                │ and thresholds │
└──────────────┘                └────────────────┘
```

### Closed-State Behavior

While closed, the breaker behaves like an observer:
- it lets calls through
- it tracks latency and outcomes
- it decides whether the recent failure rate is still acceptable

### Open-State Behavior

When open, the breaker changes the caller's behavior immediately:
- skip the remote call
- return a degraded response
- surface a typed error
- maybe enqueue or defer work if the use case supports it

### Half-Open Behavior

Half-open is a controlled experiment:
- allow a very small number of requests
- avoid releasing full production traffic at once
- observe whether latency and success rate have improved

This prevents a dependency from being overwhelmed the moment it starts recovering.


# 5. Thresholds, Windows, and Fallback Policy

The hard part of a circuit breaker is rarely the state machine. It is choosing thresholds that match the dependency and user path.

### Common Threshold Styles

Teams often trip breakers based on one or more of these signals:
- **consecutive failures**
- **failure rate within a rolling window**
- **slow-call rate**, where very high latency counts as a failure signal
- **minimum request volume**, so a few requests do not flip the breaker too easily

```text
Example policy:
  if at least 20 requests were seen in the last 30 seconds
  and more than 50% failed or timed out
  then open for 15 seconds
```

### Rolling Window vs Consecutive Failures

Both approaches are common:

```text
┌──────────────────────┬────────────────────────────────────────────┬────────────────────────────────────────────┐
│ Strategy             │ Useful when                                │ Watch for                                  │
├──────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Consecutive failures │ traffic is steady and failures are obvious │ noisy trips during brief blips             │
├──────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Failure-rate window  │ traffic is bursty or partial failure occurs │ extra tuning around sample size            │
├──────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Slow-call rate       │ high latency hurts before hard errors appear│ classifying "slow" realistically           │
└──────────────────────┴────────────────────────────────────────────┴────────────────────────────────────────────┘
```

### Open Duration Should Be Deliberate

If the open interval is too short:
- the caller may probe too aggressively
- the dependency gets little recovery time

If it is too long:
- users may see avoidable degraded behavior after recovery

The right interval depends on:
- how quickly the dependency usually recovers
- how expensive probe failures are
- whether there is a useful fallback

### Fallback Is a Product Decision, Not Just a Technical One

Typical fallback options include:
- fail fast with a clear error
- return stale cached data
- omit an optional panel or recommendation
- enqueue work for later processing

```text
Critical path example:
  payment authorization
  -> usually fail fast, do not guess success

Optional path example:
  recommendation service
  -> often omit recommendations and continue
```

### Timeouts Still Matter

A breaker without timeouts is incomplete. The breaker needs timely signals:
- request timeout
- connection timeout
- maybe total deadline for a fan-out workflow

Otherwise the caller still waits too long before the breaker learns anything.


# 6. Circuit Breaker vs Adjacent Resilience Patterns

Circuit breakers work best as one part of a broader resilience policy.

### Circuit Breaker vs Timeout

A timeout limits how long one call waits.

A circuit breaker decides whether future calls should be attempted at all.

```text
Timeout:
  protects one request from waiting forever

Circuit breaker:
  protects many future requests from repeating the same pain
```

### Circuit Breaker vs Retry

Retries assume some failures are transient.

Circuit breakers assume repeated failure means you should stop sending more traffic for a while.

Retries and breakers can work together, but the order matters:
- keep retry count small
- apply short timeouts
- let the breaker open before retries become a storm

### Circuit Breaker vs Bulkhead

A bulkhead isolates resources so one failing path does not consume everything.

A circuit breaker decides whether to send calls in the first place.

These often complement each other:
- bulkhead limits blast radius inside the caller
- circuit breaker reduces pressure on the dependency

### Circuit Breaker vs Rate Limiting

Rate limiting controls caller behavior based on quota or abuse policy.

A circuit breaker controls dependency traffic based on dependency health signals.

### A Practical Comparison

```text
┌──────────────────────┬────────────────────────────────────────────┬────────────────────────────────────────────┐
│ Pattern              │ Main job                                   │ Typical question answered                  │
├──────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Timeout              │ bound wait time                            │ how long should one call wait              │
├──────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Retry                │ reattempt transient failure                │ should this call be tried again            │
├──────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Circuit breaker      │ stop repeated calls to unhealthy dependency│ should we keep calling this dependency now │
├──────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Bulkhead             │ isolate capacity                           │ can one failing path consume all resources │
├──────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Rate limiting        │ control allowed request volume             │ how much traffic is allowed                │
└──────────────────────┴────────────────────────────────────────────┴────────────────────────────────────────────┘
```

### The Pattern Stack Usually Matters More Than Any One Pattern

In practice, resilient clients often combine:
- deadlines or timeouts
- modest retries for safe operations
- circuit breakers for repeated failure
- bulkheads or concurrency limits
- observability so operators can see what tripped and why


# 7. Practical TypeScript Patterns

The examples here are intentionally small, but they show a maintainable structure.

### Pattern 1: A Minimal Circuit Breaker State Model

```typescript
type CircuitState = "closed" | "open" | "half-open";

type FailureClassifier = (error: unknown) => boolean;

type CircuitBreakerOptions = {
  failureThreshold: number;
  recoveryTimeoutMs: number;
  halfOpenMaxCalls: number;
  shouldCountAsFailure: FailureClassifier;
};

class CircuitBreakerOpenError extends Error {
  constructor(public readonly circuitName: string) {
    super(`Circuit "${circuitName}" is open`);
  }
}

class CircuitBreaker {
  private state: CircuitState = "closed";
  private consecutiveFailures = 0;
  private openedAtMs = 0;
  private halfOpenInFlight = 0;

  constructor(
    private readonly circuitName: string,
    private readonly options: CircuitBreakerOptions,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const nowMs = Date.now();
    let halfOpenExecution = false;

    if (this.state === "open") {
      const elapsedMs = nowMs - this.openedAtMs;

      if (elapsedMs < this.options.recoveryTimeoutMs) {
        throw new CircuitBreakerOpenError(this.circuitName);
      }

      this.state = "half-open";
      this.halfOpenInFlight = 0;
    }

    if (this.state === "half-open") {
      if (this.halfOpenInFlight >= this.options.halfOpenMaxCalls) {
        throw new CircuitBreakerOpenError(this.circuitName);
      }

      this.halfOpenInFlight += 1;
      halfOpenExecution = true;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error, halfOpenExecution);
      throw error;
    } finally {
      if (halfOpenExecution && this.halfOpenInFlight > 0) {
        this.halfOpenInFlight -= 1;
      }
    }
  }

  getSnapshot(): {
    state: CircuitState;
    consecutiveFailures: number;
    openedAtIso?: string;
  } {
    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      openedAtIso: this.openedAtMs > 0 ? new Date(this.openedAtMs).toISOString() : undefined,
    };
  }

  private onSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = "closed";
  }

  private onFailure(error: unknown, fromHalfOpen: boolean): void {
    if (!this.options.shouldCountAsFailure(error)) {
      return;
    }

    if (fromHalfOpen) {
      this.openCircuit();
      return;
    }

    this.consecutiveFailures += 1;

    if (this.consecutiveFailures >= this.options.failureThreshold) {
      this.openCircuit();
    }
  }

  private openCircuit(): void {
    this.state = "open";
    this.openedAtMs = Date.now();
  }
}
```

This small implementation is not feature-complete, but it shows the core contract clearly:
- callers go through one wrapper
- state transitions are explicit
- half-open probes are limited
- failure classification is configurable

### Pattern 2: Protect a Dependency Client with Timeout and Typed Fallback

```typescript
type PaymentAuthorization = {
  authorizationId: string;
  approved: boolean;
};

class PaymentUnavailableError extends Error {}

class PaymentsClient {
  constructor(
    private readonly baseUrl: string,
    private readonly breaker: CircuitBreaker,
  ) {}

  async authorize(orderId: string, amountCents: number): Promise<PaymentAuthorization> {
    try {
      return await this.breaker.execute(async () => {
        const response = await fetch(`${this.baseUrl}/authorizations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, amountCents }),
          signal: AbortSignal.timeout(1_500),
        });

        if (!response.ok) {
          throw new Error(`Payments returned ${response.status}`);
        }

        return (await response.json()) as PaymentAuthorization;
      });
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        throw new PaymentUnavailableError("Payments circuit is open");
      }

      throw error;
    }
  }
}
```

This makes a few important choices explicit:
- timeouts are part of the dependency contract
- breaker-open is handled differently from generic failure
- domain code does not have to inspect low-level dependency details everywhere

### Pattern 3: Use Degraded Responses for Optional Dependencies

```typescript
type ProductPage = {
  productId: string;
  title: string;
  recommendations: string[];
  recommendationsDegraded: boolean;
};

class RecommendationClient {
  constructor(
    private readonly baseUrl: string,
    private readonly breaker: CircuitBreaker,
  ) {}

  async getRecommendations(productId: string): Promise<string[]> {
    return this.breaker.execute(async () => {
      const response = await fetch(`${this.baseUrl}/products/${productId}/recommendations`, {
        signal: AbortSignal.timeout(500),
      });

      if (!response.ok) {
        throw new Error(`Recommendation service returned ${response.status}`);
      }

      return (await response.json()) as string[];
    });
  }
}

class ProductPageService {
  constructor(private readonly recommendationClient: RecommendationClient) {}

  async load(productId: string, title: string): Promise<ProductPage> {
    try {
      const recommendations = await this.recommendationClient.getRecommendations(productId);

      return {
        productId,
        title,
        recommendations,
        recommendationsDegraded: false,
      };
    } catch {
      return {
        productId,
        title,
        recommendations: [],
        recommendationsDegraded: true,
      };
    }
  }
}
```

For optional dependencies, degraded mode is often a better user experience than letting the whole request fail.

### Pattern 4: Keep Metrics and State Observable

```typescript
type CircuitSnapshot = {
  name: string;
  state: CircuitState;
  consecutiveFailures: number;
  openedAtIso?: string;
};

class CircuitRegistry {
  constructor(
    private readonly circuits: Map<string, CircuitBreaker>,
  ) {}

  collectSnapshots(): CircuitSnapshot[] {
    return Array.from(this.circuits.entries()).map(([name, circuit]) => {
      const snapshot = circuit.getSnapshot();

      return {
        name,
        state: snapshot.state,
        consecutiveFailures: snapshot.consecutiveFailures,
        openedAtIso: snapshot.openedAtIso,
      };
    });
  }
}
```

Whatever library or runtime you use, expose enough state to answer:
- which circuit is open
- for which dependency
- since when
- because of which kind of failure signal


# 8. Best Practices

Circuit breakers are safest when they are narrow, observable, and tuned per dependency rather than copied blindly.

### Best Practice 1: Break by Dependency, Not by Whole Service

Separate breakers usually make more sense for:
- `payments.authorize`
- `inventory.reserve`
- `recommendations.fetch`

One shared breaker for all downstream calls can hide which dependency is actually failing.

### Best Practice 2: Pair Breakers with Deadlines and Small Retries

Use a resilience stack, not a single switch:
- bounded timeout
- maybe one small retry for safe operations
- breaker to stop repeated pain
- concurrency limits where saturation is a concern

### Best Practice 3: Use Meaningful Failure Classification

A breaker should usually count:
- connection failures
- timeouts
- dependency `5xx` responses

It should often avoid counting:
- caller validation errors
- dependency responses that indicate a bad request from the caller
- expected business denials that are not signs of health trouble

### Best Practice 4: Define Fallback Behavior Up Front

Before rollout, decide:
- which requests should fail fast
- which can return stale data
- which can omit optional fields
- which should surface a retryable error to an upstream queue or client

### Best Practice 5: Emit State Changes as Operational Signals

Useful events include:
- circuit opened
- circuit half-opened
- circuit closed again
- breaker-open rejections per minute

Without this visibility, operators only see downstream failures indirectly.


# 9. Where Circuit Breakers Fit and Common Pitfalls

The pattern is helpful, but it is easy to misapply.

### Where Circuit Breakers Often Fit Well

Common places include:
- service-to-service HTTP or gRPC clients
- calls from API gateways or BFFs to optional downstream services
- background workers calling remote APIs
- third-party integrations with variable latency

```text
Common placement:

user request
  -> edge layer
  -> application service
  -> breaker-protected dependency client
  -> remote service
```

### Pitfall 1: Opening on Too Little Data

If the breaker opens after one or two failures with almost no traffic:
- harmless blips may cause unnecessary degraded mode
- users may see instability created by your policy rather than the dependency

Minimum sample volume often matters as much as the failure threshold.

### Pitfall 2: Hiding Incidents Behind Permanent Fallback

Fallback is useful, but it can also hide real dependency failure for too long.

Examples:
- stale cache returned for hours without alerting
- optional data omitted so often that product quality quietly degrades

Degraded mode still needs monitoring and ownership.

### Pitfall 3: Using the Same Settings for Every Dependency

Different dependencies tolerate different policies:
- payment authorization may need strict fail-fast behavior
- recommendations may allow looser degradation
- internal metadata lookups may need different latency thresholds than third-party APIs

### Pitfall 4: Forgetting Shared Failure Modes

Sometimes the dependency is healthy but a shared component is not:
- DNS resolution
- network path
- service mesh proxy
- shared authentication layer

The breaker still helps protect the caller, but operators need to know the root cause may sit elsewhere.

### Pitfall 5: Treating the Breaker as a Cure-All

Circuit breakers reduce pressure. They do not fix:
- non-idempotent retry hazards
- overloaded queues
- poor capacity planning
- missing observability
- broken authorization design

Use them as one control in a larger reliability design.


# 10. Summary

**Why circuit breakers exist:**
- remote dependencies can fail in ways that consume caller capacity and spread failure
- failing fast is often safer than waiting on repeated timeouts
- a controlled degraded mode is usually easier to operate than a cascading outage

**What the pattern does well:**
- tracks recent dependency health signals
- opens to reject repeated calls when a dependency appears unhealthy
- probes cautiously before returning to normal traffic

**What it should not replace:**
- explicit timeouts and deadlines
- careful retry policy
- bulkheads, concurrency limits, and observability
- clear product decisions about fallback behavior

**Practical design advice:**
- classify failures carefully so user mistakes do not trip dependency protection
- tune thresholds per dependency and user path
- monitor circuit state transitions so degraded mode is visible to operators

**Implementation checklist:**

```text
Scope and ownership:
  □ Choose which remote dependencies need breaker protection
  □ Create breakers per dependency or operation, not one global switch
  □ Define which user paths may degrade and which must fail fast

Signals and thresholds:
  □ Decide which outcomes count as breaker failures
  □ Choose a rolling window or consecutive-failure strategy deliberately
  □ Set minimum volume, open duration, and half-open probe limits

Reliability controls:
  □ Add request timeouts and overall deadlines before relying on the breaker
  □ Keep retries small and safe for the operation type
  □ Consider concurrency limits or bulkheads for expensive dependency paths

Fallback behavior:
  □ Define the fallback for each protected dependency
  □ Avoid silent long-term degradation without alerting
  □ Make degraded responses explicit in logs, metrics, or response metadata where useful

Operations:
  □ Emit metrics and events for open, half-open, and closed transitions
  □ Track breaker-open rejections, timeout rate, and dependency latency separately
  □ Review thresholds after incidents instead of freezing the first configuration forever
```
