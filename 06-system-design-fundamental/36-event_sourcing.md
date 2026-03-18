# Event Sourcing

[← Back to Index](README.md)

Imagine you are building a payments or ordering system where support engineers need to answer uncomfortable questions:
- Why did this balance change?
- Which command caused this order to move to `SHIPPED`?
- What did the system believe before the refund was applied?

Without event sourcing, teams often overwrite the latest row and hope a few audit columns will be enough later:

```typescript
type AccountRow = {
  id: string;
  balanceCents: number;
  status: "OPEN" | "FROZEN" | "CLOSED";
  updatedAt: string;
};

class AccountService {
  async deposit(accountId: string, amountCents: number): Promise<void> {
    const account = await this.loadAccount(accountId);

    if (account.status !== "OPEN") {
      throw new Error("Account is not active");
    }

    await this.saveAccount({
      ...account,
      balanceCents: account.balanceCents + amountCents,
      updatedAt: new Date().toISOString(),
    });
  }

  private async loadAccount(accountId: string): Promise<AccountRow> {
    void accountId;
    return {
      id: "acc_123",
      balanceCents: 10_000,
      status: "OPEN",
      updatedAt: new Date().toISOString(),
    };
  }

  private async saveAccount(account: AccountRow): Promise<void> {
    void account;
  }
}
```

This usually creates predictable gaps:
- the database can tell you the current balance, but not which facts produced it
- forensic debugging becomes slow because old states were overwritten
- rebuilding downstream views or fixing projection bugs becomes harder
- audit trails get bolted on later as a second system with weaker guarantees

This is where **event sourcing** comes in. Instead of storing only the latest state, the system stores the ordered facts that changed that state. Current state becomes something you can rebuild from the event history.

