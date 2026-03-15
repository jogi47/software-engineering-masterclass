/**
 * REMOVE DEAD CODE
 *
 * Delete code that is no longer executed or referenced.
 *
 * Motivation:
 * - Dead code clutters the codebase
 * - Makes it harder to understand what code is actually doing
 * - Can mislead developers into thinking it's important
 * - Source control keeps history if needed
 *
 * Mechanics:
 * 1. If the dead code can be referenced externally, search for references
 * 2. Remove the dead code
 * 3. Test
 *
 * Common forms of dead code:
 * - Unreachable code after return/throw
 * - Unused functions, classes, or variables
 * - Commented-out code
 * - Feature flags that are always on/off
 */

// ============================================================================
// BEFORE: Code with dead sections
// ============================================================================

// Unused constant
const LEGACY_API_VERSION = "v1";

// Unused function
function deprecatedCalculation(x: number): number {
  return x * 2 + 1;
}

// Function with dead code
function processValueBefore(value: number): string {
  if (value < 0) {
    return "negative";
  }

  // This code is never reached
  if (value < 0) {
    return "also negative"; // Dead code
  }

  // Commented out code - just clutters
  // const oldResult = value * 0.5;
  // if (oldResult > 100) {
  //   return "legacy high";
  // }

  if (value === 0) {
    return "zero";
  }

  return "positive";
}

// Class with unused methods
class CalculatorBefore {
  add(a: number, b: number): number {
    return a + b;
  }

  subtract(a: number, b: number): number {
    return a - b;
  }

  // Never used
  oldMultiply(a: number, b: number): number {
    // Old implementation kept "just in case"
    let result = 0;
    for (let i = 0; i < b; i++) {
      result += a;
    }
    return result;
  }

  multiply(a: number, b: number): number {
    return a * b;
  }
}

// Feature flag that's always true
const ENABLE_NEW_FEATURE = true;

function processWithFeatureFlagBefore(data: string): string {
  if (ENABLE_NEW_FEATURE) {
    return data.toUpperCase();
  } else {
    // This branch is never executed
    return data.toLowerCase();
  }
}

// ============================================================================
// AFTER: Clean code without dead sections
// ============================================================================

function processValue(value: number): string {
  if (value < 0) {
    return "negative";
  }

  if (value === 0) {
    return "zero";
  }

  return "positive";
}

class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }

  subtract(a: number, b: number): number {
    return a - b;
  }

  multiply(a: number, b: number): number {
    return a * b;
  }
}

// Feature flag removed - code just does the thing
function processWithFeatureFlag(data: string): string {
  return data.toUpperCase();
}

// ============================================================================
// EXAMPLE: Removing dead branches
// ============================================================================

type UserRole = "admin" | "user" | "guest";

// BEFORE: Dead branch for removed role
function getPermissionsBefore(role: UserRole): string[] {
  switch (role) {
    case "admin":
      return ["read", "write", "delete", "admin"];
    case "user":
      return ["read", "write"];
    case "guest":
      return ["read"];
    // "moderator" role was removed but case left behind
    // case "moderator":
    //   return ["read", "write", "moderate"];
    default:
      return [];
  }
}

// AFTER: Only active branches
function getPermissions(role: UserRole): string[] {
  switch (role) {
    case "admin":
      return ["read", "write", "delete", "admin"];
    case "user":
      return ["read", "write"];
    case "guest":
      return ["read"];
  }
}

// ============================================================================
// EXAMPLE: Cleaning up unused parameters
// ============================================================================

// BEFORE: Unused parameter kept for "compatibility"
function formatMessageBefore(
  text: string,
  _options: { deprecated?: boolean }, // Never used
  uppercase: boolean
): string {
  return uppercase ? text.toUpperCase() : text;
}

// AFTER: Clean signature
function formatMessage(text: string, uppercase: boolean): string {
  return uppercase ? text.toUpperCase() : text;
}

// ============================================================================
// IDENTIFYING DEAD CODE
// ============================================================================

class DeadCodeExamples {
  private usedField = "I am used";
  private _unusedField = "Nobody reads me"; // Dead

  usedMethod(): string {
    return this.usedField;
  }

  // Dead - never called
  unusedMethod(): void {
    console.log("This never runs");
  }

  methodWithDeadCode(): number {
    const result = 42;
    return result;

    // Everything below is unreachable
    console.log("Never printed");
    return 0;
  }

  methodWithDeadVariable(): number {
    const used = 10;
    const _unused = 20; // Dead - assigned but never read
    return used * 2;
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Remove Dead Code Refactoring ===\n");

console.log("--- Process Value (cleaned) ---");
console.log(`-5: ${processValue(-5)}`);
console.log(`0: ${processValue(0)}`);
console.log(`5: ${processValue(5)}`);

console.log("\n--- Calculator (no unused methods) ---");
const calc = new Calculator();
console.log(`2 + 3 = ${calc.add(2, 3)}`);
console.log(`5 - 2 = ${calc.subtract(5, 2)}`);
console.log(`4 * 3 = ${calc.multiply(4, 3)}`);

console.log("\n--- Feature Flag Removed ---");
console.log(`Result: ${processWithFeatureFlag("hello")}`);

console.log("\n--- Permissions (clean switch) ---");
console.log(`Admin: ${getPermissions("admin").join(", ")}`);
console.log(`User: ${getPermissions("user").join(", ")}`);
console.log(`Guest: ${getPermissions("guest").join(", ")}`);

console.log("\n--- Format Message (clean signature) ---");
console.log(`Normal: ${formatMessage("hello world", false)}`);
console.log(`Uppercase: ${formatMessage("hello world", true)}`);

console.log("\n--- Types of Dead Code ---");
console.log("1. Unreachable code after return/throw");
console.log("2. Unused functions, methods, or classes");
console.log("3. Unused variables or parameters");
console.log("4. Commented-out code");
console.log("5. Feature flags that never change");
console.log("6. Dead branches in conditionals");

export {};
