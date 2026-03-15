# Backend for Frontend (BFF)

[← Back to Index](README.md)

Imagine you are building the same product experience for a browser app, an iOS or Android app, and perhaps a tablet or smart-TV client. The first implementation often pushes every client through one generic API and expects the frontend to sort out the mismatch.

Without a client-specific backend layer, you usually end up with too many round trips, too much overfetching, and frontend code that knows more about backend service boundaries than it should:

```typescript
// Bad example: one mobile screen assembles itself from generic backend APIs.
class MobileProductScreen {
  async load(productId: string, accessToken: string): Promise<void> {
    const headers = { Authorization: `Bearer ${accessToken}` };

    const [product, inventory, reviews, recommendations] = await Promise.all([
      fetch(`https://api.example.com/products/${productId}`, { headers }).then((r) => r.json()),
      fetch(`https://api.example.com/inventory/${productId}`, { headers }).then((r) => r.json()),
      fetch(`https://api.example.com/reviews/${productId}?limit=50`, { headers }).then((r) => r.json()),
      fetch(`https://api.example.com/recommendations/${productId}`, { headers }).then((r) => r.json()),
    ]);

    renderMobileScreen({
      title: product.title,
      price: product.price,
      inStock: inventory.available,
      topReview: reviews.items[0],
      recommendations: recommendations.items.slice(0, 4),
    });
  }
}

declare function renderMobileScreen(input: {
  title: string;
  price: number;
  inStock: boolean;
  topReview?: unknown;
  recommendations: unknown[];
}): void;
```

This usually breaks in predictable ways:
- the mobile app pays for several network calls on a weaker connection
- the browser app and mobile app want different fields and pagination rules
- frontend teams wait on a shared backend contract that fits nobody particularly well
- internal service boundaries leak directly into client code

This is where **Backend for Frontend (BFF)** comes in. A BFF is a client-specific backend layer that shapes APIs around one frontend experience while leaving core domain logic in the services that own it.

In this chapter, you will learn:
  * [Why BFFs exist](#1-why-bffs-exist)
  * [What a BFF is and is not](#2-what-a-bff-is)
  * [Which responsibilities belong in a BFF](#3-core-responsibilities-and-boundaries)
  * [How request flow usually works end to end](#4-how-bff-request-flow-works)
  * [How ownership models and team topologies differ](#5-ownership-models-and-team-topologies)
  * [How BFFs compare to API gateways and adjacent patterns](#6-bff-vs-api-gateway-and-adjacent-patterns)
  * [How composition performance and caching are handled](#7-data-composition-performance-and-caching)
  * [What practical TypeScript BFF patterns look like](#8-practical-typescript-patterns)
  * [Which best practices prevent common failures](#9-best-practices-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why BFFs Exist

BFFs exist because different clients often represent different products, not just different screen sizes.

### The Core Problem

A web app, native mobile app, partner portal, and kiosk might all use the same domain data, but they rarely want the same API contract:
- web clients can often tolerate richer payloads and more visible detail
- mobile clients usually need fewer fields, fewer requests, and tighter latency budgets
- some clients release daily while others are updated through app stores and move more slowly
- one client may require server-side composition that another does not

If every client shares one generic edge API, one of two things usually happens:
- the API becomes bloated so it can satisfy all clients at once
- the clients take on composition logic and become coupled to internal service shape

```text
Without BFF:

web app    ─┐
mobile app ─┼──> shared API contract ───> many backend services
tablet app ─┘

Problems:
  -> contract optimized for no client in particular
  -> slowest client release cycle creates pressure on everyone else
  -> frontend code compensates for backend shape mismatches
```

### Why This Gets Worse Over Time

The need for a BFF usually becomes clearer as:
- the number of screens and user journeys grows
- teams start optimizing differently for web and mobile
- product managers ask for client-specific experiments
- more backend services are involved in building one page or workflow

### When the Pattern Helps Most

The pattern is especially useful when:
- you have multiple frontend clients with meaningfully different needs
- one screen or workflow requires aggregation from several services
- frontend teams need to evolve their API contract independently
- you want client-specific logic at the edge without forcing it into the frontend

If one backend API already fits all clients well and the contracts are stable, a BFF may be extra moving parts without enough payoff.


# 2. What a BFF Is

A BFF is a backend layer dedicated to one frontend experience or one closely related family of frontend experiences.

### A Conservative Definition

The durable idea is:

```text
BFF = client-specific API layer + composition + client-focused contract shaping
```

It often does three things:
- exposes endpoints shaped around frontend screens or workflows
- calls one or more downstream services to assemble a response
- hides backend topology and client-specific adaptation from the frontend

### What It Is Not

A BFF is usually not:
- the place where core business rules should live permanently
- a full replacement for a general API gateway
- a reason to copy the same domain logic into several client-specific services
- a separate BFF for every minor UI component or experiment

### One Useful Mental Model

Think of the BFF as the boundary between:
- **frontend concerns**: payload shape, sequencing, pagination, conditional fields, client-specific latency trade-offs
- **domain concerns**: pricing rules, inventory reservation, payment authorization, order lifecycle

```text
┌────────────────────┐
│ Mobile app         │
└─────────┬──────────┘
          ▼
