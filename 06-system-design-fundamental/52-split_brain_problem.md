# Split Brain Problem

[← Back to Index](README.md)

Imagine you are building a wallet ledger with one leader per shard. Under healthy conditions, the leader accepts transfers, replicas stay close behind, and failover looks straightforward.

Without split-brain protection, teams often implement leadership as a local boolean flipped after a missed heartbeat:

```typescript
type TransferCommand = {
  transferId: string;
  fromAccountId: string;
  toAccountId: string;
  amountCents: number;
};

interface LedgerStore {
  appendTransfer(command: TransferCommand): Promise<void>;
}

class NaiveLedgerNode {
  private lastLeaderHeartbeatAtMs = Date.now();
  private isLeader = false;

  constructor(
    private readonly store: LedgerStore,
    private readonly heartbeatTimeoutMs = 5_000,
  ) {}

  recordLeaderHeartbeat(receivedAtMs: number): void {
    this.lastLeaderHeartbeatAtMs = receivedAtMs;
  }

  maybeAssumeLeadership(nowMs: number): void {
    if (nowMs - this.lastLeaderHeartbeatAtMs > this.heartbeatTimeoutMs) {
      this.isLeader = true;
    }
  }

  async applyTransfer(command: TransferCommand): Promise<void> {
    if (!this.isLeader) {
      throw new Error("This node is not the leader");
    }

    await this.store.appendTransfer(command);
  }
}
```

This fails in ways that are easy to underestimate:
- a network partition may isolate the real leader without stopping it
- a replica may promote itself after a timeout even though the old leader is still alive
- clients may continue reaching both nodes through stale routing or direct connections
- both sides may accept conflicting writes, causing duplicate transfers, divergent state, and painful manual repair

This is where the **split brain problem** comes in. Split brain is not just "failover happened." It is the failure mode where two or more parts of a distributed system believe they are authoritative for the same responsibility at the same time. That usually means corrupted assumptions, conflicting writes, and a recovery process that is much harder than a simple restart.

