# Lamport Timestamps

[← Back to Index](README.md)

Imagine you are building an order workflow that spans three services. The payments service approves a charge, the shipping service reserves inventory, and the order service writes an audit timeline afterward. You want the timeline to respect cause and effect.

Without a causal timestamp, teams often sort distributed events by wall-clock time and hope the result is "close enough":

```typescript
type OrderEvent = {
  orderId: string;
  kind:
    | "payment_authorized"
    | "inventory_reserved"
    | "order_ready";
  recordedAtMs: number;
  sourceService: "payments" | "shipping" | "orders";
};

function buildAuditTimeline(events: OrderEvent[]): OrderEvent[] {
  return [...events].sort(
    (left, right) => left.recordedAtMs - right.recordedAtMs,
  );
}
```

This breaks in ways that matter:
- the shipping node can have a faster wall clock and make a downstream step look earlier than the payment that triggered it
- equal timestamps do not prove that two events were concurrent or safely interchangeable
- a retry delivered late can still carry an earlier wall-clock timestamp than work already applied
- "latest timestamp wins" can quietly hide real concurrency

This is where **Lamport timestamps** come in. They are the simplest widely taught logical-clock algorithm: each process keeps an integer counter, increments it for local events, sends the counter with messages, and merges remote counters on receipt. The result is not real time. It is a compact way to preserve known causal order across distributed communication.

