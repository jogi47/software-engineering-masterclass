/**
 * ASSERTIONS
 *
 * State post-conditions and invariants that must be true after an operation
 * or at all times. Assertions make implicit rules explicit in the code
 * and help maintain the integrity of domain objects.
 *
 * Characteristics:
 * - Invariants: Conditions that must always be true
 * - Pre-conditions: What must be true before an operation
 * - Post-conditions: What will be true after an operation
 * - Express business rules explicitly
 * - Fail fast when violations occur
 *
 * When to use:
 * - Protecting domain invariants
 * - Validating state transitions
 * - Enforcing business rules
 * - Contract-style programming
 * - Self-documenting constraints
 *
 * Benefits:
 * - Makes assumptions explicit
 * - Catches bugs early
 * - Documents the code
 * - Prevents invalid states
 * - Easier debugging
 */

/**
 * Assertion helpers for domain validation
 */
class Assert {
  static notNull<T>(value: T | null | undefined, message: string): asserts value is T {
    if (value === null || value === undefined) {
      throw new Error(message);
    }
  }

  static notEmpty(value: string | null | undefined, message: string): asserts value is string {
    if (!value || value.trim().length === 0) {
      throw new Error(message);
    }
  }

  static positive(value: number, message: string): void {
    if (value <= 0) {
      throw new Error(message);
    }
  }

  static nonNegative(value: number, message: string): void {
    if (value < 0) {
      throw new Error(message);
    }
  }

  static inRange(value: number, min: number, max: number, message: string): void {
    if (value < min || value > max) {
      throw new Error(message);
    }
  }

  static isTrue(condition: boolean, message: string): asserts condition is true {
    if (!condition) {
      throw new Error(message);
    }
  }

  static state(condition: boolean, message: string): asserts condition is true {
    if (!condition) {
      throw new Error(`Invalid state: ${message}`);
    }
  }
}

// ============================================
// ENTITY WITH INVARIANTS
// ============================================

class Money {
  private constructor(
    private readonly _amount: number,
    private readonly _currency: string
  ) {}

  static of(amount: number, currency: string = "USD"): Money {
    // INVARIANT: Amount cannot be negative
    Assert.nonNegative(amount, "Money amount cannot be negative");
    // INVARIANT: Currency must be valid
    Assert.notEmpty(currency, "Currency code is required");

    return new Money(Math.round(amount * 100) / 100, currency);
  }

  static zero(currency: string = "USD"): Money {
    return new Money(0, currency);
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }

  add(other: Money): Money {
    // PRE-CONDITION: Same currency
    Assert.isTrue(this._currency === other._currency, `Cannot add different currencies: ${this._currency} and ${other._currency}`);
    return Money.of(this._amount + other._amount, this._currency);
  }

  subtract(other: Money): Money {
    Assert.isTrue(this._currency === other._currency, `Cannot subtract different currencies`);
    // POST-CONDITION enforced: Result cannot be negative (handled in of())
    return Money.of(this._amount - other._amount, this._currency);
  }

  multiply(factor: number): Money {
    return Money.of(this._amount * factor, this._currency);
  }

  toString(): string {
    return `${this._currency} ${this._amount.toFixed(2)}`;
  }
}

/**
 * Account with balance invariants
 */
class BankAccount {
  private _balance: Money;
  private _isActive: boolean = true;
  private _dailyWithdrawalTotal: Money;
  private static readonly DAILY_WITHDRAWAL_LIMIT = Money.of(5000);

  constructor(
    private readonly _accountId: string,
    private readonly _ownerId: string,
    initialBalance: Money,
    private readonly _minimumBalance: Money = Money.zero()
  ) {
    // INVARIANT: Account ID must be valid
    Assert.notEmpty(_accountId, "Account ID is required");
    Assert.notEmpty(_ownerId, "Owner ID is required");
    // INVARIANT: Initial balance must meet minimum
    Assert.isTrue(
      initialBalance.amount >= _minimumBalance.amount,
      `Initial balance must be at least ${_minimumBalance}`
    );

    this._balance = initialBalance;
    this._dailyWithdrawalTotal = Money.zero();

    // POST-CONDITION: Account invariants are satisfied
    this.assertInvariants();
  }

  get accountId(): string {
    return this._accountId;
  }