In this chapter, you will learn:
  * [Why event sourcing exists](#1-why-event-sourcing-exists)
  * [What event sourcing is and is not](#2-what-event-sourcing-is)
  * [Which building blocks matter most](#3-core-building-blocks)
  * [How state changes flow through an event-sourced system](#4-how-state-changes-flow-through-an-event-sourced-system)
  * [How streams, aggregates, and concurrency fit together](#5-streams-aggregates-and-concurrency)
  * [How snapshots, projections, and read models work](#6-snapshots-projections-and-read-models)
  * [How schema evolution and operations affect long-lived event streams](#7-schema-evolution-and-operations)
  * [What practical TypeScript implementations look like](#8-practical-typescript-patterns)
  * [When to use event sourcing and which pitfalls matter](#9-when-to-use-it-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why Event Sourcing Exists

Event sourcing exists because some systems care deeply about how state changed, not only what the latest row says now.

### The Core Problem

Many business domains need answers to questions such as:
- which actions led to the current state
- whether an invalid transition happened
- how to rebuild derived views after a bug fix
- what the system believed at a past point in time

State-overwrite models can work well for many CRUD systems, but they make history a secondary concern. When history matters, bolting it on later often produces weak audit trails or duplicated logic.

```text
State-only model:
  latest row stored
  previous states overwritten

Questions become harder:
  -> what happened first
  -> which command caused the change
  -> how do we replay after a projection bug
  -> how do we inspect past business decisions
```

### What Event Sourcing Optimizes For

Event sourcing usually optimizes for:
- an append-only history of business facts
- the ability to reconstruct state from those facts
- stronger auditability and forensic debugging
- replayable input for projections and downstream models

### Why Teams Consider It

Teams often consider event sourcing when:
- the history of changes is part of the business value
- workflows have strict state transitions and domain rules
- projections need rebuild capability
- audit and reconstruction matter more than simple row updates

Examples include:
- ledgers and balance-affecting workflows
- order or ticket lifecycle systems
- inventory reservations and releases
- identity and permission change histories

### What It Does Not Automatically Solve

Event sourcing does not automatically fix:
- weak aggregate boundaries
- bad event names and unstable contracts
- missing idempotency in consumers
- unclear replay procedures
- overcomplicated domains that did not need historical reconstruction in the first place

It is a persistence and modeling choice with real benefits, but it adds operational and mental overhead. Use it when the history is a first-class requirement, not as a default for every table.


# 2. What Event Sourcing Is

Event sourcing is a persistence model in which the source of truth is a sequence of immutable domain events rather than a mutable current-state row.

### A Conservative Definition

The durable idea is:

```text
Event sourcing =
  store domain events as the source of truth
  + rebuild current state by replaying events
  + append new facts instead of mutating past facts
  + derive projections and read models from the same history
```

### What Counts as an Event

In an event-sourced system, an event is usually a domain fact written in past tense, for example:
- `AccountOpened`
- `FundsDeposited`
- `FundsWithdrawn`
- `AccountFrozen`

Good events usually describe something that already happened. They are not vague method names or CRUD-shaped payloads.

### Current State Still Exists

A common misunderstanding is:

```text
event sourcing = no current state
```

That is incorrect.

Most event-sourced systems still materialize current state:
- inside an aggregate rebuilt in memory
- in snapshots
- in read models and projections

The difference is that the authoritative source is the event stream, not the cached or projected current state.

### What It Is Not

Event sourcing is usually not:
- the same thing as event-driven architecture
- the same thing as CQRS
- a requirement to keep a globally ordered log for the whole company
- proof that every consumer gets exactly-once processing
- just an audit table beside an ordinary CRUD model

You can use:
- event sourcing without CQRS
- CQRS without event sourcing
- event-driven messaging without event sourcing

They are related ideas, but they solve different problems.

### State-Based vs Event-Sourced Persistence

```text
State-based storage:
  account_123 -> balance = 12500

Event-sourced storage:
  account_123 stream:
    0 AccountOpened
    1 FundsDeposited 10000
    2 FundsDeposited 5000
    3 FundsWithdrawn 2500

Derived current balance:
  12500
```


# 3. Core Building Blocks

Healthy event-sourced systems rely on a few recurring building blocks.

### 1. Commands

A command expresses intent:
- `OpenAccount`
- `DepositFunds`
- `WithdrawFunds`
- `FreezeAccount`

The command is not stored as the source of truth. The command is evaluated against current state, and if valid, it produces one or more events.

### 2. Aggregates

An aggregate is the consistency boundary that:
- loads its own event stream
- replays prior events to rebuild current state
- decides whether a command is allowed
- emits new events when business rules pass

This is where invariants usually live.

### 3. Event Streams

Each aggregate instance usually has a stream of events ordered for that aggregate key.

Examples:
- one stream per account
- one stream per order
- one stream per shopping cart

The durable question is often not "Do we have global order?" but "What order do we need per business entity?"

### 4. Event Store

The event store is the durable system that appends and retrieves events.

It usually needs to support:
- append-only writes
- ordered reads per stream
- optimistic concurrency checks
- event metadata storage

### 5. Projections and Read Models

Since replaying raw streams for every UI query is usually a poor fit, many systems build projections such as:
- account balance summaries
- order timelines
- search indexes
- dashboard counters

These read models are derived from events and can often be rebuilt.

### 6. Snapshots

Snapshots store a computed state at a known version so replay can resume from there instead of starting from event zero every time.

Snapshots are an optimization, not the primary source of truth.

### 7. Operational Metadata

Most real systems also need metadata such as:
- event ID
- stream ID
- stream version
- occurred-at timestamp
- correlation ID
- causation ID
- schema version

```text
┌──────────────┐     load stream     ┌──────────────┐
│ Command      │ ------------------> │ Aggregate    │
│ intent       │                     │ replay state │
└──────┬───────┘                     └──────┬───────┘
       │                                    │ emits new events
       │                                    v
       │                             ┌──────────────┐
       └──────────────────────────-> │ Event Store  │
                                     └──────┬───────┘
                                            │
                                            ├─────────────> projections
                                            │
                                            └─────────────> snapshots
```


# 4. How State Changes Flow Through an Event-Sourced System

The common flow is command in, events out, state rebuilt by replay.

### Step 1: Load the Stream

When a command arrives, the system loads the relevant stream:
- `order-123`
- `account-456`
- `reservation-789`

It replays the existing events to rebuild the aggregate's current state in memory.

### Step 2: Evaluate the Command Against Current State

The aggregate decides whether the command is valid.

Examples:
- you cannot withdraw more than the available balance
- you cannot ship a cancelled order
- you cannot confirm a reservation that already expired

### Step 3: Produce New Events

If the command is valid, the aggregate emits new events.

Important point:
- the aggregate usually does not directly mutate a database row first
- the new source-of-truth write is the append of new events

### Step 4: Append With Concurrency Control

The event store appends the new events only if the expected stream version still matches.

This protects against lost updates from concurrent writers.

### Step 5: Update Projections

After events are stored, one or more projectors update read models such as:
- balance summary tables
- searchable order documents
- customer timeline views

These updates may be synchronous or asynchronous depending on the architecture and freshness requirements.

### End-to-End Flow

```text
client
  |
  v
command handler
  |
  v
load stream ---------> replay aggregate ---------> decide
  |                                              |
  |                                              v
  |                                       new events produced
  |                                              |
  └----------------------------------------------v
                                         append to event store
                                                  |
                                                  v
                                             projector(s)
                                                  |
                                                  v
                                             read model(s)
```

### Why This Matters

This flow changes two important assumptions:
- current state is derived, not primary
- history is part of normal operation, not an afterthought

That is powerful when the domain needs it. It is extra complexity when the domain does not.


# 5. Streams, Aggregates, and Concurrency

The hardest design questions in event sourcing are often about aggregate boundaries and per-stream correctness.

### Stream Design Usually Follows Aggregate Design

In many systems:
- one aggregate instance maps to one stream
- all events for that aggregate are ordered within that stream
- business invariants that require immediate consistency stay inside that boundary

```text
Order aggregate:
  stream = order-123
  events:
    0 OrderPlaced
    1 PaymentAuthorized
    2 InventoryReserved
    3 OrderShipped

Inventory aggregate:
  stream = sku-42
  events:
    0 StockReceived
    1 StockReserved
    2 StockReleased
```

### Ordering Is Usually Local, Not Universal

Many event-sourced systems can preserve event order within a stream, but global ordering across every stream is usually harder, less scalable, and often unnecessary.

Safer assumption:
- require ordering only where the business actually depends on it

### Optimistic Concurrency Is Common

If two writers load the same aggregate at version `7`, both may try to append event `8`.

The store should accept only one of them.

```text
Writer A loads version 7
Writer B loads version 7

A appends expectedVersion=7 -> success, stream becomes 8
B appends expectedVersion=7 -> conflict, must reload and retry or fail
```

### Why Aggregate Boundaries Matter

If you place too much inside one aggregate:
- streams become hot
- replay cost grows
- concurrency drops

If you split too aggressively:
- invariants leak across streams
- workflows need more coordination
- eventual consistency becomes harder to explain

The durable design question is:
- which rules must be checked atomically together

### Cross-Aggregate Workflows

When one workflow spans multiple aggregates, many systems use:
- events and process managers
- sagas
- compensating actions
- asynchronous coordination

Event sourcing does not remove distributed consistency trade-offs. It makes them more explicit.


# 6. Snapshots, Projections, and Read Models

Event streams are authoritative, but raw replay is not always the best way to answer queries or keep hot aggregates fast.

### Snapshots

A snapshot stores the state of an aggregate at a known stream version.

Example:

```text
snapshot for account-123:
  version = 1200
  state = { balanceCents: 452300, status: OPEN }

replay needed after load:
  events 1201..current
```

Snapshots can reduce load time for long-lived or heavily updated aggregates.

### When Snapshots Help

Snapshots are often useful when:
- streams grow large
- aggregates are loaded frequently
- rebuilding from zero is becoming expensive

Snapshots may be unnecessary when:
- streams are short
- command volume is modest
- replay cost is still trivial

### Projections

A projection consumes events and updates a query-friendly model.

Examples:
- `account_balance_view`
- `order_timeline_view`
- `customer_activity_feed`

Projections are often:
- denormalized
- optimized for specific queries
- safe to rebuild from the event history

### Read Models

A read model is a stored view shaped around retrieval needs rather than write-side correctness.

```text
Event store:
  append-only history

Projection:
  transforms events into query shape

Read model:
  "current balance by account"
  "orders waiting for shipment"
  "user permission history"
```

### Snapshots vs Read Models

These are not the same thing.

```text
Snapshot:
  optimization for aggregate rehydration on the write side

Read model:
  query-facing view for the read side
```

Mixing those concepts can create confusing designs.


# 7. Schema Evolution and Operations

Long-lived event streams force you to treat schema change and replay operations seriously.

### Event Versioning

Events often outlive the code that first wrote them. Over time you may need to:
- add fields
- rename fields
- split one concept into two
- interpret old payloads with new code

That usually means:
- every event type needs explicit versioning discipline
- consumers need a compatibility plan
- replays must still work on older events

### Common Compatibility Strategies

Teams often use one or more of these approaches:
- add new optional fields and keep old meaning stable
- publish a new event version with a new schema
- upcast old payloads into the newer in-memory shape during load

### Upcasting

Upcasting means transforming an older stored event into a newer runtime representation without rewriting the whole historical log every time.

```text
stored event:
  FundsDeposited v1 { amount: 5000 }

runtime shape:
  FundsDeposited v2 { amountCents: 5000, channel: "unknown" }
```

### Replay and Rebuild Operations

If a projector bug corrupts a read model, you should be able to:
- drop or isolate the broken read model
- replay the event stream
- rebuild to a known checkpoint

If you cannot do that safely, one of event sourcing's biggest operational benefits is missing.

### Retention and Privacy

Append-only history raises practical questions:
- how long do you retain events
- which payload fields should never contain secrets or sensitive raw values
- how do you handle legal deletion or redaction requirements

Exact answers depend on the domain and regulatory environment. The conservative rule is:
- store the smallest event payload that still preserves business meaning

### Observability

You usually need:
- stream append latency
- replay duration
- projection lag
- failed projection counts
- concurrency conflict rates

Without those signals, operations can become guesswork.


# 8. Practical TypeScript Patterns

A useful event-sourced implementation can stay conceptually small:
- typed events
- aggregate replay
- optimistic append
- optional snapshots
- rebuildable projections

### Event and Metadata Types

```typescript
type EventMetadata = {
  eventId: string;
  streamId: string;
  streamVersion: number;
  occurredAt: string;
  correlationId?: string;
  causationId?: string;
};

type AccountOpened = {
  type: "AccountOpened";
  data: {
    accountId: string;
    openedBy: string;
  };
  metadata: EventMetadata;
};

type FundsDeposited = {
  type: "FundsDeposited";
  data: {
    accountId: string;
    amountCents: number;
  };
  metadata: EventMetadata;
};

type FundsWithdrawn = {
  type: "FundsWithdrawn";
  data: {
    accountId: string;
    amountCents: number;
  };
  metadata: EventMetadata;
};

type AccountFrozen = {
  type: "AccountFrozen";
  data: {
    accountId: string;
    reason: string;
  };
  metadata: EventMetadata;
};

type AccountEvent =
  | AccountOpened
  | FundsDeposited
  | FundsWithdrawn
  | AccountFrozen;
```

### Aggregate Replay and Decision Logic

```typescript
type AccountState = {
  id: string | null;
  balanceCents: number;
  status: "NOT_OPENED" | "OPEN" | "FROZEN";
  version: number;
};

class AccountAggregate {
  private state: AccountState = {
    id: null,
    balanceCents: 0,
    status: "NOT_OPENED",
    version: -1,
  };

  loadFromHistory(events: AccountEvent[]): void {
    for (const event of events) {
      this.apply(event);
      this.state.version = event.metadata.streamVersion;
    }
  }

  openAccount(accountId: string, openedBy: string): AccountOpened[] {
    if (this.state.status !== "NOT_OPENED") {
      throw new Error("Account already exists");
    }

    return [
      {
        type: "AccountOpened",
        data: { accountId, openedBy },
        metadata: this.nextMetadata(accountId),
      },
    ];
  }

  depositFunds(accountId: string, amountCents: number): FundsDeposited[] {
    if (this.state.status !== "OPEN") {
      throw new Error("Account is not open");
    }

    if (amountCents <= 0) {
      throw new Error("Amount must be positive");
    }

    return [
      {
        type: "FundsDeposited",
        data: { accountId, amountCents },
        metadata: this.nextMetadata(accountId),
      },
    ];
  }

  withdrawFunds(accountId: string, amountCents: number): FundsWithdrawn[] {
    if (this.state.status !== "OPEN") {
      throw new Error("Account is not open");
    }

    if (amountCents <= 0) {
      throw new Error("Amount must be positive");
    }

    if (this.state.balanceCents < amountCents) {
      throw new Error("Insufficient funds");
    }

    return [
      {
        type: "FundsWithdrawn",
        data: { accountId, amountCents },
        metadata: this.nextMetadata(accountId),
      },
    ];
  }

  apply(event: AccountEvent): void {
    switch (event.type) {
      case "AccountOpened":
        this.state.id = event.data.accountId;
        this.state.status = "OPEN";
        return;
      case "FundsDeposited":
        this.state.balanceCents += event.data.amountCents;
        return;
      case "FundsWithdrawn":
        this.state.balanceCents -= event.data.amountCents;
        return;
      case "AccountFrozen":
        this.state.status = "FROZEN";
        return;
    }
  }

  getVersion(): number {
    return this.state.version;
  }

  getState(): Readonly<AccountState> {
    return this.state;
  }

  private nextMetadata(streamId: string): EventMetadata {
    return {
      eventId: crypto.randomUUID(),
      streamId,
      streamVersion: this.state.version + 1,
      occurredAt: new Date().toISOString(),
    };
  }
}
```

### Event Store Interface With Optimistic Concurrency

```typescript
interface EventStore<TEvent> {
  load(streamId: string): Promise<TEvent[]>;
  append(streamId: string, expectedVersion: number, events: TEvent[]): Promise<void>;
}

class InMemoryEventStore<TEvent extends { metadata: EventMetadata }>
  implements EventStore<TEvent>
{
  private readonly streams = new Map<string, TEvent[]>();

  async load(streamId: string): Promise<TEvent[]> {
    return this.streams.get(streamId) ?? [];
  }

  async append(streamId: string, expectedVersion: number, events: TEvent[]): Promise<void> {
    const existing = this.streams.get(streamId) ?? [];
    const currentVersion = existing.at(-1)?.metadata.streamVersion ?? -1;

    if (currentVersion !== expectedVersion) {
      throw new Error(
        `Concurrency conflict on ${streamId}: expected ${expectedVersion}, got ${currentVersion}`,
      );
    }

    const rewritten = events.map((event, index) => ({
      ...event,
      metadata: {
        ...event.metadata,
        streamVersion: expectedVersion + index + 1,
      },
    }));

    this.streams.set(streamId, [...existing, ...rewritten]);
  }
}
```

### Command Handler Example

```typescript
class AccountCommandService {
  constructor(private readonly store: EventStore<AccountEvent>) {}

  async withdraw(accountId: string, amountCents: number): Promise<void> {
    const history = await this.store.load(accountId);

    const aggregate = new AccountAggregate();
    aggregate.loadFromHistory(history);

    const newEvents = aggregate.withdrawFunds(accountId, amountCents);

    await this.store.append(accountId, aggregate.getVersion(), newEvents);
  }
}
```

### Snapshot Pattern

```typescript
type Snapshot<TState> = {
  streamId: string;
  version: number;
  state: TState;
};

interface SnapshotStore<TState> {
  load(streamId: string): Promise<Snapshot<TState> | null>;
  save(snapshot: Snapshot<TState>): Promise<void>;
}
```

### Projection Example

```typescript
type AccountBalanceView = {
  accountId: string;
  balanceCents: number;
  status: "OPEN" | "FROZEN";
  lastEventAt: string;
};

class AccountBalanceProjector {
  project(current: AccountBalanceView | null, event: AccountEvent): AccountBalanceView {
    switch (event.type) {
      case "AccountOpened":
        return {
          accountId: event.data.accountId,
          balanceCents: 0,
          status: "OPEN",
          lastEventAt: event.metadata.occurredAt,
        };
      case "FundsDeposited":
        return {
          ...this.requireCurrent(current),
          balanceCents: this.requireCurrent(current).balanceCents + event.data.amountCents,
          lastEventAt: event.metadata.occurredAt,
        };
      case "FundsWithdrawn":
        return {
          ...this.requireCurrent(current),
          balanceCents: this.requireCurrent(current).balanceCents - event.data.amountCents,
          lastEventAt: event.metadata.occurredAt,
        };
      case "AccountFrozen":
        return {
          ...this.requireCurrent(current),
          status: "FROZEN",
          lastEventAt: event.metadata.occurredAt,
        };
    }
  }

  private requireCurrent(current: AccountBalanceView | null): AccountBalanceView {
    if (!current) {
      throw new Error("Projection state missing");
    }

    return current;
  }
}
```

### Event Store Table Shape

```sql
CREATE TABLE event_store (
    stream_id VARCHAR(255) NOT NULL,
    stream_version BIGINT NOT NULL,
    event_id UUID NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    schema_version INT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    correlation_id UUID NULL,
    causation_id UUID NULL,
    payload JSONB NOT NULL,
    PRIMARY KEY (stream_id, stream_version),
    UNIQUE (event_id)
);

CREATE INDEX idx_event_store_occurred_at ON event_store (occurred_at);
CREATE INDEX idx_event_store_event_type ON event_store (event_type);
```

This table shape is only one option. Real stores vary, but the durable concerns remain:
- ordered retrieval by stream
- safe append semantics
- metadata for debugging and replay


# 9. When to Use It and Common Pitfalls

Event sourcing is powerful when history itself matters. It is usually a poor fit when teams only need straightforward state storage.

### Strong Fit

Event sourcing is often a strong fit when:
- the business needs a reconstructable timeline of facts
- auditing and reasoning about past decisions are important
- projections must be rebuildable from authoritative history
- commands enforce meaningful state transitions inside clear aggregates

Common examples:
- financial or ledger-like workflows
- reservations and inventory holds
- order lifecycle systems with long-running histories
- compliance-sensitive change histories

### Weak Fit

Event sourcing is often a weak fit when:
- the system is mostly simple CRUD
- history has little product or operational value
- the team is not prepared to operate projections, replay, and schema evolution
- the domain boundaries are still highly unstable

### Pitfall 1: Using It for Every Entity

Bad assumption:
- "If event sourcing is good for one workflow, it should back every table."

Better assumption:
- apply it selectively where history and replay justify the complexity

### Pitfall 2: Treating Events as Row Diffs

Weak event:
- `CustomerUpdated`

Stronger events:
- `CustomerEmailChanged`
- `CustomerAddressCorrected`
- `CustomerMarkedAsVip`

Meaningful events preserve business intent better than generic diffs.

### Pitfall 3: Bad Aggregate Boundaries

If unrelated workflows share one hot stream, concurrency and replay costs suffer.

If one invariant is spread across many streams without a coordination plan, correctness becomes harder.

### Pitfall 4: No Replay Plan

If a projection breaks, can you:
- replay safely
- isolate bad code versions
- rebuild from a checkpoint

If not, the design may store events but still fail operationally.

### Pitfall 5: Overstuffed Event Payloads

Events should usually carry durable business meaning, not unstable object graphs or sensitive raw data that will age badly.

### Pitfall 6: Ignoring User-Facing Consistency

If the write succeeds but the read model lags, what does the user see?

You should decide and document:
- whether the command returns the new version
- whether the UI polls or subscribes
- whether some reads must come from the write side temporarily

### Relationship to CQRS and Event-Driven Architecture

```text
Event sourcing:
  source of truth is event history

CQRS:
  separates command and query responsibilities

Event-driven architecture:
  systems communicate through events asynchronously
```

These patterns are often combined, but none of them automatically implies the others.


# 10. Summary

**Why event sourcing exists:**
- it treats business history as a first-class part of the model instead of an afterthought
- it lets you reconstruct current state, inspect past decisions, and rebuild derived views from authoritative facts

**What event sourcing changes:**
- the source of truth becomes the ordered event stream for an aggregate
- current state is rebuilt from events rather than stored as the only authoritative row
- projections, snapshots, and replay operations become part of the design

**What it does well:**
- preserves a durable timeline of meaningful business changes
- supports auditability, debugging, and projection rebuilds
- fits domains with clear invariants and valuable historical reasoning

**What it does not guarantee by itself:**
- it does not remove the need for careful aggregate design
- it does not guarantee global ordering or exactly-once behavior
- it does not justify the overhead for simple CRUD domains

**Practical design advice:**
- model events as clear domain facts in past tense
- keep aggregate boundaries aligned to real consistency rules
- use optimistic concurrency, snapshots only when helpful, and rebuildable projections
- plan schema evolution, replay, and privacy handling from the start

**Implementation checklist:**

```text
Fit and boundaries:
  □ Confirm that historical reconstruction is a real business requirement
  □ Apply event sourcing only to aggregates that benefit from durable history
  □ Define aggregate boundaries around rules that require immediate consistency

Events and streams:
  □ Name events as business facts, not generic CRUD diffs
  □ Include stable metadata such as event ID, stream ID, version, and timestamp
  □ Preserve ordering where the business needs it, usually per stream rather than globally

Correctness and performance:
  □ Use optimistic concurrency checks on append
  □ Add snapshots only when replay cost becomes meaningful
  □ Keep projectors idempotent and safe to rebuild

Operations:
  □ Define event versioning and upcasting rules before streams live for years
  □ Measure replay duration, projection lag, and concurrency conflicts
  □ Document replay, rebuild, privacy, and incident recovery procedures
```
