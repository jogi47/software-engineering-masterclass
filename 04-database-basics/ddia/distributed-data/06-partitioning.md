# Chapter 6: Partitioning

## Introduction

In Chapter 5, we looked at replication - having multiple copies of the same data on different nodes. But what if your data is too large to fit on one machine?

**Partitioning** (also called **sharding**) means breaking up a large dataset into smaller pieces called **partitions**. Each partition is stored on a different node.

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  Large Dataset                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ A B C D E F G H I J K L M N O P Q R S T U V W X Y Z     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                           │                                    │
│                           ▼                                    │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│  │ Partition 1 │    │ Partition 2 │    │ Partition 3 │       │
│  │   A-H       │    │   I-Q       │    │   R-Z       │       │
│  │  (Node 1)   │    │  (Node 2)   │    │  (Node 3)   │       │
│  └─────────────┘    └─────────────┘    └─────────────┘       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Why partition?**

1. **Scalability:** Distribute data and query load across multiple nodes
2. **Performance:** Each query only needs to touch the relevant partition(s)

**Partitioning + Replication:**

Usually combined. Each partition is replicated to multiple nodes for fault tolerance.

```
┌─────────────────────────────────────────────────────────────────┐
│  Node 1                   Node 2                   Node 3      │
│  ┌─────────────────┐     ┌─────────────────┐     ┌────────────┐│
│  │ Partition A     │     │ Partition A     │     │Partition B ││
│  │ (Leader)        │     │ (Follower)      │     │ (Leader)   ││
│  ├─────────────────┤     ├─────────────────┤     ├────────────┤│
│  │ Partition B     │     │ Partition C     │     │Partition C ││
│  │ (Follower)      │     │ (Leader)        │     │ (Follower) ││
│  └─────────────────┘     └─────────────────┘     └────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Partitioning of Key-Value Data

The goal: Spread data and query load evenly across nodes.

**Skewed partitioning:** If some partitions have more data or queries than others, partitioning is ineffective. A partition with disproportionally high load is called a **hot spot**.

### Partitioning by Key Range

Assign a continuous range of keys to each partition, like volumes of an encyclopedia.

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  Encyclopedia: A-D (Volume 1), E-H (Volume 2), ...            │
│                                                                │
│  Database:                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Partition 1 │  │ Partition 2 │  │ Partition 3 │            │
│  │ "aardvark"  │  │ "giraffe"   │  │ "zebra"     │            │
│  │ to          │  │ to          │  │ to          │            │
│  │ "fern"      │  │ "owl"       │  │ "zzzz"      │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Advantages:**
- Keys are sorted within each partition
- **Range scans** are efficient - you can treat the key as a concatenated index

**Example:** Sensor data with timestamp keys
```
Key: sensor_name + timestamp
Partition by timestamp ranges (e.g., one partition per day)

Query "all readings for sensor X on March 15" → goes to one partition
```

**Problem: Hot spots**

If the key is a timestamp, all writes go to today's partition. That one partition becomes a hot spot!

**Solution:** Prefix the key with something that distributes writes.

```
Instead of: 2023-03-15T10:30:00
Use:        sensor-42_2023-03-15T10:30:00

Now writes for different sensors go to different partitions.
But: Range queries for a single sensor are still efficient!
But: Range queries across all sensors need to query all partitions.
```

### Partitioning by Hash of Key

Use a hash function to determine the partition for each key.

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  hash("user-123") = 0x3f... → Partition 2                     │
│  hash("user-456") = 0xa1... → Partition 1                     │
│  hash("user-789") = 0x72... → Partition 3                     │
│                                                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Partition 1 │  │ Partition 2 │  │ Partition 3 │            │
│  │ hash 0-33%  │  │ hash 34-66% │  │ hash 67-100%│            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Advantages:**
- Good hash function spreads keys evenly
- Reduces hot spots (even sequential keys get distributed)

**Disadvantages:**
- **Range queries are inefficient!** Keys that were adjacent are now scattered.
- To find all keys in a range, you must query all partitions.

**Which hash function?**

Don't use a cryptographic hash (MD5, SHA-256) - they're designed for security, not distribution. Use a simple hash designed for distribution.

**Not consistent hashing!** Despite the name, "consistent hashing" is a specific technique for rebalancing. Most databases use simpler partition boundaries.

### Compound Keys: A Hybrid Approach

Cassandra uses a compromise:

```
Primary key: (partition_key, clustering_columns)