  get balance(): Money {
    return this._balance;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  deposit(amount: Money): void {
    // PRE-CONDITIONS
    Assert.state(this._isActive, "Cannot deposit to inactive account");
    Assert.positive(amount.amount, "Deposit amount must be positive");

    this._balance = this._balance.add(amount);

    // POST-CONDITION: Balance increased
    this.assertInvariants();
  }

  withdraw(amount: Money): void {
    // PRE-CONDITIONS
    Assert.state(this._isActive, "Cannot withdraw from inactive account");
    Assert.positive(amount.amount, "Withdrawal amount must be positive");
    Assert.isTrue(this.canWithdraw(amount), "Withdrawal would violate account constraints");

    this._balance = this._balance.subtract(amount);
    this._dailyWithdrawalTotal = this._dailyWithdrawalTotal.add(amount);

    // POST-CONDITION: Balance is still valid
    this.assertInvariants();
  }

  canWithdraw(amount: Money): boolean {
    // Check minimum balance constraint
    if (this._balance.amount - amount.amount < this._minimumBalance.amount) {
      return false;
    }
    // Check daily limit
    if (this._dailyWithdrawalTotal.amount + amount.amount > BankAccount.DAILY_WITHDRAWAL_LIMIT.amount) {
      return false;
    }
    return true;
  }

  close(): void {
    // PRE-CONDITION: Balance must be zero
    Assert.isTrue(this._balance.amount === 0, "Cannot close account with non-zero balance");

    this._isActive = false;
  }

  // INVARIANT CHECK: Called after every state change
  private assertInvariants(): void {
    Assert.isTrue(
      this._balance.amount >= this._minimumBalance.amount,
      `Balance ${this._balance} cannot be below minimum ${this._minimumBalance}`
    );
  }
}

/**
 * Order with lifecycle invariants
 */
type OrderStatus = "draft" | "placed" | "confirmed" | "shipped" | "delivered" | "cancelled";

class OrderLine {
  constructor(
    readonly productId: string,
    readonly productName: string,
    readonly quantity: number,
    readonly unitPrice: Money
  ) {
    // INVARIANTS
    Assert.notEmpty(productId, "Product ID is required");
    Assert.positive(quantity, "Quantity must be positive");
    Assert.positive(unitPrice.amount, "Unit price must be positive");
  }

  get subtotal(): Money {
    return this.unitPrice.multiply(this.quantity);
  }
}

class Order {
  private _lines: OrderLine[] = [];
  private _status: OrderStatus = "draft";
  private _placedAt?: Date;
  private _confirmedAt?: Date;
  private static readonly MAX_LINES = 100;
  private static readonly MAX_QUANTITY_PER_LINE = 999;

  constructor(
    private readonly _orderId: string,
    private readonly _customerId: string
  ) {
    // INVARIANTS
    Assert.notEmpty(_orderId, "Order ID is required");
    Assert.notEmpty(_customerId, "Customer ID is required");
  }

  get orderId(): string {
    return this._orderId;
  }

  get customerId(): string {
    return this._customerId;
  }

  get status(): OrderStatus {
    return this._status;
  }

  get lines(): readonly OrderLine[] {
    return [...this._lines];
  }

  get total(): Money {
    if (this._lines.length === 0) return Money.zero();
    return this._lines.reduce((sum, line) => sum.add(line.subtotal), Money.zero());
  }

  addLine(productId: string, productName: string, quantity: number, unitPrice: Money): void {
    // PRE-CONDITIONS (assertions as guards)
    this.assertModifiable();
    Assert.isTrue(this._lines.length < Order.MAX_LINES, `Cannot add more than ${Order.MAX_LINES} lines`);
    Assert.inRange(quantity, 1, Order.MAX_QUANTITY_PER_LINE, `Quantity must be between 1 and ${Order.MAX_QUANTITY_PER_LINE}`);

    this._lines.push(new OrderLine(productId, productName, quantity, unitPrice));

    // POST-CONDITION: Line was added
    Assert.isTrue(this._lines.some((l) => l.productId === productId), "Line should have been added");
  }

  removeLine(productId: string): void {
    this.assertModifiable();
    // PRE-CONDITION: Line exists
    Assert.isTrue(this._lines.some((l) => l.productId === productId), `Product ${productId} not in order`);

    const previousLength = this._lines.length;
    this._lines = this._lines.filter((l) => l.productId !== productId);

    // POST-CONDITION: Line was removed
    Assert.isTrue(this._lines.length === previousLength - 1, "Line should have been removed");
  }

  place(): void {
    // PRE-CONDITIONS
    this.assertModifiable();
    Assert.isTrue(this._lines.length > 0, "Cannot place empty order");

    this._status = "placed";
    this._placedAt = new Date();

    // POST-CONDITIONS
    Assert.state(this._status === "placed", "Order should be placed");
    Assert.notNull(this._placedAt, "Placed date should be set");
  }

  confirm(): void {
    // PRE-CONDITION: Must be placed
    Assert.state(this._status === "placed", "Order must be placed before confirmation");

    this._status = "confirmed";
    this._confirmedAt = new Date();

    // POST-CONDITIONS
    Assert.state(this._status === "confirmed", "Order should be confirmed");
    Assert.isTrue(this._confirmedAt! >= this._placedAt!, "Confirmed date should be after placed date");
  }

  ship(): void {
    Assert.state(this._status === "confirmed", "Order must be confirmed before shipping");
    this._status = "shipped";
  }

  deliver(): void {
    Assert.state(this._status === "shipped", "Order must be shipped before delivery");
    this._status = "delivered";
  }

  cancel(reason: string): void {
    Assert.notEmpty(reason, "Cancellation reason is required");
    Assert.state(this._status !== "delivered", "Cannot cancel delivered order");
    Assert.state(this._status !== "cancelled", "Order already cancelled");

    this._status = "cancelled";
  }

