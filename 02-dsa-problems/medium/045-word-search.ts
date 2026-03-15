/**
 * Word Search (LeetCode #79)
 * Difficulty: Medium
 *
 * Given an m x n grid of characters board and a string word, return true
 * if word exists in the grid.
 *
 * The word can be constructed from letters of sequentially adjacent cells,
 * where adjacent cells are horizontally or vertically neighboring. The same
 * letter cell may not be used more than once.
 *
 * Example 1:
 * Input: board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED"
 * Output: true
 *
 * Example 2:
 * Input: board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "SEE"
 * Output: true
 *
 * Example 3:
 * Input: board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCB"
 * Output: false
 *
 * Constraints:
 * - m == board.length
 * - n = board[i].length
 * - 1 <= m, n <= 6
 * - 1 <= word.length <= 15
 * - board and word consists of only lowercase and uppercase English letters
 */

/**
 * Algorithm: Grid DFS/Backtracking
 *
 * Time Complexity: O(m * n * 4^L) where L = word length
 *                  Start from each cell, explore 4 directions at each step
 * Space Complexity: O(L) - Recursion depth equals word length
 *
 * Key Insight:
 * - Start DFS from each cell that matches first character
 * - At each step, try all 4 directions
 * - Mark cells as visited to prevent reuse
 * - Backtrack: unmark when returning
 *
 * Optimization:
 * - Instead of using a separate visited array, temporarily modify the board
 * - Replace visited cell with a special character, restore after backtracking
 *
 * Example trace for board, word = "ABCCED":
 *
 * A B C E
 * S F C S
 * A D E E
 *
 * Start at (0,0) 'A' -> matches word[0]
 *   Try (0,1) 'B' -> matches word[1]
 *     Try (0,2) 'C' -> matches word[2]
 *       Try (1,2) 'C' -> matches word[3]
 *         Try (2,2) 'E' -> matches word[4]
 *           Try (2,1) 'D' -> matches word[5] -> FOUND!
 */

function exist(board: string[][], word: string): boolean {
  const rows = board.length;
  const cols = board[0].length;

  // Directions: up, down, left, right
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  function backtrack(row: number, col: number, index: number): boolean {
    // Found complete word
    if (index === word.length) {
      return true;
    }

    // Out of bounds or already visited or character doesn't match
    if (
      row < 0 ||
      row >= rows ||
      col < 0 ||
      col >= cols ||
      board[row][col] !== word[index]
    ) {
      return false;
    }

    // Mark as visited by temporarily changing the character
    const temp = board[row][col];
    board[row][col] = "#";

    // Explore all 4 directions
    for (const [dr, dc] of directions) {
      if (backtrack(row + dr, col + dc, index + 1)) {
        // Restore before returning (important for early return)
        board[row][col] = temp;
        return true;
      }
    }

    // Backtrack: restore the character
    board[row][col] = temp;
    return false;
  }

  // Try starting from each cell
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (backtrack(i, j, 0)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Alternative: Using separate visited array (cleaner but uses more space)
 */
function existWithVisited(board: string[][], word: string): boolean {
  const rows = board.length;
  const cols = board[0].length;
  const visited: boolean[][] = Array.from({ length: rows }, () =>
    new Array(cols).fill(false)
  );

  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  function backtrack(row: number, col: number, index: number): boolean {
    if (index === word.length) {
      return true;
    }

    if (
      row < 0 ||
      row >= rows ||
      col < 0 ||
      col >= cols ||
      visited[row][col] ||
      board[row][col] !== word[index]
    ) {
      return false;
    }

    visited[row][col] = true;

    for (const [dr, dc] of directions) {
      if (backtrack(row + dr, col + dc, index + 1)) {
        return true;
      }
    }

    visited[row][col] = false;
    return false;
  }

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (backtrack(i, j, 0)) {
        return true;
      }
    }
  }

  return false;
}

// Test cases
const board1 = [
  ["A", "B", "C", "E"],
  ["S", "F", "C", "S"],
  ["A", "D", "E", "E"],
];

console.log(exist(structuredClone(board1), "ABCCED"));
// Expected: true

console.log(exist(structuredClone(board1), "SEE"));
// Expected: true

console.log(exist(structuredClone(board1), "ABCB"));
// Expected: false

console.log(exist([["A"]], "A"));
// Expected: true

console.log(exist([["A", "B"], ["C", "D"]], "ABDC"));
// Expected: true

console.log("\nUsing visited array:");
console.log(existWithVisited(structuredClone(board1), "ABCCED"));
// Expected: true

export {};
