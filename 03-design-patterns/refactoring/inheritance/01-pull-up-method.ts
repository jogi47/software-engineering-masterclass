/**
 * PULL UP METHOD
 *
 * Move identical methods from subclasses to the superclass.
 *
 * Motivation:
 * - Eliminate duplicate code in subclasses
 * - Centralize common behavior in the superclass
 * - Makes changes easier (only one place to modify)
 *
 * Mechanics:
 * 1. Inspect methods to ensure they are identical
 * 2. Check that they use the same signatures
 * 3. Create a new method in the superclass
 * 4. Copy the method body from one subclass
 * 5. Delete the subclass methods
 */

// ============================================================================
// BEFORE: Duplicate methods in subclasses
// ============================================================================

class EmployeeBefore {
  protected _name: string;
  protected _monthlyCost: number;

  constructor(name: string, monthlyCost: number) {
    this._name = name;
    this._monthlyCost = monthlyCost;
  }

  get name(): string {
    return this._name;
  }
}

class EngineerBefore extends EmployeeBefore {
  get annualCost(): number {
    return this._monthlyCost * 12;
  }
}

class SalespersonBefore extends EmployeeBefore {
  get annualCost(): number {
    return this._monthlyCost * 12;
  }
}

// ============================================================================
// AFTER: Method pulled up to superclass
// ============================================================================

abstract class Employee {
  protected _name: string;
  protected _monthlyCost: number;

  constructor(name: string, monthlyCost: number) {
    this._name = name;
    this._monthlyCost = monthlyCost;
  }

  get name(): string {
    return this._name;
  }

  // Pulled up from subclasses
  get annualCost(): number {
    return this._monthlyCost * 12;
  }
}

class Engineer extends Employee {
  private _specialty: string;

  constructor(name: string, monthlyCost: number, specialty: string) {
    super(name, monthlyCost);
    this._specialty = specialty;
  }

  get specialty(): string {
    return this._specialty;
  }
}

class Salesperson extends Employee {
  private _region: string;

  constructor(name: string, monthlyCost: number, region: string) {
    super(name, monthlyCost);
    this._region = region;
  }

  get region(): string {
    return this._region;
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Pull Up Method ===\n");

const engineer = new Engineer("Alice", 8000, "Backend");
const salesperson = new Salesperson("Bob", 6000, "West Coast");

console.log(`${engineer.name} (${engineer.specialty}): $${engineer.annualCost}/year`);
console.log(`${salesperson.name} (${salesperson.region}): $${salesperson.annualCost}/year`);

void EngineerBefore;
void SalespersonBefore;

export {};
