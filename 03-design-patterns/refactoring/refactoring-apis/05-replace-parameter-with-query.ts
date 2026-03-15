/**
 * REPLACE PARAMETER WITH QUERY
 *
 * Remove a parameter when the function can calculate it from available information.
 *
 * Motivation:
 * - Simplifies the function signature
 * - Reduces the responsibility of callers
 * - Eliminates redundant information passing
 *
 * Mechanics:
 * 1. Use Extract Variable on the parameter derivation
 * 2. Replace uses of the parameter with the query expression
 * 3. Remove the parameter from the function
 */

// ============================================================================
// BEFORE: Redundant parameter passed by caller
// ============================================================================

class OrderBefore {
  constructor(
    private _quantity: number,
    private _itemPrice: number
  ) {}

  get basePrice(): number {
    return this._quantity * this._itemPrice;
  }

  getDiscountedPrice(discountLevel: number): number {
    switch (discountLevel) {
      case 1: return this.basePrice * 0.95;
      case 2: return this.basePrice * 0.9;
      default: return this.basePrice;
    }
  }
}

// ============================================================================
// AFTER: Function queries what it needs
// ============================================================================

class Order {
  constructor(
    private _quantity: number,
    private _itemPrice: number
  ) {}

  get quantity(): number {
    return this._quantity;
  }

  get basePrice(): number {
    return this._quantity * this._itemPrice;
  }

  private get discountLevel(): number {
    if (this._quantity > 100) return 2;
    if (this._quantity > 50) return 1;
    return 0;
  }

  get discountedPrice(): number {
    switch (this.discountLevel) {
      case 1: return this.basePrice * 0.95;
      case 2: return this.basePrice * 0.9;
      default: return this.basePrice;
    }
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Replace Parameter with Query ===\n");

const orders = [new Order(30, 50), new Order(75, 50), new Order(150, 50)];

orders.forEach((order) => {
  console.log(
    `Qty: ${order.quantity}, Base: $${order.basePrice}, Discounted: $${order.discountedPrice}`
  );
});

void OrderBefore;

export {};
