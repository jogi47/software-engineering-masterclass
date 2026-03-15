# Chapter 10: Batch Processing

## Introduction

So far, we've discussed systems that respond to requests (services) and systems that store data (databases). This chapter introduces a different paradigm: **batch processing**.

Batch processing has been around since the early days of computing - think punch cards fed into mainframes. The key idea is processing a large amount of accumulated data all at once, rather than responding to individual requests.

This approach is at the heart of many large-scale data systems and forms the foundation for analytics, machine learning pipelines, and data transformation.

---

## Types of Systems

It's useful to categorize systems by how they handle data:

```
Three Types of Systems:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  1. SERVICES (Online Systems)                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ Client ──request──→ Service ──response──→ Client                │  │
│  │                                                                  │  │
│  │ - Wait for requests, respond immediately                        │  │
│  │ - Response time is key metric (milliseconds)                    │  │
│  │ - Availability is critical                                      │  │
│  │ - Examples: Web servers, REST APIs, databases                   │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  2. BATCH PROCESSING (Offline Systems)                                │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ Input data ──────→ [Batch Job] ──────→ Output data              │  │
│  │ (large amount)      (runs for          (derived data)           │  │
│  │                      hours)                                      │  │
│  │                                                                  │  │
│  │ - Process bounded dataset                                       │  │
│  │ - Throughput is key metric (records/second)                     │  │
│  │ - Run periodically (hourly, daily)                              │  │
│  │ - Examples: MapReduce, Spark jobs, ETL pipelines                │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  3. STREAM PROCESSING (Near-Real-Time)                                │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ Events ─────────→ [Stream Processor] ─────────→ Output          │  │
│  │ (unbounded)        (continuous)                 (continuous)    │  │
│  │                                                                  │  │
│  │ - Process events as they arrive                                 │  │
│  │ - Low latency (seconds to minutes)                              │  │
│  │ - Continuous operation                                          │  │
│  │ - Examples: Kafka Streams, Flink, real-time analytics           │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

---

## The Unix Philosophy

Before diving into MapReduce, let's look at its intellectual ancestor: Unix command-line tools.

### Unix Pipes: A Simple Example

Suppose you have an Apache web server log and want to find the 5 most requested URLs:

```bash
cat /var/log/nginx/access.log |
    awk '{print $7}' |           # Extract URL field
    sort |                        # Sort URLs alphabetically
    uniq -c |                     # Count unique URLs
    sort -rn |                    # Sort by count (descending)
    head -n 5                     # Take top 5
```

**What makes this powerful?**

```
Unix Philosophy:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  1. EACH PROGRAM DOES ONE THING WELL                                  │
│     ┌──────────────────────────────────────────────────────────────┐  │
│     │ awk: Extract fields                                          │  │
│     │ sort: Sort lines                                             │  │
│     │ uniq: Remove duplicates / count                             │  │
│     │ head: Take first N lines                                     │  │
│     │                                                              │  │
│     │ Each tool is simple, well-tested, focused                   │  │
│     └──────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  2. UNIFORM INTERFACE                                                 │
│     ┌──────────────────────────────────────────────────────────────┐  │
│     │ Input: text from stdin                                       │  │
│     │ Output: text to stdout                                       │  │
│     │                                                              │  │
│     │ ANY program can connect to ANY other program                │  │
│     │ No special integration required                              │  │
│     └──────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  3. COMPOSABILITY                                                     │
│     ┌──────────────────────────────────────────────────────────────┐  │
│     │ awk ────→ sort ────→ uniq ────→ sort ────→ head             │  │
│     │       │         │          │          │                      │  │
│     │       ▼         ▼          ▼          ▼                      │  │
│     │    (inspect intermediate results at any point)              │  │
│     │                                                              │  │
│     │ The user decides how to combine tools                       │  │
│     │ The tools don't know about each other                       │  │
│     └──────────────────────────────────────────────────────────────┘  │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

**The limitation of Unix tools:** They work on a single machine. When your data is too large to fit on one computer, you need something else.

---

## MapReduce

MapReduce applies the Unix philosophy to distributed computing. It was introduced by Google in 2004 and popularized by the open-source Hadoop project.

