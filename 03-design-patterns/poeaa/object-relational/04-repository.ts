/**
 * REPOSITORY
 *
 * Mediates between the domain and data mapping layers using a
 * collection-like interface for accessing domain objects.
 *
 * Characteristics:
 * - Acts like an in-memory collection of domain objects
 * - Encapsulates query logic
 * - Decouples domain from data access
 * - Makes unit testing easier with mock repositories
 */

// Domain Entity
class Product {
  constructor(
    public readonly id: string,
    public name: string,
    public price: number,
    public category: string
  ) {}

  applyDiscount(percent: number): void {
    this.price = this.price * (1 - percent / 100);
  }

  isExpensive(): boolean {
    return this.price > 500;
  }
}

// Specification pattern for flexible querying
interface Specification<T> {
  isSatisfiedBy(item: T): boolean;
}

class CategorySpecification implements Specification<Product> {
  constructor(private category: string) {}

  isSatisfiedBy(product: Product): boolean {
    return product.category === this.category;
  }
}

class PriceRangeSpecification implements Specification<Product> {
  constructor(
    private minPrice: number,
    private maxPrice: number
  ) {}

  isSatisfiedBy(product: Product): boolean {
    return product.price >= this.minPrice && product.price <= this.maxPrice;
  }
}

// REPOSITORY interface
interface ProductRepository {
  findById(id: string): Product | undefined;
  findAll(): Product[];
  findBySpecification(spec: Specification<Product>): Product[];
  add(product: Product): void;
  remove(product: Product): void;
  save(product: Product): void;
}

// In-memory implementation
class InMemoryProductRepository implements ProductRepository {
  private products = new Map<string, Product>();

  findById(id: string): Product | undefined {
    return this.products.get(id);
  }

  findAll(): Product[] {
    return Array.from(this.products.values());
  }

  findBySpecification(spec: Specification<Product>): Product[] {
    return this.findAll().filter((product) => spec.isSatisfiedBy(product));
  }

  add(product: Product): void {
    if (this.products.has(product.id)) {
      throw new Error(`Product ${product.id} already exists`);
    }
    this.products.set(product.id, product);
    console.log(`Added product: ${product.name}`);
  }

  remove(product: Product): void {
    this.products.delete(product.id);
    console.log(`Removed product: ${product.name}`);
  }

  save(product: Product): void {
    this.products.set(product.id, product);
    console.log(`Saved product: ${product.name}`);
  }
}

// Service that uses the repository
class ProductService {
  constructor(private repository: ProductRepository) {}

  getExpensiveProducts(): Product[] {
    return this.repository.findAll().filter((p) => p.isExpensive());
  }

  getProductsByCategory(category: string): Product[] {
    return this.repository.findBySpecification(new CategorySpecification(category));
  }

  applyDiscountToCategory(category: string, discountPercent: number): void {
    const products = this.getProductsByCategory(category);
    for (const product of products) {
      product.applyDiscount(discountPercent);
      this.repository.save(product);
    }
    console.log(`Applied ${discountPercent}% discount to ${products.length} products in ${category}`);
  }
}

// Usage
console.log("=== Repository Pattern ===\n");

const repository = new InMemoryProductRepository();

// Add products (like adding to a collection)
repository.add(new Product("p1", "Laptop", 999, "Electronics"));
repository.add(new Product("p2", "Mouse", 25, "Electronics"));
repository.add(new Product("p3", "Desk", 300, "Furniture"));
repository.add(new Product("p4", "Chair", 150, "Furniture"));

// Use repository through service
const service = new ProductService(repository);

console.log("\nExpensive products:");
service.getExpensiveProducts().forEach((p) => console.log(`  - ${p.name}: $${p.price}`));

console.log("\nElectronics:");
service.getProductsByCategory("Electronics").forEach((p) => console.log(`  - ${p.name}: $${p.price}`));

// Apply discount
service.applyDiscountToCategory("Electronics", 10);

console.log("\nElectronics after discount:");
service.getProductsByCategory("Electronics").forEach((p) => console.log(`  - ${p.name}: $${p.price.toFixed(2)}`));

// Query with specification
const midRange = new PriceRangeSpecification(100, 400);
console.log("\nMid-range products ($100-$400):");
repository.findBySpecification(midRange).forEach((p) => console.log(`  - ${p.name}: $${p.price.toFixed(2)}`));

// Make this file a module to avoid global scope pollution
export {};
