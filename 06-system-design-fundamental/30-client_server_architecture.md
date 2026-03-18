# Client-Server Architecture

[← Back to Index](README.md)

Imagine you are building a collaborative notes product. The first version feels simple, so you let every desktop and mobile client talk directly to the database, embed shared credentials in the app, and duplicate validation logic in three different frontends.

Without a proper client-server boundary, the system quickly becomes difficult to secure, evolve, and reason about:

```typescript
// Bad example: every client owns persistence details, credentials,
// and business rules that should be centralized.
type NoteRecord = {
  id: string;
  ownerId: string;
  title: string;
  body: string;
};

class DesktopNotesApp {
  private readonly databaseUrl = "postgres://shared-user:shared-password@db.internal:5432/app";

  async saveNote(note: NoteRecord): Promise<void> {
    if (note.title.length === 0) {
      throw new Error("Title is required");
    }

    if (note.body.length > 20_000) {
      throw new Error("Body is too large");
    }

    await fetch(`${this.databaseUrl}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/sql" },
      body: `
        INSERT INTO notes (id, owner_id, title, body)
        VALUES ('${note.id}', '${note.ownerId}', '${note.title}', '${note.body}')
        ON CONFLICT (id)
        DO UPDATE SET title = '${note.title}', body = '${note.body}';
      `,
    });
  }
}
```

This usually fails in predictable ways:
- secrets leak because clients need more access than they should
- validation and authorization drift across clients
- database schema changes force coordinated releases everywhere
- concurrency, auditing, and abuse prevention become hard to enforce

This is where **client-server architecture** comes in. Clients focus on user interaction and request submission. Servers centralize shared state, business rules, policy enforcement, and controlled access to resources.

In this chapter, you will learn:
  * [Why client-server architecture exists](#1-why-client-server-architecture-exists)
  * [What client-server architecture is and is not](#2-what-client-server-architecture-is)
  * [Which building blocks define the model](#3-core-building-blocks)
  * [How a client-server request flows end to end](#4-how-client-server-communication-works)
  * [Which common models and variations matter in practice](#5-common-models-and-variations)
  * [How servers handle state, sessions, and data ownership](#6-state-sessions-and-data-ownership)
  * [Which scalability, reliability, and security trade-offs matter most](#7-scalability-reliability-and-security-trade-offs)
  * [What practical TypeScript implementations look like](#8-practical-typescript-patterns)
  * [Which best practices prevent common failures](#9-best-practices-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why Client-Server Architecture Exists

Client-server architecture exists because many systems need a controlled way for multiple users or devices to access shared data and services.

### The Core Problem

As soon as more than one user depends on the same application state, local-only logic stops being enough.

Examples:
- two users edit the same document
- many customers place orders against the same inventory pool
- an organization needs one access-control policy across web, mobile, and internal tools

Without a server boundary, every client must somehow solve:
- how to authenticate users
- how to validate input consistently
- how to coordinate writes to shared state
- how to protect sensitive data and internal infrastructure

```text
Without a server:

browser app  ---> direct database access
mobile app   ---> direct database access
desktop app  ---> direct database access

Result:
  -> duplicated business rules
  -> inconsistent security posture
  -> hard-to-control shared state
  -> fragile upgrades
```

### Why Centralization Helps

A server gives the system a place to centralize:
- business logic
- authorization checks
- audit logging
- shared resource management
- controlled access to databases, files, and downstream services

That does not mean every system needs one large central server forever. It means there is value in having a managed service boundary between user-facing clients and protected resources.

### What Problem the Pattern Solves

The durable value of client-server architecture is not merely "clients talk to servers." The real value is:
- clients can stay relatively lightweight
- servers can evolve shared logic in one place
- infrastructure can protect and scale server resources more predictably

This is one of the reasons the pattern remains foundational across web applications, mobile backends, internal tools, multiplayer systems, and many enterprise platforms.


# 2. What Client-Server Architecture Is

Client-server architecture is a model in which a client requests work or data from a server, and the server processes the request, applies policy and business rules, interacts with protected resources if needed, and returns a response.

### A Conservative Definition

The durable idea is:

```text
Client-server architecture =
  client initiates interaction
  + server owns shared service boundary
  + network carries requests and responses
  + server mediates access to resources and state
