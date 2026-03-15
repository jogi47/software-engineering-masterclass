/**
 * INTENTION-REVEALING INTERFACE
 *
 * Names of classes, methods, and parameters should describe their effect
 * and purpose without revealing the means by which they do what they do.
 * The interface should tell the developer what it does, not how it does it.
 *
 * Characteristics:
 * - Names describe WHAT, not HOW
 * - Method names are action verbs
 * - Class names are nouns from Ubiquitous Language
 * - Parameters have meaningful names
 * - No need to read implementation to understand usage
 *
 * When to use:
 * - Always! This is a fundamental design principle
 * - When naming any class, method, or variable
 * - When designing APIs and interfaces
 *
 * Benefits:
 * - Code is self-documenting
 * - Reduces cognitive load
 * - Makes code easier to maintain
 * - Expresses domain concepts clearly
 *
 * Anti-patterns to avoid:
 * - Technical names (DataProcessor, Handler, Manager)
 * - Implementation-revealing names (HashMapCustomer)
 * - Abbreviations (calcTot, procOrd)
 * - Generic names (data, item, result)
 */

// ============================================
// BAD EXAMPLES - Names reveal implementation, not intent
// ============================================

namespace BadExample {
  // BAD: Name reveals implementation (uses hash), not domain concept
  class HashSetValidator {
    private _items = new Set<string>();

    add(s: string): void {
      this._items.add(s);
    }

    check(s: string): boolean {
      return this._items.has(s);
    }
  }

  // BAD: Generic names, unclear intent
  class DataProcessor {
    process(data: any[]): any[] {
      // What does this do?
      return data.filter((d) => d.active).map((d) => ({ ...d, processed: true }));
    }

    calc(items: number[]): number {
      // Calculate what?
      return items.reduce((a, b) => a + b, 0);
    }
  }

  // BAD: Method names don't reveal intent
  class Order {
    private items: { price: number; qty: number }[] = [];
    private _status = "new";

    addItem(p: number, q: number): void {
      this.items.push({ price: p, qty: q });
    }

    doCalc(): number {
      // What calculation?
      return this.items.reduce((t, i) => t + i.price * i.qty, 0);
    }

    update(): void {
      // Update what?
      this._status = "processed";
    }
  }
}

// ============================================
// GOOD EXAMPLES - Names reveal intention
// ============================================

/**
 * GOOD: Name reveals domain concept (blocked users)
 * Clear what this class is for without reading implementation
 */
class BlockedUserRegistry {
  private _blockedUserIds = new Set<string>();

  blockUser(userId: string): void {
    this._blockedUserIds.add(userId);
  }

  unblockUser(userId: string): void {
    this._blockedUserIds.delete(userId);
  }

  isBlocked(userId: string): boolean {
    return this._blockedUserIds.has(userId);
  }

  getBlockedCount(): number {
    return this._blockedUserIds.size;
  }
}

/**
 * GOOD: Clear domain concept with intention-revealing methods
 */
class ShoppingCart {
  private _items: CartItem[] = [];
  private static readonly MAXIMUM_ITEMS = 50;

  addProduct(product: Product, quantity: number): void {
    if (this.itemCount >= ShoppingCart.MAXIMUM_ITEMS) {
      throw new Error("Cart is full");
    }

    const existingItem = this.findItemByProduct(product.productId);
    if (existingItem) {
      existingItem.increaseQuantity(quantity);
    } else {
      this._items.push(new CartItem(product, quantity));
    }
  }

  removeProduct(productId: string): void {
    this._items = this._items.filter((item) => item.productId !== productId);
  }

  updateQuantity(productId: string, newQuantity: number): void {
    const item = this.findItemByProduct(productId);
    if (!item) throw new Error("Product not in cart");
    item.setQuantity(newQuantity);
  }

  calculateTotal(): Money {
    return this._items.reduce((total, item) => total.add(item.calculateSubtotal()), Money.zero());
  }

  isEmpty(): boolean {
    return this._items.length === 0;
  }

  get itemCount(): number {
    return this._items.reduce((count, item) => count + item.quantity, 0);
  }

  private findItemByProduct(productId: string): CartItem | undefined {
    return this._items.find((item) => item.productId === productId);
  }
}

