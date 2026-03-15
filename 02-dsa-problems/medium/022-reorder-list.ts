/**
 * Reorder List
 * Difficulty: Medium
 *
 * You are given the head of a singly linked list. The list can be represented as:
 * L0 → L1 → … → Ln-1 → Ln
 *
 * Reorder the list to be in the following form:
 * L0 → Ln → L1 → Ln-1 → L2 → Ln-2 → …
 *
 * You may not modify the values in the list's nodes. Only nodes themselves may be changed.
 *
 * Example 1:
 * Input: head = [1,2,3,4]
 * Output: [1,4,2,3]
 *
 * Example 2:
 * Input: head = [1,2,3,4,5]
 * Output: [1,5,2,4,3]
 *
 * Constraints:
 * - The number of nodes in the list is in the range [1, 5 * 10^4].
 * - 1 <= Node.val <= 1000
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
 * Three-Step Approach - O(n) time, O(1) space
 *
 * Key insight: The reordered list interleaves nodes from the start and end.
 * We can achieve this by:
 * 1. Finding the middle of the list
 * 2. Reversing the second half
 * 3. Merging two halves alternately
 *
 * Visual for [1,2,3,4,5]:
 *   Step 1 - Find middle: first half = [1,2,3], second half = [4,5]
 *   Step 2 - Reverse second: [5,4]
 *   Step 3 - Merge alternately:
 *     Take 1 from first, take 5 from second → 1->5
 *     Take 2 from first, take 4 from second → 1->5->2->4
 *     Take 3 from first → 1->5->2->4->3
 */
function reorderList(head: ListNode | null): void {
  if (head === null || head.next === null) {
    return;
  }

  // Step 1: Find the middle using slow/fast pointers
  let slow: ListNode | null = head;
  let fast: ListNode | null = head;

  while (fast.next !== null && fast.next.next !== null) {
    slow = slow!.next;
    fast = fast.next.next;
  }

  // Step 2: Reverse the second half
  let secondHalf = reverseList(slow!.next);
  slow!.next = null; // Cut the list in half

  // Step 3: Merge two halves alternately
  let firstHalf: ListNode | null = head;

  while (secondHalf !== null) {
    // Save next pointers
    const firstNext = firstHalf!.next;
    const secondNext = secondHalf.next;

    // Interleave
    firstHalf!.next = secondHalf;
    secondHalf.next = firstNext;

    // Move pointers
    firstHalf = firstNext;
    secondHalf = secondNext;
  }
}

/**
 * Helper: Reverse a linked list
 */
function reverseList(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null;
  let curr = head;

  while (curr !== null) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }

  return prev;
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
console.log("Reorder List");
console.log("==========================================");

// Test case 1: Even length
let list1 = createLinkedList([1, 2, 3, 4]);
reorderList(list1);
console.log(linkedListToArray(list1)); // [1,4,2,3]

// Test case 2: Odd length
let list2 = createLinkedList([1, 2, 3, 4, 5]);
reorderList(list2);
console.log(linkedListToArray(list2)); // [1,5,2,4,3]

// Test case 3: Two elements
let list3 = createLinkedList([1, 2]);
reorderList(list3);
console.log(linkedListToArray(list3)); // [1,2]

// Test case 4: Single element
let list4 = createLinkedList([1]);
reorderList(list4);
console.log(linkedListToArray(list4)); // [1]

// Test case 5: Three elements
let list5 = createLinkedList([1, 2, 3]);
reorderList(list5);
console.log(linkedListToArray(list5)); // [1,3,2]

// Test case 6: Longer list
let list6 = createLinkedList([1, 2, 3, 4, 5, 6, 7, 8]);
reorderList(list6);
console.log(linkedListToArray(list6)); // [1,8,2,7,3,6,4,5]

export {}
