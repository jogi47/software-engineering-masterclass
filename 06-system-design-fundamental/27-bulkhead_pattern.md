# Bulkhead Pattern

[← Back to Index](README.md)

Imagine you run a checkout service that calls payments, inventory, shipping quotes, and recommendations. The first version looks efficient because it uses one shared worker pool and one shared queue for all outbound work.

Without bulkheads, optional work can quietly consume the same capacity that critical work needs:

```typescript
// Bad example: unrelated dependency calls compete for one shared execution budget.
class SharedExecutor {
  constructor(private readonly capacity: number) {}

  async run<T>(operation: () => Promise<T>): Promise<T> {
    return operation();
  }
}

class CheckoutPageService {
  private readonly sharedExecutor = new SharedExecutor(32);

  async loadPage(userId: string): Promise<void> {
    await Promise.all([
      this.sharedExecutor.run(() => this.fetchCart(userId)),
      this.sharedExecutor.run(() => this.fetchPaymentMethods(userId)),
      this.sharedExecutor.run(() => this.fetchInventory(userId)),
      ...Array.from({ length: 20 }, () =>
        this.sharedExecutor.run(() => this.fetchRecommendations(userId)),
      ),
    ]);
  }

  private async fetchCart(_userId: string): Promise<void> {}
  private async fetchPaymentMethods(_userId: string): Promise<void> {}
  private async fetchInventory(_userId: string): Promise<void> {}
  private async fetchRecommendations(_userId: string): Promise<void> {}
}
```

This usually fails in predictable ways:
- recommendation spikes can fill the same queue used by payment or inventory calls
- slow downstream requests hold threads, event-loop time, sockets, or connection slots
- a noisy tenant or expensive endpoint can degrade unrelated requests
- the caller becomes unhealthy even though only one compartment is under pressure

This is where the **Bulkhead pattern** comes in. A bulkhead isolates resources into separate compartments so overload or failure in one path does not consume all shared capacity.

