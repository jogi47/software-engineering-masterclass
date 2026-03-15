/**
 * REMOVE SUBCLASS
 *
 * Replace a subclass with a field in the superclass.
 *
 * The inverse of Replace Type Code with Subclasses.
 *
 * Motivation:
 * - Subclasses that don't add much value add complexity
 * - If subclass differences are minimal, a type field suffices
 * - Simplifies the class hierarchy
 *
 * Mechanics:
 * 1. Use Replace Constructor with Factory Method
 * 2. Add a type field to the superclass
 * 3. Change subclass factory to return superclass with type field
 * 4. Move any subclass-specific behavior using conditionals
 * 5. Delete subclasses
 */

// ============================================================================
// BEFORE: Subclasses with minimal differences
// ============================================================================

abstract class PersonBefore {
  protected _name: string;

  constructor(name: string) {
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  abstract get genderCode(): string;
}

class MaleBefore extends PersonBefore {
  get genderCode(): string {
    return "M";
  }
}

class FemaleBefore extends PersonBefore {
  get genderCode(): string {
    return "F";
  }
}

// ============================================================================
// AFTER: Single class with type field
// ============================================================================

type Gender = "M" | "F" | "X";

class Person {
  private _name: string;
  private _genderCode: Gender;

  private constructor(name: string, genderCode: Gender) {
    this._name = name;
    this._genderCode = genderCode;
  }

  get name(): string {
    return this._name;
  }

  get genderCode(): Gender {
    return this._genderCode;
  }

  get isMale(): boolean {
    return this._genderCode === "M";
  }

  get isFemale(): boolean {
    return this._genderCode === "F";
  }

  // Factory methods replace subclass constructors
  static createMale(name: string): Person {
    return new Person(name, "M");
  }

  static createFemale(name: string): Person {
    return new Person(name, "F");
  }

  static createNonBinary(name: string): Person {
    return new Person(name, "X");
  }

  static create(name: string, genderCode: Gender): Person {
    return new Person(name, genderCode);
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Remove Subclass ===\n");

const people = [
  Person.createMale("John"),
  Person.createFemale("Jane"),
  Person.createNonBinary("Alex"),
];

for (const person of people) {
  console.log(`${person.name}: ${person.genderCode}`);
}

void MaleBefore;
void FemaleBefore;

export {};
