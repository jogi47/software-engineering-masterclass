/**
 * Design Double-ended Queue (Deque)
 * Difficulty: Easy
 *
 * Implement a deque with the following operations:
 * - pushFront(val): Add to front
 * - pushBack(val): Add to back
 * - popFront(): Remove from front
 * - popBack(): Remove from back
 * - isEmpty(): Check if empty
 */

class DequeNode {
  val: number;
  prev: DequeNode | null;
  next: DequeNode | null;

  constructor(val: number) {
    this.val = val;
    this.prev = null;
    this.next = null;
  }
}

class Deque {
  private head: DequeNode | null;
  private tail: DequeNode | null;
  private size: number;

  constructor() {
    this.head = null;
    this.tail = null;
    this.size = 0;
  }

  isEmpty(): boolean {
    return this.size === 0;
  }

  pushFront(val: number): void {
    const newNode = new DequeNode(val);

    if (this.isEmpty()) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      newNode.next = this.head;
      this.head!.prev = newNode;
      this.head = newNode;
    }
    this.size++;
  }

  pushBack(val: number): void {
    const newNode = new DequeNode(val);

    if (this.isEmpty()) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      newNode.prev = this.tail;
      this.tail!.next = newNode;
      this.tail = newNode;
    }
    this.size++;
  }

  popFront(): number {
    if (this.isEmpty()) return -1;

    const val = this.head!.val;
    this.head = this.head!.next;

    if (this.head) {
      this.head.prev = null;
    } else {
      this.tail = null;
    }
    this.size--;
    return val;
  }

  popBack(): number {
    if (this.isEmpty()) return -1;

    const val = this.tail!.val;
    this.tail = this.tail!.prev;

    if (this.tail) {
      this.tail.next = null;
    } else {
      this.head = null;
    }
    this.size--;
    return val;
  }

  getValues(): number[] {
    const values: number[] = [];
    let curr = this.head;
    while (curr) {
      values.push(curr.val);
      curr = curr.next;
    }
    return values;
  }
}

// Test cases
console.log("Double-ended Queue (Deque)");
console.log("==========================\n");

const deque = new Deque();
console.log("isEmpty:", deque.isEmpty()); // true

deque.pushBack(1);
deque.pushBack(2);
deque.pushFront(0);
console.log("After pushBack(1), pushBack(2), pushFront(0):", deque.getValues()); // [0, 1, 2]

console.log("popFront:", deque.popFront()); // 0
console.log("popBack:", deque.popBack());   // 2
console.log("After pops:", deque.getValues()); // [1]

console.log("isEmpty:", deque.isEmpty()); // false
deque.popFront();
console.log("isEmpty:", deque.isEmpty()); // true

export {}
