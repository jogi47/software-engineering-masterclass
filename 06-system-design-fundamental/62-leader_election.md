# Leader Election

[← Back to Index](README.md)

Imagine you are building a payment-job scheduler with three coordinator nodes. Only one node should assign work for shard `payments-eu`, renew worker leases, and trigger retries. If two coordinators both think they are in charge, the same refund can be retried twice, the same ledger fix can run twice, or one side can overwrite the other side's ownership records.

Without disciplined leader election, teams often promote whichever node has not heard from the current leader recently:

```typescript
type JobId = string;

interface JobStore {
  claim(jobId: JobId, ownerId: string): Promise<void>;
}

class NaiveCoordinator {
  private isLeader = false;
  private lastLeaderHeartbeatAtMs = Date.now();

  constructor(
    private readonly nodeId: string,
    private readonly store: JobStore,
    private readonly timeoutMs = 5_000,
  ) {}

  recordLeaderHeartbeat(receivedAtMs: number): void {
    this.lastLeaderHeartbeatAtMs = receivedAtMs;
    this.isLeader = false;
  }

  tick(nowMs: number): void {
    if (nowMs - this.lastLeaderHeartbeatAtMs > this.timeoutMs) {
      this.isLeader = true;
    }
  }

  async assign(jobId: JobId): Promise<void> {
    if (!this.isLeader) {
      throw new Error("not leader");
    }

    await this.store.claim(jobId, this.nodeId);
  }
}
```

This fails in ways that matter:
- a long garbage-collection pause or network delay can look like leader failure
- the old leader may still be alive and still accept writes
- two coordinators can both claim the same logical responsibility
- downstream systems may have no way to reject a stale leader

This is where **leader election** comes in. Leader election is the discipline of choosing one active coordinator for some scope and epoch, then making sure stale coordinators lose authority safely. The hard part is not just choosing a winner. The hard part is preserving safety when clocks drift, messages arrive late, nodes pause, and network partitions hide the true state of the cluster.

