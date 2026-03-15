/**
 * 3Sum
 * Difficulty: Medium
 *
 * Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]]
 * such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.
 *
 * Notice that the solution set must not contain duplicate triplets.
 *
 * Example 1:
 * Input: nums = [-1,0,1,2,-1,-4]
 * Output: [[-1,-1,2],[-1,0,1]]
 * Explanation:
 * nums[0] + nums[1] + nums[2] = (-1) + 0 + 1 = 0.
 * nums[1] + nums[2] + nums[4] = 0 + 1 + (-1) = 0.
 * nums[0] + nums[3] + nums[4] = (-1) + 2 + (-1) = 0.
 * The distinct triplets are [-1,0,1] and [-1,-1,2].
 * Notice that the order of the output and the order of the triplets does not matter.
 *
 * Example 2:
 * Input: nums = [0,1,1]
 * Output: []
 * Explanation: The only possible triplet does not sum up to 0.
 *
 * Example 3:
 * Input: nums = [0,0,0]
 * Output: [[0,0,0]]
 * Explanation: The only possible triplet sums up to 0.
 *
 * Constraints:
 * - 3 <= nums.length <= 3000
 * - -10^5 <= nums[i] <= 10^5
 */

/**
 * Sort + Two-pointer approach - O(n^2) time, O(1) space (excluding output)
 *
 * Key insight: After sorting, for each number nums[i], we need to find two numbers
 * that sum to -nums[i]. This becomes a Two Sum II problem!
 *
 * Algorithm:
 * 1. Sort the array first
 * 2. Iterate through each element as the first number (nums[i])
 * 3. Skip duplicates for the first number to avoid duplicate triplets
 * 4. Use two-pointer technique to find pairs that sum to -nums[i]
 * 5. Skip duplicates for second and third numbers as well
 *
 * Example walkthrough with [-1,0,1,2,-1,-4]:
 * After sort: [-4,-1,-1,0,1,2]
 *
 * i=0 (val=-4): Looking for pairs summing to 4
 *   left=1, right=5: -1+2=1 < 4, move left
 *   left=2, right=5: -1+2=1 < 4, move left
 *   left=3, right=5: 0+2=2 < 4, move left
 *   left=4, right=5: 1+2=3 < 4, move left
 *   left >= right, done
 *
 * i=1 (val=-1): Looking for pairs summing to 1
 *   left=2, right=5: -1+2=1 == 1, found! [-1,-1,2]
 *   Skip duplicates, left=3, right=4
 *   left=3, right=4: 0+1=1 == 1, found! [-1,0,1]
 *
 * i=2 (val=-1): Skip! Same as previous value.
 * ...continue...
 */
function threeSum(nums: number[]): number[][] {
  const result: number[][] = [];

  // Sort the array first - this enables two-pointer technique
  nums.sort((a, b) => a - b);

  for (let i = 0; i < nums.length - 2; i++) {
    // Skip duplicates for the first number
    if (i > 0 && nums[i] === nums[i - 1]) {
      continue;
    }

    // Early termination: if smallest number is positive, no valid triplet exists
    if (nums[i] > 0) {
      break;
    }

    // Two-pointer search for pairs summing to -nums[i]
    let left = i + 1;
    let right = nums.length - 1;
    const target = -nums[i];

    while (left < right) {
      const sum = nums[left] + nums[right];

      if (sum === target) {
        result.push([nums[i], nums[left], nums[right]]);

        // Skip duplicates for the second number
        while (left < right && nums[left] === nums[left + 1]) {
          left++;
        }
        // Skip duplicates for the third number
        while (left < right && nums[right] === nums[right - 1]) {
          right--;
        }

        // Move both pointers after finding a valid triplet
        left++;
        right--;
      } else if (sum < target) {
        left++;
      } else {
        right--;
      }
    }
  }

  return result;
}

// ============ Test Cases ============
console.log("==========================================");
console.log("3Sum");
console.log("==========================================");

// Test case 1: Multiple triplets with duplicates in input
console.log(threeSum([-1, 0, 1, 2, -1, -4]));
// Expected: [[-1,-1,2],[-1,0,1]]

// Test case 2: No valid triplet
console.log(threeSum([0, 1, 1]));
// Expected: []

// Test case 3: All zeros
console.log(threeSum([0, 0, 0]));
// Expected: [[0,0,0]]

// Test case 4: No triplet possible (all positive after one negative)
console.log(threeSum([-1, 1, 1, 1]));
// Expected: []

// Test case 5: Larger array with multiple triplets
console.log(threeSum([-2, 0, 0, 2, 2]));
// Expected: [[-2,0,2]]

export {}
