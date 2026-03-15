/**
 * SPECIFICATION
 *
 * A predicate that determines if an object satisfies some criteria.
 * Encapsulates business rules as first-class objects that can be
 * combined, reused, and tested independently.
 *
 * Characteristics:
 * - Encapsulates a boolean condition
 * - Can be combined with AND, OR, NOT
 * - Reusable across different contexts
 * - Business rules become explicit objects
 * - Can be used for querying, validation, or selection
 *
 * When to use:
 * - Complex selection criteria
 * - Business rules that need to be reused
 * - Query filtering logic
 * - Validation rules
 * - Policy definitions
 *
 * Benefits:
 * - Explicit business rules
 * - Composable conditions
 * - Easy to test
 * - DRY - rules defined once
 * - Clear, readable code
 *
 * Common uses:
 * - Repository queries
 * - Eligibility checks
 * - Validation
 * - Policy enforcement
 */

// ============================================
// SPECIFICATION INTERFACE & COMBINATORS
// ============================================

interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
  and(other: Specification<T>): Specification<T>;
  or(other: Specification<T>): Specification<T>;
  not(): Specification<T>;
}

abstract class CompositeSpecification<T> implements Specification<T> {
  abstract isSatisfiedBy(candidate: T): boolean;

  and(other: Specification<T>): Specification<T> {
    return new AndSpecification(this, other);
  }

  or(other: Specification<T>): Specification<T> {
    return new OrSpecification(this, other);
  }

  not(): Specification<T> {
    return new NotSpecification(this);
  }
}

class AndSpecification<T> extends CompositeSpecification<T> {
  constructor(
    private readonly _left: Specification<T>,
    private readonly _right: Specification<T>
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return this._left.isSatisfiedBy(candidate) && this._right.isSatisfiedBy(candidate);
  }
}

class OrSpecification<T> extends CompositeSpecification<T> {
  constructor(
    private readonly _left: Specification<T>,
    private readonly _right: Specification<T>
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return this._left.isSatisfiedBy(candidate) || this._right.isSatisfiedBy(candidate);
  }
}

class NotSpecification<T> extends CompositeSpecification<T> {
  constructor(private readonly _spec: Specification<T>) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return !this._spec.isSatisfiedBy(candidate);
  }
}

// ============================================
// DOMAIN MODEL
// ============================================

class Money {
  constructor(
    private readonly _amount: number,
    private readonly _currency: string = "USD"
  ) {}

  get amount(): number {
    return this._amount;
  }

  toString(): string {
    return `$${this._amount.toFixed(2)}`;
  }
}

interface Product {
  productId: string;
  name: string;
  price: Money;
  category: string;
  inStock: boolean;
  stockQuantity: number;
  rating: number;
  brand: string;
  isActive: boolean;
}

interface Customer {
  customerId: string;
  name: string;
  email: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  totalOrders: number;
  totalSpent: Money;
  accountAgeInDays: number;
  isVerified: boolean;
  isActive: boolean;
}

interface Order {
  orderId: string;
  customerId: string;
  total: Money;
  itemCount: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  placedAt: Date;
}

// ============================================
// PRODUCT SPECIFICATIONS
// ============================================

class ProductInStock extends CompositeSpecification<Product> {
  isSatisfiedBy(product: Product): boolean {
    return product.inStock && product.stockQuantity > 0;
  }
}

class ProductInCategory extends CompositeSpecification<Product> {
  constructor(private readonly _category: string) {
    super();
  }

  isSatisfiedBy(product: Product): boolean {
    return product.category.toLowerCase() === this._category.toLowerCase();
  }
}

class ProductPriceBetween extends CompositeSpecification<Product> {
  constructor(
    private readonly _minPrice: number,
    private readonly _maxPrice: number
  ) {
    super();
  }

  isSatisfiedBy(product: Product): boolean {
    return product.price.amount >= this._minPrice && product.price.amount <= this._maxPrice;
  }
}

class ProductMinRating extends CompositeSpecification<Product> {
  constructor(private readonly _minRating: number) {
    super();
  }

  isSatisfiedBy(product: Product): boolean {
    return product.rating >= this._minRating;
  }
}

class ProductByBrand extends CompositeSpecification<Product> {
  constructor(private readonly _brand: string) {
    super();
  }

  isSatisfiedBy(product: Product): boolean {
    return product.brand.toLowerCase() === this._brand.toLowerCase();
  }
}

class ProductIsActive extends CompositeSpecification<Product> {
  isSatisfiedBy(product: Product): boolean {
    return product.isActive;
  }
}

// ============================================
// CUSTOMER SPECIFICATIONS
// ============================================

