# Data Lakehouse

[← Back to Index](README.md)

Imagine you are building the data platform for a growing company. Product analytics needs raw clickstream history, finance wants trusted daily revenue tables, and data science wants to train models on corrected historical snapshots. The first version looks simple: land raw files in object storage, copy selected data into a warehouse, and keep adding ETL jobs whenever a new team asks for access.

Without a coherent table layer, the architecture quickly turns into duplicated storage and fragile sync jobs:

```typescript
// Bad example: every curated dataset is copied out of the lake into a
// separate system with custom retry and deduplication logic.
async function publishDailyOrders(
  lake: ObjectStore,
  warehouse: WarehouseClient,
  day: string,
): Promise<void> {
  const files = await lake.list(`raw/orders/dt=${day}/`);

  for (const file of files) {
    const rows = JSON.parse(await lake.get(file)) as Array<{
      id: string;
      total_cents: number;
      updated_at: string;
    }>;

    for (const row of rows) {
      await warehouse.execute(
        "INSERT INTO analytics_orders (order_id, total_cents, updated_at) VALUES (?, ?, ?)",
        [row.id, row.total_cents, row.updated_at],
      );
    }
  }
}
```

This usually creates predictable failures:
- raw and curated systems drift apart
- late corrections require replaying multiple pipelines
- governance rules differ between storage systems
- teams argue over which copy is the authoritative one

This is where a **data lakehouse** comes in. A lakehouse keeps data in lake-style object storage, but adds a table metadata layer, transaction semantics, and operational discipline so the same data can support warehouse-style analytics with fewer fragile copies.