┌────────────────────┐
│ Mobile BFF         │
│ screen-oriented API│
└──────┬─────┬───────┘
       │     │
       ▼     ▼
┌──────────┐ ┌──────────┐
│ catalog  │ │ reviews  │
└──────────┘ └──────────┘
       │
       ▼
┌──────────┐
│ pricing  │
└──────────┘
```

### Scope Matters

Some teams run:
- one BFF for web
- one BFF for mobile
- sometimes another for partner-facing or admin-facing experiences

That can work well when each BFF owns a clearly different client contract. It becomes harder to justify if the services differ only by small cosmetic details.


# 3. Core Responsibilities and Boundaries

A BFF becomes useful when it owns the right client-facing responsibilities and refuses the rest.

### What Usually Belongs in a BFF

Good BFF responsibilities often include:
- screen or workflow aggregation
- response shaping for one client type
- pagination or filtering defaults suited to that client
- adapting downstream errors into client-appropriate responses
- forwarding identity and request context to downstream services
- lightweight orchestration for a single user interaction

### What Should Usually Stay Out

Avoid moving these into the BFF unless there is a clear and durable reason:
- pricing policy
- inventory allocation rules
- payment state transitions
- cross-client domain validation that must stay consistent everywhere
- database ownership for core business entities

### Good vs Bad Boundary

```text
Good:
  BFF decides:
    -> which services to call for a mobile home screen
    -> how much data to return for this client
    -> how to degrade if optional recommendations time out

Bad:
  BFF decides:
    -> who qualifies for a discount
    -> whether inventory can be oversold
    -> how an order state machine behaves
```

### Why Boundary Discipline Matters

Without discipline, a BFF can become:
- a second application layer that duplicates service logic
- a coordination bottleneck between frontend and backend teams
- a fragile place where behavior diverges between clients

The safest rule is: let the BFF own **presentation-oriented backend logic**, not core domain truth.


# 4. How BFF Request Flow Works

Most BFF request paths follow a predictable shape.

### Step-by-Step Flow

```text
1. A frontend sends a request to its BFF
2. The BFF authenticates the caller or receives trusted identity context
3. The BFF validates request shape and chooses the screen/workflow handler
4. The BFF calls downstream services in parallel or sequence
5. The BFF merges and reshapes the results
6. Optional fields may be omitted when a non-critical dependency fails
7. The BFF returns a client-specific response contract
```

### End-to-End Diagram

```text
┌──────────────┐   HTTPS    ┌──────────────┐   internal calls   ┌──────────────┐
│ Web app      │ ---------> │ Web BFF      │ -----------------> │ catalog svc  │
└──────────────┘            │ page/workflow│                    └──────────────┘
                            │ API          │
                            └──────┬───────┘
                                   │
                                   ├──────────────────────────-> ┌──────────────┐
                                   │                             │ review svc   │
                                   │                             └──────────────┘
                                   │
                                   └──────────────────────────-> ┌──────────────┐
                                                                 │ pricing svc  │
                                                                 └──────────────┘
