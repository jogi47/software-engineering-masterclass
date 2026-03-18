# Monolithic Architecture

[← Back to Index](README.md)

Imagine you are building a B2B operations platform for inventory, billing, user management, and reporting. The product is still evolving quickly, but the team decides on day one that each capability must be a separate service with its own deployment pipeline, database, and API contract.

Without a monolithic starting point, you can end up distributing a system before you understand its real boundaries:

```typescript
// Bad example: a small product split into networked services before the
// domain boundaries, reliability requirements, and team ownership are clear.
class SignupWorkflow {
  async createAccount(input: {
    email: string;
    companyName: string;
    planId: string;
  }): Promise<void> {
    await fetch("http://identity.internal/users", {
      method: "POST",
      body: JSON.stringify({ email: input.email }),
    });

    await fetch("http://billing.internal/customers", {
      method: "POST",
      body: JSON.stringify({ companyName: input.companyName, planId: input.planId }),
    });

    await fetch("http://notifications.internal/welcome-email", {
      method: "POST",
      body: JSON.stringify({ email: input.email }),
    });
  }
}
```

This usually breaks in predictable ways:
- a simple product now needs service discovery, retries, tracing, and deployment coordination
- one user action spans multiple remote calls even though one process could have handled it
- data consistency becomes harder before scale actually demands that trade-off
- teams spend time on platform mechanics instead of clarifying the domain

This is where **monolithic architecture** comes in. A monolith keeps related application behavior inside one deployable unit so you can centralize business rules, move quickly, and delay distributed-systems complexity until it is justified.

