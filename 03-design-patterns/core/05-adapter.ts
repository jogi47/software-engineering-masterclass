/**
 * Adapter Pattern
 * Category: Structural
 *
 * Definition:
 * The Adapter pattern converts the interface of a class into another interface
 * that clients expect. It lets classes work together that couldn't otherwise
 * because of incompatible interfaces.
 *
 * When to use:
 * - When you want to use an existing class, but its interface doesn't match
 * - When you need to create a reusable class that cooperates with unrelated classes
 * - When you need to use several existing subclasses, but adapting each is impractical
 *
 * Key Benefits:
 * - Allows classes with incompatible interfaces to collaborate
 * - Introduces new adapters without breaking existing client code
 * - Single Responsibility: separates interface conversion from business logic
 *
 * Types of Adapters:
 * - Object Adapter: Uses composition (adapter contains adaptee)
 * - Class Adapter: Uses inheritance (adapter extends adaptee) - not shown here as
 *   TypeScript doesn't support multiple inheritance
 */

// ============================================================================
// TARGET INTERFACE - What the client expects
// ============================================================================

/**
 * Target interface that the client code uses.
 * This represents the interface the client expects to work with.
 */
interface PaymentProcessor {
  pay(amount: number): boolean;
  refund(transactionId: string, amount: number): boolean;
  getBalance(): number;
}

// ============================================================================
// ADAPTEE - Existing classes with incompatible interfaces
// ============================================================================

/**
 * LegacyPayPal - An old PayPal integration with different method names.
 * This represents third-party or legacy code we can't modify.
 */
class LegacyPayPal {
  private balance: number = 1000;
  private transactions: Map<string, number> = new Map();

  // Different method name: makePayment instead of pay
  makePayment(amountInCents: number): { success: boolean; txnId: string } {
    // Notice: uses cents, not dollars!
    if (amountInCents > this.balance * 100) {
      console.log("[PayPal] Insufficient funds");
      return { success: false, txnId: "" };
    }

    const txnId = `PP-${Date.now()}`;
    this.balance -= amountInCents / 100;
    this.transactions.set(txnId, amountInCents / 100);
    console.log(
      `[PayPal] Payment of $${amountInCents / 100} successful. TXN: ${txnId}`
    );
    return { success: true, txnId };
  }

  // Different method name and signature
  processRefund(txnId: string): boolean {
    const amount = this.transactions.get(txnId);
    if (!amount) {
      console.log("[PayPal] Transaction not found");
      return false;
    }

    this.balance += amount;
    this.transactions.delete(txnId);
    console.log(`[PayPal] Refunded $${amount} for TXN: ${txnId}`);
    return true;
  }

  // Different method name
  checkBalance(): number {
    return this.balance;
  }
}

/**
 * CryptoWallet - Another payment system with completely different interface.
 * Works with cryptocurrency, has different concepts.
 */
class CryptoWallet {
  private walletAddress: string;
  private btcBalance: number = 0.5; // Balance in BTC
  private BTC_TO_USD: number = 50000; // Exchange rate
  private pendingTxns: Map<string, { btc: number }> = new Map();

  constructor(walletAddress: string) {
    this.walletAddress = walletAddress;
  }

  // Completely different: sends crypto, not dollars
  sendBitcoin(toBtcAddress: string, btcAmount: number): string | null {
    if (btcAmount > this.btcBalance) {
      console.log("[Crypto] Insufficient BTC balance");
      return null;
    }

    const txnHash = `0x${Math.random().toString(16).slice(2, 10)}`;
    this.btcBalance -= btcAmount;
    this.pendingTxns.set(txnHash, { btc: btcAmount });
    console.log(
      `[Crypto] Sent ${btcAmount} BTC. Hash: ${txnHash}`
    );
    return txnHash;
  }

  // Reverse a transaction
  reverseTransaction(txnHash: string): boolean {
    const txn = this.pendingTxns.get(txnHash);
    if (!txn) {
      console.log("[Crypto] Transaction hash not found");
      return false;
    }

    this.btcBalance += txn.btc;
    this.pendingTxns.delete(txnHash);
    console.log(`[Crypto] Reversed ${txn.btc} BTC`);
    return true;
  }

