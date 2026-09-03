// Gameplay: selecting a cell, filling it (keyboard and the number pad),
// conflict highlighting, the win condition, and Restart vs. New puzzle.
const { launch, url, makeChecks } = require("./helpers");

const PAGE = url("/games/sudoku/index.html");
const { check, report } = makeChecks();

(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(PAGE);
  await page.waitForSelector("#board");

  console.log("1. the board renders 81 cells, given cells pre-filled");
  check("81 cells", (await page.$$("#board .cell")).length === 81);
  const givenCount = await page.evaluate(() =>
    givens.flat().filter((v) => v !== 0).length
  );
  check("given count matches rendered givens",
    (await page.$$("#board .cell.given")).length === givenCount, givenCount);

  console.log("2. a given cell cannot be selected or edited");
  const firstGivenIndex = await page.evaluate(() => {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++)
      if (givens[r][c] !== 0) return r * 9 + c;
  });
  const cells = () => page.$$("#board .cell");
  await (await cells())[firstGivenIndex].click();
  check("no cell becomes selected", (await page.$$("#board .cell.selected")).length === 0);

  console.log("3. selecting an editable cell and typing a digit fills it");
  const firstEmptyIndex = await page.evaluate(() => {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++)
      if (givens[r][c] === 0) return r * 9 + c;
  });
  const emptyCell = (await cells())[firstEmptyIndex];
  await emptyCell.click();
  check("cell shows selected", await emptyCell.evaluate((el) => el.classList.contains("selected")));
  await page.keyboard.press("5");
  check("digit typed", (await emptyCell.textContent()) === "5");

  console.log("4. Backspace clears the selected cell");
  await page.keyboard.press("Backspace");
  check("cell cleared", (await emptyCell.textContent()) === "");

  console.log("5. the number pad fills the selected cell");
  await page.click('.num-btn[data-digit="7"]');
  check("number pad digit applied", (await emptyCell.textContent()) === "7");
  await page.click(".num-btn.erase");
  check("eraser button clears it", (await emptyCell.textContent()) === "");

  console.log("6. a digit that duplicates a peer is marked wrong");
  const dupe = await page.evaluate(() => {
    // find an empty cell and a value already present in its row
    for (let r = 0; r < 9; r++) {
      const present = grid[r].find((v) => v !== 0);
      if (present === undefined) continue;
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) return { r, c, value: present };
      }
    }
    return null;
  });
  const dupeCell = (await cells())[dupe.r * 9 + dupe.c];
  await dupeCell.click();
  await page.keyboard.press(String(dupe.value));
  check("marked wrong", await dupeCell.evaluate((el) => el.classList.contains("wrong")));
  await page.keyboard.press("Backspace");
  check("clearing it drops the wrong marker",
    !(await dupeCell.evaluate((el) => el.classList.contains("wrong"))));

  console.log("7. filling the whole board with the solution wins");
  const result = await page.evaluate(() => {
    const solution = currentPuzzle().solution;
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      if (givens[r][c] === 0) {
        grid[r][c] = solution[r][c];
        renderCell(r, c);
      }
    }
    checkWin();
    return { gameOver, status: document.getElementById("status").textContent };
  });
  check("game won", result.gameOver);
  check("status announces it", result.status.includes("Solved"), result.status);
  check("cells marked won", (await page.$$("#board .cell.won")).length === 81);

  console.log("8. Restart clears entries back to the same puzzle's givens");
  const puzzleIndexBefore = await page.evaluate(() => puzzleIndex);
  await page.click("#restart");
  check("no longer game over", !(await page.evaluate(() => gameOver)));
  check("same puzzle", (await page.evaluate(() => puzzleIndex)) === puzzleIndexBefore);
  check("grid matches givens again",
    await page.evaluate(() => JSON.stringify(grid) === JSON.stringify(givens)));
  check("status back to the prompt",
    (await page.textContent("#status")).includes("Select a cell"),
    await page.textContent("#status"));

  console.log("9. New puzzle moves to a different entry and resets state");
  await page.click("#new-puzzle");
  check("puzzle index advanced",
    (await page.evaluate(() => puzzleIndex)) !== puzzleIndexBefore);
  check("grid matches the new puzzle's givens",
    await page.evaluate(() => JSON.stringify(grid) === JSON.stringify(givens)));

  console.log("10. a pointer click on a control hands the focus back");
  // A clicked button keeps the focus by default, and a focused button takes
  // Space and Enter as its own click - so without releasing it, playing a
  // move right after clicking New puzzle re-fires that button on the very
  // key meant as game input, silently discarding what was just entered.
  await page.click("#new-puzzle");
  check("focus not stuck on New puzzle",
    (await page.evaluate(() => document.activeElement.id)) !== "new-puzzle");
  const puzzleIndexAfterClick = await page.evaluate(() => puzzleIndex);

  const editable = await page.evaluate(() => {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++)
      if (givens[r][c] === 0) return r * 9 + c;
  });
  await (await cells())[editable].click();
  await page.keyboard.press("5");
  check("digit landed", (await (await cells())[editable].textContent()) === "5");

  await page.keyboard.press("Space");
  check("Space does not re-trigger New puzzle",
    (await page.evaluate(() => puzzleIndex)) === puzzleIndexAfterClick);
  check("the entered digit survives the keypress",
    (await (await cells())[editable].textContent()) === "5");

  await page.keyboard.press("Enter");
  check("Enter does not re-trigger New puzzle either",
    (await page.evaluate(() => puzzleIndex)) === puzzleIndexAfterClick);

  console.log("11. the number pad and Restart release focus the same way");
  await page.click('.num-btn[data-digit="3"]');
  check("focus not stuck on the number pad button",
    (await page.evaluate(() => document.activeElement.tagName)) !== "BUTTON" ||
    !(await page.evaluate(() => document.activeElement.classList.contains("num-btn"))));
  await page.click("#restart");
  check("focus not stuck on Restart",
    (await page.evaluate(() => document.activeElement.id)) !== "restart");

  check("no page errors", errors.length === 0, errors.join("; "));

  await browser.close();
  process.exit(report());
})();
