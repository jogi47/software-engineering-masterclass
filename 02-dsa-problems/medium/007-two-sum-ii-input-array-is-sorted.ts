/**
 * Two Sum II - Input Array Is Sorted
 * Difficulty: Medium
 *
 * Given a 1-indexed array of integers numbers that is already sorted in non-decreasing order,
 * find two numbers such that they add up to a specific target number. Let these two numbers
 * be numbers[index1] and numbers[index2] where 1 <= index1 < index2 <= numbers.length.
 *
 * Return the indices of the two numbers, index1 and index2, added by one as an integer array
 * [index1, index2] of length 2.
 *
 * The tests are generated such that there is exactly one solution.
 * You may not use the same element twice.
 *
 * Your solution must use only constant extra space.
 *
 * Example 1:
 * Input: numbers = [2,7,11,15], target = 9
 * Output: [1,2]
 * Explanation: The sum of 2 and 7 is 9. Therefore, index1 = 1, index2 = 2. We return [1, 2].
 *
 * Example 2:
 * Input: numbers = [2,3,4], target = 6
 * Output: [1,3]
 * Explanation: The sum of 2 and 4 is 6. Therefore index1 = 1, index2 = 3. We return [1, 3].
 *
 * Example 3:
 * Input: numbers = [-1,0], target = -1
 * Output: [1,2]
 * Explanation: The sum of -1 and 0 is -1. Therefore index1 = 1, index2 = 2. We return [1, 2].
 *
 * Constraints:
 * - 2 <= numbers.length <= 3 * 10^4
 * - -1000 <= numbers[i] <= 1000
 * - numbers is sorted in non-decreasing order.
 * - -1000 <= target <= 1000
 * - The tests are generated such that there is exactly one solution.
 */

/**
 * Two-pointer approach - O(n) time, O(1) space
 *
 * Key insight: Since the array is sorted, we can use two pointers efficiently.
 * - If current sum is too small, we need a larger number -> move left pointer right
 * - If current sum is too large, we need a smaller number -> move right pointer left
 *
 * Algorithm:
 * 1. Initialize left pointer at start (index 0) and right pointer at end (index n-1)
 * 2. Calculate sum of numbers at both pointers
 * 3. If sum equals target, return 1-indexed positions
 * 4. If sum < target, move left pointer right (to get larger values)
 * 5. If sum > target, move right pointer left (to get smaller values)
 * 6. Repeat until solution found
 *
 * Example walkthrough with [2,7,11,15], target=9:
 * - left=0 (2), right=3 (15): sum=17 > 9, move right
 * - left=0 (2), right=2 (11): sum=13 > 9, move right
 * - left=0 (2), right=1 (7): sum=9 == 9, return [1,2]
 */
function twoSumII(numbers: number[], target: number): number[] {
  let left = 0;
  let right = numbers.length - 1;

  while (left < right) {
    const sum = numbers[left] + numbers[right];

    if (sum === target) {
      // Return 1-indexed positions
      return [left + 1, right + 1];
    } else if (sum < target) {
      // Sum is too small, need larger values -> move left pointer right
      left++;
    } else {
      // Sum is too large, need smaller values -> move right pointer left
      right--;
    }
  }

  // Problem guarantees a solution exists, but TypeScript needs a return
  return [];
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Two Sum II - Input Array Is Sorted");
console.log("==========================================");

// Test case 1: Basic case
console.log(twoSumII([2, 7, 11, 15], 9)); // Expected: [1, 2]

// Test case 2: Solution at first and last indices
console.log(twoSumII([2, 3, 4], 6)); // Expected: [1, 3]

// Test case 3: Negative numbers
console.log(twoSumII([-1, 0], -1)); // Expected: [1, 2]

// Test case 4: Larger array
console.log(twoSumII([1, 2, 3, 4, 4, 9, 56, 90], 8)); // Expected: [4, 5]

// Test case 5: All same numbers
console.log(twoSumII([1, 1, 1, 1], 2)); // Expected: [1, 2]

export {}
