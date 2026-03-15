/**
 * Strategy Pattern
 * Category: Behavioral
 *
 * Definition:
 * The Strategy pattern defines a family of algorithms, encapsulates each one,
 * and makes them interchangeable. Strategy lets the algorithm vary independently
 * from clients that use it.
 *
 * When to use:
 * - When you have many related classes that differ only in their behavior
 * - When you need different variants of an algorithm
 * - When an algorithm uses data that clients shouldn't know about
 * - When a class defines many behaviors via conditionals (if-else/switch)
 *
 * Key Benefits:
 * - Eliminates conditional statements for selecting behaviors
 * - Families of related algorithms become reusable
 * - Allows choosing algorithms at runtime
 * - Open/Closed Principle: add new strategies without changing context
 *
 * Structure:
 * - Strategy: Interface common to all supported algorithms
 * - ConcreteStrategy: Implements algorithm using Strategy interface
 * - Context: Maintains reference to Strategy; may define interface for clients
 */

// ============================================================================
// STRATEGY INTERFACE
// ============================================================================

/**
 * PaymentStrategy - Interface for all payment methods.
 * All payment strategies must implement this interface.
 */
interface PaymentStrategy {
  pay(amount: number): boolean;
  getName(): string;
  validate(): boolean;
}

// ============================================================================
// CONCRETE STRATEGIES - Different payment algorithms
// ============================================================================

/**
 * CreditCardStrategy - Handles credit card payments.
 */
class CreditCardStrategy implements PaymentStrategy {
  private cardNumber: string;
  private cvv: string;
  private expiryDate: string;
  private cardHolderName: string;

  constructor(
    cardNumber: string,
    cvv: string,
    expiryDate: string,
    cardHolderName: string
  ) {
    this.cardNumber = cardNumber;
    this.cvv = cvv;
    this.expiryDate = expiryDate;
    this.cardHolderName = cardHolderName;
  }

  validate(): boolean {
    // Simplified validation
    const isValidNumber = this.cardNumber.length === 16;
    const isValidCvv = this.cvv.length === 3;
    const isValidExpiry = /^\d{2}\/\d{2}$/.test(this.expiryDate);

    if (!isValidNumber || !isValidCvv || !isValidExpiry) {
      console.log("  [CreditCard] Validation failed!");
      return false;
    }

    console.log(
      `  [CreditCard] Card ending in ${this.cardNumber.slice(-4)} validated`
    );
    return true;
  }

  pay(amount: number): boolean {
    if (!this.validate()) {
      return false;
    }

    console.log(
      `  [CreditCard] Charging $${amount.toFixed(2)} to card ending in ${this.cardNumber.slice(-4)}`
    );
    console.log("  [CreditCard] Processing... Payment successful!");
    return true;
  }

  getName(): string {
    return `Credit Card (**** ${this.cardNumber.slice(-4)})`;
  }
}

/**
 * PayPalStrategy - Handles PayPal payments.
 */
class PayPalStrategy implements PaymentStrategy {
  private email: string;
  private password: string;
  private authenticated: boolean = false;

  constructor(email: string, password: string) {
    this.email = email;
    this.password = password;
  }

  validate(): boolean {
    // Simplified email validation
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email);
    const isValidPassword = this.password.length >= 8;

    if (!isValidEmail || !isValidPassword) {
      console.log("  [PayPal] Invalid credentials!");
      return false;
    }

    // Simulate authentication
    this.authenticated = true;
    console.log(`  [PayPal] Authenticated as ${this.email}`);
    return true;
  }

  pay(amount: number): boolean {
    if (!this.validate()) {
      return false;
    }

    console.log(`  [PayPal] Transferring $${amount.toFixed(2)}...`);
    console.log(`  [PayPal] Payment from ${this.email} successful!`);
    return true;
  }

  getName(): string {
    return `PayPal (${this.email})`;
  }
}

/**
 * CryptoStrategy - Handles cryptocurrency payments.
 */
class CryptoStrategy implements PaymentStrategy {
  private walletAddress: string;
  private currency: string;
  private exchangeRate: number;

  constructor(walletAddress: string, currency: string = "BTC") {
    this.walletAddress = walletAddress;
    this.currency = currency;
    // Simplified exchange rates
    this.exchangeRate = currency === "BTC" ? 50000 : currency === "ETH" ? 3000 : 1;
  }

  validate(): boolean {
    // Simplified wallet validation
    const isValidAddress = this.walletAddress.length >= 26;

    if (!isValidAddress) {
      console.log(`  [Crypto] Invalid ${this.currency} wallet address!`);
      return false;
    }

    console.log(`  [Crypto] Wallet ${this.walletAddress.slice(0, 10)}... validated`);
    return true;
  }

  pay(amount: number): boolean {
    if (!this.validate()) {
      return false;
    }

    const cryptoAmount = amount / this.exchangeRate;
    console.log(
      `  [Crypto] Converting $${amount.toFixed(2)} to ${cryptoAmount.toFixed(8)} ${this.currency}`
    );
    console.log(`  [Crypto] Sending to ${this.walletAddress.slice(0, 10)}...`);
    console.log("  [Crypto] Transaction confirmed on blockchain!");
    return true;
  }

