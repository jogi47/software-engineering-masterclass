/**
 * Best Time to Buy and Sell Stock
 *
 * You are given an array prices where prices[i] is the price of a given stock
 * on the ith day. You want to maximize your profit by choosing a single day
 * to buy one stock and choosing a different day in the future to sell that stock.
 *
 * Return the maximum profit you can achieve from this transaction.
 * If you cannot achieve any profit, return 0.
 *
 * Example 1:
 * Input: prices = [7,1,5,3,6,4]
 * Output: 5
 * Explanation: Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5.
 *
 * Example 2:
 * Input: prices = [7,6,4,3,1]
 * Output: 0
 * Explanation: No transactions, max profit = 0.
 *
 * Constraints:
 * - 1 <= prices.length <= 10^5
 * - 0 <= prices[i] <= 10^4
 *
 * Time Complexity: O(n)
 * Space Complexity: O(1)
 */

function maxProfit(prices: number[]): number {
  let minPrice = Infinity;
  let maxProfit = 0;

  for (const price of prices) {
    if (price < minPrice) {
      minPrice = price;
    } else {
      maxProfit = Math.max(maxProfit, price - minPrice);
    }
  }

  return maxProfit;
}

// Test cases
console.log("Best Time to Buy and Sell Stock");
console.log("================================");
console.log(maxProfit([7, 1, 5, 3, 6, 4])); // Expected: 5
console.log(maxProfit([7, 6, 4, 3, 1]));    // Expected: 0
console.log(maxProfit([1, 2]));             // Expected: 1
console.log(maxProfit([2, 4, 1]));          // Expected: 2
console.log(maxProfit([3, 2, 6, 5, 0, 3])); // Expected: 4

export {}
