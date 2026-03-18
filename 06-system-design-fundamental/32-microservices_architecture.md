# Microservices Architecture

[← Back to Index](README.md)

Imagine you are running a growing commerce platform. At first, one deployable application handles catalog, checkout, payments, inventory, shipping, and notifications. That feels efficient until one hot path needs more scale, one risky bug blocks the whole release, and every team starts stepping on the same codebase.

Without clear service boundaries, one application can become the coordination point for every business capability:

```typescript
// Bad example: one deployable unit owns too many unrelated responsibilities,
// so release risk and scaling pressure concentrate in one place.
type OrderInput = {
  customerId: string;
  sku: string;
  quantity: number;
  paymentMethodId: string;
};

class CommerceApplication {
  async placeOrder(input: OrderInput): Promise<void> {
    const inventory = await this.queryInventory(input.sku);

    if (inventory.available < input.quantity) {
      throw new Error("Insufficient inventory");
    }

    await this.chargeCard(input.paymentMethodId, input.quantity * 2_500);
    await this.reserveInventory(input.sku, input.quantity);
    await this.createShipment(input.customerId, input.sku, input.quantity);
    await this.sendConfirmationEmail(input.customerId);
  }

  private async queryInventory(sku: string): Promise<{ available: number }> {
    return { available: 10 };
  }

  private async chargeCard(paymentMethodId: string, amountCents: number): Promise<void> {
    void paymentMethodId;
    void amountCents;
  }

  private async reserveInventory(sku: string, quantity: number): Promise<void> {
    void sku;
    void quantity;
  }

  private async createShipment(customerId: string, sku: string, quantity: number): Promise<void> {
    void customerId;
    void sku;
    void quantity;
  }

  private async sendConfirmationEmail(customerId: string): Promise<void> {
    void customerId;
  }
}
```

This usually breaks in predictable ways:
- one small change forces a full application build, test, and deployment
- checkout traffic can force you to scale shipping and notifications even when they are idle
- a fault in one area can consume shared process resources and hurt unrelated paths
- team ownership becomes unclear because every workflow touches the same code and data boundary

This is where **microservices architecture** comes in. Microservices split a system into independently deployable services aligned to business capabilities, each with clearer ownership, explicit contracts, and tighter runtime isolation than one large application boundary can provide.

