/**
 * Binary Tree Maximum Path Sum
 * Difficulty: Hard
 *
 * A path in a binary tree is a sequence of nodes where each pair of adjacent
 * nodes in the sequence has an edge connecting them. A node can only appear
 * in the sequence at most once. Note that the path does not need to pass
 * through the root.
 *
 * The path sum of a path is the sum of the node's values in the path.
 *
 * Given the root of a binary tree, return the maximum path sum of any
 * non-empty path.
 *
 * Example 1:
 * Input: root = [1,2,3]
 * Output: 6
 * Explanation: The optimal path is 2 -> 1 -> 3 with a path sum of 2 + 1 + 3 = 6.
 *
 *     1
 *    / \
 *   2   3
 *
 * Example 2:
 * Input: root = [-10,9,20,null,null,15,7]
 * Output: 42
 * Explanation: The optimal path is 15 -> 20 -> 7 with a path sum of 15 + 20 + 7 = 42.
 *
 *      -10
 *      / \
 *     9  20
 *        / \
 *       15  7
 *
 * Constraints:
 * - The number of nodes in the tree is in the range [1, 3 * 10^4].
 * - -1000 <= Node.val <= 1000
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
 * Key insight: For each node, we compute two things:
 * 1. Max path sum passing through this node (could be the answer)
 * 2. Max "gain" this node provides to its parent (one-sided path)
 *
 * A path through a node can include:
 * - Just the node itself
 * - Node + best path from left child
 * - Node + best path from right child
 * - Node + best path from both children (forms a "peak" at this node)
 *
 * But when returning to parent, we can only extend one side (can't go up and down).
 *
 * Algorithm:
 * 1. For each node, compute max gain from left and right children
 * 2. Max gain from a subtree = max(0, subtree's gain) - ignore negative paths
 * 3. Path through current node = node.val + leftGain + rightGain
 * 4. Update global max if this path is better
 * 5. Return node.val + max(leftGain, rightGain) for parent's use
 *
 * Visual:
 *      -10         maxGain(-10) for parent: -10 + max(9, 35) = 25
 *      / \         But path through -10: -10 + 9 + 35 = 34
 *     9  20        At node 20: max path = 20 + 15 + 7 = 42 (global max!)
 *        / \
 *       15  7
 */
function maxPathSum(root: TreeNode | null): number {
  let globalMax = Number.NEGATIVE_INFINITY;

  function maxGain(node: TreeNode | null): number {
    if (node === null) {
      return 0;
    }

    // Max gain from left and right subtrees (ignore negative gains)
    const leftGain = Math.max(0, maxGain(node.left));
    const rightGain = Math.max(0, maxGain(node.right));

    // Path sum through this node (as the "peak")
    const pathThroughNode = node.val + leftGain + rightGain;

    // Update global maximum
    globalMax = Math.max(globalMax, pathThroughNode);

    // Return max gain this node can provide to its parent
    // Can only extend one direction (either left or right path)
    return node.val + Math.max(leftGain, rightGain);
  }

  maxGain(root);
  return globalMax;
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
console.log("Binary Tree Maximum Path Sum");
console.log("==========================================");

// Test case 1: Simple tree, path goes through root
console.log(maxPathSum(createTree([1, 2, 3]))); // 6 (2 -> 1 -> 3)

// Test case 2: Path doesn't include root
console.log(maxPathSum(createTree([-10, 9, 20, null, null, 15, 7]))); // 42 (15 -> 20 -> 7)

// Test case 3: Single node
console.log(maxPathSum(createTree([1]))); // 1

// Test case 4: All negative values
console.log(maxPathSum(createTree([-3]))); // -3

// Test case 5: Negative root, positive children
console.log(maxPathSum(createTree([-1, 2, 3]))); // 4 (2 -> -1 -> 3)

// Test case 6: Left-skewed tree
console.log(maxPathSum(createTree([1, 2, null, 3]))); // 6 (3 -> 2 -> 1)

// Test case 7: Path is a single leaf
console.log(maxPathSum(createTree([-10, -20, -30, 5]))); // 5

// Test case 8: Complex tree
//       5
//      / \
//     4   8
//    /   / \
//   11  13  4
//  / \       \
// 7   2       1
console.log(maxPathSum(createTree([5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1]))); // 48 (7->11->4->5->8->13)

// Test case 9: All same values
console.log(maxPathSum(createTree([1, 1, 1, 1, 1, 1, 1]))); // 4

// Test case 10: Mix of positive and negative
console.log(maxPathSum(createTree([2, -1, -2]))); // 2

export {}
