# Vector Clocks

[← Back to Index](README.md)

Imagine you are building an offline-capable document system with replicas in three regions. A user edits the document title while connected to replica `A`. Another user changes the document status while temporarily disconnected on replica `C`. When replication catches up, you need to know whether one version supersedes the other or whether they are concurrent and need a merge policy.

Without vector clocks, teams often reduce the problem to one scalar "latest" field and silently drop causal information:

```typescript
type DocumentVersion = {
  documentId: string;
  fields: {
    title?: string;
    status?: "draft" | "approved";
  };
  updatedAtMs: number;
  replicaId: string;
};

function pickWinner(
  left: DocumentVersion,
  right: DocumentVersion,
): DocumentVersion {
  return left.updatedAtMs >= right.updatedAtMs ? left : right;
}
```

This fails in ways that matter:
- a fast wall clock can make an older version look newer
- a scalar logical timestamp can preserve some order but still hide real concurrency
- two independent edits can overwrite each other even though neither causally includes the other
- "latest wins" turns a conflict-detection problem into silent data loss

This is where **vector clocks** come in. Instead of one counter, a vector clock carries one counter per writer or replica in scope. That richer metadata lets the system ask a stronger question: does version `B` include all the causal history of version `A`, or are the two versions concurrent?

In this chapter, you will learn:
  * [Why vector clocks matter](#1-why-vector-clocks-matter)
  * [How a vector clock encodes causal history](#2-how-a-vector-clock-encodes-causal-history)
  * [How the core algorithm works](#3-the-core-algorithm)
  * [How vector comparison detects before, after, and concurrent relationships](#4-comparing-vectors-and-detecting-concurrency)
  * [How a real execution evolves over time](#5-tracing-a-real-execution)
  * [How version vectors, writer scope, and trade-offs fit together](#6-version-vectors-writer-scope-and-trade-offs)
  * [Where vector clocks fit well in practice](#7-where-vector-clocks-fit-well)
  * [What practical TypeScript patterns look like](#8-practical-typescript-patterns)
  * [Which design principles and pitfalls repeat](#9-design-principles-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why Vector Clocks Matter

Vector clocks matter because many distributed-data questions are really questions about **causal inclusion**, not just deterministic sorting.

### The Practical Question Is Usually "Does This Version Subsume That One?"

Examples:
- does replica `B`'s version already include replica `A`'s earlier write
- are two updates concurrent and therefore candidates for conflict handling
- can an incoming replica state safely replace local state without losing information
- should the system keep one version, merge fields, or surface siblings to the application

If you answer those questions with one scalar timestamp, you often force an order the system cannot justify.

### Deterministic Order Is Not the Same as Causal Truth

```text
┌───────────────────────────────┬──────────────────────────────────────────────┐
│ What the system needs to know │ What a weaker signal may hide                │
├───────────────────────────────┼──────────────────────────────────────────────┤
│ does B include A              │ a larger scalar value may still miss history │
├───────────────────────────────┼──────────────────────────────────────────────┤
│ are A and B concurrent        │ total ordering can hide true independence    │
├───────────────────────────────┼──────────────────────────────────────────────┤
│ should one version dominate   │ "latest wins" may discard unrelated changes  │
├───────────────────────────────┼──────────────────────────────────────────────┤
│ should users resolve conflict │ a tie-breaker may suppress the need to merge │
└───────────────────────────────┴──────────────────────────────────────────────┘
```

Vector clocks preserve more information than Lamport timestamps because they do not compress all writers into one shared counter line.

### The Real Value Is Conflict Awareness

Suppose two replicas both edit the same object while partitioned:
- replica `A` changes the title
- replica `C` changes the status

If the system later compares only scalar values, it may choose one side and lose the other change. A vector clock can usually tell the difference between:
- one version causally including the other
- both versions being concurrent within the tracked writer scope

That is a major design improvement because:
- conflict handling becomes explicit
- silent overwrite becomes less likely
- merge policy can be chosen at the domain layer instead of being smuggled in by timestamp order

### Vector Clocks Are Still Not Magic

Vector clocks are only as good as:
- the writer scope you chose
- the propagation discipline in your protocol
- the storage model that preserves or summarizes the vectors correctly

The durable claim is narrower and safer:

```text
Within the chosen writer scope,
vector clocks help distinguish
before, after, equal, and concurrent versions.
```


# 2. How a Vector Clock Encodes Causal History

A vector clock is a mapping from writer identity to a counter.

### One Counter Per Writer in Scope

If the writers in scope are `A`, `B`, and `C`, a vector might look like:

```text
{ A: 3, B: 1, C: 0 }
```

You can read that as:
- this version has seen at least three events from `A`
- it has seen at least one event from `B`
- it has not yet incorporated any events from `C`

The vector is not wall time. It is a compact summary of observed progress across writers.

### A Useful Mental Model: "What History Does This Event Know About?"

```text
Writer A progress   Writer B progress   Writer C progress
       3                   1                   0
        \                  |                  /
         \                 |                 /
          \                |                /
           ---- causal knowledge frontier ---
```

When a version carries `{ A: 3, B: 1, C: 0 }`, it is effectively saying:

```text
I include A up through event 3.
I include B up through event 1.
I include nothing from C yet.
```

### Missing Entries Usually Mean Zero

Real systems often store vectors sparsely:

```text
{ A: 3, B: 1 }
```

instead of:

```text
{ A: 3, B: 1, C: 0, D: 0, E: 0 }
```

The comparison rule usually treats absent entries as zero. That keeps payloads smaller when most writers have not contributed to a given version.

### Writer Scope Is a Design Choice, Not a Law of Nature

The meaning of each dimension depends on what you choose to track:
- per process
- per replica
- per partition leader
- per client device

That choice affects both correctness and cost.

```text
┌──────────────────────────────┬──────────────────────────────────────────────┐
│ Writer scope                 │ Typical effect                               │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ per process                  │ richest detail, highest churn risk           │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ per replica                  │ common compromise for replicated stores      │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ per client device            │ useful for sync, can grow quickly            │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ per authoritative partition  │ cheaper, but narrower causal visibility      │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

### The Vector Describes Inclusion, Not Intent

If version `V2` has a larger or equal count than `V1` for every writer, then `V2` includes at least the causal history summarized by `V1`.

That does **not** tell you:
- whether the business meaning is "safe to overwrite"
- whether the user should see a conflict UI
- whether fields should be merged automatically

Vector clocks answer a causality question. They do not replace domain rules.


# 3. The Core Algorithm

The standard vector-clock algorithm is small enough to memorize.

### Rule 1: Increment Your Own Entry for a New Local Event

When writer `i` performs a local event, it increments its own counter:

```text
V[i] = V[i] + 1
```

Examples of local events:
- a replica accepts a write
- a process emits a new event
- a node records a receive event as part of its local history

### Rule 2: Send the Current Vector With the Message or Stored Version

If a node sends a message or replicates a version, it includes a copy of its current vector.

```text
Replica A local vector before send: { A: 2 }
Replica A increments for send event: { A: 3 }
Message carries:                     { A: 3 }
```

### Rule 3: Merge by Taking the Per-Writer Maximum

When a node receives remote causal information, it merges entry by entry:

```text
merged[k] = max(local[k], remote[k])
```

This preserves the strongest known progress for every writer.

### Rule 4: If the Receive Is Modeled as a Local Event, Increment Your Own Entry

In message-passing descriptions, a receive event is usually treated as a new local event. After merging, the receiver increments its own counter.

```text
Node B local vector:   { B: 4 }
Remote message:        { A: 3, B: 1 }
Per-entry merge:       { A: 3, B: 4 }
Receive event at B:    { A: 3, B: 5 }
```

Some replicated storage systems package this slightly differently:
- they merge remote context when state arrives
- they increment the local replica entry when producing the next stored version

The durable idea is the same:
- merge remote knowledge by maximum
- give each new local event its own fresh local increment

### A Full Message Flow

```text
┌───────────────┐                                 ┌───────────────┐
│   Replica A   │                                 │   Replica B   │
├───────────────┤                                 ├───────────────┤
│ { A: 2 }      │                                 │ { B: 1 }      │
│ local send    │                                 │               │
│ { A: 3 }      │ -- message carries { A: 3 } --> │ receive merge │
│               │                                 │ { A: 3, B: 1 }│
│               │                                 │ receive event │
│               │                                 │ { A: 3, B: 2 }│
└───────────────┘                                 └───────────────┘
```

### Compact Pseudocode

```text
on local event at writer i:
  V[i] = V[i] + 1
  timestamp(event) = copy(V)

on send message from writer i:
  V[i] = V[i] + 1
  message.vector = copy(V)

on receive message at writer i with vector W:
  for each writer k:
    V[k] = max(V[k], W[k])
  V[i] = V[i] + 1
  timestamp(receive_event) = copy(V)
```

The exact packaging varies by protocol, but the comparison rules later in the chapter rely on this same causal propagation idea.


# 4. Comparing Vectors and Detecting Concurrency

Vector clocks become powerful when you compare two vectors component by component.

### The Partial-Order Rule

For vectors `X` and `Y`:

```text
X <= Y  if and only if  X[i] <= Y[i] for every writer i
```

Then:
- `X` is **before** `Y` if `X <= Y` and at least one component is strictly smaller
- `X` is **equal** to `Y` if every component matches
- `X` is **after** `Y` if `Y <= X` and at least one component is strictly smaller
- otherwise they are **concurrent**

### Why "Concurrent" Means Incomparable

Suppose:

```text
X = { A: 2, B: 0 }
Y = { A: 1, B: 2 }
```

Then:
- `X` is larger on `A`
- `Y` is larger on `B`

Neither vector dominates the other, so they are concurrent.

That means:
- neither version can prove it includes the other
- both may need to be preserved, merged, or resolved by policy

It does **not** mean the updates happened at exactly the same wall-clock time.

### A Comparison Table

```text
┌──────────────────────────────┬──────────────────────────────────────────────┐
│ Comparison result            │ Meaning                                      │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ X before Y                   │ Y includes all of X and something more       │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ X after Y                    │ X includes all of Y and something more       │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ X equal Y                    │ both describe the same tracked causal state  │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ X concurrent Y               │ neither includes the other                   │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

### Scalar Timestamps Cannot Reliably Express This

With a scalar logical clock:

```text
5 < 8
```

you know the smaller value may be earlier, but you do not know whether the larger value truly includes the smaller event's history.

With vectors:

```text
{ A: 2, B: 0 }  vs  { A: 1, B: 2 }
```

you can see the incomparability directly.

### Concurrency Detection Is Why the Extra Metadata Exists

```text
Lamport-style scalar:   one number, cheaper, hides concurrency
Vector clock:           many dimensions, richer, exposes concurrency
```

That is the central trade-off. If the workload does not need concurrency detection, the extra metadata may not be worth carrying.


# 5. Tracing a Real Execution

A step-by-step execution makes vector clocks easier to trust.

### Scenario

Three replicas `A`, `B`, and `C` hold the same document. The system treats each replica as a writer in scope.

Initial state:

```text
A clock = {}
B clock = {}
C clock = {}
```

### Execution Timeline

```text
Replica A                         Replica B                         Replica C

A1 edit title
A2 send to B ------------------▶ B1 receive from A
                                 B2 edit approval status

                                                                  C1 edit reviewer note

B3 send to C ----------------------------------------------------▶ C2 receive from B
                                                                  C3 create merged version
```

### Step-by-Step Vector Assignment

```text
┌──────────────────────────────────────┬─────────────────────────────┬─────────────────┐
│ Event                                │ Rule applied                │ Vector          │
├──────────────────────────────────────┼─────────────────────────────┼─────────────────┤
│ A1 edit title                        │ A local event              │ { A: 1 }        │
├──────────────────────────────────────┼─────────────────────────────┼─────────────────┤
│ A2 send to B                         │ A send event               │ { A: 2 }        │
├──────────────────────────────────────┼─────────────────────────────┼─────────────────┤
│ B1 receive from A                    │ merge then B receive tick  │ { A: 2, B: 1 }  │
├──────────────────────────────────────┼─────────────────────────────┼─────────────────┤
│ B2 edit approval status              │ B local event              │ { A: 2, B: 2 }  │
├──────────────────────────────────────┼─────────────────────────────┼─────────────────┤
│ C1 edit reviewer note                │ C local event              │ { C: 1 }        │
├──────────────────────────────────────┼─────────────────────────────┼─────────────────┤
│ B3 send to C                         │ B send event               │ { A: 2, B: 3 }  │
├──────────────────────────────────────┼─────────────────────────────┼─────────────────┤
│ C2 receive from B                    │ merge then C receive tick  │ { A: 2, B: 3, C: 2 } │
├──────────────────────────────────────┼─────────────────────────────┼─────────────────┤
│ C3 create merged version             │ C local event              │ { A: 2, B: 3, C: 3 } │
└──────────────────────────────────────┴─────────────────────────────┴─────────────────┘
```

### Where Concurrency Appears

Compare `B2` and `C1`:

```text
B2 = { A: 2, B: 2 }
C1 = { C: 1 }
```

Neither dominates the other:
- `B2` knows nothing about `C`
- `C1` knows nothing about `A` or `B`

So the two updates are concurrent.

### What Happens After the Replicas Exchange State

When `C` receives `B3`, replica `C` learns about `A` and `B`:

```text
Before receive at C:   { C: 1 }
Incoming from B:       { A: 2, B: 3 }
Merged knowledge:      { A: 2, B: 3, C: 1 }
Receive event at C:    { A: 2, B: 3, C: 2 }
```

Now `C` has enough causal context to create a new merged version `C3` with:

```text
{ A: 2, B: 3, C: 3 }
```

That merged version dominates both earlier branches:
- it is after `B2`
- it is after `C1`

### The Important Design Consequence

Vector clocks do not merge the document for you. They tell you when a merge policy is needed.

```text
Bad:
  concurrent versions -> pick one scalar winner

Better:
  concurrent versions -> preserve siblings or run merge logic
```


# 6. Version Vectors, Writer Scope, and Trade-Offs

The pure textbook model says "one counter per process." Real systems usually narrow or reshape that idea.

### Version Vectors Often Track Replicas, Not Every Client

Many replicated stores use **version vectors**:
- one entry per replica or shard
- compared the same way as vector clocks
- used to decide dominance or concurrency between stored versions

This is often cheaper than tracking every end user or every transient process.

Example:
- thousands of clients write through three replicas
- the store tracks `{ replica-a, replica-b, replica-c }`
- the replica nodes summarize client-originated writes into replica-scoped causal progress

That loses some per-client detail but keeps metadata bounded.

### Dotted Variants Help Represent One New Event Precisely

Some systems use **dotted version vectors** or similar variants:
- a summarized version vector for prior context
- plus one distinguished event identifier, or "dot," for the new update

The goal is usually:
- compact storage of causal context
- precise identity for the newest event
- cleaner handling of sibling sets and anti-entropy exchange

You do not need the full dotted formulation for every workload, but it is useful to know why plain vectors are sometimes adapted.

### Writer Scope Shapes Both Cost and Semantics

```text
┌──────────────────────────────┬──────────────────────────────────────────────┬────────────────────────────────────┐
│ Scope choice                 │ Usually a good fit for                      │ Main caution                       │
├──────────────────────────────┼──────────────────────────────────────────────┼────────────────────────────────────┤
│ per process                  │ small fixed actor sets                      │ churn and restart identity         │
├──────────────────────────────┼──────────────────────────────────────────────┼────────────────────────────────────┤
│ per replica                  │ replicated storage                          │ client-level concurrency is hidden │
├──────────────────────────────┼──────────────────────────────────────────────┼────────────────────────────────────┤
│ per client device            │ offline sync products                       │ vectors can grow large             │
├──────────────────────────────┼──────────────────────────────────────────────┼────────────────────────────────────┤
│ per partition leader         │ narrower replicated logs                    │ only covers that authority model   │
└──────────────────────────────┴──────────────────────────────────────────────┴────────────────────────────────────┘
```

### Metadata Growth Is the Main Operational Cost

If `n` writers are tracked, the vector size is roughly `O(n)` in:
- storage
- network payload
- comparison work

That cost is often acceptable for:
- a small replica set
- a bounded number of devices per record

It becomes harder when:
- writers are short-lived and numerous
- records live a long time
- old vector entries are rarely safe to discard

### Pruning Is Harder Than It Looks

Teams sometimes notice old vector entries and try to remove them aggressively. That can be dangerous because dropped dimensions remove comparison information.

A safe pruning story usually needs one or more of:
- a bounded, well-defined writer set
- compaction tied to replica retirement or epoch change
- confidence that no stored version or in-flight message still depends on the dropped dimension

### Use the Smallest Scope That Still Answers the Real Question

That is usually the best design heuristic.

Examples:
- if only three storage replicas actually create durable versions, per-replica version vectors may be enough
- if user devices sync peer-to-peer without a central writer, per-device tracking may be necessary
- if one authoritative log already orders events, a sequence number may be simpler than any vector clock


# 7. Where Vector Clocks Fit Well

Vector clocks fit well when the system must distinguish **dominance** from **concurrency** across multiple writers.

### Multi-Writer Replication

Classic examples include:
- document or note synchronization
- profile or preference updates across regions
- replicated key-value storage with sibling resolution
- collaborative editing systems that preserve concurrent branches before merge

In those systems, the important question is often:

```text
Does one version causally include the other,
or are they concurrent?
```

Vector clocks answer that question more directly than scalar clocks.

### Offline-First Synchronization

When devices edit state while disconnected:
- conflict is normal, not exceptional
- wall clocks are especially weak because devices may drift badly
- causality often matters more than precise civil time

Vector clocks help the sync engine decide:
- safe fast-forward
- keep siblings
- invoke merge logic
- ask the user to resolve a conflict

### Anti-Entropy and Replica Repair

During background synchronization, replicas often exchange summaries and missing updates.

Vector-style causal metadata helps reason about:
- which versions dominate others
- whether a local sibling can be discarded
- whether an incoming state fills a genuine gap or merely duplicates known history

### Where They Are Usually Not the Best Tool

```text
┌──────────────────────────────────────┬────────────────────────────────────────┐
│ If you need to know...               │ A better fit is often...               │
├──────────────────────────────────────┼────────────────────────────────────────┤
│ order inside one authoritative log   │ sequence numbers or log offsets        │
├──────────────────────────────────────┼────────────────────────────────────────┤
│ safe leader or lease ownership       │ terms, epochs, quorum, fencing         │
├──────────────────────────────────────┼────────────────────────────────────────┤
│ elapsed duration                     │ monotonic time                         │
├──────────────────────────────────────┼────────────────────────────────────────┤
│ approximate wall time plus ordering  │ hybrid or physical-time-based designs  │
└──────────────────────────────────────┴────────────────────────────────────────┘
```

Vector clocks are strongest when the missing capability is concurrency detection, not when the missing capability is authority, time measurement, or log sequencing.


# 8. Practical TypeScript Patterns

Good application code keeps vector metadata explicit, sparse, and separate from wall-clock timestamps.

### Example 1: Core Vector Helpers

```typescript
type WriterId = string;
type VectorClock = Readonly<Record<WriterId, number>>;

type ClockRelation =
  | "before"
  | "after"
  | "equal"
  | "concurrent";

function getCounter(
  clock: VectorClock,
  writerId: WriterId,
): number {
  return clock[writerId] ?? 0;
}

function tick(
  clock: VectorClock,
  writerId: WriterId,
): VectorClock {
  return {
    ...clock,
    [writerId]: getCounter(clock, writerId) + 1,
  };
}

function mergeVectorClocks(
  left: VectorClock,
  right: VectorClock,
): VectorClock {
  const merged: Record<WriterId, number> = {};
  const writerIds = new Set([
    ...Object.keys(left),
    ...Object.keys(right),
  ]);

  for (const writerId of writerIds) {
    merged[writerId] = Math.max(
      getCounter(left, writerId),
      getCounter(right, writerId),
    );
  }

  return merged;
}

function compareVectorClocks(
  left: VectorClock,
  right: VectorClock,
): ClockRelation {
  const writerIds = new Set([
    ...Object.keys(left),
    ...Object.keys(right),
  ]);

  let leftHasSmaller = false;
  let rightHasSmaller = false;

  for (const writerId of writerIds) {
    const leftValue = getCounter(left, writerId);
    const rightValue = getCounter(right, writerId);

    if (leftValue < rightValue) {
      leftHasSmaller = true;
    }

    if (rightValue < leftValue) {
      rightHasSmaller = true;
    }
  }

  if (!leftHasSmaller && !rightHasSmaller) {
    return "equal";
  }

  if (leftHasSmaller && !rightHasSmaller) {
    return "before";
  }

  if (!leftHasSmaller && rightHasSmaller) {
    return "after";
  }

  return "concurrent";
}
```

This gives you:
- sparse clocks
- per-writer maximum merge
- explicit concurrency detection instead of accidental tie-breaking

### Example 2: A Mutable Replica-Local Clock

```typescript
class MutableVectorClock {
  private state: Record<WriterId, number>;

  constructor(
    private readonly writerId: WriterId,
    initialState: VectorClock = {},
  ) {
    this.state = { ...initialState };
  }

  localEvent(): VectorClock {
    this.state = {
      ...this.state,
      [this.writerId]: getCounter(this.state, this.writerId) + 1,
    };

    return this.snapshot();
  }

  receive(remote: VectorClock): VectorClock {
    const merged = mergeVectorClocks(this.state, remote);

    this.state = {
      ...merged,
      [this.writerId]: getCounter(merged, this.writerId) + 1,
    };

    return this.snapshot();
  }

  snapshot(): VectorClock {
    return { ...this.state };
  }
}
```

This pattern fits message-driven systems where a receive is itself recorded as a local event.

If your replicated store instead:
- merges remote context on arrival
- increments only when creating a new stored version

then keep those steps separate in the write path.

### Example 3: Conflict-Aware Version Comparison

```typescript
type Profile = {
  displayName: string;
  timezone: string;
};

type VersionedProfile = {
  profileId: string;
  value: Profile;
  vector: VectorClock;
  updatedBy: WriterId;
  updatedAtIso: string;
};

type MergeOutcome =
  | {
      kind: "use_left";
      version: VersionedProfile;
    }
  | {
      kind: "use_right";
      version: VersionedProfile;
    }
  | {
      kind: "already_equal";
      version: VersionedProfile;
    }
  | {
      kind: "conflict";
      siblings: [VersionedProfile, VersionedProfile];
    };

function compareVersions(
  left: VersionedProfile,
  right: VersionedProfile,
): MergeOutcome {
  const relation = compareVectorClocks(left.vector, right.vector);

  switch (relation) {
    case "before":
      return { kind: "use_right", version: right };
    case "after":
      return { kind: "use_left", version: left };
    case "equal":
      return { kind: "already_equal", version: left };
    case "concurrent":
      return {
        kind: "conflict",
        siblings: [left, right],
      };
  }
}
```

The important part is that concurrency becomes an explicit outcome instead of falling through to "pick the larger timestamp."

### Example 4: A Replica Store That Preserves Siblings

```typescript
type StoredValue<T> = {
  value: T;
  vector: VectorClock;
  writtenBy: WriterId;
  recordedAtIso: string;
};

class ReplicaDocumentStore<T> {
  private siblings: StoredValue<T>[] = [];

  constructor(private readonly writerId: WriterId) {}

  writeLocal(value: T, baseClock: VectorClock = {}): StoredValue<T> {
    const nextClock = tick(baseClock, this.writerId);

    const nextVersion: StoredValue<T> = {
      value,
      vector: nextClock,
      writtenBy: this.writerId,
      recordedAtIso: new Date().toISOString(),
    };

    this.integrate(nextVersion);
    return nextVersion;
  }

  acceptRemote(version: StoredValue<T>): void {
    this.integrate(version);
  }

  readSiblings(): StoredValue<T>[] {
    return [...this.siblings];
  }

  private integrate(incoming: StoredValue<T>): void {
    const survivors: StoredValue<T>[] = [];
    let shouldStoreIncoming = true;

    for (const existing of this.siblings) {
      const relation = compareVectorClocks(
        existing.vector,
        incoming.vector,
      );

      if (relation === "before") {
        continue;
      }

      if (relation === "after" || relation === "equal") {
        shouldStoreIncoming = false;
      }

      survivors.push(existing);
    }

    if (shouldStoreIncoming) {
      survivors.push(incoming);
    }

    this.siblings = survivors;
  }
}
```

This store is intentionally simple, but it demonstrates the durable policy:
- dominated versions can be dropped
- equal versions can be deduplicated
- concurrent versions survive until a domain merge or human decision resolves them

### Keep Wall Time Separate

Notice that the examples keep both:
- `vector` for causal reasoning
- `recordedAtIso` for operators and humans

That separation avoids a common mistake:

```text
wall-clock timestamps are useful context
vector clocks are causal metadata
they should not be asked to do each other's job
```


# 9. Design Principles and Common Pitfalls

Vector clocks work well when the system is disciplined about scope, propagation, and merge semantics.

### Practical Design Principles

```text
Good:
├── choose the writer scope deliberately before picking the data structure
├── treat missing vector entries as zero consistently across compare and merge logic
├── carry vector metadata in replication messages or stored versions explicitly
├── keep concurrent siblings until a merge policy actually resolves them
├── store wall-clock timestamps separately for audit and operator visibility
├── document how restarts, replica replacement, and retirement affect writer identity
├── test offline, delayed, duplicated, and reordered synchronization paths
└── switch to a simpler sequence number when one authoritative writer already exists

Bad:
├── track every transient actor forever without a pruning story
├── collapse concurrent versions with a timestamp tie-breaker "just for simplicity"
├── compare sparse vectors inconsistently across services
├── assume per-replica vectors capture per-client intent automatically
├── drop vector entries without proving old versions no longer depend on them
├── use vector clocks as a substitute for quorum, fencing, or lease safety
└── forget that causal dominance and business correctness are different questions
```

### Be Explicit About Conflict Resolution

Vector clocks tell you when versions are concurrent. They do not tell you how to merge them.

Possible conflict strategies include:
- keep both siblings and let the application choose
- merge disjoint fields automatically
- choose a domain-specific winner only when the rule is genuinely safe
- ask the user to resolve the conflict

That policy should be visible in the design, not hidden in timestamp order.

### Identity and Lifecycle Matter

If writer identity changes unexpectedly:
- comparisons become ambiguous
- old and new vectors may no longer reflect one coherent scope
- pruning or retirement can become unsafe

Examples of situations that need explicit handling:
- replica replacement
- shard movement
- device reinstallation
- rolling migrations from one writer-scope model to another

### Test the Awkward Cases

Useful tests include:
- two writers editing the same record while partitioned
- one writer receiving an older dominated version after a newer one
- deduplication of equal versions
- sibling preservation for concurrent versions
- pruning or scope-change behavior during maintenance

Vector-clock bugs often stay hidden until the system is under partial connectivity or prolonged offline behavior.

### Prefer the Weakest Tool That Answers the Real Question

A useful architecture review question is:

```text
Do I need:
  authoritative ordering,
  causal dominance checks,
  or true concurrent-version detection?
```

That usually leads to a cleaner choice between:
- sequence numbers
- Lamport timestamps
- vector clocks
- version-vector variants
- domain-specific merge metadata


# 10. Summary

**Vector clocks preserve more causal information than scalar logical clocks.**
- They track one counter per writer in scope instead of compressing all writers into one number.
- That extra detail makes it possible to compare versions by inclusion rather than just by numeric order.

**Vector comparison gives a useful partial-order result.**
- One vector can be before, after, equal to, or concurrent with another.
- Concurrent means neither version includes the other within the tracked writer scope.

**The main value is explicit conflict detection.**
- Vector clocks are useful in multi-writer replication, offline sync, and sibling-preserving storage.
- They help the system decide whether to fast-forward, merge, preserve siblings, or surface a conflict.

**The main cost is metadata growth and scope management.**
- Storage and comparison cost grow with the number of tracked writers.
- Writer identity, pruning strategy, and replica lifecycle need deliberate design.

**Vector clocks do not replace domain rules or coordination protocols.**
- They do not decide business merges, safe leader ownership, or elapsed time.
- They answer a narrower but important question: does one version include another, or are the versions concurrent?

**Implementation checklist:**

```text
Modeling:
  □ Choose the writer scope explicitly: process, replica, device, or partition
  □ Decide whether plain vector clocks or replica-scoped version vectors are sufficient
  □ Confirm that concurrency detection is the real requirement

Protocol:
  □ Increment the local writer entry for each new local event or stored version
  □ Propagate vector metadata with messages, replication state, or durable versions
  □ Merge remote vectors by taking the per-writer maximum

Comparison and conflict handling:
  □ Implement consistent before, after, equal, and concurrent comparison rules
  □ Preserve concurrent siblings until domain merge logic resolves them
  □ Keep wall-clock timestamps separate from vector metadata

Operations and testing:
  □ Define how writer identity behaves across restart, replacement, or retirement
  □ Add a bounded strategy for writer-set growth or vector compaction
  □ Test delayed, duplicated, reordered, offline, and concurrent update paths
```
