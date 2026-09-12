// Tic Tac Toe: the drawn marks, whose turn it is, and how a game ends.
//
//   node tests/tic-tac-toe.test.js
//
// The game's own rules were never the fragile part — nine buttons and eight win
// lines. What this guards is the board built on the redesign: marks that are
// drawn rather than typed, a win said in brightness because it cannot be said in
// colour, and the grid lines surviving a hovered square. Each of those is a
// thing a later stylesheet can quietly undo while every rule still works.
const { launch, url, makeChecks } = require("./helpers");

const PAGE = url("/games/tic-tac-toe/index.html");
const { check, report } = makeChecks();

// Amber enough to be the grid: red well ahead of green, blue nearly gone. The
// lit square behind it (--p-panel-lit) fails this, which is the point.
function isGrid([r, g, b]) {
  return r > 70 && r > g * 1.4 && b < r * 0.6;
}

(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(PAGE);
  await page.waitForSelector("#board");

  const cell = (i) => page.locator(`#board .cell[data-index="${i}"]`);
  const play = async (...indices) => {
    for (const i of indices) await cell(i).click();
  };

  console.log("1. a mark is drawn, not typed");
  await play(0);
  check("the square holds an svg", await cell(0).evaluate((el) => !!el.querySelector("svg")));
  check("and no letter of its own", (await cell(0).evaluate((el) => el.textContent.trim())) === "");
  check("the square says which mark it holds",
    (await cell(0).getAttribute("data-mark")) === "X");
  check("and reads as that mark, the drawing being hidden",
    /X$/.test(await cell(0).getAttribute("aria-label")),
    await cell(0).getAttribute("aria-label"));

  console.log("2. the board carries whose turn it is");
  check("O's turn after X plays", (await page.getAttribute("#board", "data-turn")) === "O");
  await play(3);
  check("back to X", (await page.getAttribute("#board", "data-turn")) === "X");

  console.log("3. a win: the three that won stay lit, the rest go half-lit");
  await play(1, 4, 2);
  // The dim is a transition, so a read taken the instant the game ends catches
  // it part way down and says nothing about where it settles.
  const SETTLE = 400;
  const opacity = async (i) => {
    await page.waitForTimeout(SETTLE);
    return cell(i).evaluate((el) => getComputedStyle(el).opacity);
  };
  check("the game is over as a win", (await page.getAttribute("#board", "data-over")) === "win");
  check("exactly three winning squares", (await page.$$("#board .cell.win")).length === 3);
  check("the winning three are full strength", (await opacity(0)) === "1", await opacity(0));
  check("a square outside the win is dimmed", Number(await opacity(3)) < 0.8, await opacity(3));
  check("no turn is pending", (await page.getAttribute("#board", "data-turn")) === "");

  console.log("4. the win is not said in colour, which jade already speaks for");
  // --win is jade and jade is O's own hue all game, so a winning mark may not
  // change colour to announce itself: it has to be the same hue, brighter.
  const hue = (i) => cell(i).evaluate((el) => getComputedStyle(el).color);
  const winnerColour = await hue(0);
  await page.click("#restart");
  await play(0);
  check("a mark's colour is the same won or not", (await hue(0)) === winnerColour, winnerColour);

  console.log("5. restart clears the board");
  await page.click("#restart");
  check("no drawing left", (await page.$$("#board svg")).length === 0);
  check("no mark left", (await page.$$("#board .cell[data-mark]")).length === 0);
  check("nothing marked as won", (await page.$$("#board .cell.win")).length === 0);
  check("no end state", (await page.getAttribute("#board", "data-over")) === "");
  check("X to play", (await page.getAttribute("#board", "data-turn")) === "X");
  check("the square reads as empty again",
    (await cell(0).getAttribute("aria-label")) === "Cell 1",
    await cell(0).getAttribute("aria-label"));

  console.log("6. a draw dims the whole board");
  await play(0, 1, 2, 4, 3, 5, 7, 6, 8);
  check("the game is over as a draw", (await page.getAttribute("#board", "data-over")) === "draw");
  check("every square is dimmed", Number(await opacity(0)) < 0.8, await opacity(0));

  console.log("7. hovering a square does not paint over the grid lines");
  // Measured in pixels, because that is the whole claim: the lines are drawn on
  // the board and a hovered cell lights its own background over them. Counting
  // grid-coloured pixels in the strip a line runs through is what only a visible
  // line can produce - a bright fill in some other hue would not pass isGrid.
  await page.click("#restart");
  const box = await page.locator("#board").boundingBox();
  // The left-hand vertical line of the middle column, sampled down the middle
  // row so nothing but the line itself is in the strip.
  const clip = {
    x: Math.round(box.x + box.width / 3 - 4),
    y: Math.round(box.y + box.height / 2 - 20),
    width: 9,
    height: 40,
  };
  const gridPixels = async () => {
    const shot = (await page.screenshot({ clip })).toString("base64");
    return page.evaluate(async (b64) => {
      const img = new Image();
      img.src = "data:image/png;base64," + b64;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      c.getContext("2d").drawImage(img, 0, 0);
      return Array.from(c.getContext("2d").getImageData(0, 0, c.width, c.height).data);
    }, shot);
  };
  const count = (data) => {
    let n = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (isGrid([data[i], data[i + 1], data[i + 2]])) n++;
    }
    return n;
  };

  const idle = count(await gridPixels());
  await cell(4).hover();
  await page.waitForTimeout(250); // the lit background fades in
  const hovered = count(await gridPixels());
  check("the line is there to begin with", idle > 0, idle);
  check("and survives the square lighting under it", hovered >= idle * 0.8, `${idle} -> ${hovered}`);

  console.log("8. no page errors");
  check("no page errors", errors.length === 0, errors.join(" | "));

  await browser.close();
  process.exit(report());
})();
