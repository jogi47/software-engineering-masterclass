# Chapter 5: Replication

## Introduction

**Replication** means keeping a copy of the same data on multiple machines connected via a network.

Why would you want to do this?

1. **Keep data geographically close to users** (reduce latency)
2. **Allow the system to continue working even if some parts fail** (increase availability)
3. **Scale out the number of machines that can serve read queries** (increase read throughput)

This chapter assumes your dataset is small enough to fit on a single machine. (Chapter 6 covers partitioning for larger datasets.)

**The challenge:** If data doesn't change, replication is easy - just copy it once. The difficulty is handling **changes** to replicated data.

Three popular approaches:
- **Single-leader replication**
- **Multi-leader replication**
- **Leaderless replication**

---

## Leaders and Followers (Single-Leader Replication)

### How It Works

The most common approach to replication:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│    Client                                                       │
│      │                                                          │
│      │ writes                                                   │
│      ▼                                                          │
│  ┌────────┐    replication    ┌────────┐    replication        │
│  │ Leader │ ───────────────→  │Follower│ ──────────────→ ...   │
│  │(Primary)│                  │(Replica)│                       │
│  └────────┘                   └────────┘                        │
│      │                            │                             │
│      │ reads                      │ reads                       │
│      ▼                            ▼                             │
│   Client                       Client                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

1. One replica is designated as the **leader** (also called master or primary)
2. All **writes** must go through the leader
3. The leader writes new data to its local storage
4. The leader sends the data change to all **followers** (replicas, slaves, secondaries) as part of a **replication log** or **change stream**
5. Each follower applies writes in the same order as the leader
6. **Reads** can go to the leader or any follower

**Used by:** PostgreSQL, MySQL, Oracle, SQL Server, MongoDB, RethinkDB, Espresso, Kafka, RabbitMQ

### Synchronous vs Asynchronous Replication

**Synchronous replication:**
```
Client → Leader → Follower 1 (wait for ACK) → Follower 2 (wait for ACK) → Return to client
```

- Leader waits for follower to confirm write before reporting success
- **Advantage:** Follower guaranteed to have up-to-date copy
- **Disadvantage:** If follower doesn't respond, leader can't process writes

**Asynchronous replication:**
```
Client → Leader → Return to client
              └→ Follower 1 (eventually)
              └→ Follower 2 (eventually)
```

- Leader sends write but doesn't wait for follower response
- **Advantage:** Leader can continue even if followers are behind
- **Disadvantage:** Writes may be lost if leader fails before replicating

**Semi-synchronous (common in practice):**
- One follower is synchronous (guarantees at least one up-to-date copy)
- Other followers are asynchronous
- If synchronous follower becomes unavailable, another follower is promoted

**Most systems use fully asynchronous replication** because:
- It's faster (no waiting)
- A single slow follower doesn't block the whole system
- But writes can be lost if leader fails

### Setting Up New Followers

How do you add a new follower without downtime?

1. **Take a consistent snapshot** of the leader's database (without locking the entire database)
2. **Copy the snapshot** to the new follower node
3. Follower connects to leader and requests all changes since the snapshot
4. Follower **processes the backlog** of changes until it's caught up

The snapshot must be associated with a specific position in the replication log (PostgreSQL: "log sequence number", MySQL: "binlog coordinates").

### Handling Node Outages

#### Follower Failure: Catch-up Recovery

Each follower keeps a log of data changes received from leader. If it crashes:
1. On recovery, follower knows the last transaction it processed
2. Connects to leader and requests all changes since that point
3. Applies those changes until caught up

#### Leader Failure: Failover

If the leader fails, one of the followers must be **promoted** to be the new leader.

**Automatic failover process:**

1. **Detecting leader failure**
   - Most systems use a timeout
   - If leader doesn't respond for 30 seconds, it's assumed dead
   - (But maybe it's just slow, or there's a network partition...)

