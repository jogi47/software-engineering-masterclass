/**
 * Sliding Window Maximum
 *
 * You are given an array of integers nums, there is a sliding window of size k
 * which is moving from the very left of the array to the very right. You can
 * only see the k numbers in the window. Each time the sliding window moves
 * right by one position.
 *
 * Return the max sliding window.
 *
 * Example 1:
 * Input: nums = [1,3,-1,-3,5,3,6,7], k = 3
 * Output: [3,3,5,5,6,7]
 * Explanation:
 * Window position                Max
 * ---------------               -----
 * [1  3  -1] -3  5  3  6  7       3
 *  1 [3  -1  -3] 5  3  6  7       3
 *  1  3 [-1  -3  5] 3  6  7       5
 *  1  3  -1 [-3  5  3] 6  7       5
 *  1  3  -1  -3 [5  3  6] 7       6
 *  1  3  -1  -3  5 [3  6  7]      7
 *
 * Example 2:
 * Input: nums = [1], k = 1
 * Output: [1]
 *
 * Constraints:
 * - 1 <= nums.length <= 10^5
 * - -10^4 <= nums[i] <= 10^4
 * - 1 <= k <= nums.length
 *
 * Time Complexity: O(n)
 * Space Complexity: O(k)
 */

function maxSlidingWindow(nums: number[], k: number): number[] {
  const result: number[] = [];
  const deque: number[] = []; // stores indices, monotonically decreasing values

  for (let i = 0; i < nums.length; i++) {
    // Remove indices outside the current window
    while (deque.length > 0 && deque[0] < i - k + 1) {
      deque.shift();
    }

    // Remove indices of smaller elements (they will never be max)
    while (deque.length > 0 && nums[deque[deque.length - 1]] < nums[i]) {
      deque.pop();
    }

    deque.push(i);

    // Start recording results once we have a full window
    if (i >= k - 1) {
      result.push(nums[deque[0]]);
    }
  }

  return result;
}

// Test cases
console.log("Sliding Window Maximum");
console.log("======================");
console.log(maxSlidingWindow([1, 3, -1, -3, 5, 3, 6, 7], 3)); // Expected: [3,3,5,5,6,7]
console.log(maxSlidingWindow([1], 1));                        // Expected: [1]
console.log(maxSlidingWindow([1, -1], 1));                    // Expected: [1,-1]
console.log(maxSlidingWindow([9, 11], 2));                    // Expected: [11]
console.log(maxSlidingWindow([4, -2], 2));                    // Expected: [4]
console.log(maxSlidingWindow([1, 3, 1, 2, 0, 5], 3));         // Expected: [3,3,2,5]

export {}
