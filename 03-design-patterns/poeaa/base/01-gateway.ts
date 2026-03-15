/**
 * GATEWAY
 *
 * An object that encapsulates access to an external system or resource.
 *
 * Characteristics:
 * - Wraps external APIs, services, or systems
 * - Simplifies complex external interfaces
 * - Makes testing easier (can mock the gateway)
 * - Isolates changes when external APIs change
 */

// Types for external systems
interface PaymentResult {
  transactionId: string;
  status: "success" | "failed" | "pending";
  message: string;
}

interface EmailResponse {
  messageId: string;
  sent: boolean;
}

interface WeatherData {
  temperature: number;
  humidity: number;
  description: string;
}

// GATEWAY for payment service
class PaymentGateway {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = "https://api.payments.example.com") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async charge(amount: number, currency: string, cardToken: string): Promise<PaymentResult> {
    console.log(`[PaymentGateway] Charging ${amount} ${currency}`);

    // In real implementation, this would make HTTP request
    // await fetch(`${this.baseUrl}/charges`, { ... })

    // Simulated response
    return {
      transactionId: `txn_${Date.now()}`,
      status: "success",
      message: "Payment processed successfully",
    };
  }

  async refund(transactionId: string, amount?: number): Promise<PaymentResult> {
    console.log(`[PaymentGateway] Refunding transaction ${transactionId}`);

    return {
      transactionId: `ref_${Date.now()}`,
      status: "success",
      message: amount ? `Partial refund of ${amount}` : "Full refund processed",
    };
  }

  async getTransaction(transactionId: string): Promise<PaymentResult | null> {
    console.log(`[PaymentGateway] Getting transaction ${transactionId}`);

    return {
      transactionId,
      status: "success",
      message: "Transaction found",
    };
  }
}

// GATEWAY for email service
class EmailGateway {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async send(to: string, subject: string, body: string): Promise<EmailResponse> {
    console.log(`[EmailGateway] Sending email to ${to}`);

    // Would call external email API
    return {
      messageId: `msg_${Date.now()}`,
      sent: true,
    };
  }

  async sendTemplate(to: string, templateId: string, data: Record<string, unknown>): Promise<EmailResponse> {
    console.log(`[EmailGateway] Sending template ${templateId} to ${to}`);

    return {
      messageId: `msg_${Date.now()}`,
      sent: true,
    };
  }
}

// GATEWAY for weather API
class WeatherGateway {
  private apiKey: string;
  private cache = new Map<string, { data: WeatherData; timestamp: number }>();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getWeather(city: string): Promise<WeatherData> {
    // Check cache first
    const cached = this.cache.get(city);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log(`[WeatherGateway] Cache hit for ${city}`);
      return cached.data;
    }

    console.log(`[WeatherGateway] Fetching weather for ${city}`);

    // Would call external weather API
    const data: WeatherData = {
      temperature: 20 + Math.random() * 10,
      humidity: 50 + Math.random() * 30,
      description: "Partly cloudy",
    };

    // Cache the result
    this.cache.set(city, { data, timestamp: Date.now() });

    return data;
  }
}

// Service using gateways
class OrderService {
  constructor(
    private paymentGateway: PaymentGateway,
    private emailGateway: EmailGateway
  ) {}

  async processOrder(
    orderId: string,
    amount: number,
    cardToken: string,
    customerEmail: string
  ): Promise<{ success: boolean; transactionId?: string }> {
    console.log(`\n[OrderService] Processing order ${orderId}`);

    // Use payment gateway
    const paymentResult = await this.paymentGateway.charge(amount, "USD", cardToken);

    if (paymentResult.status !== "success") {
      return { success: false };
    }

    // Use email gateway
    await this.emailGateway.sendTemplate(customerEmail, "order-confirmation", {
      orderId,
      amount,
      transactionId: paymentResult.transactionId,
    });

    return {
      success: true,
      transactionId: paymentResult.transactionId,
    };
  }
}

// Usage
console.log("=== Gateway Pattern ===\n");

// Create gateways with API keys
const paymentGateway = new PaymentGateway("pk_test_123");
const emailGateway = new EmailGateway("em_test_456");
const weatherGateway = new WeatherGateway("wt_test_789");

// Use gateways directly
async function demo() {
  // Payment gateway
  const payment = await paymentGateway.charge(99.99, "USD", "card_token_xyz");
  console.log("Payment result:", payment);

  // Email gateway
  const email = await emailGateway.send("user@example.com", "Hello", "Welcome to our service!");
  console.log("Email result:", email);

  // Weather gateway with caching
  console.log("\nWeather requests:");
  const weather1 = await weatherGateway.getWeather("New York");
  console.log("Weather:", weather1);

  const weather2 = await weatherGateway.getWeather("New York"); // Cache hit
  console.log("Weather (cached):", weather2);

  // Use gateways through service
  const orderService = new OrderService(paymentGateway, emailGateway);
  const result = await orderService.processOrder("order-123", 149.99, "card_token", "customer@example.com");
  console.log("\nOrder result:", result);
}

demo();

// Make this file a module to avoid global scope pollution
export {};
