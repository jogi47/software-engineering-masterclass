/**
 * SPLIT PHASE
 *
 * Split code that deals with different concerns into separate phases,
 * each with its own intermediate data structure.
 *
 * Motivation:
 * - When code deals with two or more different things at once
 * - When you can identify sequential phases in the processing
 * - Makes each phase easier to understand and modify independently
 * - Common in compilers (lex -> parse -> analyze -> generate)
 *
 * Mechanics:
 * 1. Extract the second phase into its own function
 * 2. Introduce an intermediate data structure passed between phases
 * 3. Examine each parameter; if only used in second phase, add to intermediate data
 * 4. Apply Extract Function on first phase code
 */

// ============================================================================
// BEFORE: Mixed phases in one function
// ============================================================================

interface ProductBefore {
  basePrice: number;
  discountThreshold: number;
  discountRate: number;
}

interface ShippingMethodBefore {
  discountThreshold: number;
  discountedFee: number;
  feePerCase: number;
}

function priceOrderBefore(
  product: ProductBefore,
  quantity: number,
  shippingMethod: ShippingMethodBefore
): number {
  // Phase 1: Calculate product price (mixed with shipping)
  const basePrice = product.basePrice * quantity;
  const discount =
    Math.max(quantity - product.discountThreshold, 0) *
    product.basePrice *
    product.discountRate;

  // Phase 2: Calculate shipping (mixed with product calculations)
  const shippingPerCase =
    basePrice > shippingMethod.discountThreshold
      ? shippingMethod.discountedFee
      : shippingMethod.feePerCase;
  const shippingCost = quantity * shippingPerCase;

  // Everything combined
  const price = basePrice - discount + shippingCost;
  return price;
}

// ============================================================================
// AFTER: Split into clear phases with intermediate data
// ============================================================================

interface Product {
  basePrice: number;
  discountThreshold: number;
  discountRate: number;
}

interface ShippingMethod {
  discountThreshold: number;
  discountedFee: number;
  feePerCase: number;
}

// Intermediate data structure between phases
interface PriceData {
  basePrice: number;
  quantity: number;
  discount: number;
}

// Phase 1: Calculate product pricing
function calculateProductPrice(product: Product, quantity: number): PriceData {
  const basePrice = product.basePrice * quantity;
  const discount =
    Math.max(quantity - product.discountThreshold, 0) *
    product.basePrice *
    product.discountRate;

  return { basePrice, quantity, discount };
}

// Phase 2: Calculate shipping based on product pricing
function calculateShipping(priceData: PriceData, shippingMethod: ShippingMethod): number {
  const shippingPerCase =
    priceData.basePrice > shippingMethod.discountThreshold
      ? shippingMethod.discountedFee
      : shippingMethod.feePerCase;

  return priceData.quantity * shippingPerCase;
}

// Phase 3: Combine for final price
function priceOrder(product: Product, quantity: number, shippingMethod: ShippingMethod): number {
  const priceData = calculateProductPrice(product, quantity);
  const shippingCost = calculateShipping(priceData, shippingMethod);
  return priceData.basePrice - priceData.discount + shippingCost;
}

// ============================================================================
// ANOTHER EXAMPLE: Order processing pipeline
// ============================================================================

interface RawOrder {
  customerId: string;
  items: Array<{ productId: string; quantity: number; unitPrice: number }>;
  couponCode?: string;
}

// Phase 1 output: Validated order
interface ValidatedOrder {
  customerId: string;
  items: Array<{ productId: string; quantity: number; unitPrice: number }>;
  validationErrors: string[];
  isValid: boolean;
}

// Phase 2 output: Priced order
interface PricedOrder extends ValidatedOrder {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
}

// Phase 3 output: Final order
interface FinalOrder extends PricedOrder {
  orderId: string;
  createdAt: Date;
  status: "pending" | "confirmed" | "failed";
}

// Phase 1: Validate
function validateOrder(raw: RawOrder): ValidatedOrder {
  const errors: string[] = [];

  if (!raw.customerId) {
    errors.push("Customer ID is required");
  }
  if (raw.items.length === 0) {
    errors.push("Order must have at least one item");
  }
  for (const item of raw.items) {
    if (item.quantity <= 0) {
      errors.push(`Invalid quantity for ${item.productId}`);
    }
  }

  return {
    ...raw,
    validationErrors: errors,
    isValid: errors.length === 0,
  };
}

// Phase 2: Calculate prices
function calculatePrices(validated: ValidatedOrder): PricedOrder {
  const subtotal = validated.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const discountAmount = 0; // Could apply coupon logic here
  const taxAmount = (subtotal - discountAmount) * 0.08;

  return {
    ...validated,
    subtotal,
    discountAmount,
    taxAmount,
    total: subtotal - discountAmount + taxAmount,
  };
}

// Phase 3: Finalize order
function finalizeOrder(priced: PricedOrder): FinalOrder {
  return {
    ...priced,
    orderId: `ORD-${Date.now()}`,
    createdAt: new Date(),
    status: priced.isValid ? "confirmed" : "failed",
  };
}

// Pipeline coordinator
function processOrder(raw: RawOrder): FinalOrder {
  const validated = validateOrder(raw);
  const priced = calculatePrices(validated);
  const final = finalizeOrder(priced);
  return final;
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Split Phase Refactoring ===\n");

console.log("--- Product Pricing (Split into phases) ---");
const product: Product = {
  basePrice: 100,
  discountThreshold: 5,
  discountRate: 0.05,
};
const shippingMethod: ShippingMethod = {
  discountThreshold: 500,
  discountedFee: 5,
  feePerCase: 10,
};

const priceData = calculateProductPrice(product, 10);
console.log("Phase 1 - Product pricing:");
console.log(`  Base price: $${priceData.basePrice}`);
console.log(`  Discount: $${priceData.discount}`);

const shipping = calculateShipping(priceData, shippingMethod);
console.log("Phase 2 - Shipping:");
console.log(`  Shipping cost: $${shipping}`);

const finalPrice = priceOrder(product, 10, shippingMethod);
console.log("Phase 3 - Final:");
console.log(`  Total price: $${finalPrice}`);

console.log("\n--- Order Processing Pipeline ---");
const rawOrder: RawOrder = {
  customerId: "C123",
  items: [
    { productId: "P1", quantity: 2, unitPrice: 50 },
    { productId: "P2", quantity: 1, unitPrice: 30 },
  ],
};

const finalOrder = processOrder(rawOrder);
console.log(`Order ID: ${finalOrder.orderId}`);
console.log(`Status: ${finalOrder.status}`);
console.log(`Subtotal: $${finalOrder.subtotal}`);
console.log(`Tax: $${finalOrder.taxAmount.toFixed(2)}`);
console.log(`Total: $${finalOrder.total.toFixed(2)}`);

console.log("\n--- Invalid Order ---");
const invalidOrder: RawOrder = {
  customerId: "",
  items: [],
};
const processedInvalid = processOrder(invalidOrder);
console.log(`Status: ${processedInvalid.status}`);
console.log(`Errors: ${processedInvalid.validationErrors.join(", ")}`);

export {};
