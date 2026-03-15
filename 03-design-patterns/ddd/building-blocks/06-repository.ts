/**
 * REPOSITORY
 *
 * A mechanism for encapsulating storage, retrieval, and search behavior
 * which emulates a collection of objects. It provides a collection-like
 * interface for accessing domain objects.
 *
 * Characteristics:
 * - Acts like an in-memory collection
 * - Encapsulates persistence details
 * - One repository per aggregate root
 * - Returns fully reconstituted aggregates
 * - Uses domain language for query methods
 *
 * When to use:
 * - Retrieving and persisting aggregate roots
 * - Complex queries that need to be reusable
 * - Decoupling domain from persistence
 *
 * Repository vs DAO:
 * - Repository: Collection-like, aggregate-focused, domain language
 * - DAO: CRUD-focused, table/record-focused, database language
 *
 * Key principles:
 * - Only aggregate roots have repositories
 * - One repository per aggregate type
 * - Query methods use domain concepts
 * - Returns domain objects (not DTOs or raw data)
 */

// Value Objects
class Money {
  constructor(
    private readonly _amount: number,
    private readonly _currency: string = "USD"
  ) {}

  get amount(): number {
    return this._amount;
  }

  add(other: Money): Money {
    return new Money(this._amount + other._amount, this._currency);
  }

  toString(): string {
    return `$${this._amount.toFixed(2)}`;
  }
}

class Email {
  constructor(private readonly _value: string) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(_value)) {
      throw new Error(`Invalid email: ${_value}`);
    }
  }

  get value(): string {
    return this._value;
  }

  equals(other: Email): boolean {
    return this._value.toLowerCase() === other._value.toLowerCase();
  }
}

// Aggregate Root: Customer
class Customer {
  private _orders: string[] = []; // References to Order aggregates by ID

  constructor(
    private readonly _customerId: string,
    private _name: string,
    private _email: Email,
    private _tier: "bronze" | "silver" | "gold" | "platinum" = "bronze"
  ) {}

  get customerId(): string {
    return this._customerId;
  }

  get name(): string {
    return this._name;
  }

  get email(): Email {
    return this._email;
  }

  get tier(): string {
    return this._tier;
  }

  get orderIds(): readonly string[] {
    return [...this._orders];
  }

  updateName(name: string): void {
    this._name = name;
  }

  updateEmail(email: Email): void {
    this._email = email;
  }

  upgradeTier(newTier: "bronze" | "silver" | "gold" | "platinum"): void {
    this._tier = newTier;
  }

  addOrderReference(orderId: string): void {
    if (!this._orders.includes(orderId)) {
      this._orders.push(orderId);
    }
  }
}

// Aggregate Root: Order
type OrderStatus = "draft" | "placed" | "shipped" | "delivered";

class OrderLine {
  constructor(
    readonly productId: string,
    readonly productName: string,
    readonly quantity: number,
    readonly unitPrice: Money
  ) {}

  get subtotal(): Money {
    return new Money(this.unitPrice.amount * this.quantity);
  }
}

class Order {
  private _lines: OrderLine[] = [];
  private _status: OrderStatus = "draft";
  private _placedAt?: Date;

  constructor(
    private readonly _orderId: string,
    private readonly _customerId: string
  ) {}

  get orderId(): string {
    return this._orderId;
  }

  get customerId(): string {
    return this._customerId;
  }

  get status(): OrderStatus {
    return this._status;
  }

  get lines(): readonly OrderLine[] {
    return [...this._lines];
  }

  get total(): Money {
    return this._lines.reduce((sum, line) => sum.add(line.subtotal), new Money(0));
  }

  get placedAt(): Date | undefined {
    return this._placedAt;
  }

  addLine(productId: string, productName: string, quantity: number, unitPrice: Money): void {
    this._lines.push(new OrderLine(productId, productName, quantity, unitPrice));
  }

