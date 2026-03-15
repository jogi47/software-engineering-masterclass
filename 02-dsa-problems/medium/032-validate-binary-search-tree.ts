/**
 * Validate Binary Search Tree
 * Difficulty: Medium
 *
 * Given the root of a binary tree, determine if it is a valid binary search
 * tree (BST).
 *
 * A valid BST is defined as follows:
 * - The left subtree of a node contains only nodes with keys less than the
 *   node's key.
 * - The right subtree of a node contains only nodes with keys greater than
 *   the node's key.
 * - Both the left and right subtrees must also be binary search trees.
 *
 * Example 1:
 * Input: root = [2,1,3]
 * Output: true
 *
 *     2
 *    / \
 *   1   3
 *
 * Example 2:
 * Input: root = [5,1,4,null,null,3,6]
 * Output: false
 * Explanation: The root node's value is 5 but its right child's value is 4.
 *
 *     5
 *    / \
 *   1   4
 *      / \
 *     3   6
 *
 * Constraints:
 * - The number of nodes in the tree is in the range [1, 10^4].
 * - -2^31 <= Node.val <= 2^31 - 1
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
 * Range Checking DFS - O(n) time, O(h) space
 *
 * Key insight: Each node has a valid range (min, max). The node's value
 * must be within this range. When we go left, the max becomes the parent's
 * value. When we go right, the min becomes the parent's value.
 *
 * Algorithm:
 * 1. Start with range (-infinity, +infinity)
 * 2. At each node, check if value is within range
 * 3. For left child: update max to current value
 * 4. For right child: update min to current value
 * 5. Recursively validate subtrees
 *
 * Visual:
 *     5 (range: -inf to +inf)
 *    / \
 *   1   4 (range: 5 to +inf) -> 4 < 5 -> INVALID!
 *
 *     5 (range: -inf to +inf)
 *    / \
 *   1   7 (range: 5 to +inf) -> 7 > 5 -> valid
 */
function isValidBST(root: TreeNode | null): boolean {
  function validate(
    node: TreeNode | null,
    min: number,
    max: number
  ): boolean {
    if (node === null) {
      return true;
    }

    // Check if current value is within valid range
    if (node.val <= min || node.val >= max) {
      return false;
    }

    // Validate left subtree (all values must be < node.val)
    // Validate right subtree (all values must be > node.val)
    return (
      validate(node.left, min, node.val) &&
      validate(node.right, node.val, max)
    );
  }

  return validate(root, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);
}

/**
 * Inorder Traversal Approach - O(n) time, O(h) space
 *
 * Key insight: Inorder traversal of a valid BST produces sorted values.
 * If at any point the current value is <= previous value, it's invalid.
 */
function isValidBSTInorder(root: TreeNode | null): boolean {
  let prev = Number.NEGATIVE_INFINITY;

  function inorder(node: TreeNode | null): boolean {
    if (node === null) {
      return true;
    }

    // Check left subtree
    if (!inorder(node.left)) {
      return false;
    }

    // Check current node against previous
    if (node.val <= prev) {
      return false;
    }
    prev = node.val;

    // Check right subtree
    return inorder(node.right);
  }

  return inorder(root);
}

/**
 * Iterative Inorder - O(n) time, O(h) space
 *
 * Uses stack for iterative inorder traversal.
 */
function isValidBSTIterative(root: TreeNode | null): boolean {
  const stack: TreeNode[] = [];
  let prev = Number.NEGATIVE_INFINITY;
  let current = root;

  while (current !== null || stack.length > 0) {
    // Go to leftmost node
    while (current !== null) {
      stack.push(current);
      current = current.left;
    }

    // Process current node
    current = stack.pop()!;

    // Check BST property
    if (current.val <= prev) {
      return false;
    }
    prev = current.val;

    // Move to right subtree
    current = current.right;
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
console.log("Validate Binary Search Tree");
console.log("==========================================");

// Test case 1: Valid BST
console.log(isValidBST(createTree([2, 1, 3]))); // true

// Test case 2: Invalid BST (right child smaller than root)
console.log(isValidBST(createTree([5, 1, 4, null, null, 3, 6]))); // false

// Test case 3: Single node
console.log(isValidBST(createTree([1]))); // true

// Test case 4: Invalid - left subtree has value greater than root
//     5
//    / \
//   4   6
//  / \
// 3   7   <- 7 > 5, invalid!
console.log(isValidBST(createTree([5, 4, 6, 3, 7]))); // false

// Test case 5: Valid larger BST
console.log(isValidBST(createTree([4, 2, 6, 1, 3, 5, 7]))); // true

// Test case 6: Equal values (not valid BST)
console.log(isValidBST(createTree([2, 2, 2]))); // false

// Test case 7: Left-skewed valid BST
console.log(isValidBST(createTree([3, 2, null, 1]))); // true

console.log("\n--- Inorder Approach ---");
console.log(isValidBSTInorder(createTree([2, 1, 3]))); // true
console.log(isValidBSTInorder(createTree([5, 1, 4, null, null, 3, 6]))); // false

console.log("\n--- Iterative Approach ---");
console.log(isValidBSTIterative(createTree([2, 1, 3]))); // true
console.log(isValidBSTIterative(createTree([5, 1, 4, null, null, 3, 6]))); // false

export {}
