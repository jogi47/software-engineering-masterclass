# Saga Pattern

[← Back to Index](README.md)

Imagine you are building a travel booking platform. A customer clicks one button and expects one outcome: either the trip is booked, or the system clearly tells them it failed.

Without an explicit distributed workflow, teams often write a direct sequence of remote calls and hope the whole thing behaves like one database transaction:

```typescript
type TripRequest = {
  tripId: string;
  customerId: string;
  flightId: string;
  hotelId: string;
  carType: string;
};

interface FlightService {
  reserve(input: { tripId: string; flightId: string }): Promise<void>;
}

interface HotelService {
  reserve(input: { tripId: string; hotelId: string }): Promise<void>;
}

interface CarRentalService {
  reserve(input: { tripId: string; carType: string }): Promise<void>;
}

interface TripsRepository {
  createPending(tripId: string, customerId: string): Promise<void>;
  markConfirmed(tripId: string): Promise<void>;
}

class NaiveTripBookingService {
  constructor(
    private readonly trips: TripsRepository,
    private readonly flights: FlightService,
    private readonly hotels: HotelService,
    private readonly cars: CarRentalService,
  ) {}

  async bookTrip(request: TripRequest): Promise<void> {
    await this.trips.createPending(request.tripId, request.customerId);
    await this.flights.reserve({ tripId: request.tripId, flightId: request.flightId });
    await this.hotels.reserve({ tripId: request.tripId, hotelId: request.hotelId });
    await this.cars.reserve({ tripId: request.tripId, carType: request.carType });
    await this.trips.markConfirmed(request.tripId);
  }
}
```

This fails in predictable ways:
- the flight may be reserved even if the hotel call later fails
- the car service may succeed but the caller may time out before seeing the response
- retries may double-reserve scarce inventory unless every step is idempotent
- each service can roll back only its own local state, not the whole business workflow

This is where the **Saga Pattern** comes in. A saga treats one business workflow as a sequence of local transactions plus explicit compensating actions. Instead of pretending distributed work is one ACID transaction, it models progress, failure, retries, and compensation honestly.

