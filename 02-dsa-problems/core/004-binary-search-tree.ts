/**
 * Design Binary Search Tree
 * Difficulty: Medium
 *
 * Implement a BST with the following operations:
 * - insert(val): Insert a value
 * - search(val): Check if value exists
 * - remove(val): Remove a value
 * - getMin(): Get minimum value
 * - getMax(): Get maximum value
 * - inorder(): Return inorder traversal
 */

class TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;

  constructor(val: number) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}

class BinarySearchTree {
  private root: TreeNode | null;

  constructor() {
    this.root = null;
  }

  insert(val: number): void {
    this.root = this.insertHelper(this.root, val);
  }

  private insertHelper(node: TreeNode | null, val: number): TreeNode {
    if (!node) return new TreeNode(val);

    if (val < node.val) {
      node.left = this.insertHelper(node.left, val);
    } else if (val > node.val) {
      node.right = this.insertHelper(node.right, val);
    }
    return node;
  }

  search(val: number): boolean {
    return this.searchHelper(this.root, val);
  }

  private searchHelper(node: TreeNode | null, val: number): boolean {
    if (!node) return false;
    if (val === node.val) return true;

    if (val < node.val) {
      return this.searchHelper(node.left, val);
    }
    return this.searchHelper(node.right, val);
  }

  remove(val: number): void {
    this.root = this.removeHelper(this.root, val);
  }

  private removeHelper(node: TreeNode | null, val: number): TreeNode | null {
    if (!node) return null;

    if (val < node.val) {
      node.left = this.removeHelper(node.left, val);
    } else if (val > node.val) {
      node.right = this.removeHelper(node.right, val);
    } else {
      // Node found
      if (!node.left) return node.right;
      if (!node.right) return node.left;

      // Node has two children - find inorder successor
      let successor = node.right;
      while (successor.left) {
        successor = successor.left;
      }
      node.val = successor.val;
      node.right = this.removeHelper(node.right, successor.val);
    }
    return node;
  }

  getMin(): number {
    if (!this.root) return -1;

    let curr = this.root;
    while (curr.left) {
      curr = curr.left;
    }
    return curr.val;
  }

  getMax(): number {
    if (!this.root) return -1;

    let curr = this.root;
    while (curr.right) {
      curr = curr.right;
    }
    return curr.val;
  }

  inorder(): number[] {
    const result: number[] = [];
    this.inorderHelper(this.root, result);
    return result;
  }

  private inorderHelper(node: TreeNode | null, result: number[]): void {
    if (!node) return;
    this.inorderHelper(node.left, result);
    result.push(node.val);
    this.inorderHelper(node.right, result);
  }
}

// Test cases
console.log("Binary Search Tree");
console.log("==================\n");

const bst = new BinarySearchTree();
bst.insert(5);
bst.insert(3);
bst.insert(7);
bst.insert(1);
bst.insert(4);
console.log("After inserting 5,3,7,1,4:");
console.log("Inorder:", bst.inorder()); // [1, 3, 4, 5, 7]

console.log("search(3):", bst.search(3)); // true
console.log("search(6):", bst.search(6)); // false

console.log("getMin:", bst.getMin()); // 1
console.log("getMax:", bst.getMax()); // 7

bst.remove(3);
console.log("After remove(3):", bst.inorder()); // [1, 4, 5, 7]

export {}
