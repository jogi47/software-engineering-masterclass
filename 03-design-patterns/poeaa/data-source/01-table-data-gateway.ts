/**
 * TABLE DATA GATEWAY
 *
 * An object that acts as a Gateway to a database table.
 * One instance handles all the rows in the table.
 *
 * Characteristics:
 * - One class per table
 * - Contains all SQL for that table
 * - Returns raw data (records/rows), not domain objects
 * - Good for separating SQL from application logic
 */

// Types for the table rows
interface ProductRow {
  id: string;
  name: string;
  price: number;
  category_id: string;
  stock: number;
}

// Simulated database
const database = {
  products: new Map<string, ProductRow>([
    ["p1", { id: "p1", name: "Laptop", price: 999, category_id: "c1", stock: 50 }],
    ["p2", { id: "p2", name: "Mouse", price: 25, category_id: "c1", stock: 200 }],
    ["p3", { id: "p3", name: "Desk", price: 300, category_id: "c2", stock: 30 }],
  ]),
};

// TABLE DATA GATEWAY - handles all database access for products table
class ProductGateway {
  // Find methods
  find(id: string): ProductRow | undefined {
    // SQL: SELECT * FROM products WHERE id = ?
    return database.products.get(id);
  }

  findAll(): ProductRow[] {
    // SQL: SELECT * FROM products
    return Array.from(database.products.values());
  }

  findByCategory(categoryId: string): ProductRow[] {
    // SQL: SELECT * FROM products WHERE category_id = ?
    return Array.from(database.products.values()).filter((p) => p.category_id === categoryId);
  }

  findByPriceRange(minPrice: number, maxPrice: number): ProductRow[] {
    // SQL: SELECT * FROM products WHERE price BETWEEN ? AND ?
    return Array.from(database.products.values()).filter((p) => p.price >= minPrice && p.price <= maxPrice);
  }

  findLowStock(threshold: number): ProductRow[] {
    // SQL: SELECT * FROM products WHERE stock < ?
    return Array.from(database.products.values()).filter((p) => p.stock < threshold);
  }

  // Insert method
  insert(name: string, price: number, categoryId: string, stock: number): string {
    // SQL: INSERT INTO products (id, name, price, category_id, stock) VALUES (?, ?, ?, ?, ?)
    const id = `p-${Date.now()}`;
    database.products.set(id, {
      id,
      name,
      price,
      category_id: categoryId,
      stock,
    });
    console.log(`Inserted product: ${name}`);
    return id;
  }

  // Update methods
  update(id: string, name: string, price: number, categoryId: string, stock: number): void {
    // SQL: UPDATE products SET name = ?, price = ?, category_id = ?, stock = ? WHERE id = ?
    if (!database.products.has(id)) {
      throw new Error(`Product ${id} not found`);
    }
    database.products.set(id, { id, name, price, category_id: categoryId, stock });
    console.log(`Updated product: ${id}`);
  }

  updateStock(id: string, newStock: number): void {
    // SQL: UPDATE products SET stock = ? WHERE id = ?
    const product = database.products.get(id);
    if (!product) {
      throw new Error(`Product ${id} not found`);
    }
    product.stock = newStock;
    console.log(`Updated stock for ${id}: ${newStock}`);
  }

  updatePrice(id: string, newPrice: number): void {
    // SQL: UPDATE products SET price = ? WHERE id = ?
    const product = database.products.get(id);
    if (!product) {
      throw new Error(`Product ${id} not found`);
    }
    product.price = newPrice;
    console.log(`Updated price for ${id}: $${newPrice}`);
  }

  // Delete method
  delete(id: string): void {
    // SQL: DELETE FROM products WHERE id = ?
    database.products.delete(id);
    console.log(`Deleted product: ${id}`);
  }

  // Aggregate methods
  countByCategory(categoryId: string): number {
    // SQL: SELECT COUNT(*) FROM products WHERE category_id = ?
    return this.findByCategory(categoryId).length;
  }

  sumStock(): number {
    // SQL: SELECT SUM(stock) FROM products
    return Array.from(database.products.values()).reduce((sum, p) => sum + p.stock, 0);
  }
}

// Usage
console.log("=== Table Data Gateway Pattern ===\n");

const productGateway = new ProductGateway();

// Find operations return raw data
const laptop = productGateway.find("p1");
console.log("Found product:", laptop);

// Find by category
const electronics = productGateway.findByCategory("c1");
console.log(`\nElectronics products: ${electronics.length}`);
electronics.forEach((p) => console.log(`  - ${p.name}: $${p.price}`));

// Insert new product
const newId = productGateway.insert("Keyboard", 75, "c1", 100);
console.log(`\nInserted with ID: ${newId}`);

// Update stock
productGateway.updateStock("p1", 45);

// Find low stock
console.log("\nLow stock products (< 50):");
productGateway.findLowStock(50).forEach((p) => console.log(`  - ${p.name}: ${p.stock} units`));

// Aggregates
console.log(`\nTotal stock: ${productGateway.sumStock()} units`);

// Make this file a module to avoid global scope pollution
export {};
