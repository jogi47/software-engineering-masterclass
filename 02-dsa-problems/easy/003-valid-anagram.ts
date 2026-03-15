/**
 * Valid Anagram
 * Difficulty: Easy
 *
 * Given two strings s and t, return true if t is an anagram of s, and false otherwise.
 * An anagram is a word formed by rearranging the letters of another word,
 * using all the original letters exactly once.
 */

function isAnagram(s: string, t: string): boolean {
  if (s.length !== t.length) {
    return false;
  }

  const count: Record<string, number> = {};

  for (const char of s) {
    count[char] = (count[char] || 0) + 1;
  }

  for (const char of t) {
    if (!count[char]) {
      return false;
    }
    count[char]--;
  }

  return true;
}

// Test cases
console.log("Valid Anagram");
console.log("=============\n");

console.log("isAnagram('anagram', 'nagaram'):", isAnagram("anagram", "nagaram")); // true
console.log("isAnagram('rat', 'car'):", isAnagram("rat", "car")); // false
console.log("isAnagram('listen', 'silent'):", isAnagram("listen", "silent")); // true
console.log("isAnagram('hello', 'world'):", isAnagram("hello", "world")); // false
console.log("isAnagram('', ''):", isAnagram("", "")); // true

export {}
