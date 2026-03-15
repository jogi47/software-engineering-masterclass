/**
 * VALUE OBJECT
 *
 * An object that is defined by its attributes rather than a unique identity.
 * Two Value Objects are equal if all their attributes are equal.
 *
 * Characteristics:
 * - Immutable (cannot be changed after creation)
 * - No identity (no ID field needed)
 * - Equality based on all attribute values
 * - Can be freely shared and replaced
 * - Side-effect free operations (return new instances)
 * - Self-validating (validates on construction)
 *
 * When to use:
 * - Describing aspects of the domain with no conceptual identity
 * - When you care about WHAT it is, not WHICH one it is
 * - Examples: Money, Address, DateRange, Email, PhoneNumber, Coordinates
 *
 * Benefits:
 * - Simpler to reason about (immutable)
 * - Thread-safe by default
 * - Can be cached and reused
 * - Express domain concepts clearly
 */

// VALUE OBJECT: Money
// Immutable, equality by value, self-validating
class Money {
  private constructor(
    private readonly _amount: number,
    private readonly _currency: Currency
  ) {}

  static create(amount: number, currency: Currency): Money {
    if (amount < 0) {
      throw new Error("Amount cannot be negative");
    }
    // Round to 2 decimal places to avoid floating point issues
    const roundedAmount = Math.round(amount * 100) / 100;
    return new Money(roundedAmount, currency);
  }

  static zero(currency: Currency): Money {
    return new Money(0, currency);
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): Currency {
    return this._currency;
  }

  // All operations return NEW instances (immutable)
  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.create(this._amount + other._amount, this._currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    if (this._amount < other._amount) {
      throw new Error("Result would be negative");
    }
    return Money.create(this._amount - other._amount, this._currency);
  }

  multiply(factor: number): Money {
    return Money.create(this._amount * factor, this._currency);
  }

  percentage(percent: number): Money {
    return Money.create(this._amount * (percent / 100), this._currency);
  }

  // Value-based equality
  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency.equals(other._currency);
  }

  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amount > other._amount;
  }

  isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amount < other._amount;
  }

  private assertSameCurrency(other: Money): void {
    if (!this._currency.equals(other._currency)) {
      throw new Error(`Currency mismatch: ${this._currency.code} vs ${other._currency.code}`);
    }
  }

  toString(): string {
    return `${this._currency.symbol}${this._amount.toFixed(2)}`;
  }
}

// VALUE OBJECT: Currency
class Currency {
  private static readonly CURRENCIES = new Map<string, Currency>();

  private constructor(
    private readonly _code: string,
    private readonly _symbol: string,
    private readonly _name: string
  ) {}

  static of(code: string): Currency {
    const existing = Currency.CURRENCIES.get(code);
    if (existing) return existing;
    throw new Error(`Unknown currency: ${code}`);
  }

  static register(code: string, symbol: string, name: string): Currency {
    const currency = new Currency(code, symbol, name);
    Currency.CURRENCIES.set(code, currency);
    return currency;
  }

  get code(): string {
    return this._code;
  }

  get symbol(): string {
    return this._symbol;
  }

  get name(): string {
    return this._name;
  }

  equals(other: Currency): boolean {
    return this._code === other._code;
  }
}

// Register common currencies
const USD = Currency.register("USD", "$", "US Dollar");
const EUR = Currency.register("EUR", "€", "Euro");
const GBP = Currency.register("GBP", "£", "British Pound");

// VALUE OBJECT: Address
class Address {
  private constructor(
    private readonly _street: string,
    private readonly _city: string,
    private readonly _state: string,
    private readonly _zipCode: string,
    private readonly _country: string
  ) {}

  static create(street: string, city: string, state: string, zipCode: string, country: string): Address {
    if (!street.trim()) throw new Error("Street is required");
    if (!city.trim()) throw new Error("City is required");
    if (!zipCode.trim()) throw new Error("Zip code is required");
    if (!country.trim()) throw new Error("Country is required");
    return new Address(street.trim(), city.trim(), state.trim(), zipCode.trim(), country.trim());
  }

  get street(): string {
    return this._street;
  }
  get city(): string {
    return this._city;
  }
  get state(): string {
    return this._state;
  }
  get zipCode(): string {
    return this._zipCode;
  }
  get country(): string {
    return this._country;
  }

