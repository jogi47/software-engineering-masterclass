/**
 * TABLE MODULE
 *
 * A single instance that handles the business logic for all rows
 * in a database table or view.
 *
 * Characteristics:
 * - Works with record sets (collections of rows)
 * - One class per table, handling all rows
 * - Good middle ground between Transaction Script and Domain Model
 * - Popular in .NET with DataSet/DataTable
 */

// Record set type - represents rows from a database table
interface ProductRecord {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

// Simulated database table as a record set
class RecordSet<T> {
  constructor(private records: T[] = []) {}

  getAll(): T[] {
    return [...this.records];
  }

  find(predicate: (record: T) => boolean): T | undefined {
    return this.records.find(predicate);
  }

  filter(predicate: (record: T) => boolean): T[] {
    return this.records.filter(predicate);
  }

  add(record: T): void {
    this.records.push(record);
  }

  update(predicate: (record: T) => boolean, updates: Partial<T>): void {
    const record = this.records.find(predicate);
    if (record) {
      Object.assign(record, updates);
    }
  }
}

// TABLE MODULE - handles all business logic for the Products table
class ProductModule {
  constructor(private productTable: RecordSet<ProductRecord>) {}

  // Business logic for getting a product
  getProduct(id: string): ProductRecord | undefined {
    return this.productTable.find((p) => p.id === id);
  }

  // Business logic for calculating inventory value
  calculateInventoryValue(): number {
    const products = this.productTable.getAll();
    return products.reduce((total, p) => total + p.price * p.quantity, 0);
  }

  // Business logic for getting low stock products
  getLowStockProducts(threshold: number = 10): ProductRecord[] {
    return this.productTable.filter((p) => p.quantity < threshold);
  }

  // Business logic for applying category discount
  applyCategoryDiscount(category: string, discountPercent: number): void {
    const products = this.productTable.filter((p) => p.category === category);
    for (const product of products) {
      const newPrice = product.price * (1 - discountPercent / 100);
      this.productTable.update((p) => p.id === product.id, { price: newPrice });
    }
    console.log(`Applied ${discountPercent}% discount to ${products.length} products in ${category}`);
  }

  // Business logic for restocking
  restock(productId: string, quantity: number): void {
    const product = this.getProduct(productId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }
    if (quantity <= 0) {
      throw new Error("Restock quantity must be positive");
    }
    this.productTable.update((p) => p.id === productId, { quantity: product.quantity + quantity });
    console.log(`Restocked ${product.name}: +${quantity} units`);
  }

  // Business logic for getting category summary
  getCategorySummary(): Map<string, { count: number; totalValue: number }> {
    const products = this.productTable.getAll();
    const summary = new Map<string, { count: number; totalValue: number }>();

    for (const product of products) {
      const existing = summary.get(product.category) || { count: 0, totalValue: 0 };
      summary.set(product.category, {
        count: existing.count + 1,
        totalValue: existing.totalValue + product.price * product.quantity,
      });
    }

    return summary;
  }
}

// Usage
console.log("=== Table Module Pattern ===\n");

// Initialize record set with data
const productData = new RecordSet<ProductRecord>([
  { id: "p1", name: "Laptop", price: 999, quantity: 50, category: "Electronics" },
  { id: "p2", name: "Mouse", price: 25, quantity: 200, category: "Electronics" },
  { id: "p3", name: "Desk", price: 300, quantity: 5, category: "Furniture" },
  { id: "p4", name: "Chair", price: 150, quantity: 8, category: "Furniture" },
  { id: "p5", name: "Keyboard", price: 75, quantity: 100, category: "Electronics" },
]);

// Create table module
const productModule = new ProductModule(productData);

// Use business logic methods
console.log("Total inventory value: $" + productModule.calculateInventoryValue());

console.log("\nLow stock products:");
productModule.getLowStockProducts().forEach((p) => console.log(`  - ${p.name}: ${p.quantity} units`));

productModule.applyCategoryDiscount("Furniture", 10);

productModule.restock("p3", 20);

console.log("\nCategory Summary:");
productModule.getCategorySummary().forEach((stats, category) => {
  console.log(`  ${category}: ${stats.count} products, $${stats.totalValue.toFixed(2)} value`);
});

// Make this file a module to avoid global scope pollution
export {};
