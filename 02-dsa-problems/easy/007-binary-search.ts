/**
 * Binary Search
 * Difficulty: Easy
 *
 * Given an array of integers nums which is sorted in ascending order, and an integer
 * target, write a function to search target in nums. If target exists, then return
 * its index. Otherwise, return -1.
 *
 * You must write an algorithm with O(log n) runtime complexity.
 *
 * Example 1:
 * Input: nums = [-1,0,3,5,9,12], target = 9
 * Output: 4
 * Explanation: 9 exists in nums and its index is 4
 *
 * Example 2:
 * Input: nums = [-1,0,3,5,9,12], target = 2
 * Output: -1
 * Explanation: 2 does not exist in nums so return -1
 *
 * Constraints:
 * - 1 <= nums.length <= 10^4
 * - -10^4 < nums[i], target < 10^4
 * - All the integers in nums are unique.
 * - nums is sorted in ascending order.
 */

/**
 * Classic Binary Search - O(log n) time, O(1) space
 *
 * Key insight: In a sorted array, we can eliminate half of the remaining
 * elements in each step by comparing the middle element with the target.
 *
 * Algorithm:
 * 1. Initialize left = 0, right = n - 1
 * 2. While left <= right:
 *    - Calculate mid = left + (right - left) / 2 (avoids overflow)
 *    - If nums[mid] === target: found, return mid
 *    - If nums[mid] < target: target is in right half, left = mid + 1
 *    - If nums[mid] > target: target is in left half, right = mid - 1
 * 3. If loop exits, target not found, return -1
 *
 * Why left + (right - left) / 2 instead of (left + right) / 2?
 * - Avoids integer overflow when left + right > MAX_INT
 * - In JavaScript this isn't strictly necessary but it's good practice
 *
 * Example walkthrough with nums = [-1,0,3,5,9,12], target = 9:
 *   left=0, right=5, mid=2 -> nums[2]=3 < 9 -> left=3
 *   left=3, right=5, mid=4 -> nums[4]=9 === 9 -> return 4
 *
 * Example walkthrough with nums = [-1,0,3,5,9,12], target = 2:
 *   left=0, right=5, mid=2 -> nums[2]=3 > 2 -> right=1
 *   left=0, right=1, mid=0 -> nums[0]=-1 < 2 -> left=1
 *   left=1, right=1, mid=1 -> nums[1]=0 < 2 -> left=2
 *   left=2 > right=1 -> exit loop -> return -1
 */
function search(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length - 1;

  while (left <= right) {
    // Calculate mid index (avoids overflow)
    const mid = left + Math.floor((right - left) / 2);

    if (nums[mid] === target) {
      // Found the target
      return mid;
    } else if (nums[mid] < target) {
      // Target is in the right half
      left = mid + 1;
    } else {
      // Target is in the left half
      right = mid - 1;
    }
  }

  // Target not found
  return -1;
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Binary Search");
console.log("==========================================");

// Test case 1: Target exists
console.log(search([-1, 0, 3, 5, 9, 12], 9)); // Expected: 4

// Test case 2: Target doesn't exist
console.log(search([-1, 0, 3, 5, 9, 12], 2)); // Expected: -1

// Test case 3: Target is first element
console.log(search([1, 2, 3, 4, 5], 1)); // Expected: 0

// Test case 4: Target is last element
console.log(search([1, 2, 3, 4, 5], 5)); // Expected: 4

// Test case 5: Single element - found
console.log(search([5], 5)); // Expected: 0

// Test case 6: Single element - not found
console.log(search([5], 3)); // Expected: -1

// Test case 7: Two elements - found first
console.log(search([1, 3], 1)); // Expected: 0

// Test case 8: Two elements - found second
console.log(search([1, 3], 3)); // Expected: 1

// Test case 9: Target smaller than all elements
console.log(search([2, 4, 6, 8], 1)); // Expected: -1

// Test case 10: Target larger than all elements
console.log(search([2, 4, 6, 8], 10)); // Expected: -1

// Test case 11: Negative numbers
console.log(search([-10, -5, 0, 5, 10], -5)); // Expected: 1

export {}
