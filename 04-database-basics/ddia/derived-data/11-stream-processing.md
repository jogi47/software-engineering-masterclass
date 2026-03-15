# Chapter 11: Stream Processing

## Introduction

In Chapter 10, we looked at batch processing - taking a bounded dataset and processing it all at once. But in many applications, data arrives continuously. You don't want to wait until the end of the day to process today's data.

**The spectrum of data processing:**

```
┌───────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│   Request/Response          Stream Processing            Batch Processing │
│   (one at a time)           (continuous)                 (bounded)        │
│                                                                           │
│   ←─────────────────────────────────────────────────────────────────────→ │
│   Low latency               Near real-time               High throughput  │
│   Single event              Unbounded events             All events at once│
│   Online serving            Continuous computation       Offline analysis │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

**Stream processing** sits between these two extremes:
- Processes events shortly after they happen (unlike batch, which waits)
- Handles a continuous flow (unlike request/response, which handles one event at a time)
- Can maintain state across many events (unlike request/response)

---

## Transmitting Event Streams

### What Is a Stream?

A **stream** is data that is incrementally made available over time. Think of it like a river - water (events) flows continuously, you can process it as it arrives, and there's no "end" to it.

**An event** is an immutable record of something that happened at a particular point in time:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Event                                                                     │
├──────────────────────────────────────────────────────────────────────────┤
│ timestamp: 2024-01-15T14:23:45.123Z                                      │
│ type: "user_clicked"                                                     │
│ user_id: 12345                                                           │
│ page: "/products/abc"                                                    │
│ button: "add_to_cart"                                                    │
└──────────────────────────────────────────────────────────────────────────┘
```

**Key characteristics of events:**
- **Immutable**: Once something happened, it happened. You don't modify events.
- **Timestamped**: Events have a time when they occurred.
- **Self-contained**: Contains all information about what happened.

### Messaging Systems

When a producer generates events, how do you deliver them to consumers?

#### Direct Messaging

The simplest approach is direct producer-to-consumer communication:

```
┌──────────────┐          Direct Connection          ┌──────────────┐
│   Producer   │ ──────────────────────────────────→ │   Consumer   │
└──────────────┘                                     └──────────────┘
```

**Options:**
- **UDP multicast**: Fast, but unreliable (packets can be lost)
- **Brokerless messaging (ZeroMQ)**: Direct TCP connections between producers and consumers
- **Webhooks**: HTTP callbacks when events happen

**The problem with direct messaging:**

```
What happens when...

                                ┌──────────────┐
┌──────────────┐                │   Consumer   │
│   Producer   │ ────────────→  │   CRASHED!   │    Events lost!
│   (sending)  │                │      💥      │
└──────────────┘                └──────────────┘

                                ┌──────────────┐
┌──────────────┐                │   Consumer   │
│   Producer   │ ────────────→  │  (can't keep │    Producer must
│   (sending)  │                │     up!)     │    slow down or
└──────────────┘                └──────────────┘    drop messages
```

If the consumer crashes, goes offline, or can't keep up, what happens to messages?

#### Message Brokers (Message Queues)

A **message broker** is an intermediary that stores messages temporarily:

```
┌──────────────┐       ┌───────────────────┐       ┌──────────────┐
│   Producer   │ ────→ │   Message Broker  │ ────→ │   Consumer   │
└──────────────┘       │                   │       └──────────────┘
                       │  ┌─────────────┐  │
┌──────────────┐       │  │   Queue     │  │       ┌──────────────┐
│   Producer   │ ────→ │  │ [msg][msg]  │  │ ────→ │   Consumer   │
└──────────────┘       │  │ [msg][msg]  │  │       └──────────────┘
                       │  └─────────────┘  │
                       └───────────────────┘
```

**Advantages of message brokers:**
- **Durability**: Messages are stored until consumers process them
- **Buffering**: If consumer is slow, messages wait in the queue
- **Fan-out**: Multiple consumers can receive the same message
- **Load balancing**: Multiple consumers can process different messages

### Traditional Message Brokers vs Log-Based Message Brokers

There are two fundamentally different approaches:

#### Traditional Message Brokers (RabbitMQ, ActiveMQ, Amazon SQS)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Traditional Message Broker                                               │
│                                                                          │
│   1. Producer sends message:                                             │
│      [A] [B] [C] [D]  →  Queue: [A] [B] [C] [D]                          │
│                                                                          │
│   2. Consumer receives message [A]:                                      │
│      Queue: [B] [C] [D]  (A is marked "in flight")                       │
│                                                                          │
│   3. Consumer acknowledges [A]:                                          │
│      Queue: [B] [C] [D]  (A is deleted permanently!)                     │
│                                                                          │
│   4. If consumer crashes without ack:                                    │
│      Queue: [A] [B] [C] [D]  (A is redelivered)                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Characteristics:**
- Messages are **deleted** after acknowledgment
- **No replay**: Once consumed, message is gone
- Good for **task queues** (each task processed once)
- Individual message acknowledgment

