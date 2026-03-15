# Chapter 12: The Future of Data Systems

## Introduction

This final chapter ties together the themes from the entire book and looks forward. We've covered:
- **Part I**: Foundations - how data systems store and retrieve data
- **Part II**: Distributed data - how systems work across multiple machines
- **Part III**: Derived data - how to build pipelines that process and transform data

Now we ask: How do we combine these pieces into applications that actually work correctly, reliably, and ethically?

---

## Data Integration: The Real-World Problem

### No Single Database Does Everything

In reality, most applications need multiple data systems:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ A Typical Modern Application                                             │
│                                                                          │
│   ┌──────────────────┐                                                   │
│   │    PostgreSQL    │ ← Primary database (ACID, relational)            │
│   └──────────────────┘                                                   │
│            │                                                             │
│            │ Same data, different representations:                       │
│            │                                                             │
│   ┌────────┼────────┬────────────────┬────────────────┐                 │
│   │        ↓        ↓                ↓                ↓                 │
│   │ ┌─────────┐ ┌─────────┐  ┌─────────────┐  ┌─────────────┐          │
│   │ │  Redis  │ │  Elastic│  │    S3 +     │  │ Analytics   │          │
│   │ │ (cache) │ │ search  │  │  Data Lake  │  │  Warehouse  │          │
│   │ └─────────┘ └─────────┘  └─────────────┘  └─────────────┘          │
│   │                                                                      │
│   │   Fast         Full-text      Historical      BI and                │
│   │   lookups      search         archive         reporting             │
│   │                                                                      │
│   └──────────────────────────────────────────────────────────────────────│
│                                                                          │
│   Each optimized for different access patterns                           │
│   But they all need the SAME data!                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**The challenge**: How do you keep all these systems in sync?

### Two Approaches to Keeping Data in Sync

#### Approach 1: Distributed Transactions

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Distributed Transactions (Synchronous)                                   │
│                                                                          │
│   Application                                                            │
│      │                                                                   │
│      │ BEGIN TRANSACTION                                                 │
│      │                                                                   │
│      ├─────→ Write to PostgreSQL ─────→ PREPARE ─┐                      │
│      │                                            │                      │
│      ├─────→ Write to Redis ──────────→ PREPARE ─┼── All prepared?      │
│      │                                            │        │             │
│      ├─────→ Write to Elasticsearch ──→ PREPARE ─┘        │             │
│      │                                                     │             │
│      │                                            Yes ←────┘             │
│      │                                              │                    │
│      │ COMMIT ←─────────────────────────────────────                    │
│      │                                                                   │
│   All writes succeed or all fail (atomic)                                │
│                                                                          │
│   Problems:                                                              │
│   - All systems must support 2PC protocol                                │
│   - Any system being slow/unavailable blocks everything                  │
│   - High coordination cost                                               │
│   - Brittle: One failure cascades to all                                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Approach 2: Derived Data (Asynchronous)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Derived Data (Asynchronous)                                              │
│                                                                          │
│   Application                                                            │
│      │                                                                   │
│      │ Write to PRIMARY ONLY                                             │
│      │                                                                   │
│      └─────→ PostgreSQL (or Kafka)                                       │
│                    │                                                     │
│                    │ Change Data Capture (CDC)                           │
│                    │                                                     │
│                    ▼                                                     │
│              ┌──────────┐                                                │
│              │  Change  │                                                │
│              │  Stream  │                                                │
│              └──────────┘                                                │
│                    │                                                     │
│         ┌─────────┼─────────┬─────────────┐                             │
│         ↓         ↓         ↓             ↓                             │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                       │
│   │  Redis  │ │  Elastic│ │   S3    │ │Analytics│                       │
│   │ (cache) │ │ search  │ │  Lake   │ │   DW    │                       │
│   └─────────┘ └─────────┘ └─────────┘ └─────────┘                       │
│                                                                          │
│   Each derived asynchronously from the stream                            │
│                                                                          │
│   Advantages:                                                            │
│   - Primary write is fast and independent                                │
│   - Each derived system can fail/recover independently                   │
│   - Can add new derived systems without touching primary                 │
│   - Can replay stream to rebuild any derived view                        │
│                                                                          │
│   Trade-off:                                                             │
│   - Eventual consistency (not immediate)                                 │
│   - Must handle out-of-order or duplicate events                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Total Ordering Through a Log

