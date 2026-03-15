/**
 * MODULE
 *
 * A mechanism for organizing related domain concepts into cohesive units.
 * Modules partition the domain model into logical groupings that have
 * high cohesion internally and low coupling between each other.
 *
 * Characteristics:
 * - High cohesion: Elements within a module are closely related
 * - Low coupling: Modules depend minimally on other modules
 * - Named using Ubiquitous Language
 * - Reflect the structure of the domain, not technical layers
 * - Should tell a story about the domain
 *
 * When to use:
 * - Organizing large domain models
 * - Making the model easier to understand
 * - Enabling parallel development
 * - Controlling dependencies
 *
 * Module organization principles:
 * - Group by domain concept, not by pattern type
 * - Module names should come from Ubiquitous Language
 * - Keep related concepts together
 * - Allow modules to evolve as understanding improves
 *
 * In TypeScript/JavaScript, modules map to:
 * - Files and folders
 * - Namespaces
 * - Packages (npm packages for larger systems)
 */

// ============================================
// MODULE: Catalog
// All concepts related to product catalog
// ============================================
namespace Catalog {
  // Value Objects
  export class SKU {
    private constructor(private readonly _value: string) {}

    static create(value: string): SKU {
      if (!/^[A-Z]{3}-\d{6}$/.test(value)) {
        throw new Error("SKU must be in format XXX-123456");
      }
      return new SKU(value);
    }

    get value(): string {
      return this._value;
    }

    equals(other: SKU): boolean {
      return this._value === other._value;
    }
  }

  export class Money {
    constructor(
      private readonly _amount: number,
      private readonly _currency: string = "USD"
    ) {
      if (_amount < 0) throw new Error("Amount cannot be negative");
    }

    get amount(): number {
      return this._amount;
    }

    get currency(): string {
      return this._currency;
    }

    multiply(factor: number): Money {
      return new Money(this._amount * factor, this._currency);
    }

    toString(): string {
      return `${this._currency} ${this._amount.toFixed(2)}`;
    }
  }

  // Entity
  export class Product {
    private _isActive: boolean = true;

    constructor(
      private readonly _productId: string,
      private readonly _sku: SKU,
      private _name: string,
      private _description: string,
      private _price: Money,
      private _categoryId: string
    ) {}

    get productId(): string {
      return this._productId;
    }

    get sku(): SKU {
      return this._sku;
    }

    get name(): string {
      return this._name;
    }

    get description(): string {
      return this._description;
    }

    get price(): Money {
      return this._price;
    }

    get categoryId(): string {
      return this._categoryId;
    }

    get isActive(): boolean {
      return this._isActive;
    }

    updateDetails(name: string, description: string): void {
      this._name = name;
      this._description = description;
    }

    updatePrice(newPrice: Money): void {
      this._price = newPrice;
    }

    deactivate(): void {
      this._isActive = false;
    }

    activate(): void {
      this._isActive = true;
    }
  }

  export class Category {
    private _subcategories: Category[] = [];

    constructor(
      private readonly _categoryId: string,
      private _name: string,
      private readonly _parentId?: string
    ) {}

    get categoryId(): string {
      return this._categoryId;
    }

    get name(): string {
      return this._name;
    }

    get parentId(): string | undefined {
      return this._parentId;
    }

    get subcategories(): readonly Category[] {
      return [...this._subcategories];
    }

    addSubcategory(category: Category): void {
      this._subcategories.push(category);
    }

    rename(newName: string): void {
      this._name = newName;
    }
  }

  // Repository interface (defined in domain, implemented in infrastructure)
  export interface ProductRepository {
    findById(productId: string): Product | null;
    findBySku(sku: SKU): Product | null;
    findByCategory(categoryId: string): Product[];
    save(product: Product): void;
  }
}

// ============================================
// MODULE: Ordering
// All concepts related to customer orders
// ============================================
namespace Ordering {
  // Value Objects
  export class OrderId {
    private constructor(private readonly _value: string) {}

    static create(value: string): OrderId {
      return new OrderId(value);
    }

    static generate(): OrderId {
      return new OrderId(`ORD-${Date.now()}`);
    }

    get value(): string {
      return this._value;
    }

    equals(other: OrderId): boolean {
      return this._value === other._value;
    }
  }

  export class Address {
    constructor(
      readonly street: string,
      readonly city: string,
      readonly state: string,
      readonly zipCode: string,
      readonly country: string
    ) {}

    format(): string {
      return `${this.street}, ${this.city}, ${this.state} ${this.zipCode}, ${this.country}`;
    }
  }

  // Internal Entity
  export class OrderLine {
    constructor(
      readonly lineNumber: number,
      readonly productId: string,
      readonly productName: string,
      readonly quantity: number,
      readonly unitPrice: Catalog.Money
    ) {}

    get subtotal(): Catalog.Money {
      return this.unitPrice.multiply(this.quantity);
    }
  }

  type OrderStatus = "draft" | "placed" | "confirmed" | "shipped" | "delivered" | "cancelled";

  // Aggregate Root
  export class Order {
    private _lines: OrderLine[] = [];
    private _status: OrderStatus = "draft";
    private _lineCounter = 0;

