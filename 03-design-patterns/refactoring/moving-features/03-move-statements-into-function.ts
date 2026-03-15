/**
 * MOVE STATEMENTS INTO FUNCTION
 *
 * Move statements that always accompany a function call into the function itself.
 *
 * Motivation:
 * - When you see the same code executed every time you call a function
 * - Reduces duplication at call sites
 * - Makes it easier to modify the behavior in one place
 * - Keeps related logic together
 *
 * Mechanics:
 * 1. If the code isn't identical at all call sites, first make it identical
 * 2. Use Extract Function on the call and its surrounding statements
 * 3. Use Inline Function on the original call
 */

// ============================================================================
// BEFORE: Duplicate code at call sites
// ============================================================================

interface PhotoBefore {
  title: string;
  location: string;
  date: Date;
}

function renderPhotoBefore(photo: PhotoBefore): string {
  return `<img src="${photo.title.toLowerCase().replace(/ /g, "-")}.jpg" />`;
}

function emitPhotoDataBefore(photo: PhotoBefore): string {
  const result: string[] = [];
  result.push(`<p>title: ${photo.title}</p>`);
  result.push(`<p>location: ${photo.location}</p>`);
  return result.join("\n");
}

// At each call site, same code is repeated
function renderPageBefore(photos: PhotoBefore[]): string {
  const output: string[] = [];
  for (const photo of photos) {
    output.push("<div>");
    output.push(renderPhotoBefore(photo));
    output.push(emitPhotoDataBefore(photo));
    output.push(`<p>date: ${photo.date.toLocaleDateString()}</p>`); // Repeated everywhere!
    output.push("</div>");
  }
  return output.join("\n");
}

function renderPhotoCardBefore(photo: PhotoBefore): string {
  const output: string[] = [];
  output.push("<article>");
  output.push(emitPhotoDataBefore(photo));
  output.push(`<p>date: ${photo.date.toLocaleDateString()}</p>`); // Repeated!
  output.push("</article>");
  return output.join("\n");
}

// ============================================================================
// AFTER: Statements moved into function
// ============================================================================

interface Photo {
  title: string;
  location: string;
  date: Date;
}

function renderPhoto(photo: Photo): string {
  return `<img src="${photo.title.toLowerCase().replace(/ /g, "-")}.jpg" />`;
}

// Date rendering is now part of the function
function emitPhotoData(photo: Photo): string {
  const result: string[] = [];
  result.push(`<p>title: ${photo.title}</p>`);
  result.push(`<p>location: ${photo.location}</p>`);
  result.push(`<p>date: ${photo.date.toLocaleDateString()}</p>`); // Moved inside
  return result.join("\n");
}

// Call sites are simpler
function renderPage(photos: Photo[]): string {
  const output: string[] = [];
  for (const photo of photos) {
    output.push("<div>");
    output.push(renderPhoto(photo));
    output.push(emitPhotoData(photo)); // No more date line here
    output.push("</div>");
  }
  return output.join("\n");
}

function renderPhotoCard(photo: Photo): string {
  const output: string[] = [];
  output.push("<article>");
  output.push(emitPhotoData(photo)); // Simpler!
  output.push("</article>");
  return output.join("\n");
}

// ============================================================================
// ANOTHER EXAMPLE: Logging and function calls
// ============================================================================

// BEFORE: Logging duplicated at call sites
class ServiceBefore {
  fetchData(id: string): string {
    // Simulate fetch
    return `Data for ${id}`;
  }

  saveData(id: string, data: string): void {
    // Simulate save
    console.log(`  Saved: ${id} = ${data}`);
  }
}

function processBefore(service: ServiceBefore, id: string): void {
  console.log(`  [${new Date().toISOString()}] Starting fetch for ${id}`);
  const data = service.fetchData(id);
  console.log(`  [${new Date().toISOString()}] Completed fetch for ${id}`);

  // Same pattern repeated
  console.log(`  [${new Date().toISOString()}] Starting save for ${id}`);
  service.saveData(id, data.toUpperCase());
  console.log(`  [${new Date().toISOString()}] Completed save for ${id}`);
}

// AFTER: Logging moved into service
class Service {
  private log(message: string): void {
    console.log(`  [${new Date().toISOString()}] ${message}`);
  }

  fetchData(id: string): string {
    this.log(`Starting fetch for ${id}`);
    const result = `Data for ${id}`;
    this.log(`Completed fetch for ${id}`);
    return result;
  }

  saveData(id: string, data: string): void {
    this.log(`Starting save for ${id}`);
    console.log(`    Saved: ${id} = ${data}`);
    this.log(`Completed save for ${id}`);
  }
}

function process(service: Service, id: string): void {
  const data = service.fetchData(id);
  service.saveData(id, data.toUpperCase());
}

// ============================================================================
// EXAMPLE: Moving validation into function
// ============================================================================

interface Order {
  customerId: string;
  items: Array<{ product: string; quantity: number }>;
  total: number;
}

// BEFORE: Validation repeated at each call
function submitOrderBefore(order: Order): void {
  // These checks appear before every submitOrder call
  if (!order.customerId) throw new Error("Customer ID required");
  if (order.items.length === 0) throw new Error("Order must have items");
  if (order.total <= 0) throw new Error("Total must be positive");

  console.log(`  Submitting order for ${order.customerId}`);
}

// AFTER: Validation moved inside
function submitOrder(order: Order): void {
  // Validation is now part of the function
  if (!order.customerId) throw new Error("Customer ID required");
  if (order.items.length === 0) throw new Error("Order must have items");
  if (order.total <= 0) throw new Error("Total must be positive");

  console.log(`  Submitting order for ${order.customerId}: $${order.total}`);
}

// Even better: validation as a separate internal function
function validateOrder(order: Order): void {
  if (!order.customerId) throw new Error("Customer ID required");
  if (order.items.length === 0) throw new Error("Order must have items");
  if (order.total <= 0) throw new Error("Total must be positive");
}

function submitOrderClean(order: Order): void {
  validateOrder(order);
  console.log(`  Submitting order for ${order.customerId}: $${order.total}`);
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Move Statements into Function Refactoring ===\n");

const photos: Photo[] = [
  { title: "Sunset Beach", location: "California", date: new Date("2024-01-15") },
  { title: "Mountain View", location: "Colorado", date: new Date("2024-02-20") },
];

console.log("--- Photo rendering (after moving date into function) ---");
console.log(renderPage(photos));

console.log("\n--- Photo card ---");
console.log(renderPhotoCard(photos[0]));

console.log("\n--- Service with logging moved inside ---");
const service = new Service();
process(service, "item-123");

console.log("\n--- Order submission with validation inside ---");
const validOrder: Order = {
  customerId: "C123",
  items: [{ product: "Widget", quantity: 2 }],
  total: 50,
};
submitOrderClean(validOrder);

console.log("\nTrying invalid order:");
try {
  submitOrderClean({ customerId: "", items: [], total: 0 });
} catch (e) {
  console.log(`  Error: ${(e as Error).message}`);
}

export {};