```

### What the Client Typically Owns

A client usually owns:
- rendering the user interface
- collecting user input
- local presentation state
- request initiation
- limited local caching for responsiveness

Examples of clients:
- web browsers
- mobile apps
- desktop applications
- command-line tools
- other services acting as callers

### What the Server Typically Owns

A server usually owns:
- request handling
- authentication and authorization checks
- business logic
- database or storage access
- integration with other internal systems
- rate limiting, auditing, and other policy controls

### What It Is Not

Client-server architecture is usually not:
- a guarantee that the client must be "thin"
- the same thing as a monolith or microservices
- limited to HTTP, even though HTTP is common
- a promise that the server stores all state in one database

You can have:
- a thick desktop client with offline logic and a server for synchronization
- a thin browser client backed by several server-side layers
- one server process or many cooperating services

### High-Level Model

```text
┌──────────────┐          request           ┌──────────────┐
│ Client       │ -------------------------> │ Server       │
│ UI + input   │                            │ logic + data │
└──────────────┘ <------------------------- └──────────────┘
                      response
```

The client initiates interaction, but the server remains the authoritative gate for shared resources.


# 3. Core Building Blocks

Most client-server systems can be understood through a few recurring building blocks.

### 1. Client

The client is the consumer of the service.

It often handles:
- user interaction
- local validation for faster feedback
- request formatting
- response rendering

Useful design rule:
- clients may assist the user
- servers must still enforce correctness

### 2. Server

The server receives requests and decides what is allowed, what data changes, and what response should be returned.

A server may be:
- a web application process
- an API service
- a file server
- an authentication service
- a game server

### 3. Network and Protocols

The client and server need a communication path and agreed rules.

Common examples:
- TCP for reliable ordered transport
- TLS for encrypted transport
- HTTP for request-response semantics
- WebSocket for long-lived bidirectional communication

The architectural point is less about the specific protocol and more about having a stable contract over the network.

### 4. Data and Protected Resources

Most useful servers mediate access to resources such as:
- relational databases
- object storage
- caches
- queues
- internal services

```text
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ Client       │ ---> │ Server       │ ---> │ Database     │
└──────────────┘      │ auth + logic │      └──────────────┘
                      │ validation   │
                      └──────┬───────┘
                             │
                             ▼
                      ┌──────────────┐
                      │ Cache / File │
                      │ Queue / API  │
                      └──────────────┘
```

### 5. Contracts

A client-server system works well only when the contract is explicit:
- request shape
- response shape
- status and error semantics
- authentication expectations
- versioning and compatibility rules

Weak contracts create fragile coupling even when the network topology looks clean.


# 4. How Client-Server Communication Works

The mechanics vary by protocol and deployment model, but the end-to-end flow is usually understandable in a few steps.

### Step-by-Step Request Flow

```text
1. Client gathers input and builds a request
2. Client resolves the server destination
3. Client opens or reuses a network connection
4. Client sends request metadata and payload
5. Server authenticates the caller if needed
6. Server validates input and executes business logic
7. Server reads or writes data and calls dependencies
8. Server returns a response
9. Client renders the result or handles the error
```

### Example Web Flow

```text
browser
  -> DNS lookup for api.example.com
  -> TCP/TLS connection
  -> HTTP request: POST /orders
  -> server auth + validation + order creation
  -> database write
  -> HTTP response: 201 Created
  -> browser updates UI
```

### ASCII Sequence Diagram

```text
Client                     Server                     Database
  |                          |                            |
  |--- request ------------->|                            |
  |                          |--- validate/auth --------->|
  |                          |<-- optional state lookup --|
  |                          |--- write/read -----------> |
  |                          |<-- result -----------------|
  |<-- response -------------|                            |
  |                          |                            |
```

### Request-Response Is Common, Not Exclusive

Many client-server systems still revolve around request-response, but not every interaction is strictly one request followed by one response.

Common variations:
- long polling for near-real-time updates
- server-sent events for streaming updates from server to client
- WebSocket or similar protocols for bidirectional communication
- asynchronous job submission where the server accepts work and the client checks status later

Even in these cases, the server still acts as the controlled service boundary.

### Latency Changes Design

Because the client and server communicate over a network:
- requests can fail
- responses can arrive late
- duplicate submissions can happen
- clients can disconnect mid-operation

This is why client-server design always needs:
- explicit timeouts
- retry rules
- idempotency thinking
- clear error semantics


# 5. Common Models and Variations

People often describe client-server architecture using tiers or by how much work the client performs.

### Two-Tier Model

The simplest common form is a client talking directly to one application or database server.

```text
client <--> application/database server
```

This can work for:
- small internal tools
- limited user counts
- tightly controlled environments

Weaknesses often include:
- tight coupling
- harder scaling boundaries
- too much trust between client and backend resources

### Three-Tier Model

A more common web-oriented form separates presentation, application logic, and storage.

```text
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Client       │ --> │ App Server   │ --> │ Database     │
│ browser/app  │ <-- │ API + logic  │ <-- │ persistent   │
└──────────────┘     └──────────────┘     └──────────────┘
```

This improves:
- separation of concerns
- security boundaries
- independent scaling of application and storage layers

### N-Tier or Layered Variations

As systems grow, more layers are often introduced:
- load balancers
- API gateways
- caches
- search services
- background workers
- message queues

```text
client
  -> CDN / edge
  -> load balancer
  -> API layer
  -> domain services
  -> data stores
