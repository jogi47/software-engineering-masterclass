/**
 * Trapping Rain Water
 * Difficulty: Hard
 *
 * Given n non-negative integers representing an elevation map where the width of each bar is 1,
 * compute how much water it can trap after raining.
 *
 * Example 1:
 * Input: height = [0,1,0,2,1,0,1,3,2,1,2,1]
 * Output: 6
 * Explanation: The above elevation map (black section) is represented by array
 * [0,1,0,2,1,0,1,3,2,1,2,1]. In this case, 6 units of rain water (blue section) are trapped.
 *
 * Example 2:
 * Input: height = [4,2,0,3,2,5]
 * Output: 9
 *
 * Constraints:
 * - n == height.length
 * - 1 <= n <= 2 * 10^4
 * - 0 <= height[i] <= 10^5
 */

/**
 * Two-pointer approach - O(n) time, O(1) space
 *
 * Key insight: Water trapped at any position depends on:
 * - maxLeft: maximum height to the left of current position
 * - maxRight: maximum height to the right of current position
 * - Water at position i = min(maxLeft, maxRight) - height[i]
 *
 * The water level at any position is bounded by the SHORTER of the two walls
 * (left max and right max). Water will overflow from the shorter side.
 *
 * Two-pointer optimization:
 * - We don't need to know both maxLeft and maxRight at every position
 * - We only need to know which side is the bottleneck
 * - If maxLeft < maxRight, process from left (water bounded by maxLeft)
 * - If maxRight <= maxLeft, process from right (water bounded by maxRight)
 *
 * Algorithm:
 * 1. Initialize left=0, right=n-1, maxLeft=0, maxRight=0
 * 2. If height[left] < height[right]:
 *    - If height[left] >= maxLeft: update maxLeft (no water here, it's a new peak)
 *    - Else: add water (maxLeft - height[left]) and move left++
 * 3. Else:
 *    - If height[right] >= maxRight: update maxRight (no water here, it's a new peak)
 *    - Else: add water (maxRight - height[right]) and move right--
 * 4. Repeat until left meets right
 *
 * Example walkthrough with [0,1,0,2,1,0,1,3,2,1,2,1]:
 *
 * Visual representation:
 *        #
 *    #   ##
 *    # # ####
 *  # ########
 * 0123456789...
 *
 * Step-by-step:
 * left=0, right=11, maxL=0, maxR=0
 *   h[0]=0 < h[11]=1: process left
 *     h[0]=0 >= maxL=0: maxL=0 (no water at edge)
 *     left=1
 * left=1, right=11, maxL=0, maxR=0
 *   h[1]=1 >= h[11]=1: process right
 *     h[11]=1 >= maxR=0: maxR=1
 *     right=10
 * ...continues...
 * Total water = 6
 */
function trap(height: number[]): number {
  if (height.length < 3) {
    // Need at least 3 bars to trap any water
    return 0;
  }

  let left = 0;
  let right = height.length - 1;
  let maxLeft = 0;
  let maxRight = 0;
  let totalWater = 0;

  while (left < right) {
    if (height[left] < height[right]) {
      // Left side is the bottleneck - process from left
      if (height[left] >= maxLeft) {
        // Current bar is taller than or equal to maxLeft
        // Update maxLeft - no water trapped here (it's a peak)
        maxLeft = height[left];
      } else {
        // Water can be trapped at this position
        // Water level is bounded by maxLeft (the bottleneck)
        totalWater += maxLeft - height[left];
      }
      left++;
    } else {
      // Right side is the bottleneck - process from right
      if (height[right] >= maxRight) {
        // Current bar is taller than or equal to maxRight
        // Update maxRight - no water trapped here (it's a peak)
        maxRight = height[right];
      } else {
        // Water can be trapped at this position
        // Water level is bounded by maxRight (the bottleneck)
        totalWater += maxRight - height[right];
      }
      right--;
    }
  }

  return totalWater;
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Trapping Rain Water");
console.log("==========================================");

// Test case 1: Classic example
console.log(trap([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1])); // Expected: 6

// Test case 2: Another example
console.log(trap([4, 2, 0, 3, 2, 5])); // Expected: 9

// Test case 3: No water can be trapped (ascending)
console.log(trap([1, 2, 3, 4, 5])); // Expected: 0

// Test case 4: No water can be trapped (descending)
console.log(trap([5, 4, 3, 2, 1])); // Expected: 0

// Test case 5: Single valley
console.log(trap([3, 0, 3])); // Expected: 3

// Test case 6: Empty or single element
console.log(trap([5])); // Expected: 0

// Test case 7: Two elements (can't trap water)
console.log(trap([2, 5])); // Expected: 0

// Test case 8: Flat surface
console.log(trap([3, 3, 3, 3])); // Expected: 0

export {}