**Use case: Task distribution**
```
Job Queue: [resize_image_1] [resize_image_2] [send_email_3]
                ↓                  ↓                ↓
           Worker 1            Worker 2         Worker 3
```

#### Log-Based Message Brokers (Apache Kafka, Amazon Kinesis, Apache Pulsar)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Log-Based Message Broker                                                 │
│                                                                          │
│   Messages are appended to a persistent, ordered log:                    │
│                                                                          │
│   Log: ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐                │
│        │  0  │  1  │  2  │  3  │  4  │  5  │  6  │ ... │                │
│        │ [A] │ [B] │ [C] │ [D] │ [E] │ [F] │ [G] │     │                │
│        └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘                │
│              ↑                       ↑                                   │
│              │                       │                                   │
│         Consumer 1              Consumer 2                               │
│         (offset 1)              (offset 5)                               │
│                                                                          │
│   - Messages are NEVER deleted (until retention period expires)          │
│   - Each consumer tracks their own position (offset)                     │
│   - Can replay from any past position                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Characteristics:**
- Messages are **retained** (for days, weeks, or forever)
- **Replayable**: Can re-read old messages
- Each consumer has an **offset** (position in the log)
- High throughput (sequential disk I/O)

### Kafka Architecture in Detail

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Kafka Cluster                                                            │
│                                                                          │
│  Topic: "user-clicks"                                                    │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Partition 0:  [0][1][2][3][4][5][6][7][8]                        │   │
│  │               ───────────────────────────→ (append only)         │   │
│  │                                                                   │   │
│  │ Partition 1:  [0][1][2][3][4][5]                                 │   │
│  │               ─────────────────→                                 │   │
│  │                                                                   │   │
│  │ Partition 2:  [0][1][2][3][4][5][6][7][8][9][10]                 │   │
│  │               ─────────────────────────────────→                 │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Producer assigns partition by:                                          │
│  - Key hash: hash(user_id) % num_partitions  (same user → same partition)│
│  - Round-robin: If no key specified                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Why partitions?**
- **Scalability**: Each partition can live on a different broker
- **Parallelism**: Multiple consumers can read different partitions in parallel
- **Ordering**: Messages within a partition are strictly ordered

