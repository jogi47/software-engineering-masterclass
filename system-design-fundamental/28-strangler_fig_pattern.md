# Strangler Fig Pattern

[← Back to Index](README.md)

Imagine you own a monolithic commerce platform that handles catalog, cart, checkout, and order history. The codebase has years of business rules inside it, deployments are slow, and every change feels risky. The tempting plan is to freeze feature work, rewrite everything as services, and switch over when the new platform is "ready."

Without a strangler approach, migration plans often turn into expensive parallel systems with no safe path to production:

```typescript
// Bad example: one-shot rewrite with a hard cutover and no incremental migration path.
class MigrationProgram {
  async replaceEntirePlatform(): Promise<void> {
    await this.rebuildCatalog();
    await this.rebuildCart();
    await this.rebuildCheckout();
    await this.rebuildOrders();
    await this.migrateAllHistoricalData();
    await this.flipAllTrafficAtOnce();
  }

  private async rebuildCatalog(): Promise<void> {}
  private async rebuildCart(): Promise<void> {}
  private async rebuildCheckout(): Promise<void> {}
  private async rebuildOrders(): Promise<void> {}
  private async migrateAllHistoricalData(): Promise<void> {}
  private async flipAllTrafficAtOnce(): Promise<void> {}
}
```

This usually fails in predictable ways:
- the new system takes longer than expected because the old behavior is only partly understood
- feature delivery slows because teams must support the legacy system and the rewrite at the same time
- cutover risk grows because validation happens late instead of continuously
- data and contract mismatches surface near launch, when rollback is hardest

This is where the **Strangler Fig pattern** comes in. Instead of replacing the whole system at once, you route a small, well-understood slice of behavior to a new implementation, keep the legacy path running for the rest, and expand the new boundary step by step.

