/**
 * MOVE STATEMENTS TO CALLERS
 *
 * Move statements from a function back to its callers when they need
 * to behave differently in different contexts.
 *
 * The inverse of Move Statements into Function.
 *
 * Motivation:
 * - When behavior that was common needs to vary at different call sites
 * - When a function is doing too much for some callers
 * - When extracting differences allows the shared part to remain general
 *
 * Mechanics:
 * 1. Use Extract Function on the statements that should stay
 * 2. Apply Inline Function on the original function
 * 3. Apply Change Function Declaration to rename the extracted function
 */

// ============================================================================
// BEFORE: Function does too much for some callers
// ============================================================================

interface PhotoBefore {
  title: string;
  location: string;
  date: Date;
}

// This function always renders the location, but some callers don't want it
function renderPersonBefore(photo: PhotoBefore): string {
  const result: string[] = [];
  result.push(`<p>title: ${photo.title}</p>`);
  result.push(`<p>location: ${photo.location}</p>`); // Not always wanted
  result.push(`<p>date: ${photo.date.toLocaleDateString()}</p>`);
  return result.join("\n");
}

// Caller wants location
function photoPageBefore(photo: PhotoBefore): string {
  return `<div>${renderPersonBefore(photo)}</div>`;
}

// Caller doesn't want location but gets it anyway
function listEntryBefore(photo: PhotoBefore): string {
  return `<li>${renderPersonBefore(photo)}</li>`;
}

// ============================================================================
// AFTER: Location rendering moved to callers
// ============================================================================

interface Photo {
  title: string;
  location: string;
  date: Date;
}

// Core function only does what's always needed
function emitPhotoData(photo: Photo): string {
  const result: string[] = [];
  result.push(`<p>title: ${photo.title}</p>`);
  result.push(`<p>date: ${photo.date.toLocaleDateString()}</p>`);
  return result.join("\n");
}

// Caller adds location when needed
function photoPage(photo: Photo): string {
  return [
    "<div>",
    emitPhotoData(photo),
    `<p>location: ${photo.location}</p>`, // Added by caller
    "</div>",
  ].join("\n");
}

// Caller skips location
function listEntry(photo: Photo): string {
  return `<li>${emitPhotoData(photo)}</li>`;
}

// ============================================================================
// ANOTHER EXAMPLE: Report generation
// ============================================================================

interface SalesData {
  region: string;
  revenue: number;
  expenses: number;
  date: Date;
}

// BEFORE: generateReport always includes detailed breakdown
function generateReportBefore(data: SalesData[]): string {
  const lines: string[] = [];
  lines.push("Sales Report");
  lines.push("============");

  for (const d of data) {
    lines.push(`\nRegion: ${d.region}`);
    lines.push(`Revenue: $${d.revenue}`);
    lines.push(`Expenses: $${d.expenses}`);
    lines.push(`Profit: $${d.revenue - d.expenses}`);
    lines.push(`Date: ${d.date.toLocaleDateString()}`);
  }

  // Summary always included but not always wanted
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalExpenses = data.reduce((sum, d) => sum + d.expenses, 0);
  lines.push("\n--- Summary ---");
  lines.push(`Total Revenue: $${totalRevenue}`);
  lines.push(`Total Expenses: $${totalExpenses}`);
  lines.push(`Net Profit: $${totalRevenue - totalExpenses}`);

  return lines.join("\n");
}

// AFTER: Core report data, summary moved to callers
function generateReportCore(data: SalesData[]): string[] {
  const lines: string[] = [];
  lines.push("Sales Report");
  lines.push("============");

  for (const d of data) {
    lines.push(`\nRegion: ${d.region}`);
    lines.push(`Revenue: $${d.revenue}`);
    lines.push(`Expenses: $${d.expenses}`);
    lines.push(`Profit: $${d.revenue - d.expenses}`);
    lines.push(`Date: ${d.date.toLocaleDateString()}`);
  }

  return lines;
}

function generateSummary(data: SalesData[]): string[] {
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalExpenses = data.reduce((sum, d) => sum + d.expenses, 0);
  return [
    "\n--- Summary ---",
    `Total Revenue: $${totalRevenue}`,
    `Total Expenses: $${totalExpenses}`,
    `Net Profit: $${totalRevenue - totalExpenses}`,
  ];
}

// Full report for executives
function executiveReport(data: SalesData[]): string {
  return [...generateReportCore(data), ...generateSummary(data)].join("\n");
}

// Brief report for daily review (no summary)
function dailyReport(data: SalesData[]): string {
  return generateReportCore(data).join("\n");
}

// Summary only for dashboard
function dashboardSummary(data: SalesData[]): string {
  return generateSummary(data).join("\n");
}

// ============================================================================
// EXAMPLE: Notification sending
// ============================================================================

interface User {
  name: string;
  email: string;
  phone: string;
  preferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
  };
}

// BEFORE: Always sends both email and SMS
function notifyUserBefore(user: User, message: string): void {
  console.log(`  Sending email to ${user.email}: ${message}`);
  console.log(`  Sending SMS to ${user.phone}: ${message}`);
}

// AFTER: Core message formatting, delivery moved to callers
function formatNotification(user: User, message: string): string {
  return `Hello ${user.name}, ${message}`;
}

function sendEmail(email: string, content: string): void {
  console.log(`  Sending email to ${email}: ${content}`);
}

function sendSms(phone: string, content: string): void {
  console.log(`  Sending SMS to ${phone}: ${content}`);
}

// Caller decides delivery method
function notifyUser(user: User, message: string): void {
  const content = formatNotification(user, message);

  if (user.preferences.emailNotifications) {
    sendEmail(user.email, content);
  }
  if (user.preferences.smsNotifications) {
    sendSms(user.phone, content);
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Move Statements to Callers Refactoring ===\n");

const photo: Photo = {
  title: "Sunset Beach",
  location: "California",
  date: new Date("2024-01-15"),
};

console.log("--- Photo page (includes location) ---");
console.log(photoPage(photo));

console.log("\n--- List entry (no location) ---");
console.log(listEntry(photo));

console.log("\n--- Sales Reports ---");
const salesData: SalesData[] = [
  { region: "North", revenue: 100000, expenses: 60000, date: new Date("2024-01-01") },
  { region: "South", revenue: 80000, expenses: 50000, date: new Date("2024-01-01") },
];

console.log("\nExecutive Report (with summary):");
console.log(executiveReport(salesData));

console.log("\nDaily Report (no summary):");
console.log(dailyReport(salesData));

console.log("\nDashboard Summary only:");
console.log(dashboardSummary(salesData));

console.log("\n--- User Notifications ---");
const user: User = {
  name: "Alice",
  email: "alice@example.com",
  phone: "555-1234",
  preferences: { emailNotifications: true, smsNotifications: false },
};

console.log("Notifying user (respects preferences):");
notifyUser(user, "Your order has shipped!");

export {};
