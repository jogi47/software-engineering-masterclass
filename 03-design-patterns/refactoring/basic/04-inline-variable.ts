/**
 * INLINE VARIABLE
 *
 * Replace a variable with the expression it represents.
 * The inverse of Extract Variable.
 *
 * Motivation:
 * - When the variable name doesn't communicate more than the expression
 * - When the variable gets in the way of refactoring nearby code
 * - When the expression is simple and self-explanatory
 *
 * Mechanics:
 * 1. Check that the right-hand side of the assignment has no side effects
 * 2. If the variable is not already declared immutable, make it so and test
 * 3. Find the first reference to the variable and replace with the expression
 * 4. Test
 * 5. Repeat for each reference
 * 6. Remove the variable declaration
 */

// ============================================================================
// BEFORE: Unnecessary intermediate variables
// ============================================================================

interface ProductBefore {
  name: string;
  basePrice: number;
}

function isExpensiveBefore(product: ProductBefore): boolean {
  const basePrice = product.basePrice;
  return basePrice > 1000;
}

function getFormattedPriceBefore(product: ProductBefore): string {
  const price = product.basePrice;
  const formatted = `$${price.toFixed(2)}`;
  return formatted;
}

// Another example with order
interface OrderBefore {
  basePrice: number;
}

function getDiscountBefore(order: OrderBefore): number {
  const basePrice = order.basePrice;
  const hasDiscount = basePrice > 500;
  if (hasDiscount) {
    return basePrice * 0.1;
  }
  return 0;
}

// ============================================================================
// AFTER: Variables inlined where they add no value
// ============================================================================

interface Product {
  name: string;
  basePrice: number;
}

function isExpensive(product: Product): boolean {
  return product.basePrice > 1000;
}

function getFormattedPrice(product: Product): string {
  return `$${product.basePrice.toFixed(2)}`;
}

interface Order {
  basePrice: number;
}

function getDiscount(order: Order): number {
  // Variable inlined - the expression is clear enough
  if (order.basePrice > 500) {
    return order.basePrice * 0.1;
  }
  return 0;
}

// ============================================================================
// WHEN NOT TO INLINE
// ============================================================================

// Sometimes variables should be kept for clarity
function calculateTax(order: Order): number {
  // Keep this variable - it documents the business rule
  const taxRate = 0.08;
  return order.basePrice * taxRate;
}

// Keep when expression is used multiple times
function getOrderSummary(order: Order): string {
  const basePrice = order.basePrice; // Keep - used twice
  const discount = basePrice > 500 ? basePrice * 0.1 : 0;
  const finalPrice = basePrice - discount;
  return `Base: $${basePrice}, Discount: $${discount}, Final: $${finalPrice}`;
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Inline Variable Refactoring ===\n");

const laptop: Product = { name: "MacBook Pro", basePrice: 2499 };
const mouse: Product = { name: "Mouse", basePrice: 49 };

console.log("--- Product Checks ---");
console.log(`${laptop.name}: Expensive? ${isExpensive(laptop)}`);
console.log(`${mouse.name}: Expensive? ${isExpensive(mouse)}`);

console.log("\n--- Formatted Prices ---");
console.log(`${laptop.name}: ${getFormattedPrice(laptop)}`);
console.log(`${mouse.name}: ${getFormattedPrice(mouse)}`);

const bigOrder: Order = { basePrice: 750 };
const smallOrder: Order = { basePrice: 200 };

console.log("\n--- Order Discounts ---");
console.log(`Order $750: Discount = $${getDiscount(bigOrder)}`);
console.log(`Order $200: Discount = $${getDiscount(smallOrder)}`);

console.log("\n--- Order Summary (kept variable) ---");
console.log(getOrderSummary(bigOrder));

export {};
