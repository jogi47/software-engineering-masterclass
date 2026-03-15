/**
 * INTRODUCE PARAMETER OBJECT
 *
 * Replace a group of parameters that naturally go together with an object.
 *
 * Motivation:
 * - Data items that travel together deserve to be in their own structure
 * - Reduces the number of parameters passed around
 * - Creates a named concept for the grouping
 * - Often leads to discovering behavior that belongs on the new object
 *
 * Mechanics:
 * 1. Create a new class/interface for the parameter group
 * 2. Add a parameter of the new type to the function
 * 3. For each caller, create an instance of the new type
 * 4. For each element of the new type, replace parameter usage
 * 5. Remove the original parameters
 */

// ============================================================================
// BEFORE: Multiple related parameters passed separately
// ============================================================================

function amountInvoicedInRangeBefore(
  startDate: Date,
  endDate: Date,
  invoices: Array<{ date: Date; amount: number }>
): number {
  return invoices
    .filter((inv) => inv.date >= startDate && inv.date <= endDate)
    .reduce((sum, inv) => sum + inv.amount, 0);
}

function amountReceivedInRangeBefore(
  startDate: Date,
  endDate: Date,
  payments: Array<{ date: Date; amount: number }>
): number {
  return payments
    .filter((p) => p.date >= startDate && p.date <= endDate)
    .reduce((sum, p) => sum + p.amount, 0);
}

function amountOverdueInRangeBefore(
  startDate: Date,
  endDate: Date,
  invoices: Array<{ dueDate: Date; paidDate: Date | null; amount: number }>
): number {
  return invoices
    .filter(
      (inv) =>
        inv.dueDate >= startDate &&
        inv.dueDate <= endDate &&
        (!inv.paidDate || inv.paidDate > inv.dueDate)
    )
    .reduce((sum, inv) => sum + inv.amount, 0);
}

// ============================================================================
// AFTER: Parameters grouped into a DateRange object
// ============================================================================

// Step 1: Create the parameter object
class DateRange {
  constructor(
    private readonly _start: Date,
    private readonly _end: Date
  ) {
    if (_start > _end) {
      throw new Error("Start date must be before end date");
    }
  }

  get start(): Date {
    return this._start;
  }

  get end(): Date {
    return this._end;
  }

  // Behavior that belongs to the range
  contains(date: Date): boolean {
    return date >= this._start && date <= this._end;
  }

  // More useful methods emerge
  get lengthInDays(): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((this._end.getTime() - this._start.getTime()) / msPerDay);
  }

  overlaps(other: DateRange): boolean {
    return this._start <= other.end && this._end >= other.start;
  }
}

// Step 2: Use the parameter object
function amountInvoicedInRange(
  range: DateRange,
  invoices: Array<{ date: Date; amount: number }>
): number {
  return invoices
    .filter((inv) => range.contains(inv.date))
    .reduce((sum, inv) => sum + inv.amount, 0);
}

function amountReceivedInRange(
  range: DateRange,
  payments: Array<{ date: Date; amount: number }>
): number {
  return payments
    .filter((p) => range.contains(p.date))
    .reduce((sum, p) => sum + p.amount, 0);
}

function amountOverdueInRange(
  range: DateRange,
  invoices: Array<{ dueDate: Date; paidDate: Date | null; amount: number }>
): number {
  return invoices
    .filter(
      (inv) =>
        range.contains(inv.dueDate) &&
        (!inv.paidDate || inv.paidDate > inv.dueDate)
    )
    .reduce((sum, inv) => sum + inv.amount, 0);
}

// ============================================================================
// ANOTHER EXAMPLE: Configuration parameters
// ============================================================================

// BEFORE: Many separate parameters
function sendEmailBefore(
  to: string,
  from: string,
  subject: string,
  body: string,
  isHtml: boolean,
  priority: "low" | "normal" | "high",
  replyTo?: string
): void {
  console.log(`Sending email from ${from} to ${to}`);
}

// AFTER: Grouped into EmailOptions
interface EmailOptions {
  to: string;
  from: string;
  subject: string;
  body: string;
  isHtml?: boolean;
  priority?: "low" | "normal" | "high";
  replyTo?: string;
}

function sendEmail(options: EmailOptions): void {
  const priority = options.priority ?? "normal";
  console.log(`Sending ${priority} priority email from ${options.from} to ${options.to}`);
  console.log(`Subject: ${options.subject}`);
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Introduce Parameter Object Refactoring ===\n");

const invoices = [
  { date: new Date("2024-01-15"), amount: 1000 },
  { date: new Date("2024-02-20"), amount: 1500 },
  { date: new Date("2024-03-10"), amount: 800 },
];

const payments = [
  { date: new Date("2024-01-20"), amount: 500 },
  { date: new Date("2024-02-25"), amount: 1000 },
];

console.log("--- Before: Multiple parameters ---");
const startDate = new Date("2024-01-01");
const endDate = new Date("2024-02-28");
console.log(`Invoiced: $${amountInvoicedInRangeBefore(startDate, endDate, invoices)}`);

console.log("\n--- After: DateRange parameter object ---");
const q1Range = new DateRange(new Date("2024-01-01"), new Date("2024-03-31"));
console.log(`Range: ${q1Range.lengthInDays} days`);
console.log(`Invoiced in Q1: $${amountInvoicedInRange(q1Range, invoices)}`);
console.log(`Received in Q1: $${amountReceivedInRange(q1Range, payments)}`);

const febRange = new DateRange(new Date("2024-02-01"), new Date("2024-02-29"));
console.log(`\nFeb only:`);
console.log(`  Invoiced: $${amountInvoicedInRange(febRange, invoices)}`);
console.log(`  Overlaps Q1? ${q1Range.overlaps(febRange)}`);

console.log("\n--- Email with options object ---");
sendEmail({
  to: "user@example.com",
  from: "system@example.com",
  subject: "Test Email",
  body: "Hello, World!",
  priority: "high",
});

export {};
