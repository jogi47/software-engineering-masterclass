# Chapter 2: Data Models and Query Languages

## Introduction

Data models are perhaps the most important part of developing software, because they have such a profound effect on how we think about the problem we're solving.

Most applications are built by layering one data model on top of another:

```
┌────────────────────────────────────────────────────────┐
│  Application Developer's View                          │
│  (Objects, data structures, APIs)                      │
├────────────────────────────────────────────────────────┤
│  Data Model Layer                                      │
│  (JSON, XML, tables, graphs)                           │
├────────────────────────────────────────────────────────┤
│  Storage Engine                                        │
│  (Bytes on disk, in memory)                            │
├────────────────────────────────────────────────────────┤
│  Hardware                                              │
│  (Electrical currents, magnetic fields, light pulses)  │
└────────────────────────────────────────────────────────┘
```

Each layer hides the complexity of the layer below it by providing a clean data model. This abstraction allows different groups of people to work together effectively.

---

## The Relational Model

### Origin Story

The relational model was proposed by Edgar Codd in 1970. Data is organized into **relations** (called **tables** in SQL), where each relation is an unordered collection of **tuples** (called **rows**).

For decades, it dominated the database world. Despite many competitors (network model, hierarchical model, object databases, XML databases), relational databases kept winning because:
- They're general-purpose (work for many use cases)
- They have powerful query optimizers
- The ecosystem is mature (tools, expertise, reliability)

### How It Works

**Example: A simple LinkedIn-like profile**

```sql
-- Users table
CREATE TABLE users (
    user_id    SERIAL PRIMARY KEY,
    first_name VARCHAR(100),
    last_name  VARCHAR(100),
    summary    TEXT,
    region_id  INT REFERENCES regions(region_id)
);

-- Positions table (one-to-many relationship)
CREATE TABLE positions (
    position_id SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(user_id),
    job_title   VARCHAR(200),
    company     VARCHAR(200),
    start_date  DATE,
    end_date    DATE
);

-- Education table (one-to-many relationship)
CREATE TABLE education (
    education_id SERIAL PRIMARY KEY,
    user_id      INT REFERENCES users(user_id),
    school_name  VARCHAR(200),
    degree       VARCHAR(100),
    start_year   INT,
    end_year     INT
);
```

### The Impedance Mismatch Problem

There's an awkward translation layer required between:
- **Application objects** (in memory): Objects with nested structures
- **Database representation** (SQL): Flat tables with rows and columns

**Example of the mismatch:**

In your application code:
```javascript
const user = {
    id: 123,
    name: "Bill Gates",
    positions: [
        { title: "CEO", company: "Microsoft" },
        { title: "Co-chair", company: "Gates Foundation" }
    ],
    education: [
        { school: "Harvard", degree: "Dropout" }
    ]
};
```

To store this in SQL, you need:
1. Insert into `users` table
2. Insert into `positions` table (multiple rows)
3. Insert into `education` table (multiple rows)
4. Manage all the foreign key relationships

To retrieve it, you need:
1. Query `users`
2. Query `positions` WHERE user_id = ?
3. Query `education` WHERE user_id = ?
4. Combine the results in application code

This translation is tedious and error-prone. ORM frameworks (Hibernate, ActiveRecord, etc.) try to hide this, but they can't completely eliminate the mismatch.

### Normalization: Avoiding Duplication

**The Problem with Duplication:**

What if you store a user's city name as a string "Greater Seattle Area" in every row?
- If the city name changes, you need to update every row
- Different spellings might creep in ("Seattle", "Seattle, WA", "Greater Seattle Area")
- You're wasting storage

**The Solution: Normalize**

Store the city once with an ID, and reference that ID:

```sql
-- Instead of:
-- users(user_id, name, city_name)

-- Do:
-- regions(region_id, region_name)
-- users(user_id, name, region_id)
```

**Benefits of normalization:**
- Single source of truth (update once, reflected everywhere)
- Consistent formatting
- Easier to query (join instead of string matching)
- Supports internationalization (store translated names)

