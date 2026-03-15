# Chapter 3: Storage and Retrieval

## Introduction

A database needs to do two fundamental things:
1. **Store data** when you give it data
2. **Give data back** when you ask for it later

This chapter explores how databases do this internally. Why should an application developer care? Because:
- You need to select an appropriate storage engine for your workload
- You need to tune the storage engine for your application's access patterns
- Understanding internals helps you predict performance

There's a big difference between storage engines optimized for:
- **Transactional workloads (OLTP)**: Many small reads and writes, looking up records by key
- **Analytical workloads (OLAP)**: Fewer queries, but each scans millions of records

---

## Data Structures That Power Your Database

### The World's Simplest Database

Let's start with the simplest possible database - two bash functions:

```bash
#!/bin/bash

db_set() {
    echo "$1,$2" >> database
}

db_get() {
    grep "^$1," database | sed -e "s/^$1,//" | tail -n 1
}
```

**Usage:**
```bash
$ db_set 123456 '{"name":"London","attractions":["Big Ben"]}'
$ db_get 123456
{"name":"London","attractions":["Big Ben"]}
```

**How it works:**
- `db_set`: Appends key,value to end of file (very fast! O(1))
- `db_get`: Scans entire file looking for key (very slow! O(n))

**The performance problem:** Every `db_get` must scan the entire file. With millions of records, this is unacceptably slow.

**The solution: Indexes**

An index is an additional data structure derived from the primary data. It helps locate data quickly without scanning everything.

**The trade-off:** Indexes speed up reads but slow down writes (every write must update the index). This is why databases don't index everything by default - you choose indexes based on your query patterns.

---

## Hash Indexes

### How It Works

The simplest indexing strategy: keep an in-memory hash map where:
- Key = the data key
- Value = byte offset in the data file

```
Hash Map (in memory)
┌─────────┬────────────┐
│   Key   │   Offset   │
├─────────┼────────────┤
│  "dog"  │    0       │
│  "cat"  │   64       │
│  "cow"  │  128       │
└─────────┴────────────┘

Data File (on disk)
┌────────────────────────────────────────────────────────────────┐
│ 0: dog,{"breed":"labrador"} │ 64: cat,{"color":"orange"} │ ... │
└────────────────────────────────────────────────────────────────┘
```

**Read:** Look up key in hash map → get offset → seek to that position → read value

**Write:** Append to file → update hash map with new offset

This is essentially what **Bitcask** (the storage engine in Riak) does.

### Real-World Usage

This simple approach works surprisingly well for workloads where:
- The value for each key is updated frequently
- There aren't too many distinct keys (must fit in memory)

**Example:** Video view counters
- Key = video URL
- Value = number of views (updated millions of times per day)
- Lots of writes, but not many distinct keys

### Managing the Log File

The data file keeps growing forever. How do we avoid running out of disk space?

**Solution: Segment files with compaction**

1. Break the log into segments of a certain size
2. When segment reaches max size, close it and start a new one
3. Perform **compaction** on closed segments: throw away duplicate keys, keep only most recent value

```
Before compaction:
┌──────────────────────────────────────────────────────────────┐
│ dog:1 │ cat:2 │ dog:3 │ cat:4 │ dog:5 │ cat:6 │ dog:7 │ ... │
└──────────────────────────────────────────────────────────────┘

After compaction:
┌─────────────────────┐
│ dog:7 │ cat:6 │ ... │
└─────────────────────┘
```

4. **Merge** multiple segments together during compaction
5. Old segments can be deleted once merge is complete

**Compaction runs in background** - reads continue from old segments until merge is complete.

### Practical Considerations

Real implementations need to handle:

**File format:** Binary is more efficient than CSV. Encode length of string, then raw bytes.

**Deleting records:** Append a special "tombstone" marker. During compaction, discard keys with tombstones.

**Crash recovery:** In-memory hash map is lost on restart. Options:
- Scan segment files to rebuild (slow)
- Store snapshots of hash map on disk (faster)

**Partially written records:** Use checksums to detect and ignore corrupted data.

**Concurrency:** Only one writer thread (appends are sequential). Multiple readers can read concurrently.

### Limitations of Hash Indexes

