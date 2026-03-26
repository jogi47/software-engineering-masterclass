# Network Partitions

[← Back to Index](README.md)

Imagine you are building a seat-reservation system with one primary node per shard. Under normal conditions, the primary accepts writes and a replica stays warm for failover. Users expect one seat to be sold once, not twice.

Without partition-aware coordination, teams often promote a replica the moment heartbeats stop and assume the old primary must be dead:

```typescript
type ReservationRequest = {
  seatId: string;
  customerId: string;
};

interface SeatStore {
  reserve(seatId: string, customerId: string): Promise<void>;
}

class NaiveSeatShardNode {
  private lastHeartbeatAtMs = Date.now();
  private isPrimary = false;

  constructor(
    private readonly store: SeatStore,
    private readonly heartbeatTimeoutMs = 5_000,
  ) {}

  recordHeartbeat(receivedAtMs: number): void {
    this.lastHeartbeatAtMs = receivedAtMs;
  }

  maybePromote(nowMs: number): void {
    if (nowMs - this.lastHeartbeatAtMs > this.heartbeatTimeoutMs) {
      this.isPrimary = true;
    }
  }

  async reserveSeat(request: ReservationRequest): Promise<void> {
    if (!this.isPrimary) {
      throw new Error("Writes are allowed only on the primary");
    }

    await this.store.reserve(request.seatId, request.customerId);
  }
}
```

This fails in ways that look obvious only after production traffic hits a partition:
- a missed heartbeat may mean the peer is isolated, not dead
- the old primary may still be running and still accepting writes
- both sides may believe they are authoritative and reserve the same seat
- repairing that conflict later may require refunds, apologies, and manual review

This is where **network partitions** come in. A partition is not just "the network is slow." It is a communication failure that splits part of the system from another part long enough that normal coordination stops working. Once that happens, your system must decide who can still write, what should degrade to read-only, what can continue with later reconciliation, and how recovery will be handled safely.