In this chapter, you will learn:
  * [What problem lakehouses solve](#1-the-problem-lakehouses-solve)
  * [What a data lakehouse is and what it is not](#2-what-a-data-lakehouse-is)
  * [Why the metadata and table format layer matters](#3-the-metadata-and-table-format-layer)
  * [How transactions, snapshots, and concurrency usually work](#4-transactions-snapshots-and-concurrency)
  * [Which storage and architecture patterns are common](#5-storage-layout-and-architecture-patterns)
  * [Which workloads fit a lakehouse well](#6-query-and-processing-workloads)
  * [How schema evolution, time travel, and corrections work](#7-schema-evolution-time-travel-and-data-correction)
  * [What practical TypeScript and SQL patterns look like](#8-practical-typescript-and-sql-patterns)
  * [Which best practices prevent common lakehouse failures](#9-best-practices-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. The Problem Lakehouses Solve

Many data platforms grow into a two-system pattern:
- a data lake for cheap raw storage
- a warehouse for governed analytics and BI

That separation can work well, but it often creates recurring cost and complexity when many teams need the same data at different stages of refinement.

### The Common Failure Mode

```text
Operational systems, logs, partner files
  -> land raw files in object storage
  -> run ETL into warehouse tables
  -> build separate copies for BI, ML, and ad hoc analysis
```

Over time this can lead to:
- duplicated storage and ingestion cost
- ETL latency between raw arrival and analytical visibility
- reimplementation of business rules in multiple systems
- difficult backfills when historical corrections arrive

### Why This Matters

The pain is not only technical.

- analysts want SQL tables with stable semantics
- engineers want replayable pipelines and fewer copies
- data scientists want access to raw and curated history
- governance teams want consistent access control and lineage

### The Lakehouse Idea

```text
One durable storage foundation
  -> object storage keeps the files
  -> table metadata tracks which files define a table snapshot
  -> multiple engines read governed tables from the same storage
```

The lakehouse does not eliminate all movement or all modeling. It reduces unnecessary duplication by making lake storage behave more like managed analytical tables.


# 2. What a Data Lakehouse Is

A data lakehouse is an analytical architecture that combines:
- lake-style storage on object storage
- warehouse-style table semantics such as snapshots and controlled updates
- shared access for more than one processing or query engine

### A Conservative Definition

The durable idea is not one product name. It is this combination:

```text
Lakehouse = object storage + table metadata layer + analytical compute engines + governance
```

### What It Usually Provides

A practical lakehouse often includes:
- open or semi-open file formats such as Parquet
- a table format or transaction layer
- catalogs for table discovery and schema tracking
- engines for SQL, batch processing, and sometimes streaming updates
- support for replay, backfills, and historical inspection

### What It Is Not

A lakehouse is usually not:
- a transactional replacement for your application database
- a random bucket with a query engine pointed at it
- a guarantee that every engine implements every feature identically

### Data Lake vs Warehouse vs Lakehouse

```text
┌────────────────────┬────────────────────────────────────────────┬────────────────────────────────────────────┬────────────────────────────────────────────┐
│ Dimension          │ Data Lake                                  │ Data Warehouse                             │ Data Lakehouse                             │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Storage model      │ Files on object storage                    │ Managed analytical storage                 │ Files on object storage plus table metadata│
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Typical strength   │ Cheap retention and flexibility            │ Fast governed analytics                    │ Shared storage with stronger table behavior│
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Common weakness    │ Weak transactions and governance by default│ Less flexible raw-data retention           │ Operational complexity can still be high   │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Good fit           │ Raw, semi-structured, archival data        │ BI, reporting, dimensional models          │ Mixed analytics over shared datasets       │
└────────────────────┴────────────────────────────────────────────┴────────────────────────────────────────────┴────────────────────────────────────────────┘
```

In practice, many organizations still use all three patterns in different parts of the platform.


# 3. The Metadata and Table Format Layer

The defining feature of a lakehouse is not just file storage. It is the metadata layer that tells readers which files belong to a table at a given moment.

### Why Raw Files Are Not Enough

Files alone do not answer important questions:
- which files make up the current version of the table
- which snapshot existed yesterday
- whether a delete or update has been committed
- which schema readers should use

### What the Table Layer Usually Tracks

Common metadata includes:
- table schema and schema history
- partition information
- file-level statistics
- snapshot history
- delete markers or change files
- transaction or commit logs

### Common Table Format Families

You will often hear about:
- Apache Iceberg
- Delta Lake
- Apache Hudi

The implementation details differ, but they generally try to provide the same durable capabilities:
- snapshot-based reads
- controlled schema evolution
- atomic publication of table changes
- better support for upserts and deletes than plain files alone

### Mental Model

```text
┌──────────────────────────────────────────────────────────────┐
│ Catalog / Table metadata                                    │
│  - schema                                                   │
│  - snapshot pointer                                         │
│  - partition metadata                                       │
│  - file statistics                                          │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ Object storage                                               │
│  /table/data/file-001.parquet                                │
│  /table/data/file-002.parquet                                │
│  /table/metadata/...                                         │
└──────────────────────────────────────────────────────────────┘
```

### Why This Layer Changes the Design

Once the metadata layer becomes authoritative:
- readers can agree on a stable snapshot
- writers can publish changes atomically at the table level
- engines can prune files more effectively
- replay and audit become much more practical


# 4. Transactions, Snapshots, and Concurrency

Most lakehouses do not update random files in place the way an OLTP database updates rows on disk. Instead, they usually write new data files and then publish a new table snapshot.

### Snapshot-Oriented Thinking

```text
Current snapshot N
  -> points to a set of data files

Writer prepares new files
  -> validates against snapshot N
  -> publishes snapshot N+1 atomically

Readers
  -> continue seeing N until they switch to N+1
```

This is often implemented with optimistic concurrency:
- a writer reads the latest snapshot version
- prepares data files and metadata changes
- commits only if the base snapshot is still current

### Why This Matters on Object Storage

Object storage is durable and scalable, but it is not a row-store with native multi-row transactions. The metadata layer compensates by making table publication atomic even when the underlying data files are immutable objects.

### A Simple Concurrency Guard

```typescript
type SnapshotPointer = {
  tableName: string;
  version: number;
  manifestPath: string;
};

function assertCanCommit(
  baseSnapshot: SnapshotPointer,
  latestSnapshot: SnapshotPointer,
): void {
  if (baseSnapshot.version !== latestSnapshot.version) {
    throw new Error(
      `concurrent update detected for ${baseSnapshot.tableName}: ` +
        `expected version ${baseSnapshot.version}, got ${latestSnapshot.version}`,
    );
  }
}
```

This is simplified, but it captures the core idea: do not publish based on stale table state.

### Common Write Patterns

Lakehouse tables usually support some combination of:
- append-only inserts
- partition replacement
- merge or upsert semantics
- deletes represented through rewritten files or delete metadata

Performance and correctness depend heavily on how often you do each of these and how well your engine handles file maintenance afterward.


# 5. Storage Layout and Architecture Patterns

A lakehouse still needs a disciplined storage layout. The metadata layer helps, but it does not replace data modeling or operational boundaries.

### Common Layered Architecture

```text
┌────────────────┐
│ Source systems │
└──────┬─────────┘
       │
       ▼
┌────────────────┐
│ Raw / Bronze   │  immutable landing, replay source
└──────┬─────────┘
       │
       ▼
┌────────────────┐
│ Clean / Silver │  standardized schema, dedupe, joins
└──────┬─────────┘
       │
       ▼
┌────────────────┐
│ Gold / Marts   │  business-ready analytical tables
└────────────────┘
```

The names vary, but the separation is useful:
- raw preserves original history
- clean standardizes and reconciles records
- curated or mart layers publish trusted business-facing tables

### Shared Storage, Multiple Engines

```text
                ┌──────────────────────┐
                │ Catalog / Metastore  │
                └──────────┬───────────┘
                           │
                           ▼
┌──────────────┐    ┌──────────────────────┐    ┌────────────────┐
│ Batch engine │    │ Lakehouse tables     │    │ SQL query      │
│ Spark/Flink  │ -> │ on object storage    │ <- │ engine / BI    │
└──────────────┘    └──────────────────────┘    └────────────────┘
                           ▲
                           │
                     ┌──────────────┐
                     │ ML / notebooks│
                     └──────────────┘
```

This pattern is attractive because one storage foundation can support multiple consumers without materializing a fresh copy for each one.

### Physical Design Still Matters

Even in a lakehouse, you still need to decide:
- partition keys
- clustering or sort order where supported
- target file sizes
- compaction cadence
- retention and cleanup rules

Lakehouse architecture reduces some coordination cost, but poor physical layout can still make queries slow and maintenance expensive.


# 6. Query and Processing Workloads

Lakehouses are most valuable when several analytical workloads need to share the same datasets with stronger table guarantees than plain lake files provide.

### Common Workloads

- BI dashboards and ad hoc SQL
- batch transformations and backfills
- exploratory notebooks
- feature engineering and training dataset preparation
- CDC-driven upserts and data corrections

### Where a Lakehouse Fits Well

A lakehouse is often a good fit when you need:
- cheap object storage for large historical datasets
- one logical table usable by more than one engine
- replayable snapshots and controlled updates
- support for both raw-ish and curated analytical data

### Where It Is a Poor Fit

It is usually a poor fit for:
- high-throughput OLTP application writes
- ultra-low-latency serving workloads that need point reads in milliseconds
- teams without operational capacity to manage metadata, compaction, and governance

### Practical Trade-Offs

```text
Good fit:
  -> large analytical datasets
  -> mixed batch and interactive analytics
  -> historical replay and corrections

Weak fit:
  -> user-facing transactional workloads
  -> tiny datasets that a warehouse can manage simply
  -> architectures where every consumer already needs a separate serving copy
```

### Lakehouse vs Warehouse Decision

If your main requirement is governed SQL for dashboards with minimal platform complexity, a warehouse may still be the simpler answer.

If you need:
- open file-based storage
- broad raw-data retention
- multiple engines over shared analytical tables

then a lakehouse may be a better long-term fit.


# 7. Schema Evolution, Time Travel, and Data Correction

Lakehouses are popular partly because the table layer makes historically correct change management easier than plain file folders.

### Schema Evolution

Real datasets change:
- columns get added
- optional fields become required
- source types change
- nested structures evolve

Safe evolution usually means:
- explicit compatibility checks
- versioned contracts
- careful rollout of breaking changes

### Time Travel and Snapshot Reads

Because table state is snapshot-based, readers can often inspect an earlier version of the table for:
- debugging
- reproducible training datasets
- audit questions
- rollback planning

The exact query syntax varies by engine, but the durable idea is stable: readers can ask for the table as of a previous snapshot or time boundary.

### Data Correction Patterns

Late-arriving or corrected data often shows up as:
- upserts from CDC streams
- backfilled partitions
- deletes for privacy or compliance reasons
- dimension corrections that change historical interpretation

Lakehouse formats help here because they track table-level changes rather than forcing readers to reason over a pile of unmanaged files.

### A Small Compatibility Check

```typescript
type ColumnType = "string" | "bigint" | "timestamp" | "boolean";
type TableSchema = Record<string, ColumnType>;

function findBreakingSchemaChanges(
  previous: TableSchema,
  next: TableSchema,
): string[] {
  const issues: string[] = [];

  for (const [column, oldType] of Object.entries(previous)) {
    if (!(column in next)) {
      issues.push(`column removed: ${column}`);
      continue;
    }

    if (next[column] !== oldType) {
      issues.push(`type changed for ${column}: ${oldType} -> ${next[column]}`);
    }
  }

  return issues;
}
```

This does not replace full schema governance, but it prevents casual breaking changes from slipping into a production table.


# 8. Practical TypeScript and SQL Patterns

Lakehouse implementations vary by engine, but a few patterns show up consistently.

### Pattern 0: Define Curated Tables Deliberately

Lakehouse SQL dialects vary, but the table definition still needs explicit column choices and physical layout decisions.

```sql
CREATE TABLE curated_orders (
  order_id VARCHAR(64) NOT NULL,
  customer_id VARCHAR(64) NOT NULL,
  total_cents BIGINT NOT NULL,
  status VARCHAR(32) NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  order_date DATE NOT NULL
);
```

For lakehouse tables, physical optimization is usually driven more by partitioning, file size, and sort or cluster rules than by traditional secondary indexes.

### Pattern 1: Publish Through Staging and Merge

When corrected data can arrive later, publish through a staging table and merge into a curated table instead of blindly appending duplicates.

```sql
MERGE INTO curated_orders AS target
USING staged_orders AS source
ON target.order_id = source.order_id
WHEN MATCHED AND source.updated_at > target.updated_at THEN
  UPDATE SET
    customer_id = source.customer_id,
    total_cents = source.total_cents,
    status = source.status,
    updated_at = source.updated_at
WHEN NOT MATCHED THEN
  INSERT (order_id, customer_id, total_cents, status, updated_at)
  VALUES (source.order_id, source.customer_id, source.total_cents, source.status, source.updated_at);
```

The exact `MERGE` syntax differs across engines, but the pattern is durable.

### Pattern 2: Dedupe Before Publish

```typescript
type OrderChange = {
  orderId: string;
  updatedAt: string;
  totalCents: number;
};

function keepLatestPerOrder(changes: OrderChange[]): OrderChange[] {
  const latestByOrder = new Map<string, OrderChange>();

  for (const change of changes) {
    const current = latestByOrder.get(change.orderId);

    if (!current || change.updatedAt > current.updatedAt) {
      latestByOrder.set(change.orderId, change);
    }
  }

  return [...latestByOrder.values()];
}
```

This kind of deduplication is common before writing new table files for a batch.

### Pattern 3: Validate a Publish Window

```typescript
type BatchWindow = {
  startInclusive: Date;
  endExclusive: Date;
};

function assertValidWindow(window: BatchWindow): void {
  if (window.startInclusive >= window.endExclusive) {
    throw new Error("invalid batch window");
  }
}
```

Simple validation is worth keeping close to the publish logic. A surprising amount of lakehouse damage comes from writing the wrong partition slice, not from exotic table-format bugs.

### Operational Sketch

```text
CDC or batch extract
  -> raw landing table
  -> clean staging table
  -> quality checks and dedupe
  -> merge into curated table
  -> compact files and expire old snapshots carefully
```

### What to Measure

Useful metrics include:
- rows written and rows merged
- file counts per partition
- average file size
- snapshot age and retention
- freshness lag from source to curated table
- failed commits due to concurrency conflicts


# 9. Best Practices and Common Pitfalls

Lakehouses are powerful when teams treat them as governed analytical systems, not just as clever storage layouts.

### Best Practices

**1. Keep raw and curated responsibilities separate**
- preserve raw history for replay
- publish trusted tables from a controlled transformation layer

**2. Make the metadata layer authoritative**
- consumers should read tables, not guess which files are current
- schema and ownership belong in the catalog, not tribal knowledge

**3. Design for compaction and maintenance**
- small files, stale snapshots, and fragmented partitions can quietly degrade performance

**4. Be conservative with schema evolution**
- additive changes are usually safer than breaking type changes
- review changes that affect downstream readers across engines

**5. Align workload expectations**
- a lakehouse is strong for analytics and data engineering
- it is not automatically the best store for serving APIs or transactional apps

### Common Pitfalls

**Treating the lakehouse as a product checkbox**
- architecture quality depends on operating discipline, not on a label

**Assuming all engines interpret the table identically**
- feature support can differ across readers and writers

**Ignoring delete and retention semantics**
- privacy requests, rollback needs, and old-snapshot cleanup all need explicit policy

**Overusing tiny streaming writes**
- too many small files can damage read performance and increase maintenance cost

**Letting BI users query raw tables for official metrics**
- raw access is useful, but trusted reporting should come from curated layers

### Good vs Bad

```text
Bad:
├── use one lakehouse table for every workload, including user-facing OLTP
├── let every engine write to the same table without rules
└── assume file storage alone provides governance

Good:
├── define table ownership and allowed write paths
├── publish curated analytical tables with explicit contracts
└── manage compaction, retention, and schema change review deliberately
```

### Real-World Pattern

A common production shape is:
- object storage for durable data files
- a table format such as Iceberg, Delta Lake, or Hudi
- a catalog or metastore for discovery
- Spark, Flink, Trino, or warehouse-connected engines for compute
- separate marts or semantic layers for high-trust business metrics

The vendor mix varies, but these responsibilities appear repeatedly.


# 10. Summary

**A lakehouse tries to close the gap between flexible lake storage and governed analytical tables:**
- it keeps data in object storage
- it adds metadata, snapshots, and transactional publication semantics
- it lets multiple engines read the same governed datasets

**The table layer is the architectural turning point:**
- plain files do not provide stable snapshots, reliable updates, or easy rollback
- metadata makes shared storage safer and more queryable

**Lakehouses still require strong platform discipline:**
- raw, clean, and curated layers need clear boundaries
- schema evolution, compaction, and retention policies are operational concerns, not cleanup work for later

**The lakehouse is a useful pattern, not a universal answer:**
- it is strong for analytical storage, replay, and mixed compute access
- warehouses and operational databases still remain the better fit for many workloads

**Implementation checklist:**

```text
Architecture:
  □ Decide which datasets belong in raw, clean, and curated layers
  □ Choose a table format and catalog model that your engines support well
  □ Keep lakehouse tables for analytics, not primary application writes

Correctness:
  □ Make table metadata the source of truth for current snapshots
  □ Add schema compatibility checks before publish
  □ Use merge, dedupe, or partition-replacement patterns intentionally

Performance:
  □ Choose partition keys from real query patterns
  □ Monitor file counts and compact small files when needed
  □ Track freshness lag, failed commits, and snapshot growth

Governance:
  □ Define ownership for each published table
  □ Apply retention and delete policies deliberately
  □ Keep high-trust reporting on curated tables, not raw landings
```
