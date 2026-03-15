/**
 * FACTORY
 *
 * An object responsible for creating complex aggregates and entities.
 * Encapsulates the knowledge needed to create valid domain objects,
 * especially when creation involves complex logic or multiple objects.
 *
 * Characteristics:
 * - Encapsulates complex creation logic
 * - Ensures created objects are valid and complete
 * - Can be a standalone class or a factory method
 * - Creates entire aggregates in a valid state
 * - Expresses creation in terms of domain language
 *
 * When to use:
 * - Object creation is complex
 * - Creation involves multiple related objects
 * - Creation rules need to be enforced
 * - Different creation paths for same object type
 * - Reconstituting objects from persistence
 *
 * Types of Factories:
 * - Factory Method: Method on aggregate/entity
 * - Factory Class: Standalone factory object
 * - Abstract Factory: Family of related objects
 *
 * Factory vs Repository:
 * - Factory: Creates new objects
 * - Repository: Retrieves existing objects
 */

// Value Objects
class Money {
  private constructor(
    private readonly _amount: number,
    private readonly _currency: string
  ) {}

  static create(amount: number, currency: string = "USD"): Money {
    if (amount < 0) throw new Error("Amount cannot be negative");
    return new Money(Math.round(amount * 100) / 100, currency);
  }

  static zero(currency: string = "USD"): Money {
    return new Money(0, currency);
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }

  add(other: Money): Money {
    return Money.create(this._amount + other._amount, this._currency);
  }

  multiply(factor: number): Money {
    return Money.create(this._amount * factor, this._currency);
  }

  toString(): string {
    return `${this._currency} ${this._amount.toFixed(2)}`;
  }
}

class Address {
  private constructor(
    readonly street: string,
    readonly city: string,
    readonly state: string,
    readonly zipCode: string,
    readonly country: string
  ) {}

  static create(street: string, city: string, state: string, zipCode: string, country: string): Address {
    if (!street.trim()) throw new Error("Street is required");
    if (!city.trim()) throw new Error("City is required");
    if (!zipCode.trim()) throw new Error("Zip code is required");
    return new Address(street.trim(), city.trim(), state.trim(), zipCode.trim(), country.trim());
  }
}

class Email {
  private constructor(private readonly _value: string) {}

  static create(value: string): Email {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new Error(`Invalid email: ${value}`);
    }
    return new Email(value.toLowerCase());
  }

  get value(): string {
    return this._value;
  }
}

// ============================================
// ENTITIES & AGGREGATES
// ============================================

class OrderLine {
  constructor(
    readonly lineId: string,
    readonly productId: string,
    readonly productName: string,
    readonly quantity: number,
    readonly unitPrice: Money
  ) {}

  get subtotal(): Money {
    return this.unitPrice.multiply(this.quantity);
  }
}

type OrderStatus = "draft" | "placed" | "confirmed" | "shipped" | "delivered" | "cancelled";

class Order {
  private constructor(
    private readonly _orderId: string,
    private readonly _customerId: string,
    private readonly _customerName: string,
    private _shippingAddress: Address,
    private _lines: OrderLine[],
    private _status: OrderStatus,
    private _createdAt: Date,
    private _placedAt?: Date
  ) {}

  // Factory method for creating new orders
  static createNew(orderId: string, customerId: string, customerName: string, shippingAddress: Address): Order {
    return new Order(orderId, customerId, customerName, shippingAddress, [], "draft", new Date());
  }

  // Factory method for reconstituting from persistence
  static reconstitute(
    orderId: string,
    customerId: string,
    customerName: string,
    shippingAddress: Address,
    lines: OrderLine[],
    status: OrderStatus,
    createdAt: Date,
    placedAt?: Date
  ): Order {
    return new Order(orderId, customerId, customerName, shippingAddress, lines, status, createdAt, placedAt);
  }

  get orderId(): string {
    return this._orderId;
  }

  get customerId(): string {
    return this._customerId;
  }

  get customerName(): string {
    return this._customerName;
  }

  get shippingAddress(): Address {
    return this._shippingAddress;
  }

  get lines(): readonly OrderLine[] {
    return [...this._lines];
  }

  get status(): OrderStatus {
    return this._status;
  }

  get total(): Money {
    return this._lines.reduce((sum, line) => sum.add(line.subtotal), Money.zero());
  }

  addLine(lineId: string, productId: string, productName: string, quantity: number, unitPrice: Money): void {
    if (this._status !== "draft") throw new Error("Cannot modify non-draft order");
    this._lines.push(new OrderLine(lineId, productId, productName, quantity, unitPrice));
  }

  place(): void {
    if (this._lines.length === 0) throw new Error("Cannot place empty order");
    this._status = "placed";
    this._placedAt = new Date();
  }
}

// ============================================
// FACTORY CLASS
// ============================================

