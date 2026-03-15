# Service Discovery

[← Back to Index](README.md)

Imagine you are splitting a monolith into services. `checkout` needs `inventory`, `payments`, and `shipping`. The first deployment works, so the team hardcodes hostnames into environment variables and moves on.

Without service discovery, the system usually looks fine until scaling, failover, or rolling deploys start changing instance addresses:

```typescript
// Bad example: static addresses assume a small, stable topology.
type CheckoutDependencyConfig = {
  inventoryBaseUrl: string;
  paymentsBaseUrl: string;
  shippingBaseUrl: string;
};

class CheckoutClient {
  constructor(private readonly config: CheckoutDependencyConfig) {}

  async reserveInventory(orderId: string): Promise<void> {
    await fetch(`${this.config.inventoryBaseUrl}/reservations/${orderId}`, {
      method: "POST",
    });
  }

  async capturePayment(orderId: string): Promise<void> {
    await fetch(`${this.config.paymentsBaseUrl}/payments/${orderId}/capture`, {
      method: "POST",
    });
  }
}
```

This breaks in predictable ways:
- a replaced container comes back with a new IP
- one dead instance keeps receiving traffic because clients still cache it
- new replicas stay idle because nobody knows they exist
- each team invents different retry, DNS, and failover behavior

This is where **service discovery** comes in. Service discovery gives clients a stable way to find a service by logical name while the underlying instances change over time.