  getName(): string {
    return `Crypto (${this.currency})`;
  }
}

/**
 * BankTransferStrategy - Handles direct bank transfers.
 */
class BankTransferStrategy implements PaymentStrategy {
  private accountNumber: string;
  private routingNumber: string;
  private bankName: string;

  constructor(accountNumber: string, routingNumber: string, bankName: string) {
    this.accountNumber = accountNumber;
    this.routingNumber = routingNumber;
    this.bankName = bankName;
  }

  validate(): boolean {
    const isValidAccount = this.accountNumber.length >= 8;
    const isValidRouting = this.routingNumber.length === 9;

    if (!isValidAccount || !isValidRouting) {
      console.log("  [Bank] Invalid bank account details!");
      return false;
    }

    console.log(`  [Bank] Account at ${this.bankName} validated`);
    return true;
  }

  pay(amount: number): boolean {
    if (!this.validate()) {
      return false;
    }

    console.log(`  [Bank] Initiating ACH transfer of $${amount.toFixed(2)}...`);
    console.log(`  [Bank] From ${this.bankName} account ending in ${this.accountNumber.slice(-4)}`);
    console.log("  [Bank] Transfer initiated! (2-3 business days)");
    return true;
  }

  getName(): string {
    return `Bank Transfer (${this.bankName})`;
  }
}

// ============================================================================
// CONTEXT - Uses the strategy
// ============================================================================

/**
 * ShoppingCart - The context that uses payment strategies.
 *
 * The cart doesn't care which payment method is used - it just
 * calls the strategy's pay() method. This allows payment methods
 * to be swapped at runtime.
 */
class ShoppingCartContext {
  private items: Array<{ name: string; price: number; quantity: number }> = [];
  private paymentStrategy: PaymentStrategy | null = null;
  private discount: number = 0;

  /**
   * Set the payment strategy (can be changed at runtime).
   */
  setPaymentStrategy(strategy: PaymentStrategy): void {
    this.paymentStrategy = strategy;
    console.log(`Payment method set to: ${strategy.getName()}`);
  }

  addItem(name: string, price: number, quantity: number = 1): void {
    this.items.push({ name, price, quantity });
    console.log(`Added: ${quantity}x ${name} @ $${price.toFixed(2)}`);
  }

  applyDiscount(percent: number): void {
    this.discount = percent;
    console.log(`Applied ${percent}% discount`);
  }

  getTotal(): number {
    const subtotal = this.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    return subtotal * (1 - this.discount / 100);
  }

  showCart(): void {
    console.log("\n--- Shopping Cart ---");
    this.items.forEach((item) => {
      console.log(`  ${item.quantity}x ${item.name}: $${(item.price * item.quantity).toFixed(2)}`);
    });
    if (this.discount > 0) {
      console.log(`  Discount: ${this.discount}%`);
    }
    console.log(`  Total: $${this.getTotal().toFixed(2)}`);
    console.log("--------------------\n");
  }

  /**
   * Checkout - delegates to the payment strategy.
   */
  checkout(): boolean {
    if (!this.paymentStrategy) {
      console.log("Error: No payment method selected!");
      return false;
    }

    if (this.items.length === 0) {
      console.log("Error: Cart is empty!");
      return false;
    }

    this.showCart();
    console.log(`Processing payment via ${this.paymentStrategy.getName()}...`);

    const success = this.paymentStrategy.pay(this.getTotal());

    if (success) {
      console.log("\nCheckout complete! Thank you for your purchase.");
      this.items = [];
      this.discount = 0;
    } else {
      console.log("\nCheckout failed. Please try a different payment method.");
    }

    return success;
  }
}

// ============================================================================
// ANOTHER EXAMPLE: SORTING STRATEGIES
// ============================================================================

/**
 * SortStrategy - Interface for sorting algorithms.
 */
interface SortStrategy {
  sort(data: number[]): number[];
  getName(): string;
}

/**
 * BubbleSortStrategy - O(n²) simple sorting.
 */
class BubbleSortStrategy implements SortStrategy {
  sort(data: number[]): number[] {
    const arr = [...data]; // Don't modify original
    const n = arr.length;

    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        if (arr[j] > arr[j + 1]) {
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        }
      }
    }

    return arr;
  }

  getName(): string {
    return "Bubble Sort";
  }
}

/**
 * QuickSortStrategy - O(n log n) efficient sorting.
 */
class QuickSortStrategy implements SortStrategy {
  sort(data: number[]): number[] {
    const arr = [...data];
    return this.quickSort(arr, 0, arr.length - 1);
  }

  private quickSort(arr: number[], low: number, high: number): number[] {
    if (low < high) {
      const pi = this.partition(arr, low, high);
      this.quickSort(arr, low, pi - 1);
      this.quickSort(arr, pi + 1, high);
    }
    return arr;
  }