### The Programming Model

Every MapReduce job has two functions you write:

```
MapReduce Model:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  MAP FUNCTION                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ Input: One record from the input dataset                        │  │
│  │ Output: Zero or more (key, value) pairs                         │  │
│  │                                                                  │  │
│  │ Example - Word Count:                                            │  │
│  │ map("hello world hello") → [("hello", 1), ("world", 1),        │  │
│  │                             ("hello", 1)]                       │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│                              ↓ shuffle (group by key)                 │
│                                                                        │
│  REDUCE FUNCTION                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ Input: A key and ALL values associated with that key            │  │
│  │ Output: Aggregated result                                       │  │
│  │                                                                  │  │
│  │ Example - Word Count:                                            │  │
│  │ reduce("hello", [1, 1]) → ("hello", 2)                         │  │
│  │ reduce("world", [1])    → ("world", 1)                         │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

### Distributed Execution

The real power comes from running this across thousands of machines:

```
MapReduce Distributed Execution:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  INPUT DATA (in HDFS)                                                 │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐                │
│  │Split│  │Split│  │Split│  │Split│  │Split│  │Split│                │
│  │  1  │  │  2  │  │  3  │  │  4  │  │  5  │  │  6  │                │
│  └──┬──┘  └──┬──┘  └──┬──┘  └──┬──┘  └──┬──┘  └──┬──┘                │
│     │        │        │        │        │        │                    │
│     ▼        ▼        ▼        ▼        ▼        ▼                    │
│  ┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐                    │
│  │Mapper││Mapper││Mapper││Mapper││Mapper││Mapper│  PHASE 1           │
│  │  1   ││  2   ││  3   ││  4   ││  5   ││  6   │  (parallel)        │
│  └──┬───┘└──┬───┘└──┬───┘└──┬───┘└──┬───┘└──┬───┘                    │
│     │       │       │       │       │       │                         │
│     │       │       │       │       │       │                         │
│     └───────┴───────┴───┬───┴───────┴───────┘                         │
│                         │                                              │
│                    SHUFFLE                                             │
│              (Sort by key, send to                                    │
│               correct reducer)                                        │
│                         │                                              │
│     ┌───────────────────┼───────────────────┐                         │
│     │                   │                   │                         │
│     ▼                   ▼                   ▼                         │
│  ┌────────┐        ┌────────┐         ┌────────┐                      │
│  │Reducer │        │Reducer │         │Reducer │  PHASE 2             │
│  │   1    │        │   2    │         │   3    │  (parallel)          │
│  │ keys   │        │ keys   │         │ keys   │                      │
│  │ A-H    │        │ I-P    │         │ Q-Z    │                      │
│  └───┬────┘        └───┬────┘         └───┬────┘                      │
│      │                 │                  │                           │
│      ▼                 ▼                  ▼                           │
│  ┌─────┐           ┌─────┐            ┌─────┐                        │
│  │Out 1│           │Out 2│            │Out 3│  OUTPUT (in HDFS)      │
│  └─────┘           └─────┘            └─────┘                        │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

### HDFS: The Distributed File System

MapReduce reads from and writes to HDFS (Hadoop Distributed File System):