**The Cost:**
- Requires joins to reassemble data
- More complex queries

---

## The Document Model

### What Is It?

The document model stores data as self-contained **documents** (usually JSON or similar):

```json
{
    "user_id": 123,
    "first_name": "Bill",
    "last_name": "Gates",
    "summary": "Co-chair of the Gates Foundation...",
    "region": "Greater Seattle Area",
    "positions": [
        {
            "job_title": "Co-chair",
            "company": "Gates Foundation",
            "start_date": "2000-01-01"
        },
        {
            "job_title": "CEO",
            "company": "Microsoft",
            "start_date": "1975-04-04",
            "end_date": "2000-01-13"
        }
    ],
    "education": [
        {
            "school_name": "Harvard University",
            "start": 1973,
            "end": 1975
        }
    ]
}
```

### Why Document Databases?

1. **Schema Flexibility**
   - No need to define schema upfront
   - Easy to add new fields
   - Different documents can have different structures

2. **Better Locality**
   - All related data is in one place
   - No joins needed to read a complete profile
   - Single query retrieves everything

3. **Closer to Application Objects**
   - JSON maps directly to application data structures
   - Less impedance mismatch

4. **Scalability**
   - Often easier to partition across multiple machines
   - Each document is independent

### When Documents Work Well

**Good fit for documents:**
- Data that's accessed as a whole (user profile, blog post)
- One-to-many relationships (user has many positions)
- Data that doesn't need to be joined with other documents
- Varying structure (not all documents have the same fields)

**Examples:**
```
Resume/Profile:     One user, many positions, many schools
Blog post:          One post, many comments, many tags
E-commerce order:   One order, many line items, shipping info
Event log:          Each event is self-contained
```

### When Documents Don't Work Well

**Poor fit for documents:**
- Many-to-many relationships
- Data that needs to be joined frequently
- Highly interconnected data

**The Problem with Many-to-Many:**

Consider recommendations: "User A recommends User B"

In a document:
```json
{
    "user_id": 1,
    "name": "Alice",
    "recommendations_given": [
        { "to_user_id": 2, "text": "Great coworker!" }
    ],
    "recommendations_received": [
        { "from_user_id": 3, "text": "Excellent leader!" }
    ]
}
```

If you want to show Alice's profile with the names of people who recommended her, you need to:
1. Fetch Alice's document
2. Extract `from_user_id` values
3. Fetch each of those user documents
4. Combine in application code

This is essentially doing a join in application code - often slower and more error-prone than letting the database do it.

### Schema-on-Read vs Schema-on-Write

| Aspect | Relational (Schema-on-Write) | Document (Schema-on-Read) |
|--------|------------------------------|---------------------------|
| Schema defined | Before writing data | Implicitly, when reading |
| Like programming | Static typing | Dynamic typing |
| Adding field | ALTER TABLE (can be slow) | Just write it |
| Missing field | Error or NULL | Handle in application |
| Validation | Database enforces | Application must handle |

**When is Schema-on-Read Better?**
- Items don't all have the same structure
- Structure is determined by external systems you don't control
- Schema changes are frequent

**Example:**
```javascript
// Schema-on-read approach
if (user.first_name) {
    displayName = user.first_name + " " + user.last_name;
} else {
    displayName = user.full_name;  // Old format
}
```

---

## The Graph Model

### When to Use Graphs?

When your data has many **many-to-many relationships** and the connections between items are as important as the items themselves.

**Examples:**
- Social networks (people and their friendships)
- Road networks (intersections and roads)
- The web (pages and links)
- Fraud detection (patterns of transactions)

### Property Graph Model

Used by: Neo4j, Amazon Neptune, JanusGraph

**Structure:**
- **Vertices** (nodes) have:
  - Unique identifier
  - Set of outgoing edges
  - Set of incoming edges
  - Collection of properties (key-value pairs)

