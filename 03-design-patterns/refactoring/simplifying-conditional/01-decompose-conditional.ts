/**
 * DECOMPOSE CONDITIONAL
 *
 * Extract the condition and each branch of an if-else into separate functions.
 *
 * Motivation:
 * - Complex conditionals are hard to understand
 * - The intent of the condition is often unclear
 * - Extracted functions name what the code does
 * - Makes it easier to see the structure
 *
 * Mechanics:
 * 1. Apply Extract Function on the condition
 * 2. Apply Extract Function on the then-path
 * 3. Apply Extract Function on the else-path
 * 4. Test
 */

// ============================================================================
// BEFORE: Complex inline conditional
// ============================================================================

interface DateBefore {
  month: number;
  day: number;
}

interface PlanBefore {
  summerStart: DateBefore;
  summerEnd: DateBefore;
  summerRate: number;
  regularRate: number;
  regularServiceCharge: number;
}

function calculateChargeBefore(date: DateBefore, plan: PlanBefore, quantity: number): number {
  // Complex condition that's hard to understand at a glance
  if (
    (date.month > plan.summerStart.month ||
      (date.month === plan.summerStart.month && date.day >= plan.summerStart.day)) &&
    (date.month < plan.summerEnd.month ||
      (date.month === plan.summerEnd.month && date.day <= plan.summerEnd.day))
  ) {
    // Summer pricing logic
    return quantity * plan.summerRate;
  } else {
    // Regular pricing logic
    return quantity * plan.regularRate + plan.regularServiceCharge;
  }
}

// ============================================================================
// AFTER: Decomposed into named functions
// ============================================================================

interface DateInfo {
  month: number;
  day: number;
}

interface BillingPlan {
  summerStart: DateInfo;
  summerEnd: DateInfo;
  summerRate: number;
  regularRate: number;
  regularServiceCharge: number;
}

// Condition extracted - now its meaning is clear
function isSummer(date: DateInfo, plan: BillingPlan): boolean {
  const afterSummerStart =
    date.month > plan.summerStart.month ||
    (date.month === plan.summerStart.month && date.day >= plan.summerStart.day);

  const beforeSummerEnd =
    date.month < plan.summerEnd.month ||
    (date.month === plan.summerEnd.month && date.day <= plan.summerEnd.day);

  return afterSummerStart && beforeSummerEnd;
}

// Each branch extracted - logic is named
function summerCharge(quantity: number, plan: BillingPlan): number {
  return quantity * plan.summerRate;
}

function regularCharge(quantity: number, plan: BillingPlan): number {
  return quantity * plan.regularRate + plan.regularServiceCharge;
}

// Main function is now clean and readable
function calculateCharge(date: DateInfo, plan: BillingPlan, quantity: number): number {
  if (isSummer(date, plan)) {
    return summerCharge(quantity, plan);
  } else {
    return regularCharge(quantity, plan);
  }
}

// Even more concise with ternary
function calculateChargeAlt(date: DateInfo, plan: BillingPlan, quantity: number): number {
  return isSummer(date, plan)
    ? summerCharge(quantity, plan)
    : regularCharge(quantity, plan);
}

// ============================================================================
// ANOTHER EXAMPLE: Order processing
// ============================================================================

interface Order {
  customer: { type: string; loyaltyPoints: number };
  items: Array<{ price: number; quantity: number }>;
  shippingAddress: { country: string };
}

// BEFORE: Long conditional with inline logic
function calculateOrderTotalBefore(order: Order): number {
  let total = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Complex condition for discount eligibility
  if (
    (order.customer.type === "premium" && order.customer.loyaltyPoints > 1000) ||
    (order.customer.type === "business" && total > 500)
  ) {
    // Premium discount calculation
    total = total * 0.9;
    if (order.customer.loyaltyPoints > 5000) {
      total = total - 50;
    }
  } else if (order.customer.type === "new" && total > 100) {
    // New customer discount
    total = total * 0.95;
  }

  // Shipping
  if (order.shippingAddress.country !== "US") {
    total = total + 25;
  }

  return total;
}

// AFTER: Decomposed into meaningful functions
function getSubtotal(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function isPremiumEligible(order: Order): boolean {
  const subtotal = getSubtotal(order);
  return (
    (order.customer.type === "premium" && order.customer.loyaltyPoints > 1000) ||
    (order.customer.type === "business" && subtotal > 500)
  );
}

function isNewCustomerEligible(order: Order): boolean {
  return order.customer.type === "new" && getSubtotal(order) > 100;
}

function applyPremiumDiscount(total: number, loyaltyPoints: number): number {
  let discounted = total * 0.9;
  if (loyaltyPoints > 5000) {
    discounted -= 50;
  }
  return discounted;
}

function applyNewCustomerDiscount(total: number): number {
  return total * 0.95;
}

function isInternational(order: Order): boolean {
  return order.shippingAddress.country !== "US";
}

function addInternationalShipping(total: number): number {
  return total + 25;
}

function calculateOrderTotal(order: Order): number {
  let total = getSubtotal(order);

  if (isPremiumEligible(order)) {
    total = applyPremiumDiscount(total, order.customer.loyaltyPoints);
  } else if (isNewCustomerEligible(order)) {
    total = applyNewCustomerDiscount(total);
  }

  if (isInternational(order)) {
    total = addInternationalShipping(total);
  }

  return total;
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Decompose Conditional Refactoring ===\n");

const plan: BillingPlan = {
  summerStart: { month: 6, day: 1 },
  summerEnd: { month: 8, day: 31 },
  summerRate: 0.15,
  regularRate: 0.1,
  regularServiceCharge: 20,
};

console.log("--- Billing Charges ---");
const summerDate: DateInfo = { month: 7, day: 15 };
const winterDate: DateInfo = { month: 12, day: 15 };

console.log(`Summer date (Jul 15): $${calculateCharge(summerDate, plan, 100)}`);
console.log(`Winter date (Dec 15): $${calculateCharge(winterDate, plan, 100)}`);

console.log(`\nIs Jul 15 summer? ${isSummer(summerDate, plan)}`);
console.log(`Is Dec 15 summer? ${isSummer(winterDate, plan)}`);

console.log("\n--- Order Processing ---");
const premiumOrder: Order = {
  customer: { type: "premium", loyaltyPoints: 6000 },
  items: [{ price: 100, quantity: 2 }],
  shippingAddress: { country: "US" },
};

const newCustomerOrder: Order = {
  customer: { type: "new", loyaltyPoints: 0 },
  items: [{ price: 150, quantity: 1 }],
  shippingAddress: { country: "CA" },
};

console.log("Premium customer order:");
console.log(`  Subtotal: $${getSubtotal(premiumOrder)}`);
console.log(`  Premium eligible: ${isPremiumEligible(premiumOrder)}`);
console.log(`  Total: $${calculateOrderTotal(premiumOrder)}`);

console.log("\nNew customer order:");
console.log(`  Subtotal: $${getSubtotal(newCustomerOrder)}`);
console.log(`  New customer eligible: ${isNewCustomerEligible(newCustomerOrder)}`);
console.log(`  International: ${isInternational(newCustomerOrder)}`);
console.log(`  Total: $${calculateOrderTotal(newCustomerOrder)}`);

export {};
