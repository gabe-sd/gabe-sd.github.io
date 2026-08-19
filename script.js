const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const cells = Array.from(document.querySelectorAll(".cell"));
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restart");

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

function handleClick(e) {
  const index = Number(e.currentTarget.dataset.index);
  if (gameOver || board[index]) return;

  board[index] = currentPlayer;
  e.currentTarget.textContent = currentPlayer;
  e.currentTarget.disabled = true;

  const result = checkWinner();
  if (result) {
    gameOver = true;
    statusEl.textContent = `${result.player} wins!`;
    result.line.forEach((i) => cells[i].classList.add("win"));
    cells.forEach((cell) => (cell.disabled = true));
    return;
  }

  if (board.every((cell) => cell)) {
    gameOver = true;
    statusEl.textContent = "It's a draw!";
    return;
  }

  currentPlayer = currentPlayer === "X" ? "O" : "X";
  statusEl.textContent = `${currentPlayer}'s turn`;
}

function restart() {
  board = Array(9).fill(null);
  currentPlayer = "X";
  gameOver = false;
  statusEl.textContent = "X's turn";
  cells.forEach((cell) => {
    cell.textContent = "";
    cell.disabled = false;
    cell.classList.remove("win");
  });
}

cells.forEach((cell) => cell.addEventListener("click", handleClick));
restartBtn.addEventListener("click", restart);