  private partition(arr: number[], low: number, high: number): number {
    const pivot = arr[high];
    let i = low - 1;

    for (let j = low; j < high; j++) {
      if (arr[j] < pivot) {
        i++;
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }

    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
    return i + 1;
  }

  getName(): string {
    return "Quick Sort";
  }
}

/**
 * MergeSortStrategy - O(n log n) stable sorting.
 */
class MergeSortStrategy implements SortStrategy {
  sort(data: number[]): number[] {
    if (data.length <= 1) return [...data];

    const mid = Math.floor(data.length / 2);
    const left = this.sort(data.slice(0, mid));
    const right = this.sort(data.slice(mid));

    return this.merge(left, right);
  }

  private merge(left: number[], right: number[]): number[] {
    const result: number[] = [];
    let i = 0,
      j = 0;

    while (i < left.length && j < right.length) {
      if (left[i] <= right[j]) {
        result.push(left[i++]);
      } else {
        result.push(right[j++]);
      }
    }

    return result.concat(left.slice(i)).concat(right.slice(j));
  }

  getName(): string {
    return "Merge Sort";
  }
}

/**
 * Sorter - Context that uses sorting strategies.
 */
class Sorter {
  private strategy: SortStrategy;

  constructor(strategy: SortStrategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy: SortStrategy): void {
    this.strategy = strategy;
    console.log(`Sorting strategy changed to: ${strategy.getName()}`);
  }

  sort(data: number[]): number[] {
    console.log(`Sorting using ${this.strategy.getName()}...`);
    const start = performance.now();
    const result = this.strategy.sort(data);
    const end = performance.now();
    console.log(`Sorted in ${(end - start).toFixed(3)}ms`);
    return result;
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=".repeat(60));
console.log("STRATEGY PATTERN DEMONSTRATION");
console.log("=".repeat(60));

// --- Payment Strategy Demo ---
console.log("\n--- Payment Strategy Demo ---\n");

// Create the context
const cart = new ShoppingCartContext();

// Add items
cart.addItem("Laptop", 999.99, 1);
cart.addItem("Mouse", 29.99, 2);
cart.addItem("Keyboard", 79.99, 1);
cart.applyDiscount(10);

// Strategy 1: Credit Card
console.log("\n>>> Attempting checkout with Credit Card <<<\n");
const creditCard = new CreditCardStrategy(
  "4111111111111111",
  "123",
  "12/25",
  "John Doe"
);
cart.setPaymentStrategy(creditCard);
cart.checkout();

// Re-add items for next demo
cart.addItem("Headphones", 149.99, 1);
cart.addItem("USB Cable", 9.99, 3);

// Strategy 2: PayPal
console.log("\n>>> Attempting checkout with PayPal <<<\n");
const paypal = new PayPalStrategy("john.doe@email.com", "securepass123");
cart.setPaymentStrategy(paypal);
cart.checkout();

// Re-add items for next demo
cart.addItem("Monitor", 399.99, 1);

// Strategy 3: Crypto
console.log("\n>>> Attempting checkout with Cryptocurrency <<<\n");
const cryptoPayment = new CryptoStrategy("1A2b3C4d5E6f7G8h9I0jKlMnOpQrStUvWx", "BTC");
cart.setPaymentStrategy(cryptoPayment);
cart.checkout();

// Re-add items for next demo
cart.addItem("Webcam", 89.99, 1);

// Strategy 4: Bank Transfer
console.log("\n>>> Attempting checkout with Bank Transfer <<<\n");
const bankTransfer = new BankTransferStrategy("123456789012", "021000021", "Chase Bank");
cart.setPaymentStrategy(bankTransfer);
cart.checkout();

// --- Sorting Strategy Demo ---
console.log("\n--- Sorting Strategy Demo ---\n");

const data = [64, 34, 25, 12, 22, 11, 90, 45, 33, 78];
console.log(`Original data: [${data.join(", ")}]\n`);

const sorter = new Sorter(new BubbleSortStrategy());
console.log(`Bubble Sort result: [${sorter.sort(data).join(", ")}]\n`);

sorter.setStrategy(new QuickSortStrategy());
console.log(`Quick Sort result: [${sorter.sort(data).join(", ")}]\n`);

sorter.setStrategy(new MergeSortStrategy());
console.log(`Merge Sort result: [${sorter.sort(data).join(", ")}]`);

// --- Runtime Strategy Selection ---
console.log("\n--- Runtime Strategy Selection ---\n");

const strategies: SortStrategy[] = [
  new BubbleSortStrategy(),
  new QuickSortStrategy(),
  new MergeSortStrategy(),
];

const testData = [5, 2, 8, 1, 9, 3, 7, 4, 6];

strategies.forEach((strategy) => {
  sorter.setStrategy(strategy);
  const sorted = sorter.sort(testData);
  console.log(`  Result: [${sorted.join(", ")}]\n`);
});

console.log("=".repeat(60));
console.log("Strategy Pattern Demo Complete!");
console.log("=".repeat(60));
