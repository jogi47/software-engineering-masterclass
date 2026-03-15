/**
 * ROW DATA GATEWAY
 *
 * An object that acts as a Gateway to a single record in a data source.
 * There is one instance per row.
 *
 * Characteristics:
 * - One instance per database row
 * - Contains only data access, no domain logic
 * - Domain logic stays in separate domain objects
 * - Clean separation between data access and business logic
 */

// Simulated database
const database = {
  orders: new Map<string, { id: string; customer_id: string; total: number; status: string; created_at: string }>([
    ["o1", { id: "o1", customer_id: "c1", total: 150, status: "pending", created_at: "2024-01-15" }],
    ["o2", { id: "o2", customer_id: "c1", total: 300, status: "shipped", created_at: "2024-01-10" }],
    ["o3", { id: "o3", customer_id: "c2", total: 75, status: "pending", created_at: "2024-01-20" }],
  ]),
};

// ROW DATA GATEWAY - one instance per row, handles only data access
class OrderGateway {
  // Data fields matching database columns
  public id: string = "";
  public customerId: string = "";
  public total: number = 0;
  public status: string = "";
  public createdAt: string = "";

  // Static finder that returns gateway instances
  static find(id: string): OrderGateway | null {
    const row = database.orders.get(id);
    if (!row) return null;

    const gateway = new OrderGateway();
    gateway.id = row.id;
    gateway.customerId = row.customer_id;
    gateway.total = row.total;
    gateway.status = row.status;
    gateway.createdAt = row.created_at;
    return gateway;
  }

  static findByCustomer(customerId: string): OrderGateway[] {
    const gateways: OrderGateway[] = [];
    for (const row of Array.from(database.orders.values())) {
      if (row.customer_id === customerId) {
        const gateway = new OrderGateway();
        gateway.id = row.id;
        gateway.customerId = row.customer_id;
        gateway.total = row.total;
        gateway.status = row.status;
        gateway.createdAt = row.created_at;
        gateways.push(gateway);
      }
    }
    return gateways;
  }

  static findByStatus(status: string): OrderGateway[] {
    const gateways: OrderGateway[] = [];
    for (const row of Array.from(database.orders.values())) {
      if (row.status === status) {
        const gateway = new OrderGateway();
        gateway.id = row.id;
        gateway.customerId = row.customer_id;
        gateway.total = row.total;
        gateway.status = row.status;
        gateway.createdAt = row.created_at;
        gateways.push(gateway);
      }
    }
    return gateways;
  }

  // Insert a new row
  insert(): void {
    if (!this.id) {
      this.id = `o-${Date.now()}`;
    }
    database.orders.set(this.id, {
      id: this.id,
      customer_id: this.customerId,
      total: this.total,
      status: this.status,
      created_at: this.createdAt,
    });
    console.log(`Inserted order: ${this.id}`);
  }

  // Update the row
  update(): void {
    if (!database.orders.has(this.id)) {
      throw new Error(`Order ${this.id} not found`);
    }
    database.orders.set(this.id, {
      id: this.id,
      customer_id: this.customerId,
      total: this.total,
      status: this.status,
      created_at: this.createdAt,
    });
    console.log(`Updated order: ${this.id}`);
  }

  // Delete the row
  delete(): void {
    database.orders.delete(this.id);
    console.log(`Deleted order: ${this.id}`);
  }
}

// Domain object that uses the Row Data Gateway (no DB knowledge)
class Order {
  private gateway: OrderGateway;

  constructor(gateway: OrderGateway) {
    this.gateway = gateway;
  }

  // Domain getters
  get id(): string {
    return this.gateway.id;
  }
  get total(): number {
    return this.gateway.total;
  }
  get status(): string {
    return this.gateway.status;
  }

  // Domain logic
  canBeCancelled(): boolean {
    return this.gateway.status === "pending";
  }

  cancel(): void {
    if (!this.canBeCancelled()) {
      throw new Error("Only pending orders can be cancelled");
    }
    this.gateway.status = "cancelled";
    this.gateway.update();
  }

  ship(): void {
    if (this.gateway.status !== "pending") {
      throw new Error("Only pending orders can be shipped");
    }
    this.gateway.status = "shipped";
    this.gateway.update();
  }

  applyDiscount(percent: number): void {
    const discount = this.gateway.total * (percent / 100);
    this.gateway.total = this.gateway.total - discount;
    this.gateway.update();
  }
}

// Usage
console.log("=== Row Data Gateway Pattern ===\n");

// Find using gateway
const orderGateway = OrderGateway.find("o1");
if (orderGateway) {
  console.log(`Found order: ${orderGateway.id}, Total: $${orderGateway.total}`);

  // Wrap in domain object for business logic
  const order = new Order(orderGateway);
  console.log(`Can be cancelled: ${order.canBeCancelled()}`);

  order.applyDiscount(10);
  console.log(`After 10% discount: $${order.total}`);
}

// Create new order using gateway
const newGateway = new OrderGateway();
newGateway.customerId = "c3";
newGateway.total = 500;
newGateway.status = "pending";
newGateway.createdAt = new Date().toISOString().split("T")[0];
newGateway.insert();

// Find by status
console.log("\nPending orders:");
OrderGateway.findByStatus("pending").forEach((g) => {
  console.log(`  - Order ${g.id}: $${g.total}`);
});

// Make this file a module to avoid global scope pollution
export {};
