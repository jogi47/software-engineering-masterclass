/**
 * INLINE CLASS
 *
 * Merge a class into another class that uses it.
 * The inverse of Extract Class.
 *
 * Motivation:
 * - A class is no longer pulling its weight
 * - The class has become too small after refactoring
 * - You want to merge two classes before re-extracting differently
 * - The abstraction no longer makes sense
 *
 * Mechanics:
 * 1. In the target class, create functions for all public features of the source
 * 2. Change all callers to use the target class methods
 * 3. Move methods and fields from source to target
 * 4. Delete the source class
 */

// ============================================================================
// BEFORE: A class that's become too thin
// ============================================================================

// This class doesn't justify its existence anymore
class TrackingInformationBefore {
  private _shippingCompany: string;
  private _trackingNumber: string;

  constructor(shippingCompany: string, trackingNumber: string) {
    this._shippingCompany = shippingCompany;
    this._trackingNumber = trackingNumber;
  }

  get shippingCompany(): string {
    return this._shippingCompany;
  }

  set shippingCompany(value: string) {
    this._shippingCompany = value;
  }

  get trackingNumber(): string {
    return this._trackingNumber;
  }

  set trackingNumber(value: string) {
    this._trackingNumber = value;
  }

  get display(): string {
    return `${this._shippingCompany}: ${this._trackingNumber}`;
  }
}

class ShipmentBefore {
  private _trackingInformation: TrackingInformationBefore;

  constructor() {
    this._trackingInformation = new TrackingInformationBefore("", "");
  }

  get trackingInformation(): TrackingInformationBefore {
    return this._trackingInformation;
  }

  // Just delegating - sign that class should be inlined
  get trackingInfo(): string {
    return this._trackingInformation.display;
  }

  get shippingCompany(): string {
    return this._trackingInformation.shippingCompany;
  }

  set shippingCompany(value: string) {
    this._trackingInformation.shippingCompany = value;
  }

  get trackingNumber(): string {
    return this._trackingInformation.trackingNumber;
  }

  set trackingNumber(value: string) {
    this._trackingInformation.trackingNumber = value;
  }
}

// ============================================================================
// AFTER: Inlined class - simpler structure
// ============================================================================

class Shipment {
  private _shippingCompany: string;
  private _trackingNumber: string;

  constructor(shippingCompany: string = "", trackingNumber: string = "") {
    this._shippingCompany = shippingCompany;
    this._trackingNumber = trackingNumber;
  }

  get shippingCompany(): string {
    return this._shippingCompany;
  }

  set shippingCompany(value: string) {
    this._shippingCompany = value;
  }

  get trackingNumber(): string {
    return this._trackingNumber;
  }

  set trackingNumber(value: string) {
    this._trackingNumber = value;
  }

  get trackingInfo(): string {
    return `${this._shippingCompany}: ${this._trackingNumber}`;
  }

  get trackingUrl(): string {
    // Now we can add more behavior without needing another class
    const urls: Record<string, string> = {
      UPS: `https://ups.com/track/${this._trackingNumber}`,
      FedEx: `https://fedex.com/track/${this._trackingNumber}`,
      USPS: `https://usps.com/track/${this._trackingNumber}`,
    };
    return urls[this._shippingCompany] || "";
  }
}

// ============================================================================
// ANOTHER EXAMPLE: Merging before re-extracting
// ============================================================================

// Before: Two small classes that should be reorganized
class PointBefore {
  constructor(
    public x: number,
    public y: number
  ) {}
}

class DimensionsBefore {
  constructor(
    public width: number,
    public height: number
  ) {}
}

class RectangleBefore {
  constructor(
    private _origin: PointBefore,
    private _size: DimensionsBefore
  ) {}

  get area(): number {
    return this._size.width * this._size.height;
  }
}

// After: Inlined and then reorganized differently
class Rectangle {
  constructor(
    private _x: number,
    private _y: number,
    private _width: number,
    private _height: number
  ) {}

  get x(): number {
    return this._x;
  }
  get y(): number {
    return this._y;
  }
  get width(): number {
    return this._width;
  }
  get height(): number {
    return this._height;
  }

  get left(): number {
    return this._x;
  }
  get right(): number {
    return this._x + this._width;
  }
  get top(): number {
    return this._y;
  }
  get bottom(): number {
    return this._y + this._height;
  }

  get area(): number {
    return this._width * this._height;
  }

  get perimeter(): number {
    return 2 * (this._width + this._height);
  }

  contains(x: number, y: number): boolean {
    return x >= this.left && x <= this.right && y >= this.top && y <= this.bottom;
  }

  intersects(other: Rectangle): boolean {
    return !(
      this.right < other.left ||
      this.left > other.right ||
      this.bottom < other.top ||
      this.top > other.bottom
    );
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Inline Class Refactoring ===\n");

console.log("--- Before: Separate TrackingInformation class ---");
const shipmentBefore = new ShipmentBefore();
shipmentBefore.shippingCompany = "UPS";
shipmentBefore.trackingNumber = "1Z999AA10123456784";
console.log(shipmentBefore.trackingInfo);
// Still need to go through trackingInformation for direct access
console.log(shipmentBefore.trackingInformation.display);

console.log("\n--- After: Inlined into Shipment ---");
const shipment = new Shipment("UPS", "1Z999AA10123456784");
console.log(shipment.trackingInfo);
console.log(`Tracking URL: ${shipment.trackingUrl}`);

shipment.shippingCompany = "FedEx";
shipment.trackingNumber = "123456789012";
console.log(`Updated: ${shipment.trackingInfo}`);
console.log(`Tracking URL: ${shipment.trackingUrl}`);

console.log("\n--- Rectangle (inlined and improved) ---");
const rect1 = new Rectangle(0, 0, 100, 50);
console.log(`Area: ${rect1.area}`);
console.log(`Perimeter: ${rect1.perimeter}`);
console.log(`Contains (50, 25): ${rect1.contains(50, 25)}`);
console.log(`Contains (150, 25): ${rect1.contains(150, 25)}`);

const rect2 = new Rectangle(50, 25, 100, 50);
console.log(`\nIntersects: ${rect1.intersects(rect2)}`);

const rect3 = new Rectangle(200, 200, 50, 50);
console.log(`Intersects non-overlapping: ${rect1.intersects(rect3)}`);

export {};
