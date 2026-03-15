/**
 * DOMAIN EVENT
 *
 * A record of something significant that happened in the domain.
 * Domain Events capture the fact that something occurred and carry
 * information about that occurrence.
 *
 * Characteristics:
 * - Immutable (represents something that happened in the past)
 * - Named in past tense (OrderPlaced, PaymentReceived, UserRegistered)
 * - Contains all information needed to understand what happened
 * - Timestamped (when did it happen?)
 * - Has identity (event ID for idempotency)
 *
 * When to use:
 * - Decoupling between aggregates
 * - Eventual consistency between bounded contexts
 * - Audit trails and event sourcing
 * - Triggering side effects (notifications, integrations)
 * - CQRS (Command Query Responsibility Segregation)
 *
 * Benefits:
 * - Loose coupling between domain components
 * - Enables eventual consistency
 * - Natural audit log
 * - Supports event sourcing
 * - Makes implicit domain concepts explicit
 */

// Base Domain Event
interface DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly eventType: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
}

// Domain Event implementations
class OrderPlaced implements DomainEvent {
  readonly eventType = "OrderPlaced";
  readonly aggregateType = "Order";
  readonly occurredAt: Date;
  readonly eventId: string;

  constructor(
    readonly aggregateId: string,
    readonly customerId: string,
    readonly totalAmount: number,
    readonly itemCount: number,
    readonly shippingAddress: string
  ) {
    this.eventId = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.occurredAt = new Date();
  }
}

class OrderConfirmed implements DomainEvent {
  readonly eventType = "OrderConfirmed";
  readonly aggregateType = "Order";
  readonly occurredAt: Date;
  readonly eventId: string;

  constructor(
    readonly aggregateId: string,
    readonly confirmedBy: string
  ) {
    this.eventId = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.occurredAt = new Date();
  }
}

class OrderShipped implements DomainEvent {
  readonly eventType = "OrderShipped";
  readonly aggregateType = "Order";
  readonly occurredAt: Date;
  readonly eventId: string;

  constructor(
    readonly aggregateId: string,
    readonly trackingNumber: string,
    readonly carrier: string,
    readonly estimatedDelivery: Date
  ) {
    this.eventId = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.occurredAt = new Date();
  }
}

class PaymentReceived implements DomainEvent {
  readonly eventType = "PaymentReceived";
  readonly aggregateType = "Payment";
  readonly occurredAt: Date;
  readonly eventId: string;

  constructor(
    readonly aggregateId: string, // paymentId
    readonly orderId: string,
    readonly amount: number,
    readonly paymentMethod: string
  ) {
    this.eventId = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.occurredAt = new Date();
  }
}

class UserRegistered implements DomainEvent {
  readonly eventType = "UserRegistered";
  readonly aggregateType = "User";
  readonly occurredAt: Date;
  readonly eventId: string;

  constructor(
    readonly aggregateId: string, // userId
    readonly email: string,
    readonly name: string
  ) {
    this.eventId = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.occurredAt = new Date();
  }
}

// Event Handler interface
interface EventHandler<T extends DomainEvent> {
  handle(event: T): void;
}

// Simple Event Dispatcher (in-memory)
class DomainEventDispatcher {
  private handlers = new Map<string, EventHandler<DomainEvent>[]>();

  register<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventType) || [];
    existing.push(handler as EventHandler<DomainEvent>);
    this.handlers.set(eventType, existing);
  }

  dispatch(event: DomainEvent): void {
    console.log(`\n[Dispatcher] Publishing: ${event.eventType} (${event.eventId})`);

    const handlers = this.handlers.get(event.eventType) || [];
    for (const handler of handlers) {
      try {
        handler.handle(event);
      } catch (error) {
        console.error(`Handler failed for ${event.eventType}:`, error);
      }
    }
  }

  dispatchAll(events: DomainEvent[]): void {
    for (const event of events) {
      this.dispatch(event);
    }
  }
}

// Aggregate that raises Domain Events
class Order {
  private _events: DomainEvent[] = [];
  private _status: "draft" | "placed" | "confirmed" | "shipped" = "draft";
  private _items: { productId: string; quantity: number; price: number }[] = [];
  private _shippingAddress: string = "";

  constructor(
    private readonly _orderId: string,
    private readonly _customerId: string
  ) {}

  get orderId(): string {
    return this._orderId;
  }

  get status(): string {
    return this._status;
  }

  // Get and clear uncommitted events
  pullDomainEvents(): DomainEvent[] {
    const events = [...this._events];
    this._events = [];
    return events;
  }

  addItem(productId: string, quantity: number, price: number): void {
    this._items.push({ productId, quantity, price });
  }

  setShippingAddress(address: string): void {
    this._shippingAddress = address;
  }

  place(): void {
    if (this._items.length === 0) throw new Error("Cannot place empty order");
    if (!this._shippingAddress) throw new Error("Shipping address required");

    this._status = "placed";

    // Raise domain event
    const total = this._items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    this._events.push(
      new OrderPlaced(this._orderId, this._customerId, total, this._items.length, this._shippingAddress)
    );
  }

