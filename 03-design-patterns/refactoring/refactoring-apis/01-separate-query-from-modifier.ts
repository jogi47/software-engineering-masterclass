/**
 * SEPARATE QUERY FROM MODIFIER
 *
 * Split a function that returns a value and has side effects into two functions.
 *
 * Motivation:
 * - Functions that return a value should be free of side effects
 * - Queries (functions that return values) should be callable without consequences
 * - Modifiers (functions with side effects) should not return values
 * - Makes code easier to test and reason about
 *
 * Mechanics:
 * 1. Copy the function and name it as a query
 * 2. Remove side effects from the query
 * 3. Remove the return value from the original (now a modifier)
 * 4. Find callers and split their calls
 */

// ============================================================================
// BEFORE: Function that both queries and modifies
// ============================================================================

class SecuritySystemBefore {
  private _alerts: string[] = [];

  alertAndReturnMiscreant(people: string[]): string {
    for (const person of people) {
      if (person === "Don" || person === "John") {
        this._alerts.push(`Alert: ${person} found!`);
        return person;
      }
    }
    return "";
  }

  get alerts(): string[] {
    return [...this._alerts];
  }
}

// ============================================================================
// AFTER: Separate query and modifier
// ============================================================================

class SecuritySystem {
  private _alerts: string[] = [];

  // Query: pure function, no side effects
  findMiscreant(people: string[]): string {
    for (const person of people) {
      if (person === "Don" || person === "John") {
        return person;
      }
    }
    return "";
  }

  // Modifier: has side effects, no return value
  alertMiscreant(people: string[]): void {
    const miscreant = this.findMiscreant(people);
    if (miscreant) {
      this._alerts.push(`Alert: ${miscreant} found!`);
    }
  }

  get alerts(): string[] {
    return [...this._alerts];
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Separate Query from Modifier ===\n");

const security = new SecuritySystem();
const suspects = ["Alice", "Bob", "Don", "Charlie"];

const miscreant = security.findMiscreant(suspects);
console.log(`Miscreant found: ${miscreant}`);
console.log(`Alerts before: ${security.alerts.length}`);

if (miscreant) {
  security.alertMiscreant(suspects);
}
console.log(`Alerts after: ${security.alerts.length}`);

export {};