class CartItem {
  private _quantity: number;

  constructor(
    private readonly _product: Product,
    quantity: number
  ) {
    this.validateQuantity(quantity);
    this._quantity = quantity;
  }

  get productId(): string {
    return this._product.productId;
  }

  get productName(): string {
    return this._product.name;
  }

  get quantity(): number {
    return this._quantity;
  }

  increaseQuantity(amount: number): void {
    this.setQuantity(this._quantity + amount);
  }

  decreaseQuantity(amount: number): void {
    this.setQuantity(this._quantity - amount);
  }

  setQuantity(newQuantity: number): void {
    this.validateQuantity(newQuantity);
    this._quantity = newQuantity;
  }

  calculateSubtotal(): Money {
    return this._product.price.multiply(this._quantity);
  }

  private validateQuantity(quantity: number): void {
    if (quantity < 1) throw new Error("Quantity must be at least 1");
    if (quantity > 99) throw new Error("Quantity cannot exceed 99");
  }
}

class Product {
  constructor(
    readonly productId: string,
    readonly name: string,
    readonly price: Money
  ) {}
}

class Money {
  private constructor(
    private readonly _amount: number,
    private readonly _currency: string = "USD"
  ) {}

  static create(amount: number, currency: string = "USD"): Money {
    if (amount < 0) throw new Error("Amount cannot be negative");
    return new Money(amount, currency);
  }

  static zero(currency: string = "USD"): Money {
    return new Money(0, currency);
  }

  get amount(): number {
    return this._amount;
  }

  add(other: Money): Money {
    return new Money(this._amount + other._amount, this._currency);
  }

  multiply(factor: number): Money {
    return Money.create(this._amount * factor, this._currency);
  }

  toString(): string {
    return `$${this._amount.toFixed(2)}`;
  }
}

/**
 * GOOD: Intention-revealing interface for Order lifecycle
 */
type OrderStatus = "draft" | "placed" | "confirmed" | "shipped" | "delivered" | "cancelled";

class Order {
  private _lines: OrderLine[] = [];
  private _status: OrderStatus = "draft";
  private _placedAt?: Date;
  private _confirmedAt?: Date;
  private _shippedAt?: Date;

  constructor(
    private readonly _orderId: string,
    private readonly _customerId: string,
    private readonly _shippingAddress: Address
  ) {}

  // Intention-revealing method names
  addLineItem(productId: string, productName: string, quantity: number, unitPrice: Money): void {
    this.assertOrderIsModifiable();
    this._lines.push(new OrderLine(productId, productName, quantity, unitPrice));
  }

  removeLineItem(productId: string): void {
    this.assertOrderIsModifiable();
    this._lines = this._lines.filter((line) => line.productId !== productId);
  }

  placeOrder(): void {
    this.assertOrderIsModifiable();
    this.assertHasLineItems();
    this._status = "placed";
    this._placedAt = new Date();
  }

  confirmOrder(): void {
    this.assertOrderIsPlaced();
    this._status = "confirmed";
    this._confirmedAt = new Date();
  }

  shipOrder(trackingNumber: string): void {
    this.assertOrderIsConfirmed();
    this._status = "shipped";
    this._shippedAt = new Date();
    // Would store tracking number
  }

  deliverOrder(): void {
    this.assertOrderIsShipped();
    this._status = "delivered";
  }

  cancelOrder(reason: string): void {
    this.assertOrderIsCancellable();
    this._status = "cancelled";
    // Would store cancellation reason
  }

  calculateOrderTotal(): Money {
    return this._lines.reduce((total, line) => total.add(line.calculateLineTotal()), Money.zero());
  }

  hasProduct(productId: string): boolean {
    return this._lines.some((line) => line.productId === productId);
  }

  canBeModified(): boolean {
    return this._status === "draft";
  }

  canBeCancelled(): boolean {
    return this._status !== "delivered" && this._status !== "cancelled";
  }

  // Private helpers with clear names
  private assertOrderIsModifiable(): void {
    if (!this.canBeModified()) {
      throw new Error("Order cannot be modified after it has been placed");
    }
  }

