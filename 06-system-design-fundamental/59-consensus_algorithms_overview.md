# Consensus Algorithms Overview

[← Back to Index](README.md)

Imagine you are building a replicated control-plane service for shard ownership. Three coordinator nodes must agree on which worker owns shard `payments-17`. If they disagree, two workers may process the same partition, or no worker may process it at all.

Without consensus, teams often let each node promote itself from its own local view:

```typescript
type LocalObservation = {
  selfId: string;
  knownLeaderId: string | null;
  lastLeaderHeartbeatMs: number | null;
  nowMs: number;
  timeoutMs: number;
};

class NaiveFailoverController {
  shouldBecomeLeader(observation: LocalObservation): boolean {
    if (observation.knownLeaderId === null) {
      return true;
    }

    if (observation.lastLeaderHeartbeatMs === null) {
      return true;
    }

    return (
      observation.nowMs - observation.lastLeaderHeartbeatMs >
      observation.timeoutMs
    );
  }
}
```

This breaks in ways that matter:
- two nodes in different network partitions can both conclude the leader is gone
- an old leader can continue serving writes after the rest of the cluster moved on
- different replicas can accept different commands at the same logical position
- a client acknowledgment can reflect local optimism rather than cluster-wide agreement

This is where **consensus algorithms** come in. They give a cluster rules for agreeing on one chosen value, one active leader, or one committed command order even when machines crash and messages arrive late. The hard part is not merely making progress. It is preserving safety when the cluster is uncertain.

