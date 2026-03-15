/**
 * ANTI-CORRUPTION LAYER (ACL)
 *
 * A translation layer that isolates your domain model from external or
 * legacy systems. It translates between your model and external models,
 * preventing corruption of your domain language and concepts.
 *
 * Characteristics:
 * - Translates external models to internal domain models
 * - Protects domain from external changes
 * - Maintains Ubiquitous Language integrity
 * - May include adapters, facades, and translators
 * - Often includes validation and enrichment
 *
 * When to use:
 * - Integrating with legacy systems
 * - External APIs with poor design
 * - Third-party services with different models
 * - When you want to protect your domain model
 * - Multiple external systems need abstraction
 *
 * Components:
 * - Facade: Simplified interface to complex external API
 * - Adapter: Translates between interfaces
 * - Translator: Converts data between models
 *
 * Benefits:
 * - Domain model stays clean
 * - External changes isolated
 * - Easier testing
 * - Clear integration points
 */

// ============================================
// EXTERNAL SYSTEM: Legacy Order API
// Poorly designed, uses different terminology
// ============================================

namespace LegacyOrderSystem {
  // Legacy uses different naming, flat structures, magic numbers
  export interface LegacyOrderRecord {
    ord_id: string;
    cust_no: string;
    ord_dt: string; // Date as string "YYYYMMDD"
    stat_cd: number; // 1=New, 2=Processing, 3=Shipped, 4=Delivered, 5=Cancelled
    ship_addr1: string;
    ship_addr2: string;
    ship_city: string;
    ship_st: string;
    ship_zip: string;
    ship_ctry: string;
    tot_amt: number; // In cents
    tax_amt: number; // In cents
    items: LegacyOrderItem[];
  }

  export interface LegacyOrderItem {
    line_no: number;
    prod_cd: string;
    prod_nm: string;
    qty: number;
    unit_prc: number; // In cents
    disc_pct: number;
  }

  export interface LegacyCustomer {
    cust_no: string;
    nm_first: string;
    nm_last: string;
    email_addr: string;
    ph_no: string;
    tier_cd: string; // "B", "S", "G", "P"
    create_dt: string;
  }

  // Simulated legacy API
  export class LegacyOrderApi {
    private orders = new Map<string, LegacyOrderRecord>();
    private customers = new Map<string, LegacyCustomer>();

    insertOrder(order: LegacyOrderRecord): void {
      this.orders.set(order.ord_id, order);
    }

    insertCustomer(customer: LegacyCustomer): void {
      this.customers.set(customer.cust_no, customer);
    }

    fetchOrder(orderId: string): LegacyOrderRecord | null {
      return this.orders.get(orderId) || null;
    }

    fetchCustomer(custNo: string): LegacyCustomer | null {
      return this.customers.get(custNo) || null;
    }

    fetchOrdersByCustomer(custNo: string): LegacyOrderRecord[] {
      return Array.from(this.orders.values()).filter((o) => o.cust_no === custNo);
    }
  }
}

// ============================================
// OUR DOMAIN MODEL
// Clean, well-designed, uses our Ubiquitous Language
// ============================================

namespace OrderDomain {
  // Value Objects
  export class Money {
    private constructor(
      private readonly _amount: number,
      private readonly _currency: string
    ) {}

    static fromCents(cents: number, currency: string = "USD"): Money {
      return new Money(cents / 100, currency);
    }

    static of(amount: number, currency: string = "USD"): Money {
      return new Money(amount, currency);
    }

    get amount(): number {
      return this._amount;
    }

    get currency(): string {
      return this._currency;
    }

    add(other: Money): Money {
      return new Money(this._amount + other._amount, this._currency);
    }

    subtract(other: Money): Money {
      return new Money(this._amount - other._amount, this._currency);
    }

    multiply(factor: number): Money {
      return Money.of(this._amount * factor, this._currency);
    }

    toString(): string {
      return `${this._currency} ${this._amount.toFixed(2)}`;
    }
  }

  export class Address {
    constructor(
      readonly street1: string,
      readonly street2: string,
      readonly city: string,
      readonly state: string,
      readonly zipCode: string,
      readonly country: string
    ) {}

