/**
 * Generate Parentheses (LeetCode #22)
 * Difficulty: Medium
 *
 * Given n pairs of parentheses, write a function to generate all combinations
 * of well-formed parentheses.
 *
 * Example 1:
 * Input: n = 3
 * Output: ["((()))","(()())","(())()","()(())","()()()"]
 *
 * Example 2:
 * Input: n = 1
 * Output: ["()"]
 *
 * Constraints:
 * - 1 <= n <= 8
 */

/**
 * Algorithm: Constraint-based Backtracking
 *
 * Time Complexity: O(4^n / sqrt(n)) - Catalan number
 * Space Complexity: O(n) - Recursion depth
 *
 * Key Insight:
 * A valid parentheses string must satisfy:
 * 1. Total length is 2n (n opens + n closes)
 * 2. At any point, #opens >= #closes (can't close what isn't opened)
 * 3. We can add '(' if open < n (haven't used all opens)
 * 4. We can add ')' if close < open (have unclosed opens)
 *
 * Approach:
 * - Track count of '(' and ')' used so far
 * - Add '(' if open < n
 * - Add ')' if close < open
 * - When length reaches 2n, we have a valid combination
 *
 * Example trace for n = 2:
 *
 * backtrack("", 0, 0):
 *   add '(': backtrack("(", 1, 0)
 *     add '(': backtrack("((", 2, 0)
 *       can't add '(' (open=n)
 *       add ')': backtrack("(()", 2, 1)
 *         add ')': backtrack("(())", 2, 2) -> FOUND!
 *     add ')': backtrack("()", 1, 1)
 *       add '(': backtrack("()(", 2, 1)
 *         add ')': backtrack("()()", 2, 2) -> FOUND!
 *
 * Result: ["(())", "()()"]
 */

function generateParenthesis(n: number): string[] {
  const result: string[] = [];

  function backtrack(current: string, open: number, close: number): void {
    // Found a valid combination
    if (current.length === 2 * n) {
      result.push(current);
      return;
    }

    // Can add '(' if we haven't used all n opens
    if (open < n) {
      backtrack(current + "(", open + 1, close);
    }

    // Can add ')' if we have unclosed opens
    if (close < open) {
      backtrack(current + ")", open, close + 1);
    }
  }

  backtrack("", 0, 0);
  return result;
}

/**
 * Alternative: Using array for better performance
 * String concatenation creates new strings; array push/pop is more efficient
 */
function generateParenthesisOptimized(n: number): string[] {
  const result: string[] = [];
  const current: string[] = [];

  function backtrack(open: number, close: number): void {
    if (current.length === 2 * n) {
      result.push(current.join(""));
      return;
    }

    if (open < n) {
      current.push("(");
      backtrack(open + 1, close);
      current.pop();
    }

    if (close < open) {
      current.push(")");
      backtrack(open, close + 1);
      current.pop();
    }
  }

  backtrack(0, 0);
  return result;
}

// Test cases
console.log(JSON.stringify(generateParenthesis(3)));
// Expected: ["((()))","(()())","(())()","()(())","()()()"]

console.log(JSON.stringify(generateParenthesis(1)));
// Expected: ["()"]

console.log(JSON.stringify(generateParenthesis(2)));
// Expected: ["(())","()()"]

console.log(JSON.stringify(generateParenthesis(4)));
// Expected: 14 combinations (Catalan number C_4)

console.log("\nOptimized version:");
console.log(JSON.stringify(generateParenthesisOptimized(3)));
// Expected: ["((()))","(()())","(())()","()(())","()()()"]

export {};
