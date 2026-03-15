/**
 * Kth Smallest Element in a BST
 * Difficulty: Medium
 *
 * Given the root of a binary search tree, and an integer k, return the kth
 * smallest value (1-indexed) of all the values of the nodes in the tree.
 *
 * Example 1:
 * Input: root = [3,1,4,null,2], k = 1
 * Output: 1
 *
 *     3
 *    / \
 *   1   4
 *    \
 *     2
 *
 * Example 2:
 * Input: root = [5,3,6,2,4,null,null,1], k = 3
 * Output: 3
 *
 *       5
 *      / \
 *     3   6
 *    / \
 *   2   4
 *  /
 * 1
 *
 * Constraints:
 * - The number of nodes in the tree is n.
 * - 1 <= k <= n <= 10^4
 * - 0 <= Node.val <= 10^4
 *
 * Follow up: If the BST is modified often (i.e., we can do insert and delete
 * operations) and you need to find the kth smallest frequently, how would you
 * optimize?
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
 * Inorder Traversal - O(H + k) time, O(H) space
 * where H is tree height
 *
 * Key insight: Inorder traversal of BST visits nodes in ascending order.
 * The kth node visited is the kth smallest.
 *
 * Algorithm:
 * 1. Perform inorder traversal (left, root, right)
 * 2. Count nodes visited
 * 3. When count equals k, return that node's value
 *
 * Visual:
 *     3           Inorder: 1 -> 2 -> 3 -> 4
 *    / \          k=1: return 1
 *   1   4         k=3: return 3
 *    \
 *     2
 */
function kthSmallest(root: TreeNode | null, k: number): number {
  let count = 0;
  let result = 0;

  function inorder(node: TreeNode | null): void {
    if (node === null || count >= k) {
      return;
    }

    // Visit left subtree
    inorder(node.left);

    // Process current node
    count++;
    if (count === k) {
      result = node.val;
      return;
    }

    // Visit right subtree
    inorder(node.right);
  }

  inorder(root);
  return result;
}

/**
 * Iterative Inorder with Stack - O(H + k) time, O(H) space
 *
 * More efficient for early termination.
 */
function kthSmallestIterative(root: TreeNode | null, k: number): number {
  const stack: TreeNode[] = [];
  let current = root;
  let count = 0;

  while (current !== null || stack.length > 0) {
    // Go to leftmost node
    while (current !== null) {
      stack.push(current);
      current = current.left;
    }

    // Process node
    current = stack.pop()!;
    count++;

    if (count === k) {
      return current.val;
    }

    // Move to right subtree
    current = current.right;
  }

  return -1; // Should never reach here if k is valid
}

/**
 * Follow-up: Augmented BST - O(H) time
 *
 * For frequent queries with modifications, augment each node to store
 * the count of nodes in its left subtree. This allows O(H) lookup:
 * - If leftCount + 1 == k, return current node
 * - If leftCount >= k, search in left subtree
 * - Otherwise, search in right subtree with k - leftCount - 1
 */
interface AugmentedNode {
  val: number;
  left: AugmentedNode | null;
  right: AugmentedNode | null;
  leftCount: number; // Number of nodes in left subtree
}

function kthSmallestAugmented(root: AugmentedNode | null, k: number): number {
  if (root === null) return -1;

  const leftCount = root.leftCount;

  if (leftCount + 1 === k) {
    return root.val;
  } else if (leftCount >= k) {
    return kthSmallestAugmented(root.left, k);
  } else {
    return kthSmallestAugmented(root.right, k - leftCount - 1);
  }
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
console.log("Kth Smallest Element in a BST");
console.log("==========================================");

// Test case 1: k=1 (minimum)
console.log(kthSmallest(createTree([3, 1, 4, null, 2]), 1)); // 1

// Test case 2: k=3
console.log(
  kthSmallest(createTree([5, 3, 6, 2, 4, null, null, 1]), 3)
); // 3

// Test case 3: Single node
console.log(kthSmallest(createTree([1]), 1)); // 1

// Test case 4: k equals number of nodes (maximum)
console.log(kthSmallest(createTree([3, 1, 4, null, 2]), 4)); // 4

// Test case 5: Middle element
console.log(kthSmallest(createTree([2, 1, 3]), 2)); // 2

// Test case 6: Larger tree
console.log(kthSmallest(createTree([4, 2, 6, 1, 3, 5, 7]), 5)); // 5

// Test case 7: Left-skewed tree
console.log(kthSmallest(createTree([4, 3, null, 2, null, 1]), 2)); // 2

console.log("\n--- Iterative Approach ---");
console.log(kthSmallestIterative(createTree([3, 1, 4, null, 2]), 1)); // 1
console.log(
  kthSmallestIterative(createTree([5, 3, 6, 2, 4, null, null, 1]), 3)
); // 3
console.log(kthSmallestIterative(createTree([4, 2, 6, 1, 3, 5, 7]), 5)); // 5

export {}
