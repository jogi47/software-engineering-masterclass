/**
 * Subsets (LeetCode #78)
 * Difficulty: Medium
 *
 * Given an integer array nums of unique elements, return all possible subsets
 * (the power set).
 *
 * The solution set must not contain duplicate subsets. Return the solution
 * in any order.
 *
 * Example 1:
 * Input: nums = [1,2,3]
 * Output: [[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]
 *
 * Example 2:
 * Input: nums = [0]
 * Output: [[],[0]]
 *
 * Constraints:
 * - 1 <= nums.length <= 10
 * - -10 <= nums[i] <= 10
 * - All the numbers of nums are unique
 */

/**
 * Algorithm: Backtracking
 *
 * Time Complexity: O(n * 2^n) - We generate 2^n subsets and copy each subset
 * Space Complexity: O(n) - Recursion depth (excluding output storage)
 *
 * Key Insight:
 * For each element, we have two choices: include it or exclude it.
 * This creates a binary decision tree where each path from root to leaf
 * represents a unique subset.
 *
 * Approach:
 * 1. Use backtracking to explore all combinations
 * 2. At each position, we decide to include or skip the current element
 * 3. Move to the next position and repeat
 * 4. When we've processed all elements, add the current subset to results
 *
 * Example trace for nums = [1, 2, 3]:
 *                    []
 *           /                  \
 *         [1]                   []
 *        /    \               /    \
 *      [1,2]   [1]          [2]     []
 *      /  \    /  \        /  \    /  \
 *   [1,2,3][1,2][1,3][1] [2,3][2][3] []
 */

function subsets(nums: number[]): number[][] {
  const result: number[][] = [];
  const current: number[] = [];

  function dfs(index: number): void {
    // Base case: processed all elements, add current subset
    if (index === nums.length) {
      result.push([...current]);
      return;
    }

    // PICK: Include nums[index]
    current.push(nums[index]);
    dfs(index + 1);
    current.pop();

    // SKIP: Don't include nums[index]
    dfs(index + 1);
  }

  dfs(0);
  return result;
}

/**
 * Alternative: Iterative approach using bit manipulation
 *
 * Each subset can be represented as a binary number where bit i
 * indicates whether nums[i] is included.
 * For n elements, we have 2^n possible subsets (0 to 2^n - 1).
 */
function subsetsIterative(nums: number[]): number[][] {
  const n = nums.length;
  const result: number[][] = [];

  // Generate all numbers from 0 to 2^n - 1
  for (let mask = 0; mask < (1 << n); mask++) {
    const subset: number[] = [];
    for (let i = 0; i < n; i++) {
      // Check if bit i is set
      if (mask & (1 << i)) {
        subset.push(nums[i]);
      }
    }
    result.push(subset);
  }

  return result;
}

// Test cases
console.log("Backtracking approach:");
console.log(JSON.stringify(subsets([1, 2, 3])));
// Expected: [[],[1],[1,2],[1,2,3],[1,3],[2],[2,3],[3]]

console.log(JSON.stringify(subsets([0])));
// Expected: [[],[0]]

console.log(JSON.stringify(subsets([1, 2])));
// Expected: [[],[1],[1,2],[2]]

console.log("\nIterative (bit manipulation) approach:");
console.log(JSON.stringify(subsetsIterative([1, 2, 3])));
// Expected: [[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]

console.log(JSON.stringify(subsetsIterative([0])));
// Expected: [[],[0]]

export {};