  confirm(confirmedBy: string): void {
    if (this._status !== "placed") throw new Error("Order must be placed first");

    this._status = "confirmed";

    // Raise domain event
    this._events.push(new OrderConfirmed(this._orderId, confirmedBy));
  }

  ship(trackingNumber: string, carrier: string, estimatedDays: number): void {
    if (this._status !== "confirmed") throw new Error("Order must be confirmed first");

    this._status = "shipped";

    // Raise domain event
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + estimatedDays);
    this._events.push(new OrderShipped(this._orderId, trackingNumber, carrier, estimatedDelivery));
  }
}

// Event Handlers (Side Effects)
class SendOrderConfirmationEmail implements EventHandler<OrderPlaced> {
  handle(event: OrderPlaced): void {
    console.log(`  📧 [Email] Sending order confirmation to customer ${event.customerId}`);
    console.log(`     Order: ${event.aggregateId}, Total: $${event.totalAmount.toFixed(2)}`);
  }
}

class UpdateInventory implements EventHandler<OrderPlaced> {
  handle(event: OrderPlaced): void {
    console.log(`  📦 [Inventory] Reserving items for order ${event.aggregateId}`);
    console.log(`     Items to reserve: ${event.itemCount}`);
  }
}

class NotifyWarehouse implements EventHandler<OrderConfirmed> {
  handle(event: OrderConfirmed): void {
    console.log(`  🏭 [Warehouse] Preparing order ${event.aggregateId} for fulfillment`);
    console.log(`     Confirmed by: ${event.confirmedBy}`);
  }
}

class SendShippingNotification implements EventHandler<OrderShipped> {
  handle(event: OrderShipped): void {
    console.log(`  🚚 [Notification] Sending shipping notification`);
    console.log(`     Tracking: ${event.trackingNumber} via ${event.carrier}`);
    console.log(`     Estimated delivery: ${event.estimatedDelivery.toDateString()}`);
  }
}

class UpdateOrderTracking implements EventHandler<OrderShipped> {
  handle(event: OrderShipped): void {
    console.log(`  📍 [Tracking] Recording shipment details`);
    console.log(`     Order: ${event.aggregateId}, Carrier: ${event.carrier}`);
  }
}

class SendWelcomeEmail implements EventHandler<UserRegistered> {
  handle(event: UserRegistered): void {
    console.log(`  📧 [Email] Sending welcome email to ${event.email}`);
    console.log(`     Welcome, ${event.name}!`);
  }
}

class CreateUserProfile implements EventHandler<UserRegistered> {
  handle(event: UserRegistered): void {
    console.log(`  👤 [Profile] Creating profile for user ${event.aggregateId}`);
  }
}

// Usage
console.log("=== Domain Event Pattern ===\n");

// Set up event dispatcher with handlers
const dispatcher = new DomainEventDispatcher();

// Register handlers for OrderPlaced
dispatcher.register<OrderPlaced>("OrderPlaced", new SendOrderConfirmationEmail());
dispatcher.register<OrderPlaced>("OrderPlaced", new UpdateInventory());

// Register handlers for OrderConfirmed
dispatcher.register<OrderConfirmed>("OrderConfirmed", new NotifyWarehouse());

// Register handlers for OrderShipped
dispatcher.register<OrderShipped>("OrderShipped", new SendShippingNotification());
dispatcher.register<OrderShipped>("OrderShipped", new UpdateOrderTracking());

// Register handlers for UserRegistered
dispatcher.register<UserRegistered>("UserRegistered", new SendWelcomeEmail());
dispatcher.register<UserRegistered>("UserRegistered", new CreateUserProfile());

// Simulate order lifecycle
console.log("--- Order Lifecycle with Domain Events ---");

const order = new Order("order-001", "customer-123");
order.addItem("laptop", 1, 1299.99);
order.addItem("mouse", 2, 49.99);
order.setShippingAddress("123 Main St, City, 12345");

// Place order - raises OrderPlaced event
order.place();
console.log(`\nOrder ${order.orderId} status: ${order.status}`);
dispatcher.dispatchAll(order.pullDomainEvents());

// Confirm order - raises OrderConfirmed event
order.confirm("admin@store.com");
console.log(`\nOrder ${order.orderId} status: ${order.status}`);
dispatcher.dispatchAll(order.pullDomainEvents());

// Ship order - raises OrderShipped event
order.ship("TRK-123456789", "FedEx", 3);
console.log(`\nOrder ${order.orderId} status: ${order.status}`);
dispatcher.dispatchAll(order.pullDomainEvents());

// User registration event
console.log("\n--- User Registration with Domain Events ---");
const userRegistered = new UserRegistered("user-456", "alice@example.com", "Alice Johnson");
dispatcher.dispatch(userRegistered);

export {};
