/**
 * EXTRACT SUPERCLASS
 *
 * Create a new superclass for two or more classes with common features.
 *
 * Motivation:
 * - Eliminate duplicate code between similar classes
 * - Create a clear inheritance hierarchy
 * - Allow polymorphic treatment of the subclasses
 *
 * Mechanics:
 * 1. Create an empty superclass
 * 2. Apply Pull Up Field, Pull Up Method, Pull Up Constructor Body
 * 3. Examine remaining methods for common parts to extract
 */

// ============================================================================
// BEFORE: Two classes with duplicated features
// ============================================================================

class EmployeeBefore {
  private _name: string;
  private _id: string;
  private _monthlyCost: number;

  constructor(name: string, id: string, monthlyCost: number) {
    this._name = name;
    this._id = id;
    this._monthlyCost = monthlyCost;
  }

  get name(): string {
    return this._name;
  }

  get id(): string {
    return this._id;
  }

  get annualCost(): number {
    return this._monthlyCost * 12;
  }
}

class DepartmentBefore {
  private _name: string;
  private _staff: EmployeeBefore[];

  constructor(name: string, staff: EmployeeBefore[]) {
    this._name = name;
    this._staff = staff;
  }

  get name(): string {
    return this._name;
  }

  get annualCost(): number {
    return this._staff.reduce((sum, emp) => sum + emp.annualCost, 0);
  }
}

// ============================================================================
// AFTER: Common features in superclass
// ============================================================================

// Extracted superclass for common party behavior
abstract class Party {
  protected _name: string;

  constructor(name: string) {
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  abstract get annualCost(): number;
}

class Employee extends Party {
  private _id: string;
  private _monthlyCost: number;

  constructor(name: string, id: string, monthlyCost: number) {
    super(name);
    this._id = id;
    this._monthlyCost = monthlyCost;
  }

  get id(): string {
    return this._id;
  }

  get annualCost(): number {
    return this._monthlyCost * 12;
  }
}

class Department extends Party {
  private _staff: Employee[];

  constructor(name: string, staff: Employee[]) {
    super(name);
    this._staff = staff;
  }

  get staff(): Employee[] {
    return [...this._staff];
  }

  get headCount(): number {
    return this._staff.length;
  }

  get annualCost(): number {
    return this._staff.reduce((sum, emp) => sum + emp.annualCost, 0);
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Extract Superclass ===\n");

const alice = new Employee("Alice", "E001", 5000);
const bob = new Employee("Bob", "E002", 6000);
const engineering = new Department("Engineering", [alice, bob]);

// Both can be treated as Party
const parties: Party[] = [alice, bob, engineering];

for (const party of parties) {
  console.log(`${party.name}: $${party.annualCost}/year`);
}

console.log(`\nDepartment head count: ${engineering.headCount}`);

void EmployeeBefore;
void DepartmentBefore;

export {};
