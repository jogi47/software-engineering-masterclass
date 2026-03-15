/**
 * MOVE FUNCTION
 *
 * Move a function to another class or module where it belongs better.
 *
 * Motivation:
 * - A function uses more features from another class than its own
 * - A function is called by clients of another class more often
 * - Reorganizing code to put related things together
 * - Reducing coupling between modules
 *
 * Mechanics:
 * 1. Examine what elements the function uses in its source context
 * 2. Check if it would make sense as a method on any of its parameters
 * 3. Move the function to the target context
 * 4. Adjust references and parameters
 */

// ============================================================================
// BEFORE: Function in wrong context
// ============================================================================

class AccountBefore {
  private _daysOverdrawn: number;

  constructor(
    private _type: AccountTypeBefore,
    daysOverdrawn: number
  ) {
    this._daysOverdrawn = daysOverdrawn;
  }

  get type(): AccountTypeBefore {
    return this._type;
  }

  get daysOverdrawn(): number {
    return this._daysOverdrawn;
  }

  // This function mostly uses AccountType's data
  get bankCharge(): number {
    let result = 4.5;
    if (this._daysOverdrawn > 0) {
      result += this.overdraftCharge;
    }
    return result;
  }

  get overdraftCharge(): number {
    if (this._type.isPremium) {
      const baseCharge = 10;
      if (this._daysOverdrawn <= 7) {
        return baseCharge;
      } else {
        return baseCharge + (this._daysOverdrawn - 7) * 0.85;
      }
    } else {
      return this._daysOverdrawn * 1.75;
    }
  }
}

class AccountTypeBefore {
  constructor(private _name: string) {}

  get isPremium(): boolean {
    return this._name === "premium";
  }
}

// ============================================================================
// AFTER: Function moved to where it belongs
// ============================================================================

class AccountType {
  constructor(private _name: string) {}

  get isPremium(): boolean {
    return this._name === "premium";
  }

  // Moved here - it uses AccountType's properties
  overdraftCharge(daysOverdrawn: number): number {
    if (this.isPremium) {
      const baseCharge = 10;
      if (daysOverdrawn <= 7) {
        return baseCharge;
      }
      return baseCharge + (daysOverdrawn - 7) * 0.85;
    }
    return daysOverdrawn * 1.75;
  }
}

class Account {
  constructor(
    private _type: AccountType,
    private _daysOverdrawn: number
  ) {}

  get type(): AccountType {
    return this._type;
  }

  get daysOverdrawn(): number {
    return this._daysOverdrawn;
  }

  // Now delegates to AccountType
  get bankCharge(): number {
    let result = 4.5;
    if (this._daysOverdrawn > 0) {
      result += this._type.overdraftCharge(this._daysOverdrawn);
    }
    return result;
  }
}

// ============================================================================
// ANOTHER EXAMPLE: Moving utility functions
// ============================================================================

// BEFORE: Utility in wrong place
class TrackingBefore {
  static distanceBetween(
    point1: { lat: number; lon: number },
    point2: { lat: number; lon: number }
  ): number {
    // Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
    const dLon = ((point2.lon - point1.lon) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((point1.lat * Math.PI) / 180) *
        Math.cos((point2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

// AFTER: Move to a proper GeoLocation class
class GeoLocation {
  constructor(
    public readonly lat: number,
    public readonly lon: number
  ) {}

  distanceTo(other: GeoLocation): number {
    const R = 6371;
    const dLat = ((other.lat - this.lat) * Math.PI) / 180;
    const dLon = ((other.lon - this.lon) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((this.lat * Math.PI) / 180) *
        Math.cos((other.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Other location-related functions can now live here
  get asString(): string {
    return `${this.lat.toFixed(4)}, ${this.lon.toFixed(4)}`;
  }

  isWithin(distance: number, other: GeoLocation): boolean {
    return this.distanceTo(other) <= distance;
  }
}

class Tracking {
  private _locations: GeoLocation[] = [];

  addLocation(location: GeoLocation): void {
    this._locations.push(location);
  }

  get totalDistance(): number {
    let total = 0;
    for (let i = 1; i < this._locations.length; i++) {
      total += this._locations[i - 1].distanceTo(this._locations[i]);
    }
    return total;
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Move Function Refactoring ===\n");

console.log("--- Before: overdraftCharge in Account ---");
const typeBefore = new AccountTypeBefore("premium");
const accountBefore = new AccountBefore(typeBefore, 10);
console.log(`Bank charge (before): $${accountBefore.bankCharge.toFixed(2)}`);

console.log("\n--- After: overdraftCharge moved to AccountType ---");
const type = new AccountType("premium");
const account = new Account(type, 10);
console.log(`Bank charge (after): $${account.bankCharge.toFixed(2)}`);

console.log("\n--- Standard account ---");
const standardType = new AccountType("standard");
const standardAccount = new Account(standardType, 10);
console.log(`Bank charge (standard): $${standardAccount.bankCharge.toFixed(2)}`);

console.log("\n--- GeoLocation example ---");
const home = new GeoLocation(40.7128, -74.006); // NYC
const work = new GeoLocation(40.758, -73.9855); // Times Square

console.log(`Home: ${home.asString}`);
console.log(`Work: ${work.asString}`);
console.log(`Distance: ${home.distanceTo(work).toFixed(2)} km`);
console.log(`Within 10km: ${home.isWithin(10, work)}`);

console.log("\n--- Tracking example ---");
const tracking = new Tracking();
tracking.addLocation(new GeoLocation(40.7128, -74.006));
tracking.addLocation(new GeoLocation(40.73, -73.99));
tracking.addLocation(new GeoLocation(40.758, -73.9855));
console.log(`Total distance: ${tracking.totalDistance.toFixed(2)} km`);

export {};
