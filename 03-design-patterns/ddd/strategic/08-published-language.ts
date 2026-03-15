/**
 * PUBLISHED LANGUAGE
 *
 * A well-documented, shared language (typically as data interchange formats)
 * that enables communication between bounded contexts. It provides a common
 * vocabulary that all integrating parties agree upon.
 *
 * Characteristics:
 * - Documented data formats (DTOs, schemas)
 * - Versioned for backward compatibility
 * - Independent of any specific bounded context
 * - Stable contract between systems
 * - Often based on industry standards
 *
 * When to use:
 * - Multiple contexts need to communicate
 * - Integration with external systems
 * - Public APIs
 * - Event-driven architectures
 * - Message-based communication
 *
 * Forms:
 * - JSON Schema
 * - Protocol Buffers
 * - XML Schema (XSD)
 * - OpenAPI/Swagger
 * - Avro
 *
 * Benefits:
 * - Clear contracts
 * - Decouples contexts
 * - Enables independent evolution
 * - Supports multiple consumers
 * - Documented integration points
 */

// ============================================
// PUBLISHED LANGUAGE: E-Commerce Integration
// Shared vocabulary for Order, Payment, Shipping
// ============================================

namespace PublishedLanguage {
  // Version tracking
  export const VERSION = "2.0.0";
  export const SCHEMA_URL = "https://api.example.com/schemas/v2";

  // ============================================
  // COMMON TYPES
  // Shared across all domains
  // ============================================

  /**
   * Standard money representation
   * All contexts agree on this format
   */
  export interface Money {
    amount: number; // Decimal amount (not cents)
    currency: string; // ISO 4217 currency code
  }

  /**
   * Standard address format
   */
  export interface Address {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string; // ISO 3166-1 alpha-2
  }

  /**
   * Standard person/contact info
   */
  export interface Contact {
    name: string;
    email: string;
    phone?: string;
  }

  /**
   * Standard timestamp format (ISO 8601)
   */
  export type Timestamp = string; // "2024-03-15T10:30:00Z"

  /**
   * Standard identifier
   */
  export interface Identifier {
    type: string; // e.g., "order", "customer", "product"
    value: string;
  }

  // ============================================
  // ORDER DOMAIN LANGUAGE
  // ============================================

  export namespace Order {
    export type Status = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

    export interface LineItem {
      productId: string;
      productName: string;
      sku: string;
      quantity: number;
      unitPrice: Money;
      discount?: Money;
      lineTotal: Money;
    }

    export interface OrderSummary {
      orderId: string;
      customerId: string;
      status: Status;
      placedAt: Timestamp;
      itemCount: number;
      subtotal: Money;
      tax: Money;
      shipping: Money;
      total: Money;
    }

    export interface OrderDetails extends OrderSummary {
      items: LineItem[];
      shippingAddress: Address;
      billingAddress: Address;
      customer: Contact;
      notes?: string;
    }

    // Events published by Order context
    export interface OrderPlacedEvent {
      eventType: "order.placed";
      eventId: string;
      occurredAt: Timestamp;
      order: OrderSummary;
      shippingAddress: Address;
    }

    export interface OrderConfirmedEvent {
      eventType: "order.confirmed";
      eventId: string;
      occurredAt: Timestamp;
      orderId: string;
      confirmedAt: Timestamp;
    }

    export interface OrderCancelledEvent {
      eventType: "order.cancelled";
      eventId: string;
      occurredAt: Timestamp;
      orderId: string;
      reason: string;
      cancelledAt: Timestamp;
    }
  }

  // ============================================
  // PAYMENT DOMAIN LANGUAGE
  // ============================================

  export namespace Payment {
    export type Status = "pending" | "authorized" | "captured" | "refunded" | "failed";

    export type Method = "credit_card" | "debit_card" | "paypal" | "bank_transfer" | "crypto";

    export interface PaymentRequest {
      orderId: string;
      amount: Money;
      method: Method;
      returnUrl?: string;
    }

    export interface PaymentResult {
      paymentId: string;
      orderId: string;
      status: Status;
      amount: Money;
      method: Method;
      transactionId?: string;
      processedAt: Timestamp;
      errorCode?: string;
      errorMessage?: string;
    }

    // Events published by Payment context
    export interface PaymentAuthorizedEvent {
      eventType: "payment.authorized";
      eventId: string;
      occurredAt: Timestamp;
      paymentId: string;
      orderId: string;
      amount: Money;
    }

    export interface PaymentCapturedEvent {
      eventType: "payment.captured";
      eventId: string;
      occurredAt: Timestamp;
      paymentId: string;
      orderId: string;
      amount: Money;
    }

    export interface PaymentFailedEvent {
      eventType: "payment.failed";
      eventId: string;
      occurredAt: Timestamp;
      paymentId: string;
      orderId: string;
      errorCode: string;
      errorMessage: string;
    }
  }

  // ============================================
  // SHIPPING DOMAIN LANGUAGE
  // ============================================

  export namespace Shipping {
    export type Status = "pending" | "label_created" | "picked_up" | "in_transit" | "delivered" | "returned";

