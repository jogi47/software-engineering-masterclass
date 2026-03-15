/**
 * INTRODUCE ASSERTION
 *
 * Make assumptions explicit by adding assertions that validate them.
 *
 * Motivation:
 * - Code often makes assumptions about its state
 * - Assertions make these assumptions explicit and documented
 * - Failing assertions reveal bugs early
 * - Assertions serve as documentation
 *
 * Mechanics:
 * 1. Identify assumptions in the code
 * 2. Add assertions to validate these assumptions
 * 3. Consider what should happen if the assertion fails
 *
 * Note: Assertions are for programmer errors, not user input validation.
 * User input should be validated with proper error handling.
 */

// ============================================================================
// HELPER: Simple assertion function
// ============================================================================

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// ============================================================================
// BEFORE: Implicit assumptions
// ============================================================================

function calculateDiscountBefore(customer: { discountRate: number }, amount: number): number {
  // Implicit assumption: discountRate is between 0 and 1
  return amount - amount * customer.discountRate;
}

function setAgeBefore(value: number): void {
  // Implicit assumption: age should be positive
  console.log(`Age set to ${value}`);
}

// ============================================================================
// AFTER: Explicit assertions
// ============================================================================

function calculateDiscount(customer: { discountRate: number }, amount: number): number {
  // Make assumptions explicit
  assert(customer.discountRate >= 0, "Discount rate must be non-negative");
  assert(customer.discountRate <= 1, "Discount rate must not exceed 100%");
  assert(amount >= 0, "Amount must be non-negative");

  return amount - amount * customer.discountRate;
}

function setAge(value: number): void {
  assert(value >= 0, "Age cannot be negative");
  assert(value <= 150, "Age cannot exceed 150");
  assert(Number.isInteger(value), "Age must be a whole number");

  console.log(`Age set to ${value}`);
}

// ============================================================================
// EXAMPLE: Complex state assertions
// ============================================================================

class Order {
  private _items: Array<{ name: string; price: number; quantity: number }> = [];
  private _discount: number = 0;
  private _status: "draft" | "submitted" | "completed" = "draft";

  addItem(name: string, price: number, quantity: number): void {
    // Assert preconditions
    assert(this._status === "draft", "Can only add items to draft orders");
    assert(price > 0, "Price must be positive");
    assert(quantity > 0, "Quantity must be positive");
    assert(name.length > 0, "Item name cannot be empty");

    this._items.push({ name, price, quantity });

    // Assert postconditions
    assert(this._items.length > 0, "Order should have at least one item after adding");
  }

  applyDiscount(rate: number): void {
    assert(this._status === "draft", "Can only apply discount to draft orders");
    assert(rate >= 0 && rate <= 0.5, "Discount must be between 0% and 50%");

    this._discount = rate;
  }

  submit(): void {
    assert(this._status === "draft", "Can only submit draft orders");
    assert(this._items.length > 0, "Cannot submit empty order");

    this._status = "submitted";

    // Assert state transition completed correctly
    assert(this._status === "submitted", "Status should be submitted after submission");
  }

  get total(): number {
    const subtotal = this._items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const total = subtotal * (1 - this._discount);

    // Assert invariants
    assert(total >= 0, "Total should never be negative");
    assert(total <= subtotal, "Total after discount should not exceed subtotal");

    return total;
  }

  get status(): string {
    return this._status;
  }
}

// ============================================================================
// EXAMPLE: Class invariants
// ============================================================================

class BankAccount {
  private _balance: number;
  private _overdraftLimit: number;

  constructor(initialBalance: number, overdraftLimit: number = 0) {
    assert(initialBalance >= -overdraftLimit, "Initial balance violates overdraft limit");
    assert(overdraftLimit >= 0, "Overdraft limit must be non-negative");

    this._balance = initialBalance;
    this._overdraftLimit = overdraftLimit;

    this.assertInvariant();
  }

  private assertInvariant(): void {
    assert(
      this._balance >= -this._overdraftLimit,
      `Balance ${this._balance} violates overdraft limit ${this._overdraftLimit}`
    );
  }

  deposit(amount: number): void {
    assert(amount > 0, "Deposit amount must be positive");

    const previousBalance = this._balance;
    this._balance += amount;

    // Post-condition: balance should increase
    assert(this._balance > previousBalance, "Balance should increase after deposit");
    this.assertInvariant();
  }

  withdraw(amount: number): void {
    assert(amount > 0, "Withdrawal amount must be positive");
    assert(
      amount <= this._balance + this._overdraftLimit,
      "Insufficient funds including overdraft"
    );

    const previousBalance = this._balance;
    this._balance -= amount;

    // Post-condition: balance should decrease
    assert(this._balance < previousBalance, "Balance should decrease after withdrawal");
    this.assertInvariant();
  }

  get balance(): number {
    return this._balance;
  }

  get availableFunds(): number {
    return this._balance + this._overdraftLimit;
  }
}

// ============================================================================
// EXAMPLE: Algorithm assertions
// ============================================================================

function binarySearch(sortedArray: number[], target: number): number {
  // Precondition: array must be sorted
  assert(
    sortedArray.every((val, i) => i === 0 || sortedArray[i - 1] <= val),
    "Array must be sorted for binary search"
  );

  let left = 0;
  let right = sortedArray.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);

    // Loop invariant: if target exists, it's in [left, right]
    assert(mid >= left && mid <= right, "Mid should be within bounds");

    if (sortedArray[mid] === target) {
      return mid;
    } else if (sortedArray[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return -1;
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Introduce Assertion Refactoring ===\n");

console.log("--- Discount Calculation ---");
const customer = { discountRate: 0.1 };
console.log(`$100 with 10% discount: $${calculateDiscount(customer, 100)}`);

console.log("\nTrying invalid discount rate:");
try {
  calculateDiscount({ discountRate: 1.5 }, 100);
} catch (e) {
  console.log(`Error: ${(e as Error).message}`);
}

console.log("\n--- Order with Assertions ---");
const order = new Order();
order.addItem("Widget", 50, 2);
order.applyDiscount(0.1);
console.log(`Order total: $${order.total}`);
order.submit();
console.log(`Order status: ${order.status}`);

console.log("\nTrying to modify submitted order:");
try {
  order.addItem("Gadget", 30, 1);
} catch (e) {
  console.log(`Error: ${(e as Error).message}`);
}

console.log("\n--- Bank Account Invariants ---");
const account = new BankAccount(100, 50);
console.log(`Balance: $${account.balance}, Available: $${account.availableFunds}`);

account.deposit(50);
console.log(`After deposit: $${account.balance}`);

account.withdraw(175);
console.log(`After withdrawal: $${account.balance}`);

console.log("\nTrying to exceed overdraft:");
try {
  account.withdraw(100);
} catch (e) {
  console.log(`Error: ${(e as Error).message}`);
}

console.log("\n--- Binary Search ---");
const sorted = [1, 3, 5, 7, 9, 11, 13];
console.log(`Array: [${sorted}]`);
console.log(`Find 7: index ${binarySearch(sorted, 7)}`);
console.log(`Find 4: index ${binarySearch(sorted, 4)}`);

export {};