Example: (user_id, timestamp)

- user_id is hashed → determines partition
- timestamp is used for sorting within that partition
```

**This gives you:**
- Even distribution by user_id
- Efficient range queries for a single user's data by timestamp

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  Query: "All posts by user-123 from March 2023"               │
│                                                                │
│  1. Hash user-123 → Partition 2                               │
│  2. In Partition 2, scan timestamp range for March 2023       │
│                                                                │
│  Efficient! Only touches one partition.                       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Skewed Workloads and Hot Spots

Even with hashing, a hot key can cause problems.

**Example:** A celebrity with millions of followers posts. The hash of their user_id always goes to the same partition, which becomes a hot spot.

**Current solutions are application-level:**

1. **Add random suffix to hot keys**
   ```
   Instead of: celebrity-123
   Use:        celebrity-123_001, celebrity-123_002, ... celebrity-123_100

   Writes are spread across 100 keys (different partitions).
   Reads must query all 100 keys and combine results.
   ```

2. **Track hot keys** and handle them specially

**Databases don't automatically handle this** - you need to design around it.

---

## Partitioning and Secondary Indexes

So far, we've discussed partitioning by primary key. But what about secondary indexes?

**Example:** You have a database of cars partitioned by car_id. But you also want to search by color.

```sql
SELECT * FROM cars WHERE color = 'red';
```

Which partitions have red cars? Without a secondary index, you'd have to scan all partitions!

Two approaches to partitioning secondary indexes:

### Document-Based Partitioning (Local Indexes)

Each partition maintains its own secondary index, covering only the documents in that partition.

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  Partition 1                Partition 2                        │
│  ┌─────────────────────┐   ┌─────────────────────┐            │
│  │ car 1: red          │   │ car 3: red          │            │
│  │ car 2: blue         │   │ car 4: blue         │            │
│  │                     │   │ car 5: red          │            │
│  │ Local index:        │   │ Local index:        │            │
│  │ red → [1]           │   │ red → [3, 5]        │            │
│  │ blue → [2]          │   │ blue → [4]          │            │
│  └─────────────────────┘   └─────────────────────┘            │
│                                                                │
│  Query "color = red":                                          │
│  Must query BOTH partitions and combine results!              │
│  (Called "scatter/gather")                                    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Advantages:**
- Writes are local (only update one partition's index)
- Simple to implement

**Disadvantages:**
- Reads must query all partitions (scatter/gather)
- Can be slow if there are many partitions
- Tail latency is problematic (wait for slowest partition)

**Used by:** MongoDB, Riak, Cassandra, Elasticsearch, SolrCloud, VoltDB

### Term-Based Partitioning (Global Indexes)

Build a global index that covers all partitions, but partition the index itself.

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  Data Partitions:                                              │
│  ┌─────────────┐  ┌─────────────┐                             │
│  │ Partition 1 │  │ Partition 2 │                             │
│  │ car 1: red  │  │ car 3: red  │                             │
│  │ car 2: blue │  │ car 4: blue │                             │
│  └─────────────┘  └─────────────┘                             │
│                                                                │
│  Global Index (also partitioned):                             │
│  ┌─────────────────────┐  ┌─────────────────────┐            │
│  │ Index Partition A   │  │ Index Partition B   │            │
│  │ colors a-m:         │  │ colors n-z:         │            │
│  │ blue → [2, 4]       │  │ red → [1, 3]        │            │
│  └─────────────────────┘  └─────────────────────┘            │
│                                                                │
│  Query "color = red":                                          │
│  → Go to Index Partition B                                    │
│  → Get [1, 3]                                                 │
│  → Fetch from Data Partitions 1 and 2                        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Advantages:**
- Reads are efficient (only query relevant index partitions)

**Disadvantages:**
- Writes are more complex (may need to update multiple index partitions)
- Index updates are usually **asynchronous** (eventual consistency)

**Used by:** Amazon DynamoDB, Riak

---

## Rebalancing Partitions

Over time, things change:
- Query throughput increases → add more CPUs
- Dataset grows → add more disks
- A machine fails → need to move partitions to other nodes

**Rebalancing:** Moving data between nodes to maintain balance.

### What NOT to Do: hash(key) mod N

A tempting approach:

```
partition = hash(key) % number_of_nodes
```

**The problem:** If you change N (add or remove a node), most keys get reassigned!

```
With 10 nodes:  hash(key) % 10 = 3  → Node 3
With 11 nodes:  hash(key) % 11 = 7  → Node 7 (different!)
```

Almost all data must move! Very expensive.

### Strategy 1: Fixed Number of Partitions

Create many more partitions than nodes upfront.

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  Initial state (3 nodes, 12 partitions):                      │
│                                                                │
│  Node 1: P1, P2, P3, P4                                       │
│  Node 2: P5, P6, P7, P8                                       │
│  Node 3: P9, P10, P11, P12                                    │
│                                                                │
│  Add Node 4:                                                   │
│  Node 1: P1, P2, P3        (gave up P4)                       │
│  Node 2: P5, P6, P7        (gave up P8)                       │
│  Node 3: P9, P10, P11      (gave up P12)                      │
│  Node 4: P4, P8, P12       (received from others)             │
│                                                                │
│  Partitions themselves don't change, just which node hosts them│
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Advantages:**
- Simple
- Partitions can be moved as whole units
- Minimal data movement when rebalancing

**Disadvantages:**
- Must choose number of partitions upfront
- Too few → partitions become too large
- Too many → overhead of managing many partitions

**Choosing the right number:**
- If dataset is highly variable, hard to pick right number
- If partitions are too large, rebalancing is expensive
- If partitions are too small, overhead is high

**Used by:** Riak, Elasticsearch, Couchbase, Voldemort

### Strategy 2: Dynamic Partitioning

Let partitions split and merge based on size.

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  Partition grows too large → split into two                   │
│                                                                │
│  Before:  [────────────────────P1────────────────────]        │
│                                                                │
│  After:   [────────P1a────────] [────────P1b────────]         │
│                                                                │
│  Partition shrinks → merge with neighbor                      │
│                                                                │
│  Before:  [──P1──] [──P2──]                                   │
│  After:   [────────P1+P2────────]                             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Advantages:**
- Number of partitions adapts to data size
- Works well for variable datasets

**Disadvantages:**
- Initially, all data is in one partition (can't parallelize)
- Some databases allow pre-splitting to avoid this

**Used by:** HBase, RethinkDB, MongoDB (since 2.4)

### Strategy 3: Partitioning Proportional to Nodes

Fixed number of partitions per node.

```
Number of partitions = nodes × partitions_per_node
```

When a new node joins:
1. Randomly pick existing partitions
2. Split them
3. Take half of each split

**Advantages:**
- Partition size stays roughly constant as data grows
- Number of partitions scales with cluster size

**Used by:** Cassandra, Ketama

### Automatic vs Manual Rebalancing

**Fully automatic:**
- System detects imbalance and moves partitions
- Convenient, less operational work

**Risks of automation:**
- Rebalancing is expensive (lots of data movement)
- Combined with automatic failure detection, can cause cascading failures:
  ```
  1. Node is overloaded, slow to respond
  2. System thinks node is dead
  3. Starts rebalancing away from it
  4. Rebalancing adds more load
  5. More nodes appear slow...
  ```

**Many systems use human-in-the-loop:**
- System suggests rebalancing
- Admin reviews and approves
- Prevents unexpected rebalancing storms

---

## Request Routing

After partitioning, a client needs to know: **Which node should I connect to?**

This is an instance of **service discovery**. Three approaches:

### Option 1: Contact Any Node

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  Client                                                        │
│    │                                                           │
│    └──────► Node 1 (any node)                                 │
│                │                                               │
│                │ "I don't have this key,                      │
│                │  but I know it's on Node 3"                  │
│                │                                               │
│                └──────────────────► Node 3                    │
│                                        │                       │
│                                        └─────► Response       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

Clients can contact any node. If that node has the data, it responds. If not, it forwards the request.

**Used by:** Cassandra, Riak (gossip protocol)

### Option 2: Routing Tier

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  Client                                                        │
│    │                                                           │
│    └──────► Routing Tier                                      │
│                │                                               │
│                │ (knows partition → node mapping)             │
│                │                                               │
│                └──────────────────► Correct Node              │
│                                        │                       │
│                                        └─────► Response       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

A separate routing layer that handles partition-to-node mapping.

### Option 3: Client Awareness

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  Client (partition-aware)                                      │
│    │                                                           │
│    │ (knows partition → node mapping)                         │
│    │                                                           │
│    └──────────────────────────────► Correct Node              │
│                                        │                       │
│                                        └─────► Response       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

Client library contains partition mapping logic.

### How Does Routing Learn About Partition Changes?

Many systems use a coordination service like **ZooKeeper**:

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│                        ZooKeeper                               │
│                     (partition mapping)                        │
│                           │                                    │
│          ┌────────────────┼────────────────┐                  │
│          │                │                │                   │
│          ▼                ▼                ▼                   │
│      Node 1            Node 2          Routing Tier           │
│   (registers)       (registers)        (subscribes)           │
│                                                                │
│  When partition assignment changes:                           │
│  - Nodes update ZooKeeper                                     │
│  - ZooKeeper notifies routing tier                           │
│  - Routing tier updates its mapping                          │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Used by:** LinkedIn's Espresso, HBase, SolrCloud, Kafka

**Cassandra and Riak** use a **gossip protocol** instead - nodes communicate partition info directly to each other.

**Couchbase** doesn't rebalance automatically. Routing is configured manually through a cluster manager.

---

## Parallel Query Execution

So far we've focused on simple key-value access. But what about complex queries that span multiple partitions?

**Massively Parallel Processing (MPP):**

Analytics databases (Teradata, Vertica, Presto, Spark SQL) support complex queries across partitions.

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  SELECT customer_id, SUM(amount)                              │
│  FROM orders                                                   │
│  WHERE date > '2023-01-01'                                    │
│  GROUP BY customer_id                                          │
│                                                                │
│  Query planner breaks this into:                              │
│                                                                │
│  Stage 1 (parallel on each partition):                        │
│  - Scan partition for matching rows                           │
│  - Compute partial sums                                       │
│                                                                │
│  Stage 2 (combine results):                                   │
│  - Aggregate partial sums from all partitions                 │
│  - Return final result                                        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

This is covered more in Chapter 10 (Batch Processing).

---

## Key Takeaways

1. **Partitioning splits data across nodes** for scalability. Usually combined with replication for fault tolerance.

2. **Two main partitioning strategies:**
   - **Key range:** Good for range queries, but can have hot spots
   - **Hash:** Distributes evenly, but loses ability to do range queries

3. **Compound keys** give you the best of both: hash the first part (distribution), use the rest for range queries within a partition.

4. **Secondary indexes** complicate partitioning:
   - **Local indexes:** Fast writes, slow reads (scatter/gather)
   - **Global indexes:** Fast reads, slow/async writes

5. **Rebalancing strategies:**
   - Fixed partitions (simple, but must choose count upfront)
   - Dynamic partitioning (adapts to size)
   - Partitions per node (scales with cluster)

6. **Request routing** options:
   - Any node can forward
   - Dedicated routing tier
   - Partition-aware clients

7. **Hot spots remain a challenge.** Even with good partitioning, popular keys can overwhelm a single partition. Application-level solutions are often needed.

8. **Don't use hash mod N** for partition assignment - it causes massive data movement when N changes.
