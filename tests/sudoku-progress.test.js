// Saved progress: surviving a reload, the two-step confirm on Restart / New
// puzzle that guards it, recovering from a corrupted or stale save, and the
// case where localStorage throws.
const { launch, url, makeChecks } = require("./helpers");

const PAGE = url("/games/sudoku/index.html");
const { check, report } = makeChecks();

async function firstEditable(page) {
  return page.evaluate(() => {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++)
      if (givens[r][c] === 0) return { r, c };
  });
}

(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(PAGE);
  await page.waitForSelector("#board");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector("#board");

  console.log("1. nothing to restore on first visit - starts fresh at puzzle 0");
  check("puzzle 0", (await page.evaluate(() => puzzleIndex)) === 0);
  check("grid matches givens",
    await page.evaluate(() => JSON.stringify(grid) === JSON.stringify(givens)));
  // loadPuzzle() saves on every call, including this first one, so a key can
  // already exist here - it just has to describe the same blank state.
  check("any save written by the fresh load matches the blank state",
    await page.evaluate(() => {
      const raw = localStorage.getItem("sudoku.progress");
      if (raw === null) return true;
      const saved = JSON.parse(raw);
      return saved.puzzleIndex === 0 && JSON.stringify(saved.grid) === JSON.stringify(givens);
    }));

  console.log("2. entering a digit saves it, and it survives a reload");
  const editable = await firstEditable(page);
  await page.evaluate(({ r, c }) => { selectCell(r, c); placeDigit(7); }, editable);
  check("saved key exists",
    (await page.evaluate(() => localStorage.getItem("sudoku.progress"))) !== null);
  await page.reload();
  await page.waitForSelector("#board");
  check("digit restored",
    await page.evaluate(({ r, c }) => grid[r][c] === 7, editable));
  check("status is the start prompt, not a stale one",
    (await page.textContent("#status")).includes("Select a cell"),
    await page.textContent("#status"));

  console.log("3. a solved board survives a reload too");
  await page.evaluate(() => {
    const solution = currentPuzzle().solution;
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      if (givens[r][c] === 0) { grid[r][c] = solution[r][c]; renderCell(r, c); }
    }
    saveProgress();
    checkWin();
  });
  check("won before reload", await page.evaluate(() => gameOver));
  await page.reload();
  await page.waitForSelector("#board");
  check("still announces solved after reload",
    (await page.textContent("#status")).includes("Solved"), await page.textContent("#status"));
  check("gameOver restored", await page.evaluate(() => gameOver));
  check("won classes restored", (await page.$$("#board .cell.won")).length === 81);

  console.log("4. Restart needs the confirm click before the save changes");
  const savedBefore = await page.evaluate(() => localStorage.getItem("sudoku.progress"));
  await page.click("#restart");
  check("arming click leaves the save untouched",
    (await page.evaluate(() => localStorage.getItem("sudoku.progress"))) === savedBefore);
  await page.click("#restart");
  const savedAfter = await page.evaluate(() => localStorage.getItem("sudoku.progress"));
  check("confirming click overwrites the save", savedAfter !== savedBefore);
  check("saved grid now matches givens",
    await page.evaluate(() => {
      const saved = JSON.parse(localStorage.getItem("sudoku.progress"));
      return saved.puzzleIndex === puzzleIndex &&
        JSON.stringify(saved.grid) === JSON.stringify(givens);
    }));
  check("the won highlight from the restored solve is gone",
    (await page.$$("#board .cell.won")).length === 0);

  console.log("5. an untouched board resets in one click, no confirm needed");
  const idxBefore5 = await page.evaluate(() => puzzleIndex);
  await page.click("#new-puzzle");
  check("advanced on the first click",
    (await page.evaluate(() => puzzleIndex)) !== idxBefore5);
  check("button label never showed the confirm prompt",
    (await page.textContent("#new-puzzle")) === "New puzzle");

  console.log("6. a corrupted save is discarded, not applied");
  await page.evaluate(() => localStorage.setItem("sudoku.progress", "{not json"));
  await page.reload();
  await page.waitForSelector("#board");
  check("falls back to a fresh board",
    await page.evaluate(() => JSON.stringify(grid) === JSON.stringify(givens)));

  console.log("7. an out-of-range puzzleIndex is discarded");
  await page.evaluate(() =>
    localStorage.setItem("sudoku.progress", JSON.stringify({ puzzleIndex: 999, grid: [] })));
  await page.reload();
  await page.waitForSelector("#board");
  check("falls back to puzzle 0", (await page.evaluate(() => puzzleIndex)) === 0);

  console.log("8. a save disagreeing with its puzzle's givens is discarded");
  await page.evaluate(() => {
    const grid2 = givens.map((row) => row.slice());
    outer: for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      if (givens[r][c] !== 0) {
        grid2[r][c] = givens[r][c] === 9 ? 1 : givens[r][c] + 1;
        break outer;
      }
    }
    localStorage.setItem("sudoku.progress", JSON.stringify({ puzzleIndex: 0, grid: grid2 }));
  });
  await page.reload();
  await page.waitForSelector("#board");
  check("falls back to a fresh board rather than the mismatched save",
    await page.evaluate(() => JSON.stringify(grid) === JSON.stringify(givens)));

  console.log("9. the game survives localStorage being unavailable");
  const page2 = await browser.newPage();
  const errors2 = [];
  page2.on("pageerror", (e) => errors2.push(String(e)));
  // as in a private window, or with site data blocked
  await page2.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() { throw new Error("SecurityError: storage is disabled"); },
    });
  });
  await page2.goto(PAGE);
  await page2.waitForSelector("#board");
  check("board still renders", (await page2.$$("#board .cell")).length === 81);
  const editable2 = await firstEditable(page2);
  await page2.evaluate(({ r, c }) => { selectCell(r, c); placeDigit(4); }, editable2);
  check("still playable with storage disabled",
    await page2.evaluate(({ r, c }) => grid[r][c] === 4, editable2));
  check("nothing thrown with storage disabled", errors2.length === 0, errors2.join("; "));
  await page2.close();

  check("no page errors", errors.length === 0, errors.join("; "));

  await browser.close();
  process.exit(report());
})();
