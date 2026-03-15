/**
 * EXTRACT CLASS
 *
 * Create a new class and move fields and methods from the old class
 * into the new class.
 *
 * Motivation:
 * - A class has grown too large with too many responsibilities
 * - A subset of data and methods belong together
 * - Some data changes together or is used together
 * - Subsets of features are only used in certain situations
 *
 * Mechanics:
 * 1. Decide what to split off
 * 2. Create a new class for the split-off responsibilities
 * 3. Link the old class to the new one (often as a field)
 * 4. Use Move Field for each field you want to move
 * 5. Use Move Function for each method you want to move
 * 6. Review interfaces, consider exposing fewer methods
 */

// ============================================================================
// BEFORE: Class with too many responsibilities
// ============================================================================

class PersonBefore {
  private _name: string;
  private _officeAreaCode: string;
  private _officeNumber: string;
  private _personalAreaCode: string;
  private _personalNumber: string;
  private _street: string;
  private _city: string;
  private _state: string;
  private _zipCode: string;

  constructor(name: string) {
    this._name = name;
    this._officeAreaCode = "";
    this._officeNumber = "";
    this._personalAreaCode = "";
    this._personalNumber = "";
    this._street = "";
    this._city = "";
    this._state = "";
    this._zipCode = "";
  }

  get name(): string {
    return this._name;
  }

  get officeAreaCode(): string {
    return this._officeAreaCode;
  }
  set officeAreaCode(value: string) {
    this._officeAreaCode = value;
  }

  get officeNumber(): string {
    return this._officeNumber;
  }
  set officeNumber(value: string) {
    this._officeNumber = value;
  }

  get officeTelephoneNumber(): string {
    return `(${this._officeAreaCode}) ${this._officeNumber}`;
  }

  get personalAreaCode(): string {
    return this._personalAreaCode;
  }
  set personalAreaCode(value: string) {
    this._personalAreaCode = value;
  }

  get personalNumber(): string {
    return this._personalNumber;
  }
  set personalNumber(value: string) {
    this._personalNumber = value;
  }

  get personalTelephoneNumber(): string {
    return `(${this._personalAreaCode}) ${this._personalNumber}`;
  }

  // Address methods mixed in
  get fullAddress(): string {
    return `${this._street}, ${this._city}, ${this._state} ${this._zipCode}`;
  }
}

// ============================================================================
// AFTER: Extracted TelephoneNumber and Address classes
// ============================================================================

class TelephoneNumber {
  private _areaCode: string;
  private _number: string;

  constructor(areaCode: string = "", number: string = "") {
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

  get formatted(): string {
    if (!this._areaCode && !this._number) return "";
    return `(${this._areaCode}) ${this._number}`;
  }

  equals(other: TelephoneNumber): boolean {
    return this._areaCode === other._areaCode && this._number === other._number;
  }

  isEmpty(): boolean {
    return !this._areaCode && !this._number;
  }
}

class Address {
  constructor(
    private _street: string = "",
    private _city: string = "",
    private _state: string = "",
    private _zipCode: string = ""
  ) {}

  get street(): string {
    return this._street;
  }
  set street(value: string) {
    this._street = value;
  }

  get city(): string {
    return this._city;
  }
  set city(value: string) {
    this._city = value;
  }

  get state(): string {
    return this._state;
  }
  set state(value: string) {
    this._state = value;
  }

  get zipCode(): string {
    return this._zipCode;
  }
  set zipCode(value: string) {
    this._zipCode = value;
  }

  get formatted(): string {
    if (this.isEmpty()) return "";
    return `${this._street}, ${this._city}, ${this._state} ${this._zipCode}`;
  }

  isEmpty(): boolean {
    return !this._street && !this._city && !this._state && !this._zipCode;
  }

  equals(other: Address): boolean {
    return (
      this._street === other._street &&
      this._city === other._city &&
      this._state === other._state &&
      this._zipCode === other._zipCode
    );
  }
}

class Person {
  private readonly _name: string;
  private _officePhone: TelephoneNumber;
  private _personalPhone: TelephoneNumber;
  private _address: Address;

  constructor(name: string) {
    this._name = name;
    this._officePhone = new TelephoneNumber();
    this._personalPhone = new TelephoneNumber();
    this._address = new Address();
  }

  get name(): string {
    return this._name;
  }

  // Delegate to extracted classes
  get officePhone(): TelephoneNumber {
    return this._officePhone;
  }

  set officePhone(phone: TelephoneNumber) {
    this._officePhone = phone;
  }

  get personalPhone(): TelephoneNumber {
    return this._personalPhone;
  }

  set personalPhone(phone: TelephoneNumber) {
    this._personalPhone = phone;
  }

  get address(): Address {
    return this._address;
  }

  set address(address: Address) {
    this._address = address;
  }

  // Convenience methods that delegate
  get officeTelephoneNumber(): string {
    return this._officePhone.formatted;
  }

  get personalTelephoneNumber(): string {
    return this._personalPhone.formatted;
  }

  get fullAddress(): string {
    return this._address.formatted;
  }

  getContactCard(): string {
    const lines = [this._name];
    if (!this._officePhone.isEmpty()) {
      lines.push(`Office: ${this._officePhone.formatted}`);
    }
    if (!this._personalPhone.isEmpty()) {
      lines.push(`Personal: ${this._personalPhone.formatted}`);
    }
    if (!this._address.isEmpty()) {
      lines.push(`Address: ${this._address.formatted}`);
    }
    return lines.join("\n");
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Extract Class Refactoring ===\n");

console.log("--- Before: Monolithic class ---");
const personBefore = new PersonBefore("John Doe");
personBefore.officeAreaCode = "555";
personBefore.officeNumber = "123-4567";
console.log(`Office: ${personBefore.officeTelephoneNumber}`);

console.log("\n--- After: Extracted classes ---");
const person = new Person("John Doe");

// Set office phone
person.officePhone = new TelephoneNumber("555", "123-4567");
console.log(`Office: ${person.officeTelephoneNumber}`);

// Set personal phone
person.personalPhone.areaCode = "555";
person.personalPhone.number = "987-6543";
console.log(`Personal: ${person.personalTelephoneNumber}`);

// Set address
person.address = new Address("123 Main St", "Springfield", "IL", "62701");
console.log(`Address: ${person.fullAddress}`);

console.log("\n--- Contact Card ---");
console.log(person.getContactCard());

console.log("\n--- Extracted classes can be reused ---");
const office1 = new TelephoneNumber("555", "111-1111");
const office2 = new TelephoneNumber("555", "111-1111");
console.log(`Same phone numbers: ${office1.equals(office2)}`);

const address1 = new Address("123 Main St", "Springfield", "IL", "62701");
const address2 = new Address("456 Oak Ave", "Chicago", "IL", "60601");
console.log(`Same addresses: ${address1.equals(address2)}`);

export {};
