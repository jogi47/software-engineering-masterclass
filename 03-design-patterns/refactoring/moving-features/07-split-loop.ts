/**
 * SPLIT LOOP
 *
 * Split a loop that does multiple things into separate loops that each
 * do one thing.
 *
 * Motivation:
 * - A loop doing multiple things is harder to understand
 * - Split loops are easier to reason about
 * - Enables extracting each loop into its own function
 * - Often leads to cleaner, more composable code
 *
 * Note: May seem inefficient, but usually the performance impact is negligible.
 * Optimize only after measuring.
 *
 * Mechanics:
 * 1. Copy the loop
 * 2. Identify and remove the duplicate side effects
 * 3. Test
 * 4. Consider extracting each loop to its own function
 */

// ============================================================================
// BEFORE: Single loop doing multiple things
// ============================================================================

interface PersonBefore {
  name: string;
  age: number;
  salary: number;
}

function analyzeDataBefore(people: PersonBefore[]): void {
  // One loop calculating multiple unrelated things
  let youngest = people[0];
  let totalSalary = 0;
  let oldestAge = 0;
  let highestPaid = people[0];

  for (const person of people) {
    // Finding youngest
    if (person.age < youngest.age) {
      youngest = person;
    }

    // Calculating total salary
    totalSalary += person.salary;

    // Finding oldest age
    if (person.age > oldestAge) {
      oldestAge = person.age;
    }

    // Finding highest paid
    if (person.salary > highestPaid.salary) {
      highestPaid = person;
    }
  }

  console.log(`Youngest: ${youngest.name} (${youngest.age})`);
  console.log(`Total salary: $${totalSalary}`);
  console.log(`Oldest age: ${oldestAge}`);
  console.log(`Highest paid: ${highestPaid.name} ($${highestPaid.salary})`);
}

// ============================================================================
// AFTER: Separate loops, each doing one thing
// ============================================================================

interface Person {
  name: string;
  age: number;
  salary: number;
}

function findYoungest(people: Person[]): Person {
  return people.reduce((youngest, person) =>
    person.age < youngest.age ? person : youngest
  );
}

function calculateTotalSalary(people: Person[]): number {
  return people.reduce((total, person) => total + person.salary, 0);
}

function findOldestAge(people: Person[]): number {
  return people.reduce((oldest, person) =>
    person.age > oldest ? person.age : oldest, 0
  );
}

function findHighestPaid(people: Person[]): Person {
  return people.reduce((highest, person) =>
    person.salary > highest.salary ? person : highest
  );
}

function analyzeData(people: Person[]): void {
  // Each calculation is now a clean, focused function
  const youngest = findYoungest(people);
  const totalSalary = calculateTotalSalary(people);
  const oldestAge = findOldestAge(people);
  const highestPaid = findHighestPaid(people);

  console.log(`Youngest: ${youngest.name} (${youngest.age})`);
  console.log(`Total salary: $${totalSalary}`);
  console.log(`Oldest age: ${oldestAge}`);
  console.log(`Highest paid: ${highestPaid.name} ($${highestPaid.salary})`);
}

// ============================================================================
// EXAMPLE: Processing transactions
// ============================================================================

interface Transaction {
  type: "credit" | "debit";
  amount: number;
  category: string;
}

// BEFORE: One loop for all calculations
function summarizeTransactionsBefore(transactions: Transaction[]): void {
  let totalCredits = 0;
  let totalDebits = 0;
  const categoryTotals: Map<string, number> = new Map();
  let largestTransaction = transactions[0];

  for (const tx of transactions) {
    if (tx.type === "credit") {
      totalCredits += tx.amount;
    } else {
      totalDebits += tx.amount;
    }

    const current = categoryTotals.get(tx.category) || 0;
    categoryTotals.set(tx.category, current + tx.amount);

    if (tx.amount > largestTransaction.amount) {
      largestTransaction = tx;
    }
  }

  console.log(`Credits: $${totalCredits}, Debits: $${totalDebits}`);
}

// AFTER: Split into focused functions
function sumByType(transactions: Transaction[], type: "credit" | "debit"): number {
  return transactions
    .filter((tx) => tx.type === type)
    .reduce((sum, tx) => sum + tx.amount, 0);
}

function groupByCategory(transactions: Transaction[]): Map<string, number> {
  return transactions.reduce((map, tx) => {
    const current = map.get(tx.category) || 0;
    map.set(tx.category, current + tx.amount);
    return map;
  }, new Map<string, number>());
}

function findLargest(transactions: Transaction[]): Transaction {
  return transactions.reduce((largest, tx) =>
    tx.amount > largest.amount ? tx : largest
  );
}

function summarizeTransactions(transactions: Transaction[]): void {
  const totalCredits = sumByType(transactions, "credit");
  const totalDebits = sumByType(transactions, "debit");
  const categoryTotals = groupByCategory(transactions);
  const largest = findLargest(transactions);

  console.log(`Credits: $${totalCredits}`);
  console.log(`Debits: $${totalDebits}`);
  console.log(`Net: $${totalCredits - totalDebits}`);
  console.log(`Categories:`);
  categoryTotals.forEach((amount, category) => {
    console.log(`  ${category}: $${amount}`);
  });
  console.log(`Largest: $${largest.amount} (${largest.category})`);
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Split Loop Refactoring ===\n");

const people: Person[] = [
  { name: "Alice", age: 25, salary: 75000 },
  { name: "Bob", age: 35, salary: 95000 },
  { name: "Charlie", age: 28, salary: 65000 },
  { name: "Diana", age: 42, salary: 120000 },
];

console.log("--- Before: Single loop ---");
analyzeDataBefore(people);

console.log("\n--- After: Split loops (same results) ---");
analyzeData(people);

console.log("\n--- Transaction Summary ---");
const transactions: Transaction[] = [
  { type: "credit", amount: 1000, category: "Sales" },
  { type: "debit", amount: 200, category: "Supplies" },
  { type: "credit", amount: 500, category: "Sales" },
  { type: "debit", amount: 1500, category: "Equipment" },
  { type: "credit", amount: 300, category: "Services" },
];

summarizeTransactions(transactions);

console.log("\n--- Benefits ---");
console.log("1. Each function does one thing");
console.log("2. Functions can be tested independently");
console.log("3. Functions can be reused elsewhere");
console.log("4. Code is easier to understand");

export {};
