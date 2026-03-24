# Skip Lists

[← Back to Index](README.md)

Imagine you are building an in-memory leaderboard, time-series index, or event scheduler. You need ordered inserts, fast point lookups, and efficient range scans as the dataset keeps changing.

Without the right structure, teams often start with a sorted array because binary search looks fast on paper:

```typescript
class NaiveSortedIndex<T> {
  private readonly entries: Array<{ key: number; value: T }> = [];

  get(key: number): T | undefined {
    let low = 0;
    let high = this.entries.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const current = this.entries[mid];

      if (current.key === key) {
        return current.value;
      }

      if (current.key < key) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return undefined;
  }

  set(key: number, value: T): void {
    const insertAt = this.lowerBound(key);
    this.entries.splice(insertAt, 0, { key, value });
  }

  range(minKey: number, maxKey: number): Array<{ key: number; value: T }> {
    return this.entries.filter((entry) => entry.key >= minKey && entry.key <= maxKey);
  }

  private lowerBound(target: number): number {
    let low = 0;
    let high = this.entries.length;

    while (low < high) {
      const mid = Math.floor((low + high) / 2);

      if (this.entries[mid].key < target) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    return low;
  }
}
```

That works for small workloads, but it degrades quickly:
- inserts and deletes are still `O(n)` because elements shift
- frequent updates turn one good read structure into a poor write structure
- range scans are easy, but keeping the array sorted becomes expensive
- concurrent modification logic becomes awkward once several threads or workers touch the same ordered set

This is where **skip lists** come in. A skip list keeps the data sorted like a linked list, but adds higher "express lanes" so lookups, inserts, and deletes are usually logarithmic without tree rotations.

