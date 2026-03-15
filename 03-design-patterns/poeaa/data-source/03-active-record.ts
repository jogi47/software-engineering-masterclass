/**
 * ACTIVE RECORD
 *
 * An object that wraps a row in a database table, encapsulates the database
 * access, and adds domain logic on that data.
 *
 * Characteristics:
 * - Object knows how to persist itself
 * - Combines data access with domain logic
 * - One class per table, one instance per row
 * - Simple but couples domain to database schema
 *
 * Popular in: Ruby on Rails, Laravel (Eloquent), Django ORM
 */

// Simulated database
const database = {
  users: new Map<string, { id: string; name: string; email: string; created_at: string }>(),
};

// ACTIVE RECORD - combines data and database operations
class User {
  public id: string = "";
  public name: string = "";
  public email: string = "";
  public createdAt: Date = new Date();

  // Static finder methods
  static find(id: string): User | null {
    const row = database.users.get(id);
    if (!row) return null;
    return User.fromRow(row);
  }

  static findByEmail(email: string): User | null {
    for (const row of Array.from(database.users.values())) {
      if (row.email === email) {
        return User.fromRow(row);
      }
    }
    return null;
  }

  static all(): User[] {
    return Array.from(database.users.values()).map((row) => User.fromRow(row));
  }

  static create(attributes: { name: string; email: string }): User {
    const user = new User();
    user.id = `user-${Date.now()}`;
    user.name = attributes.name;
    user.email = attributes.email;
    user.createdAt = new Date();
    user.save();
    return user;
  }

  // Instance method to map from database row
  private static fromRow(row: { id: string; name: string; email: string; created_at: string }): User {
    const user = new User();
    user.id = row.id;
    user.name = row.name;
    user.email = row.email;
    user.createdAt = new Date(row.created_at);
    return user;
  }

  // Instance method to save to database
  save(): void {
    if (!this.id) {
      this.id = `user-${Date.now()}`;
    }
    database.users.set(this.id, {
      id: this.id,
      name: this.name,
      email: this.email,
      created_at: this.createdAt.toISOString(),
    });
    console.log(`Saved user: ${this.name}`);
  }

  // Instance method to delete from database
  delete(): void {
    database.users.delete(this.id);
    console.log(`Deleted user: ${this.name}`);
  }

  // Domain logic methods
  updateEmail(newEmail: string): void {
    if (!newEmail.includes("@")) {
      throw new Error("Invalid email format");
    }
    this.email = newEmail;
    this.save();
  }

  isNewUser(): boolean {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return this.createdAt > oneWeekAgo;
  }

  getDisplayName(): string {
    return `${this.name} <${this.email}>`;
  }
}

// Usage
console.log("=== Active Record Pattern ===\n");

// Create users
const alice = User.create({ name: "Alice", email: "alice@example.com" });
const bob = User.create({ name: "Bob", email: "bob@example.com" });

// Find users
const foundUser = User.find(alice.id);
console.log(`Found: ${foundUser?.getDisplayName()}`);

const byEmail = User.findByEmail("bob@example.com");
console.log(`Found by email: ${byEmail?.name}`);

// Update user
alice.updateEmail("alice.new@example.com");
console.log(`Updated email: ${alice.email}`);

// List all users
console.log("\nAll users:");
User.all().forEach((user) => console.log(`  - ${user.getDisplayName()}`));

// Domain logic
console.log(`\nIs Alice a new user? ${alice.isNewUser()}`);

// Make this file a module to avoid global scope pollution
export {};
