/**
 * DOMAIN MODEL
 *
 * An object model of the domain that incorporates both behavior and data.
 * Objects represent real business entities with their own rules and logic.
 *
 * Characteristics:
 * - Rich objects with behavior, not just data holders
 * - Business rules live in the domain objects
 * - Objects can reference and interact with each other
 * - Requires more upfront design but handles complexity well
 */

// Value Object for Money (see base patterns)
class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: string = "USD"
  ) {}

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error("Cannot add different currencies");
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error("Cannot subtract different currencies");
    }
    return new Money(this.amount - other.amount, this.currency);
  }

  isGreaterThan(other: Money): boolean {
    return this.amount > other.amount;
  }
}

// Domain Entity with behavior
class Account {
  private _balance: Money;
  private _transactions: Transaction[] = [];

  constructor(
    public readonly id: string,
    public readonly ownerName: string,
    initialBalance: Money
  ) {
    this._balance = initialBalance;
  }

  get balance(): Money {
    return this._balance;
  }

  get transactions(): readonly Transaction[] {
    return this._transactions;
  }

  deposit(amount: Money): void {
    if (amount.amount <= 0) {
      throw new Error("Deposit amount must be positive");
    }
    this._balance = this._balance.add(amount);
    this._transactions.push(new Transaction("DEPOSIT", amount, new Date()));
  }

  withdraw(amount: Money): void {
    if (amount.amount <= 0) {
      throw new Error("Withdrawal amount must be positive");
    }
    if (!this.canWithdraw(amount)) {
      throw new Error("Insufficient funds");
    }
    this._balance = this._balance.subtract(amount);
    this._transactions.push(new Transaction("WITHDRAWAL", amount, new Date()));
  }

  canWithdraw(amount: Money): boolean {
    return this._balance.isGreaterThan(amount) || this._balance.amount === amount.amount;
  }

  transferTo(targetAccount: Account, amount: Money): void {
    this.withdraw(amount);
    targetAccount.deposit(amount);
  }
}

// Another Domain Entity
class Transaction {
  constructor(
    public readonly type: "DEPOSIT" | "WITHDRAWAL",
    public readonly amount: Money,
    public readonly timestamp: Date
  ) {}
}

// Domain Service for operations spanning multiple entities
class TransferService {
  transfer(from: Account, to: Account, amount: Money): void {
    if (!from.canWithdraw(amount)) {
      throw new Error(`Account ${from.id} has insufficient funds`);
    }
    from.transferTo(to, amount);
    console.log(`Transferred ${amount.amount} ${amount.currency} from ${from.ownerName} to ${to.ownerName}`);
  }
}

// Usage
console.log("=== Domain Model Pattern ===\n");

const account1 = new Account("acc1", "Alice", new Money(1000));
const account2 = new Account("acc2", "Bob", new Money(500));

account1.deposit(new Money(200));
console.log(`Alice's balance: ${account1.balance.amount}`);

const transferService = new TransferService();
transferService.transfer(account1, account2, new Money(300));

console.log(`Alice's balance: ${account1.balance.amount}`);
console.log(`Bob's balance: ${account2.balance.amount}`);
console.log(`Alice's transactions: ${account1.transactions.length}`);

// Make this file a module to avoid global scope pollution
export {};
