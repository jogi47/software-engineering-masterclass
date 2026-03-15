/**
 * Reverse Linked List
 * Difficulty: Easy
 *
 * Given the head of a singly linked list, reverse the list, and return
 * the reversed list.
 *
 * Example 1:
 * Input: head = [1,2,3,4,5]
 * Output: [5,4,3,2,1]
 *
 * Example 2:
 * Input: head = [1,2]
 * Output: [2,1]
 *
 * Example 3:
 * Input: head = []
 * Output: []
 *
 * Constraints:
 * - The number of nodes in the list is the range [0, 5000].
 * - -5000 <= Node.val <= 5000
 *
 * Follow up: A linked list can be reversed either iteratively or recursively.
 * Could you implement both?
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
 * Iterative Approach - O(n) time, O(1) space
 *
 * Key insight: We need to reverse the direction of each pointer.
 * Instead of node pointing to its next, it should point to its previous.
 *
 * Algorithm:
 * 1. Use three pointers: prev (initially null), curr (head), next (temp)
 * 2. For each node:
 *    - Save the next node
 *    - Point current node's next to previous
 *    - Move prev to current
 *    - Move current to saved next
 * 3. When done, prev points to new head
 *
 * Visual:
 *   Initial: null <- prev   curr -> 1 -> 2 -> 3 -> null
 *   Step 1:  null <- 1      prev    curr -> 2 -> 3 -> null
 *   Step 2:  null <- 1 <- 2         prev   curr -> 3 -> null
 *   Step 3:  null <- 1 <- 2 <- 3            prev   curr(null)
 *   Result: return prev (3)
 */
function reverseListIterative(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null;
  let curr: ListNode | null = head;

  while (curr !== null) {
    const next = curr.next; // Save next node
    curr.next = prev; // Reverse the pointer
    prev = curr; // Move prev forward
    curr = next; // Move curr forward
  }

  return prev; // prev is now the new head
}

/**
 * Recursive Approach - O(n) time, O(n) space (call stack)
 *
 * Key insight: Recursively reverse the rest of the list, then fix the pointers.
 *
 * Algorithm:
 * 1. Base case: empty list or single node - return as is
 * 2. Recursively reverse everything after head
 * 3. The node after head (head.next) is now the tail of reversed sublist
 * 4. Make head.next.next point back to head
 * 5. Set head.next to null (head is now the tail)
 * 6. Return the new head (from recursive call)
 *
 * Visual for [1,2,3]:
 *   Call: reverseList(1->2->3)
 *     Call: reverseList(2->3)
 *       Call: reverseList(3)
 *         Return: 3 (base case, single node)
 *       2.next.next = 2 → 3->2
 *       2.next = null → 3->2->null
 *       Return: 3
 *     1.next.next = 1 → 2->1
 *     1.next = null → 3->2->1->null
 *     Return: 3
 */
function reverseListRecursive(head: ListNode | null): ListNode | null {
  // Base case: empty list or single node
  if (head === null || head.next === null) {
    return head;
  }

  // Recursively reverse the rest
  const newHead = reverseListRecursive(head.next);

  // head.next is now the tail of reversed sublist
  // Make it point back to head
  head.next.next = head;
  head.next = null;

  return newHead;
}

// Default export uses iterative (more space efficient)
function reverseList(head: ListNode | null): ListNode | null {
  return reverseListIterative(head);
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
console.log("Reverse Linked List");
console.log("==========================================");

// Test case 1: Normal list
console.log(linkedListToArray(reverseList(createLinkedList([1, 2, 3, 4, 5])))); // [5,4,3,2,1]

// Test case 2: Two elements
console.log(linkedListToArray(reverseList(createLinkedList([1, 2])))); // [2,1]

// Test case 3: Empty list
console.log(linkedListToArray(reverseList(createLinkedList([])))); // []

// Test case 4: Single element
console.log(linkedListToArray(reverseList(createLinkedList([1])))); // [1]

// Test case 5: Negative numbers
console.log(linkedListToArray(reverseList(createLinkedList([-1, -2, -3])))); // [-3,-2,-1]

console.log("\n--- Recursive Approach ---");
// Test recursive approach
console.log(linkedListToArray(reverseListRecursive(createLinkedList([1, 2, 3, 4, 5])))); // [5,4,3,2,1]
console.log(linkedListToArray(reverseListRecursive(createLinkedList([1, 2])))); // [2,1]

export {}
