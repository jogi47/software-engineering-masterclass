# Paxos Algorithm

[← Back to Index](README.md)

Imagine you are building a shard-metadata service. Five coordinator nodes must agree on one placement plan for shard `orders-17`. If one part of the cluster routes traffic to `db-a` while another part routes traffic to `db-b`, failover logic and repair jobs can make the outage worse instead of better.

Without Paxos, teams often implement "highest ballot wins" and assume that is enough:

```typescript
type PlacementProposal = {
  ballot: number;
  value: string;
};

class NaiveAcceptor {
  private latestBallot = -1;
  private accepted: PlacementProposal | null = null;

  accept(proposal: PlacementProposal): boolean {
    if (proposal.ballot < this.latestBallot) {
      return false;
    }

    this.latestBallot = proposal.ballot;
    this.accepted = proposal;
    return true;
  }
}
```

This still fails in ways that matter:
- proposer `P1` can get a majority to accept value `A`
- proposer `P2` can later use a higher ballot and get another majority to accept value `B`
- the two majorities overlap, but nothing forces `P2` to preserve `A`
- "higher ballot wins" alone does not protect a value that may already have been chosen

This is where **Paxos** comes in. Paxos is a crash-fault consensus protocol for choosing one value safely despite delayed, duplicated, or reordered messages and despite node crash-recovery. Classic Paxos is usually taught as a **single-value** protocol first, then extended into repeated log slots through **Multi-Paxos**. The important lesson is not memorizing the original storytelling. It is understanding the invariants: overlapping quorums, monotonically increasing proposal numbers, and the rule that later successful proposals must carry forward already accepted history.

