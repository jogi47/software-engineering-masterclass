/**
 * OPEN HOST SERVICE
 *
 * A well-defined protocol/API that provides access to your system for
 * other bounded contexts. It defines how external contexts can integrate
 * with your domain, using a Published Language.
 *
 * Characteristics:
 * - Well-documented API
 * - Stable, versioned interface
 * - Uses Published Language (DTOs)
 * - Decouples internal model from external access
 * - May support multiple consumers
 *
 * When to use:
 * - Many consumers need to integrate with your context
 * - You want to control how your domain is accessed
 * - Need to hide internal complexity
 * - Want to version your API separately from internal changes
 *
 * Components:
 * - Published Language: DTOs and contracts
 * - Service Interface: API endpoints/methods
 * - Translators: Convert between internal and published models
 *
 * Related patterns:
 * - Published Language: The shared vocabulary
 * - ACL: Consumer-side translation (this is provider-side)
 */

// ============================================
// INTERNAL DOMAIN MODEL
// Rich domain model with behavior
// ============================================

namespace InternalDomain {
  export class Money {
    private constructor(
      private readonly _amount: number,
      private readonly _currency: string
    ) {}

    static of(amount: number, currency: string = "USD"): Money {
      return new Money(Math.round(amount * 100) / 100, currency);
    }

    get amount(): number {
      return this._amount;
    }

    get currency(): string {
      return this._currency;
    }

    add(other: Money): Money {
      return Money.of(this._amount + other._amount, this._currency);
    }

    multiply(factor: number): Money {
      return Money.of(this._amount * factor, this._currency);
    }

    withDiscount(percent: number): Money {
      return Money.of(this._amount * (1 - percent / 100), this._currency);
    }
  }

  export class ProductId {
    constructor(readonly value: string) {}
  }

  export class Product {
    private _isActive: boolean = true;
    private _price: Money;

    constructor(
      readonly id: ProductId,
      private _name: string,
      private _description: string,
      private _category: string,
      price: Money,
      private _stockQuantity: number
    ) {
      this._price = price;
    }

    get name(): string {
      return this._name;
    }

    get description(): string {
      return this._description;
    }

    get category(): string {
      return this._category;
    }

    get price(): Money {
      return this._price;
    }

    get stockQuantity(): number {
      return this._stockQuantity;
    }

    get isActive(): boolean {
      return this._isActive;
    }

    get isInStock(): boolean {
      return this._stockQuantity > 0;
    }

    updatePrice(newPrice: Money): void {
      this._price = newPrice;
    }

    adjustStock(delta: number): void {
      this._stockQuantity = Math.max(0, this._stockQuantity + delta);
    }

    deactivate(): void {
      this._isActive = false;
    }

    activate(): void {
      this._isActive = true;
    }
  }

  // Internal repository
  export class ProductRepository {
    private products = new Map<string, Product>();

    save(product: Product): void {
      this.products.set(product.id.value, product);
    }

    findById(id: ProductId): Product | null {
      return this.products.get(id.value) || null;
    }

    findByCategory(category: string): Product[] {
      return Array.from(this.products.values()).filter(
        (p) => p.category === category && p.isActive
      );
    }

    findAll(): Product[] {
      return Array.from(this.products.values());
    }

    findActive(): Product[] {
      return Array.from(this.products.values()).filter((p) => p.isActive);
    }
  }

  // Internal domain service
  export class InventoryService {
    constructor(private readonly repository: ProductRepository) {}

    reserveStock(productId: ProductId, quantity: number): boolean {
      const product = this.repository.findById(productId);
      if (!product || product.stockQuantity < quantity) {
        return false;
      }
      product.adjustStock(-quantity);
      return true;
    }

    releaseStock(productId: ProductId, quantity: number): void {
      const product = this.repository.findById(productId);
      if (product) {
        product.adjustStock(quantity);
      }
    }
  }
}

// ============================================
// PUBLISHED LANGUAGE
// DTOs and contracts for external communication
// ============================================

namespace PublishedLanguage {
  // API version for backward compatibility
  export const API_VERSION = "1.0";

  // Published DTOs - stable contract with consumers
  export interface ProductDTO {
    id: string;
    name: string;
    description: string;
    category: string;
    price: PriceDTO;
    availability: AvailabilityDTO;
    active: boolean;
  }

  export interface PriceDTO {
    amount: number;
    currency: string;
    formatted: string;
  }

  export interface AvailabilityDTO {
    inStock: boolean;
    quantity: number;
    status: "available" | "low_stock" | "out_of_stock";
  }

  export interface ProductListDTO {
    products: ProductDTO[];
    total: number;
    page: number;
    pageSize: number;
  }

  // Request DTOs
  export interface CreateProductRequest {
    name: string;
    description: string;
    category: string;
    price: number;
    currency?: string;
    initialStock: number;
  }

