/**
 * DOMAIN SERVICE
 *
 * A stateless operation that belongs to the domain but doesn't naturally
 * fit within an Entity or Value Object. Domain Services express domain
 * concepts that are verbs rather than nouns.
 *
 * Characteristics:
 * - Stateless (no internal state to maintain)
 * - Operation is part of the Ubiquitous Language
 * - Operates on domain objects (Entities, Value Objects)
 * - Named after the activity it performs
 * - Defined in terms of domain model elements
 *
 * When to use:
 * - Operation involves multiple aggregates
 * - Operation doesn't belong to a single entity
 * - Significant domain operation that would distort entity behavior
 * - Complex business rules that span multiple objects
 *
 * Domain Service vs Application Service:
 * - Domain Service: Business logic, domain concepts
 * - Application Service: Orchestration, use cases, infrastructure
 *
 * Common examples:
 * - TransferService (money between accounts)
 * - PricingService (calculate prices with rules)
 * - AuthorizationService (check permissions)
 */

// Value Objects
class Money {
  constructor(
    private readonly _amount: number,
    private readonly _currency: string = "USD"
  ) {
    if (_amount < 0) throw new Error("Amount cannot be negative");
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._amount - other._amount, this._currency);
  }

  multiply(factor: number): Money {
    return new Money(Math.round(this._amount * factor * 100) / 100, this._currency);
  }

  percentage(percent: number): Money {
    return this.multiply(percent / 100);
  }

  isGreaterThan(other: Money): boolean {
    return this._amount > other._amount;
  }

  isLessThan(other: Money): boolean {
    return this._amount < other._amount;
  }

  private assertSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new Error(`Currency mismatch: ${this._currency} vs ${other._currency}`);
    }
  }

  toString(): string {
    return `${this._currency} ${this._amount.toFixed(2)}`;
  }
}

// Entities
class Account {
  private _balance: Money;
  private _isActive: boolean = true;

  constructor(
    private readonly _accountId: string,
    private readonly _ownerId: string,
    initialBalance: Money
  ) {
    this._balance = initialBalance;
  }

  get accountId(): string {
    return this._accountId;
  }

  get ownerId(): string {
    return this._ownerId;
  }

  get balance(): Money {
    return this._balance;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  deposit(amount: Money): void {
    if (!this._isActive) throw new Error("Account is inactive");
    this._balance = this._balance.add(amount);
  }

  withdraw(amount: Money): void {
    if (!this._isActive) throw new Error("Account is inactive");
    if (this._balance.isLessThan(amount)) {
      throw new Error("Insufficient funds");
    }
    this._balance = this._balance.subtract(amount);
  }

  deactivate(): void {
    this._isActive = false;
  }
}

class Product {
  constructor(
    private readonly _productId: string,
    private readonly _name: string,
    private readonly _basePrice: Money,
    private readonly _category: string
  ) {}

  get productId(): string {
    return this._productId;
  }

  get name(): string {
    return this._name;
  }

  get basePrice(): Money {
    return this._basePrice;
  }

  get category(): string {
    return this._category;
  }
}

class Customer {
  constructor(
    private readonly _customerId: string,
    private readonly _name: string,
    private readonly _tier: "bronze" | "silver" | "gold" | "platinum"
  ) {}

  get customerId(): string {
    return this._customerId;
  }

  get name(): string {
    return this._name;
  }

  get tier(): string {
    return this._tier;
  }
}

// ============================================
// DOMAIN SERVICES
// ============================================

/**
 * DOMAIN SERVICE: FundsTransferService
 *
 * Handles transfer of money between accounts.
 * This operation spans two entities and doesn't belong to either.
 */
class FundsTransferService {
  // Stateless operation - all data comes from parameters
  transfer(source: Account, destination: Account, amount: Money): TransferResult {
    // Validate accounts
    if (!source.isActive) {
      return TransferResult.failed("Source account is inactive");
    }
    if (!destination.isActive) {
      return TransferResult.failed("Destination account is inactive");
    }

    // Check sufficient funds
    if (source.balance.isLessThan(amount)) {
      return TransferResult.failed("Insufficient funds");
    }

    // Perform transfer (would be in a transaction in real implementation)
    try {
      source.withdraw(amount);
      destination.deposit(amount);
      return TransferResult.successful(source.accountId, destination.accountId, amount);
    } catch (error) {
      return TransferResult.failed((error as Error).message);
    }
  }
}

// Result object for transfer operation
class TransferResult {
  private constructor(
    readonly success: boolean,
    readonly message: string,
    readonly sourceAccountId?: string,
    readonly destinationAccountId?: string,
    readonly amount?: Money
  ) {}