  place(): void {
    if (this._lines.length === 0) throw new Error("Cannot place empty order");
    this._status = "placed";
    this._placedAt = new Date();
  }

  ship(): void {
    this._status = "shipped";
  }

  deliver(): void {
    this._status = "delivered";
  }
}

// ============================================
// REPOSITORY INTERFACES (Domain Layer)
// ============================================

/**
 * Repository interface for Customer aggregate.
 * Defined in domain layer, implemented in infrastructure.
 */
interface CustomerRepository {
  // Basic CRUD-like operations using domain language
  save(customer: Customer): void;
  findById(customerId: string): Customer | null;
  findByEmail(email: Email): Customer | null;
  delete(customerId: string): void;

  // Query methods using domain concepts
  findByTier(tier: string): Customer[];
  findWithRecentOrders(since: Date): Customer[];

  // Collection semantics
  count(): number;
  exists(customerId: string): boolean;
}

/**
 * Repository interface for Order aggregate.
 */
interface OrderRepository {
  save(order: Order): void;
  findById(orderId: string): Order | null;
  delete(orderId: string): void;

  // Domain-specific queries
  findByCustomerId(customerId: string): Order[];
  findByStatus(status: OrderStatus): Order[];
  findPlacedBetween(start: Date, end: Date): Order[];

  count(): number;
}

// ============================================
// REPOSITORY IMPLEMENTATIONS (Infrastructure Layer)
// ============================================

/**
 * In-memory implementation of CustomerRepository.
 * In real applications, this would use a database.
 */
class InMemoryCustomerRepository implements CustomerRepository {
  private customers = new Map<string, Customer>();

  save(customer: Customer): void {
    // Clone to simulate persistence (avoid reference issues)
    this.customers.set(customer.customerId, customer);
    console.log(`[CustomerRepo] Saved customer: ${customer.customerId}`);
  }

  findById(customerId: string): Customer | null {
    return this.customers.get(customerId) || null;
  }

  findByEmail(email: Email): Customer | null {
    for (const customer of this.customers.values()) {
      if (customer.email.equals(email)) {
        return customer;
      }
    }
    return null;
  }

  delete(customerId: string): void {
    this.customers.delete(customerId);
    console.log(`[CustomerRepo] Deleted customer: ${customerId}`);
  }

  findByTier(tier: string): Customer[] {
    return Array.from(this.customers.values()).filter((c) => c.tier === tier);
  }

  findWithRecentOrders(since: Date): Customer[] {
    // In real implementation, this would join with orders
    return Array.from(this.customers.values()).filter((c) => c.orderIds.length > 0);
  }

  count(): number {
    return this.customers.size;
  }

  exists(customerId: string): boolean {
    return this.customers.has(customerId);
  }
}

/**
 * In-memory implementation of OrderRepository.
 */
class InMemoryOrderRepository implements OrderRepository {
  private orders = new Map<string, Order>();

  save(order: Order): void {
    this.orders.set(order.orderId, order);
    console.log(`[OrderRepo] Saved order: ${order.orderId}`);
  }

  findById(orderId: string): Order | null {
    return this.orders.get(orderId) || null;
  }

  delete(orderId: string): void {
    this.orders.delete(orderId);
    console.log(`[OrderRepo] Deleted order: ${orderId}`);
  }

  findByCustomerId(customerId: string): Order[] {
    return Array.from(this.orders.values()).filter((o) => o.customerId === customerId);
  }

  findByStatus(status: OrderStatus): Order[] {
    return Array.from(this.orders.values()).filter((o) => o.status === status);
  }

  findPlacedBetween(start: Date, end: Date): Order[] {
    return Array.from(this.orders.values()).filter((o) => {
      if (!o.placedAt) return false;
      return o.placedAt >= start && o.placedAt <= end;
    });
  }

  count(): number {
    return this.orders.size;
  }
}

