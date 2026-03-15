/**
 * CONTEXT MAP
 *
 * A visual representation of the relationships between bounded contexts.
 * It shows how contexts integrate with each other and the nature of
 * those integrations.
 *
 * Characteristics:
 * - Documents all bounded contexts
 * - Shows integration patterns between contexts
 * - Highlights team relationships
 * - Identifies translation points
 * - Maps upstream/downstream dependencies
 *
 * Integration Patterns:
 * - Shared Kernel: Shared subset of the domain model
 * - Customer/Supplier: Upstream/downstream relationship
 * - Conformist: Downstream conforms to upstream model
 * - Anti-Corruption Layer: Translation layer between contexts
 * - Open Host Service: Well-defined API for external access
 * - Published Language: Well-documented shared language
 * - Separate Ways: No integration
 * - Partnership: Mutual cooperation between teams
 *
 * Benefits:
 * - Team communication clarity
 * - Integration point documentation
 * - Identifies potential issues
 * - Supports system evolution
 */

// ============================================
// CONTEXT MAP DOCUMENTATION
// ============================================

/**
 * E-Commerce System Context Map
 *
 *                    ┌─────────────────┐
 *                    │   CATALOG       │
 *                    │   (Upstream)    │
 *                    └────────┬────────┘
 *                             │ Published Language (Product API)
 *                             │
 *         ┌───────────────────┼───────────────────┐
 *         │                   │                   │
 *         ▼                   ▼                   ▼
 * ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
 * │  INVENTORY    │   │   PRICING     │   │   ORDERING    │
 * │  (Downstream) │   │  (Downstream) │   │  (Downstream) │
 * │               │   │               │   │               │
 * │  Conformist   │   │  Conformist   │   │     ACL       │
 * └───────────────┘   └───────────────┘   └───────┬───────┘
 *                                                 │
 *                                                 │ Customer/Supplier
 *                                                 ▼
 *                                         ┌───────────────┐
 *                                         │   SHIPPING    │
 *                                         │  (Downstream) │
 *                                         └───────────────┘
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │                    CUSTOMER                             │
 * │                  (Partnership)                          │
 * │            Shared Kernel with Ordering                  │
 * └─────────────────────────────────────────────────────────┘
 */

// ============================================
// BOUNDED CONTEXTS
// ============================================

namespace CatalogContext {
  export interface Product {
    productId: string;
    name: string;
    description: string;
    categoryId: string;
    isActive: boolean;
  }

  // PUBLISHED LANGUAGE: Catalog's public API
  export interface ProductDTO {
    id: string;
    name: string;
    description: string;
    category: string;
    active: boolean;
  }

  export class CatalogService {
    private products = new Map<string, Product>();

    addProduct(product: Product): void {
      this.products.set(product.productId, product);
    }

    // OPEN HOST SERVICE: Well-defined API
    getProduct(productId: string): ProductDTO | null {
      const product = this.products.get(productId);
      if (!product) return null;

      // Translate to published language
      return {
        id: product.productId,
        name: product.name,
        description: product.description,
        category: product.categoryId,
        active: product.isActive,
      };
    }

    getActiveProducts(): ProductDTO[] {
      return Array.from(this.products.values())
        .filter((p) => p.isActive)
        .map((p) => ({
          id: p.productId,
          name: p.name,
          description: p.description,
          category: p.categoryId,
          active: p.isActive,
        }));
    }
  }
}

// CONFORMIST: Inventory uses Catalog's model directly
namespace InventoryContext {
  export class StockItem {
    constructor(
      readonly productId: string, // Conforms to Catalog's ID
      private _quantity: number,
      private _reserved: number = 0
    ) {}

    get available(): number {
      return this._quantity - this._reserved;
    }

    reserve(quantity: number): boolean {
      if (this.available >= quantity) {
        this._reserved += quantity;
        return true;
      }
      return false;
    }

    release(quantity: number): void {
      this._reserved = Math.max(0, this._reserved - quantity);
    }
  }

  export class InventoryService {
    private stock = new Map<string, StockItem>();

    // Uses Catalog's ProductDTO directly (Conformist)
    initializeStock(product: CatalogContext.ProductDTO, quantity: number): void {
      this.stock.set(product.id, new StockItem(product.id, quantity));
    }

    checkAvailability(productId: string, quantity: number): boolean {
      const item = this.stock.get(productId);
      return item ? item.available >= quantity : false;
    }

    reserveStock(productId: string, quantity: number): boolean {
      const item = this.stock.get(productId);
      return item ? item.reserve(quantity) : false;
    }
  }
}