  static successful(sourceId: string, destId: string, amount: Money): TransferResult {
    return new TransferResult(
      true,
      `Transferred ${amount} from ${sourceId} to ${destId}`,
      sourceId,
      destId,
      amount
    );
  }

  static failed(reason: string): TransferResult {
    return new TransferResult(false, reason);
  }
}

/**
 * DOMAIN SERVICE: PricingService
 *
 * Calculates prices based on customer tier, promotions, and product rules.
 * Complex pricing logic that doesn't belong to Product or Customer alone.
 */
class PricingService {
  private readonly tierDiscounts: Map<string, number> = new Map([
    ["bronze", 0],
    ["silver", 5],
    ["gold", 10],
    ["platinum", 15],
  ]);

  private readonly categoryPromotions: Map<string, number> = new Map([
    ["electronics", 10],
    ["clothing", 20],
  ]);

  calculatePrice(product: Product, customer: Customer, quantity: number): PricingResult {
    const baseTotal = product.basePrice.multiply(quantity);

    // Apply tier discount
    const tierDiscount = this.tierDiscounts.get(customer.tier) || 0;
    const tierDiscountAmount = baseTotal.percentage(tierDiscount);

    // Apply category promotion
    const categoryDiscount = this.categoryPromotions.get(product.category) || 0;
    const categoryDiscountAmount = baseTotal.percentage(categoryDiscount);

    // Calculate final price
    const totalDiscount = tierDiscountAmount.add(categoryDiscountAmount);
    const finalPrice = baseTotal.subtract(totalDiscount);

    return new PricingResult(baseTotal, tierDiscount, categoryDiscount, totalDiscount, finalPrice);
  }

  // Calculate bulk pricing
  calculateBulkPrice(items: { product: Product; quantity: number }[], customer: Customer): Money {
    let total = new Money(0);

    for (const item of items) {
      const result = this.calculatePrice(item.product, customer, item.quantity);
      total = total.add(result.finalPrice);
    }

    return total;
  }
}

class PricingResult {
  constructor(
    readonly baseTotal: Money,
    readonly tierDiscountPercent: number,
    readonly categoryDiscountPercent: number,
    readonly totalDiscount: Money,
    readonly finalPrice: Money
  ) {}

  toString(): string {
    return [
      `Base: ${this.baseTotal}`,
      `Tier discount: ${this.tierDiscountPercent}%`,
      `Category discount: ${this.categoryDiscountPercent}%`,
      `Total discount: ${this.totalDiscount}`,
      `Final: ${this.finalPrice}`,
    ].join(" | ");
  }
}

/**
 * DOMAIN SERVICE: OrderFulfillmentService
 *
 * Determines if an order can be fulfilled based on inventory and shipping rules.
 */
interface InventoryChecker {
  getAvailableQuantity(productId: string): number;
}

interface ShippingRules {
  canShipTo(destination: string, productCategory: string): boolean;
  getEstimatedDays(destination: string): number;
}

class OrderFulfillmentService {
  constructor(
    private readonly inventory: InventoryChecker,
    private readonly shipping: ShippingRules
  ) {}