  private assertModifiable(): void {
    Assert.state(this._status === "draft", "Cannot modify order after it has been placed");
  }
}

/**
 * Aggregate with complex invariants
 */
class Wallet {
  private _balance: Money;
  private _transactions: Transaction[] = [];
  private _isLocked: boolean = false;
  private static readonly MAX_BALANCE = Money.of(100000);

  constructor(
    private readonly _walletId: string,
    private readonly _userId: string
  ) {
    Assert.notEmpty(_walletId, "Wallet ID is required");
    Assert.notEmpty(_userId, "User ID is required");
    this._balance = Money.zero();
  }

  get walletId(): string {
    return this._walletId;
  }

  get balance(): Money {
    return this._balance;
  }

  get isLocked(): boolean {
    return this._isLocked;
  }

  credit(amount: Money, description: string): void {
    // PRE-CONDITIONS
    Assert.state(!this._isLocked, "Wallet is locked");
    Assert.positive(amount.amount, "Credit amount must be positive");
    Assert.isTrue(
      this._balance.amount + amount.amount <= Wallet.MAX_BALANCE.amount,
      `Credit would exceed maximum balance of ${Wallet.MAX_BALANCE}`
    );

    const previousBalance = this._balance;
    this._balance = this._balance.add(amount);
    this._transactions.push(new Transaction("credit", amount, description, new Date()));

    // POST-CONDITIONS
    Assert.isTrue(
      this._balance.amount === previousBalance.amount + amount.amount,
      "Balance should have increased by credit amount"
    );
    this.assertInvariants();
  }

  debit(amount: Money, description: string): void {
    // PRE-CONDITIONS
    Assert.state(!this._isLocked, "Wallet is locked");
    Assert.positive(amount.amount, "Debit amount must be positive");
    Assert.isTrue(this._balance.amount >= amount.amount, "Insufficient balance");

    const previousBalance = this._balance;
    this._balance = this._balance.subtract(amount);
    this._transactions.push(new Transaction("debit", amount, description, new Date()));

    // POST-CONDITIONS
    Assert.isTrue(
      this._balance.amount === previousBalance.amount - amount.amount,
      "Balance should have decreased by debit amount"
    );
    this.assertInvariants();
  }

  lock(reason: string): void {
    Assert.notEmpty(reason, "Lock reason is required");
    this._isLocked = true;
  }

  unlock(): void {
    this._isLocked = false;
  }

  // INVARIANTS: Check after every state change
  private assertInvariants(): void {
    Assert.nonNegative(this._balance.amount, "Balance cannot be negative");
    Assert.isTrue(
      this._balance.amount <= Wallet.MAX_BALANCE.amount,
      `Balance cannot exceed ${Wallet.MAX_BALANCE}`
    );
  }
}

class Transaction {
  constructor(
    readonly type: "credit" | "debit",
    readonly amount: Money,
    readonly description: string,
    readonly timestamp: Date
  ) {
    Assert.notEmpty(description, "Transaction description is required");
    Assert.positive(amount.amount, "Transaction amount must be positive");
  }
}

// Usage
console.log("=== Assertions Pattern ===\n");

// Bank Account with invariants
console.log("--- Bank Account Invariants ---");
const account = new BankAccount("acc-001", "user-001", Money.of(1000), Money.of(100));
console.log(`Initial balance: ${account.balance}`);

account.deposit(Money.of(500));
console.log(`After deposit: ${account.balance}`);

account.withdraw(Money.of(200));
console.log(`After withdrawal: ${account.balance}`);

// Try to withdraw below minimum
console.log("\nAttempting to withdraw below minimum...");
try {
  account.withdraw(Money.of(1500)); // Would go below minimum
} catch (e) {
  console.log(`Assertion failed: ${(e as Error).message}`);
}

// Order with lifecycle assertions
console.log("\n--- Order Lifecycle Assertions ---");
const order = new Order("order-001", "cust-001");

order.addLine("prod-1", "Laptop", 1, Money.of(999));
order.addLine("prod-2", "Mouse", 2, Money.of(49));
console.log(`Order total: ${order.total}`);

order.place();
console.log(`Status after place: ${order.status}`);

// Try to modify after placing
console.log("\nAttempting to modify placed order...");
try {
  order.addLine("prod-3", "Keyboard", 1, Money.of(149));
} catch (e) {
  console.log(`Assertion failed: ${(e as Error).message}`);
}

order.confirm();
order.ship();
order.deliver();
console.log(`Final status: ${order.status}`);

// Wallet with transaction assertions
console.log("\n--- Wallet Assertions ---");
const wallet = new Wallet("wallet-001", "user-001");

wallet.credit(Money.of(500), "Initial deposit");
console.log(`Balance: ${wallet.balance}`);

wallet.debit(Money.of(150), "Purchase");
console.log(`After purchase: ${wallet.balance}`);

// Try to debit more than balance
console.log("\nAttempting to overdraw...");
try {
  wallet.debit(Money.of(1000), "Large purchase");
} catch (e) {
  console.log(`Assertion failed: ${(e as Error).message}`);
}

export {};
