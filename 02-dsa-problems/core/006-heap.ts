/**
 * Design Heap (Min-Heap)
 * Difficulty: Medium
 *
 * Implement a min-heap with the following operations:
 * - push(val): Add a value
 * - pop(): Remove and return the minimum
 * - peek(): Return the minimum without removing
 * - heapify(arr): Build heap from array
 * - size(): Return number of elements
 */

class MinHeap {
  private heap: number[];

  constructor() {
    this.heap = [];
  }

  private parent(i: number): number {
    return Math.floor((i - 1) / 2);
  }

  private leftChild(i: number): number {
    return 2 * i + 1;
  }

  private rightChild(i: number): number {
    return 2 * i + 2;
  }

  private swap(i: number, j: number): void {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  private siftUp(i: number): void {
    while (i > 0 && this.heap[this.parent(i)] > this.heap[i]) {
      this.swap(i, this.parent(i));
      i = this.parent(i);
    }
  }

  private siftDown(i: number): void {
    let minIndex = i;
    const left = this.leftChild(i);
    const right = this.rightChild(i);

    if (left < this.heap.length && this.heap[left] < this.heap[minIndex]) {
      minIndex = left;
    }
    if (right < this.heap.length && this.heap[right] < this.heap[minIndex]) {
      minIndex = right;
    }

    if (i !== minIndex) {
      this.swap(i, minIndex);
      this.siftDown(minIndex);
    }
  }

  push(val: number): void {
    this.heap.push(val);
    this.siftUp(this.heap.length - 1);
  }

  pop(): number {
    if (this.heap.length === 0) return -1;

    const min = this.heap[0];
    this.heap[0] = this.heap[this.heap.length - 1];
    this.heap.pop();
    this.siftDown(0);
    return min;
  }

  peek(): number {
    return this.heap.length > 0 ? this.heap[0] : -1;
  }

  heapify(arr: number[]): void {
    this.heap = [...arr];
    // Start from last non-leaf node and sift down
    for (let i = Math.floor(this.heap.length / 2) - 1; i >= 0; i--) {
      this.siftDown(i);
    }
  }

  size(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }
}

// Test cases
console.log("Min-Heap");
console.log("========\n");

const heap = new MinHeap();
heap.push(5);
heap.push(3);
heap.push(8);
heap.push(1);
heap.push(2);

console.log("After pushing 5,3,8,1,2:");
console.log("peek:", heap.peek()); // 1
console.log("size:", heap.size()); // 5

console.log("\nPopping all elements:");
while (!heap.isEmpty()) {
  console.log("pop:", heap.pop()); // 1, 2, 3, 5, 8
}

console.log("\nHeapify [4, 10, 3, 5, 1]:");
const heap2 = new MinHeap();
heap2.heapify([4, 10, 3, 5, 1]);
console.log("peek:", heap2.peek()); // 1

console.log("Pop all:");
while (!heap2.isEmpty()) {
  console.log("pop:", heap2.pop()); // 1, 3, 4, 5, 10
}

export {}