In this chapter, you will learn:
  * [Why microservices architecture exists](#1-why-microservices-architecture-exists)
  * [What microservices architecture is and is not](#2-what-microservices-architecture-is)
  * [Which building blocks make microservices work](#3-core-building-blocks)
  * [How request flow and workflows operate across services](#4-how-microservices-handle-requests-and-workflows)
  * [How to choose service boundaries and data ownership](#5-service-boundaries-and-data-ownership)
  * [Which communication and consistency patterns matter most](#6-communication-and-consistency-patterns)
  * [Which reliability, deployment, and scaling trade-offs you must accept](#7-reliability-deployment-and-scaling-trade-offs)
  * [What practical TypeScript implementations look like](#8-practical-typescript-patterns)
  * [When to use microservices and which pitfalls to avoid](#9-when-to-use-it-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why Microservices Architecture Exists

Microservices architecture exists because some systems eventually need more independent change, scaling, and ownership than one deployable application can support comfortably.

### The Core Problem

As products and organizations grow, a single application boundary can start concentrating too many concerns:
- too many teams changing the same codebase
- too many workflows sharing one release train
- too many runtime behaviors competing for the same process and deployment capacity
- too many domain concepts evolving at different speeds

```text
Growth pressure on one large application:
  more teams
  + more features
  + uneven traffic
  + higher release risk

Common result:
  -> slower coordination
  -> larger blast radius
  -> harder scaling choices
  -> more tangled ownership
```

### What Microservices Optimize For

Microservices usually optimize for:
- independent deployment
- clearer ownership around business capabilities
- selective scaling of hot paths
- stronger fault isolation between parts of the system

That does not mean they optimize for simplicity. They typically trade local simplicity for operational flexibility.

### Why Teams Adopt Them

A team may consider microservices when:
- one capability needs a different release cadence from the rest of the product
- one area has very different performance or reliability requirements
- domain boundaries are stable enough to assign long-lived ownership
- the organization can support the operational cost of distributed systems

### What Problem They Do Not Magically Solve

Microservices do not automatically fix:
- poor domain modeling
- weak testing
- unclear ownership
- inconsistent operational discipline

If those foundations are missing, microservices can make the same underlying problems harder to observe and debug.


# 2. What Microservices Architecture Is

Microservices architecture is a style in which a system is built as a set of small, autonomous services that each own a bounded capability and communicate through explicit networked contracts.

### A Conservative Definition

The durable idea is:

```text
Microservices architecture =
  multiple services aligned to business capabilities
  + independent deployment and runtime boundaries
  + explicit service-to-service contracts
  + decentralized data ownership
  + operational coordination across a distributed system
```

### What It Usually Means in Practice

A microservices system often has:
- a client-facing edge such as a load balancer, API gateway, or BFF
- multiple backend services with separate code ownership
- a service discovery mechanism or stable addressing layer
- asynchronous messaging for some workflows
- separate data stores or at least separate data ownership per service

### What It Is Not

Microservices architecture is usually not:
- "many tiny services" by default
- a guarantee that every service uses a different technology stack
- the same thing as splitting by technical layers such as `user-service`, `database-service`, and `email-service` without domain reasoning
- a reason to let services reach directly into one another's databases

### Microservices vs Monoliths

The durable contrast is:

```text
Monolith:
  optimize first for simpler coordination inside one deployable unit

Microservices:
  optimize first for independent deployment, ownership, and runtime isolation
```

Neither choice is inherently more advanced. Each one moves complexity to a different place.


# 3. Core Building Blocks

Microservices work only when several building blocks are treated as first-class design concerns.

### 1. Service Boundaries

A service should usually map to a business capability rather than a technical utility bucket.

Stronger examples:
- `catalog`
- `orders`
- `payments`
- `shipping`

Weaker examples:
- `database-service`
- `validation-service`
- `string-utils-service`

The main question is whether the boundary matches a coherent responsibility with its own data, policies, and change cadence.

### 2. Independent Deployability

Each service should be releasable without requiring a coordinated redeploy of the whole system.

That usually requires:
- backward-compatible contracts where possible
- versioning discipline
- automated testing at service boundaries
- deployment automation per service

### 3. Data Ownership

Each service should own its persistence model and write path for the data it is responsible for.

Useful rule:
- services can expose data through APIs or events
- services should not treat another service's database as a shared library

### 4. Communication Contracts

Distributed systems need explicit communication rules:
- request and response shapes
- event schemas
- timeout expectations
- error semantics
- idempotency behavior

Weak contracts create hidden coupling even when services are physically separate.

### 5. Platform Capabilities

Microservices usually depend on supporting platform concerns such as:
- service discovery
- centralized observability
- secrets and identity management
- traffic management and load balancing
- CI/CD and rollout controls

```text
┌──────────────────────────────────────────────────────┐
│ Clients / Edge                                      │
│ browser, mobile, partner API                        │
└───────────────────────┬──────────────────────────────┘
                        ▼
               ┌─────────────────┐
               │ gateway / BFF   │
               └───────┬─────────┘
                       ▼
     ┌───────────────────────────────────────────────┐
     │ Microservices                                 │
     │ orders  payments  inventory  shipping         │
     └────┬────────┬─────────┬──────────┬────────────┘
          │        │         │          │
          ▼        ▼         ▼          ▼
     ┌────────┐ ┌───────┐ ┌────────┐ ┌──────────┐
     │ DB/API │ │ DB    │ │ DB     │ │ queue/db │
     └────────┘ └───────┘ └────────┘ └──────────┘

Shared platform around them:
  discovery, auth, secrets, logs, metrics, tracing, deploy automation
```

### 6. Ownership and Operations

Healthy microservices need explicit ownership:
- which team owns the service
- which APIs and events it publishes
- which SLOs or operating expectations apply
- who approves breaking changes

Without clear ownership, the architecture becomes distributed but not accountable.


# 4. How Microservices Handle Requests and Workflows

Microservices separate a system into runtime boundaries, so both synchronous request paths and asynchronous workflows need deliberate design.

### Synchronous Request Flow

A simple user request may cross several services:

```text
Client
  -> API gateway
     -> orders service
        -> inventory service
        -> payments service
     -> response back to client
```

### Why This Is Harder Than In-Process Calls

Every service-to-service interaction adds:
- network latency
- serialization and deserialization
- authentication and authorization checks
- timeout and retry decisions
- partial-failure risk

### Example Request Path

```text
1. Client sends POST /orders
2. Gateway authenticates and routes the request
3. Orders service validates the command
4. Orders service reserves inventory
5. Orders service requests payment authorization
6. Orders service records local state
7. Response returns with accepted or confirmed status
```

### Many Workflows Need Asynchronous Steps

Not every step belongs on the synchronous path. Shipping creation, email delivery, analytics, and some downstream integrations are often better handled asynchronously.

```text
┌──────────────┐      command       ┌──────────────┐
│ Client       │ -----------------> │ Orders svc   │
└──────────────┘                    └──────┬───────┘
                                           │ writes order + outbox
                                           ▼
                                   ┌──────────────┐
                                   │ Orders DB    │
                                   └──────┬───────┘
                                           │ publish event
                                           ▼
                                   ┌──────────────┐
                                   │ Event broker │
                                   └───┬────┬─────┘
                                       │    │
                                       ▼    ▼
                               ┌──────────┐ ┌──────────────┐
                               │ Shipping │ │ Notifications│
                               └──────────┘ └──────────────┘
```

### Workflow Coordination

When one business action spans multiple services, you often need:
- eventual consistency instead of one global transaction
- explicit state transitions
- compensating actions for failure handling
- durable events or messages

This is one of the main differences between a microservices system and a well-structured monolith. Cross-service coordination needs workflow design, not just function calls.


# 5. Service Boundaries and Data Ownership

The hardest microservices problem is usually not communication technology. It is drawing boundaries that hold up under real change.

### Boundary Design Should Follow Business Capabilities

Useful inputs for deciding a boundary:
- distinct business language
- distinct lifecycle and policies
- different scaling patterns
- clear ownership by one team
- limited need for synchronous coordination with neighbors

Examples:
- `catalog` owns product descriptions and browsing metadata
- `inventory` owns stock levels and reservations
- `payments` owns authorization, capture, refund, and reconciliation state

### Boundary Design Should Not Follow Layers Alone

Bad split:

```text
frontend service
business-logic service
database service
email service
```

This kind of split often increases chattiness without creating meaningful domain autonomy.

### Data Ownership Rules

Stronger rule:
- each service owns its write model and publishes APIs or events for others

Weaker rule:
- every service reads and writes the same schema directly

```text
Bad:
  orders service  ---> shared database <--- payments service
  inventory svc   ---> shared database <--- shipping service

Good:
  orders service   -> orders DB
  payments service -> payments DB
  inventory svc    -> inventory DB

Cross-service access:
  API calls or events, not direct table writes
```

### Shared Database vs Owned Database

```text
┌──────────────────────┬──────────────────────────────────────────────┐
│ Approach             │ Effect                                       │
├──────────────────────┼──────────────────────────────────────────────┤
│ Shared database      │ Faster to start, but coupling stays hidden   │
├──────────────────────┼──────────────────────────────────────────────┤
│ Owned database       │ More explicit boundaries, but more plumbing  │
├──────────────────────┼──────────────────────────────────────────────┤
│ Read replicas/views  │ Useful for consumers, if ownership is clear  │
└──────────────────────┴──────────────────────────────────────────────┘
```

An owned database does not have to mean a completely different engine for every service. The durable point is ownership of writes and schema evolution.

### Signs a Boundary Is Wrong

Common warning signs:
- constant cross-service synchronous calls for one user action
- data duplicated with no ownership rule
- teams arguing about who can change a contract
- services that cannot release independently in practice
- one service acting like a thin wrapper around another


# 6. Communication and Consistency Patterns

Microservices need both communication patterns and consistency strategies. Choosing one without the other usually leads to brittle systems.

### Pattern 1: Synchronous Request-Response

Use synchronous calls when:
- the caller needs an immediate answer
- the operation is short and bounded
- the dependency is required for the user-visible response

Common transports:
- HTTP/REST
- gRPC
- internal RPC frameworks

Use it carefully because deep synchronous chains increase latency and failure coupling.

### Pattern 2: Asynchronous Messaging

Use asynchronous messaging when:
- the work can complete later
- multiple consumers care about the same event
- you need buffering between producers and consumers
- workflows should continue even if one downstream service is temporarily unavailable

Common shapes:
- domain events
- command messages
- integration events

### Pattern 3: Eventual Consistency

Because services own separate data, one business workflow often becomes eventually consistent.

Example:
- orders service records `PENDING_PAYMENT`
- payments service authorizes payment
- orders service moves order to `CONFIRMED`

During that interval, different services may temporarily hold different but valid views of the workflow.

### Pattern 4: Saga-Style Coordination

When one workflow spans multiple services, a saga-style design can coordinate state changes and compensations.

```text
Order placed
  -> reserve inventory
  -> authorize payment
  -> create shipment

If payment fails:
  -> release inventory
  -> mark order as failed
```

This does not create ACID transactions across services. It creates explicit workflow handling for distributed state changes.

### Pattern 5: Idempotency and the Outbox Pattern

Retries are common in distributed systems, so handlers and publishers should be safe to run more than once when possible.

The outbox pattern helps avoid "saved in database but event not published" inconsistencies.

```typescript
type OrderStatus = "PENDING_PAYMENT" | "CONFIRMED" | "FAILED";

type OrderCreatedEvent = {
  id: string;
  type: "orders.created";
  orderId: string;
  occurredAt: string;
};

interface OrdersRepository {
  save(order: { id: string; status: OrderStatus }): Promise<void>;
}

interface OutboxRepository {
  append(event: OrderCreatedEvent): Promise<void>;
}

interface TransactionManager {
  runInTransaction<T>(work: () => Promise<T>): Promise<T>;
}

class OrderCommandService {
  constructor(
    private readonly tx: TransactionManager,
    private readonly orders: OrdersRepository,
    private readonly outbox: OutboxRepository,
  ) {}

  async placeOrder(orderId: string): Promise<void> {
    await this.tx.runInTransaction(async () => {
      await this.orders.save({ id: orderId, status: "PENDING_PAYMENT" });

      await this.outbox.append({
        id: crypto.randomUUID(),
        type: "orders.created",
        orderId,
        occurredAt: new Date().toISOString(),
      });
    });
  }
}
```

The message can then be published asynchronously by a relay process that reads durable outbox rows.


# 7. Reliability, Deployment, and Scaling Trade-Offs

Microservices offer real benefits, but only by introducing a different class of operational problems.

### What Microservices Do Well

Microservices can help when you need:
- independent deployment of services
- scaling only the hottest workloads
- fault isolation across runtime boundaries
- team autonomy around well-defined capabilities

### What They Cost

They also introduce:
- more moving parts to deploy and monitor
- more network failure modes
- more contract versioning and compatibility work
- more complex end-to-end debugging
- more distributed security and secrets management

### Independent Scaling Is Real but Limited

A common advantage is scaling only the services that need it:

```text
Peak traffic:
  checkout = high
  catalog search = high
  shipping admin = low

Microservices allow:
  more checkout replicas
  more search workers
  unchanged shipping capacity
```

But selective scaling only helps if:
- the service boundary is real
- shared dependencies are not still the bottleneck
- the platform can place, observe, and operate those extra instances safely

### Fault Isolation Needs Deliberate Design

Separate processes do not automatically prevent cascading failures.

You still need:
- timeouts
- retry budgets
- circuit breakers or concurrency controls where appropriate
- backpressure and queue management
- graceful degradation plans

### Deployment Independence Needs Contract Discipline

You only get independent deployment if services can evolve without breaking callers unexpectedly.

That usually means:
- additive API changes when possible
- schema compatibility for messages
- explicit deprecation periods
- consumer-aware rollout planning

### Real-World Platform Shapes

Microservices are commonly deployed in a few recognizable ways:
- on Kubernetes, each service may run as one or more `Deployment` workloads behind a stable `Service`
- on VM or container platforms, services often register with a discovery system and sit behind internal load balancers
- asynchronous workflows often rely on a broker or queueing system so producers and consumers can scale separately

Those implementation details vary by organization, but the architectural concerns stay similar:
- service identity
- network policy
- rollout safety
- telemetry
- contract compatibility

### Microservices vs Monolith at a Glance

```text
┌──────────────────────────┬────────────────────────────────────────────┐
│ Concern                  │ Typical microservices trade-off            │
├──────────────────────────┼────────────────────────────────────────────┤
│ Team autonomy            │ Often stronger if boundaries are real      │
├──────────────────────────┼────────────────────────────────────────────┤
│ Operational simplicity   │ Usually weaker than a monolith             │
├──────────────────────────┼────────────────────────────────────────────┤
│ Selective scaling        │ Often better for uneven workloads          │
├──────────────────────────┼────────────────────────────────────────────┤
│ Transaction simplicity   │ Usually weaker across service boundaries   │
├──────────────────────────┼────────────────────────────────────────────┤
│ Failure isolation        │ Better potential, but needs discipline     │
└──────────────────────────┴────────────────────────────────────────────┘
```


# 8. Practical TypeScript Patterns

Good microservices code makes network boundaries explicit, handles failure intentionally, and keeps business workflows visible in code.

### Pattern 1: Stable Service Contracts

```typescript
type ReserveInventoryRequest = {
  orderId: string;
  sku: string;
  quantity: number;
};

type ReserveInventoryResponse =
  | { ok: true; reservationId: string }
  | { ok: false; reason: "INSUFFICIENT_STOCK" | "SKU_NOT_FOUND" };

interface InventoryClient {
  reserve(input: ReserveInventoryRequest): Promise<ReserveInventoryResponse>;
}
```

The main idea is to model expected business outcomes explicitly instead of treating every non-happy path as an unstructured exception.

### Pattern 2: Timeout and Retry Policy at the Client Boundary

```typescript
interface HttpClient {
  post<TResponse>(
    path: string,
    body: unknown,
    options: { timeoutMs: number; idempotencyKey?: string },
  ): Promise<TResponse>;
}

class PaymentsClient {
  constructor(private readonly http: HttpClient) {}

  async authorize(input: {
    orderId: string;
    amountCents: number;
    idempotencyKey: string;
  }): Promise<{ authorizationId: string }> {
    return this.http.post<{ authorizationId: string }>(
      "/authorizations",
      {
        orderId: input.orderId,
        amountCents: input.amountCents,
      },
      {
        timeoutMs: 500,
        idempotencyKey: input.idempotencyKey,
      },
    );
  }
}
```

Retries should be added carefully and usually only where the operation is safe to repeat or guarded by idempotency.

### Pattern 3: Workflow State Machine in an Application Service

```typescript
type CheckoutState =
  | "PENDING_INVENTORY"
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "FAILED";

interface CheckoutRepository {
  save(record: { orderId: string; state: CheckoutState }): Promise<void>;
}

class CheckoutWorkflow {
  constructor(
    private readonly inventory: InventoryClient,
    private readonly payments: PaymentsClient,
    private readonly checkouts: CheckoutRepository,
  ) {}

  async start(input: {
    orderId: string;
    sku: string;
    quantity: number;
    amountCents: number;
  }): Promise<void> {
    await this.checkouts.save({ orderId: input.orderId, state: "PENDING_INVENTORY" });

    const inventoryResult = await this.inventory.reserve({
      orderId: input.orderId,
      sku: input.sku,
      quantity: input.quantity,
    });

    if (!inventoryResult.ok) {
      await this.checkouts.save({ orderId: input.orderId, state: "FAILED" });
      return;
    }

    await this.checkouts.save({ orderId: input.orderId, state: "PENDING_PAYMENT" });

    await this.payments.authorize({
      orderId: input.orderId,
      amountCents: input.amountCents,
      idempotencyKey: input.orderId,
    });

    await this.checkouts.save({ orderId: input.orderId, state: "CONFIRMED" });
  }
}
```

This keeps distributed workflow progress explicit. In a real system, you may persist step metadata, error reasons, and compensating actions more carefully than this compact example shows.

### Pattern 4: Idempotent Event Consumer

```typescript
type EventEnvelope<T> = {
  eventId: string;
  payload: T;
};

interface ProcessedEventsRepository {
  has(eventId: string): Promise<boolean>;
  markProcessed(eventId: string): Promise<void>;
}

class ShipmentCreatedHandler {
  constructor(private readonly processed: ProcessedEventsRepository) {}

  async handle(event: EventEnvelope<{ orderId: string; shipmentId: string }>): Promise<void> {
    if (await this.processed.has(event.eventId)) {
      return;
    }

    await this.sendCustomerNotification(event.payload.orderId, event.payload.shipmentId);
    await this.processed.markProcessed(event.eventId);
  }

  private async sendCustomerNotification(orderId: string, shipmentId: string): Promise<void> {
    void orderId;
    void shipmentId;
  }
}
```

At-least-once delivery is common enough that duplicate-safe consumers are usually a better default than assuming exactly-once behavior everywhere.


# 9. When to Use It and Common Pitfalls

Microservices architecture is a strong fit only when the benefits of independent boundaries clearly outweigh the coordination cost.

### Good Fit

Microservices are often a good fit when:
- the system has stable business boundaries
- different capabilities need different scaling or release cadences
- multiple teams can own services with low day-to-day coupling
- the organization already has or can justify solid platform engineering and operations
- some failures should be isolated by process and deployment boundaries

### Weak Fit

Microservices are often a weak fit when:
- the product is early and the domain is still moving
- one small team owns the whole system
- end-to-end workflows need strong consistency everywhere
- the platform cannot yet support observability, deployment automation, and incident response for many services

### Pitfall 1: Splitting Too Early

Bad assumption:
- "If large companies use microservices, we should start there."

Better approach:
- start with the simplest architecture that fits today's domain and team shape

### Pitfall 2: Services That Are Too Small

Tiny services can create more network hops and ownership confusion than useful autonomy.

Useful rule:
- prefer services that are small enough to own clearly
- avoid making them so small that one user action fans out across many hops by default

### Pitfall 3: Shared Database Coupling

```text
Bad:
  each service deploys separately,
  but all of them read and write the same tables

Better:
  each service owns its writes and exposes APIs or events for consumers
```

### Pitfall 4: Chatty Synchronous Chains

If one request routinely hits five or six services in sequence, latency and failure coupling grow quickly.

Better options may include:
- moving part of the workflow asynchronous
- duplicating read models deliberately
- redrawing boundaries

### Pitfall 5: Treating Platform Work as Optional

Microservices rely heavily on:
- deployment automation
- centralized logs, metrics, and tracing
- contract governance
- secret and identity management
- incident response discipline

If those capabilities are weak, the architecture can become harder to operate than the system it replaced.

### Pitfall 6: Mistaking Technical Separation for Business Separation

True autonomy comes from clear business capability ownership, not from putting code in separate repositories or containers.


# 10. Summary

**Why microservices architecture exists:**
- some systems need more independent deployment, scaling, and ownership than one application boundary can provide
- those benefits matter most when business capabilities and team responsibilities are stable enough to support them

**What microservices do well:**
- create clearer runtime and ownership boundaries around capabilities
- allow more selective scaling and release management
- support fault isolation better than one shared process can, when reliability controls are in place

**What they do not solve by themselves:**
- they do not remove the need for strong domain modeling, testing, and observability
- they do not make distributed consistency simple
- they are not automatically the right starting point for small teams or early products

**Practical design advice:**
- draw boundaries around business capabilities, not technical layers
- keep data ownership explicit and use APIs or events instead of cross-service table writes
- prefer the smallest distributed design that solves a real problem, then add operational sophistication deliberately

**Implementation checklist:**

```text
Fit and boundaries:
  □ Confirm that independent deployment or scaling is a real need, not a default preference
  □ Define services around business capabilities with clear team ownership
  □ Check that proposed boundaries reduce coupling instead of spreading one workflow across many hops

Data and contracts:
  □ Give each service clear ownership of its write model and schema evolution
  □ Use APIs or events for cross-service access instead of direct database writes
  □ Define request, response, and event contracts with explicit compatibility rules

Communication and consistency:
  □ Decide which paths must stay synchronous and which can be asynchronous
  □ Use idempotency keys or duplicate-safe consumers where retries are possible
  □ Design workflow state transitions and compensations for cross-service business actions

Reliability and scaling:
  □ Set timeouts, retry rules, and backpressure limits deliberately
  □ Scale services independently only after confirming that shared dependencies are not the real bottleneck
  □ Test degraded modes, partial failures, and dependency outages before relying on them in production

Operations:
  □ Provide centralized logs, metrics, and traces across services
  □ Automate build, deploy, rollback, and contract verification per service
  □ Define ownership, on-call expectations, and change governance for every service boundary
```
