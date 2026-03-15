/**
 * Remove Nth Node From End of List
 * Difficulty: Medium
 *
 * Given the head of a linked list, remove the nth node from the end of the
 * list and return its head.
 *
 * Example 1:
 * Input: head = [1,2,3,4,5], n = 2
 * Output: [1,2,3,5]
 *
 * Example 2:
 * Input: head = [1], n = 1
 * Output: []
 *
 * Example 3:
 * Input: head = [1,2], n = 1
 * Output: [1]
 *
 * Constraints:
 * - The number of nodes in the list is sz.
 * - 1 <= sz <= 30
 * - 0 <= Node.val <= 100
 * - 1 <= n <= sz
 *
 * Follow up: Could you do this in one pass?
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
 * Two Pointer with Gap - O(n) time, O(1) space, One Pass
 *
 * Key insight: Maintain a gap of n nodes between two pointers.
 * When the fast pointer reaches the end, the slow pointer is at the
 * node before the one we need to remove.
 *
 * Algorithm:
 * 1. Use a dummy node to handle edge case of removing head
 * 2. Move fast pointer n+1 steps ahead
 * 3. Move both pointers until fast reaches null
 * 4. slow.next is the node to remove, skip it
 *
 * Visual for [1,2,3,4,5], n=2:
 *   dummy -> 1 -> 2 -> 3 -> 4 -> 5 -> null
 *
 *   After moving fast n+1=3 steps:
 *   slow = dummy, fast = 3
 *
 *   Move both until fast is null:
 *   slow = 1, fast = 4
 *   slow = 2, fast = 5
 *   slow = 3, fast = null (stop)
 *
 *   Remove slow.next (4): slow.next = slow.next.next
 *   Result: 1 -> 2 -> 3 -> 5
 */
function removeNthFromEnd(head: ListNode | null, n: number): ListNode | null {
  // Dummy node handles edge case of removing head
  const dummy = new ListNode(0, head);
  let slow: ListNode | null = dummy;
  let fast: ListNode | null = dummy;

  // Move fast n+1 steps ahead
  for (let i = 0; i <= n; i++) {
    fast = fast!.next;
  }

  // Move both until fast reaches null
  while (fast !== null) {
    slow = slow!.next;
    fast = fast.next;
  }

  // Remove the nth node from end
  slow!.next = slow!.next!.next;

  return dummy.next;
}

/**
 * Two Pass Approach - O(n) time, O(1) space
 *
 * Alternative: First pass counts nodes, second pass removes.
 */
function removeNthFromEndTwoPass(
  head: ListNode | null,
  n: number
): ListNode | null {
  // First pass: count nodes
  let length = 0;
  let curr = head;
  while (curr !== null) {
    length++;
    curr = curr.next;
  }

  // Handle removing head
  if (n === length) {
    return head!.next;
  }

  // Second pass: find node before target
  const targetIndex = length - n;
  curr = head;
  for (let i = 1; i < targetIndex; i++) {
    curr = curr!.next;
  }

  // Remove target node
  curr!.next = curr!.next!.next;

  return head;
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
console.log("Remove Nth Node From End of List");
console.log("==========================================");

// Test case 1: Remove from middle
console.log(
  linkedListToArray(removeNthFromEnd(createLinkedList([1, 2, 3, 4, 5]), 2))
); // [1,2,3,5]

// Test case 2: Remove only node
console.log(linkedListToArray(removeNthFromEnd(createLinkedList([1]), 1))); // []

// Test case 3: Remove last node
console.log(
  linkedListToArray(removeNthFromEnd(createLinkedList([1, 2]), 1))
); // [1]

// Test case 4: Remove first node (head)
console.log(
  linkedListToArray(removeNthFromEnd(createLinkedList([1, 2]), 2))
); // [2]

// Test case 5: Remove second from end
console.log(
  linkedListToArray(removeNthFromEnd(createLinkedList([1, 2, 3]), 2))
); // [1,3]

// Test case 6: Longer list, remove from various positions
console.log(
  linkedListToArray(removeNthFromEnd(createLinkedList([1, 2, 3, 4, 5, 6]), 3))
); // [1,2,3,5,6]

console.log("\n--- Two Pass Approach ---");
console.log(
  linkedListToArray(
    removeNthFromEndTwoPass(createLinkedList([1, 2, 3, 4, 5]), 2)
  )
); // [1,2,3,5]

export {}