// ============================================
// SPECIFICATION PATTERN (Optional enhancement)
// ============================================

/**
 * Specification pattern for complex queries.
 * Allows combining criteria using domain language.
 */
interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
}

class GoldOrHigherCustomer implements Specification<Customer> {
  isSatisfiedBy(customer: Customer): boolean {
    return customer.tier === "gold" || customer.tier === "platinum";
  }
}

class CustomerWithMinimumOrders implements Specification<Customer> {
  constructor(private readonly minOrders: number) {}

  isSatisfiedBy(customer: Customer): boolean {
    return customer.orderIds.length >= this.minOrders;
  }
}

class AndSpecification<T> implements Specification<T> {
  constructor(
    private readonly left: Specification<T>,
    private readonly right: Specification<T>
  ) {}

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
  }
}

// Repository with specification support
class EnhancedCustomerRepository extends InMemoryCustomerRepository {
  findMatching(spec: Specification<Customer>): Customer[] {
    const all = Array.from((this as any).customers?.values() || []);
    return all.filter((c: Customer) => spec.isSatisfiedBy(c));
  }
}

// Usage
console.log("=== Repository Pattern ===\n");

// Create repositories
const customerRepo = new InMemoryCustomerRepository();
const orderRepo = new InMemoryOrderRepository();

// Create and save customers
console.log("--- Creating Customers ---");
const customer1 = new Customer("cust-001", "Alice Johnson", new Email("alice@example.com"), "gold");
const customer2 = new Customer("cust-002", "Bob Smith", new Email("bob@example.com"), "bronze");
const customer3 = new Customer("cust-003", "Carol White", new Email("carol@example.com"), "platinum");

customerRepo.save(customer1);
customerRepo.save(customer2);
customerRepo.save(customer3);

console.log(`\nTotal customers: ${customerRepo.count()}`);

// Find by ID
console.log("\n--- Finding Customers ---");
const found = customerRepo.findById("cust-001");
console.log(`Found by ID: ${found?.name} (${found?.tier})`);

// Find by email
const byEmail = customerRepo.findByEmail(new Email("bob@example.com"));
console.log(`Found by email: ${byEmail?.name}`);

// Find by tier
const goldCustomers = customerRepo.findByTier("gold");
console.log(`Gold customers: ${goldCustomers.map((c) => c.name).join(", ")}`);

// Create and save orders
console.log("\n--- Creating Orders ---");
const order1 = new Order("order-001", "cust-001");
order1.addLine("prod-1", "Laptop", 1, new Money(1299));
order1.addLine("prod-2", "Mouse", 2, new Money(49));
order1.place();

const order2 = new Order("order-002", "cust-001");
order2.addLine("prod-3", "Keyboard", 1, new Money(149));
order2.place();
order2.ship();

const order3 = new Order("order-003", "cust-002");
order3.addLine("prod-1", "Laptop", 1, new Money(1299));
order3.place();

orderRepo.save(order1);
orderRepo.save(order2);
orderRepo.save(order3);

// Update customer with order references
customer1.addOrderReference("order-001");
customer1.addOrderReference("order-002");
customer2.addOrderReference("order-003");
customerRepo.save(customer1);
customerRepo.save(customer2);

// Query orders
console.log("\n--- Querying Orders ---");
const aliceOrders = orderRepo.findByCustomerId("cust-001");
console.log(`Alice's orders: ${aliceOrders.length}`);

const shippedOrders = orderRepo.findByStatus("shipped");
console.log(`Shipped orders: ${shippedOrders.length}`);

const placedOrders = orderRepo.findByStatus("placed");
console.log(`Placed orders: ${placedOrders.length}`);

// Check existence
console.log("\n--- Repository Operations ---");
console.log(`Customer cust-001 exists: ${customerRepo.exists("cust-001")}`);
console.log(`Customer cust-999 exists: ${customerRepo.exists("cust-999")}`);

export {};
