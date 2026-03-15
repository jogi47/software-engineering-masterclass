/**
 * Prototype Pattern
 * Category: Creational
 *
 * Definition:
 * The Prototype pattern specifies the kinds of objects to create using a
 * prototypical instance, and creates new objects by copying this prototype.
 * It allows cloning objects without coupling to their concrete classes.
 *
 * When to use:
 * - When object creation is expensive and similar objects already exist
 * - When you want to hide the complexity of creating new instances
 * - When you need to create objects dynamically at runtime
 * - When classes to instantiate are specified at runtime
 *
 * Key Benefits:
 * - Reduces subclassing (vs Factory Method pattern)
 * - Hides concrete product classes from client
 * - Can add/remove products at runtime
 * - Specifying new objects by varying values (vs structure)
 *
 * Important Concepts:
 * - Shallow Copy: Copies primitive values, but object references are shared
 * - Deep Copy: Creates entirely new copies of all nested objects
 */

// ============================================================================
// PROTOTYPE INTERFACE
// ============================================================================

/**
 * Cloneable interface - all prototypes must implement clone().
 * TypeScript doesn't have a built-in Cloneable, so we define our own.
 */
interface Prototype<T> {
  clone(): T;
}

// ============================================================================
// CONCRETE PROTOTYPES - Shapes Example
// ============================================================================

/**
 * Shape - Base class for all shapes.
 * Implements the prototype interface with abstract clone method.
 */
abstract class Shape implements Prototype<Shape> {
  public x: number;
  public y: number;
  public color: string;

  constructor(x: number = 0, y: number = 0, color: string = "black") {
    this.x = x;
    this.y = y;
    this.color = color;
  }

  /**
   * Copy constructor - used by subclasses to copy base properties.
   * This is a common pattern for implementing clone().
   */
  protected copyFrom(source: Shape): void {
    this.x = source.x;
    this.y = source.y;
    this.color = source.color;
  }

  // Abstract methods that subclasses must implement
  abstract clone(): Shape;
  abstract getArea(): number;
  abstract describe(): string;
}

/**
 * Circle - Concrete prototype for circular shapes.
 */
class Circle extends Shape {
  public radius: number;

  constructor(
    x: number = 0,
    y: number = 0,
    radius: number = 1,
    color: string = "black"
  ) {
    super(x, y, color);
    this.radius = radius;
  }

  /**
   * Clone method - creates an exact copy of this circle.
   * This is a SHALLOW copy for this simple case.
   */
  public clone(): Circle {
    // Create new circle and copy all properties
    const cloned = new Circle();
    cloned.copyFrom(this); // Copy base class properties
    cloned.radius = this.radius; // Copy Circle-specific properties
    return cloned;
  }

  public getArea(): number {
    return Math.PI * this.radius * this.radius;
  }

  public describe(): string {
    return `Circle at (${this.x}, ${this.y}) with radius ${this.radius}, color: ${this.color}`;
  }
}

/**
 * Rectangle - Concrete prototype for rectangular shapes.
 */
class Rectangle extends Shape {
  public width: number;
  public height: number;

  constructor(
    x: number = 0,
    y: number = 0,
    width: number = 1,
    height: number = 1,
    color: string = "black"
  ) {
    super(x, y, color);
    this.width = width;
    this.height = height;
  }

  /**
   * Clone creates an exact copy of this rectangle.
   */
  public clone(): Rectangle {
    const cloned = new Rectangle();
    cloned.copyFrom(this);
    cloned.width = this.width;
    cloned.height = this.height;
    return cloned;
  }

  public getArea(): number {
    return this.width * this.height;
  }

  public describe(): string {
    return `Rectangle at (${this.x}, ${this.y}), ${this.width}x${this.height}, color: ${this.color}`;
  }
}

// ============================================================================
// DEEP COPY DEMONSTRATION
// ============================================================================

/**
 * Document - Demonstrates DEEP vs SHALLOW copy.
 * Contains nested objects that need careful cloning.
 */
class DocumentMetadata {
  public author: string;
  public createdAt: Date;
  public tags: string[];

  constructor(author: string, tags: string[] = []) {
    this.author = author;
    this.createdAt = new Date();
    this.tags = tags;
  }

  /**
   * Deep clone of metadata - creates new Date and Array instances
   */
  public clone(): DocumentMetadata {
    const cloned = new DocumentMetadata(this.author);
    cloned.createdAt = new Date(this.createdAt.getTime()); // Clone Date
    cloned.tags = [...this.tags]; // Clone array (shallow copy of strings is fine)
    return cloned;
  }
}

/**
 * DocumentPrototype - Complex object demonstrating deep cloning.
 */
class DocumentPrototype implements Prototype<DocumentPrototype> {
  public title: string;
  public content: string;
  public metadata: DocumentMetadata; // Nested object!

  constructor(title: string, content: string, author: string) {
    this.title = title;
    this.content = content;
    this.metadata = new DocumentMetadata(author);
  }

  /**
   * SHALLOW clone - WARNING: metadata will be shared!
   * Changes to cloned.metadata will affect original!
   */
  public shallowClone(): DocumentPrototype {
    const cloned = new DocumentPrototype("", "", "");
    cloned.title = this.title;
    cloned.content = this.content;
    cloned.metadata = this.metadata; // Same reference!
    return cloned;
  }

  /**
   * DEEP clone - metadata is also cloned.
   * Changes to cloned.metadata won't affect original.
   */
  public clone(): DocumentPrototype {
    const cloned = new DocumentPrototype("", "", "");
    cloned.title = this.title;
    cloned.content = this.content;
    cloned.metadata = this.metadata.clone(); // Clone nested object!
    return cloned;
  }

