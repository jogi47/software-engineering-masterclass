/**
 * Daily Temperatures
 * Difficulty: Medium
 *
 * Given an array of integers temperatures represents the daily temperatures,
 * return an array answer such that answer[i] is the number of days you have to wait
 * after the ith day to get a warmer temperature. If there is no future day for which
 * this is possible, keep answer[i] == 0 instead.
 *
 * Example 1:
 * Input: temperatures = [73,74,75,71,69,72,76,73]
 * Output: [1,1,4,2,1,1,0,0]
 *
 * Example 2:
 * Input: temperatures = [30,40,50,60]
 * Output: [1,1,1,0]
 *
 * Example 3:
 * Input: temperatures = [30,60,90]
 * Output: [1,1,0]
 *
 * Constraints:
 * - 1 <= temperatures.length <= 10^5
 * - 30 <= temperatures[i] <= 100
 */

/**
 * Monotonic Decreasing Stack - O(n) time, O(n) space
 *
 * Key insight: We need to find the "next greater element" for each position.
 * This is a classic monotonic stack problem.
 *
 * We maintain a stack of indices where temperatures are in decreasing order.
 * When we encounter a warmer temperature, we can resolve all the days
 * in the stack that are cooler.
 *
 * Algorithm:
 * 1. Initialize result array with zeros
 * 2. Use stack to store indices of unresolved days
 * 3. For each day i:
 *    - While stack is not empty AND current temp > temp at stack top:
 *      - Pop index from stack
 *      - Set result[popped] = i - popped (days until warmer)
 *    - Push current index onto stack
 * 4. Remaining indices in stack have no warmer day (result stays 0)
 *
 * Why monotonic decreasing?
 * - We only push when current temp <= stack top temp
 * - This ensures stack always has decreasing temperatures (from bottom to top)
 * - When we find a warmer day, we resolve all cooler days waiting in stack
 *
 * Example walkthrough with [73,74,75,71,69,72,76,73]:
 *   i=0, temp=73: stack empty -> push 0 -> stack: [0]
 *   i=1, temp=74: 74>73 -> pop 0, result[0]=1-0=1 -> push 1 -> stack: [1]
 *   i=2, temp=75: 75>74 -> pop 1, result[1]=2-1=1 -> push 2 -> stack: [2]
 *   i=3, temp=71: 71<75 -> push 3 -> stack: [2,3]
 *   i=4, temp=69: 69<71 -> push 4 -> stack: [2,3,4]
 *   i=5, temp=72: 72>69 -> pop 4, result[4]=5-4=1
 *                 72>71 -> pop 3, result[3]=5-3=2
 *                 72<75 -> push 5 -> stack: [2,5]
 *   i=6, temp=76: 76>72 -> pop 5, result[5]=6-5=1
 *                 76>75 -> pop 2, result[2]=6-2=4
 *                 stack empty -> push 6 -> stack: [6]
 *   i=7, temp=73: 73<76 -> push 7 -> stack: [6,7]
 *   End: indices 6,7 remain -> result[6]=0, result[7]=0
 *   Result: [1,1,4,2,1,1,0,0]
 */
function dailyTemperatures(temperatures: number[]): number[] {
  const n = temperatures.length;
  const result: number[] = new Array(n).fill(0);
  const stack: number[] = []; // Stack of indices

  for (let i = 0; i < n; i++) {
    // While current temp is warmer than temp at stack top
    while (
      stack.length > 0 &&
      temperatures[i] > temperatures[stack[stack.length - 1]]
    ) {
      const prevIndex = stack.pop()!;
      result[prevIndex] = i - prevIndex;
    }
    // Push current index (temperature not yet resolved)
    stack.push(i);
  }

  // Remaining indices in stack have no warmer day (result already 0)
  return result;
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Daily Temperatures");
console.log("==========================================");

// Test case 1: Main example
console.log(dailyTemperatures([73, 74, 75, 71, 69, 72, 76, 73]));
// Expected: [1,1,4,2,1,1,0,0]

// Test case 2: Strictly increasing
console.log(dailyTemperatures([30, 40, 50, 60]));
// Expected: [1,1,1,0]

// Test case 3: Simple case
console.log(dailyTemperatures([30, 60, 90]));
// Expected: [1,1,0]

// Test case 4: Strictly decreasing (no warmer days)
console.log(dailyTemperatures([90, 80, 70, 60]));
// Expected: [0,0,0,0]

// Test case 5: All same temperature
console.log(dailyTemperatures([50, 50, 50, 50]));
// Expected: [0,0,0,0]

// Test case 6: Single element
console.log(dailyTemperatures([70]));
// Expected: [0]

// Test case 7: Two elements - warmer
console.log(dailyTemperatures([70, 75]));
// Expected: [1, 0]

// Test case 8: Two elements - cooler
console.log(dailyTemperatures([75, 70]));
// Expected: [0, 0]

// Test case 9: Valley pattern
console.log(dailyTemperatures([80, 60, 40, 60, 80]));
// Expected: [0, 2, 1, 1, 0]

export {}