```

### Fan-Out and Fan-In

The BFF often performs:
- **fan-out**: one frontend request becomes several downstream requests
- **fan-in**: several downstream results become one response

That improves frontend simplicity, but it also means the BFF owns:
- timeout budgets
- concurrency limits
- partial failure behavior
- response-size trade-offs

### Partial Failure Is a Product Decision

For many BFF endpoints, a useful question is not just "did it fail" but "what can we still return safely."

Example:
- if recommendations time out, show the product page without them
- if the product details fail, return an error because the screen cannot render meaningfully

This is why BFF logic often sits close to the frontend team. The failure policy is partly product behavior, not just transport behavior.


# 5. Ownership Models and Team Topologies

BFF structure is often less about software mechanics and more about team boundaries.

### Model 1: Frontend Team Owns Its BFF

This is common when:
- a web or mobile team ships independently
- the BFF mostly shapes contracts and aggregates data
- the same team can reason about UX and API changes together

Benefits:
- faster client-specific iteration
- clearer ownership for screen-level payload design
- fewer cross-team negotiations for minor API changes

Risks:
- domain rules may leak into the BFF if backend ownership is weak
- similar logic may be reimplemented across multiple BFFs

### Model 2: Platform or Edge Team Owns Shared BFF Infrastructure

Some organizations keep:
- runtime templates
- observability middleware
- auth handling
- shared deployment conventions

under a platform or edge team, while product teams own route handlers and contracts.

This can reduce duplication, provided ownership stays explicit.

### Model 3: One BFF per Product Area, Not Strictly per Device

Sometimes the boundary is not web versus mobile. It might instead be:
- customer app BFF
- admin portal BFF
- partner portal BFF

That can be sensible when those products have different workflows even if they share some UI technology.

### Ownership Comparison

```text
┌────────────────────────┬──────────────────────────────────────┬──────────────────────────────────────┐
│ Ownership model        │ Usually works well when             │ Watch for                            │
├────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ Frontend team owned    │ client contract changes frequently  │ domain logic drifting into BFF       │
├────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ Platform assisted      │ common auth and runtime concerns    │ platform team becoming bottleneck     │
├────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ Product-area BFF       │ workflows differ more than devices  │ too many partially overlapping BFFs  │
└────────────────────────┴──────────────────────────────────────┴──────────────────────────────────────┘
```

### A Practical Rule

Choose a BFF boundary that matches:
- product ownership
- release cadence
- API contract differences

Do not create additional BFFs only because the pattern exists.


# 6. BFF vs API Gateway and Adjacent Patterns

BFF is closely related to API gateway, but the two patterns are not identical.

### API Gateway vs BFF

An API gateway is usually:
- a shared entry point for many clients
- focused on routing, edge security, quotas, and general API management

A BFF is usually:
- dedicated to one client experience
- focused on shaping responses for that client

```text
Shared edge:

clients ──> API gateway ──> internal services

Client-specific edge:

web app    ──> web BFF    ──> internal services
mobile app ──> mobile BFF ──> internal services
```

### They Can Coexist

A common layout is:

```text
internet client
   │
   ▼
┌────────────────────┐
│ ingress / API      │
│ gateway            │
└─────────┬──────────┘
          ▼
┌────────────────────┐
│ client-specific    │
│ BFF                │
└─────────┬──────────┘
          ▼
┌────────────────────┐
│ domain services    │
└────────────────────┘
```

In that setup:
- the gateway handles shared edge policy
- the BFF handles client contract shaping

### Comparison with Adjacent Patterns

```text
┌──────────────────────┬────────────────────────────────────────────┬────────────────────────────────────────────┐
│ Component            │ Primary role                               │ Usually not responsible for                │
├──────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ BFF                  │ client-specific response composition       │ core domain truth and shared business rules│
├──────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ API gateway          │ shared edge routing and policy             │ screen-specific payload design             │
├──────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ GraphQL gateway      │ schema-based query interface               │ product ownership by itself                │
├──────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Service mesh         │ service-to-service traffic features        │ frontend-oriented API contracts            │
└──────────────────────┴────────────────────────────────────────────┴────────────────────────────────────────────┘
```

### When Not to Use a BFF

You may not need a BFF when:
- one API contract already serves all clients well
- the frontend mainly passes through domain APIs unchanged
- a small team would struggle to operate another service boundary
- the difference between clients is mostly visual, not contractual

It is better to avoid a BFF than to add one that only introduces another hop.


# 7. Data Composition, Performance, and Caching

The hardest operational part of a BFF is usually not routing. It is coordinating downstream work without creating latency and reliability problems.

### Composition Strategy

A BFF often combines three data categories:
- required data without which the screen cannot render
- important but degradable data
- optional enhancements such as recommendations or badges

```text
product page request
  -> required: product details, price
  -> important: stock level
  -> optional: recommendations, social proof
```

This classification drives:
- timeout budgets
- fallback behavior
- cache strategy

### Time Budgets

If a mobile screen needs a response within 300 ms, the BFF cannot give every dependency 300 ms independently.

```text
Client budget: 300 ms
  -> BFF processing: 30 ms
  -> network overhead: 20 ms
  -> downstream budget left: ~250 ms total