  canFulfill(
    items: { productId: string; category: string; quantity: number }[],
    destination: string
  ): FulfillmentResult {
    const issues: string[] = [];

    // Check inventory for each item
    for (const item of items) {
      const available = this.inventory.getAvailableQuantity(item.productId);
      if (available < item.quantity) {
        issues.push(`Insufficient stock for ${item.productId}: need ${item.quantity}, have ${available}`);
      }

      // Check shipping restrictions
      if (!this.shipping.canShipTo(destination, item.category)) {
        issues.push(`Cannot ship ${item.category} to ${destination}`);
      }
    }

    if (issues.length > 0) {
      return FulfillmentResult.cannotFulfill(issues);
    }

    const estimatedDays = this.shipping.getEstimatedDays(destination);
    return FulfillmentResult.canFulfill(estimatedDays);
  }
}

class FulfillmentResult {
  private constructor(
    readonly canBeFulfilled: boolean,
    readonly estimatedDeliveryDays: number | null,
    readonly issues: string[]
  ) {}

  static canFulfill(estimatedDays: number): FulfillmentResult {
    return new FulfillmentResult(true, estimatedDays, []);
  }

  static cannotFulfill(issues: string[]): FulfillmentResult {
    return new FulfillmentResult(false, null, issues);
  }
}

// Usage
console.log("=== Domain Service Pattern ===\n");

// Funds Transfer Service
console.log("--- Funds Transfer Service ---");
const transferService = new FundsTransferService();

const account1 = new Account("acc-001", "user-1", new Money(1000));
const account2 = new Account("acc-002", "user-2", new Money(500));

console.log(`Before: Account1=${account1.balance}, Account2=${account2.balance}`);

const result = transferService.transfer(account1, account2, new Money(300));
console.log(`Transfer: ${result.message}`);
console.log(`After: Account1=${account1.balance}, Account2=${account2.balance}`);

// Failed transfer
const failedResult = transferService.transfer(account1, account2, new Money(2000));
console.log(`Failed transfer: ${failedResult.message}`);

// Pricing Service
console.log("\n--- Pricing Service ---");
const pricingService = new PricingService();

const laptop = new Product("prod-1", "MacBook Pro", new Money(1999), "electronics");
const shirt = new Product("prod-2", "Premium T-Shirt", new Money(49.99), "clothing");

const bronzeCustomer = new Customer("cust-1", "John", "bronze");
const platinumCustomer = new Customer("cust-2", "Jane", "platinum");

console.log("Bronze customer buying laptop:");
const bronceResult = pricingService.calculatePrice(laptop, bronzeCustomer, 1);
console.log(`  ${bronceResult}`);

console.log("\nPlatinum customer buying laptop:");
const platinumResult = pricingService.calculatePrice(laptop, platinumCustomer, 1);
console.log(`  ${platinumResult}`);

console.log("\nPlatinum customer buying shirt:");
const shirtResult = pricingService.calculatePrice(shirt, platinumCustomer, 2);
console.log(`  ${shirtResult}`);

// Order Fulfillment Service
console.log("\n--- Order Fulfillment Service ---");

// Mock implementations
const mockInventory: InventoryChecker = {
  getAvailableQuantity: (productId: string) => {
    const inventory: Record<string, number> = { "prod-1": 10, "prod-2": 5, "prod-3": 0 };
    return inventory[productId] || 0;
  },
};

const mockShipping: ShippingRules = {
  canShipTo: (destination: string, category: string) => {
    if (destination === "restricted" && category === "electronics") return false;
    return true;
  },
  getEstimatedDays: (destination: string) => (destination === "international" ? 14 : 5),
};

const fulfillmentService = new OrderFulfillmentService(mockInventory, mockShipping);

const orderItems = [
  { productId: "prod-1", category: "electronics", quantity: 2 },
  { productId: "prod-2", category: "clothing", quantity: 3 },
];

const domestic = fulfillmentService.canFulfill(orderItems, "domestic");
console.log(`Domestic order: ${domestic.canBeFulfilled ? `Can fulfill in ${domestic.estimatedDeliveryDays} days` : "Cannot fulfill"}`);

const outOfStock = fulfillmentService.canFulfill([{ productId: "prod-3", category: "toys", quantity: 1 }], "domestic");
console.log(`Out of stock: ${outOfStock.canBeFulfilled ? "Can fulfill" : `Cannot fulfill - ${outOfStock.issues[0]}`}`);

export {};