    export type Carrier = "fedex" | "ups" | "usps" | "dhl";

    export interface ShipmentRequest {
      orderId: string;
      items: {
        productId: string;
        quantity: number;
        weight: number; // kg
      }[];
      destination: Address;
      preferredCarrier?: Carrier;
    }

    export interface ShipmentInfo {
      shipmentId: string;
      orderId: string;
      status: Status;
      carrier: Carrier;
      trackingNumber: string;
      trackingUrl: string;
      estimatedDelivery: Timestamp;
      shippedAt?: Timestamp;
      deliveredAt?: Timestamp;
    }

    export interface TrackingUpdate {
      shipmentId: string;
      status: Status;
      location: string;
      timestamp: Timestamp;
      description: string;
    }

    // Events published by Shipping context
    export interface ShipmentCreatedEvent {
      eventType: "shipping.created";
      eventId: string;
      occurredAt: Timestamp;
      shipmentId: string;
      orderId: string;
      carrier: Carrier;
      trackingNumber: string;
    }

    export interface ShipmentShippedEvent {
      eventType: "shipping.shipped";
      eventId: string;
      occurredAt: Timestamp;
      shipmentId: string;
      orderId: string;
      shippedAt: Timestamp;
      estimatedDelivery: Timestamp;
    }

    export interface ShipmentDeliveredEvent {
      eventType: "shipping.delivered";
      eventId: string;
      occurredAt: Timestamp;
      shipmentId: string;
      orderId: string;
      deliveredAt: Timestamp;
      signedBy?: string;
    }
  }

  // ============================================
  // INVENTORY DOMAIN LANGUAGE
  // ============================================

  export namespace Inventory {
    export interface StockLevel {
      productId: string;
      sku: string;
      available: number;
      reserved: number;
      incoming: number;
    }

    export interface ReservationRequest {
      orderId: string;
      items: {
        productId: string;
        quantity: number;
      }[];
    }

    export interface ReservationResult {
      reservationId: string;
      orderId: string;
      success: boolean;
      items: {
        productId: string;
        requested: number;
        reserved: number;
        available: number;
      }[];
      expiresAt: Timestamp;
    }

    // Events
    export interface StockReservedEvent {
      eventType: "inventory.reserved";
      eventId: string;
      occurredAt: Timestamp;
      reservationId: string;
      orderId: string;
      items: { productId: string; quantity: number }[];
    }

    export interface StockReleasedEvent {
      eventType: "inventory.released";
      eventId: string;
      occurredAt: Timestamp;
      reservationId: string;
      orderId: string;
    }
  }

  // ============================================
  // MESSAGE ENVELOPE
  // Standard wrapper for all events
  // ============================================

  export interface EventEnvelope<T> {
    schemaVersion: string;
    eventId: string;
    eventType: string;
    source: string; // Context that published
    occurredAt: Timestamp;
    correlationId?: string;
    causationId?: string;
    data: T;
  }

  // ============================================
  // VALIDATORS
  // Ensure messages conform to published language
  // ============================================

  export class Validator {
    static validateMoney(money: Money): string[] {
      const errors: string[] = [];
      if (typeof money.amount !== "number" || money.amount < 0) {
        errors.push("Invalid money amount");
      }
      if (typeof money.currency !== "string" || money.currency.length !== 3) {
        errors.push("Invalid currency code (must be 3 letters)");
      }
      return errors;
    }

    static validateAddress(address: Address): string[] {
      const errors: string[] = [];
      if (!address.line1) errors.push("Address line1 is required");
      if (!address.city) errors.push("City is required");
      if (!address.postalCode) errors.push("Postal code is required");
      if (!address.country || address.country.length !== 2) {
        errors.push("Country must be 2-letter ISO code");
      }
      return errors;
    }

    static validateEvent(envelope: EventEnvelope<any>): string[] {
      const errors: string[] = [];
      if (!envelope.eventId) errors.push("Event ID is required");
      if (!envelope.eventType) errors.push("Event type is required");
      if (!envelope.source) errors.push("Source is required");
      if (!envelope.occurredAt) errors.push("Occurred at timestamp is required");
      return errors;
    }
  }
}

// ============================================
// CONTEXT IMPLEMENTATIONS USING PUBLISHED LANGUAGE
// ============================================

namespace OrderContext {
  export class OrderService {
    publishOrderPlaced(order: any): PublishedLanguage.EventEnvelope<PublishedLanguage.Order.OrderPlacedEvent> {
      const event: PublishedLanguage.Order.OrderPlacedEvent = {
        eventType: "order.placed",
        eventId: `evt-${Date.now()}`,
        occurredAt: new Date().toISOString(),
        order: {
          orderId: order.orderId,
          customerId: order.customerId,
          status: "pending",
          placedAt: new Date().toISOString(),
          itemCount: order.items.length,
          subtotal: order.subtotal,
          tax: order.tax,
          shipping: order.shipping,
          total: order.total,
        },
        shippingAddress: order.shippingAddress,
      };

      return {
        schemaVersion: PublishedLanguage.VERSION,
        eventId: event.eventId,
        eventType: event.eventType,
        source: "order-context",
        occurredAt: event.occurredAt,
        correlationId: order.orderId,
        data: event,
      };
    }
  }
}