In this chapter, you will learn:
  * [Why bulkheads exist](#1-why-bulkheads-exist)
  * [What the bulkhead pattern is and is not](#2-what-the-bulkhead-pattern-is)
  * [Which isolation models and building blocks matter](#3-isolation-models-and-building-blocks)
  * [How bulkhead flow works end to end](#4-how-bulkhead-flow-works)
  * [How to choose boundaries, budgets, and degradation policy](#5-choosing-boundaries-budgets-and-degradation-policy)
  * [How bulkheads compare to adjacent resilience patterns](#6-bulkhead-vs-adjacent-resilience-patterns)
  * [What practical TypeScript implementations look like](#7-practical-typescript-patterns)
  * [Which best practices make the pattern safer](#8-best-practices)
  * [Where bulkheads fit and which pitfalls to avoid](#9-where-bulkheads-fit-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why Bulkheads Exist

Bulkheads exist because shared capacity is finite, and distributed failures often spread through that shared capacity before they spread through correctness bugs.

### The Core Problem

Many systems accidentally let unrelated work compete for the same resources:
- one thread pool for every downstream call
- one async queue for both critical and optional jobs
- one database connection pool for user traffic and reporting work
- one worker deployment for customer-facing events and backfills

```text
Without bulkheads:

critical calls ─┐
optional calls ─┼──> shared pool / shared queue / shared connections
batch jobs    ──┘

Problems:
  -> one hot path consumes the common budget
  -> queueing delay rises for everyone
  -> timeouts and retries amplify the contention
```

### Contention Is Often the Real Failure Mode

The dependency that looks "down" is sometimes only slow. The deeper issue is that the caller keeps spending the same limited budget on that slow path:
- worker slots stay occupied
- pending work grows faster than it drains
- deadlines expire while requests are waiting, not while they are executing
- unrelated operations inherit the slowdown

### What Needs Isolation

Bulkheads can isolate several kinds of scarce resources:
- concurrent execution slots
- request queues
- database or HTTP connection pools
- background worker capacity
- CPU and memory budgets at a process or container boundary

The durable idea is not tied to one runtime. It is about keeping one compartment from exhausting the full system.

### Where Bulkheads Help Most

Bulkheads are especially useful when:
- critical and optional work share infrastructure today
- one dependency can become slow without fully failing
- some tenants, features, or jobs are much more expensive than others
- you need predictable degradation instead of fleet-wide contention

If the workload is tiny, synchronous, and not under meaningful contention, bulkheads may add policy complexity without enough benefit.


# 2. What the Bulkhead Pattern Is

A bulkhead is a resource-isolation boundary that reserves or limits capacity for one class of work so overload in that class cannot consume all shared resources.

### A Conservative Definition

The durable idea is:

```text
Bulkhead = resource compartment + admission policy + bounded blast radius
```

A bulkhead usually does three things:
- assigns a dedicated budget to a dependency, feature, tenant class, or job type
- admits work only while that compartment has capacity
- rejects, delays, or degrades excess work instead of letting it consume everything

### What It Is Not

A bulkhead is usually not:
- a replacement for timeouts or deadlines
- the same thing as autoscaling
- a guarantee that one compartment can never fail
- a reason to create dozens of tiny pools without evidence

### The Ship Analogy Is Useful

On a ship, watertight compartments limit flooding. In software, compartments limit resource exhaustion.

```text
Ship:
  one breached compartment should not sink the whole vessel

Software:
  one overloaded path should not consume all worker slots or connections
```

### High-Level Model

```text
┌──────────────────────────────────────────────────────────┐
│ Caller service                                           │
│                                                          │
│  critical checkout calls  -> [bulkhead A: 12 slots]      │
│  search indexing jobs    -> [bulkhead B: 4 slots]       │
│  recommendations         -> [bulkhead C: 6 slots]       │
│                                                          │
│  overload in C should not consume A                      │
└──────────────────────────────────────────────────────────┘
```

The exact mechanism can vary, but the important behavior is consistent: work is compartmentalized before contention spreads.


# 3. Isolation Models and Building Blocks

Most bulkhead designs can be understood through a few common isolation models and policy choices.

### 1. Separate Concurrency Pools

One common approach is separate execution budgets:
- dedicated thread pools
- dedicated async semaphores
- dedicated worker counts

This is often the clearest application-level bulkhead because concurrency is explicit and measurable.

### 2. Separate Queues

Queues are useful only when they are bounded and intentionally separated.

```text
Good:
  checkout queue        max 200
  export queue          max 50

Risky:
  one shared queue      unbounded
```

An unbounded shared queue is not a bulkhead. It is delayed failure.

### 3. Separate Connection Budgets

Bulkheads also show up in connection management:
- separate HTTP client pools per dependency
- separate database pools for OLTP and reporting
- separate consumers for critical and non-critical topics

If every path still shares one downstream pool, isolation may only look real on paper.

### 4. Admission and Rejection Policy

Each compartment needs a policy for excess load:
- reject immediately
- wait briefly, then reject
- drop optional work
- route to a degraded path
- persist for later handling if the use case supports it

### 5. Observability Signals

You usually need at least these signals per bulkhead:
- active concurrency
- queue depth
- rejection count
- wait time before execution
- success, failure, and timeout rate after admission

Without these, operators often cannot tell whether the bottleneck is admission, execution, or the dependency itself.

### 6. Capacity Ownership

A practical bulkhead also needs a clear answer to: who owns the budget?

Common boundaries include:
- per dependency
- per endpoint or feature
- per tenant tier
- per job class

The right boundary depends on where contention actually happens, not on how the org chart happens to be drawn.


# 4. How Bulkhead Flow Works

Bulkhead flow is usually simple: classify work, send it to the right compartment, and refuse to let one compartment consume another's budget.

### Step-by-Step Flow

```text
1. A request arrives
2. The caller classifies each unit of work
3. Each unit is sent to its assigned bulkhead
4. If capacity exists, the work starts
5. If the bulkhead is full, policy applies: reject, wait briefly, or degrade
6. Completed work releases capacity back to that compartment
7. Other compartments continue independently
```

### End-to-End Example

Consider a checkout page:
- payment methods are critical
- cart and inventory are important
- recommendations are optional

```text
┌──────────────┐
│ page request │
└──────┬───────┘
       │
       ├──────────────> [payments bulkhead] ─────────────> payment service
       ├──────────────> [inventory bulkhead] ────────────> inventory service
       └──────────────> [recommendation bulkhead] ───────> recommendation service

If recommendations saturate:
  -> recommendation work queues or fails
  -> payment and inventory still keep their own capacity
```

### When One Compartment Fills Up

When a bulkhead is saturated, the system should behave deliberately:
- critical paths may wait briefly and then fail fast
- optional paths may skip work and continue
- background jobs may be deferred to later

The key is that saturation stays local.

### Bulkheads Can Exist at Multiple Layers

You can apply the same idea at different levels:
- inside one process with semaphores or executors
- across worker deployments with separate autoscaling targets
- at the database layer with separate pools
- at the infrastructure boundary with CPU and memory limits

These layers can complement each other, but infrastructure isolation does not automatically replace application-level isolation.

### Bulkheads Need a Matching Product Decision

Capacity isolation only works well when the product behavior is explicit.

```text
Critical payment path:
  if full -> fail fast with clear error

Optional recommendations path:
  if full -> omit recommendations and continue
```

The technical mechanism and the user-facing degradation policy should be designed together.


# 5. Choosing Boundaries, Budgets, and Degradation Policy

The difficult part of bulkheads is usually not the primitive. It is deciding what to isolate, how much capacity to reserve, and what to do when that capacity runs out.

### Start with the Scarce Resource

Ask which shared budget actually gets exhausted first:
- worker concurrency
- queue depth
- HTTP sockets
- database connections
- CPU or memory

Bulkhead the resource that creates the incident, not the one that is easiest to label.

### Common Isolation Boundaries

Useful boundaries often include:
- per remote dependency
- critical vs optional user-path work
- foreground vs background processing
- premium vs standard tenant workloads
- short-running vs long-running jobs

Do not create a separate pool for every tiny function. Isolation should match a real contention or business boundary.

### Budget Dimensions Matter

A bulkhead budget is usually more than one number:
- max concurrent executions
- max queued items
- max wait time before rejection
- timeout once admitted

```text
Example:
  payments bulkhead
    concurrency: 12
    queue: 24
    max wait: 50 ms
    execution timeout: 700 ms
```

### Size for the Normal Case, Then Protect the Worst Case

A common mistake is sizing every pool for the traffic peak of every feature simultaneously. That can recreate contention indirectly.

Prefer a more deliberate approach:
- start from measured steady-state demand
- reserve headroom for critical paths
- keep optional pools smaller
- review rejection and latency data after real incidents

### Degradation Policy Should Be Explicit

Before rollout, decide what happens when a compartment is full:
- fail fast
- return stale data
- omit optional sections
- enqueue durable work for later

If that decision is left implicit, teams often discover the real policy only during an outage.


# 6. Bulkhead vs Adjacent Resilience Patterns

Bulkheads work best as one part of a broader resilience design. They solve a specific problem: shared-capacity isolation.

### Bulkhead vs Circuit Breaker

A bulkhead limits how much capacity one path can consume.

A circuit breaker decides whether to keep calling an unhealthy dependency.

```text
Bulkhead:
  can one path consume all local capacity?

Circuit breaker:
  should we keep attempting this dependency at all?
```

They often complement each other:
- the bulkhead protects local resources
- the circuit breaker reduces repeated pressure on the remote system

### Bulkhead vs Timeout

A timeout limits how long one admitted operation can run.

A bulkhead limits how many operations are admitted in the first place.

Without timeouts, bulkhead slots can stay occupied too long. Without bulkheads, timeouts may still allow too much queueing and contention.

### Bulkhead vs Rate Limiting

Rate limiting controls request volume over time.

Bulkheads control concurrent or queued resource consumption inside a compartment.

You can be under a requests-per-second limit and still exhaust a shared worker pool.

### Bulkhead vs Priority Queueing

Priority queues can help important work jump ahead, but they are not always enough on their own.

If every class of work still shares the same workers and the same downstream pool, priority can reduce pain without fully isolating failure.

### A Practical Comparison

```text
┌──────────────────────┬────────────────────────────────────────────┬────────────────────────────────────────────┐
│ Pattern              │ Main job                                   │ Typical question answered                  │
├──────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Timeout              │ bound one call's wait time                 │ how long may one attempt run               │
├──────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Retry                │ reattempt transient failure                │ should this request be tried again         │
├──────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Circuit breaker      │ stop repeated calls to unhealthy dependency│ should we keep calling this dependency     │
├──────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Bulkhead             │ isolate shared capacity                    │ can this path consume everyone else's pool │
├──────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Rate limiting        │ control allowed traffic volume             │ how much traffic is allowed over time      │
└──────────────────────┴────────────────────────────────────────────┴────────────────────────────────────────────┘
```

### The Pattern Stack Usually Matters More Than One Pattern Alone

In practice, robust services often combine:
- deadlines and timeouts
- modest retries for safe operations
- circuit breakers for repeated downstream failure
- bulkheads for local capacity isolation
- observability so operators can see which compartment is full


# 7. Practical TypeScript Patterns

The examples here are intentionally small, but they show maintainable ways to express bulkhead boundaries in application code.

### Pattern 1: A Minimal Semaphore Bulkhead

```typescript
class BulkheadRejectedError extends Error {
  constructor(public readonly bulkheadName: string) {
    super(`Bulkhead "${bulkheadName}" is full`);
  }
}

type BulkheadSnapshot = {
  name: string;
  capacity: number;
  inUse: number;
  queued: number;
};

class SemaphoreBulkhead {
  private inUse = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(
    private readonly name: string,
    private readonly capacity: number,
    private readonly maxQueue: number,
  ) {}

  async run<T>(operation: () => Promise<T>): Promise<T> {
    await this.acquire();

    try {
      return await operation();
    } finally {
      this.release();
    }
  }

  snapshot(): BulkheadSnapshot {
    return {
      name: this.name,
      capacity: this.capacity,
      inUse: this.inUse,
      queued: this.waiters.length,
    };
  }

  private acquire(): Promise<void> {
    if (this.inUse < this.capacity) {
      this.inUse += 1;
      return Promise.resolve();
    }

    if (this.waiters.length >= this.maxQueue) {
      throw new BulkheadRejectedError(this.name);
    }

    return new Promise<void>((resolve) => {
      this.waiters.push(() => {
        this.inUse += 1;
        resolve();
      });
    });
  }

  private release(): void {
    this.inUse -= 1;

    const next = this.waiters.shift();
    if (next) {
      next();
    }
  }
}
```

### Pattern 2: Isolate Dependencies by Criticality

```typescript
type Cart = { itemCount: number };
type PaymentMethod = { id: string; label: string };
type InventoryStatus = { available: boolean };
type Recommendation = { sku: string };

interface CartClient {
  fetchCart(userId: string): Promise<Cart>;
}

interface PaymentClient {
  fetchMethods(userId: string): Promise<PaymentMethod[]>;
}

interface InventoryClient {
  fetchInventory(userId: string): Promise<InventoryStatus>;
}

interface RecommendationClient {
  fetchRecommendations(userId: string): Promise<Recommendation[]>;
}

class CheckoutPageService {
  private readonly paymentsBulkhead = new SemaphoreBulkhead("payments", 8, 16);
  private readonly inventoryBulkhead = new SemaphoreBulkhead("inventory", 12, 24);
  private readonly recommendationsBulkhead = new SemaphoreBulkhead("recommendations", 4, 8);

  constructor(
    private readonly cartClient: CartClient,
    private readonly paymentClient: PaymentClient,
    private readonly inventoryClient: InventoryClient,
    private readonly recommendationClient: RecommendationClient,
  ) {}

  async loadPage(userId: string): Promise<{
    cart: Cart;
    paymentMethods: PaymentMethod[];
    inventory: InventoryStatus;
    recommendations: Recommendation[];
  }> {
    const cartPromise = this.cartClient.fetchCart(userId);

    const paymentPromise = this.paymentsBulkhead.run(() =>
      this.paymentClient.fetchMethods(userId),
    );

    const inventoryPromise = this.inventoryBulkhead.run(() =>
      this.inventoryClient.fetchInventory(userId),
    );

    const recommendationsPromise = this.recommendationsBulkhead
      .run(() => this.recommendationClient.fetchRecommendations(userId))
      .catch((error: unknown) => {
        if (error instanceof BulkheadRejectedError) {
          return [];
        }

        throw error;
      });

    const [cart, paymentMethods, inventory, recommendations] = await Promise.all([
      cartPromise,
      paymentPromise,
      inventoryPromise,
      recommendationsPromise,
    ]);

    return { cart, paymentMethods, inventory, recommendations };
  }
}
```

### Pattern 3: Separate Background Work Classes

```typescript
type Job = {
  id: string;
  kind: "email" | "webhook" | "backfill";
  run(): Promise<void>;
};

class WorkerLane {
  constructor(
    private readonly name: string,
    private readonly bulkhead: SemaphoreBulkhead,
  ) {}

  async dispatch(job: Job): Promise<void> {
    await this.bulkhead.run(() => job.run());
  }

  describe(): string {
    const snapshot = this.bulkhead.snapshot();
    return `${this.name}: ${snapshot.inUse}/${snapshot.capacity} active`;
  }
}

class JobRouter {
  private readonly customerLane = new WorkerLane(
    "customer-facing",
    new SemaphoreBulkhead("customer-facing", 10, 20),
  );

  private readonly backfillLane = new WorkerLane(
    "backfill",
    new SemaphoreBulkhead("backfill", 2, 10),
  );

  async route(job: Job): Promise<void> {
    const lane = job.kind === "backfill" ? this.backfillLane : this.customerLane;
    await lane.dispatch(job);
  }
}
```

### Pattern 4: Expose Per-Bulkhead Telemetry

```typescript
class BulkheadRegistry {
  constructor(private readonly bulkheads: SemaphoreBulkhead[]) {}

  getSnapshots(): BulkheadSnapshot[] {
    return this.bulkheads.map((bulkhead) => bulkhead.snapshot());
  }
}

const registry = new BulkheadRegistry([
  new SemaphoreBulkhead("payments", 8, 16),
  new SemaphoreBulkhead("inventory", 12, 24),
  new SemaphoreBulkhead("recommendations", 4, 8),
]);

console.log(registry.getSnapshots());
```

A bulkhead that cannot be observed is difficult to tune. Rejections and queue growth should be visible before users tell you about them.


# 8. Best Practices

Bulkheads are simple in principle, but easy to misuse if the boundaries and policies are vague.

### Best Practice 1: Isolate by Contention, Not by Habit

Create compartments where contention is real:
- expensive dependencies
- long-running jobs
- optional fan-out work
- noisy tenant classes

Do not create new pools only because "every service should have them."

### Best Practice 2: Keep Critical and Optional Work Apart

This is often the highest-value split:
- checkout authorization vs recommendations
- user-facing events vs historical backfills
- read-path traffic vs heavy exports

If the optional path has to degrade, the critical path should stay usable.

### Best Practice 3: Bound Queues Deliberately

Bounded queues force a choice. That is usually healthier than letting latency expand indefinitely.

```text
Better:
  small queue + explicit reject or degrade

Worse:
  infinite queue + hidden minutes of waiting
```

### Best Practice 4: Pair Bulkheads with Timeouts and Cancellation

Once a slot is admitted, it still needs protection:
- request timeout
- cancellation or deadline propagation
- cleanup on failure

Otherwise saturated compartments may recover too slowly because work never releases capacity in time.

### Best Practice 5: Tune with Metrics, Not Intuition Alone

Watch:
- queue depth percentiles
- rejection rate
- time spent waiting for admission
- completion latency after admission
- saturation during incidents and load tests

The first capacity guess is rarely the last one you should keep.


# 9. Where Bulkheads Fit and Common Pitfalls

Bulkheads are most helpful where resource contention can spread broadly and quickly.

### Where Bulkheads Often Fit Well

Common places to use them include:
- per-dependency HTTP client concurrency inside application services
- separate worker deployments or consumer groups for foreground and backfill jobs
- separate database pools for transactional traffic and reporting queries
- multi-tenant systems where premium and standard workloads need different protection

At the infrastructure layer, teams also use container or pod resource limits to constrain blast radius. Those controls help, but they usually do not replace request-level or dependency-level bulkheads inside the service.

### Pitfall 1: Reintroducing a Shared Bottleneck

You can isolate at one layer and still lose at another.

Examples:
- separate executors that still share one downstream connection pool
- separate worker queues that still write through one saturated database pool
- separate service instances that still depend on one common cache cluster

### Pitfall 2: Oversizing Every Compartment

If every pool is large "just to be safe," you may recreate the original problem:
- too much concurrency against a slow dependency
- too many queued jobs competing for memory
- too little protection for critical paths

Isolation works because budgets are meaningful, not because they are generous.

### Pitfall 3: No Clear Degradation Policy

When a bulkhead fills up, the system should not improvise.

Decide in advance:
- what fails fast
- what retries later
- what returns partial data
- what gets dropped with audit visibility

### Pitfall 4: Ignoring Hidden Coupling

Compartments can still share:
- the same DNS path
- the same auth service
- the same service mesh or proxy layer
- the same process memory ceiling

Bulkheads reduce one class of blast radius. They do not remove every shared dependency.

### Pitfall 5: Assuming Infrastructure Isolation Is Enough

Container limits, pod quotas, and autoscaling are useful, but they do not answer finer-grained questions such as:
- should recommendation fan-out share payment capacity
- should backfills share worker slots with user-facing events
- should reporting queries share database connections with checkout

Those are application-level bulkhead decisions, not only infrastructure decisions.


# 10. Summary

**Why bulkheads exist:**
- shared capacity such as workers, queues, and connection pools can turn one slow path into a wider outage
- isolating resources keeps overload local instead of letting it spread through the whole caller
- deliberate degradation is usually easier to operate than accidental global contention

**What the pattern does well:**
- separates critical and non-critical work into independent capacity compartments
- limits how much any one dependency, feature, or tenant class can consume
- makes local saturation visible through admission, rejection, and queue metrics

**What it should not replace:**
- explicit timeouts and cancellation
- circuit breakers, retries, and other dependency controls
- capacity planning and measurement
- clear product decisions about what degrades and what must fail fast

**Practical design advice:**
- isolate around real contention points such as worker slots, downstream pools, or long-running jobs
- keep queues bounded and rejection policy explicit
- verify that hidden shared dependencies do not undo the isolation you thought you had

**Implementation checklist:**

```text
Scope and boundaries:
  □ Identify which shared resource is actually causing contention
  □ Choose bulkhead boundaries by dependency, job class, feature criticality, or tenant class
  □ Keep critical and optional work in different compartments when their failure tolerance differs

Budgets and policy:
  □ Set concurrency, queue size, wait time, and execution timeout deliberately
  □ Decide whether excess work should fail fast, degrade, defer, or be dropped
  □ Avoid unbounded shared queues that only hide overload

Reliability controls:
  □ Add timeouts and cancellation so admitted work releases capacity predictably
  □ Consider pairing bulkheads with circuit breakers for unstable downstream dependencies
  □ Verify that downstream connection pools and shared services do not recreate one global bottleneck

Operations:
  □ Emit metrics for active slots, queue depth, admission latency, and rejections
  □ Load test noisy-neighbor and slow-dependency scenarios before broad rollout
  □ Review bulkhead sizing after incidents instead of freezing the first configuration forever
```