  export interface UpdatePriceRequest {
    productId: string;
    newPrice: number;
    currency?: string;
  }

  export interface ReserveStockRequest {
    productId: string;
    quantity: number;
  }

  // Response DTOs
  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
    apiVersion: string;
    timestamp: string;
  }

  export interface ApiError {
    code: string;
    message: string;
  }

  // Events published to other contexts
  export interface ProductCreatedEvent {
    eventType: "ProductCreated";
    productId: string;
    name: string;
    category: string;
    occurredAt: string;
  }

  export interface PriceChangedEvent {
    eventType: "PriceChanged";
    productId: string;
    oldPrice: number;
    newPrice: number;
    currency: string;
    occurredAt: string;
  }

  export interface StockReservedEvent {
    eventType: "StockReserved";
    productId: string;
    quantity: number;
    remainingStock: number;
    occurredAt: string;
  }
}

// ============================================
// OPEN HOST SERVICE
// API layer that exposes domain functionality
// ============================================

namespace OpenHostService {
  /**
   * ProductTranslator - Converts between internal and published models
   */
  class ProductTranslator {
    static toDTO(product: InternalDomain.Product): PublishedLanguage.ProductDTO {
      const availabilityStatus = (): PublishedLanguage.AvailabilityDTO["status"] => {
        if (product.stockQuantity === 0) return "out_of_stock";
        if (product.stockQuantity < 10) return "low_stock";
        return "available";
      };

      return {
        id: product.id.value,
        name: product.name,
        description: product.description,
        category: product.category,
        price: {
          amount: product.price.amount,
          currency: product.price.currency,
          formatted: `${product.price.currency} ${product.price.amount.toFixed(2)}`,
        },
        availability: {
          inStock: product.isInStock,
          quantity: product.stockQuantity,
          status: availabilityStatus(),
        },
        active: product.isActive,
      };
    }

    static toListDTO(
      products: InternalDomain.Product[],
      page: number,
      pageSize: number
    ): PublishedLanguage.ProductListDTO {
      return {
        products: products.map((p) => this.toDTO(p)),
        total: products.length,
        page,
        pageSize,
      };
    }
  }

  /**
   * ResponseBuilder - Standardizes API responses
   */
  class ResponseBuilder {
    static success<T>(data: T): PublishedLanguage.ApiResponse<T> {
      return {
        success: true,
        data,
        apiVersion: PublishedLanguage.API_VERSION,
        timestamp: new Date().toISOString(),
      };
    }