If three calls happen in parallel, each still needs a strict timeout.
```

### Caching

BFF caching can be useful for:
- read-heavy screen fragments
- reference data that changes infrequently
- short-lived client-specific compositions

Be conservative:
- cache data that tolerates staleness
- avoid hiding critical correctness requirements behind stale composite responses
- keep cache keys aligned with tenant, locale, and authorization scope where relevant

### Avoid Accidental N+1 Behavior

A BFF can introduce its own N+1 problem if it loops over a list and calls a service once per item.

```text
Bad:
  load 20 products
    -> call pricing service 20 times

Better:
  load 20 products
    -> call pricing batch endpoint once
```

### Resilience Guidelines

Useful guardrails include:
- explicit per-dependency timeouts
- bounded concurrency
- optional-data fallbacks
- bulk or batch downstream APIs where appropriate
- clear metrics for each downstream dependency


# 8. Practical TypeScript Patterns

The examples here are intentionally small, but they show a maintainable BFF structure.

### Client-Aware Response Contracts

```typescript
type ClientKind = "web" | "mobile";

type ProductSummary = {
  id: string;
  title: string;
  priceCents: number;
  currency: string;
};

type StockSummary = {
  available: boolean;
  quantity?: number;
};

type ReviewSummary = {
  averageRating: number;
  topComment?: string;
};

type RecommendationSummary = {
  id: string;
  title: string;
};

type ProductPageResponse = {
  product: ProductSummary;
  stock: StockSummary;
  review: ReviewSummary;
  recommendations: RecommendationSummary[];
  client: ClientKind;
};
```

### Downstream Clients

```typescript
class CatalogServiceClient {
  async getProduct(productId: string): Promise<ProductSummary> {
    const response = await fetch(`http://catalog.internal/products/${productId}`, {
      signal: AbortSignal.timeout(120),
    });

    if (!response.ok) {
      throw new Error("catalog lookup failed");
    }

    return response.json() as Promise<ProductSummary>;
  }
}

class InventoryServiceClient {
  async getStock(productId: string): Promise<StockSummary> {
    const response = await fetch(`http://inventory.internal/stock/${productId}`, {
      signal: AbortSignal.timeout(80),
    });

    if (!response.ok) {
      throw new Error("inventory lookup failed");
    }

    return response.json() as Promise<StockSummary>;
  }
}

class ReviewServiceClient {
  async getReviewSummary(productId: string): Promise<ReviewSummary> {
    const response = await fetch(`http://reviews.internal/products/${productId}/summary`, {
      signal: AbortSignal.timeout(100),
    });

    if (!response.ok) {
      throw new Error("review lookup failed");
    }

    return response.json() as Promise<ReviewSummary>;
  }
}

class RecommendationServiceClient {
  async getRecommendations(
    productId: string,
    limit: number,
  ): Promise<RecommendationSummary[]> {
    const response = await fetch(
      `http://recommendations.internal/products/${productId}?limit=${limit}`,
      { signal: AbortSignal.timeout(90) },
    );

    if (!response.ok) {
      throw new Error("recommendations lookup failed");
    }

    return response.json() as Promise<RecommendationSummary[]>;
  }
}
```

### A Small BFF Handler

```typescript
type BffContext = {
  requestId: string;
  subjectId: string;
  client: ClientKind;
};

class ProductPageBff {
  constructor(
    private readonly catalog: CatalogServiceClient,
    private readonly inventory: InventoryServiceClient,
    private readonly reviews: ReviewServiceClient,
    private readonly recommendations: RecommendationServiceClient,
  ) {}

  async getProductPage(
    productId: string,
    context: BffContext,
  ): Promise<ProductPageResponse> {
    const recommendationLimit = context.client === "mobile" ? 4 : 8;

    const [product, stock, review, recommendationResult] = await Promise.all([
      this.catalog.getProduct(productId),
      this.inventory.getStock(productId),
      this.reviews.getReviewSummary(productId),
      this.tryOptional(() =>
        this.recommendations.getRecommendations(productId, recommendationLimit),
      ),
    ]);

    return {
      product,
      stock: context.client === "mobile"
        ? { available: stock.available }
        : stock,
      review,
      recommendations: recommendationResult ?? [],
      client: context.client,
    };
  }

  private async tryOptional<T>(work: () => Promise<T>): Promise<T | undefined> {
    try {
      return await work();
    } catch {
      return undefined;
    }
  }
}
```

### A Minimal Route Layer

```typescript
type HttpRequest = {
  headers: Record<string, string | undefined>;
  params: Record<string, string>;
};

type HttpResponse = {
  status: number;
  body: unknown;
};

