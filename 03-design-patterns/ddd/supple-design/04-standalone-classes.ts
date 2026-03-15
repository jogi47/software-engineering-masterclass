/**
 * STANDALONE CLASSES
 *
 * Classes that are self-contained and can be understood in isolation.
 * They have minimal dependencies on other classes, making them easier
 * to understand, test, and reuse.
 *
 * Characteristics:
 * - Low coupling with other domain objects
 * - Can be understood without looking at other classes
 * - Self-contained logic and behavior
 * - Minimal external dependencies
 * - Often Value Objects are naturally standalone
 *
 * When to use:
 * - When a concept can exist independently
 * - When you want to reduce coupling
 * - When a class represents a complete, self-contained concept
 * - For reusable domain components
 *
 * Benefits:
 * - Easier to understand
 * - Easier to test in isolation
 * - More reusable across contexts
 * - Reduces cognitive load
 * - Simplifies the overall model
 *
 * Design approach:
 * - Push dependencies out of the class
 * - Use primitive types or other standalone classes
 * - Prefer composition over inheritance
 * - Make implicit concepts explicit as separate classes
 */

// ============================================
// STANDALONE VALUE OBJECTS
// ============================================

/**
 * Money - completely self-contained
 * No dependencies on any other domain classes
 */
class Money {
  private constructor(
    private readonly _amount: number,
    private readonly _currency: string
  ) {}

  static of(amount: number, currency: string = "USD"): Money {
    if (amount < 0) throw new Error("Amount cannot be negative");
    return new Money(Math.round(amount * 100) / 100, currency.toUpperCase());
  }

  static zero(currency: string = "USD"): Money {
    return new Money(0, currency.toUpperCase());
  }

  static sum(monies: Money[]): Money {
    if (monies.length === 0) return Money.zero();
    const currency = monies[0]._currency;
    return monies.reduce((sum, m) => sum.add(m), Money.zero(currency));
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.of(this._amount + other._amount, this._currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.of(this._amount - other._amount, this._currency);
  }

  multiply(factor: number): Money {
    return Money.of(this._amount * factor, this._currency);
  }

  divide(divisor: number): Money {
    if (divisor === 0) throw new Error("Cannot divide by zero");
    return Money.of(this._amount / divisor, this._currency);
  }

  percentage(percent: number): Money {
    return Money.of(this._amount * (percent / 100), this._currency);
  }

  isZero(): boolean {
    return this._amount === 0;
  }

  isPositive(): boolean {
    return this._amount > 0;
  }

  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amount > other._amount;
  }

  isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amount < other._amount;
  }

  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }

  private assertSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new Error(`Currency mismatch: ${this._currency} vs ${other._currency}`);
    }
  }

  toString(): string {
    return `${this._currency} ${this._amount.toFixed(2)}`;
  }

  toFormattedString(): string {
    const symbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£" };
    const symbol = symbols[this._currency] || this._currency;
    return `${symbol}${this._amount.toFixed(2)}`;
  }
}

/**
 * Email - standalone, self-validating value object
 */
class Email {
  private constructor(private readonly _value: string) {}

  static create(value: string): Email {
    const trimmed = value.trim().toLowerCase();
    if (!Email.isValidFormat(trimmed)) {
      throw new Error(`Invalid email format: ${value}`);
    }
    return new Email(trimmed);
  }

  static isValidFormat(email: string): boolean {
    return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email);
  }

  get value(): string {
    return this._value;
  }

  get localPart(): string {
    return this._value.split("@")[0];
  }

  get domain(): string {
    return this._value.split("@")[1];
  }

  equals(other: Email): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}

/**
 * PhoneNumber - standalone value object with formatting logic
 */
class PhoneNumber {
  private constructor(
    private readonly _countryCode: string,
    private readonly _number: string
  ) {}

  static create(countryCode: string, number: string): PhoneNumber {
    const cleanNumber = number.replace(/\D/g, "");
    if (cleanNumber.length < 7 || cleanNumber.length > 15) {
      throw new Error("Phone number must be 7-15 digits");
    }
    return new PhoneNumber(countryCode.replace(/\D/g, ""), cleanNumber);
  }