    constructor(
      private readonly _orderId: OrderId,
      private readonly _customerId: string,
      private _shippingAddress: Address
    ) {}

    get orderId(): OrderId {
      return this._orderId;
    }

    get customerId(): string {
      return this._customerId;
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

    get total(): Catalog.Money {
      const sum = this._lines.reduce((acc, line) => acc + line.subtotal.amount, 0);
      return new Catalog.Money(sum);
    }

    addLine(productId: string, productName: string, quantity: number, unitPrice: Catalog.Money): void {
      if (this._status !== "draft") throw new Error("Cannot modify non-draft order");
      this._lines.push(new OrderLine(++this._lineCounter, productId, productName, quantity, unitPrice));
    }

    place(): void {
      if (this._lines.length === 0) throw new Error("Cannot place empty order");
      this._status = "placed";
    }

    confirm(): void {
      if (this._status !== "placed") throw new Error("Order must be placed first");
      this._status = "confirmed";
    }
  }

  // Domain Service
  export class OrderPricingService {
    calculateOrderTotal(order: Order, customerTier: string): Catalog.Money {
      const subtotal = order.total;
      const discountPercent = this.getDiscountForTier(customerTier);
      const discount = subtotal.amount * (discountPercent / 100);
      return new Catalog.Money(subtotal.amount - discount);
    }

    private getDiscountForTier(tier: string): number {
      const discounts: Record<string, number> = { bronze: 0, silver: 5, gold: 10, platinum: 15 };
      return discounts[tier] || 0;
    }
  }

  // Repository interface
  export interface OrderRepository {
    findById(orderId: OrderId): Order | null;
    findByCustomer(customerId: string): Order[];
    save(order: Order): void;
  }
}

// ============================================
// MODULE: Customer
// All concepts related to customers
// ============================================
namespace Customer {
  // Value Objects
  export class Email {
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

    equals(other: Email): boolean {
      return this._value === other._value;
    }
  }

  export class PhoneNumber {
    private constructor(private readonly _value: string) {}

    static create(value: string): PhoneNumber {
      const cleaned = value.replace(/\D/g, "");
      if (cleaned.length < 10) {
        throw new Error("Phone number must have at least 10 digits");
      }
      return new PhoneNumber(cleaned);
    }

    get value(): string {
      return this._value;
    }

    format(): string {
      return `(${this._value.slice(0, 3)}) ${this._value.slice(3, 6)}-${this._value.slice(6, 10)}`;
    }
  }

  type CustomerTier = "bronze" | "silver" | "gold" | "platinum";

  // Aggregate Root
  export class Customer {
    private _shippingAddresses: Ordering.Address[] = [];

    constructor(
      private readonly _customerId: string,
      private _name: string,
      private _email: Email,
      private _phone: PhoneNumber | null,
      private _tier: CustomerTier = "bronze"
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

    get phone(): PhoneNumber | null {
      return this._phone;
    }

    get tier(): CustomerTier {
      return this._tier;
    }

    get shippingAddresses(): readonly Ordering.Address[] {
      return [...this._shippingAddresses];
    }

    updateContactInfo(name: string, email: Email, phone: PhoneNumber | null): void {
      this._name = name;
      this._email = email;
      this._phone = phone;
    }

    addShippingAddress(address: Ordering.Address): void {
      this._shippingAddresses.push(address);
    }

    upgradeTier(newTier: CustomerTier): void {
      const tierOrder = ["bronze", "silver", "gold", "platinum"];
      const currentIndex = tierOrder.indexOf(this._tier);
      const newIndex = tierOrder.indexOf(newTier);
      if (newIndex <= currentIndex) {
        throw new Error("Can only upgrade to a higher tier");
      }
      this._tier = newTier;
    }
  }

  // Repository interface
  export interface CustomerRepository {
    findById(customerId: string): Customer | null;
    findByEmail(email: Email): Customer | null;
    save(customer: Customer): void;
  }
}

// ============================================
// MODULE: Inventory
// All concepts related to stock management
// ============================================
namespace Inventory {
  // Value Object
  export class Quantity {
    private constructor(private readonly _value: number) {}

    static create(value: number): Quantity {
      if (value < 0) throw new Error("Quantity cannot be negative");
      if (!Number.isInteger(value)) throw new Error("Quantity must be an integer");
      return new Quantity(value);
    }

    static zero(): Quantity {
      return new Quantity(0);
    }

    get value(): number {
      return this._value;
    }

    add(other: Quantity): Quantity {
      return Quantity.create(this._value + other._value);
    }

    subtract(other: Quantity): Quantity {
      return Quantity.create(this._value - other._value);
    }

    isZero(): boolean {
      return this._value === 0;
    }

    isGreaterThan(other: Quantity): boolean {
      return this._value > other._value;
    }
  }

  // Entity
  export class StockItem {
    constructor(
      private readonly _productId: string,
      private _quantity: Quantity,
      private _reservedQuantity: Quantity = Quantity.zero()
    ) {}

    get productId(): string {
      return this._productId;
    }

