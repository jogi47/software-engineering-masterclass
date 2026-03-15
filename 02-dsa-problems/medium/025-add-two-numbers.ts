/**
 * Add Two Numbers
 * Difficulty: Medium
 *
 * You are given two non-empty linked lists representing two non-negative integers.
 * The digits are stored in reverse order, and each of their nodes contains a single
 * digit. Add the two numbers and return the sum as a linked list.
 *
 * You may assume the two numbers do not contain any leading zero, except the
 * number 0 itself.
 *
 * Example 1:
 * Input: l1 = [2,4,3], l2 = [5,6,4]
 * Output: [7,0,8]
 * Explanation: 342 + 465 = 807.
 *
 * Example 2:
 * Input: l1 = [0], l2 = [0]
 * Output: [0]
 *
 * Example 3:
 * Input: l1 = [9,9,9,9,9,9,9], l2 = [9,9,9,9]
 * Output: [8,9,9,9,0,0,0,1]
 * Explanation: 9999999 + 9999 = 10009998.
 *
 * Constraints:
 * - The number of nodes in each linked list is in the range [1, 100].
 * - 0 <= Node.val <= 9
 * - It is guaranteed that the list represents a number that does not have leading zeros.
 */

class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val?: number, next?: ListNode | null) {
    this.val = val === undefined ? 0 : val;
    this.next = next === undefined ? null : next;
  }
}

/**
 * Elementary Addition with Carry - O(max(n,m)) time, O(max(n,m)) space
 *
 * Key insight: Since digits are stored in reverse order, we can add
 * digit by digit from head, which is the least significant digit.
 * This matches how we do addition by hand.
 *
 * Algorithm:
 * 1. Initialize carry = 0 and dummy head for result
 * 2. While either list has nodes OR carry > 0:
 *    - sum = (l1.val or 0) + (l2.val or 0) + carry
 *    - digit = sum % 10
 *    - carry = sum / 10
 *    - Create node with digit, append to result
 *    - Advance both lists if not exhausted
 * 3. Return dummy.next
 *
 * Visual for l1=[2,4,3], l2=[5,6,4]:
 *   342 + 465 = 807
 *
 *   Position 0: 2 + 5 + 0 = 7, carry = 0 → digit 7
 *   Position 1: 4 + 6 + 0 = 10, carry = 1 → digit 0
 *   Position 2: 3 + 4 + 1 = 8, carry = 0 → digit 8
 *   Result: [7,0,8]
 */
function addTwoNumbers(
  l1: ListNode | null,
  l2: ListNode | null
): ListNode | null {
  const dummy = new ListNode(0);
  let curr = dummy;
  let carry = 0;

  while (l1 !== null || l2 !== null || carry > 0) {
    // Get values (0 if list exhausted)
    const val1 = l1 !== null ? l1.val : 0;
    const val2 = l2 !== null ? l2.val : 0;

    // Calculate sum and new carry
    const sum = val1 + val2 + carry;
    carry = Math.floor(sum / 10);
    const digit = sum % 10;

    // Create new node
    curr.next = new ListNode(digit);
    curr = curr.next;

    // Advance lists if not exhausted
    if (l1 !== null) l1 = l1.next;
    if (l2 !== null) l2 = l2.next;
  }

  return dummy.next;
}

// ============ Helper Functions ============
function createLinkedList(arr: number[]): ListNode | null {
  if (arr.length === 0) return null;
  const head = new ListNode(arr[0]);
  let curr = head;
  for (let i = 1; i < arr.length; i++) {
    curr.next = new ListNode(arr[i]);
    curr = curr.next;
  }
  return head;
}

function linkedListToArray(head: ListNode | null): number[] {
  const result: number[] = [];
  while (head !== null) {
    result.push(head.val);
    head = head.next;
  }
  return result;
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Add Two Numbers");
console.log("==========================================");

// Test case 1: Normal addition
console.log(
  linkedListToArray(
    addTwoNumbers(createLinkedList([2, 4, 3]), createLinkedList([5, 6, 4]))
  )
); // [7,0,8] (342 + 465 = 807)

// Test case 2: Both zeros
console.log(
  linkedListToArray(
    addTwoNumbers(createLinkedList([0]), createLinkedList([0]))
  )
); // [0]

// Test case 3: Different lengths with carry propagation
console.log(
  linkedListToArray(
    addTwoNumbers(
      createLinkedList([9, 9, 9, 9, 9, 9, 9]),
      createLinkedList([9, 9, 9, 9])
    )
  )
); // [8,9,9,9,0,0,0,1] (9999999 + 9999 = 10009998)

// Test case 4: Carry at the end
console.log(
  linkedListToArray(
    addTwoNumbers(createLinkedList([9, 9]), createLinkedList([1]))
  )
); // [0,0,1] (99 + 1 = 100)

// Test case 5: Single digits
console.log(
  linkedListToArray(
    addTwoNumbers(createLinkedList([5]), createLinkedList([5]))
  )
); // [0,1] (5 + 5 = 10)

// Test case 6: One longer than other
console.log(
  linkedListToArray(
    addTwoNumbers(createLinkedList([1, 8]), createLinkedList([0]))
  )
); // [1,8] (81 + 0 = 81)

// Test case 7: All 9s same length
console.log(
  linkedListToArray(
    addTwoNumbers(createLinkedList([9, 9, 9]), createLinkedList([9, 9, 9]))
  )
); // [8,9,9,1] (999 + 999 = 1998)

export {}