2. **Choosing a new leader**
   - Could be elected by remaining replicas (consensus)
   - Could be appointed by a previously elected controller node
   - Best candidate: Replica with most up-to-date data

3. **Reconfiguring the system**
   - Clients must send writes to new leader
   - Other followers must start consuming from new leader
   - Old leader must become a follower if it comes back

**What can go wrong with failover?**

1. **Lost writes:** If async replication, new leader may not have all writes from old leader. What happens when old leader comes back?
   - Common approach: Discard old leader's unreplicated writes
   - But this violates clients' durability expectations!

2. **Split brain:** Two nodes both think they're leader, both accepting writes. Very dangerous - can lead to data corruption.

3. **Timeout tuning:**
   - Too long = longer recovery time after leader failure
   - Too short = unnecessary failovers (leader was just slow)

**Many operations teams prefer manual failover** because of these complexities.

---

## Implementation of Replication Logs

How does the leader send data changes to followers?

### Statement-Based Replication

Leader logs every write statement (INSERT, UPDATE, DELETE) and sends to followers.

```sql
-- These statements are sent to followers:
INSERT INTO users (id, name) VALUES (1, 'Alice');
UPDATE users SET name = 'Bob' WHERE id = 1;
DELETE FROM users WHERE id = 1;
```

**Problems:**

1. **Non-deterministic functions:** `NOW()`, `RAND()` return different values on different replicas

2. **Auto-incrementing columns:** Must be executed in same order on all replicas

3. **Side effects:** Triggers, stored procedures, user-defined functions may behave differently

**Workarounds exist** but there are so many edge cases that other methods are preferred.

### Write-Ahead Log (WAL) Shipping

The leader's append-only log (used for crash recovery) is sent to followers.

PostgreSQL and Oracle use this approach.

**Problem:** The WAL contains very low-level data - which bytes changed in which disk blocks. This is closely tied to the storage engine.

**Consequence:** You often can't run different database versions on leader and followers. This makes zero-downtime upgrades difficult.

### Logical (Row-Based) Log Replication

Use a different format for replication than for storage.

**Logical log:** A sequence of records describing writes at row level:
- **Insert:** New values of all columns
- **Delete:** Information to identify the row (primary key, or all columns if no PK)
- **Update:** Information to identify row + new values of changed columns

**Advantages:**
- Decoupled from storage engine internals
- Easier for external applications to parse (change data capture)
- Easier to keep backward compatible

MySQL's binlog (with row-based replication) uses this approach.

### Trigger-Based Replication

Move replication into the application layer using database triggers.

```sql
CREATE TRIGGER replicate_changes
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION send_to_replica();
```

**Advantages:**
- Maximum flexibility
- Can replicate subset of data
- Can replicate between different database types

**Disadvantages:**
- Greater overhead
- More bugs than database's built-in replication
- More complex to set up

Tools like Oracle GoldenGate, Databus for Oracle, Bucardo for PostgreSQL.

---

## Problems with Replication Lag

With **synchronous** replication, follower is guaranteed to be up-to-date. But what about **asynchronous** replication?

If you read from an async follower, you may see **stale data**. This inconsistency is temporary - if you wait, the follower will eventually catch up. This is called **eventual consistency**.

"Eventually" is deliberately vague - there's no limit on how far behind a follower can be.

**Replication lag:** The delay between a write on the leader and the reflection of that write on a follower.

Under normal operation, lag might be a fraction of a second. But if the system is near capacity or there's a network problem, lag can be seconds or even minutes.

### Reading Your Own Writes

**The problem:**

```
┌─────────────────────────────────────────────────────────────┐
│  1. User submits comment         2. User refreshes page     │
│         │                                │                   │
│         ▼                                ▼                   │
│     ┌────────┐                      ┌────────┐              │
│     │ Leader │                      │Follower│              │
│     └────────┘                      └────────┘              │
│         │                                                    │
│         │  (replication lag)                                │
│         └─────────────────────────────────X                 │
│                                                              │
│  User's comment hasn't replicated yet!                      │
│  "Where did my comment go?!"                                │
└─────────────────────────────────────────────────────────────┘
```