interface CustomerData {
  customerId: string;
  name: string;
  email: string;
}

interface ProductData {
  productId: string;
  name: string;
  price: number;
}

interface OrderLineData {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface ShippingData {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

/**
 * FACTORY: OrderFactory
 *
 * Creates Order aggregates with all required validation and setup.
 * Encapsulates complex order creation logic.
 */
class OrderFactory {
  private orderCounter = 0;
  private lineCounter = 0;

  /**
   * Create a new order from customer and shipping data.
   */
  createOrder(customer: CustomerData, shipping: ShippingData): Order {
    const orderId = this.generateOrderId();
    const shippingAddress = Address.create(
      shipping.street,
      shipping.city,
      shipping.state,
      shipping.zipCode,
      shipping.country
    );

    return Order.createNew(orderId, customer.customerId, customer.name, shippingAddress);
  }

  /**
   * Create an order with items already included.
   */
  createOrderWithItems(customer: CustomerData, shipping: ShippingData, items: OrderLineData[]): Order {
    if (items.length === 0) {
      throw new Error("Order must have at least one item");
    }

    const order = this.createOrder(customer, shipping);

    for (const item of items) {
      this.addLineToOrder(order, item);
    }

    return order;
  }

  /**
   * Create a quick order (single item, simplified).
   */
  createQuickOrder(customer: CustomerData, product: ProductData, quantity: number, shipping: ShippingData): Order {
    const order = this.createOrder(customer, shipping);
    const lineId = this.generateLineId();

    order.addLine(lineId, product.productId, product.name, quantity, Money.create(product.price));

    return order;
  }

  /**
   * Create order copy (for reordering).
   */
  createReorder(originalOrder: Order, customer: CustomerData): Order {
    const newOrder = this.createOrder(customer, {
      street: originalOrder.shippingAddress.street,
      city: originalOrder.shippingAddress.city,
      state: originalOrder.shippingAddress.state,
      zipCode: originalOrder.shippingAddress.zipCode,
      country: originalOrder.shippingAddress.country,
    });

    for (const line of originalOrder.lines) {
      const lineId = this.generateLineId();
      newOrder.addLine(lineId, line.productId, line.productName, line.quantity, line.unitPrice);
    }

    return newOrder;
  }

  private addLineToOrder(order: Order, item: OrderLineData): void {
    const lineId = this.generateLineId();
    order.addLine(lineId, item.productId, item.productName, item.quantity, Money.create(item.unitPrice));
  }

  private generateOrderId(): string {
    return `ORD-${Date.now()}-${++this.orderCounter}`;
  }

  private generateLineId(): string {
    return `LINE-${++this.lineCounter}`;
  }
}

/**
 * FACTORY: CustomerFactory
 *
 * Creates Customer aggregates with various creation scenarios.
 */
class Customer {
  private constructor(
    readonly customerId: string,
    private _name: string,
    private _email: Email,
    private _tier: "bronze" | "silver" | "gold" | "platinum",
    private _shippingAddresses: Address[],
    private _createdAt: Date
  ) {}

  // Factory method for new customer registration
  static register(customerId: string, name: string, email: string): Customer {
    const validEmail = Email.create(email);
    return new Customer(customerId, name, validEmail, "bronze", [], new Date());
  }

  // Factory method with initial address
  static registerWithAddress(customerId: string, name: string, email: string, address: Address): Customer {
    const customer = Customer.register(customerId, name, email);
    customer.addShippingAddress(address);
    return customer;
  }

  // Factory method for reconstitution from persistence
  static reconstitute(
    customerId: string,
    name: string,
    email: string,
    tier: "bronze" | "silver" | "gold" | "platinum",
    addresses: Address[],
    createdAt: Date
  ): Customer {
    return new Customer(customerId, name, Email.create(email), tier, addresses, createdAt);
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

  get shippingAddresses(): readonly Address[] {
    return [...this._shippingAddresses];
  }

  addShippingAddress(address: Address): void {
    this._shippingAddresses.push(address);
  }

  upgradeTier(newTier: "bronze" | "silver" | "gold" | "platinum"): void {
    this._tier = newTier;
  }
}

// ============================================
// ABSTRACT FACTORY
// ============================================

/**
 * Abstract Factory for creating membership-related objects.
 * Different implementations for different membership tiers.
 */
interface MembershipFactory {
  createWelcomePackage(): WelcomePackage;
  createBenefits(): MembershipBenefits;
  createDiscount(): DiscountStrategy;
}

interface WelcomePackage {
  message: string;
  gifts: string[];
}

interface MembershipBenefits {
  freeShipping: boolean;
  prioritySupport: boolean;
  exclusiveDeals: boolean;
}

interface DiscountStrategy {
  calculateDiscount(amount: Money): Money;
}

class BronzeMembershipFactory implements MembershipFactory {
  createWelcomePackage(): WelcomePackage {
    return {
      message: "Welcome to our store!",
      gifts: ["10% off first order"],
    };
  }

