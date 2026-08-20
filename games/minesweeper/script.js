const SIZE = 9;
const MINE_COUNT = 10;

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const mineCountEl = document.getElementById("mine-count");
const timerEl = document.getElementById("timer");
const restartBtn = document.getElementById("restart");

let grid = [];
let cellEls = [];
let firstClick = true;
let gameOver = false;
let flagCount = 0;
let revealedCount = 0;
let timerId = null;
let seconds = 0;
let chordDown = null;

function emptyGrid() {
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
    }))
  );
}

function neighbors(r, c) {
  const result = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) result.push([nr, nc]);
    }
  }
  return result;
}

function placeMines(excludeR, excludeC) {
  let placed = 0;
  while (placed < MINE_COUNT) {
    const r = Math.floor(Math.random() * SIZE);
    const c = Math.floor(Math.random() * SIZE);
    if (grid[r][c].mine) continue;
    if (Math.abs(r - excludeR) <= 1 && Math.abs(c - excludeC) <= 1) continue;
    grid[r][c].mine = true;
    placed += 1;
  }
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c].mine) continue;
      grid[r][c].adjacent = neighbors(r, c).filter(([nr, nc]) => grid[nr][nc].mine).length;
    }
  }
}

function buildBoard() {
  boardEl.innerHTML = "";
  cellEls = [];
  for (let r = 0; r < SIZE; r++) {
    const row = [];
    for (let c = 0; c < SIZE; c++) {
      const btn = document.createElement("button");
      btn.className = "cell";
      btn.setAttribute("aria-label", `Cell ${r + 1}, ${c + 1}`);
      btn.addEventListener("click", () => handleReveal(r, c));
      btn.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        handleFlag(r, c);
      });
      btn.addEventListener("mousedown", (e) => {
        if (e.button === 1) {
          e.preventDefault();
          chordDown = { r, c };
          setChordPreview(r, c, true);
        }
      });
      btn.addEventListener("mouseup", (e) => {
        if (e.button === 1 && chordDown && chordDown.r === r && chordDown.c === c) {
          setChordPreview(r, c, false);
          handleChord(r, c);
        }
        chordDown = null;
      });
      btn.addEventListener("mouseleave", () => {
        if (chordDown && chordDown.r === r && chordDown.c === c) {
          setChordPreview(r, c, false);
          chordDown = null;
        }
      });
      // Some browsers don't fire the semantic "click"/"auxclick" pair reliably
      // for the middle button, so the mousedown/mouseup pair above is authoritative;
      // this just guards against the OS-level middle-click context menu on some setups.
      btn.addEventListener("auxclick", (e) => {
        if (e.button === 1) e.preventDefault();
      });
      boardEl.appendChild(btn);
      row.push(btn);
    }
    cellEls.push(row);
  }
}

function startTimer() {
  stopTimer();
  seconds = 0;
  timerEl.textContent = `⏱ ${seconds}`;
  timerId = setInterval(() => {
    seconds += 1;
    timerEl.textContent = `⏱ ${seconds}`;
  }, 1000);
}

function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}

function handleReveal(r, c) {
  if (gameOver) return;
  const cell = grid[r][c];
  if (cell.revealed || cell.flagged) return;

  if (firstClick) {
    placeMines(r, c);
    firstClick = false;
    startTimer();
  }

  if (cell.mine) {
    revealAllMines();
    gameOver = true;
    stopTimer();
    statusEl.textContent = "Boom! You hit a mine.";
    return;
  }

  floodReveal(r, c);
  checkWin();
}

function floodReveal(r, c) {
  const cell = grid[r][c];
  if (cell.revealed || cell.flagged) return;
  cell.revealed = true;
  revealedCount += 1;
  renderCell(r, c);
  if (cell.adjacent === 0) {
    for (const [nr, nc] of neighbors(r, c)) floodReveal(nr, nc);
  }
}

function setChordPreview(r, c, on) {
  const cell = grid[r][c];
  if (!cell.revealed || cell.adjacent === 0) return;
  for (const [nr, nc] of neighbors(r, c)) {
    const n = grid[nr][nc];
    if (n.revealed || n.flagged) continue;
    cellEls[nr][nc].classList.toggle("chord-preview", on);
  }
}

function handleChord(r, c) {
  if (gameOver) return;
  const cell = grid[r][c];
  if (!cell.revealed || cell.adjacent === 0) return;

  const around = neighbors(r, c);
  const flaggedCount = around.filter(([nr, nc]) => grid[nr][nc].flagged).length;
  if (flaggedCount !== cell.adjacent) return;

  let hitMine = false;
  for (const [nr, nc] of around) {
    const n = grid[nr][nc];
    if (n.flagged || n.revealed) continue;
    if (n.mine) {
      hitMine = true;
    } else {
      floodReveal(nr, nc);
    }
  }

  if (hitMine) {
    revealAllMines();
    gameOver = true;
    stopTimer();
    statusEl.textContent = "Boom! A flag was wrong.";
    return;
  }

  checkWin();
}

function handleFlag(r, c) {
  if (gameOver) return;
  const cell = grid[r][c];
  if (cell.revealed) return;
  cell.flagged = !cell.flagged;
  flagCount += cell.flagged ? 1 : -1;
  mineCountEl.textContent = `💣 ${MINE_COUNT - flagCount}`;
  renderCell(r, c);
}

function renderCell(r, c) {
  const cell = grid[r][c];
  const el = cellEls[r][c];
  el.classList.toggle("revealed", cell.revealed);
  el.classList.toggle("flagged", cell.flagged && !cell.revealed);
  el.classList.toggle("mine", cell.revealed && cell.mine);
  el.className = el.className.replace(/\bn[1-8]\b/g, "").trim();

  if (cell.revealed && cell.mine) {
    el.textContent = "💣";
  } else if (cell.revealed && cell.adjacent > 0) {
    el.textContent = cell.adjacent;
    el.classList.add(`n${cell.adjacent}`);
  } else if (cell.revealed) {
    el.textContent = "";
  } else if (cell.flagged) {
    el.textContent = "🚩";
  } else {
    el.textContent = "";
  }
}

function revealAllMines() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c].mine) grid[r][c].revealed = true;
      renderCell(r, c);
    }
  }
}

function checkWin() {
  if (revealedCount === SIZE * SIZE - MINE_COUNT) {
    gameOver = true;
    stopTimer();
    statusEl.textContent = "You cleared the board! 🎉";
  }
}

function restart() {
  grid = emptyGrid();
  firstClick = true;
  gameOver = false;
  flagCount = 0;
  revealedCount = 0;
  stopTimer();
  seconds = 0;
  timerEl.textContent = `⏱ ${seconds}`;
  mineCountEl.textContent = `💣 ${MINE_COUNT}`;
  statusEl.textContent = "Left click: reveal · Right click: flag · Middle click: chord";
  buildBoard();
}

restartBtn.addEventListener("click", restart);
restart();
