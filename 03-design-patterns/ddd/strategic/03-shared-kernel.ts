/**
 * SHARED KERNEL
 *
 * A subset of the domain model that two or more teams agree to share.
 * This small shared part creates tight coupling but reduces duplication
 * and translation costs.
 *
 * Characteristics:
 * - Explicitly designated subset of model
 * - Agreed upon by all sharing teams
 * - Changes require coordination between teams
 * - Kept as small as possible
 * - Well-documented and versioned
 *
 * When to use:
 * - Core concepts used by multiple contexts
 * - When translation cost exceeds coupling cost
 * - Closely collaborating teams
 * - Stable, fundamental domain concepts
 *
 * Risks:
 * - Changes affect multiple teams
 * - Tight coupling between contexts
 * - Coordination overhead
 * - Potential for breakage
 *
 * Best practices:
 * - Keep it minimal
 * - Document thoroughly
 * - Version carefully
 * - Test extensively
 * - Have clear ownership
 */

// ============================================
// SHARED KERNEL
// Types shared between Order and Shipping contexts
// ============================================

namespace SharedKernel {
  /**
   * CustomerId - fundamental identity shared across contexts
   */
  export class CustomerId {
    private constructor(private readonly _value: string) {}

    static create(value: string): CustomerId {
      if (!value || value.trim().length === 0) {
        throw new Error("Customer ID cannot be empty");
      }
      return new CustomerId(value.trim());
    }

    get value(): string {
      return this._value;
    }

    equals(other: CustomerId): boolean {
      return this._value === other._value;
    }

    toString(): string {
      return this._value;
    }
  }

  /**
   * OrderId - used by both Order and Shipping contexts
   */
  export class OrderId {
    private constructor(private readonly _value: string) {}

    static create(value: string): OrderId {
      if (!value || value.trim().length === 0) {
        throw new Error("Order ID cannot be empty");
      }
      return new OrderId(value.trim());
    }