The key insight: If all writes go through a **single ordered log**, derived systems can apply changes in the same order and eventually reach the same state.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Log as Source of Truth                                                   │
│                                                                          │
│   All writes append to an ordered log:                                   │
│                                                                          │
│   Log: [e1] [e2] [e3] [e4] [e5] [e6] [e7] [e8] ...                       │
│         │                              │                                 │
│         └──── Derived System A ────────┘                                │
│               Currently at offset 5                                      │
│               State: f(e1, e2, e3, e4, e5)                               │
│                                                                          │
│         └──── Derived System B ────────┘                                │
│               Currently at offset 8                                      │
│               State: f(e1, e2, e3, e4, e5, e6, e7, e8)                   │
│                                                                          │
│   Even if A is behind B, they'll eventually have the same state          │
│   because they're processing events in the SAME ORDER.                   │
│                                                                          │
│   This is essentially State Machine Replication:                         │
│   - Same inputs + same order + deterministic function = same output      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Unbundling Databases

### Traditional Databases: Everything Bundled Together

A traditional database like PostgreSQL bundles many features:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Traditional Database (PostgreSQL)                                        │
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │ Query Parser  →  Query Optimizer  →  Query Executor               │  │
│   │                                                                   │  │
│   │ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │  │
│   │ │   Storage   │  │   B-tree    │  │  Transaction│                │  │
│   │ │   Engine    │  │   Indexes   │  │   Manager   │                │  │
│   │ └─────────────┘  └─────────────┘  └─────────────┘                │  │
│   │                                                                   │  │
│   │ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │  │
│   │ │    WAL      │  │ Replication │  │   Buffer    │                │  │
│   │ │    Log      │  │   (Standby) │  │   Cache     │                │  │
│   │ └─────────────┘  └─────────────┘  └─────────────┘                │  │
│   │                                                                   │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│   Bundled: Convenient but inflexible                                     │
│   - Can't easily swap out one component                                  │
│   - Must use the database's features as-is                               │
│   - Scaling means scaling everything together                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### The Unbundled Alternative: Compose Specialized Systems

What if we could compose systems from specialized, best-of-breed components?

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Unbundled "Database" - Composed from Specialized Components              │
│                                                                          │
│                          ┌───────────────────┐                           │
│                          │      Kafka        │                           │
│                          │   (Central Log)   │                           │
│                          │                   │                           │
│                          │  Source of Truth  │                           │
│                          │  Total Ordering   │                           │
│                          └───────────────────┘                           │
│                                    │                                     │
│         ┌──────────────────────────┼──────────────────────────┐         │
│         │                          │                          │         │
│         ▼                          ▼                          ▼         │
│   ┌───────────┐            ┌───────────┐             ┌───────────┐      │
│   │   HDFS    │            │  RocksDB  │             │  Elastic  │      │
│   │  (Bulk    │            │  (Fast    │             │  search   │      │
│   │  Storage) │            │  KV store)│             │  (Search) │      │
│   └───────────┘            └───────────┘             └───────────┘      │
│         │                          │                          │         │
│         ▼                          ▼                          ▼         │
│   ┌───────────┐            ┌───────────┐             ┌───────────┐      │
│   │   Spark   │            │  Flink    │             │Application│      │
│   │  (Batch   │            │ (Stream   │             │ (Serving  │      │
│   │  compute) │            │  compute) │             │  Queries) │      │
│   └───────────┘            └───────────┘             └───────────┘      │
│                                                                          │
│   Each component does ONE thing well:                                    │
│   - Kafka: Durable, ordered log                                          │
│   - HDFS: Cheap bulk storage                                             │
│   - RocksDB: Fast key-value access                                       │
│   - Elasticsearch: Full-text search                                      │
│   - Spark: Large-scale batch computation                                 │
│   - Flink: Low-latency stream processing                                 │
│                                                                          │
│   Together, they form a "database" that's more flexible and scalable     │
│   than any single monolithic system.                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### The Log as the "Central Nervous System"

