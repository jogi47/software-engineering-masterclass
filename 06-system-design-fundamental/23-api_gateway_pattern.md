# API Gateway Pattern

[← Back to Index](README.md)

Imagine you are building a marketplace with a web app, a mobile app, and a partner API. The product page needs inventory, pricing, reviews, recommendations, and promotions. The first version often lets the client call each backend directly.

Without an API gateway, client integration usually becomes a fragile mix of hardcoded service URLs, duplicated authentication logic, and too many round trips:

```typescript
// Bad example: one client talks to many internal services directly.
class ProductPageClient {
  async loadProductPage(productId: string, accessToken: string): Promise<void> {
    const headers = { Authorization: `Bearer ${accessToken}` };

    const [catalog, inventory, reviews, promotions] = await Promise.all([
      fetch(`https://catalog.internal/products/${productId}`, { headers }),
      fetch(`https://inventory.internal/stock/${productId}`, { headers }),
      fetch(`https://reviews.internal/products/${productId}/reviews`, { headers }),
      fetch(`https://promotions.internal/products/${productId}/offers`, { headers }),
    ]);

    if (!catalog.ok || !inventory.ok || !reviews.ok || !promotions.ok) {
      throw new Error("Could not load product page");
    }
  }
}
```

This usually breaks in predictable ways:
- clients become tightly coupled to internal service boundaries
- mobile and browser apps pay the latency cost of many network calls
- every service reimplements authentication, throttling, and request logging
- internal protocols and topology leak into public-facing clients

This is where the **API Gateway pattern** comes in. An API gateway gives external clients a controlled entry point into a distributed system. It centralizes routing and selected cross-cutting concerns while keeping backend services focused on business logic.

In this chapter, you will learn:
  * [Why API gateways exist](#1-why-api-gateways-exist)
  * [What an API gateway is and is not](#2-what-an-api-gateway-is)
  * [Which responsibilities belong at the gateway](#3-core-responsibilities)
  * [How request flow usually works end to end](#4-how-request-flow-works)
  * [How gateway styles and adjacent patterns differ](#5-gateway-styles-and-adjacent-patterns)
  * [How routing aggregation and transformation are applied](#6-routing-aggregation-and-transformation)
  * [How security rate limiting and resilience fit in](#7-security-rate-limiting-and-resilience)
  * [What practical TypeScript gateway patterns look like](#8-practical-typescript-patterns)
  * [Which best practices prevent common failures](#9-best-practices-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why API Gateways Exist

API gateways exist because public clients and internal services usually have different needs.

### The Core Problem

External clients want:
- one stable endpoint
- low request count
- consistent authentication and error handling
- a contract that does not change every time an internal service is split or renamed

Internal services usually want:
- freedom to evolve service boundaries
- protocols optimized for service-to-service calls
- separate deployment and scaling
- minimal duplication of cross-cutting logic

Without a gateway, those concerns collide.

```text
Without gateway:

mobile app
  -> catalog service
  -> inventory service
  -> reviews service
  -> pricing service
  -> promotions service

Problems:
  -> many client round trips
  -> client knows internal topology
  -> auth and limits repeated everywhere
```

### Why This Gets Worse Over Time

What starts as "just a few service calls" often grows into:
- more endpoints per screen or workflow
- more client types with different needs
- more versioning pressure on public APIs
- more operational policy copied into every service

### Where the Gateway Helps Most

The pattern is especially useful when you have:
- many external clients
- microservices behind the edge
- a need for centralized policy enforcement
- a need to present a stable contract while backend services change

If you only expose one or two simple services and the clients are fully trusted internal callers, a separate gateway layer may be unnecessary overhead.


# 2. What an API Gateway Is

An API gateway is an application-layer entry point that receives client requests, applies shared policies, routes traffic to backend services, and returns a client-facing response.

### A Conservative Definition

The durable idea is:

```text
API gateway = client-facing endpoint + routing + shared edge policies
```

The gateway often handles:
- request routing
- authentication handoff or token validation
- TLS termination
- rate limiting
- request and response shaping
- observability concerns such as logging, metrics, and tracing headers

### What It Is Not

An API gateway is usually not:
- a replacement for service-to-service discovery on the internal network
- a reason to move all business logic out of services
- the same thing as a layer-4 load balancer
- the same thing as a service mesh for east-west traffic

### North-South vs East-West Traffic

A useful mental split is:

```text
north-south traffic:
  internet or partner client <-> your platform
  common home for an API gateway

