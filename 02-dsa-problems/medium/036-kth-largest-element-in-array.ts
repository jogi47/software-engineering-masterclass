/**
 * Kth Largest Element in an Array
 * Difficulty: Medium
 *
 * Given an integer array nums and an integer k, return the kth largest
 * element in the array.
 *
 * Note that it is the kth largest element in the sorted order, not the
 * kth distinct element.
 *
 * Can you solve it without sorting?
 *
 * Example 1:
 * Input: nums = [3,2,1,5,6,4], k = 2
 * Output: 5
 *
 * Example 2:
 * Input: nums = [3,2,3,1,2,4,5,5,6], k = 4
 * Output: 4
 *
 * Constraints:
 * - 1 <= k <= nums.length <= 10^5
 * - -10^4 <= nums[i] <= 10^4
 */

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
 * Min Heap Approach - O(n log k) time, O(k) space
 *
 * Key Insight:
 * Maintain a min heap of size k containing the k largest elements.
 * The heap root is the kth largest.
 *
 * Algorithm:
 * 1. For each number, add to heap if heap size < k
 * 2. If heap full and num > heap root, pop root and push num
 * 3. After processing all nums, heap root is kth largest
 *
 * Why min heap?
 * - Heap contains k largest elements
 * - Root is smallest among k largest = kth largest
 * - If new element > root, it deserves to be in top k
 */
function findKthLargest(nums: number[], k: number): number {
  const minHeap = new MinHeap();

  for (const num of nums) {
    if (minHeap.size < k) {
      minHeap.push(num);
    } else if (num > minHeap.peek()!) {
      minHeap.pop();
      minHeap.push(num);
    }
  }

  return minHeap.peek()!;
}

/**
 * QuickSelect Approach - O(n) average time, O(1) space
 *
 * Key Insight:
 * Use partition (like quicksort) but only recurse on the side containing k.
 *
 * For kth largest, we want element at index (n - k) in sorted order.
 *
 * Algorithm:
 * 1. Choose a pivot and partition array
 * 2. If pivot is at target index, return it
 * 3. Else recurse on left or right half
 *
 * Time: O(n) average, O(n²) worst case
 * Randomized pivot gives expected O(n)
 */
function findKthLargestQuickSelect(nums: number[], k: number): number {
  const targetIndex = nums.length - k; // kth largest = (n-k)th smallest

  const partition = (left: number, right: number): number => {
    // Random pivot to avoid worst case
    const pivotIndex = left + Math.floor(Math.random() * (right - left + 1));
    const pivotValue = nums[pivotIndex];

    // Move pivot to end
    [nums[pivotIndex], nums[right]] = [nums[right], nums[pivotIndex]];

    let storeIndex = left;
    for (let i = left; i < right; i++) {
      if (nums[i] < pivotValue) {
        [nums[i], nums[storeIndex]] = [nums[storeIndex], nums[i]];
        storeIndex++;
      }
    }

    // Move pivot to final position
    [nums[storeIndex], nums[right]] = [nums[right], nums[storeIndex]];
    return storeIndex;
  };

  let left = 0;
  let right = nums.length - 1;

  while (left <= right) {
    const pivotIndex = partition(left, right);

    if (pivotIndex === targetIndex) {
      return nums[pivotIndex];
    } else if (pivotIndex < targetIndex) {
      left = pivotIndex + 1;
    } else {
      right = pivotIndex - 1;
    }
  }

  return nums[left];
}

/**
 * Sorting Approach - O(n log n) time, O(1) space
 *
 * Simple but less efficient approach.
 */
function findKthLargestSort(nums: number[], k: number): number {
  nums.sort((a, b) => b - a); // Descending
  return nums[k - 1];
}

/**
 * Counting Sort Approach - O(n + W) time, O(W) space
 * where W = value range (20001 for -10^4 to 10^4)
 *
 * Works well when value range is limited.
 */
function findKthLargestCounting(nums: number[], k: number): number {
  const offset = 10000; // Handle negative numbers
  const count = new Array(20001).fill(0);

  for (const num of nums) {
    count[num + offset]++;
  }

  // Find kth largest by scanning from end
  let remaining = k;
  for (let i = 20000; i >= 0; i--) {
    remaining -= count[i];
    if (remaining <= 0) {
      return i - offset;
    }
  }

  return 0;
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Kth Largest Element in an Array");
console.log("==========================================");

// Test case 1: k=2
console.log(findKthLargest([3, 2, 1, 5, 6, 4], 2)); // 5

// Test case 2: k=4 with duplicates
console.log(findKthLargest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4)); // 4

// Test case 3: k=1 (max element)
console.log(findKthLargest([1, 2, 3, 4, 5], 1)); // 5

// Test case 4: k=n (min element)
console.log(findKthLargest([1, 2, 3, 4, 5], 5)); // 1

// Test case 5: Single element
console.log(findKthLargest([1], 1)); // 1

// Test case 6: Negative numbers
console.log(findKthLargest([-1, -2, -3, -4], 2)); // -2

console.log("\n--- QuickSelect Approach ---");
console.log(findKthLargestQuickSelect([3, 2, 1, 5, 6, 4], 2)); // 5
console.log(findKthLargestQuickSelect([3, 2, 3, 1, 2, 4, 5, 5, 6], 4)); // 4

console.log("\n--- Sorting Approach ---");
console.log(findKthLargestSort([3, 2, 1, 5, 6, 4], 2)); // 5

console.log("\n--- Counting Sort Approach ---");
console.log(findKthLargestCounting([3, 2, 1, 5, 6, 4], 2)); // 5
console.log(findKthLargestCounting([-1, -2, -3, -4], 2)); // -2

export {}
