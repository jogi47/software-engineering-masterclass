/**
 * REPLACE SUPERCLASS WITH DELEGATE
 *
 * Replace inheritance with delegation when the subclass only uses part
 * of the superclass functionality or the inheritance is inappropriate.
 *
 * Motivation:
 * - Subclass isn't really a subtype of the superclass
 * - Inheriting from a class couples you to its implementation
 * - Delegation provides more flexibility
 * - Avoids inheriting unwanted behavior
 *
 * Mechanics:
 * 1. Create a field for the delegate (instance of former superclass)
 * 2. Create delegating methods for each superclass method used
 * 3. Remove the inheritance relationship
 */

// ============================================================================
// BEFORE: Inappropriate inheritance
// ============================================================================

class Vector {
  private _items: number[] = [];

  push(value: number): void {
    this._items.push(value);
  }

  pop(): number | undefined {
    return this._items.pop();
  }

  get(index: number): number {
    return this._items[index];
  }

  set(index: number, value: number): void {
    this._items[index] = value;
  }

  get length(): number {
    return this._items.length;
  }
}

// Stack inherits from Vector but shouldn't expose set/get
class StackBefore extends Vector {
  // Inherits set() and get() which break stack semantics
}

// ============================================================================
// AFTER: Delegation instead of inheritance
// ============================================================================

class Stack<T> {
  private _storage: T[] = []; // Delegate to array (composition)

  push(item: T): void {
    this._storage.push(item);
  }

  pop(): T | undefined {
    return this._storage.pop();
  }

  peek(): T | undefined {
    return this._storage[this._storage.length - 1];
  }

  get isEmpty(): boolean {
    return this._storage.length === 0;
  }

  get size(): number {
    return this._storage.length;
  }

  // Only expose what makes sense for a stack
  // No get(index) or set(index, value) - those would break stack semantics
}

// Another example: Scroll wraps List
interface ScrollItem {
  id: string;
  content: string;
}

class List<T> {
  private _items: T[] = [];

  add(item: T): void {
    this._items.push(item);
  }

  remove(index: number): void {
    this._items.splice(index, 1);
  }

  get(index: number): T {
    return this._items[index];
  }

  get length(): number {
    return this._items.length;
  }

  getAll(): T[] {
    return [...this._items];
  }
}

// Scroll delegates to List rather than inheriting
class Scroll {
  private _list: List<ScrollItem>; // Delegate
  private _dateLastCleaned: Date;

  constructor() {
    this._list = new List<ScrollItem>();
    this._dateLastCleaned = new Date();
  }

  addItem(content: string): void {
    const id = `scroll-${Date.now()}`;
    this._list.add({ id, content });
  }

  get contents(): string[] {
    return this._list.getAll().map((item) => item.content);
  }

  get daysSinceLastCleaning(): number {
    const now = new Date();
    const diff = now.getTime() - this._dateLastCleaned.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  markCleaned(): void {
    this._dateLastCleaned = new Date();
  }

  // Only expose what makes sense for a Scroll
  // Not exposing remove() or get(index) from List
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Replace Superclass with Delegate ===\n");

console.log("--- Stack (delegates to array) ---");
const stack = new Stack<number>();
stack.push(1);
stack.push(2);
stack.push(3);

console.log(`Size: ${stack.size}`);
console.log(`Peek: ${stack.peek()}`);
console.log(`Pop: ${stack.pop()}`);
console.log(`Size after pop: ${stack.size}`);

console.log("\n--- Scroll (delegates to List) ---");
const scroll = new Scroll();
scroll.addItem("First entry");
scroll.addItem("Second entry");

console.log(`Contents: ${scroll.contents.join(", ")}`);
console.log(`Days since cleaning: ${scroll.daysSinceLastCleaning}`);

void StackBefore;

export {};
