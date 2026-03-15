/**
 * Contains Duplicate
 * Difficulty: Easy
 *
 * Given an integer array nums, return true if any value appears
 * at least twice in the array, and return false if every element is distinct.
 */

function containsDuplicate(nums: number[]): boolean {
  const seen = new Set<number>();

  for (const num of nums) {
    if (seen.has(num)) {
      return true;
    }
    seen.add(num);
  }

  return false;
}

// Test cases
console.log("Contains Duplicate");
console.log("==================\n");

console.log("containsDuplicate([1,2,3,1]):", containsDuplicate([1, 2, 3, 1])); // true
console.log("containsDuplicate([1,2,3,4]):", containsDuplicate([1, 2, 3, 4])); // false
console.log("containsDuplicate([1,1,1,3,3,4,3,2,4,2]):", containsDuplicate([1, 1, 1, 3, 3, 4, 3, 2, 4, 2])); // true
console.log("containsDuplicate([]):", containsDuplicate([])); // false

export {}
