/**
 * Time Based Key Value Store
 * Difficulty: Medium
 *
 * Design a time-based key-value data structure that can store multiple values for
 * the same key at different time stamps and retrieve the key's value at a certain timestamp.
 *
 * Implement the TimeMap class:
 * - TimeMap() Initializes the object of the data structure.
 * - void set(String key, String value, int timestamp) Stores the key with the value
 *   at the given timestamp.
 * - String get(String key, int timestamp) Returns a value such that set was called
 *   previously, with timestamp_prev <= timestamp. If there are multiple such values,
 *   it returns the value associated with the largest timestamp_prev. If there are no
 *   values, it returns "".
 *
 * Example 1:
 * Input:
 *   ["TimeMap", "set", "get", "get", "set", "get"]
 *   [[], ["foo", "bar", 1], ["foo", 1], ["foo", 3], ["foo", "bar2", 4], ["foo", 4]]
 * Output: [null, null, "bar", "bar", null, "bar2"]
 * Explanation:
 *   TimeMap timeMap = new TimeMap();
 *   timeMap.set("foo", "bar", 1);  // store key "foo" and value "bar" along with timestamp = 1.
 *   timeMap.get("foo", 1);         // return "bar"
 *   timeMap.get("foo", 3);         // return "bar", since there is no value at timestamp 3 and
 *                                  // timestamp 2, the only value is at timestamp 1 is "bar".
 *   timeMap.set("foo", "bar2", 4); // store key "foo" and value "bar2" along with timestamp = 4.
 *   timeMap.get("foo", 4);         // return "bar2"
 *   timeMap.get("foo", 5);         // return "bar2"
 *
 * Constraints:
 * - 1 <= key.length, value.length <= 100
 * - key and value consist of lowercase English letters and digits.
 * - 1 <= timestamp <= 10^7
 * - All the timestamps timestamp of set are strictly increasing.
 * - At most 2 * 10^5 calls will be made to set and get.
 */

/**
 * HashMap + Binary Search - O(1) set, O(log n) get
 *
 * Key insight: Since timestamps are strictly increasing for each key,
 * the array of [timestamp, value] pairs for each key is already sorted.
 * We can use binary search to find the largest timestamp <= query timestamp.
 *
 * Data structure:
 * - HashMap: key -> array of [timestamp, value] pairs
 * - Each array is naturally sorted by timestamp (insertion order)
 *
 * Set operation (O(1)):
 * - Simply append [timestamp, value] to the key's array
 *
 * Get operation (O(log n)):
 * - Binary search for the largest timestamp <= query timestamp
 * - This is "upper bound - 1" or "rightmost value <= target"
 *
 * Binary search variant:
 * - We want the rightmost timestamp that is <= query timestamp
 * - If mid timestamp <= target: this might be answer, search right for better
 * - If mid timestamp > target: search left
 * - Return the value at the found position, or "" if none found
 *
 * Example walkthrough:
 *   set("foo", "bar", 1) -> store["foo"] = [[1, "bar"]]
 *   get("foo", 1) -> binary search for <= 1 -> found [1, "bar"] -> return "bar"
 *   get("foo", 3) -> binary search for <= 3 -> found [1, "bar"] -> return "bar"
 *   set("foo", "bar2", 4) -> store["foo"] = [[1, "bar"], [4, "bar2"]]
 *   get("foo", 4) -> binary search for <= 4 -> found [4, "bar2"] -> return "bar2"
 */
class TimeMap {
  private store: Map<string, [number, string][]>;

  constructor() {
    this.store = new Map();
  }

  set(key: string, value: string, timestamp: number): void {
    if (!this.store.has(key)) {
      this.store.set(key, []);
    }
    // Timestamps are strictly increasing, so just append
    this.store.get(key)!.push([timestamp, value]);
  }

  get(key: string, timestamp: number): string {
    if (!this.store.has(key)) {
      return "";
    }

    const entries = this.store.get(key)!;

    // Binary search for largest timestamp <= query timestamp
    let left = 0;
    let right = entries.length - 1;
    let result = "";

    while (left <= right) {
      const mid = left + Math.floor((right - left) / 2);
      const [midTimestamp, midValue] = entries[mid];

      if (midTimestamp <= timestamp) {
        // This timestamp is valid, but there might be a larger valid one
        result = midValue;
        left = mid + 1;
      } else {
        // This timestamp is too large
        right = mid - 1;
      }
    }

    return result;
  }
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Time Based Key Value Store");
console.log("==========================================");

// Test case 1: Basic operations from example
const timeMap1 = new TimeMap();
timeMap1.set("foo", "bar", 1);
console.log(timeMap1.get("foo", 1)); // Expected: "bar"
console.log(timeMap1.get("foo", 3)); // Expected: "bar"
timeMap1.set("foo", "bar2", 4);
console.log(timeMap1.get("foo", 4)); // Expected: "bar2"
console.log(timeMap1.get("foo", 5)); // Expected: "bar2"

console.log("---");

// Test case 2: Query timestamp before any set
const timeMap2 = new TimeMap();
timeMap2.set("key", "value", 5);
console.log(timeMap2.get("key", 3)); // Expected: "" (no timestamp <= 3)

console.log("---");

// Test case 3: Non-existent key
const timeMap3 = new TimeMap();
console.log(timeMap3.get("nonexistent", 1)); // Expected: ""

console.log("---");

// Test case 4: Multiple keys
const timeMap4 = new TimeMap();
timeMap4.set("a", "val_a1", 1);
timeMap4.set("b", "val_b1", 2);
timeMap4.set("a", "val_a2", 3);
console.log(timeMap4.get("a", 2)); // Expected: "val_a1"
console.log(timeMap4.get("a", 3)); // Expected: "val_a2"
console.log(timeMap4.get("b", 5)); // Expected: "val_b1"

console.log("---");

// Test case 5: Many timestamps for same key
const timeMap5 = new TimeMap();
timeMap5.set("key", "v1", 10);
timeMap5.set("key", "v2", 20);
timeMap5.set("key", "v3", 30);
timeMap5.set("key", "v4", 40);
console.log(timeMap5.get("key", 15)); // Expected: "v1"
console.log(timeMap5.get("key", 25)); // Expected: "v2"
console.log(timeMap5.get("key", 35)); // Expected: "v3"
console.log(timeMap5.get("key", 50)); // Expected: "v4"

console.log("---");

// Test case 6: Exact timestamp match
const timeMap6 = new TimeMap();
timeMap6.set("x", "first", 100);
timeMap6.set("x", "second", 200);
console.log(timeMap6.get("x", 100)); // Expected: "first"
console.log(timeMap6.get("x", 200)); // Expected: "second"

export {}