In this chapter, you will learn:
  * [Why service discovery exists](#1-why-service-discovery-exists)
  * [What service discovery is and is not](#2-what-service-discovery-is)
  * [Which core building blocks matter](#3-core-building-blocks)
  * [How registration lookup and routing work end to end](#4-how-service-discovery-works-end-to-end)
  * [How client-side server-side and DNS-based patterns differ](#5-discovery-patterns-and-trade-offs)
  * [Why health checks leases and stale data matter](#6-health-checks-leases-and-failure-handling)
  * [How naming routing and load balancing decisions are usually made](#7-naming-routing-and-load-balancing)
  * [What practical TypeScript patterns look like](#8-practical-typescript-patterns)
  * [Which best practices prevent common failures](#9-best-practices-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why Service Discovery Exists

Service discovery solves a coordination problem created by distributed systems.

In a monolith, one module calls another in the same process. In a distributed system, the caller must answer harder questions:
- where is the target service running right now
- which instances are healthy
- how should requests be spread across them
- what happens when an instance disappears mid-deploy

### The Core Problem

Modern service addresses are often unstable:
- containers are recreated
- pods move to different nodes
- autoscaling changes instance count
- blue-green or canary rollouts temporarily run multiple versions

```text
Without discovery:

checkout
  -> calls 10.0.4.18:8080
  -> instance restarts
  -> new instance is 10.0.9.31:8080
  -> old address is now wrong
```

### What Teams Otherwise Build

Without a shared discovery mechanism, teams tend to accumulate:
- hand-maintained config files
- ad hoc DNS records per environment
- instance lists copied into deployment scripts
- custom retry logic tied to specific hostnames

That usually increases operational drift rather than reducing it.

### Where Discovery Helps Most

Service discovery is especially useful when you have:
- multiple instances per service
- frequent deployments or autoscaling
- east-west service-to-service traffic
- traffic policies based on region, version, or capability

If you only run a few static processes behind a stable endpoint, you may need less machinery. The need grows as topology becomes more dynamic.


# 2. What Service Discovery Is

Service discovery is a way to resolve a **logical service name** into one or more **currently routable service instances**.

### A Conservative Definition

The durable idea is:

```text
Service discovery = naming + registration + health awareness + lookup/routing
```

It usually involves:
- a name such as `payments`
- one or more instances that currently implement that service
- metadata describing those instances
- a mechanism that removes or avoids unhealthy endpoints

### What It Is Not

Service discovery is usually not:
- a guarantee that every returned instance will stay healthy for the entire request
- a replacement for retries, timeouts, and circuit breakers
- identical to load balancing, though the two are closely related
- the same thing as API gateway routing for north-south traffic

### High-Level Model

```text
┌────────────────────┐      ┌────────────────────┐
│ Service instance   │ ---> │ Registry / DNS /   │
│ starts and reports │      │ control plane      │
└────────────────────┘      └─────────┬──────────┘
                                      │
                                      ▼
                             ┌────────────────────┐
                             │ Client or proxy    │
                             │ resolves "payments"│
                             └─────────┬──────────┘
                                       │
                                       ▼
                             ┌────────────────────┐
                             │ Healthy endpoint    │
                             │ 10.0.9.31:8080      │
                             └────────────────────┘
```

### Stable Name, Dynamic Address

The most important separation is:
- **service name**: stable identifier used by callers
- **instance address**: changing network location of a running instance

That separation is what allows deployments and scaling without rewriting every caller configuration.


# 3. Core Building Blocks

Most service discovery systems use the same small set of concepts, even when product names differ.

### 1. Service Name

The logical name clients use, such as:
- `payments`
- `inventory`
- `checkout-api`

This name should be stable enough that clients rarely need to change it.

### 2. Registry or Naming System

The place where instances become discoverable. Depending on the platform, this might be:
- a dedicated service registry
- DNS records managed by the platform
- a control plane that distributes endpoint state to proxies or clients

### 3. Instance Record

A discoverable instance usually includes:
- host or IP
- port
- protocol
- status
- metadata such as zone, version, or capability

```typescript
type ServiceInstance = {
  serviceName: string;
  instanceId: string;
  host: string;
  port: number;
  protocol: "http" | "https" | "grpc";
  zone: string;
  version: string;
  healthy: boolean;
};
```

### 4. Registration

Instances need a way to appear in discovery when they start.

Common approaches:
- the service registers itself
- the platform registers it on the service's behalf

### 5. Health Signal

Discovery is only useful if unhealthy targets stop receiving traffic or are otherwise avoided by routing decisions. That health signal may come from:
- heartbeats
- active probes
- platform-level readiness checks
- connection or error feedback from proxies

### 6. Resolver and Router

Someone still has to turn a name into a destination. That may be:
- the client library
- a reverse proxy or sidecar
- a platform network layer


# 4. How Service Discovery Works End to End

The full flow is usually straightforward once the pieces are named.

### Step-by-Step Flow

```text
1. A service instance starts
2. It registers itself or is registered by the platform
3. The instance becomes eligible after whatever registration and health/readiness checks the platform uses
4. A caller asks for "payments"
5. Discovery returns one or more eligible instances
6. A client or proxy chooses one instance
7. Traffic is sent
8. If the instance fails, health state changes and future lookups avoid it
```

### End-to-End Diagram

```text
┌──────────────┐     register      ┌────────────────┐
│ payments-v2  │ ----------------> │ registry / DNS │
└──────┬───────┘                   └──────┬─────────┘
       │ health/readiness                  │ lookup "payments"
       ▼                                   ▼
┌──────────────┐                    ┌────────────────┐
│ healthy      │                    │ checkout client│
└──────────────┘                    └──────┬─────────┘
                                           │ choose endpoint
                                           ▼
                                   ┌────────────────┐
                                   │ 10.0.9.31:8080 │
                                   └────────────────┘
```

### A Minimal Resolver Interface

```typescript
type DiscoveryQuery = {
  serviceName: string;
  zonePreference?: string;
};

interface ServiceResolver {
  resolve(query: DiscoveryQuery): Promise<ServiceInstance[]>;
}
```

### Why Eventual Change Matters

Discovery data is not static. Good designs assume:
- endpoints can be added or removed between calls
- caches can become stale
- a successful lookup does not guarantee a successful request

That is why discovery and resilience patterns belong together.


# 5. Discovery Patterns and Trade-Offs

You will usually encounter three broad patterns.

### Pattern 1: Client-Side Discovery

The client asks discovery for instances and chooses the destination itself.

```text
client -> registry lookup -> choose endpoint -> call instance directly
```

This can work well when:
- clients are internal services
- you control the client libraries
- you want per-client routing decisions

Watch for:
- more client complexity
- duplicated logic across languages
- stale endpoint caches

### Pattern 2: Server-Side Discovery

The client calls a stable endpoint, and a proxy or load balancer resolves and forwards the request.

```text
client -> gateway/proxy -> resolve "payments" -> forward to instance
```

This can work well when:
- clients should stay simple
- multiple languages and teams consume the service
- you want centralized routing policy

Watch for:
- an extra hop in the request path
- operational dependency on the proxy layer
- central policy becoming a bottleneck if mismanaged

### Pattern 3: DNS-Based Discovery

The client resolves a service name through DNS and connects using the result.

```text
checkout -> resolve payments.internal -> A/AAAA/SRV records -> call instance or virtual IP
```

This is common because DNS is widely supported, but practical behavior depends on:
- TTLs
- client resolver caching
- whether DNS returns one address, many addresses, or a virtual IP

### Comparison

```text
┌──────────────────────┬────────────────────────────────────────────┬────────────────────────────────────────────┐
│ Pattern              │ Often attractive when                      │ Watch for                                  │
├──────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Client-side          │ internal services need direct control      │ library complexity and stale caches        │
├──────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Server-side          │ clients should stay simple                 │ extra hop and proxy dependency             │
├──────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────┤
│ DNS-based            │ platform already provides stable naming    │ TTL behavior and uneven client support     │
└──────────────────────┴────────────────────────────────────────────┴────────────────────────────────────────────┘
```

### Conservative Real-World Mapping

Examples you may see in practice:
- Kubernetes often exposes services through stable DNS names and virtual IPs
- some microservice stacks use client libraries plus a registry for client-side resolution
- service meshes and proxies often implement server-side discovery behavior for clients

The pattern matters more than the brand name.


# 6. Health Checks, Leases, and Failure Handling

The hardest part of discovery is not finding endpoints. It is avoiding bad ones quickly enough without flapping constantly.

### Why Health Signals Matter

If an instance stays registered after it becomes unusable, discovery amplifies failure by sending more traffic to it.

```text
Bad path:
  instance hangs
  registry still thinks it is healthy
  clients keep routing traffic there
  timeouts pile up across the system
```

### Common Health Models

You will usually see one or more of:
- **readiness checks**: should this instance receive new traffic
- **liveness checks**: should this instance be restarted
- **heartbeats or leases**: has the instance renewed its presence recently
- **outlier feedback**: proxies reduce traffic to instances with repeated failures

### Lease-Based Registration

```typescript
type LeaseRecord = {
  instanceId: string;
  serviceName: string;
  expiresAtMs: number;
};

class LeaseRegistry {
  private readonly leases = new Map<string, LeaseRecord>();

  upsert(record: LeaseRecord): void {
    this.leases.set(record.instanceId, record);
  }

  listHealthy(serviceName: string, nowMs: number): LeaseRecord[] {
    return [...this.leases.values()].filter((lease) => {
      return lease.serviceName === serviceName && lease.expiresAtMs > nowMs;
    });
  }
}
```

The durable idea is simple: if a lease is not renewed in time, the instance should stop being considered healthy.

### Failure Windows Still Exist

Even with fast health checks, there is always some delay between:
- the moment an instance becomes bad
- the moment discovery data reflects that change

That is why you still need:
- short, reasonable timeouts
- retries with care
- idempotent operations where possible
- graceful connection draining during shutdown

### Flapping and Overreaction

Health policies that are too sensitive can create churn:

```text
temporary latency spike
  -> marked unhealthy too fast
  -> traffic shifts elsewhere
  -> healthy capacity drops
  -> more overload and more removals
```

Use thresholds and observation windows that fit the service behavior rather than treating every slow response as fatal.


# 7. Naming, Routing, and Load Balancing

Discovery does not end at lookup. You still need to decide which instance should receive a request.

### Naming Conventions

Service names should be:
- stable
- descriptive
- environment-aware when needed
- not overloaded with deployment details

```text
Prefer:
  payments
  inventory
  user-profile

Avoid:
  payments-node-3
  service-final-v2-new
  random-app-name
```

### Metadata-Driven Routing

Some systems use metadata to narrow the eligible endpoints:
- region or zone
- version
- capability
- tenant or shard ownership

```text
Request for "payments"
  -> prefer same zone
  -> require capability = "refunds"
  -> avoid draining instances
```

### Load-Balancing Strategies

Common strategies include:
- round robin
- least connections or least outstanding requests
- weighted routing
- hash by key for affinity

No single strategy is always best. The right choice depends on:
- request cost variance
- connection reuse patterns
- whether sticky behavior helps or hurts

### A Small Round-Robin Example

```typescript
class RoundRobinPicker {
  private nextIndex = 0;

  pick(instances: ServiceInstance[]): ServiceInstance {
    if (instances.length === 0) {
      throw new Error("No healthy instances available");
    }

    const instance = instances[this.nextIndex % instances.length];
    this.nextIndex += 1;
    return instance;
  }
}
```

### Zone Awareness and Cross-Zone Traffic

A common conservative policy is:
- prefer local zone capacity when healthy
- fail over across zones when necessary

That can reduce latency and inter-zone cost, but only if capacity planning and failover tests are good enough. Otherwise, locality rules can become another source of partial outages.


# 8. Practical TypeScript Patterns

The examples here are simplified, but they make the operational shape of discovery concrete.

### Pattern 1: Resolve, Filter, Then Pick

```typescript
function chooseEndpoint(
  endpoints: ServiceInstance[],
  preferredZone: string,
  picker: RoundRobinPicker,
): ServiceInstance {
  const healthy = endpoints.filter((endpoint) => endpoint.healthy);
  const local = healthy.filter((endpoint) => endpoint.zone === preferredZone);

  return picker.pick(local.length > 0 ? local : healthy);
}
```

This keeps routing policy explicit instead of scattering it through request code.

### Pattern 2: Cache Discovery Results for a Short Time

```typescript
class CachedResolver implements ServiceResolver {
  private readonly cache = new Map<
    string,
    { instances: ServiceInstance[]; expiresAtMs: number }
  >();

  constructor(
    private readonly upstream: ServiceResolver,
    private readonly ttlMs: number,
    private readonly now: () => number = () => Date.now(),
  ) {}

  async resolve(query: DiscoveryQuery): Promise<ServiceInstance[]> {
    const key = `${query.serviceName}:${query.zonePreference ?? "any"}`;
    const cached = this.cache.get(key);

    if (cached && cached.expiresAtMs > this.now()) {
      return cached.instances;
    }

    const instances = await this.upstream.resolve(query);
    this.cache.set(key, {
      instances,
      expiresAtMs: this.now() + this.ttlMs,
    });

    return instances;
  }
}
```

Short caches can reduce control-plane load. Long caches increase the chance of stale routing.

### Pattern 3: Deregister Before Shutdown

```typescript
interface ServiceRegistry {
  register(instance: ServiceInstance): Promise<void>;
  deregister(instanceId: string): Promise<void>;
}

class DiscoverableService {
  constructor(
    private readonly registry: ServiceRegistry,
    private readonly instance: ServiceInstance,
  ) {}

  async start(): Promise<void> {
    await this.registry.register(this.instance);
  }

  async shutdown(): Promise<void> {
    await this.registry.deregister(this.instance.instanceId);
  }
}
```

In production, graceful shutdown usually also includes:
- failing readiness first
- waiting for in-flight requests to drain
- stopping listeners after traffic has been removed

### Pattern 4: Keep Business Calls Separate from Lookup

```typescript
class PaymentGatewayClient {
  constructor(
    private readonly resolver: ServiceResolver,
    private readonly picker: RoundRobinPicker,
  ) {}

  async capture(orderId: string): Promise<Response> {
    const instances = await this.resolver.resolve({ serviceName: "payments" });
    const endpoint = this.picker.pick(instances);

    return fetch(
      `${endpoint.protocol}://${endpoint.host}:${endpoint.port}/payments/${orderId}/capture`,
      { method: "POST" },
    );
  }
}
```

This separation makes testing and future routing changes much easier.


# 9. Best Practices and Common Pitfalls

Service discovery failures are usually boring in retrospect. The same mistakes repeat.

### Best Practices

Good:
- use stable logical service names
- make health and readiness semantics explicit
- keep TTLs and refresh intervals conservative
- deregister or drain instances before shutdown
- combine discovery with timeouts, retries, and circuit breaking
- use metadata sparingly and only when clients truly need it

### Common Pitfalls

Bad:
- hardcoding pod or container IPs into application config
- treating a DNS name as proof that the target is healthy
- relying on long-lived cached endpoint lists
- mixing discovery, retry, and business logic in one giant client class
- using discovery metadata as a substitute for proper authorization

### Discovery Is Not Security

Discovery tells you where a service is. It does not prove the caller should talk to it.

Keep these concerns separate:
- **discovery**: where is the target
- **authentication**: who is calling
- **authorization**: is the call allowed
- **transport security**: is the channel protected

### Be Careful with Dynamic Routing Rules

Routing by version, capability, or region can be useful, but every extra condition increases failure modes:
- some instances may never receive traffic
- partial deployments may expose inconsistent behavior
- fallback logic may quietly violate expectations

Use the simplest policy that supports the requirement.

### Operational Examples

Conservative examples from common platforms:
- Kubernetes often gives you stable service naming and readiness-driven endpoint updates
- Consul-style registries often combine service records with active health checks
- proxy or mesh layers can centralize retries and endpoint selection, but they do not remove the need to understand the behavior

The implementation details vary. The operational questions stay the same.


# 10. Summary

**Why service discovery exists:**
- distributed systems need stable names even when instance addresses change
- scaling, failover, and rolling deploys make static endpoint lists fragile

**What service discovery does:**
- maps logical service names to currently routable instances
- combines registration, health awareness, and endpoint selection

**What it does not do:**
- it does not remove the need for timeouts, retries, circuit breakers, or secure service identity
- it does not guarantee that a returned endpoint will stay healthy for the whole request

**Practical design advice:**
- keep names stable, health semantics explicit, and routing policy simple
- prefer short-lived discovery caches and graceful instance draining
- treat discovery as one layer in a broader reliability design

**Implementation checklist:**

```text
Naming and ownership:
  □ Define stable logical service names
  □ Decide which metadata is truly needed for routing
  □ Document who owns the registry or control plane

Registration and health:
  □ Choose self-registration or platform-managed registration
  □ Define readiness, liveness, and lease behavior clearly
  □ Remove or drain instances before shutdown

Lookup and routing:
  □ Choose client-side, server-side, or DNS-based discovery deliberately
  □ Set conservative cache TTLs and refresh intervals
  □ Pick a load-balancing strategy that fits request behavior

Reliability:
  □ Add request timeouts and bounded retries
  □ Test stale endpoint, partial outage, and failover scenarios
  □ Avoid assuming discovery data is perfectly fresh

Operations:
  □ Monitor registry errors, lookup latency, and unhealthy instance churn
  □ Review cross-zone routing and rollout behavior
  □ Keep discovery concerns separate from auth and policy enforcement
```
