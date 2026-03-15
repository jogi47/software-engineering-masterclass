/**
 * Same Tree
 * Difficulty: Easy
 *
 * Given the roots of two binary trees p and q, write a function to check
 * if they are the same or not.
 *
 * Two binary trees are considered the same if they are structurally identical,
 * and the nodes have the same value.
 *
 * Example 1:
 * Input: p = [1,2,3], q = [1,2,3]
 * Output: true
 *
 *     1       1
 *    / \     / \
 *   2   3   2   3
 *
 * Example 2:
 * Input: p = [1,2], q = [1,null,2]
 * Output: false
 *
 *     1       1
 *    /         \
 *   2           2
 *
 * Example 3:
 * Input: p = [1,2,1], q = [1,1,2]
 * Output: false
 *
 *     1       1
 *    / \     / \
 *   2   1   1   2
 *
 * Constraints:
 * - The number of nodes in both trees is in the range [0, 100].
 * - -10^4 <= Node.val <= 10^4
 */

class TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
  constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {
    this.val = val === undefined ? 0 : val;
    this.left = left === undefined ? null : left;
    this.right = right === undefined ? null : right;
  }
}

/**
 * Recursive DFS - O(n) time, O(h) space
 *
 * Key insight: Two trees are the same if:
 * 1. Both roots are null (both empty), OR
 * 2. Both roots exist, have the same value, AND their subtrees are the same
 *
 * Algorithm:
 * 1. If both null -> true
 * 2. If one null and one not null -> false
 * 3. If values differ -> false
 * 4. Recursively check left subtrees AND right subtrees
 *
 * Visual:
 *     1       1
 *    / \     / \
 *   2   3   2   3
 *
 *   Compare: 1==1, then (2==2 && 3==3) -> true
 */
function isSameTree(p: TreeNode | null, q: TreeNode | null): boolean {
  // Both null
  if (p === null && q === null) {
    return true;
  }

  // One null, one not null
  if (p === null || q === null) {
    return false;
  }

  // Both exist - compare values and subtrees
  return (
    p.val === q.val &&
    isSameTree(p.left, q.left) &&
    isSameTree(p.right, q.right)
  );
}

/**
 * Iterative BFS - O(n) time, O(n) space
 *
 * Uses two queues to compare nodes level by level.
 */
function isSameTreeIterative(p: TreeNode | null, q: TreeNode | null): boolean {
  const queue: Array<[TreeNode | null, TreeNode | null]> = [[p, q]];

  while (queue.length > 0) {
    const [node1, node2] = queue.shift()!;

    // Both null - continue
    if (node1 === null && node2 === null) {
      continue;
    }

    // One null or values differ
    if (node1 === null || node2 === null || node1.val !== node2.val) {
      return false;
    }

    // Add children pairs to queue
    queue.push([node1.left, node2.left]);
    queue.push([node1.right, node2.right]);
  }

  return true;
}

// ============ Helper Functions ============
function createTree(arr: (number | null)[]): TreeNode | null {
  if (arr.length === 0 || arr[0] === null) return null;

  const root = new TreeNode(arr[0]);
  const queue: TreeNode[] = [root];
  let i = 1;

  while (queue.length > 0 && i < arr.length) {
    const node = queue.shift()!;

    if (i < arr.length && arr[i] !== null) {
      node.left = new TreeNode(arr[i]!);
      queue.push(node.left);
    }
    i++;

    if (i < arr.length && arr[i] !== null) {
      node.right = new TreeNode(arr[i]!);
      queue.push(node.right);
    }
    i++;
  }

  return root;
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Same Tree");
console.log("==========================================");

// Test case 1: Same trees
console.log(isSameTree(createTree([1, 2, 3]), createTree([1, 2, 3]))); // true

// Test case 2: Different structure
console.log(isSameTree(createTree([1, 2]), createTree([1, null, 2]))); // false

// Test case 3: Different values
console.log(isSameTree(createTree([1, 2, 1]), createTree([1, 1, 2]))); // false

// Test case 4: Both empty
console.log(isSameTree(createTree([]), createTree([]))); // true

// Test case 5: One empty
console.log(isSameTree(createTree([1]), createTree([]))); // false

// Test case 6: Single same node
console.log(isSameTree(createTree([1]), createTree([1]))); // true

// Test case 7: Larger same trees
console.log(
  isSameTree(createTree([1, 2, 3, 4, 5, 6, 7]), createTree([1, 2, 3, 4, 5, 6, 7]))
); // true

console.log("\n--- Iterative Approach ---");
console.log(
  isSameTreeIterative(createTree([1, 2, 3]), createTree([1, 2, 3]))
); // true
console.log(
  isSameTreeIterative(createTree([1, 2]), createTree([1, null, 2]))
); // false

export {}
