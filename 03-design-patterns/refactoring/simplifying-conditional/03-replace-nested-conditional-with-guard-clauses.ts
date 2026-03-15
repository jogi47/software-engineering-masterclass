/**
 * REPLACE NESTED CONDITIONAL WITH GUARD CLAUSES
 *
 * Replace deeply nested conditionals with guard clauses that return early.
 *
 * Motivation:
 * - Nested conditionals obscure the main logic
 * - Guard clauses express "if this exceptional case, get out"
 * - Main flow becomes clearer without nesting
 * - Easier to understand the happy path
 *
 * Mechanics:
 * 1. Pick the outermost condition that should be a guard
 * 2. Replace it with a guard clause (early return)
 * 3. Test
 * 4. Repeat for other conditions
 */

// ============================================================================
// BEFORE: Deeply nested conditionals
// ============================================================================

interface EmployeeBefore {
  isSeparated: boolean;
  isRetired: boolean;
  salary: number;
}

function getPayAmountBefore(employee: EmployeeBefore): number {
  let result: number;

  if (employee.isSeparated) {
    result = 0;
  } else {
    if (employee.isRetired) {
      result = employee.salary * 0.5;
    } else {
      result = employee.salary;
    }
  }

  return result;
}

// Even worse: triple nesting
function processOrderBefore(
  order: { valid: boolean; paid: boolean; shipped: boolean; items: number }
): string {
  let result: string;

  if (order.valid) {
    if (order.paid) {
      if (!order.shipped) {
        result = `Shipping ${order.items} items`;
      } else {
        result = "Already shipped";
      }
    } else {
      result = "Payment pending";
    }
  } else {
    result = "Invalid order";
  }

  return result;
}

// ============================================================================
// AFTER: Guard clauses with early returns
// ============================================================================

interface Employee {
  isSeparated: boolean;
  isRetired: boolean;
  salary: number;
}

function getPayAmount(employee: Employee): number {
  // Guard clause: handle exceptional cases first
  if (employee.isSeparated) return 0;
  if (employee.isRetired) return employee.salary * 0.5;

  // Normal case - no nesting needed
  return employee.salary;
}

function processOrder(
  order: { valid: boolean; paid: boolean; shipped: boolean; items: number }
): string {
  // Guard clauses for exceptional cases
  if (!order.valid) return "Invalid order";
  if (!order.paid) return "Payment pending";
  if (order.shipped) return "Already shipped";

  // Happy path - main logic
  return `Shipping ${order.items} items`;
}

// ============================================================================
// EXAMPLE: Validation with guards
// ============================================================================

interface UserInput {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  age: number;
}

// BEFORE: Nested validation
function validateUserBefore(input: UserInput): { valid: boolean; error?: string } {
  if (input.username.length >= 3) {
    if (input.email.includes("@")) {
      if (input.password.length >= 8) {
        if (input.password === input.confirmPassword) {
          if (input.age >= 18) {
            return { valid: true };
          } else {
            return { valid: false, error: "Must be 18 or older" };
          }
        } else {
          return { valid: false, error: "Passwords do not match" };
        }
      } else {
        return { valid: false, error: "Password must be at least 8 characters" };
      }
    } else {
      return { valid: false, error: "Invalid email address" };
    }
  } else {
    return { valid: false, error: "Username must be at least 3 characters" };
  }
}

// AFTER: Guard clauses
function validateUser(input: UserInput): { valid: boolean; error?: string } {
  // Guard clauses - check for invalid inputs
  if (input.username.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters" };
  }

  if (!input.email.includes("@")) {
    return { valid: false, error: "Invalid email address" };
  }

  if (input.password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters" };
  }

  if (input.password !== input.confirmPassword) {
    return { valid: false, error: "Passwords do not match" };
  }

  if (input.age < 18) {
    return { valid: false, error: "Must be 18 or older" };
  }

  // All validations passed
  return { valid: true };
}

// ============================================================================
// EXAMPLE: Resource access with guards
// ============================================================================

interface User {
  id: string;
  role: string;
  active: boolean;
}

interface Resource {
  ownerId: string;
  public: boolean;
  allowedRoles: string[];
}

// BEFORE: Nested access control
function canAccessResourceBefore(user: User | null, resource: Resource): boolean {
  if (user !== null) {
    if (user.active) {
      if (resource.public) {
        return true;
      } else {
        if (resource.ownerId === user.id) {
          return true;
        } else {
          if (resource.allowedRoles.includes(user.role)) {
            return true;
          } else {
            return false;
          }
        }
      }
    } else {
      return false;
    }
  } else {
    return resource.public;
  }
}

// AFTER: Guard clauses with clear logic
function canAccessResource(user: User | null, resource: Resource): boolean {
  // Public resources are accessible to everyone
  if (resource.public) return true;

  // Private resources require a user
  if (!user) return false;

  // User must be active
  if (!user.active) return false;

  // Owner always has access
  if (resource.ownerId === user.id) return true;

  // Check role-based access
  return resource.allowedRoles.includes(user.role);
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Replace Nested Conditional with Guard Clauses ===\n");

console.log("--- Employee Pay ---");
console.log(`Active: $${getPayAmount({ isSeparated: false, isRetired: false, salary: 5000 })}`);
console.log(`Retired: $${getPayAmount({ isSeparated: false, isRetired: true, salary: 5000 })}`);
console.log(`Separated: $${getPayAmount({ isSeparated: true, isRetired: false, salary: 5000 })}`);

console.log("\n--- Order Processing ---");
console.log(processOrder({ valid: false, paid: false, shipped: false, items: 3 }));
console.log(processOrder({ valid: true, paid: false, shipped: false, items: 3 }));
console.log(processOrder({ valid: true, paid: true, shipped: true, items: 3 }));
console.log(processOrder({ valid: true, paid: true, shipped: false, items: 3 }));

console.log("\n--- User Validation ---");
const validInput: UserInput = {
  username: "john_doe",
  email: "john@example.com",
  password: "securepass123",
  confirmPassword: "securepass123",
  age: 25,
};
console.log("Valid input:", validateUser(validInput));

const invalidInputs = [
  { ...validInput, username: "ab" },
  { ...validInput, email: "invalid" },
  { ...validInput, password: "short" },
  { ...validInput, confirmPassword: "different" },
  { ...validInput, age: 16 },
];
invalidInputs.forEach((input, i) => {
  console.log(`Invalid ${i + 1}:`, validateUser(input));
});

console.log("\n--- Resource Access ---");
const user: User = { id: "user1", role: "editor", active: true };
const publicResource: Resource = { ownerId: "other", public: true, allowedRoles: [] };
const privateResource: Resource = { ownerId: "user1", public: false, allowedRoles: [] };
const roleResource: Resource = { ownerId: "other", public: false, allowedRoles: ["editor"] };

console.log(`Public resource: ${canAccessResource(user, publicResource)}`);
console.log(`Own resource: ${canAccessResource(user, privateResource)}`);
console.log(`Role-based: ${canAccessResource(user, roleResource)}`);
console.log(`No user, public: ${canAccessResource(null, publicResource)}`);
console.log(`No user, private: ${canAccessResource(null, privateResource)}`);

export {};
