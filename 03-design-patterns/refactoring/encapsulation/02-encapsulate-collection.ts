/**
 * ENCAPSULATE COLLECTION
 *
 * Provide methods to modify a collection rather than exposing it directly.
 *
 * Motivation:
 * - Direct access to a collection allows clients to modify it unexpectedly
 * - Changes to the collection bypass any validation or side effects
 * - Hard to track where modifications occur
 * - The enclosing class loses control over its internal data
 *
 * Mechanics:
 * 1. Apply Encapsulate Variable if the collection isn't encapsulated yet
 * 2. Add methods to add and remove elements from the collection
 * 3. Change the getter to return a copy or read-only view
 * 4. Find all callers that modify the collection and change to use new methods
 */

// ============================================================================
// BEFORE: Collection exposed directly
// ============================================================================

class PersonBefore {
  private _name: string;
  private _courses: CourseBefore[];

  constructor(name: string) {
    this._name = name;
    this._courses = [];
  }

  get name(): string {
    return this._name;
  }

  // PROBLEM: Returns the actual array - clients can modify it
  get courses(): CourseBefore[] {
    return this._courses;
  }

  set courses(courses: CourseBefore[]) {
    this._courses = courses;
  }
}

class CourseBefore {
  constructor(
    public name: string,
    public isAdvanced: boolean
  ) {}
}

// Client can bypass encapsulation
function demonstrateProblem(): void {
  const person = new PersonBefore("Alice");
  person.courses.push(new CourseBefore("Math", false)); // Direct modification!
  person.courses.splice(0, 1); // Can delete items directly!
}

// ============================================================================
// AFTER: Collection properly encapsulated
// ============================================================================

class Course {
  constructor(
    private readonly _name: string,
    private readonly _isAdvanced: boolean
  ) {}

  get name(): string {
    return this._name;
  }

  get isAdvanced(): boolean {
    return this._isAdvanced;
  }
}

class Person {
  private readonly _name: string;
  private readonly _courses: Course[] = [];

  constructor(name: string, courses: Course[] = []) {
    this._name = name;
    // Make a copy to prevent external reference
    courses.forEach((c) => this._courses.push(c));
  }

  get name(): string {
    return this._name;
  }

  // Return a copy - modifications won't affect the original
  get courses(): readonly Course[] {
    return [...this._courses];
  }

  // Controlled addition with validation
  addCourse(course: Course): void {
    if (this._courses.some((c) => c.name === course.name)) {
      throw new Error(`Course ${course.name} already enrolled`);
    }
    this._courses.push(course);
  }

  // Controlled removal
  removeCourse(course: Course): void {
    const index = this._courses.findIndex((c) => c.name === course.name);
    if (index === -1) {
      throw new Error(`Course ${course.name} not found`);
    }
    this._courses.splice(index, 1);
  }

  // Bulk operations with validation
  setCourses(courses: Course[]): void {
    this._courses.length = 0;
    courses.forEach((c) => this.addCourse(c));
  }

  // Derived properties
  get numberOfCourses(): number {
    return this._courses.length;
  }

  get numberOfAdvancedCourses(): number {
    return this._courses.filter((c) => c.isAdvanced).length;
  }

  hasCourseCalled(name: string): boolean {
    return this._courses.some((c) => c.name === name);
  }
}

// ============================================================================
// ANOTHER EXAMPLE: Order with line items
// ============================================================================

class LineItem {
  constructor(
    private readonly _product: string,
    private _quantity: number,
    private readonly _unitPrice: number
  ) {}

  get product(): string {
    return this._product;
  }

  get quantity(): number {
    return this._quantity;
  }

  get unitPrice(): number {
    return this._unitPrice;
  }

  get total(): number {
    return this._quantity * this._unitPrice;
  }

  updateQuantity(newQuantity: number): void {
    if (newQuantity < 0) throw new Error("Quantity cannot be negative");
    this._quantity = newQuantity;
  }
}

class Order {
  private readonly _items: LineItem[] = [];
  private readonly _customerId: string;

  constructor(customerId: string) {
    this._customerId = customerId;
  }

  get customerId(): string {
    return this._customerId;
  }

  // Read-only access to items
  get items(): readonly LineItem[] {
    return [...this._items];
  }

  // Controlled operations
  addItem(product: string, quantity: number, unitPrice: number): LineItem {
    const existing = this._items.find((i) => i.product === product);
    if (existing) {
      existing.updateQuantity(existing.quantity + quantity);
      return existing;
    }
    const item = new LineItem(product, quantity, unitPrice);
    this._items.push(item);
    return item;
  }

  removeItem(product: string): void {
    const index = this._items.findIndex((i) => i.product === product);
    if (index !== -1) {
      this._items.splice(index, 1);
    }
  }

  updateItemQuantity(product: string, quantity: number): void {
    const item = this._items.find((i) => i.product === product);
    if (!item) throw new Error(`Item ${product} not found`);
    if (quantity === 0) {
      this.removeItem(product);
    } else {
      item.updateQuantity(quantity);
    }
  }

  // Derived values
  get subtotal(): number {
    return this._items.reduce((sum, item) => sum + item.total, 0);
  }

  get itemCount(): number {
    return this._items.reduce((sum, item) => sum + item.quantity, 0);
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Encapsulate Collection Refactoring ===\n");

console.log("--- Before: Direct collection access ---");
const personBefore = new PersonBefore("Bob");
personBefore.courses.push(new CourseBefore("History", false));
console.log(`Courses (via push): ${personBefore.courses.length}`);

console.log("\n--- After: Encapsulated collection ---");
const person = new Person("Alice");

person.addCourse(new Course("Math", false));
person.addCourse(new Course("Physics", true));
person.addCourse(new Course("Advanced Chemistry", true));

console.log(`${person.name}'s courses:`);
person.courses.forEach((c) => console.log(`  - ${c.name} (Advanced: ${c.isAdvanced})`));
console.log(`Total: ${person.numberOfCourses}`);
console.log(`Advanced: ${person.numberOfAdvancedCourses}`);

console.log("\nTrying to add duplicate:");
try {
  person.addCourse(new Course("Math", true));
} catch (e) {
  console.log(`Error: ${(e as Error).message}`);
}

// Attempting to modify the returned collection has no effect
const coursesCopy = person.courses;
console.log(`\nTrying to modify returned array...`);
console.log(`Original count: ${person.numberOfCourses}`);

console.log("\n--- Order example ---");
const order = new Order("C123");
order.addItem("Widget", 2, 25);
order.addItem("Gadget", 1, 50);
order.addItem("Widget", 3, 25); // Adds to existing

console.log("Order items:");
order.items.forEach((item) =>
  console.log(`  ${item.product}: ${item.quantity} x $${item.unitPrice} = $${item.total}`)
);
console.log(`Subtotal: $${order.subtotal}`);
console.log(`Total items: ${order.itemCount}`);

order.updateItemQuantity("Widget", 1);
console.log(`\nAfter reducing Widget quantity:`);
console.log(`Subtotal: $${order.subtotal}`);

export {};
