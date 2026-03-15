/**
 * Copy List With Random Pointer
 * Difficulty: Medium
 *
 * A linked list of length n is given such that each node contains an additional
 * random pointer, which could point to any node in the list, or null.
 *
 * Construct a deep copy of the list. The deep copy should consist of exactly n
 * brand new nodes, where each new node has its value set to the value of its
 * corresponding original node. Both the next and random pointer of the new nodes
 * should point to new nodes in the copied list such that the pointers in the
 * original list and copied list represent the same list state.
 *
 * Return the head of the copied linked list.
 *
 * Example 1:
 * Input: head = [[7,null],[13,0],[11,4],[10,2],[1,0]]
 * Output: [[7,null],[13,0],[11,4],[10,2],[1,0]]
 *
 * Example 2:
 * Input: head = [[1,1],[2,1]]
 * Output: [[1,1],[2,1]]
 *
 * Example 3:
 * Input: head = [[3,null],[3,0],[3,null]]
 * Output: [[3,null],[3,0],[3,null]]
 *
 * Constraints:
 * - 0 <= n <= 1000
 * - -10^4 <= Node.val <= 10^4
 * - Node.random is null or is pointing to some node in the linked list.
 */

class RandomNode {
  val: number;
  next: RandomNode | null;
  random: RandomNode | null;

  constructor(val?: number, next?: RandomNode | null, random?: RandomNode | null) {
    this.val = val === undefined ? 0 : val;
    this.next = next === undefined ? null : next;
    this.random = random === undefined ? null : random;
  }
}

/**
 * HashMap Approach - O(n) time, O(n) space
 *
 * Key insight: Use a map to associate each original node with its copy.
 * This allows us to set random pointers by looking up the copy of the
 * random target.
 *
 * Algorithm:
 * 1. First pass: Create all new nodes and map original -> copy
 * 2. Second pass: Set next and random pointers using the map
 */
function copyRandomListHashMap(head: RandomNode | null): RandomNode | null {
  if (head === null) return null;

  // Map from original node to its copy
  const nodeMap = new Map<RandomNode, RandomNode>();

  // First pass: create all nodes
  let curr: RandomNode | null = head;
  while (curr !== null) {
    nodeMap.set(curr, new RandomNode(curr.val));
    curr = curr.next;
  }

  // Second pass: set next and random pointers
  curr = head;
  while (curr !== null) {
    const copy = nodeMap.get(curr)!;
    copy.next = curr.next ? nodeMap.get(curr.next)! : null;
    copy.random = curr.random ? nodeMap.get(curr.random)! : null;
    curr = curr.next;
  }

  return nodeMap.get(head)!;
}

/**
 * Interleaving Approach - O(n) time, O(1) space (excluding output)
 *
 * Key insight: Interleave copied nodes between original nodes.
 * This allows us to find copy of random target by looking at original.random.next
 *
 * Algorithm:
 * 1. Insert copy after each original: A -> A' -> B -> B' -> C -> C'
 * 2. Set random pointers: copy.random = original.random.next
 * 3. Separate lists: restore original and extract copy
 */
function copyRandomListInterleave(head: RandomNode | null): RandomNode | null {
  if (head === null) return null;

  // Step 1: Insert copy after each original node
  let curr: RandomNode | null = head;
  while (curr !== null) {
    const copy = new RandomNode(curr.val);
    copy.next = curr.next;
    curr.next = copy;
    curr = copy.next;
  }

  // Step 2: Set random pointers for copies
  curr = head;
  while (curr !== null) {
    if (curr.random !== null) {
      curr.next!.random = curr.random.next; // Copy's random = original's random's copy
    }
    curr = curr.next!.next; // Move to next original
  }

  // Step 3: Separate the two lists
  const copyHead = head.next!;
  curr = head;
  while (curr !== null) {
    const copy = curr.next!;
    curr.next = copy.next; // Restore original list
    copy.next = copy.next ? copy.next.next : null; // Build copy list
    curr = curr.next;
  }

  return copyHead;
}

// Default uses HashMap (cleaner code)
function copyRandomList(head: RandomNode | null): RandomNode | null {
  return copyRandomListHashMap(head);
}

// ============ Helper Functions ============
function createRandomList(
  values: number[],
  randomIndices: (number | null)[]
): RandomNode | null {
  if (values.length === 0) return null;

  // Create all nodes
  const nodes: RandomNode[] = values.map((val) => new RandomNode(val));

  // Set next pointers
  for (let i = 0; i < nodes.length - 1; i++) {
    nodes[i].next = nodes[i + 1];
  }

  // Set random pointers
  for (let i = 0; i < nodes.length; i++) {
    if (randomIndices[i] !== null) {
      nodes[i].random = nodes[randomIndices[i]!];
    }
  }

  return nodes[0];
}

function randomListToArray(
  head: RandomNode | null
): Array<[number, number | null]> {
  const result: Array<[number, number | null]> = [];
  const nodeToIndex = new Map<RandomNode, number>();

  // First pass: map nodes to indices
  let curr = head;
  let index = 0;
  while (curr !== null) {
    nodeToIndex.set(curr, index++);
    curr = curr.next;
  }

  // Second pass: build result
  curr = head;
  while (curr !== null) {
    const randomIndex = curr.random ? nodeToIndex.get(curr.random)! : null;
    result.push([curr.val, randomIndex]);
    curr = curr.next;
  }

  return result;
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Copy List With Random Pointer");
console.log("==========================================");

// Test case 1: Complex random pointers
const list1 = createRandomList([7, 13, 11, 10, 1], [null, 0, 4, 2, 0]);
console.log(randomListToArray(copyRandomList(list1)));
// [[7,null],[13,0],[11,4],[10,2],[1,0]]

// Test case 2: Self-referencing random
const list2 = createRandomList([1, 2], [1, 1]);
console.log(randomListToArray(copyRandomList(list2)));
// [[1,1],[2,1]]

// Test case 3: All null random pointers
const list3 = createRandomList([3, 3, 3], [null, 0, null]);
console.log(randomListToArray(copyRandomList(list3)));
// [[3,null],[3,0],[3,null]]

// Test case 4: Empty list
console.log(randomListToArray(copyRandomList(null)));
// []

// Test case 5: Single node with null random
const list5 = createRandomList([1], [null]);
console.log(randomListToArray(copyRandomList(list5)));
// [[1,null]]

// Test case 6: Single node pointing to itself
const list6 = createRandomList([5], [0]);
console.log(randomListToArray(copyRandomList(list6)));
// [[5,0]]

console.log("\n--- Interleaving Approach ---");
const list7 = createRandomList([7, 13, 11, 10, 1], [null, 0, 4, 2, 0]);
console.log(randomListToArray(copyRandomListInterleave(list7)));
// [[7,null],[13,0],[11,4],[10,2],[1,0]]

export {}
