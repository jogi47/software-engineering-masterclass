/**
 * N-Queens (LeetCode #51)
 * Difficulty: Hard
 *
 * The n-queens puzzle is the problem of placing n queens on an n x n chessboard
 * such that no two queens attack each other.
 *
 * Given an integer n, return all distinct solutions to the n-queens puzzle.
 * You may return the answer in any order.
 *
 * Each solution contains a distinct board configuration of the n-queens'
 * placement, where 'Q' and '.' both indicate a queen and an empty space,
 * respectively.
 *
 * Example 1:
 * Input: n = 4
 * Output: [[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]
 *
 * Example 2:
 * Input: n = 1
 * Output: [["Q"]]
 *
 * Constraints:
 * - 1 <= n <= 9
 */

/**
 * Algorithm: Constraint Satisfaction Backtracking
 *
 * Time Complexity: O(n!) - Each row has fewer valid positions as we go
 * Space Complexity: O(n) - Recursion depth + constraint tracking sets
 *
 * Key Insights:
 * 1. Each row must have exactly one queen -> iterate row by row
 * 2. Each column can have at most one queen -> track used columns
 * 3. Each diagonal can have at most one queen -> track diagonals
 *
 * Diagonal Insight:
 * - Main diagonal (↘): cells on same diagonal have same (row - col)
 * - Anti-diagonal (↙): cells on same diagonal have same (row + col)
 *
 * For a 4x4 board:
 *   col:    0   1   2   3
 * row 0:  0-0 0-1 0-2 0-3  (row-col): 0, -1, -2, -3
 * row 1:  1-0 1-1 1-2 1-3  (row-col): 1,  0, -1, -2
 * row 2:  2-0 2-1 2-2 2-3  (row-col): 2,  1,  0, -1
 * row 3:  3-0 3-1 3-2 3-3  (row-col): 3,  2,  1,  0
 *
 * Example trace for n = 4:
 *
 * Row 0: Try col 0 (Q...)
 *   Row 1: col 0 blocked, col 1 blocked (diag), try col 2 (..Q.)
 *     Row 2: col 0 ok, try (.Q..)... no valid col for row 3
 *     Backtrack, try col 3 (...Q)
 *       Row 2: try col 0 -> Row 3: try col 2 -> VALID!
 *   ...
 *
 * Solutions for n=4:
 * .Q..    ..Q.
 * ...Q    Q...
 * Q...    ...Q
 * ..Q.    .Q..
 */

function solveNQueens(n: number): string[][] {
  const result: string[][] = [];

  // Track which columns and diagonals have queens
  const cols = new Set<number>();
  const mainDiag = new Set<number>(); // row - col
  const antiDiag = new Set<number>(); // row + col

  // board[row] = column where queen is placed in that row
  const queens: number[] = [];

  function backtrack(row: number): void {
    // Found a valid placement for all queens
    if (row === n) {
      // Convert queen positions to board representation
      const board = queens.map((col) => {
        return ".".repeat(col) + "Q" + ".".repeat(n - col - 1);
      });
      result.push(board);
      return;
    }

    // Try placing queen in each column of current row
    for (let col = 0; col < n; col++) {
      const diag = row - col;
      const aDiag = row + col;

      // Check if this position is safe
      if (cols.has(col) || mainDiag.has(diag) || antiDiag.has(aDiag)) {
        continue;
      }

      // Place queen
      queens.push(col);
      cols.add(col);
      mainDiag.add(diag);
      antiDiag.add(aDiag);

      // Recurse to next row
      backtrack(row + 1);

      // Backtrack: remove queen
      queens.pop();
      cols.delete(col);
      mainDiag.delete(diag);
      antiDiag.delete(aDiag);
    }
  }

  backtrack(0);
  return result;
}

/**
 * Alternative: Using arrays instead of sets (slightly faster for small n)
 */
function solveNQueensArray(n: number): string[][] {
  const result: string[][] = [];

  const cols: boolean[] = new Array(n).fill(false);
  const mainDiag: boolean[] = new Array(2 * n - 1).fill(false);
  const antiDiag: boolean[] = new Array(2 * n - 1).fill(false);
  const queens: number[] = [];

  function backtrack(row: number): void {
    if (row === n) {
      const board = queens.map((col) => {
        return ".".repeat(col) + "Q" + ".".repeat(n - col - 1);
      });
      result.push(board);
      return;
    }

    for (let col = 0; col < n; col++) {
      // Offset main diagonal index to make it non-negative
      const diagIdx = row - col + (n - 1);
      const aDiagIdx = row + col;

      if (cols[col] || mainDiag[diagIdx] || antiDiag[aDiagIdx]) {
        continue;
      }

      queens.push(col);
      cols[col] = true;
      mainDiag[diagIdx] = true;
      antiDiag[aDiagIdx] = true;

      backtrack(row + 1);

      queens.pop();
      cols[col] = false;
      mainDiag[diagIdx] = false;
      antiDiag[aDiagIdx] = false;
    }
  }

  backtrack(0);
  return result;
}

// Helper to print board nicely
function printBoards(boards: string[][]): void {
  boards.forEach((board, i) => {
    console.log(`Solution ${i + 1}:`);
    board.forEach((row) => console.log(row));
    console.log();
  });
}

// Test cases
console.log("N = 4:");
const solutions4 = solveNQueens(4);
console.log(`Found ${solutions4.length} solutions`);
printBoards(solutions4);
// Expected: 2 solutions

console.log("N = 1:");
console.log(JSON.stringify(solveNQueens(1)));
// Expected: [["Q"]]

console.log("\nN = 8:");
const solutions8 = solveNQueens(8);
console.log(`Found ${solutions8.length} solutions`);
// Expected: 92 solutions

console.log("\nUsing array approach for N = 4:");
const solutions4Array = solveNQueensArray(4);
console.log(`Found ${solutions4Array.length} solutions`);

export {};
