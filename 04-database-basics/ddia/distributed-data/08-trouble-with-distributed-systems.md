# Chapter 8: The Trouble with Distributed Systems

## Introduction

Working with a single computer is relatively straightforward. If something goes wrong, the software either works or it doesn't. If the hardware fails, the computer usually stops completely - you don't get partial results or uncertain states.

**Distributed systems are fundamentally different.** When you're building a system that runs on multiple computers connected by a network, an entirely new class of problems emerges. The system can partially fail: some parts work while others don't. These partial failures are **nondeterministic** - if you try the same operation again, it might succeed or fail differently.

This chapter explores everything that can go wrong in a distributed system. Understanding these problems is essential for designing systems that remain reliable despite failures.

---

## Faults and Partial Failures

### Single Computer vs Distributed System

**On a single computer, things are deterministic:**

```
┌────────────────────────────────────────────────────────────────────┐
│                        Single Computer                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Operation result:                                                  │
│                                                                     │
│  ┌─────────────────┐        ┌─────────────────┐                    │
│  │     Works       │   OR   │     Fails       │                    │
│  │   correctly     │        │   completely    │                    │
│  └─────────────────┘        └─────────────────┘                    │
│                                                                     │
│  - If hardware has a problem, usually crashes completely           │
│  - Software bugs are deterministic (same input → same result)      │
│  - No "maybe worked" state                                         │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

When software runs on a single computer, it either works correctly or fails completely. If there's a hardware problem (memory fault, CPU error), the computer typically crashes. You don't usually get corrupted results without knowing about it.

**In a distributed system, partial failures are normal:**

```
┌────────────────────────────────────────────────────────────────────┐
│                     Distributed System                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐          │
│  │ Node A │     │ Node B │     │ Node C │     │ Node D │          │
│  │   ✓    │     │   ?    │     │   ✗    │     │   ✓    │          │
│  │ working│     │ slow?  │     │  dead  │     │ working│          │
│  └────────┘     └────────┘     └────────┘     └────────┘          │
│      │              │              │              │                │
│      └──────────────┴──────────────┴──────────────┘                │
│                         Network                                     │
│                     (also unreliable)                               │
│                                                                     │
│  Possible states:                                                   │
│  - Node C is crashed                                               │
│  - Is Node B dead or just slow? We can't tell!                     │
│  - Did our message reach Node B? Unknown!                          │
│  - Network partition between some nodes                            │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

Some parts of the system may be working fine while others fail. And the **failure is nondeterministic**: if you try the same operation twice, you might get different results.

### Cloud Computing vs High-Performance Computing (HPC)

Different approaches to handling failures:

**HPC Approach (Supercomputers):**
```
1. Checkpoint regularly (save state to durable storage)
2. If any node fails → stop everything
3. Restart entire computation from last checkpoint
4. Assumes failures are rare

Best for: Batch computing jobs that can be restarted
```

**Cloud Approach:**
```
1. Assume nodes fail all the time (commodity hardware)
2. System must continue operating despite failures
3. No stopping - service must be always-on
4. Fault tolerance built into the system design

Best for: Internet services, real-time applications
```

---

## Unreliable Networks

In distributed systems, nodes communicate by sending messages over the network. The network is fundamentally unreliable.

### What Can Go Wrong?

When you send a request and don't receive a response, what happened?

```
Possible Scenarios When Request Gets No Response:

1. Request lost in transit:
   ┌──────┐    ✗ Request    ┌──────┐
   │Client│ ────────────→   │Server│
   └──────┘                 └──────┘
                            (never arrived)

2. Request waiting in queue:
   ┌──────┐    Request    ┌──────┐
   │Client│ ─────────────→│Queue │→│Server│
   └──────┘               └──────┘ (slow)

3. Remote node crashed:
   ┌──────┐    Request    ┌──────┐
   │Client│ ────────────→ │Server│ CRASHED
   └──────┘               └──────┘

4. Remote node is temporarily unresponsive:
   ┌──────┐    Request    ┌──────┐
   │Client│ ────────────→ │Server│ (GC pause)
   └──────┘               └──────┘

5. Remote node processed request, response lost:
   ┌──────┐    Request    ┌──────┐
   │Client│ ────────────→ │Server│ ✓ processed
   └──────┘  ✗ Response   └──────┘

6. Remote node processed request, response delayed:
   ┌──────┐    Request    ┌──────┐
   │Client│ ────────────→ │Server│ ✓ processed
   └──────┘  Response     └──────┘
           (delayed in network switch queue)
```