    static generate(): OrderId {
      return new OrderId(`ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    }

    get value(): string {
      return this._value;
    }

    equals(other: OrderId): boolean {
      return this._value === other._value;
    }

    toString(): string {
      return this._value;
    }
  }

  /**
   * Money - fundamental value object for monetary values
   */
  export class Money {
    private constructor(
      private readonly _amount: number,
      private readonly _currency: string
    ) {}

    static of(amount: number, currency: string = "USD"): Money {
      if (amount < 0) throw new Error("Amount cannot be negative");
      return new Money(Math.round(amount * 100) / 100, currency.toUpperCase());
    }

    static zero(currency: string = "USD"): Money {
      return new Money(0, currency.toUpperCase());
    }

    get amount(): number {
      return this._amount;
    }

    get currency(): string {
      return this._currency;
    }

    add(other: Money): Money {
      this.assertSameCurrency(other);
      return Money.of(this._amount + other._amount, this._currency);
    }

    subtract(other: Money): Money {
      this.assertSameCurrency(other);
      return Money.of(this._amount - other._amount, this._currency);
    }

    multiply(factor: number): Money {
      return Money.of(this._amount * factor, this._currency);
    }

    isZero(): boolean {
      return this._amount === 0;
    }

    private assertSameCurrency(other: Money): void {
      if (this._currency !== other._currency) {
        throw new Error(`Currency mismatch: ${this._currency} vs ${other._currency}`);
      }
    }

    equals(other: Money): boolean {
      return this._amount === other._amount && this._currency === other._currency;
    }

    toString(): string {
      return `${this._currency} ${this._amount.toFixed(2)}`;
    }
  }

  /**
   * Address - shared between Customer, Order, and Shipping contexts
   */
  export class Address {
    private constructor(
      private readonly _street: string,
      private readonly _city: string,
      private readonly _state: string,
      private readonly _zipCode: string,
      private readonly _country: string
    ) {}

    static create(street: string, city: string, state: string, zipCode: string, country: string): Address {
      if (!street.trim()) throw new Error("Street is required");
      if (!city.trim()) throw new Error("City is required");
      if (!zipCode.trim()) throw new Error("Zip code is required");
      if (!country.trim()) throw new Error("Country is required");

      return new Address(street.trim(), city.trim(), state.trim(), zipCode.trim().toUpperCase(), country.trim());
    }

    get street(): string {
      return this._street;
    }

    get city(): string {
      return this._city;
    }

    get state(): string {
      return this._state;
    }

    get zipCode(): string {
      return this._zipCode;
    }

    get country(): string {
      return this._country;
    }

    formatOneLine(): string {
      return `${this._street}, ${this._city}, ${this._state} ${this._zipCode}, ${this._country}`;
    }

    formatMultiLine(): string {
      return `${this._street}\n${this._city}, ${this._state} ${this._zipCode}\n${this._country}`;
    }

    equals(other: Address): boolean {
      return (
        this._street === other._street &&
        this._city === other._city &&
        this._state === other._state &&
        this._zipCode === other._zipCode &&
        this._country === other._country
      );
    }
  }

  /**
   * ContactInfo - shared between Customer and Shipping contexts
   */
  export class ContactInfo {
    private constructor(
      private readonly _name: string,
      private readonly _email: string,
      private readonly _phone: string
    ) {}

    static create(name: string, email: string, phone: string): ContactInfo {
      if (!name.trim()) throw new Error("Name is required");
      if (!email.includes("@")) throw new Error("Valid email is required");
      return new ContactInfo(name.trim(), email.toLowerCase().trim(), phone.trim());
    }

    get name(): string {
      return this._name;
    }

    get email(): string {
      return this._email;
    }

    get phone(): string {
      return this._phone;
    }
  }

  /**
   * DateRange - shared for validity periods, shipping windows
   */
  export class DateRange {
    private constructor(
      private readonly _start: Date,
      private readonly _end: Date
    ) {}

    static create(start: Date, end: Date): DateRange {
      if (start > end) throw new Error("Start must be before end");
      return new DateRange(new Date(start), new Date(end));
    }

    get start(): Date {
      return new Date(this._start);
    }

    get end(): Date {
      return new Date(this._end);
    }

    contains(date: Date): boolean {
      return date >= this._start && date <= this._end;
    }

    getDays(): number {
      return Math.ceil((this._end.getTime() - this._start.getTime()) / (1000 * 60 * 60 * 24));
    }
  }

  /**
   * Weight - shared for shipping calculations
   */
  export class Weight {
    private constructor(
      private readonly _value: number,
      private readonly _unit: "kg" | "lb"
    ) {}

    static kg(value: number): Weight {
      if (value < 0) throw new Error("Weight cannot be negative");
      return new Weight(value, "kg");
    }

    static lb(value: number): Weight {
      if (value < 0) throw new Error("Weight cannot be negative");
      return new Weight(value, "lb");
    }

    get value(): number {
      return this._value;
    }

    get unit(): string {
      return this._unit;
    }

    toKg(): Weight {
      if (this._unit === "kg") return this;
      return Weight.kg(this._value * 0.453592);
    }

    toLb(): Weight {
      if (this._unit === "lb") return this;
      return Weight.lb(this._value * 2.20462);
    }

    add(other: Weight): Weight {
      const thisKg = this.toKg();
      const otherKg = other.toKg();
      return Weight.kg(thisKg._value + otherKg._value);
    }
  }
}

// ============================================
// ORDER CONTEXT - Uses Shared Kernel
// ============================================

namespace OrderContext {
  // Using shared types directly
  import OrderId = SharedKernel.OrderId;
  import CustomerId = SharedKernel.CustomerId;
  import Money = SharedKernel.Money;
  import Address = SharedKernel.Address;
  import Weight = SharedKernel.Weight;

  export class OrderLine {
    constructor(
      readonly productId: string,
      readonly productName: string,
      readonly quantity: number,
      readonly unitPrice: Money,
      readonly weight: Weight
    ) {}

    get subtotal(): Money {
      return this.unitPrice.multiply(this.quantity);
    }

    get totalWeight(): Weight {
      return Weight.kg(this.weight.toKg().value * this.quantity);
    }
  }

  export class Order {
    private _lines: OrderLine[] = [];
    private _status: "draft" | "placed" | "shipped" = "draft";

    constructor(
      readonly orderId: OrderId, // Shared Kernel type
      readonly customerId: CustomerId, // Shared Kernel type
      private _shippingAddress: Address // Shared Kernel type
    ) {}

    get status(): string {
      return this._status;
    }

    get shippingAddress(): Address {
      return this._shippingAddress;
    }

    get lines(): readonly OrderLine[] {
      return [...this._lines];
    }

    get total(): Money {
      if (this._lines.length === 0) return Money.zero();
      return this._lines.reduce((sum, line) => sum.add(line.subtotal), Money.zero());
    }

    get totalWeight(): Weight {
      if (this._lines.length === 0) return Weight.kg(0);
      return this._lines.reduce((sum, line) => sum.add(line.totalWeight), Weight.kg(0));
    }

    addLine(line: OrderLine): void {
      this._lines.push(line);
    }

    place(): void {
      if (this._lines.length === 0) throw new Error("Cannot place empty order");
      this._status = "placed";
    }

    markShipped(): void {
      this._status = "shipped";
    }
  }

  // Service that prepares shipping request using shared types
  export class OrderService {
    prepareForShipping(order: Order): ShippingContext.ShipmentRequest {
      return new ShippingContext.ShipmentRequest(
        order.orderId, // Shared: OrderId
        order.customerId, // Shared: CustomerId
        order.shippingAddress, // Shared: Address
        order.totalWeight, // Shared: Weight
        order.total // Shared: Money (for insurance)
      );
    }
  }
}

// ============================================
// SHIPPING CONTEXT - Uses Same Shared Kernel
// ============================================

namespace ShippingContext {
  // Using same shared types - no translation needed
  import OrderId = SharedKernel.OrderId;
  import CustomerId = SharedKernel.CustomerId;
  import Address = SharedKernel.Address;
  import Weight = SharedKernel.Weight;
  import Money = SharedKernel.Money;
  import DateRange = SharedKernel.DateRange;

  export class ShipmentRequest {
    constructor(
      readonly orderId: OrderId, // Directly from shared kernel
      readonly customerId: CustomerId,
      readonly destination: Address,
      readonly weight: Weight,
      readonly declaredValue: Money
    ) {}
  }

  export class Shipment {
    private _status: "pending" | "in_transit" | "delivered" = "pending";
    private _trackingNumber?: string;

    constructor(
      readonly shipmentId: string,
      readonly orderId: OrderId, // Shared with Order context
      readonly destination: Address, // Shared Address
      readonly weight: Weight, // Shared Weight
      readonly estimatedDelivery: DateRange
    ) {}

    get status(): string {
      return this._status;
    }

    get trackingNumber(): string | undefined {
      return this._trackingNumber;
    }

    dispatch(trackingNumber: string): void {
      this._trackingNumber = trackingNumber;
      this._status = "in_transit";
    }

    deliver(): void {
      this._status = "delivered";
    }
  }

  export class ShippingService {
    private shipments = new Map<string, Shipment>();

    calculateShippingCost(request: ShipmentRequest): Money {
      const baseRate = Money.of(5.99);
      const weightKg = request.weight.toKg().value;
      const perKgRate = Money.of(1.5);
      const weightCost = perKgRate.multiply(weightKg);
      return baseRate.add(weightCost);
    }

    createShipment(request: ShipmentRequest): Shipment {
      const estimatedDays = this.calculateEstimatedDays(request.destination);
      const today = new Date();
      const deliveryDate = new Date(today);
      deliveryDate.setDate(today.getDate() + estimatedDays);

      const shipment = new Shipment(
        `SHIP-${Date.now()}`,
        request.orderId, // Using shared OrderId directly
        request.destination, // Using shared Address directly
        request.weight, // Using shared Weight directly
        DateRange.create(today, deliveryDate) // Using shared DateRange
      );

      this.shipments.set(shipment.shipmentId, shipment);
      return shipment;
    }

    findByOrderId(orderId: OrderId): Shipment | undefined {
      for (const shipment of this.shipments.values()) {
        if (shipment.orderId.equals(orderId)) {
          return shipment;
        }
      }
      return undefined;
    }

    private calculateEstimatedDays(address: Address): number {
      // Simplified: domestic = 3 days, international = 7 days
      return address.country.toUpperCase() === "USA" ? 3 : 7;
    }
  }
}

// ============================================
// CUSTOMER CONTEXT - Uses Shared Kernel
// ============================================

namespace CustomerContext {
  import CustomerId = SharedKernel.CustomerId;
  import Address = SharedKernel.Address;
  import ContactInfo = SharedKernel.ContactInfo;

  export class Customer {
    private _addresses: Address[] = [];

    constructor(
      readonly customerId: CustomerId, // Shared
      private _contactInfo: ContactInfo, // Shared
      private _defaultAddress?: Address // Shared
    ) {
      if (_defaultAddress) {
        this._addresses.push(_defaultAddress);
      }
    }

    get contactInfo(): ContactInfo {
      return this._contactInfo;
    }

    get defaultAddress(): Address | undefined {
      return this._defaultAddress;
    }

    get addresses(): readonly Address[] {
      return [...this._addresses];
    }

    addAddress(address: Address): void {
      this._addresses.push(address);
      if (!this._defaultAddress) {
        this._defaultAddress = address;
      }
    }

    setDefaultAddress(address: Address): void {
      if (!this._addresses.some((a) => a.equals(address))) {
        this._addresses.push(address);
      }
      this._defaultAddress = address;
    }
  }
}

// Usage
console.log("=== Shared Kernel Pattern ===\n");

// Create shared kernel types
const customerId = SharedKernel.CustomerId.create("cust-001");
const orderId = SharedKernel.OrderId.generate();
const shippingAddress = SharedKernel.Address.create("123 Main St", "San Francisco", "CA", "94105", "USA");

console.log("--- Shared Types ---");
console.log(`CustomerId: ${customerId}`);
console.log(`OrderId: ${orderId}`);
console.log(`Address: ${shippingAddress.formatOneLine()}`);

// Order Context uses shared kernel
console.log("\n--- Order Context ---");
const order = new OrderContext.Order(orderId, customerId, shippingAddress);
order.addLine(
  new OrderContext.OrderLine(
    "prod-001",
    "MacBook Pro",
    1,
    SharedKernel.Money.of(1999),
    SharedKernel.Weight.kg(2.1)
  )
);
order.addLine(
  new OrderContext.OrderLine(
    "prod-002",
    "Magic Mouse",
    2,
    SharedKernel.Money.of(99),
    SharedKernel.Weight.kg(0.1)
  )
);
order.place();

console.log(`Order: ${order.orderId}`);
console.log(`Total: ${order.total}`);
console.log(`Weight: ${order.totalWeight.value}kg`);

// Prepare shipping request - uses same shared types
const orderService = new OrderContext.OrderService();
const shipmentRequest = orderService.prepareForShipping(order);

// Shipping Context uses same shared kernel - no translation!
console.log("\n--- Shipping Context ---");
const shippingService = new ShippingContext.ShippingService();

const shippingCost = shippingService.calculateShippingCost(shipmentRequest);
console.log(`Shipping cost: ${shippingCost}`);

const shipment = shippingService.createShipment(shipmentRequest);
console.log(`Shipment: ${shipment.shipmentId}`);
console.log(`Destination: ${shipment.destination.city}, ${shipment.destination.state}`);
console.log(`Estimated delivery: ${shipment.estimatedDelivery.getDays()} days`);

// Find shipment by order ID - shared type works across contexts
const found = shippingService.findByOrderId(order.orderId);
console.log(`\nFound shipment for order ${order.orderId}: ${found ? "Yes" : "No"}`);

// Customer context also uses shared kernel
console.log("\n--- Customer Context ---");
const contactInfo = SharedKernel.ContactInfo.create("Alice Johnson", "alice@example.com", "555-123-4567");
const customer = new CustomerContext.Customer(customerId, contactInfo, shippingAddress);

console.log(`Customer: ${customer.contactInfo.name}`);
console.log(`Default address: ${customer.defaultAddress?.city}`);

console.log("\n--- Shared Kernel Benefits ---");
console.log("• No translation needed between Order and Shipping contexts");
console.log("• OrderId, CustomerId, Address, Money, Weight work everywhere");
console.log("• Single source of truth for core domain concepts");
console.log("• Changes to shared types are coordinated across teams");

export { SharedKernel, OrderContext, ShippingContext, CustomerContext };
