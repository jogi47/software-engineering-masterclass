# Vertical vs Horizontal Scaling

[← Back to Index](README.md)

Imagine you are running a growing commerce API. Traffic is climbing, checkout latency is getting worse, and the team decides the answer is "just add more capacity." One engineer wants a larger database machine. Another wants more API replicas. A third adds sticky sessions so carts keep working across replicas.

Without a clear scaling model, teams often mix these moves in unsafe ways:

```typescript
type CartItem = {
  sku: string;
  quantity: number;
  priceCents: number;
};

class CheckoutApi {
  private readonly carts = new Map<string, CartItem[]>();
  private readonly requestsPerMinute = new Map<string, number>();

  addItem(sessionId: string, item: CartItem): void {
    const currentCart = this.carts.get(sessionId) ?? [];
    currentCart.push(item);
    this.carts.set(sessionId, currentCart);
  }

  canAcceptRequest(clientIp: string): boolean {
    const current = this.requestsPerMinute.get(clientIp) ?? 0;
    this.requestsPerMinute.set(clientIp, current + 1);
    return current < 100;
  }

  checkout(sessionId: string): number {
    const cart = this.carts.get(sessionId);

    if (!cart || cart.length === 0) {
      throw new Error("cart not found");
    }

    return cart.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  }
}
```

This looks harmless on one node. It stops being harmless when you grow:
- adding replicas breaks carts and rate limits because state lives in one process
- moving to a bigger machine may postpone pain, but one node still carries the whole failure domain
- neither choice helps if the real bottleneck is the write database, a hot key, or a downstream queue

This is where **vertical and horizontal scaling** come in. They are two different ways to add capacity, but they are not interchangeable and they are rarely chosen once for the whole system. Strong designs scale each layer differently, based on what kind of bottleneck it actually has.