1. **Hash table must fit in memory.** If you have billions of keys, this won't work.

2. **Range queries are inefficient.** You can't easily find all keys between `kitty00000` and `kitty99999` - you'd have to look up each key individually.

---

## SSTables and LSM-Trees

### Sorted String Tables (SSTables)

What if we change one thing about our segment files: **require that keys are sorted by key within each segment**?

This format is called a **Sorted String Table** or SSTable.

**Advantages over hash indexes:**

1. **Merging segments is efficient**
   - Just merge-sort the segments (like merge step in merge sort)
   - If same key appears in multiple segments, keep the one from most recent segment

```
Segment 1:  cat:2, cow:5, dog:7
Segment 2:  ant:1, cat:3, zebra:9

Merged:     ant:1, cat:3, cow:5, dog:7, zebra:9
            (cat:3 from segment 2 wins over cat:2 from segment 1)
```

2. **Don't need to keep all keys in memory**
   - Keep a sparse in-memory index (every few thousand keys)
   - To find a key, find its position in the sparse index, then scan from there

```
Sparse Index:        Offset
┌────────────────────────────┐
│ apple      │    0          │
│ elephant   │  4096         │
│ zebra      │  8192         │
└────────────────────────────┘

To find "dog":
1. "dog" is between "apple" and "elephant"
2. Scan from offset 0 until we find "dog"
```

3. **Can compress blocks before writing**
   - Group records into blocks, compress each block
   - Sparse index points to start of compressed blocks
   - Saves disk space and I/O bandwidth

### Constructing SSTables: LSM-Trees

How do we get data sorted by key when writes come in any order?

We can't sort a log file (that would require random writes). Instead, use an **in-memory balanced tree** (red-black tree, AVL tree, etc.):

**The LSM-Tree algorithm:**

1. **Write:** Add key-value pair to an in-memory balanced tree (called a **memtable**)

2. When memtable exceeds a threshold (e.g., a few megabytes):
   - Write it to disk as an SSTable file (already sorted!)
   - Start a new memtable for incoming writes

3. **Read:**
   - First check memtable
   - Then check most recent SSTable
   - Then check next-older SSTable
   - And so on...

4. **Background:** Periodically merge and compact SSTables

```
┌─────────────────────────────────────────────────────────────────┐
│  Writes → [Memtable (in memory, sorted tree)]                   │
│               │                                                  │
│               ▼ (when full)                                     │
│  [SSTable 1] [SSTable 2] [SSTable 3] ... (on disk, immutable)  │
│               │                                                  │
│               ▼ (background)                                    │
│  [Merged/Compacted SSTables]                                    │
└─────────────────────────────────────────────────────────────────┘
```

**Crash recovery:** If the machine crashes, the memtable is lost. Solution: Keep a separate append-only log for crash recovery. Every write goes to both the memtable and the log. After memtable is written to SSTable, the log can be discarded.

### LSM-Tree Optimizations

**Problem: Looking for a key that doesn't exist**

If a key doesn't exist, we have to check memtable + ALL SSTables before we know it's not there. This is slow.

**Solution: Bloom filters**

A Bloom filter is a memory-efficient data structure that can tell you:
- "This key definitely does NOT exist" (with certainty)
- "This key MIGHT exist" (with some probability of false positive)

Before checking SSTables, check the Bloom filter. If it says the key doesn't exist, we're done.

**Compaction Strategies:**

**Size-tiered compaction** (HBase, Cassandra default):
- Newer, smaller SSTables are merged into older, larger ones
- Good for write-heavy workloads

**Leveled compaction** (LevelDB, RocksDB, Cassandra option):
- Key range is split into smaller SSTables
- Older data is moved into "levels" which are further broken into smaller files
- Better space efficiency, more predictable reads

### LSM-Tree Products

- **LevelDB** (Google)
- **RocksDB** (Facebook fork of LevelDB)
- **Cassandra** (originally Facebook)
- **HBase** (based on Google BigTable)
- **Lucene** (full-text search engine used by Elasticsearch and Solr)

---

## B-Trees

### The Most Widely Used Index

B-Trees have been the standard index implementation for almost all relational databases (and many non-relational ones) for decades.

