/**
 * ENCAPSULATE VARIABLE
 *
 * Replace direct access to a variable with accessor functions.
 *
 * Motivation:
 * - Data is harder to refactor than functions
 * - Provides a clear point to monitor changes to the data
 * - Allows adding validation or transformation logic
 * - Easier to move data structure around
 *
 * Mechanics:
 * 1. Create encapsulating functions to access and update the variable
 * 2. Replace each reference with the appropriate function
 * 3. Restrict the visibility of the variable
 * 4. Test
 */

// ============================================================================
// BEFORE: Direct access to global/module data
// ============================================================================

// Global data accessed directly everywhere
let defaultOwnerDataBefore = { firstName: "Martin", lastName: "Fowler" };

function printOwnerBefore(): void {
  console.log(`Owner: ${defaultOwnerDataBefore.firstName} ${defaultOwnerDataBefore.lastName}`);
}

function changeOwnerBefore(first: string, last: string): void {
  // Direct mutation - hard to track who changes it
  defaultOwnerDataBefore.firstName = first;
  defaultOwnerDataBefore.lastName = last;
}

// ============================================================================
// AFTER: Encapsulated with accessor functions
// ============================================================================

// Private variable - not directly accessible
let defaultOwnerData = { firstName: "Martin", lastName: "Fowler" };

// Getter function - single point of access
function getDefaultOwner() {
  // Return a copy to prevent direct mutation
  return { ...defaultOwnerData };
}

// Setter function - single point of update
function setDefaultOwner(owner: { firstName: string; lastName: string }): void {
  // Can add validation here
  if (!owner.firstName || !owner.lastName) {
    throw new Error("Owner must have first and last name");
  }
  defaultOwnerData = { ...owner };
}

function printOwner(): void {
  const owner = getDefaultOwner();
  console.log(`Owner: ${owner.firstName} ${owner.lastName}`);
}

// ============================================================================
// ADVANCED: Encapsulating a record with defensive copies
// ============================================================================

interface Config {
  apiUrl: string;
  timeout: number;
  features: string[];
}

class ConfigManager {
  private config: Config = {
    apiUrl: "https://api.example.com",
    timeout: 5000,
    features: ["auth", "logging"],
  };

  // Return deep copy to prevent external mutation
  getConfig(): Config {
    return {
      ...this.config,
      features: [...this.config.features],
    };
  }

  // Controlled update with validation
  updateConfig(updates: Partial<Config>): void {
    if (updates.timeout !== undefined && updates.timeout < 0) {
      throw new Error("Timeout must be positive");
    }
    this.config = {
      ...this.config,
      ...updates,
      features: updates.features
        ? [...updates.features]
        : [...this.config.features],
    };
  }

  // Specific accessors for common operations
  getApiUrl(): string {
    return this.config.apiUrl;
  }

  isFeatureEnabled(feature: string): boolean {
    return this.config.features.includes(feature);
  }

  enableFeature(feature: string): void {
    if (!this.config.features.includes(feature)) {
      this.config.features.push(feature);
    }
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Encapsulate Variable Refactoring ===\n");

console.log("--- Basic Encapsulation ---");
printOwner();

console.log("\nChanging owner through setter...");
setDefaultOwner({ firstName: "Kent", lastName: "Beck" });
printOwner();

console.log("\nTrying to set invalid owner...");
try {
  setDefaultOwner({ firstName: "", lastName: "Nobody" });
} catch (e) {
  console.log(`Error: ${(e as Error).message}`);
}

console.log("\n--- Config Manager ---");
const configManager = new ConfigManager();

console.log("Initial config:", configManager.getConfig());

// Try to mutate the returned config (won't affect internal state)
const config = configManager.getConfig();
config.timeout = 9999;
console.log("After external mutation attempt:", configManager.getConfig().timeout);

// Proper update through setter
configManager.updateConfig({ timeout: 10000 });
console.log("After proper update:", configManager.getConfig().timeout);

console.log("\nFeature checks:");
console.log(`Auth enabled: ${configManager.isFeatureEnabled("auth")}`);
console.log(`Caching enabled: ${configManager.isFeatureEnabled("caching")}`);

configManager.enableFeature("caching");
console.log(`Caching enabled (after adding): ${configManager.isFeatureEnabled("caching")}`);

export {};
