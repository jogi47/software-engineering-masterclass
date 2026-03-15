/**
 * REMOTE FACADE
 *
 * Provides a coarse-grained facade on fine-grained objects to improve
 * efficiency over a network.
 *
 * Characteristics:
 * - Reduces network round trips
 * - Bundles multiple fine-grained operations
 * - Converts between DTOs and domain objects
 * - Hides internal complexity from remote clients
 */

// Fine-grained domain objects (internal)
class Customer {
  constructor(
    public readonly id: string,
    public firstName: string,
    public lastName: string,
    public email: string
  ) {}

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}

class Address {
  constructor(
    public readonly id: string,
    public street: string,
    public city: string,
    public zipCode: string,
    public country: string
  ) {}

  format(): string {
    return `${this.street}, ${this.city} ${this.zipCode}, ${this.country}`;
  }
}

class Order {
  constructor(
    public readonly id: string,
    public readonly customerId: string,
    public items: Array<{ productId: string; quantity: number; price: number }>,
    public status: string
  ) {}

  getTotal(): number {
    return this.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  }
}

// DTOs for network transfer
interface CustomerDTO {
  id: string;
  fullName: string;
  email: string;
  address?: AddressDTO;
  recentOrders?: OrderSummaryDTO[];
}

interface AddressDTO {
  formattedAddress: string;
}

interface OrderSummaryDTO {
  id: string;
  total: number;
  status: string;
  itemCount: number;
}

// Simulated repositories (internal)
const customers = new Map<string, Customer>([
  ["c1", new Customer("c1", "Alice", "Smith", "alice@example.com")],
  ["c2", new Customer("c2", "Bob", "Johnson", "bob@example.com")],
]);

const addresses = new Map<string, Address>([
  ["c1", new Address("a1", "123 Main St", "New York", "10001", "USA")],
  ["c2", new Address("a2", "456 Oak Ave", "Los Angeles", "90001", "USA")],
]);

const orders = new Map<string, Order[]>([
  [
    "c1",
    [
      new Order("o1", "c1", [{ productId: "p1", quantity: 1, price: 999 }], "shipped"),
      new Order("o2", "c1", [{ productId: "p2", quantity: 2, price: 25 }], "pending"),
    ],
  ],
  ["c2", [new Order("o3", "c2", [{ productId: "p3", quantity: 1, price: 150 }], "delivered")]],
]);

// REMOTE FACADE - coarse-grained API for remote clients
class CustomerFacade {
  /**
   * Get complete customer profile in a single call.
   * Without facade, client would need to make multiple calls:
   * - getCustomer(id)
   * - getAddress(customerId)
   * - getOrders(customerId) (potentially multiple)
   */
  getCustomerProfile(customerId: string): CustomerDTO | null {
    console.log(`[Facade] getCustomerProfile(${customerId})`);

    // Load customer
    const customer = customers.get(customerId);
    if (!customer) return null;

    // Load address
    const address = addresses.get(customerId);

    // Load recent orders
    const customerOrders = orders.get(customerId) || [];

    // Assemble DTO (single network response)
    return {
      id: customer.id,
      fullName: customer.getFullName(),
      email: customer.email,
      address: address
        ? {
            formattedAddress: address.format(),
          }
        : undefined,
      recentOrders: customerOrders.map((order) => ({
        id: order.id,
        total: order.getTotal(),
        status: order.status,
        itemCount: order.items.length,
      })),
    };
  }

  /**
   * Update multiple customer properties in a single call.
   * Instead of separate updateEmail, updateName, updateAddress calls.
   */
  updateCustomerProfile(
    customerId: string,
    updates: {
      firstName?: string;
      lastName?: string;
      email?: string;
      street?: string;
      city?: string;
      zipCode?: string;
    }
  ): boolean {
    console.log(`[Facade] updateCustomerProfile(${customerId}, ${JSON.stringify(updates)})`);

    const customer = customers.get(customerId);
    if (!customer) return false;

    // Apply all updates in one transaction
    if (updates.firstName) customer.firstName = updates.firstName;
    if (updates.lastName) customer.lastName = updates.lastName;
    if (updates.email) customer.email = updates.email;

    const address = addresses.get(customerId);
    if (address) {
      if (updates.street) address.street = updates.street;
      if (updates.city) address.city = updates.city;
      if (updates.zipCode) address.zipCode = updates.zipCode;
    }

    return true;
  }

  /**
   * Get dashboard data in a single call.
   * Aggregates data that would otherwise require many fine-grained calls.
   */
  getCustomerDashboard(customerId: string): {
    profile: CustomerDTO;
    stats: { totalOrders: number; totalSpent: number; pendingOrders: number };
  } | null {
    console.log(`[Facade] getCustomerDashboard(${customerId})`);

    const profile = this.getCustomerProfile(customerId);
    if (!profile) return null;

    const customerOrders = orders.get(customerId) || [];

    return {
      profile,
      stats: {
        totalOrders: customerOrders.length,
        totalSpent: customerOrders.reduce((sum, o) => sum + o.getTotal(), 0),
        pendingOrders: customerOrders.filter((o) => o.status === "pending").length,
      },
    };
  }
}

// Usage
console.log("=== Remote Facade Pattern ===\n");

const facade = new CustomerFacade();

// Single call gets complete profile (vs multiple fine-grained calls)
const profile = facade.getCustomerProfile("c1");
console.log("\nCustomer Profile (single call):");
console.log(JSON.stringify(profile, null, 2));

// Single call updates multiple properties
facade.updateCustomerProfile("c1", {
  email: "alice.new@example.com",
  city: "Boston",
});

// Get updated profile
const updatedProfile = facade.getCustomerProfile("c1");
console.log("\nUpdated Profile:");
console.log(`  Email: ${updatedProfile?.email}`);
console.log(`  Address: ${updatedProfile?.address?.formattedAddress}`);

// Dashboard with aggregated data
const dashboard = facade.getCustomerDashboard("c1");
console.log("\nDashboard (aggregated data):");
console.log(JSON.stringify(dashboard?.stats, null, 2));

// Make this file a module to avoid global scope pollution
export {};
