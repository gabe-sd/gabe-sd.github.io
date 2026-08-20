// The How to play toggle, and the rule that #status carries game state only.
const { launch, url, makeChecks } = require("./helpers");

const PAGE = url("/games/minesweeper/index.html");
const { check, report } = makeChecks();

(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 520, height: 820 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(PAGE);
  await page.waitForSelector("#board");

  console.log("1. instructions hidden by default");
  check("panel not visible", !(await page.isVisible("#instructions")));
  check("aria-expanded=false",
    (await page.getAttribute("#help-toggle", "aria-expanded")) === "false");
  check("status prompts to start",
    (await page.textContent("#status")).includes("Click any cell"),
    await page.textContent("#status"));
  check("no controls text leaking into the status line",
    !(await page.textContent("#status")).includes("Right click"),
    await page.textContent("#status"));

  console.log("2. the button reveals them");
  await page.click("#help-toggle");
  await page.waitForTimeout(120);
  check("panel visible", await page.isVisible("#instructions"));
  check("aria-expanded=true",
    (await page.getAttribute("#help-toggle", "aria-expanded")) === "true");
  check("label flips", (await page.textContent("#help-toggle")).includes("Hide"),
    await page.textContent("#help-toggle"));
  const instr = await page.textContent("#instructions");
  check("covers left/right/middle and chording",
    ["Left click", "Right click", "Middle click", "chord"].every((s) => instr.includes(s)));

  console.log("3. the button hides them again");
  await page.click("#help-toggle");
  await page.waitForTimeout(120);
  check("panel hidden", !(await page.isVisible("#instructions")));
  check("aria-expanded back to false",
    (await page.getAttribute("#help-toggle", "aria-expanded")) === "false");
  check("label restored", (await page.textContent("#help-toggle")) === "How to play",
    await page.textContent("#help-toggle"));

  console.log("4. the status line is game state only, once play starts");
  await page.evaluate(() => handleReveal(4, 4));
  await page.waitForTimeout(100);
  check("start prompt cleared after the first reveal",
    (await page.textContent("#status")).trim() === "",
    JSON.stringify(await page.textContent("#status")));

  console.log("5. status text changes must not move the board");
  const boardBefore = await (await page.$("#board")).boundingBox();
  const t = await page.evaluate(() => {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++)
      if (grid[r][c].revealed && grid[r][c].adjacent > 0) return { r, c };
    return null;
  });
  const el = (await page.$$("#board .cell"))[t.r * 9 + t.c];
  const b = await el.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down({ button: "middle" });
  await page.mouse.up({ button: "middle" });
  await page.waitForTimeout(150);
  check("a message is showing",
    (await page.textContent("#status")).trim().length > 0,
    await page.textContent("#status"));
  const boardDuring = await (await page.$("#board")).boundingBox();
  check("board did not shift",
    Math.abs(boardDuring.y - boardBefore.y) < 0.5,
    `${boardBefore.y} -> ${boardDuring.y}`);

  console.log("6. game-over messages still reach the status line");
  await page.evaluate(() => {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++)
      if (grid[r][c].mine && !grid[r][c].revealed) { handleReveal(r, c); return; }
  });
  await page.waitForTimeout(120);
  check("shows the loss", (await page.textContent("#status")).includes("Boom"),
    await page.textContent("#status"));

  console.log("7. restart restores the prompt and keeps the panel as-is");
  await page.click("#help-toggle");
  await page.click("#restart");
  await page.waitForTimeout(120);
  check("prompt back after restart",
    (await page.textContent("#status")).includes("Click any cell"),
    await page.textContent("#status"));
  check("panel stays open across restart", await page.isVisible("#instructions"));

  check("no page errors", errors.length === 0, errors.join("; "));

  await browser.close();
  process.exit(report());
})();
