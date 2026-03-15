/**
 * LAZY LOAD
 *
 * An object that doesn't contain all the data you need but knows how
 * to get it. Defers loading of data until it's actually needed.
 *
 * Characteristics:
 * - Improves initial load performance
 * - Loads related data on demand
 * - Several variants: lazy initialization, virtual proxy, value holder, ghost
 * - Be careful of N+1 query problems
 */

// Simulated database
const database = {
  orders: new Map([
    ["o1", { id: "o1", customerId: "c1", total: 150 }],
    ["o2", { id: "o2", customerId: "c1", total: 200 }],
    ["o3", { id: "o3", customerId: "c2", total: 75 }],
  ]),
  orderItems: new Map([
    ["o1", [
      { productName: "Laptop", quantity: 1, price: 100 },
      { productName: "Mouse", quantity: 2, price: 25 },
    ]],
    ["o2", [
      { productName: "Keyboard", quantity: 1, price: 75 },
      { productName: "Monitor", quantity: 1, price: 125 },
    ]],
    ["o3", [
      { productName: "USB Cable", quantity: 3, price: 25 },
    ]],
  ]),
};

// Order item type
interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
}

// VALUE HOLDER - holds a lazily loaded value
class ValueHolder<T> {
  private value: T | undefined;
  private loaded = false;

  constructor(private loader: () => T) {}

  getValue(): T {
    if (!this.loaded) {
      console.log("  [Lazy loading value...]");
      this.value = this.loader();
      this.loaded = true;
    }
    return this.value!;
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}

// Order with lazy loaded items
class Order {
  public readonly id: string;
  public readonly customerId: string;
  public readonly total: number;

  // Items are loaded lazily
  private itemsHolder: ValueHolder<OrderItem[]>;

  constructor(id: string, customerId: string, total: number) {
    this.id = id;
    this.customerId = customerId;
    this.total = total;

    // Set up lazy loader
    this.itemsHolder = new ValueHolder(() => {
      const items = database.orderItems.get(id);
      return items || [];
    });
  }

  // Accessing items triggers lazy load
  get items(): OrderItem[] {
    return this.itemsHolder.getValue();
  }

  get itemCount(): number {
    return this.items.length;
  }

  areItemsLoaded(): boolean {
    return this.itemsHolder.isLoaded();
  }
}

// VIRTUAL PROXY - a proxy that loads the real object on demand
class CustomerProxy {
  private realCustomer: { id: string; name: string; email: string } | null = null;
  private loaded = false;

  constructor(public readonly id: string) {}

  private load(): void {
    if (!this.loaded) {
      console.log(`  [Loading customer ${this.id} from database...]`);
      // Simulate database lookup
      this.realCustomer = {
        id: this.id,
        name: this.id === "c1" ? "Alice" : "Bob",
        email: this.id === "c1" ? "alice@example.com" : "bob@example.com",
      };
      this.loaded = true;
    }
  }

  get name(): string {
    this.load();
    return this.realCustomer!.name;
  }

  get email(): string {
    this.load();
    return this.realCustomer!.email;
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}

// GHOST - object loaded with partial data
class OrderGhost {
  public readonly id: string;
  private _total: number | null = null;
  private _customerId: string | null = null;
  private loaded = false;

  constructor(id: string) {
    this.id = id;
    // Only ID is loaded initially
  }

  private loadIfNeeded(): void {
    if (!this.loaded) {
      console.log(`  [Loading ghost order ${this.id}...]`);
      const data = database.orders.get(this.id);
      if (data) {
        this._total = data.total;
        this._customerId = data.customerId;
      }
      this.loaded = true;
    }
  }

  get total(): number {
    this.loadIfNeeded();
    return this._total!;
  }

  get customerId(): string {
    this.loadIfNeeded();
    return this._customerId!;
  }
}

// Usage
console.log("=== Lazy Load Pattern ===\n");

// VALUE HOLDER example
console.log("Creating order (items not loaded yet):");
const order = new Order("o1", "c1", 150);
console.log(`Order ID: ${order.id}`);
console.log(`Items loaded: ${order.areItemsLoaded()}`);

console.log("\nAccessing items (triggers load):");
console.log(`Item count: ${order.itemCount}`);
console.log(`Items loaded: ${order.areItemsLoaded()}`);
console.log("Items:", order.items.map((i) => i.productName).join(", "));

// VIRTUAL PROXY example
console.log("\n--- Virtual Proxy ---");
console.log("Creating customer proxy (not loaded yet):");
const customer = new CustomerProxy("c1");
console.log(`Customer loaded: ${customer.isLoaded()}`);

console.log("\nAccessing customer name (triggers load):");
console.log(`Name: ${customer.name}`);
console.log(`Customer loaded: ${customer.isLoaded()}`);
console.log(`Email: ${customer.email}`); // No additional load

// GHOST example
console.log("\n--- Ghost Object ---");
console.log("Creating order ghost (only ID loaded):");
const ghost = new OrderGhost("o2");

console.log("\nAccessing total (triggers full load):");
console.log(`Total: $${ghost.total}`);
console.log(`Customer ID: ${ghost.customerId}`); // No additional load

// Make this file a module to avoid global scope pollution
export {};
