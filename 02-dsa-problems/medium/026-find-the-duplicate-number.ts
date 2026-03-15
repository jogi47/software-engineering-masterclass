/**
 * Find The Duplicate Number
 * Difficulty: Medium
 *
 * Given an array of integers nums containing n + 1 integers where each integer
 * is in the range [1, n] inclusive.
 *
 * There is only one repeated number in nums, return this repeated number.
 *
 * You must solve the problem without modifying the array nums and using only
 * constant extra space.
 *
 * Example 1:
 * Input: nums = [1,3,4,2,2]
 * Output: 2
 *
 * Example 2:
 * Input: nums = [3,1,3,4,2]
 * Output: 3
 *
 * Example 3:
 * Input: nums = [3,3,3,3,3]
 * Output: 3
 *
 * Constraints:
 * - 1 <= n <= 10^5
 * - nums.length == n + 1
 * - 1 <= nums[i] <= n
 * - All the integers in nums appear only once except for precisely one integer
 *   which appears two or more times.
 *
 * Follow up:
 * - How can we prove that at least one duplicate number must exist in nums?
 * - Can you solve the problem in linear runtime complexity?
 */

/**
 * Floyd's Cycle Detection - O(n) time, O(1) space
 *
 * Key insight: Treat the array as a linked list where nums[i] points to index nums[i].
 * Since there are n+1 numbers in range [1,n], by Pigeonhole principle, there must
 * be a duplicate. The duplicate creates a cycle in this "linked list".
 *
 * Why it forms a cycle:
 * - Each value nums[i] is a valid index (1 to n)
 * - If two indices i and j have nums[i] = nums[j] = k, both point to index k
 * - This creates a cycle starting at k
 *
 * Algorithm (same as Linked List Cycle II - find cycle start):
 * Phase 1: Find intersection point
 * - slow moves 1 step: slow = nums[slow]
 * - fast moves 2 steps: fast = nums[nums[fast]]
 * - They meet inside the cycle
 *
 * Phase 2: Find cycle entrance (the duplicate)
 * - Reset slow to start (index 0)
 * - Move both one step at a time
 * - They meet at the cycle entrance = duplicate
 *
 * Visual for nums = [1,3,4,2,2]:
 *   Index: 0 -> 1 -> 3 -> 2 -> 4
 *                    ^         |
 *                    |_________|
 *   The cycle entrance is at index 2, value 4 points to index 4, value 2.
 *   Both index 3 and index 4 have value 2, so 2 is the duplicate.
 *
 * Mathematical proof:
 * - Let F = distance from start to cycle entrance
 * - Let a = distance from entrance to meeting point (in cycle direction)
 * - Let C = cycle length
 * - slow traveled: F + a
 * - fast traveled: F + a + nC (completed n full cycles)
 * - Since fast = 2 * slow: F + a + nC = 2(F + a)
 * - Therefore: nC = F + a, meaning F = nC - a = (n-1)C + (C-a)
 * - Distance from meeting point to entrance = C - a
 * - So traveling F from start lands at same point as traveling C-a from meeting point
 */
function findDuplicate(nums: number[]): number {
  // Phase 1: Find intersection point of slow and fast
  let slow = nums[0];
  let fast = nums[0];

  do {
    slow = nums[slow]; // Move 1 step
    fast = nums[nums[fast]]; // Move 2 steps
  } while (slow !== fast);

  // Phase 2: Find entrance to cycle (the duplicate)
  slow = nums[0];
  while (slow !== fast) {
    slow = nums[slow];
    fast = nums[fast];
  }

  return slow;
}

/**
 * Binary Search on Value Range - O(n log n) time, O(1) space
 *
 * Alternative approach: Binary search on the answer.
 * For a value mid, count numbers <= mid.
 * If count > mid, duplicate is in [1, mid].
 * If count <= mid, duplicate is in [mid+1, n].
 */
function findDuplicateBinarySearch(nums: number[]): number {
  let left = 1;
  let right = nums.length - 1;

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);

    // Count numbers <= mid
    let count = 0;
    for (const num of nums) {
      if (num <= mid) count++;
    }

    // If more numbers <= mid than mid itself, duplicate is in lower half
    if (count > mid) {
      right = mid;
    } else {
      left = mid + 1;
    }
  }

  return left;
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Find The Duplicate Number");
console.log("==========================================");

// Test case 1: Duplicate at end
console.log(findDuplicate([1, 3, 4, 2, 2])); // 2

// Test case 2: Duplicate at beginning
console.log(findDuplicate([3, 1, 3, 4, 2])); // 3

// Test case 3: All same values
console.log(findDuplicate([3, 3, 3, 3, 3])); // 3

// Test case 4: Two elements
console.log(findDuplicate([1, 1])); // 1

// Test case 5: Duplicate appears twice
console.log(findDuplicate([2, 2, 2, 2, 2])); // 2

// Test case 6: Longer array
console.log(findDuplicate([1, 4, 4, 2, 4])); // 4

// Test case 7: Duplicate is the largest value
console.log(findDuplicate([1, 2, 3, 4, 4])); // 4

// Test case 8: Duplicate is 1
console.log(findDuplicate([1, 2, 1, 3, 4])); // 1

console.log("\n--- Binary Search Approach ---");
console.log(findDuplicateBinarySearch([1, 3, 4, 2, 2])); // 2
console.log(findDuplicateBinarySearch([3, 1, 3, 4, 2])); // 3

export {}
