# HyperLogLog

[← Back to Index](README.md)

Imagine you are building product analytics for a high-traffic platform. The dashboard owner wants daily active users, unique search queries, unique IPs per region, and unique devices per release channel.

Without a cardinality sketch, teams often start with exact sets because the code looks obvious:

```typescript
type AnalyticsEvent = {
  day: string;
  metricKey: string;
  userId: string;
};

class ExactDistinctCounter {
  private readonly uniqueValuesByMetric = new Map<string, Set<string>>();

  record(event: AnalyticsEvent): void {
    const key = `${event.day}:${event.metricKey}`;
    let values = this.uniqueValuesByMetric.get(key);

    if (!values) {
      values = new Set<string>();
      this.uniqueValuesByMetric.set(key, values);
    }

    values.add(event.userId);
  }

  getDistinctCount(day: string, metricKey: string): number {
    return this.uniqueValuesByMetric.get(`${day}:${metricKey}`)?.size ?? 0;
  }
}
```

That works at first, but it becomes expensive quickly:
- memory grows with the number of unique values, not with a predictable budget
- merging shard-local sets means shipping or storing raw distinct IDs
- time-bucketed analytics multiplies the footprint across days, regions, and dimensions
- exactness is often more expensive than the business question actually requires

This is where **HyperLogLog** comes in. HyperLogLog is a probabilistic data structure for estimating how many distinct items you have seen while keeping memory bounded and merge-friendly.

