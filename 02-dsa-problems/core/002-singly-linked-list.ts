/**
 * Design Singly Linked List
 * Difficulty: Easy
 *
 * Implement a singly linked list with the following operations:
 * - get(index): Get the value at index
 * - insertHead(val): Insert at head
 * - insertTail(val): Insert at tail
 * - remove(index): Remove node at index
 */

class ListNode {
  val: number;
  next: ListNode | null;

  constructor(val: number) {
    this.val = val;
    this.next = null;
  }
}

class LinkedList {
  private head: ListNode | null;
  private tail: ListNode | null;
  private size: number;

  constructor() {
    this.head = null;
    this.tail = null;
    this.size = 0;
  }

  get(index: number): number {
    if (index < 0 || index >= this.size) return -1;

    let curr = this.head;
    for (let i = 0; i < index; i++) {
      curr = curr!.next;
    }
    return curr!.val;
  }

  insertHead(val: number): void {
    const newNode = new ListNode(val);
    newNode.next = this.head;
    this.head = newNode;

    if (this.size === 0) {
      this.tail = newNode;
    }
    this.size++;
  }

  insertTail(val: number): void {
    const newNode = new ListNode(val);

    if (this.size === 0) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      this.tail!.next = newNode;
      this.tail = newNode;
    }
    this.size++;
  }

  remove(index: number): boolean {
    if (index < 0 || index >= this.size) return false;

    if (index === 0) {
      this.head = this.head!.next;
      if (this.size === 1) {
        this.tail = null;
      }
    } else {
      let prev = this.head;
      for (let i = 0; i < index - 1; i++) {
        prev = prev!.next;
      }
      prev!.next = prev!.next!.next;

      if (index === this.size - 1) {
        this.tail = prev;
      }
    }
    this.size--;
    return true;
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
console.log("Singly Linked List");
console.log("==================\n");

const list = new LinkedList();
list.insertHead(1);
console.log("insertHead(1):", list.getValues()); // [1]

list.insertTail(2);
console.log("insertTail(2):", list.getValues()); // [1, 2]

list.insertHead(0);
console.log("insertHead(0):", list.getValues()); // [0, 1, 2]

console.log("get(1):", list.get(1)); // 1

list.remove(1);
console.log("remove(1):", list.getValues()); // [0, 2]

console.log("get(1):", list.get(1)); // 2

export {};