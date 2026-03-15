/**
 * MOVE FIELD
 *
 * Move a field from one class to another where it belongs better.
 *
 * Motivation:
 * - A field is used more by another class than by its own class
 * - Fields that change together should be in the same class
 * - Data clumps suggest need for a shared structure
 * - Simplifies the interface between classes
 *
 * Mechanics:
 * 1. Ensure the field is encapsulated
 * 2. Create the field (and accessors) in the target
 * 3. Redirect the source accessors to use the target field
 * 4. Test
 * 5. Remove the source field
 */

// ============================================================================
// BEFORE: Field in wrong class
// ============================================================================

class CustomerBefore {
  private _name: string;
  private _discountRate: number; // This field is always used with Contract

  constructor(name: string, discountRate: number) {
    this._name = name;
    this._discountRate = discountRate;
  }

  get name(): string {
    return this._name;
  }

  get discountRate(): number {
    return this._discountRate;
  }

  set discountRate(value: number) {
    this._discountRate = value;
  }
}

class ContractBefore {
  private _startDate: Date;
  private _customer: CustomerBefore;

  constructor(customer: CustomerBefore, startDate: Date) {
    this._customer = customer;
    this._startDate = startDate;
  }

  get startDate(): Date {
    return this._startDate;
  }

  // Always needs to go through Customer for discount
  get discountRate(): number {
    return this._customer.discountRate;
  }
}

// ============================================================================
// AFTER: Field moved to where it's used
// ============================================================================

class Customer {
  private _name: string;
  private _contract: CustomerContract | null = null;

  constructor(name: string) {
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  get contract(): CustomerContract | null {
    return this._contract;
  }

  becomeCustomer(discountRate: number): void {
    this._contract = new CustomerContract(new Date(), discountRate);
  }

  // Convenient accessor delegates to contract
  get discountRate(): number {
    return this._contract?.discountRate ?? 0;
  }

  set discountRate(value: number) {
    if (!this._contract) {
      throw new Error("Customer has no contract");
    }
    this._contract.discountRate = value;
  }
}

class CustomerContract {
  private _startDate: Date;
  private _discountRate: number; // Moved here - belongs with contract

  constructor(startDate: Date, discountRate: number) {
    this._startDate = startDate;
    this._discountRate = discountRate;
  }

  get startDate(): Date {
    return this._startDate;
  }

  get discountRate(): number {
    return this._discountRate;
  }

  set discountRate(value: number) {
    if (value < 0 || value > 1) {
      throw new Error("Discount rate must be between 0 and 1");
    }
    this._discountRate = value;
  }

  // Contract-specific logic can now use the field
  get contractAge(): number {
    const now = new Date();
    return Math.floor(
      (now.getTime() - this._startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  get loyaltyBonus(): number {
    // After 365 days, add 1% to discount
    if (this.contractAge > 365) {
      return 0.01;
    }
    return 0;
  }

  get effectiveDiscountRate(): number {
    return Math.min(this._discountRate + this.loyaltyBonus, 0.5);
  }
}

// ============================================================================
// ANOTHER EXAMPLE: Account and AccountType
// ============================================================================

// BEFORE
class AccountTypeBefore {
  private _name: string;

  constructor(name: string) {
    this._name = name;
  }

  get name(): string {
    return this._name;
  }
}

class AccountBefore2 {
  private _interestRate: number; // Should be on AccountType
  private _type: AccountTypeBefore;

  constructor(type: AccountTypeBefore, interestRate: number) {
    this._type = type;
    this._interestRate = interestRate;
  }

  get interestRate(): number {
    return this._interestRate;
  }
}

// AFTER
class AccountType {
  private _name: string;
  private _interestRate: number; // Moved here - determined by type

  constructor(name: string, interestRate: number) {
    this._name = name;
    this._interestRate = interestRate;
  }

  get name(): string {
    return this._name;
  }

  get interestRate(): number {
    return this._interestRate;
  }

  // Now type-specific calculations can use the rate
  calculateInterest(balance: number, days: number): number {
    return balance * this._interestRate * (days / 365);
  }
}

class Account {
  private _type: AccountType;
  private _balance: number;

  constructor(type: AccountType, initialBalance: number = 0) {
    this._type = type;
    this._balance = initialBalance;
  }

  get type(): AccountType {
    return this._type;
  }

  get balance(): number {
    return this._balance;
  }

  // Delegates to type for interest rate
  get interestRate(): number {
    return this._type.interestRate;
  }

  accrue(days: number): number {
    const interest = this._type.calculateInterest(this._balance, days);
    this._balance += interest;
    return interest;
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Move Field Refactoring ===\n");

console.log("--- Before: discountRate on Customer ---");
const customerBefore = new CustomerBefore("Acme Corp", 0.1);
const contractBefore = new ContractBefore(customerBefore, new Date());
console.log(`Customer: ${customerBefore.name}`);
console.log(`Discount rate: ${contractBefore.discountRate * 100}%`);

console.log("\n--- After: discountRate on CustomerContract ---");
const customer = new Customer("Acme Corp");
customer.becomeCustomer(0.1);
console.log(`Customer: ${customer.name}`);
console.log(`Discount rate: ${customer.discountRate * 100}%`);

if (customer.contract) {
  console.log(`Contract age: ${customer.contract.contractAge} days`);
  console.log(`Loyalty bonus: ${customer.contract.loyaltyBonus * 100}%`);
  console.log(`Effective rate: ${customer.contract.effectiveDiscountRate * 100}%`);
}

console.log("\n--- Account Type Example ---");
const savingsType = new AccountType("Savings", 0.02);
const checkingType = new AccountType("Checking", 0.001);

const savings = new Account(savingsType, 10000);
const checking = new Account(checkingType, 5000);

console.log(`Savings balance: $${savings.balance}`);
console.log(`Savings rate: ${savings.interestRate * 100}%`);
const savingsInterest = savings.accrue(30);
console.log(`Interest (30 days): $${savingsInterest.toFixed(2)}`);
console.log(`New balance: $${savings.balance.toFixed(2)}`);

console.log(`\nChecking balance: $${checking.balance}`);
console.log(`Checking rate: ${checking.interestRate * 100}%`);
const checkingInterest = checking.accrue(30);
console.log(`Interest (30 days): $${checkingInterest.toFixed(2)}`);

export {};
