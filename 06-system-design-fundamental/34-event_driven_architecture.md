# Event-Driven Architecture

[← Back to Index](README.md)

Imagine you are building an order platform. When a customer checks out, you need to reserve inventory, authorize payment, send a confirmation email, update analytics, notify fraud systems, and kick off fulfillment.

Without an event-driven design, teams often wire every downstream action directly into one synchronous request path:

```typescript
type PlaceOrderInput = {
  orderId: string;
  customerId: string;
  sku: string;
  quantity: number;
  amountCents: number;
};

class CheckoutService {
  async placeOrder(input: PlaceOrderInput): Promise<void> {
    await this.reserveInventory(input.sku, input.quantity);
    await this.authorizePayment(input.customerId, input.amountCents);
    await this.sendConfirmationEmail(input.customerId, input.orderId);
    await this.recordAnalytics(input.orderId, input.amountCents);
    await this.notifyFraudSystem(input.orderId, input.customerId, input.amountCents);
    await this.startFulfillment(input.orderId, input.sku, input.quantity);
  }

  private async reserveInventory(sku: string, quantity: number): Promise<void> {
    void sku;
    void quantity;
  }

  private async authorizePayment(customerId: string, amountCents: number): Promise<void> {
    void customerId;
    void amountCents;
  }

  private async sendConfirmationEmail(customerId: string, orderId: string): Promise<void> {
    void customerId;
    void orderId;
  }

  private async recordAnalytics(orderId: string, amountCents: number): Promise<void> {
    void orderId;
    void amountCents;
  }

  private async notifyFraudSystem(
    orderId: string,
    customerId: string,
    amountCents: number,
  ): Promise<void> {
    void orderId;
    void customerId;
    void amountCents;
  }

  private async startFulfillment(orderId: string, sku: string, quantity: number): Promise<void> {
    void orderId;
    void sku;
    void quantity;
  }
}
```

This usually fails in predictable ways:
- one slow dependency stretches the user-visible checkout path
- adding a new consumer means changing the same service again
- retry behavior becomes inconsistent because every downstream call is handled differently
- bursts in one downstream system create backpressure in the entire request flow

This is where **event-driven architecture** comes in. Instead of making one service coordinate every consequence directly, the system records that something happened and lets interested consumers react through durable asynchronous flows.

