/**
 * K Closest Points to Origin
 * Difficulty: Medium
 *
 * Given an array of points where points[i] = [xi, yi] represents a point on
 * the X-Y plane and an integer k, return the k closest points to the origin
 * (0, 0).
 *
 * The distance between two points on the X-Y plane is the Euclidean distance
 * (i.e., √(x1 - x2)² + (y1 - y2)²).
 *
 * You may return the answer in any order. The answer is guaranteed to be
 * unique (except for the order that it is in).
 *
 * Example 1:
 * Input: points = [[1,3],[-2,2]], k = 1
 * Output: [[-2,2]]
 * Explanation:
 * The distance between (1, 3) and the origin is sqrt(10).
 * The distance between (-2, 2) and the origin is sqrt(8).
 * Since sqrt(8) < sqrt(10), (-2, 2) is closer to the origin.
 * We only want the closest k = 1 points from the origin, so the answer is
 * just [[-2,2]].
 *
 * Example 2:
 * Input: points = [[3,3],[5,-1],[-2,4]], k = 2
 * Output: [[3,3],[-2,4]]
 * (The answer [[-2,4],[3,3]] would also be accepted.)
 *
 * Constraints:
 * - 1 <= k <= points.length <= 10^4
 * - -10^4 <= xi, yi <= 10^4
 */

/**
 * Max Heap Implementation
 *
 * Stores [distance, point] pairs, ordered by distance (max heap).
 */
class MaxHeapPoints {
  private heap: [number, number[]][] = [];

  get size(): number {
    return this.heap.length;
  }

  peek(): [number, number[]] | undefined {
    return this.heap[0];
  }

  push(dist: number, point: number[]): void {
    this.heap.push([dist, point]);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): [number, number[]] | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop();

    const max = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.bubbleDown(0);
    return max;
  }

  getPoints(): number[][] {
    return this.heap.map(([_, point]) => point);
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex][0] >= this.heap[index][0]) break;
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

      if (leftChild < length && this.heap[leftChild][0] > this.heap[largest][0]) {
        largest = leftChild;
      }
      if (rightChild < length && this.heap[rightChild][0] > this.heap[largest][0]) {
        largest = rightChild;
      }

      if (largest === index) break;
      [this.heap[index], this.heap[largest]] = [this.heap[largest], this.heap[index]];
      index = largest;
    }
  }
}

/**
 * Max Heap Approach - O(n log k) time, O(k) space
 *
 * Key Insight:
 * Use a max heap of size k. Keep only the k closest points.
 * The heap root is the farthest among the k closest.
 *
 * Algorithm:
 * 1. For each point, calculate squared distance (avoid sqrt)
 * 2. If heap size < k, push the point
 * 3. Else if current distance < heap root distance, pop and push
 * 4. Return all points in heap
 *
 * Why max heap for k smallest?
 * - We maintain k closest points
 * - Max heap root = farthest of the k closest
 * - When new point is closer than root, replace root
 */
function kClosest(points: number[][], k: number): number[][] {
  const maxHeap = new MaxHeapPoints();

  for (const point of points) {
    // Use squared distance to avoid sqrt computation
    const dist = point[0] * point[0] + point[1] * point[1];

    if (maxHeap.size < k) {
      maxHeap.push(dist, point);
    } else if (dist < maxHeap.peek()![0]) {
      maxHeap.pop();
      maxHeap.push(dist, point);
    }
  }

  return maxHeap.getPoints();
}

/**
 * Sorting Approach - O(n log n) time, O(n) space
 *
 * Simpler approach: sort all points by distance and take first k.
 */
function kClosestSort(points: number[][], k: number): number[][] {
  return points
    .map((point) => ({
      point,
      dist: point[0] * point[0] + point[1] * point[1],
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, k)
    .map((item) => item.point);
}

/**
 * QuickSelect Approach - O(n) average time, O(1) space
 *
 * Partition-based selection algorithm (like quicksort but only recurse on one side).
 * Average O(n), worst case O(n²).
 */
function kClosestQuickSelect(points: number[][], k: number): number[][] {
  const distance = (point: number[]): number => {
    return point[0] * point[0] + point[1] * point[1];
  };

  const partition = (left: number, right: number): number => {
    const pivotDist = distance(points[right]);
    let storeIndex = left;

    for (let i = left; i < right; i++) {
      if (distance(points[i]) < pivotDist) {
        [points[i], points[storeIndex]] = [points[storeIndex], points[i]];
        storeIndex++;
      }
    }

    [points[storeIndex], points[right]] = [points[right], points[storeIndex]];
    return storeIndex;
  };

  const quickSelect = (left: number, right: number, k: number): void => {
    if (left >= right) return;

    // Random pivot for better average performance
    const pivotIndex = left + Math.floor(Math.random() * (right - left + 1));
    [points[pivotIndex], points[right]] = [points[right], points[pivotIndex]];

    const partitionIndex = partition(left, right);

    if (partitionIndex === k) {
      return;
    } else if (partitionIndex < k) {
      quickSelect(partitionIndex + 1, right, k);
    } else {
      quickSelect(left, partitionIndex - 1, k);
    }
  };

  quickSelect(0, points.length - 1, k);
  return points.slice(0, k);
}

// ============ Test Cases ============
console.log("==========================================");
console.log("K Closest Points to Origin");
console.log("==========================================");

// Test case 1: k=1
console.log(kClosest([[1, 3], [-2, 2]], 1));
// [[-2,2]]

// Test case 2: k=2
console.log(kClosest([[3, 3], [5, -1], [-2, 4]], 2));
// [[3,3],[-2,4]] or [[-2,4],[3,3]]

// Test case 3: All points
console.log(kClosest([[1, 1], [2, 2], [3, 3]], 3));
// [[1,1],[2,2],[3,3]]

// Test case 4: Single point
console.log(kClosest([[0, 1]], 1));
// [[0,1]]

// Test case 5: Origin point
console.log(kClosest([[0, 0], [1, 1]], 1));
// [[0,0]]

console.log("\n--- Sorting Approach ---");
console.log(kClosestSort([[1, 3], [-2, 2]], 1));
console.log(kClosestSort([[3, 3], [5, -1], [-2, 4]], 2));

console.log("\n--- QuickSelect Approach ---");
console.log(kClosestQuickSelect([[1, 3], [-2, 2]], 1));
console.log(kClosestQuickSelect([[3, 3], [5, -1], [-2, 4]], 2));

export {}
