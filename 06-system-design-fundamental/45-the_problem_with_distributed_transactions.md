# The Problem with Distributed Transactions

[← Back to Index](README.md)

Imagine you are building checkout for an e-commerce platform. A customer clicks "Place order" and expects one clear outcome: either the order is accepted and the important side effects happen, or nothing important happens at all.

Without the right design, teams often write a linear workflow that looks correct in code but is not atomic in reality:

```typescript
type CheckoutInput = {
  orderId: string;
  customerId: string;
  sku: string;
  quantity: number;
  amountCents: number;
};

interface OrdersRepository {
  createPending(input: CheckoutInput): Promise<void>;
  markConfirmed(orderId: string): Promise<void>;
}

interface InventoryClient {
  reserve(input: { orderId: string; sku: string; quantity: number }): Promise<void>;
}

interface PaymentsClient {
  charge(input: { orderId: string; customerId: string; amountCents: number }): Promise<void>;
}

class CheckoutService {
  constructor(
    private readonly orders: OrdersRepository,
    private readonly inventory: InventoryClient,
    private readonly payments: PaymentsClient,
  ) {}

  async placeOrder(input: CheckoutInput): Promise<void> {
    await this.orders.createPending(input);
    await this.inventory.reserve({
      orderId: input.orderId,
      sku: input.sku,
      quantity: input.quantity,
    });
    await this.payments.charge({
      orderId: input.orderId,
      customerId: input.customerId,
      amountCents: input.amountCents,
    });
    await this.orders.markConfirmed(input.orderId);
  }
}
```

This looks reasonable, but it fails in predictable ways:
- inventory may commit its reservation even if the payment call later times out
- payment may succeed but the final order status update may fail
- retries may double-charge or double-reserve if the downstream APIs are not idempotent
- each service can roll back only its own local state, not the whole business workflow

This is where **the problem with distributed transactions** begins. Once one logical business action spans multiple databases, services, queues, or external APIs, you no longer have one transaction boundary that can guarantee all-or-nothing behavior for the whole workflow.

