/**
 * SUBSTITUTE ALGORITHM
 *
 * Replace the body of a method with a new algorithm.
 *
 * Motivation:
 * - When you find a clearer way to do something
 * - When a simpler algorithm can replace a complex one
 * - When performance requirements change
 * - When you need to use a library that does the same thing
 *
 * Mechanics:
 * 1. Arrange the code to be replaced so it fills a complete function
 * 2. Prepare tests using this function
 * 3. Prepare the new algorithm
 * 4. Run tests with both implementations
 * 5. If results match, replace the old with the new
 */

// ============================================================================
// EXAMPLE 1: Simplifying a complex algorithm
// ============================================================================

// BEFORE: Complex nested loops
function foundPersonBefore(people: string[]): string {
  for (let i = 0; i < people.length; i++) {
    if (people[i] === "Don") {
      return "Don";
    }
    if (people[i] === "John") {
      return "John";
    }
    if (people[i] === "Kent") {
      return "Kent";
    }
  }
  return "";
}

// AFTER: Using simpler array methods
function foundPerson(people: string[]): string {
  const candidates = ["Don", "John", "Kent"];
  return people.find((person) => candidates.includes(person)) ?? "";
}

// ============================================================================
// EXAMPLE 2: Improving performance
// ============================================================================

// BEFORE: O(n) search each time
function isInListBefore(items: string[], searchFor: string[]): boolean[] {
  const results: boolean[] = [];
  for (const search of searchFor) {
    let found = false;
    for (const item of items) {
      if (item === search) {
        found = true;
        break;
      }
    }
    results.push(found);
  }
  return results;
}

// AFTER: O(1) lookup with Set
function isInList(items: string[], searchFor: string[]): boolean[] {
  const itemSet = new Set(items);
  return searchFor.map((search) => itemSet.has(search));
}

// ============================================================================
// EXAMPLE 3: Better string manipulation
// ============================================================================

// BEFORE: Manual string parsing
function parseQueryStringBefore(queryString: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!queryString || queryString.length === 0) {
    return result;
  }

  let cleaned = queryString;
  if (cleaned.startsWith("?")) {
    cleaned = cleaned.substring(1);
  }

  const pairs = cleaned.split("&");
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    const equalsIndex = pair.indexOf("=");
    if (equalsIndex > 0) {
      const key = pair.substring(0, equalsIndex);
      const value = pair.substring(equalsIndex + 1);
      result[key] = decodeURIComponent(value);
    }
  }
  return result;
}

// AFTER: Using URLSearchParams
function parseQueryString(queryString: string): Record<string, string> {
  const params = new URLSearchParams(queryString);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

// ============================================================================
// EXAMPLE 4: Sorting algorithm substitution
// ============================================================================

// BEFORE: Bubble sort (simple but slow)
function sortNumbersBefore(numbers: number[]): number[] {
  const result = [...numbers];
  let swapped: boolean;
  do {
    swapped = false;
    for (let i = 0; i < result.length - 1; i++) {
      if (result[i] > result[i + 1]) {
        [result[i], result[i + 1]] = [result[i + 1], result[i]];
        swapped = true;
      }
    }
  } while (swapped);
  return result;
}

// AFTER: Using built-in sort (optimized)
function sortNumbers(numbers: number[]): number[] {
  return [...numbers].sort((a, b) => a - b);
}

// ============================================================================
// EXAMPLE 5: Replacing with a more readable algorithm
// ============================================================================

interface Employee {
  name: string;
  department: string;
  salary: number;
}

// BEFORE: Imperative grouping
function groupByDepartmentBefore(employees: Employee[]): Map<string, Employee[]> {
  const groups = new Map<string, Employee[]>();
  for (const employee of employees) {
    const dept = employee.department;
    if (!groups.has(dept)) {
      groups.set(dept, []);
    }
    groups.get(dept)!.push(employee);
  }
  return groups;
}

// AFTER: Functional approach
function groupByDepartment(employees: Employee[]): Map<string, Employee[]> {
  return employees.reduce((groups, employee) => {
    const existing = groups.get(employee.department) ?? [];
    groups.set(employee.department, [...existing, employee]);
    return groups;
  }, new Map<string, Employee[]>());
}

// Even better with Object.groupBy (ES2024) or lodash
function groupByDepartmentSimple(employees: Employee[]): Record<string, Employee[]> {
  const result: Record<string, Employee[]> = {};
  for (const emp of employees) {
    (result[emp.department] ??= []).push(emp);
  }
  return result;
}

// ============================================================================
// EXAMPLE 6: Date calculation algorithm
// ============================================================================

// BEFORE: Manual date calculation
function addDaysBefore(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getWeekdaysOnlyBefore(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  let current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      dates.push(new Date(current));
    }
    current = addDaysBefore(current, 1);
  }
  return dates;
}

// AFTER: Using generator for cleaner iteration
function* dateRange(start: Date, end: Date): Generator<Date> {
  const current = new Date(start);
  while (current <= end) {
    yield new Date(current);
    current.setDate(current.getDate() + 1);
  }
}

function getWeekdaysOnly(start: Date, end: Date): Date[] {
  return [...dateRange(start, end)].filter((date) => {
    const day = date.getDay();
    return day !== 0 && day !== 6;
  });
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Substitute Algorithm Refactoring ===\n");

console.log("--- Find Person ---");
const people = ["Alice", "Bob", "John", "Charlie"];
console.log(`Before: ${foundPersonBefore(people)}`);
console.log(`After: ${foundPerson(people)}`);

console.log("\n--- List Search Performance ---");
const items = ["apple", "banana", "cherry", "date"];
const searchFor = ["banana", "fig", "date"];
console.log(`Before: ${isInListBefore(items, searchFor)}`);
console.log(`After: ${isInList(items, searchFor)}`);

console.log("\n--- Query String Parsing ---");
const query = "?name=John%20Doe&age=30&city=New%20York";
console.log("Before:", parseQueryStringBefore(query));
console.log("After:", parseQueryString(query));

console.log("\n--- Sorting ---");
const numbers = [64, 34, 25, 12, 22, 11, 90];
console.log(`Original: ${numbers}`);
console.log(`Before (bubble): ${sortNumbersBefore(numbers)}`);
console.log(`After (built-in): ${sortNumbers(numbers)}`);

console.log("\n--- Group By Department ---");
const employees: Employee[] = [
  { name: "Alice", department: "Engineering", salary: 100000 },
  { name: "Bob", department: "Sales", salary: 80000 },
  { name: "Charlie", department: "Engineering", salary: 90000 },
  { name: "Diana", department: "Sales", salary: 85000 },
];

const grouped = groupByDepartmentSimple(employees);
for (const [dept, emps] of Object.entries(grouped)) {
  console.log(`${dept}: ${emps.map((e) => e.name).join(", ")}`);
}

console.log("\n--- Weekdays Generator ---");
const start = new Date("2024-01-08"); // Monday
const end = new Date("2024-01-14"); // Sunday
const weekdays = getWeekdaysOnly(start, end);
console.log("Weekdays:", weekdays.map((d) => d.toDateString()));

export {};