  // Returns balance in BTC
  getBtcBalance(): number {
    return this.btcBalance;
  }

  // Get USD equivalent
  getUsdValue(): number {
    return this.btcBalance * this.BTC_TO_USD;
  }
}

// ============================================================================
// ADAPTERS - Bridge the gap between Target and Adaptees
// ============================================================================

/**
 * PayPalAdapter - Adapts LegacyPayPal to PaymentProcessor interface.
 *
 * This is an OBJECT ADAPTER - it contains an instance of the adaptee
 * and delegates calls to it, translating as necessary.
 */
class PayPalAdapter implements PaymentProcessor {
  private paypal: LegacyPayPal;
  private lastTxnId: string = "";

  constructor(paypal: LegacyPayPal) {
    // Composition: adapter HAS-A adaptee
    this.paypal = paypal;
  }

  /**
   * Adapts the pay() call to PayPal's makePayment().
   * Converts dollars to cents (PayPal's expected format).
   */
  pay(amount: number): boolean {
    // Convert dollars to cents for PayPal
    const amountInCents = amount * 100;
    const result = this.paypal.makePayment(amountInCents);
    this.lastTxnId = result.txnId;
    return result.success;
  }

  /**
   * Adapts refund() to PayPal's processRefund().
   * Note: PayPal's refund ignores amount (refunds full transaction).
   */
  refund(transactionId: string, _amount: number): boolean {
    // PayPal's refund doesn't use amount - refunds full transaction
    return this.paypal.processRefund(transactionId);
  }

  /**
   * Adapts getBalance() to PayPal's checkBalance().
   */
  getBalance(): number {
    return this.paypal.checkBalance();
  }

  // Helper to get last transaction ID
  getLastTransactionId(): string {
    return this.lastTxnId;
  }
}

/**
 * CryptoAdapter - Adapts CryptoWallet to PaymentProcessor interface.
 *
 * This adapter does more heavy lifting:
 * - Converts USD to BTC
 * - Maps USD refund amount to crypto reversal
 * - Uses a merchant address for payments
 */
class CryptoAdapter implements PaymentProcessor {
  private wallet: CryptoWallet;
  private BTC_TO_USD: number = 50000;
  private merchantAddress: string = "merchant-btc-address-123";
  private lastTxnHash: string = "";

  constructor(wallet: CryptoWallet) {
    this.wallet = wallet;
  }

  /**
   * Converts USD amount to BTC and sends it.
   */
  pay(amount: number): boolean {
    // Convert USD to BTC
    const btcAmount = amount / this.BTC_TO_USD;
    const txnHash = this.wallet.sendBitcoin(this.merchantAddress, btcAmount);

    if (txnHash) {
      this.lastTxnHash = txnHash;
      console.log(`[Adapter] Converted $${amount} to ${btcAmount} BTC`);
      return true;
    }
    return false;
  }

  /**
   * Reverses a crypto transaction.
   * Amount parameter is ignored for crypto (full reversal).
   */
  refund(transactionId: string, _amount: number): boolean {
    return this.wallet.reverseTransaction(transactionId);
  }

  /**
   * Returns balance in USD (converts from BTC).
   */
  getBalance(): number {
    return this.wallet.getUsdValue();
  }

  // Helper
  getLastTransactionHash(): string {
    return this.lastTxnHash;
  }
}

// ============================================================================
// CLIENT CODE - Works with any PaymentProcessor
// ============================================================================

/**
 * ShoppingCart - Client that uses PaymentProcessor interface.
 * It doesn't know or care about the underlying payment system.
 */
class ShoppingCart {
  private items: Array<{ name: string; price: number }> = [];
  private processor: PaymentProcessor;

  constructor(processor: PaymentProcessor) {
    this.processor = processor;
  }

  addItem(name: string, price: number): void {
    this.items.push({ name, price });
    console.log(`Added ${name} ($${price}) to cart`);
  }

  getTotal(): number {
    return this.items.reduce((sum, item) => sum + item.price, 0);
  }

