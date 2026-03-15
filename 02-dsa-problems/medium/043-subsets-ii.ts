/**
 * Subsets II (LeetCode #90)
 * Difficulty: Medium
 *
 * Given an integer array nums that may contain duplicates, return all
 * possible subsets (the power set).
 *
 * The solution set must not contain duplicate subsets. Return the solution
 * in any order.
 *
 * Example 1:
 * Input: nums = [1,2,2]
 * Output: [[],[1],[1,2],[1,2,2],[2],[2,2]]
 *
 * Example 2:
 * Input: nums = [0]
 * Output: [[],[0]]
 *
 * Constraints:
 * - 1 <= nums.length <= 10
 * - -10 <= nums[i] <= 10
 */

/**
 * Algorithm: Backtracking with Duplicate Handling
 *
 * Time Complexity: O(n * 2^n) - In worst case (all unique), 2^n subsets
 * Space Complexity: O(n) - Recursion depth
 *
 * Key Insight:
 * To avoid duplicate subsets, we:
 * 1. Sort the array first to bring duplicates together
 * 2. Skip duplicate elements at the same recursion level
 *
 * Why skip duplicates at same level?
 * If we have [1, 2, 2] and we're at index 1:
 * - Choosing first '2' gives us subsets starting with [1,2]
 * - Choosing second '2' would give same subsets starting with [1,2]
 * So we skip the second '2' when it comes right after first '2' at same level
 *
 * Example trace for nums = [1, 2, 2]:
 * Sorted: [1, 2, 2]
 *
 * backtrack(0, []):
 *   add []
 *   i=0: add 1 -> backtrack(1, [1])
 *     add [1]
 *     i=1: add 2 -> backtrack(2, [1,2])
 *       add [1,2]
 *       i=2: add 2 -> backtrack(3, [1,2,2])
 *         add [1,2,2]
 *       remove 2
 *     remove 2
 *     i=2: skip (nums[2]==nums[1], duplicate at same level)
 *   remove 1
 *   i=1: add 2 -> backtrack(2, [2])
 *     add [2]
 *     i=2: add 2 -> backtrack(3, [2,2])
 *       add [2,2]
 *     remove 2
 *   remove 2
 *   i=2: skip (nums[2]==nums[1], duplicate at same level)
 *
 * Result: [[], [1], [1,2], [1,2,2], [2], [2,2]]
 */

function subsetsWithDup(nums: number[]): number[][] {
  const result: number[][] = [];
  const current: number[] = [];

  // Sort to bring duplicates together
  nums.sort((a, b) => a - b);

  function dfs(index: number): void {
    // Base case: processed all elements
    if (index === nums.length) {
      result.push([...current]);
      return;
    }

    // PICK: Include nums[index]
    current.push(nums[index]);
    dfs(index + 1);
    current.pop();

    // SKIP: Don't include, AND skip all duplicates of this value
    let next = index + 1;
    while (next < nums.length && nums[next] === nums[index]) {
      next++;
    }
    dfs(next);
  }

  dfs(0);
  return result;
}

// Test cases
console.log(JSON.stringify(subsetsWithDup([1, 2, 2])));
// Expected: [[],[1],[1,2],[1,2,2],[2],[2,2]]

console.log(JSON.stringify(subsetsWithDup([0])));
// Expected: [[],[0]]

console.log(JSON.stringify(subsetsWithDup([4, 4, 4, 1, 4])));
// Expected: [[],[1],[1,4],[1,4,4],[1,4,4,4],[1,4,4,4,4],[4],[4,4],[4,4,4],[4,4,4,4]]

console.log(JSON.stringify(subsetsWithDup([1, 2, 3])));
// Expected: [[],[1],[1,2],[1,2,3],[1,3],[2],[2,3],[3]] (same as regular subsets)

export {};
