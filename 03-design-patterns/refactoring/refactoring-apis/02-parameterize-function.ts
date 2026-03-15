/**
 * PARAMETERIZE FUNCTION
 *
 * Combine similar functions that differ only by literal values into a single
 * function with a parameter.
 *
 * Motivation:
 * - Reduces duplication between similar functions
 * - Makes it easier to add new variants
 * - Centralizes the logic in one place
 *
 * Mechanics:
 * 1. Identify similar functions that differ only by literal values
 * 2. Pick one and add a parameter for the differing value
 * 3. Replace callers of the other functions with the parameterized version
 * 4. Remove the now-unused functions
 */

// ============================================================================
// BEFORE: Similar functions with different literal values
// ============================================================================

function tenPercentRaise(salary: number): number {
  return salary * 1.1;
}

function fivePercentRaise(salary: number): number {
  return salary * 1.05;
}

// ============================================================================
// AFTER: Single parameterized function
// ============================================================================

function raise(salary: number, factor: number): number {
  return salary * (1 + factor);
}

function charge(usage: number, bottom: number, top: number, rate: number): number {
  if (usage < bottom) return 0;
  const billableUsage = Math.min(usage, top) - bottom;
  return billableUsage * rate;
}

function totalCharge(usage: number): number {
  return (
    charge(usage, 0, 100, 0.03) +
    charge(usage, 100, 200, 0.05) +
    charge(usage, 200, Infinity, 0.07)
  );
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Parameterize Function ===\n");

const salary = 50000;
console.log(`Original salary: $${salary}`);
console.log(`5% raise: $${raise(salary, 0.05)}`);
console.log(`10% raise: $${raise(salary, 0.1)}`);

const usages = [50, 150, 250];
usages.forEach((usage) => {
  console.log(`Usage ${usage}: $${totalCharge(usage).toFixed(2)}`);
});

// Suppress unused warnings
void tenPercentRaise;
void fivePercentRaise;

export {};
