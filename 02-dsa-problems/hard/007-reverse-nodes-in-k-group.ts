/**
 * Reverse Nodes in K-Group
 * Difficulty: Hard
 *
 * Given the head of a linked list, reverse the nodes of the list k at a time,
 * and return the modified list.
 *
 * k is a positive integer and is less than or equal to the length of the linked
 * list. If the number of nodes is not a multiple of k then left-out nodes, in
 * the end, should remain as it is.
 *
 * You may not alter the values in the list's nodes, only nodes themselves may
 * be changed.
 *
 * Example 1:
 * Input: head = [1,2,3,4,5], k = 2
 * Output: [2,1,4,3,5]
 *
 * Example 2:
 * Input: head = [1,2,3,4,5], k = 3
 * Output: [3,2,1,4,5]
 *
 * Constraints:
 * - The number of nodes in the list is n.
 * - 1 <= k <= n <= 5000
 * - 0 <= Node.val <= 1000
 *
 * Follow-up: Can you solve the problem in O(1) extra memory space?
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
 * Iterative K-Reversal - O(n) time, O(1) space
 *
 * Key insight: Process k nodes at a time. For each group:
 * 1. Check if k nodes exist (don't reverse incomplete groups)
 * 2. Reverse the k nodes
 * 3. Connect to previous group
 * 4. Move to next group
 *
 * Visual for [1,2,3,4,5], k=2:
 *   Initial: dummy -> 1 -> 2 -> 3 -> 4 -> 5
 *
 *   Group 1 (1,2):
 *     Reverse: 2 -> 1
 *     Connect: dummy -> 2 -> 1 -> 3 -> 4 -> 5
 *     prevGroupEnd = 1
 *
 *   Group 2 (3,4):
 *     Reverse: 4 -> 3
 *     Connect: dummy -> 2 -> 1 -> 4 -> 3 -> 5
 *     prevGroupEnd = 3
 *
 *   Group 3 (5): only 1 node, k=2, keep as is
 *
 *   Result: [2,1,4,3,5]
 */
function reverseKGroup(head: ListNode | null, k: number): ListNode | null {
  if (head === null || k === 1) return head;

  // Dummy node to handle head changes
  const dummy = new ListNode(0, head);
  let prevGroupEnd: ListNode = dummy;

  while (true) {
    // Check if k nodes exist from current position
    const kthNode = getKthNode(prevGroupEnd, k);
    if (kthNode === null) break; // Less than k nodes remaining

    // Save the node after this group
    const nextGroupStart = kthNode.next;

    // Reverse the k nodes
    // prevGroupEnd.next is the start of current group
    const [newGroupStart, newGroupEnd] = reverseKNodes(prevGroupEnd.next!, k);

    // Connect previous group to reversed group
    prevGroupEnd.next = newGroupStart;

    // Connect reversed group to next group
    newGroupEnd.next = nextGroupStart;

    // Move prevGroupEnd to end of current (now reversed) group
    prevGroupEnd = newGroupEnd;
  }

  return dummy.next;
}

/**
 * Get kth node from given node (1-indexed from node.next)
 * Returns null if fewer than k nodes exist
 */
function getKthNode(node: ListNode, k: number): ListNode | null {
  let curr: ListNode | null = node;
  for (let i = 0; i < k && curr !== null; i++) {
    curr = curr.next;
  }
  return curr;
}

/**
 * Reverse k nodes starting from head
 * Returns [newHead, newTail] of reversed segment
 */
function reverseKNodes(head: ListNode, k: number): [ListNode, ListNode] {
  let prev: ListNode | null = null;
  let curr: ListNode | null = head;
  const originalHead = head; // This becomes the tail after reversal

  for (let i = 0; i < k; i++) {
    const next: ListNode | null = curr!.next;
    curr!.next = prev;
    prev = curr;
    curr = next;
  }

  return [prev!, originalHead]; // prev is new head, originalHead is new tail
}

/**
 * Recursive Approach - O(n) time, O(n/k) space (recursion stack)
 *
 * Alternative: Recursively reverse each group.
 */
function reverseKGroupRecursive(
  head: ListNode | null,
  k: number
): ListNode | null {
  if (head === null) return null;

  // Check if k nodes exist
  let count = 0;
  let curr: ListNode | null = head;
  while (curr !== null && count < k) {
    curr = curr.next;
    count++;
  }

  if (count < k) {
    // Fewer than k nodes, don't reverse
    return head;
  }

  // Reverse k nodes
  let prev: ListNode | null = null;
  curr = head;
  for (let i = 0; i < k; i++) {
    const next: ListNode | null = curr!.next;
    curr!.next = prev;
    prev = curr;
    curr = next;
  }

  // head is now the tail of reversed group
  // Connect to recursively reversed rest
  head.next = reverseKGroupRecursive(curr, k);

  return prev; // prev is new head
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
console.log("Reverse Nodes in K-Group");
console.log("==========================================");

// Test case 1: k=2
console.log(
  linkedListToArray(reverseKGroup(createLinkedList([1, 2, 3, 4, 5]), 2))
); // [2,1,4,3,5]

// Test case 2: k=3
console.log(
  linkedListToArray(reverseKGroup(createLinkedList([1, 2, 3, 4, 5]), 3))
); // [3,2,1,4,5]

// Test case 3: k=1 (no change)
console.log(
  linkedListToArray(reverseKGroup(createLinkedList([1, 2, 3, 4, 5]), 1))
); // [1,2,3,4,5]

// Test case 4: k equals list length
console.log(
  linkedListToArray(reverseKGroup(createLinkedList([1, 2, 3, 4, 5]), 5))
); // [5,4,3,2,1]

// Test case 5: k > list length
console.log(
  linkedListToArray(reverseKGroup(createLinkedList([1, 2, 3]), 5))
); // [1,2,3]

// Test case 6: Two elements, k=2
console.log(
  linkedListToArray(reverseKGroup(createLinkedList([1, 2]), 2))
); // [2,1]

// Test case 7: Single element
console.log(
  linkedListToArray(reverseKGroup(createLinkedList([1]), 1))
); // [1]

// Test case 8: Perfect multiple of k
console.log(
  linkedListToArray(reverseKGroup(createLinkedList([1, 2, 3, 4, 5, 6]), 3))
); // [3,2,1,6,5,4]

console.log("\n--- Recursive Approach ---");
console.log(
  linkedListToArray(
    reverseKGroupRecursive(createLinkedList([1, 2, 3, 4, 5]), 2)
  )
); // [2,1,4,3,5]
console.log(
  linkedListToArray(
    reverseKGroupRecursive(createLinkedList([1, 2, 3, 4, 5]), 3)
  )
); // [3,2,1,4,5]

export {}
