/**
 * CUSTOMER/SUPPLIER
 *
 * An integration pattern where the downstream (customer) context depends
 * on the upstream (supplier) context. The supplier provides what the
 * customer needs, and the customer's requirements influence the supplier.
 *
 * Characteristics:
 * - Clear upstream/downstream relationship
 * - Supplier provides data/services to customer
 * - Customer can influence supplier's roadmap
 * - Formal negotiation of interfaces
 * - Testing collaboration between teams
 *
 * When to use:
 * - One team clearly depends on another
 * - Downstream needs influence upstream development
 * - Teams are willing to collaborate
 * - Formal contracts are acceptable
 *
 * Benefits:
 * - Clear dependencies
 * - Negotiated interfaces
 * - Customer needs are heard
 * - Testable contracts
 *
 * Roles:
 * - Supplier (Upstream): Provides API, sets schedule
 * - Customer (Downstream): Consumes API, provides requirements
 */

// ============================================
// SUPPLIER CONTEXT: Pricing Service
// Upstream - Provides pricing data
// ============================================

namespace PricingSupplier {
  // ============================================
  // PUBLIC CONTRACT - Agreed with Customer
  // ============================================

  export interface PriceQuote {
    productId: string;
    basePrice: number;
    discountedPrice: number;
    currency: string;
    discountApplied: string | null;
    validUntil: Date;
    taxRate: number;
  }

  export interface BulkPriceRequest {
    productIds: string[];
    customerId?: string;
  }

  export interface BulkPriceResponse {
    quotes: PriceQuote[];
    requestId: string;
    generatedAt: Date;
  }

  // ============================================
  // INTERNAL IMPLEMENTATION
  // ============================================

  interface InternalProduct {
    productId: string;
    basePrice: number;
    category: string;
  }

  interface InternalDiscount {
    code: string;
    percentage: number;
    category?: string;
    validFrom: Date;
    validTo: Date;
  }

  interface CustomerTier {
    customerId: string;
    tier: "bronze" | "silver" | "gold" | "platinum";
  }

  export class PricingService {
    private products = new Map<string, InternalProduct>();
    private discounts: InternalDiscount[] = [];
    private customerTiers = new Map<string, CustomerTier>();
    private readonly DEFAULT_TAX_RATE = 8.5;
    private readonly QUOTE_VALIDITY_HOURS = 24;

    // Internal setup methods
    registerProduct(productId: string, basePrice: number, category: string): void {
      this.products.set(productId, { productId, basePrice, category });
    }

    registerDiscount(discount: InternalDiscount): void {
      this.discounts.push(discount);
    }

    registerCustomerTier(customerId: string, tier: "bronze" | "silver" | "gold" | "platinum"): void {
      this.customerTiers.set(customerId, { customerId, tier });
    }

    // ============================================
    // PUBLIC API - Contract with Customer
    // ============================================

    /**
     * Get price quote for a single product
     * CONTRACT: Returns quote valid for 24 hours
     */
    getQuote(productId: string, customerId?: string): PriceQuote | null {
      const product = this.products.get(productId);
      if (!product) return null;

      const discount = this.findBestDiscount(product, customerId);
      const discountedPrice = discount
        ? product.basePrice * (1 - discount.percentage / 100)
        : product.basePrice;

      const validUntil = new Date();
      validUntil.setHours(validUntil.getHours() + this.QUOTE_VALIDITY_HOURS);

      return {
        productId: product.productId,
        basePrice: product.basePrice,
        discountedPrice: Math.round(discountedPrice * 100) / 100,
        currency: "USD",
        discountApplied: discount?.code || null,
        validUntil,
        taxRate: this.DEFAULT_TAX_RATE,
      };
    }

    /**
     * Get quotes for multiple products at once
     * CONTRACT: Customer requested this for checkout optimization
     */
    getBulkQuotes(request: BulkPriceRequest): BulkPriceResponse {
      const quotes: PriceQuote[] = [];

      for (const productId of request.productIds) {
        const quote = this.getQuote(productId, request.customerId);
        if (quote) {
          quotes.push(quote);
        }
      }

      return {
        quotes,
        requestId: `REQ-${Date.now()}`,
        generatedAt: new Date(),
      };
    }

    /**
     * Validate if a quote is still valid
     * CONTRACT: Added per customer request for order validation
     */
    validateQuote(quote: PriceQuote): { valid: boolean; reason?: string } {
      // Check if quote is expired
      if (quote.validUntil < new Date()) {
        return { valid: false, reason: "Quote has expired" };
      }

      // Check if price has changed
      const currentQuote = this.getQuote(quote.productId);
      if (!currentQuote) {
        return { valid: false, reason: "Product no longer available" };
      }

      if (currentQuote.discountedPrice !== quote.discountedPrice) {
        return { valid: false, reason: "Price has changed" };
      }

      return { valid: true };
    }

