/**
 * Minimum Window Substring
 *
 * Given two strings s and t of lengths m and n respectively, return the minimum
 * window substring of s such that every character in t (including duplicates)
 * is included in the window. If there is no such substring, return "".
 *
 * The testcases will be generated such that the answer is unique.
 *
 * Example 1:
 * Input: s = "ADOBECODEBANC", t = "ABC"
 * Output: "BANC"
 * Explanation: The minimum window substring "BANC" includes 'A', 'B', and 'C' from t.
 *
 * Example 2:
 * Input: s = "a", t = "a"
 * Output: "a"
 *
 * Example 3:
 * Input: s = "a", t = "aa"
 * Output: ""
 * Explanation: Both 'a's from t must be included, but s only has one 'a'.
 *
 * Constraints:
 * - m == s.length
 * - n == t.length
 * - 1 <= m, n <= 10^5
 * - s and t consist of uppercase and lowercase English letters.
 *
 * Time Complexity: O(m + n)
 * Space Complexity: O(m + n)
 */

function minWindow(s: string, t: string): string {
  if (t.length > s.length) return "";

  // Count required characters from t
  const need = new Map<string, number>();
  for (const char of t) {
    need.set(char, (need.get(char) || 0) + 1);
  }

  const window = new Map<string, number>();
  let have = 0;
  const required = need.size;

  let minLen = Infinity;
  let minStart = 0;
  let left = 0;

  for (let right = 0; right < s.length; right++) {
    const char = s[right];
    window.set(char, (window.get(char) || 0) + 1);

    // Check if current char satisfies a requirement
    if (need.has(char) && window.get(char) === need.get(char)) {
      have++;
    }

    // Try to shrink window while it's valid
    while (have === required) {
      const windowLen = right - left + 1;
      if (windowLen < minLen) {
        minLen = windowLen;
        minStart = left;
      }

      const leftChar = s[left];
      window.set(leftChar, window.get(leftChar)! - 1);

      if (need.has(leftChar) && window.get(leftChar)! < need.get(leftChar)!) {
        have--;
      }
      left++;
    }
  }

  return minLen === Infinity ? "" : s.substring(minStart, minStart + minLen);
}

// Test cases
console.log("Minimum Window Substring");
console.log("========================");
console.log(minWindow("ADOBECODEBANC", "ABC")); // Expected: "BANC"
console.log(minWindow("a", "a"));               // Expected: "a"
console.log(minWindow("a", "aa"));              // Expected: ""
console.log(minWindow("aa", "aa"));             // Expected: "aa"
console.log(minWindow("cabwefgewcwaefgcf", "cae")); // Expected: "cwae"
console.log(minWindow("bba", "ab"));            // Expected: "ba"

export {}