- **Edges** (relationships) have:
  - Unique identifier
  - Tail vertex (where it starts)
  - Head vertex (where it ends)
  - Label describing the relationship
  - Collection of properties

**Example: People and Places**

```
┌─────────────┐     BORN_IN      ┌─────────────┐
│   Person    │─────────────────→│   Location  │
│ name: Lucy  │                  │ name: Idaho │
└─────────────┘                  └─────────────┘
       │                                │
       │ LIVES_IN                       │ WITHIN
       ▼                                ▼
┌─────────────┐                  ┌─────────────┐
│   Location  │←─────────────────│   Location  │
│name: London │     WITHIN       │  name: UK   │
└─────────────┘                  └─────────────┘
       │
       │ WITHIN
       ▼
┌─────────────┐
│   Location  │
│name: Europe │
└─────────────┘
```

**Key Insight:** Any vertex can have an edge to any other vertex. There's no schema restricting what can be connected. This flexibility is powerful for modeling complex, evolving domains.

### Cypher Query Language

Cypher is a declarative query language for property graphs (used by Neo4j).

**Creating Data:**
```cypher
CREATE
  (usa:Location {name: 'United States', type: 'country'}),
  (idaho:Location {name: 'Idaho', type: 'state'}),
  (lucy:Person {name: 'Lucy'}),
  (idaho)-[:WITHIN]->(usa),
  (lucy)-[:BORN_IN]->(idaho)
```

**Querying: "Find all people who were born in the US"**
```cypher
MATCH
  (person)-[:BORN_IN]->()-[:WITHIN*0..]->(us:Location {name: 'United States'})
RETURN person.name
```

This query:
1. Finds vertices with a `BORN_IN` edge
2. Follows zero or more `WITHIN` edges (the `*0..` means any number)
3. Until it reaches a Location named 'United States'
4. Returns the names of matching people

**Why is this powerful?**
- You don't need to know how many levels of `WITHIN` there are
- Idaho → United States (1 hop)
- Boise → Idaho → United States (2 hops)
- The query handles both cases

### Triple-Stores and SPARQL

Another approach to graph data, used especially in semantic web and linked data.

**Structure:** All information stored as three-part statements:
- (subject, predicate, object)

**Example:**
```
(lucy, born_in, idaho)
(idaho, within, usa)
(usa, type, country)
```

This is equivalent to the property graph:
- Subject = vertex
- Predicate = edge label
- Object = another vertex (or a property value)

**SPARQL Query: Same query as above**
```sparql
PREFIX : <urn:example:>
SELECT ?personName WHERE {
  ?person :bornIn / :within* :usa .
  ?person :name ?personName .
}
```

---

## Query Languages: Declarative vs Imperative

### Imperative (How)

You tell the computer exactly what steps to take:

```javascript
function findSharks(animals) {
    const sharks = [];
    for (let i = 0; i < animals.length; i++) {
        if (animals[i].family === 'Sharks') {
            sharks.push(animals[i]);
        }
    }
    return sharks;
}
```

### Declarative (What)

You describe what result you want, not how to get it:

```sql
SELECT * FROM animals WHERE family = 'Sharks';
```

**Advantages of Declarative:**

1. **Simpler to write and understand**
   - Focus on business logic, not mechanics

2. **Database can optimize**
   - Query optimizer chooses best execution plan
   - Can change implementation without changing query
   - Can parallelize automatically

3. **More concise**
   - Less code to write and maintain

**CSS is Declarative:**
```css
/* Declarative: What you want */
li.selected > p {
    background-color: blue;
}
```

```javascript
// Imperative: How to do it
const liElements = document.getElementsByTagName('li');
for (const li of liElements) {
    if (li.className === 'selected') {
        const children = li.childNodes;
        for (const child of children) {
            if (child.nodeType === Node.ELEMENT_NODE &&
                child.tagName === 'P') {
                child.style.backgroundColor = 'blue';
            }
        }
    }
}
```

### MapReduce: A Hybrid