In this chapter, you will learn:
  * [Why the Strangler Fig pattern exists](#1-why-the-strangler-fig-pattern-exists)
  * [What the pattern is and is not](#2-what-the-strangler-fig-pattern-is)
  * [Which building blocks make incremental migration possible](#3-core-building-blocks)
  * [How migration flow usually works end to end](#4-how-strangler-migration-works)
  * [How to choose migration boundaries and routing strategies](#5-routing-boundaries-and-migration-strategies)
  * [How to handle data ownership and state migration safely](#6-data-migration-and-state-management)
  * [What practical TypeScript implementations look like](#7-practical-typescript-patterns)
  * [Which operational practices make the pattern safer](#8-best-practices)
  * [When to use the pattern and which pitfalls to avoid](#9-when-to-use-it-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why the Strangler Fig Pattern Exists

The Strangler Fig pattern exists because many organizations need to modernize systems that are too important to stop, too large to replace in one move, and too poorly understood to rewrite confidently.

### The Core Problem

Legacy systems usually fail modernization efforts for organizational reasons before they fail for technical ones:
- the system still delivers business value every day
- critical behavior is spread across code, database triggers, manual workflows, and tribal knowledge
- teams cannot pause all feature work for a long rewrite
- one large cutover creates a single high-risk event

```text
Without incremental migration:

legacy monolith ---> freeze changes ---> rebuild everything ---> big cutover day

Common result:
  -> migration takes years
  -> confidence stays low
  -> business deadlines force shortcuts
  -> rollback becomes difficult
```

### Why "Rewrite It Cleanly" Is Often Misleading

The old system often contains behavior that nobody would design today, but that behavior may still be relied on by customers, operators, or downstream integrations.

Examples:
- undocumented validation rules
- implicit data repair logic
- timing assumptions in batch jobs
- unusual partner-specific API behavior

Incremental migration exposes those dependencies earlier because the new implementation handles real production traffic in controlled slices.

### What the Pattern Buys You

A strangler migration tries to create:
- smaller blast radius for each change
- earlier production validation
- continuous business delivery during modernization
- clearer ownership as new components replace old ones

The goal is not "microservices at any cost." The goal is controlled replacement of legacy behavior with measurable progress.


# 2. What the Strangler Fig Pattern Is

The Strangler Fig pattern is an incremental replacement strategy in which traffic, workflows, or capabilities are gradually redirected from a legacy system to new components until the old implementation can be retired.

### A Conservative Definition

The durable idea is:

```text
Strangler Fig = legacy system kept in service
              + routing boundary in front of behavior
              + incremental replacement of capabilities
              + retirement of old paths after validation
```

### What It Is Not

The pattern is usually not:
- a requirement to move to microservices
- a guarantee that the legacy system becomes easy to understand
- the same thing as copying data into a new stack and hoping it works
- a reason to run permanent duplicate logic without an exit plan

### Why the Name Fits

A strangler fig tree gradually grows around a host tree and eventually replaces it. In software, the metaphor is useful if you interpret it carefully:
- the old system keeps supporting the product while new structure grows around it
- more traffic and responsibilities shift outward over time
- the legacy core shrinks until it can be removed

### High-Level Model

```text
Before:
  client -> legacy monolith

During migration:
  client -> routing boundary -> legacy path
                            -> new service for selected capability

After migration:
  client -> new components
```

The important idea is controlled coexistence. Old and new run together for a while, but the architecture should move toward simplification, not permanent duplication.


# 3. Core Building Blocks

Most strangler migrations rely on the same few building blocks, even if the underlying platform differs.

### 1. Routing Boundary

You need a place to decide whether a request or workflow goes to the legacy implementation or the new one.

Common choices:
- an API gateway
- an ingress proxy
- an internal application router
- a module-level abstraction inside the monolith

```text
┌──────────────┐      ┌──────────────────┐
│ Client       │ ---> │ Routing boundary │
└──────────────┘      └───────┬──────────┘
                              │
                  ┌───────────┴───────────┐
                  ▼                       ▼
          ┌──────────────┐       ┌────────────────┐
          │ Legacy path  │       │ New capability │
          └──────────────┘       └────────────────┘
```

### 2. Capability Slice

Migration works best when each step replaces a bounded capability, not a vague technology layer.

Good slices often map to:
- a single user journey such as order history read-only views
- one business capability such as product pricing
- one integration boundary such as partner notification delivery

Weak slices often sound like:
- "move the whole database first"
- "split out everything related to users"
- "replatform all APIs before traffic shift"

### 3. Contract Boundary

The new implementation needs a clear contract for:
- inputs and outputs
- validation rules
- idempotency behavior
- error mapping
- latency and consistency expectations

An anti-corruption layer can help if the legacy model is awkward or unstable.

### 4. Observability and Comparison Signals

Before expanding traffic, you need evidence that old and new behavior align closely enough.

Useful signals include:
- response correctness checks
- side-by-side shadow execution for safe reads
- latency and error comparisons
- business counters such as order placement rate or refund mismatches

### 5. Retirement Path

A migration step is incomplete if nobody knows how to delete the old code, routes, and data dependencies afterward.

Every capability slice should have:
- an owner
- explicit completion criteria
- rollback criteria
- deletion criteria for the legacy path


# 4. How Strangler Migration Works

The end-to-end flow is usually straightforward even though the organizational work around it can be hard.

### Step-by-Step Flow

```text
1. Identify one bounded capability
2. Put or confirm a routing boundary in front of it
3. Build the new implementation for that slice
4. Validate contracts and data assumptions
5. Send a small amount of real traffic to the new path
6. Compare correctness, latency, and operational behavior
7. Increase traffic gradually
8. Stop sending traffic to the legacy path for that slice
9. Remove obsolete legacy code and integration paths
10. Repeat for the next slice
```

### Example Migration Sequence

Consider a monolithic retail application:

```text
Phase 1:
  product detail reads -> new catalog read service

Phase 2:
  cart pricing -> new pricing service

Phase 3:
  shipment tracking notifications -> new event-driven workflow

Phase 4:
  remaining legacy routes narrowed and retired
```

### A Safer Traffic Progression

Gradual rollout usually looks more like this than a one-time switch:

```text
0%   -> all traffic stays on legacy
1%   -> internal users or a low-risk cohort
10%  -> selected production segment
50%  -> broader cohort with rollback ready
100% -> legacy route disabled for that slice
```

### Shadow and Mirror Traffic Need Care

For read paths, some teams mirror traffic to compare outputs before routing live responses from the new system.

That can be useful, but only if:
- side effects are suppressed
- privacy and compliance requirements are respected
- comparison logic is explicit about acceptable differences

Shadowing is a validation tool, not a migration strategy by itself.


# 5. Routing Boundaries and Migration Strategies

The hardest design decision is often not "how do we build the new service?" but "where do we place the migration seam and how do we route safely across it?"

### Strategy 1: Edge Routing

Requests are split before they enter the legacy application.

Good fit when:
- capability boundaries already exist at the HTTP or API level
- consumers can tolerate route-level differences
- you want clear service ownership outside the monolith

Risk:
- useful only if the legacy system is not still required for hidden side effects

### Strategy 2: In-Process Branch by Abstraction

Instead of routing at the edge, the monolith introduces an internal interface and switches implementation behind it.

```text
monolith controller
  -> order history interface
       -> legacy implementation
       -> new implementation
```

Good fit when:
- the current capability is deeply embedded in monolith internals
- you need the same public API while replacing internals gradually
- you want smaller refactoring steps before extraction

### Strategy 3: Event Interception or Workflow Replacement

Some migrations are easier at the workflow boundary than the request boundary.

Examples:
- legacy app still writes orders, but fulfillment events are handled by a new workflow
- legacy billing continues, but notification delivery moves to a new event consumer

### Comparison Table

```text
┌───────────────────────────┬──────────────────────────────────────────────┬─────────────────────────────────────┐
│ Strategy                  │ Best Fit                                     │ Main Risk                           │
├───────────────────────────┼──────────────────────────────────────────────┼─────────────────────────────────────┤
│ Edge routing              │ Clear API or page boundary                   │ Hidden legacy side effects remain   │
├───────────────────────────┼──────────────────────────────────────────────┼─────────────────────────────────────┤
│ Branch by abstraction     │ Internals need refactoring before extraction │ Temporary duplication inside code   │
├───────────────────────────┼──────────────────────────────────────────────┼─────────────────────────────────────┤
│ Workflow replacement      │ Async jobs or events are separable           │ Event ordering and idempotency gaps │
└───────────────────────────┴──────────────────────────────────────────────┴─────────────────────────────────────┘
```

### Choose a Seam That You Can Prove

A migration seam is strong when:
- ownership is clear
- input and output contracts are testable
- operational signals can be compared
- rollback does not require database surgery

A seam is weak when:
- success depends on undocumented cross-module behavior
- many unrelated tables must be migrated together
- every request still needs synchronous legacy callbacks


# 6. Data Migration and State Management

Data is where strangler migrations often slow down. Routing traffic is usually simpler than deciding which system owns which state, when that ownership changes, and how consistency is maintained during the transition.

### Ownership Before Synchronization

Start by declaring which system is authoritative for each data set.

```text
Example ownership map:

legacy monolith:
  - customer profile writes
  - invoice generation

new services:
  - product catalog reads and writes
  - shipment tracking state
```

If ownership is unclear, synchronization pipelines tend to grow into permanent complexity.

### Common Transition Models

#### Legacy as System of Record First

The new service reads from replicated or projected legacy data while the legacy system remains authoritative.

Good fit when:
- you are replacing read-heavy capability first
- write migration is not yet safe

#### Dual Write with Strong Guardrails

Both systems are written during a temporary transition.

This is risky and should be used carefully because:
- partial failure can create divergence
- retry behavior becomes complex
- rollback can be messy

If dual write is unavoidable, keep it time-bounded and heavily instrumented.

#### Ownership Cutover

The new service becomes the source of truth for one capability, and the legacy system consumes that state through APIs or events.

This is usually the clearest long-term end state.

### Data Flow Diagram

```text
Read-first migration:

legacy DB --> CDC / projection --> new read model --> new service
    ▲                                          |
    └--------------- legacy writes ------------┘

Ownership cutover later:

new service --> new DB --> published events --> legacy consumer or reporting path
```

### Consistency Questions to Resolve Early

You usually need explicit answers for:
- which writes are allowed in which system
- how identifiers map between old and new schemas
- how stale data is detected
- how replay or backfill is performed
- what reconciliation process exists if counts diverge

Do not rely on "we will compare the databases later" as the primary safety mechanism.


# 7. Practical TypeScript Patterns

The pattern is architectural, but the implementation often comes down to a few practical code structures: routers, adapters, and migration-aware services.

### Example 1: Capability Router

This example routes one capability to either the legacy or new implementation based on a migration policy.

```typescript
type RouteTarget = "legacy" | "new";

interface ProductCatalog {
  getProduct(productId: string): Promise<{ id: string; name: string; priceCents: number }>;
}

class MigrationPolicy {
  constructor(
    private readonly enabledProductIds: ReadonlySet<string>,
    private readonly enabledPercentage: number,
  ) {}

  routeProduct(productId: string): RouteTarget {
    if (this.enabledProductIds.has(productId)) {
      return "new";
    }

    const bucket = this.hash(productId) % 100;
    return bucket < this.enabledPercentage ? "new" : "legacy";
  }

  private hash(value: string): number {
    let result = 0;
    for (const char of value) {
      result = (result * 31 + char.charCodeAt(0)) >>> 0;
    }
    return result;
  }
}

class CatalogRouter implements ProductCatalog {
  constructor(
    private readonly policy: MigrationPolicy,
    private readonly legacyCatalog: ProductCatalog,
    private readonly newCatalog: ProductCatalog,
  ) {}

  async getProduct(productId: string) {
    const target = this.policy.routeProduct(productId);
    return target === "new"
      ? this.newCatalog.getProduct(productId)
      : this.legacyCatalog.getProduct(productId);
  }
}
```

### Example 2: Anti-Corruption Adapter

New services often need to translate legacy contracts instead of leaking them deeper into the replacement system.

```typescript
type LegacyOrderRecord = {
  order_no: string;
  total_amount: string;
  state_code: "N" | "P" | "S" | "C";
};

type OrderStatus = "new" | "paid" | "shipped" | "cancelled";

type OrderSummary = {
  orderId: string;
  totalCents: number;
  status: OrderStatus;
};

class LegacyOrderAdapter {
  toOrderSummary(record: LegacyOrderRecord): OrderSummary {
    return {
      orderId: record.order_no,
      totalCents: Math.round(Number(record.total_amount) * 100),
      status: this.mapStateCode(record.state_code),
    };
  }

  private mapStateCode(stateCode: LegacyOrderRecord["state_code"]): OrderStatus {
    switch (stateCode) {
      case "N":
        return "new";
      case "P":
        return "paid";
      case "S":
        return "shipped";
      case "C":
        return "cancelled";
    }
  }
}
```

### Example 3: Reconciliation-Friendly Write Path

During transition, it helps to record enough metadata to compare behavior and support rollback.

```typescript
type MigrationWriteResult = {
  target: RouteTarget;
  orderId: string;
  requestId: string;
  appliedAtIso: string;
};

interface CheckoutWriter {
  placeOrder(userId: string, cartId: string, requestId: string): Promise<MigrationWriteResult>;
}

class RoutedCheckoutWriter implements CheckoutWriter {
  constructor(
    private readonly policy: MigrationPolicy,
    private readonly legacyWriter: CheckoutWriter,
    private readonly newWriter: CheckoutWriter,
    private readonly auditSink: { record(event: Record<string, unknown>): Promise<void> },
  ) {}

  async placeOrder(
    userId: string,
    cartId: string,
    requestId: string,
  ): Promise<MigrationWriteResult> {
    const target = this.policy.routeProduct(cartId);
    const result =
      target === "new"
        ? await this.newWriter.placeOrder(userId, cartId, requestId)
        : await this.legacyWriter.placeOrder(userId, cartId, requestId);

    await this.auditSink.record({
      migrationTarget: result.target,
      orderId: result.orderId,
      requestId,
      appliedAtIso: result.appliedAtIso,
    });

    return result;
  }
}
```

These examples are intentionally simple, but they capture the common pattern: explicit routing, explicit translation, and explicit observability around the migration seam.


# 8. Best Practices

The pattern is most effective when technical design and migration governance reinforce each other.

### Start with Read Paths or Low-Risk Workflows

Safer first candidates often include:
- catalog pages
- order history reads
- notification fan-out
- reporting pipelines

Harder first candidates often include:
- payment authorization
- inventory reservation
- identity and session management

Starting with a safer slice gives the team time to build routing, observability, and rollback habits.

### Make Routing Rules Explicit

Avoid migration logic hidden in scattered conditionals.

Prefer:
- one policy component or route table
- versioned feature flags or cohort rules
- clear default behavior when configuration is missing

### Instrument for Business Correctness, Not Just HTTP Health

A route that returns `200 OK` can still be wrong.

Track:
- mismatched business outcomes
- duplicate events
- reconciliation counts
- dropped notifications
- percentage of traffic still touching legacy code

### Keep Every Slice Reversible

Before expanding traffic, confirm:
- how to route traffic back
- how to handle partially migrated state
- which alerts indicate rollback is required

If rollback requires emergency scripts and manual database repair, the slice is probably too large.

### Delete Legacy Paths Aggressively After Stabilization

A strangler migration only creates lasting value if old code and integrations are actually removed. Otherwise the platform accumulates:
- duplicate contracts
- duplicated operational runbooks
- ongoing reconciliation burden
- unclear ownership


# 9. When to Use It and Common Pitfalls

The Strangler Fig pattern is useful when modernization must happen in production without betting everything on a single rewrite event. It is a poor fit when the migration seam is undefined or the organization is unwilling to operate old and new paths together for a while.

### Good Fit

The pattern is often a good fit when:
- the current system is business-critical and cannot be paused
- capability boundaries can be carved out incrementally
- you can introduce routing, abstraction, or workflow seams
- the team can invest in observability and reconciliation

### Weak Fit

It may be a weak fit when:
- the system is small enough to replace directly with modest risk
- the old system cannot be modified at all and no external seam exists
- the organization lacks the capacity to run dual paths during transition
- the data model is so tangled that no bounded capability can stand alone yet

### Common Pitfalls

```text
Pitfall:
  "We moved traffic, so the migration is done."
Reality:
  legacy cron jobs, reports, and hidden writes still depend on old state

Pitfall:
  "We will dual write until we are comfortable."
Reality:
  temporary sync code becomes permanent and fragile

Pitfall:
  "We extracted a service, therefore the design is better."
Reality:
  a poorly chosen boundary can create more coupling than it removes

Pitfall:
  "We can compare logs later."
Reality:
  without up-front comparison metrics, correctness gaps are hard to prove
```

### Strangler Fig vs Big-Bang Rewrite

```text
Big-bang rewrite:
  -> one large delivery milestone
  -> validation arrives late
  -> rollback is difficult

Strangler migration:
  -> many smaller milestones
  -> validation happens in production incrementally
  -> rollback can be scoped to one capability
```

### Strangler Fig vs Branch by Abstraction

Branch by abstraction is often one implementation technique inside a strangler migration, not a full alternative.

```text
Branch by abstraction:
  focuses on replacing internals behind one interface

Strangler Fig:
  focuses on system-level incremental replacement and retirement
```

Use the pattern when you need a migration strategy, not just a refactoring technique.


# 10. Summary

**Why the pattern matters:**
- It gives you a controlled way to modernize legacy systems while they continue serving production traffic.
- It reduces rewrite risk by validating small capability slices instead of postponing truth until one large cutover.

**What makes it work:**
- A clear migration seam
- explicit routing policy
- careful data ownership decisions
- strong observability and reconciliation
- disciplined retirement of legacy paths

**What to watch closely:**
- hidden dependencies in the legacy system
- long-lived dual writes or duplicate workflows
- migration slices that are too large to roll back safely
- "temporary" compatibility layers that outlive the migration

**Implementation checklist:**

```text
Planning:
  □ Identify one bounded capability to replace first
  □ Define the migration seam: edge route, abstraction, or workflow boundary
  □ Set rollout, rollback, and deletion criteria for that slice

Contracts:
  □ Document request, response, validation, and error behavior
  □ Add an adapter or anti-corruption layer if legacy contracts are awkward
  □ Decide which differences are acceptable during side-by-side comparison

Data:
  □ Declare source-of-truth ownership for each affected data set
  □ Choose a transition model: read replica/projection, temporary dual write, or ownership cutover
  □ Define reconciliation and backfill procedures before production rollout

Operations:
  □ Instrument correctness, latency, error rate, and legacy traffic percentage
  □ Roll out gradually with cohort or percentage-based routing
  □ Keep rollback fast and test it before broad expansion

Retirement:
  □ Remove legacy routes, jobs, and integration dependencies after stabilization
  □ Delete temporary migration code and sync logic
  □ Update ownership and runbooks so the new boundary is permanent
```