In this chapter, you will learn:
  * [Why network partitions matter](#1-why-network-partitions-matter)
  * [What a network partition actually is](#2-what-a-network-partition-is)
  * [Why partitions happen in practice](#3-why-partitions-happen)
  * [Why failure detection becomes ambiguous](#4-failure-detection-suspicion-and-ambiguity)
  * [How CAP trade-offs apply during a partition](#5-cap-theorem-and-trade-offs-in-practice)
  * [How split brain, quorums, and leadership control fit together](#6-split-brain-quorums-and-leadership-control)
  * [How application behavior should change during a partition](#7-application-behavior-during-a-partition)
  * [How detection, recovery, and reconciliation work](#8-detection-recovery-and-reconciliation)
  * [What practical TypeScript guardrails look like](#9-practical-typescript-patterns)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why Network Partitions Matter

Network partitions matter because they turn distributed systems from "slightly slower local code" into systems with conflicting truths and incomplete information.

### A Partition Exposes the Real Coordination Model

Under healthy conditions, many designs look fine:
- the leader seems unique
- replicas appear close enough to current
- remote writes seem like function calls with extra latency
- failover logic looks clean in tests

During a partition, those assumptions get tested immediately.

```text
Healthy path:

Client
  |
  v
API
  |
  v
Leader ─────────▶ Replica


Partitioned path:

Client A                 Client B
   |                        |
   v                        v
 Segment 1               Segment 2
   |                        |
   v                        v
 Leader X      XXXXXX    Replica Y
```

If the design depends on one side hearing from the other before every important decision, a partition breaks that assumption first.

### Partitions Are a Normal Distributed-Systems Concern

You do not need an exotic multi-region deployment to care:
- an availability-zone link can fail
- a switch, router, or firewall rule can isolate a subset of nodes
- service-mesh or DNS control paths can break while processes stay alive
- packet loss and retransmission storms can push latency beyond safety thresholds

The exact frequency depends on the environment, but the design lesson is durable:

```text
If correctness depends on continuous communication,
then partitions are part of the correctness model.
```

### The Business Impact Is Often Larger Than the Technical Symptom

A partition can lead to:
- duplicate payments or reservations
- stale reads that hide recent writes
- stuck background jobs that wait forever for a quorum
- competing leaders issuing conflicting commands
- operators making unsafe manual decisions because system status is unclear

That is why partition handling is not just an infrastructure concern. It is an application-design concern.


# 2. What a Network Partition Is

A network partition happens when parts of a distributed system cannot exchange messages reliably enough to coordinate normal behavior.

### The Core Idea

The important point is not that packets are literally impossible forever. The important point is that communication is broken enough that, within the system's time budget, one side cannot rely on the other side's responses.

That means:
- heartbeats may stop arriving
- quorum may no longer be reachable
- remote commits may remain unconfirmed
- leadership decisions may become unsafe

### A Partition Is About Communication, Not Just Process Health

The isolated node may still be running correctly:
- CPU is fine
- memory is fine
- disk is fine
- application process is still serving its local socket

But from the rest of the cluster's point of view, it may be unreachable. That distinction matters because recovery logic differs for "dead" versus "alive but isolated."

### Common Partition Shapes

```text
1. Two-way split

┌──────────── Segment A ────────────┐    ┌──────────── Segment B ────────────┐
│ Node 1            Node 2          │    │ Node 3            Node 4          │
│ can talk locally  can talk locally│    │ can talk locally  can talk locally│
└───────────────────────────────────┘    └───────────────────────────────────┘


2. One-way or asymmetric reachability

Node A ─────────▶ Node B
Node A ◀XXXXXXX─ Node B


3. Client-to-cluster isolation

Client Group A ─────▶ Cluster
Client Group B XXXXXX▶ Cluster
```

Not every partition is a clean 50/50 split. Some are asymmetric, partial, or visible only to certain clients.

### Slow Enough Can Be Operationally Equivalent to Partitioned

At the application layer, "partitioned" often means:
- the message arrived too late to renew a lease
- the response missed the request deadline
- enough packets were lost that quorum was not reached

That is why many designs treat severe delay as a partition-like condition for safety decisions.

### Partition vs Other Failure Modes

```text
┌──────────────────────────┬──────────────────────────────────────────────┐
│ Failure mode             │ Main observation                            │
├──────────────────────────┼──────────────────────────────────────────────┤
│ process crash            │ node stops executing work                   │
├──────────────────────────┼──────────────────────────────────────────────┤
│ disk failure             │ persistence path breaks                     │
├──────────────────────────┼──────────────────────────────────────────────┤
│ network partition        │ nodes may run, but coordination breaks      │
├──────────────────────────┼──────────────────────────────────────────────┤
│ long pause / overload    │ may look partitioned to peers via timeouts  │
└──────────────────────────┴──────────────────────────────────────────────┘
```

Those failures overlap operationally because peers usually infer them through missed communication, not direct knowledge.


# 3. Why Partitions Happen

Partitions happen for mundane reasons more often than for dramatic ones.

### Infrastructure and Network-Layer Causes

Common causes include:
- failed switches, routers, or cross-rack links
- availability-zone or data-center network faults
- routing changes that blackhole or misroute traffic
- packet loss bursts that push retransmission and timeout behavior over the edge

These failures may last seconds or much longer. Even short partitions can be enough to trigger failover logic or user-visible errors.

### Configuration and Control-Plane Causes

Many real incidents come from control mistakes rather than broken hardware:
- incorrect firewall or security-group rules
- service-mesh policy updates that block east-west traffic
- bad load-balancer health-check configuration
- DNS or service-discovery staleness that points callers to the wrong place

These are often especially dangerous because the applications remain healthy enough to keep doing work locally.

### Dependency-Specific Partitions

Sometimes the "partition" is between an application and a dependency:
- one service cannot reach the database leader
- workers cannot reach the queue
- a region cannot reach the identity provider
- storage clients cannot reach metadata or lock services

That still behaves like a partition at the workflow level. The dependency becomes an isolated island from the caller's point of view.

### Partial and Intermittent Partitions Are Harder Than Clean Splits

The most confusing cases are often:
- one node can reach some peers but not others
- only large packets fail
- only one protocol path is broken
- connectivity flaps between healthy and unhealthy states

These cases produce inconsistent observations:
- one monitor reports healthy
- another sees high retries
- one zone can read but not write
- clients in one subnet fail while others succeed

### Good Engineering Assumes Imperfect Boundaries

The durable lesson is not to predict every cause exactly. It is to design so that:
- missed communication does not automatically imply peer death
- leadership change requires stronger proof than one timeout
- business-critical writes do not continue on multiple isolated authorities


# 4. Failure Detection, Suspicion, and Ambiguity

The hardest operational fact about partitions is that systems usually detect them indirectly.

### Most Systems See Symptoms, Not Ground Truth

A node typically decides another node is unhealthy because:
- heartbeats stopped
- an RPC timed out
- lease renewal did not complete
- replication acknowledgments fell behind a deadline

But those symptoms do not tell you exactly why.

### Timeout Means "Uncertain," Not "Definitely Dead"

```text
Node A                         Node B
  |                              |
  |---- heartbeat -------------> |
  |                              |
  |---- heartbeat -------------> |
  |                              |
  XXXXXX network partition XXXXXX
  |                              |
  |---- heartbeat lost --------> |
  |                              |
  |                       suspects A is gone
```

From Node B's point of view, Node A may be:
- crashed
- alive but isolated
- heavily overloaded
- paused long enough to miss deadlines

Those are different realities, but the observed symptom can be identical.

### Suspicion Is Safer Than Pretend Certainty

Systems usually behave better when they model states like:
- `HEALTHY`
- `SUSPECTED`
- `UNREACHABLE`
- `RECOVERING`

instead of forcing a false binary:

```text
alive or dead
```

That is especially important for leadership decisions, lock ownership, and failover.

### Failure Detectors Trade Speed for False Positives

If you choose very short timeouts:
- failover becomes faster
- false suspicion becomes more likely during latency spikes

If you choose very long timeouts:
- false suspicion is less likely
- recovery from real failure becomes slower

There is no universally correct timeout. The right value depends on:
- network variability
- service-level objectives
- cost of false failover
- cost of delayed recovery

### Why Leases Need Safety Margins

Leases are useful because they expire if renewal stops. But lease safety depends on assumptions about:
- clock drift bounds
- maximum delay before renewal
- how strictly stale writers are rejected after expiration

Without those guardrails, lease-based systems can still produce overlapping leadership during timing uncertainty.


# 5. CAP Theorem and Trade-Offs in Practice

CAP is often oversimplified, but the core lesson is still useful when thinking about partitions.

### The Conservative Reading of CAP

When a real partition exists, a distributed system cannot simultaneously guarantee:
- strong single-copy style consistency for all operations
- availability for every request to every non-failed node

and still tolerate the partition.

For this discussion:
- **consistency** means every client sees the same most recent successful write under the model being promised
- **availability** means a non-failed node returns a response instead of refusing the operation
- **partition tolerance** means the system continues to operate despite lost communication between segments

### Partition Tolerance Is Usually Not Optional

If your system spans machines, the network can fail. So the practical question is not whether to "choose partition tolerance." The practical question is:

```text
When communication breaks,
which operations should wait, fail, degrade, or continue locally?
```

### CP and AP Are Usually Operation-Level Choices

Many systems are not purely one or the other across every endpoint.

```text
┌─────────────────────────────┬─────────────────────────────────────────────┐
│ Partition-time posture      │ Typical behavior                            │
├─────────────────────────────┼─────────────────────────────────────────────┤
│ CP-style                    │ reject or delay writes without quorum       │
├─────────────────────────────┼─────────────────────────────────────────────┤
│ AP-style                    │ accept local writes and reconcile later     │
├─────────────────────────────┼─────────────────────────────────────────────┤
│ mixed system                │ some data stays strict, some degrades       │
└─────────────────────────────┴─────────────────────────────────────────────┘
```

Examples:
- seat assignment is usually better treated as CP-style because double booking is expensive
- likes, counters, or presence signals may tolerate AP-style mergeable behavior
- a product catalog may become read-only instead of fully unavailable

### CAP Does Not Answer Every Design Question

CAP does not tell you:
- what latency is acceptable
- how to do recovery
- whether stale reads are fine for your business case
- how expensive reconciliation will be

It is a partition-time constraint, not a full architecture strategy.

### The Safer Question to Ask

Instead of debating labels, ask:
- which operations require one global authority right now
- which operations can wait
- which operations can merge safely later
- which user states should be explicitly marked as pending or degraded

That framing leads to better application design than CAP slogans alone.


# 6. Split Brain, Quorums, and Leadership Control

Partition handling becomes dangerous when multiple sides believe they are authoritative.

### Split Brain Is a Business Problem, Not Just a Cluster Problem

A split brain happens when two isolated parts of the system both act as primary for the same responsibility.

That can create:
- duplicate job execution
- conflicting writes
- two leaders issuing contradictory commands
- irreversible external side effects that cannot be merged safely

### Majority Quorums Prevent Two Simultaneous Majorities

With a fixed membership of five voting nodes:

```text
Partition example:

┌──────── Segment A ────────┐    ┌──── Segment B ────┐
│ Node 1  Node 2  Node 3    │    │ Node 4  Node 5    │
│ 3 votes available         │    │ 2 votes available │
└───────────────────────────┘    └───────────────────┘

Majority quorum = 3
```

Only Segment A can form a majority quorum. Segment B should not continue as if it still holds leadership for quorum-protected writes.

That is the safety value of majority-based coordination.

### Leadership Usually Needs More Than "I Have Not Heard From the Old Leader"

Safer leadership control often combines:
- majority quorum for election
- leases with bounded renewal windows
- durable term or epoch numbers
- fencing tokens checked by downstream storage or workers

### Fencing Tokens Protect Against Stale Leaders

Even after leadership changes, the old leader may still be alive and may continue sending writes. A fencing token gives downstream systems a way to reject stale authority.

```text
Leader term progression:

term 7  -> old leader had authority earlier
term 8  -> new leader elected

Any write from term 7 must now be rejected.
```

This matters because network recovery is not instantaneous. A stale leader can wake back up and keep trying to work.

### Membership Changes Need Extra Care

Quorum logic is simplest with a fixed node set. During reconfiguration:
- voters may be added or removed
- one side may have stale membership information
- careless transitions can accidentally allow unsafe overlap

That is why mature consensus systems use explicit reconfiguration procedures rather than ad hoc membership edits.

### Not Every System Needs Consensus Everywhere

You do not need cluster-wide quorum for every workflow. But for responsibilities like:
- electing one primary
- assigning unique sequence ownership
- guarding exclusive job execution
- protecting money movement or inventory uniqueness

you usually need stronger coordination than "promote after a timeout."


# 7. Application Behavior During a Partition

A healthy partition strategy changes application behavior deliberately instead of letting normal logic fail unpredictably.

### Classify Operations by Merge Cost

Start by separating operations into categories:

```text
┌──────────────────────────────┬────────────────────────────────────────────┐
│ Operation type               │ Better partition posture                   │
├──────────────────────────────┼────────────────────────────────────────────┤
│ globally unique assignment   │ preserve one authority, reject or queue    │
├──────────────────────────────┼────────────────────────────────────────────┤
│ mergeable counters/signals   │ allow local progress, reconcile later      │
├──────────────────────────────┼────────────────────────────────────────────┤
│ read-heavy reference data    │ serve cached or read-only if necessary     │
├──────────────────────────────┼────────────────────────────────────────────┤
│ irreversible external effect │ require stronger confirmation before claim │
└──────────────────────────────┴────────────────────────────────────────────┘
```

This is often the most practical partition-design exercise.

### Prefer Honest User States Over Fake Success

During a partition, good user-facing states may include:
- `PENDING_CONFIRMATION`
- `READ_ONLY`
- `TEMPORARILY_UNAVAILABLE`
- `RETRYING`
- `RECONCILIATION_REQUIRED`

That is usually better than returning success before the system knows the write is safely committed under the required rules.

### Common Partition-Time Strategies

Pragmatic patterns include:
- reject writes when quorum is unavailable
- allow only the majority side to serve writes
- downgrade minority segments to read-only
- queue intent locally for later replay if the business can tolerate delayed completion
- serve stale reads only where the product can explain that safely

### Keep Retry Logic Bounded and Context-Aware

Retries during a partition can make things worse:
- queues back up
- request storms hit recovering nodes
- duplicate side effects multiply

Healthy retry policies usually include:
- deadlines
- exponential backoff
- idempotency keys
- a decision point that stops retrying and surfaces a degraded state

### Design for Operational Override

Sometimes recovery requires an operator to:
- freeze writes
- fail over manually
- drain one segment
- trigger reconciliation

Make those operations explicit. Hidden emergency procedures tend to be unsafe when operators are under pressure.


# 8. Detection, Recovery, and Reconciliation

Partition handling does not end when connectivity returns. Recovery is where many correctness problems become visible.

### Detection Needs More Than One Health Check

Useful signals include:
- missed heartbeats
- quorum loss
- replication lag growth
- lease renewal failures
- cross-zone packet-loss and latency metrics
- sudden divergence between client success rates by region or subnet

One signal is rarely enough for a safe diagnosis.

### Recovery Should Re-Establish Authority First

When connectivity returns, a safe order is usually:

```text
1. determine which leader or term is authoritative
2. stop stale leaders from issuing more writes
3. catch replicas up from the authoritative log or source of truth
4. reopen traffic gradually
5. reconcile any ambiguous business operations
```

If you skip step 2, the stale side may continue writing while you are trying to heal the cluster.

### Reconciliation Depends on Data Semantics

Different data types recover differently:
- append-only logs may replay from the last confirmed offset
- state-machine replicas may catch up from an authoritative leader
- mergeable data types may combine concurrent updates safely
- unique assignments often require one side's write to win and the other side to be compensated manually or programmatically

### Last-Writer-Wins Is Often an Attractive Shortcut and a Bad Idea

Last-writer-wins may be acceptable for some low-value metadata, but it is dangerous for:
- payments
- inventory reservations
- security changes
- workflow transitions with external side effects

Wall-clock timestamps do not tell you which business action should win. They only tell you what one machine thought the time was.

### Partition Recovery Should Be Practiced, Not Imagined

Good teams test scenarios such as:
- minority-side write attempts
- split-brain stale leader recovery
- lease expiration and fencing-token rollover
- replay after queued writes are released
- manual reconciliation of double-applied or unknown operations

Recovery plans that exist only in design docs are usually incomplete.


# 9. Practical TypeScript Patterns

Application code cannot eliminate partitions, but it can make partition-time behavior safer and easier to reason about.

### Example 1: Use Fencing Tokens to Reject Stale Leaders

```typescript
type LeaseGrant = {
  shardId: string;
  holderId: string;
  fencingToken: number;
  expiresAtMs: number;
};

interface LeaseStore {
  tryAcquireOrRenew(input: {
    shardId: string;
    holderId: string;
    nowMs: number;
    leaseDurationMs: number;
  }): Promise<LeaseGrant | null>;
}

interface SeatShardStore {
  reserveWithFence(input: {
    seatId: string;
    customerId: string;
    fencingToken: number;
  }): Promise<void>;
}

class PartitionSafeSeatLeader {
  private currentLease: LeaseGrant | null = null;

  constructor(
    private readonly nodeId: string,
    private readonly shardId: string,
    private readonly leaseStore: LeaseStore,
    private readonly seatStore: SeatShardStore,
  ) {}

  async renewLeadership(nowMs: number): Promise<boolean> {
    const lease = await this.leaseStore.tryAcquireOrRenew({
      shardId: this.shardId,
      holderId: this.nodeId,
      nowMs,
      leaseDurationMs: 4_000,
    });

    this.currentLease = lease;
    return lease !== null;
  }

  async reserveSeat(seatId: string, customerId: string, nowMs: number): Promise<void> {
    const lease = this.currentLease;

    if (lease === null || lease.expiresAtMs <= nowMs) {
      throw new Error("No valid leadership lease");
    }

    await this.seatStore.reserveWithFence({
      seatId,
      customerId,
      fencingToken: lease.fencingToken,
    });
  }
}
```

This does two useful things:
- leadership expires unless renewed
- downstream writes carry a fencing token so stale leaders can be rejected

The application still needs a correct lease store and storage enforcement, but this is far safer than boolean `isPrimary` flags.

### Example 2: Make Partition-Time Write Decisions Explicit

```typescript
type ClusterState =
  | { mode: "HEALTHY"; writableReplicas: number }
  | { mode: "DEGRADED"; writableReplicas: number }
  | { mode: "PARTITIONED"; writableReplicas: number };

type WriteDecision =
  | { status: "ALLOW" }
  | { status: "REJECT_READ_ONLY"; reason: string }
  | { status: "QUEUE_FOR_RETRY"; reason: string };

class QuorumWritePolicy {
  constructor(private readonly requiredQuorum: number) {}

  decide(state: ClusterState): WriteDecision {
    if (state.writableReplicas >= this.requiredQuorum) {
      return { status: "ALLOW" };
    }

    if (state.mode === "PARTITIONED") {
      return {
        status: "REJECT_READ_ONLY",
        reason: "Write quorum is unavailable during a partition",
      };
    }

    return {
      status: "QUEUE_FOR_RETRY",
      reason: "Cluster is degraded; safe write path is temporarily unavailable",
    };
  }
}
```

This kind of policy keeps the outcome honest. Instead of blindly attempting writes, the application decides whether the business operation should fail fast, queue, or continue.

### Example 3: Preserve Unknown Outcomes for Later Reconciliation

```typescript
type ReplicationResult =
  | { status: "COMMITTED"; replicaCount: number }
  | { status: "REJECTED"; reason: string }
  | { status: "UNKNOWN"; reason: string };

interface ProfileStore {
  savePendingChange(input: {
    userId: string;
    changeId: string;
    email: string;
    status: "PENDING_REPLICATION";
  }): Promise<void>;
  markCommitted(changeId: string): Promise<void>;
  markNeedsReview(changeId: string, reason: string): Promise<void>;
}

interface ReplicationCoordinator {
  replicateEmailChange(input: {
    changeId: string;
    userId: string;
    email: string;
  }): Promise<ReplicationResult>;
}

class ProfileEmailService {
  constructor(
    private readonly store: ProfileStore,
    private readonly replication: ReplicationCoordinator,
  ) {}

  async changeEmail(userId: string, email: string): Promise<ReplicationResult> {
    const changeId = crypto.randomUUID();

    await this.store.savePendingChange({
      userId,
      changeId,
      email,
      status: "PENDING_REPLICATION",
    });

    const result = await this.replication.replicateEmailChange({
      changeId,
      userId,
      email,
    });

    if (result.status === "COMMITTED") {
      await this.store.markCommitted(changeId);
      return result;
    }

    if (result.status === "UNKNOWN") {
      await this.store.markNeedsReview(changeId, result.reason);
      return result;
    }

    await this.store.markNeedsReview(changeId, result.reason);
    return result;
  }
}
```

The critical habit is not hiding uncertainty. Partitioned systems often need a durable `UNKNOWN` or `PENDING_REPLICATION` state so repair can happen safely later.

### TypeScript-Level Guardrails That Age Well

Useful habits include:
- model ambiguous outcomes explicitly
- propagate deadlines instead of infinite retries
- make write authority explicit in types and interfaces
- keep idempotency keys on side effects that may be retried after uncertain results
- separate "accepted locally" from "committed under required replication rules"

These are small code-level choices, but they prevent many large operational mistakes.


# 10. Summary

**Network partitions break communication first and assumptions second.**
- Nodes may remain alive and productive locally while coordination across segments becomes unsafe.
- Healthy designs treat partitions as a normal distributed-systems condition, not as an impossible edge case.

**Failure detection during a partition is fundamentally ambiguous.**
- Missed heartbeats and timeouts tell you that communication failed, not exactly why.
- Systems behave better when they model suspicion and unknown outcomes honestly.

**Partition-time safety usually depends on leadership control and scoped coordination.**
- Majority quorums, leases, and fencing tokens are common ways to avoid split brain for critical writes.
- Not every operation needs the same level of coordination; partition posture should match merge cost and business risk.

**Recovery is not complete until authority and data are reconciled.**
- Restoring connectivity is only the start.
- Safe recovery usually requires stopping stale leaders, catching replicas up, and reconciling ambiguous business effects deliberately.

**Implementation checklist:**

```text
Coordination model:
  □ Identify which operations require one authoritative writer during a partition
  □ Use quorum, leases, or equivalent coordination for leadership-sensitive responsibilities
  □ Add fencing-token or epoch checks wherever stale leaders could still issue writes

Request handling:
  □ Decide which APIs should reject, queue, go read-only, or continue locally during partitions
  □ Model `PENDING`, `UNKNOWN`, or `RECONCILIATION_REQUIRED` states where outcomes can be ambiguous
  □ Bound retries with deadlines and idempotency keys instead of indefinite blind retry

Recovery and reconciliation:
  □ Define how authoritative state is re-established after connectivity returns
  □ Decide how replicas catch up and how conflicting writes are reviewed or compensated
  □ Test stale-leader, minority-partition, and double-apply scenarios before production

Operations:
  □ Monitor quorum loss, heartbeat failures, replication lag, and regional success-rate asymmetry
  □ Document manual failover, freeze, and repair procedures for partition incidents
  □ Review whether timestamp-based conflict resolution is actually safe for each data type
```
