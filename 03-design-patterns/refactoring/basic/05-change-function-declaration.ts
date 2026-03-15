/**
 * CHANGE FUNCTION DECLARATION
 *
 * Rename a function, add/remove parameters, or change parameter order.
 * Also known as: Rename Function, Rename Method, Add Parameter,
 * Remove Parameter, Change Signature.
 *
 * Motivation:
 * - When the name no longer reflects what the function does
 * - When you need to add or remove parameters
 * - When the function's interface doesn't fit the usage pattern
 * - When migrating to a cleaner API
 *
 * Mechanics (Simple):
 * 1. Change the declaration
 * 2. Find all callers and update them
 * 3. Test
 *
 * Mechanics (Migration - for widely used functions):
 * 1. Create a new function with the new signature
 * 2. Copy the body to the new function
 * 3. Have the old function call the new function
 * 4. Replace callers one by one
 * 5. Remove the old function
 */

// ============================================================================
// EXAMPLE 1: Renaming a function
// ============================================================================

// BEFORE: Poor name that doesn't express intent
function circum(radius: number): number {
  return 2 * Math.PI * radius;
}

// AFTER: Clear, intention-revealing name
function circumference(radius: number): number {
  return 2 * Math.PI * radius;
}

// ============================================================================
// EXAMPLE 2: Adding a parameter
// ============================================================================

// BEFORE: Hardcoded behavior
function bookConcertBefore(customer: string): string {
  return `Booked for ${customer} in regular section`;
}

// AFTER: Flexible with parameter
function bookConcert(customer: string, isPremium: boolean = false): string {
  const section = isPremium ? "premium" : "regular";
  return `Booked for ${customer} in ${section} section`;
}

// ============================================================================
// EXAMPLE 3: Removing a parameter
// ============================================================================

// BEFORE: Unused parameter
function calculateAreaBefore(width: number, height: number, _unit: string): number {
  // _unit was never used
  return width * height;
}

// AFTER: Clean signature
function calculateArea(width: number, height: number): number {
  return width * height;
}

// ============================================================================
// EXAMPLE 4: Migration strategy for widely used functions
// ============================================================================

interface Customer {
  name: string;
  state: string;
}

// Original function used in many places
function inNewEnglandOld(customer: Customer): boolean {
  return ["MA", "CT", "ME", "VT", "NH", "RI"].includes(customer.state);
}

// Step 1: Create new function with better signature
function inNewEngland(stateCode: string): boolean {
  return ["MA", "CT", "ME", "VT", "NH", "RI"].includes(stateCode);
}

// Step 2: Old function delegates to new (during migration)
function inNewEnglandMigration(customer: Customer): boolean {
  return inNewEngland(customer.state);
}

// Step 3: Eventually remove old function, callers use new API

// ============================================================================
// EXAMPLE 5: Changing parameter to more appropriate type
// ============================================================================

// BEFORE: Takes entire object when only one field is needed
function notifyByPhoneBefore(customer: Customer): void {
  console.log(`Calling customer: ${customer.name}`);
}

// AFTER: Takes just what it needs
function notifyByPhone(customerName: string): void {
  console.log(`Calling customer: ${customerName}`);
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Change Function Declaration Refactoring ===\n");

console.log("--- Renamed Function ---");
console.log(`Circumference of circle (r=5): ${circumference(5).toFixed(2)}`);

console.log("\n--- Added Parameter ---");
console.log(bookConcert("Alice"));
console.log(bookConcert("Bob", true));

console.log("\n--- Removed Parameter ---");
console.log(`Area: ${calculateArea(10, 20)} sq units`);

console.log("\n--- Migration Strategy ---");
const customer1: Customer = { name: "John", state: "MA" };
const customer2: Customer = { name: "Jane", state: "CA" };

// Old style (during migration)
console.log(`${customer1.name} in New England (old): ${inNewEnglandOld(customer1)}`);
console.log(`${customer2.name} in New England (old): ${inNewEnglandOld(customer2)}`);

// New style (after migration)
console.log(`State MA in New England (new): ${inNewEngland("MA")}`);
console.log(`State CA in New England (new): ${inNewEngland("CA")}`);

console.log("\n--- Changed Parameter Type ---");
notifyByPhone(customer1.name);

export {};
