/**
 * REPLACE DERIVED VARIABLE WITH QUERY
 *
 * Replace a variable that can be calculated from other values with a query method.
 *
 * Motivation:
 * - Mutable data can be updated inconsistently
 * - Derived values should be calculated, not stored
 * - A query ensures the value is always correct
 * - Reduces the risk of data getting out of sync
 *
 * Mechanics:
 * 1. Identify all points where the variable is updated
 * 2. Create a function that calculates the value
 * 3. Replace references to the variable with calls to the function
 * 4. Apply Remove Dead Code to the variable declaration and updates
 *
 * Note: Sometimes caching is needed for performance - that's a separate concern.
 */

// ============================================================================
// BEFORE: Derived value stored as a variable
// ============================================================================

class ProductionPlanBefore {
  private _production: number = 0;
  private _adjustments: number[] = [];

  get production(): number {
    return this._production;
  }

  applyAdjustment(adjustment: number): void {
    this._adjustments.push(adjustment);
    this._production += adjustment; // Keeping derived value in sync manually
  }

  // Risk: _production could get out of sync with _adjustments
  clearAdjustments(): void {
    this._adjustments.length = 0;
    this._production = 0; // Easy to forget this!
  }
}

// ============================================================================
// AFTER: Derived value calculated on demand
// ============================================================================

class ProductionPlan {
  private _initialProduction: number;
  private _adjustments: number[] = [];

  constructor(initialProduction: number = 0) {
    this._initialProduction = initialProduction;
  }

  // Calculated from source data - always correct
  get production(): number {
    return (
      this._initialProduction +
      this._adjustments.reduce((sum, adj) => sum + adj, 0)
    );
  }

  get adjustmentCount(): number {
    return this._adjustments.length;
  }

  applyAdjustment(adjustment: number): void {
    this._adjustments.push(adjustment);
    // No need to update _production - it's calculated
  }

  clearAdjustments(): void {
    this._adjustments.length = 0;
    // No risk of forgetting to update derived value
  }
}

// ============================================================================
// EXAMPLE: Shopping cart
// ============================================================================

interface CartItem {
  name: string;
  price: number;
  quantity: number;
}

// BEFORE: Stored totals
class ShoppingCartBefore {
  private _items: CartItem[] = [];
  private _subtotal: number = 0; // Stored derived value
  private _itemCount: number = 0; // Stored derived value

  addItem(item: CartItem): void {
    this._items.push(item);
    this._subtotal += item.price * item.quantity;
    this._itemCount += item.quantity;
  }

  removeItem(index: number): void {
    const item = this._items[index];
    this._subtotal -= item.price * item.quantity;
    this._itemCount -= item.quantity;
    this._items.splice(index, 1);
  }

  updateQuantity(index: number, newQuantity: number): void {
    const item = this._items[index];
    const oldTotal = item.price * item.quantity;
    this._subtotal -= oldTotal;
    this._itemCount -= item.quantity;

    item.quantity = newQuantity;

    this._subtotal += item.price * newQuantity;
    this._itemCount += newQuantity;
  }

  get subtotal(): number {
    return this._subtotal;
  }

  get itemCount(): number {
    return this._itemCount;
  }
}

// AFTER: Calculated values
class ShoppingCart {
  private _items: CartItem[] = [];

  addItem(item: CartItem): void {
    this._items.push({ ...item });
  }

  removeItem(index: number): void {
    this._items.splice(index, 1);
  }

  updateQuantity(index: number, newQuantity: number): void {
    if (this._items[index]) {
      this._items[index].quantity = newQuantity;
    }
  }

  // Calculated on demand
  get subtotal(): number {
    return this._items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  get itemCount(): number {
    return this._items.reduce((count, item) => count + item.quantity, 0);
  }

  get items(): readonly CartItem[] {
    return this._items.map((item) => ({ ...item }));
  }

  // Other derived values
  get averageItemPrice(): number {
    return this.itemCount > 0 ? this.subtotal / this.itemCount : 0;
  }

  get isEmpty(): boolean {
    return this._items.length === 0;
  }
}

// ============================================================================
// EXAMPLE: Account balance
// ============================================================================

interface Transaction {
  amount: number;
  type: "credit" | "debit";
  date: Date;
}

// BEFORE: Balance stored and updated
class AccountBefore {
  private _balance: number;
  private _transactions: Transaction[] = [];

  constructor(initialBalance: number) {
    this._balance = initialBalance;
  }

  deposit(amount: number): void {
    this._transactions.push({ amount, type: "credit", date: new Date() });
    this._balance += amount; // Manual update
  }

  withdraw(amount: number): void {
    this._transactions.push({ amount, type: "debit", date: new Date() });
    this._balance -= amount; // Manual update
  }

  get balance(): number {
    return this._balance;
  }
}

// AFTER: Balance calculated from transactions
class Account {
  private readonly _initialBalance: number;
  private _transactions: Transaction[] = [];

  constructor(initialBalance: number) {
    this._initialBalance = initialBalance;
  }

  deposit(amount: number): void {
    this._transactions.push({ amount, type: "credit", date: new Date() });
  }

  withdraw(amount: number): void {
    if (amount > this.balance) {
      throw new Error("Insufficient funds");
    }
    this._transactions.push({ amount, type: "debit", date: new Date() });
  }

  // Calculated from transaction history
  get balance(): number {
    return this._transactions.reduce((balance, tx) => {
      return tx.type === "credit" ? balance + tx.amount : balance - tx.amount;
    }, this._initialBalance);
  }

  // Other useful derived values
  get totalCredits(): number {
    return this._transactions
      .filter((tx) => tx.type === "credit")
      .reduce((sum, tx) => sum + tx.amount, 0);
  }

  get totalDebits(): number {
    return this._transactions
      .filter((tx) => tx.type === "debit")
      .reduce((sum, tx) => sum + tx.amount, 0);
  }

  get transactionCount(): number {
    return this._transactions.length;
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Replace Derived Variable with Query ===\n");

console.log("--- Production Plan ---");
const plan = new ProductionPlan(100);
console.log(`Initial production: ${plan.production}`);

plan.applyAdjustment(10);
plan.applyAdjustment(-5);
plan.applyAdjustment(20);

console.log(`After adjustments: ${plan.production}`);
console.log(`Adjustment count: ${plan.adjustmentCount}`);

plan.clearAdjustments();
console.log(`After clear: ${plan.production}`);

console.log("\n--- Shopping Cart ---");
const cart = new ShoppingCart();
cart.addItem({ name: "Widget", price: 25, quantity: 2 });
cart.addItem({ name: "Gadget", price: 15, quantity: 3 });

console.log(`Items: ${cart.itemCount}`);
console.log(`Subtotal: $${cart.subtotal}`);
console.log(`Average price: $${cart.averageItemPrice.toFixed(2)}`);

cart.updateQuantity(0, 4);
console.log(`After update - Items: ${cart.itemCount}, Subtotal: $${cart.subtotal}`);

console.log("\n--- Bank Account ---");
const account = new Account(1000);
account.deposit(500);
account.deposit(250);
account.withdraw(100);

console.log(`Balance: $${account.balance}`);
console.log(`Total credits: $${account.totalCredits}`);
console.log(`Total debits: $${account.totalDebits}`);
console.log(`Transactions: ${account.transactionCount}`);

export {};