class PremiumCustomer extends CompositeSpecification<Customer> {
  isSatisfiedBy(customer: Customer): boolean {
    return customer.tier === "gold" || customer.tier === "platinum";
  }
}

class CustomerWithMinimumOrders extends CompositeSpecification<Customer> {
  constructor(private readonly _minOrders: number) {
    super();
  }

  isSatisfiedBy(customer: Customer): boolean {
    return customer.totalOrders >= this._minOrders;
  }
}

class CustomerWithMinimumSpent extends CompositeSpecification<Customer> {
  constructor(private readonly _minSpent: number) {
    super();
  }

  isSatisfiedBy(customer: Customer): boolean {
    return customer.totalSpent.amount >= this._minSpent;
  }
}

class VerifiedCustomer extends CompositeSpecification<Customer> {
  isSatisfiedBy(customer: Customer): boolean {
    return customer.isVerified;
  }
}

class ActiveCustomer extends CompositeSpecification<Customer> {
  isSatisfiedBy(customer: Customer): boolean {
    return customer.isActive;
  }
}

class NewCustomer extends CompositeSpecification<Customer> {
  constructor(private readonly _maxAgeDays: number = 30) {
    super();
  }

  isSatisfiedBy(customer: Customer): boolean {
    return customer.accountAgeInDays <= this._maxAgeDays;
  }
}

class LoyalCustomer extends CompositeSpecification<Customer> {
  constructor(
    private readonly _minOrders: number = 10,
    private readonly _minSpent: number = 1000
  ) {
    super();
  }

  isSatisfiedBy(customer: Customer): boolean {
    return customer.totalOrders >= this._minOrders && customer.totalSpent.amount >= this._minSpent;
  }
}

// ============================================
// ORDER SPECIFICATIONS
// ============================================

class OrderOverAmount extends CompositeSpecification<Order> {
  constructor(private readonly _minAmount: number) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return order.total.amount >= this._minAmount;
  }
}

class OrderInStatus extends CompositeSpecification<Order> {
  constructor(private readonly _statuses: Order["status"][]) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return this._statuses.includes(order.status);
  }
}

class OrderPlacedAfter extends CompositeSpecification<Order> {
  constructor(private readonly _date: Date) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return order.placedAt >= this._date;
  }
}

// ============================================
// SPECIFICATION-BASED REPOSITORY
// ============================================

class ProductRepository {
  private products: Product[] = [];

  add(product: Product): void {
    this.products.push(product);
  }

  findAll(): Product[] {
    return [...this.products];
  }

  findSatisfying(spec: Specification<Product>): Product[] {
    return this.products.filter((p) => spec.isSatisfiedBy(p));
  }

  countSatisfying(spec: Specification<Product>): number {
    return this.findSatisfying(spec).length;
  }
}

class CustomerRepository {
  private customers: Customer[] = [];

  add(customer: Customer): void {
    this.customers.push(customer);
  }

  findAll(): Customer[] {
    return [...this.customers];
  }

  findSatisfying(spec: Specification<Customer>): Customer[] {
    return this.customers.filter((c) => spec.isSatisfiedBy(c));
  }
}

// ============================================
// ELIGIBILITY SERVICE USING SPECIFICATIONS
// ============================================

class PromotionEligibilityService {
  // Specifications for different promotions
  private readonly vipDiscountSpec = new PremiumCustomer().and(new VerifiedCustomer()).and(new ActiveCustomer());

  private readonly newCustomerPromoSpec = new NewCustomer(30).and(new ActiveCustomer());

  private readonly loyaltyRewardSpec = new LoyalCustomer(10, 1000).and(new ActiveCustomer());

  isEligibleForVipDiscount(customer: Customer): boolean {
    return this.vipDiscountSpec.isSatisfiedBy(customer);
  }

  isEligibleForNewCustomerPromo(customer: Customer): boolean {
    return this.newCustomerPromoSpec.isSatisfiedBy(customer);
  }

  isEligibleForLoyaltyReward(customer: Customer): boolean {
    return this.loyaltyRewardSpec.isSatisfiedBy(customer);
  }

  getEligiblePromotions(customer: Customer): string[] {
    const promotions: string[] = [];

    if (this.isEligibleForVipDiscount(customer)) {
      promotions.push("VIP 20% Discount");
    }
    if (this.isEligibleForNewCustomerPromo(customer)) {
      promotions.push("New Customer 15% Off");
    }
    if (this.isEligibleForLoyaltyReward(customer)) {
      promotions.push("Loyalty Reward Points 2x");
    }

    return promotions;
  }
}

// Usage
console.log("=== Specification Pattern ===\n");

