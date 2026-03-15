/**
 * REPLACE LOOP WITH PIPELINE
 *
 * Replace a loop with a collection pipeline (map, filter, reduce, etc.).
 *
 * Motivation:
 * - Pipelines describe the logic as a series of operations
 * - Each step's purpose is clearer
 * - Easier to follow the flow of data
 * - Common operations have names (filter, map, reduce)
 *
 * Mechanics:
 * 1. Create a new variable for the loop's collection
 * 2. Starting at the top of the loop, take each bit of behavior and
 *    replace it with a collection pipeline operation
 * 3. Test after each change
 */

// ============================================================================
// BEFORE: Traditional loops
// ============================================================================

interface EmployeeBefore {
  name: string;
  department: string;
  salary: number;
  active: boolean;
}

function getActiveEngineerSalariesBefore(employees: EmployeeBefore[]): number[] {
  const result: number[] = [];
  for (const employee of employees) {
    if (employee.active) {
      if (employee.department === "Engineering") {
        result.push(employee.salary);
      }
    }
  }
  return result;
}

function getTotalSalaryByDepartmentBefore(
  employees: EmployeeBefore[],
  department: string
): number {
  let total = 0;
  for (const employee of employees) {
    if (employee.department === department && employee.active) {
      total += employee.salary;
    }
  }
  return total;
}

function getEmployeeNamesBefore(employees: EmployeeBefore[]): string[] {
  const names: string[] = [];
  for (const employee of employees) {
    names.push(employee.name);
  }
  return names;
}

// ============================================================================
// AFTER: Collection pipelines
// ============================================================================

interface Employee {
  name: string;
  department: string;
  salary: number;
  active: boolean;
}

function getActiveEngineerSalaries(employees: Employee[]): number[] {
  return employees
    .filter((e) => e.active)
    .filter((e) => e.department === "Engineering")
    .map((e) => e.salary);
}

function getTotalSalaryByDepartment(employees: Employee[], department: string): number {
  return employees
    .filter((e) => e.department === department)
    .filter((e) => e.active)
    .reduce((sum, e) => sum + e.salary, 0);
}

function getEmployeeNames(employees: Employee[]): string[] {
  return employees.map((e) => e.name);
}

// ============================================================================
// MORE COMPLEX EXAMPLE: Data transformation
// ============================================================================

interface RawOrder {
  id: string;
  customerId: string;
  items: string;
  total: string;
  status: string;
}

interface ProcessedOrder {
  id: string;
  customerId: string;
  items: string[];
  total: number;
  status: string;
  isComplete: boolean;
}

// BEFORE: Imperative processing
function processOrdersBefore(rawOrders: RawOrder[]): ProcessedOrder[] {
  const result: ProcessedOrder[] = [];

  for (const order of rawOrders) {
    // Parse items
    const items = order.items.split(",").map((item) => item.trim());

    // Parse total
    const total = parseFloat(order.total);

    // Skip invalid orders
    if (isNaN(total) || total <= 0) {
      continue;
    }

    // Skip cancelled orders
    if (order.status === "cancelled") {
      continue;
    }

    // Create processed order
    result.push({
      id: order.id,
      customerId: order.customerId,
      items,
      total,
      status: order.status,
      isComplete: order.status === "completed",
    });
  }

  return result;
}

// AFTER: Pipeline processing
function processOrders(rawOrders: RawOrder[]): ProcessedOrder[] {
  return rawOrders
    .map((order) => ({
      ...order,
      parsedItems: order.items.split(",").map((item) => item.trim()),
      parsedTotal: parseFloat(order.total),
    }))
    .filter((order) => !isNaN(order.parsedTotal) && order.parsedTotal > 0)
    .filter((order) => order.status !== "cancelled")
    .map((order) => ({
      id: order.id,
      customerId: order.customerId,
      items: order.parsedItems,
      total: order.parsedTotal,
      status: order.status,
      isComplete: order.status === "completed",
    }));
}

// ============================================================================
// EXAMPLE: Text processing pipeline
// ============================================================================

// BEFORE: Loop-based word frequency
function wordFrequencyBefore(text: string): Map<string, number> {
  const words = text.toLowerCase().split(/\s+/);
  const frequency = new Map<string, number>();

  for (const word of words) {
    const cleaned = word.replace(/[^a-z]/g, "");
    if (cleaned.length > 0) {
      const count = frequency.get(cleaned) || 0;
      frequency.set(cleaned, count + 1);
    }
  }

  return frequency;
}

// AFTER: Pipeline-based word frequency
function wordFrequency(text: string): Map<string, number> {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z]/g, ""))
    .filter((word) => word.length > 0)
    .reduce((freq, word) => {
      freq.set(word, (freq.get(word) || 0) + 1);
      return freq;
    }, new Map<string, number>());
}

// Get top N words
function topWords(text: string, n: number): Array<[string, number]> {
  const freq = wordFrequency(text);
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Replace Loop with Pipeline Refactoring ===\n");

const employees: Employee[] = [
  { name: "Alice", department: "Engineering", salary: 100000, active: true },
  { name: "Bob", department: "Sales", salary: 80000, active: true },
  { name: "Charlie", department: "Engineering", salary: 90000, active: false },
  { name: "Diana", department: "Engineering", salary: 110000, active: true },
  { name: "Eve", department: "HR", salary: 70000, active: true },
];

console.log("--- Employee Analysis (Pipeline) ---");
console.log(`All names: ${getEmployeeNames(employees).join(", ")}`);
console.log(`Active engineer salaries: ${getActiveEngineerSalaries(employees)}`);
console.log(`Total Engineering salary: $${getTotalSalaryByDepartment(employees, "Engineering")}`);
console.log(`Total Sales salary: $${getTotalSalaryByDepartment(employees, "Sales")}`);

console.log("\n--- Order Processing ---");
const rawOrders: RawOrder[] = [
  { id: "1", customerId: "C1", items: "Widget, Gadget", total: "150.00", status: "completed" },
  { id: "2", customerId: "C2", items: "Tool", total: "invalid", status: "pending" },
  { id: "3", customerId: "C1", items: "Part", total: "75.50", status: "cancelled" },
  { id: "4", customerId: "C3", items: "Device, Cable", total: "200.00", status: "completed" },
];

const processed = processOrders(rawOrders);
console.log(`Processed ${processed.length} orders:`);
processed.forEach((order) => {
  console.log(`  ${order.id}: $${order.total} - ${order.items.join(", ")} [${order.status}]`);
});

console.log("\n--- Word Frequency ---");
const text = "The quick brown fox jumps over the lazy dog. The dog was not amused.";
const top = topWords(text, 5);
console.log("Top 5 words:");
top.forEach(([word, count]) => console.log(`  "${word}": ${count}`));

export {};