**Consumer Groups:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Consumer Group "analytics-team"                                          │
│                                                                          │
│   Partition 0 ───────→ Consumer A                                        │
│   Partition 1 ───────→ Consumer B                                        │
│   Partition 2 ───────→ Consumer C                                        │
│                                                                          │
│   Each partition is assigned to exactly one consumer in the group.       │
│   (Can't have more consumers than partitions!)                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Consumer Group "search-indexer"                                          │
│                                                                          │
│   Partition 0 ───────→ Consumer X                                        │
│   Partition 1 ───────→ Consumer X   (X handles multiple partitions)      │
│   Partition 2 ───────→ Consumer Y                                        │
│                                                                          │
│   Different consumer groups read independently, each maintaining         │
│   their own offsets.                                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Consumer Offset Management:**

```
Consumer processes messages:

Log:    [0][1][2][3][4][5][6][7][8][9]
                         ↑
                    Current offset

1. Read message at offset 5
2. Process it
3. Commit offset 6 to broker
4. If crash, restart from committed offset 6

                         ↓ What if crash here?
Read [5] → Process → [CRASH!] → (never committed)

On restart: Read [5] again (at-least-once delivery)
```

**At-least-once vs exactly-once:**
- By default, Kafka provides **at-least-once** delivery
- Messages might be processed more than once (if crash after processing but before commit)
- For **exactly-once**, need additional mechanisms (idempotency or transactions)

### Log vs Traditional: When to Use What?

| Aspect | Traditional Broker | Log-Based Broker |
|--------|-------------------|------------------|
| Message retention | Deleted after ack | Retained with TTL |
| Replay capability | No | Yes |
| Ordering | Limited | Within partition |
| Consumer model | Push (broker decides when) | Pull (consumer decides) |
| Throughput | Lower | Higher |
| Use cases | Task queues, RPC | Event streaming, CDC |

---

## Databases and Streams

Here's a key insight: **databases are not so different from streams**.

### Change Data Capture (CDC)

Every write to a database is essentially an event: "At time T, row X was inserted/updated/deleted."

**Change Data Capture (CDC)** extracts these changes as a stream of events:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Change Data Capture                                                      │
│                                                                          │
│   Application writes to database:                                        │
│                                                                          │
│   INSERT INTO users (id, name) VALUES (1, 'Alice')                       │
│   UPDATE users SET name = 'Alicia' WHERE id = 1                          │
│   DELETE FROM users WHERE id = 1                                         │
│                                                                          │
│           ↓                                                              │
│   ┌───────────────────┐                                                  │
│   │     Database      │                                                  │
│   │   (primary)       │                                                  │
│   │                   │                                                  │
│   │   Replication     │                                                  │
│   │      Log          │ ─────→ CDC extracts changes                      │
│   │   [changes...]    │                                                  │
│   └───────────────────┘                                                  │
│                                  ↓                                       │
│                         ┌─────────────────┐                              │
│                         │  Change Stream  │                              │
│                         │                 │                              │
│                         │ {op: INSERT,    │                              │
│                         │  table: users,  │                              │
│                         │  after: {...}}  │                              │
│                         │                 │                              │
│                         │ {op: UPDATE,    │                              │
│                         │  table: users,  │                              │
│                         │  before: {...}, │                              │
│                         │  after: {...}}  │                              │
│                         │                 │                              │
│                         └─────────────────┘                              │
│                                  ↓                                       │
│               ┌──────────────────┼──────────────────┐                    │
│               ↓                  ↓                  ↓                    │
│        ┌─────────────┐   ┌─────────────┐   ┌─────────────┐              │
│        │   Search    │   │    Data     │   │   Another   │              │
│        │   Index     │   │  Warehouse  │   │   Service   │              │
│        └─────────────┘   └─────────────┘   └─────────────┘              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Why CDC is powerful:**

1. **Keep derived data in sync**: Search index, caches, analytics
2. **Decouple systems**: Each consumer processes changes independently
3. **Reliable**: Based on the database's own replication mechanism
4. **Full history**: Can rebuild derived data from the beginning

**CDC Tools:**
- **Debezium**: Open-source CDC for MySQL, PostgreSQL, MongoDB, etc.
- **Maxwell**: CDC for MySQL
- **AWS DMS**: Database Migration Service with CDC
- Native support in many databases (PostgreSQL logical replication, MongoDB change streams)

### Event Sourcing

CDC captures changes from a database. But what if we flip this around?

**Event sourcing**: Instead of storing current state, store the sequence of events that led to that state.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Traditional Database (state-based)                                       │
│                                                                          │
│   Shopping Cart for User 123:                                            │
│   ┌────────────────────────────────────────────┐                        │
│   │ cart_id: 456                               │                        │
│   │ items: [{sku: "XYZ", qty: 2, price: 10}]   │ ← Current state only!  │
│   │ total: 20                                  │                        │
│   └────────────────────────────────────────────┘                        │
│                                                                          │
│   We don't know HOW we got here. Did user:                               │
│   - Add 2 XYZ at once?                                                   │
│   - Add 1 XYZ, then another?                                             │
│   - Add 3 XYZ, remove 1?                                                 │
│   - Add ABC, remove ABC, add XYZ, add XYZ?                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Event Sourcing (event-based)                                             │
│                                                                          │
│   Event Log for User 123's Cart:                                         │
│   ┌────────────────────────────────────────────────────────────────────┐│
│   │ 1. CartCreated { user: 123, timestamp: "2024-01-15T10:00:00" }     ││
│   │ 2. ItemAdded   { sku: "ABC", qty: 1, timestamp: "2024-01-15T10:01" }││
│   │ 3. ItemAdded   { sku: "XYZ", qty: 1, timestamp: "2024-01-15T10:02" }││
│   │ 4. ItemRemoved { sku: "ABC", timestamp: "2024-01-15T10:05" }        ││
│   │ 5. ItemAdded   { sku: "XYZ", qty: 1, timestamp: "2024-01-15T10:10" }││
│   └────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│   Current state is DERIVED by replaying events:                          │
│   - Start with empty cart                                                │
│   - Apply event 1: cart exists                                           │
│   - Apply event 2: cart has 1 ABC                                        │
│   - Apply event 3: cart has 1 ABC, 1 XYZ                                 │
│   - Apply event 4: cart has 1 XYZ                                        │
│   - Apply event 5: cart has 2 XYZ                                        │
│                                                                          │
│   Result: {items: [{sku: "XYZ", qty: 2}], total: 20}                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Benefits of Event Sourcing:**

1. **Complete audit trail**: Know exactly what happened and when
2. **Time travel**: Reconstruct state at any point in history
3. **Multiple views**: Derive different representations from the same events
4. **Debugging**: Understand why system is in current state
5. **Business analysis**: "What did users do before abandoning carts?"

**Challenges:**

1. **Event schema evolution**: What if event structure changes?
2. **Replay performance**: Reading current state requires replaying all events
   - Solution: **Snapshots** - periodically save derived state
3. **Compaction**: Can events be deleted? Generally no, but some systems support it
4. **Deleting data**: Hard when events are immutable (GDPR compliance!)

### Commands vs Events

An important distinction:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   COMMAND                                EVENT                           │
│   (request to do something)              (fact that something happened)  │
│                                                                          │
│   "AddItemToCart"                        "ItemAddedToCart"               │
│   - May succeed or fail                  - Already happened              │
│   - Imperative mood                      - Past tense                    │
│   - Before validation                    - After validation              │
│                                                                          │
│   ┌──────────────┐    validate    ┌──────────────┐                      │
│   │   Command    │ ─────────────→ │    Event     │                      │
│   │ AddItemToCart│   (may fail)   │ItemWasAdded  │                      │
│   └──────────────┘                └──────────────┘                      │
│                                                                          │
│   Example failure:                                                       │
│   Command: AddItemToCart(sku: "ABC")                                     │
│   Validation: "ABC" is out of stock                                      │
│   Result: Command rejected, no event generated                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### CQRS: Command Query Responsibility Segregation

CQRS separates the write model (handling commands) from the read model (answering queries):

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CQRS Architecture                                                        │
│                                                                          │
│                        ┌─────────────────────────────────────────────┐  │
│   Commands            │            Write Model                       │  │
│   (AddItem,           │  ┌─────────────┐     ┌─────────────────────┐ │  │
│    RemoveItem,   ────→│  │  Command    │────→│     Event Store     │ │  │
│    Checkout)          │  │  Handler    │     │   (source of truth) │ │  │
│                       │  └─────────────┘     └─────────────────────┘ │  │
│                       └─────────────────────────────────────────────┘│  │
│                                                      │                │  │
│                                                      │ Events         │  │
│                                                      ↓                │  │
│                       ┌─────────────────────────────────────────────┐│  │
│                       │            Read Model(s)                     │  │
│   Queries            │  ┌─────────────┐     ┌─────────────────────┐ │  │
│   (GetCart,          │  │   Event     │     │    Materialized     │ │  │
│    ListOrders,  ←────│  │  Projector  │←────│       Views         │ │  │
│    GetAnalytics)     │  └─────────────┘     │ (optimized for      │ │  │
│                       │                      │  specific queries)  │ │  │
│                       └─────────────────────────────────────────────┘│  │
│                                                                          │
│   You can have multiple read models:                                     │
│   - Elasticsearch for full-text search                                   │
│   - Redis for fast key-value lookups                                     │
│   - PostgreSQL for relational queries                                    │
│   - Analytics database for aggregations                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Why CQRS?**
- Write and read have different requirements
- Writes need validation, consistency
- Reads need speed, different query patterns
- Can scale reads and writes independently

---

## Processing Streams

Now that we have streams of events, what can we do with them?

### Uses of Stream Processing

**1. Complex Event Processing (CEP)**

Pattern matching across events:

```
Rule: "Detect potential fraud"
- Same credit card
- More than 3 transactions
- In different countries
- Within 1 hour

Events:     ┌────────────────────────────────────┐
            │ card: 1234, country: US, t: 10:00  │
            │ card: 1234, country: UK, t: 10:15  │
            │ card: 1234, country: JP, t: 10:30  │
            │ card: 1234, country: BR, t: 10:45  │ ← ALERT!
            └────────────────────────────────────┘
```

**2. Stream Analytics**

Real-time aggregations and metrics:

```
Input: Page view events

Output (updated continuously):
┌────────────────────────────────────────────────┐
│ Last 5 minutes:                                │
│   Total views: 45,231                          │
│   Unique users: 12,456                         │
│   Top pages: /home (5,234), /products (3,421)  │
│   Avg response time: 142ms                     │
└────────────────────────────────────────────────┘
```

**3. Maintaining Materialized Views**

Keeping derived data up-to-date:

```
Orders Stream                      Materialized View: Revenue by Region
┌──────────────────────┐           ┌─────────────────────────────────┐
│ {region: US,         │           │ US:    $1,234,567               │
│  amount: $100}       │ ────────→ │ EU:    $987,654                 │
│ {region: EU,         │           │ APAC:  $567,890                 │
│  amount: $150}       │           │ (updated after each event)      │
└──────────────────────┘           └─────────────────────────────────┘
```

**4. Search on Streams**

"Notify me when a tweet mentions my company":

```
Traditional: Document → Index → Query matches
Stream:      Query → Index → Document matches

Store query: "company:acme OR company:ACME"
               ↓
Stream:    [tweet1] [tweet2] [tweet3] [tweet4]
              ↓        ↓                 ↓
           match!   no match          match!
```

### Time: The Hardest Problem

When processing streams, time is surprisingly tricky.

**Event Time vs Processing Time:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   Event Time: When the event actually occurred                           │
│   - Timestamp embedded in the event                                      │
│   - What you usually care about for business logic                       │
│                                                                          │
│   Processing Time: When the event is processed                           │
│   - Wall-clock time at the processor                                     │
│   - Affected by delays, backlogs, retries                                │
│                                                                          │
│   Example:                                                               │
│                                                                          │
│   Event: {                                                               │
│     event_time: "2024-01-15T10:00:00",  ← User clicked at 10:00:00      │
│     user: "alice",                                                       │
│     action: "click"                                                      │
│   }                                                                      │
│                                                                          │
│   But due to network delay, mobile device being offline, or backlog:     │
│   - Arrives at stream processor at 10:00:05 (5 sec delay)                │
│   - Or even 10:15:00 (15 min delay if device was offline!)               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Why does this matter?**

If you're counting events per minute:

```
Event Time:      10:00:00  10:00:30  10:01:15  10:01:45
Processing Time: 10:00:05  10:01:30  10:01:20  10:02:00

By event time:   minute 10:00 = 2 events, minute 10:01 = 2 events
By proc time:    minute 10:00 = 1 event,  minute 10:01 = 2 events, 10:02 = 1 event
```

Processing time gives wrong results!

### Windows

To do aggregations on streams, you need to define **windows** - time ranges to group events:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Window Types                                                             │
│                                                                          │
│ TUMBLING WINDOWS: Fixed size, non-overlapping                            │
│                                                                          │
│   Events: ─[A]──[B]─[C]──[D]────[E]─[F]─[G]──[H]───[I]→                 │
│            │        │        │        │        │                         │
│   Windows: ├────────┼────────┼────────┼────────┼────────                │
│            │ Win 1  │ Win 2  │ Win 3  │ Win 4  │                        │
│            │ A,B,C  │   D    │ E,F,G  │  H,I   │                        │
│            └────────┴────────┴────────┴────────┴────────                │
│                                                                          │
│ HOPPING WINDOWS: Fixed size, overlapping                                 │
│                                                                          │
│   Events: ─[A]──[B]─[C]──[D]────[E]─[F]─[G]──[H]───[I]→                 │
│            │           │                                                 │
│   Windows: ├───────────┤ Win 1: A,B,C,D                                  │
│                ├───────────┤ Win 2: C,D,E,F                              │
│                    ├───────────┤ Win 3: E,F,G,H                          │
│            (windows overlap)                                             │
│                                                                          │
│ SLIDING WINDOWS: All events within duration of each other                │
│                                                                          │
│   "Events within 5 minutes of each other"                                │
│   - New window for each event                                            │
│   - Looks back 5 minutes from that event                                 │
│                                                                          │
│ SESSION WINDOWS: Group by activity, separated by gaps                    │
│                                                                          │
│   Events: ─[A][B][C]────────────────[D][E]───────────[F]───→             │
│            │       │                │    │           │   │               │
│            └───────┘  (30 min gap)  └────┘ (gap)     └───┘               │
│            Session 1                Session 2        Session 3           │
│            (user activity)          (new session)    (new session)       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### The Late Event Problem

When do you emit results for a window? Events might arrive late!

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Window 10:00-10:01 (counting events by event time)                       │
│                                                                          │
│ Processing timeline:                                                     │
│                                                                          │
│ Wall clock  Arrives    Event time                                        │
│ 10:00:05    event A    10:00:15    ← in window                          │
│ 10:00:10    event B    10:00:30    ← in window                          │
│ 10:00:15    event C    10:00:45    ← in window                          │
│ 10:01:00    (window should close?)                                       │
│ 10:01:30    event D    10:00:55    ← LATE! (event time is in window)    │
│                                                                          │
│ Options for late events:                                                 │
│ 1. Drop them (simplest, but loses data)                                  │
│ 2. Update the result (need to handle corrections)                        │
│ 3. Wait longer before emitting (increases latency)                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Watermarks:**

A **watermark** is a declaration: "We believe no more events with timestamp < T will arrive."

```
Events:     [e1:9:55] [e2:9:58] [e3:10:02] [watermark:10:00] [e4:10:05]
                                                  ↓
                                    "No more events before 10:00"
                                    → Close window 9:59-10:00
                                    → Emit result

If event arrives after watermark with timestamp before it:
   [e5:9:59] ← Late event! Handle based on policy.
```

Watermarks are a tradeoff:
- **Aggressive** (close windows quickly): Lower latency, but more late events dropped
- **Conservative** (wait longer): Fewer late events dropped, but higher latency

### Stream Joins

Joining streams is more complex than joining database tables because data arrives over time.

**Stream-Stream Join:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Stream-Stream Join: Clicks joined with Impressions                       │
│                                                                          │
│ Use case: Calculate click-through rate                                   │
│ - Ad was shown (impression)                                              │
│ - User clicked (click)                                                   │
│ - Match them by ad_id within time window                                 │
│                                                                          │
│   Impressions:  [imp:ad1,t=0] ─────[imp:ad2,t=5]──[imp:ad3,t=8]────→    │
│                      │                  │                                │
│   Clicks:       ─────[clk:ad1,t=2]─────────────[clk:ad3,t=9]─────→      │
│                      │                              │                    │
│   Join (5 sec):   (ad1,t=0-2) ✓                (ad3,t=8-9) ✓             │
│                                 (ad2 not clicked)                        │
│                                                                          │
│   Both streams need state:                                               │
│   - Buffer impressions for 5 seconds                                     │
│   - When click arrives, look for matching impression                     │
│   - When impression times out, emit "not clicked"                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Stream-Table Join (Enrichment):**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Stream-Table Join: Enrich events with reference data                     │
│                                                                          │
│   User activity stream:                                                  │
│   ┌──────────────────────────────────────────┐                          │
│   │ {user_id: 123, action: "purchase", ...}  │                          │
│   │ {user_id: 456, action: "view", ...}      │                          │
│   └──────────────────────────────────────────┘                          │
│                            │                                             │
│                            │ lookup                                      │
│                            ↓                                             │
│   User table (in memory):                                                │
│   ┌──────────────────────────────────────────┐                          │
│   │ 123 → {name: "Alice", tier: "gold"}      │                          │
│   │ 456 → {name: "Bob", tier: "silver"}      │                          │
│   └──────────────────────────────────────────┘                          │
│                            │                                             │
│                            ↓                                             │
│   Enriched output:                                                       │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ {user_id: 123, name: "Alice", tier: "gold", action: "purchase"} │   │
│   │ {user_id: 456, name: "Bob", tier: "silver", action: "view"}     │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   Options for the table:                                                 │
│   1. Query database per event (slow!)                                    │
│   2. Load table into memory, refresh periodically                        │
│   3. Subscribe to table's CDC stream → table is always current           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Table-Table Join (Materialized View Maintenance):**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Table-Table Join: Both sides are CDC streams                             │
│                                                                          │
│   Use case: Maintain a join result that updates as either table changes  │
│                                                                          │
│   Orders CDC stream:        Customers CDC stream:                        │
│   [INSERT order 1]          [INSERT customer A]                          │
│   [INSERT order 2]          [UPDATE customer A]                          │
│   [UPDATE order 1]          [INSERT customer B]                          │
│                                                                          │
│   Processor maintains state for both:                                    │
│   - Orders by customer_id                                                │
│   - Customers by customer_id                                             │
│                                                                          │
│   When order arrives:                                                    │
│   - Look up customer                                                     │
│   - Emit joined result                                                   │
│                                                                          │
│   When customer updates:                                                 │
│   - Find all orders for that customer                                    │
│   - Re-emit joined results with updated customer info                    │
│                                                                          │
│   Output: Changelog of the joined table                                  │
│   [INSERT (order1, customerA)]                                           │
│   [INSERT (order2, customerB)]                                           │
│   [UPDATE (order1, customerA)]  ← customer A was updated                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Fault Tolerance

Stream processors run continuously for months or years. They will encounter failures. How do we handle them?

### The Challenge

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Stream processor crashes mid-computation                                 │
│                                                                          │
│   Input: [1] [2] [3] [4] [5] [6] [7] [8]                                 │
│                         ↑                                                │
│                    Processing                                            │
│                         │                                                │
│   State: count = 4      │                                                │
│                         │                                                │
│   Output so far:      💥 CRASH!                                          │
│                                                                          │
│   Questions:                                                             │
│   - Did we output a result before crash?                                 │
│   - What was our state?                                                  │
│   - Where do we restart from?                                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Approach 1: Microbatching (Spark Streaming)

Break the stream into small batches and process each atomically:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Microbatching                                                            │
│                                                                          │
│   Stream: ─[1][2][3][4][5][6][7][8][9][10][11][12]─→                    │
│                                                                          │
│   Split into batches (e.g., 1 second each):                              │
│                                                                          │
│   Batch 1: [1,2,3]  →  Process  →  Commit  →  Output                    │
│   Batch 2: [4,5,6]  →  Process  →  Commit  →  Output                    │
│   Batch 3: [7,8,9]  →  Process  →  💥 CRASH                              │
│                                                                          │
│   On restart:                                                            │
│   - Batch 3 never committed                                              │
│   - Reprocess [7,8,9] from beginning                                     │
│   - Continue with Batch 4                                                │
│                                                                          │
│   Pros:                                                                  │
│   - Reuses batch processing semantics                                    │
│   - Simple to reason about                                               │
│                                                                          │
│   Cons:                                                                  │
│   - Minimum latency = batch interval                                     │
│   - Can't process one event at a time                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Approach 2: Checkpointing (Apache Flink)

Periodically save state snapshots without stopping processing:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Checkpointing                                                            │
│                                                                          │
│   Processor State: count = 0                                             │
│                                                                          │
│   Events: [1] [2] [3] │checkpoint│ [4] [5] [6] │checkpoint│ [7] [8]     │
│                       │          │             │          │              │
│           count=1,2,3 │  save    │  count=4,5,6│  save    │ count=7     │
│                       │ count=3  │             │ count=6  │              │
│                       │ offset=3 │             │ offset=6 │              │
│                                                            │             │
│                                                         💥 CRASH         │
│                                                                          │
│   Recovery:                                                              │
│   - Load checkpoint: count=6, offset=6                                   │
│   - Resume reading from offset 6                                         │
│   - Continue: [7] [8] ...                                                │
│                                                                          │
│   Key insight: Checkpoint includes BOTH state AND input offset           │
│   They're consistent with each other                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Flink's Barrier Mechanism:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Checkpoint Barriers                                                      │
│                                                                          │
│   Source 1: [a] [b] |barrier| [c] [d]                                    │
│   Source 2: [x] [y] |barrier| [z]                                        │
│                                                                          │
│   Operator receives barriers from all inputs:                            │
│   - Wait for barrier from Source 1                                       │
│   - Wait for barrier from Source 2                                       │
│   - When all barriers received: snapshot state                           │
│   - Forward barrier downstream                                           │
│                                                                          │
│   Result: Consistent snapshot across all operators                       │
│   without stopping processing!                                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Approach 3: Idempotency

Design operations so that processing the same event twice produces the same result:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Idempotent Operations                                                    │
│                                                                          │
│   NOT idempotent:                                                        │
│   - count = count + 1    (if run twice: count goes up by 2!)            │
│   - INSERT INTO table    (creates duplicate rows)                        │
│                                                                          │
│   Idempotent:                                                            │
│   - count = 5            (same result no matter how many times)          │
│   - UPSERT/SET           (overwrites, doesn't duplicate)                 │
│                                                                          │
│   Strategy: Include event ID in output                                   │
│                                                                          │
│   Event: {id: "evt-123", user: "alice", action: "click"}                 │
│                                                                          │
│   Output: INSERT INTO clicks (event_id, user, action)                    │
│           VALUES ("evt-123", "alice", "click")                           │
│           ON CONFLICT (event_id) DO NOTHING                              │
│                                                                          │
│   If processed twice: Second insert is ignored (idempotent!)             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Exactly-Once Semantics

**Three delivery guarantees:**

| Guarantee | Meaning | Mechanism |
|-----------|---------|-----------|
| At-most-once | Events might be lost | No retries |
| At-least-once | Events might be duplicated | Retries without dedup |
| Exactly-once | Events processed once | At-least-once + deduplication |

**Exactly-once is about the EFFECT, not the processing:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ "Effectively Exactly-Once"                                               │
│                                                                          │
│   The processor might actually process an event twice:                   │
│                                                                          │
│   Event A → Process → 💥 Crash → Restart → Process A again              │
│                                                                          │
│   But the OUTPUT looks like it was processed once:                       │
│                                                                          │
│   Method 1: Idempotent output                                            │
│   - First process: Write {id: A, value: 100}                            │
│   - Second process: Write {id: A, value: 100} (same, no effect)         │
│                                                                          │
│   Method 2: Transactional output                                         │
│   - First process: Begin txn → Write → Commit (succeeds)                │
│   - Second process: Begin txn → Write → Commit                          │
│                     (transaction detects duplicate, rolls back)          │
│                                                                          │
│   End-to-end exactly-once requires:                                      │
│   1. Replayable input (Kafka)                                            │
│   2. Deterministic processing                                            │
│   3. Idempotent or transactional output                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Stream Processing Frameworks

### Apache Kafka Streams

**Unique property:** It's a library, not a separate cluster.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Kafka Streams Architecture                                               │
│                                                                          │
│   Your Application                                                       │
│   ┌───────────────────────────────────────────────────────────────────┐ │
│   │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐        │ │
│   │  │  Kafka       │    │   Stream     │    │   Output     │        │ │
│   │  │  Consumer    │───→│   Processor  │───→│   to Kafka   │        │ │
│   │  └──────────────┘    └──────────────┘    └──────────────┘        │ │
│   │                             │                                     │ │
│   │                      ┌──────┴──────┐                              │ │
│   │                      │ Local State │ (RocksDB)                    │ │
│   │                      │ Stores      │                              │ │
│   │                      └─────────────┘                              │ │
│   └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│   Deploy as a regular application (JAR, Docker, K8s)                    │
│   Scale by running more instances                                        │
│   State is backed up to Kafka for recovery                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Apache Flink

**Full-featured streaming engine with event-time processing:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Apache Flink                                                             │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    Flink Cluster                                 │   │
│   │                                                                  │   │
│   │   JobManager                                                     │   │
│   │   ┌────────────────────────────────────────────────────────┐    │   │
│   │   │ - Coordinates checkpoints                               │    │   │
│   │   │ - Manages job lifecycle                                 │    │   │
│   │   │ - Reschedules on failure                                │    │   │
│   │   └────────────────────────────────────────────────────────┘    │   │
│   │                                                                  │   │
│   │   TaskManagers (workers)                                         │   │
│   │   ┌──────────┐  ┌──────────┐  ┌──────────┐                      │   │
│   │   │ Source   │  │ Process  │  │  Sink    │                      │   │
│   │   │ Operator │→ │ Operator │→ │ Operator │                      │   │
│   │   │ [state]  │  │ [state]  │  │ [state]  │                      │   │
│   │   └──────────┘  └──────────┘  └──────────┘                      │   │
│   │                                                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   Features:                                                              │
│   - True event-time processing                                           │
│   - Watermarks for handling late data                                    │
│   - Savepoints (manual checkpoints for upgrades)                         │
│   - SQL/Table API                                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Apache Spark Structured Streaming

**Unified batch and streaming API:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Spark Structured Streaming                                               │
│                                                                          │
│   Same DataFrame/SQL API for batch and streaming:                        │
│                                                                          │
│   // Batch                                                               │
│   val df = spark.read.parquet("data/")                                   │
│   df.groupBy("user").count()                                             │
│                                                                          │
│   // Streaming (nearly identical!)                                       │
│   val stream = spark.readStream.format("kafka").load()                   │
│   stream.groupBy("user").count()                                         │
│   stream.writeStream.format("console").start()                           │
│                                                                          │
│   Processing modes:                                                      │
│   - Microbatch (default): Every few seconds                              │
│   - Continuous (experimental): Millisecond latency                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Comparison

| Feature | Kafka Streams | Flink | Spark Streaming |
|---------|--------------|-------|-----------------|
| Deployment | Library | Cluster | Cluster |
| Latency | Low | Very low | Microbatch (higher) |
| Event time | Yes | Yes (best) | Yes |
| State backend | RocksDB | RocksDB, heap | Heap |
| Exactly-once | Yes | Yes | Yes |
| SQL support | KSQL | Yes | Yes |
| Best for | Kafka-centric | Complex streaming | Unified batch/stream |

---

## Key Takeaways

1. **Streams are unbounded datasets** processed incrementally as data arrives. They fill the gap between batch processing (high throughput, high latency) and request/response (one at a time).

2. **Two types of message brokers:**
   - **Traditional** (RabbitMQ): Messages deleted after processing, good for task queues
   - **Log-based** (Kafka): Messages retained, replayable, good for event streaming

3. **Log-based brokers** enable powerful patterns:
   - High throughput via sequential I/O
   - Replay capability for recovery and reprocessing
   - Multiple independent consumer groups

4. **Databases and streams are related:**
   - **CDC** extracts database changes as a stream
   - **Event sourcing** stores events as the source of truth
   - **CQRS** separates write (commands) and read (queries) models

5. **Time is hard:**
   - **Event time** (when it happened) vs **processing time** (when processed)
   - **Windows** group events for aggregation
   - **Watermarks** declare when no more late events expected
   - Late events require careful handling

6. **Stream joins** are complex:
   - **Stream-stream**: Buffer events, match within time window
   - **Stream-table**: Enrich events with reference data
   - **Table-table**: Maintain join as both sides change

7. **Fault tolerance strategies:**
   - **Microbatching**: Process in small atomic batches
   - **Checkpointing**: Save state snapshots periodically
   - **Idempotency**: Same input always produces same output

8. **Exactly-once** means the EFFECT is as if each event processed once, achieved through:
   - Idempotent writes (same write twice = one write)
   - Transactions (atomic state + output)
   - Deterministic processing

9. **Choose the right framework:**
   - **Kafka Streams**: Simple, library-based, Kafka-centric
   - **Flink**: Most powerful event-time processing
   - **Spark Streaming**: Unified batch + streaming
