/**
 * Koko Eating Bananas
 * Difficulty: Medium
 *
 * Koko loves to eat bananas. There are n piles of bananas, the ith pile has piles[i] bananas.
 * The guards have gone and will come back in h hours.
 *
 * Koko can decide her bananas-per-hour eating speed of k. Each hour, she chooses some pile
 * of bananas and eats k bananas from that pile. If the pile has less than k bananas, she
 * eats all of them instead and will not eat any more bananas during this hour.
 *
 * Koko likes to eat slowly but still wants to finish eating all the bananas before the
 * guards return.
 *
 * Return the minimum integer k such that she can eat all the bananas within h hours.
 *
 * Example 1:
 * Input: piles = [3,6,7,11], h = 8
 * Output: 4
 *
 * Example 2:
 * Input: piles = [30,11,23,4,20], h = 5
 * Output: 30
 *
 * Example 3:
 * Input: piles = [30,11,23,4,20], h = 6
 * Output: 23
 *
 * Constraints:
 * - 1 <= piles.length <= 10^4
 * - piles.length <= h <= 10^9
 * - 1 <= piles[i] <= 10^9
 */

/**
 * Binary Search on Answer - O(n * log(max)) time, O(1) space
 *
 * Key insight: This is a "binary search on the answer" problem.
 * We're searching for the minimum speed k where Koko can finish.
 *
 * Search space:
 * - Minimum speed: 1 (slowest possible)
 * - Maximum speed: max(piles) (can finish any pile in 1 hour)
 *
 * For a given speed k, hours needed for pile p = ceil(p / k)
 * Total hours = sum of ceil(piles[i] / k) for all piles
 *
 * Binary search logic:
 * - If total hours <= h: k is valid, but try slower (search left)
 * - If total hours > h: k is too slow, need faster (search right)
 *
 * Algorithm:
 * 1. Set left = 1, right = max(piles)
 * 2. Binary search for minimum valid k
 * 3. For each mid, calculate total hours needed
 * 4. Return the minimum valid k
 *
 * Example walkthrough with piles = [3,6,7,11], h = 8:
 * - max = 11, so search range [1, 11]
 * - k=6: ceil(3/6)=1, ceil(6/6)=1, ceil(7/6)=2, ceil(11/6)=2 -> total=6 <= 8 ✓
 * - k=3: ceil(3/3)=1, ceil(6/3)=2, ceil(7/3)=3, ceil(11/3)=4 -> total=10 > 8 ✗
 * - k=4: ceil(3/4)=1, ceil(6/4)=2, ceil(7/4)=2, ceil(11/4)=3 -> total=8 <= 8 ✓
 * - k=4 is minimum valid -> return 4
 */
function minEatingSpeed(piles: number[], h: number): number {
  // Helper function to calculate total hours needed at speed k
  function canFinish(k: number): boolean {
    let totalHours = 0;
    for (const pile of piles) {
      // Hours for this pile = ceil(pile / k)
      totalHours += Math.ceil(pile / k);
    }
    return totalHours <= h;
  }

  // Binary search range: [1, max(piles)]
  let left = 1;
  let right = Math.max(...piles);

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);

    if (canFinish(mid)) {
      // mid works, but maybe we can go slower
      right = mid;
    } else {
      // mid doesn't work, need to go faster
      left = mid + 1;
    }
  }

  return left;
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Koko Eating Bananas");
console.log("==========================================");

// Test case 1: Basic example
console.log(minEatingSpeed([3, 6, 7, 11], 8)); // Expected: 4

// Test case 2: Need maximum speed (h = n)
console.log(minEatingSpeed([30, 11, 23, 4, 20], 5)); // Expected: 30

// Test case 3: Slightly more time
console.log(minEatingSpeed([30, 11, 23, 4, 20], 6)); // Expected: 23

// Test case 4: Single pile
console.log(minEatingSpeed([10], 5)); // Expected: 2 (ceil(10/2)=5 hours)

// Test case 5: Single pile, single hour
console.log(minEatingSpeed([10], 1)); // Expected: 10

// Test case 6: All same size piles
console.log(minEatingSpeed([5, 5, 5, 5], 4)); // Expected: 5

// Test case 7: Lots of time
console.log(minEatingSpeed([3, 6, 7, 11], 100)); // Expected: 1

// Test case 8: Large pile
console.log(minEatingSpeed([1000000000], 2)); // Expected: 500000000

// Test case 9: Multiple small piles, plenty of time
console.log(minEatingSpeed([1, 1, 1, 1], 8)); // Expected: 1

// Test case 10: Exactly h = n
console.log(minEatingSpeed([2, 2], 2)); // Expected: 2

export {}
