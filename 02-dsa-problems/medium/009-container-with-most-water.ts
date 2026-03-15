/**
 * Container With Most Water
 * Difficulty: Medium
 *
 * You are given an integer array height of length n. There are n vertical lines drawn such
 * that the two endpoints of the ith line are (i, 0) and (i, height[i]).
 *
 * Find two lines that together with the x-axis form a container, such that the container
 * contains the most water.
 *
 * Return the maximum amount of water a container can store.
 *
 * Notice that you may not slant the container.
 *
 * Example 1:
 * Input: height = [1,8,6,2,5,4,8,3,7]
 * Output: 49
 * Explanation: The above vertical lines are represented by array [1,8,6,2,5,4,8,3,7].
 * In this case, the max area of water the container can contain is 49 (between index 1 and 8).
 * Area = min(8, 7) * (8 - 1) = 7 * 7 = 49
 *
 * Example 2:
 * Input: height = [1,1]
 * Output: 1
 * Explanation: Area = min(1, 1) * (1 - 0) = 1 * 1 = 1
 *
 * Constraints:
 * - n == height.length
 * - 2 <= n <= 10^5
 * - 0 <= height[i] <= 10^4
 */

/**
 * Two-pointer approach - O(n) time, O(1) space
 *
 * Key insight: The area is determined by:
 * - Width: distance between two lines (right - left)
 * - Height: the shorter of the two lines (bottleneck)
 *
 * Area = min(height[left], height[right]) * (right - left)
 *
 * Strategy: Start with the widest container (maximum width), then try to find
 * a taller container by moving pointers inward.
 *
 * Why move the shorter line?
 * - Moving the taller line can only decrease or maintain the area
 *   (width decreases, and height is still limited by the shorter line)
 * - Moving the shorter line might find a taller line that increases area
 *   (even though width decreases, height might increase enough to compensate)
 *
 * Example walkthrough with [1,8,6,2,5,4,8,3,7]:
 * left=0 (h=1), right=8 (h=7): area=min(1,7)*8=8, maxArea=8
 *   height[0]=1 < height[8]=7, move left
 * left=1 (h=8), right=8 (h=7): area=min(8,7)*7=49, maxArea=49
 *   height[1]=8 > height[8]=7, move right
 * left=1 (h=8), right=7 (h=3): area=min(8,3)*6=18, maxArea=49
 *   height[1]=8 > height[7]=3, move right
 * ...continue...
 */
function maxArea(height: number[]): number {
  let left = 0;
  let right = height.length - 1;
  let maxArea = 0;

  while (left < right) {
    // Calculate current area
    const width = right - left;
    const currentHeight = Math.min(height[left], height[right]);
    const area = width * currentHeight;

    // Update maximum area if current is larger
    maxArea = Math.max(maxArea, area);

    // Move the pointer with smaller height
    // Moving the taller one would only decrease width without potentially increasing height
    if (height[left] < height[right]) {
      left++;
    } else {
      right--;
    }
  }

  return maxArea;
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Container With Most Water");
console.log("==========================================");

// Test case 1: Classic example
console.log(maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7])); // Expected: 49

// Test case 2: Minimum length array
console.log(maxArea([1, 1])); // Expected: 1

// Test case 3: Decreasing heights
console.log(maxArea([4, 3, 2, 1, 4])); // Expected: 16

// Test case 4: Increasing heights
console.log(maxArea([1, 2, 4, 3])); // Expected: 4

// Test case 5: All same heights
console.log(maxArea([5, 5, 5, 5])); // Expected: 15

// Test case 6: Large difference in heights
console.log(maxArea([1, 2, 1])); // Expected: 2

export {}
