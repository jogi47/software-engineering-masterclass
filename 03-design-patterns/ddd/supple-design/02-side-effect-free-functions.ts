/**
 * SIDE-EFFECT-FREE FUNCTIONS
 *
 * Operations that return results without modifying any state. Also known as
 * "pure functions" - they only depend on their inputs and always produce
 * the same output for the same input.
 *
 * Characteristics:
 * - No modification of any state (inputs or global state)
 * - Return value depends only on input parameters
 * - Same inputs always produce same outputs
 * - Can be called multiple times without changing behavior
 * - Safe to call in any order
 *
 * When to use:
 * - Calculations and computations
 * - Transformations and mappings
 * - Queries and lookups
 * - Validation logic
 * - Business rule evaluation
 *
 * Benefits:
 * - Easy to test (no setup/teardown needed)
 * - Safe to parallelize
 * - Easy to reason about
 * - Can be cached/memoized
 * - No unexpected side effects
 *
 * Commands vs Queries (CQS):
 * - Commands: Change state, return nothing
 * - Queries: Return result, change nothing (side-effect-free)
 */

// ============================================
// VALUE OBJECTS (Naturally side-effect-free)
// ============================================

/**
 * Money - all operations return new instances, never modify self
 */
class Money {
  private constructor(
    private readonly _amount: number,
    private readonly _currency: string
  ) {}

  static of(amount: number, currency: string = "USD"): Money {
    if (amount < 0) throw new Error("Amount cannot be negative");
    return new Money(Math.round(amount * 100) / 100, currency);
  }

  static zero(currency: string = "USD"): Money {
    return new Money(0, currency);
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }

  // SIDE-EFFECT-FREE: Returns new Money, doesn't modify this
  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.of(this._amount + other._amount, this._currency);
  }

  // SIDE-EFFECT-FREE
  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.of(this._amount - other._amount, this._currency);
  }

  // SIDE-EFFECT-FREE
  multiply(factor: number): Money {
    return Money.of(this._amount * factor, this._currency);
  }

  // SIDE-EFFECT-FREE
  percentage(percent: number): Money {
    return Money.of(this._amount * (percent / 100), this._currency);
  }

  // SIDE-EFFECT-FREE: Just returns comparison result
  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amount > other._amount;
  }

  // SIDE-EFFECT-FREE
  isZero(): boolean {
    return this._amount === 0;
  }

  // SIDE-EFFECT-FREE
  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }

  private assertSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new Error(`Currency mismatch: ${this._currency} vs ${other._currency}`);
    }
  }

  toString(): string {
    return `${this._currency} ${this._amount.toFixed(2)}`;
  }
}

/**
 * DateRange - side-effect-free operations
 */
class DateRange {
  private constructor(
    private readonly _start: Date,
    private readonly _end: Date
  ) {}

  static create(start: Date, end: Date): DateRange {
    if (start > end) throw new Error("Start must be before end");
    return new DateRange(new Date(start), new Date(end));
  }

  get start(): Date {
    return new Date(this._start);
  }

  get end(): Date {
    return new Date(this._end);
  }

  // SIDE-EFFECT-FREE: Calculation only
  getDurationInDays(): number {
    const diff = this._end.getTime() - this._start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  // SIDE-EFFECT-FREE: Check only, no modification
  contains(date: Date): boolean {
    return date >= this._start && date <= this._end;
  }

  // SIDE-EFFECT-FREE
  overlaps(other: DateRange): boolean {
    return this._start <= other._end && this._end >= other._start;
  }

  // SIDE-EFFECT-FREE: Returns new DateRange
  extend(days: number): DateRange {
    const newEnd = new Date(this._end);
    newEnd.setDate(newEnd.getDate() + days);
    return DateRange.create(this._start, newEnd);
  }

  // SIDE-EFFECT-FREE
  intersection(other: DateRange): DateRange | null {
    if (!this.overlaps(other)) return null;
    const start = new Date(Math.max(this._start.getTime(), other._start.getTime()));
    const end = new Date(Math.min(this._end.getTime(), other._end.getTime()));
    return DateRange.create(start, end);
  }
}

// ============================================
// SIDE-EFFECT-FREE DOMAIN SERVICES
// ============================================

/**
 * Pricing Calculator - pure functions for price calculations
 */
class PricingCalculator {
  // SIDE-EFFECT-FREE: Pure calculation
  calculateSubtotal(items: { unitPrice: Money; quantity: number }[]): Money {
    return items.reduce((total, item) => total.add(item.unitPrice.multiply(item.quantity)), Money.zero());
  }

  // SIDE-EFFECT-FREE: Pure calculation
  calculateTax(subtotal: Money, taxRate: number): Money {
    return subtotal.percentage(taxRate);
  }

  // SIDE-EFFECT-FREE: Pure calculation
  calculateDiscount(subtotal: Money, discountPercent: number): Money {
    return subtotal.percentage(discountPercent);
  }

