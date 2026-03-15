/**
 * COLLAPSE HIERARCHY
 *
 * Merge a superclass and subclass when they are too similar.
 *
 * Motivation:
 * - Subclass that adds little value creates unnecessary complexity
 * - Over time, features may be pulled up until subclass is empty
 * - Simpler hierarchy is easier to understand
 *
 * Mechanics:
 * 1. Choose which class to keep
 * 2. Move all features to the surviving class
 * 3. Update references to removed class
 * 4. Delete the empty class
 */

// ============================================================================
// BEFORE: Unnecessary subclass
// ============================================================================

class EmployeeBefore {
  protected _name: string;
  protected _id: string;
  protected _monthlyCost: number;

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

  get monthlyCost(): number {
    return this._monthlyCost;
  }

  get annualCost(): number {
    return this._monthlyCost * 12;
  }
}

// Subclass adds nothing meaningful
class SalesPersonBefore extends EmployeeBefore {
  // No additional methods or fields - just exists for "type"
}

// ============================================================================
// AFTER: Collapsed into single class
// ============================================================================

type EmployeeRole = "engineer" | "salesperson" | "manager";

class Employee {
  private _name: string;
  private _id: string;
  private _monthlyCost: number;
  private _role: EmployeeRole;

  constructor(name: string, id: string, monthlyCost: number, role: EmployeeRole) {
    this._name = name;
    this._id = id;
    this._monthlyCost = monthlyCost;
    this._role = role;
  }

  get name(): string {
    return this._name;
  }

  get id(): string {
    return this._id;
  }

  get monthlyCost(): number {
    return this._monthlyCost;
  }

  get role(): EmployeeRole {
    return this._role;
  }

  get annualCost(): number {
    return this._monthlyCost * 12;
  }

  get isSalesperson(): boolean {
    return this._role === "salesperson";
  }

  // Factory methods for clarity
  static createEngineer(name: string, id: string, monthlyCost: number): Employee {
    return new Employee(name, id, monthlyCost, "engineer");
  }

  static createSalesperson(name: string, id: string, monthlyCost: number): Employee {
    return new Employee(name, id, monthlyCost, "salesperson");
  }

  static createManager(name: string, id: string, monthlyCost: number): Employee {
    return new Employee(name, id, monthlyCost, "manager");
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Collapse Hierarchy ===\n");

const employees = [
  Employee.createEngineer("Alice", "E001", 8000),
  Employee.createSalesperson("Bob", "S001", 6000),
  Employee.createManager("Carol", "M001", 10000),
];

for (const emp of employees) {
  console.log(`${emp.name} (${emp.role}): $${emp.annualCost}/year`);
}

console.log(`\nSalespeople: ${employees.filter((e) => e.isSalesperson).length}`);

void SalesPersonBefore;

export {};
