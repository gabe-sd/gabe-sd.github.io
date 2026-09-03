const SIZE = 9;
const BOX = 3;

// A small fixed set of hand-picked puzzles, each pre-verified (by
// tests/sudoku-puzzles.test.js) to have exactly one solution. See "Puzzle
// data" in DESIGN.md for why no solver runs here at all — `solution` is kept
// on each entry but never read by any check below.
const PUZZLES = [
  {
    givens: [
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 6, 7, 0, 9, 1, 2, 0],
      [0, 8, 9, 1, 0, 0, 0, 0, 0],
      [2, 3, 4, 0, 6, 0, 0, 0, 0],
      [5, 6, 0, 0, 0, 1, 0, 0, 0],
      [0, 0, 0, 2, 0, 0, 0, 0, 0],
      [3, 4, 0, 0, 0, 0, 9, 0, 0],
      [0, 0, 8, 0, 0, 0, 3, 4, 0],
      [0, 0, 0, 0, 0, 5, 0, 7, 0],
    ],
    solution: [
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
      [4, 5, 6, 7, 8, 9, 1, 2, 3],
      [7, 8, 9, 1, 2, 3, 4, 5, 6],
      [2, 3, 4, 5, 6, 7, 8, 9, 1],
      [5, 6, 7, 8, 9, 1, 2, 3, 4],
      [8, 9, 1, 2, 3, 4, 5, 6, 7],
      [3, 4, 5, 6, 7, 8, 9, 1, 2],
      [6, 7, 8, 9, 1, 2, 3, 4, 5],
      [9, 1, 2, 3, 4, 5, 6, 7, 8],
    ],
  },
  {
    givens: [
      [0, 0, 6, 0, 0, 9, 1, 0, 0],
      [0, 8, 0, 0, 0, 3, 0, 0, 0],
      [1, 0, 0, 4, 5, 0, 7, 0, 0],
      [0, 6, 7, 8, 0, 0, 2, 3, 0],
      [0, 0, 1, 2, 0, 4, 0, 0, 7],
      [0, 0, 0, 0, 0, 0, 0, 9, 0],
      [6, 7, 8, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 3, 0, 5, 0, 0, 8],
      [0, 0, 0, 0, 0, 0, 0, 1, 0],
    ],
    solution: [
      [4, 5, 6, 7, 8, 9, 1, 2, 3],
      [7, 8, 9, 1, 2, 3, 4, 5, 6],
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
      [5, 6, 7, 8, 9, 1, 2, 3, 4],
      [8, 9, 1, 2, 3, 4, 5, 6, 7],
      [2, 3, 4, 5, 6, 7, 8, 9, 1],
      [6, 7, 8, 9, 1, 2, 3, 4, 5],
      [9, 1, 2, 3, 4, 5, 6, 7, 8],
      [3, 4, 5, 6, 7, 8, 9, 1, 2],
    ],
  },
  {
    givens: [
      [7, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 4, 0, 0, 0, 8, 9],
      [0, 5, 0, 0, 0, 9, 0, 2, 3],
      [0, 9, 0, 0, 3, 0, 0, 0, 0],
      [2, 3, 0, 0, 0, 0, 0, 9, 1],
      [0, 0, 7, 8, 0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0, 0, 0, 0, 8],
      [3, 0, 5, 0, 0, 0, 0, 0, 0],
      [0, 0, 8, 9, 0, 0, 3, 4, 0],
    ],
    solution: [
      [7, 8, 9, 1, 2, 3, 4, 5, 6],
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
      [4, 5, 6, 7, 8, 9, 1, 2, 3],
      [8, 9, 1, 2, 3, 4, 5, 6, 7],
      [2, 3, 4, 5, 6, 7, 8, 9, 1],
      [5, 6, 7, 8, 9, 1, 2, 3, 4],
      [9, 1, 2, 3, 4, 5, 6, 7, 8],
      [3, 4, 5, 6, 7, 8, 9, 1, 2],
      [6, 7, 8, 9, 1, 2, 3, 4, 5],
    ],
  },
];

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restart");
const newPuzzleBtn = document.getElementById("new-puzzle");
const numberPad = document.getElementById("number-pad");

let puzzleIndex = 0;
let grid = [];
let givens = [];
let cellEls = [];
let selected = null;
let gameOver = false;

function currentPuzzle() {
  return PUZZLES[puzzleIndex];
}

