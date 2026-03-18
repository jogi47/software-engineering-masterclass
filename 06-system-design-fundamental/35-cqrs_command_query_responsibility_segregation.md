# CQRS (Command Query Responsibility Segregation)

[← Back to Index](README.md)

Imagine you are building an order platform used by customers, support agents, finance teams, and warehouse operators. The write path has to enforce real business rules such as inventory checks, credit limits, and valid state transitions. The read path has very different needs: search screens, dashboard filters, timeline views, and denormalized summaries.

Without separation, teams often try to force one model and one service layer to serve both transactional writes and read-heavy screens:

```typescript
type OrderRow = {
  id: string;
  customerId: string;
  status: "PENDING" | "APPROVED" | "SHIPPED";
  totalCents: number;
  shippingCity: string;
  createdAt: string;
};

class OrdersService {
  async approveOrder(orderId: string): Promise<OrderRow> {
    const order = await this.loadOrderForDashboard(orderId);

    if (order.status !== "PENDING") {
      throw new Error("Only pending orders can be approved");
    }

    await this.updateOrderStatus(orderId, "APPROVED");
    return this.loadOrderForDashboard(orderId);
  }

  async searchOrders(filters: {
    status?: string;
    city?: string;
    createdAfter?: string;
  }): Promise<OrderRow[]> {
    void filters;
    return [];
  }

  private async loadOrderForDashboard(orderId: string): Promise<OrderRow> {
    void orderId;
    return {
      id: "ord_123",
      customerId: "cus_456",
      status: "PENDING",
      totalCents: 5_000,
      shippingCity: "Mumbai",
      createdAt: new Date().toISOString(),
    };
  }

  private async updateOrderStatus(orderId: string, status: OrderRow["status"]): Promise<void> {
    void orderId;
    void status;
  }
}
```

This usually creates predictable problems:
- write handlers become entangled with dashboard joins and filter logic
- read screens push schema and indexing choices into the transactional model
- one "helpful" service method starts mixing validation, persistence, reporting, and response shaping
- scaling or evolving the read side starts risking the write side

This is where **CQRS** comes in. CQRS separates the responsibilities for changing state and reading state so that commands can protect business invariants while queries can use read models optimized for retrieval.