In this chapter, you will learn:
  * [Why the problem exists](#1-why-the-problem-exists)
  * [What a distributed transaction is and is not](#2-what-a-distributed-transaction-is)
  * [Why local transactions feel simpler](#3-why-local-transactions-feel-simple)
  * [Where cross-service workflows break](#4-where-cross-service-workflows-break)
  * [Which failure modes create ambiguity](#5-failure-modes-and-ambiguity)
  * [Why consistency and coordination introduce trade-offs](#6-consistency-availability-and-coordination-trade-offs)
  * [Which solution families exist and what they cost](#7-common-solution-families-and-what-they-cost)
  * [What practical TypeScript guardrails look like](#8-practical-typescript-patterns)
  * [When the problem matters most and which pitfalls repeat](#9-when-the-problem-matters-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why the Problem Exists

The problem exists because system boundaries and transaction boundaries are usually not the same thing.

### One Business Action Often Crosses Many Owners

In a distributed system, a single user action may involve:
- one service writing business state
- another service reserving scarce inventory
- another service authorizing or capturing money
- a broker or log carrying events to downstream consumers
- an external provider performing work outside your database

```text
Customer places order
        |
        v
┌────────────────┐
│ Orders Service │
└──────┬─────────┘
       │
       ├──────────────▶ Orders DB
       ├──────────────▶ Inventory Service ─────▶ Inventory DB
       ├──────────────▶ Payment Service ───────▶ Payment system
       └──────────────▶ Event broker
```

Each participant owns its own state and commits locally.

### Service Autonomy Changes the Atomicity Story

Service decomposition is usually chosen for reasons such as:
- independent deployment
- clearer ownership boundaries
- separate scaling profiles
- technology flexibility
- fault isolation

Those benefits are real, but they remove the convenience of one database transaction covering everything.

### Local ACID Does Not Automatically Cross the Network

A local database can often give you atomicity because one engine controls:
- the lock manager
- the write-ahead log or equivalent recovery record
- the commit decision
- crash recovery for its own data

Once work crosses service or resource boundaries, those guarantees stop at each participant's local edge.

### The User Still Expects One Outcome

The system may be distributed, but the business expectation often is not.

Customers do not think in terms of:
- "the payment committed but the reservation did not"
- "the response timed out but the charge may have succeeded"
- "the event was published but the read model is behind"

They think in terms of order placed, order failed, refund pending, or shipment canceled. Distributed transactions are hard because the business wants one coherent story while the infrastructure offers only partial local truth.


# 2. What a Distributed Transaction Is

A distributed transaction is a logical operation whose correctness depends on coordinated changes across multiple independent resource managers.

### A Conservative Definition

The durable idea is:

```text
distributed transaction =
  one business operation
  + multiple independently committing participants
  + a requirement to keep the overall outcome coherent
```

Those participants may include:
- service-owned relational databases
- document stores or key-value stores
- message brokers
- caches with write side effects
- external systems such as payment gateways or fulfillment providers

### This Topic Is Broader Than Formal XA or 2PC

Some systems use a formal distributed commit protocol such as two-phase commit. But the practical problem is broader than that.

If your workflow does all of the following:
- writes an order row
- reserves stock in another service
- charges a card through a remote API
- publishes an event for fulfillment

then you already have a distributed transaction problem, even if you never use the phrase "distributed transaction manager."

### Not Every Multi-Step Workflow Needs All-or-Nothing Semantics

A useful design question is:

```text
Which steps must look atomic to the business,
and which steps can safely lag, retry, or be compensated later?
```

For example:
- charging a customer and shipping nothing is usually unacceptable
- sending an email a few seconds late is often acceptable
- analytics updates are often eventually consistent

The hardest designs are not the ones with many steps. The hardest designs are the ones where some steps are business-critical, some are irreversible, and some are only eventually required.

### Distributed Transaction Does Not Mean "One Giant Lock Everywhere"

A distributed transaction is not simply:
- one giant global mutex
- one shared database for every service
- one guarantee that every participant supports rollback

Many real systems cannot roll back all side effects in a literal sense. A payment may need a refund rather than a true undo. An email may be impossible to unsend. A shipment request may require a cancellation workflow instead of rollback.


# 3. Why Local Transactions Feel Simple

Local transactions feel simple because one engine is in charge.

### One Database Owns the Commit Decision

In a single database design, the transaction manager can coordinate the full lifecycle:

```text
Application
    |
    v
┌────────────────────┐
│ Database engine    │
│  - locks           │
│  - log             │
│  - commit record   │
│  - recovery        │
└─────────┬──────────┘
          │
          v
   tables / indexes / rows
```

That lets the database decide:
- when changes become visible
- what to roll back on error
- how to recover after crash

### Rollback Works Because the Effects Stay Inside One Boundary

If all relevant writes stay inside one resource, rollback is tractable:

```typescript
interface Transaction {
  insertOrder(orderId: string, customerId: string): Promise<void>;
  insertOrderItem(orderId: string, sku: string, quantity: number): Promise<void>;
}

interface Database {
  transaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T>;
}

class LocalOrderWriter {
  constructor(private readonly db: Database) {}

  async createOrder(orderId: string, customerId: string, sku: string, quantity: number): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insertOrder(orderId, customerId);
      await tx.insertOrderItem(orderId, sku, quantity);
    });
  }
}
```

If `insertOrderItem` fails, the database can usually abort the transaction and leave no visible partial result.

### The False Intuition

The false intuition is:

```text
This code is sequential, therefore the whole workflow is transactional.
```

That is only true when one transaction manager controls the whole unit of work.

Once your logic becomes:
- local database write
- remote service call
- message publish
- another remote service call

the sequential code still looks tidy, but atomicity has already been broken into separate commit decisions.


# 4. Where Cross-Service Workflows Break

Cross-service workflows break at the points where local commits become externally visible before the full business workflow is settled.

### The Critical Observation

Every participant can usually do only one of two things:
- commit its own local change
- roll back its own local change

What it usually cannot do is:
- roll back another participant's already committed change

### A Typical Order Flow

```text
1. Orders Service writes PENDING order         -> committed in Orders DB
2. Inventory Service reserves stock           -> committed in Inventory DB
3. Payment Service charges customer           -> committed in payment system
4. Orders Service marks order CONFIRMED       -> committed in Orders DB
```

This flow has multiple failure windows:

```text
┌───────────────┐     ┌───────────────────┐     ┌─────────────────┐
│ Orders DB     │     │ Inventory DB      │     │ Payment system  │
└──────┬────────┘     └────────┬──────────┘     └────────┬────────┘
       │                       │                         │
1. commit PENDING             │                         │
       │                       │                         │
2. call reserve  ───────────▶ commit reservation       │
       │                       │                         │
3. call charge   ─────────────────────────────────────▶ commit charge
       │                       │                         │
4. mark CONFIRMED
```

If the process crashes after step 3 but before step 4:
- payment may be complete
- inventory may be reserved
- the order may still look pending

That is not one failed transaction. That is several independent local truths that no longer tell one simple story.

### External Effects Escalate the Problem

The moment a workflow involves an external side effect, rollback becomes even less literal.

Examples:
- card authorization or capture
- email or SMS delivery
- webhook to a partner
- shipment request to a warehouse

You may be able to compensate the effect later, but that is different from pretending it never happened.

### Intermediate States Need Explicit Design

Distributed workflows usually need deliberate transitional states such as:
- `PENDING`
- `RESERVATION_CONFIRMED`
- `PAYMENT_PENDING_RECONCILIATION`
- `FAILED_REQUIRES_COMPENSATION`

Without these states, teams often collapse uncertainty into fake certainty and create brittle behavior for users and operators.


# 5. Failure Modes and Ambiguity

The hardest part of distributed transactions is usually not the happy path. It is the ambiguity created by partial failure.

### Timeout Rarely Means What You Want It to Mean

A safer rule is:

```text
timeout = unknown outcome
not
timeout = guaranteed failure
```

If a payment request times out, several realities are possible:
- the provider never received it
- the provider received it and is still processing
- the provider completed it but the response was lost

Blind retries without idempotency can turn uncertainty into duplication.

### Common Failure Modes

```text
┌──────────────────────────────┬──────────────────────────────┬──────────────────────────────────────┐
│ Failure                      │ What the caller knows        │ Typical risk                         │
├──────────────────────────────┼──────────────────────────────┼──────────────────────────────────────┤
│ Service timeout              │ Outcome is unknown           │ Duplicate retry or false failure     │
├──────────────────────────────┼──────────────────────────────┼──────────────────────────────────────┤
│ Crash after local commit     │ Remote state may be durable  │ Lost acknowledgment, stale workflow  │
├──────────────────────────────┼──────────────────────────────┼──────────────────────────────────────┤
│ Broker publish failure       │ DB write may already exist   │ State changed but no event emitted   │
├──────────────────────────────┼──────────────────────────────┼──────────────────────────────────────┤
│ Duplicate delivery           │ Same work may reappear       │ Double charge, double reserve        │
├──────────────────────────────┼──────────────────────────────┼──────────────────────────────────────┤
│ Network partition            │ Reachability is unclear      │ Split-brain assumptions, delay       │
├──────────────────────────────┼──────────────────────────────┼──────────────────────────────────────┤
│ Concurrent retries           │ Multiple attempts overlap    │ Racing compensations or replays      │
└──────────────────────────────┴──────────────────────────────┴──────────────────────────────────────┘
```

### Lost Acknowledgment Is a Classic Trap

Consider this sequence:

```text
Orders Service -> Payment Service: charge(order-123)
Payment Service -> card network: approved
Payment Service commits local record
Payment Service -> Orders Service: response lost
Orders Service times out
```

From the caller's perspective, the result is not "failure." It is "I do not know."

### Independent Clocks Do Not Rescue You

Timestamps help with diagnostics, but they do not eliminate uncertainty:
- clocks can drift
- log ingestion can lag
- cross-system event ordering can differ from wall-clock order

Use timestamps for evidence, not as proof that one participant's view must be the global truth.

### Duplicate Processing Is Normal Enough to Design For

Retries, redelivery, and crash recovery mean duplicate attempts should usually be treated as ordinary operating conditions, not rare edge cases.

In cloud and containerized environments, transient restarts and intermittent network issues are common enough that ambiguity should be expected rather than dismissed.


# 6. Consistency, Availability, and Coordination Trade-Offs

Distributed transactions are difficult because stronger guarantees usually require more coordination, and more coordination usually costs latency, availability, or autonomy.

### Stronger Coordination Has a Price

If you want multiple participants to agree on one commit decision, you usually need:
- extra round trips
- durable prepared state or equivalent
- participants that support the protocol
- recovery logic for uncertain outcomes

That can improve atomicity, but it can also:
- increase tail latency
- block progress during failures
- couple services more tightly
- make multi-team evolution harder

### Eventual Consistency Has a Different Price

If you avoid heavy coordination and allow local commits plus asynchronous follow-up, you often gain:
- better resilience to isolated failures
- looser runtime coupling
- easier independent scaling

But you also accept:
- temporary divergence between services
- more application-level workflow logic
- compensating actions
- stronger idempotency and observability requirements

### Business Consistency Matters More Than Purity

A useful way to think about the trade-off is:

```text
Storage consistency asks:
  did all participants commit the same decision?

Business consistency asks:
  will the user, operator, and downstream systems observe a coherent outcome?
```

Sometimes you do not need one global atomic commit. You need a system that:
- converges correctly
- exposes honest intermediate states
- compensates safely when needed
- supports reconciliation when reality is unclear

### Partitions Force Real Choices

During network partitions or severe reachability problems, systems often face tension between:
- waiting for coordinated certainty
- continuing with partial local progress

That is one reason there is no universal best answer. The acceptable trade-off depends on the business cost of inconsistency versus the business cost of unavailability.

### Irreversible Steps Change the Design

If a workflow contains irreversible or expensive-to-reverse steps, you need extra care around sequencing.

Examples:
- capture funds only after critical preconditions are satisfied
- send shipment requests only after money and inventory states are trustworthy
- treat email or analytics as downstream side effects, not transaction-critical work

Designing the order of operations is often as important as choosing the coordination mechanism.


# 7. Common Solution Families and What They Cost

There is no single universal fix for distributed transactions. Instead, there are several families of approaches, each solving a different slice of the problem.

### Approach 1: Keep the Workflow Local When You Can

If the critical writes fit inside one database or one system with native transaction support, that is often the simplest and safest option.

This can be attractive when:
- the data truly belongs together
- service decomposition would be artificial
- the operational simplicity matters more than team separation

The trade-off is reduced autonomy if multiple domains are forced through one shared persistence boundary.

### Approach 2: Coordinated Commit Protocols

Protocols such as two-phase commit try to make multiple participants agree on a coordinated commit decision.

Three-phase commit is sometimes discussed as a way to reduce some blocking cases under stronger timing assumptions, but it does not remove the underlying distributed failure complexity and is less common in many application-level systems.

This can help when:
- all important participants support the protocol
- the environment can tolerate extra coordination
- the blocking and recovery characteristics are acceptable

Common costs include:
- protocol complexity
- tighter coupling to transaction-capable infrastructure
- operational pain when participants or coordinators fail mid-protocol

Some platforms and data systems provide distributed transactions within one controlled ecosystem. That can work well for that ecosystem, but it usually does not generalize to arbitrary external services or third-party APIs.

### Approach 3: Saga-Style Workflows

Saga-style designs split one business process into local transactions plus compensating actions.

This can help when:
- steps are logically reversible or compensatable
- temporary inconsistency is acceptable
- explicit workflow state is tolerable

The cost is that correctness moves into application design:
- you must define compensations
- you must reason about partial completion
- you must handle retries and duplicates deliberately

### Approach 4: Outbox, Inbox, and Idempotent Messaging

When the core problem is "database state changed but the message publish is uncertain," teams often use:
- transactional outbox on the producer side
- idempotent inbox or deduplication on the consumer side

This improves reliability of state propagation, but it does not eliminate business workflow complexity by itself.

### Approach 5: Reconciliation and Operational Repair

Some ambiguous cases cannot be avoided completely. For those, teams use:
- periodic reconciliation jobs
- dashboards for stuck workflows
- manual repair playbooks
- audit logs keyed by workflow or idempotency key

This is not elegant, but it is often necessary for real systems.

### Comparison at a Glance

```text
┌────────────────────────────┬──────────────────────────────┬──────────────────────────────┬──────────────────────────────┐
│ Approach                   │ Works Best When             │ Main Benefit                 │ Main Cost                    │
├────────────────────────────┼──────────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ Single local transaction   │ One system owns the writes  │ Strong local atomicity       │ Less autonomy                │
├────────────────────────────┼──────────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ Coordinated commit         │ Participants support it     │ One shared commit decision   │ Blocking and coupling        │
├────────────────────────────┼──────────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ Saga with compensation     │ Steps are compensatable     │ Higher resilience            │ More workflow complexity     │
├────────────────────────────┼──────────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ Outbox plus idempotency    │ State must propagate safely │ Reliable async handoff       │ Eventual consistency remains │
├────────────────────────────┼──────────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ Reconciliation             │ Unknown cases still happen  │ Operational recovery path    │ Human or batch overhead      │
└────────────────────────────┴──────────────────────────────┴──────────────────────────────┴──────────────────────────────┘
```

The durable lesson is simple:
- there is no free all-or-nothing guarantee across arbitrary services
- you choose which trade-offs fit the business


# 8. Practical TypeScript Patterns

Good distributed transaction handling often starts with honest workflow state, idempotent remote calls, and a way to reconcile ambiguous outcomes.

### Example 1: Persist Workflow and Step State Explicitly

```sql
CREATE TABLE distributed_workflows (
    workflow_id UUID PRIMARY KEY,
    order_id UUID NOT NULL UNIQUE,
    state VARCHAR(64) NOT NULL,
    last_error TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE workflow_steps (
    workflow_id UUID NOT NULL,
    step_name VARCHAR(64) NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL,
    external_reference VARCHAR(128) NULL,
    last_error TEXT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (workflow_id, step_name)
);

CREATE INDEX idx_workflow_steps_status
ON workflow_steps (status, updated_at);
```

This does not solve the transaction problem by itself. It gives you durable visibility into what the system believes happened.

### Example 2: Treat Remote Steps as Explicitly Idempotent

```typescript
type WorkflowState =
  | "PENDING"
  | "RESERVING_INVENTORY"
  | "CHARGING_PAYMENT"
  | "COMPLETED"
  | "FAILED"
  | "RECONCILIATION_REQUIRED";

type StepName = "reserve_inventory" | "charge_payment";
type StepStatus = "IN_FLIGHT" | "SUCCEEDED" | "FAILED" | "UNKNOWN";

type StepRecord = {
  workflowId: string;
  stepName: StepName;
  idempotencyKey: string;
  status: StepStatus;
  externalReference?: string;
};

interface WorkflowRepository {
  createWorkflow(workflowId: string, orderId: string): Promise<void>;
  updateWorkflowState(workflowId: string, state: WorkflowState, lastError?: string): Promise<void>;
  saveStep(record: StepRecord): Promise<void>;
}

interface InventoryGateway {
  reserve(input: {
    orderId: string;
    sku: string;
    quantity: number;
    idempotencyKey: string;
  }): Promise<{ reservationId: string }>;
}

interface PaymentGateway {
  charge(input: {
    orderId: string;
    customerId: string;
    amountCents: number;
    idempotencyKey: string;
  }): Promise<{ paymentId: string }>;
}

const isAmbiguousFailure = (error: unknown): boolean =>
  error instanceof Error &&
  (error.name === "TimeoutError" ||
    error.name === "ConnectionResetError" ||
    error.message.includes("timed out"));

class CheckoutWorkflowService {
  constructor(
    private readonly workflows: WorkflowRepository,
    private readonly inventory: InventoryGateway,
    private readonly payments: PaymentGateway,
  ) {}

  async placeOrder(input: {
    workflowId: string;
    orderId: string;
    customerId: string;
    sku: string;
    quantity: number;
    amountCents: number;
  }): Promise<void> {
    await this.workflows.createWorkflow(input.workflowId, input.orderId);

    await this.workflows.updateWorkflowState(input.workflowId, "RESERVING_INVENTORY");
    await this.runStep(input.workflowId, "reserve_inventory", async (idempotencyKey) => {
      const result = await this.inventory.reserve({
        orderId: input.orderId,
        sku: input.sku,
        quantity: input.quantity,
        idempotencyKey,
      });

      return result.reservationId;
    });

    await this.workflows.updateWorkflowState(input.workflowId, "CHARGING_PAYMENT");
    await this.runStep(input.workflowId, "charge_payment", async (idempotencyKey) => {
      const result = await this.payments.charge({
        orderId: input.orderId,
        customerId: input.customerId,
        amountCents: input.amountCents,
        idempotencyKey,
      });

      return result.paymentId;
    });

    await this.workflows.updateWorkflowState(input.workflowId, "COMPLETED");
  }

  private async runStep(
    workflowId: string,
    stepName: StepName,
    operation: (idempotencyKey: string) => Promise<string>,
  ): Promise<void> {
    const idempotencyKey = `${workflowId}:${stepName}`;

    await this.workflows.saveStep({
      workflowId,
      stepName,
      idempotencyKey,
      status: "IN_FLIGHT",
    });

    try {
      const externalReference = await operation(idempotencyKey);

      await this.workflows.saveStep({
        workflowId,
        stepName,
        idempotencyKey,
        status: "SUCCEEDED",
        externalReference,
      });
    } catch (error) {
      const status: StepStatus = isAmbiguousFailure(error) ? "UNKNOWN" : "FAILED";

      await this.workflows.saveStep({
        workflowId,
        stepName,
        idempotencyKey,
        status,
      });

      await this.workflows.updateWorkflowState(
        workflowId,
        status === "UNKNOWN" ? "RECONCILIATION_REQUIRED" : "FAILED",
        error instanceof Error ? error.message : "unknown error",
      );

      throw error;
    }
  }
}
```

This pattern does three useful things:
- it creates a stable idempotency key per workflow step
- it records uncertain outcomes as `UNKNOWN` instead of lying
- it leaves a durable trail for reconciliation

### Example 3: Reconcile Unknown Outcomes Instead of Guessing

```typescript
type PaymentLookupResult =
  | { status: "NOT_FOUND" }
  | { status: "SETTLED"; paymentId: string };

interface PaymentLookupGateway {
  findByIdempotencyKey(idempotencyKey: string): Promise<PaymentLookupResult>;
}

interface ReconciliationRepository {
  getUnknownPaymentSteps(limit: number): Promise<Array<Pick<StepRecord, "workflowId" | "idempotencyKey">>>;
  markPaymentSettled(workflowId: string, paymentId: string): Promise<void>;
  markPaymentMissing(workflowId: string): Promise<void>;
}

class PaymentReconciliationWorker {
  constructor(
    private readonly repository: ReconciliationRepository,
    private readonly payments: PaymentLookupGateway,
  ) {}

  async run(limit = 100): Promise<void> {
    const steps = await this.repository.getUnknownPaymentSteps(limit);

    for (const step of steps) {
      const result = await this.payments.findByIdempotencyKey(step.idempotencyKey);

      if (result.status === "SETTLED") {
        await this.repository.markPaymentSettled(step.workflowId, result.paymentId);
        continue;
      }

      await this.repository.markPaymentMissing(step.workflowId);
    }
  }
}
```

This is not glamorous, but it reflects reality. When the network leaves you uncertain, a lookup or reconciliation path is often safer than a blind retry.

### Practical Signals to Track

Useful metrics and dashboards often include:
- count of workflows in `RECONCILIATION_REQUIRED`
- age of oldest in-flight workflow
- duplicate-request rate by idempotency key
- compensation success and failure counts
- outbox lag or broker publish lag

If you cannot see the uncertain cases, you will eventually discover them through customers instead.


# 9. When the Problem Matters and Common Pitfalls

The problem matters most when one business action spans independently committing systems and the business cannot tolerate incoherent outcomes.

### When It Matters Most

This topic becomes central when you have:
- microservices with separate databases
- money movement or inventory reservation
- cross-region or cross-cluster workflows
- asynchronous state propagation through brokers
- third-party APIs that participate in critical flows

### When You May Not Need Heavy Machinery

You may not need distributed transaction mechanisms when:
- the critical writes genuinely fit in one database
- downstream work is best-effort and can safely lag
- the workflow is read-heavy and not correctness-sensitive
- a simpler monolithic boundary is still appropriate

Keeping the transaction local is not a failure of architecture. Sometimes it is the best architecture.

### Repeating Pitfalls

```text
Bad:
├── assuming a remote call is part of the local database transaction
├── treating timeout as definite failure
├── retrying non-idempotent operations blindly
├── exposing `CONFIRMED` to users before critical steps have settled
├── publishing events without a reliable handoff strategy
└── having no reconciliation path for ambiguous workflows

Good:
├── model workflow state explicitly
├── decide which steps are reversible, compensatable, or irreversible
├── use stable idempotency keys for retried remote calls
├── design honest intermediate statuses
├── instrument stuck, failed, and unknown workflows
└── keep the critical transaction local when that is still a valid option
```

### A Practical Mindset

The right mindset is not:

```text
How do I force the whole distributed system to behave like one local database?
```

The better question is:

```text
What level of coordination does this business workflow require,
and what operational machinery will keep it correct under partial failure?
```

That framing leads to better design choices than chasing theoretical purity.


# 10. Summary

**Distributed transaction problems start when one business workflow crosses multiple independent commit boundaries.**
- Local ACID guarantees stop at the resource boundary that owns the commit log and recovery process.
- Sequential application code does not imply global atomicity across remote calls.

**Partial failure creates ambiguity, not just error.**
- Timeouts often mean the outcome is unknown.
- Lost acknowledgments, duplicate delivery, and crash-after-commit scenarios are common enough to design for.

**There is no universal mechanism that solves every case cleanly.**
- Coordinated commit improves atomicity but adds coupling and failure sensitivity.
- Saga-style workflows improve autonomy and resilience but move correctness into application logic.
- Outbox, idempotency, and reconciliation patterns reduce risk without pretending uncertainty does not exist.

**Good systems tell the truth about workflow state.**
- Use explicit statuses for pending, unknown, compensating, and completed states.
- Favor business coherence, observability, and recoverability over hidden optimism.

**Implementation checklist:**

```text
Business design:
  □ Identify which steps truly require all-or-nothing user-visible behavior
  □ Separate critical steps from best-effort side effects
  □ Mark each step as reversible, compensatable, or irreversible

Workflow modeling:
  □ Persist workflow state explicitly
  □ Add honest intermediate statuses such as pending or reconciliation required
  □ Record per-step idempotency keys and external references

Remote call safety:
  □ Treat timeout as unknown until proven otherwise
  □ Make retried remote operations idempotent where possible
  □ Avoid blind retries for payments, reservations, or other scarce operations

Messaging and storage:
  □ Use reliable handoff patterns for database changes and event publication
  □ Preserve enough audit data to replay or reconcile uncertain workflows
  □ Keep critical writes inside one local transaction when that is still feasible

Operations:
  □ Monitor stuck workflows, compensation failures, and reconciliation backlog
  □ Provide manual repair procedures for ambiguous or externally visible failures
  □ Test crash, timeout, duplicate, and out-of-order scenarios before production
```