Kafka (or similar) becomes the glue that holds everything together:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Kafka as Central Nervous System                                          │
│                                                                          │
│   Every change flows through Kafka:                                      │
│                                                                          │
│   ┌────────────────────────────────────────────────────────────────┐    │
│   │                                                                 │    │
│   │    User Service  →  user-events topic  →  User DB              │    │
│   │         │                   │                                   │    │
│   │         │                   ├───────────→  Search Index         │    │
│   │         │                   │                                   │    │
│   │    Order Service →  order-events topic →  Order DB              │    │
│   │         │                   │                                   │    │
│   │         │                   ├───────────→  Analytics DW         │    │
│   │         │                   │                                   │    │
│   │    Payment Service  →  payment-events  →  Accounting DB         │    │
│   │                             │                                   │    │
│   │                             └───────────→  Fraud Detection      │    │
│   │                                                                 │    │
│   └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│   Benefits:                                                              │
│   - All data flows are visible and auditable                             │
│   - New consumers can be added without changing producers                │
│   - Can replay history to rebuild any system                             │
│   - Natural place for data governance                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Designing Applications Around Dataflow

### The Dataflow Mindset

Instead of thinking about "databases" and "applications," think about **dataflow**: explicit representation of how data moves and transforms.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Traditional View vs Dataflow View                                        │
│                                                                          │
│ TRADITIONAL:                                                             │
│ ┌─────────────┐        CRUD         ┌─────────────┐                     │
│ │ Application │ ←──────────────────→│  Database   │                     │
│ └─────────────┘                      └─────────────┘                     │
│                                                                          │
│   Application "owns" the database                                        │
│   Database is a black box                                                │
│   Changes happen inside the box                                          │
│                                                                          │
│ DATAFLOW:                                                                │
│ ┌─────────────┐                                                          │
│ │   Inputs    │  (events, commands, external data)                       │
│ └─────────────┘                                                          │
│       │                                                                  │
│       ▼                                                                  │
│ ┌─────────────────────────────────────────────────────────────────┐     │
│ │              Derivation Functions (your code)                    │     │
│ │                                                                  │     │
│ │   input events → transformation → output state/events            │     │
│ │                                                                  │     │
│ │   Pure functions that take events and produce derived data       │     │
│ └─────────────────────────────────────────────────────────────────┘     │
│       │                                                                  │
│       ▼                                                                  │
│ ┌─────────────┐                                                          │
│ │   Outputs   │  (materialized views, derived tables, caches)            │
│ └─────────────┘                                                          │
│                                                                          │
│   Application code IS the derivation function                            │
│   Data dependencies are explicit                                         │
│   Like a spreadsheet: when inputs change, outputs automatically update   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Separation of Concerns: Write Path vs Read Path

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Clear Separation of Write Path and Read Path                             │
│                                                                          │
│   WRITE PATH (Commands → Events)                                         │
│   ┌───────────────────────────────────────────────────────────────────┐ │
│   │                                                                    │ │
│   │   User Action     Validate &        Append to                      │ │
│   │   (Command)  ────→ Transform  ────→ Event Log                      │ │
│   │                                                                    │ │
│   │   "Place Order"    Business         {OrderPlaced,                  │ │
│   │                    Rules             items: [...]}                 │ │
│   │                                                                    │ │
│   └───────────────────────────────────────────────────────────────────┘ │
│                                      │                                   │
│                                      │ Events                            │
│                                      ▼                                   │
│   DERIVATION (Events → Materialized Views)                               │
│   ┌───────────────────────────────────────────────────────────────────┐ │
│   │                                                                    │ │
│   │   Stream of       Apply to        Update                           │ │
│   │   Events     ────→ State   ────→  Materialized Views               │ │
│   │                                                                    │ │
│   │   OrderPlaced      Update          - Order Table                   │ │
│   │   ItemShipped      Inventory       - Customer Dashboard            │ │
│   │   PaymentReceived  Update          - Inventory Count               │ │
│   │                    Accounting      - Sales Report                  │ │
│   │                                                                    │ │
│   └───────────────────────────────────────────────────────────────────┘ │
│                                      │                                   │
│                                      │ Derived State                     │
│                                      ▼                                   │
│   READ PATH (Queries → Responses)                                        │
│   ┌───────────────────────────────────────────────────────────────────┐ │
│   │                                                                    │ │
│   │   Query           Lookup          Return                           │ │
│   │   (Request)  ────→ in View  ────→ Response                         │ │
│   │                                                                    │ │
│   │   "Get order      Check           {order_id: 123,                  │ │
│   │    status"        precomputed      status: shipped}                │ │
│   │                   view                                             │ │
│   │                                                                    │ │
│   └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│   Benefits:                                                              │
│   - Write path can be optimized for validation and durability            │
│   - Read path can be optimized for query speed                           │
│   - Can add new read views without touching write path                   │
│   - Clear audit trail of all changes                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### The Spreadsheet Analogy

