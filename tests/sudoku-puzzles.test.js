// Validates the puzzle data in games/sudoku/script.js: each solution must be
// a legal complete grid, each givens grid must agree with its solution, each
// puzzle must have exactly one solution, and each must clear the
// board-content bar in "What makes a puzzle good" (games/sudoku/DESIGN.md) —
// added after a playtester caught puzzles that were legal and unique but
// still a shifted 1-9 formula grid, readable off one row with no deduction.
// This is the only place in the game a Sudoku solver exists. No browser
// needed.
const fs = require("fs");
const path = require("path");

const SCRIPT = path.join(__dirname, "..", "games", "sudoku", "script.js");
const results = [];

function check(name, cond, detail) {
  results.push(!!cond);
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}` + (detail !== undefined ? `  [${detail}]` : ""));
}

// The script is loaded as a plain <script src>, not a module (see CLAUDE.md,
// "Scripts are classic, not modules"), and it touches `document` at the top
// level, so the whole file cannot run under plain Node. Extract just the
// PUZZLES literal and evaluate that in isolation, rather than re-typing the
// data here, which would drift from the real puzzles.
const source = fs.readFileSync(SCRIPT, "utf8");
const match = source.match(/const PUZZLES = (\[[\s\S]*?\n\]);/);
if (!match) throw new Error("could not find `const PUZZLES = [...]` in script.js");
const PUZZLES = new Function(`return ${match[1]};`)();

function isPermutationOf1to9(cells) {
  const s = new Set(cells);
  return s.size === 9 && cells.every((v) => Number.isInteger(v) && v >= 1 && v <= 9);
}

function isValidSolution(grid) {
  for (let i = 0; i < 9; i++) {
    if (!isPermutationOf1to9(grid[i])) return false;
    if (!isPermutationOf1to9(grid.map((row) => row[i]))) return false;
  }
  for (let br = 0; br < 9; br += 3) {
    for (let bc = 0; bc < 9; bc += 3) {
      const box = [];
      for (let dr = 0; dr < 3; dr++)
        for (let dc = 0; dc < 3; dc++) box.push(grid[br + dr][bc + dc]);
      if (!isPermutationOf1to9(box)) return false;
    }
  }
  return true;
}

function givensMatchSolution(givens, solution) {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (givens[r][c] !== 0 && givens[r][c] !== solution[r][c]) return false;
  return true;
}

// A row that's a cyclic rotation of another lets a player read the whole grid
// off one row with no deduction — see "What makes a puzzle good" in
// DESIGN.md. Genuinely random grids hit this by chance at ~9/9! odds per
// pair, negligible across the 36 pairs in a 9x9 grid.
function isRotation(a, b) {
  for (let s = 0; s < 9; s++) {
    if (a.every((v, i) => b[(i + s) % 9] === v)) return true;
  }
  return false;
}

function hasCyclicShiftRows(solution) {
  for (let i = 0; i < 9; i++)
    for (let j = i + 1; j < 9; j++)
      if (isRotation(solution[i], solution[j])) return true;
  return false;
}

function everyRowAndColumnHasAGiven(givens) {
  for (let r = 0; r < 9; r++) if (givens[r].every((v) => v === 0)) return false;
  for (let c = 0; c < 9; c++) if (givens.every((row) => row[c] === 0)) return false;
  return true;
}

function everyBoxHasAGiven(givens) {
  for (let br = 0; br < 9; br += 3) {
    for (let bc = 0; bc < 9; bc += 3) {
      let has = false;
      for (let dr = 0; dr < 3 && !has; dr++)
        for (let dc = 0; dc < 3 && !has; dc++)
          if (givens[br + dr][bc + dc] !== 0) has = true;
      if (!has) return false;
    }
  }
  return true;
}

// Plain backtracking solver, capped so it stops as soon as a second solution
// is found — a uniqueness check never needs to enumerate every solution.
function countSolutions(givens, cap) {
  const g = givens.map((row) => row.slice());
  let count = 0;

  function used(r, c, v) {
    for (let i = 0; i < 9; i++) {
      if (g[r][i] === v) return true;
      if (g[i][c] === v) return true;
    }
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let dr = 0; dr < 3; dr++)
      for (let dc = 0; dc < 3; dc++)
        if (g[br + dr][bc + dc] === v) return true;
    return false;
  }

  function solve() {
    if (count >= cap) return;
    let sr = -1, sc = -1;
    for (let r = 0; r < 9 && sr === -1; r++)
      for (let c = 0; c < 9; c++)
        if (g[r][c] === 0) { sr = r; sc = c; break; }
    if (sr === -1) { count++; return; }
    for (let v = 1; v <= 9; v++) {
      if (!used(sr, sc, v)) {
        g[sr][sc] = v;
        solve();
        g[sr][sc] = 0;
        if (count >= cap) return;
      }
    }
  }
  solve();
  return count;
}

console.log("1. the puzzle set is non-empty");
check("at least one puzzle", Array.isArray(PUZZLES) && PUZZLES.length > 0, PUZZLES && PUZZLES.length);

console.log("2. every puzzle is well-formed and uniquely solvable");
PUZZLES.forEach((p, i) => {
  const shapeOk =
    Array.isArray(p.givens) && p.givens.length === 9 && p.givens.every((row) => row.length === 9) &&
    Array.isArray(p.solution) && p.solution.length === 9 && p.solution.every((row) => row.length === 9);
  check(`puzzle ${i}: 9x9 shape`, shapeOk);
  if (!shapeOk) return;

  check(`puzzle ${i}: solution is a legal complete grid`, isValidSolution(p.solution));
  check(`puzzle ${i}: givens agree with solution`, givensMatchSolution(p.givens, p.solution));

  const clueCount = p.givens.flat().filter((v) => v !== 0).length;
  check(`puzzle ${i}: has at least 17 givens`, clueCount >= 17, clueCount);

  const solutionCount = countSolutions(p.givens, 2);
  check(`puzzle ${i}: exactly one solution`, solutionCount === 1, solutionCount);
});

console.log("3. every puzzle clears the board-content bar in DESIGN.md's \"What makes a puzzle good\"");
PUZZLES.forEach((p, i) => {
  check(`puzzle ${i}: solution has no cyclic-shift row pair`, !hasCyclicShiftRows(p.solution));

  const clueCount = p.givens.flat().filter((v) => v !== 0).length;
  check(`puzzle ${i}: has at least 24 givens`, clueCount >= 24, clueCount);

  check(`puzzle ${i}: every row and column has a given`, everyRowAndColumnHasAGiven(p.givens));
  check(`puzzle ${i}: every box has a given`, everyBoxHasAGiven(p.givens));
});

console.log("4. puzzles are distinct from each other");
const signatures = PUZZLES.map((p) => JSON.stringify(p.givens));
check("no two puzzles share the same givens", new Set(signatures).size === signatures.length);

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
