/**
 * EXTRACT FUNCTION
 *
 * Extract a fragment of code into its own function named after its purpose.
 * This is one of the most common refactorings.
 *
 * Motivation:
 * - When you have a code fragment that can be grouped together
 * - When you see a comment explaining what a block of code does
 * - When a function is too long and does multiple things
 * - When you need to reuse the same logic in multiple places
 *
 * Mechanics:
 * 1. Create a new function named after the intent of the code
 * 2. Copy the extracted code into the new function
 * 3. Scan the extracted code for local variables; pass as parameters
 * 4. Check for variables that are modified; return them if needed
 * 5. Replace the original code with a call to the new function
 * 6. Test
 */

// ============================================================================
// BEFORE: Code that needs extraction
// ============================================================================

interface OrderBefore {
  customer: string;
  items: Array<{ name: string; price: number; quantity: number }>;
  date: Date;
}

function printOwingBefore(order: OrderBefore): void {
  let outstanding = 0;

  // Print banner
  console.log("***********************");
  console.log("**** Customer Owes ****");
  console.log("***********************");

  // Calculate outstanding
  for (const item of order.items) {
    outstanding += item.price * item.quantity;
  }

  // Print details
  console.log(`Customer: ${order.customer}`);
  console.log(`Amount: $${outstanding.toFixed(2)}`);
  console.log(`Due: ${order.date.toLocaleDateString()}`);
}

// ============================================================================
// AFTER: Refactored with extracted functions
// ============================================================================

interface Order {
  customer: string;
  items: Array<{ name: string; price: number; quantity: number }>;
  date: Date;
}

function printBanner(): void {
  console.log("***********************");
  console.log("**** Customer Owes ****");
  console.log("***********************");
}

function calculateOutstanding(order: Order): number {
  return order.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
}

function printDetails(order: Order, outstanding: number): void {
  console.log(`Customer: ${order.customer}`);
  console.log(`Amount: $${outstanding.toFixed(2)}`);
  console.log(`Due: ${order.date.toLocaleDateString()}`);
}

function printOwing(order: Order): void {
  printBanner();
  const outstanding = calculateOutstanding(order);
  printDetails(order, outstanding);
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Extract Function Refactoring ===\n");

const sampleOrder: Order = {
  customer: "John Doe",
  items: [
    { name: "Widget", price: 25.0, quantity: 2 },
    { name: "Gadget", price: 15.5, quantity: 3 },
  ],
  date: new Date("2024-02-15"),
};

console.log("--- Before Refactoring (Monolithic) ---");
printOwingBefore(sampleOrder);

console.log("\n--- After Refactoring (Extracted Functions) ---");
printOwing(sampleOrder);

// Each extracted function can now be:
// - Tested independently
// - Reused elsewhere
// - Easily understood by its name

export {};