```

This is still client-server architecture. It is simply a more layered version of it.

### Thin Client vs Thick Client

Another useful distinction is where more logic lives.

```text
┌────────────────────┬──────────────────────────────────────┬──────────────────────────────────────┐
│ Model              │ Strengths                            │ Trade-offs                           │
├────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ Thin client        │ Simple deployment, central control,  │ More server dependency, limited      │
│                    │ easier policy consistency            │ offline behavior                     │
├────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ Thick client       │ Better local responsiveness, richer  │ Harder version coordination, more    │
│                    │ offline support, more local features │ duplication risk, larger attack      │
│                    │                                      │ surface                              │
└────────────────────┴──────────────────────────────────────┴──────────────────────────────────────┘
```

Neither is universally correct. The right choice depends on:
- offline requirements
- performance constraints
- security posture
- release cadence
- how much local capability the product needs

### Centralized vs Distributed Server Side

The server side can also vary:
- one application process
- a modular monolith
- multiple services behind one API boundary

From the client’s point of view, those may all still behave like "the server." The internal server architecture is a separate design choice.


# 6. State, Sessions, and Data Ownership

Client-server architecture becomes much more useful when you decide clearly where state lives and who owns it.

### Server Authority Matters

In most multi-user systems, the server should remain authoritative for:
- account state
- financial balances
- inventory counts
- permissions
- business events and audit records

If the client becomes the source of truth for shared business state, correctness and abuse prevention become much harder.

### Client State vs Server State

```text
Client-side state:
  - current screen
  - input field values
  - temporary UI filters
  - cached recent results

Server-side state:
  - canonical records
  - permissions
  - workflows
  - durable events
  - reconciliation history
```

### Sessions and Authentication State

A frequent design question is where to keep session information.

Common options:
- server-managed session records
- signed or encrypted tokens validated by the server
- hybrid models with short-lived tokens and server-side revocation or refresh logic

The right choice depends on:
- revocation needs
- horizontal scaling approach
- threat model
- operational simplicity

### Session Flow Example

```text
1. Client submits credentials to auth server
2. Server verifies identity
3. Server creates session or issues token
4. Client includes session cookie or token in later requests
5. Server revalidates access on each protected request
```

### Data Ownership and Consistency

Even simple client-server systems need a view on consistency:
- can two clients update the same record at once
- how are conflicts resolved
- what happens if a request is retried
- when is cached data considered stale

Common safeguards:
- optimistic locking
- version fields
- idempotency keys for write operations
- server-side timestamps and audit trails

### Why "The Client Already Checked It" Is Not Enough

Client-side checks are helpful for user experience, but the server must still re-check:
- required fields
- permissions
- allowed state transitions
- limits and quotas

```text
Bad:
  trust the client's total price, role, and validation result

Good:
  treat the client as a request source
  recompute sensitive decisions on the server
```


# 7. Scalability, Reliability, and Security Trade-offs

Client-server architecture is practical because it centralizes control, but that same centralization can create bottlenecks if the system is not designed carefully.

### Scalability Considerations

A single server can be enough for early stages. As load grows, scaling typically involves:
- running multiple server instances
- placing a load balancer in front
- caching frequently read data
- separating read-heavy and write-heavy paths
- moving long-running work to background processing

```text
Clients
  -> Load balancer
     -> Server A
     -> Server B
     -> Server C
           |
           -> Cache
           -> Database
           -> Queue for background jobs
