/**
 * Invert Binary Tree
 * Difficulty: Easy
 *
 * Given the root of a binary tree, invert the tree, and return its root.
 *
 * Example 1:
 * Input: root = [4,2,7,1,3,6,9]
 * Output: [4,7,2,9,6,3,1]
 *
 *       4                 4
 *      / \               / \
 *     2   7    =>       7   2
 *    / \ / \           / \ / \
 *   1  3 6  9         9  6 3  1
 *
 * Example 2:
 * Input: root = [2,1,3]
 * Output: [2,3,1]
 *
 * Example 3:
 * Input: root = []
 * Output: []
 *
 * Constraints:
 * - The number of nodes in the tree is in the range [0, 100].
 * - -100 <= Node.val <= 100
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
 * Recursive Approach - O(n) time, O(h) space
 *
 * Key insight: To invert a tree, we swap left and right children at every node.
 *
 * Algorithm:
 * 1. Base case: if node is null, return null
 * 2. Recursively invert left subtree
 * 3. Recursively invert right subtree
 * 4. Swap left and right children
 * 5. Return the root
 *
 * Visual:
 *   Before:       After:
 *      4            4
 *     / \          / \
 *    2   7   =>   7   2
 *
 *   Each node's children are swapped recursively
 */
function invertTree(root: TreeNode | null): TreeNode | null {
  if (root === null) {
    return null;
  }

  // Recursively invert subtrees
  const left = invertTree(root.left);
  const right = invertTree(root.right);

  // Swap children
  root.left = right;
  root.right = left;

  return root;
}

/**
 * Iterative Approach (BFS) - O(n) time, O(n) space
 *
 * Uses a queue to process nodes level by level, swapping children at each node.
 */
function invertTreeIterative(root: TreeNode | null): TreeNode | null {
  if (root === null) {
    return null;
  }

  const queue: TreeNode[] = [root];

  while (queue.length > 0) {
    const node = queue.shift()!;

    // Swap children
    const temp = node.left;
    node.left = node.right;
    node.right = temp;

    // Add children to queue
    if (node.left !== null) {
      queue.push(node.left);
    }
    if (node.right !== null) {
      queue.push(node.right);
    }
  }

  return root;
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

function treeToArray(root: TreeNode | null): (number | null)[] {
  if (root === null) return [];

  const result: (number | null)[] = [];
  const queue: (TreeNode | null)[] = [root];

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node === null) {
      result.push(null);
    } else {
      result.push(node.val);
      queue.push(node.left);
      queue.push(node.right);
    }
  }

  // Remove trailing nulls
  while (result.length > 0 && result[result.length - 1] === null) {
    result.pop();
  }

  return result;
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Invert Binary Tree");
console.log("==========================================");

// Test case 1: Normal tree
console.log(treeToArray(invertTree(createTree([4, 2, 7, 1, 3, 6, 9])))); // [4,7,2,9,6,3,1]

// Test case 2: Small tree
console.log(treeToArray(invertTree(createTree([2, 1, 3])))); // [2,3,1]

// Test case 3: Empty tree
console.log(treeToArray(invertTree(createTree([])))); // []

// Test case 4: Single node
console.log(treeToArray(invertTree(createTree([1])))); // [1]

// Test case 5: Left-skewed tree
console.log(treeToArray(invertTree(createTree([1, 2, null, 3])))); // [1,null,2,null,3]

console.log("\n--- Iterative Approach ---");
console.log(treeToArray(invertTreeIterative(createTree([4, 2, 7, 1, 3, 6, 9])))); // [4,7,2,9,6,3,1]
console.log(treeToArray(invertTreeIterative(createTree([2, 1, 3])))); // [2,3,1]

export {}