  static parse(fullNumber: string): PhoneNumber {
    const cleaned = fullNumber.replace(/\D/g, "");
    if (cleaned.length < 10) {
      throw new Error("Cannot parse phone number");
    }
    // Assume first 1-3 digits are country code
    const countryCode = cleaned.slice(0, cleaned.length - 10);
    const number = cleaned.slice(-10);
    return new PhoneNumber(countryCode || "1", number);
  }

  get countryCode(): string {
    return this._countryCode;
  }

  get number(): string {
    return this._number;
  }

  format(): string {
    const n = this._number;
    if (n.length === 10) {
      return `+${this._countryCode} (${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
    }
    return `+${this._countryCode} ${n}`;
  }

  equals(other: PhoneNumber): boolean {
    return this._countryCode === other._countryCode && this._number === other._number;
  }

  toString(): string {
    return `+${this._countryCode}${this._number}`;
  }
}

/**
 * DateRange - standalone value object for time periods
 */
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

  static forWeeks(start: Date, weeks: number): DateRange {
    return DateRange.forDays(start, weeks * 7);
  }

  static forMonths(start: Date, months: number): DateRange {
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);
    return DateRange.create(start, end);
  }

  get start(): Date {
    return new Date(this._start);
  }

  get end(): Date {
    return new Date(this._end);
  }

  getDurationInDays(): number {
    const diff = this._end.getTime() - this._start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  getDurationInWeeks(): number {
    return Math.ceil(this.getDurationInDays() / 7);
  }

  contains(date: Date): boolean {
    return date >= this._start && date <= this._end;
  }

  overlaps(other: DateRange): boolean {
    return this._start <= other._end && this._end >= other._start;
  }

  isFullyBefore(other: DateRange): boolean {
    return this._end < other._start;
  }

  isFullyAfter(other: DateRange): boolean {
    return this._start > other._end;
  }

  intersection(other: DateRange): DateRange | null {
    if (!this.overlaps(other)) return null;
    const start = new Date(Math.max(this._start.getTime(), other._start.getTime()));
    const end = new Date(Math.min(this._end.getTime(), other._end.getTime()));
    return DateRange.create(start, end);
  }

  union(other: DateRange): DateRange {
    const start = new Date(Math.min(this._start.getTime(), other._start.getTime()));
    const end = new Date(Math.max(this._end.getTime(), other._end.getTime()));
    return DateRange.create(start, end);
  }

  extend(days: number): DateRange {
    const newEnd = new Date(this._end);
    newEnd.setDate(newEnd.getDate() + days);
    return DateRange.create(this._start, newEnd);
  }

  toString(): string {
    const format = (d: Date) => d.toISOString().split("T")[0];
    return `${format(this._start)} to ${format(this._end)}`;
  }
}

/**
 * Percentage - standalone for percentage calculations
 */
class Percentage {
  private constructor(private readonly _value: number) {}

  static of(value: number): Percentage {
    if (value < 0 || value > 100) {
      throw new Error("Percentage must be between 0 and 100");
    }
    return new Percentage(value);
  }

  static fromDecimal(decimal: number): Percentage {
    return Percentage.of(decimal * 100);
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

  applyToMoney(money: Money): Money {
    return money.percentage(this._value);
  }

  add(other: Percentage): Percentage {
    return Percentage.of(this._value + other._value);
  }

  subtract(other: Percentage): Percentage {
    return Percentage.of(this._value - other._value);
  }

  complement(): Percentage {
    return Percentage.of(100 - this._value);
  }

  equals(other: Percentage): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return `${this._value}%`;
  }
}

/**
 * Address - standalone value object
 */
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

    return new Address(street.trim(), city.trim(), state.trim(), zipCode.trim().toUpperCase(), country.trim());
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

  withStreet(street: string): Address {
    return Address.create(street, this._city, this._state, this._zipCode, this._country);
  }

  withCity(city: string): Address {
    return Address.create(this._street, city, this._state, this._zipCode, this._country);
  }

  formatSingleLine(): string {
    return `${this._street}, ${this._city}, ${this._state} ${this._zipCode}, ${this._country}`;
  }

  formatMultiLine(): string {
    return `${this._street}\n${this._city}, ${this._state} ${this._zipCode}\n${this._country}`;
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

  toString(): string {
    return this.formatSingleLine();
  }
}

/**
 * Quantity - standalone for quantities with units
 */
class Quantity {
  private constructor(
    private readonly _value: number,
    private readonly _unit: string
  ) {}

  static of(value: number, unit: string = "units"): Quantity {
    if (value < 0) throw new Error("Quantity cannot be negative");
    if (!Number.isInteger(value)) throw new Error("Quantity must be a whole number");
    return new Quantity(value, unit);
  }

  static zero(unit: string = "units"): Quantity {
    return new Quantity(0, unit);
  }

  get value(): number {
    return this._value;
  }

  get unit(): string {
    return this._unit;
  }

  add(other: Quantity): Quantity {
    this.assertSameUnit(other);
    return Quantity.of(this._value + other._value, this._unit);
  }

  subtract(other: Quantity): Quantity {
    this.assertSameUnit(other);
    return Quantity.of(this._value - other._value, this._unit);
  }

  isZero(): boolean {
    return this._value === 0;
  }

  isGreaterThan(other: Quantity): boolean {
    this.assertSameUnit(other);
    return this._value > other._value;
  }

  isLessThan(other: Quantity): boolean {
    this.assertSameUnit(other);
    return this._value < other._value;
  }

  private assertSameUnit(other: Quantity): void {
    if (this._unit !== other._unit) {
      throw new Error(`Unit mismatch: ${this._unit} vs ${other._unit}`);
    }
  }

  equals(other: Quantity): boolean {
    return this._value === other._value && this._unit === other._unit;
  }

  toString(): string {
    return `${this._value} ${this._unit}`;
  }
}

// Usage
console.log("=== Standalone Classes Pattern ===\n");

// Each class is self-contained and can be used independently
console.log("--- Money (Standalone) ---");
const price = Money.of(99.99);
const tax = price.percentage(8.5);
const total = price.add(tax);
console.log(`Price: ${price.toFormattedString()}`);
console.log(`Tax (8.5%): ${tax.toFormattedString()}`);
console.log(`Total: ${total.toFormattedString()}`);

console.log("\n--- Email (Standalone) ---");
const email = Email.create("User@Example.COM");
console.log(`Email: ${email}`);
console.log(`Local: ${email.localPart}, Domain: ${email.domain}`);

console.log("\n--- PhoneNumber (Standalone) ---");
const phone = PhoneNumber.create("1", "5551234567");
console.log(`Phone: ${phone.format()}`);
const parsed = PhoneNumber.parse("+1-555-987-6543");
console.log(`Parsed: ${parsed.format()}`);

console.log("\n--- DateRange (Standalone) ---");
const vacation = DateRange.forWeeks(new Date("2024-07-01"), 2);
console.log(`Vacation: ${vacation} (${vacation.getDurationInDays()} days)`);
const meeting = DateRange.create(new Date("2024-07-08"), new Date("2024-07-10"));
console.log(`Meeting: ${meeting}`);
console.log(`Overlaps: ${vacation.overlaps(meeting)}`);

console.log("\n--- Percentage (Standalone) ---");
const discount = Percentage.of(20);
const originalPrice = Money.of(150);
const discountAmount = discount.applyToMoney(originalPrice);
console.log(`${discount} off ${originalPrice} = ${discountAmount} savings`);

console.log("\n--- Address (Standalone) ---");
const address = Address.create("123 Main St", "New York", "NY", "10001", "USA");
console.log("Single line:", address.formatSingleLine());
console.log("Multi-line:");
console.log(address.formatMultiLine());

console.log("\n--- Quantity (Standalone) ---");
const stock = Quantity.of(100, "items");
const sold = Quantity.of(25, "items");
const remaining = stock.subtract(sold);
console.log(`Stock: ${stock}, Sold: ${sold}, Remaining: ${remaining}`);

// All classes can be used together without tight coupling
console.log("\n--- Combining Standalone Classes ---");
const itemPrice = Money.of(50);
const itemQty = Quantity.of(3, "items");
const itemTotal = itemPrice.multiply(itemQty.value);
const taxRate = Percentage.of(8);
const itemTax = taxRate.applyToMoney(itemTotal);
console.log(`${itemQty} × ${itemPrice} = ${itemTotal}`);
console.log(`+ ${taxRate} tax = ${itemTax}`);
console.log(`Grand total: ${itemTotal.add(itemTax)}`);

export {};