**The fundamental problem:** The sender has no way to distinguish between these scenarios. It only knows that no response was received.

### Timeouts and Unbounded Delays

The only reliable way to detect a failed node is through timeouts. But choosing the right timeout is tricky.

**The Timeout Dilemma:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Timeout Configuration                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Short Timeout (e.g., 100ms):                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ + Quickly detect failures                                          │ │
│  │ - More false positives (declare alive node dead)                   │ │
│  │ - May cause unnecessary failovers                                   │ │
│  │ - Node might be doing work when declared dead                      │ │
│  │ - Work gets duplicated when new node takes over                    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  Long Timeout (e.g., 30s):                                              │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ + Fewer false positives                                            │ │
│  │ - Long wait before detecting actual failures                       │ │
│  │ - Users experience long delays                                      │ │
│  │ - System seems unresponsive during failure                         │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  There is no "correct" timeout value!                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Why delays are unbounded:**

```
Network Congestion Example:

┌──────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│  Server A                     Network Switch                Server B      │
│  ┌──────┐                    ┌────────────────┐             ┌──────┐     │
│  │      │───────────────────→│ ┌────────────┐ │────────────→│      │     │
│  │      │  Packet            │ │   Queue    │ │             │      │     │
│  │      │                    │ │ ■ ■ ■ ■ ■ ■│ │             │      │     │
│  │      │                    │ │ ■ ■ ■ ■ ■ ■│ │ FULL!       │      │     │
│  │      │                    │ │ waiting... │ │             │      │     │
│  │      │                    │ └────────────┘ │             │      │     │
│  │      │                    │                │             │      │     │
│  └──────┘                    └────────────────┘             └──────┘     │
│                                                                           │
│  Causes of delays:                                                        │
│  - Switch queue full (packets wait or get dropped)                       │
│  - TCP flow control (sender waits for ACKs)                              │
│  - TCP retransmissions (lost packets retried)                            │
│  - VM network virtualization (additional queuing)                        │
│  - CPU saturation on receiver                                             │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### Synchronous vs Asynchronous Networks

**Telephone network (synchronous):**

```
Traditional Phone Call:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  When you make a phone call:                                          │
│                                                                        │
│  1. Circuit established with FIXED bandwidth allocation               │
│  2. 16 bits of audio every 250 μs (64 kbps) - guaranteed             │
│  3. No queuing - your slot is reserved                                │
│  4. Maximum end-to-end latency is bounded and predictable            │
│                                                                        │
│  Phone A ═══════════════════════════════════════════════════ Phone B  │
│           │<────── Reserved 64 kbps circuit ─────→│                   │
│           No one else can use this bandwidth                          │
│                                                                        │
│  Good for: Real-time voice (consistent latency required)             │
│  Bad for: Bursty data (wastes bandwidth when idle)                   │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

**Internet (asynchronous):**