east-west traffic:
  service <-> service inside the platform
  common home for discovery, mesh, or internal proxies
```

### High-Level Model

```text
┌────────────────────┐
│ Clients            │
│ web, mobile,       │
│ partner, third-    │
│ party              │
└─────────┬──────────┘
          ▼
┌────────────────────┐
│ API Gateway        │
│ auth, routing,     │
│ limits, transforms │
└──────┬─────┬───────┘
       │     │
       ▼     ▼
┌──────────┐ ┌──────────┐
│ catalog  │ │ orders   │
└──────────┘ └──────────┘
       │
       ▼
┌──────────┐
│ reviews  │
└──────────┘
```

The key point is not the brand name of the gateway. It is the separation between a stable client-facing boundary and a more flexible internal service topology.


# 3. Core Responsibilities

A gateway becomes valuable when it centralizes the right responsibilities without turning into an oversized application server.

### 1. Request Routing

The most basic role is mapping incoming requests to backend services.

Examples:
- `GET /api/products/:id` -> catalog service
- `POST /api/orders` -> checkout service
- `GET /api/admin/*` -> admin backend with stricter policy

### 2. Protocol and Boundary Translation

Clients often expect HTTPS and JSON. Backends may use:
- REST over HTTP
- gRPC
- internal RPC frameworks
- asynchronous downstream workflows hidden behind synchronous APIs

A gateway can absorb part of that mismatch, but only to a reasonable extent.

### 3. Shared Edge Policies

Common policies at the edge include:
- TLS termination
- token validation or identity forwarding
- IP allowlists where appropriate
- rate limiting and quotas
- CORS handling for browser clients
- request size limits

### 4. Aggregation

One client request may require multiple backend calls.

```text
Client asks for product page
  -> gateway calls catalog
  -> gateway calls inventory
  -> gateway calls reviews
  -> gateway returns one response
```

This can reduce client round trips, but it also makes the gateway responsible for more latency composition and partial failure handling.

### 5. Observability and Control

A gateway is also a useful place to standardize:
- request IDs and correlation IDs
- access logs
- metrics such as request rate, latency, and error rate
- audit events for sensitive public APIs

### What Should Usually Stay Out

Avoid pushing these into the gateway unless there is a clear reason:
- deep domain business rules
- complex multi-step workflows
- long-running orchestration
- persistence logic tied to one bounded context

The gateway should coordinate access, not become the whole system.


# 4. How Request Flow Works

Most gateway flows follow the same shape even when implementation details differ.

### Step-by-Step Request Path

```text
1. Client opens HTTPS connection to gateway
2. Gateway validates route, method, and basic request policy
3. Gateway authenticates the caller or validates the token
4. Gateway applies rate limits and edge checks
5. Gateway selects backend route or routes
6. Gateway forwards request headers and body as needed
7. Backend responds
8. Gateway transforms or aggregates response if needed
9. Gateway returns a client-facing response
```

### End-to-End Diagram

```text
┌──────────────┐   HTTPS    ┌────────────────┐   internal call   ┌──────────────┐
│ Mobile app   │ ---------> │ API Gateway    │ ----------------> │ Product svc  │
└──────────────┘            │ auth, limits,  │                   └──────────────┘
                            │ routing        │
                            └──────┬─────────┘
                                   │ internal call
                                   ▼
                            ┌──────────────┐
                            │ Review svc   │
                            └──────────────┘
```

### Request Context Often Grows at the Gateway

The gateway commonly enriches the request context with:
- authenticated subject or tenant
- request ID
- rate-limit decision
- chosen backend target
- timeout budget

```typescript
type GatewayContext = {
  requestId: string;
  subjectId?: string;
  tenantId?: string;
  routeId: string;
  timeoutMs: number;
};
```

### Time Budget Matters

Gateways often sit on the critical path for user-visible latency. If a request fans out to multiple backends, total latency can become:
- the slowest dependency
- plus network overhead
- plus any response merge work

That is why gateways need explicit timeout budgets rather than open-ended proxying.


# 5. Gateway Styles and Adjacent Patterns

Not every gateway looks the same. Several related patterns are often confused.

### Pattern 1: Edge API Gateway

A general-purpose entry point for many clients and many backend services.

Useful when:
- you want a shared public API boundary
- you need centralized security and routing
- many teams expose APIs behind one edge layer

Watch for:
- one team becoming a bottleneck for all API changes
- too much custom business logic at the edge

### Pattern 2: Backend for Frontend (BFF)

A BFF is a client-specific gateway layer for one frontend experience.

```text
web app    -> web BFF    -> internal services
mobile app -> mobile BFF -> internal services
```

Useful when:
- web and mobile have different payload and latency needs
- frontend teams need faster API evolution

Watch for:
- duplicated logic across BFFs
- unclear ownership between BFFs and domain APIs

### Pattern 3: Gateway Plus Ingress Proxy

Some platforms separate concerns:
- an ingress or reverse proxy handles network entry and TLS
- an API gateway layer handles routing and API policy

This can be clean, but the boundary should be explicit so teams know where policy lives.

### Comparison with Adjacent Components

```text
┌──────────────────────┬────────────────────────────────────────────┬────────────────────────────────────────────┐
│ Component            │ Primary role                               │ Usually not responsible for                │
├──────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ API gateway          │ client-facing routing and edge policy      │ deep domain workflows                      │
├──────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Load balancer        │ distribute traffic across targets          │ API-specific auth and aggregation          │
├──────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Service discovery    │ resolve service names to instances         │ public client policy enforcement           │
├──────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Service mesh         │ east-west traffic features between services│ public API contract management             │
└──────────────────────┴────────────────────────────────────────────┴────────────────────────────────────────────┘
```

### Conservative Real-World Mapping

In practice, teams often build gateways with:
- reverse proxies and proxy runtimes
- cloud-managed API gateway products
- ingress controllers plus policy plugins
- application code that implements BFF behavior

The product choice matters less than keeping the gateway's responsibility clear.


# 6. Routing, Aggregation, and Transformation

Routing is the minimum feature. Aggregation and transformation are where many gateway designs become useful or dangerous.

### Route Matching

Gateway routes usually match on:
- path
- HTTP method
- host or subdomain
- API version
- sometimes tenant or audience metadata

```typescript
type RouteConfig = {
  id: string;
  method: "GET" | "POST";
  publicPath: RegExp;
  targetService: "catalog" | "orders" | "reviews";
  timeoutMs: number;
};
```

### Aggregation

Aggregation combines multiple backend responses into one client-facing payload.

```text
Client request:
  GET /api/product-page/123

Gateway fan-out:
  -> catalog /products/123
  -> inventory /stock/123
  -> reviews /products/123/reviews

Gateway fan-in:
  -> combine results
  -> return one response
```

Aggregation helps when:
- the client would otherwise make several round trips
- the combined view is specific to one frontend experience

Aggregation hurts when:
- too many downstream calls are needed
- partial failures become hard to explain
- the gateway begins encoding domain-specific decision logic

### Transformation

A gateway may need light transformation such as:
- header normalization
- renaming fields in a public contract during migration
- filtering internal-only fields
- adapting one client representation to a backend representation

Keep these transformations narrow. If the gateway is doing heavy schema and workflow composition, you may be hiding a missing application service behind it.

### Partial Failure Policy

Aggregation requires a deliberate answer to:
- if reviews fail, should the product page fail
- if recommendations time out, should the response degrade gracefully
- if one dependency is stale, is cached data acceptable

These are product decisions as much as technical ones.


# 7. Security, Rate Limiting, and Resilience

Gateway design is often justified by cross-cutting concerns. That is reasonable, but the edge layer still needs careful limits.

### Authentication and Identity Propagation

A gateway often:
- validates JWTs or session tokens
- terminates external authentication flows before forwarding trusted identity claims
- adds internal headers or context for downstream services

Be careful here:
- downstream services may still need authorization checks
- a valid token does not imply every backend action is allowed

```text
Gateway validates identity
  -> forwards caller identity and scopes
Service enforces domain authorization
  -> allows or rejects operation
```

### Rate Limiting

Rate limiting at the gateway is a common first control for:
- abusive clients
- accidental retry storms
- noisy tenants
- partner API quota enforcement

Common models:
- token bucket
- leaky bucket
- fixed window
- sliding window

No single algorithm is always best. Choose based on burst tolerance, fairness needs, and operational simplicity.

### Resilience Controls

Useful edge controls often include:
- request timeout budgets
- concurrency limits
- payload size limits
- circuit breaking or outlier protection in front of unstable backends
- graceful degradation for optional data

### Security Boundaries Still Matter

The gateway helps reduce duplicated edge logic, but it should not become your only defense.

Keep these concerns separate:
- **authentication**: who is calling
- **authorization**: what is allowed
- **routing**: where traffic goes
- **validation**: whether the request shape is acceptable
- **service protection**: how overload and abuse are constrained


# 8. Practical TypeScript Patterns

The examples here are simplified, but they show a maintainable gateway structure.

### Route Table and Gateway Context

```typescript
type HttpMethod = "GET" | "POST";

type GatewayRequest = {
  method: HttpMethod;
  path: string;
  headers: Record<string, string>;
  body?: unknown;
};

type GatewayResponse = {
  status: number;
  headers?: Record<string, string>;
  body: unknown;
};

type BackendTarget = {
  serviceName: string;
  baseUrl: string;
  timeoutMs: number;
};

type RouteDefinition = {
  id: string;
  method: HttpMethod;
  match: RegExp;
  target: BackendTarget;
  requireAuth: boolean;
};

type RequestContext = {
  requestId: string;
  routeId: string;
  subjectId?: string;
};
```

### A Small Rate Limiter

```typescript
class TokenBucketRateLimiter {
  private readonly tokensByKey = new Map<string, { tokens: number; updatedAtMs: number }>();

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
  ) {}

  allow(key: string, nowMs: number): boolean {
    const current = this.tokensByKey.get(key) ?? {
      tokens: this.capacity,
      updatedAtMs: nowMs,
    };

    const elapsedSeconds = Math.max(0, (nowMs - current.updatedAtMs) / 1000);
    const refilled = Math.min(
      this.capacity,
      current.tokens + elapsedSeconds * this.refillPerSecond,
    );

    if (refilled < 1) {
      this.tokensByKey.set(key, { tokens: refilled, updatedAtMs: nowMs });
      return false;
    }

    this.tokensByKey.set(key, {
      tokens: refilled - 1,
      updatedAtMs: nowMs,
    });

    return true;
  }
}
```

### A Minimal Gateway Pipeline

```typescript
class ApiGateway {
  constructor(
    private readonly routes: RouteDefinition[],
    private readonly rateLimiter: TokenBucketRateLimiter,
  ) {}

  async handle(request: GatewayRequest): Promise<GatewayResponse> {
    const route = this.routes.find((candidate) => {
      return candidate.method === request.method && candidate.match.test(request.path);
    });

    if (!route) {
      return { status: 404, body: { error: "Route not found" } };
    }

    const requestId = crypto.randomUUID();
    const clientKey = request.headers["x-api-key"] ?? "anonymous";

    if (!this.rateLimiter.allow(clientKey, Date.now())) {
      return { status: 429, body: { error: "Rate limit exceeded", requestId } };
    }

    const subjectId = route.requireAuth
      ? this.extractSubjectId(request.headers.authorization)
      : undefined;

    if (route.requireAuth && !subjectId) {
      return { status: 401, body: { error: "Unauthorized", requestId } };
    }

    const context: RequestContext = {
      requestId,
      routeId: route.id,
      subjectId,
    };

    return this.forward(route, request, context);
  }

  private extractSubjectId(authorizationHeader?: string): string | undefined {
    if (!authorizationHeader?.startsWith("Bearer ")) {
      return undefined;
    }

    return "user-123";
  }

  private async forward(
    route: RouteDefinition,
    request: GatewayRequest,
    context: RequestContext,
  ): Promise<GatewayResponse> {
    const upstreamResponse = await fetch(`${route.target.baseUrl}${request.path}`, {
      method: request.method,
      headers: {
        "x-request-id": context.requestId,
        "x-subject-id": context.subjectId ?? "",
        "content-type": "application/json",
      },
      body: request.body ? JSON.stringify(request.body) : undefined,
      signal: AbortSignal.timeout(route.target.timeoutMs),
    });

    const body = await upstreamResponse.json();

    return {
      status: upstreamResponse.status,
      body,
      headers: { "x-request-id": context.requestId },
    };
  }
}
```

### Simple Aggregation Example

```typescript
class ProductPageGateway {
  async loadProductPage(productId: string): Promise<GatewayResponse> {
    const [product, stock, reviews] = await Promise.all([
      fetch(`http://catalog.internal/products/${productId}`).then((r) => r.json()),
      fetch(`http://inventory.internal/stock/${productId}`).then((r) => r.json()),
      fetch(`http://reviews.internal/products/${productId}/reviews`).then((r) => r.json()),
    ]);

    return {
      status: 200,
      body: {
        product,
        stock,
        reviews,
      },
    };
  }
}
```

The important design choice is not the amount of code. It is keeping route policy, rate limiting, identity handling, and backend calls explicit rather than scattered across every client and service.


# 9. Best Practices and Common Pitfalls

API gateway failures are usually easy to explain after the fact. The same patterns repeat.

### Good Practices

Good:
- keep the public API boundary stable even when backend services change
- centralize edge concerns such as TLS termination, auth validation, and quotas where that reduces duplication
- define timeout, retry, and partial failure behavior explicitly
- keep request IDs, metrics, and access logs consistent across routes
- document which policies live at the gateway versus inside services

### Common Pitfalls

Bad:
- turning the gateway into a monolith that owns too much business logic
- forcing every service-to-service call through the public gateway
- hiding backend failures behind vague error responses that nobody can debug
- performing too many downstream calls for one client request
- assuming gateway authentication removes the need for service authorization

### The "God Gateway" Failure Mode

This is a common anti-pattern:

```text
Gateway starts with routing
  -> adds aggregation
  -> adds workflow orchestration
  -> adds business rules
  -> adds database access
  -> becomes the new monolith at the edge
```

If your gateway owns domain persistence and complex workflows, you may have rebuilt a tightly coupled application tier in a harder-to-operate place.

### Be Deliberate About Retries

Retries at the gateway can help with transient failure, but careless retries can also amplify traffic and duplicate side effects.

Use extra care for:
- non-idempotent writes
- already-overloaded downstream services
- fan-out requests where one client call triggers many backend retries

### Operational Notes

Conservative examples from common platforms:
- cloud-managed API gateways are often a good fit for simple public APIs, auth, and quota enforcement
- proxy-based gateways are often useful when you need more control over routing and deployment
- BFF layers are often appropriate when frontend-specific response shaping is the main need

The right answer depends on ownership, latency, policy needs, and how much customization the platform should absorb.


# 10. Summary

**Why API gateways exist:**
- external clients need a stable and simple API boundary
- backend services need freedom to evolve without exposing internal topology
- shared edge concerns are easier to reason about when they are applied consistently

**What an API gateway does well:**
- routes client requests to backend services
- applies edge policies such as auth validation, TLS termination, quotas, and observability
- optionally aggregates or lightly transforms responses for client-facing APIs

**What it should not become:**
- a replacement for internal service design, discovery, or authorization
- a hidden business-logic monolith at the edge
- an excuse to make one request depend on too many downstream calls

**Practical design advice:**
- keep gateway responsibilities narrow, explicit, and observable
- use aggregation carefully and define partial failure behavior up front
- separate identity validation, domain authorization, and backend business rules clearly

**Implementation checklist:**

```text
Boundary and ownership:
  □ Define which clients use the gateway and which APIs stay internal
  □ Choose whether you need a shared edge gateway, a BFF, or both
  □ Keep a stable public API contract even as backend services evolve

Routing and contracts:
  □ Define route matching, versioning, and timeout budgets explicitly
  □ Limit response transformation to narrow contract-shaping concerns
  □ Decide where aggregation is worth the added latency and failure complexity

Security and protection:
  □ Decide how authentication is validated at the edge
  □ Keep authorization checks in the services that own the domain rules
  □ Add rate limits, payload size limits, and abuse controls deliberately

Reliability:
  □ Set conservative timeout and retry behavior for each route
  □ Plan for partial failures in fan-out and aggregation paths
  □ Avoid creating a single overloaded gateway bottleneck

Operations:
  □ Propagate request IDs and identity context consistently
  □ Monitor request volume, latency, errors, throttling, and backend saturation
  □ Review gateway logic regularly to prevent "god gateway" sprawl
```
