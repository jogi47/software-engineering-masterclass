/**
 * AGGREGATE
 *
 * A cluster of domain objects that are treated as a single unit for data changes.
 * Each Aggregate has a root (Aggregate Root) and a boundary.
 *
 * Characteristics:
 * - Has an Aggregate Root that is the only entry point
 * - External objects can only reference the Aggregate Root
 * - Internal objects cannot be accessed directly from outside
 * - Invariants are enforced within the boundary
 * - Transactional consistency within the aggregate
 * - Eventually consistent between aggregates
 *
 * Aggregate Root:
 * - Global identity (referenced from outside)
 * - Controls access to internal entities
 * - Responsible for maintaining invariants
 * - Only object that can be obtained from a Repository
 *
 * Design Rules:
 * - Keep aggregates small (prefer smaller over larger)
 * - Reference other aggregates by identity, not direct reference
 * - Use eventual consistency between aggregates
 * - One transaction = one aggregate
 */

// Value Objects
class Money {
  constructor(
    private readonly _amount: number,
    private readonly _currency: string = "USD"
  ) {
    if (_amount < 0) throw new Error("Amount cannot be negative");
  }

  get amount(): number {
    return this._amount;
  }

  add(other: Money): Money {
    return new Money(this._amount + other._amount, this._currency);
  }

  subtract(other: Money): Money {
    return new Money(this._amount - other._amount, this._currency);
  }

  multiply(factor: number): Money {
    return new Money(this._amount * factor, this._currency);
  }

  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }

  toString(): string {
    return `$${this._amount.toFixed(2)}`;
  }
}

class Address {
  constructor(
    readonly street: string,
    readonly city: string,
    readonly zipCode: string,
    readonly country: string
  ) {}
}

// ============================================
// ORDER AGGREGATE
// ============================================
// The Order is the Aggregate Root
// OrderLine items are internal entities (local identity)

// Internal entity - only accessible through Order (Aggregate Root)
class OrderLine {
  private _quantity: number;

  constructor(
    private readonly _lineId: string, // Local identity within aggregate
    private readonly _productId: string, // Reference to Product aggregate by ID
    private readonly _productName: string,
    private readonly _unitPrice: Money,
    quantity: number
  ) {
    if (quantity <= 0) throw new Error("Quantity must be positive");
    this._quantity = quantity;
  }

  get lineId(): string {
    return this._lineId;
  }

  get productId(): string {
    return this._productId;
  }

  get productName(): string {
    return this._productName;
  }

  get quantity(): number {
    return this._quantity;
  }

  get unitPrice(): Money {
    return this._unitPrice;
  }

  get subtotal(): Money {
    return this._unitPrice.multiply(this._quantity);
  }

  // Internal methods - called by Aggregate Root
  updateQuantity(newQuantity: number): void {
    if (newQuantity <= 0) throw new Error("Quantity must be positive");
    this._quantity = newQuantity;
  }
}

type OrderStatus = "draft" | "placed" | "confirmed" | "shipped" | "delivered" | "cancelled";

// AGGREGATE ROOT: Order
// - Has global identity (orderId)
// - Controls all access to OrderLines
// - Enforces business invariants
class Order {
  private _lines: OrderLine[] = [];
  private _status: OrderStatus = "draft";
  private _shippingAddress: Address | null = null;
  private _placedAt: Date | null = null;
  private _lineIdCounter = 0;

