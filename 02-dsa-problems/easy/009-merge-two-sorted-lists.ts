/**
 * Merge Two Sorted Lists
 * Difficulty: Easy
 *
 * You are given the heads of two sorted linked lists list1 and list2.
 * Merge the two lists into one sorted list. The list should be made by
 * splicing together the nodes of the first two lists.
 *
 * Return the head of the merged linked list.
 *
 * Example 1:
 * Input: list1 = [1,2,4], list2 = [1,3,4]
 * Output: [1,1,2,3,4,4]
 *
 * Example 2:
 * Input: list1 = [], list2 = []
 * Output: []
 *
 * Example 3:
 * Input: list1 = [], list2 = [0]
 * Output: [0]
 *
 * Constraints:
 * - The number of nodes in both lists is in the range [0, 50].
 * - -100 <= Node.val <= 100
 * - Both list1 and list2 are sorted in non-decreasing order.
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
 * Iterative Approach with Dummy Head - O(n + m) time, O(1) space
 *
 * Key insight: Use a dummy node to simplify edge cases.
 * Compare heads of both lists, attach smaller one, advance that pointer.
 *
 * Algorithm:
 * 1. Create a dummy node as placeholder for result head
 * 2. Use a tail pointer to build the result list
 * 3. While both lists have nodes:
 *    - Compare values, attach smaller one to tail
 *    - Advance the pointer of the list we took from
 * 4. Attach remaining nodes (one list may have extras)
 * 5. Return dummy.next (actual head)
 *
 * Visual for list1=[1,2,4], list2=[1,3,4]:
 *   dummy -> null, tail = dummy
 *   Compare 1 vs 1: attach list1's 1, advance list1
 *   dummy -> 1, tail = 1, list1 = [2,4], list2 = [1,3,4]
 *   Compare 2 vs 1: attach list2's 1, advance list2
 *   dummy -> 1 -> 1, list1 = [2,4], list2 = [3,4]
 *   ... continue until [1,1,2,3,4,4]
 */
function mergeTwoListsIterative(
  list1: ListNode | null,
  list2: ListNode | null
): ListNode | null {
  // Dummy node simplifies handling the head
  const dummy = new ListNode(-1);
  let tail = dummy;

  // Merge while both lists have nodes
  while (list1 !== null && list2 !== null) {
    if (list1.val <= list2.val) {
      tail.next = list1;
      list1 = list1.next;
    } else {
      tail.next = list2;
      list2 = list2.next;
    }
    tail = tail.next;
  }

  // Attach remaining nodes (at most one list has remaining)
  tail.next = list1 !== null ? list1 : list2;

  return dummy.next;
}

/**
 * Recursive Approach - O(n + m) time, O(n + m) space (call stack)
 *
 * Key insight: The merged list is either:
 * - list1[0] + merge(list1[1:], list2) if list1[0] < list2[0]
 * - list2[0] + merge(list1, list2[1:]) otherwise
 *
 * This naturally handles empty lists as base cases.
 */
function mergeTwoListsRecursive(
  list1: ListNode | null,
  list2: ListNode | null
): ListNode | null {
  // Base cases
  if (list1 === null) return list2;
  if (list2 === null) return list1;

  // Recursive case
  if (list1.val <= list2.val) {
    list1.next = mergeTwoListsRecursive(list1.next, list2);
    return list1;
  } else {
    list2.next = mergeTwoListsRecursive(list1, list2.next);
    return list2;
  }
}

// Default export uses iterative (more space efficient)
function mergeTwoLists(
  list1: ListNode | null,
  list2: ListNode | null
): ListNode | null {
  return mergeTwoListsIterative(list1, list2);
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
console.log("Merge Two Sorted Lists");
console.log("==========================================");

// Test case 1: Normal merge
console.log(
  linkedListToArray(
    mergeTwoLists(createLinkedList([1, 2, 4]), createLinkedList([1, 3, 4]))
  )
); // [1,1,2,3,4,4]

// Test case 2: Both empty
console.log(
  linkedListToArray(mergeTwoLists(createLinkedList([]), createLinkedList([])))
); // []

// Test case 3: One empty
console.log(
  linkedListToArray(mergeTwoLists(createLinkedList([]), createLinkedList([0])))
); // [0]

// Test case 4: One empty (other side)
console.log(
  linkedListToArray(
    mergeTwoLists(createLinkedList([1, 2, 3]), createLinkedList([]))
  )
); // [1,2,3]

// Test case 5: No interleaving needed
console.log(
  linkedListToArray(
    mergeTwoLists(createLinkedList([1, 2, 3]), createLinkedList([4, 5, 6]))
  )
); // [1,2,3,4,5,6]

// Test case 6: Single elements
console.log(
  linkedListToArray(
    mergeTwoLists(createLinkedList([2]), createLinkedList([1]))
  )
); // [1,2]

console.log("\n--- Recursive Approach ---");
console.log(
  linkedListToArray(
    mergeTwoListsRecursive(
      createLinkedList([1, 2, 4]),
      createLinkedList([1, 3, 4])
    )
  )
); // [1,1,2,3,4,4]

export {}
