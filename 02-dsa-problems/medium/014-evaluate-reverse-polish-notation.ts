/**
 * Evaluate Reverse Polish Notation
 * Difficulty: Medium
 *
 * You are given an array of strings tokens that represents an arithmetic expression
 * in a Reverse Polish Notation (postfix notation).
 *
 * Evaluate the expression. Return an integer that represents the value of the expression.
 *
 * Note that:
 * - The valid operators are '+', '-', '*', and '/'.
 * - Each operand may be an integer or another expression.
 * - The division between two integers always truncates toward zero.
 * - There will not be any division by zero.
 * - The input represents a valid arithmetic expression in reverse polish notation.
 * - The answer and all intermediate calculations can be represented in a 32-bit integer.
 *
 * Example 1:
 * Input: tokens = ["2","1","+","3","*"]
 * Output: 9
 * Explanation: ((2 + 1) * 3) = 9
 *
 * Example 2:
 * Input: tokens = ["4","13","5","/","+"]
 * Output: 6
 * Explanation: (4 + (13 / 5)) = 6
 *
 * Example 3:
 * Input: tokens = ["10","6","9","3","+","-11","*","/","*","17","+","5","+"]
 * Output: 22
 * Explanation: ((10 * (6 / ((9 + 3) * -11))) + 17) + 5
 *   = ((10 * (6 / (12 * -11))) + 17) + 5
 *   = ((10 * (6 / -132)) + 17) + 5
 *   = ((10 * 0) + 17) + 5
 *   = 22
 *
 * Constraints:
 * - 1 <= tokens.length <= 10^4
 * - tokens[i] is either an operator: "+", "-", "*", or "/", or an integer in the range [-200, 200].
 */

/**
 * Stack-based approach - O(n) time, O(n) space
 *
 * Key insight: Reverse Polish Notation (RPN) / postfix notation naturally
 * evaluates with a stack. Operands come before their operator.
 *
 * Algorithm:
 * 1. Iterate through each token
 * 2. If token is a number: push onto stack
 * 3. If token is an operator:
 *    - Pop two operands from stack (second operand first, then first operand)
 *    - Apply the operator
 *    - Push result back onto stack
 * 4. After processing all tokens, stack contains single element: the result
 *
 * Important: Order matters for subtraction and division!
 * - Stack: [a, b] then operator
 * - Pop b (second operand), pop a (first operand)
 * - Result: a operator b
 *
 * Example walkthrough with ["2","1","+","3","*"]:
 *   "2" -> push -> stack: [2]
 *   "1" -> push -> stack: [2, 1]
 *   "+" -> pop 1, pop 2 -> 2+1=3 -> push -> stack: [3]
 *   "3" -> push -> stack: [3, 3]
 *   "*" -> pop 3, pop 3 -> 3*3=9 -> push -> stack: [9]
 *   Return 9
 *
 * Division truncation note:
 * - JavaScript division doesn't naturally truncate
 * - We use Math.trunc() to truncate toward zero (not Math.floor!)
 * - Example: -7/2 = -3.5 -> Math.trunc(-3.5) = -3 (not -4)
 */
function evalRPN(tokens: string[]): number {
  const stack: number[] = [];
  const operators = new Set(["+", "-", "*", "/"]);

  for (const token of tokens) {
    if (operators.has(token)) {
      // Operator: pop two operands, calculate, push result
      const b = stack.pop()!; // Second operand (popped first)
      const a = stack.pop()!; // First operand (popped second)

      let result: number;
      switch (token) {
        case "+":
          result = a + b;
          break;
        case "-":
          result = a - b;
          break;
        case "*":
          result = a * b;
          break;
        case "/":
          // Truncate toward zero (not floor!)
          result = Math.trunc(a / b);
          break;
        default:
          throw new Error(`Unknown operator: ${token}`);
      }
      stack.push(result);
    } else {
      // Number: push onto stack
      stack.push(parseInt(token, 10));
    }
  }

  return stack[0];
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Evaluate Reverse Polish Notation");
console.log("==========================================");

// Test case 1: Basic addition and multiplication
console.log(evalRPN(["2", "1", "+", "3", "*"])); // Expected: 9

// Test case 2: Division
console.log(evalRPN(["4", "13", "5", "/", "+"])); // Expected: 6

// Test case 3: Complex expression
console.log(
  evalRPN(["10", "6", "9", "3", "+", "-11", "*", "/", "*", "17", "+", "5", "+"])
); // Expected: 22

// Test case 4: Simple subtraction
console.log(evalRPN(["5", "3", "-"])); // Expected: 2

// Test case 5: Negative numbers
console.log(evalRPN(["-2", "3", "*"])); // Expected: -6

// Test case 6: Division truncation toward zero (positive)
console.log(evalRPN(["7", "2", "/"])); // Expected: 3

// Test case 7: Division truncation toward zero (negative)
console.log(evalRPN(["7", "-2", "/"])); // Expected: -3

// Test case 8: Single number
console.log(evalRPN(["42"])); // Expected: 42

// Test case 9: Multiple operations
console.log(evalRPN(["3", "4", "+", "2", "*", "7", "/"])); // Expected: 2
// Explanation: ((3+4)*2)/7 = 14/7 = 2

export {}