  // "With" methods return new instances (immutable updates)
  withStreet(street: string): Address {
    return Address.create(street, this._city, this._state, this._zipCode, this._country);
  }

  withCity(city: string): Address {
    return Address.create(this._street, city, this._state, this._zipCode, this._country);
  }

  equals(other: Address): boolean {
    return (
      this._street === other._street &&
      this._city === other._city &&
      this._state === other._state &&
      this._zipCode === other._zipCode &&
      this._country === other._country
    );
  }

  format(): string {
    return `${this._street}\n${this._city}, ${this._state} ${this._zipCode}\n${this._country}`;
  }
}

// VALUE OBJECT: DateRange
class DateRange {
  private constructor(
    private readonly _start: Date,
    private readonly _end: Date
  ) {}

  static create(start: Date, end: Date): DateRange {
    if (start > end) {
      throw new Error("Start date must be before or equal to end date");
    }
    return new DateRange(new Date(start), new Date(end));
  }

  static forDays(start: Date, days: number): DateRange {
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    return DateRange.create(start, end);
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

  // Extend creates a new DateRange
  extendByDays(days: number): DateRange {
    const newEnd = new Date(this._end);
    newEnd.setDate(newEnd.getDate() + days);
    return DateRange.create(this._start, newEnd);
  }

  equals(other: DateRange): boolean {
    return this._start.getTime() === other._start.getTime() && this._end.getTime() === other._end.getTime();
  }

  toString(): string {
    const formatDate = (d: Date) => d.toISOString().split("T")[0];
    return `${formatDate(this._start)} to ${formatDate(this._end)}`;
  }
}

// VALUE OBJECT: Percentage
class Percentage {
  private constructor(private readonly _value: number) {}

  static create(value: number): Percentage {
    if (value < 0 || value > 100) {
      throw new Error("Percentage must be between 0 and 100");
    }
    return new Percentage(value);
  }

  static fromDecimal(decimal: number): Percentage {
    return Percentage.create(decimal * 100);
  }

  get value(): number {
    return this._value;
  }

  get decimal(): number {
    return this._value / 100;
  }

  applyTo(amount: number): number {
    return amount * this.decimal;
  }

  equals(other: Percentage): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return `${this._value}%`;
  }
}

// Usage
console.log("=== Value Object Pattern ===\n");

// Money - immutable operations
console.log("--- Money ---");
const price = Money.create(100, USD);
const tax = price.percentage(8.5);
const total = price.add(tax);
console.log(`Price: ${price}`);
console.log(`Tax (8.5%): ${tax}`);
console.log(`Total: ${total}`);
console.log(`Original price unchanged: ${price}`); // Still $100.00

// Value equality
const samePrice = Money.create(100, USD);
console.log(`\nprice.equals(samePrice): ${price.equals(samePrice)}`); // true
console.log(`price === samePrice: ${price === samePrice}`); // false (different objects)

// Address - immutable with "with" methods
console.log("\n--- Address ---");
const address = Address.create("123 Main St", "New York", "NY", "10001", "USA");
console.log("Original:");
console.log(address.format());

const newAddress = address.withCity("Boston").withStreet("456 Oak Ave");
console.log("\nNew address (city and street changed):");
console.log(newAddress.format());

console.log("\nOriginal unchanged:");
console.log(address.format());

// DateRange
console.log("\n--- DateRange ---");
const vacation = DateRange.create(new Date("2024-07-01"), new Date("2024-07-15"));
const meeting = DateRange.forDays(new Date("2024-07-10"), 2);
console.log(`Vacation: ${vacation} (${vacation.days} days)`);
console.log(`Meeting: ${meeting}`);
console.log(`Overlap: ${vacation.overlaps(meeting)}`);

// Extended vacation creates new DateRange
const extendedVacation = vacation.extendByDays(5);
console.log(`Extended: ${extendedVacation} (${extendedVacation.days} days)`);
console.log(`Original unchanged: ${vacation}`);

// Percentage
console.log("\n--- Percentage ---");
const discount = Percentage.create(20);
const originalPrice = 150;
const discountAmount = discount.applyTo(originalPrice);
console.log(`${discount} off $${originalPrice} = $${discountAmount} discount`);
console.log(`Final price: $${originalPrice - discountAmount}`);

export {};
