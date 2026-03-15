# ETL Pipelines

[← Back to Index](README.md)

Imagine you are building a marketplace. Orders are written to PostgreSQL, payments arrive from Stripe webhooks, product events stream through Kafka, and finance wants a trusted revenue dashboard every morning by 7 AM.

Without a proper data pipeline, every consumer starts pulling from production in its own way:

```typescript
// Bad example: every downstream system queries operational data directly.
async function buildRevenueReport(db: DatabaseClient): Promise<ReportRow[]> {
  const orders = await db.query("SELECT * FROM orders");
  const payments = await db.query("SELECT * FROM payments");
  const refunds = await db.query("SELECT * FROM refunds");

  // Each team re-implements joins, cleanup, and business rules differently.
  return reconcileRevenue(orders.rows, payments.rows, refunds.rows);
}
```

This usually ends badly:
- production databases get overloaded by analytical queries
- teams define "revenue" differently
- bad source data leaks downstream
- retries create duplicates or missing records

This is where **ETL pipelines** come in. They move data from source systems to destination systems in a controlled way, transform it into a usable shape, and make downstream analytics and machine learning systems reliable.

In this chapter, you will learn:
  * [What problem ETL solves](#1-the-problem-etl-solves)
  * [How extract, transform, and load fit together](#2-the-three-phases-of-etl)
  * [How to design extraction safely](#3-designing-the-extract-phase)
  * [What belongs in the transformation layer](#4-designing-the-transform-phase)
  * [How loading strategies affect correctness and speed](#5-designing-the-load-phase)
  * [How ETL and ELT differ](#6-etl-vs-elt)
  * [Which pipeline patterns show up in production](#7-common-etl-architectures)
  * [How to handle failures, retries, and idempotency](#8-failure-handling-and-idempotency)
  * [Which practices prevent expensive data-platform mistakes](#9-best-practices-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. The Problem ETL Solves

Operational systems are usually optimized for transactions, not analytics.

Examples:
- PostgreSQL stores normalized order tables for application writes
- Salesforce stores CRM data behind APIs and rate limits
- S3 receives raw log files in semi-structured JSON
- payment providers expose webhooks and settlement exports

Downstream consumers need something different:
- warehouses want denormalized fact and dimension tables
- dashboards want pre-aggregated metrics
- machine learning jobs want cleaned and labeled datasets
- compliance teams want auditable historical snapshots

### Why Direct Access Fails

If every consumer reads each source independently, you create:
- repeated business logic
- inconsistent definitions
- too many source-system connections
- extra load on production databases
- weak lineage and poor debugging

### The Core ETL Idea

```text
Source systems
  -> extract data safely
  -> validate and transform it
  -> load it into a destination optimized for the next workload
```

ETL gives you a dedicated place to:
- centralize business rules
- standardize schemas
- isolate data quality checks
- control retries and backfills
- document lineage

### Typical Destinations

Common ETL targets include:
- data warehouses such as Snowflake, BigQuery, and Redshift
- data lakes on S3, GCS, or ADLS
- search indexes such as Elasticsearch or OpenSearch
- serving databases for reporting APIs


# 2. The Three Phases of ETL

ETL stands for **Extract, Transform, Load**.

### High-Level Flow

```text
┌──────────────┐    ┌────────────────┐    ┌────────────────┐    ┌───────────────┐
│ Source Data  │ -> │ Extract Layer  │ -> │ Transform Layer│ -> │ Load Target   │
└──────────────┘    └────────────────┘    └────────────────┘    └───────────────┘
     OLTP DBs             snapshots,            cleanup,              warehouse,
     APIs, logs           CDC, files            joins, rules          lake, marts
```

### Extract

Read data from a source system without disrupting it.

The extract phase usually decides:
- where the data comes from
- how much data to read
- whether to do full or incremental capture
- how to checkpoint progress

### Transform

Convert raw source data into a shape that downstream systems can trust and query efficiently.

This is where you usually handle:
- schema mapping
- type conversion
- joins and enrichment
- deduplication
- business rules
- quality validation

### Load

Write the final dataset to its destination in a way that is efficient and safe to retry.

The load phase decides:
- append vs overwrite vs merge
- row-by-row writes vs bulk loading
- staging-table patterns
- partitioning and clustering

### A Simple TypeScript Sketch

```typescript
type RawOrder = {
  id: string;
  customer_id: string | null;
  total_cents: number;
  updated_at: string;
};

type WarehouseOrder = {
  orderId: string;
  customerId: string;
  totalDollars: number;
  updatedAt: Date;
};

function transformOrder(raw: RawOrder): WarehouseOrder {
  if (!raw.customer_id) {
    throw new Error(`order ${raw.id} is missing customer_id`);
  }

  return {
    orderId: raw.id,
    customerId: raw.customer_id,
    totalDollars: raw.total_cents / 100,
    updatedAt: new Date(raw.updated_at),
  };
}
```

The example is small, but it shows the core pattern: read raw records, validate assumptions, convert them into a target contract, then persist them.


# 3. Designing the Extract Phase

Extraction looks simple until you do it against real production systems.

### Common Source Types

- relational databases
- SaaS APIs such as Salesforce, Stripe, and HubSpot
- object storage with CSV, Parquet, or JSON files
- event streams such as Kafka or Kinesis
- application logs and clickstream pipelines

### Full Extract vs Incremental Extract

Full extract reads everything each run.

Use it when:
- datasets are small
- correctness matters more than efficiency
- source systems do not support reliable change tracking
- backfilling or rebuilding a target table

Incremental extract reads only new or changed data.

Use it when:
- tables are large
- runs are frequent
- source-system impact matters
- you need near-real-time freshness

### Common Incremental Strategies

**Timestamp-based extraction**

```sql
SELECT id, customer_id, total_cents, updated_at
FROM orders
WHERE updated_at > :last_successful_watermark
ORDER BY updated_at, id;
```

This is simple, but it depends on a trustworthy `updated_at` column.

**Sequence-based extraction**

```sql
SELECT id, event_type, payload
FROM audit_events
WHERE id > :last_seen_id
ORDER BY id;
```

This works well when IDs are monotonic and inserts are append-only.

**Change Data Capture (CDC)**

```text
PostgreSQL WAL / MySQL binlog
  -> Debezium
  -> Kafka
  -> downstream ETL consumers
```

CDC is powerful because it captures inserts, updates, and deletes directly from the database log instead of relying on application columns.

### Protecting the Source System

Good extraction design minimizes production impact:
- use read replicas when possible
- page large API reads
- obey rate limits and retry budgets
- avoid wide full-table scans during peak traffic
- checkpoint progress so partial work is not lost

### Extract Watermarks

Most incremental pipelines need a watermark or high-water mark:

```text
last successful checkpoint
  -> determines the next extract window
  -> must advance only after downstream work is committed
```

If you advance the watermark too early, you can lose data. If you never advance it, you will keep re-reading the same slice.


# 4. Designing the Transform Phase

This is where raw data becomes useful data.

### Common Transformations

- schema normalization
- type conversion
- column renaming
- joins across sources
- deduplication
- aggregation
- enrichment from reference data
- masking or tokenization of sensitive fields

### Data Quality Is Part of the Transform

If you skip validation, bad source data becomes bad warehouse data.

Typical checks include:
- null checks on required fields
- numeric range validation
- timestamp parsing
- foreign-key existence checks
- uniqueness checks on business keys
- business-rule checks such as `order_total = sum(line_items)`

### Good Records vs Bad Records

A practical pattern is to separate valid data from quarantine data:

```text
Raw extract
  -> validation rules
     -> valid rows to curated table
     -> invalid rows to quarantine table + error reason
```

This is usually better than silently dropping records or failing an entire pipeline because one row is malformed.

### TypeScript Example: Validation and Quarantine

```typescript
type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string; raw: unknown };

function validateOrder(raw: RawOrder): ValidationResult<WarehouseOrder> {
  if (!raw.customer_id) {
    return { ok: false, reason: "missing customer_id", raw };
  }

  if (raw.total_cents < 0) {
    return { ok: false, reason: "negative total_cents", raw };
  }

  return {
    ok: true,
    value: transformOrder(raw),
  };
}
```

### Business Logic Drift

Transformation code often contains business definitions that silently become critical:
- what counts as a paid order
- how refunds affect net revenue
- which timezone defines a business day
- when a user becomes "active"

This logic needs the same discipline as application code:
- version control
- code review
- test coverage
- changelog awareness


# 5. Designing the Load Phase

The load phase decides how transformed data lands in the destination system.

### Common Load Modes

**Append**
- good for immutable event logs
- simple and fast
- usually needs downstream deduplication or partition pruning

**Overwrite**
- replace a whole table or partition
- useful for daily snapshots and rebuildable aggregates
- easy to reason about when the partition is bounded

**Merge / Upsert**
- update existing rows and insert new ones
- useful for slowly changing dimensions, mutable orders, or CDC feeds
- requires a stable key and idempotent semantics

### Bulk Loading Beats Row-by-Row Writes

Large ETL systems usually load in batches:

```text
Transform output files in Parquet/CSV
  -> stage in object storage
  -> bulk COPY / LOAD INTO destination
```

Examples:
- `COPY` in PostgreSQL or Redshift
- `LOAD DATA` in MySQL
- staged loads into Snowflake or BigQuery

### Staging Table Pattern

```text
Extracted batch
  -> load into staging table
  -> validate row counts and constraints
  -> merge into final target
```

This pattern helps because it:
- isolates partially loaded data
- supports validation before publication
- makes swaps and retries safer

### SQL Example: Idempotent Merge

```sql
MERGE INTO dw_orders AS target
USING staging_orders AS source
ON target.order_id = source.order_id
WHEN MATCHED THEN UPDATE SET
  customer_id = source.customer_id,
  total_dollars = source.total_dollars,
  updated_at = source.updated_at
WHEN NOT MATCHED THEN INSERT (
  order_id,
  customer_id,
  total_dollars,
  updated_at
) VALUES (
  source.order_id,
  source.customer_id,
  source.total_dollars,
  source.updated_at
);
```

### Partitioning Matters

Loads become easier to manage when the target is partitioned by something meaningful such as:
- business date
- ingestion date
- tenant
- region

Partitioning helps with:
- reloads for a bounded period
- faster queries
- easier retention policies
- lower backfill blast radius


# 6. ETL vs ELT

Modern data stacks often talk about **ELT** instead of ETL.

### ETL: Transform Before Load

```text
Source
  -> ETL compute layer transforms data
  -> cleaned dataset loaded into destination
```

This model was common when warehouses were expensive and transformation needed dedicated middleware.

### ELT: Load Before Transform

```text
Source
  -> raw data loaded into warehouse or lake
  -> SQL/modeling layer transforms data in place
```

This model became more popular as cloud warehouses improved:
- compute scales on demand
- columnar engines handle large scans well
- SQL-based modeling tools such as dbt became common

### Trade-Offs

```
┌────────────────────┬────────────────────────────────────────────┬────────────────────────────────────────────┐
│ Dimension          │ ETL                                        │ ELT                                        │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Transform location │ Before destination load                    │ Inside warehouse or lakehouse              │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Raw data retained  │ Sometimes limited                          │ Usually retained in raw form               │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Reprocessing       │ Often requires re-extract or temp storage  │ Easier if raw data is preserved            │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Source-to-target   │ More controlled before load                │ Faster ingestion, later modeling           │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Best fit           │ Strict middleware, heavy pre-validation    │ Modern analytics platforms and warehouses  │
└────────────────────┴────────────────────────────────────────────┴────────────────────────────────────────────┘
```

### A Practical Rule

Use ETL when:
- data must be cleaned or masked before it lands anywhere else
- the destination is not suited for raw data modeling
- middleware transformations are operationally required

Use ELT when:
- the warehouse is strong enough to do transformations economically
- you want to keep raw data for audit and reprocessing
- analytics engineering works mostly in SQL

In practice, many platforms are hybrid:
- CDC into raw landing tables
- light normalization on ingest
- later transformations into curated models


# 7. Common ETL Architectures

Pipelines are rarely a single script. They are usually orchestrated DAGs with multiple storage layers.

### Directed Acyclic Graph (DAG) Orchestration

```text
extract_orders
  -> stage_orders
  -> transform_orders
  -> load_fact_orders
  -> refresh_dashboard_model
```

Tools such as Airflow, Dagster, and Prefect manage:
- scheduling
- retries
- dependencies
- backfills
- alerting

### Batch Pipeline Pattern

```text
OLTP database
  -> nightly incremental extract
  -> transform job
  -> warehouse fact table
  -> BI dashboards
```

This is still a very common architecture for finance and reporting workflows.

### CDC Pipeline Pattern

```text
┌──────────────┐    ┌──────────┐    ┌──────────────┐    ┌──────────────┐
│ PostgreSQL   │ -> │ Debezium │ -> │ Kafka topic  │ -> │ Warehouse    │
│ WAL          │    │ connector│    │ per table    │    │ merge jobs   │
└──────────────┘    └──────────┘    └──────────────┘    └──────────────┘
```

This supports near-real-time replication and works well for operational analytics.

### Medallion-Style Data Layout

Many lakehouse platforms use a layered model:

```text
Bronze
  -> raw landed data

Silver
  -> cleaned, deduplicated, standardized data

Gold
  -> business-ready aggregates and marts
```

This is not the only valid model, but it gives teams a useful separation between raw ingestion, curation, and business consumption.

### Backfills and Reprocessing

A healthy ETL design makes backfills routine rather than terrifying.

Good patterns:
- process by partition or date range
- separate historical backfill jobs from live ingestion
- preserve raw extracts long enough to replay them
- avoid one giant mutable target if partition replacement works


# 8. Failure Handling and Idempotency

ETL pipelines fail for ordinary reasons:
- source APIs time out
- schemas change unexpectedly
- warehouse loads partially succeed
- one malformed record crashes a transform
- a worker dies mid-batch

### Failure Points Across the Pipeline

```text
Extract failure:
  source unavailable or rate limited

Transform failure:
  parse errors, schema drift, business-rule violations

Load failure:
  unique-key conflict, permission error, partial commit, disk full
```

### Why Idempotency Matters

An ETL run should be safe to retry.

Non-idempotent load:

```sql
INSERT INTO fact_orders (order_id, total_dollars)
VALUES ('o_123', 42.00);
```

Retrying that insert may create duplicates.

Idempotent load:

```sql
INSERT INTO fact_orders (order_id, total_dollars)
VALUES ('o_123', 42.00)
ON CONFLICT (order_id)
DO UPDATE SET total_dollars = EXCLUDED.total_dollars;
```

### Practical Retry Patterns

- retry transient network failures with exponential backoff
- checkpoint only after successful downstream commit
- load into staging before publishing
- reprocess whole partitions instead of individual rows when practical
- use immutable raw storage so you can replay history

### Exactly-Once vs Effectively-Once

In real systems, "exactly-once" is often a marketing term unless the full pipeline semantics support it end to end.

What usually matters is **effectively-once** behavior:
- duplicates may be seen internally
- final published state is correct after retries
- keys, merges, and checkpoints prevent user-visible duplication

### Schema Drift

Source schemas change over time:
- columns are added
- fields change type
- optional data becomes required

If you do not detect this early, pipelines fail at 2 AM or, worse, succeed with corrupted interpretation.

Treat schema evolution as an explicit design concern:
- version schemas
- alert on incompatible changes
- use contract tests for important sources


# 9. Best Practices and Common Pitfalls

### Best Practices

**1. Keep raw data long enough to replay**
- this makes debugging and backfills far easier
- it also supports audit and new downstream use cases

**2. Version pipeline code and schemas**
- ETL logic is production logic
- review it, test it, and deploy it deliberately

**3. Monitor both system health and data quality**
- success or failure of a job is not enough
- row counts, null rates, duplicate rates, and freshness matter too

**4. Prefer bounded, restartable units of work**
- partition by date, hour, tenant, or table chunk
- giant all-or-nothing jobs are harder to recover

**5. Document lineage**
- know where data came from
- know what transformations were applied
- know which dashboards and models depend on it

### Common Pitfalls

**Using the production database as a warehouse**
- analytical queries hurt transactional latency
- teams compete for the same resource with different priorities

**Trusting `updated_at` without verifying semantics**
- some systems forget to update it consistently
- deletes are usually missed entirely

**Hiding bad records**
- silently dropping invalid rows creates false confidence
- quarantine and count them instead

**Advancing checkpoints too early**
- this can skip data permanently after a failure

**Building pipelines that only work forward**
- if you cannot backfill, your system is not operationally mature

### What to Monitor

At minimum, monitor:
- pipeline runtime
- freshness lag
- extracted row counts
- transformed success vs quarantine counts
- load success counts
- duplicate rates
- schema-change events


# 10. Summary

**ETL separates operational systems from analytical and downstream consumers:**
- It extracts data from sources safely.
- It transforms data into a trusted shape.
- It loads data into systems built for analytics, search, or model training.

**Each ETL phase has its own design concerns:**
- Extract focuses on safe reads, incremental capture, and checkpointing.
- Transform focuses on validation, business rules, and schema control.
- Load focuses on bulk efficiency, partitioning, and idempotent publication.

**Modern platforms often blend ETL and ELT:**
- Raw landing zones, CDC, and warehouse-native SQL models commonly coexist.
- The right boundary depends on governance, cost, and platform capability.

**Operational discipline matters as much as code:**
- Watermarks, retries, staging tables, and lineage are what make pipelines reliable in production.
- Data quality monitoring is mandatory, not optional.

**Implementation checklist:**

```text
Pipeline design:
  □ Define source systems, destinations, and data contracts
  □ Choose full extract, incremental extract, or CDC per source
  □ Decide where transformations should happen: ETL, ELT, or hybrid

Correctness:
  □ Track checkpoints or watermarks safely
  □ Make retries idempotent with merge/upsert or partition replacement
  □ Quarantine invalid records instead of silently dropping them

Performance:
  □ Minimize source-system load with replicas, paging, or CDC
  □ Use bulk loads and partitioned targets where possible
  □ Design backfills as bounded, restartable jobs

Operations:
  □ Monitor freshness, row counts, and quality metrics
  □ Alert on schema drift and broken dependencies
  □ Document lineage, ownership, and downstream consumers
```