  constructor(
    private readonly _orderId: string, // Global identity
    private readonly _customerId: string // Reference to Customer aggregate by ID (not direct reference!)
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

  get shippingAddress(): Address | null {
    return this._shippingAddress;
  }

  // Returns a read-only view of lines (protects internal state)
  get lines(): readonly OrderLine[] {
    return [...this._lines];
  }

  get lineCount(): number {
    return this._lines.length;
  }

  get total(): Money {
    return this._lines.reduce((sum, line) => sum.add(line.subtotal), new Money(0));
  }

  get isEmpty(): boolean {
    return this._lines.length === 0;
  }

  // All modifications go through the Aggregate Root
  // This ensures invariants are maintained
  addLine(productId: string, productName: string, unitPrice: Money, quantity: number): string {
    this.assertDraft();

    // Check if product already exists
    const existingLine = this._lines.find((l) => l.productId === productId);
    if (existingLine) {
      existingLine.updateQuantity(existingLine.quantity + quantity);
      return existingLine.lineId;
    }

    // Create new line with local identity
    const lineId = `line-${++this._lineIdCounter}`;
    this._lines.push(new OrderLine(lineId, productId, productName, unitPrice, quantity));
    return lineId;
  }

  updateLineQuantity(lineId: string, newQuantity: number): void {
    this.assertDraft();
    const line = this.findLineOrThrow(lineId);

    if (newQuantity <= 0) {
      this.removeLine(lineId);
    } else {
      line.updateQuantity(newQuantity);
    }
  }

  removeLine(lineId: string): void {
    this.assertDraft();
    const index = this._lines.findIndex((l) => l.lineId === lineId);
    if (index === -1) throw new Error(`Line ${lineId} not found`);
    this._lines.splice(index, 1);
  }

  setShippingAddress(address: Address): void {
    this.assertDraft();
    this._shippingAddress = address;
  }

  // Place order - transitions state and enforces invariants
  place(): void {
    this.assertDraft();

    // Enforce business invariants
    if (this.isEmpty) {
      throw new Error("Cannot place empty order");
    }
    if (!this._shippingAddress) {
      throw new Error("Shipping address is required");
    }

    this._status = "placed";
    this._placedAt = new Date();
  }

  confirm(): void {
    if (this._status !== "placed") {
      throw new Error("Can only confirm placed orders");
    }
    this._status = "confirmed";
  }

  ship(): void {
    if (this._status !== "confirmed") {
      throw new Error("Can only ship confirmed orders");
    }
    this._status = "shipped";
  }

  deliver(): void {
    if (this._status !== "shipped") {
      throw new Error("Can only deliver shipped orders");
    }
    this._status = "delivered";
  }

  cancel(): void {
    if (this._status === "delivered") {
      throw new Error("Cannot cancel delivered order");
    }
    if (this._status === "cancelled") {
      throw new Error("Order already cancelled");
    }
    this._status = "cancelled";
  }

  private assertDraft(): void {
    if (this._status !== "draft") {
      throw new Error("Cannot modify non-draft order");
    }
  }

  private findLineOrThrow(lineId: string): OrderLine {
    const line = this._lines.find((l) => l.lineId === lineId);
    if (!line) throw new Error(`Line ${lineId} not found`);
    return line;
  }
}

// ============================================
// SHOPPING CART AGGREGATE
// ============================================
// Another example showing aggregate boundaries

class CartItem {
  constructor(
    private readonly _productId: string,
    private readonly _productName: string,
    private readonly _unitPrice: Money,
    private _quantity: number
  ) {}

  get productId(): string {
    return this._productId;
  }

  get productName(): string {
    return this._productName;
  }

  get quantity(): number {
    return this._quantity;
  }

  get subtotal(): Money {
    return this._unitPrice.multiply(this._quantity);
  }

  setQuantity(quantity: number): void {
    if (quantity < 0) throw new Error("Quantity cannot be negative");
    this._quantity = quantity;
  }

  addQuantity(amount: number): void {
    this._quantity += amount;
  }
}

// AGGREGATE ROOT: ShoppingCart
class ShoppingCart {
  private _items: CartItem[] = [];
  private static readonly MAX_ITEMS = 50;
  private static readonly MAX_QUANTITY_PER_ITEM = 10;

  constructor(private readonly _cartId: string, private readonly _customerId: string) {}

  get cartId(): string {
    return this._cartId;
  }

  get customerId(): string {
    return this._customerId;
  }

  get items(): readonly CartItem[] {
    return [...this._items];
  }

