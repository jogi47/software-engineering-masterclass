# Raft Algorithm

[← Back to Index](README.md)

Imagine you are building a metadata cluster for shard ownership. Three nodes must agree on who currently owns shard `orders-eu-17`, and clients should only hear "success" once that ownership change is durably replicated.

Without Raft, teams often wire together local timeouts and optimistic appends and hope the cluster will converge:

```typescript
type Role = "leader" | "follower";

class NaiveReplica {
  private role: Role = "follower";
  private lastHeartbeatAtMs = 0;
  private term = 0;
  private readonly log: string[] = [];

  onHeartbeat(term: number, nowMs: number): void {
    this.term = Math.max(this.term, term);
    this.lastHeartbeatAtMs = nowMs;
    this.role = "follower";
  }

  tick(nowMs: number): void {
    if (nowMs - this.lastHeartbeatAtMs > 150) {
      this.term += 1;
      this.role = "leader";
    }
  }

  append(command: string): void {
    if (this.role !== "leader") {
      throw new Error("not leader");
    }

    this.log.push(command);
  }
}
```

This fails in ways that matter:
- two isolated nodes can both promote themselves and accept writes
- an old leader can keep serving requests after the majority has moved on
- followers can end up with incompatible suffixes in their logs
- a client can hear "committed" even though the cluster never agreed

This is where **Raft** comes in. Raft is a crash-fault consensus algorithm for replicated logs. It gives a cluster a clearer leader-centric protocol for elections, log replication, commit decisions, and recovery. The point is not merely to make progress. The point is to preserve one authoritative command order even when nodes crash, restart, or experience delayed communication.

