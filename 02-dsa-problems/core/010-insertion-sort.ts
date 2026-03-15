/**
 * Insertion Sort
 * Difficulty: Easy
 *
 * Sort an array using insertion sort algorithm.
 * - Build sorted array one element at a time
 * - Insert each element into its correct position
 *
 * Time Complexity: O(n^2)
 * Space Complexity: O(1)
 */

function insertionSort(arr: number[]): number[] {
  const result = [...arr];

  // Think of it like sorting cards in your hand:
  // - Left side (0 to i-1) is already sorted
  // - Right side (i to end) is unsorted
  // - We pick one card at a time and insert it in the correct position

  // Start from index 1 (index 0 is already "sorted" - single element)
  for (let i = 1; i < result.length; i++) {
    // Pick the current element to insert into sorted portion
    const key = result[i];

    // Start comparing from the element just before current
    let j = i - 1;

    // Shift elements to the right until we find the correct spot for 'key'
    // Example: sorted=[2,5,7], key=4
    //   j=2: 7 > 4? Yes, shift 7 right → [2,5,_,7]
    //   j=1: 5 > 4? Yes, shift 5 right → [2,_,5,7]
    //   j=0: 2 > 4? No, stop!
    //   Insert key at j+1 → [2,4,5,7]
    while (j >= 0 && result[j] > key) {
      result[j + 1] = result[j]; // Shift element right
      j--;                        // Move to previous element
    }

    // Insert key in its correct position
    result[j + 1] = key;
  }

  return result;
}

// In-place version
function insertionSortInPlace(arr: number[]): void {
  for (let i = 1; i < arr.length; i++) {
    const key = arr[i];
    let j = i - 1;

    while (j >= 0 && arr[j] > key) {
      arr[j + 1] = arr[j];
      j--;
    }
    arr[j + 1] = key;
  }
}

// Test cases
console.log("Insertion Sort");
console.log("==============\n");

console.log("insertionSort([5, 2, 4, 6, 1, 3]):", insertionSort([5, 2, 4, 6, 1, 3]));
// [1, 2, 3, 4, 5, 6]

console.log("insertionSort([64, 34, 25, 12, 22, 11, 90]):", insertionSort([64, 34, 25, 12, 22, 11, 90]));
// [11, 12, 22, 25, 34, 64, 90]

console.log("insertionSort([1]):", insertionSort([1]));
// [1]

console.log("insertionSort([]):", insertionSort([]));
// []

console.log("\nIn-place version:");
const testArr = [5, 2, 4, 6, 1, 3];
insertionSortInPlace(testArr);
console.log("After sorting [5, 2, 4, 6, 1, 3]:", testArr);
// [1, 2, 3, 4, 5, 6]

export {}
