/**
 * PULL UP CONSTRUCTOR BODY
 *
 * Move common constructor code from subclasses to the superclass constructor.
 *
 * Motivation:
 * - Eliminate duplicate initialization code
 * - Common initialization belongs in the superclass
 * - Subclass constructors should focus on subclass-specific setup
 *
 * Mechanics:
 * 1. Define a superclass constructor if one doesn't exist
 * 2. Move common statements from subclass constructors to super()
 * 3. Move any common assignments after super() call to superclass constructor
 */

// ============================================================================
// BEFORE: Duplicate constructor code
// ============================================================================

class EmployeeBefore {
  protected _id: string = "";
  protected _name: string = "";

  constructor() {}
}

class EngineerBefore extends EmployeeBefore {
  private _specialty: string;

  constructor(id: string, name: string, specialty: string) {
    super();
    this._id = id; // Duplicate
    this._name = name; // Duplicate
    this._specialty = specialty;
  }
}

class ManagerBefore extends EmployeeBefore {
  private _department: string;

  constructor(id: string, name: string, department: string) {
    super();
    this._id = id; // Duplicate
    this._name = name; // Duplicate
    this._department = department;
  }
}

// ============================================================================
// AFTER: Common constructor code in superclass
// ============================================================================

abstract class Employee {
  protected _id: string;
  protected _name: string;

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
    super(id, name); // Common initialization in super
    this._specialty = specialty;
  }

  get specialty(): string {
    return this._specialty;
  }
}

class Manager extends Employee {
  private _department: string;

  constructor(id: string, name: string, department: string) {
    super(id, name); // Common initialization in super
    this._department = department;
  }

  get department(): string {
    return this._department;
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Pull Up Constructor Body ===\n");

const engineer = new Engineer("E001", "Alice", "Backend");
const manager = new Manager("M001", "Bob", "Engineering");

console.log(`Engineer: ${engineer.id} - ${engineer.name} (${engineer.specialty})`);
console.log(`Manager: ${manager.id} - ${manager.name} (${manager.department})`);

void EngineerBefore;
void ManagerBefore;

export {};