User writes something, then views it, but the read goes to a follower that hasn't received the write yet. It looks like their data was lost!

**Solution: Read-after-write consistency (read-your-writes consistency)**

Guarantee that if a user reloads the page, they will always see their own updates.

**Implementation approaches:**

1. **Read from leader for "own" data**
   - User profile? Read from leader (user might have edited it)
   - Other users' profiles? Read from follower

2. **Track time of last update**
   - For 1 minute after a write, read from leader
   - After 1 minute, follower is probably caught up

3. **Remember timestamp of last write**
   - Client remembers timestamp of most recent write
   - System ensures replica serving the read is at least that up-to-date
   - If not, wait or read from another replica

**Cross-device read-after-write** is harder:
- User posts from phone, views from laptop
- Can't use approach 2 (client doesn't know other device's writes)
- May need to route all of a user's requests to same datacenter

### Monotonic Reads

**The problem:**

```
┌────────────────────────────────────────────────────────────────────┐
│  Read 1: Goes to Follower A           Read 2: Goes to Follower B  │
│  (more up-to-date)                    (less up-to-date)           │
│         │                                    │                     │
│         ▼                                    ▼                     │
│  "Comments: Alice, Bob"              "Comments: Alice"             │
│                                                                    │
│  User sees Bob's comment disappear! Time went backward!           │
└────────────────────────────────────────────────────────────────────┘
```

User makes two reads, but the second read returns older data than the first because it went to a less up-to-date replica.

**Solution: Monotonic reads**

Guarantee that if a user makes several reads in sequence, they won't see time go backward.

**Implementation:**
- Each user always reads from the same replica
- Choose replica based on hash of user ID
- If that replica fails, reroute to another

### Consistent Prefix Reads

**The problem:**

```
┌────────────────────────────────────────────────────────────────────┐
│  Original conversation:                                            │
│    Mr. Poons: "How far can you hit a mass that size?"             │
│    Mrs. Cake: "About two meters on a good day."                   │
│                                                                    │
│  Reader sees (due to replication lag):                            │
│    Mrs. Cake: "About two meters on a good day."                   │
│    Mr. Poons: "How far can you hit a mass that size?"             │
│                                                                    │
│  The answer appears before the question! Causality violated!      │
└────────────────────────────────────────────────────────────────────┘
```

If writes happen in a certain order, anyone reading those writes should see them in the same order.

This is a particular problem in **partitioned databases** where there's no global ordering of writes.

**Solution: Consistent prefix reads**

If a sequence of writes happens in a certain order, anyone reading those writes will see them in that order.

**Implementation:**
- Make sure causally related writes go to the same partition
- Use algorithms that track causal dependencies

### Solutions for Replication Lag

**Transactions** are the classic answer - let the database handle these consistency guarantees.

But many distributed databases have abandoned transactions because of performance/availability concerns. This shifts complexity to application developers.

We'll explore this more in later chapters.

---

## Multi-Leader Replication

### Why Multiple Leaders?

Single-leader has one big downside: all writes go through one node.

**Use cases for multi-leader:**

