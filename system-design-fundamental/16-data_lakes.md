# Data Lakes

[← Back to Index](README.md)

Imagine you are building an analytics platform for a fast-growing product. Mobile apps emit click events, backend services write JSON logs, data scientists want historical snapshots, and finance needs retained raw files for audits.

Without a deliberate lake design, teams often start with a shared bucket and no operating rules:

```typescript
// Bad example: raw files dumped into object storage with no schema,
// partitioning, lineage, or ownership rules.
async function writeEvent(bucket: BlobStore, event: unknown): Promise<void> {
  const fileName = `events/${Date.now()}.json`;
  await bucket.put(fileName, JSON.stringify(event));
}
```

This usually creates predictable problems:
- the same event shape changes silently across producers
- analysts scan too many files because nothing is partitioned well
- duplicate and late-arriving data corrupts downstream reports
- nobody can tell which dataset is trustworthy

This is where a **data lake** comes in. A data lake gives you a durable place to store large volumes of raw and curated data, usually on low-cost object storage, with enough structure around formats, metadata, and governance that the data remains usable over time.

In this chapter, you will learn:
  * [What problem data lakes solve](#1-the-problem-data-lakes-solve)
  * [What a data lake is and what it is not](#2-what-a-data-lake-is)
  * [How storage layers and architecture usually look](#3-storage-layers-and-architecture)
  * [Why file formats, partitioning, and metadata matter](#4-file-formats-partitioning-and-table-metadata)
  * [How data lakes compare with warehouses and lakehouses](#5-data-lakes-vs-data-warehouses-vs-lakehouses)
  * [Which ingestion and processing patterns are common](#6-ingestion-and-processing-patterns)
  * [How governance, catalogs, and security keep lakes usable](#7-governance-catalogs-and-security)
  * [What practical implementation patterns look like in TypeScript](#8-practical-typescript-patterns)
  * [Which best practices prevent a data swamp](#9-best-practices-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. The Problem Data Lakes Solve

Modern systems produce more data than transactional databases or ad hoc exports handle comfortably.

Typical sources include:
- application logs
- clickstream and mobile telemetry
- IoT sensor events
- CDC feeds from operational databases
- CSV and Parquet files from partners
- ML features and training snapshots

These workloads create three recurring requirements:
- store very large datasets cheaply
- keep raw history for replay, audit, or future use
- support multiple downstream consumers with different access patterns

### Why Ad Hoc Storage Fails

If every team lands files differently, the storage layer becomes hard to trust:

```text
team-a/
  -> json files with eventTime
team-b/
  -> csv files with timestamp
team-c/
  -> gzip files with no schema docs
```

This causes:
- inconsistent schemas
- weak discoverability
- expensive scans
- poor lineage
- duplicated transformation logic

### The Core Idea

```text
Many producers
  -> land raw data durably
  -> register metadata and ownership
  -> clean and standardize important datasets
  -> expose trusted tables to downstream consumers
```

A data lake is useful because it separates **cheap long-term storage** from **how different engines read and process that storage**.


# 2. What a Data Lake Is

A data lake is a storage-centered analytics platform, usually built on object storage such as S3, GCS, or Azure Blob/ADLS, that holds raw, semi-structured, and structured data for later processing.

### What Makes It a Lake

A practical data lake usually includes:
- durable object storage
- datasets organized by prefixes, partitions, or tables
- metadata about schema, partitions, and ownership
- batch or stream ingestion paths
- query engines or processing engines on top

### What It Is Not

A data lake is not merely:
- a random bucket full of files
- a replacement for every transactional database
- automatically governed just because files live in cloud storage

### A Useful Mental Model

```text
Storage layer:
  object storage holds files durably and cheaply

Metadata layer:
  catalog tracks schemas, partitions, and table definitions

Compute layer:
  query engines and processing jobs read the same underlying files
```

### Why Teams Adopt Lakes

Common reasons:
- raw data retention is cheaper than warehouse storage for some workloads
- new downstream use cases appear after the data is already collected
- multiple engines may need access to the same dataset
- files such as Parquet are efficient for analytics and archival

This flexibility is valuable, but it only helps if the lake has enough standards to stay queryable.


# 3. Storage Layers and Architecture

Most production lakes use layered storage rather than a single undifferentiated folder tree.

### A Common Layered Layout

```text
┌──────────────┐
│ Source data  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Raw / Bronze │  immutable landings, minimal validation
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Clean/Silver │  standardized schema, deduplication, enrichment
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Gold / Marts │  business-ready aggregates and curated tables
└──────────────┘
```

This bronze-silver-gold naming is common, but the names matter less than the separation of concerns.

### Why Layers Help

They let you:
- preserve original input for replay
- fix bad data without rewriting history
- publish trusted datasets separately from raw landings
- apply different retention, quality, and access rules per layer

### Example Folder Layout

```text
data-lake/
├── raw/
│   └── clickstream/
│       └── dt=2026-03-15/
├── clean/
│   └── clickstream_events/
│       └── dt=2026-03-15/
└── curated/
    └── daily_active_users/
        └── dt=2026-03-15/
```

### Storage Principles

Durable lake storage usually works best when you:
- treat landed files as immutable
- write new partitions instead of mutating random files
- keep naming and partition rules predictable
- make deletion and retention policies explicit

Mutable datasets are still possible, but they need stronger table metadata and compaction discipline.


# 4. File Formats, Partitioning, and Table Metadata

The usefulness of a data lake depends heavily on how data is physically stored.

### File Formats

Common choices:
- `CSV` for interoperability, but it is weak on schema and efficiency
- `JSON` for semi-structured raw events, but it is expensive to scan at scale
- `Avro` for row-oriented data with schema support
- `Parquet` for columnar analytics workloads
- `ORC` for columnar analytics in some ecosystems

For analytics datasets, columnar formats such as Parquet are often preferred because they reduce scan cost and improve predicate pushdown.

### Partitioning

Partitioning reduces the amount of data a query needs to read.

Example:

```text
events/
├── dt=2026-03-13/
├── dt=2026-03-14/
└── dt=2026-03-15/
```

If most queries filter by date, this layout can avoid scanning unrelated partitions.

### Partitioning Trade-Offs

Good partition keys are:
- commonly filtered
- reasonably bounded in cardinality
- stable over time

Bad partition keys are often:
- extremely high-cardinality, such as `user_id`
- unrelated to query patterns
- too coarse, which forces large scans

### Metadata and Table Formats

Raw files alone are not enough for reliable analytics. Most mature lakes also use metadata about:
- schema versions
- partition locations
- statistics
- ownership
- table snapshots

Modern table formats such as Iceberg, Delta Lake, and Hudi add transaction-style metadata on top of lake files. The exact tool varies by platform, but the durable idea is the same: metadata helps readers agree on which files belong to a table at a given point in time.

### Comparison Table

```text
┌────────────────────┬────────────────────────────────────────────┬────────────────────────────────────────────┐
│ Choice             │ Good Fit                                   │ Trade-Off                                  │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ JSON               │ Raw landing, semi-structured events        │ Large scans, weak typing                   │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ CSV                │ Simple exports, interoperability           │ Weak schema, quoting edge cases            │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Parquet            │ Analytics, large scans, column pruning     │ Harder to inspect manually                 │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Hive-style paths   │ Simple partition discovery                 │ Limited table-level guarantees             │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Table formats      │ ACID-like snapshots, evolution, compaction │ More metadata and operational complexity   │
└────────────────────┴────────────────────────────────────────────┴────────────────────────────────────────────┘
```


# 5. Data Lakes vs Data Warehouses vs Lakehouses

These terms overlap in practice, but they are not identical.

### Data Lake

Focus:
- low-cost durable storage
- support for many file types
- separation of storage from compute

Best fit:
- raw data retention
- exploratory analytics
- large historical archives
- ML training data

### Data Warehouse

Focus:
- strongly modeled analytical tables
- SQL-first access
- managed performance for BI workloads

Best fit:
- curated reporting
- business metrics
- consistent SQL semantics for analysts

### Lakehouse

The term usually describes a lake storage foundation plus table metadata and query semantics that make it behave more like a warehouse for some workloads.

### Practical Comparison

```text
┌────────────────────┬────────────────────────────────────────────┬────────────────────────────────────────────┐
│ Dimension          │ Data Lake                                  │ Data Warehouse                             │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Primary storage    │ Files on object storage                    │ Managed analytical tables                  │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Raw data support   │ Strong                                     │ Usually less flexible                      │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Schema discipline  │ Varies by governance                       │ Usually stronger by default                │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Compute model      │ Separate engines can read same data        │ Usually tightly managed by the platform    │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Typical strength   │ Retention, openness, flexibility           │ BI performance, consistency, simplicity    │
└────────────────────┴────────────────────────────────────────────┴────────────────────────────────────────────┘
```

### A Conservative Rule

Use a lake when:
- you need durable raw data retention
- multiple processing engines or teams need shared access
- storage cost and format flexibility matter

Use a warehouse when:
- business reporting and governed SQL access are the main goal
- you want more opinions from the platform
- analysts need a stable curated interface

In practice, many organizations use both.


# 6. Ingestion and Processing Patterns

Data lakes are only useful if data lands predictably and can be transformed safely.

### Common Ingestion Models

**Batch file landing**
- partner uploads
- daily exports
- scheduled database snapshots

**Incremental batch**
- hourly extracts
- partitioned append jobs
- bounded reprocessing windows

**Streaming ingestion**
- Kafka or Kinesis consumers
- CDC pipelines
- near-real-time event landing

### A Typical End-to-End Flow

```text
Operational systems
  -> raw landing zone
  -> schema validation
  -> deduplication and standardization
  -> curated analytical tables
  -> dashboards, notebooks, ML jobs
```

### Batch and Stream Can Coexist

Many lake architectures mix both:
- stream ingestion for freshness
- batch compaction for efficient files
- scheduled quality checks and downstream builds

### Compaction Matters

Object stores handle many files well, but analytics engines often do not perform well with huge numbers of tiny files.

Small-file problem:

```text
10,000 files x 100 KB each
  -> high metadata overhead
  -> poor scan efficiency

10 files x 100 MB each
  -> usually better for analytics engines
```

This is why compaction and file-size management are common maintenance tasks in mature lakes.


# 7. Governance, Catalogs, and Security

Without governance, a lake often turns into a data swamp: lots of files, little trust.

### What Governance Covers

At minimum:
- dataset ownership
- schema contracts
- data classification
- retention rules
- lineage
- access controls

### Catalogs

A catalog makes datasets discoverable and queryable by storing metadata such as:
- table name
- schema
- partition definitions
- storage location
- owner
- update cadence

### Security Model

Security usually needs multiple layers:

```text
Identity and access:
  who can list or read paths

Table or column controls:
  who can query sensitive fields

Data protection:
  encryption at rest and in transit

Governance workflow:
  classification, approvals, audit logs
```

### Sensitive Data

It is usually safer to assume raw landings may contain sensitive fields until proven otherwise.

Common controls:
- tokenize or hash identifiers when possible
- mask restricted columns in curated layers
- avoid broad bucket-level access for every analyst
- log access to regulated datasets

### Schema Evolution

Schemas change over time. Governed lakes handle this explicitly:
- compatible additions may be allowed
- breaking changes should be versioned or coordinated
- downstream consumers need contract visibility


# 8. Practical TypeScript Patterns

The storage engine may vary, but some application-side patterns are durable.

### Example: Stable Partition Path Builder

```typescript
type LakeLayer = "raw" | "clean" | "curated";

interface PartitionSpec {
  dataset: string;
  date: string; // YYYY-MM-DD
  tenant?: string;
}

function buildPartitionPath(layer: LakeLayer, spec: PartitionSpec): string {
  const segments = [`${layer}`, spec.dataset, `dt=${spec.date}`];

  if (spec.tenant) {
    segments.push(`tenant=${spec.tenant}`);
  }

  return segments.join("/");
}
```

This keeps partition naming consistent across ingestion jobs.

### Example: Schema Version Gate

```typescript
interface EventEnvelope<TPayload> {
  schemaVersion: number;
  eventType: string;
  occurredAt: string;
  payload: TPayload;
}

function assertSupportedVersion(
  envelope: EventEnvelope<unknown>,
  supportedVersions: ReadonlySet<number>,
): void {
  if (!supportedVersions.has(envelope.schemaVersion)) {
    throw new Error(
      `Unsupported schema version ${envelope.schemaVersion} for ${envelope.eventType}`,
    );
  }
}
```

This is a small but useful guardrail when many producers write to the same lake.

### Example: Idempotent Manifest Tracking

```typescript
interface LandedFile {
  path: string;
  checksum: string;
  sourceBatchId: string;
}

class ManifestStore {
  private readonly seenChecksums = new Set<string>();

  markProcessed(file: LandedFile): boolean {
    if (this.seenChecksums.has(file.checksum)) {
      return false;
    }

    this.seenChecksums.add(file.checksum);
    return true;
  }
}
```

Real systems persist this state in a database or table, but the pattern matters: retries should not publish duplicate data silently.

### Example: Curated Dataset Validation

```typescript
type OrderEvent = {
  orderId: string;
  customerId: string | null;
  totalCents: number;
};

function validateOrderEvent(event: OrderEvent): string[] {
  const errors: string[] = [];

  if (!event.orderId) {
    errors.push("missing orderId");
  }

  if (!event.customerId) {
    errors.push("missing customerId");
  }

  if (event.totalCents < 0) {
    errors.push("totalCents must be non-negative");
  }

  return errors;
}
```

Lake ingestion is not just file movement. It also needs contracts, validation, and repeatable publication rules.


# 9. Best Practices and Common Pitfalls

### Best Practices

**1. Keep raw and curated data separate**
- raw landing should preserve original input
- curated tables should carry stronger quality guarantees

**2. Optimize for replay**
- immutable raw files and stable partitions make backfills routine
- deleting history too early makes debugging expensive

**3. Standardize formats where value is highest**
- raw JSON may be fine at ingest
- curated analytics tables usually benefit from Parquet or equivalent columnar storage

**4. Treat metadata as part of the platform**
- catalogs, ownership, and schema contracts are not optional extras

**5. Monitor freshness and quality, not only job success**
- successful ingestion can still produce broken data

### Common Pitfalls

**Using the lake as an ungoverned dump**
- cheap storage does not create trustworthy datasets
- discoverability and ownership degrade quickly

**Over-partitioning**
- very high-cardinality paths create too many small partitions and files

**Ignoring small files**
- scans slow down
- compaction debt grows silently

**Mixing raw and business-ready data**
- consumers cannot tell what is safe to use

**Assuming schema changes are harmless**
- one producer change can break many downstream readers

### Good vs Bad

```text
Bad:
├── every producer chooses its own file naming rules
├── analysts query raw folders directly for official metrics
└── no one owns schema compatibility

Good:
├── raw, clean, and curated layers have distinct purposes
├── catalogs and contracts describe trusted datasets
└── partitioning, file size, and retention are managed deliberately
```

### Real-World Pattern

A common production setup looks like:
- object storage for durable files
- a catalog service for table metadata
- a stream or batch ingestion layer
- Spark, Trino, Flink, or warehouse engines for compute
- quality checks and ownership metadata around curated datasets

The exact vendors vary, but these responsibilities show up consistently.


# 10. Summary

**Data lakes solve the storage and reuse problem for large analytical datasets:**
- They keep raw and curated data on durable, low-cost storage.
- They support structured and semi-structured data.
- They let multiple compute engines work over shared files.

**A useful lake needs more than a bucket:**
- File formats, partitioning, metadata, and governance determine whether the lake stays queryable.
- Raw, clean, and curated layers help separate retention from trust.

**Metadata and operational discipline are central:**
- Catalogs, schema evolution rules, deduplication, and compaction are part of the design, not cleanup work for later.
- Security and classification matter because raw data often contains sensitive information.

**Data lakes and warehouses are complementary in many systems:**
- Lakes are strong for retention, openness, and flexibility.
- Warehouses are strong for governed analytical access and stable BI semantics.

**Implementation checklist:**

```text
Storage design:
  □ Define raw, clean, and curated layers clearly
  □ Choose file formats per use case, not by habit
  □ Pick partition keys that match real query patterns

Metadata and correctness:
  □ Register schemas, ownership, and update cadence in a catalog
  □ Handle schema evolution explicitly
  □ Make ingestion idempotent and replay-friendly

Performance:
  □ Watch file counts and compact small files when needed
  □ Prefer columnar formats for curated analytics datasets
  □ Keep partition layouts stable and easy to reason about

Governance:
  □ Classify sensitive data early
  □ Apply access controls at storage and table layers
  □ Monitor freshness, quality, and downstream trust signals
```
