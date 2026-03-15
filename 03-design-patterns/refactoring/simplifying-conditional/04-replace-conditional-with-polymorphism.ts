/**
 * REPLACE CONDITIONAL WITH POLYMORPHISM
 *
 * Replace conditionals that select behavior based on type with polymorphism.
 *
 * Motivation:
 * - Conditionals based on type are a sign of missing polymorphism
 * - New types require changing all switch statements
 * - Polymorphism lets each type define its own behavior
 * - Makes adding new types easier (Open/Closed Principle)
 *
 * Mechanics:
 * 1. Create a superclass if not already present
 * 2. Create subclasses for each leg of the conditional
 * 3. Move the conditional logic into overriding methods
 * 4. Replace the conditional with calls to the polymorphic method
 */

// ============================================================================
// BEFORE: Type code with conditional behavior
// ============================================================================

type BirdTypeBefore = "EuropeanSwallow" | "AfricanSwallow" | "NorwegianBlueParrot";

function plumageSpeedBefore(bird: {
  type: BirdTypeBefore;
  numberOfCoconuts: number;
  voltage: number;
  isNailed: boolean;
}): { plumage: string; speed: number } {
  let plumage: string;
  let speed: number;

  switch (bird.type) {
    case "EuropeanSwallow":
      plumage = "average";
      speed = 35;
      break;
    case "AfricanSwallow":
      plumage = bird.numberOfCoconuts > 2 ? "tired" : "average";
      speed = 40 - 2 * bird.numberOfCoconuts;
      break;
    case "NorwegianBlueParrot":
      plumage = bird.voltage > 100 ? "scorched" : "beautiful";
      speed = bird.isNailed ? 0 : 10 + bird.voltage / 10;
      break;
    default:
      throw new Error(`Unknown bird type: ${bird.type}`);
  }

  return { plumage, speed };
}

// ============================================================================
// AFTER: Polymorphic classes
// ============================================================================

abstract class Bird {
  abstract get plumage(): string;
  abstract get speed(): number;
}

class EuropeanSwallow extends Bird {
  get plumage(): string {
    return "average";
  }

  get speed(): number {
    return 35;
  }
}

class AfricanSwallow extends Bird {
  constructor(private _numberOfCoconuts: number) {
    super();
  }

  get plumage(): string {
    return this._numberOfCoconuts > 2 ? "tired" : "average";
  }

  get speed(): number {
    return 40 - 2 * this._numberOfCoconuts;
  }
}

class NorwegianBlueParrot extends Bird {
  constructor(
    private _voltage: number,
    private _isNailed: boolean
  ) {
    super();
  }

  get plumage(): string {
    return this._voltage > 100 ? "scorched" : "beautiful";
  }

  get speed(): number {
    return this._isNailed ? 0 : 10 + this._voltage / 10;
  }
}

// Factory to create the right bird type
type BirdData =
  | { type: "EuropeanSwallow" }
  | { type: "AfricanSwallow"; numberOfCoconuts: number }
  | { type: "NorwegianBlueParrot"; voltage: number; isNailed: boolean };

function createBird(data: BirdData): Bird {
  switch (data.type) {
    case "EuropeanSwallow":
      return new EuropeanSwallow();
    case "AfricanSwallow":
      return new AfricanSwallow(data.numberOfCoconuts);
    case "NorwegianBlueParrot":
      return new NorwegianBlueParrot(data.voltage, data.isNailed);
  }
}

// ============================================================================
// EXAMPLE: Payment processing
// ============================================================================

// BEFORE: Switch on payment type
function processPaymentBefore(payment: {
  type: "credit" | "debit" | "paypal" | "crypto";
  amount: number;
  cardNumber?: string;
  email?: string;
  walletAddress?: string;
}): { success: boolean; fee: number; message: string } {
  switch (payment.type) {
    case "credit":
      return {
        success: true,
        fee: payment.amount * 0.03,
        message: `Charged $${payment.amount} to credit card ending ${payment.cardNumber?.slice(-4)}`,
      };
    case "debit":
      return {
        success: true,
        fee: payment.amount * 0.01,
        message: `Debited $${payment.amount} from account`,
      };
    case "paypal":
      return {
        success: true,
        fee: payment.amount * 0.025 + 0.3,
        message: `PayPal payment of $${payment.amount} to ${payment.email}`,
      };
    case "crypto":
      return {
        success: true,
        fee: payment.amount * 0.005,
        message: `Sent $${payment.amount} to wallet ${payment.walletAddress?.slice(0, 8)}...`,
      };
  }
}

// AFTER: Polymorphic payment processors
interface PaymentResult {
  success: boolean;
  fee: number;
  message: string;
}

abstract class PaymentProcessor {
  constructor(protected amount: number) {}

  abstract process(): PaymentResult;

  protected get feeRate(): number {
    return 0;
  }

  protected get fee(): number {
    return this.amount * this.feeRate;
  }
}

class CreditCardPayment extends PaymentProcessor {
  constructor(
    amount: number,
    private cardNumber: string
  ) {
    super(amount);
  }

  protected get feeRate(): number {
    return 0.03;
  }

  process(): PaymentResult {
    return {
      success: true,
      fee: this.fee,
      message: `Charged $${this.amount} to credit card ending ${this.cardNumber.slice(-4)}`,
    };
  }
}

class DebitCardPayment extends PaymentProcessor {
  protected get feeRate(): number {
    return 0.01;
  }

  process(): PaymentResult {
    return {
      success: true,
      fee: this.fee,
      message: `Debited $${this.amount} from account`,
    };
  }
}

class PayPalPayment extends PaymentProcessor {
  constructor(
    amount: number,
    private email: string
  ) {
    super(amount);
  }

  protected get fee(): number {
    return this.amount * 0.025 + 0.3;
  }

  process(): PaymentResult {
    return {
      success: true,
      fee: this.fee,
      message: `PayPal payment of $${this.amount} to ${this.email}`,
    };
  }
}

class CryptoPayment extends PaymentProcessor {
  constructor(
    amount: number,
    private walletAddress: string
  ) {
    super(amount);
  }

  protected get feeRate(): number {
    return 0.005;
  }

  process(): PaymentResult {
    return {
      success: true,
      fee: this.fee,
      message: `Sent $${this.amount} to wallet ${this.walletAddress.slice(0, 8)}...`,
    };
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Replace Conditional with Polymorphism ===\n");

console.log("--- Birds ---");
const birds = [
  createBird({ type: "EuropeanSwallow" }),
  createBird({ type: "AfricanSwallow", numberOfCoconuts: 3 }),
  createBird({ type: "NorwegianBlueParrot", voltage: 120, isNailed: false }),
  createBird({ type: "NorwegianBlueParrot", voltage: 80, isNailed: true }),
];

birds.forEach((bird, i) => {
  console.log(`Bird ${i + 1}: plumage=${bird.plumage}, speed=${bird.speed}`);
});

console.log("\n--- Payment Processing ---");
const payments: PaymentProcessor[] = [
  new CreditCardPayment(100, "4111111111111111"),
  new DebitCardPayment(100),
  new PayPalPayment(100, "user@example.com"),
  new CryptoPayment(100, "0x1234567890abcdef"),
];

payments.forEach((payment) => {
  const result = payment.process();
  console.log(`${result.message}`);
  console.log(`  Fee: $${result.fee.toFixed(2)}\n`);
});

console.log("--- Benefits of Polymorphism ---");
console.log("1. Each type encapsulates its own behavior");
console.log("2. Adding new types doesn't require changing existing code");
console.log("3. No risk of missing a case in a switch statement");
console.log("4. Type-specific logic is co-located");

export {};
