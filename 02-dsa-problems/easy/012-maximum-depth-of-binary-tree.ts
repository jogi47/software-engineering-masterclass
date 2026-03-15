/**
 * Maximum Depth of Binary Tree
 * Difficulty: Easy
 *
 * Given the root of a binary tree, return its maximum depth.
 *
 * A binary tree's maximum depth is the number of nodes along the longest
 * path from the root node down to the farthest leaf node.
 *
 * Example 1:
 * Input: root = [3,9,20,null,null,15,7]
 * Output: 3
 *
 *       3
 *      / \
 *     9  20
 *        / \
 *       15  7
 *
 * Example 2:
 * Input: root = [1,null,2]
 * Output: 2
 *
 * Constraints:
 * - The number of nodes in the tree is in the range [0, 10^4].
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
 * Recursive DFS Approach - O(n) time, O(h) space
 *
 * Key insight: The depth of a tree is 1 + max(depth of left subtree, depth of right subtree)
 *
 * Algorithm:
 * 1. Base case: if node is null, return 0
 * 2. Recursively get depth of left subtree
 * 3. Recursively get depth of right subtree
 * 4. Return 1 + max(leftDepth, rightDepth)
 *
 * Visual:
 *       3          depth = 1 + max(1, 2) = 3
 *      / \
 *     9  20        left depth = 1, right depth = 1 + max(1, 1) = 2
 *        / \
 *       15  7      depth = 1
 */
function maxDepth(root: TreeNode | null): number {
  if (root === null) {
    return 0;
  }

  const leftDepth = maxDepth(root.left);
  const rightDepth = maxDepth(root.right);

  return 1 + Math.max(leftDepth, rightDepth);
}

/**
 * Iterative BFS Approach - O(n) time, O(n) space
 *
 * Uses level-order traversal, counting the number of levels.
 */
function maxDepthBFS(root: TreeNode | null): number {
  if (root === null) {
    return 0;
  }

  const queue: TreeNode[] = [root];
  let depth = 0;

  while (queue.length > 0) {
    const levelSize = queue.length;
    depth++;

    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;

      if (node.left !== null) {
        queue.push(node.left);
      }
      if (node.right !== null) {
        queue.push(node.right);
      }
    }
  }

  return depth;
}

/**
 * Iterative DFS Approach (with stack) - O(n) time, O(n) space
 *
 * Uses a stack to track nodes and their depths.
 */
function maxDepthDFS(root: TreeNode | null): number {
  if (root === null) {
    return 0;
  }

  const stack: Array<{ node: TreeNode; depth: number }> = [
    { node: root, depth: 1 },
  ];
  let maxD = 0;

  while (stack.length > 0) {
    const { node, depth } = stack.pop()!;
    maxD = Math.max(maxD, depth);

    if (node.right !== null) {
      stack.push({ node: node.right, depth: depth + 1 });
    }
    if (node.left !== null) {
      stack.push({ node: node.left, depth: depth + 1 });
    }
  }

  return maxD;
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
console.log("Maximum Depth of Binary Tree");
console.log("==========================================");

// Test case 1: Normal tree
console.log(maxDepth(createTree([3, 9, 20, null, null, 15, 7]))); // 3

// Test case 2: Right-skewed tree
console.log(maxDepth(createTree([1, null, 2]))); // 2

// Test case 3: Empty tree
console.log(maxDepth(createTree([]))); // 0

// Test case 4: Single node
console.log(maxDepth(createTree([1]))); // 1

// Test case 5: Left-skewed tree
console.log(maxDepth(createTree([1, 2, null, 3, null, 4]))); // 4

// Test case 6: Balanced tree
console.log(maxDepth(createTree([1, 2, 3, 4, 5, 6, 7]))); // 3

console.log("\n--- BFS Approach ---");
console.log(maxDepthBFS(createTree([3, 9, 20, null, null, 15, 7]))); // 3
console.log(maxDepthBFS(createTree([1, null, 2]))); // 2

console.log("\n--- DFS with Stack ---");
console.log(maxDepthDFS(createTree([3, 9, 20, null, null, 15, 7]))); // 3
console.log(maxDepthDFS(createTree([1, null, 2]))); // 2

export {}