```

### Reliability Considerations

The classic failure risk is obvious: if the server is down, clients may lose access.

Common mitigations:
- redundant server instances
- health checks and failover
- database backups and replication
- graceful degradation for non-critical features
- timeouts and circuit breakers on downstream calls

### Security Benefits

A server boundary helps security because clients no longer need direct access to protected systems.

Useful security properties:
- credentials stay on the server side
- authorization can be enforced consistently
- audit logs can be centralized
- input sanitization and rate limiting can happen before state changes

### Security Risks Still Remain

Centralization helps, but it does not make the system safe by default.

Common risks:
- over-trusting client input
- exposing internal error details
- weak session handling
- no rate limiting on expensive endpoints
- insufficient transport protection for sensitive traffic

### Trade-off Table

```text
┌──────────────────────┬──────────────────────────────────────┬──────────────────────────────────────┐
│ Design choice        │ Benefit                              │ Cost or risk                         │
├──────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ More server logic    │ Stronger control and consistency     │ Higher server load                   │
├──────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ More client logic    │ Better responsiveness and offline    │ Version drift and trust issues       │
│                      │ capability                           │                                      │
├──────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ Centralized data     │ Easier auditing and coordination     │ Hotspot if scaling is ignored        │
├──────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ Layered server side  │ Clear separation and growth path     │ More latency and operational         │
│                      │                                      │ complexity                           │
└──────────────────────┴──────────────────────────────────────┴──────────────────────────────────────┘
```

### When the Model Fits Best

The model fits especially well when:
- many users share common data or workflows
- access control must be enforced consistently
- product behavior must evolve without updating every client at once
- server-side observability and auditability matter

It is less attractive when:
- the application is fully local and single-user
- network dependency is unacceptable and no useful synchronization model exists
- central coordination adds more complexity than the problem requires


# 8. Practical TypeScript Patterns

The architecture is conceptual, but the day-to-day implementation comes down to contracts, timeouts, validation, and separation of responsibilities.

### Pattern 1: A Typed Client with Explicit Timeout and Error Handling

Clients should treat remote calls as failure-prone and latency-sensitive.

```typescript
type NoteSummary = {
  id: string;
  title: string;
  updatedAtIso: string;
};

class NotesApiClient {
  constructor(private readonly baseUrl: string, private readonly authToken: string) {}

