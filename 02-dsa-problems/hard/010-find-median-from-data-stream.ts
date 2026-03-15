/**
 * Find Median from Data Stream
 * Difficulty: Hard
 *
 * The median is the middle value in an ordered integer list. If the size of
 * the list is even, there is no middle value, and the median is the mean of
 * the two middle values.
 *
 * - For example, for arr = [2,3,4], the median is 3.
 * - For example, for arr = [2,3], the median is (2 + 3) / 2 = 2.5.
 *
 * Implement the MedianFinder class:
 * - MedianFinder() initializes the MedianFinder object.
 * - void addNum(int num) adds the integer num from the data stream to the
 *   data structure.
 * - double findMedian() returns the median of all elements so far. Answers
 *   within 10^-5 of the actual answer will be accepted.
 *
 * Example 1:
 * Input:
 * ["MedianFinder", "addNum", "addNum", "findMedian", "addNum", "findMedian"]
 * [[], [1], [2], [], [3], []]
 * Output: [null, null, null, 1.5, null, 2.0]
 *
 * Explanation:
 * MedianFinder medianFinder = new MedianFinder();
 * medianFinder.addNum(1);    // arr = [1]
 * medianFinder.addNum(2);    // arr = [1, 2]
 * medianFinder.findMedian(); // return 1.5 (i.e., (1 + 2) / 2)
 * medianFinder.addNum(3);    // arr[1, 2, 3]
 * medianFinder.findMedian(); // return 2.0
 *
 * Constraints:
 * - -10^5 <= num <= 10^5
 * - There will be at least one element in the data structure before calling
 *   findMedian.
 * - At most 5 * 10^4 calls will be made to addNum and findMedian.
 *
 * Follow up:
 * - If all integer numbers from the stream are in the range [0, 100], how
 *   would you optimize your solution?
 * - If 99% of all integer numbers from the stream are in the range [0, 100],
 *   how would you optimize your solution?
 */

/**
 * Max Heap Implementation
 */
class MaxHeap {
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

    const max = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.bubbleDown(0);
    return max;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex] >= this.heap[index]) break;
      [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let largest = index;

      if (leftChild < length && this.heap[leftChild] > this.heap[largest]) {
        largest = leftChild;
      }
      if (rightChild < length && this.heap[rightChild] > this.heap[largest]) {
        largest = rightChild;
      }

      if (largest === index) break;
      [this.heap[index], this.heap[largest]] = [this.heap[largest], this.heap[index]];
      index = largest;
    }
  }
}

/**
 * Min Heap Implementation
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
 * Two Heaps Approach - O(log n) addNum, O(1) findMedian
 *
 * Key Insight:
 * Use two heaps to partition the data:
 * - maxHeap (small): stores the smaller half of numbers
 * - minHeap (large): stores the larger half of numbers
 *
 * The median is either:
 * - maxHeap.peek() if odd total count
 * - (maxHeap.peek() + minHeap.peek()) / 2 if even total count
 *
 * Invariants:
 * 1. maxHeap.size >= minHeap.size
 * 2. maxHeap.size - minHeap.size <= 1
 * 3. All elements in maxHeap <= all elements in minHeap
 *
 * Visualization:
 *   small half    |    large half
 *   [1, 2, 3]     |    [4, 5, 6]
 *   maxHeap(3)    |    minHeap(4)
 *
 * Median for odd count: maxHeap.peek()
 * Median for even count: (maxHeap.peek() + minHeap.peek()) / 2
 *
 * Add algorithm:
 * 1. Always add to maxHeap first (via minHeap for proper ordering)
 * 2. Balance heaps so sizes differ by at most 1
 */
class MedianFinder {
  private maxHeap: MaxHeap; // smaller half (max at top)
  private minHeap: MinHeap; // larger half (min at top)

  constructor() {
    this.maxHeap = new MaxHeap();
    this.minHeap = new MinHeap();
  }

  addNum(num: number): void {
    // Step 1: Add to maxHeap (smaller half)
    // But first push to minHeap and pop to ensure ordering
    this.minHeap.push(num);
    this.maxHeap.push(this.minHeap.pop()!);

    // Step 2: Balance heaps
    // maxHeap can have at most 1 more element than minHeap
    if (this.maxHeap.size > this.minHeap.size + 1) {
      this.minHeap.push(this.maxHeap.pop()!);
    }
  }

  findMedian(): number {
    if (this.maxHeap.size > this.minHeap.size) {
      // Odd count: median is middle element (in maxHeap)
      return this.maxHeap.peek()!;
    } else {
      // Even count: median is average of two middle elements
      return (this.maxHeap.peek()! + this.minHeap.peek()!) / 2;
    }
  }
}

/**
 * Alternative Add Strategy
 *
 * Different balancing approach: alternate between heaps.
 */
class MedianFinderAlt {
  private maxHeap: MaxHeap;
  private minHeap: MinHeap;

