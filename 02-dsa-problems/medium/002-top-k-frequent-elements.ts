/**
 * Top K Frequent Elements
 * Difficulty: Medium
 *
 * Given an integer array nums and an integer k, return the k most frequent elements.
 * You may return the answer in any order.
 *
 * Example 1:
 * Input: nums = [1,1,1,2,2,3], k = 2
 * Output: [1,2]
 *
 * Example 2:
 * Input: nums = [1], k = 1
 * Output: [1]
 *
 * Constraints:
 * - 1 <= nums.length <= 10^5
 * - -10^4 <= nums[i] <= 10^4
 * - k is in the range [1, the number of unique elements in the array].
 * - It is guaranteed that the answer is unique.
 *
 * Follow up: Your algorithm's time complexity must be better than O(n log n),
 * where n is the array's size.
 */

/**
 * Bucket Sort Approach - O(n) time, O(n) space
 *
 * Key insight: The maximum possible frequency of any element is n (array length).
 * We can use frequency as an index into buckets, avoiding the need to sort.
 *
 * Algorithm:
 * 1. Count frequency of each number using a hash map
 * 2. Create n+1 buckets where bucket[i] contains numbers with frequency i
 * 3. Iterate buckets from highest to lowest frequency
 * 4. Collect numbers until we have k elements
 *
 * Why O(n) instead of O(n log n)?
 * - Heap approach: O(n log k) - need to maintain heap of size k
 * - Sorting approach: O(n log n) - sort by frequency
 * - Bucket sort: O(n) - use frequency as index, no comparison sorting
 *
 * Example walkthrough with [1,1,1,2,2,3], k=2:
 *   Step 1 - Count frequencies:
 *     Map { 1 → 3, 2 → 2, 3 → 1 }
 *
 *   Step 2 - Place in buckets (index = frequency):
 *     bucket[0] = []
 *     bucket[1] = [3]      ← 3 appears 1 time
 *     bucket[2] = [2]      ← 2 appears 2 times
 *     bucket[3] = [1]      ← 1 appears 3 times
 *     bucket[4] = []
 *     bucket[5] = []
 *     bucket[6] = []
 *
 *   Step 3 - Collect from highest frequency:
 *     bucket[6]: empty
 *     bucket[5]: empty
 *     bucket[4]: empty
 *     bucket[3]: add 1 → result = [1]
 *     bucket[2]: add 2 → result = [1, 2]  ← k=2 reached, stop
 *
 *   Result: [1, 2]
 */
function topKFrequent(nums: number[], k: number): number[] {
  // Step 1: Count frequency of each number
  // Example: [1,1,1,2,2,3] → Map { 1 → 3, 2 → 2, 3 → 1 }
  const freqMap = new Map<number, number>();

  for (const num of nums) {
    // If num exists, increment its count; otherwise start at 1
    freqMap.set(num, (freqMap.get(num) || 0) + 1);
  }

  // Step 2: Create buckets where index = frequency
  // Size is nums.length + 1 because max possible frequency is n
  // Example for [1,1,1,2,2,3]:
  //   buckets[1] = [3]  → 3 appears 1 time
  //   buckets[2] = [2]  → 2 appears 2 times
  //   buckets[3] = [1]  → 1 appears 3 times
  const buckets: number[][] = Array.from({ length: nums.length + 1 }, () => []);

  // Place each number into bucket matching its frequency
  for (const [num, freq] of freqMap) {
    buckets[freq].push(num);
  }

  // Step 3: Collect k most frequent elements
  // Start from highest frequency bucket and work down
  const result: number[] = [];

  // i starts at end (highest frequency) and decreases
  // Stop early once we have k elements
  for (let i = buckets.length - 1; i >= 0 && result.length < k; i--) {
    // Each bucket may contain multiple numbers with same frequency
    for (const num of buckets[i]) {
      result.push(num);
      if (result.length === k) break; // Got enough, stop early
    }
  }

  return result;
}

// Test cases
console.log("Top K Frequent Elements");
console.log("=======================\n");

console.log("topKFrequent([1,1,1,2,2,3], 2):", topKFrequent([1, 1, 1, 2, 2, 3], 2)); // [1, 2]
console.log("topKFrequent([1], 1):", topKFrequent([1], 1)); // [1]
console.log("topKFrequent([1,2,2,3,3,3], 2):", topKFrequent([1, 2, 2, 3, 3, 3], 2)); // [3, 2]

export {}
