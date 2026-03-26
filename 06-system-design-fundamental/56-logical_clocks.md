# Logical Clocks

[← Back to Index](README.md)

Imagine you are building a multi-region order workflow. The payments service authorizes a payment in one region, the shipping service releases fulfillment in another region, and the audit timeline later reconstructs what happened. Operators expect the timeline to reflect causality, not just whichever machine had the fastest wall clock.

Without logical clocks, teams often let raw timestamps decide order:

```typescript
type WorkflowEvent = {
  orderId: string;
  kind: "payment_authorized" | "shipment_released" | "confirmation_sent";
  recordedAtMs: number;
  sourceService: "payments" | "shipping" | "notifications";
};

class NaiveWorkflowTimeline {
  order(events: WorkflowEvent[]): WorkflowEvent[] {
    return [...events].sort(
      (left, right) => left.recordedAtMs - right.recordedAtMs,
    );
  }
}
```

This fails in ways that matter:
- a shipping event can appear earlier than the payment event that triggered it if the nodes disagree about wall time
- equal timestamps do not prove two events were concurrent
- a larger timestamp can reflect clock skew rather than a truly later causally dependent event
- "latest timestamp wins" can discard the wrong update in multi-writer systems

This is where **logical clocks** come in. Instead of trying to prove exact global time, they track the ordering information a distributed system can often know more reliably: whether one event could have influenced another.

