/**
 * Design Hash Table
 * Difficulty: Medium
 *
 * Implement a hash table with the following operations:
 * - put(key, value): Insert or update a key-value pair
 * - get(key): Get value by key
 * - remove(key): Remove a key-value pair
 * - contains(key): Check if key exists
 */

class HashNode {
  key: number;
  val: number;
  next: HashNode | null;

  constructor(key: number, val: number) {
    this.key = key;
    this.val = val;
    this.next = null;
  }
}

class HashTable {
  private buckets: (HashNode | null)[];
  private size: number;
  private capacity: number;

  constructor(capacity: number = 16) {
    this.capacity = capacity;
    this.size = 0;
    this.buckets = new Array(capacity).fill(null);
  }

  private hash(key: number): number {
    return Math.abs(key) % this.capacity;
  }

  put(key: number, val: number): void {
    const index = this.hash(key);

    if (!this.buckets[index]) {
      this.buckets[index] = new HashNode(key, val);
      this.size++;
      return;
    }

    let curr = this.buckets[index];
    while (curr) {
      if (curr.key === key) {
        curr.val = val; // Update existing key
        return;
      }
      if (!curr.next) break;
      curr = curr.next;
    }

    curr!.next = new HashNode(key, val);
    this.size++;
  }

  get(key: number): number {
    const index = this.hash(key);
    let curr = this.buckets[index];

    while (curr) {
      if (curr.key === key) {
        return curr.val;
      }
      curr = curr.next;
    }
    return -1;
  }

  remove(key: number): boolean {
    const index = this.hash(key);
    let curr = this.buckets[index];

    if (!curr) return false;

    if (curr.key === key) {
      this.buckets[index] = curr.next;
      this.size--;
      return true;
    }

    while (curr.next) {
      if (curr.next.key === key) {
        curr.next = curr.next.next;
        this.size--;
        return true;
      }
      curr = curr.next;
    }
    return false;
  }

  contains(key: number): boolean {
    return this.get(key) !== -1;
  }

  getSize(): number {
    return this.size;
  }
}

// Test cases
console.log("Hash Table");
console.log("==========\n");

const ht = new HashTable();

ht.put(1, 100);
ht.put(2, 200);
ht.put(17, 170); // Same bucket as 1 (if capacity=16)

console.log("get(1):", ht.get(1));   // 100
console.log("get(2):", ht.get(2));   // 200
console.log("get(17):", ht.get(17)); // 170
console.log("get(3):", ht.get(3));   // -1

console.log("contains(1):", ht.contains(1));  // true
console.log("contains(99):", ht.contains(99)); // false

ht.put(1, 150); // Update
console.log("After put(1, 150), get(1):", ht.get(1)); // 150

console.log("remove(1):", ht.remove(1)); // true
console.log("get(1):", ht.get(1)); // -1
console.log("size:", ht.getSize()); // 2

export {}
