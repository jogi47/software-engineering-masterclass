# Heartbeats

[← Back to Index](README.md)

Imagine you are building a background media-processing cluster. Uploads land in a queue, workers claim jobs, and the coordinator reassigns stuck work when a worker disappears. Users do not care which worker handled the job. They care that the video is processed once and finishes.

Without a disciplined heartbeat design, teams often treat one missed signal as proof that a worker died:

```typescript
type WorkerId = string;

interface JobQueue {
  requeueJobsOwnedBy(workerId: WorkerId): Promise<void>;
}

class NaiveWorkerMonitor {
  private readonly lastSeenAtMs = new Map<WorkerId, number>();

  constructor(
    private readonly queue: JobQueue,
    private readonly timeoutMs = 5_000,
  ) {}

  recordHeartbeat(workerId: WorkerId, receivedAtMs: number): void {
    this.lastSeenAtMs.set(workerId, receivedAtMs);
  }

  async sweep(nowMs: number): Promise<void> {
    for (const [workerId, lastSeenAtMs] of this.lastSeenAtMs) {
      if (nowMs - lastSeenAtMs > this.timeoutMs) {
        await this.queue.requeueJobsOwnedBy(workerId);
        this.lastSeenAtMs.delete(workerId);
      }
    }
  }
}
```

This fails in ways that often surface only under production load:
- a garbage-collection pause, CPU spike, or network blip can look exactly like a dead worker
- requeueing work immediately can create duplicate side effects if the old worker was still running
- the coordinator has no sequence numbers, generation IDs, or lease boundaries to distinguish stale from current processes
- a single fixed timeout quietly bakes operational assumptions into correctness logic

This is where **heartbeats** come in. A heartbeat is a small, periodic signal that helps one part of a distributed system judge whether another part is probably still reachable and making progress. Used well, heartbeats improve failure detection and recovery time. Used carelessly, they create false failovers and split-brain style mistakes.