```
HDFS Architecture:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│                           NameNode                                     │
│                    ┌─────────────────────┐                            │
│                    │ Metadata:           │                            │
│                    │ - File → blocks     │                            │
│                    │ - Block → nodes     │                            │
│                    │                     │                            │
│                    │ (single master,     │                            │
│                    │  can be replicated) │                            │
│                    └─────────────────────┘                            │
│                              │                                         │
│         ┌────────────────────┼────────────────────┐                   │
│         │                    │                    │                   │
│         ▼                    ▼                    ▼                   │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐           │
│  │ DataNode 1  │      │ DataNode 2  │      │ DataNode 3  │           │
│  │             │      │             │      │             │           │
│  │ ┌───┐ ┌───┐│      │ ┌───┐ ┌───┐│      │ ┌───┐ ┌───┐│           │
│  │ │ A │ │ B ││      │ │ A │ │ C ││      │ │ B │ │ C ││           │
│  │ └───┘ └───┘│      │ └───┘ └───┘│      │ └───┘ └───┘│           │
│  │ ┌───┐      │      │ ┌───┐      │      │ ┌───┐      │           │
│  │ │ D │      │      │ │ D │      │      │ │ E │      │           │
│  │ └───┘      │      │ └───┘      │      │ └───┘      │           │
│  └─────────────┘      └─────────────┘      └─────────────┘           │
│                                                                        │
│  Block A: Replicated on DataNode 1, 2                                 │
│  Block B: Replicated on DataNode 1, 3                                 │
│  Each block is typically 128 MB                                       │
│  Replicated 3x by default for fault tolerance                        │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

**Key characteristics:**
- Files are write-once, append-only (no random updates)
- Optimized for large sequential reads/writes
- High throughput, not low latency
- Fault-tolerant through replication

### Why MapReduce Is Fault-Tolerant

```
Fault Tolerance in MapReduce:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  1. INPUT IS IMMUTABLE                                                │
│     ─────────────────────────────────────────────────────────────     │
│     Input files in HDFS never change during the job                   │
│     If mapper fails, just read the same input again                   │
│                                                                        │
│  2. MAPPERS WRITE TO LOCAL DISK                                       │
│     ─────────────────────────────────────────────────────────────     │
│     Map output stored on local disk of mapper machine                 │
│     If mapper fails, rerun it on same or different machine            │
│                                                                        │
│  3. DETERMINISTIC FUNCTIONS                                           │
│     ─────────────────────────────────────────────────────────────     │
│     Same input always produces same output                            │
│     Rerunning a task gives the same result                           │
│                                                                        │
│  4. REDUCERS CAN RESTART                                              │
│     ─────────────────────────────────────────────────────────────     │
│     If reducer fails, fetch map outputs again and rerun               │
│     Map outputs stay available until job completes                    │
│                                                                        │
│  Failure scenario:                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ 1. Mapper 3 crashes                                             │  │
│  │ 2. Scheduler detects failure (heartbeat timeout)                │  │
│  │ 3. Scheduler starts new mapper on different machine             │  │
│  │ 4. New mapper reads same input split                            │  │
│  │ 5. Produces same output as failed mapper would have            │  │
│  │ 6. Job continues normally                                       │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

---

## MapReduce Patterns

### Joins in MapReduce

Joining datasets is common but tricky in MapReduce.

**Sort-Merge Join:**

```
Sort-Merge Join Example:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  Dataset 1: User activity log          Dataset 2: User profiles       │
│  ┌─────────────────────────┐           ┌─────────────────────────┐    │
│  │ user_id: 123            │           │ user_id: 123            │    │
│  │ action: "click"         │           │ name: "Alice"           │    │
│  │ timestamp: ...          │           │ country: "US"           │    │
│  └─────────────────────────┘           └─────────────────────────┘    │
│                                                                        │
│  Goal: For each activity, include user's country                      │
│                                                                        │
│  MAP PHASE:                                                           │
│  ─────────────────────────────────────────────────────────────────    │
│  Mapper for activities:                                               │
│    (123, "click", ...) → (123, {"type": "activity", ...})            │
│                                                                        │
│  Mapper for profiles:                                                 │
│    (123, "Alice", "US") → (123, {"type": "profile", "country": "US"})│
│                                                                        │
│  SHUFFLE: Group by user_id (123)                                      │
│  ─────────────────────────────────────────────────────────────────    │
│                                                                        │
│  REDUCE PHASE:                                                        │
│  ─────────────────────────────────────────────────────────────────    │
│  Reducer receives for key 123:                                        │
│    [{"type": "profile", "country": "US"},                            │
│     {"type": "activity", "action": "click", ...}]                    │
│                                                                        │
│  Reducer joins: activity + country                                    │
│                                                                        │
│  Secondary sort: Ensure profile record comes before activity records │
│  (so we know the country before we see the activities)               │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

**Broadcast Hash Join (for small tables):**

```
Broadcast Hash Join:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  When one dataset is SMALL enough to fit in memory:                   │
│                                                                        │
│  Small dataset (User profiles - 10 MB):                               │
│    Load into hash table on EVERY mapper                               │
│                                                                        │
│  Large dataset (Activity log - 10 TB):                                │
│    Split across mappers as usual                                      │
│                                                                        │
│  ┌──────────────────┐                                                 │
│  │ User Profiles    │──────→ Distributed to ALL mappers              │
│  │ (small, 10 MB)   │        (loaded into memory)                    │
│  └──────────────────┘                                                 │
│                                                                        │
│  ┌───────────────────────────────────────────────────────────────┐    │
│  │ Activity Log (large, 10 TB)                                    │   │
│  │ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐  │   │
│  │ │Split 1│ │Split 2│ │Split 3│ │Split 4│ │Split 5│ │Split 6│  │   │
│  │ └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘  │   │
│  └─────┼─────────┼─────────┼─────────┼─────────┼─────────┼──────┘    │
│        ↓         ↓         ↓         ↓         ↓         ↓           │
│  ┌──────────┐ ┌──────────┐ ...                                       │
│  │ Mapper 1 │ │ Mapper 2 │                                           │
│  │          │ │          │                                           │
│  │ Hash map │ │ Hash map │   Each mapper has full                    │
│  │ of users │ │ of users │   copy of small dataset                   │
│  │          │ │          │                                           │
│  │ For each │ │ For each │   No shuffle needed!                      │
│  │ activity:│ │ activity:│   Very fast.                              │
│  │ lookup   │ │ lookup   │                                           │
│  │ user_id  │ │ user_id  │                                           │
│  └──────────┘ └──────────┘                                           │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

