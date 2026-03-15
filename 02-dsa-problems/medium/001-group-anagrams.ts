/**
 * Group Anagrams
 * Difficulty: Medium
 *
 * Given an array of strings strs, group the anagrams together.
 * You can return the answer in any order.
 *
 * An anagram is a word or phrase formed by rearranging the letters of a different
 * word or phrase, using all the original letters exactly once.
 *
 * Example 1:
 * Input: strs = ["eat","tea","tan","ate","nat","bat"]
 * Output: [["bat"],["nat","tan"],["ate","eat","tea"]]
 * Explanation: There is no string in strs that can be rearranged to form "bat".
 * The strings "nat" and "tan" are anagrams as they can be rearranged to form each other.
 * The strings "ate", "eat", and "tea" are anagrams as they can be rearranged to form each other.
 *
 * Example 2:
 * Input: strs = [""]
 * Output: [[""]]
 *
 * Example 3:
 * Input: strs = ["a"]
 * Output: [["a"]]
 *
 * Constraints:
 * - 1 <= strs.length <= 10^4
 * - 0 <= strs[i].length <= 100
 * - strs[i] consists of lowercase English letters.
 */

/**
 * Hash Map with Sorted Key - O(n * k log k) time, O(n * k) space
 * where n = number of strings, k = max length of a string
 *
 * Key insight: All anagrams produce the same string when their characters
 * are sorted. "eat", "tea", "ate" all become "aet" when sorted.
 *
 * Algorithm:
 * 1. Create a hash map where key = sorted string, value = array of anagrams
 * 2. For each string in input:
 *    - Sort its characters to create a key
 *    - Add the original string to the array for that key
 * 3. Return all the arrays from the hash map
 *
 * Example walkthrough with ["eat","tea","tan","ate","nat","bat"]:
 *   "eat" → sort → "aet" → map["aet"] = ["eat"]
 *   "tea" → sort → "aet" → map["aet"] = ["eat", "tea"]
 *   "tan" → sort → "ant" → map["ant"] = ["tan"]
 *   "ate" → sort → "aet" → map["aet"] = ["eat", "tea", "ate"]
 *   "nat" → sort → "ant" → map["ant"] = ["tan", "nat"]
 *   "bat" → sort → "abt" → map["abt"] = ["bat"]
 *
 *   Result: [["eat","tea","ate"], ["tan","nat"], ["bat"]]
 *
 * Alternative approach: Character count as key (O(n * k) time)
 * - Instead of sorting, count each character frequency
 * - Key = "a2b1c0..." (count of each letter)
 * - Faster for long strings, but sorting is simpler and sufficient here
 */
function groupAnagrams(strs: string[]): string[][] {
  // Map where key = sorted string, value = array of anagrams
  // Example: Map { "aet" → ["eat", "tea", "ate"], "ant" → ["tan", "nat"] }
  const map = new Map<string, string[]>();

  for (const str of strs) {
    // Key insight: All anagrams produce the same sorted string
    // "eat" → "aet", "tea" → "aet", "ate" → "aet"
    const sorted = str.split("").sort().join("");

    // Create empty array for this key if it doesn't exist
    if (!map.has(sorted)) {
      map.set(sorted, []);
    }

    // Add original string to its anagram group
    // The "!" tells TypeScript we know the key exists (we just created it above)
    map.get(sorted)!.push(str);
  }

  // Return just the grouped arrays, not the keys
  // Map { "aet" → ["eat","tea","ate"], "ant" → ["tan","nat"] }
  // becomes [["eat","tea","ate"], ["tan","nat"]]
  return Array.from(map.values());
}

// Test cases
console.log("Group Anagrams");
console.log("==============\n");

console.log("groupAnagrams(['eat','tea','tan','ate','nat','bat']):");
console.log(groupAnagrams(["eat", "tea", "tan", "ate", "nat", "bat"]));
// [["eat","tea","ate"],["tan","nat"],["bat"]]

console.log("\ngroupAnagrams(['']):");
console.log(groupAnagrams([""]));
// [[""]]

console.log("\ngroupAnagrams(['a']):");
console.log(groupAnagrams(["a"]));
// [["a"]]

export {}
