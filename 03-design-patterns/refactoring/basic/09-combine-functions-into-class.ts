/**
 * COMBINE FUNCTIONS INTO CLASS
 *
 * Group functions that operate on the same data into a class.
 *
 * Motivation:
 * - When a set of functions operate heavily on the same data
 * - When you pass the same data to multiple functions
 * - The class provides a common environment for these functions
 * - Makes it easier to add more functions that share the data
 *
 * Mechanics:
 * 1. Apply Encapsulate Record to the data the functions share
 * 2. For each function, use Move Function to move it into the class
 * 3. Each function that takes the data as an argument can remove it
 */

// ============================================================================
// BEFORE: Functions passing the same data around
// ============================================================================

interface ReadingBefore {
  customer: string;
  quantity: number;
  month: number;
  year: number;
}

function baseRateBefore(month: number, year: number): number {
  // Simplified: different rates for different seasons
  const winterMonths = [12, 1, 2];
  return winterMonths.includes(month) ? 0.15 : 0.10;
}

function baseChargeBefore(reading: ReadingBefore): number {
  return baseRateBefore(reading.month, reading.year) * reading.quantity;
}

function taxableChargeBefore(reading: ReadingBefore): number {
  return Math.max(0, baseChargeBefore(reading) - taxThresholdBefore(reading.year));
}

function taxThresholdBefore(year: number): number {
  return year > 2020 ? 50 : 40;
}

function calculateBillBefore(reading: ReadingBefore): number {
  const base = baseChargeBefore(reading);
  const taxable = taxableChargeBefore(reading);
  const tax = taxable * 0.1;
  return base + tax;
}

// ============================================================================
// AFTER: Functions combined into a class
// ============================================================================

class Reading {
  constructor(
    private readonly _customer: string,
    private readonly _quantity: number,
    private readonly _month: number,
    private readonly _year: number
  ) {}

  get customer(): string {
    return this._customer;
  }

  get quantity(): number {
    return this._quantity;
  }

  get month(): number {
    return this._month;
  }

  get year(): number {
    return this._year;
  }

  // All related functions are now methods
  get baseRate(): number {
    const winterMonths = [12, 1, 2];
    return winterMonths.includes(this._month) ? 0.15 : 0.10;
  }

  get baseCharge(): number {
    return this.baseRate * this._quantity;
  }

  private get taxThreshold(): number {
    return this._year > 2020 ? 50 : 40;
  }

  get taxableCharge(): number {
    return Math.max(0, this.baseCharge - this.taxThreshold);
  }

  get totalBill(): number {
    const tax = this.taxableCharge * 0.1;
    return this.baseCharge + tax;
  }

  // Easy to add more related functionality
  get billingPeriod(): string {
    return `${this._month}/${this._year}`;
  }

  get isWinterRate(): boolean {
    return [12, 1, 2].includes(this._month);
  }
}

// ============================================================================
// ANOTHER EXAMPLE: Order calculations
// ============================================================================

class Order {
  constructor(
    private readonly _items: Array<{ name: string; price: number; quantity: number }>,
    private readonly _discountRate: number = 0
  ) {}

  get items() {
    return [...this._items];
  }

  get subtotal(): number {
    return this._items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  get discountAmount(): number {
    return this.subtotal * this._discountRate;
  }

  get taxableAmount(): number {
    return this.subtotal - this.discountAmount;
  }

  get tax(): number {
    return this.taxableAmount * 0.08;
  }

  get total(): number {
    return this.taxableAmount + this.tax;
  }

  get itemCount(): number {
    return this._items.reduce((count, item) => count + item.quantity, 0);
  }

  getSummary(): string {
    return [
      `Items: ${this.itemCount}`,
      `Subtotal: $${this.subtotal.toFixed(2)}`,
      `Discount: -$${this.discountAmount.toFixed(2)}`,
      `Tax: +$${this.tax.toFixed(2)}`,
      `Total: $${this.total.toFixed(2)}`,
    ].join("\n");
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Combine Functions into Class Refactoring ===\n");

console.log("--- Before: Passing data to each function ---");
const readingData: ReadingBefore = {
  customer: "John Doe",
  quantity: 400,
  month: 1,
  year: 2024,
};
console.log(`Base charge: $${baseChargeBefore(readingData).toFixed(2)}`);
console.log(`Taxable charge: $${taxableChargeBefore(readingData).toFixed(2)}`);
console.log(`Total bill: $${calculateBillBefore(readingData).toFixed(2)}`);

console.log("\n--- After: Methods on a class ---");
const reading = new Reading("John Doe", 400, 1, 2024);
console.log(`Customer: ${reading.customer}`);
console.log(`Billing period: ${reading.billingPeriod}`);
console.log(`Winter rate: ${reading.isWinterRate}`);
console.log(`Base rate: $${reading.baseRate}/unit`);
console.log(`Base charge: $${reading.baseCharge.toFixed(2)}`);
console.log(`Taxable charge: $${reading.taxableCharge.toFixed(2)}`);
console.log(`Total bill: $${reading.totalBill.toFixed(2)}`);

console.log("\n--- Order Class Example ---");
const order = new Order(
  [
    { name: "Widget", price: 25, quantity: 2 },
    { name: "Gadget", price: 15, quantity: 3 },
  ],
  0.1 // 10% discount
);
console.log(order.getSummary());

export {};
