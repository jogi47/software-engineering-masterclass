/**
 * Merge Sort
 * Difficulty: Medium
 *
 * Sort an array using merge sort algorithm (divide and conquer).
 * - Divide array into two halves
 * - Recursively sort each half
 * - Merge the sorted halves
 *
 * Time Complexity: O(n log n)
 * Space Complexity: O(n)
 */

function mergeSort(arr: number[]): number[] {
  if (arr.length <= 1) return arr;

  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));

  return merge(left, right);
}

function merge(left: number[], right: number[]): number[] {
  const result: number[] = [];
  let i = 0;
  let j = 0;

  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) {
      result.push(left[i]);
      i++;
    } else {
      result.push(right[j]);
      j++;
    }
  }

  // Add remaining elements
  while (i < left.length) {
    result.push(left[i]);
    i++;
  }
  while (j < right.length) {
    result.push(right[j]);
    j++;
  }

  return result;
}

// In-place merge sort (more complex but O(1) extra space for merge)
function mergeSortInPlace(arr: number[], start = 0, end = arr.length - 1): void {
  if (start >= end) return;

  const mid = Math.floor((start + end) / 2);
  mergeSortInPlace(arr, start, mid);
  mergeSortInPlace(arr, mid + 1, end);
  mergeInPlace(arr, start, mid, end);
}

function mergeInPlace(arr: number[], start: number, mid: number, end: number): void {
  const left = arr.slice(start, mid + 1);
  const right = arr.slice(mid + 1, end + 1);

  let i = 0, j = 0, k = start;

  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) {
      arr[k] = left[i];
      i++;
    } else {
      arr[k] = right[j];
      j++;
    }
    k++;
  }

  while (i < left.length) {
    arr[k] = left[i];
    i++;
    k++;
  }
  while (j < right.length) {
    arr[k] = right[j];
    j++;
    k++;
  }
}

// Test cases
console.log("Merge Sort");
console.log("==========\n");

console.log("mergeSort([38, 27, 43, 3, 9, 82, 10]):", mergeSort([38, 27, 43, 3, 9, 82, 10]));
// [3, 9, 10, 27, 38, 43, 82]

console.log("mergeSort([5, 2, 4, 6, 1, 3]):", mergeSort([5, 2, 4, 6, 1, 3]));
// [1, 2, 3, 4, 5, 6]

console.log("mergeSort([1]):", mergeSort([1]));
// [1]

console.log("mergeSort([]):", mergeSort([]));
// []

console.log("\nIn-place version:");
const arrr = [38, 27, 43, 3, 9, 82, 10];
mergeSortInPlace(arrr);
console.log("After sorting [38, 27, 43, 3, 9, 82, 10]:", arrr);
// [3, 9, 10, 27, 38, 43, 82]

export {}
