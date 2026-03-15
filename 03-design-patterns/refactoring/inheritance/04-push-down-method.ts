/**
 * PUSH DOWN METHOD
 *
 * Move a method from a superclass to its subclasses that need it.
 *
 * The inverse of Pull Up Method.
 *
 * Motivation:
 * - When a method is only relevant to some subclasses
 * - Removes clutter from superclass
 * - Makes the superclass more general
 *
 * Mechanics:
 * 1. Copy the method to each subclass that needs it
 * 2. Remove the method from the superclass
 */

// ============================================================================
// BEFORE: Method in superclass not used by all subclasses
// ============================================================================

class EmployeeBefore {
  protected _name: string;

  constructor(name: string) {
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  // Only applies to salespersons, not engineers
  get quota(): number {
    return 0;
  }
}

class EngineerBefore extends EmployeeBefore {
  // quota() is inherited but not relevant
}

class SalespersonBefore extends EmployeeBefore {
  private _quota: number;

  constructor(name: string, quota: number) {
    super(name);
    this._quota = quota;
  }

  override get quota(): number {
    return this._quota;
  }
}

// ============================================================================
// AFTER: Method pushed down to relevant subclass
// ============================================================================

abstract class Employee {
  protected _name: string;

  constructor(name: string) {
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  // No quota method here - it's only in Salesperson
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
}

class Salesperson extends Employee {
  private _quota: number;

  constructor(name: string, quota: number) {
    super(name);
    this._quota = quota;
  }

  // Pushed down from superclass
  get quota(): number {
    return this._quota;
  }

  get quotaStatus(): string {
    return this._quota > 50000 ? "On Track" : "Behind";
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Push Down Method ===\n");

const engineer = new Engineer("Alice", "Backend");
const salesperson = new Salesperson("Bob", 75000);

console.log(`Engineer: ${engineer.name} - ${engineer.specialty}`);
console.log(`Salesperson: ${salesperson.name} - Quota: $${salesperson.quota} (${salesperson.quotaStatus})`);

void EngineerBefore;
void SalespersonBefore;

export {};