```
Internet Data Transfer:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  Packet switching - no bandwidth reservation:                         │
│                                                                        │
│  Host A ──────→ ┌──────┐ ──────→ ┌──────┐ ──────→ Host B             │
│          packet │Router│  packet │Router│  packet                     │
│                 │Queue │         │Queue │                              │
│                 │■ ■ ■ │         │■     │                              │
│                 └──────┘         └──────┘                              │
│                                                                        │
│  - Packets share network capacity dynamically                         │
│  - More efficient for bursty traffic (web pages, downloads)          │
│  - No guaranteed latency                                               │
│  - Can have high throughput when network is available                 │
│                                                                        │
│  Good for: File transfers, web browsing, email                       │
│  Bad for: Real-time applications (latency unpredictable)             │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

Why did the internet choose packet switching? Because it's much more efficient for data traffic, which is bursty. A web page download uses high bandwidth for a brief moment, then nothing. Reserving a circuit would waste most of the capacity.

---

## Unreliable Clocks

Every computer has a clock, but clocks in different computers are not perfectly synchronized. This causes many subtle problems.

### Two Types of Clocks

**1. Time-of-day clocks:**

```
Time-of-Day Clock:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  What it tells you: "The current time is January 11, 2026 14:30:05"  │
│                                                                        │
│  APIs:                                                                 │
│  - Java: System.currentTimeMillis()                                   │
│  - Linux: clock_gettime(CLOCK_REALTIME)                               │
│  - Returns: Milliseconds since Unix epoch (Jan 1, 1970)               │
│                                                                        │
│  Characteristics:                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ ✓ Can be compared across machines (if synchronized)             │  │
│  │ ✗ Can JUMP forward or backward (NTP adjustments)                │  │
│  │ ✗ Can differ by several milliseconds across machines           │  │
│  │ ✗ Leap seconds can cause weirdness                              │  │
│  │ ✗ NOT suitable for measuring elapsed time                       │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Example of a jump:                                                   │
│  Time reading sequence: 14:30:00 → 14:30:01 → 14:29:58 (NTP sync!)   │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

**2. Monotonic clocks:**

```
Monotonic Clock:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  What it tells you: "837293847293 nanoseconds since... something"    │
│                                                                        │
│  APIs:                                                                 │
│  - Java: System.nanoTime()                                            │
│  - Linux: clock_gettime(CLOCK_MONOTONIC)                              │
│  - Returns: Some arbitrary number that only increases                 │
│                                                                        │
│  Characteristics:                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ ✓ ALWAYS moves forward (never jumps backward)                   │  │
│  │ ✓ Perfect for measuring durations                                │  │
│  │ ✗ Absolute value is meaningless                                 │  │
│  │ ✗ Cannot compare across different machines                      │  │
│  │ ✗ Might be reset on reboot                                      │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Correct usage:                                                        │
│  start = System.nanoTime()                                            │
│  // ... do something ...                                               │
│  elapsed = System.nanoTime() - start  // Valid!                       │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

### Clock Synchronization Problems

Clocks are synchronized using NTP (Network Time Protocol), but this has many issues:

```
NTP Synchronization Issues:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  ┌─────────────┐         Network          ┌─────────────┐             │
│  │  NTP Server │◄─────────────────────────│   Client    │             │
│  │  (accurate) │     (variable latency)   │  (drifting) │             │
│  └─────────────┘                          └─────────────┘             │
│                                                                        │
│  Problems:                                                             │
│                                                                        │
│  1. Network latency is variable                                       │
│     - NTP measures round-trip time to estimate delay                  │
│     - But asymmetric routes break this assumption                     │
│     - Result: Several milliseconds of error                           │
│                                                                        │
│  2. Clock adjustments can be abrupt                                   │
│     - If clock is too far off, NTP may JUMP it                        │
│     - Or it may slew (speed up/slow down) - takes time                │
│                                                                        │
│  3. Misconfigured NTP servers                                         │
│     - Some organizations have wrong NTP settings                      │
│     - Can sync to wrong time source                                   │
│                                                                        │
│  4. Firewalls blocking NTP                                            │
│     - Port 123/UDP blocked = no synchronization                       │
│     - Clock drifts without correction                                 │
│                                                                        │
│  5. Leap seconds                                                       │
│     - Earth's rotation is irregular                                   │
│     - Occasionally an extra second is added                           │
│     - Software may not handle this correctly                          │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

### Why This Matters: Timestamp Ordering

**The "Last Writer Wins" Problem:**

