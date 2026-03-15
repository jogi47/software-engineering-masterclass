/**
 * Task Scheduler
 * Difficulty: Medium
 *
 * You are given an array of CPU tasks, each labeled with a letter from A to Z,
 * and a number n. Each CPU interval can be idle or allow the completion of one
 * task. Tasks can be completed in any order, but there's a constraint: there
 * has to be a gap of at least n intervals between two tasks with the same label.
 *
 * Return the minimum number of CPU intervals required to complete all tasks.
 *
 * Example 1:
 * Input: tasks = ["A","A","A","B","B","B"], n = 2
 * Output: 8
 * Explanation: A possible sequence is: A -> B -> idle -> A -> B -> idle -> A -> B.
 * After completing task A, you must wait two intervals before doing A again.
 * The same applies to task B. In the 3rd interval, neither A nor B can be done,
 * so you idle. By the 4th interval, you can do A again as 2 intervals have passed.
 *
 * Example 2:
 * Input: tasks = ["A","A","A","B","B","B"], n = 0
 * Output: 6
 * Explanation: On this case any permutation of size 6 would work since n = 0.
 * ["A","A","A","B","B","B"]
 * ["A","B","A","B","A","B"]
 * ["B","B","B","A","A","A"]
 * ...
 * And so on.
 *
 * Example 3:
 * Input: tasks = ["A","A","A","A","A","A","B","C","D","E","F","G"], n = 2
 * Output: 16
 * Explanation: One possible solution is
 * A -> B -> C -> A -> D -> E -> A -> F -> G -> A -> idle -> idle -> A -> idle -> idle -> A
 *
 * Constraints:
 * - 1 <= tasks.length <= 10^4
 * - tasks[i] is an upper-case English letter.
 * - 0 <= n <= 100
 */

/**
 * Max Heap Implementation
 */
class MaxHeap {
  private heap: number[] = [];

  get size(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
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
 * Max Heap + Queue Approach - O(n * m) time, O(1) space (26 letters max)
 * where n = total tasks, m = cooldown period
 *
 * Key Insight:
 * Greedily schedule the task with highest remaining count.
 * Use a queue to track tasks in cooldown.
 *
 * Algorithm:
 * 1. Count frequency of each task
 * 2. Add all frequencies to max heap
 * 3. Process tasks in cycles:
 *    - Pop from heap, decrement count, add to cooldown queue with ready time
 *    - If queue front is ready, push back to heap
 *    - Increment time
 */
function leastInterval(tasks: string[], n: number): number {
  // Count task frequencies
  const freqMap = new Map<string, number>();
  for (const task of tasks) {
    freqMap.set(task, (freqMap.get(task) || 0) + 1);
  }

  // Add frequencies to max heap
  const maxHeap = new MaxHeap();
  for (const freq of freqMap.values()) {
    maxHeap.push(freq);
  }

  // Queue: [remainingCount, readyTime]
  const cooldownQueue: [number, number][] = [];
  let time = 0;

  while (!maxHeap.isEmpty() || cooldownQueue.length > 0) {
    time++;

    if (!maxHeap.isEmpty()) {
      const count = maxHeap.pop()! - 1;
      if (count > 0) {
        cooldownQueue.push([count, time + n]);
      }
    }

    // Check if front of queue is ready
    if (cooldownQueue.length > 0 && cooldownQueue[0][1] === time) {
      const [count] = cooldownQueue.shift()!;
      maxHeap.push(count);
    }
  }

  return time;
}

/**
 * Math/Greedy Approach - O(n) time, O(1) space
 *
 * Key Insight:
 * The minimum time is determined by the most frequent task.
 *
 * Formula:
 * - maxFreq = frequency of most common task
 * - maxCount = number of tasks with maxFreq
 * - Result = max(tasks.length, (maxFreq - 1) * (n + 1) + maxCount)
 *
 * Visualization for tasks=["A","A","A","B","B","B"], n=2:
 * A _ _ A _ _ A
 * A B _ A B _ A B
 *
 * (maxFreq - 1) chunks of size (n + 1), plus final maxCount tasks
 * = (3 - 1) * (2 + 1) + 2 = 2 * 3 + 2 = 8
 *
 * If we have more tasks than idle slots, result is just tasks.length.
 */
function leastIntervalMath(tasks: string[], n: number): number {
  // Count frequencies
  const freq = new Array(26).fill(0);
  for (const task of tasks) {
    freq[task.charCodeAt(0) - 65]++;
  }

  // Find max frequency
  const maxFreq = Math.max(...freq);

  // Count tasks with max frequency
  const maxCount = freq.filter((f) => f === maxFreq).length;

  // Calculate minimum intervals
  // (maxFreq - 1) complete cycles + final partial cycle with maxCount tasks
  const minIntervals = (maxFreq - 1) * (n + 1) + maxCount;

  // Result is max of formula result and total tasks
  // (we might have enough diverse tasks to fill all gaps)
  return Math.max(tasks.length, minIntervals);
}

/**
 * Simulation Approach - O(n * 26) time, O(26) space
 *
 * Simulate the scheduling process directly.
 */
function leastIntervalSimulation(tasks: string[], n: number): number {
  const freq = new Array(26).fill(0);
  for (const task of tasks) {
    freq[task.charCodeAt(0) - 65]++;
  }

  // Track when each task can next be scheduled
  const nextAvailable = new Array(26).fill(0);
  let time = 0;
  let remaining = tasks.length;

  while (remaining > 0) {
    time++;
    let bestTask = -1;
    let bestFreq = 0;

    // Find task with highest frequency that's available
    for (let i = 0; i < 26; i++) {
      if (freq[i] > 0 && nextAvailable[i] <= time && freq[i] > bestFreq) {
        bestTask = i;
        bestFreq = freq[i];
      }
    }

    if (bestTask !== -1) {
      freq[bestTask]--;
      nextAvailable[bestTask] = time + n + 1;
      remaining--;
    }
    // else: idle
  }

  return time;
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Task Scheduler");
console.log("==========================================");

// Test case 1: Basic case
console.log(leastInterval(["A", "A", "A", "B", "B", "B"], 2)); // 8

// Test case 2: No cooldown
console.log(leastInterval(["A", "A", "A", "B", "B", "B"], 0)); // 6

// Test case 3: Many different tasks
console.log(leastInterval(["A", "A", "A", "A", "A", "A", "B", "C", "D", "E", "F", "G"], 2)); // 16

// Test case 4: Single task type
console.log(leastInterval(["A", "A", "A"], 2)); // 7 (A _ _ A _ _ A)

// Test case 5: All different tasks
console.log(leastInterval(["A", "B", "C", "D"], 2)); // 4

console.log("\n--- Math Approach ---");
console.log(leastIntervalMath(["A", "A", "A", "B", "B", "B"], 2)); // 8
console.log(leastIntervalMath(["A", "A", "A", "B", "B", "B"], 0)); // 6
console.log(leastIntervalMath(["A", "A", "A", "A", "A", "A", "B", "C", "D", "E", "F", "G"], 2)); // 16

console.log("\n--- Simulation Approach ---");
console.log(leastIntervalSimulation(["A", "A", "A", "B", "B", "B"], 2)); // 8
console.log(leastIntervalSimulation(["A", "A", "A", "B", "B", "B"], 0)); // 6

export {}