Like SSTables, B-Trees keep key-value pairs sorted by key, enabling efficient lookups and range queries. But the design is very different.

### How B-Trees Work

**Structure:**
- B-Trees break the database into fixed-size **pages** (traditionally 4 KB)
- Each page can be identified by an address (like a pointer)
- Pages can reference other pages

```
                    [Root Page]
                 /       |       \
                /        |        \
    [Page: A-F]    [Page: G-N]    [Page: O-Z]
       /    \          /   \          /    \
   [Leaf]  [Leaf]  [Leaf] [Leaf]  [Leaf]  [Leaf]
```

- **Root page:** Starting point for all lookups
- **Internal pages:** Contain keys and references to child pages
- **Leaf pages:** Contain actual key-value pairs (or references to where values are stored)

**Lookup:**
1. Start at root
2. Find the range that contains your key
3. Follow the reference to child page
4. Repeat until you reach a leaf page
5. Read the value

**Branching factor:** The number of references in each page. Typically several hundred. This means a 4-level tree can store up to 256 TB with 4KB pages and branching factor 500.

### B-Tree Writes

**Updating a value:**
1. Find the leaf page containing the key
2. Change the value in that page
3. Write the page back to disk

**Adding a new key:**
1. Find the leaf page where the key should go
2. If there's space, add the key and write the page
3. If full, split the page into two half-full pages
4. Update the parent page to account for the new page

```
Before split:
[Parent: ... M ...]
       │
[Leaf: K L M N O P Q R] ← full!

After split:
[Parent: ... M O ...]
       │       │
[Leaf: K L M N] [Leaf: O P Q R]
```

**The tree remains balanced** - all leaf pages are at the same depth.

### B-Tree Reliability

**The problem with in-place updates:**

Unlike LSM-trees (which only append), B-trees modify pages in place. What if the machine crashes in the middle of writing a page?

**Solution: Write-Ahead Log (WAL)**

Also called a redo log. Before any B-tree modification:
1. Append the intended change to the WAL
2. Then modify the B-tree pages

On crash recovery:
- Replay the WAL to bring B-tree back to consistent state

**Concurrency control:**

Multiple threads accessing the B-tree simultaneously could see inconsistent data.

Solution: Use **latches** (lightweight locks) on pages being modified. More complex than LSM-trees where the memtable is the only mutable structure.

### B-Tree Optimizations

Over decades, many optimizations have been developed:

1. **Copy-on-write** instead of WAL: Modified pages are written to new location, then parent is updated atomically. Used by LMDB, BoltDB.

2. **Abbreviate keys** to save space in internal pages, increasing branching factor.

3. **Lay out leaf pages sequentially** on disk to improve range query performance.

4. **Add sibling pointers** between leaf pages to avoid going back to parent for range scans.

5. **Fractal trees** borrow ideas from LSM-trees to reduce write amplification.

---

## B-Trees vs LSM-Trees

### LSM-Tree Advantages

**Higher write throughput**
- LSM-trees turn random writes into sequential writes
- SSDs and HDDs both perform sequential writes much faster
- Can sustain higher write rates

**Better compression**
- B-tree pages can be fragmented (partially empty after deletions)
- LSM-tree compaction produces tightly packed files
- Often results in smaller files on disk

**Lower write amplification (sometimes)**
- Write amplification = how many disk writes per database write
- B-trees write data at least twice (WAL + page)
- LSM-trees can be lower depending on compaction

### B-Tree Advantages

**Faster reads (generally)**
- B-tree: Key is in exactly one place
- LSM-tree: May need to check memtable + multiple SSTables
- B-tree reads are more predictable

**More predictable performance**
- LSM-tree compaction can interfere with ongoing reads/writes
- B-trees have less background work

**Each key exists in one place**
- Important for transactional semantics
- Easier to implement strong isolation

**More mature**
- Decades of optimization
- Better tooling and operational experience

### The Bottom Line

Both are good options. The choice depends on your workload:
- **Write-heavy:** Consider LSM-tree
- **Read-heavy:** Consider B-tree
- **Transactional:** B-tree might be simpler
- **Analytics:** LSM-tree's compression is attractive

Most importantly: **test with your actual workload!**

---

## Other Indexing Structures

### Secondary Indexes