  get itemCount(): number {
    return this._items.reduce((sum, item) => sum + item.quantity, 0);
  }

  get total(): Money {
    return this._items.reduce((sum, item) => sum.add(item.subtotal), new Money(0));
  }

  addItem(productId: string, productName: string, unitPrice: Money, quantity: number = 1): void {
    // Enforce invariants
    if (this._items.length >= ShoppingCart.MAX_ITEMS) {
      throw new Error(`Cart cannot have more than ${ShoppingCart.MAX_ITEMS} different items`);
    }

    const existing = this._items.find((i) => i.productId === productId);

    if (existing) {
      const newQuantity = existing.quantity + quantity;
      if (newQuantity > ShoppingCart.MAX_QUANTITY_PER_ITEM) {
        throw new Error(`Cannot add more than ${ShoppingCart.MAX_QUANTITY_PER_ITEM} of the same item`);
      }
      existing.addQuantity(quantity);
    } else {
      if (quantity > ShoppingCart.MAX_QUANTITY_PER_ITEM) {
        throw new Error(`Cannot add more than ${ShoppingCart.MAX_QUANTITY_PER_ITEM} of the same item`);
      }
      this._items.push(new CartItem(productId, productName, unitPrice, quantity));
    }
  }

  updateQuantity(productId: string, quantity: number): void {
    const item = this._items.find((i) => i.productId === productId);
    if (!item) throw new Error(`Product ${productId} not in cart`);

    if (quantity > ShoppingCart.MAX_QUANTITY_PER_ITEM) {
      throw new Error(`Cannot have more than ${ShoppingCart.MAX_QUANTITY_PER_ITEM} of the same item`);
    }

    if (quantity <= 0) {
      this.removeItem(productId);
    } else {
      item.setQuantity(quantity);
    }
  }

  removeItem(productId: string): void {
    this._items = this._items.filter((i) => i.productId !== productId);
  }

  clear(): void {
    this._items = [];
  }

  // Convert to Order aggregate (crosses aggregate boundary)
  // Returns an Order with copies of cart data (not references)
  toOrder(orderId: string): Order {
    if (this._items.length === 0) {
      throw new Error("Cannot create order from empty cart");
    }

    const order = new Order(orderId, this._customerId);
    for (const item of this._items) {
      order.addLine(item.productId, item.productName, new Money(item.subtotal.amount / item.quantity), item.quantity);
    }
    return order;
  }
}

// Usage
console.log("=== Aggregate Pattern ===\n");

// Create Order aggregate
console.log("--- Order Aggregate ---");
const order = new Order("order-001", "customer-123");

// All access goes through Aggregate Root
order.addLine("prod-1", "MacBook Pro", new Money(1999), 1);
order.addLine("prod-2", "Magic Mouse", new Money(99), 2);
order.addLine("prod-3", "USB-C Cable", new Money(19), 3);

console.log(`Order ${order.orderId} - ${order.lineCount} lines, Total: ${order.total}`);

// Access internal entities through root (read-only)
for (const line of order.lines) {
  console.log(`  - ${line.productName} x${line.quantity}: ${line.subtotal}`);
}

// Set shipping and place order
order.setShippingAddress(new Address("123 Tech Blvd", "San Francisco", "94105", "USA"));
order.place();
console.log(`\nOrder status: ${order.status}`);

// Progress through states
order.confirm();
order.ship();
order.deliver();
console.log(`Final status: ${order.status}`);

// Shopping Cart example
console.log("\n--- Shopping Cart Aggregate ---");
const cart = new ShoppingCart("cart-001", "customer-456");

cart.addItem("prod-1", "Keyboard", new Money(149), 1);
cart.addItem("prod-2", "Monitor", new Money(499), 2);
console.log(`Cart: ${cart.itemCount} items, Total: ${cart.total}`);

// Convert cart to order (crosses aggregate boundary by ID)
const newOrder = cart.toOrder("order-002");
console.log(`\nCreated ${newOrder.orderId} from cart with ${newOrder.lineCount} lines`);

export {};