// Every other cell sharing a row, column, or 3x3 box with (r, c) — the peers
// a digit at (r, c) must not duplicate.
function peers(r, c) {
  const result = [];
  for (let i = 0; i < SIZE; i++) {
    if (i !== c) result.push([r, i]);
    if (i !== r) result.push([i, c]);
  }
  const br = Math.floor(r / BOX) * BOX;
  const bc = Math.floor(c / BOX) * BOX;
  for (let dr = 0; dr < BOX; dr++) {
    for (let dc = 0; dc < BOX; dc++) {
      const nr = br + dr;
      const nc = bc + dc;
      if (nr !== r && nc !== c) result.push([nr, nc]);
    }
  }
  return result;
}

// Real Sudoku legality — a filled cell is wrong if it duplicates a peer's
// digit, not if it merely disagrees with the puzzle's stored solution (see
// DESIGN.md for why those two checks are not the same).
function conflicts(r, c) {
  const v = grid[r][c];
  if (v === 0) return false;
  return peers(r, c).some(([pr, pc]) => grid[pr][pc] === v);
}

function isGiven(r, c) {
  return givens[r][c] !== 0;
}

function buildBoard() {
  boardEl.innerHTML = "";
  cellEls = [];
  for (let r = 0; r < SIZE; r++) {
    const row = [];
    for (let c = 0; c < SIZE; c++) {
      const btn = document.createElement("button");
      btn.className = "cell";
      btn.setAttribute("aria-label", `Row ${r + 1}, column ${c + 1}`);
      btn.addEventListener("click", (e) => {
        selectCell(r, c);
        releaseFocus(e);
      });
      boardEl.appendChild(btn);
      row.push(btn);
    }
    cellEls.push(row);
  }
}

// A clicked button keeps the focus, and a focused button takes Space and
// Enter as its own activation - so after a pointer click on Restart or New
// puzzle, the next Space or Enter (which the player means as "type nothing" /
// game input) re-fires that button instead, silently discarding entered
// digits. Release on a *pointer* click only: a keyboard activation (detail 0)
// has to keep the focus, or tabbing through the controls would drop it on the
// first press. See CLAUDE.md's page contract and games/flappy-bird/script.js.
function releaseFocus(e) {
  if (e.detail > 0) e.currentTarget.blur();
}

function selectCell(r, c) {
  if (gameOver || isGiven(r, c)) return;
  selected = [r, c];
  renderSelection();
}

function renderSelection() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      cellEls[r][c].classList.toggle(
        "selected",
        !!selected && selected[0] === r && selected[1] === c
      );
    }
  }
}

function placeDigit(digit) {
  if (gameOver || !selected) return;
  const [r, c] = selected;
  if (isGiven(r, c)) return;
  grid[r][c] = digit;
  renderCell(r, c);
  checkWin();
}

function renderCell(r, c) {
  const el = cellEls[r][c];
  const v = grid[r][c];
  el.textContent = v === 0 ? "" : String(v);
  el.classList.toggle("given", isGiven(r, c));
  el.classList.toggle("wrong", !isGiven(r, c) && conflicts(r, c));
}

function renderBoard() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) renderCell(r, c);
  }
  renderSelection();
}

function checkWin() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0 || conflicts(r, c)) return;
    }
  }
  gameOver = true;
  selected = null;
  statusEl.textContent = "Solved! 🎉";
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) cellEls[r][c].classList.add("won");
  }
  renderSelection();
}

function loadPuzzle() {
  givens = currentPuzzle().givens.map((row) => row.slice());
  grid = givens.map((row) => row.slice());
  gameOver = false;
  selected = null;
  statusEl.textContent = "Select a cell, then type a digit";
  renderBoard();
}

function restart() {
  loadPuzzle();
}

function newPuzzle() {
  puzzleIndex = (puzzleIndex + 1) % PUZZLES.length;
  loadPuzzle();
}

function handleKeydown(e) {
  if (e.key >= "1" && e.key <= "9") {
    placeDigit(Number(e.key));
  } else if (e.key === "Backspace" || e.key === "Delete") {
    placeDigit(0);
  }
}

buildBoard();
restartBtn.addEventListener("click", restart);
restartBtn.addEventListener("click", releaseFocus);
newPuzzleBtn.addEventListener("click", newPuzzle);
newPuzzleBtn.addEventListener("click", releaseFocus);
numberPad.addEventListener("click", (e) => {
  const btn = e.target.closest(".num-btn");
  if (!btn) return;
  placeDigit(Number(btn.dataset.digit));
  // Delegated on the container, so currentTarget there is #number-pad, not
  // the button that was actually clicked - release the button by hand.
  if (e.detail > 0) btn.blur();
});
document.addEventListener("keydown", handleKeydown);
restart();
