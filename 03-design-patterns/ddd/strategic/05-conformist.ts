/**
 * CONFORMIST
 *
 * An integration pattern where the downstream context simply conforms
 * to the upstream context's model without any translation. The downstream
 * team eliminates the complexity of translation by using the upstream
 * model as-is.
 *
 * Characteristics:
 * - No translation layer
 * - Uses upstream model directly
 * - Accepts upstream team's design decisions
 * - Simplifies integration code
 * - Tight coupling to upstream
 *
 * When to use:
 * - Upstream model is high quality
 * - Translation adds little value
 * - Downstream team has little influence
 * - Quick integration is needed
 * - Upstream is a standard/stable API
 *
 * Trade-offs:
 * + Simpler integration
 * + Faster development
 * + No translation bugs
 * - Coupled to upstream changes
 * - May not fit domain perfectly
 * - Less control over model
 *
 * Comparison with ACL:
 * - Conformist: Accept upstream model directly
 * - ACL: Translate to protect your model
 */

// ============================================
// UPSTREAM CONTEXT: Product Catalog Service
// Third-party or shared service
// ============================================

namespace CatalogService {
  // Upstream's model - we don't control this
  export interface ProductDTO {
    id: string;
    sku: string;
    name: string;
    description: string;
    price: {
      amount: number;
      currency: string;
    };
    category: {
      id: string;
      name: string;
      parentId?: string;
    };
    attributes: {
      key: string;
      value: string;
    }[];
    inventory: {
      available: number;
      reserved: number;
    };
    status: "active" | "inactive" | "discontinued";
    createdAt: string;
    updatedAt: string;
  }

  export interface CategoryDTO {
    id: string;
    name: string;
    parentId?: string;
    children: CategoryDTO[];
  }

  export interface SearchResult {
    products: ProductDTO[];
    total: number;
    page: number;
    pageSize: number;
  }

  // Simulated API client
  export class CatalogApiClient {
    private products = new Map<string, ProductDTO>();

    // Simulate adding data
    addProduct(product: ProductDTO): void {
      this.products.set(product.id, product);
    }

    // API methods that return upstream's DTOs
    async getProduct(productId: string): Promise<ProductDTO | null> {
      return this.products.get(productId) || null;
    }

    async getProductBySku(sku: string): Promise<ProductDTO | null> {
      for (const product of this.products.values()) {
        if (product.sku === sku) return product;
      }
      return null;
    }

    async searchProducts(categoryId: string, page: number = 1): Promise<SearchResult> {
      const filtered = Array.from(this.products.values()).filter(
        (p) => p.category.id === categoryId && p.status === "active"
      );

      return {
        products: filtered.slice((page - 1) * 10, page * 10),
        total: filtered.length,
        page,
        pageSize: 10,
      };
    }

    async getActiveProducts(): Promise<ProductDTO[]> {
      return Array.from(this.products.values()).filter((p) => p.status === "active");
    }
  }
}

// ============================================
// DOWNSTREAM CONTEXT: Storefront (CONFORMIST)
// Uses upstream model directly
// ============================================

namespace StorefrontConformist {
  // No internal Product model - we use CatalogService.ProductDTO directly!

  /**
   * ProductListingService
   * CONFORMIST: Uses upstream ProductDTO directly
   */
  export class ProductListingService {
    constructor(private readonly catalogClient: CatalogService.CatalogApiClient) {}

    // Methods return upstream DTOs directly
    async getProduct(productId: string): Promise<CatalogService.ProductDTO | null> {
      return this.catalogClient.getProduct(productId);
    }

    async getProductsInCategory(categoryId: string): Promise<CatalogService.ProductDTO[]> {
      const result = await this.catalogClient.searchProducts(categoryId);
      return result.products;
    }

    async getFeaturedProducts(): Promise<CatalogService.ProductDTO[]> {
      // Returns upstream DTOs directly
      return this.catalogClient.getActiveProducts();
    }

