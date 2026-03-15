/**
 * SPLIT VARIABLE
 *
 * Split a variable that is assigned more than once into separate variables.
 *
 * Motivation:
 * - A variable should have only one responsibility
 * - Reusing variables for different purposes is confusing
 * - Each assignment should create a new variable with a meaningful name
 * - Makes the code's intent clearer
 *
 * Mechanics:
 * 1. Change the name of the variable at its declaration and first assignment
 * 2. If possible, make the new variable immutable
 * 3. Change all references up to the second assignment
 * 4. Test
 * 5. Repeat for each subsequent assignment
 *
 * Note: Loop variables and collecting variables (accumulators) are exceptions.
 */

// ============================================================================
// BEFORE: Variable reused for different purposes
// ============================================================================

function calculateDistanceBefore(velocity: number, time: number): number {
  // 'temp' used for two different things
  let temp = 2 * velocity * time; // First: intermediate calculation
  console.log(`Initial momentum factor: ${temp}`);

  temp = temp + 10; // Second: final distance with constant
  return temp;
}

function processOrderBefore(basePrice: number, quantity: number): number {
  // 'result' accumulates different meanings
  let result = basePrice * quantity; // Base total
  result = result - result * 0.1; // After discount
  result = result * 1.08; // After tax
  return result;
}

// Input parameter reassigned
function discountBefore(inputValue: number, discountRate: number): number {
  let inputValue_ = inputValue; // Shouldn't reassign parameters
  if (inputValue_ > 100) {
    inputValue_ = inputValue_ - 20;
  }
  return inputValue_ * (1 - discountRate);
}

// ============================================================================
// AFTER: Each variable has one purpose
// ============================================================================

function calculateDistance(velocity: number, time: number): number {
  const momentumFactor = 2 * velocity * time;
  console.log(`Initial momentum factor: ${momentumFactor}`);

  const distance = momentumFactor + 10;
  return distance;
}

function processOrder(basePrice: number, quantity: number): number {
  const subtotal = basePrice * quantity;
  const afterDiscount = subtotal - subtotal * 0.1;
  const afterTax = afterDiscount * 1.08;
  return afterTax;
}

function discount(originalValue: number, discountRate: number): number {
  const adjustedValue = originalValue > 100 ? originalValue - 20 : originalValue;
  return adjustedValue * (1 - discountRate);
}

// ============================================================================
// EXAMPLE: Physics calculation
// ============================================================================

interface FallingObject {
  initialVelocity: number;
  acceleration: number;
  time: number;
}

// BEFORE: 'acc' variable reused
function calculateMotionBefore(obj: FallingObject): { distance: number; finalVelocity: number } {
  let acc = obj.initialVelocity; // Starting velocity
  acc = acc + obj.acceleration * obj.time; // Final velocity

  let acc2 = obj.initialVelocity * obj.time; // Distance from velocity
  acc2 = acc2 + 0.5 * obj.acceleration * obj.time * obj.time; // Total distance

  return { distance: acc2, finalVelocity: acc };
}

// AFTER: Clear, separate variables
function calculateMotion(obj: FallingObject): { distance: number; finalVelocity: number } {
  // Velocity calculation
  const initialVelocity = obj.initialVelocity;
  const velocityChange = obj.acceleration * obj.time;
  const finalVelocity = initialVelocity + velocityChange;

  // Distance calculation
  const distanceFromVelocity = initialVelocity * obj.time;
  const distanceFromAcceleration = 0.5 * obj.acceleration * obj.time * obj.time;
  const totalDistance = distanceFromVelocity + distanceFromAcceleration;

  return { distance: totalDistance, finalVelocity };
}

// ============================================================================
// EXAMPLE: Loop variable (acceptable reuse)
// ============================================================================

function sumArray(numbers: number[]): number {
  // This is an accumulator - acceptable to reuse
  let sum = 0;
  for (const num of numbers) {
    sum += num;
  }
  return sum;
}

// But don't mix accumulator with other purposes
// BEFORE
function analyzeArrayBefore(numbers: number[]): { sum: number; average: number } {
  let result = 0;

  // Accumulating sum
  for (const num of numbers) {
    result += num;
  }

  // Now result becomes something else
  const sum = result;
  result = result / numbers.length; // Reused for average!

  return { sum, average: result };
}

// AFTER
function analyzeArray(numbers: number[]): { sum: number; average: number } {
  const sum = numbers.reduce((acc, num) => acc + num, 0);
  const average = sum / numbers.length;
  return { sum, average };
}

// ============================================================================
// EXAMPLE: Configuration processing
// ============================================================================

// BEFORE: 'config' reassigned multiple times
function processConfigBefore(rawConfig: string): object {
  let config: any = JSON.parse(rawConfig);
  config = { ...config, timestamp: Date.now() }; // Adding field
  config = { ...config, version: config.version || "1.0" }; // Default
  return config;
}

// AFTER: Each step has its own variable
function processConfig(rawConfig: string): object {
  const parsedConfig = JSON.parse(rawConfig);
  const withTimestamp = { ...parsedConfig, timestamp: Date.now() };
  const withDefaults = { ...withTimestamp, version: withTimestamp.version || "1.0" };
  return withDefaults;
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Split Variable Refactoring ===\n");

console.log("--- Distance Calculation ---");
console.log(`Distance: ${calculateDistance(10, 5)}`);

console.log("\n--- Order Processing ---");
console.log(`Order total: $${processOrder(100, 3).toFixed(2)}`);

console.log("\n--- Discount Calculation ---");
console.log(`Discount on $50: $${discount(50, 0.1).toFixed(2)}`);
console.log(`Discount on $150: $${discount(150, 0.1).toFixed(2)}`);

console.log("\n--- Physics Motion ---");
const motion = calculateMotion({
  initialVelocity: 10,
  acceleration: 9.8,
  time: 2,
});
console.log(`Distance: ${motion.distance.toFixed(2)}m`);
console.log(`Final velocity: ${motion.finalVelocity.toFixed(2)}m/s`);

console.log("\n--- Array Analysis ---");
const numbers = [1, 2, 3, 4, 5];
const analysis = analyzeArray(numbers);
console.log(`Sum: ${analysis.sum}, Average: ${analysis.average}`);

console.log("\n--- Config Processing ---");
const config = processConfig('{"name": "app"}');
console.log("Config:", config);

export {};