So far we've discussed primary key indexes. But you often need to search by other fields.

**Example:** Find all articles written by user 123

**Secondary index:** An additional index on a non-primary-key column.

The main difference: Keys in secondary indexes are not unique. Multiple rows might have the same value.

**Two approaches:**
1. Store list of row identifiers in each index entry
2. Make each entry unique by appending a row identifier to the key

### Storing Values in the Index

**Clustered index:** The row data is stored within the index (not in a separate heap file).

**Non-clustered index (heap file):** Index stores a reference to where the row is stored.

**Covering index (index with included columns):** Index stores some columns of the row, so some queries can be answered from the index alone.

### Multi-Column Indexes

**Concatenated index:** Combine multiple fields into one key

```
Index on (last_name, first_name):
- "Adams, John"
- "Adams, Samuel"
- "Smith, Alice"
- "Smith, Bob"
```

Can efficiently find "all people with last_name = Smith", but NOT "all people with first_name = John".

**Multi-dimensional indexes (R-trees):**
- Used for geospatial data
- Query: "Find all restaurants within 2 miles of me"
- Or: "Find products with price between $10-$20 and rating > 4"

### Full-Text Search

Full-text search is a whole different world of indexes:
- Handle synonyms (car/automobile)
- Handle grammatical variations (run/running/ran)
- Handle typos (fuzzy search)
- Rank by relevance

**Lucene** (used by Elasticsearch, Solr) uses a structure similar to SSTables with additional metadata.

### In-Memory Databases

Why not keep everything in memory?

**Products:** VoltDB, MemSQL, Redis, Couchbase, RAMCloud

**Benefits:**
- Avoid encoding overhead (can use in-memory data structures directly)
- Can implement data structures impossible on disk (Redis sorted sets, priority queues)

**Durability approaches:**
- Special hardware (battery-backed RAM)
- Write logs to disk
- Replicate to other machines
- Periodic snapshots

**Important insight:** In-memory databases are faster not because they avoid disk reads (the OS page cache handles that), but because they avoid the overhead of encoding data for disk storage.

---

## Transaction Processing vs Analytics

### Two Different Worlds

| Property | OLTP | OLAP |
|----------|------|------|
| Main read pattern | Small number of records by key | Aggregate over many records |
| Main write pattern | Random-access, low-latency | Bulk import or event stream |
| Used by | End user via web app | Internal analyst for decisions |
| Data represents | Latest state | History of events |
| Dataset size | GB to TB | TB to PB |

**OLTP Example:** "Show me user 123's shopping cart"

**OLAP Example:** "What was total revenue per store per month in the past year?"

### Data Warehousing

In the 1990s, companies started creating separate databases for analytics:
- Don't run expensive analytical queries on production OLTP database
- Transform data into a schema optimized for analytics
- Can optimize storage engine differently

**ETL (Extract-Transform-Load):**
```
OLTP databases → Extract → Transform → Load → Data Warehouse
```

### Schemas for Analytics

**Star Schema (Dimensional Modeling):**

```
                    ┌─────────────────┐
                    │   Fact Table    │
                    │  (fact_sales)   │
                    ├─────────────────┤
    ┌───────────────│ date_key       │───────────────┐
    │               │ product_key    │               │
    │   ┌───────────│ store_key      │───────────┐   │
    │   │           │ customer_key   │           │   │
    │   │   ┌───────│ quantity       │───────┐   │   │
    ▼   ▼   │       │ price          │       │   ▼   ▼
┌──────┐ ┌──────┐   │ discount       │   ┌──────┐ ┌──────┐
│dim_  │ │dim_  │   └─────────────────┘   │dim_  │ │dim_  │
│date  │ │product│                        │store │ │cust- │
└──────┘ └──────┘                         └──────┘ │omer  │
                                                   └──────┘
```

**Fact table:** Central table with events (sales, page views, etc.). Can have billions of rows.

**Dimension tables:** Smaller tables describing the who, what, when, where of events.

**Why "star"?** The fact table in the center with dimension tables radiating out like a star.

**Snowflake schema:** Dimensions further normalized into sub-dimensions. More complex but less redundancy.

---

## Column-Oriented Storage

### The Problem with Row Storage

