/**
 * EXTRACT VARIABLE
 *
 * Extract an expression into a named variable that explains its purpose.
 * Also known as "Introduce Explaining Variable".
 *
 * Motivation:
 * - When expressions are complex and hard to understand
 * - When you need to break down a complex calculation
 * - When debugging and you want to see intermediate values
 * - When the same expression is used multiple times
 *
 * Mechanics:
 * 1. Ensure the expression has no side effects
 * 2. Declare an immutable variable and set it to the expression
 * 3. Replace the original expression with the variable
 * 4. Test
 */

// ============================================================================
// BEFORE: Complex inline expressions
// ============================================================================

interface OrderItemBefore {
  quantity: number;
  itemPrice: number;
}

function priceBefore(order: OrderItemBefore): number {
  // Complex expression that's hard to understand at a glance
  return (
    order.quantity * order.itemPrice -
    Math.max(0, order.quantity - 500) * order.itemPrice * 0.05 +
    Math.min(order.quantity * order.itemPrice * 0.1, 100)
  );
}

// ============================================================================
// AFTER: Extracted into named variables
// ============================================================================

interface OrderItem {
  quantity: number;
  itemPrice: number;
}

function price(order: OrderItem): number {
  const basePrice = order.quantity * order.itemPrice;
  const quantityDiscount = Math.max(0, order.quantity - 500) * order.itemPrice * 0.05;
  const shipping = Math.min(basePrice * 0.1, 100);

  return basePrice - quantityDiscount + shipping;
}

// ============================================================================
// ALTERNATIVE: Extract as class methods (for complex objects)
// ============================================================================

class Order {
  constructor(
    private readonly _quantity: number,
    private readonly _itemPrice: number
  ) {}

  get quantity(): number {
    return this._quantity;
  }

  get itemPrice(): number {
    return this._itemPrice;
  }

  private get basePrice(): number {
    return this._quantity * this._itemPrice;
  }

  private get quantityDiscount(): number {
    return Math.max(0, this._quantity - 500) * this._itemPrice * 0.05;
  }

  private get shipping(): number {
    return Math.min(this.basePrice * 0.1, 100);
  }

  get price(): number {
    return this.basePrice - this.quantityDiscount + this.shipping;
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Extract Variable Refactoring ===\n");

const orderData = { quantity: 600, itemPrice: 10 };

console.log("--- Calculating Price ---");
console.log(`Order: ${orderData.quantity} items at $${orderData.itemPrice} each`);
console.log(`\nBefore (hard to read): $${priceBefore(orderData).toFixed(2)}`);
console.log(`After (with named variables): $${price(orderData).toFixed(2)}`);

console.log("\n--- Using Class-Based Approach ---");
const order = new Order(600, 10);
console.log(`Order price: $${order.price.toFixed(2)}`);

// Breaking down the calculation:
console.log("\n--- Calculation Breakdown ---");
const basePrice = orderData.quantity * orderData.itemPrice;
const quantityDiscount = Math.max(0, orderData.quantity - 500) * orderData.itemPrice * 0.05;
const shipping = Math.min(basePrice * 0.1, 100);

console.log(`Base price: $${basePrice.toFixed(2)}`);
console.log(`Quantity discount: -$${quantityDiscount.toFixed(2)}`);
console.log(`Shipping: +$${shipping.toFixed(2)}`);
console.log(`Final price: $${(basePrice - quantityDiscount + shipping).toFixed(2)}`);

export {};