In this chapter, you will learn:
  * [Why event-driven architecture exists](#1-why-event-driven-architecture-exists)
  * [What event-driven architecture is and is not](#2-what-event-driven-architecture-is)
  * [Which building blocks matter most](#3-core-building-blocks)
  * [How events move through a system](#4-how-events-flow-through-a-system)
  * [How to model events, schemas, and delivery semantics](#5-event-modeling-schemas-and-delivery-semantics)
  * [Which event-driven patterns appear most often](#6-common-event-driven-patterns)
  * [How to handle consistency, ordering, and reliability](#7-consistency-ordering-and-reliability)
  * [What practical TypeScript implementations look like](#8-practical-typescript-patterns)
  * [When to use event-driven architecture and which pitfalls matter](#9-when-to-use-it-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why Event-Driven Architecture Exists

Event-driven architecture exists because many systems need looser coupling between producers and downstream reactions than direct request chains can provide.

### The Core Problem

In a tightly synchronous design, one action often becomes the coordination point for many other actions:
- order placed
- payment authorized
- inventory reserved
- email sent
- analytics updated
- fraud checks started

If all of that happens inline, the initiating service becomes responsible for timing, retries, and failure handling across too many unrelated concerns.

```text
One business action:
  place order

Direct fan-out:
  -> inventory API
  -> payment API
  -> notification API
  -> analytics API
  -> fraud API

Common result:
  -> longer response paths
  -> tighter runtime coupling
  -> harder scaling under bursts
  -> more brittle failure handling
```

### What Event-Driven Architecture Optimizes For

Event-driven architecture usually optimizes for:
- decoupling producers from downstream consumers
- asynchronous reaction to state changes
- buffering and smoothing bursts of work
- fan-out to multiple consumers without changing the original producer every time

### Why Teams Adopt It

Teams often consider event-driven architecture when:
- one action has many downstream side effects
- some work can happen after the initial request completes
- different consumers need to scale independently
- workflows benefit from durable queues, logs, or replayable streams

### What It Does Not Automatically Solve

Event-driven architecture does not automatically fix:
- bad domain boundaries
- unclear event ownership
- weak observability
- inconsistent schemas
- poor idempotency handling

It moves complexity away from direct coupling, but it introduces distributed workflow and data consistency concerns that still need deliberate design.


# 2. What Event-Driven Architecture Is

Event-driven architecture is a style in which systems produce and consume events to communicate that something meaningful happened, usually with asynchronous processing between the producer and one or more consumers.

### A Conservative Definition

The durable idea is:

```text
Event-driven architecture =
  producers emit events
  + brokers or logs distribute them
  + consumers react asynchronously
  + state changes propagate over time instead of one immediate call chain
```

### What Counts as an Event

An event is usually a fact about something that already happened, such as:
- `order.created`
- `payment.authorized`
- `inventory.reserved`
- `shipment.dispatched`

Good events usually describe the past, not a vague future intention.

### Event-Driven Does Not Mean "Everything Must Be Asynchronous"

A healthy system often mixes styles:
- synchronous APIs for user-facing commands and immediate reads
- asynchronous events for downstream processing, projections, and integrations

```text
Common hybrid model:
  client -> API/service -> database
                         -> publish event
                              -> consumers react later
```

### What It Is Not

Event-driven architecture is usually not:
- the same thing as "any system using a queue"
- a guarantee that no direct service calls exist
- a promise of global ordering across all events
- proof that exactly-once processing exists end to end
- the same thing as event sourcing

Event sourcing is a more specific persistence model where events are the source of truth for state. Event-driven architecture is broader and can exist with ordinary CRUD databases, queues, or streams.


# 3. Core Building Blocks

Healthy event-driven systems rely on a few recurring building blocks.

### 1. Producers

A producer is the component that emits an event after something important happens.

Examples:
- an orders service publishing `order.created`
- a payments service publishing `payment.captured`
- a user service publishing `user.email_changed`

The producer owns the meaning of the event and should publish it consistently.

### 2. Broker, Bus, Queue, or Log

Events usually travel through some intermediary layer:
- queues for work distribution
- topics for pub-sub fan-out
- append-only logs for replayable event streams

The exact product varies by stack, but the architectural roles are similar:
- accept published events
- retain or route them
- deliver them to consumers

### 3. Consumers

Consumers react to events by doing work such as:
- updating a read model
- calling an external integration
- sending notifications
- starting another workflow step

One event may have zero, one, or many consumers.

### 4. Event Schema

Every event needs a stable contract:
- event type
- event ID
- occurred-at timestamp
- version
- business payload

Weak schemas create hidden coupling because consumers start guessing field meaning.

### 5. State Store

Most consumers persist something durable:
- a transactional record
- a read model
- a retry marker
- an audit log

Event-driven does not remove databases. It changes how data flows between them.

### 6. Observability and Operations

You still need:
- logs with event IDs and correlation IDs
- metrics for lag, retries, errors, and throughput
- dead-letter or failure inspection paths
- replay or recovery procedures where appropriate

```text
┌──────────────┐      publish       ┌──────────────┐      consume       ┌──────────────┐
│ Producer     │ -----------------> │ Broker / Log │ -----------------> │ Consumer A   │
└──────────────┘                    └──────┬───────┘                    └──────────────┘
                                           │
                                           ├──────────────────────────-> ┌──────────────┐
                                           │                             │ Consumer B   │
                                           │                             └──────────────┘
                                           │
                                           └──────────────────────────-> ┌──────────────┐
                                                                         │ Consumer C   │
                                                                         └──────────────┘
```

### Queue vs Pub-Sub vs Log

```text
┌──────────────────────┬──────────────────────────────────────────────┐
│ Shape                │ Typical use                                  │
├──────────────────────┼──────────────────────────────────────────────┤
│ Queue                │ One worker or worker group handles a task    │
├──────────────────────┼──────────────────────────────────────────────┤
│ Pub-sub topic        │ Multiple consumers react to the same event    │
├──────────────────────┼──────────────────────────────────────────────┤
│ Append-only log      │ Ordered stream with replay by consumer group  │
└──────────────────────┴──────────────────────────────────────────────┘
```

These shapes overlap in some platforms. The durable question is which delivery and retention model your workflow actually needs.


# 4. How Events Flow Through a System

Most production event flows start with a normal command or state change, not with an event appearing by magic.

### A Common Order Flow

```text
┌──────────┐    command    ┌──────────────┐    write state    ┌──────────────┐
│ Client   │ -----------> │ Orders svc   │ ----------------> │ Orders DB    │
└──────────┘              └──────┬───────┘                   └──────┬───────┘
                                 │                                  │
                                 │ append outbox                    │
                                 ▼                                  │
                           ┌──────────────┐                         │
                           │ Outbox table │                         │
                           └──────┬───────┘                         │
                                  │ relay publishes                 │
                                  ▼                                 │
                           ┌──────────────┐                         │
                           │ Broker / Log │                         │
                           └───┬────┬─────┘                         │
                               │    │                               │
                               ▼    ▼                               ▼
                        ┌──────────┐ ┌──────────────┐        authoritative
                        │ Email svc│ │ Analytics svc│        order state
                        └──────────┘ └──────────────┘
```

### Step-by-Step Lifecycle

```text
1. A command reaches the producer, such as POST /orders
2. The producer validates input and writes authoritative business state
3. The producer records an event for publication
4. A relay, broker client, or transaction-aware publisher emits the event
5. Consumers receive the event according to the delivery model
6. Each consumer performs its own local work and persistence
7. Failures retry, route to a dead-letter path, or trigger operator action
```

### Why Durable Publication Matters

One of the hardest bugs in event-driven systems is:
- database commit succeeds
- event publish fails

If that happens, downstream systems never learn that the business action occurred. That is why many systems use transactional outbox or equivalent patterns instead of "write to DB, then publish best effort" logic.

### Synchronous Edges Still Exist

Most systems keep some synchronous steps:
- accepting the original command
- validating permissions
- returning accepted or rejected status

Event-driven architecture usually reduces the width of the synchronous path. It rarely eliminates synchronous work entirely.


# 5. Event Modeling, Schemas, and Delivery Semantics

Event-driven systems become brittle when event meaning is vague or delivery assumptions are implicit.

### Event Naming and Payload Design

Prefer event names that describe completed facts:
- `invoice.issued`
- `customer.registered`
- `shipment.delivered`

Be careful with names like:
- `process-order`
- `handle-payment`
- `do-email`

Those often describe commands or implementation details rather than domain facts.

### A Practical Event Envelope

```typescript
type EventEnvelope<TPayload> = {
  eventId: string;
  eventType: string;
  aggregateId: string;
  version: number;
  occurredAt: string;
  correlationId: string;
  payload: TPayload;
};
```

Useful fields usually include:
- a unique event ID for deduplication
- a stable event type
- an aggregate or entity ID for partitioning and ordering
- a version for schema evolution
- a correlation ID for tracing workflows

### Delivery Semantics

Distributed messaging is usually discussed in terms of delivery guarantees:

```text
┌──────────────────────┬──────────────────────────────────────────────┐
│ Semantics            │ What it usually means for your application   │
├──────────────────────┼──────────────────────────────────────────────┤
│ At-most-once         │ Messages may be lost, duplicates are rarer   │
├──────────────────────┼──────────────────────────────────────────────┤
│ At-least-once        │ Messages may repeat, consumers need safety   │
├──────────────────────┼──────────────────────────────────────────────┤
│ Exactly-once         │ Usually scoped and conditional, not magical  │
└──────────────────────┴──────────────────────────────────────────────┘
```

The conservative default is to assume at-least-once delivery for many real systems and make consumers idempotent.

### Ordering Rules

Global ordering is usually unrealistic at scale. A more durable expectation is:
- ordering per aggregate ID
- ordering per partition or key
- no ordering guarantee across unrelated keys

```text
Useful mental model:
  order-123 events may be ordered
  order-123 vs order-999 usually should not assume shared order
```

### Schema Evolution Rules

Safer evolution usually looks like:
- add fields before removing old ones
- keep event meaning stable
- version intentionally when compatibility changes
- avoid reusing the same event type name for different semantics

Bad schema habit:
- treat events like private internal objects that can change freely

Better schema habit:
- treat published events like contracts with consumers you may not fully control


# 6. Common Event-Driven Patterns

Event-driven systems are rarely just "publish and hope." They usually rely on repeatable patterns.

### Pattern 1: Event Notification

The event tells consumers that something changed, and they fetch more detail if needed.

Good for:
- lightweight invalidation
- low-payload change awareness
- cases where the source system remains the authority for reads

Trade-off:
- extra read traffic to the source system

### Pattern 2: Event-Carried State Transfer

The event includes enough business data for consumers to react without another immediate fetch.

Good for:
- projections
- analytics pipelines
- integration consumers that should stay loosely coupled at read time

Trade-off:
- larger payloads and stricter schema discipline

### Pattern 3: Competing Consumers

Multiple workers consume from one queue or subscription group to share load.

```text
┌──────────────┐
│ Work queue   │
└───┬────┬─────┘
    │    │
    ▼    ▼
 worker-1 worker-2
    │
    ▼
 worker-3
```

This is usually a throughput pattern, not a fan-out pattern.

### Pattern 4: Publish-Subscribe Fan-Out

One published event triggers multiple independent reactions.

Example:
- `order.created`
  - notification consumer sends email
  - analytics consumer updates revenue metrics
  - fulfillment consumer prepares shipment

This lets new consumers be added without modifying the original producer, assuming schema and governance are sound.

### Pattern 5: Transactional Outbox

The producer writes business state and an outbox record in one local transaction, then a relay publishes the outbox entry.

This is often safer than:

```text
Bad:
  save order
  then try to publish event

Risk:
  save succeeds
  publish fails
  downstream systems miss the state change
```

### Pattern 6: Saga-Style Workflows

When one business process spans multiple services, a saga can coordinate progress through events and compensations.

```text
Order created
  -> inventory reserved
  -> payment authorized
  -> shipment requested

If payment fails:
  -> release inventory
  -> mark order as failed
```

This is not a distributed ACID transaction. It is explicit workflow design over local state transitions.

### Pattern 7: Projections and Read Models

Consumers can maintain derived views optimized for read patterns:
- customer order history
- live inventory availability
- billing dashboards
- search indexes

This is one of the most practical uses of event-driven architecture because it separates transactional writes from read-optimized models.


# 7. Consistency, Ordering, and Reliability

The hardest event-driven problems usually involve correctness under retries, partial failure, and time.

### Eventual Consistency Is a First-Class Trade-Off

If one service publishes an event and another service reacts later, their states may be temporarily different but still valid.

Example:
- orders service marks an order as `PLACED`
- notification service has not yet sent the email
- analytics projection has not yet updated the dashboard

That delay is often acceptable, but only if the business flow is designed with clear expectations.

### Idempotency Is Usually Mandatory

Consumers should usually assume duplicates can happen because of retries, redelivery, or uncertain acknowledgments.

Safer rule:
- repeating the same event should not double-charge, double-ship, or double-email

### Dead-Letter and Retry Design

```text
┌──────────────┐    fail    ┌──────────────┐
│ Consumer     │ ---------> │ Retry policy │
└──────────────┘            └──────┬───────┘
                                   │ retries exhausted
                                   ▼
                            ┌──────────────┐
                            │ Dead-letter  │
                            │ queue/topic  │
                            └──────────────┘
```

Useful design questions:
- how many retries are safe
- which errors are transient versus permanent
- who inspects the dead-letter path
- whether poisoned events can block a partition or subscription

### Replay and Rebuild

Replay can be valuable for:
- rebuilding a read model
- backfilling a new consumer
- recovering after a consumer bug

Replay is only safe if:
- events are retained long enough
- consumers are duplicate-safe
- schema compatibility is handled deliberately

### Partitioning and Ordering by Key

For workflows tied to one entity, partition by a stable key when possible:
- `orderId`
- `accountId`
- `shipmentId`

That can help preserve useful local ordering while still scaling horizontally.

### A Practical Outbox Schema

```sql
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,
    aggregate_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(128) NOT NULL,
    event_version INTEGER NOT NULL,
    payload JSONB NOT NULL,
    correlation_id VARCHAR(64) NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    published_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_outbox_events_unpublished
ON outbox_events (published_at, occurred_at)
WHERE published_at IS NULL;
```

This does not guarantee perfect delivery by itself. It gives you a durable local record of what still needs to be published.

### Observability Signals That Matter

Useful metrics often include:
- queue depth or partition lag
- consumer processing latency
- retry volume
- dead-letter count
- publish failure count
- event age at consumption time

Without these signals, event-driven systems can fail quietly.


# 8. Practical TypeScript Patterns

Good event-driven code makes contracts explicit, writes durable intent before fan-out, and treats consumers as duplicate-prone remote processors.

### Example 1: Stable Event Types

```typescript
type OrderCreated = {
  orderId: string;
  customerId: string;
  amountCents: number;
};

type DomainEvent<TPayload> = {
  eventId: string;
  eventType: string;
  aggregateId: string;
  version: number;
  occurredAt: string;
  correlationId: string;
  payload: TPayload;
};

type OrderCreatedEvent = DomainEvent<OrderCreated>;
```

This keeps the envelope and payload separate, which makes versioning and cross-cutting metadata easier to manage.

### Example 2: Transactional Outbox Write

```typescript
type OrderRecord = {
  id: string;
  customerId: string;
  amountCents: number;
  status: "PLACED";
};

interface OrdersRepository {
  insert(order: OrderRecord): Promise<void>;
}

interface OutboxRepository {
  append<TPayload>(event: DomainEvent<TPayload>): Promise<void>;
}

interface TransactionManager {
  runInTransaction<T>(work: () => Promise<T>): Promise<T>;
}

class PlaceOrderService {
  constructor(
    private readonly tx: TransactionManager,
    private readonly orders: OrdersRepository,
    private readonly outbox: OutboxRepository,
  ) {}

  async place(input: {
    orderId: string;
    customerId: string;
    amountCents: number;
    correlationId: string;
  }): Promise<void> {
    await this.tx.runInTransaction(async () => {
      await this.orders.insert({
        id: input.orderId,
        customerId: input.customerId,
        amountCents: input.amountCents,
        status: "PLACED",
      });

      await this.outbox.append<OrderCreated>({
        eventId: crypto.randomUUID(),
        eventType: "order.created",
        aggregateId: input.orderId,
        version: 1,
        occurredAt: new Date().toISOString(),
        correlationId: input.correlationId,
        payload: {
          orderId: input.orderId,
          customerId: input.customerId,
          amountCents: input.amountCents,
        },
      });
    });
  }
}
```

This pattern makes "state changed" and "event needs publication" part of the same local transaction.

### Example 3: Relay Publisher

```typescript
interface PendingOutboxEvent<TPayload> extends DomainEvent<TPayload> {
  id: string;
}

interface OutboxRelayStore {
  fetchBatch(limit: number): Promise<Array<PendingOutboxEvent<unknown>>>;
  markPublished(id: string, publishedAt: string): Promise<void>;
}

interface EventPublisher {
  publish<TPayload>(event: DomainEvent<TPayload>): Promise<void>;
}

class OutboxRelay {
  constructor(
    private readonly store: OutboxRelayStore,
    private readonly publisher: EventPublisher,
  ) {}

  async flush(limit = 100): Promise<number> {
    const events = await this.store.fetchBatch(limit);

    for (const event of events) {
      await this.publisher.publish(event);
      await this.store.markPublished(event.id, new Date().toISOString());
    }

    return events.length;
  }
}
```

In a real system, you may batch, lock, or checkpoint more carefully, but the core idea remains the same.

### Example 4: Idempotent Consumer

```typescript
interface ProcessedEventStore {
  has(eventId: string): Promise<boolean>;
  mark(eventId: string): Promise<void>;
}

interface EmailGateway {
  sendOrderConfirmation(input: { customerId: string; orderId: string }): Promise<void>;
}

class OrderCreatedEmailConsumer {
  constructor(
    private readonly processedEvents: ProcessedEventStore,
    private readonly emailGateway: EmailGateway,
  ) {}

  async handle(event: OrderCreatedEvent): Promise<void> {
    if (await this.processedEvents.has(event.eventId)) {
      return;
    }

    await this.emailGateway.sendOrderConfirmation({
      customerId: event.payload.customerId,
      orderId: event.payload.orderId,
    });

    await this.processedEvents.mark(event.eventId);
  }
}
```

This does not assume duplicate-free delivery. It makes duplicates harmless for one consumer.

### Example 5: Projection Consumer

```typescript
interface RevenueProjectionStore {
  addBookedRevenue(orderId: string, amountCents: number): Promise<void>;
}

class RevenueProjectionConsumer {
  constructor(private readonly store: RevenueProjectionStore) {}

  async handle(event: OrderCreatedEvent): Promise<void> {
    await this.store.addBookedRevenue(event.payload.orderId, event.payload.amountCents);
  }
}
```

Projection consumers are often simple, but they still need idempotency and replay planning in production.


# 9. When to Use It and Common Pitfalls

Event-driven architecture is a strong fit when asynchronous coordination creates clearer boundaries than one synchronous chain would.

### Good Fit

Event-driven architecture is often a good fit when:
- one business action fans out to many downstream reactions
- the initiating request should not wait for every side effect
- consumers need to scale independently
- replay, buffering, or decoupled integration matters
- read models or analytics projections need to evolve separately from write models

### Weak Fit

It is often a weak fit when:
- the workflow truly requires immediate all-or-nothing consistency
- the team cannot yet support schema governance and observability
- there are only one or two tightly coupled components with no meaningful asynchronous value
- eventual consistency would confuse the product or violate business rules

### Pitfall 1: Publishing Events Without Ownership Rules

If no one owns the event contract, consumers start relying on accidental fields and semantics drift quickly.

Better:
- define who owns each event type
- document the meaning and compatibility expectations

### Pitfall 2: Treating Events as Internal Object Dumps

Bad:
- publish entire ORM entities with unstable fields

Better:
- publish deliberate business events with stable semantics

### Pitfall 3: Assuming Global Ordering

Many bugs come from hidden assumptions such as:
- "all order events will always arrive in the same global sequence"

Safer assumption:
- ordering may only exist per key, partition, or subscription group

### Pitfall 4: No Replay or Dead-Letter Plan

If a consumer breaks for six hours, can you:
- replay missed events
- inspect failed payloads
- backfill a projection safely

If not, the architecture may be event-driven in design but fragile in operations.

### Pitfall 5: Overusing Asynchrony

Not every step should become an event:
- permission checks usually belong inline
- user-facing validation often belongs inline
- truly required immediate responses often belong inline

Good systems choose asynchronous boundaries deliberately instead of turning every function call into a broker hop.

### Pitfall 6: Ignoring End-to-End Observability

If you cannot connect:
- original request ID
- published event ID
- consumer retries
- downstream failures

then debugging production workflows becomes slow and error-prone.

### Real-World Platform Shapes

Real systems often combine patterns such as:
- Kafka-compatible logs or cloud-managed event streams for high-throughput ordered streams
- RabbitMQ, SQS, or similar queueing systems for buffered work distribution
- SNS, EventBridge, Pub/Sub, NATS, or similar topic systems for fan-out and integration
- Kubernetes or VM-based services producing and consuming events alongside ordinary HTTP APIs

Exact guarantees and operational behavior vary by platform and configuration. The durable design questions stay the same:
- who owns the event
- how it is delivered
- what ordering exists
- how retries, replay, and failure inspection work


# 10. Summary

**Why event-driven architecture exists:**
- it reduces direct runtime coupling when one action has many downstream consequences
- it helps systems handle fan-out, burst buffering, and asynchronous workflows more cleanly than wide synchronous call chains

**What event-driven architecture changes:**
- communication becomes centered on published facts and downstream reactions
- consistency becomes more explicit over time instead of hidden inside one request path
- schemas, retries, ordering, and observability become core design concerns

**What it does well:**
- supports independent consumers and scalable fan-out
- enables projections, integrations, and background workflows without repeatedly editing the producer
- creates room for buffering, replay, and more resilient asynchronous processing

**What it does not guarantee by itself:**
- it does not guarantee exactly-once behavior across an entire system
- it does not remove the need for strong event ownership and schema discipline
- it does not replace synchronous APIs where immediate validation or responses are required

**Practical design advice:**
- publish durable business facts, not accidental object dumps
- assume retries and duplicates can happen
- use outbox, idempotent consumers, and dead-letter handling where the workflow matters
- preserve ordering only where the business actually needs it

**Implementation checklist:**

```text
Fit and boundaries:
  □ Confirm that asynchronous fan-out or buffering solves a real problem
  □ Keep immediate validation and user-facing command handling on the synchronous path where needed
  □ Define which state changes should publish events and which should remain local

Events and contracts:
  □ Give every event a clear owner, name, schema, and compatibility policy
  □ Include event IDs, timestamps, correlation IDs, and stable aggregate keys where useful
  □ Version events deliberately instead of changing their meaning silently

Delivery and reliability:
  □ Choose queue, pub-sub, or log semantics based on workload needs
  □ Design consumers to be idempotent or otherwise safe under retry
  □ Add retry, dead-letter, and replay procedures before relying on the workflow in production

Data and consistency:
  □ Use transactional outbox or an equivalent durable publication pattern for important state changes
  □ Be explicit about eventual consistency windows and user-visible behavior
  □ Partition by stable business keys when ordering matters

Operations:
  □ Measure lag, throughput, retries, dead-letter volume, and consumer latency
  □ Propagate correlation IDs across publish and consume boundaries
  □ Test duplicate delivery, partial failures, and consumer recovery paths regularly
```