### Handling Skewed Data

```
The Skew Problem:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  Some keys have MANY more values than others                          │
│                                                                        │
│  Example: Social network with celebrity users                         │
│  - Average user: 500 followers                                        │
│  - Celebrity: 50,000,000 followers                                    │
│                                                                        │
│  When joining follower data by user_id:                               │
│                                                                        │
│  Without handling skew:                                               │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ Reducer 1: user_123 (celebrity) - 50M records                   │  │
│  │ Reducer 2: users 124-500,000 - 500K records                     │  │
│  │ Reducer 3: users 500,001-1,000,000 - 500K records               │  │
│  │                                                                  │  │
│  │ Reducer 1 takes HOURS while others finish in minutes!          │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Solutions:                                                           │
│                                                                        │
│  1. SKEWED JOIN (Pig)                                                 │
│     - Sample data first to find hot keys                             │
│     - Split hot keys across multiple reducers                        │
│     - Replicate the other side to those reducers                     │
│                                                                        │
│  2. BROADCAST JOIN FOR HOT KEYS                                       │
│     - Use broadcast join for known celebrities                       │
│     - Use regular join for everyone else                             │
│                                                                        │
│  3. SALTING                                                           │
│     - Append random number to hot keys: "123" → "123_0", "123_1"    │
│     - Spreads records across reducers                                │
│     - Need to aggregate results afterward                            │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Beyond MapReduce: Dataflow Engines

MapReduce was groundbreaking but has limitations. Modern systems like Spark and Flink improve on it.

### Problems with MapReduce

```
MapReduce Limitations:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  1. MATERIALIZATION OF INTERMEDIATE STATE                             │
│     ─────────────────────────────────────────────────────────────     │
│     Every mapper writes to disk                                       │
│     Every reducer reads from disk                                     │
│     Disk I/O is SLOW                                                  │
│                                                                        │
│     Job 1: Map → Reduce → Write to HDFS                              │
│                                ↓                                      │
│     Job 2: Read from HDFS → Map → Reduce → Write to HDFS             │
│                                ↓                                      │
│     Job 3: Read from HDFS → Map → Reduce                             │
│                                                                        │
│     Lots of unnecessary disk I/O!                                     │
│                                                                        │
│  2. FIXED MAP-THEN-REDUCE STRUCTURE                                   │
│     ─────────────────────────────────────────────────────────────     │
│     Can't do: Map → Map → Reduce → Map → Reduce                      │
│     Must break into multiple jobs                                     │
│                                                                        │
│  3. STARTUP OVERHEAD                                                  │
│     ─────────────────────────────────────────────────────────────     │
│     Each job launches new JVMs                                        │
│     Significant latency per job                                       │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

