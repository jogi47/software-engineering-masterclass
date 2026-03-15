/**
 * REMOVE FLAG ARGUMENT
 *
 * Replace a boolean flag argument with separate functions for each case.
 *
 * Motivation:
 * - Boolean flags make function calls unclear
 * - What does "true" or "false" mean at the call site?
 * - Separate functions are more explicit and self-documenting
 *
 * Mechanics:
 * 1. Create separate functions for each value of the flag
 * 2. Move the logic for each case into its function
 * 3. Replace callers with the appropriate function
 */

// ============================================================================
// BEFORE: Boolean flag arguments
// ============================================================================

function bookConcertBefore(customer: string, isPremium: boolean): void {
  if (isPremium) {
    console.log(`Premium booking for ${customer}`);
  } else {
    console.log(`Standard booking for ${customer}`);
  }
}

// ============================================================================
// AFTER: Separate functions with clear names
// ============================================================================

function bookPremiumConcert(customer: string): void {
  console.log(`Premium booking for ${customer}: Front row seats reserved`);
}

function bookStandardConcert(customer: string): void {
  console.log(`Standard booking for ${customer}: General admission`);
}

// For complex cases, use options object
interface DeliveryOptions {
  orderId: string;
  rush?: boolean;
  requireSignature?: boolean;
}

function deliver(options: DeliveryOptions): void {
  let message = `Delivering order ${options.orderId}`;
  if (options.rush) message += " (RUSH)";
  if (options.requireSignature) message += " - signature required";
  console.log(message);
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Remove Flag Argument ===\n");

bookPremiumConcert("Alice");
bookStandardConcert("Bob");

deliver({ orderId: "ORD-001" });
deliver({ orderId: "ORD-002", rush: true, requireSignature: true });

void bookConcertBefore;

export {};