Analytics queries often look like:
```sql
SELECT product_id, SUM(quantity * price) AS revenue
FROM fact_sales
WHERE date BETWEEN '2023-01-01' AND '2023-12-31'
GROUP BY product_id;
```

This query:
- Reads billions of rows
- But only needs 3 columns (date, product_id, quantity, price)

**Row-oriented storage:** All columns of each row stored together.

To answer this query, you must:
1. Load entire rows from disk
2. Parse all columns
3. Discard most columns
4. Keep only the ones you need

Huge waste of disk I/O!

### Column-Oriented Storage

Store all values of each column together:

```
Row storage:
Row 1: [date1, product1, store1, customer1, qty1, price1]
Row 2: [date2, product2, store2, customer2, qty2, price2]
Row 3: [date3, product3, store3, customer3, qty3, price3]

Column storage:
date:     [date1, date2, date3, ...]
product:  [product1, product2, product3, ...]
store:    [store1, store2, store3, ...]
customer: [customer1, customer2, customer3, ...]
qty:      [qty1, qty2, qty3, ...]
price:    [price1, price2, price3, ...]
```

Now the query only loads: date, product, qty, price columns. Much less data!

### Column Compression

Values in a column are often similar, which makes compression very effective.

**Bitmap encoding:**

If a column has few distinct values (e.g., country in a sales table):

```
Values:  [USA, USA, UK, USA, UK, UK, France, USA]

Bitmap for USA:    [1, 1, 0, 1, 0, 0, 0, 1]
Bitmap for UK:     [0, 0, 1, 0, 1, 1, 0, 0]
Bitmap for France: [0, 0, 0, 0, 0, 0, 1, 0]
```

Bitmaps can be further compressed with run-length encoding.

**Query execution on compressed columns:**

```sql
WHERE country = 'USA' AND product_id = 123
```

Just AND the bitmaps together! Very fast, and data stays compressed.

### Sort Order in Column Storage

Even though columns are stored separately, rows must stay aligned (row 1 of each column file corresponds to the same original row).

**Sorting advantage:** If the first column is sorted (e.g., by date), compression works even better.

**Multiple sort orders:** Different replicas can use different sort orders. Query optimizer picks the best one.

### Writing to Column Storage

**Problem:** Column storage is optimized for reads, but writes are expensive.

**Solution:** Use LSM-tree approach:
1. Writes go to in-memory store (row-oriented)
2. Periodically merge into column files on disk
3. Queries check both in-memory and on-disk data

**Vertica uses this approach.**

### Materialized Views and Data Cubes

**Materialized view:** Precomputed query results stored on disk.

Unlike a virtual view (which is just a saved query), a materialized view is actual data that must be updated when underlying data changes.

**Data cube (OLAP cube):** Pre-aggregated data along multiple dimensions.

```
                    Total
                      │
        ┌─────────────┼─────────────┐
        │             │             │
     By Date       By Product    By Store
        │             │             │
    ┌───┴───┐     ┌───┴───┐     ┌───┴───┐
    Q1  Q2  Q3    P1  P2  P3    S1  S2  S3
```

**Advantage:** Queries on pre-aggregated dimensions are instant.

**Disadvantage:** Not flexible for queries that don't fit the cube's structure.

---

## Key Takeaways

1. **Storage engines are optimized for different workloads**
   - Log-structured (LSM-trees): Good for write-heavy workloads
   - Page-oriented (B-trees): Good for read-heavy, transactional workloads

2. **Indexes are trade-offs**
   - Speed up reads
   - Slow down writes
   - Choose based on your query patterns

3. **LSM-trees:** Append-only logs → SSTables → Merge in background
   - High write throughput
   - Good compression
   - Bloom filters help avoid unnecessary reads

4. **B-trees:** Fixed-size pages in a tree structure
   - Each key in exactly one place
   - More predictable performance
   - Decades of optimization

5. **OLTP vs OLAP:** Fundamentally different access patterns
   - OLTP: Many small transactions
   - OLAP: Few large analytical queries

6. **Column storage:** Store each column separately
   - Only read columns you need
   - Better compression
   - Essential for analytics workloads

7. **There's no "best" storage engine** - understand your workload and choose accordingly.