  // SIDE-EFFECT-FREE: Combines multiple calculations
  calculateOrderTotal(
    items: { unitPrice: Money; quantity: number }[],
    discountPercent: number,
    taxRate: number
  ): OrderPriceBreakdown {
    const subtotal = this.calculateSubtotal(items);
    const discount = this.calculateDiscount(subtotal, discountPercent);
    const subtotalAfterDiscount = subtotal.subtract(discount);
    const tax = this.calculateTax(subtotalAfterDiscount, taxRate);
    const total = subtotalAfterDiscount.add(tax);

    return new OrderPriceBreakdown(subtotal, discount, subtotalAfterDiscount, tax, total);
  }

  // SIDE-EFFECT-FREE: Tier calculation
  calculateMemberDiscount(memberTier: string, subtotal: Money): Money {
    const discountRates: Record<string, number> = {
      bronze: 0,
      silver: 5,
      gold: 10,
      platinum: 15,
    };
    const rate = discountRates[memberTier] || 0;
    return this.calculateDiscount(subtotal, rate);
  }
}

class OrderPriceBreakdown {
  constructor(
    readonly subtotal: Money,
    readonly discount: Money,
    readonly subtotalAfterDiscount: Money,
    readonly tax: Money,
    readonly total: Money
  ) {}

  toString(): string {
    return [
      `Subtotal: ${this.subtotal}`,
      `Discount: -${this.discount}`,
      `After discount: ${this.subtotalAfterDiscount}`,
      `Tax: +${this.tax}`,
      `Total: ${this.total}`,
    ].join("\n");
  }
}

/**
 * Shipping Calculator - pure functions for shipping calculations
 */
class ShippingCalculator {
  private static readonly RATE_PER_KG = Money.of(2.5);
  private static readonly BASE_RATE = Money.of(5);
  private static readonly EXPRESS_MULTIPLIER = 2;

  // SIDE-EFFECT-FREE
  calculateWeight(items: { weightKg: number; quantity: number }[]): number {
    return items.reduce((total, item) => total + item.weightKg * item.quantity, 0);
  }

  // SIDE-EFFECT-FREE
  calculateShippingCost(totalWeight: number, isExpress: boolean = false): Money {
    const weightCost = ShippingCalculator.RATE_PER_KG.multiply(totalWeight);
    const baseCost = ShippingCalculator.BASE_RATE.add(weightCost);

    if (isExpress) {
      return baseCost.multiply(ShippingCalculator.EXPRESS_MULTIPLIER);
    }
    return baseCost;
  }

  // SIDE-EFFECT-FREE
  estimateDeliveryDays(distance: number, isExpress: boolean): number {
    const baseDays = Math.ceil(distance / 500); // 500km per day
    return isExpress ? Math.max(1, Math.ceil(baseDays / 2)) : baseDays;
  }

  // SIDE-EFFECT-FREE
  isFreeShipping(orderTotal: Money, memberTier: string): boolean {
    const freeShippingThresholds: Record<string, number> = {
      bronze: 100,
      silver: 75,
      gold: 50,
      platinum: 0, // Always free
    };
    const threshold = freeShippingThresholds[memberTier] ?? 100;
    return orderTotal.amount >= threshold;
  }
}

/**
 * Eligibility Checker - pure functions for checking conditions
 */
class EligibilityChecker {
  // SIDE-EFFECT-FREE: Pure boolean check
  isEligibleForPromotion(customer: CustomerProfile, promotion: Promotion): boolean {
    if (promotion.minimumOrderValue && customer.totalOrders < promotion.minimumOrderValue) {
      return false;
    }
    if (promotion.requiredTiers && !promotion.requiredTiers.includes(customer.tier)) {
      return false;
    }
    if (promotion.newCustomersOnly && customer.accountAge > 30) {
      return false;
    }
    return true;
  }

  // SIDE-EFFECT-FREE
  canApplyDiscount(orderTotal: Money, discount: DiscountRule): boolean {
    if (discount.minimumOrderAmount && orderTotal.amount < discount.minimumOrderAmount) {
      return false;
    }
    return true;
  }

  // SIDE-EFFECT-FREE
  getApplicableDiscounts(orderTotal: Money, discounts: DiscountRule[]): DiscountRule[] {
    return discounts.filter((discount) => this.canApplyDiscount(orderTotal, discount));
  }

