/**
 * Find Minimum In Rotated Sorted Array
 * Difficulty: Medium
 *
 * Suppose an array of length n sorted in ascending order is rotated between 1 and n times.
 * For example, the array nums = [0,1,2,4,5,6,7] might become:
 * - [4,5,6,7,0,1,2] if it was rotated 4 times.
 * - [0,1,2,4,5,6,7] if it was rotated 7 times.
 *
 * Notice that rotating an array [a[0], a[1], a[2], ..., a[n-1]] 1 time results in
 * the array [a[n-1], a[0], a[1], a[2], ..., a[n-2]].
 *
 * Given the sorted rotated array nums of unique elements, return the minimum element
 * of this array.
 *
 * You must write an algorithm that runs in O(log n) time.
 *
 * Example 1:
 * Input: nums = [3,4,5,1,2]
 * Output: 1
 * Explanation: The original array was [1,2,3,4,5] rotated 3 times.
 *
 * Example 2:
 * Input: nums = [4,5,6,7,0,1,2]
 * Output: 0
 * Explanation: The original array was [0,1,2,4,5,6,7] and it was rotated 4 times.
 *
 * Example 3:
 * Input: nums = [11,13,15,17]
 * Output: 11
 * Explanation: The original array was [11,13,15,17] and it was rotated 4 times.
 *
 * Constraints:
 * - n == nums.length
 * - 1 <= n <= 5000
 * - -5000 <= nums[i] <= 5000
 * - All the integers of nums are unique.
 * - nums is sorted and rotated between 1 and n times.
 */

/**
 * Binary Search - O(log n) time, O(1) space
 *
 * Key insight: In a rotated sorted array, the minimum element is at the
 * "rotation point" - where the array wraps around.
 *
 * Property: If we compare mid with right:
 * - If nums[mid] > nums[right]: rotation point is in right half (mid+1 to right)
 * - If nums[mid] < nums[right]: rotation point is in left half (left to mid)
 * - If nums[mid] === nums[right]: only possible when mid === right (single element)
 *
 * Why compare with right, not left?
 * - Comparing with left doesn't tell us which half has the minimum
 * - Example: [3,4,5,1,2] -> nums[mid]=5 > nums[left]=3, but min is in right half
 *
 * Visual representation:
 *   [4, 5, 6, 7, 0, 1, 2]
 *          /\
 *         /  \
 *        /    \
 *    larger   smaller
 *
 * The minimum is where the "cliff" drops from larger to smaller.
 *
 * Algorithm:
 * 1. Initialize left = 0, right = n - 1
 * 2. While left < right:
 *    - mid = (left + right) / 2
 *    - If nums[mid] > nums[right]: min is in [mid+1, right]
 *    - Else: min is in [left, mid] (mid could be the minimum)
 * 3. Return nums[left] (left === right at this point)
 *
 * Example walkthrough with [4,5,6,7,0,1,2]:
 *   left=0, right=6, mid=3 -> nums[3]=7 > nums[6]=2 -> left=4
 *   left=4, right=6, mid=5 -> nums[5]=1 < nums[6]=2 -> right=5
 *   left=4, right=5, mid=4 -> nums[4]=0 < nums[5]=1 -> right=4
 *   left=4, right=4 -> exit loop -> return nums[4]=0
 */
function findMin(nums: number[]): number {
  let left = 0;
  let right = nums.length - 1;

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);

    if (nums[mid] > nums[right]) {
      // Minimum is in the right half (after mid)
      // The "cliff" (rotation point) is somewhere to the right
      left = mid + 1;
    } else {
      // Minimum is in the left half (including mid)
      // mid could be the minimum, so don't exclude it
      right = mid;
    }
  }

  // left === right, pointing to the minimum element
  return nums[left];
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Find Minimum In Rotated Sorted Array");
console.log("==========================================");

// Test case 1: Rotated 3 times
console.log(findMin([3, 4, 5, 1, 2])); // Expected: 1

// Test case 2: Rotated 4 times
console.log(findMin([4, 5, 6, 7, 0, 1, 2])); // Expected: 0

// Test case 3: Not rotated (or rotated n times)
console.log(findMin([11, 13, 15, 17])); // Expected: 11

// Test case 4: Rotated once
console.log(findMin([2, 1])); // Expected: 1

// Test case 5: Single element
console.log(findMin([1])); // Expected: 1

// Test case 6: Rotated n-1 times (minimum at position 1)
console.log(findMin([2, 3, 4, 5, 1])); // Expected: 1

// Test case 7: Three elements
console.log(findMin([3, 1, 2])); // Expected: 1

// Test case 8: Minimum at the beginning
console.log(findMin([1, 2, 3])); // Expected: 1

// Test case 9: Minimum at the end
console.log(findMin([2, 3, 1])); // Expected: 1

// Test case 10: Larger array
console.log(findMin([6, 7, 8, 9, 10, 1, 2, 3, 4, 5])); // Expected: 1

// Test case 11: Negative numbers
console.log(findMin([1, 2, -5, -4, -3])); // Expected: -5

export {}
