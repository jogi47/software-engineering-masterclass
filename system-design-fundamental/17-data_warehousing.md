# Data Warehousing

[← Back to Index](README.md)

Imagine you are building analytics for an e-commerce company. Orders live in PostgreSQL, refunds come from a payments provider, ad spend arrives from CSV exports, and executives want a revenue dashboard that everybody trusts before the 9 AM planning meeting.

Without a warehouse, teams often point BI tools straight at operational systems and assemble metrics ad hoc:

```typescript
// Bad example: analytics logic reads production tables directly and
// re-implements business rules in every report.
async function buildExecutiveRevenueDashboard(db: DatabaseClient) {
  const orders = await db.query("SELECT * FROM orders");
  const refunds = await db.query("SELECT * FROM refunds");
  const campaigns = await db.query("SELECT * FROM marketing_campaigns");

  return {
    grossRevenue: sum(orders.rows.map((row) => row.total_cents)) / 100,
    refundedRevenue: sum(refunds.rows.map((row) => row.amount_cents)) / 100,
    campaigns: campaigns.rows.length,
  };
}
```

This usually fails in predictable ways:
- production databases get hit by analytical scans
- every team defines metrics slightly differently
- historical corrections are hard to reproduce
- dashboards break when source schemas change

This is where a **data warehouse** comes in. A warehouse gives you a dedicated analytical system for integrated, historical, query-friendly data so reporting, BI, and many decision-support workloads stop depending on fragile operational reads.

