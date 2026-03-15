# Chapter 7: Transactions

## Introduction

A **transaction** is a way for an application to group several reads and writes together into a logical unit. Conceptually, all the reads and writes in a transaction are executed as one operation: either the entire transaction succeeds (commit) or it fails (abort, rollback).

**Why do we need transactions?**

Many things can go wrong in a data system:
- The database software or hardware may fail at any time
- The application may crash at any time
- Network interruptions can cut off the application from the database
- Several clients may write to the database at the same time, overwriting each other
- A client may read data that doesn't make sense because it has been partially updated
- Race conditions between clients can cause surprising bugs

Transactions have been the mechanism of choice for simplifying these problems. They give the application a **safe abstraction**: either everything works, or nothing happens.

---

## ACID Properties

ACID is the set of safety guarantees that transactions provide. However, the implementations vary significantly across databases, and some "ACID-compliant" databases provide surprisingly weak guarantees.

### Atomicity

**What It Really Means:**

Atomicity is NOT about concurrency (that's isolation). Atomicity describes what happens if a client wants to make several writes, but a fault occurs after some of the writes have been processed.

```
Transaction: Transfer $100 from Account A to Account B

Step 1: Read balance of A → $500
Step 2: Write A = A - 100 → $400
        ← CRASH HAPPENS HERE →
Step 3: Write B = B + 100    (never executed)

Without Atomicity:                    With Atomicity:
┌────────────────────────┐           ┌────────────────────────┐
│ Account A: $400        │           │ Account A: $500        │
│ Account B: $0          │           │ Account B: $0          │
│ $100 disappeared!      │           │ Transaction rolled back│
└────────────────────────┘           └────────────────────────┘
```

**The key capability:** If a transaction was aborted, the application can be sure that no changes were made, so it can safely retry.

**Implementation:**

Databases typically use a **write-ahead log (WAL)** for crash recovery:
1. Before making any change, write the intended change to a log
2. Make the actual change
3. On crash recovery, look at the log to see what was in progress
4. Either redo or undo the changes to restore consistency

### Consistency

**The confusing 'C' in ACID:**

Consistency in ACID means that you have certain statements about your data (invariants) that must always be true.

**Examples of invariants:**
- In an accounting system, credits and debits must always balance
- A user's email address must be unique
- A booking can't overlap with another booking for the same room

**Here's the key insight:** This is actually an application property, not a database property. The database can't guarantee your business rules - only your application code can.

```
Application Invariant: Account balance must never be negative

Transaction: Withdraw $600 from account with $500 balance

Database's view:                 Application's responsibility:
┌─────────────────────────┐     ┌─────────────────────────────┐
│ UPDATE accounts         │     │ IF balance >= amount THEN   │
│ SET balance = -100      │     │   balance = balance - amount│
│ WHERE id = 123;         │     │ ELSE                        │
│                         │     │   ABORT "Insufficient funds"│
│ Database: "Looks valid!"│     │                             │
└─────────────────────────┘     └─────────────────────────────┘
```

The database provides atomicity and isolation to help maintain consistency, but it's the **application** that defines valid states.

### Isolation

**The Problem:**

```
Concurrently Executing Transactions:

Time →
Transaction 1: READ x=0 -------- WRITE x=1 -------- COMMIT
Transaction 2: -------- READ x=0 -------- WRITE x=2 -------- COMMIT

Final value of x = 2 (Transaction 1's write was lost!)
```

**Isolation** means that concurrently executing transactions are isolated from each other. The classic textbook definition is **serializability**: the result is the same as if the transactions had executed one at a time, serially.

However, serializable isolation has a performance cost, so many databases use weaker isolation levels (more on this below).

### Durability

**What It Means:**

Once a transaction has committed successfully, any data it has written will not be forgotten, even if there is a hardware fault or the database crashes.

**How It's Achieved:**

```
Single-node database:
┌─────────────────────────────────────────────────────┐
│ 1. Write to Write-Ahead Log (WAL) on disk          │
│ 2. Write to data files                              │
│ 3. If crash: Replay WAL to recover                  │
└─────────────────────────────────────────────────────┘

Replicated database:
┌─────────────────────────────────────────────────────┐
│ 1. Write to multiple nodes                          │
│ 2. Wait for acknowledgment from majority            │
│ 3. Data survives even if some nodes fail           │
└─────────────────────────────────────────────────────┘
```

**Perfect durability doesn't exist:** Even with all this, you can still lose data:
- If all disks fail simultaneously
- If a bug corrupts data
- If a natural disaster destroys your data center

That's why production systems use multiple techniques: replication, backups, and testing recovery procedures.

---

## Single-Object vs Multi-Object Transactions

### Single-Object Operations

Even on a single object, there are situations where atomicity and isolation matter.

**Example: Updating a 20KB JSON document**

```
Without atomicity:
┌─────────────────────────────────────────────────────────────┐
│ Document (20KB)                                              │
│ ╔═══════════════════════════════════════════════╗           │
│ ║ First 10KB written ✓                          ║           │
│ ║ ════════════════════════════════════════════  ║           │
│ ║ Power failure!                                 ║           │
│ ║ Last 10KB = corrupted/old data                ║           │
│ ╚═══════════════════════════════════════════════╝           │
│                                                              │
│ Reader sees: Half new data + half old data = GARBAGE        │
└─────────────────────────────────────────────────────────────┘
```

**Storage engines typically provide:**
- **Atomicity:** Using a log for crash recovery
- **Isolation:** Using locks on objects

**Atomic increment:**
```sql
-- Instead of read-modify-write in application:
UPDATE counters SET value = value + 1 WHERE key = 'page_views';

-- Compare-and-set (only update if unchanged):
UPDATE wiki_pages
SET content = 'new content', version = version + 1
WHERE id = 1234 AND version = 25;
```

### Multi-Object Transactions

**When are they necessary?**

Many use cases require coordinating writes to multiple objects:

**1. Relational data with foreign keys:**
```sql
-- Must update both tables atomically
INSERT INTO orders (id, customer_id, total) VALUES (1001, 42, 100.00);
INSERT INTO order_items (order_id, product_id, qty) VALUES (1001, 'WIDGET', 3);

-- If second insert fails, we have an orphaned order
```

**2. Document databases with denormalized data:**
```json
// User document
{"_id": "user:1", "name": "Alice", "email": "alice@example.com"}

// Post document (denormalized username for display)
{"_id": "post:99", "author_name": "Alice", "content": "Hello!"}

// If user changes their name, must update BOTH documents atomically
```

**3. Secondary indexes:**
```
Primary data:  users table
Secondary:     email_index

INSERT INTO users (id, email) VALUES (42, 'bob@example.com');
-- Must also update: email_index['bob@example.com'] = 42

-- If primary succeeds but index fails:
-- Query by email won't find the user!
```

### How Transactions Are Grouped

Most relational databases use explicit transaction boundaries:

```sql
BEGIN TRANSACTION;
  -- Multiple statements here
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
  UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;  -- Or ROLLBACK to abort
```

Many NoSQL databases don't have a way to group operations. Each operation is treated independently, so multi-object transactions aren't possible.

---

## Weak Isolation Levels

Serializable isolation has significant performance costs, so many databases use weaker isolation levels. It's important to understand what anomalies each level prevents.

### Read Committed

The most basic level of transaction isolation. It makes two guarantees:

**1. No Dirty Reads:** You only see data that has been committed.

```
Dirty Read Problem (prevented by Read Committed):

Transaction 1:                Transaction 2:
┌─────────────────────────┐   ┌─────────────────────────────────┐
│ x = 0                   │   │                                 │
│ BEGIN                   │   │                                 │
│ WRITE x = 1             │   │ READ x → sees 1 (DIRTY READ!)   │
│ ABORT (rollback x to 0) │   │                                 │
│                         │   │ Uses x=1, but x was never       │
│                         │   │ actually committed!             │
└─────────────────────────┘   └─────────────────────────────────┘

With Read Committed: Transaction 2 would see x=0 (the committed value)
```

**2. No Dirty Writes:** You only overwrite data that has been committed.

```
Dirty Write Problem (prevented by Read Committed):

Listing website: Alice and Bob both trying to buy same car

Transaction 1 (Alice):          Transaction 2 (Bob):
┌─────────────────────────┐     ┌─────────────────────────────┐
│ UPDATE listings         │     │                             │
│ SET buyer = 'Alice'     │     │ UPDATE listings             │
│ WHERE id = 1234;        │     │ SET buyer = 'Bob'           │
│                         │     │ WHERE id = 1234;            │
│ UPDATE invoices         │     │ UPDATE invoices             │
│ SET payee = 'Alice'     │     │ SET payee = 'Bob'           │
│ WHERE listing_id = 1234;│     │ WHERE listing_id = 1234;    │
└─────────────────────────┘     └─────────────────────────────┘

Without protection:
- listings.buyer = 'Bob'     (Bob's write was last)
- invoices.payee = 'Alice'   (Alice's write was last)

Bob is listed as buyer but Alice gets the invoice!
```

**Implementation:**

```
Dirty writes: Row-level locks
┌─────────────────────────────────────────────────────────────┐
│ Transaction acquires lock on row before writing             │
│ Holds lock until transaction commits/aborts                 │
│ Other transactions wait for lock to be released             │
└─────────────────────────────────────────────────────────────┘

Dirty reads: Remember old value
┌─────────────────────────────────────────────────────────────┐
│ When a transaction writes, database remembers:              │
│ - The old committed value                                   │
│ - The new uncommitted value                                 │
│                                                             │
│ Readers see old value until transaction commits             │
│ (No read locks needed - readers don't block writers!)       │
└─────────────────────────────────────────────────────────────┘
```

### Snapshot Isolation (Repeatable Read)

Read committed still allows some anomalies. The most common is **read skew** (non-repeatable read).

**The Read Skew Problem:**

```
Alice has $1000 in two accounts ($500 each), checking her total balance:

Time    Transaction 1 (Transfer)    Transaction 2 (Alice checking balance)
─────   ────────────────────────    ──────────────────────────────────────
  │     BEGIN                       BEGIN
  │     READ acct1 → $500
  │     WRITE acct1 = $400
  │     (transferred $100)
  │                                 READ acct1 → $400  (sees committed)
  │     WRITE acct2 = $600
  │     COMMIT
  │                                 READ acct2 → $600  (sees committed)
  ↓                                 TOTAL = $1000... but...

Alice read $400 + $600 = $1000, which is correct.
But what if timing was different?

Time    Transaction 1 (Transfer)    Transaction 2 (Alice checking balance)
─────   ────────────────────────    ──────────────────────────────────────
  │                                 BEGIN
  │                                 READ acct1 → $500  (sees committed)
  │     BEGIN
  │     READ acct1 → $500
  │     WRITE acct1 = $400
  │     WRITE acct2 = $600
  │     COMMIT
  │                                 READ acct2 → $600  (sees committed)
  ↓                                 TOTAL = $1100 ← WRONG!

Alice sees $500 + $600 = $1100 (money appeared from nowhere!)
```

**When is this a problem?**

- **Backups:** Taking a backup while data is changing. If you see inconsistent snapshots, your backup is corrupted.
- **Analytics queries:** Long-running queries scanning large amounts of data. Seeing partial updates is problematic.
- **Integrity checks:** Checking that everything balances correctly.

**Solution: Snapshot Isolation**

Each transaction reads from a **consistent snapshot** of the database - it sees all the data that was committed at the start of the transaction.

```
How it works with MVCC (Multi-Version Concurrency Control):

Database keeps multiple versions of each row:

Row: account_id = 1
┌─────────────────────────────────────────────────────────────────┐
│ Version 1: balance=$500, created_by=txn_100, deleted_by=txn_200│
│ Version 2: balance=$400, created_by=txn_200, deleted_by=null   │
└─────────────────────────────────────────────────────────────────┘

Transaction 150 (started before txn_200):
  → Sees Version 1 (balance=$500) because txn_200 hadn't committed yet

Transaction 250 (started after txn_200 committed):
  → Sees Version 2 (balance=$400)
```

**Visibility Rules:**

A transaction sees a row version if:
1. The version was created by a transaction that committed before this one started
2. The version was NOT deleted, OR was deleted by a transaction that started after this one

```
visibility(row_version, current_txn) =
    row_version.created_by < current_txn.id AND
    row_version.created_by was committed before current_txn started AND
    (row_version.deleted_by IS NULL OR
     row_version.deleted_by > current_txn.id OR
     row_version.deleted_by was NOT committed when current_txn started)
```

### Preventing Lost Updates

**The Problem:**

Lost updates occur when two transactions read the same value, modify it, and write back the result. One modification can get lost.

```
Counter increment race condition:

Transaction 1:                  Transaction 2:
┌─────────────────────────┐     ┌─────────────────────────┐
│ READ counter → 42       │     │ READ counter → 42       │
│                         │     │                         │
│ counter = 42 + 1 = 43   │     │ counter = 42 + 1 = 43   │
│                         │     │                         │
│ WRITE counter = 43      │     │ WRITE counter = 43      │
└─────────────────────────┘     └─────────────────────────┘

Expected: 44
Actual: 43 (one increment was lost!)
```

**Common scenarios:**
- Incrementing a counter
- Updating a JSON document (read-modify-write)
- Two users editing a wiki page simultaneously

**Solutions:**

**1. Atomic Operations (Best when applicable):**

```sql
-- Let the database handle the atomicity
UPDATE counters SET value = value + 1 WHERE key = 'page_views';

-- Works because database does read-modify-write in one operation
-- Usually implemented with exclusive locks
```

**2. Explicit Locking:**

```sql
-- Application takes an explicit lock
BEGIN TRANSACTION;
SELECT * FROM figures WHERE name = 'robot' FOR UPDATE;
-- The FOR UPDATE tells the database to lock this row
-- Now do application-side logic safely
UPDATE figures SET position = 'c4' WHERE id = 1234;
COMMIT;
```

**3. Automatic Detection:**

Some databases (PostgreSQL, Oracle, SQL Server with snapshot isolation) automatically detect lost updates:

```
Transaction 1:           Transaction 2:
┌──────────────────┐     ┌──────────────────┐
│ READ counter=42  │     │ READ counter=42  │
│ (timestamp T1)   │     │ (timestamp T2)   │
│                  │     │                  │
│ WRITE counter=43 │     │                  │
│ COMMIT           │     │ WRITE counter=43 │
│                  │     │ DB detects: "you │
│                  │     │ read stale data!"│
│                  │     │ ABORT → retry    │
└──────────────────┘     └──────────────────┘
```

**4. Compare-and-Set:**

```sql
-- Only update if the value hasn't changed
UPDATE wiki_pages
SET content = 'new content'
WHERE id = 1234 AND content = 'old content';

-- Check rows affected: if 0, someone else changed it first
```

**Warning:** Compare-and-set may not work correctly with snapshot isolation if the WHERE clause reads from the snapshot rather than the current value.

### Write Skew and Phantoms

**Write Skew: A Generalization of Lost Updates**

In write skew, two transactions read the same data, each makes a decision based on what they read, but they write to **different** objects. The combined result violates a constraint.

```
Hospital on-call system: At least one doctor must be on call

Initial state: Alice and Bob are both on call

Alice's transaction:            Bob's transaction:
┌─────────────────────────────┐ ┌─────────────────────────────┐
│ SELECT COUNT(*) FROM        │ │ SELECT COUNT(*) FROM        │
│   doctors WHERE on_call=true│ │   doctors WHERE on_call=true│
│ → Result: 2                 │ │ → Result: 2                 │
│                             │ │                             │
│ "2 > 1, so I can leave"     │ │ "2 > 1, so I can leave"     │
│                             │ │                             │
│ UPDATE doctors              │ │ UPDATE doctors              │
│ SET on_call = false         │ │ SET on_call = false         │
│ WHERE name = 'Alice';       │ │ WHERE name = 'Bob';         │
│                             │ │                             │
│ COMMIT                      │ │ COMMIT                      │
└─────────────────────────────┘ └─────────────────────────────┘

Result: Nobody is on call! Constraint violated.
```

**Why is this different from lost updates?**
- Lost update: Both write to the **same** row
- Write skew: Each writes to a **different** row

You can't solve write skew with atomic operations or automatic detection because no single write conflicts with another.

**Other examples of write skew:**
- Meeting room booking (double-booking)
- Multiplayer game (two players claim same move)
- Username registration (two users claim same username)
- Financial applications (spending more than account balance across multiple systems)

**Phantoms**

A phantom occurs when a write in one transaction changes the result of a search query in another transaction.

```
Meeting Room Booking:

Transaction 1:                     Transaction 2:
┌────────────────────────────────┐ ┌────────────────────────────────┐
│ SELECT * FROM bookings         │ │ SELECT * FROM bookings         │
│ WHERE room = 123               │ │ WHERE room = 123               │
│ AND time = '12:00-13:00';      │ │ AND time = '12:00-13:00';      │
│ → No rows found                │ │ → No rows found                │
│                                │ │                                │
│ INSERT INTO bookings           │ │ INSERT INTO bookings           │
│ (room, time, user)             │ │ (room, time, user)             │
│ VALUES (123, '12:00', 'Alice');│ │ VALUES (123, '12:00', 'Bob');  │
│                                │ │                                │
│ COMMIT                         │ │ COMMIT                         │
└────────────────────────────────┘ └────────────────────────────────┘

Result: Double-booked! Both bookings exist.

The problem: You can't lock rows that don't exist yet!
```

**Solutions:**

**1. Materializing Conflicts:**

Create explicit objects to lock:

```sql
-- Create a row for every possible room/time slot in advance
INSERT INTO time_slots (room_id, time_slot, booked_by) VALUES
  (123, '12:00-13:00', NULL),
  (123, '13:00-14:00', NULL),
  ...

-- Now you can lock the slot
SELECT * FROM time_slots
WHERE room_id = 123 AND time_slot = '12:00-13:00'
FOR UPDATE;

-- If not booked, update it
UPDATE time_slots SET booked_by = 'Alice' WHERE ...
```

This is a workaround and can be ugly. Better solution: use serializable isolation.

---

## Serializability

Serializable isolation is the strongest isolation level. It guarantees that even though transactions may execute in parallel, the result is the same as if they had executed serially (one after another).

There are three techniques for achieving serializability:

### 1. Actual Serial Execution

**The idea:** Just remove concurrency entirely. Execute transactions one at a time, on a single thread.

```
                    ┌─────────────────┐
Transaction Queue:  │ Txn 1 │ Txn 2 │ Txn 3 │ ...
                    └───────┴───────┴───────┘
                              │
                              ▼
                    ┌─────────────────────────┐
                    │    Single Thread         │
                    │    Execute one at a time │
                    │    No locks needed!      │
                    └─────────────────────────┘
                              │
                              ▼
                    ┌─────────────────────────┐
                    │    Database (in RAM)     │
                    └─────────────────────────┘
```

**Why is this feasible now?**

1. **RAM is cheap:** Entire dataset can fit in memory. No waiting for disk I/O.
2. **OLTP transactions are short:** Usually just a few reads/writes. Each takes microseconds.
3. **Multi-core CPUs:** Can partition data and use one thread per partition.

**Limitations:**

- Every transaction must be FAST (no network I/O during transaction)
- Dataset must fit in memory
- Write throughput limited to single CPU
- Cross-partition transactions expensive

**Stored Procedures:**

To avoid round-trip latency, send the entire transaction logic to the database:

```
Traditional (multiple round-trips):        Stored Procedure (one round-trip):
┌────────────────────────────────────┐    ┌────────────────────────────────┐
│ App: BEGIN                         │    │ App: CALL transfer(1, 2, 100)  │
│ DB: OK                             │    │                                │
│ App: SELECT balance FROM acct 1    │    │ DB: (executes entire procedure)│
│ DB: $500                           │    │     BEGIN                      │
│ App: (compute new balance)         │    │     SELECT balance FROM acct 1 │
│ App: UPDATE acct 1 SET bal = 400   │    │     UPDATE acct 1 SET bal=400  │
│ DB: OK                             │    │     UPDATE acct 2 SET bal=600  │
│ App: UPDATE acct 2 SET bal = 600   │    │     COMMIT                     │
│ DB: OK                             │    │                                │
│ App: COMMIT                        │    │ DB: OK                         │
│ DB: OK                             │    │                                │
└────────────────────────────────────┘    └────────────────────────────────┘

Round-trips: 6                            Round-trips: 1
```

**Used by:** VoltDB, Redis, Datomic

### 2. Two-Phase Locking (2PL)

**The idea:** Use locks to prevent conflicts, but more aggressively than in snapshot isolation.

**The rule:**
- If transaction A has **read** an object, transaction B must wait to **write** it
- If transaction A has **written** an object, transaction B must wait to **read OR write** it

This is much stronger than what's needed for read committed. **Writers block readers AND readers block writers.**

```
Lock types:
┌─────────────────────────────────────────────────────────────────┐
│ Shared lock (S):    For reading. Multiple transactions can hold│
│                     shared locks on same object simultaneously │
│                                                                 │
│ Exclusive lock (X): For writing. Only one transaction can hold │
│                     an exclusive lock, and it blocks all others│
└─────────────────────────────────────────────────────────────────┘

Lock compatibility:
              Requesting lock:
                  S        X
Current   S      OK       WAIT
lock:     X     WAIT      WAIT
```

**The Two Phases:**

```
Phase 1: Growing (acquiring locks)
    ┌─────────────────────────────────────┐
    │ Transaction acquires locks as needed │
    │ Never releases any lock             │
    └─────────────────────────────────────┘

Phase 2: Shrinking (releasing locks)
    ┌─────────────────────────────────────┐
    │ Transaction commits or aborts        │
    │ All locks released at once          │
    └─────────────────────────────────────┘
```

**Deadlock:**

```
Transaction 1:              Transaction 2:
┌─────────────────────┐     ┌─────────────────────┐
│ LOCK(A) → acquired  │     │ LOCK(B) → acquired  │
│ LOCK(B) → waiting   │←────│ LOCK(A) → waiting   │──→
│     ↑               │     │     ↑               │
│     │               │     │     │               │
│     └───── deadlock ──────┘     │               │
└─────────────────────┘     └─────────────────────┘

Detection: Database checks for cycles in wait-for graph
Resolution: Abort one transaction, which releases its locks
```

**Predicate Locks:**

To prevent phantoms, we need to lock not just existing rows, but rows that might be inserted.

```sql
-- Predicate lock: Lock all rows matching this condition
SELECT * FROM bookings
WHERE room_id = 123 AND time BETWEEN '12:00' AND '13:00'
FOR UPDATE;

-- This locks:
-- 1. All existing rows matching the predicate
-- 2. Conceptually, any row that WOULD match if it existed

-- If another transaction tries to INSERT a matching row,
-- it must wait for this lock to be released
```

**Index-Range Locks:**

Predicate locks can be expensive. A practical approximation is to lock a larger range:

```
Instead of locking: room=123 AND time='12:00-13:00'

Lock one of:
┌─────────────────────────────────────────────────────────┐
│ All bookings for room 123 (any time)                    │
│ OR                                                       │
│ All bookings for time 12:00-13:00 (any room)           │
│ OR                                                       │
│ Lock on the index entry for room=123                    │
└─────────────────────────────────────────────────────────┘

More coarse-grained = more false conflicts, but cheaper to manage
```

**Performance:**

2PL has significant performance overhead:
- Blocking: Transactions wait for locks
- Deadlock detection and recovery
- A few slow transactions can block everything

This is why it's not the default in most databases.

### 3. Serializable Snapshot Isolation (SSI)

**The idea:** An optimistic approach. Allow transactions to proceed without blocking, but detect conflicts at commit time and abort if needed.

```
Pessimistic (2PL):              Optimistic (SSI):
┌──────────────────────┐        ┌──────────────────────┐
│ Before doing anything,│       │ Do everything without │
│ check if it's safe    │       │ blocking. At commit:  │
│ (acquire locks)       │       │ "Was this safe?"      │
│                       │       │ If no: abort & retry  │
└──────────────────────┘        └──────────────────────┘
```

**Based on Snapshot Isolation + Conflict Detection**

SSI adds serialization conflict detection to snapshot isolation:

**1. Detecting reads of stale MVCC objects:**

```
Transaction 1:              Transaction 2:
┌─────────────────────┐     ┌─────────────────────────────┐
│ READ x (from       │     │                             │
│   snapshot at T=10) │     │                             │
│                     │     │ WRITE x = new value         │
│                     │     │ COMMIT (at T=15)            │
│                     │     │                             │
│ WRITE y             │     │                             │
│ COMMIT (at T=20)    │     │                             │
│                     │     │                             │
│ → SSI checks: "Did  │     │                             │
│   any concurrent txn│     │                             │
│   modify x?" YES!   │     │                             │
│ → ABORT             │     │                             │
└─────────────────────┘     └─────────────────────────────┘
```

**2. Detecting writes that affect prior reads:**

```
Transaction 1:              Transaction 2:
┌─────────────────────┐     ┌─────────────────────────────┐
│ READ doctors        │     │ READ doctors                │
│ WHERE on_call=true  │     │ WHERE on_call=true          │
│ → count = 2         │     │ → count = 2                 │
│                     │     │                             │
│ UPDATE doctors      │     │                             │
│ SET on_call=false   │     │ UPDATE doctors              │
│ WHERE name='Alice'  │     │ SET on_call=false           │
│                     │     │ WHERE name='Bob'            │
│ COMMIT              │     │                             │
│                     │     │ → SSI checks: "Did anyone   │
│                     │     │   else write to data I read?"│
│                     │     │   YES (Alice's on_call)     │
│                     │     │ → ABORT                     │
└─────────────────────┘     └─────────────────────────────┘
```

**Performance Tradeoffs:**

| Aspect | 2PL | SSI |
|--------|-----|-----|
| Blocking | Yes, readers block writers | No blocking |
| Deadlocks | Yes, needs detection | No deadlocks |
| Aborts | Only on deadlocks | Higher abort rate |
| Best when | Low contention | Low to medium contention |
| Read-only txns | Can block | Never abort |

**Used by:** PostgreSQL (version 9.1+), FoundationDB

---

## Choosing an Isolation Level

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Isolation Level Decision Guide                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Do you have concurrency at all?                                        │
│  └─ No  → Any level works                                               │
│  └─ Yes ↓                                                               │
│                                                                          │
│  What anomalies can you tolerate?                                       │
│                                                                          │
│  ┌─────────────────┬──────────────────────────────────────────────────┐ │
│  │ Anomaly         │ Prevented by                                     │ │
│  ├─────────────────┼──────────────────────────────────────────────────┤ │
│  │ Dirty reads     │ Read Committed (and above)                       │ │
│  │ Dirty writes    │ Read Committed (and above)                       │ │
│  │ Read skew       │ Snapshot Isolation (and above)                   │ │
│  │ Lost updates    │ Atomic ops, locks, or Serializable               │ │
│  │ Write skew      │ Serializable only                                │ │
│  │ Phantoms        │ Serializable only                                │ │
│  └─────────────────┴──────────────────────────────────────────────────┘ │
│                                                                          │
│  Performance considerations:                                             │
│  - Read Committed: Good performance, some anomalies                     │
│  - Snapshot Isolation: Good for read-heavy, prevents most anomalies     │
│  - Serializable: Safest but higher latency/aborts                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Key Takeaways

1. **ACID isn't one thing** - each letter means something specific:
   - **A**tomicity: All-or-nothing (abort support)
   - **C**onsistency: Your application's invariants (your job, not the DB's)
   - **I**solation: Concurrent transactions don't interfere
   - **D**urability: Committed data survives failures

2. **Read Committed** is the default in most databases. It prevents dirty reads/writes but allows read skew and lost updates.

3. **Snapshot Isolation** gives each transaction a consistent snapshot. Great for long-running read queries. Uses MVCC internally.

4. **Lost updates** happen in read-modify-write cycles. Prevent with atomic operations, explicit locking, or automatic detection.

5. **Write skew** is subtle - transactions read the same data but write different objects. Only serializable isolation prevents it.

6. **Serializability** can be achieved three ways:
   - **Serial execution:** Simple, but limited to single thread
   - **Two-Phase Locking:** Pessimistic, readers/writers block each other
   - **SSI:** Optimistic, detect conflicts at commit time

7. **Choose your isolation level** based on the anomalies you need to prevent and the performance you need. Stronger isolation = safer but slower.

8. **Test your understanding** of your database's isolation level. The defaults vary, and "repeatable read" means different things in different databases.