  async listNotes(): Promise<NoteSummary[]> {
    const response = await fetch(`${this.baseUrl}/notes`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.authToken}`,
      },
      signal: AbortSignal.timeout(1_000),
    });

    if (!response.ok) {
      throw new Error(`Failed to list notes: ${response.status}`);
    }

    return (await response.json()) as NoteSummary[];
  }
}
```

Useful design rule:
- clients can retry carefully
- clients should not assume the network is always fast or available

### Pattern 2: Keep Server Logic Behind Explicit Layers

A simple separation between controller, service, and repository often keeps the boundary easier to evolve.

```typescript
type CreateNoteInput = {
  ownerId: string;
  title: string;
  body: string;
};

type Note = CreateNoteInput & {
  id: string;
  createdAtIso: string;
};

interface NotesRepository {
  insert(note: Note): Promise<void>;
}

class NotesService {
  constructor(private readonly repository: NotesRepository) {}

  async createNote(input: CreateNoteInput): Promise<Note> {
    if (input.title.trim().length === 0) {
      throw new Error("Title is required");
    }

    if (input.body.length > 20_000) {
      throw new Error("Body exceeds maximum size");
    }

    const note: Note = {
      ...input,
      id: crypto.randomUUID(),
      createdAtIso: new Date().toISOString(),
    };

    await this.repository.insert(note);
    return note;
  }
}
```

This is not about ceremony for its own sake. It makes it easier to:
- change persistence without rewriting request handling
- test business rules without a real database
- keep transport details out of domain logic

### Pattern 3: Idempotent Write Handling on the Server

Client retries are common. Servers should handle duplicate submissions deliberately.

```typescript
type CreateOrderCommand = {
  userId: string;
  sku: string;
  quantity: number;
  idempotencyKey: string;
};

type OrderResult = {
  orderId: string;
  acceptedAtIso: string;
};

interface IdempotencyStore {
  get(key: string): Promise<OrderResult | undefined>;
  put(key: string, result: OrderResult): Promise<void>;
}

class OrdersService {
  constructor(private readonly idempotencyStore: IdempotencyStore) {}

  async createOrder(command: CreateOrderCommand): Promise<OrderResult> {
    const existing = await this.idempotencyStore.get(command.idempotencyKey);
    if (existing) {
      return existing;
    }

    const result: OrderResult = {
      orderId: crypto.randomUUID(),
      acceptedAtIso: new Date().toISOString(),
    };

    await this.idempotencyStore.put(command.idempotencyKey, result);
    return result;
  }
}
```

This pattern matters because a reliable client-server system assumes retries and duplicate delivery can happen.

### Pattern 4: Recompute Sensitive Decisions on the Server

Do not trust totals, discounts, or permissions computed by the client.

```typescript
type CartLine = {
  sku: string;
  quantity: number;
};

type PriceBook = Record<string, number>;

class CheckoutService {
  constructor(private readonly priceBook: PriceBook) {}

  calculateTotalCents(lines: CartLine[]): number {
    return lines.reduce((sum, line) => {
      const unitPriceCents = this.priceBook[line.sku];
      if (unitPriceCents === undefined) {
        throw new Error(`Unknown SKU: ${line.sku}`);
      }

      return sum + unitPriceCents * line.quantity;
    }, 0);
  }
}
```

The client may display an estimate, but the server should remain authoritative for the final amount.


# 9. Best Practices and Common Pitfalls

Client-server systems are straightforward in concept, but teams still create avoidable problems when responsibilities between client and server stay vague.

### Best Practices

Useful guidelines include:
- keep the server authoritative for shared business state
- treat all client input as untrusted until revalidated
- use explicit contracts for requests, responses, and errors
- set timeouts and retry policies deliberately
- version APIs carefully when client upgrades are staggered
- centralize authentication, authorization, and audit-sensitive logic on the server

### Pitfall 1: Letting Clients Talk Directly to Protected Data Stores

This usually creates:
- oversized trust boundaries
- schema coupling
- harder rotation of secrets
- weak auditing

Prefer:
- client -> API server -> database

Avoid:
- client -> production database

### Pitfall 2: Duplicating Business Rules Across Clients

When validation and pricing rules live in three clients and the server, drift is almost guaranteed.

```text
Bad:
  web app validates one rule
  mobile app validates another
  server assumes both are correct

Good:
  client validates for user experience
  server validates for correctness
```

### Pitfall 3: Ignoring Network Reality

A method call inside one process is not the same as a network request.

Common mistakes:
- no timeout
- retries with no idempotency plan
- huge chatty request sequences
- assuming the client always receives the response

### Pitfall 4: Overloading the Server with Synchronous Work

Not every user action needs a synchronous end-to-end response.

Better options for slow or heavy work often include:
- queue-backed background processing
- asynchronous job status endpoints
- caching or precomputation for expensive reads

### Pitfall 5: Weak Versioning and Compatibility Discipline

Clients may upgrade gradually, not all at once.

This means the server often needs to:
- preserve backward compatibility for a period
- add fields without breaking older clients
- document deprecations clearly

### Good vs Bad Boundary

```text
Bad boundary:
  client sends raw SQL, trusted totals, and user role claims

Good boundary:
  client sends intent
  server validates identity, recalculates sensitive state,
  and writes through controlled persistence paths
```

### Real-World Examples

Durable examples of the pattern include:
- a browser calling an application API for product search and checkout
- a mobile app syncing messages through backend services rather than direct database access
- a desktop business tool calling a central server for shared reporting and permission checks

The product category changes, but the core value remains the same: shared state and policy are managed behind a controlled server boundary.


# 10. Summary

**Why client-server architecture exists:**
- many systems need multiple clients to access shared data and services safely
- centralizing business logic and protected resource access makes change, auditing, and policy enforcement more manageable

**What the model gives you:**
- a clear boundary between user interaction and authoritative system behavior
- a natural place for validation, authorization, and shared workflow logic
- better control over data access, observability, and operational policy

**What it does not guarantee by itself:**
- it does not automatically make the system scalable or secure
- it does not force one specific server-side style such as monolith or microservices
- it does not remove the need for careful contracts, idempotency, and failure handling

**Practical design advice:**
- keep shared state authoritative on the server
- let clients optimize user experience, not final correctness
- design every network interaction as if latency, retries, and partial failure are normal

**Implementation checklist:**

```text
Architecture:
  □ Define the client-server boundary clearly
  □ Keep protected resources behind the server
  □ Decide which state is local UI state and which state is server-authoritative

Contracts:
  □ Specify request, response, and error shapes explicitly
  □ Plan for backward compatibility if clients upgrade gradually
  □ Keep sensitive decisions such as pricing, permissions, and limits on the server

Reliability:
  □ Add explicit timeouts to remote calls
  □ Decide which operations are safe to retry
  □ Use idempotency or deduplication for important write paths

Security:
  □ Treat all client input as untrusted
  □ Centralize authentication and authorization checks
  □ Avoid exposing databases, internal APIs, or long-lived secrets directly to clients

Scalability and operations:
  □ Add load balancing and caching only where they solve a measured bottleneck
  □ Move slow work off the synchronous request path when appropriate
  □ Monitor latency, error rate, and dependency health at the server boundary
```