In this chapter, you will learn:
  * [Why the Saga Pattern exists](#1-why-the-saga-pattern-exists)
  * [What the Saga Pattern is and is not](#2-what-the-saga-pattern-is)
  * [Which building blocks matter most](#3-core-building-blocks)
  * [How a saga executes step by step](#4-how-a-saga-executes-step-by-step)
  * [How choreography and orchestration differ](#5-choreography-vs-orchestration)
  * [Why compensation, idempotency, and state modeling matter](#6-compensation-idempotency-and-state-modeling)
  * [How messaging, storage, and observability support sagas](#7-messaging-storage-and-observability)
  * [What practical TypeScript implementations look like](#8-practical-typescript-patterns)
  * [When to use sagas and which pitfalls repeat](#9-when-to-use-it-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why the Saga Pattern Exists

The Saga Pattern exists because many business workflows cross multiple service and data boundaries, but users still expect one coherent business outcome.

### Local ACID Stops at the Service Boundary

Within one database transaction, the engine can usually:
- decide commit or rollback centrally
- recover from crashes using its own log
- hide partial writes until commit

Across multiple services, no single database owns the whole workflow:

```text
Customer books trip
        |
        v
┌────────────────┐
│ Trips Service  │
└──────┬─────────┘
       │
       ├──────────────▶ Flights Service ─────▶ Flights DB
       ├──────────────▶ Hotels Service ──────▶ Hotels DB
       └──────────────▶ Cars Service ────────▶ Cars DB
```

Each service commits locally. That autonomy is useful, but it removes the convenience of one shared rollback boundary.

### Long-Running Business Workflows Rarely Fit Atomic Commit Protocols

Some workflows include:
- separate teams and separate databases
- message brokers instead of only synchronous calls
- third-party providers such as payment or shipping gateways
- steps that may take seconds, minutes, or longer

That makes classic atomic commit protocols a weak fit in many application workflows:
- participants may not support a real prepare phase
- holding locks across long business workflows is usually unsafe
- some side effects are reversible only through business correction, not true rollback

### The Business Still Needs a Truthful Outcome

The user does not care that three services and one queue were involved. The user cares whether the trip is booked, failed, or being unwound.

Sagas help because they let you model:
- forward progress
- explicit failure handling
- compensating actions
- eventual consistency with honest intermediate states

### The Core Design Shift

The key shift is:

```text
Do not force distributed work to look like one local transaction.
Model it as a workflow with explicit success and failure paths.
```

That is the durable reason sagas matter.


# 2. What the Saga Pattern Is

The Saga Pattern is a way to coordinate one business workflow across multiple independently committing participants by chaining local transactions and compensating actions.

### A Conservative Definition

The durable idea is:

```text
Saga =
  one business workflow
  + multiple local transactions
  + a defined execution order
  + compensating actions for completed steps
  + eventual consistency instead of one global ACID commit
```

### Local Transactions Come First

Each step in a saga is typically a normal local transaction inside one service:
- reserve inventory
- authorize payment
- create shipment
- update order status

That local step either commits or fails within that service's own boundary.

### Compensation Handles Failure After Prior Success

If a later step fails, earlier successful steps may need compensating actions:
- reserved inventory becomes released inventory
- authorized payment becomes refunded or voided payment
- created shipment becomes cancellation requested

Compensation is not identical to rollback. It is a new business action that attempts to restore a coherent business state.

### A Saga Is Usually Eventually Consistent

During a running saga, the system may pass through honest intermediate states:
- `PENDING_RESERVATION`
- `PAYMENT_AUTHORIZED`
- `COMPENSATING`
- `FAILED`

That temporary inconsistency is not a bug by itself. It is part of the design trade-off.

### What a Saga Is Not

A saga is usually not:
- a distributed ACID transaction
- proof that no user will ever see an intermediate state
- a substitute for idempotency, retries, and observability
- a guarantee that every compensation is trivial or lossless

### Saga vs Coordinated Atomic Commit

```text
┌──────────────────────────────┬────────────────────────────────────────────┐
│ Approach                     │ Main idea                                  │
├──────────────────────────────┼────────────────────────────────────────────┤
│ 2PC / atomic commit          │ all participants prepare, then one final   │
│                              │ commit or abort decision                   │
├──────────────────────────────┼────────────────────────────────────────────┤
│ Saga                         │ each participant commits locally, and the  │
│                              │ workflow compensates if later steps fail   │
└──────────────────────────────┴────────────────────────────────────────────┘
```

Sagas trade strict atomicity for better fit with autonomous services, asynchronous messaging, and long-running business flows.


# 3. Core Building Blocks

Healthy saga designs rely on a small number of recurring building blocks.

### 1. Saga Instance

A saga instance is one concrete workflow execution:

```text
saga-9132
  business process: trip booking
  current status: RUNNING
  next step: reserve-car
```

It usually has:
- a stable saga ID
- a business entity reference such as `tripId` or `orderId`
- an overall status
- timestamps for start, last update, timeout, and completion

### 2. Step Definition

Each step should define:
- the forward action
- the compensation action
- the trigger for the next step
- the failure policy

Example steps for travel booking:
- reserve flight
- reserve hotel
- reserve car
- confirm itinerary

### 3. Forward Action

The forward action applies the intended business change in one participant:

```text
reserve hotel room
```

It should usually be:
- local to one service boundary
- idempotent under retry where possible
- durable enough to survive process restarts

### 4. Compensation Action

The compensation action attempts to reverse or neutralize the business effect:

```text
cancel hotel reservation
```

It should usually be:
- safe to retry
- explicit and observable
- designed for partial failure, not assumed to always succeed instantly

### 5. Trigger or Handoff

After a step succeeds, something must cause the next step:
- the orchestrator sends a command
- a service emits an event
- a relay publishes an outbox record

That handoff must be reliable enough that progress is not silently lost.

### 6. Workflow State Store

You usually need durable records for:
- current saga status
- per-step status
- external reference IDs
- retry counts
- failure reason and timestamps

Without durable workflow state, recovery becomes guesswork.

### 7. Timeout, Retry, and Reconciliation Logic

In distributed systems, not every failure is clear. A timeout may mean:
- the step definitely failed
- the step succeeded but the acknowledgment was lost
- the downstream system is slow and still working

That is why mature saga designs include:
- bounded retries
- idempotency keys
- reconciliation for unknown outcomes


# 4. How a Saga Executes Step by Step

A saga has one forward path and one compensation path.

### Happy Path

Consider a trip-booking saga:

```text
┌───────────────┐
│ Start saga    │
│ trip = PENDING│
└──────┬────────┘
       v
┌───────────────┐
│ Reserve flight│
└──────┬────────┘
       v
┌───────────────┐
│ Reserve hotel │
└──────┬────────┘
       v
┌───────────────┐
│ Reserve car   │
└──────┬────────┘
       v
┌───────────────┐
│ Confirm trip  │
└──────┬────────┘
       v
┌───────────────┐
│ COMPLETED     │
└───────────────┘
```

Each step commits locally before the workflow moves forward.

### Failure Path

Now assume car reservation fails after flight and hotel already succeeded:

```text
reserve flight   -> success
reserve hotel    -> success
reserve car      -> failure
        |
        v
cancel hotel     -> success
cancel flight    -> success
        |
        v
trip status      -> FAILED or COMPENSATED
```

A more explicit view:

```text
┌───────────────┐
│ Reserve flight│
└──────┬────────┘
       v
┌───────────────┐
│ Reserve hotel │
└──────┬────────┘
       v
┌───────────────┐
│ Reserve car   │
│ fails         │
└──────┬────────┘
       v
┌───────────────┐
│ Compensate    │
│ hotel         │
└──────┬────────┘
       v
┌───────────────┐
│ Compensate    │
│ flight        │
└──────┬────────┘
       v
┌───────────────┐
│ COMPENSATED   │
└───────────────┘
```

### Compensation Usually Runs in Reverse Order

Reverse order is common because later steps may depend on earlier ones:
- shipment creation may depend on payment success
- payment capture may depend on inventory being reserved
- a hotel reservation may depend on the trip still being active

Undoing the most recent successful step first is often the safest default.

### Unknown Outcomes Need Special Handling

If `reserve car` times out, you may not know whether it failed or succeeded.

That means the saga may need a temporary state such as:
- `WAITING_FOR_CONFIRMATION`
- `RECONCILIATION_REQUIRED`
- `MANUAL_REVIEW`

Blind compensation after an unknown outcome can create its own inconsistencies.

### Honest State Timeline

```text
STARTED
  |
  v
RUNNING
  |
  +--> COMPLETED
  |
  +--> COMPENSATING --> COMPENSATED
  |
  +--> RECONCILIATION_REQUIRED
  |
  +--> MANUAL_REVIEW
```


# 5. Choreography vs Orchestration

Most saga implementations use one of two coordination styles.

### Choreography

In choreography, services react to events and decide locally what to do next.

```text
Order Service publishes order.created
        |
        v
Inventory Service reserves stock and publishes inventory.reserved
        |
        v
Payment Service authorizes payment and publishes payment.authorized
        |
        v
Shipping Service creates shipment
```

### Why Teams Like It

Choreography can work well when:
- the workflow is short
- the event chain is easy to understand
- teams want loose coupling between services

### Where It Gets Hard

It becomes harder when:
- many services react to many events
- nobody has one clear view of workflow progress
- debugging requires reconstructing a chain across logs and topics

### Orchestration

In orchestration, one workflow component explicitly decides the next step.

```text
┌──────────────────┐
│ Saga Orchestrator│
└───┬──────┬───────┘
    │      │
    │      ├──────────────▶ Flight Service
    │      ├──────────────▶ Hotel Service
    │      └──────────────▶ Car Service
    │
    └──────── tracks state, retries, compensation, timeout
```

### Why Teams Like It

Orchestration can help when:
- the workflow is business-critical
- compensation logic is non-trivial
- one place should show current workflow status

### Where It Gets Hard

It adds:
- a coordination component to operate
- tighter coupling to workflow definitions
- risk of a central bottleneck if implemented poorly

### Comparison

```text
┌──────────────────────┬────────────────────────────────────┬────────────────────────────────────┐
│ Dimension            │ Choreography                      │ Orchestration                      │
├──────────────────────┼────────────────────────────────────┼────────────────────────────────────┤
│ Control flow         │ emerges from events               │ explicit in one coordinator        │
├──────────────────────┼────────────────────────────────────┼────────────────────────────────────┤
│ Coupling style       │ looser at the call level          │ clearer workflow ownership         │
├──────────────────────┼────────────────────────────────────┼────────────────────────────────────┤
│ Visibility           │ often distributed across services │ usually centralized per saga       │
├──────────────────────┼────────────────────────────────────┼────────────────────────────────────┤
│ Change management    │ can become harder as flows grow   │ often easier for complex flows     │
├──────────────────────┼────────────────────────────────────┼────────────────────────────────────┤
│ Good fit             │ simple event chains               │ critical multi-step workflows      │
└──────────────────────┴────────────────────────────────────┴────────────────────────────────────┘
```

### A Practical Choice

Use choreography when the flow is simple and event boundaries are already clean.

Use orchestration when:
- the workflow has several business-critical branches
- compensation rules are complex
- you need one place to answer "what is this workflow doing right now?"

Many production systems mix both:
- orchestration for the critical path
- event fan-out for secondary side effects such as email or analytics


# 6. Compensation, Idempotency, and State Modeling

Most saga failures are not caused by the happy path. They are caused by weak compensation design and sloppy handling of retries and unknown outcomes.

### Compensation Is Business Correction, Not Time Travel

Some actions can be reversed cleanly:
- reserve inventory -> release inventory
- place hold on funds -> release hold

Some actions are only approximately reversible:
- capture payment -> refund payment
- send confirmation email -> send cancellation email
- request shipment -> request shipment cancellation

That means compensation must be designed around business meaning, not imagined rollback semantics.

### Idempotency Is Usually Mandatory

At-least-once delivery and retries are common. Forward actions and compensation handlers should usually tolerate duplicate requests.

Useful patterns:
- stable idempotency key per saga step
- deduplication table keyed by external request ID
- check-before-create or check-before-compensate lookup

### Example: Idempotent Compensation Handler

```typescript
type PaymentRecord = {
  paymentId: string;
  sagaId: string;
  status: "AUTHORIZED" | "CAPTURED" | "VOIDED" | "REFUNDED";
  idempotencyKey: string;
};

interface PaymentsRepository {
  findBySagaId(sagaId: string): Promise<PaymentRecord | null>;
  markVoided(paymentId: string): Promise<void>;
}

interface PaymentGateway {
  voidAuthorization(paymentId: string, idempotencyKey: string): Promise<void>;
}

class PaymentCompensationService {
  constructor(
    private readonly repository: PaymentsRepository,
    private readonly gateway: PaymentGateway,
  ) {}

  async compensateAuthorization(sagaId: string): Promise<void> {
    const payment = await this.repository.findBySagaId(sagaId);

    if (!payment) {
      return;
    }

    if (payment.status === "VOIDED" || payment.status === "REFUNDED") {
      return;
    }

    await this.gateway.voidAuthorization(
      payment.paymentId,
      `saga:${sagaId}:payment:void`,
    );

    await this.repository.markVoided(payment.paymentId);
  }
}
```

This handler is safer because it:
- checks existing state first
- uses a stable idempotency key
- treats repeated compensation as a normal condition

### Model States Honestly

Avoid pretending a workflow is either only `SUCCESS` or `FAILURE`.

Useful statuses often include:
- `PENDING`
- `RUNNING`
- `COMPLETED`
- `COMPENSATING`
- `COMPENSATED`
- `RECONCILIATION_REQUIRED`
- `MANUAL_REVIEW`

### Good and Bad State Design

```text
Bad:
├── marking order CONFIRMED before payment is truly settled
├── collapsing timeout and definite failure into one status
├── hiding compensation progress from operators
└── assuming compensation always completes immediately

Good:
├── persist step-by-step progress
├── distinguish failure from unknown outcome
├── expose compensation and reconciliation states explicitly
└── keep state transitions small, explicit, and observable
```


# 7. Messaging, Storage, and Observability

A saga is not just business logic. It is also a durability, messaging, and operations problem.

### Reliable Handoff Matters

One common failure mode is:

```text
Bad:
  write business row
  commit database transaction
  try to publish event

Risk:
  database commit succeeds
  publish fails
  next saga step never starts
```

That is why many systems use a transactional outbox.

### Transactional Outbox Flow

```text
┌─────────────────────────┐
│ Local DB transaction    │
├─────────────────────────┤
│ 1. write business state │
│ 2. write saga state     │
│ 3. write outbox record  │
└───────────┬─────────────┘
            v
     relay publishes message
            v
      broker / next consumer
```

The outbox does not make messaging exactly-once. It does make the handoff between local state and later publication much more reliable.

### Example Schema

```sql
CREATE TABLE saga_instances (
    saga_id UUID PRIMARY KEY,
    saga_type VARCHAR(100) NOT NULL,
    business_id VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    current_step VARCHAR(100),
    failure_reason TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_saga_instances_status
    ON saga_instances(status, updated_at);

CREATE TABLE saga_steps (
    saga_id UUID NOT NULL REFERENCES saga_instances(saga_id),
    step_name VARCHAR(100) NOT NULL,
    direction VARCHAR(20) NOT NULL,
    status VARCHAR(50) NOT NULL,
    idempotency_key VARCHAR(200) NOT NULL,
    external_ref VARCHAR(200),
    attempt_count INT NOT NULL DEFAULT 0,
    last_error TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (saga_id, step_name, direction)
);

CREATE TABLE outbox_events (
    event_id UUID PRIMARY KEY,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outbox_events_unpublished
    ON outbox_events(published_at, created_at);
```

### Delivery and Ordering Expectations

Conservative assumptions are safer than optimistic ones:
- messages may be delivered more than once
- messages may be delayed
- global ordering is often unrealistic
- per-aggregate or per-saga ordering may be enough

Design accordingly:
- deduplicate by saga ID plus step name
- tolerate duplicate command or event delivery
- avoid assuming one broker gives perfect total order across all business entities

### Observability Signals

Useful signals often include:
- count of sagas in `RUNNING`, `COMPENSATING`, and `MANUAL_REVIEW`
- age of oldest in-flight saga
- step retry count by participant
- compensation success rate
- outbox lag and unpublished event backlog

Useful identifiers to propagate:
- saga ID
- business entity ID such as `orderId`
- correlation ID or trace ID
- participant request idempotency key

### Real-World Tooling View

Teams often implement sagas using:
- application code plus a relational database and message broker
- workflow engines that persist state transitions explicitly
- managed state-machine or orchestration services

The core design questions stay the same regardless of tooling:
- where is the durable workflow state
- how are retries and compensation driven
- how are unknown outcomes reconciled


# 8. Practical TypeScript Patterns

The TypeScript examples below show a pragmatic orchestrated saga. The same ideas also apply to choreography, but orchestration makes the control flow easier to see in one chapter.

### A Minimal Orchestrated Saga

```typescript
type StepExecutionStatus = "SUCCEEDED" | "FAILED" | "UNKNOWN";
type SagaStatus =
  | "RUNNING"
  | "COMPLETED"
  | "COMPENSATING"
  | "COMPENSATED"
  | "RECONCILIATION_REQUIRED";

type TripContext = {
  sagaId: string;
  tripId: string;
  customerId: string;
  flightId: string;
  hotelId: string;
  carType: string;
};

type StepResult = {
  status: StepExecutionStatus;
  externalRef?: string;
  reason?: string;
};

interface SagaStep {
  readonly name: string;
  execute(context: TripContext, idempotencyKey: string): Promise<StepResult>;
  compensate(context: TripContext, idempotencyKey: string): Promise<StepResult>;
}

interface SagaRepository {
  markStepSucceeded(sagaId: string, stepName: string, externalRef?: string): Promise<void>;
  markStepFailed(sagaId: string, stepName: string, reason: string): Promise<void>;
  markSagaStatus(sagaId: string, status: SagaStatus, reason?: string): Promise<void>;
}

class SagaOrchestrator {
  constructor(
    private readonly repository: SagaRepository,
    private readonly steps: readonly SagaStep[],
  ) {}

  async run(context: TripContext): Promise<void> {
    const completedSteps: SagaStep[] = [];

    for (const step of this.steps) {
      const result = await step.execute(
        context,
        `${context.sagaId}:${step.name}:forward`,
      );

      if (result.status === "SUCCEEDED") {
        completedSteps.push(step);
        await this.repository.markStepSucceeded(context.sagaId, step.name, result.externalRef);
        continue;
      }

      if (result.status === "UNKNOWN") {
        await this.repository.markSagaStatus(
          context.sagaId,
          "RECONCILIATION_REQUIRED",
          result.reason ?? `Unknown outcome for ${step.name}`,
        );
        return;
      }

      await this.repository.markStepFailed(
        context.sagaId,
        step.name,
        result.reason ?? "Step failed",
      );

      await this.compensate(context, completedSteps.reverse());
      return;
    }

    await this.repository.markSagaStatus(context.sagaId, "COMPLETED");
  }

  private async compensate(context: TripContext, stepsToCompensate: readonly SagaStep[]): Promise<void> {
    await this.repository.markSagaStatus(context.sagaId, "COMPENSATING");

    for (const step of stepsToCompensate) {
      const result = await step.compensate(
        context,
        `${context.sagaId}:${step.name}:compensate`,
      );

      if (result.status === "SUCCEEDED") {
        continue;
      }

      await this.repository.markSagaStatus(
        context.sagaId,
        "RECONCILIATION_REQUIRED",
        result.reason ?? `Compensation failed for ${step.name}`,
      );
      return;
    }

    await this.repository.markSagaStatus(context.sagaId, "COMPENSATED");
  }
}
```

This example is intentionally conservative:
- unknown outcomes move to reconciliation instead of guessing
- compensation runs in reverse order
- every request carries a stable idempotency key

### Step Implementations Stay Local

Each participant-facing step can stay small and local:

```typescript
interface FlightReservationsClient {
  reserve(input: {
    tripId: string;
    flightId: string;
    idempotencyKey: string;
  }): Promise<{ reservationId: string }>;
  cancel(input: {
    tripId: string;
    idempotencyKey: string;
  }): Promise<void>;
}

class ReserveFlightStep implements SagaStep {
  readonly name = "reserve-flight";

  constructor(private readonly flights: FlightReservationsClient) {}

  async execute(context: TripContext, idempotencyKey: string): Promise<StepResult> {
    try {
      const response = await this.flights.reserve({
        tripId: context.tripId,
        flightId: context.flightId,
        idempotencyKey,
      });

      return {
        status: "SUCCEEDED",
        externalRef: response.reservationId,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown flight reservation error";
      return { status: "FAILED", reason };
    }
  }

  async compensate(context: TripContext, idempotencyKey: string): Promise<StepResult> {
    try {
      await this.flights.cancel({
        tripId: context.tripId,
        idempotencyKey,
      });

      return { status: "SUCCEEDED" };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown flight cancellation error";
      return { status: "UNKNOWN", reason };
    }
  }
}
```

The step does not try to coordinate the whole workflow. It focuses on one participant boundary.

### Start the Saga and Publish Reliably

Starting a saga should usually persist business state and workflow state together:

```typescript
type OutboxEvent = {
  eventId: string;
  aggregateType: "trip";
  aggregateId: string;
  eventType: "trip.booking.requested";
  payload: string;
};

interface TransactionManager {
  runInTransaction<T>(work: () => Promise<T>): Promise<T>;
}

interface TripRepository {
  createPendingTrip(input: {
    tripId: string;
    customerId: string;
  }): Promise<void>;
}

interface SagaInstanceRepository {
  createSaga(input: {
    sagaId: string;
    sagaType: string;
    businessId: string;
    status: SagaStatus;
  }): Promise<void>;
}

interface OutboxRepository {
  append(event: OutboxEvent): Promise<void>;
}

class TripBookingStarter {
  constructor(
    private readonly tx: TransactionManager,
    private readonly trips: TripRepository,
    private readonly sagas: SagaInstanceRepository,
    private readonly outbox: OutboxRepository,
  ) {}

  async start(tripId: string, customerId: string): Promise<string> {
    const sagaId = crypto.randomUUID();

    await this.tx.runInTransaction(async () => {
      await this.trips.createPendingTrip({ tripId, customerId });
      await this.sagas.createSaga({
        sagaId,
        sagaType: "trip-booking",
        businessId: tripId,
        status: "RUNNING",
      });

      await this.outbox.append({
        eventId: crypto.randomUUID(),
        aggregateType: "trip",
        aggregateId: tripId,
        eventType: "trip.booking.requested",
        payload: JSON.stringify({ sagaId, tripId, customerId }),
      });
    });

    return sagaId;
  }
}
```

This pattern reduces the risk of:
- creating the trip row without starting the saga
- starting the saga without a durable business record

### Reconcile Unknown Outcomes Explicitly

Some failures are not safe to auto-resolve. Reconciliation code should inspect downstream truth rather than guessing.

```typescript
type ReservationLookup =
  | { status: "FOUND"; reservationId: string }
  | { status: "NOT_FOUND" }
  | { status: "UNKNOWN" };

interface CarRentalLookupClient {
  findReservationByIdempotencyKey(idempotencyKey: string): Promise<ReservationLookup>;
}

interface ReconciliationRepository {
  listPendingCarChecks(limit: number): Promise<Array<{ sagaId: string; tripId: string }>>;
  markCarReserved(sagaId: string, reservationId: string): Promise<void>;
  markManualReview(sagaId: string, reason: string): Promise<void>;
}

class CarReservationReconciliationWorker {
  constructor(
    private readonly cars: CarRentalLookupClient,
    private readonly repository: ReconciliationRepository,
  ) {}

  async run(limit = 100): Promise<void> {
    const items = await this.repository.listPendingCarChecks(limit);

    for (const item of items) {
      const key = `${item.sagaId}:reserve-car:forward`;
      const result = await this.cars.findReservationByIdempotencyKey(key);

      if (result.status === "FOUND") {
        await this.repository.markCarReserved(item.sagaId, result.reservationId);
        continue;
      }

      if (result.status === "NOT_FOUND") {
        await this.repository.markManualReview(
          item.sagaId,
          "Car reservation missing after unknown outcome",
        );
        continue;
      }

      await this.repository.markManualReview(
        item.sagaId,
        "Car reservation lookup still inconclusive",
      );
    }
  }
}
```

This is often more honest than retrying a scarce reservation blindly.


# 9. When to Use It and Common Pitfalls

Sagas are powerful, but they are not the right answer for every distributed write path.

### Good Fit

Sagas are usually a reasonable fit when:
- one business workflow spans multiple autonomous services
- steps can commit locally and be compensated later if needed
- the workflow may be long-running relative to a database transaction
- user-visible correctness matters more than pretending the system is globally atomic
- external systems or asynchronous messaging are part of the flow

Examples:
- travel booking
- e-commerce checkout with inventory and payment coordination
- subscription provisioning across billing, identity, and entitlements
- refund or return workflows across payments, warehouse, and customer support systems

### Weak Fit

Sagas are usually a weak fit when:
- all critical writes can live inside one local transaction
- compensation is impossible or unacceptable
- the workflow requires strict atomic commit across participants that truly support prepare/commit
- the system has no operational capacity to monitor and repair stuck workflows

Keeping the whole write path inside one service boundary is often simpler and safer when it is still feasible.

### Repeating Pitfalls

```text
Bad:
├── assuming compensation is the same thing as rollback
├── publishing events without a reliable outbox or equivalent handoff
├── retrying non-idempotent steps blindly
├── hiding RUNNING or COMPENSATING states from users and operators
├── compensating immediately after an unknown timeout outcome
├── letting choreography sprawl without ownership or visibility
└── choosing sagas when one local transaction would have solved the problem

Good:
├── keep each step local, small, and explicit
├── define compensation before shipping the forward step
├── use stable idempotency keys for every forward and compensation request
├── store workflow and step status durably
├── add reconciliation for uncertain outcomes
├── monitor stuck and compensating sagas
└── prefer simpler boundaries when the business allows them
```

### A Conservative Real-World View

Sagas are common in microservice systems because they fit reality better than pretending every service boundary can participate in one shared database transaction.

They still cost real engineering effort:
- state modeling
- messaging discipline
- idempotency
- observability
- repair tooling

That is why workflow engines, orchestration services, or durable state-machine platforms are sometimes adopted for more complex sagas. The tool can help, but it does not remove the need for correct compensation and honest workflow states.


# 10. Summary

**The Saga Pattern coordinates one business workflow through local transactions plus compensation.**
- It accepts that services commit independently.
- It restores business coherence through explicit workflow logic rather than one global rollback boundary.

**Its main strength is practical coordination across autonomous services.**
- It fits long-running workflows, asynchronous messaging, and external dependencies better than forcing strict atomic commit everywhere.
- It gives you a truthful model for progress, failure, and recovery.

**Its main cost is application-level correctness work.**
- You must design compensations, idempotency, retries, and reconciliation carefully.
- You must persist workflow state and monitor in-flight and stuck sagas explicitly.

**A saga is not a shortcut around distributed systems complexity.**
- It is a disciplined way to model that complexity.
- When one local transaction is still possible, that simpler design is often better.

**Implementation checklist:**

```text
Workflow design:
  □ Confirm the workflow truly spans multiple independent commit boundaries
  □ Decide whether orchestration or choreography owns the control flow
  □ Define forward and compensation actions for every business-critical step

State modeling:
  □ Persist a durable saga instance with explicit statuses
  □ Persist per-step status, idempotency keys, retry counts, and external references
  □ Distinguish definite failure from unknown outcome and manual-review states

Messaging and storage:
  □ Use a reliable handoff pattern such as a transactional outbox when starting or advancing steps
  □ Assume at-least-once delivery and make handlers safe under duplicate messages
  □ Keep ordering assumptions narrow, usually per saga or per business entity

Execution safety:
  □ Make forward actions idempotent where possible
  □ Make compensation actions idempotent and observable
  □ Run compensation in a well-defined order, usually reverse order of completed steps

Operations:
  □ Monitor running, compensating, and reconciliation-required sagas
  □ Add timeout, retry, and replay policies deliberately rather than implicitly
  □ Build reconciliation and manual repair paths for ambiguous outcomes before production
```
