/**
 * Quick Sort
 * Difficulty: Medium
 *
 * Sort an array using quick sort algorithm (divide and conquer).
 * - Pick a pivot element
 * - Partition array around pivot
 * - Recursively sort sub-arrays
 *
 * Time Complexity: O(n log n) average, O(n^2) worst case
 * Space Complexity: O(log n) for recursion stack
 */

function quickSort(arr: number[]): number[] {
  if (arr.length <= 1) return arr;

  const pivot = arr[arr.length - 1];
  const left: number[] = [];
  const right: number[] = [];

  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] < pivot) {
      left.push(arr[i]);
    } else {
      right.push(arr[i]);
    }
  }

  return [...quickSort(left), pivot, ...quickSort(right)];
}

// In-place quick sort (Lomuto partition scheme)
function quickSortInPlace(arr: number[], low = 0, high = arr.length - 1): void {
  if (low < high) {
    const pivotIndex = partition(arr, low, high);
    quickSortInPlace(arr, low, pivotIndex - 1);
    quickSortInPlace(arr, pivotIndex + 1, high);
  }
}

function partition(arr: number[], low: number, high: number): number {
  const pivot = arr[high];
  let i = low - 1;

  for (let j = low; j < high; j++) {
    if (arr[j] < pivot) {
      i++;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
  return i + 1;
}

// Quick sort with Hoare partition (more efficient)
function quickSortHoare(arr: number[], low = 0, high = arr.length - 1): void {
  if (low < high) {
    const pivotIndex = partitionHoare(arr, low, high);
    quickSortHoare(arr, low, pivotIndex);
    quickSortHoare(arr, pivotIndex + 1, high);
  }
}

function partitionHoare(arr: number[], low: number, high: number): number {
  const pivot = arr[Math.floor((low + high) / 2)];
  let i = low - 1;
  let j = high + 1;

  while (true) {
    do {
      i++;
    } while (arr[i] < pivot);

    do {
      j--;
    } while (arr[j] > pivot);

    if (i >= j) return j;

    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// Test cases
console.log("Quick Sort");
console.log("==========\n");

console.log("quickSort([10, 7, 8, 9, 1, 5]):", quickSort([10, 7, 8, 9, 1, 5]));
// [1, 5, 7, 8, 9, 10]

console.log("quickSort([64, 34, 25, 12, 22, 11, 90]):", quickSort([64, 34, 25, 12, 22, 11, 90]));
// [11, 12, 22, 25, 34, 64, 90]

console.log("quickSort([1]):", quickSort([1]));
// [1]

console.log("quickSort([]):", quickSort([]));
// []

console.log("\nIn-place version (Lomuto):");
const lomutoArr = [10, 7, 8, 9, 1, 5];
quickSortInPlace(lomutoArr);
console.log("After sorting [10, 7, 8, 9, 1, 5]:", lomutoArr);
// [1, 5, 7, 8, 9, 10]

console.log("\nIn-place version (Hoare):");
const hoareArr = [64, 34, 25, 12, 22, 11, 90];
quickSortHoare(hoareArr);
console.log("After sorting [64, 34, 25, 12, 22, 11, 90]:", hoareArr);
// [11, 12, 22, 25, 34, 64, 90]

export {}
