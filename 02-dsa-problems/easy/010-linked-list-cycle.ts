/**
 * Linked List Cycle
 * Difficulty: Easy
 *
 * Given head, the head of a linked list, determine if the linked list has a cycle in it.
 *
 * There is a cycle in a linked list if there is some node in the list that can be
 * reached again by continuously following the next pointer.
 *
 * Return true if there is a cycle in the linked list. Otherwise, return false.
 *
 * Example 1:
 * Input: head = [3,2,0,-4], pos = 1
 * Output: true
 * Explanation: There is a cycle, where the tail connects to the 1st node (0-indexed).
 *
 * Example 2:
 * Input: head = [1,2], pos = 0
 * Output: true
 * Explanation: There is a cycle, where the tail connects to the 0th node.
 *
 * Example 3:
 * Input: head = [1], pos = -1
 * Output: false
 * Explanation: There is no cycle in the linked list.
 *
 * Constraints:
 * - The number of the nodes in the list is in the range [0, 10^4].
 * - -10^5 <= Node.val <= 10^5
 * - pos is -1 or a valid index in the linked-list.
 *
 * Follow up: Can you solve it using O(1) (i.e. constant) memory?
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
 * Floyd's Cycle Detection (Tortoise and Hare) - O(n) time, O(1) space
 *
 * Key insight: If there's a cycle, a fast pointer (moving 2 steps) will
 * eventually catch up to a slow pointer (moving 1 step) inside the cycle.
 *
 * Why it works:
 * - If no cycle: fast pointer reaches null first
 * - If cycle exists: both pointers enter cycle
 *   - Fast gains 1 step per iteration relative to slow
 *   - Eventually fast catches slow (like lapping in a race)
 *
 * Proof of termination:
 * - Once both are in cycle, relative distance decreases by 1 each step
 * - They must meet within one full cycle length
 *
 * Visual for [3,2,0,-4] with tail->node[1]:
 *   3 -> 2 -> 0 -> -4
 *        ^          |
 *        |__________|
 *
 *   Start: slow=3, fast=3
 *   Step 1: slow=2, fast=0
 *   Step 2: slow=0, fast=2
 *   Step 3: slow=-4, fast=-4 (meet! cycle detected)
 */
function hasCycle(head: ListNode | null): boolean {
  if (head === null || head.next === null) {
    return false;
  }

  let slow: ListNode | null = head;
  let fast: ListNode | null = head;

  while (fast !== null && fast.next !== null) {
    slow = slow!.next; // Move slow by 1
    fast = fast.next.next; // Move fast by 2

    if (slow === fast) {
      return true; // Pointers met, cycle exists
    }
  }

  return false; // Fast reached end, no cycle
}

/**
 * Hash Set Approach - O(n) time, O(n) space
 *
 * Alternative approach: Track visited nodes in a Set.
 * If we see a node twice, there's a cycle.
 */
function hasCycleHashSet(head: ListNode | null): boolean {
  const visited = new Set<ListNode>();

  let curr = head;
  while (curr !== null) {
    if (visited.has(curr)) {
      return true; // Seen this node before
    }
    visited.add(curr);
    curr = curr.next;
  }

  return false;
}

// ============ Helper Functions ============
function createLinkedListWithCycle(
  arr: number[],
  pos: number
): ListNode | null {
  if (arr.length === 0) return null;

  const head = new ListNode(arr[0]);
  let curr = head;
  let cycleNode: ListNode | null = null;

  // Track the node at position 'pos' for cycle connection
  if (pos === 0) cycleNode = head;

  for (let i = 1; i < arr.length; i++) {
    curr.next = new ListNode(arr[i]);
    curr = curr.next;
    if (i === pos) cycleNode = curr;
  }

  // Create cycle if pos is valid
  if (pos >= 0 && cycleNode !== null) {
    curr.next = cycleNode;
  }

  return head;
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Linked List Cycle");
console.log("==========================================");

// Test case 1: Cycle exists (tail connects to index 1)
console.log(hasCycle(createLinkedListWithCycle([3, 2, 0, -4], 1))); // true

// Test case 2: Cycle exists (tail connects to index 0)
console.log(hasCycle(createLinkedListWithCycle([1, 2], 0))); // true

// Test case 3: No cycle (pos = -1)
console.log(hasCycle(createLinkedListWithCycle([1], -1))); // false

// Test case 4: Empty list
console.log(hasCycle(null)); // false

// Test case 5: No cycle, longer list
console.log(hasCycle(createLinkedListWithCycle([1, 2, 3, 4, 5], -1))); // false

// Test case 6: Self-loop (single node points to itself)
console.log(hasCycle(createLinkedListWithCycle([1], 0))); // true

// Test case 7: Cycle at the end
console.log(hasCycle(createLinkedListWithCycle([1, 2, 3, 4], 3))); // true (4 -> 4)

console.log("\n--- Hash Set Approach ---");
console.log(hasCycleHashSet(createLinkedListWithCycle([3, 2, 0, -4], 1))); // true
console.log(hasCycleHashSet(createLinkedListWithCycle([1], -1))); // false

export {}
