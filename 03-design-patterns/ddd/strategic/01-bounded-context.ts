/**
 * BOUNDED CONTEXT
 *
 * An explicit boundary within which a domain model exists. Inside this
 * boundary, all terms and phrases of the Ubiquitous Language have a
 * specific meaning, and the model reflects those meanings precisely.
 *
 * Characteristics:
 * - Defines the applicability of a particular model
 * - Terms have specific meanings within the context
 * - Different contexts can use same terms with different meanings
 * - Each context has its own Ubiquitous Language
 * - Models are consistent within a context
 *
 * When to use:
 * - Large systems with multiple sub-domains
 * - When same terms mean different things in different areas
 * - To prevent model corruption
 * - To enable team autonomy
 *
 * Benefits:
 * - Clear model boundaries
 * - Prevents conceptual confusion
 * - Enables parallel development
 * - Reduces model complexity
 * - Supports microservices architecture
 *
 * Example: "Product" in E-commerce
 * - Catalog Context: Product has description, images, categories
 * - Inventory Context: Product has SKU, quantity, warehouse location
 * - Pricing Context: Product has base price, discounts, taxes
 */

// ============================================
// CATALOG BOUNDED CONTEXT
// Product means: Something customers browse and view
// ============================================

namespace CatalogContext {
  // Ubiquitous Language: Product, Category, ProductImage, Description

  export class ProductId {
    constructor(readonly value: string) {}
  }

  export class Category {
    constructor(
      readonly id: string,
      readonly name: string,
      readonly parentId?: string
    ) {}
  }

  export class ProductImage {
    constructor(
      readonly url: string,
      readonly alt: string,
      readonly isPrimary: boolean
    ) {}
  }

  // Product in Catalog context - focused on display and discovery
  export class Product {
    private _images: ProductImage[] = [];

    constructor(
      readonly productId: ProductId,
      private _name: string,
      private _description: string,
      private _categoryId: string,
      private _isActive: boolean = true
    ) {}

    get name(): string {
      return this._name;
    }

    get description(): string {
      return this._description;
    }

    get categoryId(): string {
      return this._categoryId;
    }

    get isActive(): boolean {
      return this._isActive;
    }

    get images(): readonly ProductImage[] {
      return [...this._images];
    }

    get primaryImage(): ProductImage | undefined {
      return this._images.find((img) => img.isPrimary);
    }

    updateDetails(name: string, description: string): void {
      this._name = name;
      this._description = description;
    }

    addImage(image: ProductImage): void {
      this._images.push(image);
    }

    activate(): void {
      this._isActive = true;
    }

    deactivate(): void {
      this._isActive = false;
    }
  }

  export interface ProductRepository {
    findById(id: ProductId): Product | null;
    findByCategory(categoryId: string): Product[];
    findActive(): Product[];
    save(product: Product): void;
  }
}

// ============================================
// INVENTORY BOUNDED CONTEXT
// Product means: Something we track stock for
// ============================================

namespace InventoryContext {
  // Ubiquitous Language: StockItem, SKU, Warehouse, Quantity

  export class SKU {
    constructor(readonly value: string) {
      if (!/^[A-Z]{3}-\d{6}$/.test(value)) {
        throw new Error("Invalid SKU format");
      }
    }
  }

  export class Quantity {
    constructor(readonly value: number) {
      if (value < 0) throw new Error("Quantity cannot be negative");
    }

    add(other: Quantity): Quantity {
      return new Quantity(this.value + other.value);
    }

    subtract(other: Quantity): Quantity {
      return new Quantity(this.value - other.value);
    }

    isZero(): boolean {
      return this.value === 0;
    }
  }

  export class WarehouseLocation {
    constructor(
      readonly warehouseId: string,
      readonly aisle: string,
      readonly shelf: string
    ) {}

    toString(): string {
      return `${this.warehouseId}-${this.aisle}-${this.shelf}`;
    }
  }

  // In Inventory context, we use "StockItem" not "Product"
  // Different Ubiquitous Language for different context
  export class StockItem {
    private _reservedQuantity = new Quantity(0);

    constructor(
      readonly productId: string, // Reference to Catalog context
      readonly sku: SKU,
      private _quantity: Quantity,
      private _location: WarehouseLocation,
      private _reorderThreshold: Quantity
    ) {}

    get quantity(): Quantity {
      return this._quantity;
    }

    get reservedQuantity(): Quantity {
      return this._reservedQuantity;
    }

    get availableQuantity(): Quantity {
      return this._quantity.subtract(this._reservedQuantity);
    }