  constructor() {
    this.maxHeap = new MaxHeap();
    this.minHeap = new MinHeap();
  }

  addNum(num: number): void {
    // Add based on comparison with current median
    if (this.maxHeap.size === 0 || num <= this.maxHeap.peek()!) {
      this.maxHeap.push(num);
    } else {
      this.minHeap.push(num);
    }

    // Balance: maxHeap should have equal or one more element
    if (this.maxHeap.size > this.minHeap.size + 1) {
      this.minHeap.push(this.maxHeap.pop()!);
    } else if (this.minHeap.size > this.maxHeap.size) {
      this.maxHeap.push(this.minHeap.pop()!);
    }
  }

  findMedian(): number {
    if (this.maxHeap.size > this.minHeap.size) {
      return this.maxHeap.peek()!;
    } else {
      return (this.maxHeap.peek()! + this.minHeap.peek()!) / 2;
    }
  }
}

/**
 * Follow-up 1: Numbers in range [0, 100]
 *
 * Use counting sort / bucket approach.
 * O(1) addNum, O(101) = O(1) findMedian
 */
class MedianFinderBounded {
  private counts: number[];
  private total: number;

  constructor() {
    this.counts = new Array(101).fill(0);
    this.total = 0;
  }

  addNum(num: number): void {
    this.counts[num]++;
    this.total++;
  }

  findMedian(): number {
    const mid = Math.floor((this.total + 1) / 2);
    let count = 0;
    let first = -1;
    let second = -1;

    for (let i = 0; i <= 100; i++) {
      count += this.counts[i];
      if (first === -1 && count >= mid) {
        first = i;
      }
      if (count >= mid + 1 || (this.total % 2 === 1 && first !== -1)) {
        second = first === -1 ? i : (count >= mid + 1 ? i : first);
        break;
      }
    }

    if (this.total % 2 === 1) {
      return first;
    }

    // Find second middle element
    count = 0;
    for (let i = 0; i <= 100; i++) {
      count += this.counts[i];
      if (count >= mid + 1) {
        second = i;
        break;
      }
    }

    return (first + second) / 2;
  }
}

/**
 * Sorted Array Approach - O(n) addNum, O(1) findMedian
 *
 * Simple but less efficient for large streams.
 * Uses binary search for insertion.
 */
class MedianFinderSorted {
  private nums: number[];

  constructor() {
    this.nums = [];
  }

  addNum(num: number): void {
    // Binary search for insertion point
    let left = 0;
    let right = this.nums.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.nums[mid] < num) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    this.nums.splice(left, 0, num);
  }

  findMedian(): number {
    const n = this.nums.length;
    const mid = Math.floor(n / 2);

    if (n % 2 === 1) {
      return this.nums[mid];
    } else {
      return (this.nums[mid - 1] + this.nums[mid]) / 2;
    }
  }
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Find Median from Data Stream");
console.log("==========================================");

// Test case 1: Example from problem
const medianFinder1 = new MedianFinder();
medianFinder1.addNum(1);
medianFinder1.addNum(2);
console.log(medianFinder1.findMedian()); // 1.5
medianFinder1.addNum(3);
console.log(medianFinder1.findMedian()); // 2.0

console.log("\n--- Test case 2: Decreasing order ---");
const medianFinder2 = new MedianFinder();
medianFinder2.addNum(5);
console.log(medianFinder2.findMedian()); // 5
medianFinder2.addNum(3);
console.log(medianFinder2.findMedian()); // 4
medianFinder2.addNum(1);
console.log(medianFinder2.findMedian()); // 3

console.log("\n--- Test case 3: Negative numbers ---");
const medianFinder3 = new MedianFinder();
medianFinder3.addNum(-1);
medianFinder3.addNum(-2);
console.log(medianFinder3.findMedian()); // -1.5
medianFinder3.addNum(-3);
console.log(medianFinder3.findMedian()); // -2

console.log("\n--- Test case 4: Mixed numbers ---");
const medianFinder4 = new MedianFinder();
[6, 10, 2, 6, 5, 0].forEach((n) => medianFinder4.addNum(n));
console.log(medianFinder4.findMedian()); // 5.5

console.log("\n--- Alternative Approach ---");
const medianFinderAlt = new MedianFinderAlt();
medianFinderAlt.addNum(1);
medianFinderAlt.addNum(2);
console.log(medianFinderAlt.findMedian()); // 1.5
medianFinderAlt.addNum(3);
console.log(medianFinderAlt.findMedian()); // 2.0

console.log("\n--- Sorted Array Approach ---");
const medianFinderSorted = new MedianFinderSorted();
medianFinderSorted.addNum(1);
medianFinderSorted.addNum(2);
console.log(medianFinderSorted.findMedian()); // 1.5
medianFinderSorted.addNum(3);
console.log(medianFinderSorted.findMedian()); // 2.0

export {}
