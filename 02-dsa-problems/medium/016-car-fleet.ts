/**
 * Car Fleet
 * Difficulty: Medium
 *
 * There are n cars at given miles away from the starting mile 0, traveling to reach
 * the mile target.
 *
 * You are given two integer arrays position and speed, both of length n, where
 * position[i] is the starting mile of the ith car and speed[i] is the speed of
 * the ith car in miles per hour.
 *
 * A car cannot pass another car, but it can catch up and then travel at the same
 * speed as the car ahead. The faster car will slow down to match the slower car.
 *
 * A car fleet is a non-empty set of cars driving at the same position and same
 * speed. A single car is also a car fleet.
 *
 * If a car catches up to a car fleet at the mile target, it will still be
 * considered one fleet.
 *
 * Return the number of car fleets that will arrive at the target.
 *
 * Example 1:
 * Input: target = 12, position = [10,8,0,5,3], speed = [2,4,1,1,3]
 * Output: 3
 * Explanation:
 * - Cars starting at 10 and 8 become a fleet, meeting at 12 (arrival time 1 hour)
 * - Car starting at 0 never catches up (arrival time 12 hours)
 * - Cars starting at 5 and 3 become a fleet, meeting at 6 (then 6 hours to target)
 *
 * Example 2:
 * Input: target = 10, position = [3], speed = [3]
 * Output: 1
 * Explanation: There is only one car, hence there is only one fleet.
 *
 * Example 3:
 * Input: target = 100, position = [0,2,4], speed = [4,2,1]
 * Output: 1
 * Explanation: All cars form one fleet.
 *
 * Constraints:
 * - n == position.length == speed.length
 * - 1 <= n <= 10^5
 * - 0 < target <= 10^6
 * - 0 <= position[i] < target
 * - 0 < speed[i] <= 10^6
 */

/**
 * Stack-based approach - O(n log n) time, O(n) space
 *
 * Key insight: A car closer to target can block cars behind it.
 * If a car behind reaches the target faster (smaller arrival time),
 * it will catch up and form a fleet with the car ahead.
 *
 * Algorithm:
 * 1. Calculate arrival time for each car: (target - position) / speed
 * 2. Sort cars by position in DESCENDING order (closest to target first)
 * 3. Use a stack to track distinct fleets (by arrival time)
 * 4. For each car (from closest to farthest):
 *    - If its arrival time > stack top: it's a new fleet (push)
 *    - If its arrival time <= stack top: it catches up (joins existing fleet)
 * 5. Return stack size (number of distinct fleets)
 *
 * Why sort by position descending?
 * - Cars ahead determine if cars behind catch up
 * - A slower car ahead will "block" faster cars behind it
 * - We process from front to back to determine fleet formations
 *
 * Example walkthrough with target=12, pos=[10,8,0,5,3], speed=[2,4,1,1,3]:
 *
 * Calculate arrival times:
 * - Car at 10: (12-10)/2 = 1.0 hour
 * - Car at 8:  (12-8)/4  = 1.0 hour
 * - Car at 0:  (12-0)/1  = 12.0 hours
 * - Car at 5:  (12-5)/1  = 7.0 hours
 * - Car at 3:  (12-3)/3  = 3.0 hours
 *
 * Sort by position descending: [(10,1.0), (8,1.0), (5,7.0), (3,3.0), (0,12.0)]
 *
 * Process:
 * - (10, 1.0): stack empty -> push 1.0 -> stack: [1.0]
 * - (8, 1.0):  1.0 <= 1.0 -> catches up, same fleet -> stack: [1.0]
 * - (5, 7.0):  7.0 > 1.0 -> new fleet -> push 7.0 -> stack: [1.0, 7.0]
 * - (3, 3.0):  3.0 <= 7.0 -> catches up to 5's fleet -> stack: [1.0, 7.0]
 * - (0, 12.0): 12.0 > 7.0 -> new fleet -> push 12.0 -> stack: [1.0, 7.0, 12.0]
 *
 * Result: 3 fleets
 */
function carFleet(target: number, position: number[], speed: number[]): number {
  const n = position.length;

  // Create array of [position, arrivalTime] and sort by position descending
  const cars: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const arrivalTime = (target - position[i]) / speed[i];
    cars.push([position[i], arrivalTime]);
  }

  // Sort by position in descending order (closest to target first)
  cars.sort((a, b) => b[0] - a[0]);

  // Stack stores arrival times of distinct fleets
  const stack: number[] = [];

  for (const [, arrivalTime] of cars) {
    if (stack.length === 0 || arrivalTime > stack[stack.length - 1]) {
      // New fleet: either first car or slower than fleet ahead
      stack.push(arrivalTime);
    }
    // If arrivalTime <= stack top: car catches up to fleet ahead (no push)
  }

  return stack.length;
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Car Fleet");
console.log("==========================================");

// Test case 1: Main example
console.log(carFleet(12, [10, 8, 0, 5, 3], [2, 4, 1, 1, 3])); // Expected: 3

// Test case 2: Single car
console.log(carFleet(10, [3], [3])); // Expected: 1

// Test case 3: All cars form one fleet
console.log(carFleet(100, [0, 2, 4], [4, 2, 1])); // Expected: 1

// Test case 4: No car catches up (all become separate fleets)
console.log(carFleet(10, [6, 8], [3, 2])); // Expected: 2
// Car at 6: (10-6)/3 = 1.33 hours
// Car at 8: (10-8)/2 = 1.0 hours
// Car at 8 arrives first, car at 6 is behind and slower

// Test case 5: Two cars, one catches up
console.log(carFleet(10, [0, 4], [2, 1])); // Expected: 1
// Car at 0: (10-0)/2 = 5.0 hours
// Car at 4: (10-4)/1 = 6.0 hours
// Car at 0 catches up to car at 4

// Test case 6: Cars at same position
console.log(carFleet(10, [5, 5], [1, 2])); // Expected: 1

// Test case 7: Multiple distinct fleets
console.log(carFleet(10, [0, 2, 5, 7], [1, 2, 1, 1])); // Expected: 3
// Car at 7: 3.0 hours
// Car at 5: 5.0 hours -> new fleet
// Car at 2: 4.0 hours -> catches up to 5's fleet
// Car at 0: 10.0 hours -> new fleet

export {}
