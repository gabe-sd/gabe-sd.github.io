const SIZE = 9;
const MINE_COUNT = 10;

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const mineCountEl = document.getElementById("mine-count");
const timerEl = document.getElementById("timer");
const restartBtn = document.getElementById("restart");
const helpToggle = document.getElementById("help-toggle");
const instructionsEl = document.getElementById("instructions");
const bestTimeEl = document.getElementById("best-time");

// Best time is per board configuration, so adding a difficulty later cannot
// silently compare records from different board sizes.
const BEST_TIME_KEY = `minesweeper.bestTime.${SIZE}x${SIZE}-${MINE_COUNT}`;

let grid = [];
let cellEls = [];
let firstClick = true;
let gameOver = false;
let flagCount = 0;
let revealedCount = 0;
let timerId = null;
let seconds = 0;
let statusTimer = null;

// The status line reports game state only; the controls live in the instructions
// panel. Before the first reveal it prompts, after that it stays empty until
// something happens (the line keeps its height, so the board does not shift).
function defaultStatus() {
  return firstClick ? "Click any cell to start" : "";
}

// localStorage is not always available — it throws in private windows, with
// site data blocked, and from file:// in some browsers. A high score is a nice
// extra, so every access degrades to "no record" rather than breaking the game.
function loadBestTime() {
  try {
    const raw = localStorage.getItem(BEST_TIME_KEY);
    const value = Number(raw);
    return raw !== null && Number.isFinite(value) && value >= 0 ? value : null;
  } catch {
    return null;
  }
}

function saveBestTime(value) {
  try {
    localStorage.setItem(BEST_TIME_KEY, String(value));
    return true;
  } catch {
    return false;
  }
}

function renderBestTime() {
  const best = loadBestTime();
  bestTimeEl.textContent = `🏆 ${best === null ? "—" : best + "s"}`;
}

// Returns the message for the win, recording a new record when there is one.
function recordWin() {
  const best = loadBestTime();
  if (best !== null && best <= seconds) {
    return `Cleared in ${seconds}s 🎉 (best ${best}s)`;
  }
  const saved = saveBestTime(seconds);
  renderBestTime();
  return saved
    ? `Cleared in ${seconds}s — new best time! 🎉`
    : `Cleared in ${seconds}s 🎉`;
}

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
      // Chord on middle-button press rather than release. The middle button is the
      // scroll wheel, so pressing it nudges the mouse more often than not; waiting
      // for the release meant any nudge across a cell edge silently cancelled the
      // chord. preventDefault also suppresses middle-click autoscroll/paste, which
      // can otherwise swallow the release entirely.
      btn.addEventListener("mousedown", (e) => {
        if (e.button !== 1) return;
        e.preventDefault();
        handleChord(r, c);
      });
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
    // drop the "click any cell to start" prompt now that play has begun
    statusEl.textContent = defaultStatus();
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

function flashStatus(msg) {
  statusEl.textContent = msg;
  if (statusTimer) clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    if (!gameOver) statusEl.textContent = defaultStatus();
  }, 2500);
}

function handleChord(r, c) {
  if (gameOver) return;
  const cell = grid[r][c];
  if (!cell.revealed || cell.adjacent === 0) return;

  const around = neighbors(r, c);
  const flaggedCount = around.filter(([nr, nc]) => grid[nr][nc].flagged).length;
  if (flaggedCount !== cell.adjacent) {
    flashStatus(
      `Chord needs ${cell.adjacent} flag${cell.adjacent === 1 ? "" : "s"} ` +
      `around this ${cell.adjacent} — there ${flaggedCount === 1 ? "is" : "are"} ${flaggedCount}.`
    );
    return;
  }

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
    statusEl.textContent = recordWin();
  }
}

function restart() {
  grid = emptyGrid();
  firstClick = true;
  gameOver = false;
  flagCount = 0;
  revealedCount = 0;
  stopTimer();
  if (statusTimer) clearTimeout(statusTimer);
  seconds = 0;
  timerEl.textContent = `⏱ ${seconds}`;
  mineCountEl.textContent = `💣 ${MINE_COUNT}`;
  statusEl.textContent = defaultStatus();
  renderBestTime();
  buildBoard();
}

function toggleInstructions() {
  const open = instructionsEl.hasAttribute("hidden");
  instructionsEl.toggleAttribute("hidden", !open);
  helpToggle.setAttribute("aria-expanded", String(open));
  helpToggle.textContent = open ? "Hide instructions" : "How to play";
}

restartBtn.addEventListener("click", restart);
helpToggle.addEventListener("click", toggleInstructions);
restart();
