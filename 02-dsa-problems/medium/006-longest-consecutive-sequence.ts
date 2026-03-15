/**
 * Longest Consecutive Sequence
 * Difficulty: Medium
 *
 * Given an unsorted array of integers nums, return the length of the
 * longest consecutive elements sequence.
 *
 * You must write an algorithm that runs in O(n) time.
 *
 * Example 1:
 * Input: nums = [100,4,200,1,3,2]
 * Output: 4
 * Explanation: The longest consecutive elements sequence is [1, 2, 3, 4].
 * Therefore its length is 4.
 *
 * Example 2:
 * Input: nums = [0,3,7,2,5,8,4,6,0,1]
 * Output: 9
 * Explanation: The longest consecutive sequence is [0,1,2,3,4,5,6,7,8].
 *
 * Constraints:
 * - 0 <= nums.length <= 10^5
 * - -10^9 <= nums[i] <= 10^9
 */

/**
 * Hash Set with Sequence Start Detection - O(n) time, O(n) space
 *
 * Key insight: Only start counting from the BEGINNING of a sequence.
 * A number is a sequence start if (num - 1) doesn't exist in the set.
 *
 * Why this is O(n) and not O(n²):
 * - Each number is visited at most twice:
 *   1. Once when checking if it's a sequence start
 *   2. Once when extending from its sequence's start
 * - The while loop only runs for actual sequence members, not for every number
 *
 * Algorithm:
 * 1. Put all numbers in a hash set (O(n), also removes duplicates)
 * 2. For each number in the set:
 *    - If (num - 1) exists: skip (not a sequence start)
 *    - If (num - 1) doesn't exist: this is a sequence start!
 *      - Count consecutive numbers: num, num+1, num+2, ...
 *      - Update longest if this sequence is longer
 * 3. Return the longest sequence length found
 *
 * Example walkthrough with [100, 4, 200, 1, 3, 2]:
 *   Set: {100, 4, 200, 1, 3, 2}
 *
 *   num = 100:
 *     Is 99 in set? No → sequence start!
 *     Count: 100 (is 101 in set? No) → length = 1
 *     longest = 1
 *
 *   num = 4:
 *     Is 3 in set? Yes → skip (not a sequence start)
 *
 *   num = 200:
 *     Is 199 in set? No → sequence start!
 *     Count: 200 (is 201 in set? No) → length = 1
 *     longest = 1
 *
 *   num = 1:
 *     Is 0 in set? No → sequence start!
 *     Count: 1 → 2 → 3 → 4 (is 5 in set? No) → length = 4
 *     longest = 4
 *
 *   num = 3:
 *     Is 2 in set? Yes → skip (not a sequence start)
 *
 *   num = 2:
 *     Is 1 in set? Yes → skip (not a sequence start)
 *
 *   Result: 4
 */
function longestConsecutive(nums: number[]): number {
  // Set enables O(1) lookups and removes duplicates
  const numSet = new Set(nums);
  let longest = 0;

  for (const num of numSet) {
    // Key insight: only start from sequence beginnings (no left neighbor)
    // This ensures each sequence is counted exactly once -> O(n) total
    if (!numSet.has(num - 1)) {
      let currentNum = num;
      let currentStreak = 1;

      // Extend right as long as consecutive numbers exist
      while (numSet.has(currentNum + 1)) {
        currentNum++;
        currentStreak++;
      }

      longest = Math.max(longest, currentStreak);
    }
  }

  return longest;
}

// Test cases
console.log("Longest Consecutive Sequence");
console.log("============================\n");

console.log("longestConsecutive([100,4,200,1,3,2]):", longestConsecutive([100, 4, 200, 1, 3, 2])); // 4 (sequence: 1,2,3,4)
console.log("longestConsecutive([0,3,7,2,5,8,4,6,0,1]):", longestConsecutive([0, 3, 7, 2, 5, 8, 4, 6, 0, 1])); // 9 (sequence: 0-8)
console.log("longestConsecutive([]):", longestConsecutive([])); // 0
console.log("longestConsecutive([1]):", longestConsecutive([1])); // 1

export {}
