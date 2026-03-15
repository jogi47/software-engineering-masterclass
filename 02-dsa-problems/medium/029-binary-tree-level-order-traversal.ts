/**
 * Binary Tree Level Order Traversal
 * Difficulty: Medium
 *
 * Given the root of a binary tree, return the level order traversal of its
 * nodes' values. (i.e., from left to right, level by level).
 *
 * Example 1:
 * Input: root = [3,9,20,null,null,15,7]
 * Output: [[3],[9,20],[15,7]]
 *
 *       3
 *      / \
 *     9  20
 *        / \
 *       15  7
 *
 * Example 2:
 * Input: root = [1]
 * Output: [[1]]
 *
 * Example 3:
 * Input: root = []
 * Output: []
 *
 * Constraints:
 * - The number of nodes in the tree is in the range [0, 2000].
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
 * BFS with Queue - O(n) time, O(n) space
 *
 * Key insight: Use BFS to process nodes level by level.
 * Track the number of nodes at each level to group them correctly.
 *
 * Algorithm:
 * 1. Initialize queue with root
 * 2. While queue is not empty:
 *    a. Record current queue size (nodes in this level)
 *    b. Process all nodes at this level
 *    c. Add their children to queue for next level
 * 3. Return result
 *
 * Visual:
 *       3          Level 0: [3]       queue: [3] -> [9,20]
 *      / \         Level 1: [9,20]    queue: [9,20] -> [15,7]
 *     9  20        Level 2: [15,7]    queue: [15,7] -> []
 *        / \
 *       15  7
 */
function levelOrder(root: TreeNode | null): number[][] {
  if (root === null) {
    return [];
  }

  const result: number[][] = [];
  const queue: TreeNode[] = [root];

  while (queue.length > 0) {
    const levelSize = queue.length;
    const currentLevel: number[] = [];

    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      currentLevel.push(node.val);

      if (node.left !== null) {
        queue.push(node.left);
      }
      if (node.right !== null) {
        queue.push(node.right);
      }
    }

    result.push(currentLevel);
  }

  return result;
}

/**
 * DFS with Level Tracking - O(n) time, O(n) space
 *
 * Alternative approach using DFS, passing level as parameter.
 */
function levelOrderDFS(root: TreeNode | null): number[][] {
  const result: number[][] = [];

  function dfs(node: TreeNode | null, level: number): void {
    if (node === null) return;

    // Create new level array if needed
    if (result.length === level) {
      result.push([]);
    }

    result[level].push(node.val);

    dfs(node.left, level + 1);
    dfs(node.right, level + 1);
  }

  dfs(root, 0);
  return result;
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
console.log("Binary Tree Level Order Traversal");
console.log("==========================================");

// Test case 1: Normal tree
console.log(JSON.stringify(levelOrder(createTree([3, 9, 20, null, null, 15, 7])))); // [[3],[9,20],[15,7]]

// Test case 2: Single node
console.log(JSON.stringify(levelOrder(createTree([1])))); // [[1]]

// Test case 3: Empty tree
console.log(JSON.stringify(levelOrder(createTree([])))); // []

// Test case 4: Left-skewed tree
console.log(JSON.stringify(levelOrder(createTree([1, 2, null, 3])))); // [[1],[2],[3]]

// Test case 5: Right-skewed tree
console.log(JSON.stringify(levelOrder(createTree([1, null, 2, null, 3])))); // [[1],[2],[3]]

// Test case 6: Perfect binary tree
console.log(JSON.stringify(levelOrder(createTree([1, 2, 3, 4, 5, 6, 7])))); // [[1],[2,3],[4,5,6,7]]

// Test case 7: Unbalanced tree
console.log(JSON.stringify(levelOrder(createTree([1, 2, 3, 4, null, null, 5])))); // [[1],[2,3],[4,5]]

console.log("\n--- DFS Approach ---");
console.log(JSON.stringify(levelOrderDFS(createTree([3, 9, 20, null, null, 15, 7])))); // [[3],[9,20],[15,7]]
console.log(JSON.stringify(levelOrderDFS(createTree([1, 2, 3, 4, 5, 6, 7])))); // [[1],[2,3],[4,5,6,7]]

export {}
