/**
 * UNIT OF WORK
 *
 * Maintains a list of objects affected by a business transaction and
 * coordinates the writing out of changes.
 *
 * Characteristics:
 * - Tracks new, modified, and deleted objects
 * - Commits all changes in a single transaction
 * - Ensures consistency
 * - Reduces database round trips
 */

// Domain Entity
class Customer {
  constructor(
    public readonly id: string,
    public name: string,
    public email: string
  ) {}
}

// Simulated database
const database = {
  customers: new Map<string, { id: string; name: string; email: string }>([
    ["c1", { id: "c1", name: "Alice", email: "alice@example.com" }],
    ["c2", { id: "c2", name: "Bob", email: "bob@example.com" }],
  ]),
};

// UNIT OF WORK
class UnitOfWork {
  private newObjects: Customer[] = [];
  private dirtyObjects: Customer[] = [];
  private removedObjects: Customer[] = [];

  // Register a new object to be inserted
  registerNew(customer: Customer): void {
    if (this.dirtyObjects.includes(customer) || this.removedObjects.includes(customer)) {
      throw new Error("Cannot register as new: object already tracked");
    }
    if (!this.newObjects.includes(customer)) {
      this.newObjects.push(customer);
      console.log(`Registered NEW: ${customer.name}`);
    }
  }

  // Register an object as modified
  registerDirty(customer: Customer): void {
    if (this.removedObjects.includes(customer)) {
      throw new Error("Cannot register as dirty: object is marked for removal");
    }
    if (!this.newObjects.includes(customer) && !this.dirtyObjects.includes(customer)) {
      this.dirtyObjects.push(customer);
      console.log(`Registered DIRTY: ${customer.name}`);
    }
  }

  // Register an object for deletion
  registerRemoved(customer: Customer): void {
    // If new, just remove from new list
    const newIndex = this.newObjects.indexOf(customer);
    if (newIndex !== -1) {
      this.newObjects.splice(newIndex, 1);
      return;
    }

    // Remove from dirty if present
    const dirtyIndex = this.dirtyObjects.indexOf(customer);
    if (dirtyIndex !== -1) {
      this.dirtyObjects.splice(dirtyIndex, 1);
    }

    if (!this.removedObjects.includes(customer)) {
      this.removedObjects.push(customer);
      console.log(`Registered REMOVED: ${customer.name}`);
    }
  }

  // Commit all changes to the database
  commit(): void {
    console.log("\n--- Committing Unit of Work ---");

    // Insert new objects
    for (const customer of this.newObjects) {
      database.customers.set(customer.id, {
        id: customer.id,
        name: customer.name,
        email: customer.email,
      });
      console.log(`INSERT: ${customer.name}`);
    }

    // Update dirty objects
    for (const customer of this.dirtyObjects) {
      database.customers.set(customer.id, {
        id: customer.id,
        name: customer.name,
        email: customer.email,
      });
      console.log(`UPDATE: ${customer.name}`);
    }

    // Delete removed objects
    for (const customer of this.removedObjects) {
      database.customers.delete(customer.id);
      console.log(`DELETE: ${customer.name}`);
    }

    console.log("--- Commit complete ---\n");

    // Clear tracking
    this.newObjects = [];
    this.dirtyObjects = [];
    this.removedObjects = [];
  }

  // Rollback all pending changes
  rollback(): void {
    this.newObjects = [];
    this.dirtyObjects = [];
    this.removedObjects = [];
    console.log("Rolled back all pending changes");
  }
}

// Repository that uses Unit of Work
class CustomerRepository {
  constructor(private unitOfWork: UnitOfWork) {}

  findById(id: string): Customer | undefined {
    const row = database.customers.get(id);
    if (!row) return undefined;
    return new Customer(row.id, row.name, row.email);
  }

  add(customer: Customer): void {
    this.unitOfWork.registerNew(customer);
  }

  update(customer: Customer): void {
    this.unitOfWork.registerDirty(customer);
  }

  remove(customer: Customer): void {
    this.unitOfWork.registerRemoved(customer);
  }
}

// Usage
console.log("=== Unit of Work Pattern ===\n");

const unitOfWork = new UnitOfWork();
const repository = new CustomerRepository(unitOfWork);

// Make multiple changes
const newCustomer = new Customer("c3", "Charlie", "charlie@example.com");
repository.add(newCustomer);

const alice = repository.findById("c1");
if (alice) {
  alice.email = "alice.updated@example.com";
  repository.update(alice);
}

const bob = repository.findById("c2");
if (bob) {
  repository.remove(bob);
}

// All changes are pending until commit
console.log("\nDatabase before commit:");
database.customers.forEach((c) => console.log(`  - ${c.name}: ${c.email}`));

// Single commit for all changes
unitOfWork.commit();

console.log("Database after commit:");
database.customers.forEach((c) => console.log(`  - ${c.name}: ${c.email}`));

// Make this file a module to avoid global scope pollution
export {};
