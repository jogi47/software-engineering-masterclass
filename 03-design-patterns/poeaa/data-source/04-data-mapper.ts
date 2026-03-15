/**
 * DATA MAPPER
 *
 * A layer of mappers that moves data between objects and a database
 * while keeping them independent of each other.
 *
 * Characteristics:
 * - Domain objects have no knowledge of the database
 * - Mapper handles all persistence logic
 * - Allows domain model to evolve independently
 * - More complex but highly flexible
 *
 * Popular in: Hibernate, Entity Framework, Doctrine
 */

// Simulated database
const db = {
  users: new Map<string, { id: string; name: string; email: string; password_hash: string }>(),
};

// DOMAIN OBJECT - completely ignorant of persistence
class User {
  constructor(
    public id: string,
    public name: string,
    public email: string,
    private passwordHash: string
  ) {}

  // Pure domain logic - no database code
  updateName(newName: string): void {
    if (newName.length < 2) {
      throw new Error("Name must be at least 2 characters");
    }
    this.name = newName;
  }

  changeEmail(newEmail: string): void {
    if (!newEmail.includes("@")) {
      throw new Error("Invalid email format");
    }
    this.email = newEmail;
  }

  verifyPassword(password: string): boolean {
    // In real app, would compare hashes
    return this.passwordHash === `hash_${password}`;
  }

  getPasswordHash(): string {
    return this.passwordHash;
  }
}

// DATA MAPPER - handles all persistence
class UserMapper {
  // Map from domain object to database row
  private toRow(user: User): { id: string; name: string; email: string; password_hash: string } {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      password_hash: user.getPasswordHash(),
    };
  }

  // Map from database row to domain object
  private toDomain(row: { id: string; name: string; email: string; password_hash: string }): User {
    return new User(row.id, row.name, row.email, row.password_hash);
  }

  // Finder methods
  find(id: string): User | null {
    const row = db.users.get(id);
    if (!row) return null;
    return this.toDomain(row);
  }

  findByEmail(email: string): User | null {
    for (const row of Array.from(db.users.values())) {
      if (row.email === email) {
        return this.toDomain(row);
      }
    }
    return null;
  }

  findAll(): User[] {
    return Array.from(db.users.values()).map((row) => this.toDomain(row));
  }

  // Persistence methods
  insert(user: User): void {
    const row = this.toRow(user);
    db.users.set(user.id, row);
    console.log(`Inserted user: ${user.name}`);
  }

  update(user: User): void {
    if (!db.users.has(user.id)) {
      throw new Error(`User ${user.id} not found`);
    }
    const row = this.toRow(user);
    db.users.set(user.id, row);
    console.log(`Updated user: ${user.name}`);
  }

  delete(user: User): void {
    db.users.delete(user.id);
    console.log(`Deleted user: ${user.name}`);
  }
}

// Factory for creating new users
class UserFactory {
  static create(name: string, email: string, password: string): User {
    const id = `user-${Date.now()}`;
    const passwordHash = `hash_${password}`; // In real app, would use bcrypt
    return new User(id, name, email, passwordHash);
  }
}

// Usage
console.log("=== Data Mapper Pattern ===\n");

const userMapper = new UserMapper();

// Create users (domain objects don't know about database)
const alice = UserFactory.create("Alice", "alice@example.com", "secret123");
const bob = UserFactory.create("Bob", "bob@example.com", "password456");

// Mapper handles persistence
userMapper.insert(alice);
userMapper.insert(bob);

// Find and modify
const foundUser = userMapper.findByEmail("alice@example.com");
if (foundUser) {
  foundUser.updateName("Alice Smith");
  foundUser.changeEmail("alice.smith@example.com");
  userMapper.update(foundUser); // Must explicitly save
}

// List all
console.log("\nAll users:");
userMapper.findAll().forEach((user) => {
  console.log(`  - ${user.name} (${user.email})`);
});

// Domain logic works without database
console.log(`\nPassword verification: ${alice.verifyPassword("secret123")}`);

// Make this file a module to avoid global scope pollution
export {};