In this chapter, you will learn:
  * [Why HyperLogLog exists](#1-why-hyperloglog-exists)
  * [What HyperLogLog is](#2-what-hyperloglog-is)
  * [What probabilistic intuition makes it work](#3-the-probabilistic-intuition)
  * [How inserts and estimates work](#4-how-inserts-and-estimates-work)
  * [How precision, error, and corrections behave](#5-precision-error-and-corrections)
  * [Why mergeability matters in distributed systems](#6-mergeability-and-distributed-use)
  * [How HyperLogLog compares with related approaches](#7-hyperloglog-vs-related-approaches)
  * [What practical TypeScript implementations look like](#8-practical-typescript-patterns)
  * [When to use it and which pitfalls matter](#9-when-to-use-it-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why HyperLogLog Exists

HyperLogLog exists because distinct counting is deceptively expensive at scale.

### The Core Problem

If you need the exact number of unique users, one direct strategy is:
- hash or store every observed identifier
- keep one set per metric or time bucket
- return the set size

That is correct, but the cost grows with the number of distinct values.

```text
Exact distinct counting:

stream of IDs
    |
    v
Set(user_1, user_2, user_3, ..., user_n)
    |
    v
size = exact count

Main cost driver:
  memory grows with n
```

That can be acceptable when:
- counts are small
- the number of buckets is small
- exactness is mandatory

It becomes a poor fit when you need:
- many independent counters
- large distinct populations
- distributed aggregation across shards or regions
- bounded memory per counter

### The Durable Motivation

The durable motivation is not "exact counting is bad."

The durable motivation is:
- exact counting is often operationally expensive
- many analytics and observability questions tolerate small error
- a fixed-size summary is easier to replicate, merge, and store

### What HyperLogLog Optimizes For

HyperLogLog usually helps with:
- approximate distinct counting
- predictable memory usage based on chosen precision
- inexpensive union across partitions through merge
- large-scale analytics where small relative error is acceptable

### What It Does Not Automatically Solve

HyperLogLog does not automatically give you:
- exact counts
- membership testing
- frequency estimation for individual keys
- deletions of arbitrary items from one shared sketch
- correct windowing unless you design the time buckets explicitly


# 2. What HyperLogLog Is

HyperLogLog is a probabilistic cardinality estimator.

### A Conservative Definition

The durable idea is:

```text
HyperLogLog =
  hash each input value
  + split the hash stream into many small buckets
  + record how "surprising" the best hash in each bucket looks
  + combine those bucket observations into one distinct-count estimate
```

### The Main Terms

The recurring terms are:
- **cardinality**: the number of distinct items
- **hash**: a deterministic bit string produced from an input value
- **register**: one small cell of sketch state
- **precision `p`**: how many bits choose the register
- **`m = 2^p`**: the number of registers
- **rank**: roughly, how many leading zeros appear in part of the hash before the first `1`

### The Structural Mental Model

```text
incoming value
    |
    v
stable hash(value)
    |
    +--> first p bits ----------> register index
    |
    └--> remaining bits --------> rank from leading-zero pattern
                                     |
                                     v
                          update one register with max(rank)

all registers together
    |
    v
cardinality estimate
```

### Why the Memory Stays Bounded

Once you pick `p`, the sketch size is fixed:
- `p = 12` means `m = 4096` registers
- `p = 14` means `m = 16384` registers

The estimate changes as more data arrives, but the register array does not keep every input value.

In simple educational implementations, each register is often stored as one byte in a `Uint8Array`. More compact production formats may pack registers tighter.

### What HyperLogLog Is Not

HyperLogLog is usually not:
- a set replacement when you need exact identity
- a Bloom filter
- a Count-Min Sketch
- a structure that tells you which items were distinct

It tells you approximately **how many** distinct items were seen, not **which** items they were.


# 3. The Probabilistic Intuition

HyperLogLog works because rare bit patterns become more likely as you observe more distinct hashed values.

### Leading Zeros as a Signal

Assume a good hash behaves like random bits.

For a random bit string:
- probability of starting with `1` is `1/2`
- probability of starting with `01` is `1/4`
- probability of starting with `001` is `1/8`
- probability of starting with `0001` is `1/16`

So longer runs of leading zeros are rarer.

```text
Suffix pattern       Rank      Rough probability
1xxxxxxx             1         1 / 2
01xxxxxx             2         1 / 4
001xxxxx             3         1 / 8
0001xxxx             4         1 / 16
00001xxx             5         1 / 32
```

If you keep seeing more distinct hashed values, the chance of encountering at least one unusually long run of leading zeros rises.

### Why One Observation Is Too Noisy

If you watched only the single most extreme hash across the whole stream, variance would be high.

One very lucky hash could distort the estimate.

That is why HyperLogLog does not use only one observation. It spreads the inputs across many registers and then averages those independent signals in a carefully chosen way.

### Stochastic Averaging

A useful mental model is:

```text
one register:
  noisy mini-estimator

many registers:
  many noisy mini-estimators
  + averaging
  -> much more stable estimate
```

This is the key design step from older one-register ideas toward a sketch that stays practical in production systems.

### Why Hash Quality Matters

The sketch assumes the hash output is close enough to uniform for your workload.

If the hash is weak or inconsistent across services:
- buckets may become biased
- estimates may drift
- merge compatibility can break

The durable lesson is simple:
- use a stable, well-understood hash
- make the hash choice part of the sketch contract


# 4. How Inserts and Estimates Work

The core HyperLogLog update path is compact once the pieces are separated clearly.

### Step 1: Hash the Input

Take the input value and compute a deterministic hash.

```text
value = "user-123"
hash  = 110101001011...
```

HyperLogLog relies on the hash, not on the original shape of the input string or identifier.

### Step 2: Choose the Register

Use the first `p` bits of the hash to choose which register to update.

Example with `p = 4`:

```text
hash bits:
  1010 001001101...
   ^^^^
   register index = 10
```

That means the stream is effectively partitioned into `m = 2^p` sub-streams.

### Step 3: Compute the Rank

Use the remaining hash bits to compute the rank:
- count leading zeros
- add `1`

```text
remaining bits:
  001001101...

leading zeros = 2
rank = 3
```

### Step 4: Keep the Maximum Per Register

Each register stores the largest rank it has seen so far.

```text
register[10] before = 2
new rank            = 3
register[10] after  = 3
```

If the new rank is smaller, ignore it.

### Update Flow

```text
incoming value
    |
    v
hash64(value)
    |
    +--> prefix bits ---------> register j
    |
    └--> suffix bits ---------> rank rho(w)
                                  |
                                  v
                     M[j] = max(M[j], rho(w))
```

### How the Estimate Is Derived

After many inserts, HyperLogLog combines all register values with a harmonic-mean-like calculation.

A common raw estimate is:

```text
E = alpha(m) * m^2 / Σ(2^-M[j])

where:
  m     = number of registers
  M[j]  = value stored in register j
  alpha = small correction constant based on m
```

You do not need to memorize the formula to use the structure well. The durable takeaway is:
- large register values push the estimate upward
- many registers make the estimate more stable
- the final estimate comes from the whole register distribution, not one extreme bucket

### Why the Registers Can Be Merged

Each register stores "the strongest evidence seen for this bucket so far."

That means if two sketches were built with the same configuration and hash function, their union is:
- same number of registers
- same register positions
- value-by-value maximum

The merge logic is simple because maxima preserve the strongest observation from each bucket.


# 5. Precision, Error, and Corrections

HyperLogLog is attractive because you can trade memory for accuracy in a predictable way.

### Precision and Register Count

The precision parameter `p` controls the number of registers:

```text
m = 2^p
```

More registers usually mean:
- lower relative error
- more memory
- the same simple merge semantics

### Approximate Error

A commonly cited relative standard error is:

```text
about 1.04 / sqrt(m)
```

That is an approximation, not a universal hard guarantee for every workload.

### Practical Trade-Off Table

```text
┌────┬────────────┬─────────────────────┬────────────────────────────┐
│ p  │ registers  │ approx. std. error  │ simple 1-byte/register mem │
├────┼────────────┼─────────────────────┼────────────────────────────┤
│ 10 │ 1,024      │ about 3.25%         │ about 1 KB                 │
├────┼────────────┼─────────────────────┼────────────────────────────┤
│ 12 │ 4,096      │ about 1.63%         │ about 4 KB                 │
├────┼────────────┼─────────────────────┼────────────────────────────┤
│ 14 │ 16,384     │ about 0.81%         │ about 16 KB                │
├────┼────────────┼─────────────────────┼────────────────────────────┤
│ 16 │ 65,536     │ about 0.41%         │ about 64 KB                │
└────┴────────────┴─────────────────────┴────────────────────────────┘
```

The exact memory footprint depends on how registers are encoded. The table above uses a deliberately simple one-byte-per-register model.

### Small-Cardinality Correction

Plain raw estimation is weaker when the sketch is still sparse and many registers remain zero.

That is why many implementations apply a small-range correction such as **linear counting** when:
- the raw estimate is still low
- there are still many zero registers

The durable idea is:
- if many registers are untouched, the sketch is telling you the set is still relatively sparse
- zero-register information is useful and should not be ignored

### Bias Correction and Practical Variants

Mature implementations often add:
- empirical bias correction tables
- sparse encodings for small cardinalities
- engineering refinements sometimes grouped under names like HLL++

You do not need every refinement to understand the core design, but you should know that production implementations often improve accuracy at the low-cardinality end.

### Large-Scale Considerations

At sufficiently large scales, hash collisions become another source of error.

The practical response is usually:
- use a wide, stable hash
- keep expectations aligned with approximation
- validate the chosen precision against real workload ranges


# 6. Mergeability and Distributed Use

Mergeability is one of HyperLogLog's biggest operational strengths.

### Why Distributed Systems Care

Many real systems do not count distinct items on one machine:
- traffic is sharded
- regions operate independently
- data is aggregated in multiple stages
- local counters feed hourly or daily reports

With exact sets, merging often means:
- moving large collections of raw IDs
- performing expensive set unions
- paying memory costs at both shard and aggregator layers

With HyperLogLog, merge is register-wise maximum.

### The Merge Shape

```text
Shard A HLL ----\
Shard B HLL -----+--> register-wise max --> global HLL --> estimate
Shard C HLL ----/
```

This is useful because each shard can emit a fixed-size sketch instead of a growing set of distinct IDs.

### Example Scenarios

HyperLogLog is often a practical fit for:
- daily active users per product surface
- approximate unique IPs or devices in telemetry pipelines
- unique queries or search terms per time bucket
- unique counterparties or entities in large event streams

The durable pattern is:
- compute locally
- merge centrally
- read the estimate from the merged sketch

You will also see HyperLogLog-style ideas behind approximate distinct operators in analytics systems and stream-processing pipelines, even when the exact implementation variant differs.

### Time Buckets and Sliding Windows

One important limitation is that HyperLogLog does not support clean arbitrary deletion from a shared sketch.

If you need windowed counts, a common design is:
- one sketch per hour or day
- merge the relevant sketches for the query window

```text
window query for last 24 hours:
  merge(HLL_10:00, HLL_11:00, ..., HLL_09:00)
```

That keeps retention and recomputation manageable without pretending the sketch can "unsee" one value directly.

### Merge Safety Requirements

Only merge sketches when these match:
- precision `p`
- register count `m`
- hash function
- serialization or register interpretation

If those differ, the result is not trustworthy.


# 7. HyperLogLog vs Related Approaches

HyperLogLog is strong for one job. It is a mistake to stretch it into several others.

### Comparison Table

```text
┌───────────────────┬──────────────────────────────┬─────────────────────────────┬────────────────────────────────────┐
│ Approach          │ Main question answered       │ Memory shape                │ Best fit                           │
├───────────────────┼──────────────────────────────┼─────────────────────────────┼────────────────────────────────────┤
│ Exact hash set    │ "How many unique exactly?"   │ grows with distinct items   │ small to medium sets, exact logic  │
├───────────────────┼──────────────────────────────┼─────────────────────────────┼────────────────────────────────────┤
│ Bitmap / bitset   │ "How many unique exactly?"   │ fixed by keyspace size      │ bounded dense integer IDs          │
├───────────────────┼──────────────────────────────┼─────────────────────────────┼────────────────────────────────────┤
│ Bloom filter      │ "Might this item exist?"     │ fixed by target error rate  │ approximate membership tests       │
├───────────────────┼──────────────────────────────┼─────────────────────────────┼────────────────────────────────────┤
│ Count-Min Sketch  │ "How often did x occur?"     │ fixed by error parameters   │ approximate frequency estimation   │
├───────────────────┼──────────────────────────────┼─────────────────────────────┼────────────────────────────────────┤
│ HyperLogLog       │ "How many distinct items?"   │ fixed by chosen precision   │ large-scale approximate uniques    │
└───────────────────┴──────────────────────────────┴─────────────────────────────┴────────────────────────────────────┘
```

### Exact Sets vs HyperLogLog

Prefer an exact set when:
- correctness must be exact
- cardinality is not large
- you also need iteration over the actual distinct items

Prefer HyperLogLog when:
- exact identity is not needed
- bounded memory matters more than exactness
- mergeability across shards is important

### Bitmaps vs HyperLogLog

If identifiers are small bounded integers, a bitmap can be exact and simple.

HyperLogLog becomes more attractive when:
- identifiers are unbounded or sparse
- the keyspace is too large for a practical bitmap
- you need one compact sketch per many dimensions or time buckets

### Bloom Filters and Count-Min Sketches

These structures solve different problems:
- Bloom filters answer approximate membership
- Count-Min Sketches answer approximate frequency
- HyperLogLog answers approximate distinct count

Choosing among them is mostly about asking the right question first.


# 8. Practical TypeScript Patterns

The following implementation keeps the core mechanics visible:
- fixed precision
- 64-bit hashing
- register updates
- linear-counting correction for sparse sketches
- register-wise merge

It is intentionally compact enough to study. Mature production implementations often add more bias correction, sparse encoding, and better serialization.

### A Minimal HyperLogLog Implementation

```typescript
import { createHash } from "node:crypto";

const HASH_WIDTH = 64;

const hash64 = (value: string): bigint => {
  const hex = createHash("sha256").update(value).digest("hex").slice(0, 16);
  return BigInt(`0x${hex}`);
};

const alphaFor = (registerCount: number): number => {
  switch (registerCount) {
    case 16:
      return 0.673;
    case 32:
      return 0.697;
    case 64:
      return 0.709;
    default:
      return 0.7213 / (1 + 1.079 / registerCount);
  }
};

const countLeadingZeros = (value: bigint, width: number): number => {
  let zeros = 0;

  for (let bit = width - 1; bit >= 0; bit -= 1) {
    const mask = 1n << BigInt(bit);

    if ((value & mask) !== 0n) {
      return zeros;
    }

    zeros += 1;
  }

  return zeros;
};

class HyperLogLog {
  private readonly registers: Uint8Array;
  private readonly registerCount: number;

  constructor(private readonly precision: number = 14) {
    if (precision < 4 || precision > 18) {
      throw new RangeError("precision must be between 4 and 18");
    }

    this.registerCount = 1 << precision;
    this.registers = new Uint8Array(this.registerCount);
  }

  add(value: string): void {
    const hashed = hash64(value);
    const suffixWidth = HASH_WIDTH - this.precision;
    const registerIndex = Number(hashed >> BigInt(suffixWidth));
    const suffixMask = (1n << BigInt(suffixWidth)) - 1n;
    const suffix = hashed & suffixMask;
    const rank = countLeadingZeros(suffix, suffixWidth) + 1;

    if (rank > this.registers[registerIndex]) {
      this.registers[registerIndex] = rank;
    }
  }

  addAll(values: Iterable<string>): void {
    for (const value of values) {
      this.add(value);
    }
  }

  estimate(): number {
    let zeroRegisters = 0;
    let denominator = 0;

    for (const register of this.registers) {
      denominator += 2 ** -register;

      if (register === 0) {
        zeroRegisters += 1;
      }
    }

    const rawEstimate =
      alphaFor(this.registerCount) *
      this.registerCount *
      this.registerCount /
      denominator;

    if (rawEstimate <= 2.5 * this.registerCount && zeroRegisters > 0) {
      return this.registerCount * Math.log(this.registerCount / zeroRegisters);
    }

    return rawEstimate;
  }

  merge(other: HyperLogLog): HyperLogLog {
    if (this.precision !== other.precision) {
      throw new Error("cannot merge HyperLogLog sketches with different precision");
    }

    const merged = new HyperLogLog(this.precision);

    for (let index = 0; index < this.registerCount; index += 1) {
      merged.registers[index] = Math.max(
        this.registers[index],
        other.registers[index],
      );
    }

    return merged;
  }
}
```

### Example Usage

```typescript
const shardA = new HyperLogLog(12);
const shardB = new HyperLogLog(12);

shardA.addAll([
  "user-1",
  "user-2",
  "user-3",
  "user-3",
  "user-4",
]);

shardB.addAll([
  "user-3",
  "user-4",
  "user-5",
  "user-6",
]);

const globalSketch = shardA.merge(shardB);

console.log({
  shardAEstimate: Math.round(shardA.estimate()),
  shardBEstimate: Math.round(shardB.estimate()),
  globalEstimate: Math.round(globalSketch.estimate()),
});
```

### A Practical Bucketed Wrapper

In analytics systems you often want one sketch per logical key.

```typescript
class DailyApproximateUniques {
  private readonly sketches = new Map<string, HyperLogLog>();

  record(day: string, metricKey: string, userId: string): void {
    const bucketKey = `${day}:${metricKey}`;
    let sketch = this.sketches.get(bucketKey);

    if (!sketch) {
      sketch = new HyperLogLog(14);
      this.sketches.set(bucketKey, sketch);
    }

    sketch.add(userId);
  }

  estimate(day: string, metricKey: string): number {
    return Math.round(
      this.sketches.get(`${day}:${metricKey}`)?.estimate() ?? 0,
    );
  }
}
```

### Practical Notes for Production Code

For production use, you would usually add:
- a documented binary serialization format
- versioned hash selection
- compatibility checks during merge
- small-range and bias corrections consistent with your chosen variant
- tests comparing estimates against exact counts on representative datasets

The durable mechanics remain the same:
- hash
- choose register
- compute rank
- keep the max
- estimate from the register distribution


# 9. When to Use It and Common Pitfalls

HyperLogLog is useful, but only when the question and error tolerance match the structure.

### Good Fit

HyperLogLog is usually a good fit when:
- you need approximate distinct counts
- the number of counters is large
- memory per counter must stay bounded
- sketches must be merged across shards, regions, or time buckets
- a small relative error is acceptable for the use case

### Poor Fit

HyperLogLog is often a weak fit when:
- exact billing or compliance counts are required
- you need to know which distinct items were present
- membership queries matter more than cardinality
- the total cardinality is small enough that an exact set is simpler
- you need arbitrary deletions from one long-lived sketch

### Common Pitfalls

1. Using HyperLogLog where exactness is contractually required
2. Merging sketches built with different precision or different hashes
3. Ignoring small-cardinality behavior and then distrusting the sketch
4. Treating the estimate as a hard guarantee instead of a statistical estimate
5. Forgetting that one long-lived sketch cannot easily support removals
6. Picking precision by guesswork instead of measuring acceptable error and memory

### Bad vs Good Operational Habits

```text
Bad:
├── Reuse one sketch forever and expect clean per-day numbers
├── Merge sketches without verifying hash and precision compatibility
├── Use HyperLogLog for exact invoices or legal reports
└── Assume the sketch can answer membership questions

Good:
├── Choose a precision based on memory budget and tolerated relative error
├── Bucket sketches by time window or dimension explicitly
├── Keep exact sets only where exactness is truly required
└── Validate estimate error against sampled exact calculations
```

### A Conservative Real-World View

Approximate distinct counting is widely useful in analytics, telemetry, search, fraud monitoring, and stream processing, but the right question is always:

```text
Is an estimate acceptable here?
```

If the answer is no, use an exact structure and pay the cost knowingly.


# 10. Summary

**HyperLogLog** is a probabilistic sketch for estimating the number of distinct items in a stream with bounded memory and straightforward merge semantics.

**Its main practical strength** is that memory is driven mostly by chosen precision rather than by the number of distinct inputs. That makes it operationally attractive for large numbers of counters and for distributed aggregation.

**Its main trade-offs** are approximation, dependence on stable hashing, limited support for deletions, and the need to choose precision and correction behavior deliberately instead of treating the sketch like an exact set.

**Implementation checklist:**

```text
Structure:
  □ Define the business question as approximate distinct counting, not membership or frequency
  □ Choose the precision p and document the resulting register count
  □ Store sketches in explicit buckets such as per day, region, or metric key

Hashing:
  □ Use a stable, well-understood hash function across all producers and consumers
  □ Treat the hash choice as part of the sketch compatibility contract
  □ Test deterministic behavior across services and languages if multiple runtimes are involved

Estimation:
  □ Measure acceptable relative error before choosing precision
  □ Handle sparse small-cardinality cases with an appropriate correction strategy
  □ Validate estimates against exact counts on representative samples

Distributed Use:
  □ Merge sketches only when precision and hash configuration match
  □ Version serialization and sketch format explicitly
  □ Design time-window aggregation with one sketch per bucket instead of relying on deletions

Reliability:
  □ Test duplicate-heavy streams and high-cardinality streams
  □ Test merge correctness across shard-local sketches
  □ Document where estimates are acceptable and where exact counts are still required
```
