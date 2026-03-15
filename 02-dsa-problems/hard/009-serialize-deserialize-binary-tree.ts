/**
 * Serialize and Deserialize Binary Tree
 * Difficulty: Hard
 *
 * Serialization is the process of converting a data structure or object into
 * a sequence of bits so that it can be stored in a file or memory buffer, or
 * transmitted across a network connection link to be reconstructed later in
 * the same or another computer environment.
 *
 * Design an algorithm to serialize and deserialize a binary tree. There is no
 * restriction on how your serialization/deserialization algorithm should work.
 * You just need to ensure that a binary tree can be serialized to a string and
 * this string can be deserialized to the original tree structure.
 *
 * Clarification: The input/output format is the same as how LeetCode serializes
 * a binary tree. You do not necessarily need to follow this format, so please
 * be creative and come up with different approaches yourself.
 *
 * Example 1:
 * Input: root = [1,2,3,null,null,4,5]
 * Output: [1,2,3,null,null,4,5]
 *
 *       1
 *      / \
 *     2   3
 *        / \
 *       4   5
 *
 * Example 2:
 * Input: root = []
 * Output: []
 *
 * Constraints:
 * - The number of nodes in the tree is in the range [0, 10^4].
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
 * Preorder DFS Approach - O(n) time, O(n) space
 *
 * Key insight: Use preorder traversal (root, left, right) with null markers.
 * This preserves the tree structure completely.
 *
 * Serialize:
 * 1. Traverse tree in preorder
 * 2. For null nodes, output "N"
 * 3. Join values with delimiter
 *
 * Deserialize:
 * 1. Split string by delimiter
 * 2. Process values in preorder order
 * 3. Create nodes recursively
 *
 * Visual:
 *       1          Serialize: "1,2,N,N,3,4,N,N,5,N,N"
 *      / \
 *     2   3        Preorder: 1 -> 2 -> N -> N -> 3 -> 4 -> N -> N -> 5 -> N -> N
 *        / \
 *       4   5
 */
class CodecPreorder {
  private readonly NULL_MARKER = "N";
  private readonly DELIMITER = ",";

  /**
   * Serializes a tree to a string.
   */
  serialize(root: TreeNode | null): string {
    const result: string[] = [];

    const preorder = (node: TreeNode | null): void => {
      if (node === null) {
        result.push(this.NULL_MARKER);
        return;
      }

      result.push(node.val.toString());
      preorder(node.left);
      preorder(node.right);
    };

    preorder(root);
    return result.join(this.DELIMITER);
  }

  /**
   * Deserializes a string to a tree.
   */
  deserialize(data: string): TreeNode | null {
    const values = data.split(this.DELIMITER);
    let index = 0;

    const buildTree = (): TreeNode | null => {
      if (index >= values.length || values[index] === this.NULL_MARKER) {
        index++;
        return null;
      }

      const node = new TreeNode(parseInt(values[index]));
      index++;

      node.left = buildTree();
      node.right = buildTree();

      return node;
    };

    return buildTree();
  }
}

/**
 * BFS Level Order Approach - O(n) time, O(n) space
 *
 * Uses level order traversal, similar to LeetCode's format.
 */
class CodecBFS {
  private readonly NULL_MARKER = "N";
  private readonly DELIMITER = ",";

  /**
   * Serializes a tree to a string.
   */
  serialize(root: TreeNode | null): string {
    if (root === null) {
      return "";
    }

    const result: string[] = [];
    const queue: (TreeNode | null)[] = [root];

    while (queue.length > 0) {
      const node = queue.shift();

      if (node === null) {
        result.push(this.NULL_MARKER);
      } else {
        result.push(node.val.toString());
        queue.push(node.left);
        queue.push(node.right);
      }
    }

    // Remove trailing nulls for cleaner output
    while (
      result.length > 0 &&
      result[result.length - 1] === this.NULL_MARKER
    ) {
      result.pop();
    }

    return result.join(this.DELIMITER);
  }