```
Two nodes writing to same key "concurrently":

Node A (clock slightly fast):         Node B (clock slightly slow):
┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│                                 │   │                                 │
│  Actual time: 14:30:00.000      │   │  Actual time: 14:30:00.100      │
│  Clock reads: 14:30:00.200      │   │  Clock reads: 14:30:00.000      │
│                                 │   │                                 │
│  WRITE key=X, value="A"         │   │  WRITE key=X, value="B"         │
│  timestamp = 14:30:00.200       │   │  timestamp = 14:30:00.000       │
│                                 │   │                                 │
└─────────────────────────────────┘   └─────────────────────────────────┘

Reality: Node A wrote first (at actual time 14:30:00.000)
         Node B wrote second (at actual time 14:30:00.100)

With "last write wins" based on timestamps:
   → Node A's write wins! (14:30:00.200 > 14:30:00.000)
   → But Node A wrote BEFORE Node B in reality!
   → Node B's write is silently dropped!

This is a DATA LOSS bug caused by clock skew.
```

**Event ordering across machines is fundamentally difficult:**

```
Ordering Events Across Machines:

Machine A:           Machine B:           Machine C:
    │                    │                    │
    │ event A1           │                    │
    ├────────────────────┼────────────────────┤
    │                    │ event B1           │
    ├────────────────────┼────────────────────┤
    │                    │                    │ event C1
    ├────────────────────┼────────────────────┤
    │ event A2           │                    │
    ↓                    ↓                    ↓

Question: Did A1 happen before B1?

Using timestamps: Maybe (if clocks are synchronized)
                  But we can't be sure!

The only events we can definitely order:
- Events on the SAME machine (use monotonic clock)
- Events with a CAUSAL relationship (A sent a message that B received)

Everything else is uncertain.
```

### Clock Confidence Intervals

Some systems acknowledge that timestamps have uncertainty:

```
Google TrueTime (used in Spanner):
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  Normal clock API:                                                     │
│    now() → 14:30:00.123                                               │
│    (Appears precise, but isn't really)                                │
│                                                                        │
│  TrueTime API:                                                         │
│    now() → [14:30:00.120, 14:30:00.126]                               │
│    "The current time is somewhere in this interval"                   │
│                                                                        │
│  How it works:                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  - GPS receivers and atomic clocks in every data center        │  │
│  │  - Cross-check multiple time sources                            │  │
│  │  - Track uncertainty based on time since last sync              │  │
│  │  - Expose uncertainty to application                            │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Commit Wait Protocol:                                                │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  1. Transaction gets commit timestamp T                         │  │
│  │  2. Wait until TrueTime.now().earliest > T                      │  │
│  │  3. Now guaranteed: No future transaction can have timestamp ≤ T│  │
│  │  4. Provides externally consistent transactions!                │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Typical uncertainty: ~7ms with GPS, more if GPS unavailable          │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Process Pauses

Even on a single machine, a process can be paused for an arbitrary amount of time without its knowledge.

### Causes of Pauses

```
Why Your Process Might Be Paused:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  1. GARBAGE COLLECTION                                                │
│     ┌─────────────────────────────────────────────────────────────┐   │
│     │ "Stop-the-world" GC pauses all application threads          │   │
│     │ Duration: Milliseconds to seconds                           │   │
│     │ Application cannot detect it's happening                    │   │
│     └─────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  2. VIRTUAL MACHINE SUSPENSION                                        │
│     ┌─────────────────────────────────────────────────────────────┐   │
│     │ Live migration: VM frozen while memory copied to new host   │   │
│     │ Can take several seconds                                    │   │
│     │ VM has no idea it was suspended                             │   │
│     └─────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  3. CONTEXT SWITCHING                                                 │
│     ┌─────────────────────────────────────────────────────────────┐   │
│     │ OS schedules other processes                                │   │
│     │ Your process gets no CPU time                               │   │
│     │ On overloaded system, can take seconds                      │   │
│     └─────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  4. DISK I/O WAIT                                                     │
│     ┌─────────────────────────────────────────────────────────────┐   │
│     │ Waiting for disk (especially if swapping)                   │   │
│     │ Memory-mapped files can cause unexpected disk reads         │   │
│     │ SSD: ~100 μs, HDD: ~10 ms, if disk is busy: much longer    │   │
│     └─────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  5. CTRL+Z (SIGSTOP)                                                  │
│     ┌─────────────────────────────────────────────────────────────┐   │
│     │ Process explicitly suspended                                │   │
│     │ Resumes when signaled                                       │   │
│     └─────────────────────────────────────────────────────────────┘   │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

