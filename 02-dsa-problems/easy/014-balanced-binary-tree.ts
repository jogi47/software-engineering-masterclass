/**
 * Balanced Binary Tree
 * Difficulty: Easy
 *
 * Given a binary tree, determine if it is height-balanced.
 *
 * A height-balanced binary tree is a binary tree in which the depth of the
 * two subtrees of every node never differs by more than one.
 *
 * Example 1:
 * Input: root = [3,9,20,null,null,15,7]
 * Output: true
 *
 *       3
 *      / \
 *     9  20
 *        / \
 *       15  7
 *
 * Example 2:
 * Input: root = [1,2,2,3,3,null,null,4,4]
 * Output: false
 *
 *          1
 *         / \
 *        2   2
 *       / \
 *      3   3
 *     / \
 *    4   4
 *
 * Example 3:
 * Input: root = []
 * Output: true
 *
 * Constraints:
 * - The number of nodes in the tree is in the range [0, 5000].
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
 * Optimized DFS - O(n) time, O(h) space
 *
 * Key insight: Check balance while computing height in a single pass.
 * Return -1 to signal imbalance, otherwise return the actual height.
 *
 * Algorithm:
 * 1. Base case: null node has height 0
 * 2. Recursively get height of left subtree (-1 means unbalanced)
 * 3. Recursively get height of right subtree (-1 means unbalanced)
 * 4. If either subtree is unbalanced, return -1
 * 5. If height difference > 1, return -1
 * 6. Otherwise return 1 + max(leftHeight, rightHeight)
 *
 * Visual:
 *       1          Check: |1 - 3| > 1 => unbalanced
 *      / \
 *     2   2        left height = 3, right height = 1
 *    / \
 *   3   3
 *  / \
 * 4   4
 */
function isBalanced(root: TreeNode | null): boolean {
  function getHeight(node: TreeNode | null): number {
    if (node === null) {
      return 0;
    }

    const leftHeight = getHeight(node.left);
    if (leftHeight === -1) return -1; // Left subtree unbalanced

    const rightHeight = getHeight(node.right);
    if (rightHeight === -1) return -1; // Right subtree unbalanced

    // Check if current node is balanced
    if (Math.abs(leftHeight - rightHeight) > 1) {
      return -1;
    }

    return 1 + Math.max(leftHeight, rightHeight);
  }

  return getHeight(root) !== -1;
}

/**
 * Top-Down Approach (Less Optimal) - O(n^2) time, O(h) space
 *
 * More intuitive but less efficient: check balance at each node separately.
 */
function isBalancedTopDown(root: TreeNode | null): boolean {
  if (root === null) {
    return true;
  }

  function height(node: TreeNode | null): number {
    if (node === null) return 0;
    return 1 + Math.max(height(node.left), height(node.right));
  }

  const leftHeight = height(root.left);
  const rightHeight = height(root.right);

  return (
    Math.abs(leftHeight - rightHeight) <= 1 &&
    isBalancedTopDown(root.left) &&
    isBalancedTopDown(root.right)
  );
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
console.log("Balanced Binary Tree");
console.log("==========================================");

// Test case 1: Balanced tree
console.log(isBalanced(createTree([3, 9, 20, null, null, 15, 7]))); // true

// Test case 2: Unbalanced tree
console.log(isBalanced(createTree([1, 2, 2, 3, 3, null, null, 4, 4]))); // false

// Test case 3: Empty tree
console.log(isBalanced(createTree([]))); // true

// Test case 4: Single node
console.log(isBalanced(createTree([1]))); // true

// Test case 5: Left-skewed but balanced
console.log(isBalanced(createTree([1, 2, null, 3]))); // false (height diff = 2)

// Test case 6: Perfect binary tree
console.log(isBalanced(createTree([1, 2, 3, 4, 5, 6, 7]))); // true

// Test case 7: Almost balanced
console.log(isBalanced(createTree([1, 2, 3, 4]))); // true (height diff = 1)

console.log("\n--- Top-Down Approach ---");
console.log(isBalancedTopDown(createTree([3, 9, 20, null, null, 15, 7]))); // true
console.log(isBalancedTopDown(createTree([1, 2, 2, 3, 3, null, null, 4, 4]))); // false

export {}
