/**
 * Binary Tree Right Side View
 * Difficulty: Medium
 *
 * Given the root of a binary tree, imagine yourself standing on the right
 * side of it, return the values of the nodes you can see ordered from top
 * to bottom.
 *
 * Example 1:
 * Input: root = [1,2,3,null,5,null,4]
 * Output: [1,3,4]
 *
 *       1      <--- see 1
 *      / \
 *     2   3   <--- see 3
 *      \   \
 *       5   4 <--- see 4
 *
 * Example 2:
 * Input: root = [1,null,3]
 * Output: [1,3]
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
 * BFS Level Order - O(n) time, O(n) space
 *
 * Key insight: The rightmost node at each level is visible from the right.
 * Use BFS and take the last node of each level.
 *
 * Algorithm:
 * 1. Use BFS level order traversal
 * 2. For each level, record the last node's value
 * 3. Return all recorded values
 *
 * Visual:
 *       1      Level 0: [1]       -> 1 (last)
 *      / \
 *     2   3   Level 1: [2, 3]    -> 3 (last)
 *      \   \
 *       5   4 Level 2: [5, 4]    -> 4 (last)
 */
function rightSideView(root: TreeNode | null): number[] {
  if (root === null) {
    return [];
  }

  const result: number[] = [];
  const queue: TreeNode[] = [root];

  while (queue.length > 0) {
    const levelSize = queue.length;

    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;

      // Last node in level
      if (i === levelSize - 1) {
        result.push(node.val);
      }

      if (node.left !== null) {
        queue.push(node.left);
      }
      if (node.right !== null) {
        queue.push(node.right);
      }
    }
  }

  return result;
}

/**
 * DFS Right-First - O(n) time, O(h) space
 *
 * Visit right subtree before left. First node seen at each level
 * is the rightmost node.
 */
function rightSideViewDFS(root: TreeNode | null): number[] {
  const result: number[] = [];

  function dfs(node: TreeNode | null, level: number): void {
    if (node === null) return;

    // First time reaching this level = rightmost node
    if (result.length === level) {
      result.push(node.val);
    }

    // Visit right subtree first
    dfs(node.right, level + 1);
    dfs(node.left, level + 1);
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
console.log("Binary Tree Right Side View");
console.log("==========================================");

// Test case 1: Normal tree
console.log(rightSideView(createTree([1, 2, 3, null, 5, null, 4]))); // [1,3,4]

// Test case 2: Right-only tree
console.log(rightSideView(createTree([1, null, 3]))); // [1,3]

// Test case 3: Empty tree
console.log(rightSideView(createTree([]))); // []

// Test case 4: Single node
console.log(rightSideView(createTree([1]))); // [1]

// Test case 5: Left-skewed tree (left nodes visible)
console.log(rightSideView(createTree([1, 2, null, 3]))); // [1,2,3]

// Test case 6: Left deeper than right
//       1
//      / \
//     2   3
//    /
//   4       <- visible from right because right subtree ends
console.log(rightSideView(createTree([1, 2, 3, 4]))); // [1,3,4]

// Test case 7: Perfect binary tree
console.log(rightSideView(createTree([1, 2, 3, 4, 5, 6, 7]))); // [1,3,7]

console.log("\n--- DFS Approach ---");
console.log(rightSideViewDFS(createTree([1, 2, 3, null, 5, null, 4]))); // [1,3,4]
console.log(rightSideViewDFS(createTree([1, 2, 3, 4]))); // [1,3,4]

export {}
