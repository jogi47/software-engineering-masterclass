/**
 * Product of Array Except Self
 * Difficulty: Medium
 *
 * Given an integer array nums, return an array answer such that answer[i]
 * is equal to the product of all the elements of nums except nums[i].
 *
 * The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer.
 *
 * You must write an algorithm that runs in O(n) time and without using the division operation.
 *
 * Example 1:
 * Input: nums = [1,2,3,4]
 * Output: [24,12,8,6]
 *
 * Example 2:
 * Input: nums = [-1,1,0,-3,3]
 * Output: [0,0,9,0,0]
 *
 * Constraints:
 * - 2 <= nums.length <= 10^5
 * - -30 <= nums[i] <= 30
 * - The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer.
 *
 * Follow up: Can you solve the problem in O(1) extra space complexity?
 * (The output array does not count as extra space for space complexity analysis.)
 */

/**
 * Two-Pass Prefix/Suffix Products - O(n) time, O(1) extra space
 *
 * Key insight: For each position i, we need:
 *   result[i] = (product of all elements LEFT of i) × (product of all elements RIGHT of i)
 *
 * We can compute this in two passes without division:
 * - Pass 1 (left→right): Store prefix products (product of all elements before i)
 * - Pass 2 (right→left): Multiply by suffix products (product of all elements after i)
 *
 * Algorithm:
 * 1. Initialize result array with 1s
 * 2. Pass 1 (prefix): For each i, result[i] = product of nums[0..i-1]
 * 3. Pass 2 (suffix): For each i, result[i] *= product of nums[i+1..n-1]
 *
 * Why no division?
 * - Division approach: total_product / nums[i] - fails when nums[i] = 0
 * - Prefix/suffix approach: works with any values including zeros
 *
 * Example walkthrough with nums = [1, 2, 3, 4]:
 *
 *   Pass 1 - Prefix products (left to right):
 *     i=0: result[0] = 1 (nothing to left), leftProduct = 1
 *     i=1: result[1] = 1 (prefix = 1), leftProduct = 1*1 = 1
 *     i=2: result[2] = 2 (prefix = 1*2), leftProduct = 1*2 = 2
 *     i=3: result[3] = 6 (prefix = 1*2*3), leftProduct = 2*3 = 6
 *     After pass 1: result = [1, 1, 2, 6]
 *
 *   Pass 2 - Multiply by suffix products (right to left):
 *     i=3: result[3] = 6 * 1 = 6, rightProduct = 1*4 = 4
 *     i=2: result[2] = 2 * 4 = 8, rightProduct = 4*3 = 12
 *     i=1: result[1] = 1 * 12 = 12, rightProduct = 12*2 = 24
 *     i=0: result[0] = 1 * 24 = 24, rightProduct = 24*1 = 24
 *     After pass 2: result = [24, 12, 8, 6]
 *
 *   Verification:
 *     result[0] = 2*3*4 = 24 ✓
 *     result[1] = 1*3*4 = 12 ✓
 *     result[2] = 1*2*4 = 8 ✓
 *     result[3] = 1*2*3 = 6 ✓
 */
function productExceptSelf(nums: number[]): number[] {
  const n = nums.length;
  // Initialize result array with 1s (neutral element for multiplication)
  const result: number[] = new Array(n).fill(1);

  // ========== PASS 1: LEFT TO RIGHT (Prefix Products) ==========
  // Goal: For each index i, store the product of all elements BEFORE it
  //
  // Example with nums = [1, 2, 3, 4]:
  //   i=0: result[0] = 1 (nothing to the left)
  //   i=1: result[1] = 1 (product of nums[0])
  //   i=2: result[2] = 1*2 = 2 (product of nums[0]*nums[1])
  //   i=3: result[3] = 1*2*3 = 6 (product of nums[0]*nums[1]*nums[2])
  // After pass 1: result = [1, 1, 2, 6]
  let leftProduct = 1; // Running product of elements seen so far
  for (let i = 0; i < n; i++) {
    result[i] = leftProduct; // Store product of all elements to the LEFT of i
    leftProduct *= nums[i]; // Include current element for next iteration
  }

  // ========== PASS 2: RIGHT TO LEFT (Suffix Products) ==========
  // Goal: Multiply each result[i] by the product of all elements AFTER it
  //
  // Continuing example with nums = [1, 2, 3, 4], result = [1, 1, 2, 6]:
  //   i=3: result[3] = 6 * 1 = 6 (nothing to the right)
  //   i=2: result[2] = 2 * 4 = 8 (multiply by nums[3])
  //   i=1: result[1] = 1 * 12 = 12 (multiply by nums[2]*nums[3])
  //   i=0: result[0] = 1 * 24 = 24 (multiply by nums[1]*nums[2]*nums[3])
  // Final result = [24, 12, 8, 6]
  //
  // Verification: 24 = 2*3*4, 12 = 1*3*4, 8 = 1*2*4, 6 = 1*2*3 ✓
  let rightProduct = 1; // Running product of elements seen from right
  for (let i = n - 1; i >= 0; i--) {
    result[i] *= rightProduct; // Multiply by product of all elements to the RIGHT of i
    rightProduct *= nums[i]; // Include current element for next iteration
  }

  // Why this works:
  // result[i] = (product of all left elements) × (product of all right elements)
  //           = product of all elements except nums[i]
  //
  // Time: O(n) - two passes through array
  // Space: O(1) - only using output array (not counting it as extra space per problem)
  return result;
}

// Test cases
console.log("Product of Array Except Self");
console.log("============================\n");

console.log("productExceptSelf([1,2,3,4]):", productExceptSelf([1, 2, 3, 4])); // [24,12,8,6]
console.log("productExceptSelf([-1,1,0,-3,3]):", productExceptSelf([-1, 1, 0, -3, 3])); // [0,0,9,0,0]
console.log("productExceptSelf([2,3]):", productExceptSelf([2, 3])); // [3,2]

export {}