### The Lease Expiry Problem

A classic problem caused by process pauses:

```
Distributed Lock with Expiring Lease:

Time →
Client A:    ┌──────────────────────────────────────────────────────────────┐
             │ 1. Gets lock (lease valid for 10 seconds)                    │
             │ 2. Starts processing                                         │
             │ 3. ┌─────────────────────────────────────────────────────┐   │
             │    │ GC PAUSE - 15 SECONDS                               │   │
             │    │ (Thread frozen, doesn't know time is passing)       │   │
             │    └─────────────────────────────────────────────────────┘   │
             │ 4. Wakes up, thinks it still has lock                        │
             │ 5. Writes to shared resource                                 │
             └──────────────────────────────────────────────────────────────┘

Client B:    ┌──────────────────────────────────────────────────────────────┐
             │                                                              │
             │ (while A is paused...)                                       │
             │ 3. Sees A's lease expired, acquires lock                     │
             │ 4. Writes to shared resource                                 │
             │ 5. CONFLICT! Both A and B think they have the lock!          │
             └──────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  0s          5s          10s         15s         20s                  │
│  ├───────────┼───────────┼───────────┼───────────┤                    │
│  │                                                                     │
│  A gets     │           Lease       │           A wakes               │
│  lock       │           expires     │           up, writes            │
│             │                       │                                  │
│  │<────────A processing────────────>│<──GC pause──>│                   │
│             │                       │              │                   │
│             │                       B gets    B writes                │
│             │                       lock                               │
│                                                                        │
│  Result: BOTH A and B wrote during their "exclusive" lock!            │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Knowledge, Truth, and Lies

In a distributed system, a node cannot trust its own judgment. Truth is determined by consensus among nodes.

### The Truth Is Defined by the Majority

**A node can't even be sure it's alive:**

```
Node's Self-Assessment vs Reality:

┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  Node A's perspective:                                                  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ "I am alive and healthy"                                          │  │
│  │ "I have the lock"                                                 │  │
│  │ "I am the leader"                                                 │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  What might actually be happening:                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ - Network partition: A can't reach other nodes                    │  │
│  │ - Other nodes decided A was dead and elected new leader           │  │
│  │ - A's lock was revoked when lease expired                        │  │
│  │ - A is on wrong side of a split-brain                            │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  If majority of nodes believe A is dead, then A is dead               │
│  (even if A is still running!)                                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Quorum decisions:**

```
Quorum: A majority of nodes (more than half)

5-node cluster:
┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐
│ A  │  │ B  │  │ C  │  │ D  │  │ E  │
└────┘  └────┘  └────┘  └────┘  └────┘
   │       │       │       │       │
   │       │       │       └───────┴─── (isolated by network partition)
   │       │       │
   └───────┴───────┘ ← This side can form a quorum (3 nodes)
                      They can elect a leader, make progress

The other side (D, E) cannot form a quorum.
They should stop accepting writes to avoid split-brain.
```

### Fencing Tokens

The solution to the lease expiry problem:

