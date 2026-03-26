# Challenges of Distribution

[← Back to Index](README.md)

Imagine you are building checkout for an e-commerce platform. The user clicks one button and expects one clear outcome: the order is accepted, the inventory is reserved, the payment is handled, and the confirmation reflects reality.

Without distributed-systems discipline, teams often write remote workflows that look locally clean but quietly assume the network behaves like a function call:

```typescript
type PlaceOrderInput = {
  orderId: string;
  customerId: string;
  sku: string;
  quantity: number;
  amountCents: number;
};

interface OrdersRepository {
  createPending(input: PlaceOrderInput): Promise<void>;
  markConfirmed(orderId: string, confirmedAtIso: string): Promise<void>;
}

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

interface NotificationsClient {
  sendOrderConfirmed(input: {
    orderId: string;
    customerId: string;
  }): Promise<void>;
}

class NaiveOrderPlacementService {
  constructor(
    private readonly orders: OrdersRepository,
    private readonly inventory: InventoryClient,
    private readonly payments: PaymentsClient,
    private readonly notifications: NotificationsClient,
  ) {}

  async placeOrder(input: PlaceOrderInput): Promise<void> {
    await this.orders.createPending(input);
    await this.inventory.reserve({
      orderId: input.orderId,
      sku: input.sku,
      quantity: input.quantity,
    });
    await this.payments.charge({
      orderId: input.orderId,
      customerId: input.customerId,
      amountCents: input.amountCents,
    });
    await this.orders.markConfirmed(input.orderId, new Date().toISOString());
    await this.notifications.sendOrderConfirmed({
      orderId: input.orderId,
      customerId: input.customerId,
    });
  }
}
```

This fails in ways that are easy to miss during happy-path development:
- the payment may succeed even if the caller times out waiting for the response
- a retry may reserve inventory or charge money twice unless the downstream APIs are idempotent
- the local timestamp used for `markConfirmed` does not prove global ordering across machines
- the confirmation message may be sent while part of the system is still inconsistent or uncertain

This is where the **challenges of distribution** begin. Once a workflow crosses machine boundaries, you inherit unreliable networks, partial failure, variable latency, unsynchronized clocks, and fragmented state. None of those are edge cases. They are part of the normal environment.