In this chapter quick links:
  * [Why scaling choices matter](#1-why-scaling-choices-matter)
  * [What vertical and horizontal scaling mean](#2-what-vertical-and-horizontal-scaling-mean)
  * [Vertical scaling: scaling up](#3-vertical-scaling-scaling-up)
  * [Horizontal scaling: scaling out](#4-horizontal-scaling-scaling-out)
  * [State, coordination, and why horizontal scaling is not just add more nodes](#5-state-coordination-and-why-horizontal-scaling-is-not-just-add-more-nodes)
  * [Scaling the data layer](#6-scaling-the-data-layer)
  * [How real systems combine both approaches](#7-how-real-systems-combine-both-approaches)
  * [Practical TypeScript patterns](#8-practical-typescript-patterns)
  * [When to use which and common pitfalls](#9-when-to-use-which-and-common-pitfalls)
  * [Summary](#10-summary)


# 1. Why Scaling Choices Matter

Scaling is not only about handling "more users." It is about deciding where to add capacity, where to reduce coordination, and where to spend operational complexity.

### The First Question Is Always "What Is the Bottleneck?"

More traffic can expose very different limits:
- CPU saturation in application code
- memory pressure from large working sets
- storage IOPS limits in the database
- network bandwidth limits
- contention on one lock, shard, or partition
- one external dependency that cannot keep up

```text
request path:

client
  |
  v
load balancer -> api replicas -> cache -> primary database -> disk
                              \-> queue -> workers -> object storage

possible bottlenecks:
  api cpu
  cache memory
  database writes
  queue backlog
  downstream network or storage
```

If you scale the wrong tier, you only move the queue:
- more API replicas do not fix a saturated primary database
- a larger database node does not fix node-local sessions in the API layer
- more workers do not help if one remote API is rate-limiting you

### Scaling Is Also a Reliability Decision

Capacity and reliability often interact:

```text
one large node:
  simpler coordination
  but bigger blast radius if it fails

many smaller nodes:
  better failure isolation
  but more coordination, routing, and observability work
```

That is why scaling discussions should include:
- performance targets
- uptime expectations
- failure modes
- operational maturity
- cost tolerance

### Different Layers Usually Need Different Answers

A durable rule is:

```text
do not ask "should the system scale vertically or horizontally?"
ask "which layer needs which kind of scaling, and why?"
```

Examples:
- a stateless API tier often scales horizontally well
- a relational primary database often scales vertically first
- batch workers often scale horizontally from queue depth
- caches may scale vertically for simplicity, then horizontally when memory or throughput pressure grows

### Scaling Too Early Can Be Wasteful, but Scaling Too Late Is Also Expensive

Premature scaling can add:
- distributed coordination before it is needed
- higher cloud bills from overprovisioning
- more moving parts to monitor and secure

Waiting too long can add:
- chronic latency spikes
- frequent incidents
- risky emergency migrations
- brittle one-off tuning instead of deliberate architecture

The goal is not maximal sophistication. The goal is **enough capacity with acceptable complexity**.


# 2. What Vertical and Horizontal Scaling Mean

Vertical and horizontal scaling are both ways to add capacity, but they change different things in the system.

### Vertical Scaling Means Increasing the Capacity of One Node

Vertical scaling, or **scaling up**, means giving one machine or one runtime instance more resources:
- more CPU
- more memory
- faster storage
- higher network throughput
- sometimes a larger database or cache instance class

```text
vertical scaling:

before:
┌──────────────┐
│ app node     │
│ 2 CPU / 4 GB │
└──────────────┘

after:
┌────────────────────┐
│ app node           │
│ 8 CPU / 32 GB      │
└────────────────────┘
```

The application topology may stay mostly the same. One node simply gets a larger resource envelope.

### Horizontal Scaling Means Adding More Nodes

Horizontal scaling, or **scaling out**, means adding more machines or instances and distributing work across them.

```text
horizontal scaling:

before:
client -> ┌──────────────┐
          │ app node A   │
          └──────────────┘

after:
                ┌──────────────┐
client -> LB -> │ app node A   │
                ├──────────────┤
                │ app node B   │
                ├──────────────┤
                │ app node C   │
                └──────────────┘
```

This sounds straightforward, but it only works well if the application and its dependencies can share load safely.

### These Are Layer-Specific Choices, Not One Global Architecture Label

The same system may use both at once:
- vertically scale the primary relational database
- horizontally scale stateless API replicas
- horizontally scale queue consumers
- vertically scale one cache node at first, then move to a clustered cache later

### A Conservative Comparison

```text
┌──────────────────────────────┬──────────────────────────────────────┬──────────────────────────────────────┐
│ Dimension                    │ Vertical scaling                    │ Horizontal scaling                  │
├──────────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ main move                    │ bigger node                         │ more nodes                          │
├──────────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ operational shape            │ simpler topology                    │ more distributed coordination       │
├──────────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ capacity step size           │ larger jumps                        │ often smaller increments            │
├──────────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ failure domain               │ one larger node                     │ spread across multiple nodes        │
├──────────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ architectural demand         │ lower                               │ higher                              │
├──────────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ practical ceiling            │ hardware / instance limits          │ coordination and shared-state limits│
└──────────────────────────────┴──────────────────────────────────────┴──────────────────────────────────────┘
```

Neither approach is inherently better. The question is which failure and coordination costs you are willing to pay.


# 3. Vertical Scaling (Scaling Up)

Vertical scaling is often the first move because it can preserve an existing design while buying time.

### Why Teams Reach for Vertical Scaling First

Scaling up is attractive because it often requires fewer application changes:
- no load balancer changes for one-node software
- no new distributed coordination model
- no repartitioning of data
- fewer code paths around retries, duplication, or idempotency

If a monolith or database is hitting CPU or memory limits, moving to a larger node may be the fastest low-risk step.

### Where Vertical Scaling Works Well

Vertical scaling is often a strong fit when:
- the bottleneck is clearly one-node CPU, memory, or storage capacity
- the application is still evolving and you do not want distributed complexity yet
- the tier is stateful and hard to partition safely
- licensing, latency, or operational constraints favor fewer nodes

Common examples:
- increasing memory for an in-memory cache
- moving a relational primary to a larger instance
- giving a monolith more CPU during a growth phase
- adding faster SSD-backed storage to improve database performance

### Why It Can Be Operationally Simpler

```text
same topology, bigger box:

before:
client -> app -> database

after:
client -> bigger app -> bigger database
```

Because the topology changes less, debugging and rollback are often easier than in a new distributed layout.

### What Vertical Scaling Does Not Solve

Scaling up does not remove:
- a single point of failure
- one-node maintenance risk
- hot-spot logic that serializes on one lock or one shard
- architectural coupling inside the application

It may improve symptoms while leaving the core design unchanged.

### Practical Limits of Vertical Scaling

Every platform has some limit:
- maximum instance sizes
- diminishing returns from very large machines
- cost jumps between instance classes
- downtime or failover work during resizing

The exact limit varies by hardware, virtualization layer, database engine, and deployment model, so avoid treating any specific ceiling as universal.

### Good and Bad Uses of Scaling Up

```text
Bad:
├── using a larger node to avoid fixing a known data hot spot forever
├── assuming a bigger database primary gives high availability by itself
└── ignoring failover time because throughput improved

Good:
├── buying time while load is still moderate and architecture is in flux
├── scaling a stateful primary conservatively before considering partitioning
└── increasing memory or IOPS after measurement shows that is the real limit
```


# 4. Horizontal Scaling (Scaling Out)

Horizontal scaling adds more nodes and spreads traffic or work across them.

### What Horizontal Scaling Can Buy You

Horizontal scaling is attractive because it can improve multiple properties at once:
- more aggregate throughput
- better fault tolerance than one-node designs
- smaller capacity increments
- rolling deployments and safer maintenance windows

For stateless services, it is often the cleanest path to absorb traffic growth.

### Typical Scale-Out Shapes

```text
request/response scale-out:

                ┌──────────────┐
client -> LB -> │ api node A   │
                ├──────────────┤
                │ api node B   │
                ├──────────────┤
                │ api node C   │
                └──────────────┘
                       |
                       v
                    shared db
```

```text
queue-based scale-out:

producer -> queue -> worker A
                 -> worker B
                 -> worker C
```

The second shape is often easier to scale because the queue already gives you a distribution point and a backlog signal.

### What Horizontal Scaling Demands from the Design

Adding nodes safely often requires:
- shared or externalized state
- load balancing or work distribution
- duplicate-safe processing
- timeout and retry discipline
- observability across many instances
- deployment and configuration consistency

These concerns are the real cost of scaling out.

### Scale-Out Is Rarely Perfectly Linear

Horizontal scaling often improves throughput, but the gain is not usually 1:1 forever.

Reasons include:
- shared databases or caches become bottlenecks
- some requests are more expensive than others
- one partition or tenant is hotter than the rest
- background coordination consumes more network and CPU
- cold starts or autoscaling delays distort short traffic bursts

### Where Horizontal Scaling Usually Fits Best

Common strong fits:
- stateless web and API servers
- queue-driven background workers
- read-heavy caches or search tiers
- partitionable workloads such as per-tenant or per-shard processing

Common weak fits unless the design changes:
- one primary database handling all writes
- session-heavy applications using local process memory
- singleton schedulers without leader election or locking
- workloads dominated by one shared external dependency

### Horizontal Scaling Does Not Mean "No More Limits"

It changes the nature of the limit:

```text
vertical limit:
  one node runs out of headroom

horizontal limit:
  coordination, data placement, or shared dependencies run out of headroom
```

That is why scale-out architecture still needs careful bottleneck analysis.


# 5. State, Coordination, and Why Horizontal Scaling Is Not Just Add More Nodes

The easiest systems to scale out are the ones whose replicas can be replaced, added, or removed without losing correctness.

### Stateless Replicas Are Easy to Reason About

A stateless API replica typically keeps only transient local state:
- request-local variables
- short-lived connection objects
- best-effort local caches

Any replica can handle the next request because correctness-critical state lives elsewhere.

```text
good scale-out shape:

                ┌──────────────┐
client -> LB -> │ api A        │
                ├──────────────┤
                │ api B        │
                ├──────────────┤
                │ api C        │
                └──────┬───────┘
                       |
                       v
        shared session store / database / queue
```

### Local State Creates Hidden Coupling

Node-local state becomes a problem when it affects correctness:
- sessions stored in process memory
- carts or rate limits stored per instance
- files stored only on local disk
- cron jobs that assume only one process exists
- in-memory locks used as if they protect the whole cluster

```text
bad scale-out shape:

                ┌──────────────┐
client -> LB -> │ api A        │ -> local session map A
                ├──────────────┤
                │ api B        │ -> local session map B
                └──────────────┘

same user may hit different nodes
different nodes do not share truth
```

### Sticky Sessions Are Usually a Transitional Tool

Session affinity can reduce disruption while you migrate away from local state, but it has trade-offs:
- uneven load distribution
- harder failover if one node dies
- weaker cache efficiency when one user is pinned
- hidden dependence on one replica staying alive

Sticky sessions can be practical temporarily. They are usually not as flexible as a properly externalized session store.

### Singleton Work Requires Explicit Coordination

One scheduler or one coordinator task does not stay singleton by accident once you scale out.

You often need:
- a lease or leader election for one active coordinator
- database compare-and-set for exclusive claims
- queue semantics that prevent the same job from being worked twice without protection
- idempotent side effects in case duplication still happens

```text
one node:
  local timer may be enough

many nodes:
  local timer on every node creates duplicate work
```

### Not All Local State Is Bad

Local state is acceptable when it is not the source of truth:
- per-instance caches that can be rebuilt
- connection pools
- ephemeral request batching
- metrics buffers eventually flushed elsewhere

The key question is:

```text
if this node disappears,
does the system only lose efficiency,
or does it lose correctness?
```

If the answer is correctness, horizontal scaling needs a stronger design.


# 6. Scaling the Data Layer

Many teams scale the application tier successfully and then discover the real system limit is the data tier.

### Databases Are Different from Stateless APIs

A stateless API can often add replicas quickly. A write-heavy primary database is harder:
- writes may need a single ordering point
- transactions depend on one consistency boundary
- indexes and storage engines have their own contention patterns
- repartitioning data later can be operationally expensive

That is one reason relational primaries are often scaled vertically before they are partitioned.

### A Common Conservative Progression

Many systems follow some variation of this path:

```text
1. optimize queries and indexes
2. add caching where reads repeat
3. scale the primary vertically
4. add read replicas for read-heavy traffic
5. partition or shard when one write path no longer fits
```

This is not a law. It is simply a common risk-reducing order.

### Read Scaling and Write Scaling Are Different Problems

```text
read-heavy system:
  app replicas
    |
    v
  cache -> read replicas -> primary

write-heavy system:
  app replicas
    |
    v
  partitioning / sharding / queue smoothing may matter more
```

Read replicas can help reads, but they do not usually remove the write limit of one primary. They also add consistency questions because replicas may lag.

### Horizontal Data Scaling Usually Requires Explicit Data Placement

Once you shard or partition, you need to answer:
- how keys are mapped to shards
- how hotspots are detected
- how rebalancing happens
- how cross-shard queries or transactions behave

That is significantly more complex than adding API replicas.

### Caching and Asynchrony Often Delay Harder Scaling Moves

Before sharding, teams often gain room by:
- caching hot reads
- precomputing expensive views
- batching writes
- moving non-critical work to queues
- separating online request paths from offline analytics

These do not eliminate the need to scale the data layer eventually, but they can delay risky migrations.

### A Conservative Data-Layer Comparison

```text
┌──────────────────────────────┬──────────────────────────────────────┬──────────────────────────────────────┐
│ Technique                    │ Usually helps with                  │ Main trade-off                       │
├──────────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ bigger primary               │ cpu, memory, iops on one node       │ one-node ceiling remains             │
├──────────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ read replicas                │ read throughput, reporting          │ replica lag, routing complexity      │
├──────────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ cache                        │ repeated hot reads                  │ invalidation and stale reads         │
├──────────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ sharding / partitioning      │ total write and storage growth      │ key placement and cross-shard costs  │
└──────────────────────────────┴──────────────────────────────────────┴──────────────────────────────────────┘
```

### Real-World Pattern

A common production shape looks like this:
- horizontally scaled stateless services on VMs or containers
- a managed relational primary scaled up conservatively
- read replicas or caches for fan-out reads
- queue-based workers scaled from backlog

The exact product choices differ by company and platform. The durable lesson is that **data tiers and application tiers rarely scale the same way**.


# 7. How Real Systems Combine Both Approaches

Most mature systems do not choose one scaling philosophy once and stop. They combine both approaches by layer and over time.

### A Typical Evolution Path

```text
phase 1:
  one application node
  one database node

phase 2:
  bigger application node
  bigger database node

phase 3:
  load balancer
  multiple stateless application nodes
  bigger primary database
  cache

phase 4:
  multiple app nodes
  queue-based workers
  read replicas
  maybe partitioned data where justified
```

This progression is common because it preserves simplicity early and adds distributed complexity only when pressure justifies it.

### Different Layers Often Prefer Different Moves

```text
┌──────────────────────────────┬──────────────────────────────────────────────┐
│ Layer                        │ Common first move                            │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ stateless api                │ horizontal replicas behind a load balancer  │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ queue workers                │ more consumers with bounded concurrency      │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ relational primary           │ vertical scaling, then selective redesign    │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ read path                    │ cache, read replicas, or precomputed views   │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ cache tier                   │ bigger node first, clustering later          │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

These are tendencies, not universal laws.

### Vertical Before Horizontal Is Often Rational, Not Unsophisticated

Teams sometimes treat scale-out as inherently more advanced. That is usually the wrong framing.

If one larger node:
- meets latency goals
- fits the budget
- preserves a simpler failure model
- buys time for product uncertainty to settle

then scaling up may be the better engineering choice for that layer at that moment.

### Horizontal Without Dependency Planning Can Mislead You

A common mistake is to scale the front door and ignore the shared dependency:

```text
5 api replicas -> one saturated primary database

result:
  more application capacity
  same overall bottleneck
  sometimes even more pressure on the database
```

That is why combined scaling should be reasoned about end-to-end.

### Good Layer-by-Layer Thinking

```text
Bad:
├── "everything must scale out"
├── "every component should be microservices-ready now"
└── "more replicas means the system is safe"

Good:
├── measure the hottest tier first
├── choose the lowest-complexity scaling move that actually helps
├── externalize correctness-critical state before replica growth
└── revisit the next bottleneck after each scaling change
```


# 8. Practical TypeScript Patterns

These examples are intentionally compact. They show the kinds of code changes that make scaling safer, not complete production implementations.

### Pattern 1: Move Session State Out of the Process

```typescript
type CartItem = {
  sku: string;
  quantity: number;
  priceCents: number;
};

interface CartStore {
  get(sessionId: string): Promise<CartItem[]>;
  put(sessionId: string, items: CartItem[]): Promise<void>;
}

class CartService {
  constructor(private readonly cartStore: CartStore) {}

  async addItem(sessionId: string, item: CartItem): Promise<void> {
    const currentItems = await this.cartStore.get(sessionId);
    currentItems.push(item);
    await this.cartStore.put(sessionId, currentItems);
  }

  async total(sessionId: string): Promise<number> {
    const items = await this.cartStore.get(sessionId);
    return items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  }
}
```

Any API replica can now serve the next request because the cart is no longer tied to one process.

### Pattern 2: Use a Shared Rate-Limit Store Instead of Per-Node Memory

```typescript
interface CounterStore {
  incrementWithinWindow(key: string, windowSeconds: number): Promise<number>;
}

class SharedRateLimiter {
  constructor(
    private readonly counters: CounterStore,
    private readonly limit: number,
    private readonly windowSeconds: number,
  ) {}

  async allow(clientKey: string): Promise<boolean> {
    const nextCount = await this.counters.incrementWithinWindow(
      clientKey,
      this.windowSeconds,
    );

    return nextCount <= this.limit;
  }
}
```

This keeps rate-limit correctness stable across replicas. In production, the backing store might be Redis, a database table, or another system that supports atomic increments with expiry semantics.

### Pattern 3: Scale Workers Horizontally from Queue Depth

```typescript
type Job = {
  id: string;
  imageUrl: string;
};

interface JobQueue {
  receive(batchSize: number): Promise<Job[]>;
  ack(jobId: string): Promise<void>;
}

interface ImageProcessor {
  resize(imageUrl: string): Promise<void>;
}

class ImageWorker {
  constructor(
    private readonly queue: JobQueue,
    private readonly processor: ImageProcessor,
    private readonly concurrency: number,
  ) {}

  async pollOnce(): Promise<void> {
    const jobs = await this.queue.receive(this.concurrency);

    await Promise.all(
      jobs.map(async (job) => {
        await this.processor.resize(job.imageUrl);
        await this.queue.ack(job.id);
      }),
    );
  }
}
```

This is a good fit for horizontal scaling because work is naturally distributed through the queue. In a real design, you would also account for retries, visibility timeouts, and idempotency.

### Pattern 4: Make Data Placement Explicit When You Partition

```typescript
import { createHash } from "node:crypto";

function shardForTenant(tenantId: string, shardCount: number): number {
  const hash = createHash("sha256").update(tenantId).digest("hex");
  const prefix = hash.slice(0, 8);
  const value = Number.parseInt(prefix, 16);
  return value % shardCount;
}

function ordersTableForTenant(tenantId: string, shardCount: number): string {
  return `orders_shard_${shardForTenant(tenantId, shardCount)}`;
}
```

Horizontal data scaling needs explicit placement logic somewhere. The hard part is not only computing the destination. The hard part is rebalancing safely later if the chosen layout stops being healthy.

### What These Examples Have in Common

All four patterns make one thing explicit:

```text
replicas can only scale safely
when correctness-critical state and work ownership
are modeled outside one process
```


# 9. When to Use Which and Common Pitfalls

You rarely choose between vertical and horizontal scaling in the abstract. You choose based on the workload, the bottleneck, and the operational cost you can support.

### A Conservative Decision Guide

```text
┌──────────────────────────────┬──────────────────────────────────────┬──────────────────────────────────────┐
│ Situation                    │ Usually consider first              │ Why                                  │
├──────────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ monolith hitting cpu         │ vertical scaling                    │ simplest short path                  │
├──────────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ stateless api traffic growth │ horizontal scaling                  │ replicas distribute requests well    │
├──────────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ write-primary saturation     │ vertical + query/index review       │ partitioning is a bigger step        │
├──────────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ read-heavy traffic           │ cache or read replicas              │ reads are easier to fan out          │
├──────────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ queue backlog growth         │ more workers                        │ backlog gives a natural scaling cue  │
├──────────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ node-local sessions          │ state externalization first         │ replicas otherwise break behavior    │
└──────────────────────────────┴──────────────────────────────────────┴──────────────────────────────────────┘
```

### Common Pitfalls

1. Scaling the visible tier instead of the real bottleneck.
2. Treating sticky sessions as a permanent substitute for shared state.
3. Assuming horizontal scaling automatically improves correctness.
4. Sharding before access patterns, hotspots, and operational tooling are understood.
5. Ignoring failover, warmup time, or replica lag while focusing only on throughput.
6. Assuming one benchmark result will hold after data size, tenant mix, or traffic shape changes.

### Bad vs Good Operational Reasoning

```text
Bad:
├── "CPU is high, so add replicas" without checking the database
├── "we have three nodes, so we are highly available" without shared-state design
├── "the cache is hot, so it is safe to make it the only source of truth"
└── "the workload doubled, so throughput will double if nodes double"

Good:
├── measure latency, saturation, error rate, and queue depth together
├── identify whether the limit is compute, memory, storage, network, or coordination
├── choose the smallest safe scaling change first
└── retest because the next bottleneck often appears immediately after the first fix
```

### Conservative Rules of Thumb

- Prefer vertical scaling first when one stateful node is the clear bottleneck and the simpler move still meets the target.
- Prefer horizontal scaling for stateless frontends, APIs, and queue workers when the shared dependencies can also tolerate growth.
- Be suspicious of any scaling plan that does not say where sessions, locks, scheduled work, and rate limits live.
- Treat data partitioning as a serious design step, not as the default answer to moderate growth.
- Measure under realistic traffic mix, not only average throughput. Tail latency and hot partitions often matter more.


# 10. Summary

**Vertical vs horizontal scaling:**
- vertical scaling increases the capacity of one node
- horizontal scaling adds more nodes and distributes work across them

**When vertical scaling is attractive:**
- it often preserves a simpler topology
- it is commonly useful for stateful tiers or early growth phases
- it does not remove one-node failure and ceiling risks

**When horizontal scaling is attractive:**
- it often fits stateless services and queue-driven workers well
- it can improve both throughput and fault tolerance
- it requires explicit handling of shared state, coordination, and duplication

**The hardest scaling work is often not the application tier:**
- databases, caches, and downstream dependencies can become the real constraint
- scaling the front door without scaling shared dependencies can move the bottleneck rather than remove it

**Durable design lesson:**
- scale each layer according to its real bottleneck
- choose the lowest-complexity move that solves the current problem safely
- expect most mature systems to combine both approaches rather than commit to one forever

**Implementation checklist:**

```text
Diagnosis:
  □ Identify the real bottleneck before choosing a scaling strategy
  □ Measure cpu, memory, storage, network, queue depth, and dependency latency together
  □ Re-evaluate the bottleneck after each scaling change

Vertical scaling:
  □ Confirm that one larger node materially improves the measured bottleneck
  □ Check cost jumps, maintenance impact, and failover behavior
  □ Do not confuse bigger nodes with higher availability

Horizontal scaling:
  □ Externalize correctness-critical state such as sessions, locks, and job ownership
  □ Verify retries, idempotency, and duplicate handling across replicas
  □ Ensure load balancing or work distribution is explicit and observable

Data layer:
  □ Separate read scaling from write scaling in the design
  □ Use caching, indexing, and query optimization before reaching for sharding
  □ Define data placement, hotspot handling, and rebalancing plans before partitioning

Operations:
  □ Load-test with realistic traffic shape, not only average requests per second
  □ Monitor tail latency, saturation, replica lag, and queue backlog
  □ Test node loss, rolling deploys, and failover behavior before trusting the scaling model
```