namespace PaymentContext {
  export class PaymentService {
    processPayment(
      request: PublishedLanguage.Payment.PaymentRequest
    ): PublishedLanguage.EventEnvelope<PublishedLanguage.Payment.PaymentAuthorizedEvent> {
      // Process payment...
      const paymentId = `pay-${Date.now()}`;

      const event: PublishedLanguage.Payment.PaymentAuthorizedEvent = {
        eventType: "payment.authorized",
        eventId: `evt-${Date.now()}`,
        occurredAt: new Date().toISOString(),
        paymentId,
        orderId: request.orderId,
        amount: request.amount,
      };

      return {
        schemaVersion: PublishedLanguage.VERSION,
        eventId: event.eventId,
        eventType: event.eventType,
        source: "payment-context",
        occurredAt: event.occurredAt,
        correlationId: request.orderId,
        data: event,
      };
    }
  }
}

namespace ShippingContext {
  export class ShippingService {
    createShipment(
      request: PublishedLanguage.Shipping.ShipmentRequest
    ): PublishedLanguage.EventEnvelope<PublishedLanguage.Shipping.ShipmentCreatedEvent> {
      const shipmentId = `ship-${Date.now()}`;
      const trackingNumber = `TRK${Date.now()}`;

      const event: PublishedLanguage.Shipping.ShipmentCreatedEvent = {
        eventType: "shipping.created",
        eventId: `evt-${Date.now()}`,
        occurredAt: new Date().toISOString(),
        shipmentId,
        orderId: request.orderId,
        carrier: request.preferredCarrier || "fedex",
        trackingNumber,
      };

      return {
        schemaVersion: PublishedLanguage.VERSION,
        eventId: event.eventId,
        eventType: event.eventType,
        source: "shipping-context",
        occurredAt: event.occurredAt,
        correlationId: request.orderId,
        data: event,
      };
    }
  }
}

// ============================================
// DEMONSTRATION
// ============================================

console.log("=== Published Language Pattern ===\n");
console.log(`Schema Version: ${PublishedLanguage.VERSION}`);

// Order context publishes order placed event
console.log("\n--- Order Context: Publish Event ---");
const orderService = new OrderContext.OrderService();
const orderEvent = orderService.publishOrderPlaced({
  orderId: "ORD-001",
  customerId: "CUST-001",
  items: [{ productId: "PROD-001", quantity: 2 }],
  subtotal: { amount: 199.98, currency: "USD" },
  tax: { amount: 17.0, currency: "USD" },
  shipping: { amount: 9.99, currency: "USD" },
  total: { amount: 226.97, currency: "USD" },
  shippingAddress: {
    line1: "123 Main St",
    city: "San Francisco",
    state: "CA",
    postalCode: "94105",
    country: "US",
  },
});

console.log("Order Placed Event:");
console.log(JSON.stringify(orderEvent, null, 2));

// Validate the event
const eventErrors = PublishedLanguage.Validator.validateEvent(orderEvent);
console.log(`\nValidation: ${eventErrors.length === 0 ? "PASSED" : "FAILED: " + eventErrors.join(", ")}`);

// Payment context processes payment
console.log("\n--- Payment Context: Process Payment ---");
const paymentService = new PaymentContext.PaymentService();
const paymentRequest: PublishedLanguage.Payment.PaymentRequest = {
  orderId: "ORD-001",
  amount: { amount: 226.97, currency: "USD" },
  method: "credit_card",
};

const paymentEvent = paymentService.processPayment(paymentRequest);
console.log("Payment Authorized Event:");
console.log(JSON.stringify(paymentEvent, null, 2));

// Shipping context creates shipment
console.log("\n--- Shipping Context: Create Shipment ---");
const shippingService = new ShippingContext.ShippingService();
const shipmentRequest: PublishedLanguage.Shipping.ShipmentRequest = {
  orderId: "ORD-001",
  items: [{ productId: "PROD-001", quantity: 2, weight: 1.5 }],
  destination: {
    line1: "123 Main St",
    city: "San Francisco",
    state: "CA",
    postalCode: "94105",
    country: "US",
  },
  preferredCarrier: "fedex",
};

const shippingEvent = shippingService.createShipment(shipmentRequest);
console.log("Shipment Created Event:");
console.log(JSON.stringify(shippingEvent, null, 2));

console.log("\n--- Published Language Benefits ---");
console.log("• All contexts use same Money, Address, Timestamp formats");
console.log("• Events follow standard envelope structure");
console.log("• Version tracking for backward compatibility");
console.log("• Validation ensures conformance");
console.log("• Events can be processed by any subscriber");

console.log("\n--- Namespaces in Published Language ---");
console.log("• PublishedLanguage.Order.*  - Order domain events");
console.log("• PublishedLanguage.Payment.* - Payment domain events");
console.log("• PublishedLanguage.Shipping.* - Shipping domain events");
console.log("• PublishedLanguage.Inventory.* - Inventory domain events");

export { PublishedLanguage, OrderContext, PaymentContext, ShippingContext };