1. **Multi-datacenter operation**
   ```
   ┌──────────────────┐        ┌──────────────────┐
   │   Datacenter A   │        │   Datacenter B   │
   │   ┌────────┐     │        │     ┌────────┐   │
   │   │ Leader │◄────┼────────┼────►│ Leader │   │
   │   └────────┘     │        │     └────────┘   │
   │       │          │        │         │        │
   │       ▼          │        │         ▼        │
   │  ┌──────────┐    │        │    ┌──────────┐  │
   │  │Followers │    │        │    │Followers │  │
   │  └──────────┘    │        │    └──────────┘  │
   └──────────────────┘        └──────────────────┘
   ```
   - Each datacenter has its own leader
   - Leaders replicate to each other
   - Better performance (writes don't cross datacenters)
   - Better tolerance of datacenter outages

2. **Clients with offline operation**
   - Calendar app on phone works offline
   - Phone has local "leader" database
   - Syncs when back online
   - Every device is effectively a datacenter!

3. **Collaborative editing**
   - Google Docs, Notion, etc.
   - Each user has a local replica
   - Changes replicated to server and other users

### The Big Problem: Write Conflicts

**What happens when two leaders accept conflicting writes?**

```
┌─────────────────────────────────────────────────────────────────┐
│  User 1 in DC A:                    User 2 in DC B:             │
│  UPDATE page SET title='A'          UPDATE page SET title='B'   │
│         │                                  │                     │
│         ▼                                  ▼                     │
│    Leader A                           Leader B                   │
│  title = 'A'                        title = 'B'                 │
│         │                                  │                     │
│         └──────────── CONFLICT ────────────┘                    │
│                                                                  │
│  What should the title be?!                                     │
└─────────────────────────────────────────────────────────────────┘
```

Both writes succeeded locally, but they conflict when replicated!

### Handling Write Conflicts

**The best solution: Avoid conflicts**

If you can ensure that all writes for a particular record go through the same leader, there are no conflicts.

Example: User's data always goes to their "home" datacenter.

**But what if you can't avoid them?**

#### Conflict Resolution Strategies

**Converging toward a consistent state:**

All replicas must end up with the same value. But what value?

1. **Last write wins (LWW)**
   - Give each write a timestamp
   - Keep the one with highest timestamp
   - **Problem:** Discards data! "Later" write isn't necessarily "better"

2. **Higher replica ID wins**
   - If Leader A has higher ID than Leader B, A's writes win
   - **Problem:** Also discards data arbitrarily

3. **Merge the values**
   - For the title example: "A/B" or "A (conflict with B)"
   - User can resolve manually
   - Works well for some data types

4. **Record the conflict**
   - Store both values
   - Application code or user resolves later
   - Most flexible but more complex

5. **Custom resolution logic**
   - On write: Run handler when conflict detected
   - On read: Return all conflicting versions, let application resolve

**CRDTs (Conflict-free Replicated Data Types):**

Data structures designed for automatic conflict resolution:
- Counters that can be incremented concurrently
- Sets that can be added to concurrently
- Academic research becoming more practical

---

## Leaderless Replication

### The Idea

What if we don't have leaders at all?

- Client sends writes to **multiple replicas** directly
- Client reads from **multiple replicas** and uses the most recent value

**Dynamo-style databases:** Amazon Dynamo, Riak, Cassandra, Voldemort

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Client write:                                                  │
│         │                                                       │
│         ├──────────► Replica 1 ✓                               │
│         ├──────────► Replica 2 ✓                               │
│         └──────────► Replica 3 ✗ (failed)                      │
│                                                                 │
│  Write succeeds if enough replicas acknowledge (e.g., 2 of 3)  │
│                                                                 │
│  Client read:                                                   │
│         │                                                       │
│         ├──────────► Replica 1: version 5                      │
│         ├──────────► Replica 2: version 5                      │
│         └──────────► Replica 3: version 4 (stale)              │
│                                                                 │
│  Client uses highest version (5)                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Quorums

How many replicas must acknowledge a write? How many must we query for a read?

**Parameters:**
- **n** = total number of replicas
- **w** = number of replicas that must acknowledge a write (write quorum)
- **r** = number of replicas we must query for a read (read quorum)

**The rule:** If **w + r > n**, reads and writes overlap, so we're guaranteed to read at least one up-to-date value.

**Common configuration:** n=3, w=2, r=2
- Can tolerate 1 unavailable node
- Write succeeds if 2 of 3 acknowledge
- Read queries 2 of 3, picks the most recent

```
     Write (w=2)                    Read (r=2)
         │                              │
    ┌────┴────┐                    ┌────┴────┐
    ▼         ▼                    ▼         ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│   1   │ │   2   │ │   3   │ │   1   │ │   2   │ │   3   │
│  ✓    │ │  ✓    │ │  ✗    │ │  v5   │ │  v5   │ │       │
└───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘

At least one of {1,2} must be in {1,2} → guaranteed to see v5
```

**Other configurations:**
- n=5, w=3, r=3: Can tolerate 2 failures
- w=n, r=1: Fast reads, slow writes
- w=1, r=n: Fast writes, slow reads (single point of failure for writes)

### Limitations of Quorum Consistency

Even with w + r > n, you can still get stale reads:

1. **Sloppy quorum:** If designated nodes unavailable, writes go to other nodes (see below)

2. **Concurrent writes:** No clear "latest" if two writes happen at the same time

3. **Read/write concurrency:** Read might see old value if write hasn't propagated

4. **Partial write failures:** Write succeeds on some nodes, fails on others - not rolled back

5. **Node restoration:** New node copies from out-of-date replica

Dynamo-style databases are generally **optimized for use cases that can tolerate eventual consistency**.

### Sloppy Quorums and Hinted Handoff

What if less than w nodes are available from the designated set?

**Strict quorum:** Return error, write fails

**Sloppy quorum:** Accept writes on other nodes temporarily

```
┌─────────────────────────────────────────────────────────────────┐
│  Normal: Write to nodes A, B, C                                 │
│                                                                 │
│  Nodes A, B unavailable:                                        │
│  Write to C (designated) + D, E (temporary)                     │
│                                                                 │
│  When A, B come back:                                           │
│  D, E send writes to A, B ("hinted handoff")                   │
└─────────────────────────────────────────────────────────────────┘
```

**Trade-off:**
- Sloppy quorum increases write availability
- But there's no guarantee you'll read the latest write (the w nodes may not include any designated nodes for that key)

### Detecting Concurrent Writes

How do we know if two writes are concurrent vs. one happened before the other?

**Version numbers:**

```
Server maintains version number for each key

Write 1: Client sends (key, value, version=0)
         Server stores (key, value, version=1)
         Returns version=1

Write 2: Client sends (key, value2, version=1)
         Server stores (key, value2, version=2)
         Returns version=2

Concurrent write: Client sends (key, value3, version=1)
                  Server sees version=1, but current is version=2
                  These are concurrent! Need to merge.
```

**Handling concurrent writes:**

1. Server keeps all concurrent versions as **siblings**
2. On read, return all siblings to client
3. Client merges siblings and writes back

**Last write wins (LWW):**
- Attach timestamp to each write
- Highest timestamp wins
- **Danger:** Silently drops writes!
- Only safe if keys are immutable (write once, never update)

---

## Key Takeaways

1. **Replication serves three purposes:** Latency (data closer to users), availability (survive failures), read throughput (scale reads).

2. **Single-leader replication** is the most common:
   - All writes go through one leader
   - Simple to understand and implement
   - But: Leader is a bottleneck and single point of failure

3. **Async replication** is fast but can lose data if leader fails. Semi-sync (one sync follower) is a common compromise.

4. **Replication lag** causes anomalies:
   - Reading your own writes: May not see your recent write
   - Monotonic reads: May see time go backward
   - Consistent prefix: May see effect before cause

5. **Multi-leader replication** handles multiple datacenters and offline clients, but has the **write conflict problem**.

6. **Leaderless replication** uses quorums (w + r > n) for consistency, but still has edge cases where stale data is returned.

7. **Conflict resolution** strategies:
   - Last write wins (loses data)
   - Merge values
   - Let application or user resolve
   - CRDTs for automatic resolution

8. **There's no perfect replication strategy** - each involves trade-offs between consistency, availability, and performance.
