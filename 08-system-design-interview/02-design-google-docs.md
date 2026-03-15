# Design Google Docs

#### What is Google Docs?

Google Docs is a cloud-based word processing application that allows users to create, edit, and share documents online. Unlike traditional editors, it enables real-time collaboration where multiple users can work on the same document simultaneously, seeing each other's changes appear character by character.

The core idea seems simple: let multiple people type in the same document. But the complexity explodes when you consider what happens when Alice types "Hello" at position 10 while Bob simultaneously deletes characters 5-15. Whose edit wins? How do we ensure both users eventually see the same document? This is the **conflict resolution** problem, and solving it elegantly is what makes collaborative editing systems fascinating.

**Popular Examples:** Google Docs, Microsoft Word Online, Notion, Dropbox Paper, Figma (for design)

This system design problem tests several critical distributed systems skills: **real-time synchronization** across multiple clients, **conflict resolution algorithms** (Operational Transformation or CRDTs), **eventual consistency** guarantees, **efficient document storage** with version history, and **presence systems** for showing collaborator cursors.

In this chapter, we will explore the **high-level design of a real-time collaborative editing system**.

---

## On this page

- [1. Clarifying Requirements](#1-clarifying-requirements)
  - [1.1 Functional Requirements](#11-functional-requirements)
  - [1.2 Non-Functional Requirements](#12-non-functional-requirements)
- [2. Capacity Estimation](#2-capacity-estimation)
- [3. High-Level Architecture](#3-high-level-architecture)
  - [3.1 Document Operations Flow](#31-document-operations-flow)
  - [3.2 Real-Time Collaboration Layer](#32-real-time-collaboration-layer)
  - [3.3 Putting It All Together](#33-putting-it-all-together)
- [4. Database Design](#4-database-design)
  - [4.1 User and Document Metadata](#41-user-and-document-metadata)
  - [4.2 Document Content Storage](#42-document-content-storage)
  - [4.3 Version History and Snapshots](#43-version-history-and-snapshots)
  - [4.4 Real-Time Collaboration State](#44-real-time-collaboration-state)
- [5. API Design](#5-api-design)
- [6. Design Deep Dive](#6-design-deep-dive)
  - [6.1 Real-Time Collaborative Editing and Conflict Resolution](#61-real-time-collaborative-editing-and-conflict-resolution)
  - [6.2 Supporting Version History](#62-supporting-version-history)
  - [6.3 Offline Access and Synchronization](#63-offline-access-and-synchronization)
  - [6.4 Document Storage and Rich Text](#64-document-storage-and-rich-text)
  - [6.5 Scaling Collaboration Sessions](#65-scaling-collaboration-sessions)
- [Quiz](#quiz)

---

# 1. Clarifying Requirements

Before diving into the design, it's important to ask thoughtful questions to uncover hidden assumptions, clarify ambiguities, and define the system's scope more precisely.

Here is an example of how a discussion between the candidate and the interviewer might unfold:

Discussion

**Candidate:** "What is the expected scale? How many users and documents should the system support?"

**Interviewer:** "Let's design for 100 million monthly active users, with around 50 million daily active users. Users have an average of 20 documents each."

**Candidate:** "How many concurrent collaborators should we support per document?"

**Interviewer:** "Most documents have 1-5 collaborators, but we should handle up to 100 concurrent editors for large team documents."

**Candidate:** "What types of content should the editor support? Plain text or rich formatting?"

**Interviewer:** "Full rich text: headings, bold, italic, lists, tables, images, and comments. Think of a full word processor."

**Candidate:** "How real-time does it need to be? Should users see each keystroke, or is batching acceptable?"

**Interviewer:** "Near real-time. Users should see each other's changes within 100-200ms. Keystroke-level granularity is important for the collaborative feel."

**Candidate:** "Should we support offline editing?"

**Interviewer:** "Yes. Users should be able to edit offline, and changes should sync when they reconnect, with proper conflict resolution."

**Candidate:** "What about version history? How far back should users be able to revert?"

**Interviewer:** "Users should see a full revision history and be able to restore any previous version. Think of Google Docs' 'Version history' feature."

**Candidate:** "Should we support real-time cursors and presence indicators?"

**Interviewer:** "Yes. Users should see where other collaborators are typing and who is currently viewing the document."

After gathering the details, we can summarize the key system requirements.

## 1.1 Functional Requirements

  * **Create and Retrieve Documents:** Users can create new documents and access them from any device.
  * **Real-Time Collaborative Editing:** Multiple users can edit the same document simultaneously, seeing each other's changes in near real-time.
  * **Rich Text Formatting:** Support headings, bold/italic, lists, tables, images, hyperlinks, and comments.
  * **Live Cursors and Presence:** Users see cursor positions of other collaborators and who is currently viewing the document.
  * **Offline Access and Sync:** Users can edit documents offline, with automatic synchronization when reconnecting.
  * **Access Control and Sharing:** Users can share documents with specific permissions (view, comment, edit).
  * **Version History:** Users can view the revision history and restore previous versions.


Out of Scope

To keep our discussion focused, we will set aside a few features that, while important, would take us down rabbit holes:
  * **Commenting and Suggesting Mode:** Detailed implementation of comments and suggestions.
  * **Templates and Add-ons:** Document templates and third-party integrations.
  * **Real-Time Voice/Video:** Collaborative video calls within documents.
  * **Advanced Formatting:** Footnotes, table of contents, mail merge.


## 1.2 Non-Functional Requirements

  * **Low Latency:** Edits should be visible to all collaborators within 100-200ms. The collaborative experience must feel instantaneous.
  * **High Availability:** The system must be highly available (99.99% uptime). Users expect documents to always be accessible.
  * **Eventual Consistency:** Despite concurrent edits, all users must eventually see the same document state. No edits should be lost.
  * **Scalability:** Support 100M+ monthly active users and thousands of concurrent collaborative sessions.
  * **Durability:** Documents must never be lost. Every change should be persisted reliably.
  * **Conflict Resolution:** When users edit the same region simultaneously, the system must resolve conflicts intelligently without data loss.


# 2. Capacity Estimation

With our requirements clear, let's understand the scale we are dealing with.

We will use these baseline numbers throughout our calculations:
  * **Monthly Active Users (MAU):** 100 million
  * **Daily Active Users (DAU):** 50 million
  * **Peak Concurrent Users:** 1 million
  * **Average Documents per User:** 20
  * **Total Documents:** 100M × 20 = **2 billion documents**


#### Document Storage

Let's calculate storage requirements:
  * **Average Document Size:** 100 KB (structured text with formatting, comments, metadata)
  * **Total Document Storage:** 2 billion × 100 KB = **200 TB**
  * **Version History:** Assume 50 versions per document, each delta ~1 KB
  * **Version Storage:** 2 billion × 50 × 1 KB = **100 TB**
  * **Total Storage:** ~**300 TB** (documents + versions)


This is substantial but manageable with distributed storage systems like S3 or GCS.

#### Real-Time Operations

This is where things get interesting. During active editing:
  * **Active Collaborative Sessions at Peak:** 100,000
  * **Keystrokes per User per Minute:** 100 (fast typing)
  * **Average Collaborators per Active Session:** 3
  * **Total Operations per Second:** 100K sessions × 3 users × 100 keystrokes / 60 = **~500,000 operations/second**


Each keystroke generates an operation that must be:
1. Received by the server
2. Transformed against concurrent operations
3. Persisted to the operation log
4. Broadcast to all other collaborators in the session

This is a high-throughput, low-latency workload that requires careful architecture.

#### Connection Load

Like messaging systems, collaborative editing requires persistent connections:
  * **Concurrent WebSocket Connections:** ~1 million at peak
  * **Servers needed (50K connections each):** ~20 servers just for connection handling


#### Bandwidth

  * **Average Operation Size:** 50 bytes (type, position, character/range)
  * **Inbound Bandwidth:** 500K ops/sec × 50 bytes = **25 MB/sec**
  * **Outbound Bandwidth:** Higher due to broadcast (each op goes to N-1 collaborators)
  * **For 3 collaborators average:** 25 MB/sec × 2 = **50 MB/sec outbound**


# 3. High-Level Architecture

Now let's design the architecture that enables real-time collaborative editing at scale. We'll build incrementally, starting with the simplest design and adding complexity only as needed.

Our system must satisfy three core requirements:
  1. **Real-Time Synchronization:** Changes must propagate to all collaborators within 200ms.
  2. **Conflict Resolution:** Concurrent edits must be merged intelligently without data loss.
  3. **Persistence and Recovery:** Every change must be durably stored for version history and crash recovery.

The fundamental insight that shapes our architecture: **collaborative editing is an eventually consistent system**. We cannot achieve strong consistency with low latency when users on different continents type simultaneously. Instead, we guarantee that all users will eventually see the same document state, even if they temporarily see different intermediate states.

## 3.1 Document Operations Flow

Let's understand how a single edit flows through the system.

### The Components We Need

#### **Collaboration Service**

The core service handling real-time editing sessions. Each active document has a collaboration session managed by this service.

##### **What the Collaboration Service does:**
  * Maintain in-memory state for active documents
  * Receive operations from clients via WebSocket
  * Apply conflict resolution (Operational Transformation or CRDT)
  * Broadcast transformed operations to all collaborators
  * Persist operations to the operation log

#### **Document Service**

Handles document lifecycle operations that don't require real-time processing.

##### **What the Document Service does:**
  * Create, retrieve, and delete documents
  * Manage document metadata (title, owner, sharing settings)
  * Handle access control checks
  * Serve document snapshots for initial load

#### **Operation Log (Append-Only Store)**

A durable, ordered log of all operations applied to each document.

##### **What the Operation Log does:**
  * Store every operation in order for replay and recovery
  * Enable version history by replaying operations
  * Support operation acknowledgment and sequencing
  * Allow recovery if the Collaboration Service crashes

### The Edit Flow

Let's trace what happens when Alice types "H" while collaborating with Bob:

```
Alice's Browser         Collaboration Service         Bob's Browser
      |                         |                          |
      |-- Op: Insert 'H' @5 --->|                          |
      |                         |-- Store to Op Log        |
      |                         |                          |
      |                         |-- Transform if needed    |
      |                         |                          |
      |<-- ACK (seq: 42) -------|                          |
      |                         |                          |
      |                         |-- Broadcast Op --------->|
      |                         |                          |
      |                         |<-- ACK ------------------|
```

**Step 1: Client sends operation**
Alice's editor generates an operation: `{type: "insert", position: 5, char: "H", clientSeq: 17}`. This is sent over the WebSocket to the Collaboration Service.

**Step 2: Server receives and logs**
The Collaboration Service receives the operation, assigns it a global sequence number, and appends it to the operation log. This ensures durability before acknowledging.

**Step 3: Transform if necessary**
If Bob sent a concurrent operation that arrived first, Alice's operation might need transformation. For example, if Bob inserted a character at position 3, Alice's position 5 becomes position 6.

**Step 4: Acknowledge and broadcast**
The server sends an acknowledgment to Alice with the final sequence number. Simultaneously, it broadcasts the (possibly transformed) operation to Bob.

**Step 5: Bob applies the operation**
Bob's client receives the operation and applies it to his local document state. The documents converge to the same state.

## 3.2 Real-Time Collaboration Layer

The real magic happens in how we handle concurrent operations. Let's add the components that make this work.

#### **Session Manager**

Manages the lifecycle of collaboration sessions.

##### **What the Session Manager does:**
  * Create sessions when the first user opens a document
  * Track all connected users per session
  * Handle user join/leave events
  * Clean up sessions when all users disconnect
  * Route operations to the correct session

#### **Presence Service**

Tracks cursor positions and user presence.

##### **What the Presence Service does:**
  * Receive cursor position updates from clients
  * Broadcast cursor positions to other collaborators
  * Track which users are actively viewing/editing
  * Handle presence heartbeats and timeouts

### Handling User Join

When Bob opens a document that Alice is already editing:

```
Bob's Browser          Session Manager          Collaboration Service          Alice's Browser
      |                      |                          |                            |
      |-- Open Document ---->|                          |                            |
      |                      |-- Find/Create Session -->|                            |
      |                      |                          |                            |
      |                      |<-- Session Info ---------|                            |
      |                      |                          |                            |
      |<-- Current State ----|                          |                            |
      |    + User List       |                          |                            |
      |                      |                          |                            |
      |                      |-- Notify: Bob Joined --->|------------------------>  |
      |                      |                          |                            |
```

**Initial state transfer:**
When Bob joins, he receives:
1. The current document content (latest snapshot + recent operations)
2. The current operation sequence number (so he knows where to start)
3. List of other collaborators and their cursor positions

**Presence notification:**
Alice receives a notification that Bob joined, and her UI shows Bob's avatar and cursor.

## 3.3 Putting It All Together

Here's the complete architecture:

```
                                    ┌─────────────────┐
                                    │   Load Balancer │
                                    │  (Sticky by Doc)│
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
                    ▼                        ▼                        ▼
           ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
           │ Collaboration │        │ Collaboration │        │ Collaboration │
           │   Server 1    │        │   Server 2    │        │   Server 3    │
           │               │        │               │        │               │
           │ Sessions:     │        │ Sessions:     │        │ Sessions:     │
           │ Doc A, Doc B  │        │ Doc C, Doc D  │        │ Doc E, Doc F  │
           └───────┬───────┘        └───────┬───────┘        └───────┬───────┘
                   │                        │                        │
                   └────────────────────────┼────────────────────────┘
                                            │
          ┌─────────────────┬───────────────┼───────────────┬─────────────────┐
          │                 │               │               │                 │
          ▼                 ▼               ▼               ▼                 ▼
   ┌─────────────┐   ┌─────────────┐ ┌───────────┐  ┌─────────────┐   ┌─────────────┐
   │  Document   │   │  Presence   │ │ Operation │  │  Snapshot   │   │   Access    │
   │  Service    │   │  Service    │ │    Log    │  │   Store     │   │   Control   │
   └──────┬──────┘   └──────┬──────┘ │  (Kafka)  │  │    (S3)     │   │   Service   │
          │                 │        └─────┬─────┘  └──────┬──────┘   └──────┬──────┘
          │                 │              │               │                 │
          ▼                 ▼              ▼               ▼                 ▼
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │                              PostgreSQL Cluster                              │
   │                      (Users, Documents, Permissions)                         │
   └─────────────────────────────────────────────────────────────────────────────┘
          │                                                                │
          ▼                                                                ▼
   ┌─────────────┐                                                  ┌─────────────┐
   │    Redis    │                                                  │Elasticsearch│
   │  (Sessions, │                                                  │  (Search)   │
   │   Presence) │                                                  └─────────────┘
   └─────────────┘
```

**Key Design Decisions:**

**Sticky load balancing:** All users editing the same document must connect to the same Collaboration Server. This is critical because the server maintains in-memory state for conflict resolution. We use consistent hashing by document ID.

**Operation log with Kafka:** Every operation is appended to a Kafka topic partitioned by document ID. This provides durability, ordering, and enables replay for recovery.

**Snapshot store:** We periodically snapshot the full document state to S3/GCS. This avoids replaying millions of operations when loading an old document.

**Session state in Redis:** Active session information (who is connected, cursor positions) is stored in Redis for fast access and to survive server restarts.

# 4. Database Design

Let's design the data layer that supports our collaborative editing system.

## 4.1 User and Document Metadata

User and document metadata follows traditional relational patterns.

### **Users Table**

```sql
CREATE TABLE users (
    user_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    display_name    VARCHAR(255) NOT NULL,
    avatar_url      VARCHAR(500),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Documents Table**

```sql
CREATE TABLE documents (
    document_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID NOT NULL REFERENCES users(user_id),
    title           VARCHAR(500) NOT NULL DEFAULT 'Untitled Document',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_edited_by  UUID REFERENCES users(user_id),
    is_deleted      BOOLEAN DEFAULT FALSE,

    -- Current state pointers
    current_snapshot_id  UUID,          -- Latest full snapshot
    current_seq_num      BIGINT DEFAULT 0,  -- Latest operation sequence

    -- Collaboration settings
    allow_comments       BOOLEAN DEFAULT TRUE,
    allow_suggestions    BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_documents_owner ON documents(owner_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_documents_updated ON documents(updated_at DESC);
```

### **Document Permissions Table**

```sql
CREATE TABLE document_permissions (
    permission_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES documents(document_id),
    grantee_type    VARCHAR(20) NOT NULL,  -- 'user', 'group', 'anyone_with_link', 'public'
    grantee_id      VARCHAR(255),          -- user_id, group_id, or null
    role            VARCHAR(20) NOT NULL,  -- 'viewer', 'commenter', 'editor', 'owner'
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by      UUID REFERENCES users(user_id),

    UNIQUE(document_id, grantee_type, grantee_id)
);

CREATE INDEX idx_permissions_document ON document_permissions(document_id);
CREATE INDEX idx_permissions_grantee ON document_permissions(grantee_type, grantee_id);
```

## 4.2 Document Content Storage

Document content is NOT stored in PostgreSQL. For collaborative editing, we use a hybrid approach:

### **Operation Log (Kafka)**

Every edit operation is stored as a message in Kafka:

```json
{
  "document_id": "doc_abc123",
  "seq_num": 12345,
  "user_id": "user_xyz",
  "timestamp": "2026-01-24T10:30:00Z",
  "operation": {
    "type": "insert",
    "position": 42,
    "content": "Hello",
    "attributes": {"bold": true}
  },
  "client_seq": 17,
  "parent_seq": 12344
}
```

**Why Kafka?**
- Append-only, high-throughput writes
- Ordered within partition (partition by document_id)
- Durable with replication
- Enables replay for recovery and version history
- Consumers can read historical operations

### **Snapshots (S3/Object Storage)**

We periodically snapshot the full document to avoid replaying all operations:

```json
{
  "document_id": "doc_abc123",
  "snapshot_id": "snap_789",
  "seq_num": 12000,
  "created_at": "2026-01-24T10:00:00Z",
  "content": {
    "type": "doc",
    "content": [
      {"type": "paragraph", "content": [{"type": "text", "text": "Hello World"}]},
      {"type": "heading", "attrs": {"level": 1}, "content": [...]}
    ]
  }
}
```

**Snapshot strategy:**
- Create snapshot every 1000 operations OR every 5 minutes of activity
- Keep last 10 snapshots for quick recovery
- Older snapshots archived for version history

## 4.3 Version History and Snapshots

Version history allows users to see who changed what and when.

### **Versions Table (PostgreSQL)**

```sql
CREATE TABLE document_versions (
    version_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES documents(document_id),
    snapshot_id     UUID NOT NULL,        -- Reference to S3 snapshot
    snapshot_url    VARCHAR(500) NOT NULL,
    seq_num_start   BIGINT NOT NULL,
    seq_num_end     BIGINT NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by      UUID REFERENCES users(user_id),

    -- Summary for UI
    title_at_version VARCHAR(500),
    word_count       INTEGER
);

CREATE INDEX idx_versions_document ON document_versions(document_id, created_at DESC);
```

### **Reconstructing Historical Versions**

To show the document at a specific point:

1. Find the nearest snapshot before the requested time
2. Replay operations from the snapshot's seq_num to the target seq_num
3. Render the resulting document

This is why we keep frequent snapshots - replaying 1000 operations is much faster than replaying 1 million.

## 4.4 Real-Time Collaboration State

Active session state is stored in Redis for fast access:

### **Session Data (Redis)**

```
# Active session for a document
session:{document_id} -> {
  "server_id": "collab-server-2",
  "created_at": "2026-01-24T10:00:00Z",
  "current_seq": 12345
}

# Connected users in a session
session:{document_id}:users -> Set(user_id1, user_id2, ...)

# Cursor positions
cursor:{document_id}:{user_id} -> {
  "position": 42,
  "selection_start": 42,
  "selection_end": 50,
  "color": "#FF5733",
  "updated_at": 1706092200
}
TTL: 30 seconds (refreshed on each cursor update)
```

**Why Redis?**
- Sub-millisecond reads for presence queries
- Built-in TTL for automatic cleanup
- Pub/Sub for cursor position broadcast
- Survives Collaboration Server restarts

# 5. API Design

Let's define the APIs for our collaborative editing system. We have two types: REST APIs for document management and WebSocket APIs for real-time collaboration.

## REST APIs

### **1. Create Document**

#### Endpoint: `POST /documents`

Creates a new document.

##### **Request Body:**

```json
{
  "title": "Q1 Planning Document",
  "content": null,
  "folder_id": "folder_abc"
}
```

##### **Response:**

```json
{
  "document_id": "doc_xyz789",
  "title": "Q1 Planning Document",
  "owner_id": "user_abc",
  "created_at": "2026-01-24T10:30:00Z",
  "share_link": "https://docs.example.com/d/doc_xyz789"
}
```

### **2. Get Document**

#### Endpoint: `GET /documents/{document_id}`

Retrieves document metadata and content for initial load.

##### **Response:**

```json
{
  "document_id": "doc_xyz789",
  "title": "Q1 Planning Document",
  "owner": {"user_id": "user_abc", "name": "Alice", "avatar_url": "..."},
  "current_seq": 12345,
  "snapshot": {
    "seq_num": 12000,
    "content": {...}
  },
  "operations_since_snapshot": [
    {"seq": 12001, "op": {...}},
    {"seq": 12002, "op": {...}}
  ],
  "collaborators": [
    {"user_id": "user_def", "name": "Bob", "cursor_position": 42}
  ],
  "permissions": {
    "can_edit": true,
    "can_comment": true,
    "can_share": false
  }
}
```

The client receives everything needed to render the current document and join the collaboration session.

### **3. Share Document**

#### Endpoint: `POST /documents/{document_id}/share`

##### **Request Body:**

```json
{
  "shares": [
    {"email": "bob@company.com", "role": "editor"},
    {"email": "carol@company.com", "role": "commenter"}
  ],
  "notify": true,
  "message": "Please review this document"
}
```

### **4. Get Version History**

#### Endpoint: `GET /documents/{document_id}/versions`

##### **Response:**

```json
{
  "versions": [
    {
      "version_id": "ver_123",
      "timestamp": "2026-01-24T10:30:00Z",
      "edited_by": {"user_id": "user_abc", "name": "Alice"},
      "summary": "Added introduction section"
    },
    {
      "version_id": "ver_122",
      "timestamp": "2026-01-24T09:15:00Z",
      "edited_by": {"user_id": "user_def", "name": "Bob"},
      "summary": "Fixed typos"
    }
  ],
  "next_page_token": "..."
}
```

### **5. Restore Version**

#### Endpoint: `POST /documents/{document_id}/restore`

##### **Request Body:**

```json
{
  "version_id": "ver_100"
}
```

This creates a new version that matches the content of the specified historical version.

## WebSocket API

Real-time collaboration happens over WebSocket connections.

### **Connection Handshake**

```
Client -> Server:
{
  "type": "join",
  "document_id": "doc_xyz789",
  "auth_token": "jwt_token",
  "client_id": "browser_abc",
  "last_seen_seq": 12340
}

Server -> Client:
{
  "type": "joined",
  "session_id": "sess_123",
  "your_color": "#FF5733",
  "current_seq": 12345,
  "collaborators": [...]
}
```

### **Send Operation**

```
Client -> Server:
{
  "type": "operation",
  "client_seq": 18,
  "parent_seq": 12345,
  "operation": {
    "type": "insert",
    "position": 42,
    "content": "Hello"
  }
}

Server -> Client (ACK):
{
  "type": "ack",
  "client_seq": 18,
  "server_seq": 12346
}

Server -> Other Clients (Broadcast):
{
  "type": "operation",
  "server_seq": 12346,
  "user_id": "user_abc",
  "operation": {
    "type": "insert",
    "position": 42,
    "content": "Hello"
  }
}
```

### **Cursor Update**

```
Client -> Server:
{
  "type": "cursor",
  "position": 42,
  "selection_start": 42,
  "selection_end": 50
}

Server -> Other Clients:
{
  "type": "cursor",
  "user_id": "user_abc",
  "user_name": "Alice",
  "color": "#FF5733",
  "position": 42,
  "selection_start": 42,
  "selection_end": 50
}
```

### **Presence Events**

```
Server -> All Clients:
{
  "type": "user_joined",
  "user": {"user_id": "user_def", "name": "Bob", "color": "#33FF57"}
}

Server -> All Clients:
{
  "type": "user_left",
  "user_id": "user_def"
}
```

# 6. Design Deep Dive

Now let's explore the trickiest aspects of building a collaborative editing system.

## 6.1 Real-Time Collaborative Editing and Conflict Resolution

This is the heart of Google Docs. When Alice and Bob type at the same time, how do we ensure they both see the same final document?

### The Conflict Problem

Consider this scenario:
- Document state: "Hello"
- Alice inserts "X" at position 0: "XHello"
- Bob inserts "Y" at position 5: "HelloY"
- Both operations are sent concurrently

If we apply them naively:
- Server receives Alice's op first, applies it: "XHello"
- Server receives Bob's op (insert at position 5), applies it: "XHellYo"

Bob's "Y" ended up in the wrong place because Alice's insertion shifted the positions.

### Solution: Operational Transformation (OT)

Operational Transformation is the algorithm that makes collaborative editing work. The key insight: **when applying a remote operation, transform it against any concurrent local operations.**

**The OT Function:**

```
transform(op1, op2) -> (op1', op2')
```

Given two concurrent operations, produce transformed versions such that:
- Applying op1 then op2' gives the same result as applying op2 then op1'

**Example Transform for Insert:**

```python
def transform_insert_insert(op1, op2):
    """Transform op1 against op2 (both are inserts)"""
    if op1.position <= op2.position:
        # op1 is before or at op2, op2 shifts right
        return op1, Insert(op2.position + len(op1.content), op2.content)
    else:
        # op2 is before op1, op1 shifts right
        return Insert(op1.position + len(op2.content), op1.content), op2
```

**Back to our example:**
- Alice: Insert "X" at 0
- Bob: Insert "Y" at 5

Server receives Alice first, broadcasts to Bob. Bob's client transforms his pending operation:
- Transform(Bob's insert at 5, Alice's insert at 0)
- Since Alice's position (0) < Bob's position (5), Bob's position shifts: Insert at 6
- Result: "XHelloY" - correct!

### OT in Practice

The server maintains a sequence number for each operation. Clients track:
- `server_seq`: Last acknowledged server sequence
- `pending_ops`: Operations sent but not yet acknowledged
- `buffer_ops`: Operations generated while waiting for acknowledgment

**Client-side algorithm:**

```python
def on_local_operation(op):
    buffer_ops.append(op)
    apply_locally(op)
    if not pending_ops:
        send_to_server(op)
        pending_ops.append(op)

def on_server_ack(ack):
    pending_ops.pop(0)
    if buffer_ops:
        op = buffer_ops.pop(0)
        send_to_server(op)
        pending_ops.append(op)

def on_remote_operation(remote_op):
    # Transform against pending and buffer ops
    for pending in pending_ops:
        remote_op, pending = transform(remote_op, pending)
    for buffered in buffer_ops:
        remote_op, buffered = transform(remote_op, buffered)
    apply_locally(remote_op)
```

### Alternative: CRDTs

**Conflict-free Replicated Data Types (CRDTs)** are an alternative to OT that guarantee convergence by design.

**How CRDTs work:**
Instead of positions, each character has a unique, globally-ordered ID. Insertions place new characters between existing IDs.

```
"Hello" with CRDTs:
H[id:a1] e[id:a2] l[id:a3] l[id:a4] o[id:a5]

Alice inserts X at start: X[id:b1, between: start, a1]
Bob inserts Y at end: Y[id:c1, between: a5, end]

IDs are ordered: b1 < a1 < a2 < a3 < a4 < a5 < c1
Result: "XHelloY" - automatically correct!
```

**OT vs CRDT Trade-offs:**

| Aspect | OT | CRDT |
|--------|-----|------|
| Server requirement | Central server needed | Can be peer-to-peer |
| Complexity | Complex transforms | Complex data structures |
| Memory | Low | Higher (stores IDs per char) |
| Undo/Redo | Straightforward | Complex |
| Proven at scale | Google Docs, Etherpad | Figma, Yjs |

For a centralized client-server editor, OT is a reasonable default and has been proven in production systems. For offline-first or more decentralized collaboration models, CRDTs are often attractive because they reduce reliance on one central transformation authority.

## 6.2 Supporting Version History

Users expect to see who changed what and when, and to restore previous versions.

### Automatic Version Checkpoints

We create named versions at strategic points:
1. **Time-based:** Every 30 minutes of inactivity
2. **Size-based:** Every 1000 operations
3. **Semantic:** When a user explicitly closes the document
4. **Manual:** When a user names a version

### Version Storage Strategy

```
Timeline of a document:
├── Snapshot @ seq 0 (created)
├── 500 operations...
├── Snapshot @ seq 500
├── 300 operations...
├── Snapshot @ seq 800
├── Version "First Draft" @ seq 800
├── 200 operations...
├── Snapshot @ seq 1000
├── Current @ seq 1050
```

**To view "First Draft":**
1. Load snapshot at seq 800 (exact match)
2. Render immediately

**To view document at seq 950:**
1. Load snapshot at seq 800
2. Replay operations 801-950
3. Render result

### Efficient Diff for History View

When showing "what changed between versions," we don't replay all operations. Instead:

1. Load both snapshots
2. Run a diff algorithm (similar to git diff)
3. Highlight additions/deletions

For attribution ("who wrote this paragraph"), we store author info with each operation and propagate it to the final content.

## 6.3 Offline Access and Synchronization

Offline editing is challenging because it breaks the assumption of a central coordinator.

### Offline Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │   Editor    │<-->│ Local State │<-->│  IndexedDB  │ │
│  │    (UI)     │    │   Manager   │    │   Storage   │ │
│  └─────────────┘    └──────┬──────┘    └─────────────┘ │
│                            │                            │
│                     ┌──────▼──────┐                     │
│                     │    Sync     │                     │
│                     │   Manager   │                     │
│                     └──────┬──────┘                     │
└────────────────────────────┼────────────────────────────┘
                             │ (when online)
                             ▼
                     ┌───────────────┐
                     │    Server     │
                     └───────────────┘
```

### Offline Workflow

**Going offline:**
1. Client detects connection loss
2. Operations continue to be generated and applied locally
3. Operations are queued in IndexedDB
4. UI shows "offline" indicator

**Coming online:**
1. Client reconnects to server
2. Sync Manager sends queued operations with last known server seq
3. Server identifies the fork point
4. Server sends any operations the client missed
5. Client transforms queued ops against server ops
6. Client reapplies transformed ops and sends to server
7. Documents converge

### Conflict Resolution for Offline

With OT, offline sync uses the same transformation logic. The challenge is scale: if the user was offline for an hour, they might have hundreds of operations to transform against hundreds of server operations.

**Optimization:** Use snapshots as sync points. If the client's state has diverged significantly, fetch the latest snapshot and merge at the document level rather than operation level.

## 6.4 Document Storage and Rich Text

Storing rich text documents requires careful schema design.

### Document Model

We use a tree structure similar to ProseMirror or Slate:

```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": {"level": 1},
      "content": [
        {"type": "text", "text": "Introduction"}
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {"type": "text", "text": "This is "},
        {"type": "text", "marks": [{"type": "bold"}], "text": "important"},
        {"type": "text", "text": " content."}
      ]
    },
    {
      "type": "bullet_list",
      "content": [
        {"type": "list_item", "content": [...]},
        {"type": "list_item", "content": [...]}
      ]
    }
  ]
}
```

**Why this structure?**
- Preserves formatting hierarchy (headings, paragraphs, lists)
- Marks (bold, italic) are separate from structure
- Easy to traverse for rendering
- Maps cleanly to HTML/DOM

### Operations on Rich Text

Operations for rich text are more complex than plain text:

```json
// Insert formatted text
{
  "type": "insert",
  "position": 42,
  "content": [
    {"type": "text", "marks": [{"type": "bold"}], "text": "Hello"}
  ]
}

// Apply mark to range
{
  "type": "addMark",
  "from": 10,
  "to": 20,
  "mark": {"type": "italic"}
}

// Change block type
{
  "type": "setBlockType",
  "position": 0,
  "blockType": "heading",
  "attrs": {"level": 2}
}
```

The OT transforms must handle all these operation types and their interactions.

## 6.5 Scaling Collaboration Sessions

With 100K concurrent collaborative sessions, we need efficient resource management.

### Session Affinity

One common design is to route all users editing document X to the same collaboration server while the session is active. This is attractive because:
1. The server maintains in-memory state for OT
2. Broadcasting happens locally (no cross-server communication for each keystroke)

**Implementation:** Consistent hashing by document_id

```
hash(document_id) % num_servers = target_server
```

When a server fails, its documents are redistributed to other servers, which rebuild state from the operation log.

### Session Lifecycle

```
Session States:
┌─────────┐     first user     ┌─────────┐
│  NONE   │ ─────────────────> │ ACTIVE  │
└─────────┘                    └────┬────┘
                                    │
                            last user leaves
                                    │
                                    ▼
                               ┌─────────┐     5 minutes     ┌─────────┐
                               │ IDLE    │ ────────────────> │ CLOSED  │
                               └─────────┘                   └─────────┘
```

**Active session:**
- Document state in memory
- WebSocket connections maintained
- Operations processed immediately

**Idle session:**
- No active connections
- State still in memory (hot cache)
- Quick to reactivate

**Closed session:**
- State evicted from memory
- Must reload from snapshot + operations to reactivate

### Memory Management

Each active document consumes memory for:
- Document content (variable, ~100KB average)
- Operation buffer for OT (~10KB)
- User presence data (~1KB per user)

**For 100K sessions with 3 users each:**
- Memory per session: ~115 KB
- Total memory: ~11.5 GB

Distributed across 20 servers, that's ~575 MB per server - very manageable.

### Hot Documents

Some documents (company-wide announcements, popular templates) might have hundreds of concurrent editors. These require special handling:

1. **Dedicated servers:** Route hot documents to high-memory servers
2. **Operation batching:** Group rapid keystrokes into single operations
3. **Cursor throttling:** Limit cursor update frequency to 10/second
4. **Presence summarization:** Show "and 47 others" instead of all cursors

# Quiz

## Design Google Docs Quiz

**1. What is the primary purpose of Operational Transformation (OT)?**

A) Compressing document content
B) Resolving conflicts when concurrent edits target overlapping positions
C) Encrypting document content
D) Caching document snapshots

**Answer: B** - OT transforms concurrent operations so they can be applied in any order while still converging to the same final state.

---

**2. Why do we use Kafka for the operation log instead of PostgreSQL?**

A) Kafka is cheaper
B) Kafka provides ordered, append-only, high-throughput writes ideal for operation logging
C) PostgreSQL cannot store JSON
D) Kafka has built-in conflict resolution

**Answer: B** - The operation log requires high-throughput appends with ordering guarantees. Kafka's log-based architecture is purpose-built for this, while PostgreSQL would struggle with 500K writes/second.

---

**3. When a user opens a document, why do we send both a snapshot AND recent operations?**

A) For data redundancy
B) Snapshots are created periodically, and operations since the last snapshot must be replayed to get current state
C) To reduce server load
D) Operations contain comments, snapshots contain content

**Answer: B** - Snapshots are created at intervals (every 1000 ops), so the current state requires replaying operations since the last snapshot.

---

**4. Why is sticky session routing (all users of a document to same server) essential?**

A) To reduce network hops
B) The server maintains in-memory state for OT, and operations must be sequenced by a single coordinator
C) For better caching
D) To simplify authentication

**Answer: B** - OT requires a single coordinator to sequence operations and maintain document state. Distributing users across servers would require cross-server coordination for every keystroke.

---

**5. What is the main advantage of CRDTs over OT for collaborative editing?**

A) Lower memory usage
B) Simpler implementation
C) Can work peer-to-peer without a central server
D) Better support for undo/redo

**Answer: C** - CRDTs guarantee convergence by design, enabling peer-to-peer collaboration and better offline support, though at the cost of higher memory usage and complexity.

---

**6. How does offline editing sync when the user comes back online?**

A) The offline edits are discarded
B) Queued operations are transformed against server operations and then applied
C) The entire document is replaced with the server version
D) The user must manually resolve conflicts

**Answer: B** - The sync manager transforms queued offline operations against any operations that happened on the server during the offline period, then sends the transformed operations.