In this chapter, you will learn:
  * [Why logical clocks matter](#1-why-logical-clocks-matter)
  * [How the happens-before relation works](#2-the-happens-before-relation)
  * [Why causality creates only a partial order](#3-causality-concurrency-and-partial-order)
  * [What a logical clock must guarantee](#4-what-a-logical-clock-must-guarantee)
  * [Which logical clock models are common](#5-common-logical-clock-models)
  * [Where logical clocks help in real systems](#6-where-logical-clocks-help-in-real-systems)
  * [Where logical clocks are not enough](#7-where-logical-clocks-are-not-enough)
  * [What practical TypeScript patterns look like](#8-practical-typescript-patterns)
  * [Which design principles and pitfalls repeat](#9-design-principles-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why Logical Clocks Matter

Logical clocks matter because many distributed-system questions are really questions about **causality**, not about civil time.

### The Important Question Is Often "Could Event A Have Influenced Event B?"

Examples:
- did this replica apply an update before it emitted a derived event
- did a consumer process a message before it wrote a compensating command
- are two writes competing concurrently, or did one definitely happen after the other
- does this audit sequence preserve dependencies between steps in the workflow

If you answer those questions with wall-clock timestamps alone, you inherit all of the uncertainty from clock skew, resynchronization, and message delay.

### Physical Time and Causal Time Solve Different Problems

```text
┌───────────────────────────────┬──────────────────────────────────────────────┐
│ What the system wants to know │ What raw wall-clock time can mislead about   │
├───────────────────────────────┼──────────────────────────────────────────────┤
│ did A happen before B         │ node clocks may disagree                     │
├───────────────────────────────┼──────────────────────────────────────────────┤
│ can B depend on A             │ a later timestamp may only reflect skew      │
├───────────────────────────────┼──────────────────────────────────────────────┤
│ are A and B concurrent        │ equal timestamps do not prove simultaneity   │
├───────────────────────────────┼──────────────────────────────────────────────┤
│ should one update dominate    │ "last write wins" may pick the wrong winner  │
└───────────────────────────────┴──────────────────────────────────────────────┘
```

Logical clocks shift the question from:

```text
"What exact time was it everywhere?"
```

to:

```text
"What ordering information can the system justify?"
```

### This Builds on the Clock-Synchronization Problem

The previous chapter showed why physical clocks cannot be perfectly aligned across machines. Logical clocks do not solve that physical limitation. They work around it by tracking event relationships directly.

That is the durable idea:
- physical clocks approximate real time
- logical clocks approximate causal order
- many correctness questions care more about causal order than exact wall time

### You Still Usually Keep Both

In practice, production systems often keep:
- a wall-clock timestamp for humans, logs, retention, or UI
- a logical timestamp or version for causal reasoning
- a correlation ID, stream offset, or request ID for tracing one workflow across systems

Those fields answer different questions. Problems start when one field is asked to answer all of them.


# 2. The Happens-Before Relation

Logical clocks are built on the **happens-before** relation introduced by Leslie Lamport. It describes when one event must be considered earlier in the causal sense.

### Rule 1: Earlier Events in the Same Process Happen Before Later Ones

If one process executes event `A` and then event `B`, then:

```text
A → B
```

That is the simplest case. Local program order already gives you a causal chain.

### Rule 2: Sending a Message Happens Before Receiving That Message

If one node sends a message and another later receives it, the send happened before the receive.

```text
Process A                                Process B

A1: validate order
A2: publish payment_authorized ───────▶  B1: receive payment_authorized
A3: write audit row                     B2: release shipment
```

From this diagram, you can conclude:

```text
A2 → B1
A2 → B2
```

because `A2 → B1`, and `B1 → B2` by local order on process B.

### Rule 3: Happens-Before Is Transitive

If:

```text
A → B
B → C
```

then:

```text
A → C
```

This matters because causal chains often span many hops:

```text
Orders Service ─────▶ Queue ─────▶ Worker ─────▶ Projector
```

One original command may influence many later events even if they happen on different nodes and at different times.

### Not Every Pair of Events Is Comparable

If neither `A → B` nor `B → A` is true, the events are **concurrent** in the causal sense.

That does not mean they happened at exactly the same wall-clock instant. It means the system has no evidence that one influenced the other.

### The Relation Is About Influence, Not Human Time

This is the key mental model:

```text
happens-before = possible causal influence
not
wall-clock timestamp order
```

That distinction is what makes logical clocks valuable in distributed systems.


# 3. Causality, Concurrency, and Partial Order

The happens-before relation gives you a **partial order**, not always a total order.

### Partial Order Means "Some Pairs Are Ordered, Some Are Not"

In a distributed system, many events do not directly interact.

```text
Replica A                               Replica B

A1: user edits title                    B1: user edits label
A2: write local state                   B2: write local state

No message path yet.
No proven causal relation yet.
```

If the replicas were offline or had not exchanged state yet, `A2` and `B2` may be concurrent.

### Concurrency Is a Real State, Not a Bug in the Model

Teams sometimes treat "unordered" as an inconvenience and force a total order immediately. That can be useful for deterministic storage or log display, but it should not erase the deeper fact that the events may be concurrent.

Why this matters:
- concurrent writes may require merge logic rather than simple overwrite
- concurrent edits may need conflict surfacing or CRDT-style resolution
- concurrent events should not be described as causally ordered when the system cannot prove that

### Total Order and Causal Order Are Different Things

```text
┌─────────────────────────┬──────────────────────────────────────────────────┐
│ Concept                 │ What it means                                   │
├─────────────────────────┼──────────────────────────────────────────────────┤
│ partial order           │ some events are comparable, others are not      │
├─────────────────────────┼──────────────────────────────────────────────────┤
│ total order             │ every pair is forced into an order              │
├─────────────────────────┼──────────────────────────────────────────────────┤
│ causal order            │ ordering implied by influence or communication   │
├─────────────────────────┼──────────────────────────────────────────────────┤
│ concurrency             │ no proven causal relation either way            │
└─────────────────────────┴──────────────────────────────────────────────────┘
```

Lamport timestamps can help produce a causal-respecting total order with tie-breakers, but that is not the same as perfectly identifying concurrency. Vector-style clocks preserve more information about concurrency.

### A Simple Example

Suppose two users update the same profile on different replicas before replication catches up:

```text
Replica A: set displayName = "Anya"
Replica B: set timezone = "UTC"
```

If no message links those writes yet:
- the writes may be concurrent
- neither should automatically be called "later" in the causal sense
- a merge policy should reason about fields, values, or explicit conflict rules

That is why logical clocks are often paired with application-specific merge behavior.


# 4. What a Logical Clock Must Guarantee

At the fundamentals level, a logical clock is useful if it satisfies one core property:

```text
If A → B, then Clock(A) < Clock(B)
```

This is sometimes called the **clock condition**.

### The Guarantee Is One-Way

The guarantee says:

```text
causality implies timestamp order
```

It does **not** always say:

```text
timestamp order implies causality
```

That distinction is critical.

### Why Message Propagation Matters

If clocks only incremented locally, processes would not learn anything about each other's histories.

Logical clocks work because timestamp information is carried across communication edges:

```text
Node A local event
  |
  ├── increment local clock
  |
  └── send message with timestamp ─────▶ Node B receives
                                         |
                                         ├── merge remote timestamp
                                         └── assign receive-event timestamp
```

Without that propagation step, the ordering metadata would stop at process boundaries.

### Logical Clocks Trade Metadata for Information

Different clock models preserve different amounts of ordering information:

```text
┌─────────────────────────┬──────────────────────────────────────────────────┐
│ Clock model             │ Typical strength                                 │
├─────────────────────────┼──────────────────────────────────────────────────┤
│ scalar logical clock    │ preserves causality, may invent extra ordering   │
├─────────────────────────┼──────────────────────────────────────────────────┤
│ vector-style clock      │ can detect before/after/concurrent relationships │
├─────────────────────────┼──────────────────────────────────────────────────┤
│ hybrid logical clock    │ mixes physical and logical signals               │
└─────────────────────────┴──────────────────────────────────────────────────┘
```

In general:
- smaller metadata usually means less information about concurrency
- richer metadata usually means higher storage and propagation cost

### Logical Time Is Not Elapsed Time

A logical clock value might jump from `9` to `14` after receiving another node's message. That says something about causal history. It does not mean five milliseconds passed.

So a logical clock should not be used for:
- timeout measurement
- lease expiry duration
- user-visible time displays
- rate-limit windows or TTLs

Those require physical or monotonic time, not logical time alone.

### Deterministic Tie-Breaking Is Often Added, But It Is Separate

When two events get the same scalar logical value, systems often add a node ID or process ID so they can sort events deterministically:

```text
(counter, nodeId)
```

That helps with reproducible ordering in logs or storage. It does not add new causal knowledge by itself.


# 5. Common Logical Clock Models

There is no single logical clock design that fits every workload. Different models answer different questions.

### Lamport Timestamps

Lamport timestamps use one scalar counter per process.

Typical behavior:
- increment the counter before each local event
- include the current counter in outgoing messages
- on receive, set `local = max(local, remote) + 1`

Strengths:
- simple to implement
- small metadata
- preserves the clock condition
- useful when you need a causal-respecting order plus deterministic tie-breaking

Limits:
- cannot reliably tell whether two events were concurrent
- `timestamp(A) < timestamp(B)` does not prove `A → B`

### Vector Clocks

Vector clocks keep one counter per writer, process, or replica in scope.

Typical behavior:
- increment your own entry on local events
- attach the whole vector on messages
- merge by taking the per-entry maximum on receive

Strengths:
- can distinguish `BEFORE`, `AFTER`, `EQUAL`, and `CONCURRENT`
- useful in multi-writer replication and conflict detection

Limits:
- metadata grows with the number of tracked writers
- dynamic writer populations complicate storage and pruning

### Version Vectors and Related Replica-Oriented Variants

Many storage systems do not need a full per-client vector clock. They often track causality at the replica or partition level instead.

This family includes ideas such as:
- version vectors
- replica versions
- dotted version vectors

The design goal is usually the same:
- keep enough causal information to compare updates
- avoid unbounded metadata where possible

### Hybrid Logical Clocks

Hybrid logical clocks combine:
- a physical time component
- a logical counter to break ties and absorb skew

They are useful when a system wants timestamps that stay close to wall time while still preserving a monotonic cross-node ordering property under message exchange.

Strengths:
- better fit than pure logical clocks when approximate physical time remains useful
- can support systems that want both causal information and time-like ordering

Limits:
- still rely on physical-time assumptions and clock discipline
- still do not remove the need for safer coordination primitives where authority matters

### A Practical Comparison

```text
┌─────────────────────────┬──────────────────────────────────────┬────────────────────────────────────┐
│ Model                   │ Usually a good fit for              │ Main caution                       │
├─────────────────────────┼──────────────────────────────────────┼────────────────────────────────────┤
│ Lamport timestamp       │ simple causal-respecting ordering   │ hides concurrency                  │
├─────────────────────────┼──────────────────────────────────────┼────────────────────────────────────┤
│ vector clock            │ conflict detection across writers   │ metadata grows with writers        │
├─────────────────────────┼──────────────────────────────────────┼────────────────────────────────────┤
│ version-vector variant  │ replica-scoped replication          │ writer scope must be managed       │
├─────────────────────────┼──────────────────────────────────────┼────────────────────────────────────┤
│ hybrid logical clock    │ ordering plus near-wall-time signal │ still needs physical-time hygiene  │
└─────────────────────────┴──────────────────────────────────────┴────────────────────────────────────┘
```

### Use the Weakest Model That Still Answers the Real Question

Examples:
- if you only need a stable order that respects causal edges, Lamport may be enough
- if you need to detect true concurrency between writers, Lamport is usually not enough
- if a single authoritative log already exists, sequence numbers or offsets may be simpler than global logical clocks

For example:
- a Kafka partition offset orders events in that partition
- a PostgreSQL WAL LSN orders changes in that WAL stream

Those mechanisms do not replace logical clocks for arbitrary multi-writer causality, but they often solve a narrower ordering problem more simply.


# 6. Where Logical Clocks Help in Real Systems

Logical clocks are most useful where the system needs causal context but cannot rely on one globally trusted physical timeline.

### Replicated Data and Multi-Writer State

When multiple replicas or regions can accept writes, the system needs to compare updates.

Logical clocks can help answer:
- does update B include all the causal history of update A
- are these writes concurrent and therefore potentially conflicting
- can one version safely dominate another

This is why causal metadata shows up in replication systems, synchronization engines, and collaborative applications.

### Event-Driven Pipelines

In asynchronous workflows, one event often triggers another.

```text
Payment Authorized
      |
      v
Shipment Released
      |
      v
Email Sent
```

Logical clocks can help preserve the fact that:

```text
payment_authorized → shipment_released → email_sent
```

even if wall-clock timestamps across the participating nodes are noisy.

### Debugging and Audit Trails

Operators often want to answer:
- did this downstream write happen because of that upstream message
- which of these updates were concurrent
- why did one projector process an event before another

Logical clocks help when they are stored alongside:
- wall-clock timestamps
- correlation IDs
- stream offsets
- actor or replica identity

No single field tells the whole story, but together they make post-incident reasoning much more honest.

### Causal Delivery and Read Guarantees

Some systems want clients to avoid seeing effects out of causal order, such as:
- reading a reply before the original message
- observing a derived state before the command that caused it
- missing your own write when reading from another replica

Logical clocks can support causal-delivery or session-consistency mechanisms by carrying enough dependency information to delay or reconcile reads until prerequisites are visible.

### Conflict-Sensitive Merge Logic

In multi-writer systems, logical clocks help separate two very different cases:

```text
Case 1:
  A definitely happened before B
  -> B may safely dominate A

Case 2:
  A and B are concurrent
  -> application may need merge, siblings, or user-visible conflict handling
```

That difference is what makes logical clocks valuable beyond simple sorting.


# 7. Where Logical Clocks Are Not Enough

Logical clocks are powerful, but they answer only part of the distributed-systems problem.

### They Do Not Measure Real Time or Elapsed Duration

Logical clocks do not tell you:
- how many milliseconds passed
- whether a token should expire now
- whether a lease is still safe by wall time
- how long a retry has been waiting

Use physical or monotonic clocks for those questions.

### They Do Not Replace Consensus, Quorum, or Fencing

A logical clock can describe ordering information. It does not grant safe exclusive authority.

Examples of problems that need more than logical clocks:
- leader election
- single-writer failover
- lease-based ownership
- split-brain prevention

For those, you often need combinations of:
- quorum rules
- fencing tokens
- durable terms or epochs
- explicit authority transfer protocols

### Scalar Logical Clocks Can Overstate Order

Lamport timestamps are intentionally weaker than full concurrency-tracking structures.

If:

```text
Lamport(A) < Lamport(B)
```

you still cannot conclude:

```text
A → B
```

That means a scalar order can be operationally useful while still hiding real concurrency.

### Richer Clocks Carry Real Costs

Vector-style clocks often create practical issues:
- metadata growth as writer count rises
- more bytes on each message
- more storage per record
- more complex compaction and pruning
- harder compatibility management during topology changes

That cost is one reason many systems scope writer sets carefully instead of tracking every transient client directly.

### Logical Clocks Do Not Decide Business Semantics

Suppose two concurrent updates arrive:
- one changes shipping address
- one cancels the order

The clock can tell you they are concurrent.
It cannot decide:
- whether one should win
- whether they should merge
- whether a human should review the result

Business rules still matter.

### Client-Provided Causal Metadata Needs Guardrails

If clients can send arbitrary logical timestamps or vectors, the server must still consider:
- malformed or unbounded metadata
- spoofed replica identities
- stale or replayed causal context

Logical-clock metadata should be treated as part of a protocol, not as untrusted magic.

### A Practical Comparison

```text
┌────────────────────────────────────┬────────────────────────────────────────────┐
│ Question                           │ Usually needs more than logical clocks     │
├────────────────────────────────────┼────────────────────────────────────────────┤
│ who is the current leader          │ quorum, lease, term, fencing              │
├────────────────────────────────────┼────────────────────────────────────────────┤
│ has this token expired             │ physical time with skew budget            │
├────────────────────────────────────┼────────────────────────────────────────────┤
│ how long until retry deadline      │ monotonic elapsed-time measurement        │
├────────────────────────────────────┼────────────────────────────────────────────┤
│ how should concurrent writes merge │ application merge or conflict policy      │
└────────────────────────────────────┴────────────────────────────────────────────┘
```


# 8. Practical TypeScript Patterns

Good application code usually keeps logical clocks explicit in data structures and separates them from wall-clock time.

### Example 1: A Simple Lamport Clock

```typescript
type NodeId = string;

type LamportTimestamp = {
  counter: number;
  nodeId: NodeId;
};

class LamportClock {
  private counter = 0;

  constructor(private readonly nodeId: NodeId) {}

  tick(): LamportTimestamp {
    this.counter += 1;

    return {
      counter: this.counter,
      nodeId: this.nodeId,
    };
  }

  receive(remote: LamportTimestamp): LamportTimestamp {
    this.counter = Math.max(this.counter, remote.counter) + 1;

    return {
      counter: this.counter,
      nodeId: this.nodeId,
    };
  }
}

function compareLamport(
  left: LamportTimestamp,
  right: LamportTimestamp,
): number {
  if (left.counter !== right.counter) {
    return left.counter - right.counter;
  }

  return left.nodeId.localeCompare(right.nodeId);
}
```

This gives you:
- causal-respecting scalar timestamps
- deterministic ordering when counters tie

It does **not** tell you whether two equal-looking or nearby events were concurrent in the deeper causal sense.

### Example 2: Propagate Logical Time With the Message

```typescript
type PaymentAuthorized = {
  orderId: string;
  amountCents: number;
};

type CausalEnvelope<T> = {
  payload: T;
  lamport: LamportTimestamp;
  emittedBy: string;
  wallTimeIso: string;
};

interface EventBus {
  publish<T>(event: CausalEnvelope<T>): Promise<void>;
}

class PaymentsService {
  constructor(
    private readonly clock: LamportClock,
    private readonly bus: EventBus,
  ) {}

  async authorizePayment(orderId: string, amountCents: number): Promise<void> {
    const lamport = this.clock.tick();

    await this.bus.publish<PaymentAuthorized>({
      payload: { orderId, amountCents },
      lamport,
      emittedBy: "payments",
      wallTimeIso: new Date().toISOString(),
    });
  }
}

class ShippingService {
  constructor(private readonly clock: LamportClock) {}

  onPaymentAuthorized(
    event: CausalEnvelope<PaymentAuthorized>,
  ): CausalEnvelope<{ orderId: string; kind: "shipment_released" }> {
    this.clock.receive(event.lamport);
    const lamport = this.clock.tick();

    return {
      payload: {
        orderId: event.payload.orderId,
        kind: "shipment_released",
      },
      lamport,
      emittedBy: "shipping",
      wallTimeIso: new Date().toISOString(),
    };
  }
}
```

The important habits are:
- the receiver first incorporates the upstream timestamp into its local clock
- the derived downstream event gets its own new local tick
- the logical timestamp is propagated as part of the protocol instead of being reconstructed later from local logs

### Example 3: Vector Clock Utilities

```typescript
type VectorClock = Record<string, number>;

type VectorRelation = "EQUAL" | "BEFORE" | "AFTER" | "CONCURRENT";

function incrementVector(
  clock: VectorClock,
  replicaId: string,
): VectorClock {
  return {
    ...clock,
    [replicaId]: (clock[replicaId] ?? 0) + 1,
  };
}

function mergeVector(left: VectorClock, right: VectorClock): VectorClock {
  const merged: VectorClock = {};

  for (const replicaId of new Set([
    ...Object.keys(left),
    ...Object.keys(right),
  ])) {
    merged[replicaId] = Math.max(left[replicaId] ?? 0, right[replicaId] ?? 0);
  }

  return merged;
}

function compareVector(
  left: VectorClock,
  right: VectorClock,
): VectorRelation {
  let leftDominates = false;
  let rightDominates = false;

  for (const replicaId of new Set([
    ...Object.keys(left),
    ...Object.keys(right),
  ])) {
    const leftValue = left[replicaId] ?? 0;
    const rightValue = right[replicaId] ?? 0;

    if (leftValue < rightValue) {
      rightDominates = true;
    } else if (leftValue > rightValue) {
      leftDominates = true;
    }
  }

  if (!leftDominates && !rightDominates) {
    return "EQUAL";
  }

  if (leftDominates && !rightDominates) {
    return "AFTER";
  }

  if (!leftDominates && rightDominates) {
    return "BEFORE";
  }

  return "CONCURRENT";
}
```

This lets you distinguish:
- one version definitely includes another
- two versions are equal
- two versions are concurrent

### Example 4: Keep Concurrent Versions Instead of Silently Overwriting

```typescript
type VersionedValue<T> = {
  value: T;
  clock: VectorClock;
  replicaId: string;
};

class MultiValueRegister<T> {
  merge(
    current: VersionedValue<T>[],
    incoming: VersionedValue<T>,
  ): VersionedValue<T>[] {
    const next: VersionedValue<T>[] = [];
    let incomingDominated = false;

    for (const existing of current) {
      const relation = compareVector(existing.clock, incoming.clock);

      if (relation === "AFTER" || relation === "EQUAL") {
        incomingDominated = true;
        next.push(existing);
        continue;
      }

      if (relation === "CONCURRENT") {
        next.push(existing);
      }
    }

    if (!incomingDominated) {
      next.push(incoming);
    }

    return next;
  }
}
```

This is often more honest than "last timestamp wins" because it preserves concurrency until the application applies a merge policy.

### Store Logical Time and Wall Time Side by Side

Even when you use logical clocks, it is usually useful to keep wall time for operators and users:

```typescript
type AuditedEvent<T> = {
  payload: T;
  logicalClock: LamportTimestamp | VectorClock;
  wallTimeIso: string;
  correlationId: string;
};
```

The fields serve different purposes:
- `logicalClock` helps with causal reasoning
- `wallTimeIso` helps with human-facing inspection
- `correlationId` helps trace one workflow across boundaries


# 9. Design Principles and Common Pitfalls

The recurring lesson is not "always use the richest logical clock." It is "choose the causal metadata that matches the real coordination problem."

### Practical Design Principles

```text
Good:
├── choose the clock model that answers the actual ordering question
├── propagate causal metadata explicitly in messages or stored records
├── keep wall-clock timestamps separate from logical timestamps
├── document what a timestamp comparison does and does not prove
├── scope writer identities so vector metadata stays manageable
├── pair logical clocks with idempotency, versioning, or merge policy
└── test delayed, duplicated, and reordered message paths

Bad:
├── treat `Date.now()` as proof of causal order across nodes
├── assume Lamport order reveals true concurrency
├── use logical clocks instead of leases, quorum, or fencing
├── let client-supplied vector metadata grow without bounds
├── discard concurrent updates without a business rule
├── reconstruct causal order only from local log timestamps
└── forget to persist clock metadata across replay or failover
```

### Pick the Writer Scope Deliberately

Vector-style clocks only stay practical when the writer set is well defined.

Good scopes might be:
- replica ID
- shard leader ID
- bounded actor set in a collaboration session

Risky scopes might be:
- every mobile device ever seen
- every transient worker process
- every anonymous client request

If the writer scope is unstable, metadata and merge complexity grow quickly.

### Tie-Breakers Need Honest Documentation

If you use `(lamportCounter, nodeId)` to sort records, document what that means:
- it gives a deterministic order
- it respects known causal order
- it does not prove the node with the larger tuple acted later in real time

This avoids the common mistake where an operational convenience is quietly reinterpreted as a stronger correctness guarantee.

### Keep Causal Context Durable Enough for Recovery

If causal metadata is dropped during:
- log compaction
- snapshotting
- message relay
- failover
- replay from backup

then later conflict detection and ordering logic may degrade silently.

The durability requirement depends on the use case, but the design should be explicit.

### Test Ambiguous Cases, Not Just Happy Paths

Useful tests include:
- two replicas writing before they sync
- a delayed message arriving after a newer local write
- duplicate delivery of an old event
- restart or failover with persisted causal metadata
- compaction or pruning of vector entries

Logical-clock bugs often appear only when messages are delayed or reordered.

### Keep the Business Question in View

A strong design review question is:

```text
What bad decision becomes possible
if the system mistakes concurrent events for ordered ones?
```

That question helps determine whether:
- Lamport timestamps are enough
- vector clocks are needed
- a single authoritative log would simplify the problem
- a merge policy is missing


# 10. Summary

**Logical clocks track causal order rather than exact physical time.**
- They are useful when distributed systems need to know whether one event could have influenced another.
- They work around the limits of imperfectly synchronized physical clocks by propagating ordering metadata through communication.

**The happens-before relation is the foundation.**
- Local program order, message send-to-receive order, and transitivity define causal order.
- Events with no causal relation are concurrent, and concurrency is a real state the system should handle honestly.

**Different logical clock models preserve different amounts of information.**
- Lamport timestamps are compact and useful for causal-respecting scalar order.
- Vector-style clocks can detect concurrency, but they cost more metadata.
- Hybrid logical clocks mix physical and logical signals, but they still need careful time discipline.

**Logical clocks help with comparison and conflict detection, not every distributed-systems problem.**
- They can improve replication, causal delivery, and audit reasoning.
- They do not replace monotonic clocks for elapsed time, physical clocks for expiry, or quorum and fencing for exclusive authority.

**Implementation checklist:**

```text
Modeling:
  □ Write down the exact ordering question the system needs to answer
  □ Choose Lamport, vector-style, hybrid, or simpler sequence numbers based on that question
  □ Define whether the system must detect concurrency or only preserve causal-respecting order

Propagation:
  □ Carry logical-clock metadata in messages, events, or stored versions rather than reconstructing it later
  □ Keep wall-clock timestamps separate for audit and UI purposes
  □ Include stable actor, replica, or process identity with the logical timestamp

Conflict handling:
  □ Decide what the system does with concurrent updates: merge, keep siblings, reject, or escalate
  □ Avoid raw "last wall-clock timestamp wins" for correctness-sensitive multi-writer state
  □ Pair logical clocks with idempotency keys, offsets, versions, or other domain safeguards as needed

Operations:
  □ Bound writer scope so vector metadata remains practical
  □ Test delayed, duplicated, reordered, and replayed events before production
  □ Document clearly what each timestamp comparison proves and what it does not
```
