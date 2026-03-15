/**
 * REPLACE TEMP WITH QUERY
 *
 * Replace a temporary variable with a query method that computes the value.
 *
 * Motivation:
 * - Temps are useful within a function but create problems when extracted
 * - Queries (methods) can be called from anywhere
 * - Makes it easier to extract parts of a function
 * - Other methods can use the same calculation
 *
 * Mechanics:
 * 1. Check that the variable is determined entirely by its initialization
 * 2. If the variable isn't read-only, make it so
 * 3. Extract the assignment into a function that returns the value
 * 4. Apply Inline Variable
 *
 * Note: This refactoring may result in repeated calculation. Only apply
 * when the calculation is simple or when the result would be cached.
 */

// ============================================================================
// BEFORE: Using temporary variables
// ============================================================================

class OrderBefore {
  private _quantity: number;
  private _itemPrice: number;

  constructor(quantity: number, itemPrice: number) {
    this._quantity = quantity;
    this._itemPrice = itemPrice;
  }

  get quantity(): number {
    return this._quantity;
  }

  get itemPrice(): number {
    return this._itemPrice;
  }

  getPrice(): number {
    // Temporary variables
    const basePrice = this._quantity * this._itemPrice;
    const discountFactor = basePrice > 1000 ? 0.95 : 0.98;
    return basePrice * discountFactor;
  }
}

// ============================================================================
// AFTER: Temps replaced with queries
// ============================================================================

class Order {
  private readonly _quantity: number;
  private readonly _itemPrice: number;

  constructor(quantity: number, itemPrice: number) {
    this._quantity = quantity;
    this._itemPrice = itemPrice;
  }

  get quantity(): number {
    return this._quantity;
  }

  get itemPrice(): number {
    return this._itemPrice;
  }

  // Queries instead of temps
  get basePrice(): number {
    return this._quantity * this._itemPrice;
  }

  private get discountFactor(): number {
    return this.basePrice > 1000 ? 0.95 : 0.98;
  }

  get price(): number {
    return this.basePrice * this.discountFactor;
  }

  // Now other methods can easily use these
  get savingsFromDiscount(): number {
    return this.basePrice * (1 - this.discountFactor);
  }

  get pricePerItem(): number {
    return this.price / this._quantity;
  }
}

// ============================================================================
// ANOTHER EXAMPLE: Employee payroll calculation
// ============================================================================

class Employee {
  constructor(
    private readonly _name: string,
    private readonly _hourlyRate: number,
    private readonly _hoursWorked: number,
    private readonly _overtimeHours: number = 0
  ) {}

  get name(): string {
    return this._name;
  }

  // Query methods replace temps
  get regularPay(): number {
    return this._hourlyRate * this._hoursWorked;
  }

  get overtimeRate(): number {
    return this._hourlyRate * 1.5;
  }

  get overtimePay(): number {
    return this.overtimeRate * this._overtimeHours;
  }

  get grossPay(): number {
    return this.regularPay + this.overtimePay;
  }

  get taxRate(): number {
    // Simplified tax brackets
    if (this.grossPay > 5000) return 0.25;
    if (this.grossPay > 2000) return 0.15;
    return 0.1;
  }

  get taxAmount(): number {
    return this.grossPay * this.taxRate;
  }

  get netPay(): number {
    return this.grossPay - this.taxAmount;
  }

  // All calculations are now reusable
  getPayStub(): string {
    return [
      `Employee: ${this._name}`,
      `Regular Pay: $${this.regularPay.toFixed(2)}`,
      `Overtime Pay: $${this.overtimePay.toFixed(2)}`,
      `Gross Pay: $${this.grossPay.toFixed(2)}`,
      `Tax (${(this.taxRate * 100).toFixed(0)}%): -$${this.taxAmount.toFixed(2)}`,
      `Net Pay: $${this.netPay.toFixed(2)}`,
    ].join("\n");
  }
}

// ============================================================================
// EXAMPLE WITH CACHING
// ============================================================================

class ExpensiveCalculation {
  private _data: number[];
  private _cachedSum: number | null = null;
  private _cachedAverage: number | null = null;

  constructor(data: number[]) {
    this._data = [...data];
  }

  // Invalidate cache when data changes
  addValue(value: number): void {
    this._data.push(value);
    this._cachedSum = null;
    this._cachedAverage = null;
  }

  // Cached query
  get sum(): number {
    if (this._cachedSum === null) {
      console.log("  Computing sum...");
      this._cachedSum = this._data.reduce((a, b) => a + b, 0);
    }
    return this._cachedSum;
  }

  get count(): number {
    return this._data.length;
  }

  // Uses cached sum
  get average(): number {
    if (this._cachedAverage === null) {
      console.log("  Computing average...");
      this._cachedAverage = this.sum / this.count;
    }
    return this._cachedAverage;
  }

  // Uses other queries
  get variance(): number {
    const avg = this.average;
    const sumSquaredDiffs = this._data.reduce(
      (sum, val) => sum + Math.pow(val - avg, 2),
      0
    );
    return sumSquaredDiffs / this.count;
  }

  get standardDeviation(): number {
    return Math.sqrt(this.variance);
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Replace Temp with Query Refactoring ===\n");

console.log("--- Order pricing ---");
const order = new Order(50, 30);
console.log(`Quantity: ${order.quantity}`);
console.log(`Item price: $${order.itemPrice}`);
console.log(`Base price: $${order.basePrice}`);
console.log(`Final price: $${order.price.toFixed(2)}`);
console.log(`Savings: $${order.savingsFromDiscount.toFixed(2)}`);
console.log(`Price per item: $${order.pricePerItem.toFixed(2)}`);

console.log("\n--- Employee payroll ---");
const employee = new Employee("John Doe", 25, 40, 10);
console.log(employee.getPayStub());

console.log("\n--- Cached calculations ---");
const calc = new ExpensiveCalculation([1, 2, 3, 4, 5]);

console.log("First access:");
console.log(`Sum: ${calc.sum}`);
console.log(`Average: ${calc.average}`);

console.log("\nSecond access (cached):");
console.log(`Sum: ${calc.sum}`);
console.log(`Average: ${calc.average}`);

console.log("\nAfter adding value:");
calc.addValue(6);
console.log(`Sum: ${calc.sum}`);
console.log(`Std Dev: ${calc.standardDeviation.toFixed(2)}`);

export {};
