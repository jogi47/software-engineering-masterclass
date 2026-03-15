/**
 * Diameter of Binary Tree
 * Difficulty: Easy
 *
 * Given the root of a binary tree, return the length of the diameter of the tree.
 *
 * The diameter of a binary tree is the length of the longest path between any
 * two nodes in a tree. This path may or may not pass through the root.
 *
 * The length of a path between two nodes is represented by the number of edges
 * between them.
 *
 * Example 1:
 * Input: root = [1,2,3,4,5]
 * Output: 3
 * Explanation: 3 is the length of the path [4,2,1,3] or [5,2,1,3].
 *
 *       1
 *      / \
 *     2   3
 *    / \
 *   4   5
 *
 * Example 2:
 * Input: root = [1,2]
 * Output: 1
 *
 * Constraints:
 * - The number of nodes in the tree is in the range [1, 10^4].
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
 * DFS with Global Max - O(n) time, O(h) space
 *
 * Key insight: The diameter through any node = leftHeight + rightHeight
 * We need to find the maximum diameter across all nodes.
 *
 * Algorithm:
 * 1. For each node, calculate:
 *    - The height of its left subtree
 *    - The height of its right subtree
 * 2. The diameter through this node = leftHeight + rightHeight
 * 3. Track the maximum diameter seen
 * 4. Return the height for parent's calculation: 1 + max(leftHeight, rightHeight)
 *
 * Visual:
 *       1           leftH=2, rightH=1, diameter=3
 *      / \
 *     2   3         leftH=1, rightH=1, diameter=2
 *    / \
 *   4   5           height=1 (leaf nodes)
 *
 * The path [4,2,1,3] has length 3 (3 edges)
 */
function diameterOfBinaryTree(root: TreeNode | null): number {
  let maxDiameter = 0;

  function height(node: TreeNode | null): number {
    if (node === null) {
      return 0;
    }

    const leftHeight = height(node.left);
    const rightHeight = height(node.right);

    // Update max diameter (path through this node)
    maxDiameter = Math.max(maxDiameter, leftHeight + rightHeight);

    // Return height for parent's calculation
    return 1 + Math.max(leftHeight, rightHeight);
  }

  height(root);
  return maxDiameter;
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
console.log("Diameter of Binary Tree");
console.log("==========================================");

// Test case 1: Normal tree (path goes through root)
console.log(diameterOfBinaryTree(createTree([1, 2, 3, 4, 5]))); // 3

// Test case 2: Two nodes
console.log(diameterOfBinaryTree(createTree([1, 2]))); // 1

// Test case 3: Single node
console.log(diameterOfBinaryTree(createTree([1]))); // 0

// Test case 4: Left-skewed tree
console.log(diameterOfBinaryTree(createTree([1, 2, null, 3, null, 4]))); // 3

// Test case 5: Diameter not through root
//       1
//      /
//     2
//    / \
//   3   4
//  /     \
// 5       6
// Diameter is [5,3,2,4,6] = 4
console.log(
  diameterOfBinaryTree(createTree([1, 2, null, 3, 4, 5, null, null, 6]))
); // 4

// Test case 6: Balanced tree
console.log(diameterOfBinaryTree(createTree([1, 2, 3, 4, 5, 6, 7]))); // 4

export {}
