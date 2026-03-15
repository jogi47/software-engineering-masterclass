/**
 * Min Stack
 * Difficulty: Medium
 *
 * Design a stack that supports push, pop, top, and retrieving the minimum element
 * in constant time.
 *
 * Implement the MinStack class:
 * - MinStack() initializes the stack object.
 * - void push(int val) pushes the element val onto the stack.
 * - void pop() removes the element on the top of the stack.
 * - int top() gets the top element of the stack.
 * - int getMin() retrieves the minimum element in the stack.
 *
 * You must implement a solution with O(1) time complexity for each function.
 *
 * Example 1:
 * Input:
 *   ["MinStack","push","push","push","getMin","pop","top","getMin"]
 *   [[],[-2],[0],[-3],[],[],[],[]]
 * Output: [null,null,null,null,-3,null,0,-2]
 * Explanation:
 *   MinStack minStack = new MinStack();
 *   minStack.push(-2);
 *   minStack.push(0);
 *   minStack.push(-3);
 *   minStack.getMin(); // return -3
 *   minStack.pop();
 *   minStack.top();    // return 0
 *   minStack.getMin(); // return -2
 *
 * Constraints:
 * - -2^31 <= val <= 2^31 - 1
 * - Methods pop, top and getMin operations will always be called on non-empty stacks.
 * - At most 3 * 10^4 calls will be made to push, pop, top, and getMin.
 */

/**
 * Two-stack approach - O(1) time for all operations, O(n) space
 *
 * Key insight: Maintain a second stack that tracks the minimum value
 * at each level of the main stack.
 *
 * For each push, we push onto both:
 * - Main stack: the actual value
 * - Min stack: the minimum value at this level (min of current value and previous min)
 *
 * For each pop, we pop from both stacks, keeping them synchronized.
 *
 * This ensures getMin() is always O(1) - just peek the min stack.
 *
 * Example walkthrough:
 *   push(-2): stack=[-2], minStack=[-2]
 *   push(0):  stack=[-2,0], minStack=[-2,-2] (min is still -2)
 *   push(-3): stack=[-2,0,-3], minStack=[-2,-2,-3] (new min is -3)
 *   getMin(): return minStack.top() = -3
 *   pop():    stack=[-2,0], minStack=[-2,-2]
 *   top():    return stack.top() = 0
 *   getMin(): return minStack.top() = -2
 */
class MinStack {
  private stack: number[];
  private minStack: number[];

  constructor() {
    this.stack = [];
    this.minStack = [];
  }

  push(val: number): void {
    this.stack.push(val);

    // Push the minimum value at this level
    if (this.minStack.length === 0) {
      this.minStack.push(val);
    } else {
      // Keep track of minimum: either new value or previous minimum
      this.minStack.push(Math.min(val, this.minStack[this.minStack.length - 1]));
    }
  }

  pop(): void {
    this.stack.pop();
    this.minStack.pop();
  }

  top(): number {
    return this.stack[this.stack.length - 1];
  }

  getMin(): number {
    return this.minStack[this.minStack.length - 1];
  }
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Min Stack");
console.log("==========================================");

// Test case 1: Basic operations from example
const minStack1 = new MinStack();
minStack1.push(-2);
minStack1.push(0);
minStack1.push(-3);
console.log(minStack1.getMin()); // Expected: -3
minStack1.pop();
console.log(minStack1.top()); // Expected: 0
console.log(minStack1.getMin()); // Expected: -2

console.log("---");

// Test case 2: Ascending order
const minStack2 = new MinStack();
minStack2.push(1);
minStack2.push(2);
minStack2.push(3);
console.log(minStack2.getMin()); // Expected: 1
console.log(minStack2.top()); // Expected: 3

console.log("---");

// Test case 3: Descending order
const minStack3 = new MinStack();
minStack3.push(3);
minStack3.push(2);
minStack3.push(1);
console.log(minStack3.getMin()); // Expected: 1
minStack3.pop();
console.log(minStack3.getMin()); // Expected: 2

console.log("---");

// Test case 4: Same values
const minStack4 = new MinStack();
minStack4.push(5);
minStack4.push(5);
minStack4.push(5);
console.log(minStack4.getMin()); // Expected: 5
minStack4.pop();
console.log(minStack4.getMin()); // Expected: 5

console.log("---");

// Test case 5: Negative numbers
const minStack5 = new MinStack();
minStack5.push(-1);
minStack5.push(-2);
minStack5.push(-3);
console.log(minStack5.getMin()); // Expected: -3
minStack5.pop();
minStack5.pop();
console.log(minStack5.getMin()); // Expected: -1

export {}
