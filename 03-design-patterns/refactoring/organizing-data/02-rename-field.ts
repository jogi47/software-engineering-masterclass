/**
 * RENAME FIELD
 *
 * Change the name of a field to better reflect its purpose.
 *
 * Motivation:
 * - Field names are crucial for understanding data structures
 * - Names that made sense initially may become unclear
 * - Domain terminology evolves
 * - Good names make code self-documenting
 *
 * Mechanics:
 * 1. If the record has limited scope, rename all accesses and test
 * 2. If the record is published (used widely):
 *    a. Use Encapsulate Record if not already encapsulated
 *    b. Rename the private field and update internal methods
 *    c. Add new accessor methods with the new name
 *    d. Gradually migrate callers
 *    e. Remove old accessor methods
 */

// ============================================================================
// BEFORE: Poor field names
// ============================================================================

interface OrganizationBefore {
  n: string; // What is 'n'?
  c: string; // Country? Code? Category?
  hq: { // Headquarters? But what's inside?
    addr: string;
    zc: string;
  };
}

function printOrgBefore(org: OrganizationBefore): void {
  console.log(`${org.n} (${org.c})`);
  console.log(`  ${org.hq.addr}, ${org.hq.zc}`);
}

// ============================================================================
// AFTER: Clear field names
// ============================================================================

interface Address {
  street: string;
  zipCode: string;
}

interface Organization {
  name: string;
  country: string;
  headquarters: Address;
}

function printOrg(org: Organization): void {
  console.log(`${org.name} (${org.country})`);
  console.log(`  ${org.headquarters.street}, ${org.headquarters.zipCode}`);
}

// ============================================================================
// EXAMPLE: Gradual migration with accessors
// ============================================================================

// Step 1: Original class with old field name
class CustomerV1 {
  private _hp: string; // 'hp' is unclear

  constructor(hp: string) {
    this._hp = hp;
  }

  get hp(): string {
    return this._hp;
  }

  set hp(value: string) {
    this._hp = value;
  }
}

// Step 2: Add new accessor, delegate from old
class CustomerV2 {
  private _phoneNumber: string; // Renamed internally

  constructor(phoneNumber: string) {
    this._phoneNumber = phoneNumber;
  }

  // New accessor with clear name
  get phoneNumber(): string {
    return this._phoneNumber;
  }

  set phoneNumber(value: string) {
    this._phoneNumber = value;
  }

  // Old accessor delegates (for backward compatibility during migration)
  /** @deprecated Use phoneNumber instead */
  get hp(): string {
    return this._phoneNumber;
  }

  /** @deprecated Use phoneNumber instead */
  set hp(value: string) {
    this._phoneNumber = value;
  }
}

// Step 3: Final version after all callers updated
class Customer {
  private _phoneNumber: string;

  constructor(phoneNumber: string) {
    this._phoneNumber = phoneNumber;
  }

  get phoneNumber(): string {
    return this._phoneNumber;
  }

  set phoneNumber(value: string) {
    this._phoneNumber = value;
  }
}

// ============================================================================
// EXAMPLE: Renaming in interfaces/types
// ============================================================================

// BEFORE: Abbreviations and unclear names
interface UserDataBefore {
  fn: string; // first name
  ln: string; // last name
  dob: string; // date of birth
  addr: {
    l1: string; // line 1
    l2: string; // line 2
    cty: string; // city
    st: string; // state
    zip: string;
  };
}

// AFTER: Self-documenting names
interface UserAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
}

interface UserData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  address: UserAddress;
}

// Mapping function for migration
function migrateUserData(old: UserDataBefore): UserData {
  return {
    firstName: old.fn,
    lastName: old.ln,
    dateOfBirth: old.dob,
    address: {
      line1: old.addr.l1,
      line2: old.addr.l2,
      city: old.addr.cty,
      state: old.addr.st,
      postalCode: old.addr.zip,
    },
  };
}

// ============================================================================
// EXAMPLE: Renaming to match domain language
// ============================================================================

// BEFORE: Technical terms
interface OrderBefore {
  orderNumber: string;
  items: Array<{ sku: string; qty: number; price: number }>;
  subTotal: number;
  taxAmt: number;
  shipCost: number;
  grandTotal: number;
}

// AFTER: Business domain terms
interface OrderItem {
  productCode: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  orderNumber: string;
  lineItems: OrderItem[];
  merchandiseTotal: number;
  salesTax: number;
  shippingAndHandling: number;
  orderTotal: number;
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Rename Field Refactoring ===\n");

console.log("--- Before: Cryptic field names ---");
const orgBefore: OrganizationBefore = {
  n: "Acme Corp",
  c: "US",
  hq: { addr: "123 Main St", zc: "12345" },
};
printOrgBefore(orgBefore);

console.log("\n--- After: Clear field names ---");
const org: Organization = {
  name: "Acme Corp",
  country: "US",
  headquarters: { street: "123 Main St", zipCode: "12345" },
};
printOrg(org);

console.log("\n--- Customer migration ---");
const customer = new Customer("555-1234");
console.log(`Phone: ${customer.phoneNumber}`);

console.log("\n--- User data migration ---");
const oldUser: UserDataBefore = {
  fn: "John",
  ln: "Doe",
  dob: "1990-01-15",
  addr: { l1: "123 Main", l2: "Apt 4", cty: "NYC", st: "NY", zip: "10001" },
};
const newUser = migrateUserData(oldUser);
console.log(`Name: ${newUser.firstName} ${newUser.lastName}`);
console.log(`City: ${newUser.address.city}, ${newUser.address.state}`);

console.log("\n--- Order with domain terms ---");
const order: Order = {
  orderNumber: "ORD-001",
  lineItems: [
    { productCode: "WIDGET-01", quantity: 2, unitPrice: 25 },
    { productCode: "GADGET-02", quantity: 1, unitPrice: 50 },
  ],
  merchandiseTotal: 100,
  salesTax: 8,
  shippingAndHandling: 10,
  orderTotal: 118,
};
console.log(`Order ${order.orderNumber}:`);
console.log(`  Merchandise: $${order.merchandiseTotal}`);
console.log(`  Tax: $${order.salesTax}`);
console.log(`  Shipping: $${order.shippingAndHandling}`);
console.log(`  Total: $${order.orderTotal}`);

export {};
