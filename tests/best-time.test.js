// The locally stored personal best: recording it, clearing it from the gear
// panel, and the case where localStorage throws.
const { launch, url, makeChecks } = require("./helpers");

const PAGE = url("/games/minesweeper/index.html");
const { check, report } = makeChecks();

// Win the board with the clock reading `atSeconds`.
function winIn(page, atSeconds) {
  return page.evaluate((t) => {
    restart();
    handleReveal(4, 4);
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (!grid[r][c].mine && !grid[r][c].revealed) {
          seconds = t;              // the timer would normally be driving this
          handleReveal(r, c);
        }
    return { gameOver, status: document.getElementById("status").textContent };
  }, atSeconds);
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

  console.log("1. no record yet");
  check("shows a dash", (await page.textContent("#best-time")).includes("—"),
    await page.textContent("#best-time"));
  check("nothing to clear, so reset is disabled",
    await page.isDisabled("#reset-best"));

  console.log("2. the first win sets the record");
  let r = await winIn(page, 42);
  check("game won", r.gameOver);
  check("announces a new best", r.status.includes("new best"), r.status);
  check("HUD shows 42s", (await page.textContent("#best-time")).includes("42"),
    await page.textContent("#best-time"));

  console.log("3. a slower win does not overwrite it");
  r = await winIn(page, 99);
  check("HUD still 42s", (await page.textContent("#best-time")).includes("42"),
    await page.textContent("#best-time"));
  check("does not claim a new best", !r.status.includes("new best"), r.status);
  check("still reports the time played", r.status.includes("99"), r.status);

  console.log("4. a faster win replaces it");
  r = await winIn(page, 17);
  check("announces a new best", r.status.includes("new best"), r.status);
  check("HUD shows 17s", (await page.textContent("#best-time")).includes("17"),
    await page.textContent("#best-time"));

  console.log("5. the record survives a reload");
  await page.reload();
  await page.waitForSelector("#board");
  check("still 17s", (await page.textContent("#best-time")).includes("17"),
    await page.textContent("#best-time"));

  console.log("6. losing does not touch the record");
  await page.evaluate(() => {
    restart();
    handleReveal(4, 4);
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++)
      if (grid[r][c].mine && !grid[r][c].revealed) { handleReveal(r, c); return; }
  });
  await page.waitForTimeout(80);
  check("record unchanged", (await page.textContent("#best-time")).includes("17"),
    await page.textContent("#best-time"));

  console.log("7. the gear opens the advanced panel");
  check("panel hidden by default", !(await page.isVisible("#settings")));
  check("aria-expanded=false",
    (await page.getAttribute("#settings-toggle", "aria-expanded")) === "false");
  await page.click("#settings-toggle");
  await page.waitForTimeout(120);
  check("panel visible", await page.isVisible("#settings"));
  check("aria-expanded=true",
    (await page.getAttribute("#settings-toggle", "aria-expanded")) === "true");
  check("reset enabled while a record exists", !(await page.isDisabled("#reset-best")));

  console.log("8. one click only arms the reset - it does not clear");
  await page.click("#reset-best");
  await page.waitForTimeout(80);
  check("button asks for confirmation",
    (await page.textContent("#reset-best")).includes("Sure"),
    await page.textContent("#reset-best"));
  check("record untouched by the first click",
    (await page.textContent("#best-time")).includes("17"),
    await page.textContent("#best-time"));

  console.log("9. closing the panel abandons a half-finished reset");
  await page.click("#settings-toggle");
  await page.click("#settings-toggle");
  await page.waitForTimeout(80);
  check("button back to its resting label",
    (await page.textContent("#reset-best")) === "Reset best time",
    await page.textContent("#reset-best"));
  check("record still there", (await page.textContent("#best-time")).includes("17"),
    await page.textContent("#best-time"));
  // a click now re-arms rather than clearing, so a stale arming cannot fire
  await page.click("#reset-best");
  await page.waitForTimeout(80);
  check("still holding the record after the re-arming click",
    (await page.textContent("#best-time")).includes("17"),
    await page.textContent("#best-time"));

  console.log("10. the second click clears it");
  await page.click("#reset-best");
  await page.waitForTimeout(120);
  check("HUD back to a dash", (await page.textContent("#best-time")).includes("—"),
    await page.textContent("#best-time"));
  check("storage key removed",
    await page.evaluate(() => localStorage.getItem("minesweeper.bestTime.9x9-10")) === null);
  check("reset disabled again", await page.isDisabled("#reset-best"));
  check("label restored", (await page.textContent("#reset-best")) === "Reset best time",
    await page.textContent("#reset-best"));
  check("clearing while disabled is a no-op",
    await page.evaluate(() => {
      handleResetBest();
      return document.getElementById("reset-best").textContent;
    }) === "Reset best time");
  await page.reload();
  await page.waitForSelector("#board");
  check("still cleared after a reload",
    (await page.textContent("#best-time")).includes("—"),
    await page.textContent("#best-time"));
  r = await winIn(page, 30);
  check("the next win starts a fresh record", r.status.includes("new best"), r.status);
  check("HUD shows 30s", (await page.textContent("#best-time")).includes("30"),
    await page.textContent("#best-time"));
  check("reset enabled once more", !(await page.isDisabled("#reset-best")));

  console.log("11. it is local-only data under one namespaced key");
  const keys = await page.evaluate(() => Object.keys(localStorage));
  check("single namespaced key",
    keys.length === 1 && keys[0].startsWith("minesweeper.bestTime"), JSON.stringify(keys));

  console.log("12. the game survives localStorage being unavailable");
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
  check("best time degrades to a dash",
    (await page2.textContent("#best-time")).includes("—"),
    await page2.textContent("#best-time"));
  const r2 = await winIn(page2, 8);
  check("still winnable", r2.gameOver, r2.status);
  check("does not falsely claim a record", !r2.status.includes("new best"), r2.status);
  check("reset disabled - unreadable storage reads as no record",
    await page2.isDisabled("#reset-best"));
  // the guarded removeItem, reached directly since the button is disabled
  check("clearing does not throw with storage disabled",
    await page2.evaluate(() => {
      try {
        return clearBestTime() === false;
      } catch {
        return false;
      }
    }));
  check("nothing thrown with storage disabled", errors2.length === 0, errors2.join("; "));

  check("no page errors", errors.length === 0, errors.join("; "));

  await browser.close();
  process.exit(report());
})();
