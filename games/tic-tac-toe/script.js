// The marks are drawn rather than typed: VT323's own
// X and O are a typeface's letters where everything else on this board is a
// stroke on the hub's 48 grid. See DESIGN.md.
const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

// Coloured entirely through currentColor, so a mark needs no rule of its own
// and the same markup serves both players — as chess's pieces do.
const MARK_SVG = {
  X: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 13L35 35M35 13L13 35" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>',
  O: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="11.5" fill="none" stroke="currentColor" stroke-width="3.2"/></svg>',
};

const cells = Array.from(document.querySelectorAll(".cell"));
const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restart");

// A cell's own label, kept from the page so a mark can be appended to it. The
// drawing is hidden from the accessibility tree, so without this a square would
// go on reading as empty once it has been played.
const CELL_LABELS = cells.map((cell) => cell.getAttribute("aria-label"));

let board = Array(9).fill(null);
let currentPlayer = "X";
let gameOver = false;

function checkWinner() {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { player: board[a], line };
    }
  }
  return null;
}

function drawMark(cell, player) {
  cell.innerHTML = MARK_SVG[player];
  cell.dataset.mark = player;
  cell.setAttribute("aria-label", `${CELL_LABELS[Number(cell.dataset.index)]}, ${player}`);
}

function clearMark(cell) {
  cell.innerHTML = "";
  delete cell.dataset.mark;
  cell.setAttribute("aria-label", CELL_LABELS[Number(cell.dataset.index)]);
}

// Two attributes style.css reads: whose turn it is, which decides the ghost
// mark under the pointer, and how the game ended, which dims the squares that
// had no part in it.
function markTurn() {
  boardEl.dataset.turn = gameOver ? "" : currentPlayer;
}

function handleClick(e) {
  const index = Number(e.currentTarget.dataset.index);
  if (gameOver || board[index]) return;

  board[index] = currentPlayer;
  drawMark(e.currentTarget, currentPlayer);
  e.currentTarget.disabled = true;

  const result = checkWinner();
  if (result) {
    gameOver = true;
    boardEl.dataset.over = "win";
    statusEl.textContent = `${result.player} wins!`;
    result.line.forEach((i) => cells[i].classList.add("win"));
    cells.forEach((cell) => (cell.disabled = true));
    markTurn();
    return;
  }

  if (board.every((cell) => cell)) {
    gameOver = true;
    boardEl.dataset.over = "draw";
    statusEl.textContent = "It's a draw!";
    markTurn();
    return;
  }

  currentPlayer = currentPlayer === "X" ? "O" : "X";
  statusEl.textContent = `${currentPlayer}'s turn`;
  markTurn();
}

function restart() {
  board = Array(9).fill(null);
  currentPlayer = "X";
  gameOver = false;
  boardEl.dataset.over = "";
  statusEl.textContent = "X's turn";
  cells.forEach((cell) => {
    clearMark(cell);
    cell.disabled = false;
    cell.classList.remove("win");
  });
  markTurn();
}

cells.forEach((cell) => cell.addEventListener("click", handleClick));
restartBtn.addEventListener("click", restart);
markTurn();
