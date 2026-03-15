/**
 * Median of Two Sorted Arrays
 * Difficulty: Hard
 *
 * Given two sorted arrays nums1 and nums2 of size m and n respectively, return
 * the median of the two sorted arrays.
 *
 * The overall run time complexity should be O(log (m+n)).
 *
 * Example 1:
 * Input: nums1 = [1,3], nums2 = [2]
 * Output: 2.00000
 * Explanation: merged array = [1,2,3] and median is 2.
 *
 * Example 2:
 * Input: nums1 = [1,2], nums2 = [3,4]
 * Output: 2.50000
 * Explanation: merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5.
 *
 * Constraints:
 * - nums1.length == m
 * - nums2.length == n
 * - 0 <= m <= 1000
 * - 0 <= n <= 1000
 * - 1 <= m + n <= 2000
 * - -10^6 <= nums1[i], nums2[i] <= 10^6
 */

/**
 * Binary Search on Partition - O(log(min(m,n))) time, O(1) space
 *
 * Key insight: Instead of merging arrays, we find a partition point that
 * divides both arrays such that all elements in the left partition are
 * smaller than all elements in the right partition.
 *
 * Concept:
 * - We need to partition both arrays into left and right halves
 * - Left half should have (m + n + 1) / 2 elements total
 * - All elements in left half <= all elements in right half
 *
 * If we choose i elements from nums1 for left half,
 * we need j = (m + n + 1) / 2 - i elements from nums2.
 *
 * Valid partition condition:
 * - nums1[i-1] <= nums2[j] (left part of nums1 <= right part of nums2)
 * - nums2[j-1] <= nums1[i] (left part of nums2 <= right part of nums1)
 *
 * Binary search on i (partition point in smaller array):
 * - If nums1[i-1] > nums2[j]: i is too big, search left
 * - If nums2[j-1] > nums1[i]: i is too small, search right
 * - Otherwise: valid partition found
 *
 * Visual representation:
 *   nums1: [... | x1 | x2 | ...]
 *                 ^i
 *   nums2: [... | y1 | y2 | ...]
 *                 ^j
 *
 *   Left half: elements before partition in both arrays
 *   Right half: elements after partition in both arrays
 *
 * Median calculation:
 * - If (m + n) is odd: max of left half
 * - If (m + n) is even: (max of left + min of right) / 2
 *
 * Edge cases handled with -Infinity and +Infinity for out-of-bounds.
 */
function findMedianSortedArrays(nums1: number[], nums2: number[]): number {
  // Ensure nums1 is the smaller array for O(log(min(m,n)))
  if (nums1.length > nums2.length) {
    return findMedianSortedArrays(nums2, nums1);
  }

  const m = nums1.length;
  const n = nums2.length;
  const halfLen = Math.floor((m + n + 1) / 2);

  let left = 0;
  let right = m;

  while (left <= right) {
    // i = partition point in nums1 (i elements in left half)
    const i = Math.floor((left + right) / 2);
    // j = partition point in nums2 (j elements in left half)
    const j = halfLen - i;

    // Get elements around the partition
    // Use -Infinity/+Infinity for out-of-bounds
    const nums1LeftMax = i === 0 ? -Infinity : nums1[i - 1];
    const nums1RightMin = i === m ? Infinity : nums1[i];
    const nums2LeftMax = j === 0 ? -Infinity : nums2[j - 1];
    const nums2RightMin = j === n ? Infinity : nums2[j];

    if (nums1LeftMax <= nums2RightMin && nums2LeftMax <= nums1RightMin) {
      // Valid partition found
      // All left elements <= all right elements

      if ((m + n) % 2 === 1) {
        // Odd total: median is max of left half
        return Math.max(nums1LeftMax, nums2LeftMax);
      } else {
        // Even total: median is average of max(left) and min(right)
        const maxLeft = Math.max(nums1LeftMax, nums2LeftMax);
        const minRight = Math.min(nums1RightMin, nums2RightMin);
        return (maxLeft + minRight) / 2;
      }
    } else if (nums1LeftMax > nums2RightMin) {
      // nums1's left part has too large elements
      // Need fewer elements from nums1's left -> move partition left
      right = i - 1;
    } else {
      // nums2's left part has too large elements
      // Need more elements from nums1's left -> move partition right
      left = i + 1;
    }
  }

  // Should never reach here if inputs are valid
  throw new Error("Invalid input");
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Median of Two Sorted Arrays");
console.log("==========================================");

// Test case 1: Odd total length
console.log(findMedianSortedArrays([1, 3], [2])); // Expected: 2.0

// Test case 2: Even total length
console.log(findMedianSortedArrays([1, 2], [3, 4])); // Expected: 2.5

// Test case 3: One empty array
console.log(findMedianSortedArrays([], [1])); // Expected: 1.0

// Test case 4: One empty array, even length
console.log(findMedianSortedArrays([], [1, 2])); // Expected: 1.5

// Test case 5: Arrays of different sizes
console.log(findMedianSortedArrays([1, 2, 3], [4, 5, 6, 7, 8])); // Expected: 4.5
// Merged: [1,2,3,4,5,6,7,8] -> median = (4+5)/2 = 4.5

// Test case 6: Non-overlapping arrays
console.log(findMedianSortedArrays([1, 2], [3, 4, 5, 6])); // Expected: 3.5
// Merged: [1,2,3,4,5,6] -> median = (3+4)/2 = 3.5

// Test case 7: Overlapping arrays
console.log(findMedianSortedArrays([1, 3, 5], [2, 4, 6])); // Expected: 3.5
// Merged: [1,2,3,4,5,6] -> median = (3+4)/2 = 3.5

// Test case 8: Single element each
console.log(findMedianSortedArrays([1], [2])); // Expected: 1.5

// Test case 9: Same elements
console.log(findMedianSortedArrays([1, 1], [1, 1])); // Expected: 1.0

// Test case 10: Negative numbers
console.log(findMedianSortedArrays([-5, -3, -1], [0, 2, 4])); // Expected: -0.5
// Merged: [-5,-3,-1,0,2,4] -> median = (-1+0)/2 = -0.5

// Test case 11: Large difference in sizes
console.log(findMedianSortedArrays([1], [2, 3, 4, 5, 6, 7])); // Expected: 4.0
// Merged: [1,2,3,4,5,6,7] -> median = 4

// Test case 12: Both arrays same
console.log(findMedianSortedArrays([1, 2, 3], [1, 2, 3])); // Expected: 2.0
// Merged: [1,1,2,2,3,3] -> median = (2+2)/2 = 2.0

export {}
