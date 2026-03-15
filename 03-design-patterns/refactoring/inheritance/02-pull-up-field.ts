/**
 * PULL UP FIELD
 *
 * Move identical fields from subclasses to the superclass.
 *
 * Motivation:
 * - Remove duplicate field declarations
 * - Allow methods that use the field to be pulled up too
 * - Clarifies that the field is common to all subclasses
 *
 * Mechanics:
 * 1. Inspect all uses of the field in subclasses
 * 2. Ensure the field has the same name and type
 * 3. Create a new field in the superclass
 * 4. Delete the subclass fields
 */

// ============================================================================
// BEFORE: Duplicate fields in subclasses
// ============================================================================

class EmployeeBefore {
  protected _id: string;

  constructor(id: string) {
    this._id = id;
  }
}

class EngineerBefore extends EmployeeBefore {
  private _name: string; // Duplicate

  constructor(id: string, name: string) {
    super(id);
    this._name = name;
  }

  get name(): string {
    return this._name;
  }
}

class SalespersonBefore extends EmployeeBefore {
  private _name: string; // Duplicate

  constructor(id: string, name: string) {
    super(id);
    this._name = name;
  }

  get name(): string {
    return this._name;
  }
}

// ============================================================================
// AFTER: Field pulled up to superclass
// ============================================================================

abstract class Employee {
  protected _id: string;
  protected _name: string; // Pulled up from subclasses

  constructor(id: string, name: string) {
    this._id = id;
    this._name = name;
  }

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }
}

class Engineer extends Employee {
  private _specialty: string;

  constructor(id: string, name: string, specialty: string) {
    super(id, name);
    this._specialty = specialty;
  }

  get specialty(): string {
    return this._specialty;
  }
}

class Salesperson extends Employee {
  private _quota: number;

  constructor(id: string, name: string, quota: number) {
    super(id, name);
    this._quota = quota;
  }

  get quota(): number {
    return this._quota;
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Pull Up Field ===\n");

const engineer = new Engineer("E001", "Alice", "Frontend");
const salesperson = new Salesperson("S001", "Bob", 100000);

console.log(`Engineer: ${engineer.id} - ${engineer.name} (${engineer.specialty})`);
console.log(`Salesperson: ${salesperson.id} - ${salesperson.name} (Quota: $${salesperson.quota})`);

void EngineerBefore;
void SalespersonBefore;

export {};
