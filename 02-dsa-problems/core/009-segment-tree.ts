/**
 * Design Segment Tree
 * Difficulty: Hard
 *
 * Implement a segment tree for range sum queries with:
 * - build(arr): Build tree from array
 * - update(index, val): Update value at index
 * - query(left, right): Get sum of range [left, right]
 *
 * Time Complexity:
 * - Build: O(n)
 * - Update: O(log n)
 * - Query: O(log n)
 */

class SegmentTree {
  private tree: number[];
  private n: number;

  constructor(arr: number[]) {
    this.n = arr.length;
    // Tree size is 4 * n to be safe
    this.tree = new Array(4 * this.n).fill(0);
    if (this.n > 0) {
      this.build(arr, 0, 0, this.n - 1);
    }
  }

  private build(arr: number[], node: number, start: number, end: number): void {
    if (start === end) {
      // Leaf node
      this.tree[node] = arr[start];
    } else {
      const mid = Math.floor((start + end) / 2);
      const leftChild = 2 * node + 1;
      const rightChild = 2 * node + 2;

      this.build(arr, leftChild, start, mid);
      this.build(arr, rightChild, mid + 1, end);

      this.tree[node] = this.tree[leftChild] + this.tree[rightChild];
    }
  }

  update(index: number, val: number): void {
    this.updateHelper(0, 0, this.n - 1, index, val);
  }

  private updateHelper(
    node: number,
    start: number,
    end: number,
    index: number,
    val: number
  ): void {
    if (start === end) {
      // Leaf node
      this.tree[node] = val;
    } else {
      const mid = Math.floor((start + end) / 2);
      const leftChild = 2 * node + 1;
      const rightChild = 2 * node + 2;

      if (index <= mid) {
        this.updateHelper(leftChild, start, mid, index, val);
      } else {
        this.updateHelper(rightChild, mid + 1, end, index, val);
      }

      this.tree[node] = this.tree[leftChild] + this.tree[rightChild];
    }
  }

  query(left: number, right: number): number {
    return this.queryHelper(0, 0, this.n - 1, left, right);
  }

  private queryHelper(
    node: number,
    start: number,
    end: number,
    left: number,
    right: number
  ): number {
    // No overlap
    if (right < start || left > end) {
      return 0;
    }

    // Complete overlap
    if (left <= start && end <= right) {
      return this.tree[node];
    }

    // Partial overlap
    const mid = Math.floor((start + end) / 2);
    const leftChild = 2 * node + 1;
    const rightChild = 2 * node + 2;

    const leftSum = this.queryHelper(leftChild, start, mid, left, right);
    const rightSum = this.queryHelper(rightChild, mid + 1, end, left, right);

    return leftSum + rightSum;
  }
}

// Test cases
console.log("Segment Tree (Range Sum)");
console.log("========================\n");

const arr = [1, 3, 5, 7, 9, 11];
console.log("Array:", arr);

const st = new SegmentTree(arr);

console.log("\nRange sum queries:");
console.log("query(0, 2):", st.query(0, 2)); // 1+3+5 = 9
console.log("query(1, 4):", st.query(1, 4)); // 3+5+7+9 = 24
console.log("query(0, 5):", st.query(0, 5)); // 1+3+5+7+9+11 = 36
console.log("query(3, 3):", st.query(3, 3)); // 7

console.log("\nUpdate index 3 to 10:");
st.update(3, 10);
console.log("query(1, 4):", st.query(1, 4)); // 3+5+10+9 = 27
console.log("query(0, 5):", st.query(0, 5)); // 1+3+5+10+9+11 = 39

console.log("\nUpdate index 0 to 5:");
st.update(0, 5);
console.log("query(0, 2):", st.query(0, 2)); // 5+3+5 = 13

export {}