    get location(): WarehouseLocation {
      return this._location;
    }

    get needsReorder(): boolean {
      return this.availableQuantity.value <= this._reorderThreshold.value;
    }

    receive(quantity: Quantity): void {
      this._quantity = this._quantity.add(quantity);
    }

    reserve(quantity: Quantity): void {
      if (this.availableQuantity.value < quantity.value) {
        throw new Error("Insufficient available stock");
      }
      this._reservedQuantity = this._reservedQuantity.add(quantity);
    }

    releaseReservation(quantity: Quantity): void {
      this._reservedQuantity = this._reservedQuantity.subtract(quantity);
    }

    ship(quantity: Quantity): void {
      this._quantity = this._quantity.subtract(quantity);
      this._reservedQuantity = this._reservedQuantity.subtract(quantity);
    }

    relocate(newLocation: WarehouseLocation): void {
      this._location = newLocation;
    }
  }

  export interface StockRepository {
    findByProductId(productId: string): StockItem | null;
    findBySku(sku: SKU): StockItem | null;
    findNeedingReorder(): StockItem[];
    save(item: StockItem): void;
  }
}

// ============================================
// PRICING BOUNDED CONTEXT
// Product means: Something with a price
// ============================================

namespace PricingContext {
  // Ubiquitous Language: Price, Discount, PriceList, TaxRate

  export class Money {
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

    percentage(percent: number): Money {
      return new Money(Math.round(this.amount * (percent / 100) * 100) / 100, this.currency);
    }

    toString(): string {
      return `${this.currency} ${this.amount.toFixed(2)}`;
    }
  }

  export class Discount {
    constructor(
      readonly name: string,
      readonly percentage: number,
      readonly validFrom: Date,
      readonly validTo: Date
    ) {}

    isActive(): boolean {
      const now = new Date();
      return now >= this.validFrom && now <= this.validTo;
    }

    apply(price: Money): Money {
      return price.multiply(1 - this.percentage / 100);
    }
  }

  export class TaxRate {
    constructor(
      readonly name: string,
      readonly percentage: number,
      readonly region: string
    ) {}

    apply(amount: Money): Money {
      return amount.percentage(this.percentage);
    }
  }

  // In Pricing context, we use "PricedProduct" - focused on pricing
  export class PricedProduct {
    private _discounts: Discount[] = [];

    constructor(
      readonly productId: string, // Reference to Catalog context
      private _basePrice: Money,
      private _taxRate: TaxRate
    ) {}

    get basePrice(): Money {
      return this._basePrice;
    }

    get discounts(): readonly Discount[] {
      return [...this._discounts];
    }

    get activeDiscounts(): Discount[] {
      return this._discounts.filter((d) => d.isActive());
    }

    updateBasePrice(price: Money): void {
      this._basePrice = price;
    }

    addDiscount(discount: Discount): void {
      this._discounts.push(discount);
    }

    calculateFinalPrice(): Money {
      let price = this._basePrice;

      // Apply discounts
      for (const discount of this.activeDiscounts) {
        price = discount.apply(price);
      }

      // Add tax
      const tax = this._taxRate.apply(price);
      return price.add(tax);
    }

    calculatePriceBreakdown(): PriceBreakdown {
      let price = this._basePrice;
      const appliedDiscounts: { name: string; amount: Money }[] = [];

      for (const discount of this.activeDiscounts) {
        const discountAmount = price.percentage(discount.percentage);
        appliedDiscounts.push({ name: discount.name, amount: discountAmount });
        price = discount.apply(price);
      }

      const tax = this._taxRate.apply(price);
      const total = price.add(tax);

      return new PriceBreakdown(this._basePrice, appliedDiscounts, price, this._taxRate.name, tax, total);
    }
  }

  export class PriceBreakdown {
    constructor(
      readonly basePrice: Money,
      readonly discounts: { name: string; amount: Money }[],
      readonly subtotal: Money,
      readonly taxName: string,
      readonly taxAmount: Money,
      readonly total: Money
    ) {}
  }

  export interface PriceRepository {
    findByProductId(productId: string): PricedProduct | null;
    findWithActiveDiscounts(): PricedProduct[];
    save(product: PricedProduct): void;
  }
}

// ============================================
// ORDERING BOUNDED CONTEXT
// Uses references to other contexts via IDs
// ============================================

namespace OrderingContext {
  // Ubiquitous Language: Order, OrderLine, Customer, ShippingAddress

  export class Money {
    constructor(
      readonly amount: number,
      readonly currency: string = "USD"
    ) {}

