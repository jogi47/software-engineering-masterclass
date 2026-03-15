/**
 * SLIDE STATEMENTS
 *
 * Move statements so that related code appears together.
 *
 * Motivation:
 * - Code is easier to understand when related things are together
 * - Makes it easier to extract functions
 * - Variable declarations should be near their use
 * - Setup code should be near the code that uses the setup
 *
 * Mechanics:
 * 1. Identify the target position for the statements
 * 2. Check if any statement being slid over affects the statements being moved
 * 3. Check for side effects and dependencies
 * 4. Move the statements to the target position
 * 5. Test
 */

// ============================================================================
// BEFORE: Related code scattered
// ============================================================================

function calculatePriceBefore(quantity: number, pricePerUnit: number): void {
  // Price-related variables declared far from use
  const pricingResult = { base: 0, discount: 0, total: 0 };

  // Unrelated logging
  console.log("Starting calculation...");

  // Tax calculation in the middle
  const taxRate = 0.08;

  // Base price calculation (far from result assignment)
  const basePrice = quantity * pricePerUnit;

  // More unrelated code
  const timestamp = new Date().toISOString();

  // Discount calculation
  let discountRate = 0;
  if (quantity > 100) {
    discountRate = 0.1;
  } else if (quantity > 50) {
    discountRate = 0.05;
  }

  // Finally using earlier variables
  const discount = basePrice * discountRate;
  const tax = (basePrice - discount) * taxRate;
  const total = basePrice - discount + tax;

  // Assign to result object
  pricingResult.base = basePrice;
  pricingResult.discount = discount;
  pricingResult.total = total;

  console.log(`[${timestamp}] Price: $${pricingResult.total.toFixed(2)}`);
}

// ============================================================================
// AFTER: Related code grouped together
// ============================================================================

function calculatePrice(quantity: number, pricePerUnit: number): void {
  console.log("Starting calculation...");
  const timestamp = new Date().toISOString();

  // Price calculations grouped together
  const basePrice = quantity * pricePerUnit;
  const discountRate = quantity > 100 ? 0.1 : quantity > 50 ? 0.05 : 0;
  const discount = basePrice * discountRate;

  // Tax calculation near where it's used
  const taxRate = 0.08;
  const tax = (basePrice - discount) * taxRate;
  const total = basePrice - discount + tax;

  // Result object created and populated together
  const pricingResult = {
    base: basePrice,
    discount: discount,
    total: total,
  };

  console.log(`[${timestamp}] Price: $${pricingResult.total.toFixed(2)}`);
}

// ============================================================================
// EXAMPLE: Preparing for Extract Function
// ============================================================================

interface Order {
  items: Array<{ price: number; quantity: number }>;
  customerId: string;
}

// BEFORE: Mixed concerns make extraction hard
function processOrderBefore(order: Order): string {
  let result = "";

  // Customer lookup scattered from its use
  const customer = { name: "John", discount: 0.1 };

  // Validation mixed with calculation
  if (order.items.length === 0) {
    return "Error: No items";
  }

  // Some calculation
  let subtotal = 0;
  for (const item of order.items) {
    subtotal += item.price * item.quantity;
  }

  // More validation
  if (subtotal > 10000 && customer.discount > 0.15) {
    return "Error: Discount too high for large orders";
  }

  // Final calculation
  const discount = subtotal * customer.discount;
  const total = subtotal - discount;

  result = `Order for ${customer.name}: $${total.toFixed(2)}`;
  return result;
}

// AFTER: Related statements grouped - ready for extraction
function processOrder(order: Order): string {
  // Validation grouped at the top
  if (order.items.length === 0) {
    return "Error: No items";
  }

  // Customer lookup near its use
  const customer = { name: "John", discount: 0.1 };

  // All calculations together
  const subtotal = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Validation that depends on calculation
  if (subtotal > 10000 && customer.discount > 0.15) {
    return "Error: Discount too high for large orders";
  }

  const discount = subtotal * customer.discount;
  const total = subtotal - discount;

  // Result formatting
  return `Order for ${customer.name}: $${total.toFixed(2)}`;
}

// ============================================================================
// EXAMPLE: Variable declarations near first use
// ============================================================================

// BEFORE: All declarations at top
function formatReportBefore(data: number[]): string {
  // Variables declared far from use
  let total: number;
  let average: number;
  let max: number;
  let min: number;
  const lines: string[] = [];

  // Much later...
  total = data.reduce((a, b) => a + b, 0);
  lines.push(`Total: ${total}`);

  average = total / data.length;
  lines.push(`Average: ${average.toFixed(2)}`);

  max = Math.max(...data);
  min = Math.min(...data);
  lines.push(`Range: ${min} - ${max}`);

  return lines.join("\n");
}

// AFTER: Declarations near first use
function formatReport(data: number[]): string {
  const lines: string[] = [];

  // Each variable declared where it's first used
  const total = data.reduce((a, b) => a + b, 0);
  lines.push(`Total: ${total}`);

  const average = total / data.length;
  lines.push(`Average: ${average.toFixed(2)}`);

  const max = Math.max(...data);
  const min = Math.min(...data);
  lines.push(`Range: ${min} - ${max}`);

  return lines.join("\n");
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Slide Statements Refactoring ===\n");

console.log("--- Price Calculation (grouped) ---");
calculatePrice(75, 10);

console.log("\n--- Order Processing ---");
const order: Order = {
  customerId: "C123",
  items: [
    { price: 100, quantity: 2 },
    { price: 50, quantity: 3 },
  ],
};
console.log(processOrder(order));

console.log("\n--- Report Formatting ---");
const data = [10, 20, 30, 40, 50];
console.log(formatReport(data));

console.log("\n--- Benefits of Sliding Statements ---");
console.log("1. Easier to read - related code is together");
console.log("2. Easier to extract functions - dependencies are clear");
console.log("3. Variables are declared near their use");
console.log("4. Side effects are more visible");

export {};
