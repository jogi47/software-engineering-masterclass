/**
 * REPLACE INLINE CODE WITH FUNCTION CALL
 *
 * Replace inline code with a call to an existing function that does the same thing.
 *
 * Motivation:
 * - Reduces duplication by reusing existing functions
 * - The function name can better express intent
 * - Functions in libraries are often better tested and optimized
 * - Changes only need to be made in one place
 *
 * Mechanics:
 * 1. Find the function that does what the inline code does
 * 2. Replace the inline code with a call to that function
 * 3. Test
 */

// ============================================================================
// BEFORE: Inline code that duplicates existing functionality
// ============================================================================

function processArrayBefore(items: string[]): void {
  // Inline check for inclusion - Array.includes exists!
  let hasApple = false;
  for (const item of items) {
    if (item === "apple") {
      hasApple = true;
      break;
    }
  }
  console.log(`Has apple: ${hasApple}`);

  // Inline mapping - Array.map exists!
  const upperItems: string[] = [];
  for (const item of items) {
    upperItems.push(item.toUpperCase());
  }
  console.log(`Upper: ${upperItems.join(", ")}`);

  // Inline filtering - Array.filter exists!
  const longItems: string[] = [];
  for (const item of items) {
    if (item.length > 4) {
      longItems.push(item);
    }
  }
  console.log(`Long items: ${longItems.join(", ")}`);

  // Inline reduce - Array.reduce exists!
  let totalLength = 0;
  for (const item of items) {
    totalLength += item.length;
  }
  console.log(`Total length: ${totalLength}`);
}

// ============================================================================
// AFTER: Using existing functions
// ============================================================================

function processArray(items: string[]): void {
  // Using Array.includes
  const hasApple = items.includes("apple");
  console.log(`Has apple: ${hasApple}`);

  // Using Array.map
  const upperItems = items.map((item) => item.toUpperCase());
  console.log(`Upper: ${upperItems.join(", ")}`);

  // Using Array.filter
  const longItems = items.filter((item) => item.length > 4);
  console.log(`Long items: ${longItems.join(", ")}`);

  // Using Array.reduce
  const totalLength = items.reduce((sum, item) => sum + item.length, 0);
  console.log(`Total length: ${totalLength}`);
}

// ============================================================================
// EXAMPLE: String operations
// ============================================================================

// BEFORE: Inline string manipulation
function formatNameBefore(firstName: string, lastName: string): string {
  // Manual trimming
  let cleanFirst = firstName;
  while (cleanFirst.startsWith(" ")) {
    cleanFirst = cleanFirst.slice(1);
  }
  while (cleanFirst.endsWith(" ")) {
    cleanFirst = cleanFirst.slice(0, -1);
  }

  // Manual case conversion
  const firstUpper = cleanFirst.charAt(0).toUpperCase() + cleanFirst.slice(1).toLowerCase();

  return `${firstUpper} ${lastName}`;
}

// AFTER: Using existing string methods
function formatName(firstName: string, lastName: string): string {
  const cleanFirst = firstName.trim();
  const firstCapitalized = cleanFirst.charAt(0).toUpperCase() + cleanFirst.slice(1).toLowerCase();
  return `${firstCapitalized} ${lastName.trim()}`;
}

// ============================================================================
// EXAMPLE: Using existing utility functions
// ============================================================================

// Utility library (imagine this exists in your codebase)
const utils = {
  clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  },

  isEmpty(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === "string") return value.trim() === "";
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "object") return Object.keys(value).length === 0;
    return false;
  },

  capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },
};

// BEFORE: Duplicating utility logic
function validateInputBefore(value: number, name: string): number {
  // Inline clamp
  let result = value;
  if (result < 0) result = 0;
  if (result > 100) result = 100;

  // Inline isEmpty check
  if (name === null || name === undefined || name.trim() === "") {
    throw new Error("Name is required");
  }

  return result;
}

// AFTER: Using utilities
function validateInput(value: number, name: string): number {
  const result = utils.clamp(value, 0, 100);

  if (utils.isEmpty(name)) {
    throw new Error("Name is required");
  }

  return result;
}

// ============================================================================
// EXAMPLE: Date operations
// ============================================================================

// BEFORE: Manual date calculations
function getDateInfoBefore(date: Date): object {
  // Manual day name lookup
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = days[date.getDay()];

  // Manual month name lookup
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthName = months[date.getMonth()];

  // Manual date comparison
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  return { dayName, monthName, isToday };
}

// AFTER: Using Intl API
function getDateInfo(date: Date): object {
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  const monthName = date.toLocaleDateString("en-US", { month: "long" });
  const isToday = date.toDateString() === new Date().toDateString();

  return { dayName, monthName, isToday };
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Replace Inline Code with Function Call ===\n");

console.log("--- Array Processing ---");
const fruits = ["apple", "banana", "cherry", "date"];
console.log("Before (inline):");
processArrayBefore(fruits);
console.log("\nAfter (using built-ins):");
processArray(fruits);

console.log("\n--- String Formatting ---");
console.log(`Before: "${formatNameBefore("  JOHN  ", "DOE")}"`);
console.log(`After: "${formatName("  JOHN  ", "DOE")}"`);

console.log("\n--- Using Utilities ---");
console.log(`Clamp 150 to 0-100: ${utils.clamp(150, 0, 100)}`);
console.log(`isEmpty(""): ${utils.isEmpty("")}`);
console.log(`isEmpty([1,2]): ${utils.isEmpty([1, 2])}`);
console.log(`Validated input: ${validateInput(150, "test")}`);

console.log("\n--- Date Info ---");
const today = new Date();
const dateInfo = getDateInfo(today);
console.log(`Day: ${(dateInfo as any).dayName}`);
console.log(`Month: ${(dateInfo as any).monthName}`);
console.log(`Is today: ${(dateInfo as any).isToday}`);

export {};
