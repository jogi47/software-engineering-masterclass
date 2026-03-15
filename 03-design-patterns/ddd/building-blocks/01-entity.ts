/**
 * ENTITY
 *
 * An object that is defined by its identity rather than its attributes.
 * Two entities are equal if they have the same identity, even if their
 * attributes differ.
 *
 * Characteristics:
 * - Has a unique identity (usually an ID)
 * - Identity remains constant throughout its lifecycle
 * - Attributes can change, but identity stays the same
 * - Equality is based on identity, not attribute values
 * - Has a lifecycle (creation, modification, deletion)
 *
 * When to use:
 * - Objects that need to be tracked over time
 * - Objects that can change but must remain identifiable
 * - Examples: User, Order, Product, Account, Transaction
 *
 * Key distinction from Value Object:
 * - Entity: "Who/which one is it?" (identity matters)
 * - Value Object: "What is it?" (attributes matter)
 */

// Base Entity class with identity
abstract class Entity<TId> {
  constructor(protected readonly _id: TId) {}

  get id(): TId {
    return this._id;
  }

  // Equality based on identity, not attributes
  equals(other: Entity<TId>): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (!(other instanceof Entity)) {
      return false;
    }
    return this._id === other._id;
  }
}

// Value Object for comparison (immutable, equality by value)
class Email {
  constructor(private readonly _value: string) {
    if (!this.isValid(_value)) {
      throw new Error(`Invalid email: ${_value}`);
    }
  }

  private isValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  get value(): string {
    return this._value;
  }

  equals(other: Email): boolean {
    return this._value === other._value;
  }
}

// Entity: User
// Identity: userId
// Even if name/email changes, it's still the same User
class User extends Entity<string> {
  private _name: string;
  private _email: Email;
  private _createdAt: Date;
  private _updatedAt: Date;

  constructor(id: string, name: string, email: Email) {
    super(id);
    this._name = name;
    this._email = email;
    this._createdAt = new Date();
    this._updatedAt = new Date();
  }

  get name(): string {
    return this._name;
  }

  get email(): Email {
    return this._email;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // Attributes can change, but identity (id) stays the same
  changeName(newName: string): void {
    if (!newName || newName.trim().length === 0) {
      throw new Error("Name cannot be empty");
    }
    this._name = newName;
    this._updatedAt = new Date();
  }

  changeEmail(newEmail: Email): void {
    this._email = newEmail;
    this._updatedAt = new Date();
  }
}

// Entity: Order
// Identity: orderId
// Order items and status can change, but it's still the same order
class Order extends Entity<string> {
  private _customerId: string;
  private _items: OrderItem[] = [];
  private _status: OrderStatus = "pending";
  private _placedAt: Date;

  constructor(id: string, customerId: string) {
    super(id);
    this._customerId = customerId;
    this._placedAt = new Date();
  }

  get customerId(): string {
    return this._customerId;
  }

  get items(): readonly OrderItem[] {
    return this._items;
  }

  get status(): OrderStatus {
    return this._status;
  }

  get total(): number {
    return this._items.reduce((sum, item) => sum + item.subtotal, 0);
  }

  addItem(productId: string, productName: string, price: number, quantity: number): void {
    if (this._status !== "pending") {
      throw new Error("Cannot modify confirmed order");
    }
    const existingItem = this._items.find((item) => item.productId === productId);
    if (existingItem) {
      existingItem.increaseQuantity(quantity);
    } else {
      this._items.push(new OrderItem(productId, productName, price, quantity));
    }
  }

  removeItem(productId: string): void {
    if (this._status !== "pending") {
      throw new Error("Cannot modify confirmed order");
    }
    this._items = this._items.filter((item) => item.productId !== productId);
  }

  confirm(): void {
    if (this._items.length === 0) {
      throw new Error("Cannot confirm empty order");
    }
    this._status = "confirmed";
  }

  ship(): void {
    if (this._status !== "confirmed") {
      throw new Error("Order must be confirmed before shipping");
    }
    this._status = "shipped";
  }

  deliver(): void {
    if (this._status !== "shipped") {
      throw new Error("Order must be shipped before delivery");
    }
    this._status = "delivered";
  }

  cancel(): void {
    if (this._status === "delivered") {
      throw new Error("Cannot cancel delivered order");
    }
    this._status = "cancelled";
  }
}

type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

// OrderItem could be an Entity or Value Object depending on requirements
// Here it's treated as an Entity (has identity within the order context)
class OrderItem {
  constructor(
    public readonly productId: string,
    public readonly productName: string,
    public readonly price: number,
    private _quantity: number
  ) {}

  get quantity(): number {
    return this._quantity;
  }

  get subtotal(): number {
    return this.price * this._quantity;
  }

  increaseQuantity(amount: number): void {
    this._quantity += amount;
  }

  decreaseQuantity(amount: number): void {
    if (this._quantity - amount < 1) {
      throw new Error("Quantity cannot be less than 1");
    }
    this._quantity -= amount;
  }
}

// Usage
console.log("=== Entity Pattern ===\n");

// Create users
const user1 = new User("user-1", "Alice", new Email("alice@example.com"));
const user2 = new User("user-2", "Bob", new Email("bob@example.com"));

// Create another reference to "same" user (same ID)
const user1Copy = new User("user-1", "Alice Smith", new Email("alice.smith@example.com"));

console.log("--- Entity Identity ---");
console.log(`user1.id: ${user1.id}`);
console.log(`user1Copy.id: ${user1Copy.id}`);
console.log(`user1.equals(user1Copy): ${user1.equals(user1Copy)}`); // true - same identity
console.log(`user1.equals(user2): ${user1.equals(user2)}`); // false - different identity

// Change attributes - still same entity
console.log("\n--- Attribute Changes ---");
console.log(`Before: ${user1.name} (${user1.email.value})`);
user1.changeName("Alice Johnson");
user1.changeEmail(new Email("alice.johnson@example.com"));
console.log(`After: ${user1.name} (${user1.email.value})`);
console.log(`Still same entity? ${user1.id === "user-1"}`); // true

// Order entity with lifecycle
console.log("\n--- Order Entity Lifecycle ---");
const order = new Order("order-123", user1.id);

order.addItem("prod-1", "Laptop", 999.99, 1);
order.addItem("prod-2", "Mouse", 29.99, 2);
console.log(`Order ${order.id} - Status: ${order.status}, Total: $${order.total.toFixed(2)}`);

order.confirm();
console.log(`After confirm - Status: ${order.status}`);

order.ship();
console.log(`After ship - Status: ${order.status}`);

order.deliver();
console.log(`After deliver - Status: ${order.status}`);

// Entity identity persists through all state changes
console.log(`\nOrder ID unchanged: ${order.id}`);

export {};