    private findBestDiscount(product: InternalProduct, customerId?: string): InternalDiscount | null {
      const now = new Date();
      const tierDiscount = customerId ? this.getTierDiscount(customerId) : 0;

      const activeDiscounts = this.discounts.filter(
        (d) =>
          d.validFrom <= now &&
          d.validTo >= now &&
          (!d.category || d.category === product.category)
      );

      if (activeDiscounts.length === 0 && tierDiscount === 0) return null;

      // Find best discount
      const best = activeDiscounts.reduce(
        (max, d) => (d.percentage > max.percentage ? d : max),
        { code: "", percentage: 0, validFrom: now, validTo: now }
      );

      // Compare with tier discount
      if (tierDiscount > best.percentage) {
        return { code: `TIER_DISCOUNT`, percentage: tierDiscount, validFrom: now, validTo: now };
      }

      return best.percentage > 0 ? best : null;
    }

    private getTierDiscount(customerId: string): number {
      const tier = this.customerTiers.get(customerId);
      if (!tier) return 0;

      const tierDiscounts = { bronze: 0, silver: 5, gold: 10, platinum: 15 };
      return tierDiscounts[tier.tier];
    }
  }
}

// ============================================
// CUSTOMER CONTEXT: Order Service
// Downstream - Consumes pricing data
// ============================================

namespace OrderCustomer {
  // Internal Money type
  class Money {
    constructor(
      readonly amount: number,
      readonly currency: string = "USD"
    ) {}

    add(other: Money): Money {
      return new Money(this.amount + other.amount, this.currency);
    }

    multiply(factor: number): Money {
      return new Money(Math.round(this.amount * factor * 100) / 100, this.currency);
    }

    withTax(taxRate: number): Money {
      return new Money(Math.round(this.amount * (1 + taxRate / 100) * 100) / 100, this.currency);
    }

    toString(): string {
      return `${this.currency} ${this.amount.toFixed(2)}`;
    }
  }

  // Order domain objects
  class OrderLine {
    constructor(
      readonly productId: string,
      readonly productName: string,
      readonly quantity: number,
      readonly unitPrice: Money,
      readonly priceQuote: PricingSupplier.PriceQuote
    ) {}

    get subtotal(): Money {
      return this.unitPrice.multiply(this.quantity);
    }

    get subtotalWithTax(): Money {
      return this.subtotal.withTax(this.priceQuote.taxRate);
    }
  }

  type OrderStatus = "draft" | "validated" | "placed" | "failed";

  class Order {
    private _lines: OrderLine[] = [];
    private _status: OrderStatus = "draft";
    private _validationErrors: string[] = [];

    constructor(
      readonly orderId: string,
      readonly customerId: string
    ) {}

    get status(): OrderStatus {
      return this._status;
    }

    get lines(): readonly OrderLine[] {
      return [...this._lines];
    }

    get validationErrors(): readonly string[] {
      return [...this._validationErrors];
    }

    get subtotal(): Money {
      if (this._lines.length === 0) return new Money(0);
      return this._lines.reduce((sum, line) => sum.add(line.subtotal), new Money(0));
    }

    get total(): Money {
      if (this._lines.length === 0) return new Money(0);
      return this._lines.reduce((sum, line) => sum.add(line.subtotalWithTax), new Money(0));
    }

    addLine(line: OrderLine): void {
      this._lines.push(line);
    }

    markValidated(): void {
      this._status = "validated";
      this._validationErrors = [];
    }

    markFailed(errors: string[]): void {
      this._status = "failed";
      this._validationErrors = errors;
    }

    place(): void {
      if (this._status !== "validated") {
        throw new Error("Order must be validated before placing");
      }
      this._status = "placed";
    }
  }

  // ============================================
  // INTEGRATION WITH SUPPLIER
  // ============================================

  /**
   * PricingClient - Consumes Pricing Supplier's API
   */
  export class PricingClient {
    constructor(private readonly pricingService: PricingSupplier.PricingService) {}

    async getPrice(productId: string, customerId?: string): Promise<PricingSupplier.PriceQuote | null> {
      // In real app, this would be an HTTP call
      return this.pricingService.getQuote(productId, customerId);
    }

    async getBulkPrices(productIds: string[], customerId?: string): Promise<PricingSupplier.BulkPriceResponse> {
      // In real app, this would be an HTTP call
      return this.pricingService.getBulkQuotes({ productIds, customerId });
    }

