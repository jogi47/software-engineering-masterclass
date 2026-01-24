/**
 * Permutations (LeetCode #46)
 * Difficulty: Medium
 *
 * Given an array nums of distinct integers, return all the possible
 * permutations. You can return the answer in any order.
 *
 * Example 1:
 * Input: nums = [1,2,3]
 * Output: [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]
 *
 * Example 2:
 * Input: nums = [0,1]
 * Output: [[0,1],[1,0]]
 *
 * Example 3:
 * Input: nums = [1]
 * Output: [[1]]
 *
 * Constraints:
 * - 1 <= nums.length <= 6
 * - -10 <= nums[i] <= 10
 * - All the integers of nums are unique
 */

/**
 * Algorithm: Backtracking with Used Array
 *
 * Time Complexity: O(n! * n) - n! permutations, each takes O(n) to copy
 * Space Complexity: O(n) - Recursion depth + used array
 *
 * Key Difference from Subsets/Combinations:
 * - In subsets, we pick elements in order (index moves forward)
 * - In permutations, any unused element can be picked at any position
 *
 * Approach:
 * 1. Use a "used" array to track which elements are already in current permutation
 * 2. At each position, try all unused elements
 * 3. When permutation length equals n, we have a complete permutation
 *
 * Example trace for nums = [1, 2, 3]:
 *
 * backtrack([]):
 *   try 1: backtrack([1])
 *     try 2: backtrack([1,2])
 *       try 3: backtrack([1,2,3]) -> FOUND!
 *     try 3: backtrack([1,3])
 *       try 2: backtrack([1,3,2]) -> FOUND!
 *   try 2: backtrack([2])
 *     try 1: backtrack([2,1])
 *       try 3: backtrack([2,1,3]) -> FOUND!
 *     try 3: backtrack([2,3])
 *       try 1: backtrack([2,3,1]) -> FOUND!
 *   try 3: backtrack([3])
 *     try 1: backtrack([3,1])
 *       try 2: backtrack([3,1,2]) -> FOUND!
 *     try 2: backtrack([3,2])
 *       try 1: backtrack([3,2,1]) -> FOUND!
 */

function permute(nums: number[]): number[][] {
  const result: number[][] = [];
  const current: number[] = [];
  const used: boolean[] = new Array(nums.length).fill(false);

  function backtrack(): void {
    // Found a complete permutation
    if (current.length === nums.length) {
      result.push([...current]);
      return;
    }

    // Try each unused element
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) {
        continue;
      }

      // Include nums[i]
      current.push(nums[i]);
      used[i] = true;

      // Recurse
      backtrack();

      // Backtrack
      current.pop();
      used[i] = false;
    }
  }

  backtrack();
  return result;
}

/**
 * Alternative: In-place swapping approach
 *
 * Instead of using a separate array, we swap elements in place.
 * For position i, we try swapping with each position j >= i.
 */
function permuteSwap(nums: number[]): number[][] {
  const result: number[][] = [];

  function backtrack(start: number): void {
    // Found a complete permutation
    if (start === nums.length) {
      result.push([...nums]);
      return;
    }

    for (let i = start; i < nums.length; i++) {
      // Swap nums[start] with nums[i]
      [nums[start], nums[i]] = [nums[i], nums[start]];

      // Recurse for next position
      backtrack(start + 1);

      // Backtrack: restore the swap
      [nums[start], nums[i]] = [nums[i], nums[start]];
    }
  }

  backtrack(0);
  return result;
}

/**
 * Alternative: Recursive insert approach
 *
 * Instead of backtracking, we build permutations by:
 * 1. Recursively getting all permutations of remaining elements
 * 2. Inserting the first element at every possible position
 *
 * Example for [1,2,3]:
 * permuteInsert([1,2,3]):
 *   permuteInsert([2,3]):
 *     permuteInsert([3]):
 *       permuteInsert([]) -> [[]]
 *       insert 3 at pos 0 -> [[3]]
 *     insert 2 at pos 0,1 -> [[2,3], [3,2]]
 *   insert 1 at pos 0,1,2 for each:
 *     [2,3] -> [1,2,3], [2,1,3], [2,3,1]
 *     [3,2] -> [1,3,2], [3,1,2], [3,2,1]
 */
function permuteInsert(nums: number[]): number[][] {
  // Base case: empty array has one permutation (empty)
  if (nums.length === 0) {
    return [[]];
  }

  // Get permutations of remaining elements (all except first)
  const perms = permuteInsert(nums.slice(1));
  const result: number[][] = [];

  // Insert first element at every position in each permutation
  for (const perm of perms) {
    for (let i = 0; i <= perm.length; i++) {
      const copy = [...perm];
      copy.splice(i, 0, nums[0]);
      result.push(copy);
    }
  }

  return result;
}

// Test cases
console.log("Using used array approach:");
console.log(JSON.stringify(permute([1, 2, 3])));
// Expected: [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]

console.log(JSON.stringify(permute([0, 1])));
// Expected: [[0,1],[1,0]]

console.log(JSON.stringify(permute([1])));
// Expected: [[1]]

console.log("\nUsing swap approach:");
console.log(JSON.stringify(permuteSwap([1, 2, 3])));
// Expected: [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,2,1],[3,1,2]]

console.log(JSON.stringify(permuteSwap([0, 1])));
// Expected: [[0,1],[1,0]]

console.log("\nUsing recursive insert approach:");
console.log(JSON.stringify(permuteInsert([1, 2, 3])));
// Expected: [[1,2,3],[2,1,3],[2,3,1],[1,3,2],[3,1,2],[3,2,1]]

console.log(JSON.stringify(permuteInsert([0, 1])));
// Expected: [[0,1],[1,0]]

export {};
