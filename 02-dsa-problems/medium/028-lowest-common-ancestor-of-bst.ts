/**
 * Lowest Common Ancestor of a Binary Search Tree
 * Difficulty: Medium
 *
 * Given a binary search tree (BST), find the lowest common ancestor (LCA)
 * node of two given nodes in the BST.
 *
 * According to the definition of LCA on Wikipedia: "The lowest common ancestor
 * is defined between two nodes p and q as the lowest node in T that has both
 * p and q as descendants (where we allow a node to be a descendant of itself)."
 *
 * Example 1:
 * Input: root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 8
 * Output: 6
 * Explanation: The LCA of nodes 2 and 8 is 6.
 *
 *         6
 *        / \
 *       2   8
 *      / \ / \
 *     0  4 7  9
 *       / \
 *      3   5
 *
 * Example 2:
 * Input: root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 4
 * Output: 2
 * Explanation: The LCA of nodes 2 and 4 is 2, since a node can be a
 * descendant of itself according to the LCA definition.
 *
 * Example 3:
 * Input: root = [2,1], p = 2, q = 1
 * Output: 2
 *
 * Constraints:
 * - The number of nodes in the tree is in the range [2, 10^5].
 * - -10^9 <= Node.val <= 10^9
 * - All Node.val are unique.
 * - p != q
 * - p and q will exist in the BST.
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
 * BST Property Approach - O(h) time, O(1) space (iterative)
 *
 * Key insight: In a BST, for any node:
 * - All left descendants have smaller values
 * - All right descendants have larger values
 *
 * The LCA is the first node where p and q "split" - one goes left, one goes right.
 * Or when the current node equals p or q.
 *
 * Algorithm:
 * 1. Start at root
 * 2. If both p and q are smaller -> go left
 * 3. If both p and q are larger -> go right
 * 4. Otherwise, current node is the LCA (they split here)
 *
 * Visual:
 *         6           p=2, q=8
 *        / \          2 < 6 < 8 -> split at 6
 *       2   8         LCA = 6
 *
 *         6           p=2, q=4
 *        / \          2 < 6, 4 < 6 -> go left
 *       2   8         at 2: 2 == p -> LCA = 2
 *      / \
 *     0   4
 */
function lowestCommonAncestor(
  root: TreeNode | null,
  p: TreeNode | null,
  q: TreeNode | null
): TreeNode | null {
  let current = root;

  while (current !== null) {
    if (p!.val < current.val && q!.val < current.val) {
      // Both in left subtree
      current = current.left;
    } else if (p!.val > current.val && q!.val > current.val) {
      // Both in right subtree
      current = current.right;
    } else {
      // Split point or one of them is the current node
      return current;
    }
  }

  return null;
}

/**
 * Recursive Approach - O(h) time, O(h) space
 */
function lowestCommonAncestorRecursive(
  root: TreeNode | null,
  p: TreeNode | null,
  q: TreeNode | null
): TreeNode | null {
  if (root === null) return null;

  if (p!.val < root.val && q!.val < root.val) {
    return lowestCommonAncestorRecursive(root.left, p, q);
  }

  if (p!.val > root.val && q!.val > root.val) {
    return lowestCommonAncestorRecursive(root.right, p, q);
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

function findNode(root: TreeNode | null, val: number): TreeNode | null {
  if (root === null) return null;
  if (root.val === val) return root;
  if (val < root.val) return findNode(root.left, val);
  return findNode(root.right, val);
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Lowest Common Ancestor of a BST");
console.log("==========================================");

// Test case 1: LCA is root
const tree1 = createTree([6, 2, 8, 0, 4, 7, 9, null, null, 3, 5]);
const p1 = findNode(tree1, 2);
const q1 = findNode(tree1, 8);
console.log(lowestCommonAncestor(tree1, p1, q1)?.val); // 6

// Test case 2: LCA is one of the nodes
const tree2 = createTree([6, 2, 8, 0, 4, 7, 9, null, null, 3, 5]);
const p2 = findNode(tree2, 2);
const q2 = findNode(tree2, 4);
console.log(lowestCommonAncestor(tree2, p2, q2)?.val); // 2

// Test case 3: Small tree
const tree3 = createTree([2, 1]);
const p3 = findNode(tree3, 2);
const q3 = findNode(tree3, 1);
console.log(lowestCommonAncestor(tree3, p3, q3)?.val); // 2

// Test case 4: Leaf nodes
const tree4 = createTree([6, 2, 8, 0, 4, 7, 9, null, null, 3, 5]);
const p4 = findNode(tree4, 3);
const q4 = findNode(tree4, 5);
console.log(lowestCommonAncestor(tree4, p4, q4)?.val); // 4

// Test case 5: Deep nodes on opposite sides
const tree5 = createTree([6, 2, 8, 0, 4, 7, 9, null, null, 3, 5]);
const p5 = findNode(tree5, 0);
const q5 = findNode(tree5, 9);
console.log(lowestCommonAncestor(tree5, p5, q5)?.val); // 6

console.log("\n--- Recursive Approach ---");
console.log(lowestCommonAncestorRecursive(tree1, p1, q1)?.val); // 6
console.log(lowestCommonAncestorRecursive(tree2, p2, q2)?.val); // 2

export {}
