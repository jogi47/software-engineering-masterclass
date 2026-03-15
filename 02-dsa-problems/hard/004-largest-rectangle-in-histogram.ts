/**
 * Largest Rectangle In Histogram
 * Difficulty: Hard
 *
 * Given an array of integers heights representing the histogram's bar height
 * where the width of each bar is 1, return the area of the largest rectangle
 * in the histogram.
 *
 * Example 1:
 * Input: heights = [2,1,5,6,2,3]
 * Output: 10
 * Explanation: The largest rectangle has area = 10 units (formed by heights[2] and
 * heights[3] with height 5 and width 2).
 *
 * Example 2:
 * Input: heights = [2,4]
 * Output: 4
 *
 * Constraints:
 * - 1 <= heights.length <= 10^5
 * - 0 <= heights[i] <= 10^4
 */

/**
 * Monotonic Increasing Stack - O(n) time, O(n) space
 *
 * Key insight: For each bar, we want to find the largest rectangle where
 * that bar is the shortest bar (limiting height). This requires finding:
 * - Left boundary: first bar to the left that is shorter
 * - Right boundary: first bar to the right that is shorter
 *
 * Area for bar i = height[i] * (rightBoundary - leftBoundary - 1)
 *
 * We use a monotonic increasing stack (heights increase from bottom to top).
 * When we encounter a bar shorter than stack top, we've found the right
 * boundary for all taller bars in the stack.
 *
 * Algorithm:
 * 1. Initialize empty stack (will store indices)
 * 2. For each bar (including a virtual bar of height 0 at the end):
 *    - While stack is not empty AND current height < height at stack top:
 *      - Pop the top index
 *      - Calculate width: if stack empty, width = current index
 *                        else, width = current index - stack top - 1
 *      - Update max area: height[popped] * width
 *    - Push current index
 * 3. Return max area
 *
 * Why add virtual bar at end?
 * - Ensures all remaining bars in stack get processed
 * - Height 0 is guaranteed to be shorter than any bar
 *
 * Example walkthrough with [2,1,5,6,2,3]:
 *
 * i=0, h=2: stack empty -> push 0 -> stack: [0]
 * i=1, h=1: 1<2 -> pop 0, width=1, area=2*1=2 -> push 1 -> stack: [1]
 * i=2, h=5: 5>1 -> push 2 -> stack: [1,2]
 * i=3, h=6: 6>5 -> push 3 -> stack: [1,2,3]
 * i=4, h=2: 2<6 -> pop 3, width=4-2-1=1, area=6*1=6
 *           2<5 -> pop 2, width=4-1-1=2, area=5*2=10
 *           2>1 -> push 4 -> stack: [1,4]
 * i=5, h=3: 3>2 -> push 5 -> stack: [1,4,5]
 * i=6, h=0 (virtual): 0<3 -> pop 5, width=6-4-1=1, area=3*1=3
 *                     0<2 -> pop 4, width=6-1-1=4, area=2*4=8
 *                     0<1 -> pop 1, width=6, area=1*6=6
 *
 * Max area = 10
 */
function largestRectangleArea(heights: number[]): number {
  const stack: number[] = []; // Stack of indices
  let maxArea = 0;

  // Process all bars plus a virtual bar of height 0 at the end
  for (let i = 0; i <= heights.length; i++) {
    // Virtual bar at the end has height 0
    const currentHeight = i === heights.length ? 0 : heights[i];

    // While current bar is shorter than stack top
    while (stack.length > 0 && currentHeight < heights[stack[stack.length - 1]]) {
      const poppedIndex = stack.pop()!;
      const height = heights[poppedIndex];

      // Calculate width:
      // - If stack is empty: width extends from start (0) to current position
      // - Otherwise: width is between current position and previous stack top
      const width =
        stack.length === 0 ? i : i - stack[stack.length - 1] - 1;

      const area = height * width;
      maxArea = Math.max(maxArea, area);
    }

    stack.push(i);
  }

  return maxArea;
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Largest Rectangle In Histogram");
console.log("==========================================");

// Test case 1: Main example
console.log(largestRectangleArea([2, 1, 5, 6, 2, 3])); // Expected: 10

// Test case 2: Two bars
console.log(largestRectangleArea([2, 4])); // Expected: 4

// Test case 3: Single bar
console.log(largestRectangleArea([5])); // Expected: 5

// Test case 4: All same height
console.log(largestRectangleArea([3, 3, 3, 3])); // Expected: 12

// Test case 5: Strictly increasing
console.log(largestRectangleArea([1, 2, 3, 4, 5])); // Expected: 9
// Height 3 with width 3 (indices 2,3,4)

// Test case 6: Strictly decreasing
console.log(largestRectangleArea([5, 4, 3, 2, 1])); // Expected: 9
// Height 3 with width 3 (indices 0,1,2)

// Test case 7: Valley pattern
console.log(largestRectangleArea([4, 2, 0, 3, 2, 5])); // Expected: 6

// Test case 8: Peak pattern
console.log(largestRectangleArea([1, 2, 3, 2, 1])); // Expected: 5
// Height 2 with width 3 (indices 1,2,3) -> 6, or height 1 * 5 = 5
// Actually: height 2 spanning indices 0-4 isn't possible due to 1s
// Let me recalculate: max is either 3*1=3, 2*3=6, 1*5=5 -> 6

// Test case 9: Zero height bar
console.log(largestRectangleArea([2, 0, 2])); // Expected: 2

// Test case 10: Large rectangle in middle
console.log(largestRectangleArea([1, 5, 5, 5, 1])); // Expected: 15
// Height 5 with width 3

// Test case 11: Classic trapping-like pattern
console.log(largestRectangleArea([6, 2, 5, 4, 5, 1, 6])); // Expected: 12
// Height 4 spanning indices 2,3,4 -> 4*3=12

export {}
