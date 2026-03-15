/**
 * HIDE DELEGATE
 *
 * Create a method on the server object that hides the delegate.
 *
 * Motivation:
 * - Reduces coupling between client and delegate
 * - Client doesn't need to know about the delegate's existence
 * - Changes to the delegate structure don't affect clients
 * - Encapsulation at its finest
 *
 * Mechanics:
 * 1. For each method on the delegate called by the client, create a
 *    delegating method on the server
 * 2. Adjust the client to call the server methods
 * 3. If no client needs to access the delegate anymore, remove the
 *    accessor for the delegate
 */

// ============================================================================
// BEFORE: Client navigates through objects
// ============================================================================

class DepartmentBefore {
  private _manager: PersonBefore;
  private _name: string;

  constructor(name: string, manager: PersonBefore) {
    this._name = name;
    this._manager = manager;
  }

  get name(): string {
    return this._name;
  }

  get manager(): PersonBefore {
    return this._manager;
  }
}

class PersonBefore {
  private _name: string;
  private _department: DepartmentBefore | null = null;

  constructor(name: string) {
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  get department(): DepartmentBefore | null {
    return this._department;
  }

  set department(value: DepartmentBefore | null) {
    this._department = value;
  }
}

// Client code knows too much about the structure
function getManagerNameBefore(person: PersonBefore): string {
  // Client navigates: person -> department -> manager -> name
  return person.department?.manager.name ?? "No manager";
}

// ============================================================================
// AFTER: Delegate hidden behind server methods
// ============================================================================

class Department {
  private readonly _manager: Person;
  private readonly _name: string;
  private readonly _budget: number;

  constructor(name: string, manager: Person, budget: number = 0) {
    this._name = name;
    this._manager = manager;
    this._budget = budget;
  }

  get name(): string {
    return this._name;
  }

  get manager(): Person {
    return this._manager;
  }

  get budget(): number {
    return this._budget;
  }
}

class Person {
  private readonly _name: string;
  private _department: Department | null = null;

  constructor(name: string) {
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  set department(value: Department | null) {
    this._department = value;
  }

  // Hide the delegate - clients ask Person directly
  get manager(): Person | null {
    return this._department?.manager ?? null;
  }

  get managerName(): string {
    return this.manager?.name ?? "No manager";
  }

  get departmentName(): string {
    return this._department?.name ?? "No department";
  }

  get departmentBudget(): number {
    return this._department?.budget ?? 0;
  }

  // Don't expose the department getter if not needed
  // Clients get what they need through Person
}

// Client code is simpler and decoupled
function getManagerName(person: Person): string {
  return person.managerName;
}

// ============================================================================
// ANOTHER EXAMPLE: Order hiding Customer details
// ============================================================================

class Address {
  constructor(
    private readonly _street: string,
    private readonly _city: string,
    private readonly _country: string
  ) {}

  get street(): string {
    return this._street;
  }
  get city(): string {
    return this._city;
  }
  get country(): string {
    return this._country;
  }

  get formatted(): string {
    return `${this._street}, ${this._city}, ${this._country}`;
  }
}

class Customer {
  constructor(
    private readonly _name: string,
    private readonly _shippingAddress: Address,
    private readonly _billingAddress: Address
  ) {}

  get name(): string {
    return this._name;
  }
  get shippingAddress(): Address {
    return this._shippingAddress;
  }
  get billingAddress(): Address {
    return this._billingAddress;
  }
}

class Order {
  private readonly _customer: Customer;
  private readonly _items: string[];

  constructor(customer: Customer, items: string[]) {
    this._customer = customer;
    this._items = items;
  }

  // Hide the customer delegate - expose what's needed
  get customerName(): string {
    return this._customer.name;
  }

  get shippingAddress(): string {
    return this._customer.shippingAddress.formatted;
  }

  get billingAddress(): string {
    return this._customer.billingAddress.formatted;
  }

  get shippingCity(): string {
    return this._customer.shippingAddress.city;
  }

  get shippingCountry(): string {
    return this._customer.shippingAddress.country;
  }

  // Business logic can now be on Order, not scattered
  get isInternational(): boolean {
    return this._customer.shippingAddress.country !== "USA";
  }

  get requiresCustomsForm(): boolean {
    return this.isInternational;
  }

  get items(): readonly string[] {
    return [...this._items];
  }

  getShippingLabel(): string {
    return [
      this.customerName,
      this.shippingAddress,
      this.isInternational ? "(INTERNATIONAL)" : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Hide Delegate Refactoring ===\n");

console.log("--- Before: Navigating through objects ---");
const managerBefore = new PersonBefore("Alice Manager");
const deptBefore = new DepartmentBefore("Engineering", managerBefore);
const employeeBefore = new PersonBefore("Bob Developer");
employeeBefore.department = deptBefore;

// Client has to know about department structure
console.log(`Manager: ${employeeBefore.department?.manager.name}`);

console.log("\n--- After: Delegate hidden ---");
const manager = new Person("Alice Manager");
const dept = new Department("Engineering", manager, 100000);
const employee = new Person("Bob Developer");
employee.department = dept;

// Client just asks the person
console.log(`Manager: ${employee.managerName}`);
console.log(`Department: ${employee.departmentName}`);
console.log(`Budget: $${employee.departmentBudget}`);

console.log("\n--- Order hiding Customer ---");
const address = new Address("123 Main St", "New York", "USA");
const intlAddress = new Address("10 Downing St", "London", "UK");
const customer = new Customer("John Doe", intlAddress, address);
const order = new Order(customer, ["Widget", "Gadget"]);

console.log(`Customer: ${order.customerName}`);
console.log(`Ships to: ${order.shippingCity}, ${order.shippingCountry}`);
console.log(`International: ${order.isInternational}`);
console.log(`Needs customs: ${order.requiresCustomsForm}`);

console.log("\n--- Shipping Label ---");
console.log(order.getShippingLabel());

export {};