### Dataflow Engines: Spark, Flink, Tez

```
Dataflow Engine Model:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  Instead of Map → Shuffle → Reduce,                                   │
│  define a DAG (Directed Acyclic Graph) of operators:                  │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │     ┌──────┐                                                    │  │
│  │     │ Read │                                                    │  │
│  │     └──┬───┘                                                    │  │
│  │        ↓                                                        │  │
│  │     ┌──────┐     ┌──────┐                                      │  │
│  │     │Filter│ ───→│ Map  │                                      │  │
│  │     └──┬───┘     └──┬───┘                                      │  │
│  │        │            │                                           │  │
│  │        ↓            ↓                                           │  │
│  │     ┌──────┐     ┌──────┐                                      │  │
│  │     │Group │     │Group │                                      │  │
│  │     └──┬───┘     └──┬───┘                                      │  │
│  │        │            │                                           │  │
│  │        └─────┬──────┘                                          │  │
│  │              ↓                                                  │  │
│  │           ┌──────┐                                              │  │
│  │           │ Join │                                              │  │
│  │           └──┬───┘                                              │  │
│  │              ↓                                                  │  │
│  │           ┌──────┐                                              │  │
│  │           │Write │                                              │  │
│  │           └──────┘                                              │  │
│  │                                                                  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  KEY ADVANTAGES:                                                      │
│                                                                        │
│  1. FLEXIBLE OPERATOR COMPOSITION                                     │
│     Not limited to map-reduce-map-reduce                             │
│     Any DAG of operators                                              │
│                                                                        │
│  2. IN-MEMORY PROCESSING                                              │
│     Intermediate results stay in memory                              │
│     Only spill to disk when necessary                                │
│     10-100x faster than MapReduce                                    │
│                                                                        │
│  3. PIPELINING                                                        │
│     Data flows between operators without waiting                     │
│     for full stage completion                                         │
│                                                                        │
│  4. SINGLE JOB EXECUTION                                              │
│     Entire DAG runs as one job                                       │
│     No startup overhead between stages                               │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

### Fault Tolerance in Dataflow Engines

```
Spark Fault Tolerance (RDD Lineage):
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  MapReduce: Intermediate data on disk = easy recovery                 │
│  Spark: Intermediate data in memory = what if node fails?             │
│                                                                        │
│  Solution: TRACK LINEAGE                                              │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  RDD A (from HDFS)                                               │  │
│  │       ↓ filter(x > 10)                                          │  │
│  │  RDD B                                                           │  │
│  │       ↓ map(x * 2)                                              │  │
│  │  RDD C                                                           │  │
│  │       ↓ groupBy(key)                                            │  │
│  │  RDD D  ← This partition is lost!                               │  │
│  │                                                                  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Recovery: Trace lineage back to source, recompute                   │
│                                                                        │
│  1. RDD D lost? What created it?                                     │
│  2. groupBy on RDD C                                                 │
│  3. RDD C lost? What created it?                                     │
│  4. map on RDD B                                                     │
│  5. Continue until we reach data on disk (RDD A from HDFS)          │
│  6. Recompute the chain                                              │
│                                                                        │
│  For long pipelines: CHECKPOINTING                                   │
│  - Periodically save intermediate RDDs to HDFS                       │
│  - Don't have to recompute from the very beginning                   │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Graph Processing

Many algorithms (PageRank, shortest path, connected components) operate on graphs. MapReduce isn't well-suited for iterative graph algorithms.

### Bulk Synchronous Parallel (BSP) / Pregel

