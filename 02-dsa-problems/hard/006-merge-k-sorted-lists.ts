/**
 * Merge K Sorted Lists
 * Difficulty: Hard
 *
 * You are given an array of k linked-lists lists, each linked-list is sorted
 * in ascending order.
 *
 * Merge all the linked-lists into one sorted linked-list and return it.
 *
 * Example 1:
 * Input: lists = [[1,4,5],[1,3,4],[2,6]]
 * Output: [1,1,2,3,4,4,5,6]
 * Explanation: The linked-lists are:
 * [
 *   1->4->5,
 *   1->3->4,
 *   2->6
 * ]
 * merging them into one sorted list: 1->1->2->3->4->4->5->6
 *
 * Example 2:
 * Input: lists = []
 * Output: []
 *
 * Example 3:
 * Input: lists = [[]]
 * Output: []
 *
 * Constraints:
 * - k == lists.length
 * - 0 <= k <= 10^4
 * - 0 <= lists[i].length <= 500
 * - -10^4 <= lists[i][j] <= 10^4
 * - lists[i] is sorted in ascending order.
 * - The sum of lists[i].length will not exceed 10^4.
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
 * Min-Heap Approach - O(N log k) time, O(k) space
 * where N = total number of nodes, k = number of lists
 *
 * Key insight: Use a min-heap to efficiently find the minimum among k list heads.
 *
 * Algorithm:
 * 1. Add all non-null list heads to min-heap
 * 2. While heap is not empty:
 *    - Extract minimum node
 *    - Add to result
 *    - If node has next, add next to heap
 * 3. Return result
 *
 * Note: JavaScript doesn't have a built-in heap, so we implement a simple one.
 */
class ListNodeMinHeap {
  private heap: ListNode[];

  constructor() {
    this.heap = [];
  }

  size(): number {
    return this.heap.length;
  }

  push(node: ListNode): void {
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): ListNode | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop();

    const min = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.bubbleDown(0);
    return min;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].val <= this.heap[index].val) break;
      [this.heap[parentIndex], this.heap[index]] = [
        this.heap[index],
        this.heap[parentIndex],
      ];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      if (
        leftChild < length &&
        this.heap[leftChild].val < this.heap[smallest].val
      ) {
        smallest = leftChild;
      }
      if (
        rightChild < length &&
        this.heap[rightChild].val < this.heap[smallest].val
      ) {
        smallest = rightChild;
      }

      if (smallest === index) break;

      [this.heap[index], this.heap[smallest]] = [
        this.heap[smallest],
        this.heap[index],
      ];
      index = smallest;
    }
  }
}

function mergeKListsHeap(lists: Array<ListNode | null>): ListNode | null {
  const heap = new ListNodeMinHeap();

  // Add all non-null heads to heap
  for (const head of lists) {
    if (head !== null) {
      heap.push(head);
    }
  }

  const dummy = new ListNode(0);
  let tail = dummy;

  while (heap.size() > 0) {
    const minNode = heap.pop()!;
    tail.next = minNode;
    tail = tail.next;

    if (minNode.next !== null) {
      heap.push(minNode.next);
    }
  }

  return dummy.next;
}

/**
 * Divide and Conquer Approach - O(N log k) time, O(log k) space (recursion)
 *
 * Key insight: Repeatedly merge pairs of lists until one remains.
 * Like merge sort, but on lists instead of arrays.
 *
 * Algorithm:
 * 1. Pair up k lists and merge each pair
 * 2. After first round, k lists become k/2
 * 3. Repeat until only one list remains
 */
function mergeKListsDivideConquer(
  lists: Array<ListNode | null>
): ListNode | null {
  if (lists.length === 0) return null;

  // Keep merging pairs until one list remains
  while (lists.length > 1) {
    const mergedLists: Array<ListNode | null> = [];

    for (let i = 0; i < lists.length; i += 2) {
      const l1 = lists[i];
      const l2 = i + 1 < lists.length ? lists[i + 1] : null;
      mergedLists.push(mergeTwoLists(l1, l2));
    }

    lists = mergedLists;
  }

  return lists[0];
}

/**
 * Helper: Merge two sorted lists
 */
function mergeTwoLists(
  l1: ListNode | null,
  l2: ListNode | null
): ListNode | null {
  const dummy = new ListNode(0);
  let tail = dummy;

  while (l1 !== null && l2 !== null) {
    if (l1.val <= l2.val) {
      tail.next = l1;
      l1 = l1.next;
    } else {
      tail.next = l2;
      l2 = l2.next;
    }
    tail = tail.next;
  }

  tail.next = l1 !== null ? l1 : l2;
  return dummy.next;
}

// Default uses Heap approach
function mergeKLists(lists: Array<ListNode | null>): ListNode | null {
  return mergeKListsHeap(lists);
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
console.log("Merge K Sorted Lists");
console.log("==========================================");

// Test case 1: Multiple lists
console.log(
  linkedListToArray(
    mergeKLists([
      createLinkedList([1, 4, 5]),
      createLinkedList([1, 3, 4]),
      createLinkedList([2, 6]),
    ])
  )
); // [1,1,2,3,4,4,5,6]

// Test case 2: Empty array
console.log(linkedListToArray(mergeKLists([]))); // []

// Test case 3: Array with empty list
console.log(linkedListToArray(mergeKLists([createLinkedList([])]))); // []

// Test case 4: Single list
console.log(linkedListToArray(mergeKLists([createLinkedList([1, 2, 3])]))); // [1,2,3]

// Test case 5: Two lists
console.log(
  linkedListToArray(
    mergeKLists([createLinkedList([1, 3, 5]), createLinkedList([2, 4, 6])])
  )
); // [1,2,3,4,5,6]

// Test case 6: Lists with different lengths
console.log(
  linkedListToArray(
    mergeKLists([
      createLinkedList([1]),
      createLinkedList([2, 3, 4, 5]),
      createLinkedList([6, 7]),
    ])
  )
); // [1,2,3,4,5,6,7]

// Test case 7: All same values
console.log(
  linkedListToArray(
    mergeKLists([
      createLinkedList([1, 1]),
      createLinkedList([1, 1]),
      createLinkedList([1]),
    ])
  )
); // [1,1,1,1,1]

console.log("\n--- Divide and Conquer Approach ---");
console.log(
  linkedListToArray(
    mergeKListsDivideConquer([
      createLinkedList([1, 4, 5]),
      createLinkedList([1, 3, 4]),
      createLinkedList([2, 6]),
    ])
  )
); // [1,1,2,3,4,4,5,6]

export {}
