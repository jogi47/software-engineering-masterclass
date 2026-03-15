/**
 * ENCAPSULATE RECORD
 *
 * Replace a record structure with a class that controls access to its data.
 * Formerly known as "Replace Record with Data Class".
 *
 * Motivation:
 * - Records (plain objects) expose their structure to all clients
 * - Changes to the record structure require changes to all clients
 * - A class provides a clear interface that can evolve independently
 * - Allows adding behavior and validation
 *
 * Mechanics:
 * 1. Create a class that wraps the record
 * 2. Add a getter that returns the raw record (for migration)
 * 3. Create accessors for each field
 * 4. Replace each use of the record with the appropriate accessor
 * 5. Remove the raw record getter once migration is complete
 */

// ============================================================================
// BEFORE: Plain record/object
// ============================================================================

interface OrganizationBefore {
  name: string;
  country: string;
}

// Direct access and mutation
const organizationBefore: OrganizationBefore = {
  name: "Acme Gooseberries",
  country: "GB",
};

// Clients access fields directly
function printOrgBefore(org: OrganizationBefore): void {
  console.log(`${org.name} (${org.country})`);
}

// Anyone can mutate
function renameOrgBefore(org: OrganizationBefore, newName: string): void {
  org.name = newName;
}

// ============================================================================
// AFTER: Encapsulated in a class
// ============================================================================

class Organization {
  private _name: string;
  private _country: string;

  constructor(data: { name: string; country: string }) {
    this._name = data.name;
    this._country = data.country;
  }

  // Controlled accessors
  get name(): string {
    return this._name;
  }

  set name(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error("Name cannot be empty");
    }
    this._name = value.trim();
  }

  get country(): string {
    return this._country;
  }

  set country(value: string) {
    const validCountries = ["US", "GB", "CA", "AU", "DE", "FR"];
    if (!validCountries.includes(value)) {
      throw new Error(`Invalid country code: ${value}`);
    }
    this._country = value;
  }

  // Behavior can be added
  get displayName(): string {
    return `${this._name} (${this._country})`;
  }

  clone(): Organization {
    return new Organization({ name: this._name, country: this._country });
  }
}

// ============================================================================
// ENCAPSULATING NESTED RECORDS
// ============================================================================

interface CustomerDataBefore {
  name: string;
  id: string;
  usages: Record<string, Record<string, number>>; // year -> month -> usage
}

// AFTER: Nested structure encapsulated
class CustomerData {
  private readonly _name: string;
  private readonly _id: string;
  private readonly _usages: Map<string, Map<string, number>>;

  constructor(data: { name: string; id: string; usages?: Record<string, Record<string, number>> }) {
    this._name = data.name;
    this._id = data.id;
    this._usages = new Map();

    if (data.usages) {
      for (const [year, months] of Object.entries(data.usages)) {
        const monthMap = new Map<string, number>();
        for (const [month, usage] of Object.entries(months)) {
          monthMap.set(month, usage);
        }
        this._usages.set(year, monthMap);
      }
    }
  }

  get name(): string {
    return this._name;
  }

  get id(): string {
    return this._id;
  }

  // Safe access to nested data
  getUsage(year: string, month: string): number {
    return this._usages.get(year)?.get(month) ?? 0;
  }

  setUsage(year: string, month: string, amount: number): void {
    if (amount < 0) {
      throw new Error("Usage cannot be negative");
    }
    if (!this._usages.has(year)) {
      this._usages.set(year, new Map());
    }
    this._usages.get(year)!.set(month, amount);
  }

  getTotalUsageForYear(year: string): number {
    const yearData = this._usages.get(year);
    if (!yearData) return 0;
    return Array.from(yearData.values()).reduce((sum, usage) => sum + usage, 0);
  }

  // Return a safe copy of usages
  getAllUsages(): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};
    for (const [year, months] of this._usages) {
      result[year] = {};
      for (const [month, usage] of months) {
        result[year][month] = usage;
      }
    }
    return result;
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Encapsulate Record Refactoring ===\n");

console.log("--- Before: Direct record access ---");
printOrgBefore(organizationBefore);
renameOrgBefore(organizationBefore, "Renamed Corp");
printOrgBefore(organizationBefore);

console.log("\n--- After: Encapsulated class ---");
const organization = new Organization({ name: "Acme Corp", country: "US" });
console.log(organization.displayName);

organization.name = "New Acme Corp";
console.log(organization.displayName);

console.log("\nTrying invalid operations:");
try {
  organization.name = "";
} catch (e) {
  console.log(`Error: ${(e as Error).message}`);
}

try {
  organization.country = "XX";
} catch (e) {
  console.log(`Error: ${(e as Error).message}`);
}

console.log("\n--- Nested Record Encapsulation ---");
const customer = new CustomerData({
  name: "John Doe",
  id: "C123",
  usages: {
    "2023": { "01": 100, "02": 120, "03": 90 },
    "2024": { "01": 110 },
  },
});

console.log(`Customer: ${customer.name}`);
console.log(`Usage Jan 2023: ${customer.getUsage("2023", "01")}`);
console.log(`Total 2023: ${customer.getTotalUsageForYear("2023")}`);

customer.setUsage("2024", "02", 130);
console.log(`Usage Feb 2024 (after update): ${customer.getUsage("2024", "02")}`);

// Getting all usages returns a safe copy
const usagesCopy = customer.getAllUsages();
usagesCopy["2024"]["02"] = 9999; // Won't affect original
console.log(`Original still: ${customer.getUsage("2024", "02")}`);

export {};
