# Chapter 9: Consistency and Consensus

## Introduction

The previous chapter explored all the ways things can go wrong in distributed systems: network faults, clocks drifting, processes pausing. Despite these problems, we still need to build reliable systems.

This chapter focuses on the algorithms and abstractions that help us build such systems:
- **Consistency guarantees:** What promises can a distributed system make about the data you see?
- **Consensus:** How can multiple nodes agree on something despite failures?

These are among the most important (and hardest) problems in distributed systems.

---

## Linearizability

### What Is Linearizability?

Linearizability is the strongest consistency guarantee. The basic idea is simple: **make it look like there's only one copy of the data**.

```
Linearizability Intuition:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  Even though there are multiple replicas...                           │
│                                                                        │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐                   │
│  │  Replica 1 │    │  Replica 2 │    │  Replica 3 │                   │
│  │   x = 5    │    │   x = 5    │    │   x = 5    │                   │
│  └────────────┘    └────────────┘    └────────────┘                   │
│                                                                        │
│  ...the system behaves AS IF there's only one:                        │
│                                                                        │
│                    ┌────────────────────┐                              │
│                    │    Single Copy     │                              │
│                    │       x = 5        │                              │
│                    └────────────────────┘                              │
│                                                                        │
│  All operations appear to happen atomically, in some real-time order │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

**Formal definition:**
1. All operations appear to execute atomically (instantaneously)
2. All operations appear in some total order
3. The order is consistent with real-time ordering (if op1 finishes before op2 starts, op1 appears first)

**The key property:** Once a read returns a new value, all subsequent reads must return that value or a newer one. You never go "back in time".

### Example: Non-Linearizable Behavior

```
Non-Linearizable System (problematic):

Client A:    write(x=1) ─────────────────────────────────────────→ OK
                                │
                                │ (during write propagation)
                                │
Client B:              read(x) ─┼───────────────────────────────→ x=1
                                │
Client C:              read(x) ─┴───────────────────────────────→ x=0 (stale!)
                                                                    ↑
                                                                    └── PROBLEM!

Client B saw x=1, then Client C saw x=0
If this is linearizable, once someone sees 1, everyone must see 1 (or newer)
But C saw 0 AFTER B saw 1 - this violates linearizability!
```

**Linearizable behavior:**

```
Linearizable System:

Time ──────────────────────────────────────────────────────────────────→

Client A:    |─── write(x=1) ───|
                       ↓
              The write takes effect at some point in this interval
              Let's say HERE (atomically, instantaneously)

Client B:              |── read(x) ──|  → must return 1 (write already happened)