MapReduce is between declarative and imperative:
- You write functions (imperative code)
- The framework decides how to distribute and execute (declarative)

**Example: Count sharks per month**

```javascript
// Map function: Called for each document
function map() {
    const year = this.observationTimestamp.getFullYear();
    const month = this.observationTimestamp.getMonth() + 1;
    if (this.family === 'Sharks') {
        emit(year + '-' + month, this.numAnimals);
    }
}

// Reduce function: Called for each key with all its values
function reduce(key, values) {
    return Array.sum(values);
}
```

**Equivalent SQL:**
```sql
SELECT
    DATE_FORMAT(observation_timestamp, '%Y-%m') AS month,
    SUM(num_animals) AS total
FROM observations
WHERE family = 'Sharks'
GROUP BY month;
```

**Constraints on MapReduce functions:**
- Must be **pure functions** (no side effects)
- Output only depends on input
- This allows the framework to run them in any order, retry on failure, etc.

---

## Data Locality

### The Locality Advantage of Documents

When your application frequently needs an entire document, the document model has a performance advantage:

**Document Storage:**
```
Document 1: [all of user 1's data]
Document 2: [all of user 2's data]
Document 3: [all of user 3's data]
```

One disk seek, one read = all the data you need.

**Relational Storage:**
```
Users table:       [user 1], [user 2], [user 3]
Positions table:   [pos 1], [pos 2], [pos 3], [pos 4]...
Education table:   [edu 1], [edu 2]...
```

Multiple disk seeks, multiple reads, then combine in memory.

### When Locality Hurts

If you only need a small part of the document, you still have to load the whole thing:

```json
{
    "user_id": 123,
    "email": "user@example.com",  // Only need this
    "profile": { /* 100KB of data you don't need */ },
    "activity_log": [ /* Another 500KB */ ]
}
```

Also, updating a document often means rewriting the entire thing.

### Relational Databases with Locality Features

Some relational databases offer similar locality:
- **Multi-table clustering** (Oracle): Store related tables physically together
- **Column families** (Bigtable, HBase, Cassandra): Group related columns

---

## Convergence of Models

The distinction between document and relational databases is blurring:

**Relational databases adding document features:**
- PostgreSQL: JSONB columns with indexing
- MySQL: JSON data type
- SQL Server: JSON support

**Document databases adding relational features:**
- MongoDB: $lookup for joins
- RethinkDB: Automatic joins
- CouchDB: Views that act like indexes

**Graph features appearing everywhere:**
- PostgreSQL: Recursive CTEs for graph queries
- Document DBs: Graph extensions

The future likely has **multi-model databases** that support multiple data models in one system.

---

## Choosing the Right Model

### Use Relational When:
- Data has many relationships
- You need complex queries and joins
- Strong consistency is critical
- Schema is well-defined and stable
- You need ACID transactions across multiple tables

### Use Document When:
- Data is self-contained (documents don't reference each other much)
- One-to-many relationships dominate
- Schema varies across records
- You frequently load entire documents
- Horizontal scaling is important

### Use Graph When:
- Everything is connected to everything
- You need to traverse relationships
- Relationships have properties
- You're doing network analysis, recommendations, fraud detection

---

## Key Takeaways

1. **Data models shape how you think** about problems. Choosing the right model makes some things easy and others hard.

2. **Relational model**: Excellent for structured data with many relationships. SQL lets the database optimize query execution.

3. **Document model**: Great for self-contained records, schema flexibility, and when you need to load all related data together.

4. **Graph model**: Best when relationships between entities are as important as the entities themselves.

5. **Impedance mismatch**: There's always some translation between application objects and database storage. Different models have different amounts of mismatch.

6. **Declarative queries** (SQL, Cypher) let the database optimize execution. Imperative code gives you control but is harder to optimize.

7. **The lines are blurring**: Modern databases often support multiple models. Choose based on your primary access patterns, but know you can often mix approaches.

8. **Schema-on-read vs schema-on-write**: Trade-off between flexibility and safety. Neither is universally better.