    format(): string {
      const lines = [this.street1];
      if (this.street2) lines.push(this.street2);
      lines.push(`${this.city}, ${this.state} ${this.zipCode}`);
      lines.push(this.country);
      return lines.join("\n");
    }
  }

  // Enums with domain meaning
  export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

  export type CustomerTier = "bronze" | "silver" | "gold" | "platinum";

  // Entities
  export class OrderLine {
    constructor(
      readonly lineNumber: number,
      readonly productId: string,
      readonly productName: string,
      readonly quantity: number,
      readonly unitPrice: Money,
      readonly discountPercent: number
    ) {}

    get subtotal(): Money {
      const gross = this.unitPrice.multiply(this.quantity);
      const discount = gross.multiply(this.discountPercent / 100);
      return gross.subtract(discount);
    }
  }

  export class Order {
    constructor(
      readonly orderId: string,
      readonly customerId: string,
      readonly placedAt: Date,
      readonly status: OrderStatus,
      readonly shippingAddress: Address,
      readonly lines: OrderLine[],
      readonly subtotal: Money,
      readonly tax: Money
    ) {}

    get total(): Money {
      return this.subtotal.add(this.tax);
    }

    get itemCount(): number {
      return this.lines.reduce((sum, line) => sum + line.quantity, 0);
    }
  }

  export class Customer {
    constructor(
      readonly customerId: string,
      readonly firstName: string,
      readonly lastName: string,
      readonly email: string,
      readonly phone: string,
      readonly tier: CustomerTier,
      readonly memberSince: Date
    ) {}

    get fullName(): string {
      return `${this.firstName} ${this.lastName}`;
    }
  }
}

// ============================================
// ANTI-CORRUPTION LAYER
// Translates between Legacy and Domain models
// ============================================

namespace AntiCorruptionLayer {
  /**
   * OrderTranslator - Translates Legacy orders to Domain orders
   */
  export class OrderTranslator {
    // Translate status code to domain enum
    private static translateStatus(statusCode: number): OrderDomain.OrderStatus {
      const statusMap: Record<number, OrderDomain.OrderStatus> = {
        1: "pending",
        2: "processing",
        3: "shipped",
        4: "delivered",
        5: "cancelled",
      };
      return statusMap[statusCode] || "pending";
    }

    // Parse legacy date format
    private static parseDate(dateStr: string): Date {
      // Legacy format: "YYYYMMDD"
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1;
      const day = parseInt(dateStr.substring(6, 8));
      return new Date(year, month, day);
    }

    // Translate single order
    static toDomain(legacy: LegacyOrderSystem.LegacyOrderRecord): OrderDomain.Order {
      const shippingAddress = new OrderDomain.Address(
        legacy.ship_addr1,
        legacy.ship_addr2,
        legacy.ship_city,
        legacy.ship_st,
        legacy.ship_zip,
        legacy.ship_ctry
      );

      const lines = legacy.items.map(
        (item) =>
          new OrderDomain.OrderLine(
            item.line_no,
            item.prod_cd,
            item.prod_nm,
            item.qty,
            OrderDomain.Money.fromCents(item.unit_prc),
            item.disc_pct
          )
      );

      return new OrderDomain.Order(
        legacy.ord_id,
        legacy.cust_no,
        this.parseDate(legacy.ord_dt),
        this.translateStatus(legacy.stat_cd),
        shippingAddress,
        lines,
        OrderDomain.Money.fromCents(legacy.tot_amt),
        OrderDomain.Money.fromCents(legacy.tax_amt)
      );
    }

