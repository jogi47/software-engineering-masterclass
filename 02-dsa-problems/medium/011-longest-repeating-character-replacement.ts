/**
 * Longest Repeating Character Replacement
 *
 * You are given a string s and an integer k. You can choose any character
 * of the string and change it to any other uppercase English character.
 * You can perform this operation at most k times.
 *
 * Return the length of the longest substring containing the same letter
 * you can get after performing the above operations.
 *
 * Example 1:
 * Input: s = "ABAB", k = 2
 * Output: 4
 * Explanation: Replace the two 'A's with two 'B's or vice versa.
 *
 * Example 2:
 * Input: s = "AABABBA", k = 1
 * Output: 4
 * Explanation: Replace the one 'A' in the middle with 'B' and form "AABBBBA".
 * The substring "BBBB" has the longest repeating letters, which is 4.
 *
 * Constraints:
 * - 1 <= s.length <= 10^5
 * - s consists of only uppercase English letters.
 * - 0 <= k <= s.length
 *
 * Time Complexity: O(n)
 * Space Complexity: O(26) = O(1)
 */

function characterReplacement(s: string, k: number): number {
  const count = new Map<string, number>();
  let maxCount = 0; // max frequency of any single character in current window
  let maxLength = 0;
  let left = 0;

  for (let right = 0; right < s.length; right++) {
    const char = s[right];
    count.set(char, (count.get(char) || 0) + 1);
    maxCount = Math.max(maxCount, count.get(char)!);

    // Window size - max frequency = characters to replace
    // If this exceeds k, shrink window
    while (right - left + 1 - maxCount > k) {
      const leftChar = s[left];
      count.set(leftChar, count.get(leftChar)! - 1);
      left++;
    }

    maxLength = Math.max(maxLength, right - left + 1);
  }

  return maxLength;
}

// Test cases
console.log("Longest Repeating Character Replacement");
console.log("========================================");
console.log(characterReplacement("ABAB", 2));     // Expected: 4
console.log(characterReplacement("AABABBA", 1));  // Expected: 4
console.log(characterReplacement("AAAA", 2));     // Expected: 4
console.log(characterReplacement("ABCD", 2));     // Expected: 3
console.log(characterReplacement("ABBB", 2));     // Expected: 4

export {}