    add(other: Money): Money {
      return new Money(this.amount + other.amount, this.currency);
    }

    multiply(factor: number): Money {
      return new Money(this.amount * factor, this.currency);
    }

    toString(): string {
      return `$${this.amount.toFixed(2)}`;
    }
  }

  export class OrderLine {
    constructor(
      readonly productId: string, // Reference to Catalog context
      readonly productName: string, // Snapshot at time of order
      readonly quantity: number,
      readonly unitPrice: Money // Snapshot from Pricing context
    ) {}

    get subtotal(): Money {
      return this.unitPrice.multiply(this.quantity);
    }
  }

  export class Order {
    private _lines: OrderLine[] = [];
    private _status: "draft" | "placed" | "confirmed" | "shipped" = "draft";

    constructor(
      readonly orderId: string,
      readonly customerId: string // Reference to Customer context
    ) {}

    get status(): string {
      return this._status;
    }

    get lines(): readonly OrderLine[] {
      return [...this._lines];
    }

    get total(): Money {
      return this._lines.reduce((sum, line) => sum.add(line.subtotal), new Money(0));
    }

    addLine(line: OrderLine): void {
      this._lines.push(line);
    }

    place(): void {
      if (this._lines.length === 0) throw new Error("Cannot place empty order");
      this._status = "placed";
    }
  }
}

// Usage: Demonstrating bounded contexts
console.log("=== Bounded Context Pattern ===\n");

// Catalog Context - Product as displayable item
console.log("--- Catalog Context ---");
const catalogProduct = new CatalogContext.Product(
  new CatalogContext.ProductId("prod-001"),
  "MacBook Pro 14",
  "Powerful laptop for professionals",
  "electronics"
);
catalogProduct.addImage(new CatalogContext.ProductImage("https://example.com/macbook.jpg", "MacBook Pro", true));
console.log(`Catalog: ${catalogProduct.name}`);
console.log(`  Description: ${catalogProduct.description}`);
console.log(`  Active: ${catalogProduct.isActive}`);

// Inventory Context - Same product, different representation
console.log("\n--- Inventory Context ---");
const stockItem = new InventoryContext.StockItem(
  "prod-001", // Reference to catalog product
  new InventoryContext.SKU("MAC-001234"),
  new InventoryContext.Quantity(50),
  new InventoryContext.WarehouseLocation("WH-01", "A", "12"),
  new InventoryContext.Quantity(10)
);
console.log(`Inventory: SKU ${stockItem.sku.value}`);
console.log(`  Quantity: ${stockItem.quantity.value}`);
console.log(`  Location: ${stockItem.location}`);
console.log(`  Needs reorder: ${stockItem.needsReorder}`);

// Pricing Context - Same product, pricing view
console.log("\n--- Pricing Context ---");
const pricedProduct = new PricingContext.PricedProduct(
  "prod-001", // Reference to catalog product
  new PricingContext.Money(1999),
  new PricingContext.TaxRate("Sales Tax", 8.5, "CA")
);
pricedProduct.addDiscount(
  new PricingContext.Discount("Holiday Sale", 10, new Date("2024-01-01"), new Date("2024-12-31"))
);

const breakdown = pricedProduct.calculatePriceBreakdown();
console.log(`Pricing: Product ${pricedProduct.productId}`);
console.log(`  Base price: ${breakdown.basePrice}`);
breakdown.discounts.forEach((d) => console.log(`  - ${d.name}: -${d.amount}`));
console.log(`  Subtotal: ${breakdown.subtotal}`);
console.log(`  ${breakdown.taxName}: +${breakdown.taxAmount}`);
console.log(`  Total: ${breakdown.total}`);

// Ordering Context - Creates order using references
console.log("\n--- Ordering Context ---");
const order = new OrderingContext.Order("order-001", "customer-123");
order.addLine(
  new OrderingContext.OrderLine(
    "prod-001",
    "MacBook Pro 14", // Snapshot
    1,
    new OrderingContext.Money(breakdown.total.amount) // Price snapshot
  )
);
order.place();
console.log(`Order: ${order.orderId}`);
console.log(`  Status: ${order.status}`);
console.log(`  Total: ${order.total}`);

console.log("\n--- Key Insight ---");
console.log('Same product ("prod-001") has different representations in each context:');
console.log("  • Catalog: Name, description, images, category");
console.log("  • Inventory: SKU, quantity, warehouse location");
console.log("  • Pricing: Base price, discounts, taxes");
console.log("  • Ordering: Line item with price snapshot");

export { CatalogContext, InventoryContext, PricingContext, OrderingContext };
