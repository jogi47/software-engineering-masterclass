/**
 * REMOVE MIDDLE MAN
 *
 * Have the client call the delegate directly.
 * The inverse of Hide Delegate.
 *
 * Motivation:
 * - Too many delegating methods bog down the server class
 * - The server class becomes a "middle man" that just forwards calls
 * - Clients may need more features from the delegate than worth wrapping
 * - The balance shifts as requirements evolve
 *
 * Mechanics:
 * 1. Create a getter for the delegate
 * 2. For each client use of a delegating method, replace with calls
 *    through the delegate
 * 3. Remove the delegating method
 */

// ============================================================================
// BEFORE: Too many delegating methods (over-hidden delegate)
// ============================================================================

class DepartmentBefore {
  private _name: string;
  private _chargeCode: string;
  private _manager: PersonBefore;
  private _budget: number;
  private _employeeCount: number;

  constructor(name: string, manager: PersonBefore) {
    this._name = name;
    this._manager = manager;
    this._chargeCode = "";
    this._budget = 0;
    this._employeeCount = 0;
  }

  get name(): string {
    return this._name;
  }
  get manager(): PersonBefore {
    return this._manager;
  }
  get chargeCode(): string {
    return this._chargeCode;
  }
  set chargeCode(value: string) {
    this._chargeCode = value;
  }
  get budget(): number {
    return this._budget;
  }
  set budget(value: number) {
    this._budget = value;
  }
  get employeeCount(): number {
    return this._employeeCount;
  }
  set employeeCount(value: number) {
    this._employeeCount = value;
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

  set department(value: DepartmentBefore | null) {
    this._department = value;
  }

  // Too many delegating methods!
  get manager(): PersonBefore | null {
    return this._department?.manager ?? null;
  }

  get departmentName(): string {
    return this._department?.name ?? "";
  }

  get chargeCode(): string {
    return this._department?.chargeCode ?? "";
  }

  get departmentBudget(): number {
    return this._department?.budget ?? 0;
  }

  get departmentEmployeeCount(): number {
    return this._department?.employeeCount ?? 0;
  }

  // This class is just forwarding everything!
}

// ============================================================================
// AFTER: Expose the delegate, remove middle man
// ============================================================================

class Department {
  constructor(
    private _name: string,
    private _manager: Person,
    private _chargeCode: string = "",
    private _budget: number = 0,
    private _employeeCount: number = 0
  ) {}

  get name(): string {
    return this._name;
  }
  get manager(): Person {
    return this._manager;
  }
  get chargeCode(): string {
    return this._chargeCode;
  }
  set chargeCode(value: string) {
    this._chargeCode = value;
  }
  get budget(): number {
    return this._budget;
  }
  set budget(value: number) {
    this._budget = value;
  }
  get employeeCount(): number {
    return this._employeeCount;
  }
  set employeeCount(value: number) {
    this._employeeCount = value;
  }

  get budgetPerEmployee(): number {
    return this._employeeCount > 0 ? this._budget / this._employeeCount : 0;
  }
}

class Person {
  private _name: string;
  private _department: Department | null = null;

  constructor(name: string) {
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  // Expose the delegate directly
  get department(): Department | null {
    return this._department;
  }

  set department(value: Department | null) {
    this._department = value;
  }

  // Keep only the most common delegation if desired
  get manager(): Person | null {
    return this._department?.manager ?? null;
  }
}

// Client code accesses delegate directly when needed
function printDepartmentInfo(person: Person): void {
  const dept = person.department;
  if (!dept) {
    console.log(`${person.name} has no department`);
    return;
  }

  // Client accesses department directly - more flexible
  console.log(`${person.name}'s Department Info:`);
  console.log(`  Name: ${dept.name}`);
  console.log(`  Manager: ${dept.manager.name}`);
  console.log(`  Charge Code: ${dept.chargeCode}`);
  console.log(`  Budget: $${dept.budget}`);
  console.log(`  Employees: ${dept.employeeCount}`);
  console.log(`  Budget/Employee: $${dept.budgetPerEmployee.toFixed(2)}`);
}

// ============================================================================
// BALANCED APPROACH: Some delegation, some direct access
// ============================================================================

class Customer {
  constructor(
    private readonly _name: string,
    private readonly _creditLimit: number,
    private readonly _discount: number
  ) {}

  get name(): string {
    return this._name;
  }
  get creditLimit(): number {
    return this._creditLimit;
  }
  get discount(): number {
    return this._discount;
  }
}

class Order {
  constructor(
    private readonly _customer: Customer,
    private readonly _items: Array<{ name: string; price: number }>
  ) {}

  // Expose delegate for complex operations
  get customer(): Customer {
    return this._customer;
  }

  // Keep very common delegations
  get customerName(): string {
    return this._customer.name;
  }

  // Order-specific calculations that use customer data
  get subtotal(): number {
    return this._items.reduce((sum, item) => sum + item.price, 0);
  }

  get discount(): number {
    return this.subtotal * this._customer.discount;
  }

  get total(): number {
    return this.subtotal - this.discount;
  }

  get isWithinCreditLimit(): boolean {
    return this.total <= this._customer.creditLimit;
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Remove Middle Man Refactoring ===\n");

console.log("--- Before: All delegating methods ---");
const mgrBefore = new PersonBefore("Alice");
const deptBefore = new DepartmentBefore("Engineering", mgrBefore);
deptBefore.chargeCode = "ENG-001";
deptBefore.budget = 500000;
deptBefore.employeeCount = 10;

const empBefore = new PersonBefore("Bob");
empBefore.department = deptBefore;

// Using delegating methods
console.log(`Manager: ${empBefore.manager?.name}`);
console.log(`Charge Code: ${empBefore.chargeCode}`);
console.log(`Budget: $${empBefore.departmentBudget}`);

console.log("\n--- After: Accessing delegate directly ---");
const mgr = new Person("Alice");
const dept = new Department("Engineering", mgr, "ENG-001", 500000, 10);
const emp = new Person("Bob");
emp.department = dept;

printDepartmentInfo(emp);

console.log("\n--- Balanced approach ---");
const customer = new Customer("Acme Corp", 10000, 0.1);
const order = new Order(customer, [
  { name: "Widget", price: 500 },
  { name: "Gadget", price: 300 },
]);

// Common operation uses delegation
console.log(`Customer: ${order.customerName}`);

// Order calculations use customer data internally
console.log(`Subtotal: $${order.subtotal}`);
console.log(`Discount: $${order.discount}`);
console.log(`Total: $${order.total}`);
console.log(`Within credit limit: ${order.isWithinCreditLimit}`);

// For complex operations, access customer directly
const cust = order.customer;
console.log(`\nDirect access to customer:`);
console.log(`  Credit limit: $${cust.creditLimit}`);
console.log(`  Discount rate: ${cust.discount * 100}%`);

export {};
