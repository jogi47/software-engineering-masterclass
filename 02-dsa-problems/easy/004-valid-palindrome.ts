/**
 * Valid Palindrome
 * Difficulty: Easy
 *
 * A phrase is a palindrome if, after converting all uppercase letters into lowercase letters
 * and removing all non-alphanumeric characters, it reads the same forward and backward.
 * Alphanumeric characters include letters and numbers.
 *
 * Given a string s, return true if it is a palindrome, or false otherwise.
 *
 * Example 1:
 * Input: s = "A man, a plan, a canal: Panama"
 * Output: true
 * Explanation: "amanaplanacanalpanama" is a palindrome.
 *
 * Example 2:
 * Input: s = "race a car"
 * Output: false
 * Explanation: "raceacar" is not a palindrome.
 *
 * Example 3:
 * Input: s = " "
 * Output: true
 * Explanation: s is an empty string "" after removing non-alphanumeric characters.
 * Since an empty string reads the same forward and backward, it is a palindrome.
 *
 * Constraints:
 * - 1 <= s.length <= 2 * 10^5
 * - s consists only of printable ASCII characters.
 */

/**
 * Two-pointer approach - O(n) time, O(1) space
 *
 * Algorithm:
 * 1. Use two pointers: left starting at beginning, right starting at end
 * 2. Skip non-alphanumeric characters by moving pointers inward
 * 3. Compare characters (case-insensitive)
 * 4. If mismatch found, return false
 * 5. Continue until pointers meet or cross
 *
 * Example walkthrough with "A man, a plan, a canal: Panama":
 * - left=0 ('A'), right=29 ('a') -> both alphanumeric, 'a' == 'a' ✓
 * - left=1 (' '), skip -> left=2 ('m')
 * - right=28 ('m') -> 'm' == 'm' ✓
 * - Continue until pointers meet...
 */
function isPalindrome(s: string): boolean {
  let left = 0;
  let right = s.length - 1;

  while (left < right) {
    // Skip non-alphanumeric characters from left
    while (left < right && !isAlphanumeric(s[left])) {
      left++;
    }

    // Skip non-alphanumeric characters from right
    while (left < right && !isAlphanumeric(s[right])) {
      right--;
    }

    // Compare characters (case-insensitive)
    if (s[left].toLowerCase() !== s[right].toLowerCase()) {
      return false;
    }

    left++;
    right--;
  }

  return true;
}

/**
 * Helper function to check if a character is alphanumeric
 */
function isAlphanumeric(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    (code >= 48 && code <= 57) || // 0-9
    (code >= 65 && code <= 90) || // A-Z
    (code >= 97 && code <= 122) // a-z
  );
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Valid Palindrome");
console.log("==========================================");

// Test case 1: Classic palindrome with spaces and punctuation
console.log(isPalindrome("A man, a plan, a canal: Panama")); // Expected: true

// Test case 2: Not a palindrome
console.log(isPalindrome("race a car")); // Expected: false

// Test case 3: Empty string (after removing non-alphanumeric)
console.log(isPalindrome(" ")); // Expected: true

// Test case 4: Single character
console.log(isPalindrome("a")); // Expected: true

// Test case 5: Only non-alphanumeric characters
console.log(isPalindrome(".,")); // Expected: true

// Test case 6: Numbers included
console.log(isPalindrome("0P")); // Expected: false

export {}