  // SIDE-EFFECT-FREE
  findBestDiscount(orderTotal: Money, discounts: DiscountRule[]): DiscountRule | null {
    const applicable = this.getApplicableDiscounts(orderTotal, discounts);
    if (applicable.length === 0) return null;

    return applicable.reduce((best, current) => {
      const bestSavings = orderTotal.percentage(best.percentOff);
      const currentSavings = orderTotal.percentage(current.percentOff);
      return currentSavings.isGreaterThan(bestSavings) ? current : best;
    });
  }
}

interface CustomerProfile {
  tier: string;
  totalOrders: number;
  accountAge: number; // days
}

interface Promotion {
  code: string;
  minimumOrderValue?: number;
  requiredTiers?: string[];
  newCustomersOnly?: boolean;
}

interface DiscountRule {
  name: string;
  percentOff: number;
  minimumOrderAmount?: number;
}

/**
 * Validation - pure functions that only check conditions
 */
class OrderValidator {
  // SIDE-EFFECT-FREE: Returns validation result, doesn't modify anything
  validateOrder(order: OrderData): ValidationResult {
    const errors: string[] = [];

    if (order.items.length === 0) {
      errors.push("Order must have at least one item");
    }

    if (order.items.some((item) => item.quantity <= 0)) {
      errors.push("All items must have positive quantity");
    }

    if (order.items.some((item) => item.unitPrice.amount <= 0)) {
      errors.push("All items must have positive price");
    }

    if (!order.shippingAddress || order.shippingAddress.trim() === "") {
      errors.push("Shipping address is required");
    }

    return errors.length === 0 ? ValidationResult.valid() : ValidationResult.invalid(errors);
  }

  // SIDE-EFFECT-FREE
  validateQuantity(requested: number, available: number): ValidationResult {
    if (requested <= 0) {
      return ValidationResult.invalid(["Quantity must be positive"]);
    }
    if (requested > available) {
      return ValidationResult.invalid([`Only ${available} items available`]);
    }
    return ValidationResult.valid();
  }
}

interface OrderData {
  items: { productId: string; quantity: number; unitPrice: Money }[];
  shippingAddress: string;
}

class ValidationResult {
  private constructor(
    readonly isValid: boolean,
    readonly errors: readonly string[]
  ) {}

  static valid(): ValidationResult {
    return new ValidationResult(true, []);
  }

  static invalid(errors: string[]): ValidationResult {
    return new ValidationResult(false, errors);
  }
}

// Usage
console.log("=== Side-Effect-Free Functions Pattern ===\n");

// Money calculations (always return new instances)
console.log("--- Money Calculations ---");
const price = Money.of(100);
const taxed = price.add(price.percentage(8.5));
console.log(`Original price: ${price}`);
console.log(`With 8.5% tax: ${taxed}`);
console.log(`Original unchanged: ${price}`);

// Pricing Calculator (pure functions)
console.log("\n--- Pricing Calculator ---");
const calculator = new PricingCalculator();

const items = [
  { unitPrice: Money.of(29.99), quantity: 2 },
  { unitPrice: Money.of(49.99), quantity: 1 },
  { unitPrice: Money.of(9.99), quantity: 3 },
];

const breakdown = calculator.calculateOrderTotal(items, 10, 8);
console.log("Order breakdown:");
console.log(breakdown.toString());

// Same function call always returns same result
const breakdown2 = calculator.calculateOrderTotal(items, 10, 8);
console.log(`\nSame result: ${breakdown.total.equals(breakdown2.total)}`);

// Shipping Calculator
console.log("\n--- Shipping Calculator ---");
const shipping = new ShippingCalculator();

const weight = shipping.calculateWeight([
  { weightKg: 2.5, quantity: 2 },
  { weightKg: 0.5, quantity: 3 },
]);
console.log(`Total weight: ${weight}kg`);

const standardCost = shipping.calculateShippingCost(weight, false);
const expressCost = shipping.calculateShippingCost(weight, true);
console.log(`Standard shipping: ${standardCost}`);
console.log(`Express shipping: ${expressCost}`);

// Eligibility Checker
console.log("\n--- Eligibility Checker ---");
const eligibility = new EligibilityChecker();

const discounts: DiscountRule[] = [
  { name: "10% Off", percentOff: 10, minimumOrderAmount: 50 },
  { name: "20% Off", percentOff: 20, minimumOrderAmount: 100 },
  { name: "5% Off", percentOff: 5 },
];

const orderTotal = Money.of(75);
const applicable = eligibility.getApplicableDiscounts(orderTotal, discounts);
console.log(`Order: ${orderTotal}`);
console.log(`Applicable discounts: ${applicable.map((d) => d.name).join(", ")}`);

const best = eligibility.findBestDiscount(orderTotal, discounts);
console.log(`Best discount: ${best?.name || "None"}`);

// Validation (pure check)
console.log("\n--- Validation ---");
const validator = new OrderValidator();

const validOrder: OrderData = {
  items: [{ productId: "p1", quantity: 2, unitPrice: Money.of(25) }],
  shippingAddress: "123 Main St",
};

const invalidOrder: OrderData = {
  items: [],
  shippingAddress: "",
};

console.log(`Valid order: ${validator.validateOrder(validOrder).isValid}`);
const invalidResult = validator.validateOrder(invalidOrder);
console.log(`Invalid order errors: ${invalidResult.errors.join("; ")}`);

export {};