// CUSTOMER/SUPPLIER: Pricing supplies prices to Ordering
namespace PricingContext {
  export interface PriceQuote {
    productId: string;
    basePrice: number;
    finalPrice: number;
    currency: string;
    validUntil: Date;
  }

  export class PricingService {
    private prices = new Map<string, number>();

    setPrice(productId: string, price: number): void {
      this.prices.set(productId, price);
    }

    // SUPPLIER: Provides prices to downstream (Ordering)
    getQuote(productId: string): PriceQuote | null {
      const price = this.prices.get(productId);
      if (!price) return null;

      const validUntil = new Date();
      validUntil.setHours(validUntil.getHours() + 1); // Quote valid for 1 hour

      return {
        productId,
        basePrice: price,
        finalPrice: price, // Could include discounts
        currency: "USD",
        validUntil,
      };
    }
  }
}

// ANTI-CORRUPTION LAYER: Ordering translates external models
namespace OrderingContext {
  // Internal domain model - protected from external changes
  export class Money {
    constructor(
      readonly amount: number,
      readonly currency: string
    ) {}

    add(other: Money): Money {
      return new Money(this.amount + other.amount, this.currency);
    }

    multiply(factor: number): Money {
      return new Money(this.amount * factor, this.currency);
    }

    toString(): string {
      return `${this.currency} ${this.amount.toFixed(2)}`;
    }
  }

  export class OrderItem {
    constructor(
      readonly productId: string,
      readonly productName: string,
      readonly quantity: number,
      readonly unitPrice: Money
    ) {}

    get total(): Money {
      return this.unitPrice.multiply(this.quantity);
    }
  }

  export class Order {
    private items: OrderItem[] = [];
    private _status: "draft" | "placed" | "confirmed" = "draft";

    constructor(readonly orderId: string, readonly customerId: string) {}

    get status(): string {
      return this._status;
    }

    get total(): Money {
      return this.items.reduce((sum, item) => sum.add(item.total), new Money(0, "USD"));
    }

    addItem(item: OrderItem): void {
      this.items.push(item);
    }

    place(): void {
      this._status = "placed";
    }

    confirm(): void {
      this._status = "confirmed";
    }
  }

  // ANTI-CORRUPTION LAYER: Translates external models
  export class CatalogACL {
    constructor(private catalogService: CatalogContext.CatalogService) {}

    // Translate Catalog's model to Ordering's internal representation
    getProductInfo(productId: string): { id: string; name: string } | null {
      const product = this.catalogService.getProduct(productId);
      if (!product) return null;

      // Only take what we need, in our own format
      return {
        id: product.id,
        name: product.name,
      };
    }
  }

  export class PricingACL {
    constructor(private pricingService: PricingContext.PricingService) {}

    // Translate Pricing's model to Ordering's Money
    getPrice(productId: string): Money | null {
      const quote = this.pricingService.getQuote(productId);
      if (!quote) return null;

      // Validate quote is still valid
      if (quote.validUntil < new Date()) {
        throw new Error("Price quote has expired");
      }

      // Convert to our Money type
      return new Money(quote.finalPrice, quote.currency);
    }
  }

  export class InventoryACL {
    constructor(private inventoryService: InventoryContext.InventoryService) {}

    checkAndReserve(productId: string, quantity: number): boolean {
      return this.inventoryService.reserveStock(productId, quantity);
    }
  }

  // Application Service that coordinates ACLs
  export class OrderingService {
    constructor(
      private catalogACL: CatalogACL,
      private pricingACL: PricingACL,
      private inventoryACL: InventoryACL
    ) {}

    createOrderWithItem(orderId: string, customerId: string, productId: string, quantity: number): Order | null {
      // Get product info through ACL
      const productInfo = this.catalogACL.getProductInfo(productId);
      if (!productInfo) {
        console.log("Product not found");
        return null;
      }

      // Get price through ACL
      const price = this.pricingACL.getPrice(productId);
      if (!price) {
        console.log("Price not available");
        return null;
      }

      // Check inventory through ACL
      if (!this.inventoryACL.checkAndReserve(productId, quantity)) {
        console.log("Insufficient stock");
        return null;
      }

      // Create order with our internal models
      const order = new Order(orderId, customerId);
      order.addItem(new OrderItem(productInfo.id, productInfo.name, quantity, price));

      return order;
    }
  }
}

// SHARED KERNEL: Customer context shares some types with Ordering
namespace SharedKernel {
  // Types shared between Customer and Ordering contexts
  export class CustomerId {
    constructor(readonly value: string) {}

