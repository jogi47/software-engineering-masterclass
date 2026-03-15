/**
 * CHANGE VALUE TO REFERENCE
 *
 * Change a value object into a reference object when multiple objects
 * should share the same data.
 *
 * The inverse of Change Reference to Value.
 *
 * Motivation:
 * - When multiple objects should share a single data instance
 * - When updates to the shared data should be visible everywhere
 * - When identity matters, not just equality of values
 * - When you need a single source of truth
 *
 * Mechanics:
 * 1. Create a repository/registry for the reference objects
 * 2. Ensure there's a way to access the repository
 * 3. Change the constructors to use the repository
 * 4. Test
 */

// ============================================================================
// BEFORE: Each order has its own copy of customer data
// ============================================================================

class CustomerValueBefore {
  constructor(
    public readonly id: string,
    public name: string,
    public discountRate: number
  ) {}
}

class OrderBefore {
  private _customer: CustomerValueBefore;
  private _amount: number;

  constructor(customerId: string, name: string, discountRate: number, amount: number) {
    // Each order creates its own customer instance
    this._customer = new CustomerValueBefore(customerId, name, discountRate);
    this._amount = amount;
  }

  get customerName(): string {
    return this._customer.name;
  }

  get total(): number {
    return this._amount * (1 - this._customer.discountRate);
  }

  // Problem: updating customer here doesn't affect other orders
  updateCustomerDiscount(newRate: number): void {
    this._customer.discountRate = newRate;
  }
}

// ============================================================================
// AFTER: Orders share customer references through a repository
// ============================================================================

class Customer {
  private _name: string;
  private _discountRate: number;

  constructor(
    public readonly id: string,
    name: string,
    discountRate: number = 0
  ) {
    this._name = name;
    this._discountRate = discountRate;
  }

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
  }

  get discountRate(): number {
    return this._discountRate;
  }

  set discountRate(value: number) {
    this._discountRate = value;
  }
}

// Repository to manage customer references
class CustomerRepository {
  private static _instance: CustomerRepository;
  private _customers: Map<string, Customer> = new Map();

  static get instance(): CustomerRepository {
    if (!this._instance) {
      this._instance = new CustomerRepository();
    }
    return this._instance;
  }

  register(customer: Customer): void {
    this._customers.set(customer.id, customer);
  }

  find(id: string): Customer | undefined {
    return this._customers.get(id);
  }

  getOrCreate(id: string, name: string, discountRate: number = 0): Customer {
    let customer = this._customers.get(id);
    if (!customer) {
      customer = new Customer(id, name, discountRate);
      this._customers.set(id, customer);
    }
    return customer;
  }

  clear(): void {
    this._customers.clear();
  }
}

class Order {
  private _customer: Customer;
  private _amount: number;

  constructor(customerId: string, name: string, discountRate: number, amount: number) {
    // Get shared customer reference from repository
    this._customer = CustomerRepository.instance.getOrCreate(customerId, name, discountRate);
    this._amount = amount;
  }

  get customer(): Customer {
    return this._customer;
  }

  get customerName(): string {
    return this._customer.name;
  }

  get total(): number {
    return this._amount * (1 - this._customer.discountRate);
  }
}

// ============================================================================
// EXAMPLE: Product catalog with shared products
// ============================================================================

class Product {
  constructor(
    public readonly sku: string,
    private _name: string,
    private _price: number,
    private _inStock: boolean = true
  ) {}

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
  }

  get price(): number {
    return this._price;
  }

  set price(value: number) {
    this._price = value;
  }

  get inStock(): boolean {
    return this._inStock;
  }

  set inStock(value: boolean) {
    this._inStock = value;
  }
}

class ProductCatalog {
  private _products: Map<string, Product> = new Map();

  add(product: Product): void {
    this._products.set(product.sku, product);
  }

  get(sku: string): Product | undefined {
    return this._products.get(sku);
  }

  updatePrice(sku: string, newPrice: number): void {
    const product = this._products.get(sku);
    if (product) {
      product.price = newPrice;
    }
  }
}

class CartItem {
  constructor(
    private _product: Product, // Reference, not value
    private _quantity: number
  ) {}

  get product(): Product {
    return this._product;
  }

  get quantity(): number {
    return this._quantity;
  }

  set quantity(value: number) {
    this._quantity = value;
  }

  // Price is always current because we have a reference
  get total(): number {
    return this._product.price * this._quantity;
  }

  get productName(): string {
    return this._product.name;
  }

  get isAvailable(): boolean {
    return this._product.inStock;
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Change Value to Reference Refactoring ===\n");

// Clear repository for demo
CustomerRepository.instance.clear();

console.log("--- Before: Separate customer instances ---");
const order1Before = new OrderBefore("C1", "John Doe", 0.1, 100);
const order2Before = new OrderBefore("C1", "John Doe", 0.1, 200);

console.log(`Order 1 total: $${order1Before.total}`);
console.log(`Order 2 total: $${order2Before.total}`);

order1Before.updateCustomerDiscount(0.2);
console.log("\nAfter updating discount on order 1:");
console.log(`Order 1 total: $${order1Before.total}`);
console.log(`Order 2 total: $${order2Before.total}`); // Not updated!

console.log("\n--- After: Shared customer reference ---");
const order1 = new Order("C1", "John Doe", 0.1, 100);
const order2 = new Order("C1", "John Doe", 0.1, 200);

console.log(`Order 1 total: $${order1.total}`);
console.log(`Order 2 total: $${order2.total}`);

// Update the shared customer
order1.customer.discountRate = 0.2;
console.log("\nAfter updating discount on customer:");
console.log(`Order 1 total: $${order1.total}`);
console.log(`Order 2 total: $${order2.total}`); // Also updated!

console.log(`\nSame customer reference: ${order1.customer === order2.customer}`);

console.log("\n--- Product Catalog Example ---");
const catalog = new ProductCatalog();
const widget = new Product("W001", "Widget", 25);
catalog.add(widget);

const cart1 = new CartItem(catalog.get("W001")!, 2);
const cart2 = new CartItem(catalog.get("W001")!, 3);

console.log(`Cart 1: ${cart1.quantity}x ${cart1.productName} = $${cart1.total}`);
console.log(`Cart 2: ${cart2.quantity}x ${cart2.productName} = $${cart2.total}`);

// Update price in catalog
console.log("\nAfter price increase:");
catalog.updatePrice("W001", 30);

console.log(`Cart 1: ${cart1.quantity}x ${cart1.productName} = $${cart1.total}`);
console.log(`Cart 2: ${cart2.quantity}x ${cart2.productName} = $${cart2.total}`);

// Mark out of stock
widget.inStock = false;
console.log(`\nCart 1 available: ${cart1.isAvailable}`);
console.log(`Cart 2 available: ${cart2.isAvailable}`);

export {};
