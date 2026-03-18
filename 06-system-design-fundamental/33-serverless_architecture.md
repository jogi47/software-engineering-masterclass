# Serverless Architecture

[← Back to Index](README.md)

Imagine you are building a product that receives customer webhooks, resizes uploaded images, sends scheduled reminders, and runs occasional reconciliation jobs. Traffic is uneven: some hours are quiet, then one marketing campaign creates a sharp burst.

Without a serverless model, teams often start by keeping general-purpose application servers running all the time for work that is mostly intermittent:

```typescript
// Bad example: a fixed pool of always-on application servers handles
// bursty, event-driven work with local state and manual scaling assumptions.
type UploadEvent = {
  imageId: string;
  sourceUrl: string;
};

class ThumbnailServer {
  private readonly inFlight = new Map<string, Promise<void>>();

  async onUpload(event: UploadEvent): Promise<void> {
    if (this.inFlight.has(event.imageId)) {
      return this.inFlight.get(event.imageId)!;
    }

    const job = this.generateThumbnail(event);
    this.inFlight.set(event.imageId, job);

    try {
      await job;
    } finally {
      this.inFlight.delete(event.imageId);
    }
  }

  private async generateThumbnail(event: UploadEvent): Promise<void> {
    const imageBytes = await fetch(event.sourceUrl).then((response) => response.arrayBuffer());

    // Pretend CPU-heavy image processing happens here.
    if (imageBytes.byteLength === 0) {
      throw new Error("Image was empty");
    }

    // Local filesystem and process memory become part of the design.
    console.log(`Generated thumbnail for ${event.imageId}`);
  }
}
```

This usually fails in familiar ways:
- you pay to keep servers warm even when no work is arriving
- sudden bursts need manual capacity planning or aggressive overprovisioning
- local memory and filesystem assumptions break once many instances are involved
- operational effort shifts toward servers, patching, autoscaling, and idle capacity management

This is where **serverless architecture** comes in. Serverless moves more infrastructure management to a cloud platform so you can run request-driven, event-driven, or scheduled workloads with smaller operational surfaces and finer-grained scaling.

