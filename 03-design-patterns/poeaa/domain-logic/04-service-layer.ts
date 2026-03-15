/**
 * SERVICE LAYER
 *
 * Defines an application's boundary with a layer of services that establishes
 * a set of available operations and coordinates the application's response.
 *
 * Characteristics:
 * - Thin layer on top of domain model
 * - Orchestrates domain objects and infrastructure
 * - Handles transactions and security
 * - Provides a clear API for the presentation layer
 */

// Domain Entities (simplified)
class User {
  constructor(
    public readonly id: string,
    public name: string,
    public email: string
  ) {}
}

class Order {
  public items: OrderItem[] = [];
  public status: "PENDING" | "CONFIRMED" | "SHIPPED" = "PENDING";

  constructor(
    public readonly id: string,
    public readonly userId: string
  ) {}

  addItem(productId: string, quantity: number, price: number): void {
    this.items.push(new OrderItem(productId, quantity, price));
  }

  get total(): number {
    return this.items.reduce((sum, item) => sum + item.subtotal, 0);
  }

  confirm(): void {
    if (this.items.length === 0) {
      throw new Error("Cannot confirm empty order");
    }
    this.status = "CONFIRMED";
  }
}

class OrderItem {
  constructor(
    public readonly productId: string,
    public readonly quantity: number,
    public readonly price: number
  ) {}

  get subtotal(): number {
    return this.quantity * this.price;
  }
}

// Repositories (infrastructure layer)
interface UserRepository {
  findById(id: string): User | undefined;
}

interface OrderRepository {
  findById(id: string): Order | undefined;
  save(order: Order): void;
}

// Simple in-memory implementations
class InMemoryUserRepository implements UserRepository {
  private users = new Map<string, User>([
    ["user1", new User("user1", "Alice", "alice@example.com")],
  ]);

  findById(id: string): User | undefined {
    return this.users.get(id);
  }
}

class InMemoryOrderRepository implements OrderRepository {
  private orders = new Map<string, Order>();

  findById(id: string): Order | undefined {
    return this.orders.get(id);
  }

  save(order: Order): void {
    this.orders.set(order.id, order);
  }
}

// SERVICE LAYER - coordinates application operations
class OrderService {
  constructor(
    private userRepository: UserRepository,
    private orderRepository: OrderRepository
  ) {}

  createOrder(userId: string): Order {
    // Verify user exists
    const user = this.userRepository.findById(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Create order
    const orderId = `order-${Date.now()}`;
    const order = new Order(orderId, userId);

    // Save order
    this.orderRepository.save(order);

    console.log(`Created order ${orderId} for user ${user.name}`);
    return order;
  }

  addItemToOrder(orderId: string, productId: string, quantity: number, price: number): void {
    const order = this.orderRepository.findById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Delegate to domain object
    order.addItem(productId, quantity, price);

    // Save changes
    this.orderRepository.save(order);

    console.log(`Added ${quantity}x ${productId} to order ${orderId}`);
  }

  confirmOrder(orderId: string): void {
    const order = this.orderRepository.findById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Delegate to domain object
    order.confirm();

    // Save changes
    this.orderRepository.save(order);

    // Could trigger additional operations here:
    // - Send confirmation email
    // - Update inventory
    // - Process payment

    console.log(`Order ${orderId} confirmed. Total: $${order.total}`);
  }

  getOrderSummary(orderId: string): { id: string; status: string; total: number; itemCount: number } {
    const order = this.orderRepository.findById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    return {
      id: order.id,
      status: order.status,
      total: order.total,
      itemCount: order.items.length,
    };
  }
}

// Usage
console.log("=== Service Layer Pattern ===\n");

const userRepo = new InMemoryUserRepository();
const orderRepo = new InMemoryOrderRepository();
const orderService = new OrderService(userRepo, orderRepo);

// Client code only interacts with the service layer
const order = orderService.createOrder("user1");
orderService.addItemToOrder(order.id, "laptop", 1, 999);
orderService.addItemToOrder(order.id, "mouse", 2, 25);
orderService.confirmOrder(order.id);

const summary = orderService.getOrderSummary(order.id);
console.log("\nOrder Summary:", summary);

// Make this file a module to avoid global scope pollution
export {};
