/**
 * Combination Sum (LeetCode #39)
 * Difficulty: Medium
 *
 * Given an array of distinct integers candidates and a target integer target,
 * return a list of all unique combinations of candidates where the chosen
 * numbers sum to target. You may return the combinations in any order.
 *
 * The same number may be chosen from candidates an unlimited number of times.
 * Two combinations are unique if the frequency of at least one of the chosen
 * numbers is different.
 *
 * Example 1:
 * Input: candidates = [2,3,6,7], target = 7
 * Output: [[2,2,3],[7]]
 * Explanation:
 * 2 and 3 are candidates, and 2 + 2 + 3 = 7.
 * 7 is a candidate, and 7 = 7.
 * These are the only two combinations.
 *
 * Example 2:
 * Input: candidates = [2,3,5], target = 8
 * Output: [[2,2,2,2],[2,3,3],[3,5]]
 *
 * Example 3:
 * Input: candidates = [2], target = 1
 * Output: []
 *
 * Constraints:
 * - 1 <= candidates.length <= 30
 * - 2 <= candidates[i] <= 40
 * - All elements of candidates are distinct
 * - 1 <= target <= 40
 */

/**
 * Algorithm: Backtracking with Pick/Skip Decision Tree
 *
 * Time Complexity: O(2^(t/m)) where t = target, m = minimum candidate
 *                  Binary decision at each node, depth = t/m
 * Space Complexity: O(t/m) - Maximum recursion depth
 *
 * Key Insight:
 * At each step, we make a binary decision for the current candidate:
 * 1. PICK: Include candidates[i], stay at same index (can reuse)
 * 2. SKIP: Don't include, move to index i+1 (try next candidate)
 *
 * To avoid duplicates:
 * - We maintain an index and only consider candidates from index onwards
 * - This ensures [2,3] and [3,2] aren't both generated (only [2,3])
 *
 * Example trace for candidates = [2,3,6,7], target = 7:
 *
 * dfs(0, 7):
 *   PICK 2: dfs(0, 5)
 *     PICK 2: dfs(0, 3)
 *       PICK 2: dfs(0, 1)
 *         PICK 2: dfs(0, -1) -> remaining < 0, return
 *         SKIP 2: dfs(1, 1)
 *           PICK 3: dfs(1, -2) -> remaining < 0, return
 *           SKIP 3: dfs(2, 1)
 *             PICK 6: dfs(2, -5) -> remaining < 0, return
 *             SKIP 6: dfs(3, 1)
 *               PICK 7: dfs(3, -6) -> remaining < 0, return
 *               SKIP 7: dfs(4, 1) -> index out of bounds, return
 *       SKIP 2: dfs(1, 3)
 *         PICK 3: dfs(1, 0) -> FOUND [2,2,3]
 *         ...
 *   SKIP 2: dfs(1, 7)
 *     ...
 *     eventually finds [7]
 */

function combinationSum(candidates: number[], target: number): number[][] {
  const result: number[][] = [];
  const current: number[] = [];

  function dfs(index: number, remaining: number): void {
    // Found a valid combination
    if (remaining === 0) {
      result.push([...current]);
      return;
    }

    // Base case: out of bounds or exceeded target
    if (index >= candidates.length || remaining < 0) {
      return;
    }

    // PICK: Include candidates[index], stay at same index (can reuse)
    current.push(candidates[index]);
    dfs(index, remaining - candidates[index]);
    current.pop();

    // SKIP: Don't include, move to next candidate
    dfs(index + 1, remaining);
  }

  dfs(0, target);
  return result;
}

/**
 * Optimized version: Sort candidates first to enable early termination
 */
function combinationSumOptimized(
  candidates: number[],
  target: number
): number[][] {
  const result: number[][] = [];
  const current: number[] = [];

  // Sort for early termination
  candidates.sort((a, b) => a - b);

  function dfs(index: number, remaining: number): void {
    if (remaining === 0) {
      result.push([...current]);
      return;
    }

    // Base case: out of bounds
    if (index >= candidates.length) {
      return;
    }

    // Early termination: if current candidate > remaining,
    // all subsequent candidates will also be > remaining (sorted)
    if (candidates[index] > remaining) {
      return;
    }

    // PICK: Include candidates[index], stay at same index (can reuse)
    current.push(candidates[index]);
    dfs(index, remaining - candidates[index]);
    current.pop();

    // SKIP: Don't include, move to next candidate
    dfs(index + 1, remaining);
  }

  dfs(0, target);
  return result;
}

// Test cases
console.log(JSON.stringify(combinationSum([2, 3, 6, 7], 7)));
// Expected: [[2,2,3],[7]]

console.log(JSON.stringify(combinationSum([2, 3, 5], 8)));
// Expected: [[2,2,2,2],[2,3,3],[3,5]]

console.log(JSON.stringify(combinationSum([2], 1)));
// Expected: []

console.log(JSON.stringify(combinationSum([1], 1)));
// Expected: [[1]]

console.log(JSON.stringify(combinationSum([1], 2)));
// Expected: [[1,1]]

console.log("\nOptimized version:");
console.log(JSON.stringify(combinationSumOptimized([2, 3, 6, 7], 7)));
// Expected: [[2,2,3],[7]]

export {};
