# Outbox Pattern

[← Back to Index](README.md)

Imagine you are building checkout for an e-commerce platform. When an order is accepted, other systems need to hear about it: inventory should reserve stock, payment should begin authorization, and analytics or fulfillment pipelines may react later.

Without a durable handoff, teams often write code that updates the database and publishes the event as two separate steps:

```typescript
type PlaceOrderInput = {
  orderId: string;
  customerId: string;
  totalCents: number;
};

interface TransactionManager {
  runInTransaction<T>(work: () => Promise<T>): Promise<T>;
}

interface OrdersRepository {
  insert(input: PlaceOrderInput): Promise<void>;
}

interface MessageBroker {
  publish(topic: string, payload: string): Promise<void>;
}

class NaiveOrderService {
  constructor(
    private readonly tx: TransactionManager,
    private readonly orders: OrdersRepository,
    private readonly broker: MessageBroker,
  ) {}

  async placeOrder(input: PlaceOrderInput): Promise<void> {
    await this.tx.runInTransaction(async () => {
      await this.orders.insert(input);
    });

    await this.broker.publish(
      "orders.created",
      JSON.stringify({
        orderId: input.orderId,
        customerId: input.customerId,
        totalCents: input.totalCents,
      }),
    );
  }
}
```

This fails in predictable ways:
- the order row may commit, then the process may crash before the event is published
- the broker call may time out, leaving you unsure whether consumers will see the event
- a retry may publish the same event twice unless downstream consumers are idempotent
- downstream workflows may stall because the source-of-truth state changed but no durable message handoff exists

This is where the **Outbox Pattern** comes in. Instead of writing business state and publishing to the broker as two unrelated operations, you write business state and an outbox record in one local database transaction. A separate relay then publishes the outbox record to the broker.

