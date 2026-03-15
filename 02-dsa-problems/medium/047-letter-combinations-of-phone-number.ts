/**
 * Letter Combinations of a Phone Number (LeetCode #17)
 * Difficulty: Medium
 *
 * Given a string containing digits from 2-9 inclusive, return all possible
 * letter combinations that the number could represent. Return the answer
 * in any order.
 *
 * A mapping of digits to letters (just like on the telephone buttons):
 * 2 -> abc, 3 -> def, 4 -> ghi, 5 -> jkl,
 * 6 -> mno, 7 -> pqrs, 8 -> tuv, 9 -> wxyz
 *
 * Example 1:
 * Input: digits = "23"
 * Output: ["ad","ae","af","bd","be","bf","cd","ce","cf"]
 *
 * Example 2:
 * Input: digits = ""
 * Output: []
 *
 * Example 3:
 * Input: digits = "2"
 * Output: ["a","b","c"]
 *
 * Constraints:
 * - 0 <= digits.length <= 4
 * - digits[i] is a digit in the range ['2', '9']
 */

/**
 * Algorithm: Backtracking (Cartesian Product)
 *
 * Time Complexity: O(4^n * n) - At most 4 letters per digit, n digits
 * Space Complexity: O(n) - Recursion depth
 *
 * Key Insight:
 * This is essentially computing a Cartesian product:
 * For digits "23": {a,b,c} x {d,e,f} = {ad,ae,af,bd,be,bf,cd,ce,cf}
 *
 * Approach:
 * 1. Map each digit to its corresponding letters
 * 2. For each position in digits, try each corresponding letter
 * 3. When we've processed all digits, we have a complete combination
 *
 * Example trace for digits = "23":
 *
 * backtrack(0, ""):
 *   digit='2', letters="abc"
 *   try 'a': backtrack(1, "a")
 *     digit='3', letters="def"
 *     try 'd': backtrack(2, "ad") -> FOUND!
 *     try 'e': backtrack(2, "ae") -> FOUND!
 *     try 'f': backtrack(2, "af") -> FOUND!
 *   try 'b': backtrack(1, "b")
 *     ...produces "bd", "be", "bf"
 *   try 'c': backtrack(1, "c")
 *     ...produces "cd", "ce", "cf"
 */

function letterCombinations(digits: string): string[] {
  if (digits.length === 0) {
    return [];
  }

  // Phone digit to letters mapping
  const digitToLetters: Record<string, string> = {
    "2": "abc",
    "3": "def",
    "4": "ghi",
    "5": "jkl",
    "6": "mno",
    "7": "pqrs",
    "8": "tuv",
    "9": "wxyz",
  };

  const result: string[] = [];

  function backtrack(index: number, current: string): void {
    // Found a complete combination
    if (index === digits.length) {
      result.push(current);
      return;
    }

    // Get letters for current digit
    const letters = digitToLetters[digits[index]];

    // Try each letter
    for (const letter of letters) {
      backtrack(index + 1, current + letter);
    }
  }

  backtrack(0, "");
  return result;
}

/**
 * Alternative: Iterative BFS-style approach
 *
 * Start with empty string, for each digit, extend all current combinations
 * with each letter of that digit.
 */
function letterCombinationsIterative(digits: string): string[] {
  if (digits.length === 0) {
    return [];
  }

  const digitToLetters: Record<string, string> = {
    "2": "abc",
    "3": "def",
    "4": "ghi",
    "5": "jkl",
    "6": "mno",
    "7": "pqrs",
    "8": "tuv",
    "9": "wxyz",
  };

  let result: string[] = [""];

  for (const digit of digits) {
    const letters = digitToLetters[digit];
    const newResult: string[] = [];

    for (const combo of result) {
      for (const letter of letters) {
        newResult.push(combo + letter);
      }
    }

    result = newResult;
  }

  return result;
}

// Test cases
console.log(JSON.stringify(letterCombinations("23")));
// Expected: ["ad","ae","af","bd","be","bf","cd","ce","cf"]

console.log(JSON.stringify(letterCombinations("")));
// Expected: []

console.log(JSON.stringify(letterCombinations("2")));
// Expected: ["a","b","c"]

console.log(JSON.stringify(letterCombinations("79")));
// Expected: 4*4 = 16 combinations (pqrs x wxyz)

console.log("\nIterative approach:");
console.log(JSON.stringify(letterCombinationsIterative("23")));
// Expected: ["ad","ae","af","bd","be","bf","cd","ce","cf"]

console.log(JSON.stringify(letterCombinationsIterative("234")));
// Expected: 3*3*3 = 27 combinations

export {};
