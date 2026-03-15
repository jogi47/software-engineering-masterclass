/**
 * RENAME VARIABLE
 *
 * Change the name of a variable to better communicate its purpose.
 *
 * Motivation:
 * - Good names are the heart of clear programming
 * - Names should explain what's in the variable
 * - Renaming is a key part of understanding code
 * - Poor names are a major source of confusion
 *
 * Mechanics:
 * 1. If the variable is widely used, consider Encapsulate Variable first
 * 2. Find all references to the variable and change them
 * 3. Test
 *
 * For widely scoped variables, consider creating accessors to make
 * the rename easier.
 */

// ============================================================================
// BEFORE: Cryptic variable names
// ============================================================================

function calculatePriceBefore(q: number, ip: number): number {
  const bp = q * ip;
  const d = Math.max(0, q - 500) * ip * 0.05;
  const s = Math.min(bp * 0.1, 100);
  return bp - d + s;
}

function processOrderBefore(o: { c: string; i: Array<{ n: string; p: number; q: number }> }): void {
  let t = 0;
  for (const itm of o.i) {
    t += itm.p * itm.q;
  }
  console.log(`Customer: ${o.c}, Total: ${t}`);
}

// ============================================================================
// AFTER: Clear, descriptive variable names
// ============================================================================

function calculatePrice(quantity: number, itemPrice: number): number {
  const basePrice = quantity * itemPrice;
  const quantityDiscount = Math.max(0, quantity - 500) * itemPrice * 0.05;
  const shipping = Math.min(basePrice * 0.1, 100);
  return basePrice - quantityDiscount + shipping;
}

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  customer: string;
  items: OrderItem[];
}

function processOrder(order: Order): void {
  let total = 0;
  for (const item of order.items) {
    total += item.price * item.quantity;
  }
  console.log(`Customer: ${order.customer}, Total: ${total}`);
}

// ============================================================================
// NAMING GUIDELINES
// ============================================================================

// 1. Use intention-revealing names
function getElapsedTimeInDays(startDate: Date, endDate: Date): number {
  const millisPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((endDate.getTime() - startDate.getTime()) / millisPerDay);
}

// 2. Avoid abbreviations (unless universally understood)
function calculateBodyMassIndex(weightKg: number, heightM: number): number {
  return weightKg / (heightM * heightM);
}

// 3. Use searchable names
const DAYS_IN_WEEK = 7;
const WORK_DAYS_PER_WEEK = 5;

function getWeeksWorked(totalWorkDays: number): number {
  return Math.floor(totalWorkDays / WORK_DAYS_PER_WEEK);
}

// 4. Boolean variables should read like predicates
interface Account {
  isActive: boolean;
  hasOverdraftProtection: boolean;
  canWithdraw: boolean;
}

function checkAccountStatus(account: Account): string {
  if (!account.isActive) return "Account is inactive";
  if (!account.canWithdraw) return "Withdrawals disabled";
  return "Account ready";
}

// 5. Collection names should be plural
function getActiveUsers(users: string[]): string[] {
  return users.filter((user) => user !== "inactive");
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Rename Variable Refactoring ===\n");

console.log("--- Price Calculation (Renamed) ---");
console.log(`Price (100 items @ $10): $${calculatePrice(100, 10).toFixed(2)}`);
console.log(`Price (600 items @ $10): $${calculatePrice(600, 10).toFixed(2)}`);

console.log("\n--- Order Processing (Renamed) ---");
const order: Order = {
  customer: "John Doe",
  items: [
    { name: "Widget", price: 25, quantity: 2 },
    { name: "Gadget", price: 15, quantity: 3 },
  ],
};
processOrder(order);

console.log("\n--- Elapsed Time (Clear naming) ---");
const start = new Date("2024-01-01");
const end = new Date("2024-01-15");
console.log(`Days elapsed: ${getElapsedTimeInDays(start, end)}`);

console.log("\n--- BMI Calculation (No abbreviations) ---");
console.log(`BMI (70kg, 1.75m): ${calculateBodyMassIndex(70, 1.75).toFixed(1)}`);

console.log("\n--- Work Weeks (Searchable constants) ---");
console.log(`Weeks worked in 100 work days: ${getWeeksWorked(100)}`);

export {};
