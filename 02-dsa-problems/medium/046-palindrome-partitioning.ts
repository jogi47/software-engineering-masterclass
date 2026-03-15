/**
 * Palindrome Partitioning (LeetCode #131)
 * Difficulty: Medium
 *
 * Given a string s, partition s such that every substring of the partition
 * is a palindrome. Return all possible palindrome partitioning of s.
 *
 * Example 1:
 * Input: s = "aab"
 * Output: [["a","a","b"],["aa","b"]]
 *
 * Example 2:
 * Input: s = "a"
 * Output: [["a"]]
 *
 * Constraints:
 * - 1 <= s.length <= 16
 * - s contains only lowercase English letters
 */

/**
 * Algorithm: Backtracking with Palindrome Check
 *
 * Time Complexity: O(n * 2^n) - 2^n possible partitions, O(n) palindrome check
 * Space Complexity: O(n) - Recursion depth
 *
 * Key Insight:
 * At each position, we try all possible substrings starting from that position.
 * If a substring is a palindrome, we include it and recurse on the remaining string.
 *
 * Approach:
 * 1. Start from index 0
 * 2. For each end position from start to n-1:
 *    - If substring [start, end] is palindrome, add it to current partition
 *    - Recurse from end+1
 *    - Backtrack: remove the substring
 * 3. When start reaches n, we have a complete valid partition
 *
 * Example trace for s = "aab":
 *
 * backtrack(0, []):
 *   try "a" (0-0): isPalin? yes -> backtrack(1, ["a"])
 *     try "a" (1-1): isPalin? yes -> backtrack(2, ["a","a"])
 *       try "b" (2-2): isPalin? yes -> backtrack(3, ["a","a","b"]) -> FOUND!
 *     try "ab" (1-2): isPalin? no
 *   try "aa" (0-1): isPalin? yes -> backtrack(2, ["aa"])
 *     try "b" (2-2): isPalin? yes -> backtrack(3, ["aa","b"]) -> FOUND!
 *   try "aab" (0-2): isPalin? no
 *
 * Result: [["a","a","b"], ["aa","b"]]
 */

function partition(s: string): string[][] {
  const result: string[][] = [];
  const current: string[] = [];

  // Check if substring s[left..right] is a palindrome
  function isPalindrome(left: number, right: number): boolean {
    while (left < right) {
      if (s[left] !== s[right]) {
        return false;
      }
      left++;
      right--;
    }
    return true;
  }

  function backtrack(start: number): void {
    // Reached end of string - found a valid partition
    if (start === s.length) {
      result.push([...current]);
      return;
    }

    // Try all possible substrings starting from 'start'
    for (let end = start; end < s.length; end++) {
      // Only proceed if current substring is a palindrome
      if (isPalindrome(start, end)) {
        // Add substring to current partition
        current.push(s.substring(start, end + 1));
        // Recurse for remaining string
        backtrack(end + 1);
        // Backtrack
        current.pop();
      }
    }
  }

  backtrack(0);
  return result;
}

/**
 * Optimized: Precompute palindrome information using DP
 *
 * dp[i][j] = true if s[i..j] is a palindrome
 * dp[i][j] = s[i] === s[j] && (j - i <= 2 || dp[i+1][j-1])
 */
function partitionOptimized(s: string): string[][] {
  const n = s.length;
  const result: string[][] = [];
  const current: string[] = [];

  // Precompute palindrome table
  const dp: boolean[][] = Array.from({ length: n }, () =>
    new Array(n).fill(false)
  );

  // Every single character is a palindrome
  for (let i = 0; i < n; i++) {
    dp[i][i] = true;
  }

  // Fill the DP table (increasing substring lengths)
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i <= n - len; i++) {
      const j = i + len - 1;
      if (s[i] === s[j]) {
        // Length 2 or inner substring is palindrome
        dp[i][j] = len === 2 || dp[i + 1][j - 1];
      }
    }
  }

  function backtrack(start: number): void {
    if (start === n) {
      result.push([...current]);
      return;
    }

    for (let end = start; end < n; end++) {
      // Use precomputed palindrome check - O(1)
      if (dp[start][end]) {
        current.push(s.substring(start, end + 1));
        backtrack(end + 1);
        current.pop();
      }
    }
  }

  backtrack(0);
  return result;
}

// Test cases
console.log(JSON.stringify(partition("aab")));
// Expected: [["a","a","b"],["aa","b"]]

console.log(JSON.stringify(partition("a")));
// Expected: [["a"]]

console.log(JSON.stringify(partition("aba")));
// Expected: [["a","b","a"],["aba"]]

console.log(JSON.stringify(partition("aaa")));
// Expected: [["a","a","a"],["a","aa"],["aa","a"],["aaa"]]

console.log("\nOptimized version:");
console.log(JSON.stringify(partitionOptimized("aab")));
// Expected: [["a","a","b"],["aa","b"]]

console.log(JSON.stringify(partitionOptimized("aaa")));
// Expected: [["a","a","a"],["a","aa"],["aa","a"],["aaa"]]

export {};
