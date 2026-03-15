/**
 * Search a 2D Matrix
 * Difficulty: Medium
 *
 * You are given an m x n integer matrix with the following two properties:
 * - Each row is sorted in non-decreasing order.
 * - The first integer of each row is greater than the last integer of the previous row.
 *
 * Given an integer target, return true if target is in matrix or false otherwise.
 *
 * You must write a solution in O(log(m * n)) time complexity.
 *
 * Example 1:
 * Input: matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3
 * Output: true
 *
 * Example 2:
 * Input: matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 13
 * Output: false
 *
 * Constraints:
 * - m == matrix.length
 * - n == matrix[i].length
 * - 1 <= m, n <= 100
 * - -10^4 <= matrix[i][j], target <= 10^4
 */

/**
 * Binary Search treating 2D as 1D - O(log(m*n)) time, O(1) space
 *
 * Key insight: Since each row is sorted AND the first element of each row
 * is greater than the last element of the previous row, the entire matrix
 * can be treated as a single sorted 1D array.
 *
 * Index conversion:
 * - 1D index i maps to 2D: row = i / n, col = i % n
 * - Total elements: m * n
 *
 * Algorithm:
 * 1. Treat matrix as 1D sorted array of size m*n
 * 2. Perform standard binary search
 * 3. Convert 1D index to 2D coordinates when accessing elements
 *
 * Example with matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]]:
 * - m=3, n=4 -> total 12 elements
 * - 1D representation: [1,3,5,7,10,11,16,20,23,30,34,60]
 * - Index 5 -> row = 5/4 = 1, col = 5%4 = 1 -> matrix[1][1] = 11
 *
 * Walkthrough for target = 3:
 *   left=0, right=11, mid=5 -> matrix[1][1]=11 > 3 -> right=4
 *   left=0, right=4, mid=2 -> matrix[0][2]=5 > 3 -> right=1
 *   left=0, right=1, mid=0 -> matrix[0][0]=1 < 3 -> left=1
 *   left=1, right=1, mid=1 -> matrix[0][1]=3 === 3 -> return true
 */
function searchMatrix(matrix: number[][], target: number): boolean {
  const m = matrix.length;
  const n = matrix[0].length;

  let left = 0;
  let right = m * n - 1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);

    // Convert 1D index to 2D coordinates
    const row = Math.floor(mid / n);
    const col = mid % n;
    const value = matrix[row][col];

    if (value === target) {
      return true;
    } else if (value < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return false;
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Search a 2D Matrix");
console.log("==========================================");

// Test case 1: Target exists
console.log(
  searchMatrix(
    [
      [1, 3, 5, 7],
      [10, 11, 16, 20],
      [23, 30, 34, 60],
    ],
    3
  )
); // Expected: true

// Test case 2: Target doesn't exist
console.log(
  searchMatrix(
    [
      [1, 3, 5, 7],
      [10, 11, 16, 20],
      [23, 30, 34, 60],
    ],
    13
  )
); // Expected: false

// Test case 3: Target is first element
console.log(
  searchMatrix(
    [
      [1, 3, 5],
      [7, 9, 11],
    ],
    1
  )
); // Expected: true

// Test case 4: Target is last element
console.log(
  searchMatrix(
    [
      [1, 3, 5],
      [7, 9, 11],
    ],
    11
  )
); // Expected: true

// Test case 5: Single row
console.log(searchMatrix([[1, 3, 5, 7]], 5)); // Expected: true

// Test case 6: Single column
console.log(searchMatrix([[1], [3], [5]], 3)); // Expected: true

// Test case 7: Single element - found
console.log(searchMatrix([[5]], 5)); // Expected: true

// Test case 8: Single element - not found
console.log(searchMatrix([[5]], 3)); // Expected: false

// Test case 9: Target smaller than all
console.log(
  searchMatrix(
    [
      [2, 4],
      [6, 8],
    ],
    1
  )
); // Expected: false

// Test case 10: Target larger than all
console.log(
  searchMatrix(
    [
      [2, 4],
      [6, 8],
    ],
    10
  )
); // Expected: false

// Test case 11: Target in middle row
console.log(
  searchMatrix(
    [
      [1, 3, 5, 7],
      [10, 11, 16, 20],
      [23, 30, 34, 60],
    ],
    16
  )
); // Expected: true

export {}