In this chapter quick links:
  * [Why Paxos matters](#1-why-paxos-matters)
  * [What single-value consensus problem Paxos solves](#2-the-single-value-consensus-problem)
  * [How roles, ballots, and quorums fit together](#3-roles-ballots-and-quorum-intersection)
  * [How the two-phase protocol works](#4-the-two-phase-protocol)
  * [Why Paxos preserves safety](#5-why-paxos-preserves-safety)
  * [What happens when proposals compete](#6-concurrent-proposals-retries-and-liveness-limits)
  * [How chosen values are learned and extended into Multi-Paxos](#7-learning-the-chosen-value-and-moving-to-multi-paxos)
  * [What practical TypeScript patterns look like](#8-practical-typescript-patterns)
  * [Which design principles and pitfalls repeat](#9-design-principles-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why Paxos Matters

Paxos matters when your system needs one durable answer that several machines must honor consistently.

Typical examples include:
- choosing the active owner for a shard or lease
- agreeing on a configuration version before rollout
- deciding the next command in a replicated metadata log
- electing a leader for a coordination-heavy control plane
- recording one authoritative decision before downstream side effects begin

### Paxos Is About Safety Under Uncertainty

The hard part is not getting machines to say "yes." The hard part is preventing two incompatible values from both looking valid after crashes, retries, and message delay.

```text
┌──────────────────────────────┬──────────────────────────────────────────────┐
│ What the system needs        │ What a naive approach often assumes         │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ one chosen value             │ first fast reply is good enough             │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ durability across restart    │ in-memory agreement is sufficient           │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ stale proposal rejection     │ a larger timestamp alone solves everything  │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ overlapping quorum history   │ separate majorities can be reasoned about   │
│                              │ independently                               │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

### It Solves a Narrow but Important Problem

Paxos does not try to solve:
- business-level conflict resolution
- arbitrary cross-service rollback
- Byzantine or malicious behavior
- every hot-path data write in a large-scale system

It solves a narrower problem:

```text
choose one value safely
within a stated crash-fault model
using quorum intersection
```

That narrower focus is why Paxos shows up most naturally in:
- lock services
- metadata stores
- control-plane coordination
- replicated state-machine logs for critical authority decisions

### Not Every System Needs Paxos

If the workload can tolerate divergence and reconcile later, simpler tools may be enough:
- append-only event streams
- optimistic concurrency
- idempotent retries with reconciliation
- version vectors or domain merges

Paxos earns its cost when conflicting answers would be materially unsafe.


# 2. The Single-Value Consensus Problem

Classic Paxos is easiest to understand as a **single-decree** protocol: the cluster must choose one value for one decision slot.

### One Slot, One Chosen Value

Examples:
- who owns lease `L-42`
- which config version becomes active next
- what command belongs in log slot `17`

For a single slot, several values may be proposed, but at most one value should become **chosen**.

### The Important State Transitions Are Different

Paxos discussions are clearer when you separate these terms:

```text
┌──────────────┬─────────────────────────────────────────────────────────────┐
│ Term         │ Meaning                                                     │
├──────────────┼─────────────────────────────────────────────────────────────┤
│ proposed     │ some proposer would like the cluster to choose a value     │
├──────────────┼─────────────────────────────────────────────────────────────┤
│ accepted     │ an acceptor recorded a value for a ballot                  │
├──────────────┼─────────────────────────────────────────────────────────────┤
│ chosen       │ a quorum of acceptors accepted the same value              │
├──────────────┼─────────────────────────────────────────────────────────────┤
│ learned      │ some learner or client discovered which value was chosen   │
└──────────────┴─────────────────────────────────────────────────────────────┘
```

Those states are related, but they are not identical.

### The Usual Safety Goal

The key safety property is:

```text
once a value is chosen for a slot,
no different value should ever be chosen for that same slot
```

That is the property that later ballots, retries, and new leaders must preserve.

### The Fault Model Matters

Classic Paxos is usually described under crash-fault assumptions:
- nodes may stop and later recover
- storage can be persisted across restart
- messages may be delayed, duplicated, or reordered
- the network is not assumed to have reliable timing bounds

It is safer to say:
- Paxos preserves safety under its modeled failures
- progress usually needs enough healthy nodes and eventually stable enough communication

### A Majority Is the Common Quorum

With `2f + 1` acceptors, a majority quorum of `f + 1` can tolerate up to `f` unavailable acceptors for safety-preserving progress.

Examples:
- 3 acceptors -> quorum 2
- 5 acceptors -> quorum 3
- 7 acceptors -> quorum 4

The deeper reason is not arithmetic alone. It is **quorum intersection**, which the next section covers.


# 3. Roles, Ballots, and Quorum Intersection

Classic Paxos usually introduces three roles: **proposer**, **acceptor**, and **learner**.

### Roles

```text
┌────────────┐      sends proposals      ┌────────────┐
│ proposer   │ ───────────────────────▶ │ acceptor   │
└────────────┘                          └────────────┘
       │                                       │
       │ chosen value evidence                 │ accepted state
       ▼                                       ▼
┌────────────┐ <──────────────────────── ┌────────────┐
│ learner    │      notifications        │ acceptor   │
└────────────┘                           └────────────┘
```

- **Proposer:** tries to get a value chosen
- **Acceptor:** stores promises and accepted values
- **Learner:** discovers which value became chosen

In many practical implementations, one process can play multiple roles.

### Proposal Numbers Must Be Totally Ordered

Each proposal carries a unique, monotonically ordered identifier, often called a **ballot** or **proposal number**.

Common patterns include:
- `(counter, proposerId)`
- `(term, nodeId)`
- a durable round number combined with node identity

The important property is:

```text
any two ballots can be compared deterministically
and no two distinct proposals reuse the same ballot
```

### Acceptors Track Two Different Things

Each acceptor usually remembers:
- the highest ballot it has **promised** not to go below
- the highest-ballot proposal it has already **accepted**, if any

That distinction matters because an acceptor may promise a newer ballot before it accepts anything at that ballot.

### Quorum Intersection Is the Core Safety Lever

For a 5-node cluster, any two majorities overlap:

```text
Acceptors:   A   B   C   D   E

Quorum 1:    A   B   C
Quorum 2:            C   D   E

Overlap:             C
```

That overlap means later successful work cannot be completely ignorant of earlier successful work, provided the overlapping acceptor remembers the relevant state durably.

### Why the Overlap Alone Is Not Enough

Overlap prevents isolation, but it does not by itself force the next proposer to preserve the earlier value. Paxos adds two rules:
- acceptors promise not to honor lower ballots after promising a higher one
- a proposer that learns about prior accepted values must adopt the highest-ballot accepted value it heard from the quorum

Those rules turn quorum overlap into a safety argument instead of a coincidence.


# 4. The Two-Phase Protocol

Classic single-value Paxos uses two main phases: **prepare/promise** and **accept/accepted**.

### Phase 1: Prepare and Promise

1. A proposer chooses a new ballot number.
2. It sends `prepare(ballot)` to acceptors.
3. Each acceptor:
   - rejects the request if it already promised a higher ballot
   - otherwise records a promise for this ballot
   - returns any previously accepted proposal it remembers

```text
Proposer P1                         Acceptors

prepare(10,P1) ───────────────▶    A: promise 10,P1, accepted = none
prepare(10,P1) ───────────────▶    B: promise 10,P1, accepted = (7,P2,"X")
prepare(10,P1) ───────────────▶    C: promise 10,P1, accepted = none
```

If the proposer gets promises from a quorum, it can move to phase 2.

### The Critical Value-Selection Rule

After collecting quorum promises:
- if none of the replies contains an accepted value, the proposer may use its own candidate value
- otherwise it must adopt the value from the **highest-ballot accepted proposal** returned in those replies

That is the rule that preserves already chosen history.

```text
No accepted values seen:
  proposer may send its own value

Accepted values seen:
  proposer must carry forward the value from the highest accepted ballot
```

### Phase 2: Accept and Accepted

The proposer sends `accept(ballot, value)` to acceptors.

Each acceptor:
- rejects if it has already promised a higher ballot
- otherwise records both the promise and the accepted proposal for this ballot/value
- replies `accepted`

```text
Proposer P1                         Acceptors

accept(10,P1,"X") ─────────────▶    A: accepted (10,P1,"X")
accept(10,P1,"X") ─────────────▶    B: accepted (10,P1,"X")
accept(10,P1,"X") ─────────────▶    C: accepted (10,P1,"X")
```

Once a quorum accepts the same value for that slot, the value is **chosen**.

### Clean Execution Example

```text
Cluster: A, B, C
Quorum: any 2

1. P1 sends prepare(4,P1) to A,B
2. A,B promise and report no accepted value
3. P1 sends accept(4,P1,"leader=A")
4. A,B accept
5. "leader=A" is chosen
```

### Recovery Example After Prior Accepted State Exists

```text
Earlier state:
  B accepted (3,P2,"leader=A")
  C accepted (3,P2,"leader=A")

Later:
1. P3 sends prepare(5,P3) to A,B,C
2. B and C report accepted value "leader=A"
3. P3 must propose "leader=A", not a fresh value
4. A/B/C may accept (5,P3,"leader=A")
5. the chosen value stays consistent
```

The ballot changed. The value did not.


# 5. Why Paxos Preserves Safety

The safety argument is easier to retain if you focus on one intuition:

```text
later successful proposals cannot ignore
what an overlapping earlier quorum already accepted
```

### Step 1: Chosen Means a Quorum Accepted the Value

Suppose value `X` became chosen at ballot `7`. That means some quorum accepted `(7, X)`.

### Step 2: Any Later Successful Quorum Must Overlap That Quorum

If a later proposer with ballot `11` reaches a quorum, that quorum shares at least one acceptor with the earlier quorum.

```text
Earlier chosen quorum:   A   B   C
Later prepare quorum:        B   C   D

Overlap:                    B   C
```

### Step 3: The Overlapping Acceptor Reports What It Knows

When the later proposer runs phase 1, the overlapping acceptor reports its previously accepted proposal. Because the proposer must pick the highest-ballot accepted value it sees, the later proposal carries forward `X`.

That is the core chain:
- quorum overlap exposes prior accepted state
- prepare replies surface that state
- proposer adoption preserves the value

### Step 4: Durable State Matters

This is why acceptor state is not optional bookkeeping.

If an acceptor loses:
- its highest promised ballot
- or its previously accepted proposal

then a later proposer may reason from incomplete history.

In practical terms:

```text
promise and accepted records that matter for recovery
must be persisted before the acceptor claims success
```

### Safety Does Not Mean Instant Learning

One nuance often missed:
- a value may already be **chosen**
- while some nodes have not yet **learned** it

Safety is about the chosen value not changing. It does not require every participant to learn it immediately.

### Safety and Liveness Are Still Separate

Paxos can preserve safety while making little or no progress during instability. That is not a contradiction. It is the standard trade-off in distributed coordination.


# 6. Concurrent Proposals, Retries, and Liveness Limits

Classic Paxos becomes harder operationally when several proposers compete repeatedly.

### Competing Proposers Can Preempt Each Other

Example:

```text
P1 sends prepare(10,P1)
P2 sends prepare(11,P2)

Acceptors promise 11,P2 where they see it.
P1's later accept(10,P1,...) requests are rejected there.
P1 retries with a higher ballot.
P2 may be preempted in turn.
```

That preserves safety, but too much competition can delay progress.

### The Classic "Dueling Proposers" Problem

```text
time →

P1: prepare(10) ---- accept(10) X
P2:      prepare(11) ---- accept(11) X
P1:                 prepare(12) ---- accept(12) X
P2:                        prepare(13) ---- accept(13) X
```

If the environment keeps letting proposers interrupt one another, the system may remain safe but slow or unavailable for writes.

### Paxos Does Not Promise Time-Bounded Completion in a Fully Asynchronous Model

This fits the broader consensus lesson:
- safety can hold without synchronized clocks
- liveness usually depends on some eventual stability

Practical progress assumptions often include:
- a quorum of acceptors is reachable
- durable storage keeps required state
- one proposer eventually gets a stable enough run
- message delay eventually becomes tame enough for timeouts and retries to converge

### Common Practical Mitigations

```text
┌──────────────────────────────┬──────────────────────────────────────────────┐
│ Problem                      │ Common mitigation                            │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ dueling proposers            │ elect or converge on one stable leader       │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ repeated ballot preemption   │ randomized backoff and retry discipline      │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ stale authority after split  │ fencing, epochs, or downstream token checks  │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ slow crash recovery          │ durable acceptor state and catch-up logic    │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

### Timeouts Are Suspicion, Not Proof

A timeout can justify trying a higher ballot. It does not prove that the old proposer is gone or that a lower ballot did not already choose a value.

That is why Paxos does not let local timeout alone authorize a new value. The protocol still needs phase-1 evidence from a quorum.


# 7. Learning the Chosen Value and Moving to Multi-Paxos

Choosing a value is only part of the job. The system still needs to learn, apply, and often repeat the decision process across many slots.

### Learners Need Evidence That a Quorum Accepted the Same Value

A learner may discover the chosen value in several ways:
- the proposer collects quorum `accepted` responses and announces the result
- acceptors notify learners directly
- replicas infer the chosen value while replaying log state

The durable point is:

```text
chosen means quorum-accepted
learned means some participant has enough evidence of that fact
```

### Single-Value Paxos Extends Naturally to Repeated Slots

Many real systems need a log, not just one decision:

```text
slot 1 -> config v1
slot 2 -> add shard owner
slot 3 -> remove shard owner
slot 4 -> config v2
```

Running full phase 1 and phase 2 for every slot is correct but expensive.

### Multi-Paxos Usually Optimizes Around a Stable Leader

If one proposer is stable for a while, the system can often amortize phase 1:
- the leader establishes authority with a ballot
- later slots reuse that stable leadership
- the steady state becomes closer to repeated phase-2 accepts for each new slot
- if leadership changes, a new proposer performs recovery work before continuing

```text
Classic repeated single-value Paxos:
  prepare + accept for every slot

Multi-Paxos steady state:
  one leadership-establishing prepare phase
  then repeated accept phases for new slots
```

This is one reason practical Paxos-family systems often look leader-oriented even though the original single-value description is more symmetric.

### Leader Change Still Must Respect Prior History

A new leader cannot simply start appending fresh commands.

It usually needs to:
- learn which values may already be accepted or chosen in prior slots
- preserve that history
- fill gaps carefully
- continue with a higher ballot

That is the repeated-log version of the same safety rule from single-value Paxos.

### Where You See These Ideas in Practice

Public system literature has described Paxos-family designs in coordination services and globally replicated metadata systems. Other widely used platforms solve the same coordination problem with different protocol families. For example, Kubernetes commonly relies on `etcd`, which uses Raft rather than Paxos. The durable lesson is not that every system should use Paxos specifically. It is that critical authority paths usually need quorum-backed replicated state, stale-leader protection, and disciplined recovery.


# 8. Practical TypeScript Patterns

These examples show the shape of single-value Paxos logic. They are intentionally smaller than a production implementation, but the invariants they emphasize are real.

### Example 1: Ballots Need Deterministic Ordering

```typescript
type NodeId = string;

type Ballot = {
  round: number;
  proposerId: NodeId;
};

function compareBallots(left: Ballot, right: Ballot): number {
  if (left.round !== right.round) {
    return left.round - right.round;
  }

  return left.proposerId.localeCompare(right.proposerId);
}

function isBallotGreaterThanOrEqual(
  left: Ballot,
  right: Ballot,
): boolean {
  return compareBallots(left, right) >= 0;
}
```

Using a pair such as `(round, proposerId)` avoids ambiguity when two proposers advance independently.

### Example 2: Majority Quorum Math Should Be Explicit

```typescript
class MajorityQuorum {
  constructor(private readonly clusterSize: number) {
    if (clusterSize < 1) {
      throw new Error("clusterSize must be positive");
    }
  }

  size(): number {
    return Math.floor(this.clusterSize / 2) + 1;
  }

  hasQuorum(nodes: ReadonlySet<NodeId>): boolean {
    return nodes.size >= this.size();
  }
}
```

Hard-coding `>= 2` in scattered places makes the protocol much harder to audit later.

### Example 3: Acceptor State Should Separate Promise From Accepted Value

```typescript
type AcceptedProposal<T> = {
  ballot: Ballot;
  value: T;
};

type PrepareResponse<T> =
  | {
      kind: "promise";
      promisedBallot: Ballot;
      accepted: AcceptedProposal<T> | null;
    }
  | {
      kind: "reject";
      promisedBallot: Ballot;
    };

type AcceptResponse<T> =
  | {
      kind: "accepted";
      proposal: AcceptedProposal<T>;
    }
  | {
      kind: "reject";
      promisedBallot: Ballot;
    };

class InMemoryAcceptor<T> {
  private promisedBallot: Ballot | null = null;
  private accepted: AcceptedProposal<T> | null = null;

  onPrepare(ballot: Ballot): PrepareResponse<T> {
    if (
      this.promisedBallot !== null &&
      compareBallots(ballot, this.promisedBallot) < 0
    ) {
      return {
        kind: "reject",
        promisedBallot: this.promisedBallot,
      };
    }

    this.promisedBallot = ballot;

    return {
      kind: "promise",
      promisedBallot: ballot,
      accepted: this.accepted,
    };
  }

  onAccept(proposal: AcceptedProposal<T>): AcceptResponse<T> {
    if (
      this.promisedBallot !== null &&
      compareBallots(proposal.ballot, this.promisedBallot) < 0
    ) {
      return {
        kind: "reject",
        promisedBallot: this.promisedBallot,
      };
    }

    this.promisedBallot = proposal.ballot;
    this.accepted = proposal;

    return {
      kind: "accepted",
      proposal,
    };
  }
}
```

In production, the fields above normally need durable persistence before the acceptor replies success.

### Example 4: The Proposer Must Reuse the Highest Accepted Value It Learns

```typescript
function chooseValueFromPromises<T>(
  initialValue: T,
  responses: Array<Extract<PrepareResponse<T>, { kind: "promise" }>>,
): T {
  let highestAccepted: AcceptedProposal<T> | null = null;

  for (const response of responses) {
    if (response.accepted === null) {
      continue;
    }

    if (
      highestAccepted === null ||
      compareBallots(
        response.accepted.ballot,
        highestAccepted.ballot,
      ) > 0
    ) {
      highestAccepted = response.accepted;
    }
  }

  return highestAccepted?.value ?? initialValue;
}
```

This is the line of code that keeps a later proposer from overwriting already accepted history with a fresh value.

### Example 5: A Learner Needs Quorum Evidence

```typescript
function proposalKey<T>(proposal: AcceptedProposal<T>): string {
  return JSON.stringify({
    round: proposal.ballot.round,
    proposerId: proposal.ballot.proposerId,
    value: proposal.value,
  });
}

class ChosenValueTracker<T> {
  private readonly acceptorsByProposalKey = new Map<
    string,
    Set<NodeId>
  >();

  constructor(private readonly quorum: MajorityQuorum) {}

  observeAccepted(
    acceptorId: NodeId,
    proposal: AcceptedProposal<T>,
  ): T | null {
    const key = proposalKey(proposal);
    const acceptors =
      this.acceptorsByProposalKey.get(key) ?? new Set<NodeId>();

    acceptors.add(acceptorId);
    this.acceptorsByProposalKey.set(key, acceptors);

    if (this.quorum.hasQuorum(acceptors)) {
      return proposal.value;
    }

    return null;
  }
}
```

### Keep the Single-Value Boundaries Visible

These helpers are deliberately single-slot and single-value. A production Multi-Paxos or replicated-log implementation usually adds:
- per-slot storage
- batching and retry logic
- leader establishment and recovery
- durable write-ahead persistence
- stale-writer fencing at downstream resources

If those concerns blur together too early, the safety invariants become harder to inspect.


# 9. Design Principles and Common Pitfalls

Paxos implementations stay safer when the invariants are visible in code, storage, and operator tooling.

### Practical Design Principles

```text
Good:
├── use Paxos for coordination state where conflicting answers would be unsafe
├── make ballots globally comparable and unique
├── persist promised and accepted state before treating it as durable protocol state
├── separate proposed, accepted, chosen, and learned states explicitly
├── require a proposer to adopt the highest accepted value seen in quorum promises
├── add fencing or epoch checks where stale leaders can still reach downstream systems
├── expect retries, duplicates, and delayed packets in both tests and production
└── treat Multi-Paxos leadership recovery as protocol work, not just service restart work

Bad:
├── implement only "higher ballot wins" and skip the value-adoption rule
├── keep acceptor state only in memory when crash recovery needs history
├── let local timeout alone authorize a fresh value
├── assume accepted means learned everywhere
├── hide quorum math in ad hoc constants
├── forget that membership changes alter quorum reasoning
├── use Paxos as a substitute for business idempotency
└── choose a protocol the team cannot explain or test under failure
```

### Paxos Is Foundational, but It Is Not the Only Reasonable Choice

Paxos-family ideas influenced many later protocols, but many teams adopt Raft-style systems because the control flow is easier to reason about operationally. That is a healthy trade-off. The right question is usually:

```text
which protocol family can this team
implement, test, and operate correctly
for the actual coordination workload?
```

### Membership and Reconfiguration Need Deliberate Design

Changing the participating acceptor set changes quorum intersection assumptions.

That means:
- replacing nodes is not merely a deployment concern
- adding or removing several nodes quickly can affect safety or availability
- configuration changes often need their own protocol-aware handling

Classic single-value Paxos descriptions often defer this topic, but production systems cannot.

### Paxos Still Needs Surrounding Application Discipline

Even with correct consensus:
- clients may retry after ambiguous timeouts
- downstream services may need fencing tokens
- commands may need idempotent application
- operators still need observability for ballot churn, lag, and recovery

Consensus protects one layer of correctness. It does not remove the need for disciplined application design around it.


# 10. Summary

**Paxos is a crash-fault consensus protocol for choosing one value safely.**
- It is most useful for coordination-heavy decisions such as leadership, configuration, and replicated control-plane commands.
- Its job is not "make the cluster fast." Its job is "prevent conflicting decisions from both becoming valid."

**The core safety ingredients are quorum intersection, ordered ballots, and value carry-forward.**
- Any two majorities overlap.
- Acceptors promise not to move backward to lower ballots.
- A later proposer must reuse the highest-ballot accepted value it learns from a quorum.

**Classic Paxos is easiest to learn as a single-value protocol.**
- Proposed, accepted, chosen, and learned are different states.
- Single-value Paxos extends into repeated slots through Multi-Paxos and other replicated-log designs.

**Durability and recovery are part of the algorithm, not optional extras.**
- Acceptor state must survive the failures that the protocol assumes.
- Leader changes and retries must recover prior accepted history before continuing.

**Paxos preserves safety more readily than it guarantees quick progress.**
- Competing proposers can preempt one another.
- Practical liveness usually depends on a reachable quorum and eventually stable leadership conditions.

**Implementation checklist:**

```text
Model:
  □ Confirm that the problem truly needs one agreed value or one agreed log slot
  □ Define the fault model clearly: crash faults, recovery behavior, and durability assumptions
  □ Choose quorum size and ballot format explicitly

Protocol:
  □ Implement prepare/promise and accept/accepted as separate protocol steps
  □ Store both promised ballot and accepted proposal state
  □ Reuse the highest accepted value seen in quorum promises before sending phase 2
  □ Distinguish proposed, accepted, chosen, and learned states in code and docs

Durability and recovery:
  □ Persist protocol state before acknowledging success where crash recovery depends on it
  □ Recover prior accepted history before a new leader continues appending work
  □ Add fencing or epoch checks where stale proposers could still reach downstream systems

Operations and testing:
  □ Monitor ballot churn, rejected proposals, quorum health, and learner lag
  □ Test dueling proposers, delayed packets, crash-recovery, and repeated retries
  □ Plan protocol-aware membership changes instead of ad hoc node replacement
```