  /**
   * Deserializes a string to a tree.
   */
  deserialize(data: string): TreeNode | null {
    if (data === "") {
      return null;
    }

    const values = data.split(this.DELIMITER);
    const root = new TreeNode(parseInt(values[0]));
    const queue: TreeNode[] = [root];
    let i = 1;

    while (queue.length > 0 && i < values.length) {
      const node = queue.shift()!;

      // Process left child
      if (i < values.length && values[i] !== this.NULL_MARKER) {
        node.left = new TreeNode(parseInt(values[i]));
        queue.push(node.left);
      }
      i++;

      // Process right child
      if (i < values.length && values[i] !== this.NULL_MARKER) {
        node.right = new TreeNode(parseInt(values[i]));
        queue.push(node.right);
      }
      i++;
    }

    return root;
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

function treeToArray(root: TreeNode | null): (number | null)[] {
  if (root === null) return [];

  const result: (number | null)[] = [];
  const queue: (TreeNode | null)[] = [root];

  while (queue.length > 0) {
    const node = queue.shift();
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
console.log("Serialize and Deserialize Binary Tree");
console.log("==========================================");

const codecPreorder = new CodecPreorder();
const codecBFS = new CodecBFS();

// Test case 1: Normal tree
const tree1 = createTree([1, 2, 3, null, null, 4, 5]);
const serialized1 = codecPreorder.serialize(tree1);
console.log("Preorder serialized:", serialized1);
console.log("Deserialized:", JSON.stringify(treeToArray(codecPreorder.deserialize(serialized1))));

// Test case 2: Empty tree
const tree2 = createTree([]);
const serialized2 = codecPreorder.serialize(tree2);
console.log("\nEmpty tree serialized:", serialized2);
console.log("Deserialized:", JSON.stringify(treeToArray(codecPreorder.deserialize(serialized2))));

// Test case 3: Single node
const tree3 = createTree([1]);
const serialized3 = codecPreorder.serialize(tree3);
console.log("\nSingle node serialized:", serialized3);
console.log("Deserialized:", JSON.stringify(treeToArray(codecPreorder.deserialize(serialized3))));

// Test case 4: Left-skewed tree
const tree4 = createTree([1, 2, null, 3]);
const serialized4 = codecPreorder.serialize(tree4);
console.log("\nLeft-skewed serialized:", serialized4);
console.log("Deserialized:", JSON.stringify(treeToArray(codecPreorder.deserialize(serialized4))));

// Test case 5: Negative values
const tree5 = createTree([-1, -2, -3]);
const serialized5 = codecPreorder.serialize(tree5);
console.log("\nNegative values serialized:", serialized5);
console.log("Deserialized:", JSON.stringify(treeToArray(codecPreorder.deserialize(serialized5))));

console.log("\n--- BFS Approach ---");

// BFS Test case 1
const bfsSerialized1 = codecBFS.serialize(tree1);
console.log("BFS serialized:", bfsSerialized1);
console.log("Deserialized:", JSON.stringify(treeToArray(codecBFS.deserialize(bfsSerialized1))));

// BFS Test case 2: Larger tree
const tree6 = createTree([1, 2, 3, 4, 5, 6, 7]);
const bfsSerialized2 = codecBFS.serialize(tree6);
console.log("\nBalanced tree BFS:", bfsSerialized2);
console.log("Deserialized:", JSON.stringify(treeToArray(codecBFS.deserialize(bfsSerialized2))));

// Verify round-trip
console.log("\n--- Round-trip Verification ---");
const original = [1, 2, 3, null, null, 4, 5];
const tree7 = createTree(original);
const roundTrip = treeToArray(codecPreorder.deserialize(codecPreorder.serialize(tree7)));
console.log("Original:", JSON.stringify(original));
console.log("Round-trip:", JSON.stringify(roundTrip));
console.log("Match:", JSON.stringify(original) === JSON.stringify(roundTrip));

export {}