  public describe(): void {
    console.log(`Title: ${this.title}`);
    console.log(`Content: ${this.content}`);
    console.log(`Author: ${this.metadata.author}`);
    console.log(`Created: ${this.metadata.createdAt.toISOString()}`);
    console.log(`Tags: ${this.metadata.tags.join(", ") || "none"}`);
  }
}

// ============================================================================
// PROTOTYPE REGISTRY
// ============================================================================

/**
 * ShapeRegistry - Stores and retrieves shape prototypes.
 *
 * This is useful when:
 * - You have a set of predefined shapes to clone
 * - You want to centralize prototype management
 * - You need to access prototypes by name/key
 */
class ShapeRegistry {
  private prototypes: Map<string, Shape> = new Map();

  /**
   * Register a prototype with a key
   */
  public register(key: string, prototype: Shape): void {
    this.prototypes.set(key, prototype);
    console.log(`Registered prototype: ${key}`);
  }

  /**
   * Unregister a prototype
   */
  public unregister(key: string): void {
    this.prototypes.delete(key);
    console.log(`Unregistered prototype: ${key}`);
  }

  /**
   * Get a clone of a registered prototype
   */
  public getClone(key: string): Shape | null {
    const prototype = this.prototypes.get(key);
    if (prototype) {
      return prototype.clone();
    }
    console.log(`Prototype not found: ${key}`);
    return null;
  }

  /**
   * List all registered prototypes
   */
  public listPrototypes(): string[] {
    return Array.from(this.prototypes.keys());
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=".repeat(60));
console.log("PROTOTYPE PATTERN DEMONSTRATION");
console.log("=".repeat(60));

// --- Basic Shape Cloning ---
console.log("\n--- Basic Shape Cloning ---\n");

// Create original shapes
const originalCircle = new Circle(10, 20, 5, "red");
const originalRect = new Rectangle(0, 0, 100, 50, "blue");

console.log("Original shapes:");
console.log(`  ${originalCircle.describe()}`);
console.log(`  ${originalRect.describe()}`);

// Clone the shapes
const clonedCircle = originalCircle.clone();
const clonedRect = originalRect.clone();

// Modify the clones
clonedCircle.x = 50;
clonedCircle.color = "green";
clonedCircle.radius = 10;

clonedRect.x = 200;
clonedRect.color = "yellow";

console.log("\nAfter cloning and modifying clones:");
console.log("  Originals (unchanged):");
console.log(`    ${originalCircle.describe()}`);
console.log(`    ${originalRect.describe()}`);
console.log("  Clones (modified):");
console.log(`    ${clonedCircle.describe()}`);
console.log(`    ${clonedRect.describe()}`);

// --- Deep vs Shallow Copy ---
console.log("\n--- Deep vs Shallow Copy Demo ---\n");

const originalDoc = new DocumentPrototype(
  "Design Patterns",
  "A guide to design patterns...",
  "John Doe"
);
originalDoc.metadata.tags = ["programming", "design"];

console.log("Original document:");
originalDoc.describe();

// Shallow clone
const shallowClone = originalDoc.shallowClone();
shallowClone.title = "Shallow Clone Title";
shallowClone.metadata.tags.push("shallow"); // This affects original!
shallowClone.metadata.author = "Modified Author"; // This affects original!

console.log("\nAfter shallow clone modification:");
console.log("Original (AFFECTED by shallow clone changes!):");
originalDoc.describe();
console.log("\nShallow clone:");
shallowClone.describe();

// Deep clone
const originalDoc2 = new DocumentPrototype(
  "Clean Code",
  "Writing maintainable code...",
  "Jane Smith"
);
originalDoc2.metadata.tags = ["clean-code", "best-practices"];

console.log("\n--- Deep Clone Demo ---\n");
console.log("Original document 2:");
originalDoc2.describe();

const deepClone = originalDoc2.clone();
deepClone.title = "Deep Clone Title";
deepClone.metadata.tags.push("deep"); // Does NOT affect original
deepClone.metadata.author = "New Author"; // Does NOT affect original

console.log("\nAfter deep clone modification:");
console.log("Original (NOT affected):");
originalDoc2.describe();
console.log("\nDeep clone:");
deepClone.describe();

// --- Prototype Registry ---
console.log("\n--- Prototype Registry Demo ---\n");

const registry = new ShapeRegistry();

// Register some predefined shapes
registry.register("small-red-circle", new Circle(0, 0, 5, "red"));
registry.register("large-blue-circle", new Circle(0, 0, 20, "blue"));
registry.register("standard-rect", new Rectangle(0, 0, 100, 50, "gray"));
registry.register("square", new Rectangle(0, 0, 50, 50, "black"));

console.log(`\nAvailable prototypes: ${registry.listPrototypes().join(", ")}`);

// Get clones from registry
const smallCircle = registry.getClone("small-red-circle") as Circle;
const anotherSmallCircle = registry.getClone("small-red-circle") as Circle;

// These are independent clones
smallCircle.x = 100;
smallCircle.y = 100;

console.log("\nClones from registry:");
console.log(`  First clone: ${smallCircle.describe()}`);
console.log(`  Second clone: ${anotherSmallCircle.describe()}`);
console.log(`  Are they the same object? ${smallCircle === anotherSmallCircle}`);

// Create multiple shapes efficiently using the registry
console.log("\nCreating grid of shapes from prototypes:");
for (let i = 0; i < 3; i++) {
  const shape = registry.getClone("standard-rect") as Rectangle;
  shape.x = i * 120;
  shape.y = i * 70;
  console.log(`  ${shape.describe()}`);
}

console.log("\n" + "=".repeat(60));
console.log("Prototype Pattern Demo Complete!");
console.log("=".repeat(60));
