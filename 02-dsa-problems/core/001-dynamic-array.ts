/**
 * Dynamic Array (Resizable Array)
 *
 * Design a Dynamic Array class that supports:
 * - get(i): return element at index i
 * - set(i, n): set element at index i to n
 * - pushback(n): add element to end
 * - popback(): remove and return last element
 * - resize(): double the capacity
 * - getSize(): return number of elements
 * - getCapacity(): return capacity
 */

class DynamicArray {
  private data: number[];
  private size: number;
  private capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.size = 0;
    this.data = new Array(capacity);
  }

  get(i: number): number {
    return this.data[i];
  }

  set(i: number, n: number): void {
    this.data[i] = n;
  }

  pushback(n: number): void {
    if (this.size === this.capacity) {
      this.resize();
    }
    this.data[this.size] = n;
    this.size++;
  }

  popback(): number {
    this.size--;
    return this.data[this.size];
  }

  resize(): void {
    this.capacity *= 2;
    const newData = new Array(this.capacity);
    for (let i = 0; i < this.size; i++) {
      newData[i] = this.data[i];
    }
    this.data = newData;
  }

  getSize(): number {
    return this.size;
  }

  getCapacity(): number {
    return this.capacity;
  }
}

// Test cases
console.log("Dynamic Array Problem");
console.log("=====================\n");

// Example 1: ["Array", 1, "getSize", "getCapacity"] -> [null, 0, 1]
console.log("Example 1:");
let arr1 = new DynamicArray(1);
console.log("getSize:", arr1.getSize());       // 0
console.log("getCapacity:", arr1.getCapacity()); // 1

// Example 2: ["Array", 1, "pushback", 1, "getCapacity", "pushback", 2, "getCapacity"]
// -> [null, null, 1, null, 2]
console.log("\nExample 2:");
let arr2 = new DynamicArray(1);
arr2.pushback(1);
console.log("getCapacity:", arr2.getCapacity()); // 1
arr2.pushback(2);
console.log("getCapacity:", arr2.getCapacity()); // 2

// Example 3: Full test
console.log("\nExample 3:");
let arr3 = new DynamicArray(1);
console.log("getSize:", arr3.getSize());         // 0
console.log("getCapacity:", arr3.getCapacity()); // 1
arr3.pushback(1);
console.log("getSize:", arr3.getSize());         // 1
console.log("getCapacity:", arr3.getCapacity()); // 1
arr3.pushback(2);
console.log("getSize:", arr3.getSize());         // 2
console.log("getCapacity:", arr3.getCapacity()); // 2
console.log("get(1):", arr3.get(1));             // 2
arr3.set(1, 3);
console.log("get(1):", arr3.get(1));             // 3
console.log("popback:", arr3.popback());         // 3
console.log("getSize:", arr3.getSize());         // 1
console.log("getCapacity:", arr3.getCapacity()); // 2

export {}