    get totalQuantity(): Quantity {
      return this._quantity;
    }

    get reservedQuantity(): Quantity {
      return this._reservedQuantity;
    }

    get availableQuantity(): Quantity {
      return this._quantity.subtract(this._reservedQuantity);
    }

    receive(quantity: Quantity): void {
      this._quantity = this._quantity.add(quantity);
    }

    reserve(quantity: Quantity): void {
      if (this.availableQuantity.isGreaterThan(quantity) || this.availableQuantity.value === quantity.value) {
        this._reservedQuantity = this._reservedQuantity.add(quantity);
      } else {
        throw new Error("Insufficient available stock");
      }
    }

    releaseReservation(quantity: Quantity): void {
      this._reservedQuantity = this._reservedQuantity.subtract(quantity);
    }

    ship(quantity: Quantity): void {
      this._quantity = this._quantity.subtract(quantity);
      this._reservedQuantity = this._reservedQuantity.subtract(quantity);
    }
  }

  // Domain Service
  export class StockAllocationService {
    allocateForOrder(items: { productId: string; quantity: number }[], stock: Map<string, StockItem>): AllocationResult {
      const allocations: { productId: string; quantity: Quantity }[] = [];
      const failures: { productId: string; requested: number; available: number }[] = [];

      for (const item of items) {
        const stockItem = stock.get(item.productId);
        const requestedQty = Quantity.create(item.quantity);

        if (!stockItem) {
          failures.push({ productId: item.productId, requested: item.quantity, available: 0 });
        } else if (!stockItem.availableQuantity.isGreaterThan(requestedQty) && stockItem.availableQuantity.value < requestedQty.value) {
          failures.push({ productId: item.productId, requested: item.quantity, available: stockItem.availableQuantity.value });
        } else {
          allocations.push({ productId: item.productId, quantity: requestedQty });
        }
      }

      if (failures.length > 0) {
        return AllocationResult.failed(failures);
      }

      // Reserve all items
      for (const allocation of allocations) {
        stock.get(allocation.productId)!.reserve(allocation.quantity);
      }

      return AllocationResult.success(allocations);
    }
  }

  export class AllocationResult {
    private constructor(
      readonly success: boolean,
      readonly allocations: { productId: string; quantity: Quantity }[],
      readonly failures: { productId: string; requested: number; available: number }[]
    ) {}

    static success(allocations: { productId: string; quantity: Quantity }[]): AllocationResult {
      return new AllocationResult(true, allocations, []);
    }

    static failed(failures: { productId: string; requested: number; available: number }[]): AllocationResult {
      return new AllocationResult(false, [], failures);
    }
  }
}

// ============================================
// Usage - Demonstrating Module Interaction
// ============================================

console.log("=== Module Pattern ===\n");

// Create products (Catalog module)
console.log("--- Catalog Module ---");
const laptop = new Catalog.Product(
  "prod-001",
  Catalog.SKU.create("LAP-123456"),
  "MacBook Pro",
  "14-inch M3 Pro",
  new Catalog.Money(1999),
  "cat-electronics"
);
console.log(`Product: ${laptop.name} - ${laptop.price}`);

// Create customer (Customer module)
console.log("\n--- Customer Module ---");
const customer = new Customer.Customer(
  "cust-001",
  "Alice Johnson",
  Customer.Email.create("alice@example.com"),
  Customer.PhoneNumber.create("555-123-4567"),
  "gold"
);
console.log(`Customer: ${customer.name} (${customer.tier})`);

// Create order (Ordering module)
console.log("\n--- Ordering Module ---");
const shippingAddress = new Ordering.Address("123 Main St", "New York", "NY", "10001", "USA");
const order = new Ordering.Order(Ordering.OrderId.generate(), customer.customerId, shippingAddress);

order.addLine(laptop.productId, laptop.name, 1, laptop.price);
console.log(`Order: ${order.orderId.value}`);
console.log(`  Shipping: ${order.shippingAddress.format()}`);
console.log(`  Total: ${order.total}`);

// Apply pricing with customer tier
const pricingService = new Ordering.OrderPricingService();
const discountedTotal = pricingService.calculateOrderTotal(order, customer.tier);
console.log(`  With ${customer.tier} discount: ${discountedTotal}`);

// Check inventory (Inventory module)
console.log("\n--- Inventory Module ---");
const stock = new Map<string, Inventory.StockItem>();
stock.set(laptop.productId, new Inventory.StockItem(laptop.productId, Inventory.Quantity.create(10)));

const stockItem = stock.get(laptop.productId)!;
console.log(`Stock for ${laptop.name}: ${stockItem.availableQuantity.value} available`);

const allocationService = new Inventory.StockAllocationService();
const allocationResult = allocationService.allocateForOrder([{ productId: laptop.productId, quantity: 1 }], stock);

console.log(`Allocation: ${allocationResult.success ? "Success" : "Failed"}`);
console.log(`Remaining available: ${stockItem.availableQuantity.value}`);
console.log(`Reserved: ${stockItem.reservedQuantity.value}`);

export { Catalog, Ordering, Customer, Inventory };