In this chapter, you will learn:
  * [What problem data warehousing solves](#1-the-problem-data-warehousing-solves)
  * [What a data warehouse is and how it differs from OLTP systems](#2-what-a-data-warehouse-is)
  * [Which concepts and warehouse layers matter most](#3-core-concepts-and-warehouse-layers)
  * [How warehouse architecture and data flow usually work](#4-warehouse-architecture-and-data-flow)
  * [How to model facts, dimensions, and historical changes](#5-modeling-facts-dimensions-and-history)
  * [How loading strategies affect freshness and correctness](#6-loading-strategies-and-data-freshness)
  * [How storage and query optimization improve analytical performance](#7-storage-and-query-optimization)
  * [What practical TypeScript and SQL implementation patterns look like](#8-practical-typescript-and-sql-patterns)
  * [Which best practices prevent common warehouse failures](#9-best-practices-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. The Problem Data Warehousing Solves

Operational systems are optimized for transactions. Analytics workloads are different.

Your application database usually wants:
- fast inserts and updates
- row-level reads and writes
- strong transactional behavior
- schemas normalized for application correctness

Analytical consumers usually want:
- large scans across long time ranges
- joins across many business domains
- consistent metric definitions
- historical views that remain stable over time

### Why Direct Analytics on Production Fails

If analysts and dashboards read production systems directly, a few issues tend to show up:
- dashboards compete with application traffic
- business logic gets copied into many queries
- source tables are shaped for writes, not reporting
- deleted or updated records make historical analysis unreliable

### The Core Idea

```text
Many source systems
  -> extract and standardize data
  -> store integrated historical datasets
  -> expose stable analytical tables
  -> serve BI, reporting, forecasting, and ad hoc analysis
```

### Typical Warehouse Use Cases

- executive and operational dashboards
- finance reporting
- cohort and retention analysis
- sales and marketing attribution
- inventory and supply-chain planning
- historical audit and trend analysis

The warehouse is not meant to replace every data store. It exists so analytical workloads can run where they belong.


# 2. What a Data Warehouse Is

A data warehouse is a system designed to store integrated, historical, query-optimized data for analytics and business intelligence.

### Common Characteristics

A practical warehouse usually provides:
- data integrated from multiple sources
- historical storage over long periods
- SQL-friendly access for analysts and downstream tools
- schemas designed for analytical queries instead of transactional writes
- controls for lineage, governance, and metric consistency

### OLTP vs OLAP

Warehouses are usually discussed in contrast with operational OLTP systems.

```text
┌────────────────────┬────────────────────────────────────────────┬────────────────────────────────────────────┐
│ Dimension          │ OLTP                                       │ OLAP / Warehouse                           │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Main goal          │ Run the application                        │ Analyze the business                       │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Typical queries    │ Short point reads and writes               │ Large scans, joins, aggregates             │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Data shape         │ Often normalized                           │ Often denormalized or dimensional          │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Data horizon       │ Current operational state                  │ Current plus historical context            │
├────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Concurrency style  │ Many small transactions                    │ Fewer but heavier analytical queries       │
└────────────────────┴────────────────────────────────────────────┴────────────────────────────────────────────┘
```

### A Conservative Definition

Not every analytical database is a full warehouse, and not every warehouse looks the same. But the durable pattern is consistent:

```text
Warehouse = integrated data + historical storage + analytical modeling + governed access
```

### What It Is Not

A data warehouse is usually not:
- the source of truth for application writes
- a random copy of production tables with no modeling
- a substitute for raw long-term file retention in every architecture


# 3. Core Concepts and Warehouse Layers

Warehouses become easier to reason about when you separate a few concepts clearly.

### Integrated Data

Different source systems use different identifiers, timestamps, currencies, and states. Warehousing usually starts by reconciling those differences into stable business entities.

Examples:
- mapping `customer_id` from an app database to CRM records
- converting cents and decimal fields to a consistent money model
- standardizing time zones for daily reporting

### Historical Data

Warehouses are valuable because they preserve analytical history even when operational systems change.

Examples:
- a customer changed plan tiers three times
- an order was edited after fulfillment
- a product category mapping was corrected later

### Facts and Dimensions

Most warehouse models revolve around:
- **fact tables** for measurable business events
- **dimension tables** for descriptive context

```text
fact_order_items
  -> measures: quantity, revenue, discount
  -> keys: order_id, customer_key, product_key, date_key

dim_customer
  -> attributes: segment, region, signup_date

dim_product
  -> attributes: category, brand, price_band
```

### Common Warehouse Layers

Many teams use a layered approach similar to:

```text
Sources
  -> staging      raw or lightly standardized extracts
  -> core         cleaned facts and dimensions
  -> marts        business-facing datasets for specific domains
```

The exact names vary, but the separation helps.

### Data Marts

A data mart is a warehouse subset organized around a business area.

Examples:
- finance mart
- growth mart
- supply-chain mart

Marts can make access simpler for analysts, but they should still derive from shared core definitions where possible.


# 4. Warehouse Architecture and Data Flow

Warehouse architecture is usually less about one product and more about a repeatable flow from sources to trusted analytical tables.

### High-Level Flow

```text
┌────────────────┐    ┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│ Source Systems │ -> │ Ingestion      │ -> │ Transform      │ -> │ Data Warehouse │
└────────────────┘    └────────────────┘    └────────────────┘    └────────┬───────┘
 OLTP DBs, APIs,        batch, CDC, files        clean, join, model          │
 logs, SaaS exports                                                        ▼
                                                                     ┌──────────────┐
                                                                     │ BI / Reports │
                                                                     └──────────────┘
```

### Common Components

- source databases and SaaS APIs
- ingestion jobs or CDC pipelines
- staging tables or landing zones
- transformation jobs
- warehouse schemas or marts
- BI tools, notebooks, and downstream services

### Batch and Near-Real-Time

Many warehouses are refreshed in batch:
- hourly
- every few hours
- nightly

Some also support lower-latency ingestion through micro-batch or streaming-adjacent patterns. The right choice depends on how quickly decisions need to reflect new data.

### A Practical Architecture Pattern

```text
Application DB
  -> CDC or incremental extract
  -> staging_orders
  -> transform and deduplicate
  -> fact_orders
  -> finance_mart.daily_revenue
  -> dashboards
```

### Why This Separation Helps

It creates clear boundaries for:
- replaying failed loads
- validating row counts and schema drift
- publishing only trusted datasets
- debugging where data became incorrect


# 5. Modeling Facts, Dimensions, and History

Data modeling is where a warehouse becomes usable rather than merely populated.

### Star Schema

A common analytical pattern is the star schema:

```text
                 dim_date
                    |
                    |
dim_customer -- fact_orders -- dim_product
                    |
                    |
               dim_channel
```

The fact table sits in the center with foreign keys to dimensions. This usually keeps queries understandable and BI tools easier to use.

### Snowflake Schema

Snowflake schemas normalize some dimension tables further.

Example:

```text
fact_orders
  -> dim_product
      -> dim_brand
      -> dim_category
```

This can reduce duplication, but it often adds join complexity. Many teams prefer star schemas for analyst-facing models unless the normalization benefit is strong.

### Grain Matters

Every fact table needs a clear grain, meaning the exact level each row represents.

Examples:
- one row per order
- one row per order item
- one row per page view
- one row per account per day

If grain is ambiguous, aggregates become unreliable.

### Slowly Changing Dimensions

Dimension attributes can change over time. Warehouses need an explicit strategy.

Common approaches:
- Type 1: overwrite old value
- Type 2: preserve history with effective date ranges
- Type 3: keep limited previous-state columns

Type 2 is common when historical correctness matters.

```text
dim_customer
┌──────────────┬─────────┬──────────┬────────────┬────────────┐
│ customer_key │ plan    │ is_curr  │ valid_from │ valid_to   │
├──────────────┼─────────┼──────────┼────────────┼────────────┤
│ 101          │ basic   │ false    │ Jan 01     │ Mar 14     │
│ 145          │ pro     │ true     │ Mar 14     │ null       │
└──────────────┴─────────┴──────────┴────────────┴────────────┘
```

### Surrogate Keys

Dimensions often use warehouse-generated surrogate keys instead of raw source IDs.

Why:
- source IDs may not be globally unique
- multiple source systems may describe the same entity
- historical dimension versions need separate keys


# 6. Loading Strategies and Data Freshness

Warehouse loading is a balance between freshness, cost, correctness, and operational simplicity.

### Full Loads vs Incremental Loads

**Full load**
- rebuild an entire table or partition
- simpler to reason about
- expensive for large datasets

**Incremental load**
- process only new or changed data
- better for scale and frequent refresh
- harder to make correct under retries and late updates

### ETL vs ELT

The distinction is about where transformation happens.

```text
ETL:
  extract -> transform outside the warehouse -> load curated data

ELT:
  extract -> load raw/staging data -> transform inside the warehouse
```

Both patterns are common. ELT is often attractive when warehouse compute is strong and SQL-based transformations are a good fit. ETL can still make sense when transformations need external runtimes, heavy custom logic, or pre-load validation.

### Change Data Capture

For mutable operational tables, CDC can be more reliable than polling `updated_at` alone, especially when deletes and rapid successive updates matter.

```text
Database WAL / binlog
  -> CDC pipeline
  -> staging changes
  -> merge into warehouse fact and dimension tables
```

CDC can improve freshness and deletion handling, but it still requires careful downstream modeling.

### Late Data and Corrections

Warehouse pipelines need explicit policies for:
- late-arriving facts
- corrected source records
- backfills for historical logic changes
- reprocessing after pipeline bugs

### Idempotency Matters

Safe warehouse pipelines are designed so reruns do not silently double-count.

Common techniques:
- merge by stable business key
- overwrite bounded partitions
- stage then swap
- deduplicate on ingest


# 7. Storage and Query Optimization

Warehouses are analytical systems, so physical layout and query shape matter.

### Columnar Storage

Many warehouses use column-oriented storage because analytical queries often read a few columns across many rows.

Example:

```sql
SELECT order_date, SUM(net_revenue)
FROM fact_orders
WHERE order_date >= DATE '2026-03-01'
GROUP BY order_date;
```

A columnar engine can often avoid reading unrelated columns such as free-text notes or JSON payloads.

### Partitioning and Clustering

Common physical optimization choices include:
- partitioning by date
- clustering or sorting by frequently filtered columns
- separating hot and cold data by retention horizon

Good partition keys are usually:
- common filter dimensions
- low to moderate cardinality
- stable and predictable

Bad partition keys are often:
- highly unique fields such as `user_id`
- columns rarely used in predicates

### Aggregate Tables

Not every dashboard should scan the lowest-grain fact table every time.

Example:

```text
fact_order_items
  -> build daily_revenue_by_region
  -> dashboards query the aggregate table
```

This can reduce cost and query latency for repeated BI workloads.

### Concurrency and Workload Isolation

Warehouses often serve:
- scheduled ETL or ELT jobs
- analyst ad hoc queries
- dashboard refreshes
- data science exploration

If these compete without controls, one heavy workload can affect others. Practical systems usually separate workloads with queues, resource groups, or distinct compute settings when the platform supports it.

### Query Design Still Matters

Even good warehouse engines can be used poorly.

Common query mistakes:
- `SELECT *` on wide tables
- repeated joins to raw staging data for dashboards
- no date filter on multi-year fact tables
- high-cardinality joins without a clear need


# 8. Practical TypeScript and SQL Patterns

Warehouse work is often orchestration plus SQL modeling. TypeScript is useful for pipeline control, validation, and metadata-driven jobs.

### TypeScript Example: Incremental Load Orchestration

```typescript
type ExtractWindow = {
  startExclusive: string;
  endInclusive: string;
};

type WarehouseClient = {
  execute(sql: string, params?: unknown[]): Promise<void>;
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
};

async function loadFactOrders(
  warehouse: WarehouseClient,
  window: ExtractWindow,
): Promise<void> {
  await warehouse.execute(
    `
      DELETE FROM staging_orders
      WHERE updated_at > $1 AND updated_at <= $2
    `,
    [window.startExclusive, window.endInclusive],
  );

  await warehouse.execute(
    `
      INSERT INTO staging_orders (
        order_id,
        customer_id,
        order_ts,
        status,
        gross_amount_cents,
        updated_at
      )
      SELECT
        id,
        customer_id,
        created_at,
        status,
        total_cents,
        updated_at
      FROM ext_orders
      WHERE updated_at > $1 AND updated_at <= $2
    `,
    [window.startExclusive, window.endInclusive],
  );

  await warehouse.execute(
    `
      MERGE INTO fact_orders AS target
      USING (
        SELECT
          order_id,
          customer_id,
          DATE(order_ts) AS order_date,
          status,
          gross_amount_cents / 100.0 AS gross_amount,
          updated_at
        FROM staging_orders
      ) AS source
      ON target.order_id = source.order_id
      WHEN MATCHED THEN UPDATE SET
        customer_id = source.customer_id,
        order_date = source.order_date,
        status = source.status,
        gross_amount = source.gross_amount,
        updated_at = source.updated_at
      WHEN NOT MATCHED THEN INSERT (
        order_id,
        customer_id,
        order_date,
        status,
        gross_amount,
        updated_at
      ) VALUES (
        source.order_id,
        source.customer_id,
        source.order_date,
        source.status,
        source.gross_amount,
        source.updated_at
      );
    `,
  );
}
```

This pattern is intentionally simple, but it shows a durable idea:
- land a bounded slice
- transform into warehouse shape
- merge idempotently

Exact `MERGE` syntax varies by warehouse, but the idempotent upsert pattern is broadly useful.

### SQL Example: Fact and Dimension Tables

```sql
CREATE TABLE dim_customer (
    customer_key BIGINT PRIMARY KEY,
    source_customer_id VARCHAR(64) NOT NULL,
    customer_segment VARCHAR(32) NOT NULL,
    region VARCHAR(32) NOT NULL,
    valid_from TIMESTAMP NOT NULL,
    valid_to TIMESTAMP NULL,
    is_current BOOLEAN NOT NULL
);

CREATE TABLE fact_orders (
    order_id VARCHAR(64) PRIMARY KEY,
    customer_key BIGINT NOT NULL,
    order_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL,
    gross_amount NUMERIC(18, 2) NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

In some warehouse platforms, keys and constraints are advisory metadata rather than strictly enforced rules. The important design goal is still the same: model grain and relationships clearly.

### SQL Example: Analytical Query

```sql
SELECT
    d.region,
    f.order_date,
    SUM(f.gross_amount) AS gross_revenue,
    COUNT(*) AS orders
FROM fact_orders AS f
JOIN dim_customer AS d
  ON f.customer_key = d.customer_key
WHERE f.order_date >= DATE '2026-03-01'
GROUP BY d.region, f.order_date
ORDER BY f.order_date, d.region;
```

### TypeScript Example: Data Quality Guardrail

```typescript
type LoadStats = {
  extractedRows: number;
  stagedRows: number;
  mergedRows: number;
};

function assertReasonableLoad(stats: LoadStats): void {
  if (stats.extractedRows !== stats.stagedRows) {
    throw new Error("stage row count does not match extract row count");
  }

  if (stats.mergedRows === 0 && stats.extractedRows > 0) {
    throw new Error("expected warehouse rows to be merged");
  }
}
```

Small checks like this catch warehouse regressions earlier than dashboard complaints do.


# 9. Best Practices and Common Pitfalls

Data warehouses fail less from missing features than from weak operating discipline.

### Good Practices

- define metric owners and publish metric definitions
- separate staging, core, and mart layers
- declare fact grain explicitly in documentation and code
- treat backfills as normal operations, not emergencies
- test transformations for edge cases such as late updates and null keys
- keep lineage visible from source to dashboard
- retain raw enough data to rebuild trusted tables when needed

### Common Pitfalls

**Pitfall: warehouse as a dump of copied source tables**

Result:
- analysts still need to rebuild business logic themselves

Better:
- publish modeled facts, dimensions, and marts

**Pitfall: no agreement on metric definitions**

Result:
- finance, product, and ops all report different revenue numbers

Better:
- centralize important definitions and review changes carefully

**Pitfall: unclear historical semantics**

Result:
- reports silently change when dimension attributes are overwritten

Better:
- choose explicit slowly changing dimension strategies

**Pitfall: freshness promises that the architecture cannot support**

Result:
- constant pipeline churn and disappointed stakeholders

Better:
- align refresh cadence with real business need

### Good vs Bad Warehouse Thinking

```text
Bad:
  -> let every dashboard query staging tables
  -> change metric SQL in place with no review
  -> optimize only for today's dashboard

Good:
  -> publish trusted analytical models
  -> version and review business logic
  -> design for replay, audit, and historical correctness
```

### Real-World Examples

- A marketplace may load orders, refunds, and payouts into a finance mart for settlement reconciliation.
- A SaaS company may model subscriptions, invoices, and account history for retention and expansion reporting.
- A logistics platform may warehouse package scans and route history for SLA analysis and carrier performance.

The products differ, but the durable design goals are similar: trustworthy history, consistent definitions, and analytical performance.


# 10. Summary

**Data warehousing solves an analytical systems problem:**
- operational databases are not a good long-term home for heavy business analysis
- warehouses integrate data from many systems and preserve history for reporting

**A good warehouse depends on modeling as much as storage:**
- clear fact grain, dimensions, marts, and history strategy matter more than copying raw tables
- business metrics become more stable when definitions live in shared models

**Operational discipline is part of the architecture:**
- idempotent loads, quality checks, lineage, and backfill strategy are core design concerns
- freshness should be chosen intentionally rather than assumed

**Implementation checklist:**

```text
Architecture:
  □ Define which analytical workloads belong in the warehouse
  □ Separate ingestion, staging, core models, and marts
  □ Choose batch, micro-batch, or CDC refresh patterns based on actual latency needs

Modeling:
  □ Document fact table grain explicitly
  □ Define dimensions and slowly changing dimension strategy where needed
  □ Publish shared business definitions for key metrics

Data movement:
  □ Choose full-load or incremental-load patterns per dataset
  □ Make loads idempotent with merge, deduplication, or partition overwrite
  □ Plan for backfills and late-arriving corrections

Performance:
  □ Partition and cluster with real query patterns in mind
  □ Use aggregate tables for repeated dashboard workloads
  □ Avoid exposing wide raw staging tables as the main analyst interface

Governance:
  □ Track lineage from source to warehouse models to reports
  □ Add data quality checks and row-count validation
  □ Define ownership, access controls, and retention for important datasets
```
