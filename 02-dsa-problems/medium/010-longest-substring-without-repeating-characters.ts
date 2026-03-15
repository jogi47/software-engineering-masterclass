/**
 * Longest Substring Without Repeating Characters
 *
 * Given a string s, find the length of the longest substring
 * without repeating characters.
 *
 * Example 1:
 * Input: s = "abcabcbb"
 * Output: 3
 * Explanation: The answer is "abc", with the length of 3.
 *
 * Example 2:
 * Input: s = "bbbbb"
 * Output: 1
 * Explanation: The answer is "b", with the length of 1.
 *
 * Example 3:
 * Input: s = "pwwkew"
 * Output: 3
 * Explanation: The answer is "wke", with the length of 3.
 * Note that "pwke" is a subsequence and not a substring.
 *
 * Constraints:
 * - 0 <= s.length <= 5 * 10^4
 * - s consists of English letters, digits, symbols and spaces.
 *
 * Time Complexity: O(n)
 * Space Complexity: O(min(n, m)) where m is the size of the character set
 */

function lengthOfLongestSubstring(s: string): number {
  // Map to store each character's most recent index in the string
  const charIndex = new Map<string, number>();

  // Track the maximum length found so far
  let maxLength = 0;

  // Left pointer of our sliding window
  let left = 0;

  // Right pointer expands the window one character at a time
  for (let right = 0; right < s.length; right++) {
    const char = s[right];

    // Check if this character was seen before AND is within our current window.
    // The ">= left" check is crucial: it ensures we only care about duplicates
    // that are inside our current window, not old ones we've already passed.
    // Example: "abba" - when we reach the second 'a', the first 'a' at index 0
    // is no longer in our window (left=2), so we shouldn't shrink further.
    if (charIndex.has(char) && charIndex.get(char)! >= left) {
      // Move left pointer to one position after the duplicate.
      // This "shrinks" the window to exclude the previous occurrence.
      left = charIndex.get(char)! + 1;
    }

    // Record/update this character's position
    charIndex.set(char, right);

    // Calculate current window size and update max if larger.
    // Window size = right - left + 1 (inclusive on both ends)
    maxLength = Math.max(maxLength, right - left + 1);
  }

  return maxLength;
}

// Test cases
console.log("Longest Substring Without Repeating Characters");
console.log("===============================================");
console.log(lengthOfLongestSubstring("abcabcbb")); // Expected: 3
console.log(lengthOfLongestSubstring("bbbbb"));    // Expected: 1
console.log(lengthOfLongestSubstring("pwwkew"));   // Expected: 3
console.log(lengthOfLongestSubstring(""));         // Expected: 0
console.log(lengthOfLongestSubstring(" "));        // Expected: 1
console.log(lengthOfLongestSubstring("dvdf"));     // Expected: 3
console.log(lengthOfLongestSubstring("abba"));     // Expected: 2

export {}
