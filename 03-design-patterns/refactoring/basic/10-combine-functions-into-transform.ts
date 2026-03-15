/**
 * COMBINE FUNCTIONS INTO TRANSFORM
 *
 * Group functions that derive values from the same source data
 * into a transform function that produces an enriched data structure.
 *
 * Motivation:
 * - When you have multiple functions deriving values from the same data
 * - Want to avoid duplicate calculations
 * - Prefer a functional approach over classes
 * - The transformed data becomes a convenient summary of all derivations
 *
 * Mechanics:
 * 1. Create a transform function that takes the input and returns a copy
 * 2. Add each derived value to the output
 * 3. Replace callers to use the transformed record
 *
 * Note: Use Combine Functions into Class when updates to source data
 * need to be reflected in derived values. Use Transform when the
 * source data is read-only.
 */

// ============================================================================
// BEFORE: Multiple functions deriving from the same data
// ============================================================================

interface RawReading {
  customer: string;
  quantity: number;
  month: number;
  year: number;
}

// Scattered calculation functions
function calculateBaseRateBefore(month: number): number {
  const winterMonths = [12, 1, 2];
  return winterMonths.includes(month) ? 0.15 : 0.10;
}

function calculateBaseChargeBefore(reading: RawReading): number {
  return calculateBaseRateBefore(reading.month) * reading.quantity;
}

function calculateTaxableChargeBefore(reading: RawReading): number {
  const threshold = reading.year > 2020 ? 50 : 40;
  return Math.max(0, calculateBaseChargeBefore(reading) - threshold);
}

// ============================================================================
// AFTER: Transform function that enriches the data
// ============================================================================

interface EnrichedReading extends RawReading {
  baseRate: number;
  baseCharge: number;
  taxThreshold: number;
  taxableCharge: number;
  tax: number;
  totalBill: number;
}

function enrichReading(raw: RawReading): EnrichedReading {
  // Start with a copy of the original
  const result = { ...raw } as EnrichedReading;

  // Add derived values
  const winterMonths = [12, 1, 2];
  result.baseRate = winterMonths.includes(raw.month) ? 0.15 : 0.10;
  result.baseCharge = result.baseRate * raw.quantity;
  result.taxThreshold = raw.year > 2020 ? 50 : 40;
  result.taxableCharge = Math.max(0, result.baseCharge - result.taxThreshold);
  result.tax = result.taxableCharge * 0.1;
  result.totalBill = result.baseCharge + result.tax;

  return result;
}

// ============================================================================
// ANOTHER EXAMPLE: User data enrichment
// ============================================================================

interface RawUser {
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
}

interface EnrichedUser extends RawUser {
  fullName: string;
  age: number;
  isAdult: boolean;
  emailDomain: string;
  initials: string;
}

function enrichUser(raw: RawUser): EnrichedUser {
  const birthDate = new Date(raw.birthDate);
  const today = new Date();
  const age = Math.floor(
    (today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  return {
    ...raw,
    fullName: `${raw.firstName} ${raw.lastName}`,
    age,
    isAdult: age >= 18,
    emailDomain: raw.email.split("@")[1] || "",
    initials: `${raw.firstName[0]}${raw.lastName[0]}`.toUpperCase(),
  };
}

// ============================================================================
// PIPELINE TRANSFORMS
// ============================================================================

interface RawOrder {
  items: Array<{ product: string; price: number; quantity: number }>;
  customerId: string;
  couponCode?: string;
}

interface EnrichedOrder extends RawOrder {
  itemCount: number;
  subtotal: number;
  discountRate: number;
  discountAmount: number;
  taxableAmount: number;
  tax: number;
  total: number;
}

// Composable transform functions
const calculateItemCount = (order: RawOrder) =>
  order.items.reduce((sum, item) => sum + item.quantity, 0);

const calculateSubtotal = (order: RawOrder) =>
  order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

const getDiscountRate = (couponCode?: string): number => {
  const discounts: Record<string, number> = {
    SAVE10: 0.1,
    SAVE20: 0.2,
    VIP: 0.15,
  };
  return couponCode ? (discounts[couponCode] || 0) : 0;
};

function enrichOrder(raw: RawOrder): EnrichedOrder {
  const subtotal = calculateSubtotal(raw);
  const discountRate = getDiscountRate(raw.couponCode);
  const discountAmount = subtotal * discountRate;
  const taxableAmount = subtotal - discountAmount;
  const tax = taxableAmount * 0.08;

  return {
    ...raw,
    itemCount: calculateItemCount(raw),
    subtotal,
    discountRate,
    discountAmount,
    taxableAmount,
    tax,
    total: taxableAmount + tax,
  };
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Combine Functions into Transform Refactoring ===\n");

console.log("--- Before: Calling separate functions ---");
const rawReading: RawReading = {
  customer: "Alice",
  quantity: 400,
  month: 1,
  year: 2024,
};
console.log(`Base charge: $${calculateBaseChargeBefore(rawReading).toFixed(2)}`);
console.log(`Taxable charge: $${calculateTaxableChargeBefore(rawReading).toFixed(2)}`);

console.log("\n--- After: Using transform ---");
const enrichedReading = enrichReading(rawReading);
console.log(`Customer: ${enrichedReading.customer}`);
console.log(`Base rate: $${enrichedReading.baseRate}/unit`);
console.log(`Base charge: $${enrichedReading.baseCharge.toFixed(2)}`);
console.log(`Tax threshold: $${enrichedReading.taxThreshold}`);
console.log(`Taxable charge: $${enrichedReading.taxableCharge.toFixed(2)}`);
console.log(`Tax: $${enrichedReading.tax.toFixed(2)}`);
console.log(`Total bill: $${enrichedReading.totalBill.toFixed(2)}`);

console.log("\n--- User enrichment ---");
const rawUser: RawUser = {
  firstName: "John",
  lastName: "Doe",
  birthDate: "1990-05-15",
  email: "john.doe@example.com",
};
const enrichedUser = enrichUser(rawUser);
console.log(`Full name: ${enrichedUser.fullName}`);
console.log(`Initials: ${enrichedUser.initials}`);
console.log(`Age: ${enrichedUser.age}`);
console.log(`Is adult: ${enrichedUser.isAdult}`);
console.log(`Email domain: ${enrichedUser.emailDomain}`);

console.log("\n--- Order enrichment ---");
const rawOrder: RawOrder = {
  customerId: "C123",
  couponCode: "SAVE10",
  items: [
    { product: "Widget", price: 50, quantity: 2 },
    { product: "Gadget", price: 30, quantity: 1 },
  ],
};
const enrichedOrder = enrichOrder(rawOrder);
console.log(`Item count: ${enrichedOrder.itemCount}`);
console.log(`Subtotal: $${enrichedOrder.subtotal.toFixed(2)}`);
console.log(`Discount (${enrichedOrder.discountRate * 100}%): -$${enrichedOrder.discountAmount.toFixed(2)}`);
console.log(`Tax: +$${enrichedOrder.tax.toFixed(2)}`);
console.log(`Total: $${enrichedOrder.total.toFixed(2)}`);

export {};