In this chapter quick links:
  * [Why consensus matters](#1-why-consensus-matters)
  * [What consensus means](#2-what-consensus-means)
  * [How safety and liveness shape the problem](#3-safety-liveness-and-the-cost-of-being-wrong)
  * [Why failure models, timing assumptions, and FLP matter](#4-failure-models-timing-assumptions-and-flp)
  * [How quorums, terms, and leadership fit together](#5-quorums-terms-and-leadership)
  * [How replicated-log consensus usually works](#6-how-replicated-log-consensus-usually-works)
  * [Which consensus families are common and where they fit](#7-common-consensus-families-and-where-they-fit)
  * [What practical TypeScript guardrails look like](#8-practical-typescript-patterns)
  * [Which design principles and pitfalls repeat](#9-design-principles-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why Consensus Matters

Consensus matters when a distributed system needs one answer that multiple nodes must honor consistently.

Common examples:
- which node is the leader right now
- which configuration version is active
- which command is committed at log slot `104`
- which worker owns a shard or lease
- which metadata update is the next durable state transition

### Many Data Problems Tolerate Divergence Better Than Coordination Problems

Some data paths can survive temporary divergence:
- analytics counters can be reconciled later
- cache entries can be refreshed
- search indexes can lag behind source-of-truth storage

Coordination state is different. If two nodes believe conflicting answers at the same time, the system can produce unsafe behavior:
- two leaders both issue writes
- two schedulers both assign the same work
- one replica serves config `v4` while another enforces config `v5`
- a client sees an operation as committed when a quorum never accepted it

### Consensus Is Often for the Control Plane, Not the Entire Data Plane

A useful mental model is:

```text
Consensus is usually best for:
  small, high-value, coordination-heavy state

Consensus is usually not best for:
  every hot-path user write in a large-volume data plane
```

That is why many systems use consensus-backed metadata to coordinate:
- leaders
- membership
- shard placement
- schema or config changes
- ordered command logs

and then let other subsystems handle bulk storage, caching, or asynchronous propagation separately.

### The Real Goal Is Agreement Under Uncertainty

Consensus is not about pretending the network is reliable. It is about defining what the cluster will and will not do when:
- messages are delayed
- nodes crash and recover
- some nodes are unreachable
- old leaders keep running with stale information

That makes consensus a coordination discipline, not just an algorithm label.


# 2. What Consensus Means

At a high level, consensus means a set of participating nodes reaches one shared decision despite distributed uncertainty.

### The Classic Single-Value View

The textbook form asks a cluster to choose one value:
- a leader identity
- one client command
- one configuration change
- one yes/no decision

The usual properties are:
- **Agreement:** two correct participants should not decide different values
- **Validity:** the chosen value should come from the allowed proposal set
- **Termination:** participants should eventually decide when the protocol's progress assumptions hold

### Real Systems Often Need Repeated Consensus

Most practical systems do not stop after one decision. They need a sequence of decisions:
- command `1`
- command `2`
- command `3`

That is the basis of a **replicated log** or **replicated state machine**.

```text
Client commands:
  cmd-101, cmd-102, cmd-103

Replicated log:
  slot 1 -> cmd-101
  slot 2 -> cmd-102
  slot 3 -> cmd-103

Applied state machine:
  state0 --cmd-101--> state1 --cmd-102--> state2 --cmd-103--> state3
```

If every replica applies the same committed commands in the same order, they can converge on the same state.

### Consensus Is Narrower Than "Keeping Systems in Sync"

Consensus does not mean:
- every replica is always up to date instantly
- every client sees the latest value at every moment
- every subsystem uses the same algorithm

Consensus more specifically means:

```text
the protocol defines one authoritative decision path
for a chosen value or command order
within its stated fault model
```

That narrower definition is important. It prevents teams from expecting consensus to solve unrelated problems such as:
- business-level conflict resolution
- offline merge semantics
- cross-service rollback of arbitrary workflows
- arbitrary malicious behavior if the protocol only assumes crash faults


# 3. Safety, Liveness, and the Cost of Being Wrong

Consensus discussions make more sense once you separate **safety** from **liveness**.

### Safety Means "Nothing Incorrect Is Decided"

Safety asks questions such as:
- can two leaders both believe they were legitimately elected for the same epoch
- can two replicas commit different commands at the same slot
- can a decided value later be replaced by an incompatible value

If safety fails, the cluster can corrupt its own coordination state.

### Liveness Means "The System Eventually Makes Progress"

Liveness asks:
- can the cluster elect a leader after a failure
- can new commands eventually be committed
- can the protocol stop retrying and reach a decision

If liveness fails, the cluster may become unavailable or slow, but it may still preserve correctness.

### Practical Systems Usually Prefer Safety Over Liveness

```text
┌──────────────────────────────┬──────────────────────────────────────────────┐
│ Property lost                │ Typical consequence                         │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ safety                       │ conflicting leaders or conflicting commits  │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ liveness                     │ delayed writes or temporary unavailability  │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

For coordination-heavy systems, temporary inability to commit is often safer than committing incompatible decisions.

Examples:
- a metadata service that pauses writes briefly may be inconvenient
- a metadata service that allows two active primaries can corrupt downstream state

### Log Protocols Add More Safety Structure

Leader-based replicated-log protocols usually add rules beyond basic agreement:
- a leader must demonstrate it is in a current term, ballot, or view
- followers reject stale proposals
- committed entries are applied in order
- quorum intersection preserves prior committed decisions

Those rules are how practical systems turn abstract consensus properties into an operational protocol.

### Safety and Liveness Depend on the Stated Model

It is safer to say:

```text
practical protocols aim to preserve safety
under their modeled failures,
and to make progress when enough nodes are healthy
and communication becomes stable enough
```

That wording matters because the guarantee is never stronger than the assumptions.


# 4. Failure Models, Timing Assumptions, and FLP

Consensus algorithms are shaped by what kinds of failure they are designed to tolerate.

### Failure Model Comes First

Useful questions include:
- do nodes only crash and recover, or can they behave arbitrarily
- is storage durable across restart
- can messages be delayed, duplicated, or reordered
- can the network partition the cluster into isolated groups

```text
┌──────────────────────────────┬──────────────────────────────────────────────┐
│ Failure model                │ Typical implication                         │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ crash-stop / crash-recovery  │ common target for Paxos-, Raft-, VR-style   │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ omission / delay / reorder   │ protocol must tolerate message uncertainty  │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ Byzantine / arbitrary faults │ requires stronger protocols and quorum cost │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

### FLP Explains Why Timing Matters

The FLP result says that in a fully asynchronous system, no deterministic consensus algorithm can guarantee termination if even one process may fail.

The durable takeaway is not:

```text
consensus is impossible in practice
```

It is closer to:

```text
if the system cannot rely on any eventual timing stability,
there is no deterministic protocol that can promise progress in all cases
```

### Real Systems Usually Add Practical Progress Assumptions

To make progress, practical crash-fault protocols typically depend on some combination of:
- eventual message delivery for a healthy majority
- timeouts to suspect failure
- randomized elections to reduce repeated collisions
- a period of relative stability long enough for one leader to stay active

These are often described as **partial synchrony** or **eventual synchrony** assumptions.

### Timeouts Indicate Suspicion, Not Ground Truth

A timeout does not prove a node crashed. It only proves that communication was not good enough within the configured interval.

That is why well-designed protocols treat timeouts as:
- a reason to start a new election
- a reason to stop trusting an old leader blindly
- not a proof that the old leader is physically dead

### Heartbeats and Failure Detectors Help, But They Do Not Remove Uncertainty

Heartbeats reduce detection delay. They do not eliminate ambiguity.

An old leader that stops hearing a majority should usually stop acting on authority, even if it is still running. This is one reason epochs, terms, or ballots matter: they provide a structured way to reject stale authority when communication resumes.


# 5. Quorums, Terms, and Leadership

Many practical consensus protocols share three recurring ideas:
- overlapping quorums
- monotonic epochs such as terms, views, or ballots
- a protocol for safe leadership or proposal authority

### Majority Quorums Work Because They Overlap

In a five-node cluster, any two majorities intersect:

```text
Quorum A: N1 N2 N3
Quorum B:       N3 N4 N5

Overlap:        N3
```

That overlap matters because it gives the protocol at least one node that can carry forward evidence of previously accepted or committed decisions.

### Terms, Views, and Ballots Fence Off Stale Authority

Different algorithms use different names:
- **term**
- **view**
- **epoch**
- **ballot**

The common idea is similar:
- authority is attached to a monotonic number
- newer authority supersedes older authority
- messages from older epochs can be rejected safely

```text
term 7 leader = A
term 8 leader = C

Any write from term 7 that arrives after term 8 is established
must be rejected or ignored by the protocol.
```

### Leadership Simplifies Ordering, But Leadership Alone Is Not Consensus

A leader-based design is attractive because:
- one node sequences commands
- followers replicate that sequence
- clients can route writes to one place

But leadership is safe only if the protocol defines:
- how the leader is elected
- how stale leaders are deactivated
- how entries become committed
- what must be durable before acknowledgments

### Quorum + Epoch + Durability Is the Usual Shape

```text
1. establish authority for a term / view / ballot
2. propose a value or log entry
3. replicate or gather acceptance from a quorum
4. mark the value committed only when protocol rules allow it
5. apply committed commands in order
```

Not every algorithm packages those steps the same way, but the pattern appears repeatedly.


# 6. How Replicated-Log Consensus Usually Works

A large class of practical systems use consensus to maintain an ordered log of commands.

### A Typical Flow

Suppose a five-node cluster has leader `A` in term `12`. A client submits command `set owner(shard-7) = worker-4`.

```text
Cluster:
  A B C D E

Current leader:
  A in term 12
```

The flow often looks like this:

```text
Client                Leader A                Followers B C D E
  |                      |                           |
  |-- command ---------->|                           |
  |                      | append entry (slot 104)  |
  |                      |------------------------->| replicate
  |                      |<-------------------------| ack from quorum
  |                      | mark committed           |
  |<-- success ----------|                           |
  |                      |------------------------->| apply commit index
```

### Commit Usually Requires More Than Local Append

Local append alone is not enough because the leader may crash before anyone else learns about the entry.

That is why many protocols distinguish:
- **appended / accepted / uncommitted**
- **committed**
- **applied**

These are related but not identical states.

```text
Leader local log:
  slot 104 present

This does not yet imply:
  slot 104 committed
```

### Why Uncommitted Entries Can Be Replaced

If a leader crashes before the protocol considers an entry committed, a new leader may legally overwrite that suffix according to the protocol's log-repair rules.

That is usually safe because:
- the old entry never reached the required commit condition
- the new leader comes from a quorum that preserves committed history

### Applied State Must Follow Commit Rules

A disciplined implementation normally:
- exposes success to the client only after the protocol's commit rule is satisfied
- applies entries to the deterministic state machine in commit order
- keeps side effects behind idempotent or fenced boundaries

If an implementation applies or exposes uncommitted work too early, it can violate the operational meaning of consensus even if the underlying math looked sound on paper.

### Leadership Changes Must Preserve the Prefix That Matters

Different algorithms express this differently, but a recurring goal is:

```text
once a value is safely committed,
a future leader should not commit an incompatible history
```

That is the practical promise operators care about.


# 7. Common Consensus Families and Where They Fit

Consensus is a family of ideas, not one single protocol.

### Common Crash-Fault Families

```text
┌──────────────────────────────┬──────────────────────────────────────────────┬──────────────────────────────────────────────┐
│ Family                       │ Typical shape                                │ Common fit                                   │
├──────────────────────────────┼──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ Paxos / Multi-Paxos          │ quorum-based proposal / acceptance           │ foundational replicated agreement            │
├──────────────────────────────┼──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ Viewstamped Replication      │ primary-backup style with views              │ replicated logs and failover coordination    │
├──────────────────────────────┼──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ Raft                         │ strong leader, term-based log replication    │ operationally approachable crash-fault logs  │
├──────────────────────────────┼──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ Zab-style atomic broadcast   │ ordered leader-based broadcast for a log     │ coordination services and metadata ordering  │
└──────────────────────────────┴──────────────────────────────────────────────┴──────────────────────────────────────────────┘
```

These protocols differ in structure and presentation, but they usually share:
- quorum intersection
- durable protocol state
- epoch-based leadership or proposal ordering
- careful treatment of stale messages and recovery

### Byzantine-Fault-Tolerant Families Solve a Harder Problem

Protocols such as PBFT- or HotStuff-like designs aim to tolerate arbitrary or malicious node behavior, not just crashes and delays.

That usually means:
- more communication
- larger quorum requirements
- explicit authentication and message validation
- stronger assumptions about node counts and trust boundaries

They are useful when the threat model requires them, not as a default replacement for crash-fault consensus.

### Consensus Is Not the Same as Several Neighboring Ideas

The following are related to distributed coordination but are not interchangeable with consensus:
- **Gossip:** spreads information probabilistically, but does not by itself choose one authoritative value
- **Two-phase commit:** coordinates atomic commit across participants, but has different blocking and failure trade-offs
- **Leases alone:** can reduce conflicts, but still need safe authority renewal and stale-owner rejection
- **CRDTs and merge-based replication:** allow convergence through merge rules rather than one agreed command order

### Where Consensus Fits Well

Consensus is often a good fit for:
- leader election for a critical subsystem
- cluster membership or configuration state
- shard ownership, partition assignment, or lock/lease authority
- ordered command logs for metadata or control-plane state
- relatively small state where correctness matters more than peak throughput

### Where Consensus Is Often the Wrong Default

Consensus is often a poor default for:
- high-volume telemetry ingestion
- every cache mutation
- bulk analytical event collection
- large multi-region data planes where looser consistency is acceptable
- application workflows better modeled by idempotency, outbox, or saga patterns

The review question is usually:

```text
Do I need one agreed authority or one agreed order,
or do I actually need merge, replay, compensation, or eventual convergence?
```


# 8. Practical TypeScript Patterns

These examples are not a full consensus implementation. They show guardrails that real implementations usually need around quorum, epochs, and stale-authority rejection.

### Quorum Math Should Be Explicit

```typescript
type NodeId = string;

class MajorityQuorum {
  constructor(private readonly clusterSize: number) {
    if (clusterSize < 1) {
      throw new Error("clusterSize must be positive");
    }
  }

  size(): number {
    return Math.floor(this.clusterSize / 2) + 1;
  }

  hasQuorum(voters: ReadonlySet<NodeId>): boolean {
    return voters.size >= this.size();
  }
}

const quorum = new MajorityQuorum(5);
const acknowledgers = new Set<NodeId>(["A", "B", "D"]);

console.log(quorum.hasQuorum(acknowledgers)); // true
```

If quorum size lives only in scattered comments or ad hoc `>= 2` checks, protocol safety becomes harder to audit.

### Term and Log-Freshness Checks Should Be Centralized

```typescript
type Term = number;
type Role = "follower" | "candidate" | "leader";

type VoteRequest = {
  candidateId: NodeId;
  term: Term;
  lastLogIndex: number;
  lastLogTerm: Term;
};

type LocalLogTail = {
  lastLogIndex: number;
  lastLogTerm: Term;
};

class TermState {
  private currentTerm: Term = 0;
  private votedFor: NodeId | null = null;
  private role: Role = "follower";

  observeRemoteTerm(remoteTerm: Term): void {
    if (remoteTerm > this.currentTerm) {
      this.currentTerm = remoteTerm;
      this.votedFor = null;
      this.role = "follower";
    }
  }

  current(): Term {
    return this.currentTerm;
  }

  becomeCandidate(): void {
    this.currentTerm += 1;
    this.votedFor = null;
    this.role = "candidate";
  }

  canGrantVote(
    request: VoteRequest,
    localTail: LocalLogTail,
  ): boolean {
    this.observeRemoteTerm(request.term);

    if (request.term !== this.currentTerm) {
      return false;
    }

    const alreadyVotedForAnotherCandidate =
      this.votedFor !== null && this.votedFor !== request.candidateId;

    if (alreadyVotedForAnotherCandidate) {
      return false;
    }

    const candidateIsUpToDate =
      request.lastLogTerm > localTail.lastLogTerm ||
      (request.lastLogTerm === localTail.lastLogTerm &&
        request.lastLogIndex >= localTail.lastLogIndex);

    if (!candidateIsUpToDate) {
      return false;
    }

    this.votedFor = request.candidateId;
    return true;
  }
}
```

A centralized term gate helps avoid a common failure mode: one code path quietly honoring stale leadership while another path has already advanced the term.

### Commit Only After a Quorum Acknowledges

```typescript
type LogEntry<Command> = {
  index: number;
  term: Term;
  command: Command;
};

class CommitTracker<Command> {
  private readonly acknowledgements = new Map<number, Set<NodeId>>();
  private commitIndex = 0;

  constructor(
    private readonly quorum: MajorityQuorum,
    private readonly localNodeId: NodeId,
  ) {}

  appendLocally(entry: LogEntry<Command>): void {
    this.acknowledgements.set(entry.index, new Set([this.localNodeId]));
  }

  acknowledge(index: number, nodeId: NodeId): void {
    const voters = this.acknowledgements.get(index);

    if (!voters) {
      throw new Error(`unknown log index ${index}`);
    }

    voters.add(nodeId);

    if (this.quorum.hasQuorum(voters)) {
      this.commitIndex = Math.max(this.commitIndex, index);
    }
  }

  committedThrough(): number {
    return this.commitIndex;
  }
}
```

This is intentionally simplified, but the important guardrail is real:

```text
local append != committed
quorum ack != applied side effects everywhere
```

### Fence Stale Leaders at the Resource Boundary

Even with a consensus-backed leader election, downstream resources should reject stale leaders explicitly.

```typescript
type FencedWrite = {
  resourceId: string;
  ownerId: NodeId;
  fencingToken: number;
  value: string;
};

class FencedRegister {
  private readonly highestTokenByResource = new Map<string, number>();
  private readonly valueByResource = new Map<string, string>();

  write(command: FencedWrite): void {
    const highestToken =
      this.highestTokenByResource.get(command.resourceId) ?? -1;

    if (command.fencingToken < highestToken) {
      throw new Error("stale leader write rejected");
    }

    this.highestTokenByResource.set(
      command.resourceId,
      command.fencingToken,
    );
    this.valueByResource.set(command.resourceId, command.value);
  }

  read(resourceId: string): string | undefined {
    return this.valueByResource.get(resourceId);
  }
}
```

Without fencing, an old leader that resumes after a partition can still reach downstream storage and cause damage even if the cluster has already elected a new leader.


# 9. Design Principles and Common Pitfalls

Consensus implementations fail less often when the design is explicit about scope, durability, and stale authority.

### Practical Design Principles

```text
Good:
├── use consensus for coordination state whose correctness is worth the latency cost
├── define the failure model before picking the protocol family
├── make quorum size, term handling, and commit rules explicit in code
├── persist the protocol state that the algorithm requires before acknowledging it
├── distinguish accepted, committed, and applied state clearly
├── fence stale leaders at downstream boundaries, not just inside the cluster
├── treat timeouts as suspicion and require protocol confirmation for authority
├── handle membership changes with a protocol-aware procedure
└── rehearse crash, restart, partition, and recovery paths in tests

Bad:
├── let a local timeout alone authorize writes
├── assume leader election without quorum is "good enough"
├── acknowledge client success before the protocol's commit condition is met
├── keep protocol state only in memory if crash recovery needs it to be durable
├── treat gossip, 2PC, or leases as automatic substitutes for consensus
├── put massive hot-path data volume behind consensus without a clear reason
├── ignore downstream stale-writer protection
└── change cluster membership ad hoc during incidents
```

### Consensus Solves Ordering and Authority, Not Every Application Concern

Even a correct consensus layer does not replace:
- idempotent command handling
- request deduplication
- access control
- business rollback or compensation
- rate limiting and overload protection

If the application layer ignores those concerns, a correct consensus core can still sit inside a fragile system.

### Membership Changes Need Deliberate Handling

Changing the node set changes quorum math.

That means:
- adding a node is not just a deployment event
- removing a node is not just a shutdown event
- replacing several nodes quickly can change the safety envelope

Different protocols use different reconfiguration techniques, but the safe lesson is stable:

```text
membership changes are part of the protocol,
not an afterthought outside it
```

### Observe the System in Terms of Safety Signals, Not Just Availability Signals

Useful operational signals include:
- election rate or term churn
- quorum loss duration
- commit latency under steady state
- append rejection due to stale term
- follower lag and catch-up time
- rejected stale-leader writes at downstream resources

A cluster can appear "up" while its coordination quality is degrading.

### Test the Awkward Paths

Useful tests include:
- leader crash before commit
- follower crash and restart with durable state recovery
- network partition that isolates the old leader from the majority
- delayed old-term messages arriving after a new leader is established
- membership change during replication
- client retry after a timeout with ambiguous outcome

Consensus bugs often hide in exactly those transitions.


# 10. Summary

**Consensus algorithms exist to protect shared decisions under distributed uncertainty.**
- They are useful when a cluster needs one leader, one committed command order, or one authoritative configuration change.
- They matter most for coordination-heavy control-plane state where conflicting decisions would be unsafe.

**The core trade-off is safety versus progress.**
- Correct protocols usually prioritize not deciding incompatible values over deciding quickly during instability.
- Progress typically depends on assumptions such as a healthy quorum and eventual enough communication stability.

**Most practical crash-fault protocols share recurring building blocks.**
- Overlapping quorums preserve prior decisions.
- Terms, views, or ballots prevent stale authority from continuing indefinitely.
- Replicated-log designs distinguish local append, commit, and apply.

**Protocol choice depends on the failure model and the workload.**
- Paxos-style, Raft-style, VR-style, and Zab-style families are all ways to structure crash-fault replicated agreement.
- Byzantine protocols solve a harder problem with higher cost.
- Consensus is usually better for small critical coordination state than for every high-volume data-path update.

**A correct consensus layer still needs disciplined integration.**
- Downstream resources often need stale-leader fencing.
- Clients still need idempotency and honest handling of ambiguous outcomes.
- Membership changes, persistence, and recovery paths need explicit design and testing.

**Implementation checklist:**

```text
Fit:
  □ Confirm that the problem really needs agreed authority or agreed order
  □ Keep consensus on the control path unless the data path truly needs it
  □ Choose the protocol family based on the actual fault model

Safety:
  □ Define quorum size and epoch semantics explicitly
  □ Persist the protocol state required for crash recovery before acknowledging it
  □ Separate accepted, committed, and applied state in the implementation
  □ Reject stale terms, stale leaders, and stale writes consistently

Liveness:
  □ Use timeout, retry, and election behavior that matches the protocol assumptions
  □ Monitor term churn, quorum loss, and follower lag
  □ Plan protocol-aware membership changes rather than ad hoc reconfiguration

Integration and testing:
  □ Add idempotency and deduplication around client commands
  □ Fence downstream resources with epochs or tokens when stale writers would be harmful
  □ Test crashes, delayed messages, partitions, recovery, and ambiguous client outcomes
```
