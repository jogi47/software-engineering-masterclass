/**
 * Permutation in String
 *
 * Given two strings s1 and s2, return true if s2 contains a permutation of s1,
 * or false otherwise. In other words, return true if one of s1's permutations
 * is the substring of s2.
 *
 * Example 1:
 * Input: s1 = "ab", s2 = "eidbaooo"
 * Output: true
 * Explanation: s2 contains one permutation of s1 ("ba").
 *
 * Example 2:
 * Input: s1 = "ab", s2 = "eidboaoo"
 * Output: false
 *
 * Constraints:
 * - 1 <= s1.length, s2.length <= 10^4
 * - s1 and s2 consist of lowercase English letters.
 *
 * Time Complexity: O(n) where n is the length of s2
 * Space Complexity: O(26) = O(1)
 */

function checkInclusion(s1: string, s2: string): boolean {
  if (s1.length > s2.length) return false;

  // Count frequency of characters in s1
  const s1Count = new Array(26).fill(0);
  const windowCount = new Array(26).fill(0);

  const charIndex = (c: string) => c.charCodeAt(0) - 'a'.charCodeAt(0);

  // Initialize counts for s1 and first window of s2
  for (let i = 0; i < s1.length; i++) {
    s1Count[charIndex(s1[i])]++;
    windowCount[charIndex(s2[i])]++;
  }

  // Count how many characters have matching frequencies
  let matches = 0;
  for (let i = 0; i < 26; i++) {
    if (s1Count[i] === windowCount[i]) matches++;
  }

  // Slide the window
  for (let i = s1.length; i < s2.length; i++) {
    if (matches === 26) return true;

    // Add character at right end of window
    const rightIdx = charIndex(s2[i]);
    windowCount[rightIdx]++;
    if (windowCount[rightIdx] === s1Count[rightIdx]) {
      matches++;
    } else if (windowCount[rightIdx] === s1Count[rightIdx] + 1) {
      matches--;
    }

    // Remove character at left end of window
    const leftIdx = charIndex(s2[i - s1.length]);
    windowCount[leftIdx]--;
    if (windowCount[leftIdx] === s1Count[leftIdx]) {
      matches++;
    } else if (windowCount[leftIdx] === s1Count[leftIdx] - 1) {
      matches--;
    }
  }

  return matches === 26;
}

// Test cases
console.log("Permutation in String");
console.log("=====================");
console.log(checkInclusion("ab", "eidbaooo"));  // Expected: true
console.log(checkInclusion("ab", "eidboaoo"));  // Expected: false
console.log(checkInclusion("adc", "dcda"));     // Expected: true
console.log(checkInclusion("a", "a"));          // Expected: true
console.log(checkInclusion("ab", "a"));         // Expected: false
console.log(checkInclusion("abc", "bbbca"));    // Expected: true

export {}