Client C:                   |── read(x) ──|  → must return 1 (can't go backward)

Once the write "happens" (at the ↓ point), all subsequent reads see it.
```

### Linearizability vs Serializability

These terms sound similar but mean different things:

```
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  SERIALIZABILITY                        LINEARIZABILITY                │
│  (Transaction isolation)                (Recency guarantee)            │
│                                                                        │
│  ┌─────────────────────────────┐        ┌─────────────────────────────┐│
│  │ Transactions execute in     │        │ Operations on single object ││
│  │ SOME serial order           │        │ respect real-time order     ││
│  │                             │        │                             ││
│  │ Multiple objects involved   │        │ Single object (register)    ││
│  │                             │        │                             ││
│  │ Order may differ from       │        │ Order matches wall-clock    ││
│  │ real-time order             │        │ time                        ││
│  └─────────────────────────────┘        └─────────────────────────────┘│
│                                                                        │
│  Example:                               Example:                       │
│  T1 reads x, writes y                   read(x) at 10:00 → 5           │
│  T2 reads y, writes x                   write(x=7) at 10:01            │
│  Serializable: T1 before T2             read(x) at 10:02 → must be 7   │
│  OR T2 before T1                        (can't return 5)               │
│                                                                        │
│  STRICT SERIALIZABILITY = Both combined                                │
│  (Transactions in real-time serial order, each operation linearizable) │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

### When Do You Need Linearizability?

**1. Leader Election:**

```
Single-Leader System: Only one node must be leader at any time

Scenario without linearizability:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  Node A: "I am the leader" (wrote leader=A)                           │
│  Node B: reads leader → sees "none" (stale read)                      │
│  Node B: "I am the leader" (writes leader=B)                          │
│                                                                        │
│  Now BOTH think they're leader = SPLIT BRAIN!                         │
│                                                                        │
│  This is why ZooKeeper/etcd provide linearizable operations           │
│  for leader election                                                   │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

**2. Uniqueness Constraints:**

```
Username Registration:

Alice:    if not exists("bob") → create("bob")
                     │
Charlie:  if not exists("bob") → create("bob")
                     │
Both see "bob" doesn't exist (concurrent reads)
Both create user "bob"
Now there are two users named "bob"!

Linearizable check-and-set would ensure only one succeeds.
```

**3. Cross-Channel Timing Dependencies:**

```
Image Processing System:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  1. User uploads image                                                │
│  2. Web server stores image in file storage                           │
│  3. Web server sends message to queue: "process image X"              │
│  4. Image processor receives message, reads image from storage        │
│                                                                        │
│  Problem: Step 4 might happen BEFORE step 2 is visible to processor  │
│                                                                        │
│  Web Server:     write(image) ──────────────→ send(queue, "process")  │
│                        │                            │                  │
│                        │ (replication lag)          │ (message)        │
│                        ↓                            ↓                  │
│  File Storage:  ──────────────────────────────  [visible later]       │
│                                                                        │
│  Processor:     ←─────────── read(image) FAILS! ──── recv(queue)      │
│                     (image not yet replicated)                         │
│                                                                        │
│  Fix: Either linearizable storage, or include image in message        │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

### Implementing Linearizability

**Which systems are linearizable?**

```
┌───────────────────────────────────────────────────────────────────────┐
│ Replication Method         │ Linearizable?                            │
├────────────────────────────┼──────────────────────────────────────────┤
│                            │                                          │
│ Single-leader replication  │ Potentially YES                          │
│                            │ - Only if reads go to leader             │
│                            │ - Can break during failover              │
│                            │                                          │
│ Multi-leader replication   │ NO                                       │
│                            │ - Concurrent writes on multiple leaders  │
│                            │ - No total order                         │
│                            │                                          │
│ Leaderless replication     │ Probably NO                              │
│                            │ - Even with quorums, can be non-linear   │
│                            │ - "Sloppy quorums" definitely no         │
│                            │                                          │
│ Consensus algorithms       │ YES                                      │
│ (Raft, Paxos, Zab)        │ - Designed for linearizability           │
│                            │ - Used by etcd, ZooKeeper, Consul        │
│                            │                                          │
└───────────────────────────────────────────────────────────────────────┘
```

**Why quorums aren't enough:**

```
Leaderless with quorum reads/writes can still be non-linearizable:

3 nodes: A, B, C
Write quorum = 2, Read quorum = 2

Time →

Writer:  write(x=1) to A and B      (quorum satisfied)
         ───────────────────────────────────────────────→

Reader 1: read from B and C
          B has x=1, C has x=0 (not yet replicated)
          Returns x=1 ✓

Reader 2: read from A and C
          A has x=1, C has x=0
          Returns x=0 (picked C's value) ✗ STALE!

Even though quorums overlap, timing can cause stale reads.
Reader 2 read AFTER Reader 1, but got an older value.
```

### The Cost of Linearizability

**CAP Theorem:**

```
┌───────────────────────────────────────────────────────────────────────┐
│                         CAP Theorem                                    │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  You can have at most TWO of:                                         │
│                                                                        │
│  C - Consistency (linearizability)                                    │
│  A - Availability (every request gets a response)                     │
│  P - Partition tolerance (works despite network failures)             │
│                                                                        │
│  Since network partitions WILL happen, you must choose:               │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ During a network partition:                                     │  │
│  │                                                                  │  │
│  │ CP System (Consistent):                                         │  │
│  │   "Sorry, I can't serve your request right now"                 │  │
│  │   → Returns error or blocks until partition heals               │  │
│  │   → No stale/inconsistent data                                  │  │
│  │                                                                  │  │
│  │ AP System (Available):                                          │  │
│  │   "Here's your data (might be stale though)"                    │  │
│  │   → Always returns some response                                │  │
│  │   → May return outdated data                                    │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Note: When there's NO partition, you can have both C and A           │
│  The trade-off only kicks in during failures                          │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

**Performance cost:**

Even without partitions, linearizability has costs:
- Requires coordination between nodes
- Cross-datacenter latency (~100ms+ round trip)
- Limits throughput (can't parallelize conflicting operations)

This is why many systems choose weaker consistency models.

---

## Ordering Guarantees

### Causality

Linearizability provides a total order (all events can be compared), but it's expensive. Causality is a weaker but often sufficient guarantee.

**Causal ordering:** If event A could have influenced event B, then A must come before B in any ordering.

```
Causal Relationships:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  Causally Related (must be ordered):                                  │
│                                                                        │
│  1. Same process:                                                     │
│     A: write(x=1)  ────────────→  B: read(y)                          │
│     A happened-before B (same thread/process)                         │
│                                                                        │
│  2. Message passing:                                                   │
│     Process 1: send(m) ─────────────→ Process 2: receive(m)           │
│     Send happened-before receive                                       │
│                                                                        │
│  3. Transitivity:                                                      │
│     If A → B and B → C, then A → C                                    │
│                                                                        │
│  Concurrent (no causal relationship):                                 │
│                                                                        │
│  Process 1:  write(x=1)                                               │
│                                                                        │
│  Process 2:  write(y=2)         ← No message between them            │
│                                    Neither caused the other           │
│                                    Can be ordered either way          │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

**Linearizability implies causality, but not vice versa:**

- Linearizability: Total order respecting real-time
- Causality: Partial order respecting cause-effect

Causal consistency is the strongest model that doesn't require synchronization across all nodes, making it much more efficient than linearizability.

### Lamport Timestamps

A way to create a total order without synchronized clocks:

```
Lamport Timestamps:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  Each node has a counter                                              │
│                                                                        │
│  Node A (counter=1)          Node B (counter=1)                       │
│       │                           │                                    │
│       │ op1: A sends message      │                                    │
│       │ timestamp = (1, A)        │                                    │
│       │ counter++ → 2             │                                    │
│       │─────────────────────────────→ receives message                │
│       │                           │ max(1, 1) + 1 = 2                  │
│       │                           │ timestamp = (2, B)                 │
│       │                           │ counter = 2                        │
│       │                           │                                    │
│       │ op2: A does something     │                                    │
│       │ timestamp = (2, A)        │ op3: B does something             │
│       │ counter++ → 3             │ timestamp = (3, B)                │
│       │                           │ counter++ → 3                      │
│       ↓                           ↓                                    │
│                                                                        │
│  Ordering: (1,A) < (2,A) < (2,B) < (3,B)                              │
│  Compare counter first, then node ID as tiebreaker                    │
│                                                                        │
│  Properties:                                                           │
│  + Total order (every pair can be compared)                           │
│  + Consistent with causality                                          │
│  - Only useful after the fact (can't decide in real-time)             │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

**The limitation of Lamport timestamps:**

```
Problem: Uniqueness constraint with Lamport timestamps

Node A:                        Node B:
create user "bob"              create user "bob"
timestamp (5, A)               timestamp (5, B)

We can order these: (5, A) < (5, B)

But we can't PREVENT both from succeeding!
At the time each node processes the request, it doesn't know
if there's a concurrent request on another node.

Lamport timestamps tell you the order AFTER the fact,
but for uniqueness constraints, you need to know NOW.
```

This is why we need total order broadcast and consensus.

### Total Order Broadcast

Total order broadcast is a protocol that guarantees:
1. **Reliable delivery:** If a message is delivered to one node, it's delivered to all
2. **Total order:** All nodes receive messages in the same order

```
Total Order Broadcast:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  Messages are delivered in the same order to all nodes:               │
│                                                                        │
│  Sender:  broadcast(m1)  broadcast(m2)  broadcast(m3)                 │
│                │              │              │                         │
│                ↓              ↓              ↓                         │
│  Node A:      m1      →     m2      →     m3                          │
│  Node B:      m1      →     m2      →     m3                          │
│  Node C:      m1      →     m2      →     m3                          │
│                                                                        │
│  Every node sees: m1, then m2, then m3                                │
│  (not necessarily at the same wall-clock time, but in same order)    │
│                                                                        │
│  Use cases:                                                            │
│  - Database replication: All replicas apply writes in same order     │
│  - Serializable transactions: Order commits                           │
│  - Distributed logs: Kafka, Raft log                                  │
│  - Fencing tokens: Monotonically increasing sequence numbers          │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

**Total order broadcast is equivalent to consensus:**

If you can solve total order broadcast, you can solve consensus (and vice versa).

---

## Consensus

### The Consensus Problem

**Definition:** Multiple nodes must agree on a value. Once decided, the decision is final.

```
Consensus Requirements:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  1. UNIFORM AGREEMENT                                                 │
│     All nodes that decide must decide the same value                  │
│     ┌────┐  ┌────┐  ┌────┐                                            │
│     │ v1 │  │ v1 │  │ v1 │  ← All decided v1 ✓                       │
│     └────┘  └────┘  └────┘                                            │
│                                                                        │
│  2. INTEGRITY                                                          │
│     Each node decides at most once                                    │
│     No flip-flopping                                                   │
│                                                                        │
│  3. VALIDITY                                                           │
│     If a node decides v, then v was proposed by some node             │
│     (Can't decide on random/arbitrary values)                         │
│                                                                        │
│  4. TERMINATION                                                        │
│     Every non-crashed node eventually decides something               │
│     (Liveness property - can be weakened during partitions)           │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

**Where is consensus used?**
- Leader election
- Atomic commit (distributed transactions)
- Total order broadcast
- Uniqueness constraints
- Lock services

### Two-Phase Commit (2PC)

The classic protocol for distributed atomic commits:

```
Two-Phase Commit Protocol:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│                        COORDINATOR                                     │
│                             │                                          │
│                             │ "Transaction T1"                         │
│                             │                                          │
│  ════════════════════ PHASE 1: PREPARE ════════════════════════════   │
│                             │                                          │
│            ┌────────────────┼────────────────┐                         │
│            │                │                │                         │
│            ↓                ↓                ↓                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │ Participant A│  │ Participant B│  │ Participant C│                 │
│  │              │  │              │  │              │                 │
│  │ Can commit?  │  │ Can commit?  │  │ Can commit?  │                 │
│  │     YES ✓    │  │     YES ✓    │  │     YES ✓    │                 │
│  │              │  │              │  │              │                 │
│  │ (writes to   │  │ (writes to   │  │ (writes to   │                 │
│  │  disk: ready │  │  disk: ready │  │  disk: ready │                 │
│  │  to commit)  │  │  to commit)  │  │  to commit)  │                 │
│  └──────────────┘  └──────────────┘  └──────────────┘                 │
│            │                │                │                         │
│            └────────────────┼────────────────┘                         │
│                             │                                          │
│  ════════════════════ PHASE 2: COMMIT ═════════════════════════════   │
│                             │                                          │
│         Coordinator decides: ALL said YES → COMMIT                    │
│         (writes decision to disk)                                     │
│                             │                                          │
│            ┌────────────────┼────────────────┐                         │
│            ↓                ↓                ↓                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │ Participant A│  │ Participant B│  │ Participant C│                 │
│  │    COMMIT    │  │    COMMIT    │  │    COMMIT    │                 │
│  │      ✓       │  │      ✓       │  │      ✓       │                 │
│  └──────────────┘  └──────────────┘  └──────────────┘                 │
│                                                                        │
│  If ANY participant said NO → ABORT all                               │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

**The problem with 2PC: Coordinator failure**

```
Coordinator Failure Scenario:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  1. Coordinator sends PREPARE to all                                  │
│  2. All participants reply YES                                        │
│  3. Coordinator writes COMMIT decision                                │
│  4. ┌─────────────────────────────────────────────────────────────┐   │
│     │ COORDINATOR CRASHES before sending commit                   │   │
│     └─────────────────────────────────────────────────────────────┘   │
│  5. Participants are stuck:                                           │
│     - They promised to commit (said YES)                             │
│     - They can't commit (didn't get COMMIT message)                  │
│     - They can't abort (might have been COMMIT)                      │
│     - They MUST WAIT for coordinator to recover                      │
│                                                                        │
│  Participants hold locks on data, blocking all other transactions!   │
│                                                                        │
│  This is why 2PC is a "blocking" protocol                            │
│  Coordinator is single point of failure                               │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

### Consensus Algorithms: Raft

Raft is a consensus algorithm designed to be understandable. Used by etcd, Consul, CockroachDB.

```
Raft Overview:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  KEY CONCEPTS:                                                        │
│                                                                        │
│  1. LEADER ELECTION                                                   │
│     - One node is leader at a time                                    │
│     - Leader handles all client requests                              │
│     - If leader fails, new election                                   │
│                                                                        │
│  2. TERMS (epochs)                                                    │
│     - Monotonically increasing numbers                                │
│     - Each term has at most one leader                                │
│     - New term = new election                                         │
│                                                                        │
│  3. LOG REPLICATION                                                   │
│     - Leader appends to its log                                       │
│     - Replicates to followers                                         │
│     - Committed once majority acknowledge                             │
│                                                                        │
│  HOW IT WORKS:                                                        │
│                                                                        │
│  Term 1: Node A is leader                                             │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ Leader A        Follower B       Follower C                    │   │
│  │    │                │                │                         │   │
│  │ Client: write(x=5)  │                │                         │   │
│  │    │                │                │                         │   │
│  │ Append to log      │                │                         │   │
│  │ [term1: x=5]       │                │                         │   │
│  │    │                │                │                         │   │
│  │    ├───────────────→│ replicate      │                         │   │
│  │    │                │ [term1: x=5]   │                         │   │
│  │    │                │     ✓ ACK      │                         │   │
│  │    │                │                │                         │   │
│  │    ├────────────────────────────────→│ replicate              │   │
│  │    │                │                │ [term1: x=5]           │   │
│  │    │                │                │     ✓ ACK              │   │
│  │    │                │                │                         │   │
│  │ Majority (2/3) acknowledged → COMMITTED                        │   │
│  │ Reply to client: success                                       │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  If leader fails:                                                     │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ 1. Followers don't receive heartbeat (timeout)                 │   │
│  │ 2. Follower becomes candidate, starts election for term 2      │   │
│  │ 3. Asks other nodes for votes                                  │   │
│  │ 4. Gets majority votes → becomes new leader                    │   │
│  │ 5. Continues from where previous leader left off               │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

**Why Raft is safe:**

```
Safety Guarantees:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  1. ELECTION SAFETY: At most one leader per term                      │
│     - Need majority vote to become leader                             │
│     - Two majorities always overlap                                   │
│     - Can't have two leaders in same term                            │
│                                                                        │
│  2. LEADER COMPLETENESS: Committed entries appear in future leaders  │
│     - To be elected, must have all committed entries                  │
│     - Voter won't vote for candidate with shorter log                │
│                                                                        │
│  3. STATE MACHINE SAFETY: All nodes execute same commands            │
│     - Same log → same state                                          │
│     - Log is replicated identically                                   │
│                                                                        │
│  Why quorums work:                                                    │
│  5-node cluster, majority = 3                                         │
│                                                                        │
│  Write quorum:    {A, B, C}        (committed entry)                 │
│  Election quorum: {B, C, D}        (must overlap)                    │
│                      ↓                                                │
│  B and C are in both - they know about the committed entry          │
│  New leader MUST get vote from B or C                                │
│  So new leader knows about the committed entry                       │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

### Limitations of Consensus

```
Consensus Trade-offs:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  1. REQUIRES MAJORITY                                                 │
│     - 3-node cluster tolerates 1 failure                             │
│     - 5-node cluster tolerates 2 failures                            │
│     - N-node cluster tolerates (N-1)/2 failures                      │
│     - If majority fails → system stops                               │
│                                                                        │
│  2. PERFORMANCE LIMITED BY SLOWEST NODE                              │
│     - Must wait for majority to acknowledge                          │
│     - If one node is slow (network, disk), it slows everything       │
│                                                                        │
│  3. NETWORK PARTITIONS BLOCK MINORITY                                │
│     - Minority side cannot make progress                             │
│     - This is by design (prevents split-brain)                       │
│                                                                        │
│  4. RECONFIGURATION IS HARD                                          │
│     - Adding/removing nodes requires careful coordination            │
│     - Many implementations don't support dynamic membership          │
│                                                                        │
│  5. LATENCY                                                           │
│     - At least one round-trip to majority                            │
│     - Cross-datacenter: hundreds of milliseconds                     │
│     - This is unavoidable for consensus                              │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Coordination Services

### ZooKeeper, etcd, and Consul

These are "coordination services" - they implement consensus so your application doesn't have to.

```
What Coordination Services Provide:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  LINEARIZABLE KEY-VALUE STORE                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ - Small amount of data that fits in memory                      │  │
│  │ - Not for general data storage!                                 │  │
│  │ - Good for: config, service registry, locks                     │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ATOMIC OPERATIONS                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ - compare-and-set                                               │  │
│  │ - Creates key only if it doesn't exist                          │  │
│  │ - Enables distributed locks                                     │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  TOTAL ORDERING                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ - Fencing tokens (monotonically increasing)                     │  │
│  │ - Transaction IDs                                               │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  FAILURE DETECTION                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ - Sessions with heartbeats                                      │  │
│  │ - Ephemeral nodes (deleted when session ends)                   │  │
│  │ - Detect crashed clients                                        │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  CHANGE NOTIFICATIONS                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ - Watch for changes                                             │  │
│  │ - Subscribe to updates                                          │  │
│  │ - React to config changes, leader changes, etc.                │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

### Common Use Cases

**1. Leader Election:**

```
Leader Election with ZooKeeper:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  1. Each node tries to create ephemeral node "/leader"               │
│     - Only one succeeds (atomic operation)                           │
│     - That node becomes leader                                        │
│                                                                        │
│  2. Other nodes watch "/leader"                                       │
│     - Get notified when it changes                                    │
│                                                                        │
│  3. If leader crashes:                                                │
│     - Session ends                                                    │
│     - Ephemeral "/leader" node is deleted                            │
│     - Watchers notified                                               │
│     - New election begins                                             │
│                                                                        │
│  Node A: create("/leader", ephemeral) → SUCCESS, I'm leader          │
│  Node B: create("/leader", ephemeral) → FAIL, watch it               │
│  Node C: create("/leader", ephemeral) → FAIL, watch it               │
│                                                                        │
│  [Node A crashes]                                                     │
│                                                                        │
│  ZooKeeper: deletes "/leader" (session timeout)                      │
│  Node B: notified, tries create("/leader") → SUCCESS, new leader     │
│  Node C: notified, tries create("/leader") → FAIL, watch it          │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

**2. Service Discovery:**

```
Service Discovery:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  Service instances register themselves:                               │
│                                                                        │
│  /services/                                                           │
│      /user-service/                                                   │
│          /instance-1  {host: "10.0.0.1", port: 8080}  (ephemeral)    │
│          /instance-2  {host: "10.0.0.2", port: 8080}  (ephemeral)    │
│          /instance-3  {host: "10.0.0.3", port: 8080}  (ephemeral)    │
│      /order-service/                                                  │
│          /instance-1  {host: "10.0.0.10", port: 8081} (ephemeral)    │
│                                                                        │
│  Clients watch /services/user-service/ for changes                   │
│  When instance crashes → ephemeral node deleted → clients notified   │
│  When new instance starts → node created → clients notified          │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Key Takeaways

1. **Linearizability** is the strongest consistency: acts like single copy, respects real-time order. But it's expensive and limits performance.

2. **CAP theorem:** During network partition, choose consistency (return error) or availability (return potentially stale data). You can't have both.

3. **Causality** is weaker than linearizability but often sufficient. It only orders events that could have affected each other, allowing more parallelism.

4. **Lamport timestamps** create a total order consistent with causality, but can't be used for real-time decisions like uniqueness constraints.

5. **Total order broadcast** ensures all nodes see messages in the same order. It's equivalent to consensus and is the foundation for replicated state machines.

6. **Two-phase commit (2PC)** is simple but blocking - if coordinator fails, participants are stuck waiting.

7. **Consensus algorithms (Raft, Paxos)** enable fault-tolerant agreement:
   - Require majority to make progress
   - Leader-based (one proposer, others follow)
   - Survive minority failures
   - Used for leader election, total order broadcast, atomic commits

8. **Coordination services (ZooKeeper, etcd)** implement consensus so you don't have to:
   - Use for: locks, leader election, service discovery, config
   - NOT for general data storage
   - Provide linearizable operations, failure detection, change notifications

9. **Use consensus sparingly:** It's expensive (latency, coordination). Most applications can use weaker consistency with careful design.

10. **When you need linearizability:** Leader election, uniqueness constraints, cross-channel coordination. For everything else, consider whether causal consistency is sufficient.
