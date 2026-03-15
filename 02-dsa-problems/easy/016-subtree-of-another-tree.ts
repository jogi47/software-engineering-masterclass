/**
 * Subtree of Another Tree
 * Difficulty: Easy
 *
 * Given the roots of two binary trees root and subRoot, return true if there
 * is a subtree of root with the same structure and node values of subRoot
 * and false otherwise.
 *
 * A subtree of a binary tree tree is a tree that consists of a node in tree
 * and all of this node's descendants. The tree tree could also be considered
 * as a subtree of itself.
 *
 * Example 1:
 * Input: root = [3,4,5,1,2], subRoot = [4,1,2]
 * Output: true
 *
 *       3
 *      / \
 *     4   5      subRoot:  4
 *    / \                  / \
 *   1   2                1   2
 *
 * Example 2:
 * Input: root = [3,4,5,1,2,null,null,null,null,0], subRoot = [4,1,2]
 * Output: false
 *
 *       3
 *      / \
 *     4   5      subRoot:  4
 *    / \                  / \
 *   1   2                1   2
 *      /
 *     0
 *
 * Constraints:
 * - The number of nodes in the root tree is in the range [1, 2000].
 * - The number of nodes in the subRoot tree is in the range [1, 1000].
 * - -10^4 <= root.val <= 10^4
 * - -10^4 <= subRoot.val <= 10^4
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
 * DFS + isSameTree - O(m * n) time, O(h) space
 * where m = nodes in root, n = nodes in subRoot, h = height of root
 *
 * Key insight: At each node in root, check if the subtree starting there
 * is identical to subRoot. Use isSameTree helper for comparison.
 *
 * Algorithm:
 * 1. If root is null, return false (no subtree to match)
 * 2. If isSameTree(root, subRoot), return true
 * 3. Otherwise, check if subRoot is a subtree of root.left OR root.right
 *
 * Visual:
 *       3
 *      / \
 *     4   5      Check isSameTree at 3? No (different)
 *    / \         Check isSameTree at 4? Yes! Match found
 *   1   2
 */
function isSubtree(root: TreeNode | null, subRoot: TreeNode | null): boolean {
  // Helper: Check if two trees are identical
  function isSameTree(p: TreeNode | null, q: TreeNode | null): boolean {
    if (p === null && q === null) {
      return true;
    }
    if (p === null || q === null) {
      return false;
    }
    return (
      p.val === q.val &&
      isSameTree(p.left, q.left) &&
      isSameTree(p.right, q.right)
    );
  }

  // Null subRoot is always a subtree
  if (subRoot === null) {
    return true;
  }

  // Null root cannot contain non-null subRoot
  if (root === null) {
    return false;
  }

  // Check if trees are same starting from root
  if (isSameTree(root, subRoot)) {
    return true;
  }

  // Check left and right subtrees
  return isSubtree(root.left, subRoot) || isSubtree(root.right, subRoot);
}

/**
 * String Serialization Approach - O(m + n) time, O(m + n) space
 *
 * Serialize both trees and check if subRoot's serialization is a substring
 * of root's serialization. Uses special markers to avoid false matches.
 */
function isSubtreeString(
  root: TreeNode | null,
  subRoot: TreeNode | null
): boolean {
  function serialize(node: TreeNode | null): string {
    if (node === null) {
      return "#";
    }
    // Use delimiters to avoid false matches like "12" matching "2"
    return `^${node.val}${serialize(node.left)}${serialize(node.right)}`;
  }

  const rootStr = serialize(root);
  const subStr = serialize(subRoot);

  return rootStr.includes(subStr);
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
console.log("Subtree of Another Tree");
console.log("==========================================");

// Test case 1: subRoot is a subtree
console.log(isSubtree(createTree([3, 4, 5, 1, 2]), createTree([4, 1, 2]))); // true

// Test case 2: subRoot has extra node
console.log(
  isSubtree(
    createTree([3, 4, 5, 1, 2, null, null, null, null, 0]),
    createTree([4, 1, 2])
  )
); // false

// Test case 3: Single node match
console.log(isSubtree(createTree([1, 1]), createTree([1]))); // true

// Test case 4: Root equals subRoot
console.log(isSubtree(createTree([1, 2, 3]), createTree([1, 2, 3]))); // true

// Test case 5: SubRoot not found
console.log(isSubtree(createTree([1, 2, 3]), createTree([2, 4]))); // false

// Test case 6: Leaf as subRoot
console.log(isSubtree(createTree([3, 4, 5, 1, 2]), createTree([2]))); // true

console.log("\n--- String Serialization Approach ---");
console.log(
  isSubtreeString(createTree([3, 4, 5, 1, 2]), createTree([4, 1, 2]))
); // true
console.log(
  isSubtreeString(
    createTree([3, 4, 5, 1, 2, null, null, null, null, 0]),
    createTree([4, 1, 2])
  )
); // false

export {}
