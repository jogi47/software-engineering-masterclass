# MapReduce

[← Back to Index](README.md)

Imagine you need to count search terms across 50 TB of logs. One machine cannot hold the full dataset in memory. Even if it could, a single server would take too long, and one crash midway through the job would waste hours of work.

This is the class of problem **MapReduce** was designed to solve. It turned large-scale batch processing into a programming model where you describe the computation in simple stages, and the framework handles partitioning, scheduling, shuffling, and retrying work across many machines.

MapReduce is no longer the dominant batch engine for every workload, but it remains foundational. Its ideas still show up in modern data processing systems and it is still a common system design interview topic.

In this chapter, you will learn:
  * [What problem MapReduce was created to solve](#1-the-problem-mapreduce-solves)
  * [How the map and reduce phases work](#2-the-mapreduce-model)
  * [How a classic word-count job is structured](#3-example-word-count)
  * [Why the shuffle phase is the critical distributed step](#4-the-shuffle-phase)
  * [How MapReduce handles failures and retries](#5-fault-tolerance)
  * [What combiners do and when they help](#6-combiners-local-aggregation)
  * [How Hadoop popularized MapReduce in practice](#7-mapreduce-in-practice-hadoop)
  * [Where MapReduce struggles compared with newer systems](#8-limitations-of-mapreduce)
  * [When the model is still useful today](#9-when-to-use-mapreduce-today)
  * [What to keep on your implementation checklist](#10-summary)


# 1. The Problem MapReduce Solves

Large-scale batch processing has a few hard requirements:
- split huge datasets across many machines
- process partitions in parallel
- survive machine failures during long-running jobs
- aggregate results without hand-writing distributed coordination

Before systems like MapReduce, distributed data processing usually meant custom infrastructure and brittle ad hoc jobs.

### The Core Challenge

```
Massive input dataset
  -> split across many machines
  -> compute locally in parallel
  -> move related intermediate data together
  -> aggregate final output
```

The tricky part is not only parallelizing work. It is doing so reliably when machines are slow, crash, or finish at different times.

### Why the Model Mattered

MapReduce gave engineers a simpler interface:

```text
You define:
  -> how to transform input records into key-value pairs
  -> how to aggregate values with the same key

The framework handles:
  -> input splitting
  -> task scheduling
  -> data movement
  -> retries
  -> output writing
```


# 2. The MapReduce Model

The model has three main distributed stages:
- map
- shuffle and sort
- reduce

### High-Level Flow

```
Input files
  -> map tasks
  -> intermediate key-value pairs
  -> shuffle by key
  -> reduce tasks
  -> final output files
```

### Map Phase

Each mapper reads an input split and emits intermediate key-value pairs.

Example:

```text
Input line:
  "hello mapreduce hello"

Mapper output:
  ("hello", 1)
  ("mapreduce", 1)
  ("hello", 1)
```

### Reduce Phase

Each reducer receives all values for a given key and combines them into a final result.

Example:

```text
Reducer input:
  ("hello", [1, 1, 1, 1])

Reducer output:
  ("hello", 4)
```

### Why Key-Value Pairs Matter

The key-value model is simple enough to parallelize broadly. Many batch problems can be expressed as:
- emit a grouping key
- collect all records for that key
- aggregate them


# 3. Example: Word Count

Word count is the classic MapReduce example because it shows the model clearly.

### Input

```text
File A: "to be or not to be"
File B: "to code is to learn"
```

### Map Step

```text
Mapper A:
  ("to", 1)
  ("be", 1)
  ("or", 1)
  ("not", 1)
  ("to", 1)
  ("be", 1)

Mapper B:
  ("to", 1)
  ("code", 1)
  ("is", 1)
  ("to", 1)
  ("learn", 1)
```

### Shuffle Step

```text
("be", [1, 1])
("code", [1])
("is", [1])
("learn", [1])
("not", [1])
("or", [1])
("to", [1, 1, 1, 1])
```

### Reduce Step

```text
("be", 2)
("code", 1)
("is", 1)
("learn", 1)
("not", 1)
("or", 1)
("to", 4)
```

### TypeScript Sketch

```typescript
type Pair = [key: string, value: number];

function mapWords(line: string): Pair[] {
  return line
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => [word.toLowerCase(), 1]);
}

function reduceWordCounts(key: string, values: number[]): Pair {
  const total = values.reduce((sum, value) => sum + value, 0);
  return [key, total];
}
```

This is only the logical computation. A real MapReduce framework distributes the data and coordinates execution.


# 4. The Shuffle Phase

The shuffle phase is where intermediate records are grouped by key and transferred to the reducers that own those keys.

### Why Shuffle Matters

Without shuffle, reducers would not receive all values for the same key.

```
Mappers:
  -> emit ("to", 1) from many machines

Shuffle:
  -> routes every "to" pair to the same reducer

Reducer:
  -> computes final count for "to"
```

### What Happens During Shuffle

The framework typically:
1. partitions mapper output by key
2. sorts or groups records by key
3. transfers partitions across the network
4. feeds grouped values to reducers

### Why Shuffle Is Expensive

Shuffle is often the most expensive stage because it involves:
- network I/O
- disk spill for large intermediate data
- sorting work
- slow-task amplification if one reducer gets a hot key

### Data Skew

If one key is far more common than others, one reducer can become the bottleneck.

```
Normal:
  reducer-1 -> 5 GB
  reducer-2 -> 6 GB
  reducer-3 -> 5 GB

Skewed:
  reducer-1 -> 70 GB
  reducer-2 -> 2 GB
  reducer-3 -> 1 GB
```

This is one of the classic MapReduce performance problems.


# 5. Fault Tolerance

Batch jobs on large clusters must assume failure.

### What Can Go Wrong

- a worker crashes
- a machine becomes slow
- a disk fails
- a network transfer stalls

MapReduce frameworks handle this by tracking task completion and rerunning failed tasks on other workers when needed.

### Why This Works

Map and reduce tasks are usually designed so they can be retried safely.

That is easier when:
- input splits are immutable
- task output is deterministic
- final writes are committed carefully

### Stragglers

Not every problem is a hard failure. Sometimes one task is just much slower than the rest.

Frameworks can mitigate this with speculative execution in some implementations:

```text
Most reducers finish
  -> one reducer is still far behind
  -> framework may launch a duplicate attempt elsewhere
  -> earliest successful result wins
```


# 6. Combiners: Local Aggregation

A combiner is an optional local aggregation step that runs after mapping and before the full shuffle.

### Why Combiners Help

If a mapper emits many repeated keys, a combiner can reduce network traffic.

Without combiner:

```text
Mapper output:
  ("to", 1)
  ("to", 1)
  ("to", 1)
  ("to", 1)
```

With combiner:

```text
Mapper local combine:
  ("to", 4)
```

### Important Constraint

A combiner is only safe when the local partial aggregation is compatible with the final reduce logic.

Typical good fits:
- count
- sum
- min
- max

Less obvious operations may not be safe if partial aggregation changes the meaning of the result.


# 7. MapReduce in Practice: Hadoop

Google introduced MapReduce in a paper. Hadoop made the model widely accessible in open-source ecosystems.

### Typical Hadoop-Era Stack

```
HDFS
  -> stores large input files in distributed blocks

MapReduce engine
  -> schedules mappers and reducers near the data when possible

YARN or earlier job management layers
  -> allocate cluster resources
```

### Why Hadoop Mattered

Hadoop brought:
- commodity-hardware batch processing
- distributed storage plus compute
- a practical ecosystem for large ETL jobs
- a widely adopted open-source implementation of MapReduce ideas

### Operational Reality

In practice, teams often used Hadoop MapReduce for:
- nightly ETL
- index construction
- large log processing
- data warehouse preparation


# 8. Limitations of MapReduce

MapReduce was powerful, but it also had clear limits.

### 1. High Latency

MapReduce is fundamentally a batch model. It is not designed for interactive analytics or real-time event processing.

### 2. Heavy Disk and Shuffle Costs

Intermediate results are often materialized between stages, which adds I/O overhead.

### 3. Awkward Iterative Workloads

Some workloads, such as iterative machine learning or graph algorithms, need repeated passes over the same data. MapReduce can do them, but often inefficiently.

### 4. Rigid Programming Model

Not every problem fits neatly into one map stage and one reduce stage.

### 5. Poor Fit for Low-Latency Pipelines

Modern streaming or near-real-time systems usually need different execution models.

### Why Newer Engines Emerged

Systems like Spark and Flink became popular because they support richer execution models, better in-memory reuse in some workloads, and more flexible APIs.


# 9. When to Use MapReduce Today

You rarely choose classic MapReduce first for a new platform, but the model is still worth understanding.

### It Is Still Useful For

- understanding distributed batch processing fundamentals
- reasoning about large-scale grouping and aggregation
- legacy Hadoop environments
- interview discussions about parallel data processing
- workloads where simple, fault-tolerant batch computation is enough

### The Bigger Lesson

MapReduce teaches several enduring ideas:
- move computation close to data when possible
- express work as parallel tasks over partitions
- make failures cheap through task retry
- separate local transformation from global aggregation
- treat data movement as a first-class cost

### Relationship to the Previous Chapter

If `batch vs stream processing` explains **when** to use offline computation, MapReduce explains one of the most influential ways that large-scale batch computation was actually executed.


# 10. Summary

**MapReduce simplified distributed batch jobs:**
- You express work in map and reduce phases.
- The framework handles scheduling, shuffle, retries, and output coordination.
- This made large-scale batch processing much more accessible.

**Shuffle is the heart of the distributed system:**
- It groups intermediate keys across machines.
- It is often the most expensive stage.
- Data skew and network I/O often dominate runtime.

**Fault tolerance is built into the execution model:**
- Tasks can be retried on failure.
- Slow tasks can sometimes be mitigated with speculative execution.
- Immutable inputs and deterministic work make this practical.

**MapReduce still matters conceptually:**
- Even when newer engines replace it operationally, the core ideas still show up in modern data platforms.

**Implementation checklist:**

```text
Model fit:
  □ Confirm the workload is truly batch-oriented
  □ Identify the key emitted by mappers and aggregated by reducers
  □ Estimate whether shuffle cost will dominate runtime

Correctness:
  □ Make map and reduce functions deterministic where possible
  □ Check whether retries are safe
  □ Validate whether a combiner is semantically correct

Performance:
  □ Watch for skewed keys and unbalanced reducers
  □ Minimize unnecessary intermediate data volume
  □ Treat network and disk I/O as first-class costs

Operations:
  □ Plan for task retries and slow workers
  □ Verify output commit behavior for failed or duplicate attempts
  □ Reconsider newer engines if latency or iterative workloads matter
```