```
Fencing Token Solution:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  Lock Service issues monotonically increasing tokens:                 │
│                                                                        │
│  Client A: Requests lock                                              │
│  Lock Service: "Here's the lock with token #33"                       │
│                                                                        │
│  Client A pauses (GC)...                                              │
│  Lock expires                                                          │
│                                                                        │
│  Client B: Requests lock                                              │
│  Lock Service: "Here's the lock with token #34"                       │
│                                                                        │
│  Client B: Write X=5 (with token #34)                                 │
│  Storage: Accepted (token 34 > previous 0)                            │
│  Storage: Last seen token = 34                                        │
│                                                                        │
│  Client A wakes up, thinks it still has lock                          │
│  Client A: Write X=3 (with token #33)                                 │
│  Storage: REJECTED! (token 33 < last seen 34)                         │
│                                                                        │
│           ┌──────────────────────────────────────────────────────┐    │
│           │ Storage Server                                       │    │
│           │                                                      │    │
│           │ Last accepted token: 34                              │    │
│           │                                                      │    │
│           │ Write(X=5, token=34) → Accept (34 >= 34) ✓          │    │
│           │ Write(X=3, token=33) → Reject (33 < 34) ✗           │    │
│           └──────────────────────────────────────────────────────┘    │
│                                                                        │
│  Even if A wakes up and tries to use its old lock, the storage       │
│  server knows the lock was superseded.                                │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

### Byzantine Faults

Most distributed systems assume nodes can fail, but don't lie. Byzantine faults are when nodes might actively behave maliciously.

```
Byzantine Faults:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  Normal failure assumptions:                                          │
│  - Node crashes (stops responding)                                    │
│  - Node is slow (responds late)                                       │
│  - Network drops/delays messages                                      │
│                                                                        │
│  Byzantine failure:                                                    │
│  - Node sends WRONG data intentionally                                │
│  - Node sends different data to different peers                       │
│  - Node pretends to be another node                                   │
│  - Node corrupts its own state                                        │
│                                                                        │
│  When to worry about Byzantine faults:                                │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ ✓ Cryptocurrency/blockchain (untrusted participants)            │  │
│  │ ✓ Aerospace (radiation can flip bits)                           │  │
│  │ ✓ Systems with multiple organizations (no central trust)        │  │
│  │                                                                  │  │
│  │ ✗ Most internal data systems (trust your own servers)           │  │
│  │ ✗ The overhead isn't worth it for internal systems              │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Byzantine fault tolerance requires:                                  │
│  - At least 3f+1 nodes to tolerate f Byzantine nodes                 │
│  - More complex algorithms                                            │
│  - More messages exchanged                                            │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

---

## System Models

When designing distributed algorithms, we make explicit assumptions about what can fail and how.

### Timing Assumptions

```
┌───────────────────────────────────────────────────────────────────────┐
│                        System Timing Models                            │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  SYNCHRONOUS MODEL                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ - Network delay has a known upper bound                         │  │
│  │ - Process execution has bounded time                            │  │
│  │ - Clocks have bounded drift                                     │  │
│  │                                                                  │  │
│  │ Unrealistic for real systems - things can always take longer    │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ASYNCHRONOUS MODEL                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ - No timing assumptions at all                                  │  │
│  │ - Messages can be delayed arbitrarily                           │  │
│  │ - No clocks available                                           │  │
│  │                                                                  │  │
│  │ Very restrictive - many algorithms impossible (FLP result)      │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  PARTIALLY SYNCHRONOUS MODEL (most realistic)                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ - System behaves synchronously MOST of the time                 │  │
│  │ - But sometimes can be asynchronous (network issues, etc.)      │  │
│  │ - Eventually returns to synchronous behavior                    │  │
│  │                                                                  │  │
│  │ This is what real networks are like                             │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

### Node Failure Models

```
┌───────────────────────────────────────────────────────────────────────┐
│                        Node Failure Models                             │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  CRASH-STOP                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ Node works correctly until it crashes                           │  │
│  │ Once crashed, it never comes back                               │  │
│  │                                                                  │  │
│  │ [Running] ──crash──→ [Dead forever]                             │  │
│  │                                                                  │  │
│  │ Simplest model, algorithms are easier                           │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  CRASH-RECOVERY                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ Node can crash and later recover                                │  │
│  │ Has stable storage that survives crashes                        │  │
│  │ In-memory state is lost on crash                                │  │
│  │                                                                  │  │
│  │ [Running] ←──crash/recover──→ [Crashed]                        │  │
│  │                                                                  │  │
│  │ More realistic for most systems                                 │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  BYZANTINE                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ Node can do absolutely anything                                 │  │
│  │ Including lying and sending corrupted data                      │  │
│  │                                                                  │  │
│  │ [Running] ──→ [Arbitrary malicious behavior]                   │  │
│  │                                                                  │  │
│  │ Hardest to handle, most algorithm complexity                    │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Most practical systems assume: Partially synchronous + Crash-recovery│
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