    async validateQuotes(quotes: PricingSupplier.PriceQuote[]): Promise<Map<string, { valid: boolean; reason?: string }>> {
      const results = new Map<string, { valid: boolean; reason?: string }>();

      for (const quote of quotes) {
        results.set(quote.productId, this.pricingService.validateQuote(quote));
      }

      return results;
    }
  }

  /**
   * OrderService - Creates orders using Pricing Supplier
   */
  export class OrderService {
    constructor(private readonly pricingClient: PricingClient) {}

    async createOrder(
      orderId: string,
      customerId: string,
      items: { productId: string; productName: string; quantity: number }[]
    ): Promise<Order> {
      const order = new Order(orderId, customerId);

      // Get prices from supplier (bulk request - customer requirement)
      const productIds = items.map((item) => item.productId);
      const priceResponse = await this.pricingClient.getBulkPrices(productIds, customerId);

      // Create order lines with price quotes
      for (const item of items) {
        const quote = priceResponse.quotes.find((q) => q.productId === item.productId);
        if (!quote) {
          console.log(`Warning: No price for ${item.productId}`);
          continue;
        }

        order.addLine(
          new OrderLine(
            item.productId,
            item.productName,
            item.quantity,
            new Money(quote.discountedPrice, quote.currency),
            quote
          )
        );
      }

      return order;
    }

    async validateOrder(order: Order): Promise<Order> {
      // Validate all quotes are still valid (customer requirement)
      const quotes = order.lines.map((line) => line.priceQuote);
      const validations = await this.pricingClient.validateQuotes(quotes);

      const errors: string[] = [];
      for (const [productId, validation] of validations) {
        if (!validation.valid) {
          errors.push(`${productId}: ${validation.reason}`);
        }
      }

      if (errors.length > 0) {
        order.markFailed(errors);
      } else {
        order.markValidated();
      }

      return order;
    }
  }
}

// ============================================
// DEMONSTRATION
// ============================================

console.log("=== Customer/Supplier Pattern ===\n");

// Setup Supplier (Pricing Service)
console.log("--- Supplier: Pricing Service Setup ---");
const pricingService = new PricingSupplier.PricingService();

// Register products
pricingService.registerProduct("prod-001", 1999, "electronics");
pricingService.registerProduct("prod-002", 99, "electronics");
pricingService.registerProduct("prod-003", 49, "accessories");

// Register discounts
pricingService.registerDiscount({
  code: "HOLIDAY20",
  percentage: 20,
  category: "electronics",
  validFrom: new Date("2024-01-01"),
  validTo: new Date("2024-12-31"),
});

// Register customer tier
pricingService.registerCustomerTier("cust-001", "gold");

console.log("Supplier configured with products, discounts, and customer tiers");

// Customer uses Supplier's API
console.log("\n--- Customer: Order Service Usage ---");

const pricingClient = new OrderCustomer.PricingClient(pricingService);
const orderService = new OrderCustomer.OrderService(pricingClient);

// Create order using supplier's pricing
const items = [
  { productId: "prod-001", productName: "MacBook Pro", quantity: 1 },
  { productId: "prod-002", productName: "Magic Mouse", quantity: 2 },
  { productId: "prod-003", productName: "USB-C Cable", quantity: 3 },
];

(async () => {
  console.log("\n1. Creating order with pricing from supplier...");
  const order = await orderService.createOrder("order-001", "cust-001", items);

  console.log(`\nOrder ${order.orderId} created:`);
  for (const line of order.lines) {
    const discount = line.priceQuote.discountApplied;
    console.log(
      `  - ${line.productName} x${line.quantity}: ${line.subtotal}` +
        (discount ? ` (${discount})` : "")
    );
  }
  console.log(`  Subtotal: ${order.subtotal}`);
  console.log(`  Total (with tax): ${order.total}`);

  console.log("\n2. Validating order quotes with supplier...");
  const validatedOrder = await orderService.validateOrder(order);

  if (validatedOrder.status === "validated") {
    console.log("Order validated successfully!");
    validatedOrder.place();
    console.log(`Order status: ${validatedOrder.status}`);
  } else {
    console.log("Order validation failed:");
    validatedOrder.validationErrors.forEach((err) => console.log(`  - ${err}`));
  }

  console.log("\n--- Customer/Supplier Relationship ---");
  console.log("Supplier (Pricing) provides:");
  console.log("  • Single product price quotes");
  console.log("  • Bulk pricing (requested by Customer)");
  console.log("  • Quote validation (requested by Customer)");
  console.log("\nCustomer (Order) requirements met:");
  console.log("  • Bulk pricing for checkout optimization");
  console.log("  • Quote validation before order placement");
  console.log("  • 24-hour quote validity window");
})();

export { PricingSupplier, OrderCustomer };