```
Pregel Model (Google):
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  Each vertex is a "computer" that can:                                │
│  - Send messages to other vertices                                    │
│  - Receive messages from other vertices                               │
│  - Update its own state                                               │
│                                                                        │
│  Execution proceeds in "supersteps":                                  │
│                                                                        │
│  SUPERSTEP 1:                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │    ┌───┐                 ┌───┐                 ┌───┐            │  │
│  │    │ A │ ───message────→ │ B │ ───message────→ │ C │            │  │
│  │    │   │                 │   │                 │   │            │  │
│  │    └───┘                 └───┘                 └───┘            │  │
│  │      │                     ↑                                    │  │
│  │      └──────message────────┘                                    │  │
│  │                                                                  │  │
│  │  All vertices execute in parallel                               │  │
│  │  All messages delivered                                          │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  BARRIER (wait for all to complete)                                   │
│                                                                        │
│  SUPERSTEP 2:                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Each vertex receives messages from superstep 1                 │  │
│  │  Updates its state                                               │  │
│  │  Sends new messages                                              │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Repeat until:                                                        │
│  - No vertex has more work to do                                     │
│  - Algorithm converges                                                │
│                                                                        │
│  Example: PageRank                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ Each vertex:                                                     │  │
│  │ 1. Receives PageRank contributions from incoming edges          │  │
│  │ 2. Computes new PageRank: 0.15 + 0.85 * sum(contributions)     │  │
│  │ 3. Sends contribution to outgoing edges: PR / num_edges        │  │
│  │ 4. Repeat until PageRank values converge                        │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

---

## High-Level APIs

### SQL on Hadoop

```
Evolution of Batch Processing APIs:
┌───────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  LOW-LEVEL: Write map() and reduce() functions in Java               │
│  ─────────────────────────────────────────────────────────────────    │
│  - Full control                                                       │
│  - Lots of boilerplate                                                │
│  - Easy to make mistakes                                              │
│                                                                        │
│  MID-LEVEL: Pig (dataflow), Cascading (Java), Crunch                 │
│  ─────────────────────────────────────────────────────────────────    │
│  - Less boilerplate                                                   │
│  - Composable operations                                              │
│  - Still need to think about data flow                               │
│                                                                        │
│  HIGH-LEVEL: Hive (SQL), Spark SQL, Presto                           │
│  ─────────────────────────────────────────────────────────────────    │
│  - Write SQL                                                          │
│  - Optimizer chooses execution plan                                   │
│  - Familiar to many developers                                        │
│                                                                        │
│  Example in Hive (SQL):                                               │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ SELECT                                                          │  │
│  │   u.country,                                                    │  │
│  │   COUNT(*) as num_clicks                                        │  │
│  │ FROM activity a                                                  │  │
│  │ JOIN users u ON a.user_id = u.user_id                          │  │
│  │ WHERE a.type = 'click'                                          │  │
│  │ GROUP BY u.country;                                             │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  The query optimizer:                                                 │
│  - Chooses join strategy (broadcast? sort-merge?)                    │
│  - Decides partition count                                            │
│  - Optimizes filter pushdown                                         │
│  - Manages memory and disk spills                                    │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Key Takeaways

1. **Batch processing** is for processing large bounded datasets with high throughput, not low latency. Jobs run for minutes to hours.

2. **Unix philosophy** inspired MapReduce: small composable tools, uniform interfaces (key-value pairs), and the ability to chain operations.

3. **MapReduce model:**
   - Map: Extract key-value pairs from each record
   - Shuffle: Sort and group by key
   - Reduce: Aggregate values for each key
   - Fault-tolerant through checkpointing to disk

4. **HDFS** is the distributed filesystem: files split into blocks, replicated across machines, optimized for large sequential reads/writes.

5. **Join strategies:**
   - Sort-merge join: Both datasets go through shuffle, join at reducer
   - Broadcast join: Small dataset in memory on every mapper
   - Partitioned join: Both datasets pre-partitioned the same way

6. **Dataflow engines (Spark, Flink)** improve on MapReduce:
   - Arbitrary DAG of operators (not just map-reduce)
   - In-memory processing (much faster)
   - Lineage-based fault tolerance

7. **Graph processing** uses the BSP (Pregel) model: vertices send messages in supersteps, with barriers between.

8. **High-level APIs** (SQL, Hive, Spark SQL) let the optimizer choose the execution strategy. Write declarative queries, get optimized execution.

9. **Batch output is derived data:** The input is the source of truth. You can always delete the output and recompute it from the input. This makes batch processing very robust.