In this chapter, you will learn:
  * [Why distribution changes the problem](#1-why-distribution-changes-the-problem)
  * [Why partial failure creates ambiguity](#2-partial-failure-and-ambiguous-outcomes)
  * [How unreliable networks affect delivery semantics](#3-unreliable-networks-and-delivery-semantics)
  * [Why clocks and timestamps can mislead you](#4-time-clocks-and-event-ordering)
  * [How latency and fan-out reshape performance](#5-latency-tail-risk-and-backpressure)
  * [Why distributed state has no single current truth](#6-no-global-state-replication-and-consistency)
  * [How partitions and coordination pressure change design](#7-partitions-membership-and-coordination)
  * [What practical TypeScript guardrails look like](#8-practical-typescript-patterns)
  * [Which design principles and pitfalls repeat](#9-design-principles-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why Distribution Changes the Problem

Teams distribute systems for good reasons:
- capacity that no longer fits comfortably on one node
- independent ownership by different teams
- fault isolation between components
- regional placement closer to users or data
- separate scaling profiles for compute-heavy and state-heavy workloads

Those benefits are real. The cost is that the system stops behaving like one process with one shared memory space and one clock.

### A Single Machine Gives You Hidden Convenience

On one node, many assumptions feel natural:
- a function call either returns or throws
- memory reads are local and fast
- one process clock orders local events well enough for many tasks
- a crash tends to stop the whole local unit together

That convenience disappears quickly once remote calls enter the hot path.

### Remote Boundaries Change the Physics

```text
Single-machine path:

Client
  |
  v
Application process
  |
  v
Local database transaction


Distributed path:

Client
  |
  v
Gateway
  |
  v
Orders Service ─────────▶ Orders DB
  |
  ├────────────▶ Inventory Service ─────▶ Inventory DB
  ├────────────▶ Payments Service ──────▶ External processor
  └────────────▶ Notifications Service ─▶ Email provider
```

Each arrow introduces:
- latency
- separate failure modes
- possible retries and duplicates
- independent deploys and version skew
- independent clocks and independent recovery paths

### The Simplest Mental Model Comparison

```text
┌──────────────────────────────┬─────────────────────────────────────────────┐
│ Single-machine intuition     │ Distributed-system reality                  │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ call once                    │ message may be delayed, lost, or duplicated │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ one shared clock             │ clocks drift and only approximate real time │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ local state is immediate     │ replicas and caches may be stale            │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ failure is easier to spot    │ slow, dead, and partitioned can look alike  │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ transaction boundary is clear│ business workflow may span many boundaries  │
└──────────────────────────────┴─────────────────────────────────────────────┘
```

### Distribution Is Usually Worth It Only If You Accept Its Constraints

The durable lesson is not "never distribute." It is:

```text
Distribute for a reason,
and design explicitly for the new failure model.
```

That framing makes later design choices much clearer.


# 2. Partial Failure and Ambiguous Outcomes

The most important difference between local and distributed systems is usually **partial failure**.

### One Part Can Fail While Another Part Keeps Running

If a single machine crashes, the whole local unit often stops together. That is disruptive, but at least the outcome is clearer.

In a distributed system:
- the caller may stay healthy while the callee crashes
- the callee may stay healthy while the network path breaks
- one replica may be slow while another is fine
- one availability zone may be degraded while others keep serving traffic

The hard part is not just that things fail. The hard part is that only some things fail, and the surviving parts cannot always tell what really happened elsewhere.

### A Timeout Does Not Mean One Thing

Consider a payment request that times out:

```text
Caller                         Payment Service
  |                                  |
  |------ charge(order-7) ---------->|
  |                                  | apply charge?
  |<----- response lost / timeout ---X
  |                                  |
```

From the caller's point of view, at least three realities are plausible:
1. the request never arrived
2. the request succeeded, but the response never made it back
3. the request is still in progress and may finish later

Those are materially different outcomes, but the client may observe the same symptom: timeout.

### Ambiguity Is a First-Class Design Concern

Many bugs happen because code collapses unknown outcomes into a false binary:

```text
Bad model:
  success or failure

Better model:
  succeeded, failed, or unknown
```

If you treat ambiguous outcomes as definite failure, you often create unsafe retries. If you treat them as definite success, you may expose state that is not actually settled.

### Honest State Modeling Usually Helps

Useful workflow states often include:
- `PENDING`
- `SUCCEEDED`
- `FAILED`
- `UNKNOWN`
- `RECONCILIATION_REQUIRED`

Those states are not a sign of weak engineering. They are a sign that the system tells the truth about uncertainty instead of hiding it.

### Partial Failure Also Creates Asymmetric Truth

One service may know more than another:
- the payment system may know the charge succeeded
- the order service may know only that the call timed out
- the UI may know only that the order is still pending

Designing distributed systems means deciding how that asymmetric truth is surfaced, stored, retried, or repaired.


# 3. Unreliable Networks and Delivery Semantics

Distributed systems communicate through networks, and networks do not provide the same certainty as local memory or in-process calls.

### Messages Can Be Lost, Delayed, Duplicated, or Reordered

Practical network behavior can include:
- request loss before the destination sees it
- response loss after the work already finished
- duplicate delivery after a retry races with a late original
- reordering across concurrent connections or asynchronous pipelines
- long pauses caused by congestion, queueing, retransmission, or overload

You do not need the network to fail completely for correctness problems to appear. Delay alone is often enough.

### Acknowledgment Helps, but It Does Not Remove Uncertainty

Teams often add acknowledgments and assume the problem is solved. Acknowledgments are useful, but they also travel over unreliable paths.

That leads to a durable rule:

```text
Delivery confirmation is a protocol and recovery problem,
not a property of one successful socket write.
```

This is one reason impossibility results such as the Two Generals problem remain relevant as intuition: there are limits to what finite message exchange can guarantee when communication itself is uncertain.

### Delivery Guarantees Need Precise Wording

```text
┌──────────────────────────────┬──────────────────────────────────────────────┬────────────────────────────────────────────┐
│ Goal                         │ Typical mechanism                            │ What you still need                        │
├──────────────────────────────┼──────────────────────────────────────────────┼────────────────────────────────────────────┤
│ at-most-once delivery        │ no retry after uncertainty                   │ acceptance of possible message loss        │
├──────────────────────────────┼──────────────────────────────────────────────┼────────────────────────────────────────────┤
│ at-least-once delivery       │ retry until acknowledged                     │ idempotent handlers or deduplication       │
├──────────────────────────────┼──────────────────────────────────────────────┼────────────────────────────────────────────┤
│ effectively-once outcome     │ idempotency key + dedupe + durable tracking  │ end-to-end business-level design discipline│
└──────────────────────────────┴──────────────────────────────────────────────┴────────────────────────────────────────────┘
```

It is safer to discuss **business outcomes** than to make broad transport-level claims such as "exactly once" without carefully stating the scope.

### The Practical Responses Repeat Across Systems

Healthy systems usually combine:
- timeouts so work does not wait forever
- retries where retry is genuinely safe
- idempotency keys for externally visible operations
- sequence numbers or versions where ordering matters
- durable logs or outboxes for reliable handoff

None of these eliminate uncertainty on their own. Together, they make uncertainty manageable.


# 4. Time, Clocks, and Event Ordering

Time becomes tricky the moment more than one machine participates.

### Wall Clocks Drift

Even with reasonable synchronization, clocks on different nodes can disagree enough to matter for correctness.

```text
Node A clock: 10:00:00.120
Node B clock: 10:00:00.045
Node C clock: 09:59:59.990

All three may believe they are showing "current" time.
```

For human-facing timestamps, that may be acceptable. For ordering concurrent writes or deciding which update wins, it can be dangerous.

### Timestamps Are Poor Conflict Resolvers by Default

Imagine two nodes processing concurrent profile edits:

```text
Real order:
  write on Node B happens first
  write on Node A happens second

Recorded timestamps:
  Node A writes at 10:00:00.120
  Node B writes at 10:00:00.180

If Node B's clock is ahead, timestamp order may not match causal order.
```

This is why "last write wins by wall clock" is often a convenience choice, not a correctness guarantee.

### Prefer Ordering Signals Tied to the Data Flow

Depending on the system, safer ordering tools often include:
- version numbers for one record or aggregate
- append-only log offsets
- leader-assigned sequence numbers
- Lamport timestamps or vector clocks when causal relationships matter

These mechanisms are not magic, but they usually express system order more directly than raw wall-clock time.

### Use Time for What It Is Good At

Wall-clock time is still useful for:
- user-visible timestamps
- retention policies and TTLs
- metrics, alerts, and operational forensics
- deadlines and leases, when you account for skew conservatively

The main caution is simple:

```text
Do not make wall-clock time your only correctness primitive
if concurrent distributed updates can disagree.
```


# 5. Latency, Tail Risk, and Backpressure

Latency in distributed systems is not just slower than local calls. It is also much less predictable.

### Average Latency Hides the Real Operational Pain

A service may look fast on average while still hurting users at the tail:
- median latency may be acceptable
- the 95th or 99th percentile may be much worse
- retries and queueing can stretch the slow tail further

Users feel the slow request they are waiting on, not the average request from the dashboard.

### Fan-Out Amplifies Tail Latency

```text
User request
    |
    v
Aggregator
  ├── Pricing Service ............. 12 ms
  ├── Inventory Service ........... 18 ms
  ├── Customer Service ............ 15 ms
  └── Recommendations Service ..... 230 ms

Overall latency is shaped by the slowest required branch
plus aggregation overhead.
```

The more downstream dependencies a request touches, the more likely at least one of them will be slow.

### Slow Systems and Failed Systems Can Look Similar

From the caller's point of view:
- a dependency that takes 20 seconds
- a dependency that is overloaded and never replies
- a dependency behind a broken network path

may all produce the same local observation: timeout.

That is why timeouts need careful interpretation and why retry policy must be bounded.

### Retries Can Help or Make Things Worse

Retries are useful when:
- the error is transient
- the operation is safe to repeat
- the retry does not exhaust the caller's deadline

Retries are harmful when:
- every client retries at once during overload
- the downstream is already saturated
- the action is not idempotent
- the caller keeps retrying after the user no longer cares

### Backpressure Is a Safety Mechanism

When a downstream system slows down, upstream components should often respond by:
- shedding non-critical work
- rejecting or deferring excess load
- shrinking concurrency
- honoring queue limits
- propagating deadlines

Without backpressure, the system often converts one slow dependency into a wider outage.


# 6. No Global State, Replication, and Consistency

Distributed systems do not have one shared memory location that always contains "the current truth."

### State Is Usually Partitioned, Replicated, or Both

A practical system may keep state in:
- sharded primary databases
- asynchronous replicas
- materialized views
- caches
- search indexes
- event streams

Each store may represent a different projection of the same business domain, updated at different times and with different guarantees.

### Different Readers Can See Different Truths

```text
Write path:

Client
  |
  v
Primary database ----replicates----> Read replica
      |
      └---- publishes event ----> Search index


Possible observations right after a write:
- primary shows new value
- replica still shows old value
- search index has not caught up yet
```

None of those views is necessarily "wrong." They may simply be at different points in convergence.

### Local Invariants Are Easier Than Cross-System Invariants

```text
┌─────────────────────────────────────┬──────────────────────────────────────────────┐
│ Usually easier to enforce           │ Usually harder to enforce                    │
├─────────────────────────────────────┼──────────────────────────────────────────────┤
│ one account balance in one row      │ order status, inventory, and payment state   │
│ on one database leader              │ across multiple services                     │
├─────────────────────────────────────┼──────────────────────────────────────────────┤
│ unique email in one transactional   │ uniqueness across regions with async merges   │
│ database                           │ or multiple writers                           │
├─────────────────────────────────────┼──────────────────────────────────────────────┤
│ version monotonicity on one leader  │ global ordering across independent writers    │
└─────────────────────────────────────┴──────────────────────────────────────────────┘
```

The further an invariant crosses storage or service boundaries, the more coordination or compensation you usually need.

### Consistency Is About Contracts, Not Aspirations

Useful questions include:
- Do users need read-your-own-write behavior?
- Can a replica lag by seconds without harming correctness?
- Which service owns the authoritative status?
- Which views are allowed to be stale?
- How will divergence be repaired or reconciled?

Systems often work well when they are explicit about which read paths are authoritative, which are eventually consistent, and which operations require stronger coordination.


# 7. Partitions, Membership, and Coordination

Sooner or later, distributed systems have to reason about nodes that cannot currently communicate.

### A Partition Splits Communication Without Necessarily Stopping Nodes

```text
┌──────────────────── Segment A ────────────────────┐
│ Node 1                  Node 2                    │
│ can talk to each other  can serve local work      │
└───────────────────────────────────────────────────┘

                     network break
                           X

┌──────────────────── Segment B ────────────────────┐
│ Node 3                  Node 4                    │
│ can talk to each other  can serve local work      │
└───────────────────────────────────────────────────┘
```

Nothing in that diagram says which side should continue to accept writes, elect leaders, or make irreversible decisions. The application has to decide.

### Failure Detection Is Usually Based on Suspicion

In many systems, a node is considered unhealthy because:
- heartbeats were missed
- RPCs timed out
- lease renewal did not happen in time

But timeout-based detection cannot perfectly distinguish:
- dead
- slow
- paused
- partitioned

That uncertainty is why failure detection and coordination are tightly linked.

### Split-Brain Risk Appears When Multiple Sides Believe They Are Primary

If two isolated sides both accept authoritative writes, you can get:
- conflicting updates
- duplicate jobs or payments
- non-monotonic leadership
- very expensive repair later

Avoiding split brain usually means sacrificing some availability somewhere, or introducing stronger coordination rules such as quorums, leases, or fencing.

### Coordination Tools Trade Simplicity for Safety

```text
┌──────────────────────┬───────────────────────────────────────────────┬──────────────────────────────┐
│ Tool                 │ Helps with                                    │ Common cost                  │
├──────────────────────┼───────────────────────────────────────────────┼──────────────────────────────┤
│ heartbeats           │ suspecting failed peers                       │ false suspicion under delay  │
├──────────────────────┼───────────────────────────────────────────────┼──────────────────────────────┤
│ quorum reads/writes  │ limiting conflicting majorities               │ higher latency, fewer nodes  │
├──────────────────────┼───────────────────────────────────────────────┼──────────────────────────────┤
│ leader election      │ one write authority at a time                 │ failover complexity          │
├──────────────────────┼───────────────────────────────────────────────┼──────────────────────────────┤
│ fencing tokens       │ rejecting stale leaders or duplicate workers  │ extra token checks everywhere│
├──────────────────────┼───────────────────────────────────────────────┼──────────────────────────────┤
│ consensus protocols  │ replicated agreement on order and leadership  │ operational and latency cost │
└──────────────────────┴───────────────────────────────────────────────┴──────────────────────────────┘
```

Not every system needs consensus. But every system that spans machines should be clear about how it detects failure, who is allowed to act during uncertainty, and how conflicting actions are prevented.

### Where You See These Challenges in Practice

You do not need an exotic system to encounter these problems:
- PostgreSQL or MySQL read replicas can lag behind the primary, so read-after-write behavior depends on routing and consistency expectations
- Kubernetes controllers commonly use leases and leader election because multiple control-plane processes may observe different failure signals
- message brokers such as Kafka, RabbitMQ, or cloud queueing services can redeliver work, so consumer correctness still depends on idempotency and recovery logic

The specific tooling varies. The constraints do not.


# 8. Practical TypeScript Patterns

The goal of application code is not to "solve distribution" completely. The goal is to reflect distributed reality honestly and reduce the ways uncertainty becomes user-visible damage.

### Example 1: Return `UNKNOWN` When the Outcome Is Ambiguous

```typescript
type RemoteOutcome<T> =
  | { status: "SUCCEEDED"; value: T }
  | { status: "FAILED"; reason: string }
  | { status: "UNKNOWN"; reason: string };

class TimeoutError extends Error {
  constructor(message = "Operation timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

async function withTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError()), timeoutMs);

    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

interface PaymentGateway {
  charge(input: {
    orderId: string;
    amountCents: number;
    idempotencyKey: string;
  }): Promise<{ paymentId: string }>;
  lookupByIdempotencyKey(idempotencyKey: string): Promise<{ paymentId: string } | null>;
}

class SafePaymentsClient {
  constructor(private readonly gateway: PaymentGateway) {}

  async charge(orderId: string, amountCents: number): Promise<RemoteOutcome<{ paymentId: string }>> {
    const idempotencyKey = `payment:${orderId}`;

    try {
      const value = await withTimeout(
        this.gateway.charge({
          orderId,
          amountCents,
          idempotencyKey,
        }),
        1_500,
      );

      return { status: "SUCCEEDED", value };
    } catch (error) {
      if (!(error instanceof TimeoutError)) {
        return {
          status: "FAILED",
          reason: error instanceof Error ? error.message : "Unknown payment error",
        };
      }

      const existing = await this.gateway.lookupByIdempotencyKey(idempotencyKey);

      if (existing) {
        return { status: "SUCCEEDED", value: existing };
      }

      return {
        status: "UNKNOWN",
        reason: "Charge timed out and could not be confirmed",
      };
    }
  }
}
```

The important behavior is not the timeout helper. It is the outcome model:
- known success remains success
- known failure remains failure
- ambiguous cases are preserved as `UNKNOWN`

That avoids the common mistake of retrying a payment blindly after a timeout.

### Example 2: Use Versions for Concurrency Instead of Wall-Clock Ordering

```typescript
type InventoryRecord = {
  sku: string;
  available: number;
  version: number;
};

interface InventoryStore {
  get(sku: string): Promise<InventoryRecord>;
  compareAndSwap(input: {
    sku: string;
    expectedVersion: number;
    nextAvailable: number;
    nextVersion: number;
  }): Promise<boolean>;
}

class InventoryReservationService {
  constructor(private readonly store: InventoryStore) {}

  async reserve(sku: string, quantity: number): Promise<void> {
    const record = await this.store.get(sku);

    if (record.available < quantity) {
      throw new Error("Insufficient stock");
    }

    const updated = await this.store.compareAndSwap({
      sku,
      expectedVersion: record.version,
      nextAvailable: record.available - quantity,
      nextVersion: record.version + 1,
    });

    if (!updated) {
      throw new Error("Concurrent modification detected; reload and retry");
    }
  }
}
```

This pattern does not depend on one machine's notion of current time. It relies on a data-owned version boundary instead.

### Example 3: Propagate Deadlines and Bound Retries

```typescript
type RequestContext = {
  requestId: string;
  deadlineAtMs: number;
};

function remainingMs(context: RequestContext): number {
  return Math.max(0, context.deadlineAtMs - Date.now());
}

interface InventoryApi {
  reserve(input: {
    orderId: string;
    sku: string;
    quantity: number;
    timeoutMs: number;
  }): Promise<void>;
}

class InventoryClientWithBudget {
  constructor(private readonly api: InventoryApi) {}

  async reserve(
    context: RequestContext,
    input: { orderId: string; sku: string; quantity: number },
  ): Promise<void> {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const timeoutMs = Math.min(800, remainingMs(context));

      if (timeoutMs <= 0) {
        throw new Error(`Deadline exceeded for request ${context.requestId}`);
      }

      try {
        await withTimeout(
          this.api.reserve({
            ...input,
            timeoutMs,
          }),
          timeoutMs,
        );
        return;
      } catch (error) {
        const retryable = error instanceof TimeoutError;

        if (!retryable || attempt === 2) {
          throw error;
        }
      }
    }
  }
}
```

The durable lesson is:
- retries spend time and capacity
- retries should stay within a caller-visible budget
- each layer should not independently retry forever

### Example 4: Surface Read Freshness Instead of Pretending Every View Is Current

```typescript
type OrderView = {
  orderId: string;
  status: "PENDING" | "CONFIRMED" | "FAILED";
  asOfVersion: number;
  freshness: "FRESH" | "STALE";
};

interface OrdersProjection {
  get(orderId: string): Promise<OrderView | null>;
}

class OrderStatusService {
  constructor(private readonly projection: OrdersProjection) {}

  async getStatus(orderId: string): Promise<{
    status: string;
    provisional: boolean;
    asOfVersion: number;
  }> {
    const view = await this.projection.get(orderId);

    if (!view) {
      throw new Error("Order not found");
    }

    return {
      status: view.status,
      provisional: view.freshness === "STALE",
      asOfVersion: view.asOfVersion,
    };
  }
}
```

Many systems already know when a read model is behind. Surfacing that fact can be more honest and more useful than pretending every replica or projection is up to date.


# 9. Design Principles and Common Pitfalls

The same mistakes repeat because local-programming instincts are strong. The goal is not to eliminate complexity completely. The goal is to put it in the right place.

### Design Principles That Age Well

- keep critical invariants inside one local transactional boundary when you still can
- choose one authoritative owner for each important piece of state
- make retries explicit, bounded, and idempotent
- record workflow progress durably before triggering external side effects
- prefer reconciliation over blind guesswork when outcomes are ambiguous
- instrument lag, timeout, dedupe, and stuck-workflow signals from the start

### When These Challenges Matter Most

This topic becomes central when you have:
- cross-service workflows involving money, inventory, or other scarce resources
- replicated data stores with lagging read paths
- leader-based systems that must fail over safely
- asynchronous event propagation between services
- regional or zonal failure domains that can isolate parts of the system

### When Simpler Architecture May Be Better

You may not need heavy distributed coordination when:
- one database can still own the critical write path
- a simpler modular monolith meets the scaling and ownership needs
- downstream side effects are best-effort and can lag safely
- correctness requirements do not justify extra coordination overhead

Keeping a workflow local is often an engineering optimization, not a compromise.

### Repeating Pitfalls

```text
Bad:
├── assuming a timeout means the work definitely failed
├── retrying non-idempotent operations without a stable key
├── using wall-clock timestamps as the only conflict resolver
├── letting every service invent its own retry policy independently
├── treating replicas, caches, and search indexes as always current
├── electing new leaders without guarding against stale old leaders
└── having no reconciliation path for uncertain outcomes

Good:
├── model success, failure, and unknown explicitly
├── attach idempotency keys to externally visible operations
├── use versions, offsets, or logical ordering where correctness depends on order
├── propagate deadlines and enforce retry budgets
├── define which reads are authoritative and which may be stale
├── use leases, quorums, or fencing where split-brain risk matters
└── test duplicate, delayed, and partitioned scenarios before production
```

### A Durable Mental Model

The right question is usually not:

```text
How do I make the network behave like a local function call?
```

The better question is:

```text
What uncertainty does this workflow face,
and what protocol, state model, and operational guardrails
will keep the business outcome coherent?
```

That question tends to produce better systems.


# 10. Summary

**Distribution changes both the architecture and the failure model.**
- The benefits of scale, ownership, and isolation come with remote coordination cost.
- Once a workflow crosses machine boundaries, you lose the simplicity of one process, one clock, and one local commit boundary.

**Partial failure and unreliable delivery create ambiguity.**
- Timeouts, lost acknowledgments, and duplicate messages are normal enough to design for explicitly.
- Healthy systems preserve `UNKNOWN` outcomes instead of forcing certainty where none exists.

**Time, latency, and state all behave differently in distributed systems.**
- Wall-clock timestamps are useful, but they are weak correctness primitives for concurrent distributed writes.
- Tail latency, retries, and fan-out can dominate user experience.
- Replicas, caches, and projections may all show different but explainable views of the same business entity.

**Coordination is about choosing where to spend complexity.**
- Stronger coordination can reduce divergence, but it usually adds latency, coupling, and operational burden.
- Simpler boundaries, idempotency, reconciliation, and authoritative ownership often prevent more bugs than optimistic abstractions do.

**Implementation checklist:**

```text
Problem framing:
  □ Identify which workflows cross process, service, or storage boundaries
  □ Mark which outcomes can be pending or unknown instead of forcing binary success/failure
  □ Keep critical invariants inside one local transactional boundary when feasible

Remote communication:
  □ Add timeouts to remote calls and decide what timeout means for each operation
  □ Use idempotency keys or deduplication for retried external side effects
  □ Bound retries with a deadline or retry budget instead of retrying indefinitely

Ordering and state:
  □ Prefer versions, offsets, or logical ordering when correctness depends on event order
  □ Define which store or service is authoritative for each important piece of state
  □ Decide which read paths may be stale and how freshness is exposed or handled

Coordination and recovery:
  □ Define what happens during partitions, suspected node failure, and leader failover
  □ Use quorums, leases, or fencing where split-brain risk matters
  □ Add reconciliation paths for ambiguous or partially completed workflows

Operations:
  □ Monitor latency tails, retry rates, dedupe hits, replication lag, and stuck workflows
  □ Test duplicate delivery, delayed delivery, crash-after-commit, and partition scenarios
  □ Document manual repair steps for externally visible failures or uncertain outcomes
```
