/**
 * VALUE OBJECT
 *
 * A small object whose equality isn't based on identity but on value.
 * Two Value Objects are equal if all their fields are equal.
 *
 * Characteristics:
 * - Immutable (cannot be changed after creation)
 * - Equality based on value, not reference
 * - No identity (no ID field)
 * - Can be freely shared and copied
 * - Examples: Money, DateRange, Address, Email
 */

// VALUE OBJECT: Money
class Money {
  constructor(
    private readonly _amount: number,
    private readonly _currency: string
  ) {
    if (_amount < 0) {
      throw new Error("Amount cannot be negative");
    }
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }

  // Operations return new instances (immutable)
  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._amount - other._amount, this._currency);
  }

  multiply(factor: number): Money {
    return new Money(this._amount * factor, this._currency);
  }

  // Value-based equality
  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }

  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amount > other._amount;
  }

  private assertSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new Error(`Currency mismatch: ${this._currency} vs ${other._currency}`);
    }
  }

  toString(): string {
    return `${this._currency} ${this._amount.toFixed(2)}`;
  }
}

// VALUE OBJECT: DateRange
class DateRange {
  constructor(
    private readonly _start: Date,
    private readonly _end: Date
  ) {
    if (_start > _end) {
      throw new Error("Start date must be before end date");
    }
  }

  get start(): Date {
    return new Date(this._start);
  }

  get end(): Date {
    return new Date(this._end);
  }

  get days(): number {
    const diff = this._end.getTime() - this._start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  contains(date: Date): boolean {
    return date >= this._start && date <= this._end;
  }

  overlaps(other: DateRange): boolean {
    return this._start <= other._end && this._end >= other._start;
  }

  equals(other: DateRange): boolean {
    return this._start.getTime() === other._start.getTime() && this._end.getTime() === other._end.getTime();
  }

  toString(): string {
    return `${this._start.toISOString().split("T")[0]} to ${this._end.toISOString().split("T")[0]}`;
  }
}

// VALUE OBJECT: Email
class Email {
  private readonly _value: string;

  constructor(value: string) {
    if (!this.isValid(value)) {
      throw new Error(`Invalid email: ${value}`);
    }
    this._value = value.toLowerCase();
  }

  private isValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  get value(): string {
    return this._value;
  }

  get domain(): string {
    return this._value.split("@")[1];
  }

  get localPart(): string {
    return this._value.split("@")[0];
  }

  equals(other: Email): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}

// VALUE OBJECT: Address
class Address {
  constructor(
    private readonly _street: string,
    private readonly _city: string,
    private readonly _zipCode: string,
    private readonly _country: string
  ) {}

  get street(): string {
    return this._street;
  }
  get city(): string {
    return this._city;
  }
  get zipCode(): string {
    return this._zipCode;
  }
  get country(): string {
    return this._country;
  }

  // To change address, create a new one (immutable)
  withStreet(newStreet: string): Address {
    return new Address(newStreet, this._city, this._zipCode, this._country);
  }

  withCity(newCity: string): Address {
    return new Address(this._street, newCity, this._zipCode, this._country);
  }

  equals(other: Address): boolean {
    return (
      this._street === other._street &&
      this._city === other._city &&
      this._zipCode === other._zipCode &&
      this._country === other._country
    );
  }

  format(): string {
    return `${this._street}\n${this._city}, ${this._zipCode}\n${this._country}`;
  }
}

// Usage
console.log("=== Value Object Pattern ===\n");

// Money
console.log("--- Money ---");
const price = new Money(100, "USD");
const tax = new Money(8.5, "USD");
const total = price.add(tax);
console.log(`Price: ${price}`);
console.log(`Tax: ${tax}`);
console.log(`Total: ${total}`);
console.log(`Double total: ${total.multiply(2)}`);

const samePrice = new Money(100, "USD");
console.log(`price.equals(samePrice): ${price.equals(samePrice)}`); // true (value equality)
console.log(`price === samePrice: ${price === samePrice}`); // false (different objects)

// DateRange
console.log("\n--- DateRange ---");
const vacation = new DateRange(new Date("2024-07-01"), new Date("2024-07-15"));
const meeting = new DateRange(new Date("2024-07-10"), new Date("2024-07-12"));
console.log(`Vacation: ${vacation} (${vacation.days} days)`);
console.log(`Meeting: ${meeting}`);
console.log(`Overlaps: ${vacation.overlaps(meeting)}`);
console.log(`Vacation contains July 5: ${vacation.contains(new Date("2024-07-05"))}`);

// Email
console.log("\n--- Email ---");
const email = new Email("User@Example.COM");
console.log(`Email: ${email}`); // Normalized to lowercase
console.log(`Domain: ${email.domain}`);
console.log(`Local part: ${email.localPart}`);

// Address
console.log("\n--- Address ---");
const address = new Address("123 Main St", "New York", "10001", "USA");
console.log("Original address:");
console.log(address.format());

// Changing creates a new address (original unchanged)
const newAddress = address.withCity("Boston");
console.log("\nNew address (changed city):");
console.log(newAddress.format());
console.log("\nOriginal unchanged:");
console.log(address.format());

// Make this file a module to avoid global scope pollution
export {};