  createBenefits(): MembershipBenefits {
    return { freeShipping: false, prioritySupport: false, exclusiveDeals: false };
  }

  createDiscount(): DiscountStrategy {
    return { calculateDiscount: (amount: Money) => Money.zero() };
  }
}

class GoldMembershipFactory implements MembershipFactory {
  createWelcomePackage(): WelcomePackage {
    return {
      message: "Welcome to Gold membership!",
      gifts: ["20% off first order", "Free shipping for 30 days"],
    };
  }

  createBenefits(): MembershipBenefits {
    return { freeShipping: true, prioritySupport: true, exclusiveDeals: false };
  }

  createDiscount(): DiscountStrategy {
    return {
      calculateDiscount: (amount: Money) => amount.multiply(0.1), // 10% discount
    };
  }
}

class PlatinumMembershipFactory implements MembershipFactory {
  createWelcomePackage(): WelcomePackage {
    return {
      message: "Welcome to Platinum VIP membership!",
      gifts: ["30% off first order", "Free shipping for life", "VIP gift box"],
    };
  }

  createBenefits(): MembershipBenefits {
    return { freeShipping: true, prioritySupport: true, exclusiveDeals: true };
  }

  createDiscount(): DiscountStrategy {
    return {
      calculateDiscount: (amount: Money) => amount.multiply(0.15), // 15% discount
    };
  }
}

// Factory registry
class MembershipFactoryRegistry {
  private static factories = new Map<string, MembershipFactory>([
    ["bronze", new BronzeMembershipFactory()],
    ["silver", new BronzeMembershipFactory()], // Same as bronze for simplicity
    ["gold", new GoldMembershipFactory()],
    ["platinum", new PlatinumMembershipFactory()],
  ]);

  static getFactory(tier: string): MembershipFactory {
    const factory = this.factories.get(tier);
    if (!factory) throw new Error(`Unknown tier: ${tier}`);
    return factory;
  }
}

// Usage
console.log("=== Factory Pattern ===\n");

// Order Factory
console.log("--- Order Factory ---");
const orderFactory = new OrderFactory();

const customer: CustomerData = { customerId: "cust-001", name: "Alice Johnson", email: "alice@example.com" };
const shipping: ShippingData = {
  street: "123 Main St",
  city: "New York",
  state: "NY",
  zipCode: "10001",
  country: "USA",
};

// Create order with items
const order = orderFactory.createOrderWithItems(customer, shipping, [
  { productId: "prod-1", productName: "Laptop", quantity: 1, unitPrice: 1299 },
  { productId: "prod-2", productName: "Mouse", quantity: 2, unitPrice: 49 },
]);

console.log(`Created order: ${order.orderId}`);
console.log(`  Customer: ${order.customerName}`);
console.log(`  Items: ${order.lines.length}`);
console.log(`  Total: ${order.total}`);

// Quick order
const product: ProductData = { productId: "prod-3", name: "Keyboard", price: 149 };
const quickOrder = orderFactory.createQuickOrder(customer, product, 1, shipping);
console.log(`\nQuick order: ${quickOrder.orderId} - ${quickOrder.total}`);

// Reorder
const reorder = orderFactory.createReorder(order, customer);
console.log(`\nReorder: ${reorder.orderId} (copy of ${order.orderId})`);

// Customer Factory
console.log("\n--- Customer Factory ---");
const registeredCustomer = Customer.register("cust-002", "Bob Smith", "bob@example.com");
console.log(`Registered: ${registeredCustomer.name} (${registeredCustomer.tier})`);

const address = Address.create("456 Oak Ave", "Los Angeles", "CA", "90001", "USA");
const customerWithAddress = Customer.registerWithAddress("cust-003", "Carol White", "carol@example.com", address);
console.log(`With address: ${customerWithAddress.name}, ${customerWithAddress.shippingAddresses.length} address(es)`);

// Abstract Factory - Membership
console.log("\n--- Membership Factory ---");
const tiers = ["bronze", "gold", "platinum"];

for (const tier of tiers) {
  const factory = MembershipFactoryRegistry.getFactory(tier);
  const welcomePackage = factory.createWelcomePackage();
  const benefits = factory.createBenefits();
  const discount = factory.createDiscount();

  console.log(`\n${tier.toUpperCase()} Membership:`);
  console.log(`  Welcome: ${welcomePackage.message}`);
  console.log(`  Gifts: ${welcomePackage.gifts.join(", ")}`);
  console.log(`  Free shipping: ${benefits.freeShipping}`);
  console.log(`  Discount on $100: ${discount.calculateDiscount(Money.create(100))}`);
}

export {};