  private assertHasLineItems(): void {
    if (this._lines.length === 0) {
      throw new Error("Order must have at least one line item");
    }
  }

  private assertOrderIsPlaced(): void {
    if (this._status !== "placed") {
      throw new Error("Order must be placed before it can be confirmed");
    }
  }

  private assertOrderIsConfirmed(): void {
    if (this._status !== "confirmed") {
      throw new Error("Order must be confirmed before it can be shipped");
    }
  }

  private assertOrderIsShipped(): void {
    if (this._status !== "shipped") {
      throw new Error("Order must be shipped before it can be delivered");
    }
  }

  private assertOrderIsCancellable(): void {
    if (!this.canBeCancelled()) {
      throw new Error("Order cannot be cancelled");
    }
  }
}

class OrderLine {
  constructor(
    readonly productId: string,
    readonly productName: string,
    private readonly _quantity: number,
    private readonly _unitPrice: Money
  ) {}

  calculateLineTotal(): Money {
    return this._unitPrice.multiply(this._quantity);
  }
}

class Address {
  constructor(
    readonly street: string,
    readonly city: string,
    readonly zipCode: string,
    readonly country: string
  ) {}

  formatForShipping(): string {
    return `${this.street}\n${this.city}, ${this.zipCode}\n${this.country}`;
  }
}

/**
 * GOOD: Domain service with intention-revealing name and methods
 */
class OrderFulfillmentService {
  canFulfillOrder(order: Order, availableInventory: Map<string, number>): boolean {
    // Clear intent: checking if order can be fulfilled
    for (const line of (order as any)._lines || []) {
      const available = availableInventory.get(line.productId) || 0;
      if (available < line._quantity) {
        return false;
      }
    }
    return true;
  }

  reserveInventoryForOrder(order: Order, inventory: Map<string, number>): ReservationResult {
    // Clear intent: reserving inventory
    const reservations: { productId: string; quantity: number }[] = [];
    // Implementation...
    return ReservationResult.success(reservations);
  }
}

class ReservationResult {
  private constructor(
    readonly succeeded: boolean,
    readonly reservations: { productId: string; quantity: number }[]
  ) {}

  static success(reservations: { productId: string; quantity: number }[]): ReservationResult {
    return new ReservationResult(true, reservations);
  }

  static failure(): ReservationResult {
    return new ReservationResult(false, []);
  }
}

// Usage
console.log("=== Intention-Revealing Interface Pattern ===\n");

// Create products with clear naming
const laptop = new Product("prod-001", "MacBook Pro 14", Money.create(1999));
const mouse = new Product("prod-002", "Magic Mouse", Money.create(99));

// Shopping cart with intention-revealing methods
console.log("--- Shopping Cart ---");
const cart = new ShoppingCart();

cart.addProduct(laptop, 1);
cart.addProduct(mouse, 2);

console.log(`Cart has ${cart.itemCount} items`);
console.log(`Cart is empty: ${cart.isEmpty()}`);
console.log(`Total: ${cart.calculateTotal()}`);

// Order with clear lifecycle methods
console.log("\n--- Order Lifecycle ---");
const address = new Address("123 Main St", "San Francisco", "94105", "USA");
const order = new Order("order-001", "customer-001", address);

// Method names clearly indicate what they do
order.addLineItem(laptop.productId, laptop.name, 1, laptop.price);
console.log(`Can modify: ${order.canBeModified()}`);

order.placeOrder();
console.log(`After placing - Can modify: ${order.canBeModified()}`);
console.log(`Can cancel: ${order.canBeCancelled()}`);

order.confirmOrder();
order.shipOrder("TRK-123456");
order.deliverOrder();
console.log(`After delivery - Can cancel: ${order.canBeCancelled()}`);

// Blocked users with clear intent
console.log("\n--- Blocked User Registry ---");
const blockedUsers = new BlockedUserRegistry();
blockedUsers.blockUser("user-123");
blockedUsers.blockUser("user-456");

console.log(`User 123 blocked: ${blockedUsers.isBlocked("user-123")}`);
console.log(`User 789 blocked: ${blockedUsers.isBlocked("user-789")}`);
console.log(`Total blocked: ${blockedUsers.getBlockedCount()}`);

export {};
