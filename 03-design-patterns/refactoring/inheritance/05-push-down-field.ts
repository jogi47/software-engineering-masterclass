/**
 * PUSH DOWN FIELD
 *
 * Move a field from a superclass to its subclasses that need it.
 *
 * The inverse of Pull Up Field.
 *
 * Motivation:
 * - When a field is only used by some subclasses
 * - Simplifies the superclass
 * - Makes it clear which subclass owns the data
 *
 * Mechanics:
 * 1. Declare the field in each subclass that needs it
 * 2. Remove the field from the superclass
 */

// ============================================================================
// BEFORE: Field in superclass not used by all subclasses
// ============================================================================

class EmployeeBefore {
  protected _name: string;
  protected _quota: number; // Only used by Salesperson

  constructor(name: string, quota: number = 0) {
    this._name = name;
    this._quota = quota;
  }
}

class EngineerBefore extends EmployeeBefore {
  constructor(name: string) {
    super(name, 0); // quota not relevant
  }
}

class SalespersonBefore extends EmployeeBefore {
  constructor(name: string, quota: number) {
    super(name, quota);
  }
}

// ============================================================================
// AFTER: Field pushed down to relevant subclass
// ============================================================================

abstract class Employee {
  protected _name: string;

  constructor(name: string) {
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  abstract describe(): string;
}

class Engineer extends Employee {
  private _specialty: string;

  constructor(name: string, specialty: string) {
    super(name);
    this._specialty = specialty;
  }

  get specialty(): string {
    return this._specialty;
  }

  describe(): string {
    return `Engineer ${this._name} specializes in ${this._specialty}`;
  }
}

class Salesperson extends Employee {
  private _quota: number; // Pushed down from superclass

  constructor(name: string, quota: number) {
    super(name);
    this._quota = quota;
  }

  get quota(): number {
    return this._quota;
  }

  describe(): string {
    return `Salesperson ${this._name} has quota $${this._quota}`;
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Push Down Field ===\n");

const employees: Employee[] = [
  new Engineer("Alice", "Backend"),
  new Salesperson("Bob", 100000),
];

for (const emp of employees) {
  console.log(emp.describe());
}

void EngineerBefore;
void SalespersonBefore;

export {};