In this chapter, you will learn:
  * [Why split brain is so dangerous](#1-why-split-brain-is-so-dangerous)
  * [What the split brain problem actually is](#2-what-the-split-brain-problem-actually-is)
  * [How split brain happens in practice](#3-how-split-brain-happens-in-practice)
  * [Why failure detection and leases are tricky](#4-failure-detection-leases-and-stale-authority)
  * [How quorums, terms, fencing, and STONITH help](#5-quorums-terms-fencing-and-stonith)
  * [How split brain shows up in different system types](#6-split-brain-in-different-kinds-of-systems)
  * [How recovery and reconciliation should work](#7-recovery-reconciliation-and-business-impact)
  * [Which prevention and operational guardrails matter most](#8-prevention-strategies-and-operational-guardrails)
  * [What practical TypeScript patterns look like](#9-practical-typescript-patterns)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why Split Brain Is So Dangerous

Split brain is dangerous because it is an **authority failure**. The system is not merely slow or unavailable. It is making conflicting decisions about who is allowed to change state.

### Availability Loss Is Often Cheaper Than Authority Corruption

Teams sometimes optimize failover for speed first:
- promote quickly after one timeout
- keep serving writes while diagnosis is incomplete
- assume recovery later will be easy

That can be reasonable for low-value, mergeable data. It is much riskier for:
- money movement
- inventory reservation
- unique job ownership
- security-sensitive state
- shared storage or metadata coordination

For these cases, a short outage is often cheaper than accepting concurrent authorities.

### Split Brain Produces Conflicting Truths

An ordinary outage usually fails closed:

```text
Service down
  -> requests fail
  -> users see an error
  -> state does not move
```

A split brain often fails open:

```text
Two leaders active
  -> both accept work
  -> state diverges
  -> repair requires selecting a winner and compensating the loser
```

That is why split brain incidents can remain expensive long after connectivity returns.

### The Cost Depends on Whether the Data Can Merge

```text
┌──────────────────────────────┬─────────────────────────────────────────────┐
│ Data or operation type       │ Split-brain impact                          │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ unique assignment            │ double booking, duplicate ownership         │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ ledger or payment state      │ conflicting balances or duplicate charges   │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ job execution                │ repeated external side effects              │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ cache entry or read model    │ often repairable, but still confusing       │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ mergeable counters/signals   │ sometimes reconcilable if designed for that │
└──────────────────────────────┴─────────────────────────────────────────────┘
```

The safer the merge story, the more freedom you have. The weaker the merge story, the more you must preserve single-writer control.

### External Side Effects Make Everything Worse

If both sides send emails, charge cards, trigger warehouse picks, or revoke tokens, you no longer have a pure data-repair problem. You now have:
- user-visible duplication
- audit ambiguity
- partner-system inconsistency
- operational cleanup work

This is why many split-brain prevention designs focus on protecting the write boundary before they focus on convenience or throughput.


# 2. What the Split Brain Problem Actually Is

The split brain problem occurs when two or more nodes, regions, or controller instances simultaneously act as the authoritative owner of the same responsibility.

### A Conservative Definition

The durable definition is:

```text
Split brain =
  overlapping authority
  for the same logical responsibility
  with the possibility of conflicting actions
```

The overlap matters. If the old leader is fully stopped before the new one takes over, that is failover, not split brain.

### Healthy Failover Is Not Split Brain

```text
Healthy failover:

Client
  |
  v
Leader A ----> Replica B
  |
  X  Leader A is fenced or shut down
  |
  v
Replica B promoted to leader
```

In healthy failover, there is a handoff.

### Split Brain Is Concurrent Authority

```text
Split brain:

                 XXXXXX partition / stale routing XXXXXX

Client Group 1                                    Client Group 2
     |                                                 |
     v                                                 v
 Leader A  -------------------------------------   Leader B
 accepts writes                                   accepts writes
```

Both sides continue acting as if they are primary. That is the core danger.

### Split Brain Is Related to Partitions, but Not the Same Thing

A partition is a communication failure. Split brain is one unsafe response to that failure.

```text
┌──────────────────────────────┬─────────────────────────────────────────────┐
│ Concept                      │ Main issue                                  │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ network partition            │ nodes cannot coordinate reliably            │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ split brain                  │ multiple sides act as authority at once     │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ stale read                   │ a reader sees lagging state                 │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ replica lag                  │ follower is behind but not authoritative    │
└──────────────────────────────┴─────────────────────────────────────────────┘
```

You can have a partition without split brain if only one side keeps write authority and the other side goes read-only or unavailable.

### The "Brain" Usually Means Control, Not Just Data

In practice, split brain often appears in:
- leadership election
- lock ownership
- primary database promotion
- scheduler ownership
- shared storage control
- control-plane coordination

The central question is always the same:

```text
Who is allowed to make this class of decision right now?
```

If two sides answer "I am," you have the problem.


# 3. How Split Brain Happens in Practice

Split brain rarely appears because one team explicitly wants two leaders. It usually appears because failover logic and reality drift apart under stress.

### The Classic Path: Missed Heartbeat, Fast Promotion

The most common pattern looks like this:

```text
1. Leader A is healthy and serving writes
2. A partition or long pause interrupts heartbeats
3. Replica B suspects A is gone
4. B promotes itself quickly
5. A never learned it lost authority and keeps serving writes
```

That is exactly why heartbeat-only failover is dangerous for one-writer systems.

### Asymmetric Reachability Makes Diagnosis Harder

Not every failure is a clean two-way split.

```text
Node A ─────────▶ Node B
Node A ◀XXXXXXX─ Node B
```

Possible results:
- B stops hearing A and promotes
- A still thinks B is healthy enough to keep operating
- clients or storage paths may still reach A even though cluster control traffic cannot

One-way reachability creates contradictory observations, which is fertile ground for split brain.

### Leases Without Strong Enough Boundaries Can Still Overlap

Leases help, but they are not magic. Overlap can happen if:
- the lease store is not itself authoritative enough
- clock assumptions are too optimistic
- lease renewal deadlines are too tight for the environment
- stale writers are not rejected after expiration

If a node "believes" it still owns the lease and downstream systems never verify that claim, a lease by itself is not enough.

### Manual Failover Can Create the Same Problem

Split brain is not only an automatic failover bug. Operators can also create it by:
- forcing promotion without isolating the old primary
- assuming lost visibility means peer death
- reintroducing a node before its old role is cleared
- changing routing before fencing is complete

This is one reason runbooks matter as much as code.

### Two-Node Designs Are Especially Fragile

A two-node cluster often cannot distinguish:
- "the other node died"
- "the network path broke"

If both nodes are willing to self-promote, a 1/1 split can become split brain immediately.

That is why systems with two critical nodes often add:
- a third voter or witness
- an external coordinator
- a stronger fencing mechanism

Even then, the witness or coordinator must be treated as part of the correctness design, not as a cosmetic extra.

### Shared Storage and Stale Routing Create Hidden Overlap

Sometimes the cluster is "fixed" on paper, but the old writer still has a path to the underlying resource:
- old database primary still reaches disk or WAL target
- old scheduler still receives messages through stale DNS or a direct client connection
- old control-plane leader still updates shared metadata

This is often the moment where teams discover that leadership in memory and authority at the resource boundary were never the same thing.


# 4. Failure Detection, Leases, and Stale Authority

Split brain prevention starts with a hard truth: failure detectors observe symptoms, not ground truth.

### Timeouts Indicate Uncertainty, Not Certain Death

If one node stops hearing another, several realities are possible:
- the peer crashed
- the peer is alive but partitioned
- the peer is overloaded and missing deadlines
- the peer is paused by GC, scheduler delay, or resource pressure

All of those can look similar from the outside:

```text
missed heartbeat
timeout
lost lease renewal
stale replication acknowledgment
```

Treating every timeout as proof of death makes split brain more likely.

### Fast Failure Detection Trades Against False Positives

If you choose short timeouts:
- failover is faster for real crashes
- false failovers become more likely during jitter or transient packet loss

If you choose long timeouts:
- false promotion becomes less likely
- real recovery becomes slower

There is no universal timeout that solves this. You are balancing:
- network variability
- cost of bad promotion
- cost of delayed recovery
- business tolerance for write unavailability

### Leases Improve Safety Only If They Are Enforced

A lease usually means:

```text
Node may act as leader
only until lease expiration
unless it renews successfully
```

That is useful, but only if:
- the lease comes from an authoritative store or quorum-backed coordinator
- expiration is checked before sensitive work
- downstream systems reject stale lease holders

Without those checks, a lease is just a local belief.

### Old Leaders Often Keep Running After They Lose Authority

This is the stale-authority problem:
- the node never saw the demotion event
- the node is still healthy enough to process requests
- some clients still route to it
- some dependencies still accept its writes

That means safe failover needs more than "new leader was elected." It also needs a way to ensure the old leader cannot keep mutating state.

### Heartbeat, Lease, and Fence Are Different Layers

```text
┌──────────────────────────────┬─────────────────────────────────────────────┐
│ Mechanism                    │ What it mainly does                         │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ heartbeat                    │ suggests liveness or lack of liveness       │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ lease                        │ bounds leader authority in time             │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ fencing token / epoch check  │ rejects stale writers at the resource edge  │
└──────────────────────────────┴─────────────────────────────────────────────┘
```

Healthy designs usually layer these rather than treating any one of them as complete.

### Monotonic Leadership History Matters

A good system can answer:
- who was leader in the current term or epoch
- whether a write came from the current authority
- whether a returning node is older than the current cluster view

If the answer is just `isLeader: true`, the safety story is usually too weak.


# 5. Quorums, Terms, Fencing, and STONITH

The most common split-brain defenses work by limiting who can claim authority and by rejecting stale claims mechanically.

### Majority Quorums Prevent Two Simultaneous Majorities

With five voters:

```text
┌──────────── Segment A ────────────┐    ┌──────── Segment B ────────┐
│ Node 1   Node 2   Node 3          │    │ Node 4   Node 5           │
│ 3 votes available                 │    │ 2 votes available         │
└───────────────────────────────────┘    └───────────────────────────┘

Majority quorum = 3
```

Only Segment A can form a majority. Segment B may still be alive, but it should not keep acting as the primary for quorum-protected writes.

This is the core safety benefit of majority-based leadership election.

### Terms or Epochs Make Leadership Order Explicit

Leadership changes should advance a durable counter:

```text
term 11 -> old leader
term 12 -> newly elected leader
```

Useful properties:
- terms are monotonic
- a higher term supersedes a lower term
- writes can carry the term that authorized them
- stale terms can be rejected automatically

Many consensus-backed systems use some form of term or epoch for exactly this reason.

### Fencing Tokens Turn Stale-Writer Checks Into a Rule

A fencing token is a monotonic value attached to authority. Downstream systems reject operations with an older token than the latest accepted token.

```text
highest accepted token = 42

write from token 41 -> reject
write from token 42 -> may be allowed
write from token 43 -> supersedes 42
```

This matters because the old leader may still be alive, still retrying, and still unaware that authority moved on.

### STONITH Is a Hard Isolation Tool

`STONITH` commonly means **Shoot The Other Node In The Head**. The name is blunt because the goal is blunt: if a node might still behave as primary, force it out of the picture before allowing another node to take over.

In practice, that may mean:
- powering off or rebooting a node through remote management
- cutting a node off from shared storage
- disabling network paths that let it keep serving
- otherwise proving it can no longer act on the protected resource

STONITH is especially relevant when:
- shared storage is involved
- stale writers could corrupt data
- software-level demotion alone is not trustworthy enough

### Witnesses and Coordinators Help, but They Are Not a Complete Story

A witness or arbitrator can help break ties in small clusters, especially 2-node setups. That can reduce unsafe promotions, but it does not automatically solve:
- stale writes already in flight
- old leaders still connected to storage
- external side effects triggered before the witness decision propagates

Witness plus fencing is usually stronger than witness alone.

### Comparison of Common Split-Brain Defenses

```text
┌──────────────────────────────┬─────────────────────────────────────────────┐
│ Defense                      │ Main value                                  │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ majority quorum              │ prevents two simultaneous majorities        │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ term / epoch                 │ gives durable leadership ordering           │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ fencing token                │ rejects stale authority at write boundary   │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ lease                        │ bounds authority in time                    │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ STONITH / hard fencing       │ removes old actor from protected resource   │
└──────────────────────────────┴─────────────────────────────────────────────┘
```

No single mechanism is universal. Critical systems often combine several.

### Not Every System Needs Cluster-Wide Consensus Everywhere

You do not need quorum-backed leadership for every cache refresh or analytics signal. You do usually need it for:
- unique seat allocation
- primary database promotion
- exclusive job ownership
- security-critical state changes
- shared storage metadata control

The better question is not "Should everything use consensus?" It is:

```text
Which responsibilities would become expensive or unsafe
if two writers acted at the same time?
```


# 6. Split Brain in Different Kinds of Systems

The same failure pattern shows up in several architectures, but the consequences differ by workload.

### Primary-Replica Databases

Split brain in a database cluster often means:
- two primaries accept writes
- replicas diverge from different histories
- conflict resolution becomes manual or policy-driven
- clients observe different truths depending on which primary they reached

This is why database failover managers usually care so much about quorum, replication state, and fencing.

### Distributed Schedulers and Job Workers

A leader-elected scheduler or controller can split brain when two instances both believe they own the same queue partition, cron schedule, or reconciliation loop.

Typical outcomes:
- duplicate job execution
- repeated emails or webhooks
- multiple infrastructure changes applied concurrently
- jobs marked complete in one control path and still pending in another

Even when leader election is present, the work itself should usually remain idempotent.

### Shared-Disk or Shared-Storage Clusters

These systems can be especially sensitive because both sides may still reach the same storage device or metadata service.

Possible effects:
- file-system corruption
- inconsistent block ownership
- journal divergence
- dangerous write interleaving

This is the class of system where hard fencing and storage-level reservation checks are often emphasized.

### Caches, Sessions, and Identity State

Split brain can also hurt seemingly softer systems:
- a token-revocation authority may disagree with a stale peer
- one region may resurrect an expired session
- two cache coordinators may both believe they own invalidation sequencing

The data may be more recoverable than a ledger, but security and user experience can still suffer.

### Control Planes and Service Coordination

Systems that assign service membership, routing state, or configuration revision numbers can cause broad blast radius when split brain occurs:
- conflicting leader health announcements
- route flapping
- inconsistent service discovery
- nodes joining the wrong source of truth

Many modern control planes reduce this risk by storing authority in a consensus-backed metadata layer, but the application boundary still needs to honor that authority correctly.

### Familiar Real-World Patterns

You will see split-brain defenses repeatedly across real systems:
- leader-elected Kubernetes-style controllers often use lease objects to reduce concurrent control loops, while still relying on idempotent reconciliation
- high-availability database managers for primary-replica systems usually combine promotion rules with replication-state checks and some form of fencing
- Pacemaker-style shared-storage clusters often emphasize STONITH because software-only demotion may not be enough when old nodes can still touch disks
- Raft-like coordinators use terms and majority voting so a returning old leader can be recognized as stale

The details vary, but the design pattern is durable: leadership must be ordered, and stale authority must be rejectable.

### Real-World System Classes and Typical Protections

```text
┌──────────────────────────────┬─────────────────────────────────────────────┬──────────────────────────────────────┐
│ System type                  │ Typical split-brain consequence             │ Common protection                    │
├──────────────────────────────┼─────────────────────────────────────────────┼──────────────────────────────────────┤
│ replicated database          │ divergent writes, conflicting primaries     │ quorum failover + fencing            │
├──────────────────────────────┼─────────────────────────────────────────────┼──────────────────────────────────────┤
│ leader-elected scheduler     │ duplicate jobs and webhooks                 │ lease + token + idempotent jobs      │
├──────────────────────────────┼─────────────────────────────────────────────┼──────────────────────────────────────┤
│ shared-storage cluster       │ corruption or unsafe write overlap          │ hard fencing / storage fencing       │
├──────────────────────────────┼─────────────────────────────────────────────┼──────────────────────────────────────┤
│ service-control plane        │ inconsistent membership or config authority │ consensus metadata + revision checks │
├──────────────────────────────┼─────────────────────────────────────────────┼──────────────────────────────────────┤
│ session or cache authority   │ stale invalidation or auth inconsistency    │ scoped ownership + bounded TTL       │
└──────────────────────────────┴─────────────────────────────────────────────┴──────────────────────────────────────┘
```

### Active-Active Is Not the Same as Split-Brain Tolerance

If you truly want multiple writers, design for that explicitly:
- partition ownership by key range or region
- use mergeable data types where appropriate
- define conflict resolution rules that are semantically valid

That is different from taking a single-writer system and hoping dual primaries will reconcile later.


# 7. Recovery, Reconciliation, and Business Impact

Recovering from split brain is not just a matter of reconnecting nodes. The harder part is restoring one source of authority and deciding what to do with conflicting work.

### Step 1: Stop the Extra Writers

Before comparing histories, first ensure only one side can keep mutating state:
- demote stale leaders
- revoke their leases
- reject stale tokens
- apply STONITH or storage fencing if necessary
- drain or reroute clients away from unsafe endpoints

If both sides can still write during recovery, the incident is not contained.

### Step 2: Choose the Authoritative History

Different systems choose the surviving history differently:
- highest committed quorum-backed term
- the log accepted by the current authority
- the side with valid fencing and durable commit records
- a business-specific source of truth with manual operator approval

The wrong instinct is to assume the latest wall-clock timestamp is enough.

### Step 3: Replay, Roll Forward, or Compensate

Once one side is authoritative, the losing side's actions may need to be:
- discarded if they were never externally visible
- replayed through the new leader if still valid
- compensated if they created external side effects
- reviewed manually if the outcome is ambiguous

Examples:
- duplicate reservation -> release one seat and notify the affected user
- duplicate payment authorization -> void or refund one side
- duplicate email -> log and tolerate if harmless
- conflicting security change -> review audit trail and require operator confirmation

### Last-Writer-Wins Is Often a Weak Recovery Story

Last-writer-wins can be acceptable for low-value metadata, but it is dangerous for:
- balances
- inventory
- security policy
- workflow stages with external effects

The issue is not just clock skew. The issue is that time ordering alone usually does not capture the business rule for which action should survive.

### Recovery Needs Auditability

During and after split brain, teams usually need to answer:
- which node thought it was leader
- in which term or epoch each write was accepted
- which operations reached external systems
- which items were auto-repaired and which require review

That argues for durable logs of:
- leader term changes
- lease acquisition and loss
- fencing rejections
- repair actions and compensations

### A Safe Recovery Sequence

```text
1. freeze or fence stale writers
2. confirm current authoritative term or source of truth
3. catch replicas or peers up from that authority
4. reconcile or compensate conflicting side effects
5. reopen write traffic gradually
6. review why the stale side was able to keep acting
```

### Business Communication Matters Too

Some split-brain incidents are not fully invisible. Users may see:
- duplicate confirmations
- temporary incorrect balances
- retries that later become reversals
- brief read-only periods while leadership is re-established

Good systems and good operations make those states explicit rather than pretending nothing happened.


# 8. Prevention Strategies and Operational Guardrails

Split-brain prevention is usually a mix of architecture, application behavior, and operational discipline.

### Preserve Single-Writer Control for Non-Mergeable Work

For operations that are expensive to merge later:
- require quorum or an authoritative coordinator for promotion
- refuse writes when that authority is uncertain
- downgrade minority segments to read-only
- make user-facing degraded states explicit

That is often the right trade if duplicate success would be worse than temporary refusal.

### Fence at the Resource Boundary, Not Just in Memory

Leadership decisions must be visible where the actual mutation happens:
- database write path
- job-claim path
- shared storage controller
- metadata update API

If only the application process knows who the leader is, stale processes may still act through direct or cached paths.

### Separate Admission From Execution

A safer architecture often distinguishes:

```text
Can this node accept a new command?
```

from:

```text
Can this worker finish an already accepted task?
```

This helps you:
- stop accepting new writes immediately when authority is uncertain
- finish safe in-flight work deliberately
- mark ambiguous work for review instead of silently retrying it

### Keep Routing, Health, and Storage Aligned

Promotion is not complete until all of these agree:
- the coordinator or quorum says who the leader is
- traffic routing prefers the new leader
- the old leader is fenced from critical resources
- downstream storage rejects stale terms or tokens

If one of those lags far behind the others, overlap windows appear.

### Instrument Leading Indicators

Useful signals include:
- repeated term or epoch changes
- lease-renewal failure spikes
- fencing-token rejections
- dual-primary suspicion alerts from health checks
- asymmetric regional success rates
- replication lag or quorum-loss events

The point is not just to know the cluster is unhealthy. It is to know stale authority might still be active.

### Test the Incident You Fear

Good verification exercises include:
- forcing a leader network isolation without process death
- confirming minority nodes go read-only
- verifying stale writes are rejected after promotion
- checking that old nodes cannot still reach protected storage
- rehearsing operator-driven fencing and recovery

Plans that rely on "the old node should stop itself" are often weaker than they sound.

### Good and Bad Split-Brain Posture

```text
Bad:
├── promote after one timeout with no quorum evidence
├── rely on an in-memory isLeader flag
├── allow old writers to keep direct storage access
├── use last-writer-wins for money or inventory
└── treat duplicate side effects as somebody else's problem

Good:
├── require durable promotion evidence
├── attach terms or fencing tokens to writes
├── reject stale writers at the resource boundary
├── keep critical side effects idempotent where possible
└── practice fencing, failover, and repair procedures
```

### If You Need Multi-Writer Behavior, Design for It Explicitly

Sometimes the right answer is not stronger single-leader failover. Sometimes it is a different data model:
- shard ownership instead of global ownership
- CRDT-like or mergeable state where appropriate
- append-only event logs with later materialization
- business rules that tolerate bounded divergence

That is an architecture choice, not a split-brain workaround.


# 9. Practical TypeScript Patterns

Application code cannot eliminate split brain by itself, but it can make authority explicit, stale writes rejectable, and recovery much cleaner.

### Example 1: Carry a Monotonic Term Into Every Sensitive Write

```typescript
type TransferCommand = {
  transferId: string;
  fromAccountId: string;
  toAccountId: string;
  amountCents: number;
};

type LeaderLease = {
  shardId: string;
  holderId: string;
  term: number;
  expiresAtMs: number;
};

interface LeaseCoordinator {
  acquireOrRenew(input: {
    shardId: string;
    holderId: string;
    nowMs: number;
    leaseDurationMs: number;
  }): Promise<LeaderLease | null>;
}

interface FencedLedgerStore {
  applyTransfer(input: TransferCommand & { term: number }): Promise<void>;
}

class InMemoryFencedLedgerStore implements FencedLedgerStore {
  private highestAcceptedTerm = 0;
  private readonly appliedTransferIds = new Set<string>();
  private readonly balances = new Map<string, number>();

  constructor(initialBalances: Record<string, number>) {
    for (const [accountId, balance] of Object.entries(initialBalances)) {
      this.balances.set(accountId, balance);
    }
  }

  async applyTransfer(input: TransferCommand & { term: number }): Promise<void> {
    if (input.term < this.highestAcceptedTerm) {
      throw new Error("Rejected stale leader term");
    }

    if (this.appliedTransferIds.has(input.transferId)) {
      return;
    }

    this.highestAcceptedTerm = input.term;

    const fromBalance = this.balances.get(input.fromAccountId) ?? 0;
    const toBalance = this.balances.get(input.toAccountId) ?? 0;

    if (fromBalance < input.amountCents) {
      throw new Error("Insufficient funds");
    }

    this.balances.set(input.fromAccountId, fromBalance - input.amountCents);
    this.balances.set(input.toAccountId, toBalance + input.amountCents);
    this.appliedTransferIds.add(input.transferId);
  }
}

class FencedLedgerLeader {
  private lease: LeaderLease | null = null;

  constructor(
    private readonly nodeId: string,
    private readonly shardId: string,
    private readonly coordinator: LeaseCoordinator,
    private readonly store: FencedLedgerStore,
  ) {}

  async renewLeadership(nowMs: number): Promise<boolean> {
    const lease = await this.coordinator.acquireOrRenew({
      shardId: this.shardId,
      holderId: this.nodeId,
      nowMs,
      leaseDurationMs: 4_000,
    });

    this.lease = lease;
    return lease !== null;
  }

  async applyTransfer(command: TransferCommand, nowMs: number): Promise<void> {
    const lease = this.lease;

    if (lease === null || lease.expiresAtMs <= nowMs) {
      throw new Error("No valid leadership lease");
    }

    await this.store.applyTransfer({
      ...command,
      term: lease.term,
    });
  }
}
```

This is stronger than `isLeader: true` because:
- leadership expires unless renewed
- every write carries the term that authorized it
- stale leaders can be rejected by the storage boundary
- transfer retries can be made idempotent alongside split-brain protection

### Example 2: Make Promotion Rules Explicit and Fail Closed When Evidence Is Weak

```typescript
type ClusterEvidence = {
  reachableVoters: number;
  totalVoters: number;
  highestObservedTerm: number;
  canPersistNewTerm: boolean;
  storageFenceHealthy: boolean;
};

type PromotionDecision =
  | { status: "PROMOTE"; nextTerm: number }
  | { status: "READ_ONLY"; reason: string };

class SafePromotionPolicy {
  decide(evidence: ClusterEvidence): PromotionDecision {
    const majority = Math.floor(evidence.totalVoters / 2) + 1;

    if (evidence.reachableVoters < majority) {
      return {
        status: "READ_ONLY",
        reason: "No majority quorum is available",
      };
    }

    if (!evidence.canPersistNewTerm) {
      return {
        status: "READ_ONLY",
        reason: "Cannot durably record a new leadership term",
      };
    }

    if (!evidence.storageFenceHealthy) {
      return {
        status: "READ_ONLY",
        reason: "Cannot fence stale writers at the resource boundary",
      };
    }

    return {
      status: "PROMOTE",
      nextTerm: evidence.highestObservedTerm + 1,
    };
  }
}
```

This keeps the dangerous decision honest:
- weak evidence does not become a speculative promotion
- promotion requires both leadership evidence and write-boundary protection
- the fallback mode is explicit read-only behavior rather than accidental dual primary

### Example 3: Protect Exclusive Job Execution With Fencing Tokens

```typescript
interface JobFenceStore {
  claim(input: {
    jobId: string;
    fencingToken: number;
  }): Promise<boolean>;
}

class InMemoryJobFenceStore implements JobFenceStore {
  private readonly highestTokenByJob = new Map<string, number>();

  async claim(input: { jobId: string; fencingToken: number }): Promise<boolean> {
    const current = this.highestTokenByJob.get(input.jobId) ?? 0;

    if (input.fencingToken <= current) {
      return false;
    }

    this.highestTokenByJob.set(input.jobId, input.fencingToken);
    return true;
  }
}

interface InvoiceExporter {
  exportInvoice(input: {
    invoiceId: string;
    idempotencyKey: string;
  }): Promise<void>;
}

class FencedInvoiceExportService {
  constructor(
    private readonly fenceStore: JobFenceStore,
    private readonly exporter: InvoiceExporter,
  ) {}

  async exportInvoice(invoiceId: string, fencingToken: number): Promise<void> {
    const claimed = await this.fenceStore.claim({
      jobId: invoiceId,
      fencingToken,
    });

    if (!claimed) {
      throw new Error("Stale or duplicate executor rejected");
    }

    await this.exporter.exportInvoice({
      invoiceId,
      idempotencyKey: `${invoiceId}:${fencingToken}`,
    });
  }
}
```

This pattern helps when split brain would otherwise create duplicate job runners:
- stale executors are rejected by token order
- side effects still carry idempotency keys
- the authority boundary is checked before expensive work begins

### TypeScript-Level Guardrails That Age Well

Useful habits include:
- carry `term`, `epoch`, or `fencingToken` in sensitive command types
- make `READ_ONLY`, `DEGRADED`, or `UNKNOWN` states explicit in return types
- reject writes when leadership evidence is incomplete instead of guessing
- log leadership term changes and stale-write rejections with operation IDs
- keep external side effects idempotent even if leadership control is strong

These are small design choices, but they make split-brain prevention and recovery much more concrete.


# 10. Summary

**Split brain is an overlapping-authority failure, not just a networking problem.**
- A partition or timeout becomes dangerous only when multiple sides keep acting as the primary for the same responsibility.
- For one-writer workloads, temporary write refusal is often safer than speculative promotion.

**Failure detection is inherently ambiguous.**
- Missed heartbeats and timeouts tell you communication is broken, not whether the peer is definitely dead.
- Lease-based systems still need authoritative lease storage, expiration discipline, and stale-writer rejection.

**Safe failover usually combines several controls.**
- Majority quorum helps prevent simultaneous promotions.
- Terms or epochs create durable leadership ordering.
- Fencing tokens and, in some systems, STONITH stop stale leaders from continuing to mutate state.

**Recovery is a business workflow as much as a cluster workflow.**
- Reconnecting nodes is not enough.
- You still need to stop extra writers, pick the authoritative history, and compensate or review conflicting side effects.

**Implementation checklist:**

```text
Leadership and failover:
  □ Identify which operations cannot tolerate two concurrent writers
  □ Require quorum or equivalent authoritative evidence before promotion
  □ Persist a monotonic term or epoch for every leadership change
  □ Keep minority or uncertain segments read-only instead of guessing

Write boundary protection:
  □ Attach fencing tokens or terms to sensitive writes
  □ Reject stale authority at the database, storage, or job-claim boundary
  □ Confirm the old primary cannot still reach protected resources
  □ Keep external side effects idempotent where possible

Recovery and operations:
  □ Define how the authoritative history is selected after split brain
  □ Document how conflicting writes are replayed, compensated, or manually reviewed
  □ Monitor lease failures, quorum loss, term churn, and stale-write rejections
  □ Rehearse stale-leader, forced-failover, and fencing scenarios before production
```