In this chapter, you will learn:
  * [Why CQRS exists](#1-why-cqrs-exists)
  * [What CQRS is and is not](#2-what-cqrs-is)
  * [Which building blocks matter most](#3-core-building-blocks)
  * [How commands, events, and queries flow through a CQRS system](#4-how-commands-events-and-queries-flow)
  * [How read models and synchronization strategies work](#5-read-models-projections-and-synchronization-strategies)
  * [How CQRS compares with CRUD, event-driven architecture, and event sourcing](#6-cqrs-vs-related-patterns)
  * [How to handle consistency, transactions, and reliability](#7-consistency-transactions-and-reliability)
  * [What practical TypeScript implementations look like](#8-practical-typescript-patterns)
  * [When to use CQRS and which pitfalls matter most](#9-when-to-use-it-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why CQRS Exists

CQRS exists because reads and writes often have different goals, different scaling pressures, and different shapes.

### The Core Problem

In a simple CRUD design, the same model often tries to do all of the following:
- enforce write-side business rules
- support rich search and filtering
- return nested screens efficiently
- satisfy reporting and operational dashboards

That can work well for small or moderate systems. The tension appears when the write side cares about correctness and state transitions, while the read side cares about retrieval speed and presentation shape.

```text
One shared model tries to satisfy:

  writes:
    validate rules
    protect invariants
    update normalized state

  reads:
    join many tables
    filter and sort flexibly
    return denormalized views

Common result:
  -> awkward service methods
  -> conflicting indexes
  -> harder code ownership
  -> pressure to bypass domain rules
```

### What CQRS Optimizes For

CQRS usually optimizes for:
- clearer separation between state changes and data retrieval
- write-side models focused on invariants and workflow rules
- read-side models shaped around specific query needs
- independent evolution of command handling and query performance

### The Durable Motivation

The durable motivation is not "splitting everything into two databases." The durable motivation is:
- commands should focus on correctness
- queries should focus on retrieval
- the design should stop forcing one representation to serve both jobs equally

### What Problem It Does Not Automatically Solve

CQRS does not automatically fix:
- weak domain boundaries
- missing idempotency
- poor event ownership
- a lack of observability
- unnecessary complexity introduced too early

If your system is simple and one model serves both sides cleanly, CQRS may add more moving parts than value.


# 2. What CQRS Is

CQRS stands for **Command Query Responsibility Segregation**. It separates operations that change state from operations that read state.

### A Conservative Definition

The durable idea is:

```text
CQRS =
  commands for changing state
  + queries for reading state
  + separate models or responsibilities for each side
  + optional read-model synchronization between them
```

### Commands

A command asks the system to do something if the business rules allow it.

Examples:
- `ApproveOrder`
- `CancelSubscription`
- `ReserveInventory`
- `AssignDriver`

Commands usually:
- validate intent
- check current state
- enforce invariants
- persist a state change
- return an acknowledgment, identifier, or version

They should not primarily exist to assemble large read payloads.

### Queries

A query asks the system to return data without changing business state.

Examples:
- `GetOrderSummary`
- `SearchOrdersByStatus`
- `ListDelayedShipments`

Queries usually:
- read from a shape optimized for retrieval
- join or denormalize as needed
- return exactly the data required by the caller

They should not silently perform workflow mutations.

### Logical Separation vs Physical Separation

CQRS can be applied at different levels.

```text
Level 1: Logical CQRS
  same application
  same database
  separate command and query handlers

Level 2: Separate read model
  same application or service boundary
  separate read tables or materialized views

Level 3: Fully separated read side
  separate store and asynchronous projections
  stronger independence, more operational complexity
```

Many teams start with Level 1 or Level 2. Full physical separation is optional, not mandatory.

### What CQRS Is Not

CQRS is usually not:
- a requirement to use messaging for every system
- the same thing as event sourcing
- proof that write and read databases must always be different
- a reason to duplicate every field into many projections without purpose
- a guarantee that every read after every write will be instantly up to date


# 3. Core Building Blocks

Healthy CQRS systems rely on a few recurring building blocks.

### 1. Command Contracts

Commands make intent explicit.

Good examples:
- `ApproveOrder`
- `ShipOrder`
- `DeactivateUser`

Weak examples:
- `UpdateOrder`
- `SaveCustomer`

Intent-focused commands make business rules easier to express and review.

### 2. Command Handlers and Domain Logic

The write side usually contains:
- command handlers
- domain services or aggregates
- validation rules
- concurrency checks
- transactional persistence

This is where business invariants belong.

### 3. Write Store

The write store is the source of truth for current business state in a non-event-sourced CQRS design.

It is usually:
- normalized enough for consistent updates
- transaction-friendly
- structured around ownership and invariants rather than screen layout

### 4. Events or Change Notifications

Many CQRS systems publish domain events or change notifications after successful writes so that read models can update.

Examples:
- `order.approved`
- `subscription.cancelled`
- `inventory.reserved`

This is common, but not mandatory. Some CQRS systems update read models synchronously inside the same database.

### 5. Projections and Read Models

A projection transforms write-side changes into query-friendly data.

A read model may be:
- a denormalized table
- a document in a document store
- a search index entry
- a cached summary view

The key point is that the read model is shaped for retrieval, not for write-side correctness.

### 6. Query Handlers

The query side should expose intentional query contracts rather than reusing write-side repositories for everything.

That lets you:
- paginate and filter cleanly
- return query-specific DTOs
- choose different indexes or storage layouts

### 7. Operational Controls

If the read side is synchronized asynchronously, you also need:
- outbox or another durable publication mechanism
- idempotent projectors
- projection lag monitoring
- replay or rebuild procedures

### Overall Shape

```text
                   command path

client
  |
  v
command API/handler ---> write model/store ---> outbox or event stream
                                                |
                                                v
                                          projector(s)
                                                |
                                                v
                                           read model(s)
                                                ^
                                                |
                                        query API/handler
                                                ^
                                                |
                                              client
```


# 4. How Commands, Events, and Queries Flow

CQRS becomes easier to reason about when you separate the write path from the read path mentally and operationally.

### Command Flow

A typical command flow looks like this:

1. the client sends a command
2. the command handler loads the current write-side state
3. domain rules are checked
4. the write store is updated transactionally
5. an event or change notification is recorded
6. the caller gets an acknowledgment

```text
Approve order:

client
  -> ApproveOrder command
  -> load order from write store
  -> verify "PENDING" -> "APPROVED" is valid
  -> save new state
  -> record order.approved event
  -> return orderId + new version
```

### Query Flow

A typical query flow is different:

1. the client asks for a view
2. the query handler reads from a query-optimized model
3. the system returns the shape needed by the screen or API consumer

```text
Get order summary:

client
  -> GetOrderSummary query
  -> read from order_summary_read_model
  -> return denormalized response
```

### The Consistency Window

If the read side updates asynchronously, the command may complete before the read model catches up.

```text
Time ---->

write model updated      [done]
event recorded           [done]
projection catches up          [later]
query reflects update          [later]
```

That delay may be milliseconds or longer, depending on workload and infrastructure. The system design should make that window acceptable for the product.

### User-Visible Behavior

Common approaches include:
- return the write-side acknowledgment immediately and let the UI refresh the query view
- show a "processing" or "updating" state until the projection catches up
- read from the write side for the just-written aggregate when strict freshness is required for that one response

The important point is to choose this behavior deliberately instead of assuming the read side is always current.


# 5. Read Models, Projections, and Synchronization Strategies

The read side is where CQRS often becomes most useful, because it lets you model data around access patterns instead of update rules.

### Strategy 1: Logical CQRS With One Database

This is the lightest form:
- separate command and query handlers
- same database
- often the same tables

This can still be valuable because the code stops mixing write intent and read shaping, even if the storage is shared.

### Strategy 2: Separate Read Tables in the Same Database

This is a common middle ground:
- write tables remain normalized
- query tables are denormalized for screens and search
- the same relational database may host both

Benefits:
- simpler operations than a separate read store
- read models can still use specialized indexes
- separation is visible in code and schema

### Strategy 3: Separate Read Store With Projections

This is a stronger form of CQRS:
- write model persists authoritative business state
- events or change records feed projectors
- read data lives in a separate store chosen for query needs

Examples:
- relational write store with document read models
- relational write store with search index projections
- relational write store with key-value summary tables

### Example Schema

```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    customer_id UUID NOT NULL,
    status VARCHAR(32) NOT NULL,
    total_cents INTEGER NOT NULL,
    version INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    approved_at TIMESTAMPTZ
);

CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(128) NOT NULL,
    payload JSONB NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    published_at TIMESTAMPTZ
);

CREATE INDEX idx_outbox_events_unpublished
    ON outbox_events (published_at, occurred_at);

CREATE TABLE order_summary_read_model (
    order_id UUID PRIMARY KEY,
    customer_id UUID NOT NULL,
    status VARCHAR(32) NOT NULL,
    total_cents INTEGER NOT NULL,
    approved_at TIMESTAMPTZ,
    last_event_id UUID NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_order_summary_status_updated
    ON order_summary_read_model (status, updated_at DESC);
```

In this design:
- `orders` protects write-side transitions
- `outbox_events` gives durable handoff for asynchronous projection
- `order_summary_read_model` is optimized for query use

### Projection Shapes

One write event can feed multiple read models:

```text
order.approved
  -> support dashboard row
  -> customer timeline entry
  -> finance settlement queue
  -> analytics counters
```

Not every consumer needs the same data shape or freshness target.

### Synchronization Options

```text
┌──────────────────────────────┬──────────────────────────────────────────────┐
│ Option                       │ Typical trade-off                            │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ Same transaction             │ fresher reads, tighter coupling             │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ Outbox + async projector     │ looser coupling, eventual consistency       │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ Rebuild from event history   │ strong recovery story, more storage/process │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

The right choice depends on how much lag, complexity, and recovery capability your product can tolerate.


# 6. CQRS vs Related Patterns

CQRS is often discussed together with CRUD, event-driven architecture, and event sourcing, but they solve different problems.

### CQRS vs CRUD

CRUD usually uses one model to create, read, update, and delete data. That is often the right default for simpler systems.

CQRS says:
- the write side and read side may deserve different models
- commands and queries should not be treated as interchangeable operations

### CQRS vs Event-Driven Architecture

Event-driven architecture is about communication through events and asynchronous reactions.

CQRS is about separating read and write responsibilities.

They are commonly combined because events are a convenient way to update read models, but neither pattern requires the other.

### CQRS vs Event Sourcing

Event sourcing stores the sequence of events as the primary source of truth.

CQRS does not require that. A CQRS system can use:
- ordinary relational tables as the write source of truth
- an outbox for durable publication
- projections for the read side

### Comparison Table

```text
┌──────────────────────────────┬─────────────────────────────┬────────────────────────────────────┐
│ Pattern                      │ Main concern                │ Typical source of truth            │
├──────────────────────────────┼─────────────────────────────┼────────────────────────────────────┤
│ CRUD                         │ simple unified data access  │ current row/document state         │
├──────────────────────────────┼─────────────────────────────┼────────────────────────────────────┤
│ CQRS                         │ separate read/write models  │ write model state                  │
├──────────────────────────────┼─────────────────────────────┼────────────────────────────────────┤
│ Event-driven architecture    │ async communication         │ varies by system                   │
├──────────────────────────────┼─────────────────────────────┼────────────────────────────────────┤
│ Event sourcing               │ events as persistence model │ append-only event history          │
└──────────────────────────────┴─────────────────────────────┴────────────────────────────────────┘
```

### Conservative Guidance

A practical progression often looks like this:

1. start with CRUD when one model is still clear
2. introduce logical CQRS when reads and writes clearly diverge
3. add projections or separate read stores when query pressure justifies it
4. adopt event sourcing only if event history itself is a strong business requirement

That progression is common because it adds complexity only when a real problem appears.


# 7. Consistency, Transactions, and Reliability

The hardest part of CQRS is rarely "how to name the handlers." The harder part is deciding what consistency guarantees matter and how the system behaves under retry and lag.

### Keep Business Invariants on the Write Side

Rules such as these belong on the command side:
- an order cannot ship before payment is approved
- a seat cannot be reserved twice
- a credit limit cannot be exceeded silently

Do not rely on a lagging read model to enforce those invariants.

### Use Transactional Publication for Important Changes

If read-side projections depend on events, avoid this fragile sequence:

```text
Bad:
  update write table
  commit
  try to publish event
  crash before publish

Result:
  write succeeded
  read side never learns about it
```

Prefer a durable handoff such as an outbox:

```text
Good:
  begin transaction
    update write table
    insert outbox event
  commit

  relay publishes later
```

### Design Projectors for Retry

Projectors should usually assume:
- duplicate delivery can happen
- replay can happen
- messages may arrive later than expected

Useful techniques:
- store the last processed event ID
- make upserts idempotent
- use per-aggregate ordering when required

### Plan for Projection Rebuilds

Read models are often disposable compared with the write source of truth.

That means you should be able to:
- drop and rebuild a projection
- replay missing events
- backfill a new read model without rewriting the write-side domain

### Be Explicit About Freshness

If the read side is asynchronous, decide how callers learn about freshness.

Options include:
- expose `updatedAt` on read models
- measure projection lag
- show pending states in the UI
- route one special immediate read to the write side when justified

### Good vs Bad Consistency Choices

```text
Bad:
  command returns a dashboard view from a lagging read model
  while claiming the update is fully visible everywhere

Good:
  command returns orderId + version
  query view updates when projection catches up
  UI handles the short consistency window explicitly
```

### Ordering and Concurrency

Not every CQRS system needs total ordering. Many only need ordering per aggregate, such as:
- all events for one order
- all changes for one account
- all reservations for one seat

For write conflicts, optimistic concurrency is common:
- load aggregate with version
- apply command
- save only if version still matches

That keeps write-side conflicts explicit without requiring broad locking in every case.


# 8. Practical TypeScript Patterns

Good CQRS code keeps command intent explicit, models read contracts separately, and makes the write-to-read handoff durable when asynchronous projections matter.

### Example 1: Separate Command and Query Types

```typescript
type ApproveOrderCommand = {
  orderId: string;
  approvedBy: string;
  expectedVersion: number;
  correlationId: string;
};

type GetOrderSummaryQuery = {
  orderId: string;
};

type CommandResult = {
  aggregateId: string;
  version: number;
};

type OrderSummary = {
  orderId: string;
  customerId: string;
  status: "PENDING" | "APPROVED" | "SHIPPED";
  totalCents: number;
  approvedAt: string | null;
  updatedAt: string;
};
```

The command contract expresses intent and concurrency expectations. The query contract expresses retrieval needs.

### Example 2: Command Handler With Write Store and Outbox

```typescript
type OrderRecord = {
  id: string;
  customerId: string;
  status: "PENDING" | "APPROVED" | "SHIPPED";
  totalCents: number;
  version: number;
  approvedAt: string | null;
};

type DomainEvent<TPayload> = {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateVersion: number;
  occurredAt: string;
  correlationId: string;
  payload: TPayload;
};

type OrderApprovedPayload = {
  orderId: string;
  customerId: string;
  totalCents: number;
  approvedAt: string;
};

interface OrdersRepository {
  findById(id: string): Promise<OrderRecord | null>;
  save(order: OrderRecord, expectedVersion: number): Promise<void>;
}

interface OutboxRepository {
  append<TPayload>(event: DomainEvent<TPayload>): Promise<void>;
}

interface TransactionManager {
  runInTransaction<T>(work: () => Promise<T>): Promise<T>;
}

class ApproveOrderHandler {
  constructor(
    private readonly tx: TransactionManager,
    private readonly orders: OrdersRepository,
    private readonly outbox: OutboxRepository,
  ) {}

  async execute(command: ApproveOrderCommand): Promise<CommandResult> {
    return this.tx.runInTransaction(async () => {
      const order = await this.orders.findById(command.orderId);

      if (!order) {
        throw new Error("Order not found");
      }

      if (order.version !== command.expectedVersion) {
        throw new Error("Version conflict");
      }

      if (order.status !== "PENDING") {
        throw new Error("Only pending orders can be approved");
      }

      const approvedAt = new Date().toISOString();
      const nextOrder: OrderRecord = {
        ...order,
        status: "APPROVED",
        approvedAt,
        version: order.version + 1,
      };

      await this.orders.save(nextOrder, command.expectedVersion);

      await this.outbox.append<OrderApprovedPayload>({
        eventId: crypto.randomUUID(),
        eventType: "order.approved",
        aggregateId: nextOrder.id,
        aggregateVersion: nextOrder.version,
        occurredAt: approvedAt,
        correlationId: command.correlationId,
        payload: {
          orderId: nextOrder.id,
          customerId: nextOrder.customerId,
          totalCents: nextOrder.totalCents,
          approvedAt,
        },
      });

      return {
        aggregateId: nextOrder.id,
        version: nextOrder.version,
      };
    });
  }
}
```

This keeps write validation, persistence, and durable publication aligned in one transaction boundary.

### Example 3: Projection Consumer

```typescript
interface ProcessedEventStore {
  has(eventId: string): Promise<boolean>;
  mark(eventId: string): Promise<void>;
}

interface OrderSummaryRepository {
  upsert(summary: OrderSummary & { lastEventId: string }): Promise<void>;
  getById(orderId: string): Promise<OrderSummary | null>;
}

class OrderApprovedProjector {
  constructor(
    private readonly processedEvents: ProcessedEventStore,
    private readonly summaries: OrderSummaryRepository,
  ) {}

  async handle(event: DomainEvent<OrderApprovedPayload>): Promise<void> {
    if (await this.processedEvents.has(event.eventId)) {
      return;
    }

    await this.summaries.upsert({
      orderId: event.payload.orderId,
      customerId: event.payload.customerId,
      status: "APPROVED",
      totalCents: event.payload.totalCents,
      approvedAt: event.payload.approvedAt,
      updatedAt: new Date().toISOString(),
      lastEventId: event.eventId,
    });

    await this.processedEvents.mark(event.eventId);
  }
}
```

This makes duplicate deliveries harmless for the read side.

### Example 4: Query Handler Against the Read Model

```typescript
class GetOrderSummaryHandler {
  constructor(private readonly summaries: OrderSummaryRepository) {}

  async execute(query: GetOrderSummaryQuery): Promise<OrderSummary | null> {
    return this.summaries.getById(query.orderId);
  }
}
```

The query handler does not need write-side validation logic. It only needs to retrieve the view efficiently.

### Example 5: Query-Specific Search Contract

```typescript
type SearchOrdersQuery = {
  status?: "PENDING" | "APPROVED" | "SHIPPED";
  limit: number;
};

interface OrderSearchRepository {
  search(query: SearchOrdersQuery): Promise<OrderSummary[]>;
}

class SearchOrdersHandler {
  constructor(private readonly searchRepo: OrderSearchRepository) {}

  async execute(query: SearchOrdersQuery): Promise<OrderSummary[]> {
    return this.searchRepo.search(query);
  }
}
```

This avoids pushing dashboard search concerns back into the command side.


# 9. When to Use It and Common Pitfalls

CQRS is a strong fit when separating reads and writes removes real tension. It is a weak fit when the separation is mostly theoretical.

### Good Fit

CQRS is often a good fit when:
- write-side business rules are meaningful and should stay explicit
- read traffic is much higher than write traffic
- the read side needs denormalized dashboards, search views, or reporting models
- multiple consumers need different query shapes from the same write-side facts
- the team can support projection lag, replay, and extra operational discipline

Common examples:
- order and fulfillment systems
- ledger and statement systems
- ticketing and reservation workflows
- back-office dashboards over transactional systems

### Weak Fit

CQRS is often a weak fit when:
- one small team is still discovering the domain
- simple CRUD screens map cleanly to the underlying tables
- strict immediate consistency is required for nearly every read
- there is no meaningful divergence between the write model and the read model

### Pitfall 1: Splitting Too Early

Bad assumption:
- "Every serious architecture should use CQRS."

Better assumption:
- use CQRS when read and write pressures have genuinely diverged

### Pitfall 2: Treating CQRS as Just Folder Structure

If the code has `commands/` and `queries/` folders but both sides still depend on the same generic repository and same object model everywhere, the separation may be cosmetic.

Real separation means responsibilities and data shapes diverge where it helps.

### Pitfall 3: Letting Read Models Enforce Write Rules

Lagging read models are a poor place to protect business invariants.

Keep correctness decisions on the write side.

### Pitfall 4: No Replay or Rebuild Plan

If a projection breaks, can you:
- rebuild it safely
- replay missed changes
- detect how far behind it is

If not, the system may work in demos but become fragile in operations.

### Pitfall 5: Returning Stale Read Models as Immediate Truth

A command that writes successfully should not pretend every projection updated instantly unless that is actually guaranteed.

### Pitfall 6: Creating Too Many Projections

Each projection adds:
- storage
- code
- backfill responsibility
- lag monitoring

Build projections for real access patterns, not hypothetical future screens.

### Real-World Platform Shapes

CQRS often appears alongside:
- relational write stores with denormalized read tables
- event streams or queues feeding projection workers
- search indexes for back-office or customer-facing discovery
- service boundaries where one service owns writes and publishes updates for several read consumers

Exact implementation details vary by stack and scale. The durable questions remain:
- where does authoritative state live
- how does the read side catch up
- what freshness does the product require
- how do you rebuild projections safely


# 10. Summary

**Why CQRS exists:**
- it separates state-changing workflows from read-heavy retrieval concerns when one shared model starts serving both poorly
- it lets the write side focus on correctness and the read side focus on query shape and performance

**What CQRS changes:**
- commands and queries become explicit, different operations
- the write model becomes the place for invariants and workflow transitions
- the read side can use projections or separate models tailored to real access patterns

**What it does well:**
- supports denormalized query models without corrupting transactional design
- makes command intent more explicit than generic CRUD updates
- helps systems evolve read and write concerns independently when they have genuinely diverged

**What it does not guarantee by itself:**
- it does not require or guarantee fully separate databases
- it does not eliminate eventual consistency trade-offs on asynchronous read models
- it does not justify extra complexity when a simpler CRUD design still fits

**Practical design advice:**
- start with logical separation before jumping to full physical separation
- keep write-side invariants on the command side
- use durable publication, idempotent projectors, and replay plans when read models depend on events
- build read models for real query shapes, not for abstract architectural purity

**Implementation checklist:**

```text
Fit and boundaries:
  □ Confirm that reads and writes have genuinely different needs
  □ Start with the lightest CQRS form that solves the current problem
  □ Keep command intent explicit instead of hiding business actions behind generic updates

Write side:
  □ Put invariants, validation, and concurrency checks on the command path
  □ Keep the write model aligned to business state transitions, not screen layout
  □ Return acknowledgments, identifiers, or versions rather than rich dashboard payloads by default

Read side:
  □ Create read models only for real query patterns
  □ Add indexes and denormalized fields based on retrieval needs
  □ Be explicit about freshness expectations when projections are asynchronous

Reliability and operations:
  □ Use outbox or another durable publication pattern when projections depend on events
  □ Make projectors idempotent and safe under replay
  □ Measure lag, rebuild projections periodically in lower environments, and document recovery steps
```
