/**
 * Last Stone Weight
 * Difficulty: Easy
 *
 * You are given an array of integers stones where stones[i] is the weight of
 * the ith stone.
 *
 * We are playing a game with the stones. On each turn, we choose the heaviest
 * two stones and smash them together. Suppose the heaviest two stones have
 * weights x and y with x <= y. The result of this smash is:
 * - If x == y, both stones are destroyed, and
 * - If x != y, the stone of weight x is destroyed, and the stone of weight y
 *   has new weight y - x.
 *
 * At the end of the game, there is at most one stone left.
 * Return the weight of the last remaining stone. If there are no stones left,
 * return 0.
 *
 * Example 1:
 * Input: stones = [2,7,4,1,8,1]
 * Output: 1
 * Explanation:
 * We combine 7 and 8 to get 1 so the array converts to [2,4,1,1,1] then,
 * we combine 2 and 4 to get 2 so the array converts to [2,1,1,1] then,
 * we combine 2 and 1 to get 1 so the array converts to [1,1,1] then,
 * we combine 1 and 1 to get 0 so the array converts to [1] then that's the
 * value of the last stone.
 *
 * Example 2:
 * Input: stones = [1]
 * Output: 1
 *
 * Constraints:
 * - 1 <= stones.length <= 30
 * - 1 <= stones[i] <= 1000
 */

/**
 * Max Heap Implementation
 *
 * We need a max heap to efficiently get the two heaviest stones.
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
 * Max Heap Approach - O(n log n) time, O(n) space
 *
 * Key Insight:
 * Use a max heap to always efficiently get the two heaviest stones.
 *
 * Algorithm:
 * 1. Build a max heap from all stones
 * 2. While heap has more than 1 stone:
 *    - Pop two heaviest stones (y and x, where y >= x)
 *    - If y > x, push (y - x) back to heap
 * 3. Return remaining stone weight (or 0 if empty)
 *
 * Example: [2,7,4,1,8,1]
 * Heap: [8,7,4,2,1,1]
 * Pop 8,7 → push 1 → [4,2,1,1,1]
 * Pop 4,2 → push 2 → [2,1,1,1]
 * Pop 2,1 → push 1 → [1,1,1]
 * Pop 1,1 → nothing → [1]
 * Return 1
 */
function lastStoneWeight(stones: number[]): number {
  const maxHeap = new MaxHeap();

  // Build heap
  for (const stone of stones) {
    maxHeap.push(stone);
  }

  // Smash stones
  while (maxHeap.size > 1) {
    const y = maxHeap.pop()!; // Heaviest
    const x = maxHeap.pop()!; // Second heaviest

    if (y > x) {
      maxHeap.push(y - x);
    }
    // If y === x, both destroyed (don't push anything)
  }

  return maxHeap.size === 0 ? 0 : maxHeap.peek()!;
}

/**
 * Sorting Approach - O(n² log n) time, O(1) space
 *
 * Simpler but less efficient approach using sorting.
 */
function lastStoneWeightSorting(stones: number[]): number {
  while (stones.length > 1) {
    // Sort descending
    stones.sort((a, b) => b - a);

    const y = stones.shift()!;
    const x = stones.shift()!;

    if (y > x) {
      stones.push(y - x);
    }
  }

  return stones.length === 0 ? 0 : stones[0];
}

/**
 * Bucket Sort Optimization - O(n + W) time, O(W) space
 * where W is max stone weight (1000)
 *
 * Since weights are bounded, we can use counting sort.
 */
function lastStoneWeightBucket(stones: number[]): number {
  const maxWeight = 1000;
  const buckets = new Array(maxWeight + 1).fill(0);

  // Count stones of each weight
  for (const stone of stones) {
    buckets[stone]++;
  }

  let currentWeight = maxWeight;
  let currentCount = buckets[maxWeight];

  while (currentWeight > 0) {
    // Skip empty weights
    if (currentCount === 0) {
      currentWeight--;
      if (currentWeight >= 0) {
        currentCount = buckets[currentWeight];
      }
      continue;
    }

    // If odd count, we need to find next smaller stone
    if (currentCount % 2 === 1) {
      // Find next smaller stone
      let nextWeight = currentWeight - 1;
      while (nextWeight > 0 && buckets[nextWeight] === 0) {
        nextWeight--;
      }

      if (nextWeight === 0) {
        // This is the last stone
        return currentWeight;
      }

      // Smash current with next smaller
      buckets[nextWeight]--;
      const diff = currentWeight - nextWeight;
      if (diff > 0) {
        buckets[diff]++;
      }
    }

    // Even count: all pairs destroy each other
    currentCount = 0;
    currentWeight--;
    if (currentWeight >= 0) {
      currentCount = buckets[currentWeight];
    }
  }

  return 0;
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Last Stone Weight");
console.log("==========================================");

// Test case 1: Multiple stones
console.log(lastStoneWeight([2, 7, 4, 1, 8, 1])); // 1

// Test case 2: Single stone
console.log(lastStoneWeight([1])); // 1

// Test case 3: Two equal stones
console.log(lastStoneWeight([2, 2])); // 0

// Test case 4: All equal stones
console.log(lastStoneWeight([3, 3, 3, 3])); // 0

// Test case 5: Descending order
console.log(lastStoneWeight([10, 4, 2, 10])); // 2

console.log("\n--- Sorting Approach ---");
console.log(lastStoneWeightSorting([2, 7, 4, 1, 8, 1])); // 1
console.log(lastStoneWeightSorting([1])); // 1
console.log(lastStoneWeightSorting([2, 2])); // 0

console.log("\n--- Large test ---");
console.log(lastStoneWeight([31, 26, 33, 21, 40])); // 5

export {}
