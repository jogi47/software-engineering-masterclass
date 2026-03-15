/**
 * Design Graph
 * Difficulty: Medium
 *
 * Implement an undirected graph with the following operations:
 * - addVertex(v): Add a vertex
 * - addEdge(v1, v2): Add an edge between v1 and v2
 * - removeEdge(v1, v2): Remove an edge
 * - removeVertex(v): Remove a vertex and all its edges
 * - hasEdge(v1, v2): Check if edge exists
 * - getNeighbors(v): Get all neighbors of a vertex
 * - bfs(start): Breadth-first traversal
 * - dfs(start): Depth-first traversal
 */

class Graph {
  private adjacencyList: Map<number, Set<number>>;

  constructor() {
    this.adjacencyList = new Map();
  }

  addVertex(v: number): void {
    if (!this.adjacencyList.has(v)) {
      this.adjacencyList.set(v, new Set());
    }
  }

  addEdge(v1: number, v2: number): void {
    this.addVertex(v1);
    this.addVertex(v2);
    this.adjacencyList.get(v1)!.add(v2);
    this.adjacencyList.get(v2)!.add(v1);
  }

  removeEdge(v1: number, v2: number): void {
    if (this.adjacencyList.has(v1)) {
      this.adjacencyList.get(v1)!.delete(v2);
    }
    if (this.adjacencyList.has(v2)) {
      this.adjacencyList.get(v2)!.delete(v1);
    }
  }

  removeVertex(v: number): void {
    if (!this.adjacencyList.has(v)) return;

    // Remove all edges to this vertex
    for (const neighbor of this.adjacencyList.get(v)!) {
      this.adjacencyList.get(neighbor)!.delete(v);
    }
    this.adjacencyList.delete(v);
  }

  hasEdge(v1: number, v2: number): boolean {
    return this.adjacencyList.has(v1) && this.adjacencyList.get(v1)!.has(v2);
  }

  getNeighbors(v: number): number[] {
    if (!this.adjacencyList.has(v)) return [];
    return Array.from(this.adjacencyList.get(v)!);
  }

  bfs(start: number): number[] {
    if (!this.adjacencyList.has(start)) return [];

    const result: number[] = [];
    const visited = new Set<number>();
    const queue: number[] = [start];
    visited.add(start);

    while (queue.length > 0) {
      const vertex = queue.shift()!;
      result.push(vertex);

      for (const neighbor of this.adjacencyList.get(vertex)!) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    return result;
  }

  dfs(start: number): number[] {
    if (!this.adjacencyList.has(start)) return [];

    const result: number[] = [];
    const visited = new Set<number>();

    const dfsHelper = (vertex: number) => {
      visited.add(vertex);
      result.push(vertex);

      for (const neighbor of this.adjacencyList.get(vertex)!) {
        if (!visited.has(neighbor)) {
          dfsHelper(neighbor);
        }
      }
    };

    dfsHelper(start);
    return result;
  }

  hasPath(v1: number, v2: number): boolean {
    if (!this.adjacencyList.has(v1) || !this.adjacencyList.has(v2)) {
      return false;
    }

    const visited = new Set<number>();
    const queue: number[] = [v1];
    visited.add(v1);

    while (queue.length > 0) {
      const vertex = queue.shift()!;
      if (vertex === v2) return true;

      for (const neighbor of this.adjacencyList.get(vertex)!) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    return false;
  }
}

// Test cases
console.log("Graph (Undirected)");
console.log("==================\n");

const graph = new Graph();
graph.addEdge(1, 2);
graph.addEdge(1, 3);
graph.addEdge(2, 4);
graph.addEdge(3, 4);
graph.addEdge(4, 5);

console.log("Graph: 1-2, 1-3, 2-4, 3-4, 4-5");
console.log("Neighbors of 1:", graph.getNeighbors(1)); // [2, 3]
console.log("Neighbors of 4:", graph.getNeighbors(4)); // [2, 3, 5]

console.log("\nhasEdge(1, 2):", graph.hasEdge(1, 2)); // true
console.log("hasEdge(1, 4):", graph.hasEdge(1, 4)); // false

console.log("\nBFS from 1:", graph.bfs(1)); // [1, 2, 3, 4, 5]
console.log("DFS from 1:", graph.dfs(1)); // [1, 2, 4, 3, 5] or similar

console.log("\nhasPath(1, 5):", graph.hasPath(1, 5)); // true
graph.removeEdge(4, 5);
console.log("After removeEdge(4, 5):");
console.log("hasPath(1, 5):", graph.hasPath(1, 5)); // false

export {}
