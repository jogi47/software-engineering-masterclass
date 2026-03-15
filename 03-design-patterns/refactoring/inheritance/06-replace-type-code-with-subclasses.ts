/**
 * REPLACE TYPE CODE WITH SUBCLASSES
 *
 * Replace a type code field with subclasses.
 *
 * Motivation:
 * - Type-based conditionals can be replaced with polymorphism
 * - Each type can have its own specialized behavior
 * - Adding new types doesn't require modifying existing code
 *
 * Mechanics:
 * 1. Self-encapsulate the type code field
 * 2. Create a subclass for each type code value
 * 3. Create a factory method that returns the appropriate subclass
 * 4. Move type-specific behavior to subclasses
 */

// ============================================================================
// BEFORE: Type code with conditionals
// ============================================================================

class EmployeeBefore {
  private _name: string;
  private _type: "engineer" | "manager" | "salesperson";

  constructor(name: string, type: "engineer" | "manager" | "salesperson") {
    this._name = name;
    this._type = type;
  }

  get name(): string {
    return this._name;
  }

  get type(): string {
    return this._type;
  }

  get bonus(): number {
    switch (this._type) {
      case "engineer":
        return 1000;
      case "manager":
        return 2000;
      case "salesperson":
        return 1500;
    }
  }

  canAccessCodebase(): boolean {
    return this._type === "engineer";
  }
}

// ============================================================================
// AFTER: Subclasses replace type code
// ============================================================================

abstract class Employee {
  protected _name: string;

  constructor(name: string) {
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  abstract get type(): string;
  abstract get bonus(): number;

  canAccessCodebase(): boolean {
    return false;
  }

  // Factory method
  static create(name: string, type: "engineer" | "manager" | "salesperson"): Employee {
    switch (type) {
      case "engineer":
        return new Engineer(name);
      case "manager":
        return new Manager(name);
      case "salesperson":
        return new Salesperson(name);
    }
  }
}

class Engineer extends Employee {
  get type(): string {
    return "engineer";
  }

  get bonus(): number {
    return 1000;
  }

  override canAccessCodebase(): boolean {
    return true;
  }
}

class Manager extends Employee {
  get type(): string {
    return "manager";
  }

  get bonus(): number {
    return 2000;
  }
}

class Salesperson extends Employee {
  get type(): string {
    return "salesperson";
  }

  get bonus(): number {
    return 1500;
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Replace Type Code with Subclasses ===\n");

const employees = [
  Employee.create("Alice", "engineer"),
  Employee.create("Bob", "manager"),
  Employee.create("Carol", "salesperson"),
];

for (const emp of employees) {
  console.log(`${emp.name} (${emp.type}): Bonus $${emp.bonus}, Code Access: ${emp.canAccessCodebase()}`);
}

void EmployeeBefore;

export {};
