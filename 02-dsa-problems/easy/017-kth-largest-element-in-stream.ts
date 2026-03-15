/**
 * Kth Largest Element in a Stream
 * Difficulty: Easy
 *
 * Design a class to find the kth largest element in a stream. Note that it
 * is the kth largest element in the sorted order, not the kth distinct element.
 *
 * Implement KthLargest class:
 * - KthLargest(int k, int[] nums) Initializes the object with the integer k
 *   and the stream of integers nums.
 * - int add(int val) Appends the integer val to the stream and returns the
 *   element representing the kth largest element in the stream.
 *
 * Example 1:
 * Input:
 * ["KthLargest", "add", "add", "add", "add", "add"]
 * [[3, [4, 5, 8, 2]], [3], [5], [10], [9], [4]]
 * Output: [null, 4, 5, 5, 8, 8]
 *
 * Explanation:
 * KthLargest kthLargest = new KthLargest(3, [4, 5, 8, 2]);
 * kthLargest.add(3);   // return 4
 * kthLargest.add(5);   // return 5
 * kthLargest.add(10);  // return 5
 * kthLargest.add(9);   // return 8
 * kthLargest.add(4);   // return 8
 *
 * Constraints:
 * - 1 <= k <= 10^4
 * - 0 <= nums.length <= 10^4
 * - -10^4 <= nums[i] <= 10^4
 * - -10^4 <= val <= 10^4
 * - At most 10^4 calls will be made to add.
 * - It is guaranteed that there will be at least k elements when you search
 *   for the kth element.
 */

/**
 * Min Heap Implementation
 *
 * We need a min heap to efficiently get the kth largest element.
 * The heap maintains only the k largest elements seen so far.
 */
class MinHeap {
  private heap: number[] = [];

  get size(): number {
    return this.heap.length;
  }

  peek(): number | undefined {
    return this.heap[0];
  }

  push(val: number): void {
    this.heap.push(val);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): number | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop();

    const min = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.bubbleDown(0);
    return min;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex] <= this.heap[index]) break;
      [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      if (leftChild < length && this.heap[leftChild] < this.heap[smallest]) {
        smallest = leftChild;
      }
      if (rightChild < length && this.heap[rightChild] < this.heap[smallest]) {
        smallest = rightChild;
      }

      if (smallest === index) break;
      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
}

/**
 * KthLargest - Min Heap Approach
 *
 * Time Complexity:
 * - Constructor: O(n log k) where n is initial array size
 * - add(): O(log k)
 *
 * Space Complexity: O(k) for the heap
 *
 * Key Insight:
 * Maintain a min heap of size k. The root of the heap is always the kth largest.
 *
 * Why min heap for kth largest?
 * - We keep only k largest elements in heap
 * - The smallest among these k elements (heap root) is the kth largest
 * - When adding a new element larger than root, we pop root and push new element
 *
 * Example: k=3, stream = [4, 5, 8, 2]
 * Heap after init: [4, 5, 8] (min heap, root=4)
 * add(3): 3 < 4, ignore → heap=[4,5,8], return 4
 * add(5): 5 > 4, pop 4, push 5 → heap=[5,5,8], return 5
 * add(10): 10 > 5, pop 5, push 10 → heap=[5,8,10], return 5
 * add(9): 9 > 5, pop 5, push 9 → heap=[8,9,10], return 8
 */
class KthLargest {
  private k: number;
  private minHeap: MinHeap;

  constructor(k: number, nums: number[]) {
    this.k = k;
    this.minHeap = new MinHeap();

    // Add all initial numbers
    for (const num of nums) {
      this.add(num);
    }
  }

  add(val: number): number {
    // Always add if heap has less than k elements
    if (this.minHeap.size < this.k) {
      this.minHeap.push(val);
    } else if (val > this.minHeap.peek()!) {
      // Only add if val is larger than current kth largest
      this.minHeap.pop();
      this.minHeap.push(val);
    }

    return this.minHeap.peek()!;
  }
}

/**
 * Alternative: Using sorted array (less efficient but simpler)
 * Time: O(n) for add due to insertion
 * Space: O(k)
 */
class KthLargestSortedArray {
  private k: number;
  private nums: number[];

  constructor(k: number, nums: number[]) {
    this.k = k;
    this.nums = nums.sort((a, b) => b - a).slice(0, k);
  }

  add(val: number): number {
    // Binary search to find insertion point
    let left = 0;
    let right = this.nums.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.nums[mid] > val) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    // Insert at correct position
    if (left < this.k) {
      this.nums.splice(left, 0, val);
      if (this.nums.length > this.k) {
        this.nums.pop();
      }
    }

    return this.nums[this.k - 1];
  }
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Kth Largest Element in a Stream");
console.log("==========================================");

// Test case 1: Example from problem
const kthLargest1 = new KthLargest(3, [4, 5, 8, 2]);
console.log(kthLargest1.add(3));  // 4
console.log(kthLargest1.add(5));  // 5
console.log(kthLargest1.add(10)); // 5
console.log(kthLargest1.add(9));  // 8
console.log(kthLargest1.add(4));  // 8

console.log("\n--- Test case 2: k=1 ---");
const kthLargest2 = new KthLargest(1, []);
console.log(kthLargest2.add(-3)); // -3
console.log(kthLargest2.add(-2)); // -2
console.log(kthLargest2.add(-4)); // -2
console.log(kthLargest2.add(0));  // 0
console.log(kthLargest2.add(4));  // 4

console.log("\n--- Test case 3: Negative numbers ---");
const kthLargest3 = new KthLargest(2, [-5, -2]);
console.log(kthLargest3.add(-3)); // -3
console.log(kthLargest3.add(-1)); // -2
console.log(kthLargest3.add(0));  // -1

console.log("\n--- Sorted Array Approach ---");
const kthLargest4 = new KthLargestSortedArray(3, [4, 5, 8, 2]);
console.log(kthLargest4.add(3));  // 4
console.log(kthLargest4.add(5));  // 5
console.log(kthLargest4.add(10)); // 5

export {}