    // Helper that works with upstream model
    formatPrice(product: CatalogService.ProductDTO): string {
      const { amount, currency } = product.price;
      const symbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£" };
      return `${symbols[currency] || currency}${amount.toFixed(2)}`;
    }

    isAvailable(product: CatalogService.ProductDTO): boolean {
      return product.inventory.available > product.inventory.reserved && product.status === "active";
    }

    getAvailableQuantity(product: CatalogService.ProductDTO): number {
      return product.inventory.available - product.inventory.reserved;
    }
  }

  /**
   * CartService
   * CONFORMIST: Cart items reference upstream ProductDTO
   */
  export interface CartItem {
    product: CatalogService.ProductDTO; // Uses upstream type directly
    quantity: number;
  }

  export class Cart {
    private items: CartItem[] = [];

    get cartItems(): readonly CartItem[] {
      return [...this.items];
    }

    get totalItems(): number {
      return this.items.reduce((sum, item) => sum + item.quantity, 0);
    }

    get subtotal(): number {
      return this.items.reduce((sum, item) => sum + item.product.price.amount * item.quantity, 0);
    }

    addItem(product: CatalogService.ProductDTO, quantity: number): void {
      const existing = this.items.find((item) => item.product.id === product.id);

      if (existing) {
        existing.quantity += quantity;
      } else {
        this.items.push({ product, quantity });
      }
    }

    updateQuantity(productId: string, quantity: number): void {
      const item = this.items.find((i) => i.product.id === productId);
      if (item) {
        if (quantity <= 0) {
          this.removeItem(productId);
        } else {
          item.quantity = quantity;
        }
      }
    }

    removeItem(productId: string): void {
      this.items = this.items.filter((item) => item.product.id !== productId);
    }

    clear(): void {
      this.items = [];
    }
  }

  export class CartService {
    private carts = new Map<string, Cart>();

    constructor(private readonly listingService: ProductListingService) {}

    getOrCreateCart(customerId: string): Cart {
      if (!this.carts.has(customerId)) {
        this.carts.set(customerId, new Cart());
      }
      return this.carts.get(customerId)!;
    }

    async addToCart(customerId: string, productId: string, quantity: number): Promise<boolean> {
      // Get product using upstream DTO
      const product = await this.listingService.getProduct(productId);
      if (!product) {
        console.log("Product not found");
        return false;
      }

      // Check availability using upstream model
      if (!this.listingService.isAvailable(product)) {
        console.log("Product not available");
        return false;
      }

      if (this.listingService.getAvailableQuantity(product) < quantity) {
        console.log("Insufficient stock");
        return false;
      }

      const cart = this.getOrCreateCart(customerId);
      cart.addItem(product, quantity);
      return true;
    }

    getCartSummary(customerId: string): { items: number; subtotal: string } {
      const cart = this.getOrCreateCart(customerId);
      return {
        items: cart.totalItems,
        subtotal: `$${cart.subtotal.toFixed(2)}`,
      };
    }
  }

  /**
   * CheckoutService
   * CONFORMIST: Uses upstream ProductDTO in checkout
   */
  export interface CheckoutItem {
    product: CatalogService.ProductDTO;
    quantity: number;
    lineTotal: number;
  }

  export interface Order {
    orderId: string;
    customerId: string;
    items: CheckoutItem[];
    subtotal: number;
    tax: number;
    total: number;
    createdAt: Date;
  }

  export class CheckoutService {
    private readonly TAX_RATE = 0.085;

    async checkout(customerId: string, cart: Cart): Promise<Order> {
      const items: CheckoutItem[] = cart.cartItems.map((cartItem) => ({
        product: cartItem.product, // Upstream ProductDTO stored in order
        quantity: cartItem.quantity,
        lineTotal: cartItem.product.price.amount * cartItem.quantity,
      }));

      const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
      const tax = subtotal * this.TAX_RATE;
      const total = subtotal + tax;

      const order: Order = {
        orderId: `ORD-${Date.now()}`,
        customerId,
        items,
        subtotal,
        tax,
        total,
        createdAt: new Date(),
      };

      cart.clear();
      return order;
    }
  }
}

