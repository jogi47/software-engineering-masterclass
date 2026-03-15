/**
 * LRU Cache
 * Difficulty: Medium
 *
 * Design a data structure that follows the constraints of a Least Recently Used
 * (LRU) cache.
 *
 * Implement the LRUCache class:
 * - LRUCache(int capacity) Initialize the LRU cache with positive size capacity.
 * - int get(int key) Return the value of the key if the key exists, otherwise
 *   return -1.
 * - void put(int key, int value) Update the value of the key if the key exists.
 *   Otherwise, add the key-value pair to the cache. If the number of keys exceeds
 *   the capacity from this operation, evict the least recently used key.
 *
 * The functions get and put must each run in O(1) average time complexity.
 *
 * Example 1:
 * Input:
 * ["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"]
 * [[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]
 * Output:
 * [null, null, null, 1, null, -1, null, -1, 3, 4]
 *
 * Explanation:
 * LRUCache lRUCache = new LRUCache(2);
 * lRUCache.put(1, 1); // cache is {1=1}
 * lRUCache.put(2, 2); // cache is {1=1, 2=2}
 * lRUCache.get(1);    // return 1
 * lRUCache.put(3, 3); // LRU key was 2, evicts key 2, cache is {1=1, 3=3}
 * lRUCache.get(2);    // returns -1 (not found)
 * lRUCache.put(4, 4); // LRU key was 1, evicts key 1, cache is {4=4, 3=3}
 * lRUCache.get(1);    // return -1 (not found)
 * lRUCache.get(3);    // return 3
 * lRUCache.get(4);    // return 4
 *
 * Constraints:
 * - 1 <= capacity <= 3000
 * - 0 <= key <= 10^4
 * - 0 <= value <= 10^5
 * - At most 2 * 10^5 calls will be made to get and put.
 */

/**
 * Doubly Linked List Node
 */
class DLLNode {
  key: number;
  val: number;
  prev: DLLNode | null;
  next: DLLNode | null;

  constructor(key: number, val: number) {
    this.key = key;
    this.val = val;
    this.prev = null;
    this.next = null;
  }
}

/**
 * HashMap + Doubly Linked List - O(1) time for both get and put
 *
 * Key insight: We need two operations to be O(1):
 * 1. Access by key → HashMap
 * 2. Track recency (move to front, remove from back) → Doubly Linked List
 *
 * Structure:
 * - HashMap: key → DLLNode (for O(1) lookup)
 * - DLL: head (most recent) ←→ ... ←→ tail (least recent)
 * - Dummy head and tail simplify edge cases
 *
 * Operations:
 * - get(key): lookup in map, move node to front, return value
 * - put(key, value):
 *   - If exists: update value, move to front
 *   - If new: create node, add to front, add to map
 *   - If over capacity: remove tail node from DLL and map
 *
 * Visual:
 *   head <-> [MRU] <-> ... <-> [LRU] <-> tail
 *              ^                  ^
 *              |                  |
 *           move here          evict this
 */
class LRUCache {
  private capacity: number;
  private cache: Map<number, DLLNode>;
  private head: DLLNode; // Dummy head (most recent side)
  private tail: DLLNode; // Dummy tail (least recent side)

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();

    // Initialize dummy head and tail
    this.head = new DLLNode(0, 0);
    this.tail = new DLLNode(0, 0);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  /**
   * Get value by key. Move to front (mark as recently used).
   */
  get(key: number): number {
    if (!this.cache.has(key)) {
      return -1;
    }

    const node = this.cache.get(key)!;
    this.moveToFront(node);
    return node.val;
  }

  /**
   * Put key-value pair. Update if exists, insert if new.
   * Evict LRU if over capacity.
   */
  put(key: number, value: number): void {
    if (this.cache.has(key)) {
      // Update existing
      const node = this.cache.get(key)!;
      node.val = value;
      this.moveToFront(node);
    } else {
      // Insert new
      const newNode = new DLLNode(key, value);

      // Evict if at capacity
      if (this.cache.size >= this.capacity) {
        this.evictLRU();
      }

      // Add to front and map
      this.addToFront(newNode);
      this.cache.set(key, newNode);
    }
  }

  /**
   * Remove node from current position and add to front
   */
  private moveToFront(node: DLLNode): void {
    this.removeNode(node);
    this.addToFront(node);
  }

  /**
   * Remove node from DLL (doesn't remove from map)
   */
  private removeNode(node: DLLNode): void {
    const prev = node.prev!;
    const next = node.next!;
    prev.next = next;
    next.prev = prev;
  }

  /**
   * Add node right after dummy head (most recent position)
   */
  private addToFront(node: DLLNode): void {
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next!.prev = node;
    this.head.next = node;
  }

  /**
   * Remove least recently used node (right before dummy tail)
   */
  private evictLRU(): void {
    const lru = this.tail.prev!;
    this.removeNode(lru);
    this.cache.delete(lru.key);
  }
}

// ============ Test Cases ============
console.log("==========================================");
console.log("LRU Cache");
console.log("==========================================");

// Test case from problem description
const lruCache = new LRUCache(2);

lruCache.put(1, 1); // cache is {1=1}
console.log("put(1,1)");

lruCache.put(2, 2); // cache is {1=1, 2=2}
console.log("put(2,2)");

console.log("get(1):", lruCache.get(1)); // return 1

lruCache.put(3, 3); // LRU key was 2, evicts key 2, cache is {1=1, 3=3}
console.log("put(3,3) - evicts 2");

console.log("get(2):", lruCache.get(2)); // returns -1 (not found)

lruCache.put(4, 4); // LRU key was 1, evicts key 1, cache is {4=4, 3=3}
console.log("put(4,4) - evicts 1");

console.log("get(1):", lruCache.get(1)); // return -1 (not found)
console.log("get(3):", lruCache.get(3)); // return 3
console.log("get(4):", lruCache.get(4)); // return 4

// Additional test case: capacity 1
console.log("\n--- Capacity 1 ---");
const cache1 = new LRUCache(1);
cache1.put(1, 1);
console.log("get(1):", cache1.get(1)); // 1
cache1.put(2, 2); // evicts 1
console.log("get(1):", cache1.get(1)); // -1
console.log("get(2):", cache1.get(2)); // 2

// Additional test case: update existing key
console.log("\n--- Update Existing ---");
const cache2 = new LRUCache(2);
cache2.put(1, 1);
cache2.put(2, 2);
cache2.put(1, 10); // update key 1
console.log("get(1):", cache2.get(1)); // 10
cache2.put(3, 3); // should evict 2 (not 1, since 1 was just accessed)
console.log("get(2):", cache2.get(2)); // -1
console.log("get(3):", cache2.get(3)); // 3

export {}