    static error(code: string, message: string): PublishedLanguage.ApiResponse<never> {
      return {
        success: false,
        error: { code, message },
        apiVersion: PublishedLanguage.API_VERSION,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * ProductCatalogService - Open Host Service API
   * Provides controlled access to the Product domain
   */
  export class ProductCatalogService {
    private eventLog: any[] = [];

    constructor(
      private readonly repository: InternalDomain.ProductRepository,
      private readonly inventoryService: InternalDomain.InventoryService
    ) {}

    // ============================================
    // PUBLIC API ENDPOINTS
    // ============================================

    /**
     * Get a single product by ID
     * @api GET /products/{id}
     */
    getProduct(productId: string): PublishedLanguage.ApiResponse<PublishedLanguage.ProductDTO> {
      const product = this.repository.findById(new InternalDomain.ProductId(productId));

      if (!product) {
        return ResponseBuilder.error("PRODUCT_NOT_FOUND", `Product ${productId} not found`);
      }

      return ResponseBuilder.success(ProductTranslator.toDTO(product));
    }

    /**
     * List all active products
     * @api GET /products
     */
    listProducts(page: number = 1, pageSize: number = 20): PublishedLanguage.ApiResponse<PublishedLanguage.ProductListDTO> {
      const products = this.repository.findActive();
      const paged = products.slice((page - 1) * pageSize, page * pageSize);

      return ResponseBuilder.success(ProductTranslator.toListDTO(paged, page, pageSize));
    }

    /**
     * List products by category
     * @api GET /products?category={category}
     */
    listByCategory(category: string): PublishedLanguage.ApiResponse<PublishedLanguage.ProductListDTO> {
      const products = this.repository.findByCategory(category);
      return ResponseBuilder.success(ProductTranslator.toListDTO(products, 1, products.length));
    }

    /**
     * Create a new product
     * @api POST /products
     */
    createProduct(
      request: PublishedLanguage.CreateProductRequest
    ): PublishedLanguage.ApiResponse<PublishedLanguage.ProductDTO> {
      // Validate request
      if (!request.name || request.name.trim().length === 0) {
        return ResponseBuilder.error("INVALID_REQUEST", "Product name is required");
      }

      // Create domain object
      const productId = new InternalDomain.ProductId(`PROD-${Date.now()}`);
      const product = new InternalDomain.Product(
        productId,
        request.name,
        request.description,
        request.category,
        InternalDomain.Money.of(request.price, request.currency || "USD"),
        request.initialStock
      );

      // Save
      this.repository.save(product);

      // Publish event
      this.publishEvent({
        eventType: "ProductCreated",
        productId: productId.value,
        name: request.name,
        category: request.category,
        occurredAt: new Date().toISOString(),
      });

      return ResponseBuilder.success(ProductTranslator.toDTO(product));
    }

    /**
     * Update product price
     * @api PATCH /products/{id}/price
     */
    updatePrice(
      request: PublishedLanguage.UpdatePriceRequest
    ): PublishedLanguage.ApiResponse<PublishedLanguage.ProductDTO> {
      const product = this.repository.findById(new InternalDomain.ProductId(request.productId));

      if (!product) {
        return ResponseBuilder.error("PRODUCT_NOT_FOUND", `Product ${request.productId} not found`);
      }

      const oldPrice = product.price.amount;
      const newPrice = InternalDomain.Money.of(request.newPrice, request.currency || "USD");
      product.updatePrice(newPrice);

      // Publish event
      this.publishEvent({
        eventType: "PriceChanged",
        productId: request.productId,
        oldPrice,
        newPrice: request.newPrice,
        currency: request.currency || "USD",
        occurredAt: new Date().toISOString(),
      });

      return ResponseBuilder.success(ProductTranslator.toDTO(product));
    }

    /**
     * Reserve stock for an order
     * @api POST /products/{id}/reserve
     */
    reserveStock(
      request: PublishedLanguage.ReserveStockRequest
    ): PublishedLanguage.ApiResponse<{ reserved: boolean; remainingStock: number }> {
      const productId = new InternalDomain.ProductId(request.productId);
      const reserved = this.inventoryService.reserveStock(productId, request.quantity);

      if (!reserved) {
        return ResponseBuilder.error("INSUFFICIENT_STOCK", "Not enough stock available");
      }

      const product = this.repository.findById(productId)!;

      // Publish event
      this.publishEvent({
        eventType: "StockReserved",
        productId: request.productId,
        quantity: request.quantity,
        remainingStock: product.stockQuantity,
        occurredAt: new Date().toISOString(),
      });

      return ResponseBuilder.success({
        reserved: true,
        remainingStock: product.stockQuantity,
      });
    }

    /**
     * Get published events (for integration)
     */
    getEvents(): any[] {
      return [...this.eventLog];
    }

    private publishEvent(event: any): void {
      this.eventLog.push(event);
      console.log(`[Event] ${event.eventType}:`, JSON.stringify(event));
    }
  }
}

// ============================================
// DEMONSTRATION
// ============================================

console.log("=== Open Host Service Pattern ===\n");

// Setup internal domain
const repository = new InternalDomain.ProductRepository();
const inventoryService = new InternalDomain.InventoryService(repository);

// Create Open Host Service
const catalogService = new OpenHostService.ProductCatalogService(repository, inventoryService);

console.log("--- API: Create Product ---");
const createResult = catalogService.createProduct({
  name: "MacBook Pro 14",
  description: "Powerful laptop for professionals",
  category: "electronics",
  price: 1999,
  currency: "USD",
  initialStock: 50,
});
console.log("Response:", JSON.stringify(createResult, null, 2));

console.log("\n--- API: Get Product ---");
const productId = createResult.data!.id;
const getResult = catalogService.getProduct(productId);
console.log("Response:", JSON.stringify(getResult, null, 2));

console.log("\n--- API: Update Price ---");
const priceResult = catalogService.updatePrice({
  productId,
  newPrice: 1899,
  currency: "USD",
});
console.log("Response:", JSON.stringify(priceResult, null, 2));

console.log("\n--- API: Reserve Stock ---");
const reserveResult = catalogService.reserveStock({
  productId,
  quantity: 5,
});
console.log("Response:", JSON.stringify(reserveResult, null, 2));

console.log("\n--- API: List Products ---");
// Add more products
catalogService.createProduct({
  name: "Magic Mouse",
  description: "Wireless mouse",
  category: "electronics",
  price: 99,
  initialStock: 100,
});
catalogService.createProduct({
  name: "USB-C Cable",
  description: "Charging cable",
  category: "accessories",
  price: 19,
  initialStock: 200,
});

const listResult = catalogService.listProducts();
console.log(`Total products: ${listResult.data?.total}`);
listResult.data?.products.forEach((p) => {
  console.log(`  - ${p.name}: ${p.price.formatted} (${p.availability.status})`);
});

console.log("\n--- Published Events ---");
const events = catalogService.getEvents();
console.log(`Total events: ${events.length}`);

console.log("\n--- Open Host Service Benefits ---");
console.log("• Stable, versioned API for consumers");
console.log("• Internal model protected from external access");
console.log("• Published Language (DTOs) define the contract");
console.log("• Events published for integration");
console.log("• Standardized responses with error handling");

export { InternalDomain, PublishedLanguage, OpenHostService };