class ProductPageController {
  constructor(private readonly bff: ProductPageBff) {}

  async handle(request: HttpRequest): Promise<HttpResponse> {
    const subjectId = request.headers["x-subject-id"];
    const clientHeader = request.headers["x-client-kind"];

    if (!subjectId) {
      return { status: 401, body: { error: "Unauthorized" } };
    }

    const client: ClientKind = clientHeader === "mobile" ? "mobile" : "web";

    const body = await this.bff.getProductPage(request.params.productId, {
      requestId: crypto.randomUUID(),
      subjectId,
      client,
    });

    return { status: 200, body };
  }
}
```

### A Small Cache for Optional Composite Data

```typescript
class TtlCache<T> {
  private readonly items = new Map<string, { value: T; expiresAtMs: number }>();

  get(key: string, nowMs: number): T | undefined {
    const item = this.items.get(key);

    if (!item || item.expiresAtMs <= nowMs) {
      this.items.delete(key);
      return undefined;
    }

    return item.value;
  }

  set(key: string, value: T, ttlMs: number, nowMs: number): void {
    this.items.set(key, { value, expiresAtMs: nowMs + ttlMs });
  }
}
```

The important design choice is not the exact framework. It is keeping client shaping, timeout policy, and downstream composition explicit and small.


# 9. Best Practices and Common Pitfalls

BFF failures are usually not mysterious. Teams tend to repeat the same mistakes.

### Good Practices

Good:
- keep BFF contracts aligned to real frontend screens and workflows
- keep core business rules in the services that own the domain
- define which downstream data is required versus optional
- set strict timeout budgets and observe each dependency separately
- share auth, logging, tracing, and deployment conventions where possible

### Common Pitfalls

Bad:
- creating a BFF for every tiny client variation
- duplicating pricing, authorization, or workflow rules across BFFs
- letting one BFF call databases that belong to many different domains
- performing too many downstream calls per request
- assuming a BFF removes the need for a broader API strategy

### The "Frontend Monolith in Reverse" Failure Mode

This anti-pattern is common:

```text
BFF starts with response shaping
  -> adds cross-client domain logic
  -> adds direct database reads
  -> adds workflow orchestration
  -> becomes a second monolith near the frontend
```

At that point, the BFF is no longer helping the system stay modular.

### Keep Duplication Visible

Some duplication across BFFs is acceptable. If web and mobile genuinely need different contracts, some route and composition code will differ.

The problem is not duplicate code by itself. The problem is duplicated **domain truth**.

### Operational Notes

Conservative examples from common platforms:
- a BFF can be an application service behind an ingress or API gateway
- some teams implement BFF endpoints in server-side web runtimes used by the frontend team
- others run standalone services with shared middleware and deployment templates

The key is less about product choice and more about whether the ownership and boundaries stay clear.


# 10. Summary

**Why BFFs exist:**
- different frontend clients often need different payloads, latency trade-offs, and release independence
- client-specific backend composition can simplify frontend code and reduce unnecessary round trips
- one generic API contract may become awkward when client experiences diverge

**What a BFF does well:**
- exposes client-oriented endpoints for screens and workflows
- aggregates and reshapes downstream data for one frontend experience
- encodes client-specific timeout and degradation policy close to the product behavior

**What it should not become:**
- the permanent home of shared domain business rules
- a second monolith that duplicates service logic and data ownership
- an automatically required layer for every application

**Practical design advice:**
- keep BFF scope narrow, observable, and tied to a clear client or product boundary
- classify dependencies into required, degradable, and optional data
- combine BFFs with shared gateway or platform capabilities when that reduces duplication without hiding ownership

**Implementation checklist:**

```text
Boundary and ownership:
  □ Confirm that clients actually need different API contracts before adding a BFF
  □ Define whether the boundary is per device, per product area, or per experience
  □ Keep core business rules and source-of-truth data in domain services

Contracts and composition:
  □ Design endpoints around frontend screens or workflows, not internal service names
  □ Decide which downstream data is required, degradable, or optional
  □ Keep response shaping client-specific but keep domain semantics consistent

Performance and resilience:
  □ Set explicit timeout budgets for every downstream dependency
  □ Batch downstream requests where possible to avoid N+1 fan-out
  □ Add caching only where staleness and authorization scope are well understood

Operations:
  □ Propagate request IDs, identity context, and tracing headers consistently
  □ Monitor per-route latency, error rate, downstream failures, and fallback frequency
  □ Review BFF logic regularly to prevent drift into duplicated domain behavior
```
