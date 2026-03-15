/**
 * INTRODUCE SPECIAL CASE
 *
 * Create a special case object that handles exceptional behavior,
 * avoiding the need for null checks throughout the code.
 *
 * Also known as "Null Object Pattern".
 *
 * Motivation:
 * - Repeated null/undefined checks clutter the code
 * - A special case object can provide default behavior
 * - Clients don't need to know about the special case
 * - Centralizes handling of exceptional situations
 *
 * Mechanics:
 * 1. Create a special case class that extends the regular class
 * 2. Implement default behavior in the special case
 * 3. Replace null checks with the special case object
 * 4. Clients can use the object normally
 */

// ============================================================================
// BEFORE: Null checks scattered everywhere
// ============================================================================

interface CustomerBefore {
  name: string;
  billingPlan: string;
  paymentHistory: { weeksDelinquent: number };
}

function getCustomerBefore(id: string): CustomerBefore | null {
  const customers: Record<string, CustomerBefore> = {
    "C1": { name: "John Doe", billingPlan: "premium", paymentHistory: { weeksDelinquent: 0 } },
  };
  return customers[id] || null;
}

// Client code with null checks everywhere
function processCustomerBefore(customerId: string): string {
  const customer = getCustomerBefore(customerId);

  // Null check 1
  const customerName = customer ? customer.name : "Occupant";

  // Null check 2
  const billingPlan = customer ? customer.billingPlan : "basic";

  // Null check 3
  const weeksDelinquent = customer ? customer.paymentHistory.weeksDelinquent : 0;

  return `Customer: ${customerName}, Plan: ${billingPlan}, Delinquent: ${weeksDelinquent} weeks`;
}

// ============================================================================
// AFTER: Special case object (Null Object Pattern)
// ============================================================================

interface PaymentHistory {
  weeksDelinquent: number;
}

class Customer {
  constructor(
    private _name: string,
    private _billingPlan: string,
    private _paymentHistory: PaymentHistory
  ) {}

  get name(): string {
    return this._name;
  }

  get billingPlan(): string {
    return this._billingPlan;
  }

  get paymentHistory(): PaymentHistory {
    return this._paymentHistory;
  }

  get isUnknown(): boolean {
    return false;
  }
}

// Special case: Unknown Customer
class UnknownCustomer extends Customer {
  constructor() {
    super("Occupant", "basic", { weeksDelinquent: 0 });
  }

  get isUnknown(): boolean {
    return true;
  }
}

function getCustomer(id: string): Customer {
  const customers: Record<string, Customer> = {
    "C1": new Customer("John Doe", "premium", { weeksDelinquent: 0 }),
    "C2": new Customer("Jane Smith", "standard", { weeksDelinquent: 2 }),
  };
  // Return special case instead of null
  return customers[id] || new UnknownCustomer();
}

// Client code - no null checks needed!
function processCustomer(customerId: string): string {
  const customer = getCustomer(customerId);

  // No null checks - the special case handles defaults
  return `Customer: ${customer.name}, Plan: ${customer.billingPlan}, Delinquent: ${customer.paymentHistory.weeksDelinquent} weeks`;
}

// ============================================================================
// EXAMPLE: Guest User Pattern
// ============================================================================

interface UserPreferences {
  theme: "light" | "dark";
  language: string;
  notifications: boolean;
}

abstract class User {
  abstract get id(): string;
  abstract get name(): string;
  abstract get email(): string;
  abstract get preferences(): UserPreferences;
  abstract get isGuest(): boolean;
  abstract canEdit(): boolean;
  abstract canDelete(): boolean;
}

class RegisteredUser extends User {
  constructor(
    private _id: string,
    private _name: string,
    private _email: string,
    private _preferences: UserPreferences
  ) {
    super();
  }

  get id(): string {
    return this._id;
  }
  get name(): string {
    return this._name;
  }
  get email(): string {
    return this._email;
  }
  get preferences(): UserPreferences {
    return this._preferences;
  }
  get isGuest(): boolean {
    return false;
  }
  canEdit(): boolean {
    return true;
  }
  canDelete(): boolean {
    return true;
  }
}

class GuestUser extends User {
  private static readonly DEFAULT_PREFERENCES: UserPreferences = {
    theme: "light",
    language: "en",
    notifications: false,
  };

  get id(): string {
    return "guest";
  }
  get name(): string {
    return "Guest";
  }
  get email(): string {
    return "";
  }
  get preferences(): UserPreferences {
    return GuestUser.DEFAULT_PREFERENCES;
  }
  get isGuest(): boolean {
    return true;
  }
  canEdit(): boolean {
    return false;
  }
  canDelete(): boolean {
    return false;
  }
}

// Factory function
function getCurrentUser(userId?: string): User {
  if (!userId) {
    return new GuestUser();
  }
  // In real app, fetch from database
  return new RegisteredUser(userId, "John Doe", "john@example.com", {
    theme: "dark",
    language: "en",
    notifications: true,
  });
}

// ============================================================================
// EXAMPLE: Missing Configuration
// ============================================================================

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  timeout: number;
}

class Configuration {
  constructor(
    private _name: string,
    private _database: DatabaseConfig
  ) {}

  get name(): string {
    return this._name;
  }

  get database(): DatabaseConfig {
    return this._database;
  }

  get isMissing(): boolean {
    return false;
  }
}

class MissingConfiguration extends Configuration {
  constructor() {
    super("default", {
      host: "localhost",
      port: 5432,
      database: "default_db",
      timeout: 5000,
    });
  }

  get isMissing(): boolean {
    return true;
  }
}

function loadConfig(env: string): Configuration {
  const configs: Record<string, Configuration> = {
    production: new Configuration("production", {
      host: "prod.db.com",
      port: 5432,
      database: "prod_db",
      timeout: 30000,
    }),
    development: new Configuration("development", {
      host: "localhost",
      port: 5432,
      database: "dev_db",
      timeout: 5000,
    }),
  };

  return configs[env] || new MissingConfiguration();
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Introduce Special Case Refactoring ===\n");

console.log("--- Customer Processing ---");
console.log("Known customer:", processCustomer("C1"));
console.log("Unknown customer:", processCustomer("UNKNOWN"));

const unknownCustomer = getCustomer("UNKNOWN");
console.log(`Is unknown: ${unknownCustomer.isUnknown}`);

console.log("\n--- Guest User Pattern ---");
const registeredUser = getCurrentUser("user123");
const guestUser = getCurrentUser();

console.log(`Registered: ${registeredUser.name}, Can edit: ${registeredUser.canEdit()}`);
console.log(`Guest: ${guestUser.name}, Can edit: ${guestUser.canEdit()}`);
console.log(`Guest preferences: ${JSON.stringify(guestUser.preferences)}`);

console.log("\n--- Configuration ---");
const prodConfig = loadConfig("production");
const unknownConfig = loadConfig("staging");

console.log(`Production: ${prodConfig.database.host}:${prodConfig.database.port}`);
console.log(`Missing config: ${unknownConfig.database.host}:${unknownConfig.database.port}`);
console.log(`Is missing: ${unknownConfig.isMissing}`);

export {};