In this chapter, you will learn:
  * [Why the Outbox Pattern exists](#1-why-the-outbox-pattern-exists)
  * [What the Outbox Pattern is and is not](#2-what-the-outbox-pattern-is)
  * [How the dual-write problem creates failure windows](#3-the-dual-write-problem-in-detail)
  * [How the outbox flow works step by step](#4-how-the-outbox-flow-works)
  * [Which relay models and delivery semantics matter](#5-relay-models-and-delivery-semantics)
  * [How ordering, idempotency, and consumer design fit together](#6-ordering-idempotency-and-consumer-design)
  * [What practical schema, partitioning, and cleanup look like](#7-storage-schema-partitioning-and-cleanup)
  * [What pragmatic TypeScript implementations look like](#8-practical-typescript-patterns)
  * [When to use the pattern and which pitfalls repeat](#9-when-to-use-it-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why the Outbox Pattern Exists

The Outbox Pattern exists because many systems need one local state change and one later message publication to stay logically connected, but those actions usually commit in different places.

### One Business Action Often Crosses Two Commit Boundaries

Consider a typical order flow:
- the service writes an `orders` row in its database
- the service needs to publish `order.created`
- downstream services depend on that event to continue work

The naive write path is a dual write:

```text
Application
    |
    ├── write business row ----------> Orders DB
    |
    └── publish event ---------------> Broker
```

Those are two separate systems with separate durability and failure behavior.

### Local Transactions Stop at the Database Boundary

Your database can usually guarantee atomicity for:
- inserting the order row
- inserting related order items
- updating local inventory reservations owned by the same database

It does not usually guarantee atomicity for:
- a remote broker publish
- a webhook call
- a third-party API request
- another service's database

That means the producer can end up with a committed row but no reliable event publication.

### The Real Requirement Is Usually "Never Lose the Intent to Publish"

Many teams describe the problem as "publish the event exactly once." That wording is often too strong and too vague at the same time.

The durable requirement is usually:

```text
If the local transaction commits,
the intent to publish the corresponding message
must also be durable.
```

The outbox solves that narrower but important problem.

### The Pattern Is Common in Event-Driven Workflows

The Outbox Pattern is often useful when:
- starting or advancing sagas
- updating read models asynchronously
- emitting domain events after state transitions
- integrating a service-owned database with a broker such as Kafka, RabbitMQ, SQS, or a similar queue or log

It is not limited to microservices. Any system that writes durable state and then needs reliable asynchronous follow-up can benefit from the same idea.


# 2. What the Outbox Pattern Is

The Outbox Pattern stores pending messages in the same durable database transaction as the business state that caused them.

### A Conservative Definition

The durable idea is:

```text
Outbox Pattern =
  business state change
  + outbox record written in the same local transaction
  + separate relay process that publishes later
  + idempotent downstream handling because publication is usually at-least-once
```

### The Database Becomes the Producer's Source of Truth

With an outbox, the producer no longer asks:

```text
Did I update the row and publish the event successfully?
```

It asks:

```text
Did I commit the row and the durable record of the event to publish?
```

That is a much safer boundary because one local transaction can answer it.

### The Pattern Splits Producer Responsibility in Two

```text
Producer request path:
  write business state
  write outbox row
  commit

Relay path:
  read outbox row
  publish to broker
  mark as published or retry later
```

### What the Pattern Is Not

The Outbox Pattern is usually not:
- a global distributed transaction
- proof of end-to-end exactly-once processing
- a replacement for idempotent consumers
- a guarantee that every consumer will see events in perfect global order

It is a durable producer-side handoff pattern.

### Outbox vs Direct Publish

```text
┌──────────────────────────────┬────────────────────────────────────────────┐
│ Approach                     │ Main idea                                  │
├──────────────────────────────┼────────────────────────────────────────────┤
│ Direct DB write + publish    │ app tries to commit state and broker       │
│                              │ publication as separate steps              │
├──────────────────────────────┼────────────────────────────────────────────┤
│ Transactional outbox         │ app commits state and publish intent       │
│                              │ together, then relays later                │
└──────────────────────────────┴────────────────────────────────────────────┘
```

The outbox reduces one dangerous failure gap. It does not remove all distributed systems work after that point.


# 3. The Dual-Write Problem in Detail

The dual-write problem is the risk created when one logical action updates two independent systems without one shared commit decision.

### Failure Window 1: Database Commit Succeeds, Publish Never Happens

This is the classic outbox motivation:

```text
1. insert order row       -> committed
2. process crashes
3. publish never happens  -> downstream systems learn nothing
```

The source-of-truth state changed, but the rest of the system may remain unaware.

### Failure Window 2: Publish Happens Before the Transaction Is Truly Safe

Some teams try to publish first or publish before the local transaction is fully settled:

```text
1. publish order.created  -> consumers react
2. local transaction fails
3. no durable order row exists
```

Now consumers act on a business fact that never committed locally.

### Failure Window 3: Timeout Creates an Unknown Outcome

A timeout rarely means clean failure:

```text
producer -> broker publish(event-42)
broker may have stored it
ack may be lost
producer times out
```

If the producer retries blindly:
- duplicate messages may appear
- consumers may process the same intent twice
- operators may not know whether one or more downstream effects are correct

### Failure Window 4: Retry Logic Can Multiply Side Effects

Without durable publication records and consumer idempotency:
- restarts can re-send messages
- multiple relay workers can race on the same row
- manual replay can duplicate old events

### Common Failure Modes

```text
┌──────────────────────────────┬──────────────────────────────┬──────────────────────────────────────┐
│ Failure                      │ What the producer knows      │ Typical risk                         │
├──────────────────────────────┼──────────────────────────────┼──────────────────────────────────────┤
│ Crash after DB commit        │ state committed locally      │ no event publication                 │
├──────────────────────────────┼──────────────────────────────┼──────────────────────────────────────┤
│ Publish before rollback      │ message may be visible       │ consumers act on missing state       │
├──────────────────────────────┼──────────────────────────────┼──────────────────────────────────────┤
│ Broker timeout               │ outcome is unknown           │ duplicate retry or silent stall      │
├──────────────────────────────┼──────────────────────────────┼──────────────────────────────────────┤
│ Relay crash after publish    │ message may already exist    │ duplicate publication on replay      │
├──────────────────────────────┼──────────────────────────────┼──────────────────────────────────────┤
│ Consumer duplicate delivery  │ same event arrives again     │ repeated downstream side effects     │
└──────────────────────────────┴──────────────────────────────┴──────────────────────────────────────┘
```

### Good and Bad Mental Models

```text
Bad:
├── "If the DB commit succeeded, the publish probably did too"
├── "Timeout means the broker definitely did not store the event"
└── "Exactly-once is the producer's problem only"

Good:
├── treat DB write and publish as separate commit boundaries
├── persist the intent to publish inside the local transaction
└── design relay and consumers to tolerate duplicates and unknown outcomes
```


# 4. How the Outbox Flow Works

The outbox flow turns one risky direct publish into a two-stage process with a durable handoff in the middle.

### Step-by-Step Flow

```text
┌──────────────┐
│ Client       │
└──────┬───────┘
       v
┌──────────────────────────────┐
│ Producer service             │
│ 1. write business state      │
│ 2. write outbox record       │
│ 3. commit local transaction  │
└──────────────┬───────────────┘
               v
┌──────────────────────────────┐
│ Producer database            │
│ business tables + outbox     │
└──────────────┬───────────────┘
               v
┌──────────────────────────────┐
│ Relay                        │
│ 4. read pending outbox row   │
│ 5. publish to broker         │
│ 6. mark published or retry   │
└──────────────┬───────────────┘
               v
┌──────────────────────────────┐
│ Broker / log / queue         │
└──────────────┬───────────────┘
               v
┌──────────────────────────────┐
│ Consumers                    │
│ idempotent handling          │
└──────────────────────────────┘
```

### The Critical Atomic Boundary

The business row and the outbox row must be written in the same local transaction:

```text
same local transaction:
  update orders
  insert outbox_events row
  commit
```

If the transaction commits, the publish intent is durable.

If the transaction rolls back, neither the business row nor the outbox row remains visible.

### Why a Separate Relay Helps

The relay isolates broker communication from the request path:
- request latency stays tied to local transaction cost instead of broker availability
- publication can be retried after crashes or transient broker issues
- operational tooling can inspect the pending backlog directly in the database

### The Relay Still Needs Careful Recovery

The relay can also fail at awkward times:

```text
1. relay reads row
2. relay publishes to broker
3. relay crashes before marking published
4. relay restarts and publishes again
```

That is why outbox designs usually assume at-least-once publication and pair it with idempotent consumers.


# 5. Relay Models and Delivery Semantics

Different teams implement the relay differently, but the reliability trade-offs are similar.

### Model 1: Polling Publisher

The service or a worker periodically queries for unpublished rows:

```text
SELECT ... FROM outbox_events
WHERE published_at IS NULL
ORDER BY created_at
LIMIT 100;
```

Typical characteristics:
- straightforward to reason about
- easy to build with normal SQL and background workers
- introduces polling interval and query load

### Model 2: Change Data Capture or Log Tailing

Some teams publish outbox entries by following the database's change log or change stream instead of active polling.

Typical characteristics:
- can reduce repeated polling queries
- can fit well when a platform already runs CDC infrastructure
- still needs clear publication contracts, replay handling, and consumer idempotency

The durable idea is the same: the transaction writes an outbox row first, and the relay publishes from durable database state later.

### Delivery Semantics

The outbox usually aims for:
- no silent loss of committed publish intent on the producer side
- eventual publication while the relay and broker recover
- at-least-once delivery to downstream consumers

It usually does not guarantee:
- global exactly-once processing across producer, broker, and consumer
- perfect global ordering across all business entities
- zero duplicates after crashes, retries, or replay

### Relay Model Comparison

```text
┌──────────────────────────────┬────────────────────────────────────┬────────────────────────────────────┐
│ Relay model                  │ Strengths                          │ Trade-offs                         │
├──────────────────────────────┼────────────────────────────────────┼────────────────────────────────────┤
│ Polling publisher            │ simple, explicit, SQL-driven       │ polling lag, query load            │
├──────────────────────────────┼────────────────────────────────────┼────────────────────────────────────┤
│ CDC / log tailing            │ lower polling overhead, good fit   │ more infrastructure and recovery   │
│                              │ for platforms that already use it  │ complexity                         │
└──────────────────────────────┴────────────────────────────────────┴────────────────────────────────────┘
```

### Choose the Relay to Match Your Operational Envelope

Use a polling relay when:
- the traffic is moderate
- simplicity matters more than shaving some polling overhead
- the team already trusts its database and worker operations

Use CDC-style relay when:
- the platform already operates CDC well
- event volume is high enough that polling becomes awkward
- the team is ready to manage another moving part


# 6. Ordering, Idempotency, and Consumer Design

The Outbox Pattern solves producer-side durability, but it does not remove the need for careful downstream design.

### Ordering Usually Matters Per Aggregate, Not Globally

For many systems, the meaningful ordering scope is one aggregate or one business entity:
- all events for `order-123`
- all balance changes for `account-88`
- all workflow updates for `saga-901`

Trying to guarantee one global order across all entities is usually much harder and often unnecessary.

### Use Stable Event Identity

Each outbox record should usually have:
- a globally unique `event_id`
- an `aggregate_id`
- an event type
- a creation time
- optionally a per-aggregate sequence such as version `7`

That helps with:
- deduplication
- replay
- troubleshooting
- reconstructing per-entity order

### Duplicates Are a Normal Operating Condition

Assume duplicate publication can happen because:
- the relay crashed after publish but before marking success
- the broker or consumer retried delivery
- operators replayed a backlog intentionally

That means consumers should usually be idempotent.

### Inbox Pattern on the Consumer Side

Many systems pair producer outbox with consumer inbox:

```text
Producer DB                  Broker                  Consumer DB
┌─────────────────┐          ┌─────────────┐         ┌─────────────────┐
│ business tables │          │ messages    │         │ business tables │
│ outbox_events   │--------->│ redelivery  │-------> │ inbox_events    │
└─────────────────┘          └─────────────┘         └─────────────────┘
```

The consumer can record `event_id` before or together with its local side effect so retries do not reapply the same effect.

### Ordering and Partition Keys

If the broker supports partition keys or message keys, a common pattern is:
- key by `aggregate_id`
- emit a per-aggregate sequence
- keep consumer logic tolerant of delayed or duplicate delivery

That can preserve ordering for one entity more reliably than using random keys, but only if the rest of the pipeline respects the same scope.

### Conservative Rule

```text
Outbox helps with "do not lose committed publish intent."
Idempotency and inbox help with "do not break when publication repeats."
```


# 7. Storage Schema, Partitioning, and Cleanup

Outbox designs age badly if the table, indexes, and retention plan are vague.

### A Practical Outbox Table

```sql
CREATE TABLE outbox_events (
    event_id UUID PRIMARY KEY,
    aggregate_type TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    aggregate_sequence BIGINT NOT NULL,
    topic TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    headers JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    claimed_at TIMESTAMPTZ,
    claimed_by TEXT,
    relay_attempts INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    last_error TEXT
);

CREATE UNIQUE INDEX idx_outbox_events_aggregate_sequence
    ON outbox_events(aggregate_type, aggregate_id, aggregate_sequence);

CREATE INDEX idx_outbox_events_ready
    ON outbox_events(published_at, available_at, created_at)
    WHERE published_at IS NULL;
```

This schema is only one reasonable shape, but the durable fields are:
- stable event identity
- business routing identity
- ready-to-publish vs published status
- enough metadata for retries and diagnostics

### A Minimal Consumer Inbox Table

```sql
CREATE TABLE inbox_events (
    consumer_name TEXT NOT NULL,
    event_id UUID NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (consumer_name, event_id)
);
```

This lets one consumer record that it already handled `event_id`.

### Partitioning and Claiming

As volume grows, you may need:
- time-based partitioning for old rows
- `FOR UPDATE SKIP LOCKED` or an equivalent claim mechanism for concurrent workers
- separate retention for published and unpublished rows

The exact mechanism depends on the database, but the design goal is stable:
- multiple workers should not keep fighting over the same rows
- old published data should not make ready-row queries slower over time

### Cleanup Is Part of the Pattern

Do not treat cleanup as an afterthought. Decide:
- how long published rows stay available for replay or audit
- whether old rows move to archive storage before deletion
- how to clean rows without blocking active relay work

### Monitor the Table Like a Queue

Useful signals include:
- unpublished backlog count
- oldest unpublished row age
- relay attempts per row
- publish throughput
- cleanup lag

An outbox table is not just storage. Operationally, it behaves like a queue backed by your database.


# 8. Practical TypeScript Patterns

The examples below show a pragmatic producer, relay, and consumer model. They are intentionally conservative:
- the producer writes business state and outbox rows together
- the relay assumes publication may be retried
- the consumer treats duplicate events as normal

### Producer: Write Business State and Outbox Together

```typescript
type OrderStatus = "PENDING" | "CONFIRMED";

type OrderPlacedPayload = {
  orderId: string;
  customerId: string;
  totalCents: number;
  occurredAt: string;
};

type OutboxEvent<TPayload> = {
  eventId: string;
  aggregateType: "order";
  aggregateId: string;
  aggregateSequence: number;
  topic: "orders";
  eventType: "order.placed";
  payload: TPayload;
};

interface TransactionManager {
  runInTransaction<T>(work: () => Promise<T>): Promise<T>;
}

interface OrdersRepository {
  create(input: {
    orderId: string;
    customerId: string;
    totalCents: number;
    status: OrderStatus;
    version: number;
  }): Promise<void>;
}

interface OutboxRepository {
  append<TPayload>(event: OutboxEvent<TPayload>): Promise<void>;
}

class PlaceOrderHandler {
  constructor(
    private readonly tx: TransactionManager,
    private readonly orders: OrdersRepository,
    private readonly outbox: OutboxRepository,
  ) {}

  async execute(input: {
    orderId: string;
    customerId: string;
    totalCents: number;
  }): Promise<void> {
    await this.tx.runInTransaction(async () => {
      await this.orders.create({
        orderId: input.orderId,
        customerId: input.customerId,
        totalCents: input.totalCents,
        status: "PENDING",
        version: 1,
      });

      await this.outbox.append<OrderPlacedPayload>({
        eventId: crypto.randomUUID(),
        aggregateType: "order",
        aggregateId: input.orderId,
        aggregateSequence: 1,
        topic: "orders",
        eventType: "order.placed",
        payload: {
          orderId: input.orderId,
          customerId: input.customerId,
          totalCents: input.totalCents,
          occurredAt: new Date().toISOString(),
        },
      });
    });
  }
}
```

If the transaction commits, both the order row and the outbox row exist. If it rolls back, neither does.

### Relay: Publish and Mark Rows Safely

```typescript
type PendingOutboxEvent = {
  eventId: string;
  aggregateId: string;
  topic: string;
  eventType: string;
  payload: string;
};

interface OutboxRelayStore {
  claimBatch(workerId: string, limit: number, now: Date): Promise<PendingOutboxEvent[]>;
  markPublished(eventId: string, publishedAt: Date): Promise<void>;
  reschedule(eventId: string, reason: string, nextAttemptAt: Date): Promise<void>;
}

interface BrokerPublisher {
  publish(input: {
    topic: string;
    key: string;
    headers: Record<string, string>;
    body: string;
  }): Promise<void>;
}

class OutboxRelay {
  constructor(
    private readonly store: OutboxRelayStore,
    private readonly broker: BrokerPublisher,
  ) {}

  async run(limit = 100): Promise<void> {
    const workerId = crypto.randomUUID();
    const now = new Date();
    const batch = await this.store.claimBatch(workerId, limit, now);

    for (const event of batch) {
      try {
        await this.broker.publish({
          topic: event.topic,
          key: event.aggregateId,
          headers: {
            eventId: event.eventId,
            eventType: event.eventType,
          },
          body: event.payload,
        });

        await this.store.markPublished(event.eventId, new Date());
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown publish failure";
        const nextAttemptAt = new Date(Date.now() + 5_000);
        await this.store.reschedule(event.eventId, reason, nextAttemptAt);
      }
    }
  }
}
```

This relay still allows duplicates. If it crashes after the broker accepts a message but before `markPublished`, the same event may be published again on retry.

### Consumer: Pair Business Effect With Inbox Deduplication

```typescript
type OrderPlacedMessage = {
  eventId: string;
  payload: {
    orderId: string;
    customerId: string;
    totalCents: number;
  };
};

interface ConsumerTransactionManager {
  runInTransaction<T>(work: () => Promise<T>): Promise<T>;
}

interface InboxRepository {
  tryStart(consumerName: string, eventId: string): Promise<"STARTED" | "ALREADY_DONE">;
  markCompleted(consumerName: string, eventId: string): Promise<void>;
}

interface OrderProjectionRepository {
  upsert(input: {
    orderId: string;
    customerId: string;
    totalCents: number;
  }): Promise<void>;
}

class OrdersProjectionConsumer {
  private readonly consumerName = "orders-projection";

  constructor(
    private readonly tx: ConsumerTransactionManager,
    private readonly inbox: InboxRepository,
    private readonly projection: OrderProjectionRepository,
  ) {}

  async handle(message: OrderPlacedMessage): Promise<void> {
    await this.tx.runInTransaction(async () => {
      const result = await this.inbox.tryStart(this.consumerName, message.eventId);

      if (result === "ALREADY_DONE") {
        return;
      }

      await this.projection.upsert({
        orderId: message.payload.orderId,
        customerId: message.payload.customerId,
        totalCents: message.payload.totalCents,
      });

      await this.inbox.markCompleted(this.consumerName, message.eventId);
    });
  }
}
```

The key idea is that the consumer's local side effect and its deduplication record should stay aligned inside one local transaction.


# 9. When to Use It and Common Pitfalls

The Outbox Pattern is powerful, but it is not free. It moves some reliability work from the request path into storage, relay, and operational discipline.

### Good Fit

The Outbox Pattern is usually a reasonable fit when:
- one service owns the local database transaction
- important downstream actions depend on emitted events
- losing the publish intent would create stuck workflows or stale read models
- asynchronous follow-up is acceptable
- you can operate a relay and monitor backlog

Examples:
- e-commerce order creation publishing `order.placed`
- identity service publishing `user.created` for profile, email, or audit systems
- billing service publishing invoice or payment state changes
- saga orchestration steps that need durable asynchronous handoff

### Weak Fit

The pattern is usually a weak fit when:
- one local transaction can already complete all critical work without asynchronous messaging
- the team cannot operate backlog, retries, and cleanup responsibly
- consumers cannot be made idempotent
- the real need is a synchronous request-response workflow rather than reliable async propagation

### Repeating Pitfalls

```text
Bad:
├── inserting outbox rows outside the same transaction as business state
├── assuming the outbox gives exactly-once delivery by itself
├── deleting published rows immediately with no replay or audit plan
├── assuming strict global event ordering
├── letting payloads and indexes grow with no retention strategy
├── ignoring oldest-unpublished age and relay error rates
└── building non-idempotent consumers and hoping duplicates never happen

Good:
├── write business rows and outbox rows in one local transaction
├── use stable event IDs and narrow ordering to the entity that needs it
├── make consumers idempotent, often with an inbox table or equivalent key store
├── monitor backlog, publish latency, retry count, and cleanup lag
├── document replay procedures before the first production incident
└── archive or purge old published rows deliberately
```

### A Conservative Real-World View

Many teams implement outbox with:
- PostgreSQL or MySQL tables plus a polling worker
- a CDC connector that reads committed outbox rows from the database log
- brokers such as Kafka, RabbitMQ, SQS, or similar messaging systems

The exact tools vary. The durable lesson does not:
- keep the atomic boundary local to one database transaction
- relay from durable database state instead of best-effort memory
- expect duplicate publication and design for it


# 10. Summary

**The Outbox Pattern is a producer-side durability pattern for asynchronous messaging.**
- It writes business state and publish intent in one local transaction.
- It avoids the fragile "commit to DB, then best-effort publish" gap.

**Its main strength is reliable handoff from local state to later message publication.**
- If the transaction commits, the event intent is durable in the database.
- A relay can publish later even if the request process crashed.

**Its main limitation is that publication is still usually at-least-once.**
- Relay retries and crash recovery can duplicate messages.
- Consumers still need idempotency, and often an inbox or dedupe key.

**The pattern works best when ordering scope and operational ownership are explicit.**
- Usually order only matters per aggregate, not globally.
- Backlog, retries, and cleanup need first-class monitoring.

**Implementation checklist:**

```text
Producer transaction:
  □ Write business state and outbox rows in the same local transaction
  □ Include stable event IDs, aggregate IDs, event type, and payload versioning
  □ Keep the producer request path independent from broker availability

Relay:
  □ Choose a relay model such as polling or CDC that the team can operate well
  □ Make row claiming safe for concurrent workers
  □ Expect crash-after-publish windows and design for duplicate publication

Ordering and consumers:
  □ Scope ordering expectations per aggregate or business entity
  □ Use message keys and per-aggregate sequence numbers where they matter
  □ Make consumers idempotent, often with inbox records or equivalent dedupe storage

Operations:
  □ Monitor unpublished backlog, oldest pending age, retry counts, and relay failures
  □ Define replay, archive, and cleanup procedures before backlog grows
  □ Review whether outbox is actually needed or whether one local transaction is still enough
```