    // Translate domain order back to legacy (for writes)
    static toLegacy(order: OrderDomain.Order): LegacyOrderSystem.LegacyOrderRecord {
      const reverseStatusMap: Record<OrderDomain.OrderStatus, number> = {
        pending: 1,
        processing: 2,
        shipped: 3,
        delivered: 4,
        cancelled: 5,
      };

      const formatDate = (date: Date): string => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}${m}${d}`;
      };

      return {
        ord_id: order.orderId,
        cust_no: order.customerId,
        ord_dt: formatDate(order.placedAt),
        stat_cd: reverseStatusMap[order.status],
        ship_addr1: order.shippingAddress.street1,
        ship_addr2: order.shippingAddress.street2,
        ship_city: order.shippingAddress.city,
        ship_st: order.shippingAddress.state,
        ship_zip: order.shippingAddress.zipCode,
        ship_ctry: order.shippingAddress.country,
        tot_amt: Math.round(order.subtotal.amount * 100),
        tax_amt: Math.round(order.tax.amount * 100),
        items: order.lines.map((line) => ({
          line_no: line.lineNumber,
          prod_cd: line.productId,
          prod_nm: line.productName,
          qty: line.quantity,
          unit_prc: Math.round(line.unitPrice.amount * 100),
          disc_pct: line.discountPercent,
        })),
      };
    }
  }

  /**
   * CustomerTranslator - Translates Legacy customers
   */
  export class CustomerTranslator {
    private static translateTier(tierCode: string): OrderDomain.CustomerTier {
      const tierMap: Record<string, OrderDomain.CustomerTier> = {
        B: "bronze",
        S: "silver",
        G: "gold",
        P: "platinum",
      };
      return tierMap[tierCode] || "bronze";
    }

    static toDomain(legacy: LegacyOrderSystem.LegacyCustomer): OrderDomain.Customer {
      return new OrderDomain.Customer(
        legacy.cust_no,
        legacy.nm_first,
        legacy.nm_last,
        legacy.email_addr,
        legacy.ph_no,
        this.translateTier(legacy.tier_cd),
        new Date(
          parseInt(legacy.create_dt.substring(0, 4)),
          parseInt(legacy.create_dt.substring(4, 6)) - 1,
          parseInt(legacy.create_dt.substring(6, 8))
        )
      );
    }
  }

  /**
   * LegacyOrderFacade - Simplified interface to legacy system
   * Hides legacy API complexity and returns domain objects
   */
  export class LegacyOrderFacade {
    constructor(private readonly legacyApi: LegacyOrderSystem.LegacyOrderApi) {}

    async getOrder(orderId: string): Promise<OrderDomain.Order | null> {
      // Call legacy API
      const legacyOrder = this.legacyApi.fetchOrder(orderId);
      if (!legacyOrder) return null;

      // Translate to domain model
      return OrderTranslator.toDomain(legacyOrder);
    }

    async getCustomer(customerId: string): Promise<OrderDomain.Customer | null> {
      const legacyCustomer = this.legacyApi.fetchCustomer(customerId);
      if (!legacyCustomer) return null;

      return CustomerTranslator.toDomain(legacyCustomer);
    }

    async getOrdersForCustomer(customerId: string): Promise<OrderDomain.Order[]> {
      const legacyOrders = this.legacyApi.fetchOrdersByCustomer(customerId);
      return legacyOrders.map((lo) => OrderTranslator.toDomain(lo));
    }

    async getOrderWithCustomer(
      orderId: string
    ): Promise<{ order: OrderDomain.Order; customer: OrderDomain.Customer } | null> {
      const order = await this.getOrder(orderId);
      if (!order) return null;

      const customer = await this.getCustomer(order.customerId);
      if (!customer) return null;

      return { order, customer };
    }
  }
}

// ============================================
// APPLICATION SERVICE
// Uses domain objects only - doesn't know about legacy
// ============================================

namespace Application {
  export class OrderService {
    constructor(private readonly orderFacade: AntiCorruptionLayer.LegacyOrderFacade) {}

    async getOrderDetails(orderId: string): Promise<OrderDetails | null> {
      // Gets clean domain objects through ACL
      const result = await this.orderFacade.getOrderWithCustomer(orderId);
      if (!result) return null;

      const { order, customer } = result;

      return {
        orderId: order.orderId,
        customerName: customer.fullName,
        customerEmail: customer.email,
        customerTier: customer.tier,
        placedAt: order.placedAt,
        status: order.status,
        shippingAddress: order.shippingAddress.format(),
        items: order.lines.map((line) => ({
          product: line.productName,
          quantity: line.quantity,
          price: line.unitPrice.toString(),
          discount: line.discountPercent > 0 ? `${line.discountPercent}%` : null,
          subtotal: line.subtotal.toString(),
        })),
        subtotal: order.subtotal.toString(),
        tax: order.tax.toString(),
        total: order.total.toString(),
      };
    }
  }

  interface OrderDetails {
    orderId: string;
    customerName: string;
    customerEmail: string;
    customerTier: string;
    placedAt: Date;
    status: string;
    shippingAddress: string;
    items: {
      product: string;
      quantity: number;
      price: string;
      discount: string | null;
      subtotal: string;
    }[];
    subtotal: string;
    tax: string;
    total: string;
  }
}

// ============================================
// DEMONSTRATION
// ============================================

console.log("=== Anti-Corruption Layer Pattern ===\n");

// Setup legacy system with ugly data
const legacyApi = new LegacyOrderSystem.LegacyOrderApi();

legacyApi.insertCustomer({
  cust_no: "C001",
  nm_first: "Alice",
  nm_last: "Johnson",
  email_addr: "alice@example.com",
  ph_no: "555-123-4567",
  tier_cd: "G",
  create_dt: "20230115",
});

legacyApi.insertOrder({
  ord_id: "ORD-2024-001",
  cust_no: "C001",
  ord_dt: "20240315",
  stat_cd: 3, // Shipped
  ship_addr1: "123 Main Street",
  ship_addr2: "Apt 4B",
  ship_city: "San Francisco",
  ship_st: "CA",
  ship_zip: "94105",
  ship_ctry: "USA",
  tot_amt: 224800, // $2248.00 in cents
  tax_amt: 19108, // $191.08 in cents
  items: [
    { line_no: 1, prod_cd: "MBP-14", prod_nm: "MacBook Pro 14", qty: 1, unit_prc: 199900, disc_pct: 10 },
    { line_no: 2, prod_cd: "MM-01", prod_nm: "Magic Mouse", qty: 2, unit_prc: 9900, disc_pct: 0 },
    { line_no: 3, prod_cd: "KB-01", prod_nm: "Magic Keyboard", qty: 1, unit_prc: 14900, disc_pct: 5 },
  ],
});

console.log("--- Legacy Data (before ACL) ---");
const rawOrder = legacyApi.fetchOrder("ORD-2024-001");
console.log("Legacy order record:");
console.log(`  ord_id: ${rawOrder?.ord_id}`);
console.log(`  stat_cd: ${rawOrder?.stat_cd} (magic number)`);
console.log(`  tot_amt: ${rawOrder?.tot_amt} (cents)`);
console.log(`  ord_dt: ${rawOrder?.ord_dt} (YYYYMMDD string)`);

// Use ACL to get clean domain objects
console.log("\n--- Domain Objects (after ACL) ---");

const orderFacade = new AntiCorruptionLayer.LegacyOrderFacade(legacyApi);
const orderService = new Application.OrderService(orderFacade);

(async () => {
  const details = await orderService.getOrderDetails("ORD-2024-001");

  if (details) {
    console.log("\nOrder Details (clean domain):");
    console.log(`  Order: ${details.orderId}`);
    console.log(`  Status: ${details.status} (meaningful enum)`);
    console.log(`  Customer: ${details.customerName} (${details.customerTier})`);
    console.log(`  Placed: ${details.placedAt.toDateString()}`);
    console.log(`\n  Shipping Address:`);
    console.log(`    ${details.shippingAddress.replace(/\n/g, "\n    ")}`);
    console.log(`\n  Items:`);
    for (const item of details.items) {
      const discountInfo = item.discount ? ` (-${item.discount})` : "";
      console.log(`    - ${item.product} x${item.quantity}: ${item.price}${discountInfo} = ${item.subtotal}`);
    }
    console.log(`\n  Subtotal: ${details.subtotal}`);
    console.log(`  Tax: ${details.tax}`);
    console.log(`  Total: ${details.total}`);
  }

  console.log("\n--- ACL Benefits ---");
  console.log("• Legacy naming (ord_id, stat_cd) → Domain naming (orderId, status)");
  console.log("• Magic numbers (stat_cd: 3) → Meaningful enums (status: 'shipped')");
  console.log("• Cents → Money value objects");
  console.log("• String dates → Date objects");
  console.log("• Flat address → Address value object");
  console.log("• Application layer only sees clean domain objects");
})();

export { LegacyOrderSystem, OrderDomain, AntiCorruptionLayer, Application };