    equals(other: CustomerId): boolean {
      return this.value === other.value;
    }
  }

  export interface Address {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  }
}

namespace CustomerContext {
  export class Customer {
    constructor(
      readonly customerId: SharedKernel.CustomerId, // Uses shared kernel
      private _name: string,
      private _email: string,
      private _shippingAddress: SharedKernel.Address // Uses shared kernel
    ) {}

    get name(): string {
      return this._name;
    }

    get shippingAddress(): SharedKernel.Address {
      return this._shippingAddress;
    }

    updateAddress(address: SharedKernel.Address): void {
      this._shippingAddress = address;
    }
  }
}

// SEPARATE WAYS: Analytics context has no integration
namespace AnalyticsContext {
  // This context operates independently
  // No shared models, no integration points
  // Might receive events but doesn't share any types

  export interface AnalyticsEvent {
    eventType: string;
    timestamp: Date;
    data: Record<string, unknown>;
  }

  export class AnalyticsService {
    private events: AnalyticsEvent[] = [];

    recordEvent(event: AnalyticsEvent): void {
      this.events.push(event);
    }

    // Completely separate model - no coupling
  }
}

// ============================================
// USAGE: Demonstrating Context Map Relationships
// ============================================

console.log("=== Context Map Pattern ===\n");

// Initialize services
const catalogService = new CatalogContext.CatalogService();
const inventoryService = new InventoryContext.InventoryService();
const pricingService = new PricingContext.PricingService();

// Setup catalog (Upstream)
catalogService.addProduct({
  productId: "prod-001",
  name: "MacBook Pro",
  description: "14-inch laptop",
  categoryId: "electronics",
  isActive: true,
});

// PUBLISHED LANGUAGE: Catalog exposes ProductDTO
console.log("--- Published Language: Catalog API ---");
const productDTO = catalogService.getProduct("prod-001");
console.log("Catalog ProductDTO:", productDTO);

// CONFORMIST: Inventory uses Catalog's model
console.log("\n--- Conformist: Inventory uses Catalog model ---");
if (productDTO) {
  inventoryService.initializeStock(productDTO, 50);
  console.log(`Initialized stock for ${productDTO.id}: 50 units`);
}

// CUSTOMER/SUPPLIER: Pricing provides quotes
console.log("\n--- Customer/Supplier: Pricing provides quotes ---");
pricingService.setPrice("prod-001", 1999.99);
const quote = pricingService.getQuote("prod-001");
console.log("Price quote:", quote);

// ANTI-CORRUPTION LAYER: Ordering translates external models
console.log("\n--- Anti-Corruption Layer: Ordering integration ---");
const catalogACL = new OrderingContext.CatalogACL(catalogService);
const pricingACL = new OrderingContext.PricingACL(pricingService);
const inventoryACL = new OrderingContext.InventoryACL(inventoryService);
const orderingService = new OrderingContext.OrderingService(catalogACL, pricingACL, inventoryACL);

const order = orderingService.createOrderWithItem("order-001", "customer-123", "prod-001", 2);
if (order) {
  console.log(`Order created: ${order.orderId}`);
  console.log(`Total: ${order.total}`);
}

// SHARED KERNEL: Customer uses shared types
console.log("\n--- Shared Kernel: Customer context ---");
const customerId = new SharedKernel.CustomerId("customer-123");
const customer = new CustomerContext.Customer(customerId, "Alice", "alice@example.com", {
  street: "123 Main St",
  city: "San Francisco",
  state: "CA",
  zipCode: "94105",
  country: "USA",
});
console.log(`Customer: ${customer.name}`);
console.log(`Address: ${customer.shippingAddress.city}, ${customer.shippingAddress.state}`);

// SEPARATE WAYS: Analytics operates independently
console.log("\n--- Separate Ways: Analytics context ---");
const analytics = new AnalyticsContext.AnalyticsService();
analytics.recordEvent({
  eventType: "order_created",
  timestamp: new Date(),
  data: { orderId: "order-001" },
});
console.log("Analytics event recorded (no integration with other contexts)");

console.log("\n--- Context Map Summary ---");
console.log("• Catalog → Open Host Service (Published Language)");
console.log("• Inventory → Conformist (uses Catalog model)");
console.log("• Pricing → Customer/Supplier (provides to Ordering)");
console.log("• Ordering → Anti-Corruption Layer (translates models)");
console.log("• Customer ↔ Ordering → Shared Kernel (Address, CustomerId)");
console.log("• Analytics → Separate Ways (independent)");

export { CatalogContext, InventoryContext, PricingContext, OrderingContext, CustomerContext, SharedKernel };