In this chapter, you will learn:
  * [Why Lamport timestamps matter](#1-why-lamport-timestamps-matter)
  * [How the core algorithm works](#2-the-core-algorithm)
  * [What the clock condition really guarantees](#3-the-clock-condition-and-its-meaning)
  * [How timestamp propagation looks in a real execution](#4-tracing-timestamp-propagation)
  * [How total ordering and tie-breaking work](#5-total-ordering-and-tie-breaking)
  * [Where Lamport timestamps fit well](#6-where-lamport-timestamps-fit-well)
  * [Where Lamport timestamps fall short](#7-where-lamport-timestamps-fall-short)
  * [What practical TypeScript patterns look like](#8-practical-typescript-patterns)
  * [Which design principles and pitfalls repeat](#9-design-principles-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why Lamport Timestamps Matter

Lamport timestamps matter because many distributed-system questions are really questions about **causal order**, not exact clock time.

### The Problem Is Usually "What Could Have Influenced What?"

Examples:
- did a downstream event happen because of an upstream message
- should one replica update dominate another, or are they concurrent
- can this audit trail preserve the order of causally related steps
- can a coordination protocol pick a stable request order without trusting wall clocks

Raw wall-clock time is weak for those questions because the system cannot assume that every node shares one exact timeline.

### Lamport Timestamps Trade Exact Time for Durable Ordering Information

The core idea is simple:
- each process tracks a scalar logical counter
- local work moves the counter forward
- sent messages carry the current counter
- received messages force the receiver forward past the sender's timestamp

That means message edges leave a trace in the timestamp sequence.

```text
Local order:      event A ─────▶ event B
Message order:    send M  ─────▶ receive M

Lamport goal:
if A causally precedes B,
then timestamp(A) < timestamp(B)
```

### A Scalar Clock Is Attractive Because It Is Cheap

Lamport timestamps use far less metadata than vector-style clocks.

```text
┌────────────────────────────┬──────────────────────────────────────────────┐
│ Need                       │ Lamport timestamp effect                     │
├────────────────────────────┼──────────────────────────────────────────────┤
│ causal-respecting order    │ good fit                                     │
├────────────────────────────┼──────────────────────────────────────────────┤
│ deterministic tie-breaking │ often a good fit with `(counter, nodeId)`   │
├────────────────────────────┼──────────────────────────────────────────────┤
│ detect true concurrency    │ not enough by itself                         │
├────────────────────────────┼──────────────────────────────────────────────┤
│ measure real elapsed time  │ wrong tool                                   │
└────────────────────────────┴──────────────────────────────────────────────┘
```

### Lamport Timestamps Are Usually a Building Block, Not the Whole Design

In practice, systems often combine Lamport timestamps with:
- correlation IDs for tracing one workflow
- stream offsets or sequence numbers inside an authoritative log
- idempotency keys for retries
- domain versions or merge rules for conflicting writes

That is the right mental model:

```text
Lamport timestamps help preserve causal order.
They do not replace every other correctness primitive.
```


# 2. The Core Algorithm

Lamport timestamps are often introduced because the algorithm is small enough to hold in your head.

### Rule 1: Increment Before a Local Event

When a process performs an internal event, it increments its local counter.

Examples of local events:
- applying a command
- appending a log record
- deciding to send a message
- updating local state after internal processing

### Rule 2: Send the Current Counter With Every Message

When a process sends a message, it includes its current logical timestamp.

```text
Node A local counter = 4
Node A prepares to send message
Node A increments to 5
Message carries timestamp 5
```

### Rule 3: On Receive, Merge With `max(local, remote) + 1`

When a process receives a message:
- it compares the remote timestamp with its local counter
- it sets its counter to `max(local, remote) + 1`
- the receive event gets that new value

```text
Node B local counter = 2
Message arrives with timestamp 5

Node B sets counter to max(2, 5) + 1 = 6
```

### The Message Edge Is What Makes the Algorithm Useful

```text
┌───────────────┐                          ┌───────────────┐
│   Node A      │                          │   Node B      │
├───────────────┤                          ├───────────────┤
│ counter = 4   │                          │ counter = 2   │
│ local event   │                          │               │
│ counter = 5   │                          │               │
│ send(ts = 5)  │ ───────────────────────▶ │ receive(ts=5) │
│               │                          │ counter = 6   │
└───────────────┘                          └───────────────┘
```

The receive side cannot stay at `2` or `3` without losing the fact that the message came after Node A's earlier events.

### A Compact Pseudocode Version

```text
on local event:
  clock = clock + 1
  timestamp(event) = clock

on send message:
  clock = clock + 1
  message.timestamp = clock

on receive message(ts):
  clock = max(clock, ts) + 1
  timestamp(receive_event) = clock
```

Different codebases package these steps differently, but the causal rule stays the same.


# 3. The Clock Condition and Its Meaning

The main guarantee behind Lamport timestamps is usually written as:

```text
If A → B, then L(A) < L(B)
```

This is the **clock condition**.

### The Guarantee Is One-Way

Lamport timestamps guarantee:

```text
causality implies timestamp order
```

They do **not** guarantee:

```text
timestamp order implies causality
```

That distinction is the most important limitation to keep in mind.

### Why the Algorithm Can Invent Extra Order

Because Lamport timestamps are scalar, every event ends up with one number. That forces many events into a numeric order even when the system cannot prove one caused the other.

```text
Replica A: local event A gets timestamp 5
Replica B: local event B gets timestamp 8

5 < 8 does not prove A → B.
Replica B may simply have advanced because of unrelated earlier traffic.
```

### What a Comparison Tells You

```text
┌──────────────────────────────┬──────────────────────────────────────────────┐
│ Observation                  │ What you may conclude                        │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ A → B                        │ `L(A) < L(B)` must hold                      │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ `L(A) < L(B)`                │ A may be before B, but concurrency is hidden │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ `L(A) = L(B)` on one scalar  │ values may tie across nodes                  │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ need concurrency detection   │ Lamport alone is usually insufficient         │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

### This Is Still Useful in Practice

The clock condition is strong enough for many practical tasks:
- preserving message causality in logs and event streams
- producing a deterministic order that does not contradict known causal edges
- feeding queueing or coordination algorithms that need a consistent request order

It is weak only if you ask it to answer a different question, such as:
- are these two writes definitely concurrent
- how many milliseconds passed
- who safely owns a lease right now


# 4. Tracing Timestamp Propagation

Lamport timestamps become easier to trust once you trace a full execution by hand.

### A Three-Service Example

Suppose an order flows through `orders`, `payments`, and `shipping`.

```text
Orders (O)                Payments (P)               Shipping (S)

O1 create order
O2 send payment request ───────────────▶ P1 receive request
                                         P2 authorize payment
                                         P3 send authorization ───────────▶ S1 receive authorization
                                                                           S2 reserve inventory
                                                                           S3 send ready notice ───▶ O3 receive ready notice
                                                                                                     O4 mark order ready
```

### Step-by-Step Timestamp Assignment

Let each node start at counter `0`.

```text
┌──────────────────────────────┬─────────────────────────────┬──────────────┐
│ Event                        │ Rule applied                │ Lamport time │
├──────────────────────────────┼─────────────────────────────┼──────────────┤
│ O1 create order              │ local tick                  │ 1            │
├──────────────────────────────┼─────────────────────────────┼──────────────┤
│ O2 send payment request      │ send tick                   │ 2            │
├──────────────────────────────┼─────────────────────────────┼──────────────┤
│ P1 receive request(ts = 2)   │ max(0, 2) + 1              │ 3            │
├──────────────────────────────┼─────────────────────────────┼──────────────┤
│ P2 authorize payment         │ local tick                  │ 4            │
├──────────────────────────────┼─────────────────────────────┼──────────────┤
│ P3 send authorization        │ send tick                   │ 5            │
├──────────────────────────────┼─────────────────────────────┼──────────────┤
│ S1 receive authorization(5)  │ max(0, 5) + 1              │ 6            │
├──────────────────────────────┼─────────────────────────────┼──────────────┤
│ S2 reserve inventory         │ local tick                  │ 7            │
├──────────────────────────────┼─────────────────────────────┼──────────────┤
│ S3 send ready notice         │ send tick                   │ 8            │
├──────────────────────────────┼─────────────────────────────┼──────────────┤
│ O3 receive ready notice(8)   │ max(2, 8) + 1              │ 9            │
├──────────────────────────────┼─────────────────────────────┼──────────────┤
│ O4 mark order ready          │ local tick                  │ 10           │
└──────────────────────────────┴─────────────────────────────┴──────────────┘
```

### What the Numbers Preserve

From the timestamps alone, you can safely conclude:

```text
O2 < P1 < P2 < P3 < S1 < S2 < S3 < O3 < O4
```

That chain exists because messages propagated the logical time forward.

### A Concurrent Example

Now imagine a separate fraud-scoring service also emits an event after the order is created but before it hears about shipping.

```text
Orders (O)                            Fraud (F)

O1 create order
O2 send fraud check ───────────────▶  F1 receive request
                                      F2 compute score

Shipping (S) has not heard from Fraud (F),
and Fraud (F) has not heard from Shipping (S).
```

If `F2` gets timestamp `4` and `S2` gets timestamp `7`, the numeric comparison alone does not prove `F2 → S2`. Lamport timestamps preserve real message edges, but they still compress concurrent work into one scalar scale.


# 5. Total Ordering and Tie-Breaking

Lamport timestamps are often paired with a stable process identifier to produce a total order:

```text
(counter, nodeId)
```

### Why Tie-Breaking Exists

Two different nodes can produce the same Lamport counter value.

```text
Node A local event -> (3, "A")
Node B local event -> (3, "B")
```

If a system needs deterministic sorting for storage, replay, or queue arbitration, it can order by:
1. counter
2. node ID as a stable tie-breaker

### Total Order Is Stronger Than Causal Order

```text
┌──────────────────────────────┬──────────────────────────────────────────────┐
│ Ordering concept             │ Meaning                                      │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ causal order                 │ known influence or communication             │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ total order                  │ every pair is forced into one sorted order   │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ Lamport + tie-breaker        │ total order that respects known causal edges │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

This is operationally useful, but it does not mean the sorted order reveals real-time truth or concurrency truth.

### A Simple Queueing Example

```text
Requests:
  R1 = (5, "node-b")
  R2 = (5, "node-a")
  R3 = (6, "node-c")

Sorted total order:
  R2 -> R1 -> R3
```

That order is deterministic and reproducible. It is also safe with respect to known causal edges because anything causally later must have a larger Lamport counter.

### This Idea Shows Up in Coordination Algorithms

Lamport-style ordering is a natural fit when a protocol needs:
- a reproducible request queue
- fairness that does not rely on wall clocks
- a scalar order that can be compared cheaply

Examples include:
- distributed mutual-exclusion request ordering
- event replay views
- multi-node audit streams

The important documentation point is always the same:

```text
deterministic order is not the same as proven causal order
for every pair of events
```


# 6. Where Lamport Timestamps Fit Well

Lamport timestamps are a good fit when the system needs a compact causal-respecting order and can tolerate hidden concurrency.

### Event-Driven Workflows

In asynchronous workflows, one service often reacts to another.

```text
payment_requested
      |
      v
payment_authorized
      |
      v
inventory_reserved
      |
      v
order_ready
```

Lamport timestamps help preserve the order of those message-linked steps even when wall-clock timestamps are noisy.

### Audit Trails and Debugging

Operators often need to answer questions such as:
- did this downstream event happen after the upstream event that triggered it
- which service saw the workflow first
- can the stored order contradict known message causality

Lamport timestamps help when they are stored alongside:
- wall-clock timestamps
- correlation IDs
- stream names or partitions
- service or replica identity

### Coordination Request Ordering

Some coordination protocols need a stable order over requests from multiple nodes. Lamport timestamps are often attractive here because:
- they are cheap to compare
- they respect communication-derived order
- they do not require tightly synchronized physical clocks

They still need the rest of the protocol around them. The timestamp is the ordering hint, not the entire safety model.

### Replica-to-Replica Messaging With Small Metadata

If vector-style metadata would be too heavy for the workload, Lamport timestamps can be a practical compromise.

```text
┌──────────────────────────────┬──────────────────────────────────────────────┐
│ Situation                    │ Why Lamport may fit                          │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ small message envelope       │ one scalar plus node ID is compact           │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ need causal-respecting sort  │ preserves message-derived order              │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ replay or deterministic logs │ tuple ordering is easy to implement          │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

### A Good Design Question

Lamport timestamps are often enough if the real question is:

```text
Can I produce an order that never contradicts known causality,
without paying for richer concurrency tracking?
```

If that is not the question, another tool may fit better.


# 7. Where Lamport Timestamps Fall Short

Lamport timestamps solve a narrow problem well. Trouble starts when teams ask them to solve broader distributed-systems problems.

### They Cannot Detect Concurrency Reliably

If:

```text
L(A) < L(B)
```

you still cannot conclude:

```text
A → B
```

That means Lamport timestamps can overstate ordering between events that are actually concurrent.

### They Do Not Measure Physical Time

Lamport values do not tell you:
- how long a request took
- whether a token should expire now
- whether a lease is safe by wall time
- whether an alert happened five seconds after another alert

Use wall clocks or monotonic clocks for those questions.

### They Do Not Replace Consensus, Quorum, or Fencing

Lamport timestamps can help describe ordering. They do not grant safe exclusive authority.

Examples of problems that need more than Lamport timestamps:
- leader election
- failover between single writers
- lease ownership
- split-brain prevention

Those problems usually need combinations of:
- quorum rules
- lease terms or epochs
- fencing tokens
- durable authority transfer rules

### Richer Questions Usually Need Richer Tools

```text
┌──────────────────────────────────────┬────────────────────────────────────────┐
│ If you need to know...               │ A better fit is often...               │
├──────────────────────────────────────┼────────────────────────────────────────┤
│ true concurrency vs before/after     │ vector-style clocks                    │
├──────────────────────────────────────┼────────────────────────────────────────┤
│ order inside one authoritative log   │ stream offsets or sequence numbers     │
├──────────────────────────────────────┼────────────────────────────────────────┤
│ safe exclusive ownership             │ quorum, term, fencing, lease protocol  │
├──────────────────────────────────────┼────────────────────────────────────────┤
│ elapsed duration                     │ monotonic time                         │
└──────────────────────────────────────┴────────────────────────────────────────┘
```

### Restarts and Identity Need Care

If a node restarts and reuses the same `nodeId` with a reset counter, later events may look earlier than older events from that same node.

Common ways to avoid that include:
- persisting the local counter across restart
- changing the process identity or epoch on restart
- scoping comparison windows so old and new identities are not mixed carelessly


# 8. Practical TypeScript Patterns

Good application code keeps Lamport timestamps explicit in the protocol and keeps them separate from wall-clock timestamps.

### Example 1: A Reusable Lamport Clock

```typescript
type NodeId = string;

type LamportTimestamp = {
  counter: number;
  nodeId: NodeId;
};

class LamportClock {
  private counter: number;

  constructor(
    private readonly nodeId: NodeId,
    initialCounter = 0,
  ) {
    this.counter = initialCounter;
  }

  tick(): LamportTimestamp {
    this.counter += 1;

    return this.current();
  }

  receive(remote: LamportTimestamp): LamportTimestamp {
    this.counter = Math.max(this.counter, remote.counter) + 1;
    return this.current();
  }

  current(): LamportTimestamp {
    return {
      counter: this.counter,
      nodeId: this.nodeId,
    };
  }

  snapshot(): { nodeId: NodeId; counter: number } {
    return {
      nodeId: this.nodeId,
      counter: this.counter,
    };
  }
}
```

This gives you:
- one scalar logical counter per process
- explicit merge-on-receive behavior
- a snapshot you can persist if restart continuity matters

### Example 2: Propagate the Timestamp in the Message Envelope

```typescript
type PaymentAuthorized = {
  orderId: string;
  amountCents: number;
};

type EventEnvelope<T> = {
  payload: T;
  lamport: LamportTimestamp;
  emittedBy: string;
  recordedAtIso: string;
};

interface EventBus {
  publish<T>(event: EventEnvelope<T>): Promise<void>;
}

class PaymentsService {
  constructor(
    private readonly clock: LamportClock,
    private readonly bus: EventBus,
  ) {}

  async authorizePayment(
    orderId: string,
    amountCents: number,
  ): Promise<void> {
    const lamport = this.clock.tick();

    await this.bus.publish<PaymentAuthorized>({
      payload: { orderId, amountCents },
      lamport,
      emittedBy: "payments",
      recordedAtIso: new Date().toISOString(),
    });
  }
}

class ShippingService {
  constructor(
    private readonly clock: LamportClock,
    private readonly bus: EventBus,
  ) {}

  async onPaymentAuthorized(
    event: EventEnvelope<PaymentAuthorized>,
  ): Promise<void> {
    this.clock.receive(event.lamport);

    const reservationTimestamp = this.clock.tick();

    await this.bus.publish({
      payload: {
        orderId: event.payload.orderId,
        kind: "inventory_reserved" as const,
      },
      lamport: reservationTimestamp,
      emittedBy: "shipping",
      recordedAtIso: new Date().toISOString(),
    });
  }
}
```

The durable habits are:
- receive-side logic merges remote Lamport time before emitting derived work
- the new event gets its own new timestamp
- wall time is kept for humans, but causal order comes from the Lamport field

### Example 3: Deterministic Ordering With a Tie-Breaker

```typescript
function compareLamport(
  left: LamportTimestamp,
  right: LamportTimestamp,
): number {
  if (left.counter !== right.counter) {
    return left.counter - right.counter;
  }

  return left.nodeId.localeCompare(right.nodeId);
}

type LockRequest = {
  requestId: string;
  ownerId: string;
  lamport: LamportTimestamp;
};

class PendingLockQueue {
  private readonly requests: LockRequest[] = [];

  add(request: LockRequest): void {
    this.requests.push(request);
    this.requests.sort((left, right) =>
      compareLamport(left.lamport, right.lamport),
    );
  }

  next(): LockRequest | undefined {
    return this.requests[0];
  }
}
```

This is a reasonable pattern when the protocol wants a reproducible request order. It is not enough by itself to prove lock safety or authority transfer.

### Example 4: Persist the Counter or Rotate Identity on Restart

```typescript
type StoredClockState = {
  nodeId: string;
  counter: number;
};

interface ClockStateStore {
  load(nodeId: string): Promise<StoredClockState | null>;
  save(state: StoredClockState): Promise<void>;
}

class DurableLamportClock {
  private readonly clock: LamportClock;

  private constructor(
    private readonly store: ClockStateStore,
    nodeId: string,
    initialCounter: number,
  ) {
    this.clock = new LamportClock(nodeId, initialCounter);
  }

  static async create(
    store: ClockStateStore,
    nodeId: string,
  ): Promise<DurableLamportClock> {
    const existing = await store.load(nodeId);

    return new DurableLamportClock(
      store,
      nodeId,
      existing?.counter ?? 0,
    );
  }

  async tickAndPersist(): Promise<LamportTimestamp> {
    const timestamp = this.clock.tick();
    await this.store.save(this.clock.snapshot());
    return timestamp;
  }

  async receiveAndPersist(
    remote: LamportTimestamp,
  ): Promise<LamportTimestamp> {
    const timestamp = this.clock.receive(remote);
    await this.store.save(this.clock.snapshot());
    return timestamp;
  }
}
```

If receive events matter for continuity, persist after receives as well as local ticks. Whether you persist the counter or rotate to a fresh identity depends on the protocol, but the restart behavior should be explicit rather than accidental.


# 9. Design Principles and Common Pitfalls

The recurring lesson is simple: Lamport timestamps are useful when you are honest about what they prove and what they do not.

### Practical Design Principles

```text
Good:
├── define clearly what counts as a local event, send event, and receive event
├── carry Lamport metadata in the protocol instead of reconstructing it later
├── pair `(counter, nodeId)` with stable identity and documented tie-break rules
├── keep wall-clock timestamps alongside Lamport values for audit and UI needs
├── persist the counter or rotate identity when restart continuity matters
├── test delayed, duplicated, and reordered message paths
└── switch to vector-style clocks or sequence numbers when the question changes

Bad:
├── treat Lamport order as proof of real-time order
├── assume `L(A) < L(B)` means A definitely caused B
├── use Lamport timestamps for lease expiry or timeout measurement
├── let unstable node IDs undermine tie-breaking semantics
├── accept arbitrary client-supplied Lamport values without protocol guardrails
├── reset counters silently on restart while reusing the same node identity
└── use Lamport timestamps as the only safety mechanism in coordination logic
```

### Separate Causal Order From Business Meaning

Suppose two concurrent updates arrive:
- one changes a shipping address
- one cancels the order

A Lamport timestamp can help place those updates in a deterministic order, but it cannot decide:
- whether one should dominate
- whether the update pair should be rejected
- whether a human should review the result

The business rule still has to exist.

### Prefer the Weakest Ordering Tool That Answers the Real Question

Good review questions include:

```text
Do I need:
  causal-respecting order,
  true concurrency detection,
  or just an authoritative per-stream sequence?
```

That usually leads to a better design choice than reflexively adding more metadata.

### Test the Awkward Cases

Useful tests include:
- a delayed message arriving after newer local work
- duplicate delivery of an old message
- two nodes creating same-counter events and relying on tie-break order
- restart with persisted counter
- restart with rotated identity or epoch

Lamport bugs often appear only when the happy path is no longer the dominant path.


# 10. Summary

**Lamport timestamps are the simplest practical logical-clock algorithm.**
- Each process keeps a scalar counter, increments it for local work, and merges remote timestamps on receive.
- They preserve known causal order without pretending to provide exact physical time.

**The clock condition is the key guarantee.**
- If event `A` happened before event `B` in the causal sense, then `L(A) < L(B)`.
- The reverse is not guaranteed, so Lamport timestamps can hide true concurrency.

**Lamport timestamps are strongest when you need compact causal-respecting order.**
- They are useful for event-driven workflows, deterministic replay order, audit streams, and some coordination queues.
- They are often paired with stable node identity, correlation metadata, and domain-specific safeguards.

**Lamport timestamps do not replace other coordination tools.**
- They do not measure elapsed time, detect concurrency reliably, or grant safe exclusive ownership.
- When those questions matter, systems usually need vector-style clocks, authoritative sequence numbers, monotonic time, quorum rules, terms, or fencing tokens.

**Implementation checklist:**

```text
Modeling:
  □ Define the process or writer scope and choose a stable node identity
  □ Decide which actions count as local, send, and receive events
  □ Confirm that scalar causal-respecting order is enough for the problem

Protocol:
  □ Increment the clock before local or send events
  □ Include the Lamport timestamp in every relevant message or stored event
  □ On receive, merge with `max(local, remote) + 1`

Ordering and semantics:
  □ Use a documented tie-breaker such as `(counter, nodeId)` when deterministic total order is needed
  □ Keep wall-clock timestamps separate for audit, UI, and expiry logic
  □ Do not treat `L(A) < L(B)` as proof that A caused B

Recovery and testing:
  □ Persist the counter or rotate node identity or epoch on restart
  □ Test delayed, duplicated, reordered, and concurrent event paths
  □ Re-evaluate the design if the system needs true concurrency detection or authority guarantees
```