  checkout(): boolean {
    const total = this.getTotal();
    console.log(`\nChecking out. Total: $${total}`);
    console.log(`Current balance: $${this.processor.getBalance()}`);

    const success = this.processor.pay(total);
    if (success) {
      console.log("Checkout successful!");
      this.items = [];
    } else {
      console.log("Checkout failed!");
    }
    return success;
  }
}

// ============================================================================
// DATA FORMAT ADAPTER EXAMPLE
// ============================================================================

/**
 * XMLData - Represents data from an XML API.
 */
class XMLData {
  private xml: string;

  constructor(xml: string) {
    this.xml = xml;
  }

  getXML(): string {
    return this.xml;
  }
}

/**
 * JsonClient - A client that only works with JSON.
 */
interface JsonClient {
  processJson(json: object): void;
}

/**
 * XMLToJsonAdapter - Converts XML data to JSON format.
 * This is a common real-world use case for adapters.
 */
class XMLToJsonAdapter {
  /**
   * Simple XML to JSON conversion (simplified for demo).
   * In real code, you'd use a proper XML parser.
   */
  static convert(xmlData: XMLData): object {
    const xml = xmlData.getXML();
    console.log(`[Adapter] Converting XML to JSON...`);
    console.log(`  Input XML: ${xml}`);

    // Simplified parsing (real implementation would use XML parser)
    const result: Record<string, string> = {};

    // Extract simple key-value pairs from XML
    const regex = /<(\w+)>([^<]+)<\/\1>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      result[match[1]] = match[2];
    }

    console.log(`  Output JSON: ${JSON.stringify(result)}`);
    return result;
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=".repeat(60));
console.log("ADAPTER PATTERN DEMONSTRATION");
console.log("=".repeat(60));

// --- PayPal Adapter Demo ---
console.log("\n--- PayPal Adapter Demo ---\n");

// Create the legacy PayPal service
const legacyPayPal = new LegacyPayPal();

// Wrap it in an adapter
const paypalAdapter = new PayPalAdapter(legacyPayPal);

// Client uses the standard interface
const cart1 = new ShoppingCart(paypalAdapter);
cart1.addItem("Laptop", 999);
cart1.addItem("Mouse", 29);
cart1.checkout();

// Refund demonstration
console.log("\nProcessing refund...");
const txnId = paypalAdapter.getLastTransactionId();
paypalAdapter.refund(txnId, 0);
console.log(`Balance after refund: $${paypalAdapter.getBalance()}`);

// --- Crypto Adapter Demo ---
console.log("\n--- Crypto Adapter Demo ---\n");

// Create a crypto wallet
const cryptoWallet = new CryptoWallet("my-btc-address-456");

// Wrap it in an adapter
const cryptoAdapter = new CryptoAdapter(cryptoWallet);

// Same client interface works!
const cart2 = new ShoppingCart(cryptoAdapter);
cart2.addItem("NFT Artwork", 500);
cart2.checkout();

// --- XML to JSON Adapter Demo ---
console.log("\n--- XML to JSON Adapter Demo ---\n");

const xmlData = new XMLData(
  "<user><name>John Doe</name><email>john@example.com</email><age>30</age></user>"
);

const jsonData = XMLToJsonAdapter.convert(xmlData);
console.log("Converted data:", jsonData);

// --- Multiple Adapters, Same Interface ---
console.log("\n--- Polymorphic Usage Demo ---\n");

// Array of different payment processors (all through adapters)
const processors: PaymentProcessor[] = [
  new PayPalAdapter(new LegacyPayPal()),
  new CryptoAdapter(new CryptoWallet("wallet-789")),
];

processors.forEach((processor, index) => {
  console.log(`\nProcessor ${index + 1}:`);
  console.log(`  Balance: $${processor.getBalance()}`);
  console.log(`  Payment of $100: ${processor.pay(100) ? "Success" : "Failed"}`);
  console.log(`  New Balance: $${processor.getBalance()}`);
});

console.log("\n" + "=".repeat(60));
console.log("Adapter Pattern Demo Complete!");
console.log("=".repeat(60));
