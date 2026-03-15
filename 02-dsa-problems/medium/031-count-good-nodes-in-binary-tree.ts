/**
 * Count Good Nodes in Binary Tree
 * Difficulty: Medium
 *
 * Given a binary tree root, a node X in the tree is named good if in the path
 * from root to X there are no nodes with a value greater than X.
 *
 * Return the number of good nodes in the binary tree.
 *
 * Example 1:
 * Input: root = [3,1,4,3,null,1,5]
 * Output: 4
 * Explanation: Nodes in blue are good.
 * - Root node (3) is always good.
 * - Node 4 -> (3,4) is the path. 4 >= 3, so it's good.
 * - Node 5 -> (3,4,5) is the path. 5 >= 4, so it's good.
 * - Node 3 -> (3,1,3) is the path. 3 >= 1 and 3 >= 3, so it's good.
 *
 *       3
 *      / \
 *     1   4
 *    /   / \
 *   3   1   5
 *
 * Example 2:
 * Input: root = [3,3,null,4,2]
 * Output: 3
 * Explanation: Node 2 -> (3,3,2) is not good, because 3 > 2.
 *
 * Example 3:
 * Input: root = [1]
 * Output: 1
 * Explanation: Root is always good.
 *
 * Constraints:
 * - The number of nodes in the binary tree is in the range [1, 10^5].
 * - Each node's value is between [-10^4, 10^4].
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
 * DFS with Max Tracking - O(n) time, O(h) space
 *
 * Key insight: A node is "good" if its value >= maximum value seen on the
 * path from root to this node.
 *
 * Algorithm:
 * 1. DFS traversal passing the maximum value seen so far
 * 2. At each node, check if node.val >= maxSoFar
 * 3. If yes, count it as good and update maxSoFar
 * 4. Recurse on children with updated max
 *
 * Visual:
 *       3(max=3)     good (3 >= -inf)
 *      / \
 *    1(3) 4(3)       1 not good (1 < 3), 4 is good (4 >= 3)
 *    /   / \
 *  3(3) 1(4) 5(4)    left 3 good (3 >= 3), 1 not good (1 < 4), 5 good (5 >= 4)
 */
function goodNodes(root: TreeNode | null): number {
  function dfs(node: TreeNode | null, maxSoFar: number): number {
    if (node === null) {
      return 0;
    }

    let count = 0;

    // Check if current node is good
    if (node.val >= maxSoFar) {
      count = 1;
    }

    // Update max for children
    const newMax = Math.max(maxSoFar, node.val);

    // Count good nodes in subtrees
    count += dfs(node.left, newMax);
    count += dfs(node.right, newMax);

    return count;
  }

  return dfs(root, Number.NEGATIVE_INFINITY);
}

/**
 * Iterative BFS with Max Tracking - O(n) time, O(n) space
 */
function goodNodesBFS(root: TreeNode | null): number {
  if (root === null) return 0;

  let count = 0;
  const queue: Array<{ node: TreeNode; maxSoFar: number }> = [
    { node: root, maxSoFar: Number.NEGATIVE_INFINITY },
  ];

  while (queue.length > 0) {
    const { node, maxSoFar } = queue.shift()!;

    if (node.val >= maxSoFar) {
      count++;
    }

    const newMax = Math.max(maxSoFar, node.val);

    if (node.left !== null) {
      queue.push({ node: node.left, maxSoFar: newMax });
    }
    if (node.right !== null) {
      queue.push({ node: node.right, maxSoFar: newMax });
    }
  }

  return count;
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
console.log("Count Good Nodes in Binary Tree");
console.log("==========================================");

// Test case 1: Mixed good and bad nodes
console.log(goodNodes(createTree([3, 1, 4, 3, null, 1, 5]))); // 4

// Test case 2: Some nodes smaller than ancestors
console.log(goodNodes(createTree([3, 3, null, 4, 2]))); // 3

// Test case 3: Single node
console.log(goodNodes(createTree([1]))); // 1

// Test case 4: Increasing path (all good)
console.log(goodNodes(createTree([1, 2, 3, 4, 5, 6, 7]))); // 7

// Test case 5: Decreasing path (only root good)
console.log(goodNodes(createTree([5, 4, 3, 2, 1]))); // 1

// Test case 6: Negative values
console.log(goodNodes(createTree([-1, -2, -3, -4]))); // 1

// Test case 7: All same values (all good)
console.log(goodNodes(createTree([2, 2, 2, 2, 2, 2, 2]))); // 7

console.log("\n--- BFS Approach ---");
console.log(goodNodesBFS(createTree([3, 1, 4, 3, null, 1, 5]))); // 4
console.log(goodNodesBFS(createTree([3, 3, null, 4, 2]))); // 3

export {}