In this chapter, you will learn:
  * [Why serverless architecture exists](#1-why-serverless-architecture-exists)
  * [What serverless architecture is and is not](#2-what-serverless-architecture-is)
  * [Which building blocks matter most](#3-core-building-blocks)
  * [How serverless request and event flows work](#4-how-serverless-workloads-flow)
  * [Which execution models fit best](#5-common-execution-models-and-workload-fit)
  * [How serverless compares with other architectures](#6-serverless-vs-other-architectural-choices)
  * [How to handle state, data, and reliability](#7-state-data-and-reliability-patterns)
  * [What practical TypeScript implementations look like](#8-practical-typescript-patterns)
  * [Which best practices and pitfalls matter most](#9-best-practices-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why Serverless Architecture Exists

Serverless architecture exists because many workloads do not justify owning long-running server capacity all the time.

### The Core Problem

A large class of workloads is naturally:
- bursty
- asynchronous
- event-driven
- uneven across time

Examples:
- webhook ingestion
- file processing after uploads
- scheduled cleanup or billing jobs
- background notifications
- low-to-moderate traffic APIs with unpredictable spikes

If you run those workloads on fixed servers, you often accept one of two weak outcomes:
- overprovision capacity so bursts do not hurt you
- underprovision capacity and risk queue buildup, dropped work, or slow responses

```text
Burst-driven workload on fixed servers:

low traffic  ---> many idle instances
traffic spike ---> scaling lag or saturation

Result:
  -> wasted baseline capacity
  -> more operational tuning
  -> harder burst handling
```

### What Serverless Optimizes For

Serverless usually optimizes for:
- reduced server management
- elastic scaling for suitable workloads
- fine-grained execution of small units of business logic
- easier integration with storage, queues, timers, and event sources

That does not mean it is universally cheaper or simpler. It means it can be a strong fit when workload shape and operational goals align with managed execution.

### The Durable Motivation

The durable value of serverless is not "no servers exist." Servers still exist. The durable value is:
- you manage less infrastructure directly
- the platform scales execution more automatically
- you can build around events and short-lived tasks more naturally


# 2. What Serverless Architecture Is

Serverless architecture is a model in which application logic runs on managed compute platforms that provision, schedule, scale, and retire execution environments for you, while you focus more on code, events, and service boundaries.

### A Conservative Definition

The durable idea is:

```text
Serverless architecture =
  managed compute execution
  + event-driven or request-driven invocation
  + platform-managed provisioning and scaling
  + externalized state and managed integrations
```

### What It Usually Means in Practice

A serverless system often includes:
- functions or small application handlers
- API triggers, queue triggers, storage triggers, or schedules
- managed identity, secrets, logging, and metrics
- externalized state in databases, caches, or object storage
- infrastructure defined through configuration or infrastructure-as-code

### What It Is Not

Serverless architecture is usually not:
- proof that no operational work exists
- limited to Functions-as-a-Service only
- a promise of zero cost when idle in every product shape
- a guarantee that every workload will scale or perform well automatically
- a replacement for architecture decisions about contracts, state, and failure handling

### Serverless Does Not Mean Stateless Business

A common misunderstanding is:

```text
serverless = state disappears
```

That is incorrect.

What usually changes is this:
- compute is more ephemeral
- state must live in explicit systems outside the process
- the architecture becomes more deliberate about persistence, idempotency, and retries


# 3. Core Building Blocks

Healthy serverless systems rely on a few recurring building blocks.

### 1. Managed Compute

This is the execution environment for your code:
- HTTP handlers
- event consumers
- scheduled jobs
- workflow steps

The platform is typically responsible for:
- provisioning runtime environments
- starting instances when work arrives
- scaling concurrent execution
- retiring unused execution environments

### 2. Triggers and Event Sources

Something must cause the code to run.

Common triggers:
- HTTP requests
- queue messages
- object storage events
- database change events
- scheduled timers
- stream or topic subscriptions

### 3. External State Stores

Serverless compute should usually treat local memory and local disk as temporary.

Durable state commonly lives in:
- relational databases
- key-value stores
- object storage
- distributed caches
- message queues

```text
┌──────────────┐      ┌────────────────┐      ┌──────────────┐
│ Trigger      │ ---> │ Function / Job │ ---> │ Durable Data │
│ HTTP / queue │      │ short-lived    │      │ DB / object  │
└──────────────┘      └────────────────┘      └──────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │ Logs / Trace │
                       │ Metrics      │
                       └──────────────┘
```

### 4. Identity, Configuration, and Secrets

A production system still needs:
- service identity
- access policies
- secret retrieval
- environment configuration

The difference is that these concerns are often provided through managed services and short-lived credentials instead of manually configured hosts.

### 5. Observability

Because execution units may be short-lived and highly parallel, observability matters even more.

You usually need:
- structured logs
- request or event correlation IDs
- metrics for invocations, errors, duration, and throttling
- traces across API, queue, and database boundaries

### 6. Deployment and Infrastructure Definitions

A serverless system still needs release discipline:
- versioned deployments
- environment promotion
- rollback plans
- infrastructure definitions for triggers, permissions, and data dependencies

The infrastructure surface is smaller than managing fleets directly, but it is still architecture.


# 4. How Serverless Workloads Flow

Serverless systems usually center on request-driven and event-driven execution flows.

### Synchronous Request Flow

An HTTP-triggered path often looks like this:

```text
┌──────────┐    ┌──────────────┐    ┌────────────────┐    ┌──────────────┐
│ Client   │ -> │ Edge / API   │ -> │ Function       │ -> │ Database /   │
│ browser  │    │ gateway      │    │ auth + logic   │    │ cache        │
└──────────┘    └──────────────┘    └────────────────┘    └──────────────┘
                                          │
                                          ▼
                                     response
```

Useful characteristics:
- the platform routes the request to code only when needed
- concurrency can scale with traffic, within configured limits
- compute may be short-lived, so heavy initialization costs matter

### Asynchronous Event Flow

An event-driven path often looks like this:

```text
┌──────────────┐    ┌──────────────┐    ┌────────────────┐    ┌──────────────┐
│ Upload event │ -> │ Queue / bus  │ -> │ Function       │ -> │ Object store │
│ or webhook   │    │ buffer       │    │ transform      │    │ / DB / API   │
└──────────────┘    └──────────────┘    └────────────────┘    └──────────────┘
                                               │
                                               ▼
                                        retry / DLQ / logs
```

This is often a stronger fit than forcing everything through one synchronous request path.

### Step-by-Step Lifecycle

```text
1. A trigger fires from HTTP, storage, queue, or a timer
2. The platform schedules an execution environment
3. Your code receives input plus context metadata
4. Business logic validates input and performs work
5. State changes are written to durable systems
6. The platform records logs and metrics
7. The invocation finishes or retries, depending on outcome
```

### Why This Changes Design Choices

Because the platform controls execution lifecycle, you should usually design for:
- short-lived handlers
- explicit timeouts
- replay safety
- externalized state
- bounded dependencies and initialization cost


# 5. Common Execution Models and Workload Fit

Serverless is not one pattern. It is a family of managed execution styles.

### 1. HTTP or RPC-Triggered Functions

Good for:
- lightweight APIs
- webhook endpoints
- authenticated control-plane actions
- internal admin operations

Watch for:
- latency-sensitive user flows
- cold start impact if initialization is heavy
- overly chatty call chains

### 2. Queue-Triggered Workers

Good for:
- email sending
- image processing
- fan-out jobs
- retryable background work

This is often where serverless feels most natural because queue buffering absorbs spikes.

### 3. Scheduled Jobs

Good for:
- daily reconciliation
- cleanup tasks
- report generation
- periodic polling where push integration is unavailable

### 4. Stream or Change-Event Consumers

Good for:
- incremental projections
- change propagation
- notification pipelines
- audit enrichment

Be careful with:
- ordering assumptions
- duplicate delivery
- backpressure and poison messages

### Workload Fit Table

```text
┌───────────────────────────┬──────────────────────────────────────────────┐
│ Stronger Fit              │ Why                                          │
├───────────────────────────┼──────────────────────────────────────────────┤
│ Bursty APIs               │ Elastic concurrency can help absorb spikes   │
├───────────────────────────┼──────────────────────────────────────────────┤
│ Event-driven processing   │ Natural trigger model and queue integration  │
├───────────────────────────┼──────────────────────────────────────────────┤
│ Scheduled automation      │ No need to run servers between executions    │
├───────────────────────────┼──────────────────────────────────────────────┤
│ Irregular background jobs │ Pay and scale more closely with actual work  │
└───────────────────────────┴──────────────────────────────────────────────┘
```

```text
┌─────────────────────────────┬────────────────────────────────────────────┐
│ Weaker Fit                  │ Why                                        │
├─────────────────────────────┼────────────────────────────────────────────┤
│ Long-lived connections      │ Ephemeral compute is usually a poor match  │
├─────────────────────────────┼────────────────────────────────────────────┤
│ Very large in-memory jobs   │ Memory/runtime limits may become awkward   │
├─────────────────────────────┼────────────────────────────────────────────┤
│ Tight low-latency loops     │ Startup and network overhead may matter    │
├─────────────────────────────┼────────────────────────────────────────────┤
│ Heavy local state reliance  │ Local process state is not durable         │
└─────────────────────────────┴────────────────────────────────────────────┘
```


# 6. Serverless vs Other Architectural Choices

Serverless is one deployment and execution style, not a total replacement for all other models.

### Serverless vs Traditional Long-Running Servers

```text
Long-running servers:
  you manage more of the host/runtime lifecycle
  + process stays alive between requests
  + capacity is usually provisioned ahead of demand

Serverless:
  platform manages more provisioning and scaling
  + execution is more ephemeral
  + cost and scaling can track invocation patterns more closely
```

### Serverless vs Containers

Containers package software. Serverless manages execution. These are related but not identical concerns.

You can run:
- containers on self-managed or orchestrated infrastructure
- serverless functions on a managed platform
- serverless container services where you provide an image and the platform manages scaling

### Serverless vs Monoliths and Microservices

Serverless is orthogonal to some architectural boundaries:
- you can build a modular monolith and deploy parts of it on serverless platforms
- you can build microservices where some services are serverless and others are not

The better question is usually:
- which workloads benefit from managed, elastic, short-lived execution
- which workloads need stable long-running processes or tighter host control

### Comparison Table

```text
┌──────────────────────┬──────────────────────────┬──────────────────────────┐
│ Dimension            │ Serverless               │ Long-Running Service     │
├──────────────────────┼──────────────────────────┼──────────────────────────┤
│ Infra management     │ Lower direct ownership   │ Higher direct ownership  │
├──────────────────────┼──────────────────────────┼──────────────────────────┤
│ Execution lifecycle  │ Ephemeral                │ Persistent process       │
├──────────────────────┼──────────────────────────┼──────────────────────────┤
│ Burst handling       │ Often easier             │ Depends on autoscaling   │
├──────────────────────┼──────────────────────────┼──────────────────────────┤
│ Local state usage    │ Weak fit                 │ Easier to retain         │
├──────────────────────┼──────────────────────────┼──────────────────────────┤
│ Long-lived work      │ Often awkward            │ Usually simpler          │
├──────────────────────┼──────────────────────────┼──────────────────────────┤
│ Platform coupling    │ Can be higher            │ Often easier to abstract │
└──────────────────────┴──────────────────────────┴──────────────────────────┘
```

### Conservative Choice Rule

Prefer serverless when:
- execution is naturally event-driven or bursty
- the team wants less host management
- workflow duration and runtime limits fit the platform well

Prefer long-running services when:
- you need stable, long-lived connections or workers
- startup overhead is a material problem
- the workload needs tighter control over runtime, memory layout, or host behavior


# 7. State, Data, and Reliability Patterns

The most important design shift in serverless systems is usually not compute. It is how you handle state and failure.

### Stateless Compute, Explicit State

A safe baseline is:

```text
Function instances are disposable.

Therefore:
  keep durable state outside the process
  treat memory as a cache, not a source of truth
  assume another instance may handle the next event
```

### Idempotency Matters

Retries are common in distributed systems and especially common around queues, webhooks, and platform-managed invocations.

Useful rule:
- if repeating an operation would be harmful, make the handler idempotent

Examples:
- payment webhook processing
- order creation with a client-supplied idempotency key
- event consumers updating read models

### Queue Buffering and Dead-Letter Handling

Queue-backed designs help absorb burstiness and isolate failures:

```text
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Producer     │ -> │ Queue        │ -> │ Function     │
└──────────────┘    └──────────────┘    └──────────────┘
                            │
                            ▼
                      dead-letter queue
```

This gives you:
- controlled retry behavior
- decoupling between producers and workers
- inspection paths for messages that keep failing

### Concurrency Control Still Exists

Automatic scaling does not remove shared-state concerns.

You may still need:
- optimistic concurrency
- unique constraints
- lease or lock patterns
- per-key serialization for order-sensitive workflows

### Data Placement Choices

A common pattern is:
- object storage for files
- relational storage for transactional records
- caches for hot reads
- queues or streams for asynchronous workflow edges

The compute layer may be serverless, but the storage choices still determine much of the system behavior.

### Cold Starts and Initialization Discipline

Initialization cost can affect latency-sensitive paths.

Common fixes:
- keep handler dependencies small
- reuse clients across invocations when the runtime allows it
- move heavyweight work off synchronous paths
- benchmark actual latency before assuming the impact is acceptable or unacceptable


# 8. Practical TypeScript Patterns

Practical serverless code should be explicit about contracts, dependencies, idempotency, and timeout boundaries.

### Example 1: HTTP Handler with Externalized Dependencies

```typescript
type CreateReportRequest = {
  accountId: string;
  rangeStart: string;
  rangeEnd: string;
};

type HttpResponse = {
  statusCode: number;
  body: string;
};

interface ReportRepository {
  hasActiveReport(accountId: string, rangeStart: string, rangeEnd: string): Promise<boolean>;
  createPendingReport(input: {
    reportId: string;
    accountId: string;
    rangeStart: string;
    rangeEnd: string;
  }): Promise<void>;
}

interface JobPublisher {
  publish(topic: "report-generation", payload: { reportId: string }): Promise<void>;
}

class CreateReportHandler {
  constructor(
    private readonly repository: ReportRepository,
    private readonly publisher: JobPublisher,
  ) {}

  async handle(requestBody: string): Promise<HttpResponse> {
    const input = this.parse(requestBody);

    const alreadyRunning = await this.repository.hasActiveReport(
      input.accountId,
      input.rangeStart,
      input.rangeEnd,
    );

    if (alreadyRunning) {
      return {
        statusCode: 202,
        body: JSON.stringify({ status: "already-running" }),
      };
    }

    const reportId = crypto.randomUUID();

    await this.repository.createPendingReport({
      reportId,
      accountId: input.accountId,
      rangeStart: input.rangeStart,
      rangeEnd: input.rangeEnd,
    });

    await this.publisher.publish("report-generation", { reportId });

    return {
      statusCode: 202,
      body: JSON.stringify({ reportId, status: "queued" }),
    };
  }

  private parse(body: string): CreateReportRequest {
    const parsed = JSON.parse(body) as Partial<CreateReportRequest>;

    if (!parsed.accountId || !parsed.rangeStart || !parsed.rangeEnd) {
      throw new Error("Missing required fields");
    }

    return {
      accountId: parsed.accountId,
      rangeStart: parsed.rangeStart,
      rangeEnd: parsed.rangeEnd,
    };
  }
}
```

What this does well:
- keeps request parsing explicit
- writes durable intent before background processing
- queues heavy work instead of blocking the caller

### Example 2: Idempotent Queue Consumer

```typescript
type ReportJob = {
  eventId: string;
  reportId: string;
};

interface ProcessedEventStore {
  has(eventId: string): Promise<boolean>;
  mark(eventId: string): Promise<void>;
}

interface ReportGenerator {
  generate(reportId: string): Promise<void>;
}

class ReportGenerationConsumer {
  constructor(
    private readonly processedEvents: ProcessedEventStore,
    private readonly generator: ReportGenerator,
  ) {}

  async handle(job: ReportJob): Promise<void> {
    if (await this.processedEvents.has(job.eventId)) {
      return;
    }

    await this.generator.generate(job.reportId);
    await this.processedEvents.mark(job.eventId);
  }
}
```

This does not assume exactly-once delivery. It assumes duplicates can happen and makes them harmless.

### Example 3: Timeout-Aware Dependency Calls

```typescript
interface PricingClient {
  calculateQuote(input: {
    customerId: string;
    sku: string;
    quantity: number;
    signal: AbortSignal;
  }): Promise<{ amountCents: number }>;
}

class QuoteHandler {
  constructor(private readonly pricingClient: PricingClient) {}

  async handle(customerId: string, sku: string, quantity: number): Promise<number> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1_500);

    try {
      const quote = await this.pricingClient.calculateQuote({
        customerId,
        sku,
        quantity,
        signal: controller.signal,
      });

      return quote.amountCents;
    } finally {
      clearTimeout(timeout);
    }
  }
}
```

Serverless code still makes network calls. You should design those calls as remote operations with timeouts, retries, and failure semantics, not as local method calls.


# 9. Best Practices and Common Pitfalls

Serverless works well when you respect its execution model instead of pretending it behaves like a permanent application process.

### Best Practices

- keep handlers small and focused on one trigger and one clear responsibility
- push large or slow work toward queues, workflows, or asynchronous jobs
- externalize state and use durable identifiers for records and events
- make write paths idempotent where retries are plausible
- instrument duration, errors, throttling, retries, and downstream dependency health
- define concurrency, memory, and timeout settings deliberately rather than accepting defaults blindly

### Pitfall 1: Treating Memory as Durable State

```text
Bad:
  keep workflow progress in process memory

Better:
  persist workflow state in a database or workflow engine
```

### Pitfall 2: Making One User Request Fan Out into Too Many Functions

Too much fine-grained decomposition can create:
- latency overhead
- more permissions and deployment surfaces
- harder debugging

Useful rule:
- split by responsibility and scaling need
- avoid splitting so aggressively that a simple request becomes a fragile chain

### Pitfall 3: Ignoring Retry and Duplicate Semantics

Bad assumption:
- "If the platform invoked it once, it will only ever happen once."

Safer assumption:
- deliveries may be repeated
- downstream dependencies may partially succeed
- your code must decide what duplication-safe behavior looks like

### Pitfall 4: Choosing Serverless for Long-Lived or Host-Centric Workloads

Examples of awkward fits:
- long-running streaming connections
- workloads that depend on large local caches
- specialized host configuration or heavy local compute loops

This does not mean serverless can never support adjacent pieces of those systems. It means the core workload may fit better on a different runtime model.

### Pitfall 5: Underestimating Platform Coupling

Managed triggers, permissions, and event sources can improve delivery speed, but they can also deepen coupling to one provider's runtime and deployment model.

Practical response:
- keep business logic separate from platform adapters
- isolate provider-specific code at the edges
- avoid assuming portability where it does not really exist

### Real-World Uses

Durable serverless use cases include:
- API endpoints for low-to-moderate traffic control planes
- webhook receivers that validate, persist, and enqueue work
- object-upload processing for thumbnails, transcription, or metadata extraction
- scheduled jobs for reconciliation, cleanup, and report generation
- event consumers that update read models or trigger notifications

### Platform Examples

Real-world platform combinations often look like:
- AWS Lambda behind API Gateway, connected to SQS, EventBridge, DynamoDB, or S3
- Azure Functions connected to Service Bus, Event Grid, Blob Storage, or Cosmos DB
- Google Cloud Functions or Cloud Run connected to Pub/Sub, Cloud Storage, or Firestore
- edge runtimes such as Cloudflare Workers for request handling close to users, when the workload fits that runtime model

Exact limits, startup behavior, and integration surfaces vary by platform and by product tier, so design to the execution model rather than assuming one provider's behavior applies everywhere.

Across providers, the core principles stay similar: ephemeral compute, managed triggers, externalized state, and explicit failure handling.


# 10. Summary

**Why serverless architecture exists:**
- many workloads are bursty, event-driven, or intermittent enough that fixed always-on server capacity is an awkward default
- managed execution can reduce direct infrastructure ownership and align scaling more closely with real work

**What serverless changes architecturally:**
- compute becomes more ephemeral
- triggers and events become first-class design elements
- state, retries, and observability need to be more explicit

**What serverless does well:**
- it is often strong for webhook handling, queue workers, scheduled automation, and burst-driven APIs
- it can simplify operational ownership for teams that do not want to manage general-purpose server fleets for those workloads

**What it does not guarantee by itself:**
- it does not remove the need for sound contracts, authorization, and reliability design
- it does not make every workload cheaper, faster, or easier
- it does not eliminate architectural trade-offs around latency, runtime limits, and provider coupling

**Practical design advice:**
- keep handlers short-lived and focused
- push durable state into explicit storage systems
- design for retries and duplicate delivery as normal operating conditions
- choose serverless where the workload shape actually matches the runtime model

**Implementation checklist:**

```text
Fit and scope:
  □ Confirm the workload is bursty, event-driven, scheduled, or otherwise a strong fit for managed short-lived execution
  □ Check whether latency, duration, memory, and connection requirements fit the chosen runtime model
  □ Avoid choosing serverless only because it sounds simpler on paper

Architecture:
  □ Define clear triggers, handler responsibilities, and service boundaries
  □ Keep business logic separate from provider-specific adapters where practical
  □ Move slow or fan-out work to queues, workflows, or background processing paths

State and data:
  □ Keep durable state outside the function process
  □ Use idempotency keys or deduplication for important write paths
  □ Choose storage systems deliberately for transactional data, files, cache, and asynchronous delivery

Reliability:
  □ Set explicit timeout, retry, and concurrency policies
  □ Add dead-letter handling or failure inspection paths for asynchronous workloads
  □ Test duplicate delivery, partial failure, and downstream timeout behavior before production

Operations:
  □ Capture structured logs, metrics, and traces with request or event correlation
  □ Measure cold start and dependency latency on real user-facing paths
  □ Automate deployment, rollback, permissions, and configuration management across environments
```