// ============================================
// DEMONSTRATION
// ============================================

console.log("=== Conformist Pattern ===\n");

// Setup upstream service (Catalog)
const catalogClient = new CatalogService.CatalogApiClient();

// Add products to upstream
catalogClient.addProduct({
  id: "prod-001",
  sku: "MBP-14-2024",
  name: "MacBook Pro 14",
  description: "Powerful laptop for professionals",
  price: { amount: 1999, currency: "USD" },
  category: { id: "cat-electronics", name: "Electronics" },
  attributes: [
    { key: "color", value: "Space Gray" },
    { key: "storage", value: "512GB" },
  ],
  inventory: { available: 50, reserved: 5 },
  status: "active",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-15T00:00:00Z",
});

catalogClient.addProduct({
  id: "prod-002",
  sku: "MM-2024",
  name: "Magic Mouse",
  description: "Wireless mouse",
  price: { amount: 99, currency: "USD" },
  category: { id: "cat-electronics", name: "Electronics" },
  attributes: [{ key: "color", value: "White" }],
  inventory: { available: 100, reserved: 10 },
  status: "active",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-10T00:00:00Z",
});

console.log("--- Upstream Service (Catalog) ---");
console.log("Products added to catalog");

// Downstream (Storefront) uses upstream model directly
console.log("\n--- Downstream (Storefront) - CONFORMIST ---");

const listingService = new StorefrontConformist.ProductListingService(catalogClient);
const cartService = new StorefrontConformist.CartService(listingService);
const checkoutService = new StorefrontConformist.CheckoutService();

(async () => {
  // Get products - returns upstream ProductDTO directly
  const product = await listingService.getProduct("prod-001");
  if (product) {
    console.log("\nProduct (using upstream DTO directly):");
    console.log(`  ID: ${product.id}`);
    console.log(`  Name: ${product.name}`);
    console.log(`  Price: ${listingService.formatPrice(product)}`);
    console.log(`  Available: ${listingService.isAvailable(product)}`);
    console.log(`  Stock: ${listingService.getAvailableQuantity(product)}`);

    // Note: We access upstream's nested structure directly
    console.log(`  Category: ${product.category.name}`);
    console.log(`  Attributes: ${product.attributes.map((a) => `${a.key}=${a.value}`).join(", ")}`);
  }

  // Add to cart
  console.log("\n--- Cart Operations ---");
  await cartService.addToCart("customer-001", "prod-001", 1);
  await cartService.addToCart("customer-001", "prod-002", 2);

  const summary = cartService.getCartSummary("customer-001");
  console.log(`Cart: ${summary.items} items, Subtotal: ${summary.subtotal}`);

  // Checkout - order contains upstream ProductDTO
  console.log("\n--- Checkout ---");
  const cart = cartService.getOrCreateCart("customer-001");
  const order = await checkoutService.checkout("customer-001", cart);

  console.log(`Order: ${order.orderId}`);
  order.items.forEach((item) => {
    // Accessing upstream ProductDTO fields directly
    console.log(`  - ${item.product.name} (SKU: ${item.product.sku}) x${item.quantity}: $${item.lineTotal.toFixed(2)}`);
  });
  console.log(`Subtotal: $${order.subtotal.toFixed(2)}`);
  console.log(`Tax: $${order.tax.toFixed(2)}`);
  console.log(`Total: $${order.total.toFixed(2)}`);

  console.log("\n--- Conformist Trade-offs ---");
  console.log("Advantages:");
  console.log("  + No translation code needed");
  console.log("  + Quick integration");
  console.log("  + No mapping bugs");
  console.log("\nDisadvantages:");
  console.log("  - Coupled to upstream changes");
  console.log("  - Upstream's naming conventions spread through our code");
  console.log("  - If upstream changes ProductDTO, we must update everywhere");
  console.log("\nWhen to use:");
  console.log("  - Upstream model is well-designed");
  console.log("  - Translation provides little value");
  console.log("  - Speed of integration is priority");
})();

export { CatalogService, StorefrontConformist };
