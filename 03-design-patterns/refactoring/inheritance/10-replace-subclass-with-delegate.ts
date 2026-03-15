/**
 * REPLACE SUBCLASS WITH DELEGATE
 *
 * Replace a subclass with a delegate object that handles the variation.
 *
 * Motivation:
 * - Inheritance locks you into a single variation dimension
 * - Delegation allows for more flexible composition
 * - Can change behavior at runtime
 * - Avoids deep inheritance hierarchies
 *
 * Mechanics:
 * 1. Create a class to represent the delegate
 * 2. Add a field for the delegate to the superclass
 * 3. Create subclass-specific logic in delegate methods
 * 4. Move subclass methods to the delegate
 * 5. Replace subclass with factory that creates delegate
 */

// ============================================================================
// BEFORE: Inheritance-based variation
// ============================================================================

class BookingBefore {
  protected _show: { price: number; hasExtras: boolean };
  protected _date: Date;

  constructor(show: { price: number; hasExtras: boolean }, date: Date) {
    this._show = show;
    this._date = date;
  }

  get hasTalkback(): boolean {
    return this._show.hasExtras && !this.isPeakDay();
  }

  get basePrice(): number {
    return this._show.price;
  }

  protected isPeakDay(): boolean {
    const day = this._date.getDay();
    return day === 0 || day === 6;
  }
}

class PremiumBookingBefore extends BookingBefore {
  private _extras: { premiumFee: number; dinner: boolean };

  constructor(
    show: { price: number; hasExtras: boolean },
    date: Date,
    extras: { premiumFee: number; dinner: boolean }
  ) {
    super(show, date);
    this._extras = extras;
  }

  override get hasTalkback(): boolean {
    return this._show.hasExtras;
  }

  override get basePrice(): number {
    return super.basePrice + this._extras.premiumFee;
  }

  get hasDinner(): boolean {
    return this._extras.dinner && !this.isPeakDay();
  }
}

// ============================================================================
// AFTER: Delegate-based variation
// ============================================================================

interface BookingDelegate {
  hasTalkback(booking: Booking): boolean;
  extendBasePrice(booking: Booking, base: number): number;
  hasDinner?(): boolean;
}

class RegularBookingDelegate implements BookingDelegate {
  hasTalkback(booking: Booking): boolean {
    return booking.show.hasExtras && !booking.isPeakDay();
  }

  extendBasePrice(_booking: Booking, base: number): number {
    return base;
  }
}

class PremiumBookingDelegate implements BookingDelegate {
  private _host: Booking;
  private _extras: { premiumFee: number; dinner: boolean };

  constructor(host: Booking, extras: { premiumFee: number; dinner: boolean }) {
    this._host = host;
    this._extras = extras;
  }

  hasTalkback(_booking: Booking): boolean {
    return this._host.show.hasExtras;
  }

  extendBasePrice(_booking: Booking, base: number): number {
    return base + this._extras.premiumFee;
  }

  hasDinner(): boolean {
    return this._extras.dinner && !this._host.isPeakDay();
  }
}

class Booking {
  private _show: { price: number; hasExtras: boolean };
  private _date: Date;
  private _delegate: BookingDelegate;

  private constructor(
    show: { price: number; hasExtras: boolean },
    date: Date,
    delegate: BookingDelegate
  ) {
    this._show = show;
    this._date = date;
    this._delegate = delegate;
  }

  get show(): { price: number; hasExtras: boolean } {
    return this._show;
  }

  get hasTalkback(): boolean {
    return this._delegate.hasTalkback(this);
  }

  get basePrice(): number {
    return this._delegate.extendBasePrice(this, this._show.price);
  }

  isPeakDay(): boolean {
    const day = this._date.getDay();
    return day === 0 || day === 6;
  }

  get hasDinner(): boolean {
    return this._delegate.hasDinner?.() ?? false;
  }

  // Factory methods
  static createRegular(show: { price: number; hasExtras: boolean }, date: Date): Booking {
    const booking = new Booking(show, date, new RegularBookingDelegate());
    return booking;
  }

  static createPremium(
    show: { price: number; hasExtras: boolean },
    date: Date,
    extras: { premiumFee: number; dinner: boolean }
  ): Booking {
    const booking = new Booking(show, date, null!);
    (booking as { _delegate: BookingDelegate })._delegate = new PremiumBookingDelegate(
      booking,
      extras
    );
    return booking;
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Replace Subclass with Delegate ===\n");

const show = { price: 50, hasExtras: true };
const weekday = new Date("2024-03-20"); // Wednesday
const weekend = new Date("2024-03-23"); // Saturday

const regularBooking = Booking.createRegular(show, weekday);
const premiumBooking = Booking.createPremium(show, weekday, { premiumFee: 20, dinner: true });
const weekendPremium = Booking.createPremium(show, weekend, { premiumFee: 20, dinner: true });

console.log("Regular booking:");
console.log(`  Price: $${regularBooking.basePrice}, Talkback: ${regularBooking.hasTalkback}`);

console.log("\nPremium booking (weekday):");
console.log(`  Price: $${premiumBooking.basePrice}, Talkback: ${premiumBooking.hasTalkback}, Dinner: ${premiumBooking.hasDinner}`);

console.log("\nPremium booking (weekend):");
console.log(`  Price: $${weekendPremium.basePrice}, Peak day: ${weekendPremium.isPeakDay()}, Dinner: ${weekendPremium.hasDinner}`);

void BookingBefore;
void PremiumBookingBefore;

export {};