In this chapter quick links:
  * [Why leader election matters](#1-why-leader-election-matters)
  * [What leader election actually is](#2-what-leader-election-actually-is)
  * [Which properties matter most](#3-safety-liveness-and-election-properties)
  * [Why failure detection is the hard part](#4-failure-detection-timeouts-and-timing-assumptions)
  * [Which election approaches are common](#5-common-leader-election-approaches)
  * [Why leases and fencing matter after the election](#6-leases-fencing-and-stale-leaders)
  * [Where leader election fits in real systems](#7-where-leader-election-fits-in-real-systems)
  * [What practical TypeScript patterns look like](#8-practical-typescript-patterns)
  * [Which design principles and pitfalls repeat](#9-design-principles-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why Leader Election Matters

Leader election matters when your system needs one authoritative control path.

Common examples:
- one scheduler deciding which worker gets which job
- one primary accepting writes for a replicated data set
- one controller instance reconciling shared state
- one metadata node assigning shard ownership
- one partition leader sequencing commands or records

### One Leader Simplifies Coordination

Many distributed problems become easier if one node is responsible for:
- ordering writes
- allocating ownership
- coordinating failover
- publishing the next configuration
- deciding when work is safe to start

That does not mean one leader is always the best scalability strategy. It means one leader is often the simplest way to preserve a clear authority boundary for coordination-heavy state.

### The Problem Is Authority, Not Just Availability

If a service becomes unavailable, clients usually see timeouts or errors.

If two leaders act at once, clients may see conflicting success responses:

```text
Unavailable service:
  request -> timeout / retry
  state may stay unchanged

Conflicting leaders:
  request A -> accepted by leader 1
  request B -> accepted by leader 2
  state moves in incompatible directions
```

For coordination state, temporary unavailability is often cheaper than overlapping authority.

### Not Every System Needs Elected Leadership

Leader election adds cost:
- heartbeats or lease renewals
- failover tuning
- quorum or lock-service dependencies
- stale-leader handling
- operational testing for partitions and pauses

If the workload can tolerate concurrent writers and reconcile later, you may prefer:
- optimistic concurrency
- idempotent consumers
- CRDT-style mergeable state
- partitioned ownership without one global leader

Leader election earns its complexity when conflicting decisions would be materially unsafe.


# 2. What Leader Election Actually Is

Leader election is the process of choosing one active coordinator for some defined scope and time period.

### Scope Comes First

The first question is not "Which algorithm should we use?" It is:

```text
What exactly needs one leader?
```

Common scopes:
- one leader for the whole cluster
- one leader per shard
- one leader per partition
- one leader per lock or lease namespace
- one leader per control-plane responsibility

Those are very different scaling and failure domains.

### Leader Election Chooses an Authority for an Epoch

A durable mental model is:

```text
scope + epoch + node identity = leadership decision
```

Examples:
- cluster `payments-control`, term `17`, leader `node-b`
- shard `orders-us-4`, epoch `212`, leader `replica-3`
- lease `inventory-reconciler`, revision `904`, holder `worker-2`

The epoch matters because leadership is not just a boolean. It changes over time, and stale leaders must be distinguishable from current leaders.

### Healthy Failover Is a Handoff, Not Overlap

```text
Healthy failover:

term 8 -> leader A
leader A loses authority
term 9 -> leader B

Only one term is active for new writes.
```

```text
Unsafe overlap:

Leader A still accepts writes with stale authority
Leader B accepts writes with newer authority

Now the system has two active "truths".
```

Leader election is therefore not only about selecting a winner. It is also about preventing the loser from remaining effective.

### Election Is Usually a Control-Plane Mechanism

Leader election usually belongs to control-plane decisions:
- ownership
- routing metadata
- job scheduling
- replicated-log leadership
- configuration rollout

It is usually a poor fit for every high-volume user write in a large data plane unless the workload is already deliberately leader-based.


# 3. Safety, Liveness, and Election Properties

Leader election discussions get clearer once you separate **safety** from **liveness**.

### Safety Means "No Conflicting Leader Should Be Effective"

Safety-oriented questions include:
- can two nodes both believe they are valid leader for the same scope and epoch
- can a stale leader keep writing after a newer leader took over
- can the system hand authority to a node missing critical state
- can downstream resources reject stale authority explicitly

If safety fails, failover can corrupt ownership, ordering, or external side effects.

### Liveness Means "The System Eventually Elects Someone Useful"

Liveness asks:
- can the system elect a new leader after a crash or timeout
- can elections resolve instead of repeating forever
- can the cluster continue making progress when enough nodes and links are healthy

If liveness fails, the system may pause or become unavailable. That is painful, but it is often easier to recover from than corrupt authority.

### Useful Election Properties

```text
┌──────────────────────────────┬──────────────────────────────────────────────┐
│ Property                     │ Why it matters                              │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ one effective leader         │ avoids conflicting writes and assignments   │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ monotonic epochs / terms     │ lets the system reject stale authority      │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ eligibility checks           │ avoids electing an out-of-date node         │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ explicit step-down rules     │ old leaders stop acting when superseded     │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ eventual failover            │ the system can recover when the leader dies │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

### "At Most One Leader" Usually Needs More Than a Timeout

A local timeout does not prove the old leader is dead. It only proves:

```text
this node did not hear from that leader recently
from this node's point of view
```

That is not enough for safe authority transfer by itself.

### Practical Systems Usually Protect Safety First

For leader election, a conservative principle is:

```text
temporary lack of leadership
is often safer than overlapping leadership
```

That is why durable systems often pair elections with:
- quorums
- durable terms or revisions
- leases
- fencing tokens
- explicit stale-write rejection


# 4. Failure Detection, Timeouts, and Timing Assumptions

The hardest part of leader election is not picking a winner. It is deciding when the current leader should no longer be trusted.

### Missed Heartbeats Create Suspicion, Not Certainty

A missed heartbeat can mean:
- the leader crashed
- the leader is overloaded or paused
- the network delayed or dropped messages
- the observer is overloaded
- a routing change or packet loss affected only some paths

That ambiguity never fully goes away in an asynchronous distributed system.

### Timeouts Encode Risk Tolerance

Short timeouts:
- detect failure faster
- increase false failover risk
- make GC pauses, CPU spikes, and tail latency more dangerous

Long timeouts:
- reduce false failovers
- increase recovery time
- may leave the system idle longer after a real crash

There is no universal perfect number. Timeout tuning depends on:
- runtime pause behavior
- network characteristics
- storage latency
- business tolerance for unavailability
- cost of a mistaken failover

### Randomization Helps Avoid Repeated Ties

If every replica starts an election at the same exact timeout, repeated split votes are more likely.

```text
No jitter:
  A times out at 200 ms
  B times out at 200 ms
  C times out at 200 ms
  -> repeated collisions are likely

With jitter:
  A times out at 180 ms
  B times out at 240 ms
  C times out at 310 ms
  -> one candidate often gets a head start
```

### Wall Clocks Are Usually a Bad Correctness Primitive

Avoid making election correctness depend on comparing machine wall clocks across nodes.

Safer patterns:
- use monotonic local timers for elapsed-duration checks
- use logical terms, ballots, or revisions for authority order
- use leases with a trusted coordination point if you need time-based ownership

Wall-clock drift is one more source of stale-authority mistakes.

### Failure Detection and Election Are Related but Different

It helps to separate these concerns:

```text
failure detector:
  "I suspect leader A is unavailable"

election protocol:
  "Under these rules, leader B may now hold authority"
```

A system can have a heartbeat-based suspicion mechanism without a safe authority-transfer mechanism. That gap is where many split-brain bugs begin.


# 5. Common Leader Election Approaches

There is no single election approach that fits every system. The safer choice depends on the authority boundary, fault model, and operational budget.

### 1. Static Primary or Manual Failover

This is the simplest model:
- one node is configured as primary
- operators or automation promote a replacement manually

This can work when:
- failovers are rare
- scale is small
- downtime is acceptable
- operators can tolerate slower recovery

It is weaker when:
- fast unattended failover is required
- stale primaries can keep serving traffic
- multiple automation paths can trigger promotion independently

### 2. Shared Lock or Lease in an External Store

A node acquires a lock or renews a lease in a shared coordination store:
- relational row with compare-and-set semantics
- key-value store with versioned writes
- dedicated coordination service

This is common because it centralizes the authority decision:

```text
candidate -> acquire / renew lease in shared store
shared store -> one holder or newest valid revision wins
others -> observe lease holder and back off
```

This works best when the store itself is strongly consistent enough for the guarantees you need.

### 3. Consensus-Backed Election Inside the Cluster

Leader-based consensus systems often embed election into the protocol itself:
- a node campaigns for a new term or ballot
- it wins only with quorum support
- other nodes reject stale terms
- downstream log replication or command ordering uses the same authority model

This is the natural choice when:
- the cluster already needs consensus for metadata or logs
- safety depends on quorum-backed leadership
- candidates must prove log freshness or history completeness

### 4. Educational Algorithms With Stronger Assumptions

You will also see election algorithms such as:
- bully algorithm
- ring election
- lowest-ID or highest-priority winner schemes

These are useful for learning, or for constrained environments with strong assumptions. They are often not sufficient by themselves for production distributed systems that must tolerate partitions, restarts, delayed communication, and stale leaders.

### A Conservative Comparison

```text
┌──────────────────────────────┬──────────────────────────────────────────────┬──────────────────────────────────────────────┐
│ Approach                     │ Typical fit                                  │ Main concern                                 │
├──────────────────────────────┼──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ manual / static primary      │ simple ops, slower failover acceptable       │ human delay, stale primary risk              │
├──────────────────────────────┼──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ external lease / lock        │ one authority decision in shared store        │ store semantics determine safety             │
├──────────────────────────────┼──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ consensus-backed election    │ replicated control plane or metadata log      │ more protocol and operational complexity     │
├──────────────────────────────┼──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ ad hoc timeout self-promotion│ usually a bad production default              │ split brain and stale leader writes          │
└──────────────────────────────┴──────────────────────────────────────────────┴──────────────────────────────────────────────┘
```


# 6. Leases, Fencing, and Stale Leaders

An election result alone is often not enough. You also need a way to stop the old leader from remaining effective.

### Leases Bound Leadership in Time

A lease says, in effect:

```text
node B may act as leader for scope S
until lease L expires or renewal fails
```

Leases are useful because they:
- limit how long a dead or partitioned leader may remain valid
- force active leaders to renew authority
- provide a concrete holder and revision to observe

Leases are not magic. If a node pauses for too long, it may wake up and still believe it is leader unless the system explicitly revalidates authority.

### Fencing Protects the Resource Boundary

Fencing means every granted leadership epoch carries a monotonically increasing token, and downstream resources reject older tokens.

```text
lease revision 41 -> leader A
lease revision 42 -> leader B

storage, queue, or worker manager accepts token 42
and rejects writes carrying token 41
```

This is critical because old leaders can keep running after losing contact with the cluster.

### Why Fencing Matters More Than "Step Down" Alone

A stale leader may not step down immediately if:
- it cannot hear the new leader
- it is paused
- it is processing a delayed client request
- its control plane is degraded while its data path still reaches storage

Without fencing:

```text
old leader A writes after new leader B was elected
resource accepts both
state corrupts
```

With fencing:

```text
old leader A writes with token 41 -> rejected
new leader B writes with token 42 -> accepted
```

### Election Safety and Work Safety Are Different

Even a safe election does not automatically make work execution safe.

Examples:
- two workers may still process the same job if claims are not idempotent
- two primaries may still trigger external side effects if stale requests are not fenced
- a new leader may replay commands unless client requests are deduplicated

That is why durable designs often combine:
- election terms or lease revisions
- resource-side fencing checks
- idempotency keys
- replay-safe handlers

### A Simple Mental Model

```text
Election chooses authority.
Lease limits authority lifetime.
Fencing proves authority freshness at the write boundary.
```


# 7. Where Leader Election Fits in Real Systems

Leader election shows up in many systems, but not always at the same granularity.

### Cluster-Wide Control Leaders

Some systems want one active controller for a whole cluster or subsystem:
- scheduler leaders
- control-plane reconcilers
- metadata masters
- failover coordinators

This is operationally simple, but it concentrates load and blast radius.

### Per-Shard or Per-Partition Leaders

Many scalable systems avoid one global leader by electing leaders for smaller scopes:
- one leader per log partition
- one owner per shard
- one lease holder per worker queue partition

```text
cluster:
├── partition 1 -> leader A
├── partition 2 -> leader C
├── partition 3 -> leader B
└── partition 4 -> leader A
```

This preserves single-writer control per partition while spreading load.

### Database and Storage Coordination

Leader election can support:
- primary selection
- metadata ownership
- schema or config rollout coordination
- exclusive maintenance tasks

The exact mechanism varies by product and deployment model, so it is better to reason about the pattern than assume one universal implementation.

### Controllers and Schedulers

Leader election is common when multiple replicas watch the same desired state but only one should reconcile it actively.

Typical reasons:
- avoid duplicate work
- preserve ordering for shared operations
- simplify ownership of retries and backoff
- make operator expectations clearer

### When Not to Reach for a Leader

Leader election is often unnecessary when:
- data can merge naturally
- tasks are fully idempotent and safely concurrent
- throughput is dominated by independent partitions that can be assigned directly
- a coordination-free design is materially simpler

It is usually worth asking:

```text
Do I need one leader,
or do I really need better partitioning, better idempotency,
or a stronger compare-and-set boundary?
```


# 8. Practical TypeScript Patterns

These examples are intentionally small. They show the invariants you want to make visible in code rather than a full production implementation.

### Example 1: Model Leadership as Scope Plus Revision

```typescript
type NodeId = string;
type ScopeId = string;

interface LeaseRecord {
  scopeId: ScopeId;
  holderId: NodeId;
  revision: number;
  expiresAtMs: number;
}

interface LeadershipClaim {
  scopeId: ScopeId;
  holderId: NodeId;
  revision: number;
}
```

This prevents the common mistake of representing leadership as a single boolean with no freshness information.

### Example 2: Randomize Election Deadlines

```typescript
function chooseElectionTimeoutMs(
  minimumMs: number,
  maximumMs: number,
): number {
  if (maximumMs <= minimumMs) {
    throw new Error("maximumMs must be greater than minimumMs");
  }

  const range = maximumMs - minimumMs;
  return minimumMs + Math.floor(Math.random() * range);
}
```

This helper does not make elections safe by itself. It reduces repeated collisions among otherwise healthy candidates.

### Example 3: Acquire or Renew a Lease With Compare-And-Set

```typescript
interface LeaseStore {
  read(scopeId: ScopeId): Promise<LeaseRecord | null>;
  compareAndSwap(
    scopeId: ScopeId,
    expectedRevision: number | null,
    nextRecord: LeaseRecord,
  ): Promise<boolean>;
}

class LeaseElector {
  constructor(
    private readonly scopeId: ScopeId,
    private readonly nodeId: NodeId,
    private readonly store: LeaseStore,
    private readonly leaseDurationMs: number,
  ) {}

  async tryAcquireOrRenew(nowMs: number): Promise<LeadershipClaim | null> {
    const current = await this.store.read(this.scopeId);

    if (
      current !== null &&
      current.holderId !== this.nodeId &&
      current.expiresAtMs > nowMs
    ) {
      return null;
    }

    const nextRevision = (current?.revision ?? 0) + 1;
    const nextRecord: LeaseRecord = {
      scopeId: this.scopeId,
      holderId: this.nodeId,
      revision: nextRevision,
      expiresAtMs: nowMs + this.leaseDurationMs,
    };

    const swapped = await this.store.compareAndSwap(
      this.scopeId,
      current?.revision ?? null,
      nextRecord,
    );

    if (!swapped) {
      return null;
    }

    return {
      scopeId: this.scopeId,
      holderId: this.nodeId,
      revision: nextRevision,
    };
  }
}
```

The important idea is visible here:
- read current authority
- only take over if it expired or already belongs to you
- advance a monotonic revision
- rely on a compare-and-set boundary instead of local optimism

### Example 4: Reject Stale Leadership at the Resource Boundary

```typescript
interface FencedWrite {
  scopeId: ScopeId;
  leaderRevision: number;
  payload: string;
}

class FencedResource {
  private latestRevisionByScope = new Map<ScopeId, number>();

  accept(write: FencedWrite): void {
    const latestRevision =
      this.latestRevisionByScope.get(write.scopeId) ?? 0;

    if (write.leaderRevision < latestRevision) {
      throw new Error("stale leader revision");
    }

    this.latestRevisionByScope.set(
      write.scopeId,
      write.leaderRevision,
    );

    // Apply the write only after passing the fencing check.
  }
}
```

Without a check like this, an old leader can still mutate the resource if it wakes up late.

### Example 5: Step Down Aggressively on Lost Authority

```typescript
class LeadershipRuntime {
  private currentClaim: LeadershipClaim | null = null;

  becomeLeader(claim: LeadershipClaim): void {
    this.currentClaim = claim;
  }

  loseLeadership(): void {
    this.currentClaim = null;
  }

  observeHigherRevision(
    scopeId: ScopeId,
    observedRevision: number,
  ): void {
    if (
      this.currentClaim !== null &&
      this.currentClaim.scopeId === scopeId &&
      observedRevision > this.currentClaim.revision
    ) {
      this.loseLeadership();
    }
  }

  assertLeader(scopeId: ScopeId): LeadershipClaim {
    if (
      this.currentClaim === null ||
      this.currentClaim.scopeId !== scopeId
    ) {
      throw new Error("not current leader");
    }

    return this.currentClaim;
  }
}
```

This is not enough on its own, but it is still important. Good systems both step down locally and enforce fencing remotely.

### Example 6: Treat Work Claims as Idempotent

```typescript
interface JobClaimStore {
  claimIfUnowned(
    jobId: JobId,
    workerId: string,
    leaderRevision: number,
  ): Promise<boolean>;
}

async function assignJobOnce(
  leader: LeadershipRuntime,
  claimStore: JobClaimStore,
  scopeId: ScopeId,
  jobId: JobId,
  workerId: string,
): Promise<boolean> {
  const claim = leader.assertLeader(scopeId);

  return claimStore.claimIfUnowned(
    jobId,
    workerId,
    claim.revision,
  );
}
```

Even with good election logic, the work boundary should remain resistant to retries and duplicates.


# 9. Design Principles and Common Pitfalls

Leader election stays safer when the invariants are obvious in the protocol, in the code, and at the write boundary.

### Practical Design Principles

```text
Good:
├── define the leadership scope explicitly
├── attach a monotonic term, ballot, or revision to leadership
├── separate failure suspicion from authority transfer
├── fence downstream writes so stale leaders are rejected
├── use monotonic timers locally and distrust cross-node wall-clock comparisons
├── make work claims and side effects idempotent where possible
├── expose election metrics and renewal latency in observability
└── test partitions, pauses, retries, and restart recovery deliberately
```

### Common Pitfalls

```text
Bad:
├── promote on one missed heartbeat and call it solved
├── rely on local booleans instead of terms or revisions
├── assume the old leader will always notice it lost authority
├── let downstream storage accept writes from stale leaders
├── use a single cluster-wide leader when per-partition leadership is needed
├── make correctness depend on synchronized wall clocks
├── ignore long pauses, stop-the-world events, or network asymmetry
└── forget that external side effects need replay and duplicate protection
```

### Operational Signals Worth Tracking

Useful signals often include:
- election count per hour
- lease renewal latency
- failed renewal count
- leader tenure duration
- write rejections caused by stale fencing tokens
- time from suspected failure to new leadership

Frequent elections are often a symptom, not a success metric. They can indicate:
- timeout settings that are too aggressive
- network instability
- overloaded coordinators
- storage or coordination-path latency spikes

### A Durable Rule of Thumb

If a stale leader can still reach the thing that matters, the election is not fully safe yet.

That "thing that matters" might be:
- a database
- a message queue
- a worker-claim table
- an API that triggers side effects
- a metadata store

The fix is usually not more optimism in the elector. It is stronger freshness checks at the resource boundary.


# 10. Summary

**Leader election:**
- chooses one active coordinator for a defined scope and epoch
- is about authority transfer, not just picking a winner quickly

**Safety and liveness:**
- safety means stale or conflicting leaders should not both be effective
- liveness means the system can eventually recover leadership when enough of the environment is healthy

**Failure detection:**
- heartbeats and timeouts produce suspicion, not certainty
- timeout tuning is a business and operational trade-off, not a purely academic constant

**Leases and fencing:**
- leases bound how long authority may remain valid
- fencing tokens let downstream systems reject stale leaders explicitly

**System fit:**
- leader election is best for coordination-heavy state
- many systems scale better with per-shard or per-partition leaders than with one global leader

**Implementation checklist:**

```text
Model:
  □ Define the exact leadership scope
  □ Represent authority with a term, ballot, epoch, or revision
  □ Decide whether you need one leader globally or one leader per partition

Protocol:
  □ Separate failure suspicion from authority transfer
  □ Use randomized timeouts where collision reduction matters
  □ Use a compare-and-set or quorum-backed authority decision
  □ Step down on higher terms, lost renewals, or failed leadership checks

Write safety:
  □ Fence downstream writes with a monotonic leadership token
  □ Reject stale leaders at the resource boundary
  □ Make work claims and external side effects idempotent where possible

Operations:
  □ Track election rate, renewal latency, and stale-write rejections
  □ Test partitions, long pauses, delayed packets, and restart recovery
  □ Document manual failover and recovery expectations clearly
```
