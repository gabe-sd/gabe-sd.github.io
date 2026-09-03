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

// A game whose keys drive play has to hand focus back after a pointer click on
// its own buttons (see the page contract in CLAUDE.md) - a focused button takes
// Space and Enter as its own activation, so a stuck focus turns the key that
// plays the game into the key that re-fires whatever was clicked last. That is
// exactly how a Sudoku "New puzzle" click, followed by the Space or Enter meant
// as a move, silently replaced the board instead.
//
// "Keys drive play" is read structurally rather than guessed per game: does the
// script attach a keydown/keyup/keypress listener at document or window level?
// That is what makes a key reach the game at all rather than only ever landing
// on whatever element the page last focused.
const KEY_DRIVEN = /(document|window)\.addEventListener\(\s*["']key(down|up|press)["']/;

const POINTER_NOTE =
  "the page contract requires a key-driven game to hand focus back after a " +
  "pointer click - copy releaseFocus from games/flappy-bird/script.js (its " +
  "`e.detail > 0` guard is what tells a pointer click from a keyboard one)";

const KEYBOARD_NOTE =
  "a keyboard activation has to KEEP the focus, or tabbing through the " +
  "controls loses it on the first press - see the same releaseFocus in " +
  "games/flappy-bird/script.js, which blurs only when `e.detail > 0`";

// A button's own label for a failure message: id first since that is how a
// reader would find it in the page, then its text, then its class as a last
// resort for an icon-only button.
async function describe(button) {
  return button.evaluate((el) => el.id || el.textContent.trim() || el.className);
}

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

    const scriptSource = fs.readFileSync(
      path.join(ROOT, "games", game, "script.js"), "utf8"
    );
    if (KEY_DRIVEN.test(scriptSource)) {
      // In scope: the game's own action buttons - restart, a help toggle, a
      // number pad, whatever it has. Out of scope on structural grounds, not a
      // hand-picked exclusion:
      //   - anything inside #board is the play surface itself, which the file
      //     header above already rules out testing here; Sudoku's 81 cells are
      //     buttons and are its own suite's job (see sudoku.test.js cases 10-11).
      //   - a role="radio" button is a settings selector, not an action. Keeping
      //     focus after being chosen is ordinary radiogroup keyboard behaviour -
      //     the same as a native <input type="radio"> - not the hazard this
      //     clause exists for.
      const candidates = await page.$$('button:not([role="radio"])');
      const scoped = [];
      for (const b of candidates) {
        if (!(await b.evaluate((el) => el.closest("#board")))) scoped.push(b);
      }

      const stuck = [];
      for (const b of scoped) {
        await b.click();
        if (await b.evaluate((el) => document.activeElement === el)) {
          stuck.push(await describe(b));
        }
        await page.evaluate(() =>
          document.activeElement instanceof HTMLElement && document.activeElement.blur()
        );
      }
      check(`${game}: a pointer click on its own buttons hands the focus back`,
        stuck.length === 0,
        stuck.length
          ? `${stuck.join(", ")} kept focus after a real click - ${POINTER_NOTE}`
          : `released: ${scoped.length} button(s)`);

      // The other half of the same rule: a keyboard activation has to KEEP the
      // focus, or tabbing through the controls loses it on the first press.
      // Only meaningful for a button still there afterwards to tab back to - one
      // that hides itself on activation (Pong's Play, which starts the match and
      // closes the menu) has nothing left to hold focus on and is exempt.
      const lost = [];
      let exempt = 0;
      for (const b of scoped) {
        await b.evaluate((el) => el.focus());
        await page.keyboard.press("Enter");
        const stillThere = await b.evaluate((el) =>
          document.body.contains(el) && el.offsetParent !== null
        );
        if (!stillThere) {
          exempt++;
        } else if (!(await b.evaluate((el) => document.activeElement === el))) {
          lost.push(await describe(b));
        }
        await page.evaluate(() =>
          document.activeElement instanceof HTMLElement && document.activeElement.blur()
        );
      }
      check(`${game}: a keyboard activation of its own buttons keeps the focus`,
        lost.length === 0,
        lost.length
          ? `${lost.join(", ")} lost focus after Enter - ${KEYBOARD_NOTE}`
          : `kept: ${scoped.length - exempt} of ${scoped.length} checked` +
            (exempt ? ` (${exempt} exempt - hides itself on activation)` : ""));
    } else {
      console.log("   (keys do not drive play here - focus handback not required)");
    }

    // A settle before reading errors: a game whose loop throws on its first
    // frame is still loaded and quiet at the moment goto() resolves.
    await page.waitForTimeout(150);
    check(`${game}: no page errors`, errors.length === 0, errors.join("; "));
    await page.close();
  }

  await browser.close();
  process.exit(report());
})();