Think of your data system like a giant spreadsheet:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Spreadsheet Analogy                                                      │
│                                                                          │
│   In a spreadsheet:                                                      │
│                                                                          │
│   Cell A1: 10           (input)                                          │
│   Cell A2: 20           (input)                                          │
│   Cell B1: =A1+A2       (derived) → 30                                   │
│   Cell B2: =B1*2        (derived) → 60                                   │
│                                                                          │
│   When A1 changes to 15:                                                 │
│   - B1 automatically becomes 35                                          │
│   - B2 automatically becomes 70                                          │
│   - You don't manually update B1 and B2                                  │
│                                                                          │
│   In a data system:                                                      │
│                                                                          │
│   Event Log: [order_placed, payment_received, ...]    (inputs)           │
│                                                                          │
│   Total Revenue = SUM(payment amounts)                 (derived)         │
│   Open Orders = COUNT(orders not fulfilled)            (derived)         │
│   Dashboard = function(all events)                     (derived)         │
│                                                                          │
│   When new event arrives:                                                │
│   - All derived views automatically update                               │
│   - Dependencies are explicit (like spreadsheet formulas)                │
│   - No manual sync needed                                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Observing Derived State

### Push vs Pull: Subscribe vs Request

Traditional systems use **pull/polling**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Pull Model (Request/Response)                                            │
│                                                                          │
│   Client                             Server                              │
│                                                                          │
│   "What's the status?"  ─────────→   Read from DB                        │
│                                       "pending"    ─────────→  Response  │
│                                                                          │
│   [wait 5 seconds]                                                       │
│                                                                          │
│   "What's the status?"  ─────────→   Read from DB                        │
│                                       "pending"    ─────────→  Response  │
│                                                                          │
│   [wait 5 seconds]                                                       │
│                                                                          │
│   "What's the status?"  ─────────→   Read from DB                        │
│                                       "shipped!"   ─────────→  Response  │
│                                                                          │
│   Problems:                                                              │
│   - Wasted requests (nothing changed)                                    │
│   - Delayed updates (must wait for next poll)                            │
│   - Doesn't scale well (N clients × M requests/sec)                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