### Safety and Liveness

Properties of distributed algorithms:

```
┌───────────────────────────────────────────────────────────────────────┐
│                    Safety vs Liveness Properties                       │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  SAFETY: "Nothing bad happens"                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ If violated, you can point to a specific moment when it broke   │  │
│  │                                                                  │  │
│  │ Examples:                                                        │  │
│  │ - Uniqueness: At most one node holds the lock at any time      │  │
│  │ - Monotonic: Sequence numbers always increase                   │  │
│  │ - Consistency: All nodes see same value                         │  │
│  │                                                                  │  │
│  │ "At time T, two nodes both thought they had the lock" → UNSAFE │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  LIVENESS: "Something good eventually happens"                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ Cannot point to a specific moment when it was violated          │  │
│  │ (because "eventually" hasn't happened yet)                      │  │
│  │                                                                  │  │
│  │ Examples:                                                        │  │
│  │ - Availability: Requests eventually receive responses           │  │
│  │ - Termination: Algorithm eventually completes                   │  │
│  │ - Progress: System eventually makes forward progress            │  │
│  │                                                                  │  │
│  │ "Request hasn't been answered yet" - is it violated? Maybe not! │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  THE TRADE-OFF:                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ Safety must ALWAYS be preserved                                 │  │
│  │ - Never allow two leaders at same time                         │  │
│  │ - Never return inconsistent data                                │  │
│  │                                                                  │  │
│  │ Liveness can be weakened during failures                        │  │
│  │ - OK to stop accepting writes during partition                  │  │
│  │ - OK to have longer response times during failures              │  │
│  │                                                                  │  │
│  │ "It's OK to be slow, but never wrong"                          │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Key Takeaways

1. **Distributed systems have partial failures** - some parts work while others fail. You must design for this reality.

2. **Networks are unreliable:**
   - Messages can be lost, delayed, duplicated, or reordered
   - You cannot distinguish between a dead node and a slow network
   - Timeouts are necessary but there's no "correct" value

3. **Clocks are unreliable:**
   - Time-of-day clocks can jump forward or backward
   - Clocks on different machines differ by milliseconds (or more)
   - "Last write wins" using timestamps can cause silent data loss
   - Use monotonic clocks for measuring durations

4. **Processes can pause unpredictably:**
   - GC pauses, VM migration, context switches
   - A process doesn't know it was paused
   - Leases/locks can expire without the holder knowing

5. **Truth is determined by the majority:**
   - A single node cannot make authoritative decisions
   - Quorums (majority agreement) determine truth
   - Even "knowing" your own state is uncertain

6. **Fencing tokens prevent split-brain:**
   - Lock service issues monotonically increasing tokens
   - Storage rejects writes with old tokens
   - Protects against clients using expired leases

7. **System models make assumptions explicit:**
   - Timing: Synchronous, asynchronous, or partially synchronous
   - Failures: Crash-stop, crash-recovery, or Byzantine
   - Most real systems: Partially synchronous + crash-recovery

8. **Safety vs Liveness:**
   - Safety: Nothing bad happens (must always hold)
   - Liveness: Something good eventually happens (can be weakened)
   - It's OK to be slow during failures, but never wrong

9. **Design philosophy:** Assume everything can fail. Build systems that detect failures, handle them gracefully, and recover automatically.