In this chapter, you will learn:
  * [Why monolithic architecture exists](#1-why-monolithic-architecture-exists)
  * [What monolithic architecture is and is not](#2-what-monolithic-architecture-is)
  * [Which building blocks make a monolith healthy](#3-core-building-blocks)
  * [How request flow works inside a monolith](#4-how-a-monolith-handles-requests)
  * [Which strengths make monoliths attractive](#5-why-monoliths-work-well)
  * [Which limits appear as monoliths grow](#6-where-monoliths-struggle)
  * [How to scale and evolve a monolith without chaos](#7-scaling-and-evolution-strategies)
  * [What practical TypeScript implementations look like](#8-practical-typescript-patterns)
  * [When to choose a monolith and which pitfalls to avoid](#9-when-to-use-it-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why Monolithic Architecture Exists

Monolithic architecture exists because many products need a clear, centralized application boundary before they need distributed boundaries.

### The Core Problem

Most systems begin with uncertainty:
- the domain model is still changing
- the highest-traffic paths are not yet known
- team boundaries are fluid
- operational capacity is limited

If you distribute too early, you pay the cost of networked systems before you earn the benefit.

```text
Early product reality:
  unclear domain boundaries
  + frequent schema changes
  + small team
  + fast iteration needs

Premature distribution adds:
  -> multiple deployments
  -> remote-call failures
  -> version coordination
  -> more infrastructure to observe and secure
```

### What the Monolith Optimizes For

A monolith usually optimizes for:
- development speed
- straightforward deployment
- strong consistency inside one process and transaction boundary
- simpler debugging and local development

That does not mean a monolith is always the right long-term shape. It means it is often a practical default when the main problem is product evolution rather than platform-scale service coordination.

### Why Centralization Helps Early

Keeping related behavior together gives you:
- one place for validation and business rules
- simpler refactoring while concepts are still moving
- fewer network contracts to manage
- one operational unit to deploy, monitor, and secure

The durable lesson is simple: many systems should become complex only after real needs force that complexity.


# 2. What Monolithic Architecture Is

Monolithic architecture is a style in which the application's main capabilities run as one deployable unit, typically within one process boundary per running instance.

### A Conservative Definition

The durable idea is:

```text
Monolithic architecture =
  one application codebase or tightly coupled build unit
  + one deployable artifact
  + mostly in-process communication between modules
  + shared operational lifecycle for the application
```

### What It Usually Means in Practice

A monolith often has:
- one web application or API process per instance
- one deployment pipeline for the application
- one runtime stack for most business logic
- one primary database or one centrally managed data layer

You can still run multiple instances of the same monolith behind a load balancer. "Monolith" does not mean "one machine." It means the application is developed and deployed as one unit.

### What It Is Not

A monolith is usually not:
- the same thing as badly structured code
- limited to one source file or one giant class
- incompatible with modular design
- inherently unable to scale

The real contrast is not "monolith versus clean code." The real contrast is "single deployable application boundary versus independently deployable distributed parts."

### Monolith vs Distributed Services

```text
Monolith:
  browser -> app -> modules -> database

Distributed services:
  browser -> api gateway -> service A -> service B -> database/event bus
```

Both can be correct. The question is whether independent deployment and network separation solve a real problem yet.


# 3. Core Building Blocks

A healthy monolith is more than "everything in one repo." It still needs strong internal structure.

### 1. Clear Module Boundaries

Modules should map to business capabilities rather than arbitrary utility buckets.

Examples:
- `accounts`
- `catalog`
- `orders`
- `billing`

Bad internal boundaries often look like:
- `helpers`
- `misc`
- `shared-everything`

### 2. Explicit Layers

Most monoliths benefit from separating:
- transport or presentation concerns
- application orchestration
- domain logic
- persistence or infrastructure access

```text
┌──────────────────────────────┐
│ HTTP / UI / Controllers      │
├──────────────────────────────┤
│ Application Services         │
├──────────────────────────────┤
│ Domain Models and Policies   │
├──────────────────────────────┤
│ Repositories / Infrastructure│
└──────────────────────────────┘
```

Layering is not the only valid approach, but some explicit separation is usually necessary to prevent the entire codebase from turning into request handlers that query the database directly.

### 3. Shared Runtime, Not Shared Chaos

In-process calls are cheap, but that convenience can invite tight coupling. A healthy monolith still needs:
- well-defined interfaces
- limited access to internals
- dependency direction rules
- ownership by domain, not by utility sprawl

### 4. Centralized Data Access Discipline

A monolith often uses one relational database, but that should not imply every module can reach into every table at will.

Useful rule:
- share the database engine if needed
- avoid turning the schema into a public free-for-all between modules

### 5. One Operational Surface

The monolith's deployability is one of its main strengths:
- one artifact
- one release train
- one place to configure most cross-cutting behavior
- one process model to observe

That simplicity is valuable only if the internal structure remains disciplined.


# 4. How a Monolith Handles Requests

A monolith handles most internal coordination through function and method calls inside one application boundary.

### Request Flow

```text
┌──────────────┐      ┌──────────────────────┐      ┌──────────────┐
│ Client       │ ---> │ Monolith             │ ---> │ Database     │
│ browser/app  │      │ controller -> domain │      │ / cache      │
└──────────────┘      │ -> repository        │      └──────────────┘
                      └──────────────────────┘
```

### Why This Is Simpler

Compared with distributed services, a monolith often avoids:
- network serialization between internal components
- inter-service authentication for every module interaction
- partial failure between internal module calls
- service version skew between collaborating components

### Example Request Lifecycle

```text
1. Client sends POST /orders
2. Controller validates request shape
3. Application service loads customer and inventory data
4. Domain logic checks rules and computes totals
5. Repository writes order and reservation updates
6. Transaction commits
7. Response returns to client
```

### Transactional Simplicity

One of the most practical monolith benefits is that related writes can often complete inside one database transaction.

```text
Inside one monolith:
  create order
  reserve inventory
  write audit record
  commit once

Inside distributed services:
  separate services may need eventual consistency,
  compensation, or explicit workflow coordination
```

This is not a reason to put every possible workflow into one transaction. It is simply one reason monoliths remain attractive for many core business applications.


# 5. Why Monoliths Work Well

Monoliths remain useful because they solve common product and team problems with relatively little machinery.

### Strength 1: Faster Local Development

A single application is often easier to run locally:
- one repository or one main build target
- fewer moving parts
- easier stepping through the full code path in a debugger

```text
Monolith local setup:
  start app
  start database
  run tests

Distributed setup:
  start gateway
  start auth
  start orders
  start billing
  start message broker
  coordinate config for all of them
```

### Strength 2: Simpler Deployments

You build and deploy one application unit. That usually means:
- fewer release dependencies
- less contract version coordination
- fewer partial rollout states

### Strength 3: Cheaper Internal Calls

An in-process method call is usually simpler and cheaper than a network request. You avoid:
- serialization and deserialization
- connection management
- per-hop retry logic
- per-hop authentication and authorization overhead

### Strength 4: Easier Consistency for Related Operations

For workflows that naturally belong together, a monolith can keep rules and state changes close enough to reason about clearly.

### Strength 5: Better Fit for Small and Medium Teams

When one team or a small number of closely aligned teams owns the system, a monolith can provide enough separation without forcing every boundary into an independently operated service.

### Comparison Snapshot

```text
┌───────────────────────┬──────────────────────────────────────┐
│ Monolith advantage    │ Why it matters                       │
├───────────────────────┼──────────────────────────────────────┤
│ One deployable unit   │ Less rollout coordination            │
├───────────────────────┼──────────────────────────────────────┤
│ In-process calls      │ Lower latency and less failure logic │
├───────────────────────┼──────────────────────────────────────┤
│ Shared transaction    │ Easier atomic updates                │
├───────────────────────┼──────────────────────────────────────┤
│ One runtime surface   │ Simpler ops and debugging            │
└───────────────────────┴──────────────────────────────────────┘
```


# 6. Where Monoliths Struggle

The monolith's strengths can turn into constraints if the application grows without internal discipline.

### Constraint 1: Deployment Coupling

If one small change requires redeploying the whole application, release risk can rise as the codebase grows.

```text
One deployable unit:
  + simple release model
  - all changes share the same blast radius
```

### Constraint 2: Broad Scaling Granularity

You scale the application as one unit, even if only one capability needs extra resources.

Example:
- image processing is CPU-heavy
- reporting is memory-heavy
- checkout is latency-sensitive

If all three live inside one runtime profile, scaling can become inefficient.

### Constraint 3: Team Coordination Pressure

As more teams work in one codebase, the pain can shift from runtime complexity to organizational complexity:
- shared release windows
- cross-team merge conflicts
- accidental dependencies on internal module details
- unclear code ownership

### Constraint 4: Technology Lockstep

One deployable system usually implies:
- one dominant language/runtime
- shared framework choices
- coordinated upgrades

That can be a strength early. It can become limiting when one workload has meaningfully different runtime needs.

### Constraint 5: Failure Blast Radius

A serious problem in one module can affect the entire application process:
- memory leak
- runaway query path
- thread pool exhaustion
- process crash during a bad deployment

### Healthy Monolith vs Unhealthy Monolith

```text
Healthy monolith:
  clear modules
  explicit dependencies
  predictable releases
  bounded data access

Unhealthy monolith:
  hidden coupling
  shared-everything schema usage
  fear of change
  releases that feel risky regardless of scope
```

The problem is often not "monolith" by itself. The problem is unmanaged coupling inside the monolith.


# 7. Scaling and Evolution Strategies

A monolith does not need to stay small to stay useful. It does need intentional structure as it grows.

### Strategy 1: Build a Modular Monolith

A modular monolith keeps one deployment unit but enforces internal boundaries.

```text
monolith/
├── modules/
│   ├── accounts/
│   ├── catalog/
│   ├── orders/
│   └── billing/
├── shared/
│   ├── db/
│   └── logging/
└── app/
    └── bootstrap/
```

Good module rules often include:
- expose only module APIs
- keep domain models private where possible
- prevent direct table access across modules
- use events or application services for cross-module coordination

### Strategy 2: Scale Horizontally Before Splitting

Many monoliths scale farther than teams expect by running multiple identical instances.

```text
                 ┌──────────────┐
client traffic ->│ Load Balancer│
                 └──────┬───────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
  ┌──────────┐    ┌──────────┐    ┌──────────┐
  │Monolith 1│    │Monolith 2│    │Monolith 3│
  └────┬─────┘    └────┬─────┘    └────┬─────┘
       └───────────────┴───────────────┘
                       │
                 ┌──────────────┐
                 │ Shared DB    │
                 └──────────────┘
```

This does not solve every bottleneck, but it is often simpler than extracting services prematurely.

### Common Deployment Shapes

Conservative deployment patterns for monoliths often look like:
- multiple application instances on virtual machines behind a load balancer
- one container image replicated across a container platform
- a shared relational database with careful connection and migration discipline

The platform varies. The architectural idea stays the same: one application is replicated for capacity, not split into separately deployed services by default.

### Strategy 3: Use Caching and Async Work Deliberately

Before splitting the application, see whether the real issue is:
- expensive reads that could be cached
- slow jobs that should run asynchronously
- a few hot endpoints that need query tuning

These improvements often address performance pain without changing the architecture boundary.

### Strategy 4: Extract Only When a Boundary Is Mature

A monolith may legitimately outgrow itself. Good extraction signals include:
- a capability has a stable contract
- it needs a distinct scalability model
- ownership is clear
- the team can support the operational cost of independent deployment

This is where patterns such as branch by abstraction or strangler-style extraction become useful. The point is to extract because the boundary is real, not because "microservices" sounds more advanced.


# 8. Practical TypeScript Patterns

A monolith benefits from code-level boundaries that make a future split possible without requiring one now.

### Pattern 1: Module-Oriented Structure

```typescript
type OrderStatus = "pending" | "confirmed" | "cancelled";

type Order = {
  id: string;
  customerId: string;
  totalCents: number;
  status: OrderStatus;
};

interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
}

interface PaymentGateway {
  authorize(orderId: string, totalCents: number): Promise<void>;
}

class PlaceOrder {
  constructor(
    private readonly orders: OrderRepository,
    private readonly payments: PaymentGateway,
  ) {}

  async execute(input: {
    orderId: string;
    customerId: string;
    totalCents: number;
  }): Promise<void> {
    const order: Order = {
      id: input.orderId,
      customerId: input.customerId,
      totalCents: input.totalCents,
      status: "pending",
    };

    await this.payments.authorize(order.id, order.totalCents);

    order.status = "confirmed";
    await this.orders.save(order);
  }
}
```

Even in a monolith, ports such as `PaymentGateway` help keep boundaries explicit.

### Pattern 2: Cross-Module Calls Through Public APIs

```typescript
interface InventoryModule {
  reserve(sku: string, quantity: number): Promise<void>;
}

class OrderApplicationService {
  constructor(private readonly inventory: InventoryModule) {}

  async confirmOrder(sku: string, quantity: number): Promise<void> {
    await this.inventory.reserve(sku, quantity);
  }
}
```

The main idea is not formalism for its own sake. It is preventing deep imports into another module's internals.

### Pattern 3: Keep Transactions Near the Application Boundary

```typescript
interface TransactionManager {
  runInTransaction<T>(work: () => Promise<T>): Promise<T>;
}

class CheckoutService {
  constructor(
    private readonly tx: TransactionManager,
    private readonly orders: OrderRepository,
    private readonly inventory: InventoryModule,
  ) {}

  async placeOrder(input: {
    orderId: string;
    customerId: string;
    sku: string;
    quantity: number;
    totalCents: number;
  }): Promise<void> {
    await this.tx.runInTransaction(async () => {
      await this.inventory.reserve(input.sku, input.quantity);

      await this.orders.save({
        id: input.orderId,
        customerId: input.customerId,
        totalCents: input.totalCents,
        status: "confirmed",
      });
    });
  }
}
```

This keeps consistency logic inside one application boundary without spreading transaction handling across controllers and repositories.

### Pattern 4: Publish Domain Events Without Leaving the Process by Default

```typescript
type DomainEvent =
  | { type: "order.confirmed"; orderId: string; customerId: string }
  | { type: "invoice.paid"; invoiceId: string; accountId: string };

type EventHandler = (event: DomainEvent) => Promise<void>;

class InProcessEventBus {
  private readonly handlers = new Map<string, EventHandler[]>();

  subscribe(type: DomainEvent["type"], handler: EventHandler): void {
    const current = this.handlers.get(type) ?? [];
    current.push(handler);
    this.handlers.set(type, current);
  }

  async publish(event: DomainEvent): Promise<void> {
    for (const handler of this.handlers.get(event.type) ?? []) {
      await handler(event);
    }
  }
}
```

This gives modules loose coupling without forcing every internal interaction onto a network or message broker. If the system later needs external messaging, this internal event boundary can help.


# 9. When to Use It and Common Pitfalls

Monolithic architecture is a strong fit when simplicity, fast iteration, and centralized consistency matter more than independent deployment of many parts.

### Good Fit

A monolith is often a good fit when:
- the product is early or the domain is still being discovered
- the team is small to medium in size and collaborates closely
- the application needs strong consistency across related workflows
- operational capacity is limited
- the main bottlenecks are not yet isolated enough to justify service extraction

### Weak Fit

It may be a weak fit when:
- parts of the system need clearly different scaling and release cadences
- team boundaries are stable and largely independent
- one capability has mature contracts and a strong reason for separate operation
- the operational organization can handle the cost of distributed systems

### Pitfall 1: Equating Monolith with No Architecture

Bad assumption:
- "It is one deployment, so internal structure does not matter."

Better approach:
- treat internal module boundaries as seriously as external service boundaries

### Pitfall 2: Shared Database Free-for-All

```text
Bad:
  every module reads and writes every table

Better:
  modules own tables or access paths clearly,
  even if the database engine is shared
```

### Pitfall 3: Premature Service Extraction

Extracting too early can replace one manageable codebase with several unstable contracts and new operational failure modes.

### Pitfall 4: Refusing to Extract When the Boundary Is Ready

A monolith can also be kept too long out of habit. If one area has:
- persistent scaling pain
- clear ownership
- stable interfaces
- different reliability or runtime needs

then a targeted split may be justified.

### Monolith vs Microservices at a Glance

```text
Monolith:
  optimize first for simplicity and centralized change

Microservices:
  optimize first for independent deployment and stronger runtime isolation
```

Neither choice is automatically more mature. The right choice depends on which complexity you are prepared to own.


# 10. Summary

**Why monolithic architecture exists:**
- many products need a centralized application boundary before they need distributed ones
- keeping related behavior in one deployable unit can reduce operational overhead and accelerate iteration

**What a monolith does well:**
- keeps most coordination in-process
- simplifies deployment and debugging
- makes strong consistency easier for related workflows
- works well when domain boundaries and team boundaries are still evolving

**What it does not guarantee by itself:**
- it does not automatically stay maintainable as the codebase grows
- it does not remove the need for module boundaries, data ownership rules, or disciplined releases
- it does not mean the system can never evolve into more distributed boundaries later

**Practical design advice:**
- start with the simplest architecture that fits the product and the team
- treat a monolith as an intentionally designed application, not as a temporary dumping ground
- extract services only when boundaries, scaling needs, and ownership are real enough to justify the cost

**Implementation checklist:**

```text
Architecture:
  □ Keep one clear deployable application boundary
  □ Define modules around business capabilities, not generic utilities
  □ Separate transport, application, domain, and infrastructure concerns clearly

Data:
  □ Keep data access disciplined even if modules share one database engine
  □ Define which module owns each table or persistence path
  □ Use transactions deliberately for workflows that truly need atomicity

Scalability:
  □ Try horizontal scaling, caching, and async work before splitting services
  □ Measure which workloads are actually hot before redesigning boundaries
  □ Extract only when a capability has a stable contract and distinct operational needs

Operations:
  □ Keep build, test, and deployment pipelines fast enough for one shared application
  □ Monitor latency, error rate, process health, and database contention
  □ Limit release blast radius with good tests, feature flags, and rollback plans

Maintainability:
  □ Enforce module boundaries in code review and package structure
  □ Prevent deep imports into another module's internals
  □ Refactor continuously so the monolith stays modular instead of becoming tangled
```
