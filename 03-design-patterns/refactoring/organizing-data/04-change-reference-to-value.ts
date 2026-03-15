/**
 * CHANGE REFERENCE TO VALUE
 *
 * Treat a reference object as a value object by making it immutable.
 *
 * Motivation:
 * - Value objects are simpler to reason about
 * - No need to worry about who else might modify them
 * - Safe to share without copying
 * - Equality is based on contents, not identity
 * - Immutability prevents subtle bugs from aliasing
 *
 * Mechanics:
 * 1. Make the candidate class immutable
 * 2. Remove any setters
 * 3. Create a factory that takes all values
 * 4. Implement equals based on field values
 */

// ============================================================================
// BEFORE: Mutable reference object
// ============================================================================

class TelephoneNumberBefore {
  private _areaCode: string;
  private _number: string;

  constructor(areaCode: string, number: string) {
    this._areaCode = areaCode;
    this._number = number;
  }

  get areaCode(): string {
    return this._areaCode;
  }

  set areaCode(value: string) {
    this._areaCode = value;
  }

  get number(): string {
    return this._number;
  }

  set number(value: string) {
    this._number = value;
  }

  toString(): string {
    return `(${this._areaCode}) ${this._number}`;
  }
}

// Problem: Aliasing can cause unexpected changes
class PersonBefore {
  private _phone: TelephoneNumberBefore;

  constructor(phone: TelephoneNumberBefore) {
    this._phone = phone;
  }

  get phone(): TelephoneNumberBefore {
    return this._phone;
  }
}

// ============================================================================
// AFTER: Immutable value object
// ============================================================================

class TelephoneNumber {
  private readonly _areaCode: string;
  private readonly _number: string;

  constructor(areaCode: string, number: string) {
    this._areaCode = areaCode;
    this._number = number;
  }

  get areaCode(): string {
    return this._areaCode;
  }

  get number(): string {
    return this._number;
  }

  // To change, create a new instance
  withAreaCode(newAreaCode: string): TelephoneNumber {
    return new TelephoneNumber(newAreaCode, this._number);
  }

  withNumber(newNumber: string): TelephoneNumber {
    return new TelephoneNumber(this._areaCode, newNumber);
  }

  // Value-based equality
  equals(other: TelephoneNumber): boolean {
    return this._areaCode === other._areaCode && this._number === other._number;
  }

  toString(): string {
    return `(${this._areaCode}) ${this._number}`;
  }
}

class Person {
  private _phone: TelephoneNumber;

  constructor(phone: TelephoneNumber) {
    this._phone = phone;
  }

  get phone(): TelephoneNumber {
    return this._phone;
  }

  set phone(value: TelephoneNumber) {
    this._phone = value; // Replace entirely, don't mutate
  }
}

// ============================================================================
// EXAMPLE: Money as a value object
// ============================================================================

class Money {
  private readonly _amount: number;
  private readonly _currency: string;

  constructor(amount: number, currency: string) {
    this._amount = Math.round(amount * 100) / 100;
    this._currency = currency.toUpperCase();
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }

  // Operations return new instances
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

  // Value equality
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

// ============================================================================
// EXAMPLE: Date range as a value object
// ============================================================================

class DateRange {
  private readonly _start: Date;
  private readonly _end: Date;

  constructor(start: Date, end: Date) {
    if (start > end) {
      throw new Error("Start date must be before end date");
    }
    this._start = new Date(start);
    this._end = new Date(end);
  }

  get start(): Date {
    return new Date(this._start);
  }

  get end(): Date {
    return new Date(this._end);
  }

  // Operations return new ranges
  extendBy(days: number): DateRange {
    const newEnd = new Date(this._end);
    newEnd.setDate(newEnd.getDate() + days);
    return new DateRange(this._start, newEnd);
  }

  shiftBy(days: number): DateRange {
    const newStart = new Date(this._start);
    const newEnd = new Date(this._end);
    newStart.setDate(newStart.getDate() + days);
    newEnd.setDate(newEnd.getDate() + days);
    return new DateRange(newStart, newEnd);
  }

  contains(date: Date): boolean {
    return date >= this._start && date <= this._end;
  }

  overlaps(other: DateRange): boolean {
    return this._start <= other._end && this._end >= other._start;
  }

  equals(other: DateRange): boolean {
    return (
      this._start.getTime() === other._start.getTime() &&
      this._end.getTime() === other._end.getTime()
    );
  }

  get lengthInDays(): number {
    return Math.ceil(
      (this._end.getTime() - this._start.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  toString(): string {
    return `${this._start.toISOString().split("T")[0]} to ${this._end.toISOString().split("T")[0]}`;
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Change Reference to Value Refactoring ===\n");

console.log("--- Before: Mutable reference ---");
const phoneBefore = new TelephoneNumberBefore("555", "123-4567");
const personBefore = new PersonBefore(phoneBefore);
console.log(`Phone: ${personBefore.phone}`);

// Danger: Modifying the reference affects the person
phoneBefore.areaCode = "666";
console.log(`After mutation: ${personBefore.phone}`);

console.log("\n--- After: Immutable value ---");
const phone = new TelephoneNumber("555", "123-4567");
const person = new Person(phone);
console.log(`Phone: ${person.phone}`);

// To change, we must explicitly set a new value
person.phone = phone.withAreaCode("666");
console.log(`After update: ${person.phone}`);

console.log(`\nOriginal phone unchanged: ${phone}`);

console.log("\n--- Money value object ---");
const price = new Money(100, "USD");
const tax = new Money(8, "USD");
const total = price.add(tax);

console.log(`Price: ${price}`);
console.log(`Tax: ${tax}`);
console.log(`Total: ${total}`);
console.log(`Original price still: ${price}`);

const discount = new Money(10, "USD");
const discounted = total.subtract(discount);
console.log(`After discount: ${discounted}`);

console.log("\n--- Date range value object ---");
const range = new DateRange(new Date("2024-01-01"), new Date("2024-01-31"));
console.log(`Range: ${range}`);
console.log(`Length: ${range.lengthInDays} days`);

const extended = range.extendBy(7);
console.log(`Extended: ${extended}`);
console.log(`Original unchanged: ${range}`);

const today = new Date("2024-01-15");
console.log(`Contains Jan 15: ${range.contains(today)}`);

export {};