In this chapter, you will learn:
  * [Why skip lists exist](#1-why-skip-lists-exist)
  * [What a skip list is](#2-what-a-skip-list-is)
  * [Which core terms matter](#3-core-structure-and-terminology)
  * [How search, insert, and delete work](#4-how-search-insert-and-delete-work)
  * [How probabilistic balancing affects performance](#5-probabilistic-balancing-and-performance)
  * [How skip lists compare with related ordered structures](#6-skip-lists-vs-related-ordered-structures)
  * [Why they show up in concurrent and storage systems](#7-concurrency-and-real-world-use)
  * [What practical TypeScript implementations look like](#8-practical-typescript-patterns)
  * [When to use skip lists and which pitfalls matter](#9-when-to-use-it-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why Skip Lists Exist

Skip lists exist because many systems need a structure that is:
- ordered by key
- efficient for lookup
- efficient for range scans
- reasonably simple to maintain under frequent inserts and deletes

### The Core Problem

A plain linked list preserves order, but searching it is slow because you walk one node at a time.

```text
Ordered linked list:

head -> 10 -> 20 -> 30 -> 40 -> 50 -> 60 -> 70
                           ^
                      want 50, must walk through earlier nodes
```

A sorted array improves lookup with binary search, but updates are expensive because elements move.

A balanced tree often gives strong asymptotic performance, but the implementation and update behavior are more complex:
- tree rotations and rebalancing add logic
- concurrency control can be subtle
- augmenting the tree for range-heavy workloads can add more bookkeeping

### What Skip Lists Optimize For

Skip lists usually help with:
- expected `O(log n)` point lookups
- expected `O(log n)` inserts and deletes
- efficient ordered scans on the bottom level
- relatively simple algorithms built from forward pointers

### The Durable Motivation

The durable motivation is not "skip lists are always better than trees."

The durable motivation is:
- keep data sorted
- add fast shortcuts over long stretches
- make updates local rather than globally rebalancing the structure

### Where They Commonly Fit

Skip lists are often a good fit for:
- in-memory ordered indexes
- leaderboards and ranking tables
- event schedulers keyed by time
- LSM-style memtables before data is flushed to disk
- concurrent ordered maps where range iteration matters


# 2. What a Skip List Is

A skip list is a layered linked structure where every node appears on level `0`, and some nodes also appear on higher levels.

### A Conservative Definition

The durable idea is:

```text
Skip list =
  sorted linked list at the bottom
  + additional upper levels with fewer nodes
  + search that starts high and drops down
  + random or policy-based node heights
```

### The Express-Lane Mental Model

Think of it as a highway:
- level `0` is the full local road with every node
- higher levels are faster roads with fewer stops
- search moves forward on a fast lane while it can
- when it would overshoot, it drops down one level

```text
Level 3: head -----------------> 40 ------------------------> NIL
Level 2: head ------> 20 ------> 40 ------> 70 ------------> NIL
Level 1: head -> 10 -> 20 -> 35 -> 40 -> 55 -> 70 --------> NIL
Level 0: head -> 5 -> 10 -> 20 -> 25 -> 35 -> 40 -> 55 -> 70 -> 90 -> NIL
```

### Why the Layers Matter

The higher levels let the search skip over many nodes at once.

Instead of scanning:
- `5 -> 10 -> 20 -> 25 -> 35 -> 40 -> 55 -> 70`

you often do something more like:
- jump on a high level
- move close to the target
- drop to a lower level
- finish with only a few local steps

### What a Skip List Is Not

A skip list is usually not:
- deterministic in its exact shape when random heights are used
- as memory-compact as a plain array
- the best structure for exact-key lookups when order does not matter
- a guarantee of worst-case `O(log n)` unless you use a stronger deterministic variant


# 3. Core Structure and Terminology

Most skip list discussions become simpler when a few recurring terms are clear.

### 1. Node

A node stores:
- a key
- a value or payload
- an array of forward pointers

```text
node(key=40, level=2)
├── next[2] -> ...
├── next[1] -> ...
└── next[0] -> ...
```

### 2. Level

A level is one horizontal linked list.

Typical numbering:
- level `0`: bottom layer containing all keys
- higher levels: sparser shortcut layers

### 3. Height

The height of a node is the highest level where it appears.

If a node has height `3`, it participates in:
- level `0`
- level `1`
- level `2`
- level `3`

### 4. Head Sentinel

Many implementations use a special head node with maximum height.

That makes traversal logic simpler because every search starts from the same top-left corner.

```text
head
├── next[maxLevel]
├── next[maxLevel - 1]
└── ...
```

### 5. Promotion Probability

In a probabilistic skip list, each level promotion is often decided by a coin-flip-like rule.

Example:
- start at level `0`
- while `random() < p`, promote one more level

Common choices use `p` around `0.5` or `0.25`, but the best value depends on memory and traversal trade-offs.

### 6. Update Path

Insertion and deletion usually track the last node visited at each level.

That recorded path is often called:
- `update`
- `predecessors`
- search path

It tells the algorithm which forward pointers need to change.

### 7. Range Scan

A range scan typically:
1. finds the first node at or after the lower bound
2. continues on level `0`
3. stops at the upper bound

That bottom-layer linked order is one of the practical strengths of skip lists.


# 4. How Search, Insert, and Delete Work

The mechanics are simpler than they first look because every operation follows the same pattern:
- start high
- move forward while safe
- drop down when needed

### Search

To find key `55`:
1. start at the highest level of the head
2. move right while the next key is still `< 55`
3. when the next step would overshoot, drop one level
4. repeat until level `0`
5. inspect the next node on level `0`

```text
Find 55:

Level 3: head -----------------> 40 ------------------------> NIL
                                 |
                                 v
Level 2:              40 ------> 70
                                 |
                                 v
Level 1:              40 ------> 55 ------> 70
                                 |
                                 v
Level 0:              40 ------> 55 ------> 70
```

The durable idea is that each higher level helps you discard large portions of the list quickly.

### Insert

Insertion usually works like this:
1. search for the position of the key
2. record the predecessor at each visited level
3. choose the new node height
4. splice the new node into every level it participates in

```text
Before insert 35:

Level 1: head -> 10 -> 20 ------> 40 -> 70
Level 0: head -> 10 -> 20 -> 25 -> 40 -> 70

After insert 35 with height 1:

Level 1: head -> 10 -> 20 -> 35 -> 40 -> 70
Level 0: head -> 10 -> 20 -> 25 -> 35 -> 40 -> 70
```

Unlike a balanced tree, you typically do not rotate large parts of the structure. You adjust a bounded set of forward pointers.

### Delete

Deletion is the mirror image of insertion:
1. search for the key
2. record the predecessor at each level
3. if the key exists, bypass the target node on every level where it appears
4. optionally shrink the current top level when upper layers become empty

### Why the Operations Stay Local

This local-pointer-update behavior is a major practical property:
- the algorithm touches a search path, not the whole structure
- range iteration still works because level `0` remains ordered
- concurrency designs can sometimes be simpler because there is no tree-wide rebalance step


# 5. Probabilistic Balancing and Performance

Classic skip lists rely on probability rather than strict balancing rules.

### Why Random Heights Help

If every node appeared on every level, upper layers would not be sparse.

If almost no node were promoted, upper layers would be useless.

Random promotion tends to produce a pyramid-like shape:

```text
Many nodes:   level 0  -> every key
Fewer nodes:  level 1  -> some keys
Even fewer:   level 2  -> fewer keys
Very few:     level 3+ -> rare towers
```

That shape is what usually gives logarithmic search behavior.

### Expected Complexity

For a standard probabilistic skip list, you often see:
- search: expected `O(log n)`
- insert: expected `O(log n)`
- delete: expected `O(log n)`
- range scan after the start point: `O(k)` for `k` returned items

The important qualifier is **expected**.

In theory, an unlucky shape can be worse. In practice, with sensible parameters and large datasets, skip lists often behave well enough for real systems.

### Memory Trade-Off

Skip lists pay for speed with extra pointers.

```text
More levels per node:
  + faster shortcuts
  - more pointer memory

Fewer levels per node:
  + lower memory cost
  - more work per search
```

### Tuning Knobs

The main knobs are:
- maximum level
- promotion probability
- node allocation strategy
- whether duplicates are allowed directly or encoded into composite keys

These are tuning parameters, not universal constants.

### Deterministic Variants

Not every skip list is purely random. Some systems use deterministic or partially constrained variants to make shape and performance more predictable.

The durable lesson is:
- probabilistic balancing is common
- deterministic variants exist
- the right choice depends on implementation constraints, not fashion


# 6. Skip Lists vs Related Ordered Structures

Skip lists solve an ordered-data problem, but they are not the only option.

### Comparison Table

```text
┌───────────────────┬────────────────────────────────────┬────────────────────────────────────┐
│ Structure         │ Usually Strong At                 │ Common Trade-Off                   │
├───────────────────┼────────────────────────────────────┼────────────────────────────────────┤
│ Skip list         │ Ordered lookup, insert, range     │ Extra pointers, probabilistic form │
│ Balanced tree     │ Deterministic ordered operations  │ Rotations and more complex updates │
│ Sorted array      │ Fast reads, compact memory        │ O(n) inserts and deletes           │
│ Hash table        │ Exact key lookup                  │ No natural ordering or range scan  │
│ B-tree family     │ Disk/page-oriented ordered data   │ More complex node management       │
└───────────────────┴────────────────────────────────────┴────────────────────────────────────┘
```

### Skip List vs Balanced Tree

Balanced trees are strong when you want:
- deterministic worst-case lookup bounds
- mature library support
- order-statistics or augmentation patterns built around tree nodes

Skip lists are attractive when you want:
- simpler pointer-based algorithms
- efficient range iteration on the bottom layer
- a structure that can be adapted for concurrent ordered maps

Neither structure wins universally.

### Skip List vs Sorted Array

Use a sorted array when:
- the dataset is mostly read-only
- bulk rebuilds are acceptable
- cache locality matters more than frequent updates

Use a skip list when:
- the dataset changes often
- you need ordered inserts without shifting large memory regions
- you want range scans without paying `O(n)` insert cost

### Skip List vs Hash Table

Hash tables are excellent for:
- exact-key lookup
- membership tests
- high-throughput unordered access

Skip lists are better when:
- sorted order matters
- predecessor or successor queries matter
- range reads matter

### Skip List vs B-Tree Family

B-trees and related page-oriented structures are often a better fit for:
- disk-backed indexes
- page cache efficiency
- storage engines built around block reads and writes

Skip lists are more commonly used:
- in memory
- in write buffers
- in concurrent ordered-map implementations


# 7. Concurrency and Real-World Use

Skip lists are often discussed in concurrency-heavy contexts because they can avoid some of the structural complexity of tree rebalancing.

### Why Concurrency Discussions Keep Coming Up

In a skip list:
- inserts usually change pointers along one search path
- deletes usually change pointers along one search path
- there is no rotation phase that must preserve tree invariants across a larger subtree

That does **not** make concurrency easy by itself. It only means the mutation shape is often more local.

### Common Concurrency Strategies

Real systems may use:
- coarse-grained locking for simplicity
- lock coupling on the search path
- optimistic validation
- lock-free techniques with compare-and-swap operations

The exact design depends on:
- the language memory model
- garbage collection or manual memory reclamation
- contention profile
- whether reads must be non-blocking

### A Conservative Real-World View

You can see skip-list ideas in:
- concurrent ordered maps such as Java's `ConcurrentSkipListMap`
- in-memory ordered sets and leaderboards
- memtables in some LSM-style storage engines before flush

That does not mean every database or cache should use one. It means skip lists are a durable option when sorted order and incremental updates both matter.

### Why Range Reads Are Operationally Useful

Operational systems often need:
- scan all keys between two timestamps
- iterate the next scheduled jobs
- read the first `N` items after a cursor

The ordered bottom level makes these patterns natural:

```text
find lower bound on higher levels
          │
          v
drop to level 0 at first matching key
          │
          v
walk forward sequentially for the range
```


# 8. Practical TypeScript Patterns

The following example shows a compact in-memory skip list for numeric keys. It is intentionally small enough to study, but it still demonstrates the real mechanics.

### A Minimal Generic Implementation

```typescript
class SkipListNode<T> {
  readonly next: Array<SkipListNode<T> | null>;

  constructor(
    readonly key: number,
    value: T | undefined,
    readonly level: number,
  ) {
    this.value = value;
    this.next = Array.from({ length: level + 1 }, () => null);
  }

  value: T | undefined;
}

class SkipList<T> {
  private readonly head: SkipListNode<T>;
  private currentLevel = 0;

  constructor(
    private readonly maxLevel: number = 12,
    private readonly promotionProbability: number = 0.5,
  ) {
    this.head = new SkipListNode<T>(Number.NEGATIVE_INFINITY, undefined, maxLevel);
  }

  get(key: number): T | undefined {
    const predecessors = this.findPredecessors(key);
    const candidate = predecessors[0].next[0];

    if (candidate?.key === key) {
      return candidate.value;
    }

    return undefined;
  }

  set(key: number, value: T): void {
    const predecessors = this.findPredecessors(key);
    const candidate = predecessors[0].next[0];

    if (candidate?.key === key) {
      candidate.value = value;
      return;
    }

    const newLevel = this.randomLevel();

    if (newLevel > this.currentLevel) {
      for (let level = this.currentLevel + 1; level <= newLevel; level += 1) {
        predecessors[level] = this.head;
      }

      this.currentLevel = newLevel;
    }

    const node = new SkipListNode<T>(key, value, newLevel);

    for (let level = 0; level <= newLevel; level += 1) {
      node.next[level] = predecessors[level].next[level];
      predecessors[level].next[level] = node;
    }
  }

  delete(key: number): boolean {
    const predecessors = this.findPredecessors(key);
    const candidate = predecessors[0].next[0];

    if (!candidate || candidate.key !== key) {
      return false;
    }

    for (let level = 0; level <= this.currentLevel; level += 1) {
      if (predecessors[level].next[level] !== candidate) {
        continue;
      }

      predecessors[level].next[level] = candidate.next[level];
    }

    while (this.currentLevel > 0 && !this.head.next[this.currentLevel]) {
      this.currentLevel -= 1;
    }

    return true;
  }

  range(minKey: number, maxKey: number): Array<{ key: number; value: T }> {
    const results: Array<{ key: number; value: T }> = [];
    let current = this.findFirstAtOrAfter(minKey);

    while (current && current.key <= maxKey) {
      if (current.value !== undefined) {
        results.push({ key: current.key, value: current.value });
      }

      current = current.next[0];
    }

    return results;
  }

  private findPredecessors(key: number): SkipListNode<T>[] {
    const predecessors = Array.from(
      { length: this.maxLevel + 1 },
      () => this.head,
    );

    let current = this.head;

    for (let level = this.currentLevel; level >= 0; level -= 1) {
      while (current.next[level] && current.next[level]!.key < key) {
        current = current.next[level]!;
      }

      predecessors[level] = current;
    }

    return predecessors;
  }

  private findFirstAtOrAfter(key: number): SkipListNode<T> | null {
    const predecessors = this.findPredecessors(key);
    return predecessors[0].next[0];
  }

  private randomLevel(): number {
    let level = 0;

    while (level < this.maxLevel && Math.random() < this.promotionProbability) {
      level += 1;
    }

    return level;
  }
}
```

### Example Usage

```typescript
type ScheduledJob = {
  jobId: string;
  runAtEpochMs: number;
  taskName: string;
};

const jobsByRunTime = new SkipList<ScheduledJob>();

jobsByRunTime.set(1_710_000_000_000, {
  jobId: "job-1",
  runAtEpochMs: 1_710_000_000_000,
  taskName: "rebuild-search-index",
});

jobsByRunTime.set(1_710_000_300_000, {
  jobId: "job-2",
  runAtEpochMs: 1_710_000_300_000,
  taskName: "rotate-signing-key",
});

jobsByRunTime.set(1_710_000_600_000, {
  jobId: "job-3",
  runAtEpochMs: 1_710_000_600_000,
  taskName: "send-daily-summary",
});

const nextJobs = jobsByRunTime.range(1_710_000_000_000, 1_710_000_400_000);
```

### Practical Notes for Production Code

For production use, you would usually add:
- duplicate-key handling or composite keys
- iterators instead of eager array materialization for large scans
- deterministic seeding or controlled randomness for tests
- memory-pool or allocator awareness in low-level runtimes
- concurrency control if the structure is shared across threads

The point of the example is to show the durable mechanics:
- search path collection
- local pointer rewiring
- bottom-level range iteration


# 9. When to Use It and Common Pitfalls

Skip lists are useful, but they are not a default choice for every ordered workload.

### Good Fit

Skip lists are usually a good fit when:
- the data must stay ordered
- inserts and deletes happen frequently
- predecessor, successor, or range queries matter
- you want a simpler alternative to implementing a balanced tree from scratch

### Poor Fit

Skip lists are often a weaker fit when:
- the workload is mostly static and arrays are sufficient
- memory overhead from extra pointers is a major concern
- exact-key lookup is the only operation and a hash table would be simpler
- disk-page locality is the primary design constraint

### Common Pitfalls

1. Treating expected complexity as a worst-case guarantee
2. Choosing a promotion policy without measuring memory impact
3. Forgetting that duplicates need a defined policy
4. Returning large ranges eagerly when streaming would be safer
5. Assuming concurrency is easy just because there are no rotations

### Bad vs Good Operational Habits

```text
Bad:
├── Use a skip list for exact-key lookups with no ordered reads
├── Ignore duplicate-key strategy until later
├── Expose large range scans without backpressure
└── Assume random level distribution never needs testing

Good:
├── Choose skip lists when sorted access patterns are real
├── Define key uniqueness or composite-key rules up front
├── Cap maximum level and validate memory cost
└── Test search, delete, and range behavior under skewed inserts
```

### A Practical Decision Rule

Ask:
- do I need sorted order
- do I need frequent updates
- do I need range iteration

If the answer is "yes" to all three, a skip list is often worth considering alongside balanced trees and B-tree-family structures.


# 10. Summary

**Skip lists** are layered ordered linked structures that usually provide logarithmic lookup, insert, and delete behavior by adding sparse shortcut levels above a full bottom-level list.

**Their main practical strength** is that they combine ordered access with relatively local updates, which makes them useful for in-memory indexes, schedulers, range-heavy data structures, and some concurrent ordered maps.

**Their main trade-offs** are probabilistic shape in common implementations, extra pointer memory, and the fact that they are not automatically the best choice when order does not matter or when page-oriented disk layouts dominate the design.

**Implementation checklist:**

```text
Structure:
  □ Add a head sentinel with a fixed maximum level
  □ Keep level 0 fully ordered and fully linked
  □ Record predecessors during search for insert/delete operations

Algorithm:
  □ Define the promotion policy and maximum level explicitly
  □ Handle duplicate keys with a clear overwrite or composite-key rule
  □ Shrink empty top levels after deletes when appropriate

Performance:
  □ Measure memory overhead from forward pointers
  □ Benchmark range scans, not just point lookups
  □ Compare against arrays, balanced trees, and hash tables for your workload

Reliability:
  □ Test skewed inserts, repeated deletes, and empty-range queries
  □ Make randomness deterministic in tests when possible
  □ Add concurrency control only after defining the sharing model clearly
```
