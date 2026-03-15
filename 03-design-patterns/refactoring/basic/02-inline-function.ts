/**
 * INLINE FUNCTION
 *
 * Replace a function call with the body of the function.
 * The inverse of Extract Function.
 *
 * Motivation:
 * - When a function body is as clear as its name
 * - When you have a group of badly factored functions
 * - When indirection is needless and irritating
 * - When you want to refactor a group of functions (inline first, then re-extract)
 *
 * Mechanics:
 * 1. Check that the function is not polymorphic (no overrides)
 * 2. Find all callers of the function
 * 3. Replace each call with the function body
 * 4. Test after each replacement
 * 5. Remove the function definition
 */

// ============================================================================
// BEFORE: Overly extracted functions
// ============================================================================

class DriverBefore {
  private numberOfLateDeliveries: number;

  constructor(lateDeliveries: number) {
    this.numberOfLateDeliveries = lateDeliveries;
  }

  get lateDeliveries(): number {
    return this.numberOfLateDeliveries;
  }
}

function moreThanFiveLateDeliveries(driver: DriverBefore): boolean {
  return driver.lateDeliveries > 5;
}

function getRatingBefore(driver: DriverBefore): number {
  return moreThanFiveLateDeliveries(driver) ? 2 : 1;
}

// Another example: function that just delegates
function reportLinesBefore(customer: { name: string; location: string }): string[] {
  const lines: string[] = [];
  gatherCustomerData(lines, customer);
  return lines;
}

function gatherCustomerData(out: string[], customer: { name: string; location: string }): void {
  out.push(`Name: ${customer.name}`);
  out.push(`Location: ${customer.location}`);
}

// ============================================================================
// AFTER: Inlined functions where appropriate
// ============================================================================

class Driver {
  private numberOfLateDeliveries: number;

  constructor(lateDeliveries: number) {
    this.numberOfLateDeliveries = lateDeliveries;
  }

  get lateDeliveries(): number {
    return this.numberOfLateDeliveries;
  }
}

// The condition is simple enough to be inline
function getRating(driver: Driver): number {
  return driver.lateDeliveries > 5 ? 2 : 1;
}

// The delegation is removed, logic is inline
function reportLines(customer: { name: string; location: string }): string[] {
  const lines: string[] = [];
  lines.push(`Name: ${customer.name}`);
  lines.push(`Location: ${customer.location}`);
  return lines;
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Inline Function Refactoring ===\n");

const driver1 = new Driver(3);
const driver2 = new Driver(7);

console.log("--- Driver Ratings ---");
console.log(`Driver with 3 late deliveries: Rating ${getRating(driver1)}`);
console.log(`Driver with 7 late deliveries: Rating ${getRating(driver2)}`);

console.log("\n--- Customer Report ---");
const customer = { name: "Acme Corp", location: "New York" };
const lines = reportLines(customer);
lines.forEach((line) => console.log(line));

// Key insight: Not every piece of code needs its own function.
// Simple, clear expressions can be inline.

export {};