// Create product repository with sample data
const productRepo = new ProductRepository();
productRepo.add({
  productId: "p1",
  name: "MacBook Pro",
  price: new Money(1999),
  category: "Electronics",
  inStock: true,
  stockQuantity: 10,
  rating: 4.8,
  brand: "Apple",
  isActive: true,
});
productRepo.add({
  productId: "p2",
  name: "iPhone 15",
  price: new Money(999),
  category: "Electronics",
  inStock: true,
  stockQuantity: 50,
  rating: 4.7,
  brand: "Apple",
  isActive: true,
});
productRepo.add({
  productId: "p3",
  name: "Samsung TV",
  price: new Money(799),
  category: "Electronics",
  inStock: false,
  stockQuantity: 0,
  rating: 4.5,
  brand: "Samsung",
  isActive: true,
});
productRepo.add({
  productId: "p4",
  name: "Running Shoes",
  price: new Money(129),
  category: "Sports",
  inStock: true,
  stockQuantity: 25,
  rating: 4.2,
  brand: "Nike",
  isActive: true,
});
productRepo.add({
  productId: "p5",
  name: "Yoga Mat",
  price: new Money(49),
  category: "Sports",
  inStock: true,
  stockQuantity: 100,
  rating: 4.0,
  brand: "Generic",
  isActive: false,
});

console.log("--- Product Specifications ---");

// Simple specifications
const inStock = new ProductInStock();
const electronics = new ProductInCategory("Electronics");
const highRated = new ProductMinRating(4.5);
const appleProducts = new ProductByBrand("Apple");
const active = new ProductIsActive();

console.log(`Products in stock: ${productRepo.countSatisfying(inStock)}`);
console.log(`Electronics: ${productRepo.countSatisfying(electronics)}`);
console.log(`High rated (4.5+): ${productRepo.countSatisfying(highRated)}`);

// Composed specifications
const availableElectronics = inStock.and(electronics).and(active);
console.log(`\nAvailable electronics:`);
productRepo.findSatisfying(availableElectronics).forEach((p) => {
  console.log(`  - ${p.name} (${p.price})`);
});

const appleInStock = appleProducts.and(inStock);
console.log(`\nApple products in stock:`);
productRepo.findSatisfying(appleInStock).forEach((p) => {
  console.log(`  - ${p.name}`);
});

const highRatedOrApple = highRated.or(appleProducts);
console.log(`\nHigh rated OR Apple:`);
productRepo.findSatisfying(highRatedOrApple.and(active)).forEach((p) => {
  console.log(`  - ${p.name} (Rating: ${p.rating})`);
});

// Not specification
const outOfStock = inStock.not();
console.log(`\nOut of stock: ${productRepo.countSatisfying(outOfStock)}`);

// Customer specifications
console.log("\n--- Customer Eligibility ---");

const customers: Customer[] = [
  {
    customerId: "c1",
    name: "Alice",
    email: "alice@example.com",
    tier: "platinum",
    totalOrders: 50,
    totalSpent: new Money(5000),
    accountAgeInDays: 365,
    isVerified: true,
    isActive: true,
  },
  {
    customerId: "c2",
    name: "Bob",
    email: "bob@example.com",
    tier: "bronze",
    totalOrders: 2,
    totalSpent: new Money(150),
    accountAgeInDays: 15,
    isVerified: true,
    isActive: true,
  },
  {
    customerId: "c3",
    name: "Carol",
    email: "carol@example.com",
    tier: "gold",
    totalOrders: 15,
    totalSpent: new Money(1500),
    accountAgeInDays: 200,
    isVerified: false,
    isActive: true,
  },
];

const eligibilityService = new PromotionEligibilityService();

customers.forEach((customer) => {
  console.log(`\n${customer.name} (${customer.tier}):`);
  const promotions = eligibilityService.getEligiblePromotions(customer);
  if (promotions.length > 0) {
    promotions.forEach((p) => console.log(`  ✓ ${p}`));
  } else {
    console.log("  (No promotions available)");
  }
});

// Complex business rule as specification
console.log("\n--- Complex Business Rules ---");

// "Premium, verified customers with at least $1000 spent who are NOT new"
const premiumLongTermCustomer = new PremiumCustomer()
  .and(new VerifiedCustomer())
  .and(new CustomerWithMinimumSpent(1000))
  .and(new NewCustomer(30).not());

const customerRepo = new CustomerRepository();
customers.forEach((c) => customerRepo.add(c));

const eligibleForExclusiveOffer = customerRepo.findSatisfying(premiumLongTermCustomer);
console.log("Eligible for exclusive offer:");
eligibleForExclusiveOffer.forEach((c) => console.log(`  - ${c.name}`));

export {};
