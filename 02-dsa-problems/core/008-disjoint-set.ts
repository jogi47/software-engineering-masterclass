/**
 * Design Disjoint Set (Union-Find)
 * Difficulty: Medium
 *
 * Implement a Union-Find data structure with:
 * - find(x): Find the root/representative of x
 * - union(x, y): Merge the sets containing x and y
 * - connected(x, y): Check if x and y are in the same set
 *
 * Optimizations:
 * - Path compression in find()
 * - Union by rank
 */

class DisjointSet {
  private parent: number[];
  private rank: number[];
  private count: number; // Number of disjoint sets

  constructor(n: number) {
    this.parent = [];
    this.rank = [];
    this.count = n;

    // Initialize: each element is its own parent
    for (let i = 0; i < n; i++) {
      this.parent[i] = i;
      this.rank[i] = 0;
    }
  }

  // Find with path compression
  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // Path compression
    }
    return this.parent[x];
  }

  // Union by rank
  union(x: number, y: number): boolean {
    const rootX = this.find(x);
    const rootY = this.find(y);

    if (rootX === rootY) return false; // Already in same set

    // Attach smaller tree under larger tree
    if (this.rank[rootX] < this.rank[rootY]) {
      this.parent[rootX] = rootY;
    } else if (this.rank[rootX] > this.rank[rootY]) {
      this.parent[rootY] = rootX;
    } else {
      this.parent[rootY] = rootX;
      this.rank[rootX]++;
    }

    this.count--;
    return true;
  }

  connected(x: number, y: number): boolean {
    return this.find(x) === this.find(y);
  }

  getCount(): number {
    return this.count;
  }
}

// Test cases
console.log("Disjoint Set (Union-Find)");
console.log("=========================\n");

const uf = new DisjointSet(10); // Elements 0-9

console.log("Initial sets: 10 individual elements");
console.log("Number of sets:", uf.getCount()); // 10

uf.union(0, 1);
uf.union(2, 3);
uf.union(4, 5);
console.log("\nAfter union(0,1), union(2,3), union(4,5):");
console.log("Number of sets:", uf.getCount()); // 7

console.log("connected(0, 1):", uf.connected(0, 1)); // true
console.log("connected(0, 2):", uf.connected(0, 2)); // false

uf.union(0, 2); // Merge {0,1} and {2,3}
console.log("\nAfter union(0,2):");
console.log("connected(0, 3):", uf.connected(0, 3)); // true
console.log("connected(1, 2):", uf.connected(1, 2)); // true
console.log("Number of sets:", uf.getCount()); // 6

// Union remaining elements
uf.union(6, 7);
uf.union(8, 9);
uf.union(5, 6);
uf.union(7, 8);
console.log("\nAfter more unions:");
console.log("connected(4, 9):", uf.connected(4, 9)); // true (4-5-6-7-8-9)
console.log("Number of sets:", uf.getCount()); // 2

export {}
