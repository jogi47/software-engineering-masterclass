/**
 * REMOVE SETTING METHOD
 *
 * Remove a setter when a field should only be set at construction time.
 *
 * Motivation:
 * - Making a field immutable prevents accidental changes
 * - Clarifies that the field is not meant to be modified
 * - Simplifies reasoning about the object's state
 *
 * Mechanics:
 * 1. Check that the setter is only called in the constructor
 * 2. Modify the constructor to directly set the field
 * 3. Remove the setter
 * 4. Make the field readonly if possible
 */

// ============================================================================
// BEFORE: Unnecessary setter
// ============================================================================

class PersonBefore {
  private _id: string = "";
  private _name: string = "";

  constructor(id: string, name: string) {
    this.setId(id);
    this.setName(name);
  }

  get id(): string {
    return this._id;
  }

  setId(value: string): void {
    this._id = value;
  }

  get name(): string {
    return this._name;
  }

  setName(value: string): void {
    this._name = value;
  }
}

// ============================================================================
// AFTER: Immutable fields without setters
// ============================================================================

class Person {
  private readonly _id: string;
  private readonly _name: string;

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

  // To "change", return a new instance
  withName(newName: string): Person {
    return new Person(this._id, newName);
  }
}

// Partial mutability example
class Order {
  private readonly _id: string;
  private readonly _createdAt: Date;
  private _status: "pending" | "confirmed" | "shipped";

  constructor(id: string) {
    this._id = id;
    this._createdAt = new Date();
    this._status = "pending";
  }

  get id(): string {
    return this._id;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get status(): string {
    return this._status;
  }

  // Controlled state transitions instead of setter
  confirm(): void {
    if (this._status !== "pending") {
      throw new Error("Can only confirm pending orders");
    }
    this._status = "confirmed";
  }

  ship(): void {
    if (this._status !== "confirmed") {
      throw new Error("Can only ship confirmed orders");
    }
    this._status = "shipped";
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Remove Setting Method ===\n");

const person = new Person("P001", "John Doe");
console.log(`Person: ${person.id} - ${person.name}`);

const renamed = person.withName("John Smith");
console.log(`Renamed: ${renamed.id} - ${renamed.name}`);
console.log(`Original unchanged: ${person.name}`);

console.log("\n--- Order with controlled transitions ---");
const order = new Order("ORD-001");
console.log(`Status: ${order.status}`);

order.confirm();
console.log(`After confirm: ${order.status}`);

order.ship();
console.log(`After ship: ${order.status}`);

void PersonBefore;

export {};
