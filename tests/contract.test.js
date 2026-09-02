// The page contract, held against every game, and the hub against the folders.
//
//   node tests/contract.test.js
//
// The games come from reading games/ rather than from a list, which is the whole
// reason this suite exists apart from the per-game ones. A game's own suite
// belongs to that game and is written by whoever builds it; no such suite can
// assert anything about the other four, and none of them is the place to notice
// that a sixth game shipped without a card on the hub.
//
// What it deliberately does not do is test how any game plays. That is the
// owning game's suite, and this one has no business there.
const fs = require("fs");
const path = require("path");
const { launch, url, makeChecks } = require("./helpers");

const ROOT = path.join(__dirname, "..");
const { check, report } = makeChecks();

const games = fs
  .readdirSync(path.join(ROOT, "games"), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

const missing = (a, b) => a.filter((x) => !b.includes(x));

(async () => {
  const browser = await launch();

  // Adding a game is two steps - create the folder, add a card - and nothing
  // else in the repo checks that both happened. A folder with no card is a game
  // no visitor can reach; a card whose folder was renamed is a 404 on the live
  // site. Both directions, so either mistake names itself.
  console.log("1. the hub and games/ agree");
  const hub = await browser.newPage();
  const hubErrors = [];
  hub.on("pageerror", (e) => hubErrors.push(String(e)));
  await hub.goto(url("/index.html"));
  const carded = [
    ...new Set(
      (await hub.$$eval('a[href^="games/"]', (as) =>
        as.map((a) => a.getAttribute("href"))
      )).map((href) => href.split("/")[1])
    ),
  ].sort();

  check("every game folder has a card", missing(games, carded).length === 0,
    missing(games, carded).join(", ") || games.join(", "));
  check("every card points at a game folder", missing(carded, games).length === 0,
    missing(carded, games).join(", ") || carded.join(", "));
  check("the hub itself loads clean", hubErrors.length === 0, hubErrors.join("; "));
  await hub.close();

  let step = 1;
  for (const game of games) {
    console.log(`${++step}. ${game} keeps the page contract`);
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    const res = await page.goto(url(`/games/${game}/index.html`));
    check(`${game}: the page is served`, res && res.ok(), res && res.status());

    // Game scripts look these up by id and shared.css styles them. A page
    // missing one is broken in a way its own suite would catch, but a page
    // added without one never had a suite in the first place.
    const absent = await page.evaluate(() =>
      ["board", "status", "restart"].filter((id) => !document.getElementById(id))
    );
    check(`${game}: has #board, #status and #restart`, absent.length === 0,
      absent.map((id) => `#${id}`).join(", ") || "all three");

    // Order, not just presence. shared.css second would still load, still look
    // almost right, and quietly stop the game's own rules from winning - which
    // is the kind of breakage nobody reports because nothing looks broken.
    const sheets = await page.$$eval('link[rel="stylesheet"]', (ls) =>
      ls.map((l) => l.getAttribute("href"))
    );
    const shared = sheets.findIndex((h) => h.endsWith("shared.css"));
    const own = sheets.findIndex((h) => h.endsWith("style.css"));
    check(`${game}: links shared.css before its own`,
      shared !== -1 && own !== -1 && shared < own, sheets.join(" then "));

    const back = await page.$$eval("a[href]", (as) =>
      as.map((a) => a.getAttribute("href"))
    );
    check(`${game}: links back to the hub`, back.includes("../../index.html"),
      back.join(", "));

    // A settle before reading errors: a game whose loop throws on its first
    // frame is still loaded and quiet at the moment goto() resolves.
    await page.waitForTimeout(150);
    check(`${game}: no page errors`, errors.length === 0, errors.join("; "));
    await page.close();
  }

  await browser.close();
  process.exit(report());
})();