Modern systems can use **push/subscribe**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Push Model (Subscribe)                                                   │
│                                                                          │
│   Client                             Server                              │
│                                                                          │
│   "Subscribe to order 123"  ────→    Register subscriber                 │
│                                                                          │
│   [nothing happens until change]                                         │
│                                                                          │
│                                      Order status changes!               │
│                                             │                            │
│   ←────────────────────────────────  "Order 123 now shipped"             │
│                                                                          │
│   Instant notification, no polling!                                      │
│                                                                          │
│   Examples:                                                              │
│   - WebSockets                                                           │
│   - Server-Sent Events                                                   │
│   - GraphQL Subscriptions                                                │
│   - Change Data Capture                                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Read-After-Write Consistency in Async Systems

With async derived data, how do you ensure users see their own writes?

```
┌─────────────────────────────────────────────────────────────────────────┐
│ The Problem: User Updates Profile, Then Views It                         │
│                                                                          │
│   User                      Write Path                   Read Path       │
│                                                                          │
│   Update name   ────────→   Event logged                                 │
│   to "Alice"                     │                                       │
│                                  │ (async propagation)                   │
│   View profile  ────────────────────────────────→   Still shows "Bob"!  │
│                                  │                   (not updated yet)   │
│                                  ▼                                       │
│                              Update view ─────→   Now shows "Alice"      │
│                                                                          │
│   Solutions:                                                             │
│                                                                          │
│   1. Read-your-writes: Include write timestamp, wait for view to catch up│
│   2. Read from write path: For recent writes, read from primary          │
│   3. Synchronous update: Wait for derived view to update before returning│
│   4. Client-side optimistic update: Show expected state immediately      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Aiming for Correctness

### The End-to-End Argument

**Key principle**: Lower-level systems can provide building blocks, but correctness must be enforced at the application level.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ End-to-End Argument                                                      │
│                                                                          │
│   Consider: "Transfer $100 from Alice to Bob"                            │
│                                                                          │
│   Network Layer: TCP ensures packets arrive                              │
│   Database Layer: Transactions ensure atomicity                          │
│   Application Layer: ??? Must ensure transfer is correct                 │
│                                                                          │
│   Even with TCP + ACID:                                                  │
│   - What if client crashes after sending request but before seeing response?│
│   - Did the transfer happen? Client doesn't know.                        │
│   - Retrying might transfer TWICE!                                       │
│                                                                          │
│   ┌───────────────────────────────────────────────────────────────────┐ │
│   │ Client              Network              Server                    │ │
│   │                                                                    │ │
│   │ Transfer  ─────────────────────────────→  Execute                  │ │
│   │ (request)                                 (success)                │ │
│   │                                                │                   │ │
│   │         ←──────────────────────────────── Response                 │ │
│   │                   │                       (success)                │ │
│   │              💥 LOST!                                              │ │
│   │                                                                    │ │
│   │ Timeout!                                                           │ │
│   │ Should I retry?                                                    │ │
│   │                                                                    │ │
│   └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│   The solution MUST be at the application level:                         │
│   - Idempotency keys                                                     │
│   - Unique request IDs                                                   │
│   - Deduplication logic                                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Idempotency: Making Operations Safe to Retry

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Idempotency Keys                                                         │
│                                                                          │
│   Client generates a unique ID for each operation:                       │
│                                                                          │
│   Request 1: {                                                           │
│     idempotency_key: "txn-abc-123",                                      │
│     action: "transfer",                                                  │
│     from: "alice",                                                       │
│     to: "bob",                                                           │
│     amount: 100                                                          │
│   }                                                                      │
│                                                                          │
│   Server processing:                                                     │
│                                                                          │
│   1. Check: Have we seen "txn-abc-123" before?                           │
│      - Yes: Return stored result (don't execute again)                   │
│      - No: Execute operation, store result keyed by "txn-abc-123"        │
│                                                                          │
│   Now retries are safe:                                                  │
│                                                                          │
│   First attempt:   Execute transfer, store result                        │
│   Retry (same key): Return stored result, don't transfer again           │
│   Retry (same key): Return stored result, don't transfer again           │
│                                                                          │
│   Result: Exactly-once execution even with at-least-once delivery        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Uniqueness Constraints in Distributed Systems

Ensuring uniqueness (e.g., "only one user can have email X") is hard when data is distributed:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Options for Uniqueness Constraints                                       │
│                                                                          │
│ 1. SINGLE LEADER                                                         │
│    ┌─────────────────────────────────────────────────────────────────┐  │
│    │ All writes for a partition go through ONE node                   │  │
│    │                                                                  │  │
│    │ Request A: "Register alice@example.com"  ─┐                      │  │
│    │                                            ├→  Leader serializes  │  │
│    │ Request B: "Register alice@example.com"  ─┘    First wins!       │  │
│    │                                                                  │  │
│    │ Simple but: leader is bottleneck/SPOF                            │  │
│    └─────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│ 2. CONSENSUS (Raft/Paxos)                                                │
│    ┌─────────────────────────────────────────────────────────────────┐  │
│    │ Nodes agree on which operation came first                        │  │
│    │                                                                  │  │
│    │ Multiple nodes can accept requests                               │  │
│    │ Consensus determines order                                       │  │
│    │                                                                  │  │
│    │ More complex but: no single point of failure                     │  │
│    └─────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│ 3. CONFLICT RESOLUTION                                                   │
│    ┌─────────────────────────────────────────────────────────────────┐  │
│    │ Allow conflicts, detect and resolve later                        │  │
│    │                                                                  │  │
│    │ Both registrations succeed initially                             │  │
│    │ Background process detects conflict                              │  │
│    │ Apply resolution: "First timestamp wins" or "Ask user"           │  │
│    │                                                                  │  │
│    │ Higher availability but: temporary inconsistency                 │  │
│    └─────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Integrity vs Timeliness

Two different properties that are often conflated:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Integrity vs Timeliness                                                  │
│                                                                          │
│ INTEGRITY: Data is correct, constraints not violated                     │
│                                                                          │
│   Examples of integrity violations:                                      │
│   - Money disappears (transfer debits but doesn't credit)                │
│   - Duplicate usernames in "unique username" system                      │
│   - Inventory goes negative                                              │
│   - Lost writes                                                          │
│                                                                          │
│   These are SERIOUS. Data corruption is often irreversible.              │
│                                                                          │
│ TIMELINESS: Users see up-to-date state                                   │
│                                                                          │
│   Examples of timeliness issues:                                         │
│   - Dashboard shows yesterday's numbers                                  │
│   - Profile update takes a few seconds to appear                         │
│   - Search results are slightly stale                                    │
│                                                                          │
│   These are ANNOYING but usually not catastrophic.                       │
│                                                                          │
│ THE DESIGN PRINCIPLE:                                                    │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                                                                  │   │
│   │   INTEGRITY: Must ALWAYS maintain                                │   │
│   │   - Use transactions where needed                                │   │
│   │   - Idempotent operations                                        │   │
│   │   - Careful concurrency control                                  │   │
│   │                                                                  │   │
│   │   TIMELINESS: Can be relaxed                                     │   │
│   │   - Eventual consistency is often OK                             │   │
│   │   - Async updates are acceptable                                 │   │
│   │   - Some staleness is tolerable                                  │   │
│   │                                                                  │   │
│   │   AUDIT: Verify integrity continuously                           │   │
│   │   - Background checks for corruption                             │   │
│   │   - Reconciliation between systems                               │   │
│   │   - End-to-end verification                                      │   │
│   │                                                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Trust, but Verify: Auditing

Even with the best designs, things go wrong. Build in verification:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Causes of Data Corruption                                                │
│                                                                          │
│   HARDWARE:                                                              │
│   - Disk bit rot                                                         │
│   - Memory errors (cosmic rays!)                                         │
│   - Network packet corruption (rare but happens)                         │
│                                                                          │
│   SOFTWARE:                                                              │
│   - Bugs in application code                                             │
│   - Database bugs                                                        │
│   - Race conditions                                                      │
│                                                                          │
│   HUMANS:                                                                │
│   - Misconfiguration                                                     │
│   - Accidental deletion                                                  │
│   - Incorrect data entry                                                 │
│                                                                          │
│ DEFENSE: End-to-End Verification                                         │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                                                                  │   │
│   │   Checksums: Detect bit-level corruption                         │   │
│   │   Reconciliation: Compare different systems' data                │   │
│   │   Invariant checks: "Sum of all balances must equal X"           │   │
│   │   Audit logs: Reviewable history of all changes                  │   │
│   │   Alerts: Notify when things look wrong                          │   │
│   │                                                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   Example: Double-entry bookkeeping                                      │
│   - Every transaction has debit and credit entries                       │
│   - Sum of debits must equal sum of credits                              │
│   - If not, something went wrong - investigate!                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Doing the Right Thing: Ethics

### The Dark Side of Data

The same techniques that power useful applications can also be misused:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Data Systems: Benefits and Risks                                         │
│                                                                          │
│   BENEFIT                          RISK                                  │
│   ─────────────────────────────────────────────────────────────────────  │
│   Personalized recommendations     Filter bubbles, manipulation          │
│                                                                          │
│   Fraud detection                  Surveillance, profiling               │
│                                                                          │
│   Credit scoring                   Discrimination, bias                  │
│                                                                          │
│   Targeted advertising             Privacy invasion, manipulation        │
│                                                                          │
│   Predictive policing              Reinforcing historical bias           │
│                                                                          │
│   Medical diagnosis AI             Liability unclear, errors in care     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Algorithmic Bias and Feedback Loops

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Feedback Loops Can Amplify Bias                                          │
│                                                                          │
│   Example: Predictive policing                                           │
│                                                                          │
│   1. Historical crime data shows more arrests in neighborhood A          │
│      (possibly due to more police presence there)                        │
│                                                                          │
│   2. Algorithm: "Neighborhood A has more crime, send more police"        │
│                                                                          │
│   3. More police → more arrests → more "crime" in data                   │
│                                                                          │
│   4. Algorithm learns: "See? A is even worse, send even more police"     │
│                                                                          │
│   ┌───────────────────────────────────────────────────────────────────┐ │
│   │                         Feedback Loop                              │ │
│   │                                                                    │ │
│   │   More police ────→ More arrests ────→ More "crime" in data       │ │
│   │       ↑                                         │                  │ │
│   │       │                                         │                  │ │
│   │       └──── Algorithm recommends more ←─────────┘                  │ │
│   │             police in this area                                    │ │
│   └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│   The system becomes self-reinforcing, amplifying original bias.         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Privacy: Data as a Toxic Asset

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Data is a Liability, Not Just an Asset                                   │
│                                                                          │
│   Traditional view: "Data is the new oil! Collect everything!"           │
│                                                                          │
│   Reality check:                                                         │
│   ┌───────────────────────────────────────────────────────────────────┐ │
│   │                                                                    │ │
│   │   - Data breaches: Every stored record is breach risk             │ │
│   │   - Legal liability: GDPR fines can be 4% of global revenue       │ │
│   │   - Storage costs: Data isn't free to keep                        │ │
│   │   - Security costs: Must protect everything you store             │ │
│   │   - Subpoenas: Stored data can be demanded by courts              │ │
│   │                                                                    │ │
│   └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│   Better approach:                                                       │
│                                                                          │
│   "What is the MINIMUM data needed to provide this service?"             │
│                                                                          │
│   - Collect only what you need                                           │
│   - Delete data when no longer needed                                    │
│   - Anonymize where possible                                             │
│   - Be transparent about what you collect and why                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### User Self-Determination

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Users Should Control Their Data                                          │
│                                                                          │
│   Rights users should have:                                              │
│                                                                          │
│   ACCESS: "Show me all data you have about me"                           │
│   ┌───────────────────────────────────────────────────────────────────┐ │
│   │ Name: Alice                                                        │ │
│   │ Email: alice@example.com                                           │ │
│   │ Purchase history: [...]                                            │ │
│   │ Browsing history: [...]                                            │ │
│   │ Inferred interests: [...]                                          │ │
│   └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│   CORRECTION: "This is wrong, fix it"                                    │
│   ┌───────────────────────────────────────────────────────────────────┐ │
│   │ "My name is spelled 'Alicia' not 'Alice'"                          │ │
│   └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│   DELETION: "Delete my account and all data"                             │
│   ┌───────────────────────────────────────────────────────────────────┐ │
│   │ Right to be forgotten (with reasonable exceptions)                 │ │
│   └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│   PORTABILITY: "Give me my data in a usable format"                      │
│   ┌───────────────────────────────────────────────────────────────────┐ │
│   │ Download as JSON/CSV so I can take it to a competitor              │ │
│   └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│   OBJECTION: "Don't use my data for this purpose"                        │
│   ┌───────────────────────────────────────────────────────────────────┐ │
│   │ "Don't use my data for targeted advertising"                       │ │
│   │ "Don't sell my data to third parties"                              │ │
│   └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│   These are legal requirements in many jurisdictions (GDPR, CCPA).       │
│   But beyond compliance: it's the right thing to do.                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Engineering Ethics

As engineers who build data systems, we have responsibilities:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Questions Engineers Should Ask                                           │
│                                                                          │
│   Before building a feature:                                             │
│                                                                          │
│   "How could this be misused?"                                           │
│   - By the company itself                                                │
│   - By malicious actors                                                  │
│   - By oppressive governments                                            │
│                                                                          │
│   "What happens when this data is breached?"                             │
│   - Because it will be, eventually                                       │
│   - What's the worst case for users?                                     │
│                                                                          │
│   "Is this something users would want if they understood it?"            │
│   - Not "do they click 'Accept'" on 50-page terms                        │
│   - But genuinely: would they want this?                                 │
│                                                                          │
│   "Am I comfortable with this being public?"                             │
│   - If a journalist investigated                                         │
│   - If your family knew                                                  │
│                                                                          │
│   ┌───────────────────────────────────────────────────────────────────┐ │
│   │                                                                    │ │
│   │   "With great power comes great responsibility."                   │ │
│   │                                                                    │ │
│   │   As data engineers, we have tremendous power over people's        │ │
│   │   information. We should use it wisely and ethically.              │ │
│   │                                                                    │ │
│   └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Key Takeaways

1. **Data integration is essential**: No single database does everything. Use specialized systems, keep them in sync with derived data patterns (not distributed transactions).

2. **Use a log as the source of truth**: Kafka-style logs enable total ordering, replay capability, and independent derived systems.

3. **Unbundle the database**: Compose systems from specialized components (storage, compute, indexing) rather than relying on monolithic databases.

4. **Think in dataflow**: Make data dependencies explicit. When inputs change, derived outputs should automatically update.

5. **Separate write path from read path**: Optimize each for its purpose. CQRS pattern separates commands (writes) from queries (reads).

6. **End-to-end correctness is your responsibility**: Lower layers provide building blocks, but the application must ensure correct behavior. Use idempotency keys, deduplication, and verification.

7. **Integrity matters more than timeliness**: Eventual consistency for timeliness is often acceptable. Data corruption is not. Always maintain integrity.

8. **Trust, but verify**: Hardware fails, software has bugs, humans make mistakes. Build in auditing and reconciliation.

9. **Ethics matter**: Consider privacy, bias, surveillance implications. Ask how your system could be misused.

10. **Users should control their data**: Design systems that respect users' rights to access, correct, delete, and port their data.

11. **Engineers have responsibility**: We build the systems that handle people's data. We must think beyond "does it work" to "is it right."
