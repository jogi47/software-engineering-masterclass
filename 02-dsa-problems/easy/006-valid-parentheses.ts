/**
 * Valid Parentheses
 * Difficulty: Easy
 *
 * Given a string s containing just the characters '(', ')', '{', '}', '[' and ']',
 * determine if the input string is valid.
 *
 * An input string is valid if:
 * 1. Open brackets must be closed by the same type of brackets.
 * 2. Open brackets must be closed in the correct order.
 * 3. Every close bracket has a corresponding open bracket of the same type.
 *
 * Example 1:
 * Input: s = "()"
 * Output: true
 *
 * Example 2:
 * Input: s = "()[]{}"
 * Output: true
 *
 * Example 3:
 * Input: s = "(]"
 * Output: false
 *
 * Example 4:
 * Input: s = "([])"
 * Output: true
 *
 * Constraints:
 * - 1 <= s.length <= 10^4
 * - s consists of parentheses only '()[]{}'
 */

/**
 * Stack-based approach - O(n) time, O(n) space
 *
 * Key insight: Use a stack to track opening brackets.
 * When we see an opening bracket, push it onto the stack.
 * When we see a closing bracket, check if it matches the top of stack.
 *
 * Algorithm:
 * 1. Create a map of closing -> opening brackets
 * 2. Iterate through the string:
 *    - If opening bracket: push to stack
 *    - If closing bracket: check if matches top of stack
 *      - If matches: pop from stack
 *      - If doesn't match or stack empty: return false
 * 3. Return true if stack is empty (all brackets matched)
 *
 * Example walkthrough with "([])" :
 *   '(' -> push -> stack: ['(']
 *   '[' -> push -> stack: ['(', '[']
 *   ']' -> matches '[' -> pop -> stack: ['(']
 *   ')' -> matches '(' -> pop -> stack: []
 *   Stack empty -> return true
 *
 * Example walkthrough with "(]":
 *   '(' -> push -> stack: ['(']
 *   ']' -> doesn't match '(' -> return false
 */
function isValid(s: string): boolean {
  const stack: string[] = [];

  // Map closing brackets to their corresponding opening brackets
  const matchingBracket: Record<string, string> = {
    ")": "(",
    "]": "[",
    "}": "{",
  };

  for (const char of s) {
    if (char === "(" || char === "[" || char === "{") {
      // Opening bracket - push to stack
      stack.push(char);
    } else {
      // Closing bracket - check if matches top of stack
      if (stack.length === 0 || stack[stack.length - 1] !== matchingBracket[char]) {
        return false;
      }
      stack.pop();
    }
  }

  // Valid only if all opening brackets have been matched
  return stack.length === 0;
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Valid Parentheses");
console.log("==========================================");

// Test case 1: Simple valid
console.log(isValid("()")); // Expected: true

// Test case 2: Multiple types valid
console.log(isValid("()[]{}")); // Expected: true

// Test case 3: Mismatched types
console.log(isValid("(]")); // Expected: false

// Test case 4: Nested valid
console.log(isValid("([])")); // Expected: true

// Test case 5: Wrong order
console.log(isValid("([)]")); // Expected: false

// Test case 6: Only opening brackets
console.log(isValid("(((")); // Expected: false

// Test case 7: Only closing brackets
console.log(isValid(")))")); // Expected: false

// Test case 8: Complex nested valid
console.log(isValid("{[()()]}")); // Expected: true

// Test case 9: Single character
console.log(isValid("[")); // Expected: false

// Test case 10: Empty string edge case (if allowed)
console.log(isValid("")); // Expected: true

export {}
