/**
 * Search In Rotated Sorted Array
 * Difficulty: Medium
 *
 * There is an integer array nums sorted in ascending order (with distinct values).
 *
 * Prior to being passed to your function, nums is possibly rotated at an unknown
 * pivot index k (1 <= k < nums.length) such that the resulting array is
 * [nums[k], nums[k+1], ..., nums[n-1], nums[0], nums[1], ..., nums[k-1]] (0-indexed).
 * For example, [0,1,2,4,5,6,7] might be rotated at pivot index 3 and become [4,5,6,7,0,1,2].
 *
 * Given the array nums after the possible rotation and an integer target, return the
 * index of target if it is in nums, or -1 if it is not in nums.
 *
 * You must write an algorithm with O(log n) runtime complexity.
 *
 * Example 1:
 * Input: nums = [4,5,6,7,0,1,2], target = 0
 * Output: 4
 *
 * Example 2:
 * Input: nums = [4,5,6,7,0,1,2], target = 3
 * Output: -1
 *
 * Example 3:
 * Input: nums = [1], target = 0
 * Output: -1
 *
 * Constraints:
 * - 1 <= nums.length <= 5000
 * - -10^4 <= nums[i] <= 10^4
 * - All values of nums are unique.
 * - nums is an ascending array that is possibly rotated.
 * - -10^4 <= target <= 10^4
 */

/**
 * Binary Search - O(log n) time, O(1) space
 *
 * Key insight: In a rotated sorted array, at least one half (left or right
 * of mid) is always sorted. We can determine which half is sorted and
 * whether the target lies within that sorted half.
 *
 * How to identify the sorted half:
 * - If nums[left] <= nums[mid]: left half [left, mid] is sorted
 * - Else: right half [mid, right] is sorted
 *
 * Once we know which half is sorted, check if target is in that range:
 * - If target is in the sorted half: search there
 * - Else: search the other half
 *
 * Algorithm:
 * 1. Initialize left = 0, right = n - 1
 * 2. While left <= right:
 *    - mid = (left + right) / 2
 *    - If nums[mid] === target: return mid
 *    - If left half is sorted (nums[left] <= nums[mid]):
 *      - If target in [nums[left], nums[mid]): search left
 *      - Else: search right
 *    - Else (right half is sorted):
 *      - If target in (nums[mid], nums[right]]: search right
 *      - Else: search left
 * 3. Return -1 if not found
 *
 * Example walkthrough with [4,5,6,7,0,1,2], target = 0:
 *   left=0, right=6, mid=3
 *     nums[0]=4 <= nums[3]=7 -> left half sorted
 *     target=0 not in [4,7] -> search right, left=4
 *   left=4, right=6, mid=5
 *     nums[4]=0 <= nums[5]=1 -> left half sorted
 *     target=0 in [0,1] -> search left, right=5
 *   left=4, right=5, mid=4
 *     nums[4]=0 === target -> return 4
 */
function searchRotated(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length - 1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);

    if (nums[mid] === target) {
      return mid;
    }

    // Determine which half is sorted
    if (nums[left] <= nums[mid]) {
      // Left half [left, mid] is sorted
      if (nums[left] <= target && target < nums[mid]) {
        // Target is in the sorted left half
        right = mid - 1;
      } else {
        // Target is in the right half
        left = mid + 1;
      }
    } else {
      // Right half [mid, right] is sorted
      if (nums[mid] < target && target <= nums[right]) {
        // Target is in the sorted right half
        left = mid + 1;
      } else {
        // Target is in the left half
        right = mid - 1;
      }
    }
  }

  return -1;
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Search In Rotated Sorted Array");
console.log("==========================================");

// Test case 1: Target in right portion
console.log(searchRotated([4, 5, 6, 7, 0, 1, 2], 0)); // Expected: 4

// Test case 2: Target not found
console.log(searchRotated([4, 5, 6, 7, 0, 1, 2], 3)); // Expected: -1

// Test case 3: Single element - not found
console.log(searchRotated([1], 0)); // Expected: -1

// Test case 4: Single element - found
console.log(searchRotated([1], 1)); // Expected: 0

// Test case 5: Target in left portion
console.log(searchRotated([4, 5, 6, 7, 0, 1, 2], 5)); // Expected: 1

// Test case 6: Target is first element
console.log(searchRotated([4, 5, 6, 7, 0, 1, 2], 4)); // Expected: 0

// Test case 7: Target is last element
console.log(searchRotated([4, 5, 6, 7, 0, 1, 2], 2)); // Expected: 6

// Test case 8: Not rotated array
console.log(searchRotated([1, 2, 3, 4, 5], 3)); // Expected: 2

// Test case 9: Two elements - rotated
console.log(searchRotated([2, 1], 1)); // Expected: 1

// Test case 10: Two elements - not rotated
console.log(searchRotated([1, 2], 2)); // Expected: 1

// Test case 11: Target at rotation point
console.log(searchRotated([6, 7, 1, 2, 3, 4, 5], 1)); // Expected: 2

// Test case 12: Larger array
console.log(searchRotated([8, 9, 10, 1, 2, 3, 4, 5, 6, 7], 6)); // Expected: 8

export {}
