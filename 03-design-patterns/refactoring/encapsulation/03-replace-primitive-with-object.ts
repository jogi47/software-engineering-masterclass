/**
 * REPLACE PRIMITIVE WITH OBJECT
 *
 * Replace a primitive data item with a class that contains the data
 * and related behavior.
 *
 * Motivation:
 * - Simple data items often grow into more complex objects
 * - Primitives can't carry behavior
 * - Common operations on the data get scattered across the codebase
 * - Validation logic is duplicated
 *
 * Mechanics:
 * 1. Apply Encapsulate Variable if the variable isn't encapsulated
 * 2. Create a simple value class for the data value
 * 3. Change the setter to create an instance of the class
 * 4. Change the getter to return the value from the object
 * 5. Move behavior related to the value into the class
 */

// ============================================================================
// BEFORE: Using primitives for complex concepts
// ============================================================================

class OrderBefore {
  private _priority: string;

  constructor(priority: string) {
    this._priority = priority;
  }

  get priority(): string {
    return this._priority;
  }

  set priority(value: string) {
    this._priority = value;
  }
}

// Priority logic scattered everywhere
function isHighPriorityBefore(order: OrderBefore): boolean {
  return order.priority === "high" || order.priority === "rush";
}

// Validation duplicated
function setOrderPriorityBefore(order: OrderBefore, priority: string): void {
  const validPriorities = ["low", "normal", "high", "rush"];
  if (!validPriorities.includes(priority)) {
    throw new Error("Invalid priority");
  }
  order.priority = priority;
}

// ============================================================================
// AFTER: Priority as a value object
// ============================================================================

class Priority {
  private static readonly LEGAL_VALUES = ["low", "normal", "high", "rush"] as const;
  private readonly _value: string;

  constructor(value: string) {
    if (!Priority.LEGAL_VALUES.includes(value as any)) {
      throw new Error(`Invalid priority: ${value}`);
    }
    this._value = value;
  }

  // Factory methods for common values
  static low(): Priority {
    return new Priority("low");
  }

  static normal(): Priority {
    return new Priority("normal");
  }

  static high(): Priority {
    return new Priority("high");
  }

  static rush(): Priority {
    return new Priority("rush");
  }

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }

  // Behavior now lives on the object
  get isHighPriority(): boolean {
    return this._value === "high" || this._value === "rush";
  }

  get isLowPriority(): boolean {
    return this._value === "low";
  }

  // Comparison behavior
  equals(other: Priority): boolean {
    return this._value === other._value;
  }

  higherThan(other: Priority): boolean {
    const index = Priority.LEGAL_VALUES.indexOf(this._value as any);
    const otherIndex = Priority.LEGAL_VALUES.indexOf(other._value as any);
    return index > otherIndex;
  }

  lowerThan(other: Priority): boolean {
    return other.higherThan(this);
  }
}

class Order {
  private _priority: Priority;

  constructor(priority: Priority | string) {
    this._priority = typeof priority === "string" ? new Priority(priority) : priority;
  }

  get priority(): Priority {
    return this._priority;
  }

  set priority(value: Priority | string) {
    this._priority = typeof value === "string" ? new Priority(value) : value;
  }

  // Now uses the object's behavior
  get isHighPriority(): boolean {
    return this._priority.isHighPriority;
  }
}

// ============================================================================
// ANOTHER EXAMPLE: Phone number
// ============================================================================

class PhoneNumber {
  private readonly _number: string;

  constructor(number: string) {
    // Normalize and validate
    const cleaned = number.replace(/\D/g, "");
    if (cleaned.length < 10 || cleaned.length > 15) {
      throw new Error(`Invalid phone number: ${number}`);
    }
    this._number = cleaned;
  }

  get number(): string {
    return this._number;
  }

  // Formatted output
  get formatted(): string {
    if (this._number.length === 10) {
      return `(${this._number.slice(0, 3)}) ${this._number.slice(3, 6)}-${this._number.slice(6)}`;
    }
    if (this._number.length === 11) {
      return `+${this._number[0]} (${this._number.slice(1, 4)}) ${this._number.slice(4, 7)}-${this._number.slice(7)}`;
    }
    return this._number;
  }

  get areaCode(): string {
    return this._number.length === 10 ? this._number.slice(0, 3) : this._number.slice(1, 4);
  }

  equals(other: PhoneNumber): boolean {
    return this._number === other._number;
  }
}

// ============================================================================
// ANOTHER EXAMPLE: Money
// ============================================================================

class Money {
  private readonly _amount: number;
  private readonly _currency: string;

  constructor(amount: number, currency: string = "USD") {
    if (amount < 0) {
      throw new Error("Amount cannot be negative");
    }
    this._amount = Math.round(amount * 100) / 100; // Round to cents
    this._currency = currency.toUpperCase();
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }

  toString(): string {
    return `${this._currency} ${this._amount.toFixed(2)}`;
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    const result = this._amount - other._amount;
    if (result < 0) {
      throw new Error("Result would be negative");
    }
    return new Money(result, this._currency);
  }

  multiply(factor: number): Money {
    return new Money(this._amount * factor, this._currency);
  }

  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }

  greaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amount > other._amount;
  }

  private assertSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new Error(`Currency mismatch: ${this._currency} vs ${other._currency}`);
    }
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Replace Primitive with Object Refactoring ===\n");

console.log("--- Priority Value Object ---");
const order1 = new Order("rush");
const order2 = new Order(Priority.normal());

console.log(`Order 1 priority: ${order1.priority}`);
console.log(`Order 1 is high priority: ${order1.isHighPriority}`);
console.log(`Order 2 priority: ${order2.priority}`);
console.log(`Order 1 higher than Order 2: ${order1.priority.higherThan(order2.priority)}`);

console.log("\n--- Phone Number ---");
const phone = new PhoneNumber("555-123-4567");
console.log(`Raw: ${phone.number}`);
console.log(`Formatted: ${phone.formatted}`);
console.log(`Area code: ${phone.areaCode}`);

const phone2 = new PhoneNumber("5551234567");
console.log(`Same numbers equal: ${phone.equals(phone2)}`);

console.log("\n--- Money ---");
const price = new Money(19.99);
const tax = new Money(1.60);
const total = price.add(tax);

console.log(`Price: ${price}`);
console.log(`Tax: ${tax}`);
console.log(`Total: ${total}`);

const doubled = price.multiply(2);
console.log(`Doubled: ${doubled}`);

console.log("\nTrying invalid operations:");
try {
  new Money(-10);
} catch (e) {
  console.log(`Error: ${(e as Error).message}`);
}

export {};
