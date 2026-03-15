/**
 * Construct Binary Tree from Preorder and Inorder Traversal
 * Difficulty: Medium
 *
 * Given two integer arrays preorder and inorder where preorder is the preorder
 * traversal of a binary tree and inorder is the inorder traversal of the same
 * tree, construct and return the binary tree.
 *
 * Example 1:
 * Input: preorder = [3,9,20,15,7], inorder = [9,3,15,20,7]
 * Output: [3,9,20,null,null,15,7]
 *
 *       3
 *      / \
 *     9  20
 *        / \
 *       15  7
 *
 * Example 2:
 * Input: preorder = [−1], inorder = [-1]
 * Output: [-1]
 *
 * Constraints:
 * - 1 <= preorder.length <= 3000
 * - inorder.length == preorder.length
 * - -3000 <= preorder[i], inorder[i] <= 3000
 * - preorder and inorder consist of unique values.
 * - Each value of inorder also appears in preorder.
 * - preorder is guaranteed to be the preorder traversal of the tree.
 * - inorder is guaranteed to be the inorder traversal of the tree.
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
 * Recursive with HashMap - O(n) time, O(n) space
 *
 * Key insight:
 * - Preorder: [root, ...left subtree..., ...right subtree...]
 * - Inorder:  [...left subtree..., root, ...right subtree...]
 *
 * The first element of preorder is always the root.
 * Find the root's position in inorder to determine:
 * - Elements to the left = left subtree
 * - Elements to the right = right subtree
 *
 * Algorithm:
 * 1. Create a map: inorder value -> index (for O(1) lookup)
 * 2. Take first element of preorder as root
 * 3. Find root's index in inorder
 * 4. Recursively build left subtree (elements before root in inorder)
 * 5. Recursively build right subtree (elements after root in inorder)
 *
 * Visual:
 *   preorder = [3, 9, 20, 15, 7]
 *   inorder  = [9, 3, 15, 20, 7]
 *
 *   Root = 3 (first in preorder)
 *   In inorder: [9] | 3 | [15, 20, 7]
 *                ^left    ^right
 *
 *   Left subtree: preorder=[9], inorder=[9] -> node 9
 *   Right subtree: preorder=[20,15,7], inorder=[15,20,7] -> recurse
 */
function buildTree(preorder: number[], inorder: number[]): TreeNode | null {
  // Map inorder values to indices for O(1) lookup
  const inorderMap = new Map<number, number>();
  for (let i = 0; i < inorder.length; i++) {
    inorderMap.set(inorder[i], i);
  }

  let preorderIndex = 0;

  function build(inorderLeft: number, inorderRight: number): TreeNode | null {
    // Base case: no elements to construct
    if (inorderLeft > inorderRight) {
      return null;
    }

    // Pick current root from preorder
    const rootVal = preorder[preorderIndex];
    preorderIndex++;

    const root = new TreeNode(rootVal);

    // Find root position in inorder
    const inorderRootIndex = inorderMap.get(rootVal)!;

    // Build left subtree (elements left of root in inorder)
    root.left = build(inorderLeft, inorderRootIndex - 1);

    // Build right subtree (elements right of root in inorder)
    root.right = build(inorderRootIndex + 1, inorderRight);

    return root;
  }

  return build(0, inorder.length - 1);
}

/**
 * Alternative: Without global index - O(n) time, O(n) space
 *
 * Pass subarrays explicitly (less efficient due to array slicing).
 */
function buildTreeSlicing(
  preorder: number[],
  inorder: number[]
): TreeNode | null {
  if (preorder.length === 0 || inorder.length === 0) {
    return null;
  }

  const rootVal = preorder[0];
  const root = new TreeNode(rootVal);

  const rootIndex = inorder.indexOf(rootVal);

  // Left subtree elements
  const leftInorder = inorder.slice(0, rootIndex);
  const leftPreorder = preorder.slice(1, 1 + leftInorder.length);

  // Right subtree elements
  const rightInorder = inorder.slice(rootIndex + 1);
  const rightPreorder = preorder.slice(1 + leftInorder.length);

  root.left = buildTreeSlicing(leftPreorder, leftInorder);
  root.right = buildTreeSlicing(rightPreorder, rightInorder);

  return root;
}

// ============ Helper Functions ============
function treeToArray(root: TreeNode | null): (number | null)[] {
  if (root === null) return [];

  const result: (number | null)[] = [];
  const queue: (TreeNode | null)[] = [root];

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node === null) {
      result.push(null);
    } else {
      result.push(node.val);
      queue.push(node.left);
      queue.push(node.right);
    }
  }

  // Remove trailing nulls
  while (result.length > 0 && result[result.length - 1] === null) {
    result.pop();
  }

  return result;
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Construct Binary Tree from Preorder and Inorder");
console.log("==========================================");

// Test case 1: Normal tree
console.log(
  JSON.stringify(
    treeToArray(buildTree([3, 9, 20, 15, 7], [9, 3, 15, 20, 7]))
  )
); // [3,9,20,null,null,15,7]

// Test case 2: Single node
console.log(JSON.stringify(treeToArray(buildTree([-1], [-1])))); // [-1]

// Test case 3: Left-skewed tree
console.log(JSON.stringify(treeToArray(buildTree([3, 2, 1], [1, 2, 3])))); // [3,2,null,1]

// Test case 4: Right-skewed tree
console.log(JSON.stringify(treeToArray(buildTree([1, 2, 3], [1, 2, 3])))); // [1,null,2,null,3]

// Test case 5: Balanced tree
console.log(
  JSON.stringify(
    treeToArray(buildTree([1, 2, 4, 5, 3, 6, 7], [4, 2, 5, 1, 6, 3, 7]))
  )
); // [1,2,3,4,5,6,7]

// Test case 6: Two nodes
console.log(JSON.stringify(treeToArray(buildTree([1, 2], [2, 1])))); // [1,2]

console.log("\n--- Slicing Approach ---");
console.log(
  JSON.stringify(
    treeToArray(buildTreeSlicing([3, 9, 20, 15, 7], [9, 3, 15, 20, 7]))
  )
); // [3,9,20,null,null,15,7]

export {}
