// Minesweeper chording, including the regression that shipped broken twice:
// the chord must survive the pointer moving while the middle button is held.
const { launch, url, makeChecks } = require("./helpers");

const PAGE = url("/games/minesweeper/index.html");
const { check, report } = makeChecks();

async function open(page) {
  await page.goto(PAGE);
  await page.waitForSelector("#board");
}

// Open a board and flag around a chordable number.
//   "correct"   - flag exactly its mines
//   "wrongflag" - flag a safe cell instead of one mine
//   "none"      - place no flags at all
async function setup(page, mode) {
  return page.evaluate((mode) => {
    const nb = (r, c) => {
      const o = [];
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) o.push([nr, nc]);
      }
      return o;
    };
    for (let attempt = 0; attempt < 60; attempt++) {
      restart();
      handleReveal(4, 4);
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
        const cell = grid[r][c];
        if (!cell.revealed || cell.adjacent === 0) continue;
        const ns = nb(r, c);
        const mines = ns.filter(([a, b]) => grid[a][b].mine);
        const safeCovered = ns.filter(([a, b]) => !grid[a][b].mine && !grid[a][b].revealed);
        if (mines.length !== cell.adjacent || safeCovered.length === 0) continue;

        if (mode === "correct") {
          mines.forEach(([a, b]) => handleFlag(a, b));
        } else if (mode === "wrongflag") {
          handleFlag(safeCovered[0][0], safeCovered[0][1]);
          mines.slice(1).forEach(([a, b]) => handleFlag(a, b));
        }
        return {
          r, c, adjacent: cell.adjacent,
          before: document.querySelectorAll("#board .cell.revealed").length,
        };
      }
    }
    return null;
  }, mode);
}

const revealed = (page) => page.$$eval("#board .cell.revealed", (e) => e.length);

async function middleClick(page, r, c, wobble) {
  const el = (await page.$$("#board .cell"))[r * 9 + c];
  const b = await el.boundingBox();
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down({ button: "middle" });
  if (wobble) {
    // a slightly shaky hand, or Firefox's autoscroll overlay taking the pointer
    await page.mouse.move(cx + b.width * 2, cy + b.height);
    await page.mouse.move(cx, cy);
  }
  await page.mouse.up({ button: "middle" });
  await page.waitForTimeout(150);
}

(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  console.log("1. correct flags -> chord opens remaining neighbours");
  await open(page);
  let t = await setup(page, "correct");
  await middleClick(page, t.r, t.c, false);
  let after = await revealed(page);
  check("reveals more cells", after > t.before, `${t.before} -> ${after}`);
  check("game not over", !(await page.evaluate(() => gameOver)));

  console.log("2. correct flags + pointer movement while pressed (the regression)");
  await open(page);
  t = await setup(page, "correct");
  await middleClick(page, t.r, t.c, true);
  after = await revealed(page);
  check("still chords despite movement", after > t.before, `${t.before} -> ${after}`);

  console.log("3. a wrong flag -> chord detonates (per the official rules)");
  await open(page);
  t = await setup(page, "wrongflag");
  await middleClick(page, t.r, t.c, false);
  check("game over", await page.evaluate(() => gameOver));
  check("status names the bad flag",
    (await page.textContent("#status")).includes("flag was wrong"),
    await page.textContent("#status"));

  console.log("4. flag count mismatch -> refuses, explains, reveals nothing");
  await open(page);
  t = await setup(page, "none");
  await middleClick(page, t.r, t.c, false);
  after = await revealed(page);
  check("nothing revealed", after === t.before, `${t.before} -> ${after}`);
  check("game not over", !(await page.evaluate(() => gameOver)));
  check("explains why", (await page.textContent("#status")).toLowerCase().includes("chord"),
    await page.textContent("#status"));

  console.log("5. middle click on a covered cell is harmless");
  await open(page);
  await setup(page, "correct");
  const covered = await page.evaluate(() => {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++)
      if (!grid[r][c].revealed && !grid[r][c].flagged) return { r, c };
    return null;
  });
  const before = await revealed(page);
  await middleClick(page, covered.r, covered.c, false);
  check("no reveal, no game over",
    (await revealed(page)) === before && !(await page.evaluate(() => gameOver)));

  console.log("6. the refusal message clears itself");
  await open(page);
  t = await setup(page, "none");
  await middleClick(page, t.r, t.c, false);
  await page.waitForTimeout(2800);
  check("status clears back to empty",
    (await page.textContent("#status")).trim() === "",
    JSON.stringify(await page.textContent("#status")));

  check("no page errors", errors.length === 0, errors.join("; "));

  await browser.close();
  process.exit(report());
})();