In this chapter quick links:
  * [Why Raft matters](#1-why-raft-matters)
  * [How terms, roles, and the log fit together](#2-terms-roles-and-the-replicated-log)
  * [How leader election works](#3-leader-election)
  * [How log replication and conflict repair work](#4-log-replication-and-conflict-repair)
  * [Why Raft's commit rules preserve safety](#5-commit-rules-and-safety-properties)
  * [How client writes and reads should behave](#6-client-writes-reads-and-linearizable-behavior)
  * [How membership changes, snapshots, and recovery fit in](#7-membership-changes-snapshots-and-recovery)
  * [What practical TypeScript patterns look like](#8-practical-typescript-patterns)
  * [Which design principles and pitfalls repeat](#9-design-principles-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why Raft Matters

Raft matters when your system needs one authoritative control path across several machines.

Common examples:
- a metadata service electing one active leader
- a configuration store deciding the next version to publish
- a scheduler agreeing on shard ownership or lease placement
- a control plane recording commands in one durable order

### Raft Is Usually for Coordination-Heavy State

Raft is usually a better fit for:
- cluster membership metadata
- configuration changes
- control-plane commands
- lock or lease ownership
- replicated state-machine commands with modest write volume

Raft is usually a worse fit for:
- every high-volume user write in a large data plane
- workloads that can tolerate divergence and later reconciliation
- systems that need Byzantine fault tolerance rather than crash-fault tolerance

```text
┌──────────────────────────────┬──────────────────────────────────────────────┐
│ Need                         │ Why naive replication struggles             │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ one active leader            │ local timeout can produce split brain       │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ one command order            │ replicas can append different suffixes      │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ safe failover                │ stale leaders can continue serving writes   │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ crash recovery               │ in-memory state disappears on restart       │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

### The Main Practical Advantage Is the Leader-Centric Flow

Many teams find Raft easier to reason about than more abstract consensus presentations because the steady-state path is explicit:

```text
client -> leader -> replicated log -> committed entry -> applied state machine
```

That does not make Raft simple in an absolute sense. It still needs careful persistence, quorum handling, reconfiguration, and testing. It does mean the common case is easier to explain:
- followers do not invent their own command order
- leaders replicate entries to followers
- a majority determines whether the leader can keep authority and commit work

### Real Systems Often Use Raft Under the Hood

Systems such as **etcd** and **Consul** use Raft-style replicated logs for coordination-heavy metadata. Kubernetes relies on etcd rather than embedding Raft directly in every component. That is a useful design lesson:

```text
keep consensus on the authority path,
not necessarily on every data path
```


# 2. Terms, Roles, and the Replicated Log

Raft organizes time into **terms** and cluster behavior into **roles**.

### The Three Roles

```text
┌──────────┐ election timeout ┌───────────┐ wins majority ┌─────────┐
│ follower │ ───────────────▶ │ candidate │ ────────────▶ │ leader  │
└──────────┘                  └───────────┘               └─────────┘
     ▲                              │                           │
     └──────── sees higher term ────┴──────── sees higher term ─┘
```

- **Follower:** passive replica that responds to leader heartbeats and vote requests
- **Candidate:** node attempting to win leadership for a new term
- **Leader:** node that accepts client writes, appends them to the log, and drives replication

### Terms Are Monotonic Leadership Epochs

A term is a logical epoch number. It helps the cluster reject stale authority.

Typical rules:
- a node increments its term when starting an election
- messages carry the sender's term
- if a node sees a higher term, it steps down to follower
- a node grants at most one vote per term

That is how Raft prevents an old leader from remaining authoritative forever after a partition or restart.

### The Log Is the Replicated Source of Truth

Each log entry has:
- an **index**
- the **term** in which the leader created it
- a **command** to apply to the state machine

```text
index:    1       2       3       4
term:     4       4       5       5
command:  setA    setB    setC    setD
```

The log is not just a write buffer. It is the order from which the state machine derives durable state.

### Persistent and Volatile State Are Different

```text
┌──────────────────────────────┬──────────────────────────────────────────────┐
│ State                        │ Why it matters                              │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ currentTerm                  │ reject stale leaders and stale requests     │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ votedFor                     │ enforce one vote per term                   │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ log entries                  │ preserve replicated command history         │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ commitIndex                  │ know which entries are safe to apply        │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ lastApplied                  │ apply state-machine commands in order       │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ nextIndex / matchIndex       │ leaders track follower replication progress │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

Commonly:
- `currentTerm`, `votedFor`, and the log must survive the failures the system claims to tolerate
- `commitIndex` and follower progress can often be rebuilt, though implementations may also persist related metadata for efficiency

### Commit and Apply Are Not the Same Step

Raft gets easier to reason about when these states stay separate:

```text
appended locally  ->  replicated to majority  ->  committed  ->  applied
```

- **Appended locally:** the leader wrote an entry to its own log
- **Replicated to majority:** enough replicas stored the entry
- **Committed:** the protocol now treats the entry as part of durable history
- **Applied:** the state machine executed the command

If those states blur together, systems often acknowledge work too early.


# 3. Leader Election

Raft elections are designed to do two things at once:
- choose one leader when the old one stops making progress
- avoid electing a candidate that is missing critical log history

### Election Timeout and Candidate Transition

Followers start an election when they stop hearing from a valid leader for longer than the election timeout.

Randomized timeouts reduce repeated collisions:

```text
Follower A timeout: 160 ms
Follower B timeout: 220 ms
Follower C timeout: 310 ms

Likely result:
  A times out first, starts election first, and often wins before B or C start
```

### RequestVote Carries Log Freshness Information

A vote request usually includes:
- candidate term
- candidate ID
- candidate last log index
- candidate last log term

A follower should usually vote only if:
- the request term is current or newer
- it has not already voted for another candidate in that term
- the candidate's log is at least as up to date as the follower's log

That last rule is important. It helps prevent a node with missing committed history from becoming leader.

### A Successful Election Looks Like This

```text
term 8

Candidate B -> RequestVote(term=8, lastLogTerm=7, lastLogIndex=42)
Follower A  -> grants vote
Follower C  -> grants vote

B now has a majority and becomes leader for term 8
```

With five nodes, a candidate needs three votes. With three nodes, it needs two.

### Split Votes and Retries Are Normal

Sometimes two candidates start at nearly the same time and each wins part of the vote. Then neither reaches a majority.

```text
┌────────────┐     votes for A      ┌────────────┐
│ follower B │ ───────────────────▶ │ candidate A│
└────────────┘                      └────────────┘

┌────────────┐     votes for C      ┌────────────┐
│ follower D │ ───────────────────▶ │ candidate C│
└────────────┘                      └────────────┘

No majority -> both candidates time out -> a later term retries
```

Raft handles this with new terms and randomized retry timing rather than by pretending collisions never happen.

### Common Production Extensions

Many implementations add features beyond core Raft, for example:
- **pre-vote** to reduce disruptive elections from isolated nodes
- **leadership transfer** for graceful handoff during maintenance
- **check quorum** behavior to make leaders step down if they lose majority contact

Those features can improve stability, but the core safety reasoning still depends on the standard term, vote, and quorum rules.


# 4. Log Replication and Conflict Repair

Once a leader exists, it is responsible for moving client commands into the replicated log.

### The Steady-State Replication Flow

```text
client
  │
  │ command
  ▼
leader
  │ append locally
  │
  ├──────── AppendEntries(prevLogIndex, prevLogTerm, entries) ───────▶ follower 1
  └──────── AppendEntries(prevLogIndex, prevLogTerm, entries) ───────▶ follower 2

majority stored -> leader commits -> followers learn commitIndex -> all apply in order
```

The leader sends `AppendEntries` messages that include:
- the leader term
- the index and term of the entry immediately preceding the new entries
- zero or more new entries
- the leader's current commit index

### Followers Validate the Previous Log Position

A follower should reject an append if it does not have the leader's stated previous entry.

Example:

```text
Leader wants:
  prevLogIndex = 6
  prevLogTerm  = 9

Follower has:
  index 6 -> term 8

Result:
  reject append because histories differ at the boundary
```

This check is what lets the leader discover divergence safely.

### Conflict Repair Rewrites Only the Uncommitted Suffix

If a follower has conflicting entries after a matching prefix, the leader can overwrite that conflicting suffix.

```text
Leader log:    [1:a] [2:b] [3:c] [4:d]
Follower log:  [1:a] [2:b] [3:x] [4:y]

Matching prefix:
  [1:a] [2:b]

Repair:
  follower deletes [3:x] [4:y]
  follower appends [3:c] [4:d]
```

The important boundary is this:
- uncommitted conflicting suffixes may be rewritten
- committed history must remain stable

### Heartbeats Are AppendEntries Too

An empty `AppendEntries` is often called a heartbeat.

It serves several purposes:
- proves the leader is still active
- carries the latest leader term
- advances `leaderCommit` so followers can apply newly committed entries
- helps support quorum-backed read paths

### Leaders Track Follower Progress

Leaders usually keep:
- `nextIndex[follower]`: the next log index to send to that follower
- `matchIndex[follower]`: the highest known index replicated on that follower

If a follower rejects an append, the leader moves `nextIndex` backward and retries until it finds a matching prefix. Many practical implementations optimize this with conflict hints, but the durable idea is simple:

```text
find the last shared prefix,
then replay the leader's suffix from there
```


# 5. Commit Rules and Safety Properties

Raft's value is not just that it replicates a log. Its value is that the cluster can decide which part of that log is safe to treat as durable history.

### Leaders Commit with Majority Evidence

A leader usually advances `commitIndex` when:
- an entry is stored on a majority of the current configuration
- and the entry belongs to the leader's current term

That current-term rule matters. It keeps a new leader from incorrectly treating an older-term entry as newly committed based only on replication counts it does not fully understand.

### Why Current-Term Commit Advancement Helps

Consider this simplified case:
- old leader `L1` in term 4 replicated entry `E` to some followers but did not commit it
- a new leader `L2` in term 5 wins the next election
- `L2` first commits one of its own term-5 entries on a majority

At that point, earlier entries that precede the committed term-5 entry in the new leader's log are effectively anchored by the majority-supported log prefix. The leader does not need to guess about partial old-term replication anymore.

### Raft's Common Safety Properties

```text
┌──────────────────────────────┬──────────────────────────────────────────────┐
│ Property                     │ Main enforcement idea                        │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ election safety              │ at most one leader can win a term's quorum   │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ log matching                 │ same index+term implies same prefix          │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ leader completeness          │ leaders must contain committed entries       │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ state machine safety         │ no two nodes apply different commands at     │
│                              │ the same committed index                     │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

### Log Matching Is a Strong Invariant

If two logs contain an entry with the same index and term, Raft's append rules imply they share the same prefix up to that index.

That matters because it turns a local comparison:

```text
same index + same term
```

into a stronger conclusion:

```text
same agreed history through that point
```

### Leaders Must Fence Stale Authority

Raft keeps stale leaders from committing fresh work because followers reject older terms. But downstream systems may still need explicit protection if an old leader can continue sending side effects.

Examples:
- issuing database writes with a fencing token or epoch
- ensuring only the current leader can renew a lease in an external store
- rejecting commands from an older term at a stateful dependency

Consensus inside the cluster is necessary, but it is not always sufficient at the boundary.


# 6. Client Writes, Reads, and Linearizable Behavior

The client-facing behavior matters as much as the internal protocol.

### Write Path

The safer write path is:

```text
1. client sends command to leader
2. leader appends command to its log
3. leader replicates to followers
4. majority stores the entry
5. leader marks it committed, applies it, then replies success
```

Replying before step 5 makes failures hard to reason about. The client may believe the change is durable when it only existed on one node.

### Followers Usually Redirect Writes

Followers commonly:
- reject writes directly
- return the known leader ID if available
- ask the client to retry elsewhere

Letting followers accept writes on their own would destroy the single authoritative order that Raft is trying to protect.

### Reads Need More Care Than Many Teams Expect

A local leader read can be stale if that leader lost contact with the majority and does not yet know it has been replaced.

Safer read approaches include:
- **ReadIndex-style quorum confirmation:** the leader confirms it still holds authority with the quorum before serving the read
- **read after applying through a known committed index:** the leader ensures its state machine has applied the needed prefix
- **timing-based lease reads:** faster in some systems, but they rely on extra timing assumptions and careful clock discipline

```text
Safer:
  quorum-backed read barrier -> serve read from applied state

Riskier:
  "I was leader a moment ago, so my local memory must still be current"
```

### Client Retries Need Idempotency

Clients may time out even when the cluster eventually commits the command.

That means:
- a timeout is often an ambiguous outcome, not automatic failure
- retries should carry a request ID or deduplication key
- state-machine commands should be safe to detect and ignore when duplicated

### Many Systems Commit a No-Op After Election

Some Raft implementations append a no-op entry after a new leader is elected. This helps establish a committed entry in the new term and can simplify later reasoning about reads and leadership freshness.

It is not a substitute for understanding the actual read path, but it is a common operational pattern.


# 7. Membership Changes, Snapshots, and Recovery

Production Raft needs more than elections and append RPCs. Cluster membership and long-term log growth must also be handled safely.

### Membership Changes Should Be Protocol-Aware

Changing the node set changes quorum math. That means adding or removing nodes is part of the protocol, not merely a deployment script.

Raft commonly handles this with **joint consensus**:

```text
Old config:  {A, B, C}
New config:  {B, C, D}

Joint phase:
  decisions need majority of old config
  and majority of new config

This preserves overlap while authority moves.
```

Why this matters:
- replacing several nodes abruptly can leave no safe overlap
- removing a node too early can strand committed history
- adding a node without catch-up can distort operator expectations about quorum health

### Snapshots Bound Log Growth

A long-lived Raft log can grow without bound if the cluster never compacts committed history.

Common pattern:
- apply committed entries to the state machine
- persist a snapshot of the state machine plus the last included index and term
- discard compacted log entries before that snapshot point

```text
Before compaction:
  snapshot none
  log indexes 1..500000

After snapshot at index 420000:
  snapshot covers 1..420000
  remaining log keeps 420001..500000
```

### Lagging Followers May Need InstallSnapshot

If a follower falls so far behind that the leader no longer has the needed prefix in its log, the leader may send a snapshot instead of replaying ancient entries.

```text
leader retained log:       420001..500000
follower missing state:    starts at 310000

Append replay alone is insufficient.
InstallSnapshot transfers a newer baseline first.
```

### Recovery Requires Durable Metadata

After a crash and restart, a node typically needs to recover at least:
- `currentTerm`
- `votedFor`
- durable log entries
- snapshot metadata such as last included index and term

Recovery should be conservative:
- do not apply beyond `commitIndex`
- do not forget that higher-term information may exist elsewhere
- do not assume local data alone makes the node leader

The safe pattern is:

```text
restart -> load durable state -> rejoin as follower -> learn current term and leader
```


# 8. Practical TypeScript Patterns

These examples are intentionally small. They aim to make the invariants visible rather than provide a full production implementation.

### Example 1: Keep the State Model Explicit

```typescript
type NodeId = string;

interface LogEntry<TCommand> {
  index: number;
  term: number;
  command: TCommand;
}

interface PersistentRaftState<TCommand> {
  currentTerm: number;
  votedFor: NodeId | null;
  log: LogEntry<TCommand>[];
  snapshotLastIncludedIndex: number;
  snapshotLastIncludedTerm: number;
}

interface VolatileRaftState {
  commitIndex: number;
  lastApplied: number;
}

interface LeaderProgress {
  nextIndex: Map<NodeId, number>;
  matchIndex: Map<NodeId, number>;
}
```

This separation helps prevent accidental coupling between:
- durable protocol state
- rebuildable runtime state
- leader-only follower progress tracking

### Example 2: Grant Votes Only to Up-to-Date Candidates

```typescript
type VoteRequest = {
  term: number;
  candidateId: NodeId;
  lastLogIndex: number;
  lastLogTerm: number;
};

function compareLogFreshness(
  candidateLastTerm: number,
  candidateLastIndex: number,
  localLastTerm: number,
  localLastIndex: number,
): number {
  if (candidateLastTerm !== localLastTerm) {
    return candidateLastTerm - localLastTerm;
  }

  return candidateLastIndex - localLastIndex;
}

function shouldGrantVote<TCommand>(
  request: VoteRequest,
  state: PersistentRaftState<TCommand>,
): boolean {
  if (request.term < state.currentTerm) {
    return false;
  }

  if (
    state.votedFor !== null &&
    state.votedFor !== request.candidateId
  ) {
    return false;
  }

  const lastEntry = state.log[state.log.length - 1];
  const localLastIndex =
    lastEntry?.index ?? state.snapshotLastIncludedIndex;
  const localLastTerm =
    lastEntry?.term ?? state.snapshotLastIncludedTerm;

  return (
    compareLogFreshness(
      request.lastLogTerm,
      request.lastLogIndex,
      localLastTerm,
      localLastIndex,
    ) >= 0
  );
}
```

The log freshness check is the line of code that protects leader completeness during elections.

### Example 3: Validate Prefixes Before Appending

```typescript
type AppendEntriesRequest<TCommand> = {
  term: number;
  leaderId: NodeId;
  prevLogIndex: number;
  prevLogTerm: number;
  entries: LogEntry<TCommand>[];
  leaderCommit: number;
};

type AppendEntriesResponse = {
  term: number;
  success: boolean;
  conflictIndex?: number;
};

class FollowerLog<TCommand> {
  constructor(
    private currentTerm: number,
    private log: LogEntry<TCommand>[],
    private commitIndex = 0,
  ) {}

  private entryAt(index: number): LogEntry<TCommand> | undefined {
    return this.log.find((entry) => entry.index === index);
  }

  private lastLogIndex(): number {
    return this.log[this.log.length - 1]?.index ?? 0;
  }

  private truncateFrom(index: number): void {
    this.log = this.log.filter((entry) => entry.index < index);
  }

  handleAppendEntries(
    request: AppendEntriesRequest<TCommand>,
  ): AppendEntriesResponse {
    if (request.term < this.currentTerm) {
      return { term: this.currentTerm, success: false };
    }

    this.currentTerm = request.term;

    if (request.prevLogIndex > 0) {
      const prevEntry = this.entryAt(request.prevLogIndex);
      if (
        prevEntry === undefined ||
        prevEntry.term !== request.prevLogTerm
      ) {
        return {
          term: this.currentTerm,
          success: false,
          conflictIndex: request.prevLogIndex,
        };
      }
    }

    for (const incoming of request.entries) {
      const existing = this.entryAt(incoming.index);

      if (existing !== undefined && existing.term !== incoming.term) {
        this.truncateFrom(incoming.index);
      }

      if (this.entryAt(incoming.index) === undefined) {
        this.log.push(incoming);
      }
    }

    this.log.sort((left, right) => left.index - right.index);
    this.commitIndex = Math.min(
      request.leaderCommit,
      this.lastLogIndex(),
    );

    return { term: this.currentTerm, success: true };
  }
}
```

This is the code boundary that keeps followers from blindly merging divergent histories.

### Example 4: Advance Commit Index Conservatively

```typescript
function advanceCommitIndex<TCommand>(
  currentTerm: number,
  currentCommitIndex: number,
  log: LogEntry<TCommand>[],
  quorumSize: number,
  replicatedIndexes: number[],
): number {
  const sorted = [...replicatedIndexes].sort((a, b) => b - a);
  const candidateIndex = sorted[quorumSize - 1];

  if (
    candidateIndex === undefined ||
    candidateIndex <= currentCommitIndex
  ) {
    return currentCommitIndex;
  }

  const candidateEntry = log.find(
    (entry) => entry.index === candidateIndex,
  );

  if (
    candidateEntry === undefined ||
    candidateEntry.term !== currentTerm
  ) {
    return currentCommitIndex;
  }

  return candidateIndex;
}
```

For this helper, `replicatedIndexes` should include the leader's own last log index plus each follower's `matchIndex`.

The important rule is visible:

```text
majority replicated
and entry belongs to current term
```

### Example 5: Treat Linearizable Reads as a Barrier Problem

```typescript
type ReadBarrier = {
  requestId: string;
  commitIndexAtStart: number;
  acknowledgements: Set<NodeId>;
};

class ReadIndexTracker {
  constructor(private readonly quorumSize: number) {}

  start(
    requestId: string,
    leaderCommitIndex: number,
  ): ReadBarrier {
    return {
      requestId,
      commitIndexAtStart: leaderCommitIndex,
      acknowledgements: new Set<NodeId>(),
    };
  }

  acknowledge(barrier: ReadBarrier, followerId: NodeId): boolean {
    barrier.acknowledgements.add(followerId);

    // +1 counts the leader itself.
    return barrier.acknowledgements.size + 1 >= this.quorumSize;
  }
}
```

This is only a sketch, but it captures a useful mental model:

```text
serve read after the leader re-validates authority
and has applied through the required commit point
```


# 9. Design Principles and Common Pitfalls

Raft implementations stay safer when the invariants are visible in the code, on disk, and in operator tooling.

### Practical Design Principles

```text
Good:
├── use Raft for coordination-heavy state where conflicting answers are unsafe
├── keep term handling, vote rules, and quorum math explicit in code
├── persist required protocol state before pretending it survived a crash
├── distinguish appended, committed, and applied state clearly
├── reject stale leaders and stale terms consistently
├── use protocol-aware membership changes rather than ad hoc node swaps
├── plan for snapshots and follower catch-up before the log becomes huge
├── add client request IDs for retry deduplication
└── fence downstream side effects if stale leaders could still reach them

Bad:
├── let a timeout alone authorize leadership
├── acknowledge writes before majority-backed commit
├── assume "I have the newest wall clock" is the same as "I am leader"
├── treat follower logs as mergeable histories instead of ordered prefixes
├── remove or replace several nodes without a reconfiguration procedure
├── keep critical term or vote state only in memory
├── serve linearizable reads from a leader that has not revalidated quorum
└── test only the happy path
```

### Raft Still Depends on a Reachable Majority

Raft usually preserves safety under crash faults and delayed communication, but it cannot make progress without enough healthy nodes that can talk to one another.

Examples:
- in a 3-node cluster, losing contact with 2 nodes usually stops progress
- in a 5-node cluster, you can often lose 2 nodes and still continue
- a permanently unstable network can preserve safety while hurting liveness badly

That is why many deployments prefer odd-sized clusters such as 3 or 5 nodes for a single Raft group.

### Timing Still Matters Operationally

Raft is often described in a timing-tolerant safety model, but production behavior still depends on timeout choices.

Timeouts that are too short can cause:
- unnecessary elections
- term churn
- commit stalls
- reduced throughput during transient latency spikes

Timeouts that are too long can cause:
- slow failover
- long periods of write unavailability after leader loss

The right settings depend on the actual network and storage behavior, not on a universal magic number.

### The Storage Layer Can Undermine the Protocol

If your implementation claims crash recovery, the storage path needs to behave accordingly:
- durable writes should happen where the protocol requires them
- partial writes or torn records need handling
- snapshot and log metadata need consistent update order

Consensus logic cannot rescue unsafe persistence semantics.

### The Best Review Question Is Usually Simple

When you review a Raft implementation, ask:

```text
if this node crashes right here,
what state survives,
what authority still holds,
and what can the rest of the cluster safely infer?
```

That question exposes many bugs faster than reading the happy path alone.


# 10. Summary

**Raft is a crash-fault consensus algorithm for a replicated log with one active leader at a time.**
- It is most useful for coordination-heavy control-plane state where conflicting decisions would be dangerous.
- It is usually not the first choice for every high-volume user-data write.

**The core model is terms, roles, and one replicated command order.**
- Followers, candidates, and leaders behave differently.
- Terms fence stale authority.
- Log entries carry index and term so replicas can reason about shared history.

**Leader election and log freshness rules work together.**
- Randomized elections reduce collisions.
- Followers vote at most once per term.
- Candidates need sufficiently up-to-date logs to become leader safely.

**Replication and commit are separate steps.**
- Leaders append entries, replicate them, and commit only with majority-backed evidence.
- Followers validate prefixes before accepting new entries.
- Conflicting uncommitted suffixes may be repaired, but committed history must stay stable.

**Client behavior and operational edges matter.**
- Writes should be acknowledged after commit, not merely after local append.
- Linearizable reads need a safe read path, not leader optimism.
- Membership changes, snapshots, recovery, and persistence rules are part of the real implementation.

**Implementation checklist:**

```text
Fit:
  □ Confirm that the problem really needs one agreed leader or one agreed command order
  □ Keep Raft on the control path unless the data path truly needs consensus
  □ Choose a cluster size and quorum model explicitly

Protocol:
  □ Represent terms, votes, log indexes, and log terms explicitly in code
  □ Grant votes only to candidates with sufficiently up-to-date logs
  □ Validate prevLogIndex and prevLogTerm before appending follower entries
  □ Advance commitIndex only with majority-backed evidence and current-term rules
  □ Apply committed entries in order and keep commit/apply states separate

Reads and writes:
  □ Acknowledge writes after commit rather than after local append
  □ Route follower writes to the leader
  □ Use a quorum-backed read path or clearly document extra timing assumptions for lease reads
  □ Add request IDs or deduplication for ambiguous client retries

Durability and operations:
  □ Persist the Raft state that crash recovery depends on
  □ Plan protocol-aware membership changes instead of ad hoc node replacement
  □ Implement snapshotting and lagging-follower catch-up
  □ Monitor term churn, election rate, follower lag, commit latency, and snapshot activity
  □ Test crash-recovery, partitions, stale leaders, split votes, and reconfiguration paths
```