In this chapter, you will learn:
  * [Why heartbeats matter](#1-why-heartbeats-matter)
  * [What a heartbeat actually tells you](#2-what-a-heartbeat-actually-tells-you)
  * [Which heartbeat models exist](#3-heartbeat-models)
  * [How failure detection and suspicion work](#4-failure-detection-suspicion-and-timeouts)
  * [How to tune intervals, timeouts, and payloads](#5-tuning-intervals-timeouts-and-payloads)
  * [Where heartbeats are commonly used](#6-common-uses-for-heartbeats)
  * [How heartbeats differ from related mechanisms](#7-heartbeats-vs-health-checks-leases-and-consensus)
  * [Which failure modes and pitfalls repeat](#8-failure-modes-and-design-pitfalls)
  * [What practical TypeScript patterns look like](#9-practical-typescript-patterns)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why Heartbeats Matter

Heartbeats matter because distributed systems do not have shared memory or shared certainty. If one node stops responding, the rest of the system must decide whether to wait, reroute, reassign work, or fail over.

### Without a Liveness Signal, Failure Detection Becomes Slow and Indirect

If you do not send explicit liveness signals, you often discover failure only when:
- user requests start timing out
- queued work stops completing
- replication lag grows
- operators notice stale dashboards

That delay can be acceptable for low-value batch workloads. It is much more expensive when the system owns traffic routing, leadership, or time-sensitive work.

### Heartbeats Turn Silence Into an Actionable Signal

```text
┌──────────────┐     heartbeat      ┌──────────────┐
│ Worker A     │ ─────────────────▶ │ Coordinator  │
└──────────────┘                    └──────────────┘
┌──────────────┐     heartbeat      ┌──────────────┐
│ Worker B     │ ─────────────────▶ │ Coordinator  │
└──────────────┘                    └──────────────┘
```

With periodic heartbeats, the coordinator can ask:
- when did I last hear from this node
- is the delay within the normal budget
- should I mark the node healthy, suspect, or unavailable
- do I need to trigger a safer recovery path

### The Real Value Is Not the Packet. It Is the Decision It Enables

The small packet is cheap. The important part is what the system can do with it:
- update membership
- remove bad targets from routing
- renew a lease or presence record
- trigger investigation or automation
- bound failover time instead of waiting indefinitely

### Detection Speed and Safety Pull in Opposite Directions

A shorter interval detects trouble faster, but it also:
- increases background traffic
- increases sensitivity to transient latency or pauses
- raises the chance of false suspicion if the runtime or network is noisy

That trade-off is why heartbeat design is not just "send ping every second." It is a policy decision tied to business risk, infrastructure behavior, and recovery semantics.


# 2. What a Heartbeat Actually Tells You

A heartbeat is usually a small message sent periodically to say, in effect, "I am still here at time T."

### A Conservative Definition

A heartbeat usually tells you something like this:

```text
At least one message from node X
reached observer Y
close to time T
under the conditions of that path.
```

That is useful, but it is narrower than many teams assume.

### What a Heartbeat Can and Cannot Prove

```text
┌────────────────────────────────────┬────────────────────────────────────────────┐
│ A received heartbeat can suggest   │ A received heartbeat does not prove        │
├────────────────────────────────────┼────────────────────────────────────────────┤
│ the sender was recently reachable  │ the sender can still serve all requests    │
├────────────────────────────────────┼────────────────────────────────────────────┤
│ the sender had enough CPU/network  │ the application is semantically healthy    │
│ to emit one message                │                                            │
├────────────────────────────────────┼────────────────────────────────────────────┤
│ the sender still belongs to some   │ the sender should keep write authority     │
│ generation or role                 │                                            │
├────────────────────────────────────┼────────────────────────────────────────────┤
│ the observer heard something       │ all other observers see the same thing     │
└────────────────────────────────────┴────────────────────────────────────────────┘
```

This is why heartbeats are best treated as **liveness hints** or **failure-detection input**, not as proof of correctness.

### Good Heartbeats Usually Carry a Little Identity

Useful fields often include:
- node or instance ID
- monotonic sequence number
- process generation or boot ID
- role or shard ownership
- optional compact metadata such as load or lag

The generation ID matters because a restarted process with the same node name is not always the same authority as the previous one.

### Heartbeats Should Usually Stay Small and Stable

A heartbeat that grows into a full metrics dump often creates avoidable problems:
- more bytes on the network
- more parsing cost on the receiver
- more coupling between runtime health and observability payloads
- higher blast radius when one optional field breaks compatibility

A good default is to keep the heartbeat minimal, then send richer diagnostics through logs, metrics, or separate status APIs.

### Silence Means Suspicion, Not Certainty

The absence of a heartbeat usually means one of several things:
- the sender crashed
- the sender is overloaded or paused
- the network path is degraded
- the observer is overloaded
- the message was delayed or dropped

That ambiguity is the central design constraint of heartbeat systems.


# 3. Heartbeat Models

There is no single heartbeat shape that fits every distributed system. Different models trade simplicity, timeliness, and operational cost differently.

### Push Heartbeats

In a push model, the monitored node sends heartbeats to a monitor or registry.

```text
Node ───── heartbeat ─────▶ Monitor
Node ───── heartbeat ─────▶ Monitor
Node ───── heartbeat ─────▶ Monitor
```

This model is common when:
- many workers report to one scheduler
- service instances renew presence in a registry
- replicas report status to a primary or control plane

Benefits:
- simple receiver logic
- the sender controls cadence
- good fit for many-to-one reporting

Trade-offs:
- synchronized senders can create bursts
- the receiver may become a hotspot
- the receiver learns only what the sender chose to report

### Pull Heartbeats

In a pull model, the monitor probes the target periodically.

```text
Monitor ───── ping / probe ─────▶ Node
Monitor ◀──── pong / status ──── Node
```

This model is common when:
- a load balancer checks backend reachability
- a control plane probes nodes
- operators want the monitor to define cadence and timeout behavior

Benefits:
- central control over interval and timeout
- easier to compare nodes consistently
- can reuse probe infrastructure

Trade-offs:
- the monitor pays the fan-out cost
- failed monitors can create blind spots
- aggressive probing can amplify load during incidents

### Lease Renewal as a Heartbeat-Like Pattern

Some systems encode presence as a lease or TTL-backed registration rather than a standalone heartbeat packet.

```text
Node ───── renew lease ─────▶ Lease Store
Node ◀──── lease expiry ──── Lease Store

Clients / coordinators read the lease store
to decide who is present or authoritative.
```

This pattern is common when:
- membership must expire automatically if renewals stop
- authority needs a time boundary
- the system wants storage-backed presence instead of in-memory observation

Benefits:
- liveness and expiry are encoded together
- stale entries can age out automatically
- easier to combine with leader election or presence records

Trade-offs:
- correctness depends on the lease store
- clock and expiry semantics must be handled carefully
- renewal traffic still needs tuning

### Bidirectional and Peer-to-Peer Heartbeats

In some clusters, peers exchange heartbeats with one another rather than report to a single coordinator. This can help:
- membership dissemination
- local failure suspicion
- mesh-style or gossip-like systems

It also makes diagnosis harder because different peers may observe different realities at the same time.

### A Simple Model Comparison

```text
┌──────────────────────┬──────────────────────────────┬──────────────────────────────┐
│ Model                │ Good fit                     │ Main caution                 │
├──────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ push                 │ workers to one coordinator   │ receiver hotspots, burstiness│
├──────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ pull                 │ probes from one monitor      │ monitor fan-out cost         │
├──────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ lease renewal        │ presence with expiry         │ lease store becomes critical │
├──────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ peer-to-peer         │ cluster membership signals   │ inconsistent observations    │
└──────────────────────┴──────────────────────────────┴──────────────────────────────┘
```


# 4. Failure Detection, Suspicion, and Timeouts

The core job of a heartbeat system is not "declare dead." It is "decide how confident you are that a peer is unavailable."

### Most Systems Need More Than Alive or Dead

A practical state model often looks like this:

```text
HEALTHY ───── missed interval(s) ─────▶ SUSPECT ───── extended silence ─────▶ DEAD
   ▲                                          │                                  │
   └──────────────────── heartbeat resumes ───┴────────────── recovery ──────────┘
```

`SUSPECT` is useful because it tells the truth:
- the monitor has evidence of trouble
- the evidence is not yet conclusive
- the system may change behavior without immediately taking the most dangerous action

### One Missed Heartbeat Should Rarely Trigger Immediate Authority Changes

A single missed heartbeat can come from:
- transient queueing delay
- runtime pause
- packet loss
- monitor overload
- network jitter

If the response to one missed packet is "promote a new leader" or "reassign all jobs," the system is usually too eager for critical workloads.

### Timeouts Are Policy, Not Truth

A timeout is an agreement between the system and itself:
- how long it will wait before suspecting trouble
- how many misses it tolerates
- when it escalates from suspicion to recovery

That policy should match:
- expected network and runtime noise
- acceptable detection delay
- cost of false positives
- cost of slow recovery

### Timeline Example

```text
time ─────────────────────────────────────────────────────────────▶

t0         t2         t4         t6         t8         t10        t12
|----------|----------|----------|----------|----------|----------|

Worker sends:   hb1        hb2        hb3        X          X
Monitor state:  HEALTHY    HEALTHY    HEALTHY    SUSPECT    DEAD?
```

A better design often waits for multiple missing intervals or a larger suspicion window before taking irreversible actions.

### Adaptive Failure Detectors Exist for a Reason

Some systems use adaptive detectors rather than fixed "three misses means dead" rules. The durable idea is not any one algorithm. It is this:

```text
Recent heartbeat history
should influence how quickly
you suspect failure.
```

If the network is usually very stable, shorter thresholds may be reasonable. If latency is bursty, fixed low thresholds can be noisy.

### Failure Detection and Authority Are Different Decisions

You can suspect a node quickly without immediately:
- promoting a new primary
- reassigning exclusive work
- deleting presence records permanently

That separation is important. The system often benefits from:
1. detecting suspicion quickly
2. validating safer evidence
3. changing authority only when the consequences are acceptable


# 5. Tuning Intervals, Timeouts, and Payloads

Heartbeat tuning is where many designs become either too sluggish or too trigger-happy.

### Start From the Detection Budget

Ask first:
- how fast do you need to notice trouble
- how expensive is a false positive
- how noisy is the runtime and network
- what recovery action will follow the signal

A rough mental model is:

```text
Approximate detection time
  ≈ heartbeat interval × tolerated misses
    + timeout slack
```

That is only a planning aid, not a guarantee. Real systems also include scheduler delays, queueing, retransmissions, and monitor load.

### Common Knobs and Their Trade-Offs

```text
┌──────────────────────┬──────────────────────────────┬──────────────────────────────┐
│ Knob                 │ Too low                      │ Too high                     │
├──────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ interval             │ extra traffic, false alarms  │ slow detection               │
├──────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ timeout              │ transient delays look fatal  │ stale nodes linger too long  │
├──────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ tolerated misses     │ eager failover               │ sluggish recovery            │
├──────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ payload size         │ too little context           │ overhead and coupling        │
└──────────────────────┴──────────────────────────────┴──────────────────────────────┘
```

### Add Jitter to Avoid Herd Effects

If thousands of nodes all send a heartbeat every exact second, the monitor receives synchronized bursts. Small random jitter often helps smooth traffic and reduce thundering-herd behavior.

### Prefer Monotonic Time for Local Elapsed Measurements

For local timeout evaluation, monotonic elapsed time is safer than wall-clock time because wall clocks can jump due to:
- clock synchronization adjustments
- VM suspension or resume
- daylight-saving or configuration mistakes

The chapter on clocks covers the deeper issue. The practical heartbeat rule is simpler:
- measure local intervals with a monotonic source when possible
- avoid using remote wall-clock timestamps as proof of ordering or correctness

### Keep the Payload Focused

A heartbeat payload often works well when it includes:
- who sent it
- which generation it belongs to
- what sequence number it carries
- minimal health or capacity hints needed for decisions

It often becomes brittle when it also tries to carry:
- large diagnostic blobs
- detailed metrics snapshots
- schema-heavy state dumps
- optional fields that many receivers do not need

### Tune Recovery With the Action in Mind

Faster detection is useful only if the following action is safe.

Examples:
- removing a node from a read-only traffic pool may tolerate aggressive suspicion
- failing over a primary database should usually be more conservative
- reassigning idempotent background jobs can often sit in the middle


# 6. Common Uses for Heartbeats

Heartbeats appear in many places because "Who is still here?" is a common distributed-systems question.

### Membership and Service Presence

A service registry or coordinator can track which instances are currently present.

```text
Service instance ───── renew / heartbeat ─────▶ Registry
Client / router  ───── read live set ────────▶ Registry
```

This is useful when:
- instances scale up and down dynamically
- clients need a current target list
- stale entries should disappear automatically

### Leader and Replica Coordination

Replicas or followers often monitor whether the current leader still seems reachable. Leaders may also emit heartbeats to:
- show they still hold the role
- keep followers from starting unnecessary elections
- communicate term or commit progress

This is one reason heartbeats show up in discussions about leader election and split-brain prevention. The heartbeat is usually just one ingredient. Quorum, terms, and fencing still matter.

### Worker Pools and Schedulers

Schedulers often use heartbeats to answer:
- which workers are available
- which workers are overloaded
- which jobs need reassignment after a worker disappears

This is especially valuable when work runs for minutes or hours and user traffic alone cannot reveal worker loss quickly.

### Load Balancing and Routing

Some systems use heartbeats or probes to keep bad targets out of rotation. That helps:
- reduce failed requests
- avoid routing to drained or unhealthy instances
- keep traffic shifting faster than manual intervention would

### Replication and Long-Lived Connections

Heartbeats are also useful on long-lived links:
- replica-to-replica channels
- stream consumers and brokers
- keep-alive connections where inactivity would otherwise hide a broken path

The exact mechanics differ, but the core pattern is the same: periodic signals reduce ambiguity about a silent connection.

### Observability and Alerting

A missing heartbeat can itself become an alert signal:
- no heartbeat from a worker group
- no lease renewal from a leader
- no periodic completion signal from a scheduled task

That is operationally useful, but it still needs context. A missing heartbeat may signal trouble in the emitter, the observer, or the path between them.


# 7. Heartbeats vs Health Checks, Leases, and Consensus

Heartbeats are useful, but they are not a complete coordination system by themselves.

### Heartbeat vs Health Check

A heartbeat usually answers:
- did I hear from this component recently

A health check more often answers:
- can this component currently perform a specific class of work safely

A process can emit heartbeats and still fail a readiness or dependency health check. For example, it may have a live runtime but no database connectivity.

### Heartbeat vs Lease

A heartbeat is a signal.
A lease is time-bounded authority or presence recorded against an expiry.

```text
Heartbeat:
  "I am here."

Lease:
  "I am allowed to act until time T,
   unless renewal stops."
```

Many systems combine them by making the heartbeat itself renew a lease.

### Heartbeat vs Consensus or Quorum

Consensus and quorum-based systems use heartbeats too, but the heartbeat does not replace agreement logic.

A missed heartbeat may make a leader suspect.
It does not, by itself:
- prove a majority agrees on a new leader
- revoke stale write authority everywhere
- reconcile conflicting histories

That is why heartbeat-only failover is dangerous for one-writer systems.

### A Practical Comparison

```text
┌──────────────────────┬──────────────────────────────────────────────────────┐
│ Mechanism            │ Main purpose                                         │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ heartbeat            │ recent liveness signal                               │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ health check         │ deeper readiness or dependency validation            │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ lease                │ bounded presence or authority with expiry            │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ quorum / consensus   │ coordinated agreement under distributed uncertainty  │
└──────────────────────┴──────────────────────────────────────────────────────┘
```

### Combine Mechanisms Deliberately

A common safe posture looks like this:
- heartbeat or probe to detect silence
- health checks to decide readiness for traffic
- lease or quorum to decide authority
- fencing or idempotency to protect against stale actors

The important habit is not asking one small packet to carry the whole correctness model.


# 8. Failure Modes and Design Pitfalls

Heartbeat systems are deceptively simple. Many production issues come from the recovery logic around them, not the packet format.

### False Positives From Local Pauses or Load

A node may miss heartbeats because:
- the runtime paused
- the event loop stalled
- CPU saturation delayed the sender
- the receiver was backlogged

If the heartbeat sender is not coupled to the critical work path, it can also produce the opposite problem: "looks alive" while the real service is stuck.

### Network Partitions and Asymmetric Reachability

```text
Node A ───── heartbeat ─────▶ Monitor
Node A ◀XXXX observer reply XX Monitor
```

One side may see the other differently than vice versa. That matters for:
- bidirectional protocols
- failover logic
- diagnosing whether the sender or the observer is actually isolated

### Heartbeat-Only Failover Creates Dangerous Authority Bugs

A missed heartbeat is often enough to:
- mark a node `SUSPECT`
- remove it from traffic
- alert an operator

It is not usually enough, by itself, to:
- promote a new sole writer
- assume in-flight work definitely stopped
- delete or overwrite authoritative state

### Missing Generation IDs Causes Stale-State Confusion

If a process restarts with the same node name, old and new heartbeats can be confused unless you track a generation or boot ID. Without that, the system may:
- accept stale packets from a previous process
- let a restarted node inherit outdated ownership
- mis-handle delayed packets

### Synchronized Heartbeats Create Avoidable Load Spikes

Uniform intervals without jitter can cause:
- bursty CPU and network usage
- coordinated packet loss
- hotspot behavior in monitors or registries

### Oversized Payloads Increase Fragility

Turning heartbeats into mini-status dumps makes them:
- more expensive
- more tightly coupled across versions
- more sensitive to partial parsing failures
- harder to keep stable during incidents

### Good and Bad Heartbeat Posture

```text
Bad:
├── promote or reassign after one missed packet
├── treat timeout as proof of death
├── send large, version-fragile payloads
├── ignore generation IDs or lease expiry
└── reassign work without idempotency or fencing

Good:
├── distinguish HEALTHY, SUSPECT, and DEAD
├── separate suspicion from authority changes
├── keep payloads compact and version-tolerant
├── use generations, leases, or fencing where authority matters
└── tune intervals to the recovery action, not just the packet rate
```


# 9. Practical TypeScript Patterns

Application code cannot eliminate distributed uncertainty, but it can model liveness honestly and make recovery safer.

### Example 1: Track Heartbeats With Explicit Suspicion States

```typescript
type NodeId = string;

type HeartbeatMessage = {
  nodeId: NodeId;
  generationId: string;
  sequence: number;
  sentAtMs: number;
  queueDepth: number;
};

type NodeLiveness = "HEALTHY" | "SUSPECT" | "DEAD";

type NodeStatus = {
  generationId: string;
  lastSequence: number;
  lastReceivedAtMs: number;
  queueDepth: number;
  liveness: NodeLiveness;
};

class HeartbeatMonitor {
  private readonly nodes = new Map<NodeId, NodeStatus>();

  constructor(
    private readonly suspectAfterMs = 6_000,
    private readonly deadAfterMs = 15_000,
  ) {
    if (suspectAfterMs >= deadAfterMs) {
      throw new Error("suspectAfterMs must be smaller than deadAfterMs");
    }
  }

  record(message: HeartbeatMessage, receivedAtMs: number): void {
    const current = this.nodes.get(message.nodeId);

    if (
      current !== undefined &&
      current.generationId === message.generationId &&
      message.sequence <= current.lastSequence
    ) {
      return;
    }

    this.nodes.set(message.nodeId, {
      generationId: message.generationId,
      lastSequence: message.sequence,
      lastReceivedAtMs: receivedAtMs,
      queueDepth: message.queueDepth,
      liveness: "HEALTHY",
    });
  }

  evaluate(nowMs: number): Map<NodeId, NodeStatus> {
    const snapshot = new Map<NodeId, NodeStatus>();

    for (const [nodeId, status] of this.nodes) {
      const ageMs = nowMs - status.lastReceivedAtMs;

      if (ageMs >= this.deadAfterMs) {
        status.liveness = "DEAD";
      } else if (ageMs >= this.suspectAfterMs) {
        status.liveness = "SUSPECT";
      } else {
        status.liveness = "HEALTHY";
      }

      snapshot.set(nodeId, { ...status });
    }

    return snapshot;
  }
}
```

This is stronger than a plain `Map<nodeId, lastSeenAt>` because:
- the state model distinguishes suspicion from confirmed removal
- sequence numbers help ignore stale or duplicated packets
- generation IDs prevent a restarted process from being confused with the old one
- compact metadata such as `queueDepth` can inform routing without turning the heartbeat into a full metrics export

### Example 2: Renew a Lease Instead of Treating Heartbeat Reception as Authority

```typescript
type Lease = {
  resourceId: string;
  holderId: string;
  epoch: number;
  expiresAtMs: number;
};

interface LeaseStore {
  renew(input: {
    resourceId: string;
    holderId: string;
    nowMs: number;
    ttlMs: number;
  }): Promise<Lease | null>;
}

class InMemoryLeaseStore implements LeaseStore {
  private readonly leases = new Map<string, Lease>();

  async renew(input: {
    resourceId: string;
    holderId: string;
    nowMs: number;
    ttlMs: number;
  }): Promise<Lease | null> {
    const current = this.leases.get(input.resourceId);

    if (
      current !== undefined &&
      current.holderId !== input.holderId &&
      current.expiresAtMs > input.nowMs
    ) {
      return null;
    }

    const nextEpoch =
      current === undefined
        ? 1
        : current.holderId === input.holderId && current.expiresAtMs > input.nowMs
          ? current.epoch
          : current.epoch + 1;

    const lease: Lease = {
      resourceId: input.resourceId,
      holderId: input.holderId,
      epoch: nextEpoch,
      expiresAtMs: input.nowMs + input.ttlMs,
    };

    this.leases.set(input.resourceId, lease);
    return lease;
  }
}

interface FencedJobStore {
  claimJob(input: {
    jobId: string;
    workerId: string;
    epoch: number;
  }): Promise<boolean>;
}

class InMemoryFencedJobStore implements FencedJobStore {
  private readonly claimByJob = new Map<
    string,
    { workerId: string; highestEpoch: number }
  >();

  async claimJob(input: {
    jobId: string;
    workerId: string;
    epoch: number;
  }): Promise<boolean> {
    const current = this.claimByJob.get(input.jobId);

    if (current !== undefined) {
      if (input.epoch < current.highestEpoch) {
        return false;
      }

      if (input.epoch === current.highestEpoch) {
        return input.workerId === current.workerId;
      }
    }

    this.claimByJob.set(input.jobId, {
      workerId: input.workerId,
      highestEpoch: input.epoch,
    });

    return true;
  }
}

class QueueWorker {
  private lease: Lease | null = null;

  constructor(
    private readonly workerId: string,
    private readonly leaseStore: LeaseStore,
    private readonly jobStore: FencedJobStore,
  ) {}

  async renewPresence(nowMs: number): Promise<boolean> {
    this.lease = await this.leaseStore.renew({
      resourceId: "image-resizer-worker-group",
      holderId: this.workerId,
      nowMs,
      ttlMs: 4_000,
    });

    return this.lease !== null;
  }

  async claim(jobId: string, nowMs: number): Promise<boolean> {
    const lease = this.lease;

    if (lease === null || lease.expiresAtMs <= nowMs) {
      throw new Error("Worker does not hold a valid lease");
    }

    return this.jobStore.claimJob({
      jobId,
      workerId: this.workerId,
      epoch: lease.epoch,
    });
  }
}
```

This pattern separates two ideas that are often mixed together:
- heartbeats or renewals help maintain recent presence
- the lease store decides whether the worker still has authority
- the fenced job store can reject stale claim attempts from old generations

For exclusive work, that is much safer than "I sent a heartbeat recently, therefore I still own the job."

### Example 3: Add Jitter and Keep the Heartbeat Payload Minimal

```typescript
interface HeartbeatTransport {
  send(message: HeartbeatMessage): Promise<void>;
}

class HeartbeatLoop {
  private sequence = 0;

  constructor(
    private readonly transport: HeartbeatTransport,
    private readonly nodeId: string,
    private readonly generationId: string,
    private readonly baseIntervalMs: number,
    private readonly jitterRatio = 0.2,
  ) {
    if (baseIntervalMs <= 0) {
      throw new Error("baseIntervalMs must be positive");
    }
  }

  async sendOnce(nowMs: number, queueDepth: number): Promise<number> {
    this.sequence += 1;

    await this.transport.send({
      nodeId: this.nodeId,
      generationId: this.generationId,
      sequence: this.sequence,
      sentAtMs: nowMs,
      queueDepth,
    });

    return this.nextDelayMs();
  }

  private nextDelayMs(): number {
    const jitterWindowMs = this.baseIntervalMs * this.jitterRatio;
    const offsetMs = (Math.random() * 2 - 1) * jitterWindowMs;
    return Math.max(250, Math.round(this.baseIntervalMs + offsetMs));
  }
}
```

This helps in several ways:
- sequence numbers make replays and stale packets easier to identify
- `generationId` distinguishes restarts
- jitter reduces synchronized bursts across many nodes
- the payload stays small enough that missed heartbeats are less likely to be caused by the heartbeat mechanism itself

### TypeScript-Level Guardrails That Age Well

Useful habits include:
- model `HEALTHY`, `SUSPECT`, and `DEAD` explicitly instead of collapsing everything into a boolean
- pass `nowMs` into evaluation logic so time-based behavior stays testable
- keep a generation or boot ID on long-lived nodes
- separate liveness signals from write authority and ownership
- make reassignment, failover, or replay idempotent when heartbeat silence may trigger recovery

These are small code choices, but they keep heartbeat-driven systems much easier to reason about under stress.


# 10. Summary

**Heartbeats are periodic liveness signals, not proof of correctness.**
- They tell you that communication recently succeeded along some path.
- They do not prove that the sender is healthy enough for every workload or that it should keep exclusive authority.

**Silence should usually create suspicion before it creates irreversible action.**
- Missed heartbeats can come from crashes, pauses, overload, or network problems.
- Systems are safer when they model `SUSPECT` and `DEAD` separately and tie recovery actions to the actual business risk.

**Heartbeat design is mostly about what happens after a signal is missed.**
- Short intervals improve detection speed but increase noise sensitivity and background traffic.
- Safer systems pair heartbeats with leases, fencing, idempotency, or deeper health validation where authority matters.

**Small protocol details matter.**
- Sequence numbers, generation IDs, jitter, and compact payloads make heartbeat systems more robust and easier to operate.
- Oversized payloads and heartbeat-only failover logic create fragility quickly.

**Implementation checklist:**

```text
Protocol design:
  □ Decide whether push, pull, lease renewal, or peer-to-peer heartbeats fit the topology
  □ Include stable identity, generation ID, and sequence numbers in the message format
  □ Keep the payload compact and version-tolerant

Failure detection:
  □ Distinguish `HEALTHY`, `SUSPECT`, and `DEAD` instead of using a single boolean
  □ Tune interval, timeout, and tolerated misses to the recovery action and environment
  □ Use monotonic elapsed-time measurement locally when evaluating timeouts

Recovery and authority:
  □ Separate liveness detection from leadership, job ownership, or other exclusive authority
  □ Add leases, fencing, or idempotent replay protection before reassigning exclusive work
  □ Decide which actions are safe on suspicion and which require stronger evidence

Operations:
  □ Add jitter so large fleets do not synchronize heartbeat bursts
  □ Monitor missed-heartbeat rate, false suspicions, and recovery actions triggered by silence
  □ Rehearse pause, overload, partition, and stale-process scenarios before production
```
