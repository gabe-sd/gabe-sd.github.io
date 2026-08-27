// Pong physics and controls. The loop is frozen with cancelAnimationFrame(rafId)
// and update() is stepped by hand, so nothing here depends on real frame timing -
// see "Scripts are classic, not modules" in CLAUDE.md for why that is reachable.
//
// Assertions are deliberately about outcomes (did it bounce, did that score) and
// not about pixels-per-frame. Movement is a fixed timestep, so update() is always
// one tick's worth and stepping it by hand stays exact.
const { launch, url, makeChecks } = require("./helpers");

const PAGE = url("/games/pong/index.html");
const { check, report } = makeChecks();

(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 760 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(PAGE);
  await page.waitForSelector("#board");

  // Stop the loop, then reset, so no stray frame has moved anything.
  // Also drops straight into "play": almost every case below places the ball by
  // hand, and would otherwise sit in the serve phase where the ball cannot move.
  const freeze = () => page.evaluate(() => {
    cancelAnimationFrame(rafId);
    restart();
    document.getElementById("menu").hidden = true;
    phase = "play";
  });
  const freezeOnly = () => page.evaluate(() => cancelAnimationFrame(rafId));
  // Stops on the update that scores, so the re-serve can be inspected before the
  // next frame moves the new ball off centre.
  const stepToScore = (max) => page.evaluate((k) => {
    const before = player.score + ai.score;
    for (let i = 0; i < k; i++) {
      update();
      if (player.score + ai.score !== before) return i + 1;
    }
    return -1;
  }, max);
  const step = (n = 1) => page.evaluate((k) => { for (let i = 0; i < k; i++) update(); }, n);
  const set = (s) => page.evaluate((v) => {
    if (v.ball) ball = { ...ball, ...v.ball };
    if (v.player) player = { ...player, ...v.player };
    if (v.ai) ai = { ...ai, ...v.ai };
  }, s);
  const read = () => page.evaluate(() => ({
    ball: { ...ball }, player: { ...player }, ai: { ...ai }, gameOver,
  }));
  const opt = (name) => `typeof ${name} === "undefined" ? null : ${name}`;
  // The property that matters is where the ball *looks*, so these compare centres
  // rather than the corner that ball.x/y actually are.
  const isCentred = (b) => Math.abs(b.x + BALL_SIZE / 2 - WIDTH / 2) < 1e-9
    && Math.abs(b.y + BALL_SIZE / 2 - HEIGHT / 2) < 1e-9;
  const where = (b) => `centre ${(b.x + BALL_SIZE / 2).toFixed(1)},`
    + `${(b.y + BALL_SIZE / 2).toFixed(1)} vs board ${WIDTH / 2},${HEIGHT / 2}`;

  const readerText = () => page.evaluate(() =>
    document.getElementById("score-reader")?.textContent ?? null);

  const consts = await page.evaluate(`({
    WIDTH, HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT, BALL_SIZE, WIN_SCORE, PADDLE_SPEED,
    TICK_MS: ${opt("TICK_MS")},
    MAX_CATCHUP_MS: ${opt("MAX_CATCHUP_MS")},
    BALL_SPEED: ${opt("BALL_SPEED")},
    BALL_SPEED_MAX: ${opt("BALL_SPEED_MAX")},
    MAX_BOUNCE_ANGLE: ${opt("MAX_BOUNCE_ANGLE")},
  })`);
  const { WIDTH, HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT, BALL_SIZE, WIN_SCORE } = consts;
  const SPEED_MAX = consts.BALL_SPEED_MAX ?? 10;
  const TICK = consts.TICK_MS ?? 1000 / 60;
  const CATCHUP = consts.MAX_CATCHUP_MS ?? 250;
  const STEEPEST = Math.tan(consts.MAX_BOUNCE_ANGLE ?? Math.PI / 3);
  const MAX_Y = HEIGHT - PADDLE_HEIGHT;

  console.log("1. state at load");
  await freezeOnly();
  {
    const s = await read();
    check("scores start level", s.player.score === 0 && s.ai.score === 0,
      `${s.player.score}-${s.ai.score}`);
    check("not over", s.gameOver === false);
    check("player paddle starts centred", s.player.y === MAX_Y / 2, s.player.y);
    // The ai used to chase the ball from the very first frame, so it had already
    // moved by the time the loop could be frozen and could only be asserted to be
    // on the board at all. It now holds the centre until a ball is sent to it.
    check("ai paddle waits at the centre", Math.abs(s.ai.y - MAX_Y / 2) < 1, s.ai.y);
    check("ball starts centred on the board", isCentred(s.ball), where(s.ball));
    check("ball waits to be served rather than launching itself",
      s.ball.vx === 0 && s.ball.vy === 0, `${s.ball.vx},${s.ball.vy}`);
    check("the menu is showing", await page.isVisible("#menu"));
    check("with no heading before a game has been played",
      (await page.textContent("#menu-heading")).trim() === "",
      await page.textContent("#menu-heading"));
    check("and the status line is left to the menu",
      (await page.textContent("#status")).trim() === "",
      await page.textContent("#status"));
    check("canvas is 600x400", WIDTH === 600 && HEIGHT === 400, `${WIDTH}x${HEIGHT}`);

    // draw() paints the score on the canvas, which no screen reader can read.
    // Not isVisible(): a 1px clipped element counts as visible to Playwright, so
    // assert on the technique itself.
    const reader = await page.evaluate(() => {
      const el = document.getElementById("score-reader");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      return { live: el.getAttribute("aria-live"), w: r.width, h: r.height,
               display: st.display, clip: st.clipPath };
    });
    check("a live region carries the score", reader && reader.live === "polite",
      reader && reader.live);
    if (reader) {
      check("clipped away rather than rendered", reader.w <= 1 && reader.h <= 1,
        `${reader.w}x${reader.h} clip=${reader.clip}`);
      check("but still in the accessibility tree, not display:none",
        reader.display !== "none", reader.display);
    }
    check("and starts level", (await readerText()) === "You 0, AI 0",
      await readerText());
  }

  console.log("2. the harness can actually freeze the loop");
  // If this fails every other case below is racing a live animation frame.
  await freeze();
  await set({ ball: { x: 300, y: 200, vx: 6, vy: 3 } });
  await page.waitForTimeout(250);
  {
    const s = await read();
    check("ball does not move on its own once frozen",
      s.ball.x === 300 && s.ball.y === 200, `${s.ball.x},${s.ball.y}`);
    await step(1);
    const t = await read();
    check("one step moves it exactly once",
      t.ball.x === 306 && t.ball.y === 203, `${t.ball.x},${t.ball.y}`);
  }

  console.log("3. paddle collisions");
  {
    await freeze();
    await set({ player: { y: 160 }, ball: { x: 40, y: 195, vx: -6, vy: 0 } });
    await step(10);
    const s = await read();
    check("player paddle sends the ball back right", s.ball.vx > 0, s.ball.vx);
    check("no point conceded on a save", s.ai.score === 0, s.ai.score);
    check("ball ends up clear of the paddle", s.ball.x >= PADDLE_WIDTH, s.ball.x);

    await freeze();
    await set({ ai: { y: 160 }, ball: { x: WIDTH - 40, y: 195, vx: 6, vy: 0 } });
    await step(10);
    const t = await read();
    check("ai paddle sends the ball back left", t.ball.vx < 0, t.ball.vx);
    check("no point conceded on the ai save", t.player.score === 0, t.player.score);
  }

  console.log("4. hit position steers the ball");
  {
    await freeze();
    await set({ player: { y: 160 }, ball: { x: 16, y: 165, vx: -6, vy: 0 } });
    await step(1);
    const high = (await read()).ball.vy;
    await freeze();
    await set({ player: { y: 160 }, ball: { x: 16, y: 230, vx: -6, vy: 0 } });
    await step(1);
    const low = (await read()).ball.vy;
    check("hitting above centre sends it upward", high < 0, high);
    check("hitting below centre sends it downward", low > 0, low);
  }

  console.log("5. walls");
  {
    await freeze();
    await set({ ball: { x: 300, y: 2, vx: 0, vy: -5 } });
    await step(1);
    const top = await read();
    check("bounces off the top", top.ball.vy > 0, top.ball.vy);
    check("stays inside the top edge", top.ball.y >= 0, top.ball.y);

    await freeze();
    await set({ ball: { x: 300, y: HEIGHT - BALL_SIZE - 2, vx: 0, vy: 5 } });
    await step(1);
    const bot = await read();
    check("bounces off the bottom", bot.ball.vy < 0, bot.ball.vy);
    check("stays inside the bottom edge", bot.ball.y <= HEIGHT - BALL_SIZE, bot.ball.y);

    // The overshoot is reflected, not clamped away. Clamping cost up to |vy| of
    // travel per bounce, which is invisible in play but puts the ball off any
    // straight-line prediction of where it will end up.
    await freeze();
    await set({ ball: { x: 300, y: HEIGHT - BALL_SIZE - 2, vx: 0, vy: 8 } });
    await step(1);
    const over = await read();
    check("the overshoot past a wall is reflected, not discarded",
      Math.abs(over.ball.y - (HEIGHT - BALL_SIZE - 6)) < 1e-6, over.ball.y);
  }

  console.log("6. velocity model: speed capped, angle bounded");
  {
    await freeze();
    await set({ player: { y: 160 }, ai: { y: 160 }, ball: { x: 300, y: 200, vx: -6, vy: 0 } });
    // Keep both paddles offset under the ball so every hit lands near an edge -
    // the worst case for both the speed cap and the steepest angle - and rally
    // long enough that the old compounding growth would have run away.
    const rally = await page.evaluate((n) => {
      let maxSpeed = 0, maxSteep = 0, minAbsVx = Infinity, hits = 0;
      const clamp = (v) => Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, v));
      // This case places both paddles itself; leave the ai out of it, or it drags
      // ai.y a few pixels a tick and the ball starts clipping the paddle ends.
      const realUpdateAi = typeof updateAi === "function" ? updateAi : null;
      if (realUpdateAi) updateAi = () => {};
      // A charged shot leaves *above* the cap on purpose, and since powerups
      // reached every mode one can fire in the middle of this rally. This case
      // is about vy not compounding, so take the moves out of it.
      const savedModes = MOVES.map((m) => ABILITY[m].modes);
      for (const m of MOVES) ABILITY[m].modes = [];
      for (let i = 0; i < n; i++) {
        const was = Math.sign(ball.vx);
        update();
        if (Math.sign(ball.vx) !== was) hits++;
        player.y = clamp(ball.y - PADDLE_HEIGHT * 0.85);
        ai.y = player.y;
        const speed = Math.hypot(ball.vx, ball.vy);
        if (speed > maxSpeed) maxSpeed = speed;
        maxSteep = Math.max(maxSteep, Math.abs(ball.vy) / Math.max(1e-9, Math.abs(ball.vx)));
        minAbsVx = Math.min(minAbsVx, Math.abs(ball.vx));
      }
      if (realUpdateAi) updateAi = realUpdateAi;
      MOVES.forEach((m, i) => { ABILITY[m].modes = savedModes[i]; });
      return { maxSpeed, maxSteep, minAbsVx, hits, points: player.score + ai.score };
    }, 5000);

    // 30 hits is 1.05^30, a ~4x runaway under the old model, against a 2x cap.
    check("the rally actually happened", rally.hits > 30, `${rally.hits} hits`);
    check("nobody scored during it", rally.points === 0, rally.points);
    check("ball speeds up towards the cap", rally.maxSpeed > 6, rally.maxSpeed);
    check("speed never exceeds the cap", rally.maxSpeed <= SPEED_MAX + 1e-6,
      `${rally.maxSpeed} vs ${SPEED_MAX}`);
    check("ball never gets steeper than the bounce limit",
      rally.maxSteep <= STEEPEST + 1e-6, `${rally.maxSteep} vs ${STEEPEST}`);
    check("ball never stalls vertically", rally.minAbsVx > 0.5, rally.minAbsVx);

    // A hit right at the paddle tip is the steepest legal return.
    await freeze();
    await set({ player: { y: 160 }, ball: { x: 16, y: 232, vx: -6, vy: 0 } });
    await step(1);
    const edge = (await read()).ball;
    check("an edge hit still comes off within the angle limit",
      Math.abs(edge.vy) / Math.abs(edge.vx) <= STEEPEST + 1e-6,
      `${edge.vx},${edge.vy}`);
  }

  console.log("7. fixed timestep pacing");
  {
    await freeze();
    const hasAdvance = await page.evaluate(() => typeof advance === "function");
    check("advance() exists to drain real time into ticks", hasAdvance);
    if (hasAdvance) {
      const pace = await page.evaluate((stallMs) => {
        const out = {};
        for (const hz of [30, 60, 144]) {
          accumulator = 0;
          let ticks = 0;
          for (let i = 0; i < hz; i++) ticks += advance(1000 / hz);
          out[hz] = ticks;
        }
        accumulator = 0;
        out.stall = advance(stallMs);
        return out;
      }, 60000);
      check("60Hz simulates ~60 ticks per second", Math.abs(pace[60] - 60) <= 1, pace[60]);
      check("144Hz simulates the same amount", Math.abs(pace[144] - 60) <= 1, pace[144]);
      check("30Hz simulates the same amount", Math.abs(pace[30] - 60) <= 1, pace[30]);
      check("a minute-long stall is clamped, not caught up on",
        pace.stall <= Math.ceil(CATCHUP / TICK), `${pace.stall} ticks`);
    }
  }

  console.log("8. a clean miss scores");
  {
    await freeze();
    await set({ player: { y: 0 }, ball: { x: 40, y: 300, vx: -6, vy: 0 } });
    const steps = await stepToScore(30);
    const s = await read();
    check("ai scores when the ball passes the player", s.ai.score === 1, s.ai.score);
    check("it took the expected number of frames", steps > 0, steps);
    check("ball returns to the centre", isCentred(s.ball), where(s.ball));
    check("ball waits rather than launching straight away", s.ball.vx === 0,
      s.ball.vx);
    check("the score reaches the hidden live region",
      (await readerText()) === "You 0, AI 1", await readerText());
    check("and is not repeated in the status line",
      !/\d/.test(await page.textContent("#status")),
      await page.textContent("#status"));

    await freeze();
    await set({ ai: { y: 0 }, ball: { x: WIDTH - 40, y: 300, vx: 6, vy: 0 } });
    await stepToScore(30);
    check("player scores when the ball passes the ai",
      (await read()).player.score === 1);
  }

  console.log("9. the round lifecycle");
  {
    await freeze();
    await set({ player: { y: 0 }, ball: { x: 40, y: 300, vx: -6, vy: 0 } });
    await stepToScore(30);
    const conceded = await page.evaluate(() => ({ phase, serveTicks, vx: ball.vx }));
    check("a point starts the serve countdown", conceded.phase === "countdown",
      conceded.phase);
    check("the ball holds still through it", conceded.vx === 0, conceded.vx);
    check("status says a serve is coming",
      (await page.textContent("#status")).toLowerCase().includes("serving"),
      await page.textContent("#status"));

    await step(conceded.serveTicks - 1);
    check("still waiting one tick short of the delay",
      (await read()).ball.vx === 0, (await read()).ball.vx);
    await step(1);
    const served = await read();
    check("it serves itself when the countdown runs out", served.ball.vx !== 0,
      served.ball.vx);
    check("and serves at the player who conceded", served.ball.vx < 0,
      served.ball.vx);

    await freeze();
    await set({ ai: { y: 0 }, ball: { x: WIDTH - 40, y: 300, vx: 6, vy: 0 } });
    await stepToScore(30);
    await step(await page.evaluate(() => serveTicks));
    check("a point against the ai serves back at the ai",
      (await read()).ball.vx > 0, (await read()).ball.vx);

    // The first serve of a game waits for the player instead of counting down.
    await freeze();
    await page.evaluate(() => { phase = "serve"; ball = centredBall(); });
    await step(30);
    const waiting = await read();
    check("the ball does not move while waiting to be served",
      isCentred(waiting.ball) && waiting.ball.vx === 0,
      `${where(waiting.ball)} vx=${waiting.ball.vx}`);

    await set({ player: { y: 200 } });
    await page.keyboard.down("w");
    await step(3);
    await page.keyboard.up("w");
    check("paddles still move while waiting, so both sides can get set",
      (await read()).player.y < 200, (await read()).player.y);

    await page.keyboard.press("Space");
    await page.waitForTimeout(60);
    check("Space serves", (await read()).ball.vx !== 0, (await read()).ball.vx);
    check("and the game goes live",
      (await page.evaluate(() => phase)) === "play");

    await freeze();
    await page.evaluate(() => { phase = "serve"; ball = centredBall(); });
    const bb = await (await page.$("#board")).boundingBox();
    await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await page.waitForTimeout(60);
    check("clicking the board serves too", (await read()).ball.vx !== 0,
      (await read()).ball.vx);
  }

  console.log("10. reaching WIN_SCORE ends the game");
  {
    await freeze();
    await set({
      player: { y: 0, score: WIN_SCORE - 1 },
      ai: { y: 0 },
      ball: { x: WIDTH - 20, y: 300, vx: 6, vy: 0 },
    });
    await step(20);
    const s = await read();
    check("player reaches the win score", s.player.score === WIN_SCORE, s.player.score);
    check("game is over", s.gameOver === true);
    check("the menu announces the win",
      (await page.textContent("#menu-heading")).includes("You win"),
      await page.textContent("#menu-heading"));
    const before = (await read()).ball.x;
    await step(5);
    check("stepping does nothing once over", (await read()).ball.x === before);

    await freeze();
    await set({
      player: { y: 0 }, ai: { y: 0, score: WIN_SCORE - 1 },
      ball: { x: 20, y: 300, vx: -6, vy: 0 },
    });
    await step(20);
    check("ai can win too", (await read()).gameOver === true);
    check("the menu announces the loss",
      (await page.textContent("#menu-heading")).includes("AI wins"),
      await page.textContent("#menu-heading"));

    // The loop stops itself once the game is over rather than redrawing a frozen
    // board forever. Driving loop() by hand is safe here: with gameOver set it
    // schedules nothing, and update() returns immediately.
    const hasStart = await page.evaluate(() => typeof start === "function");
    check("start() owns loop scheduling", hasStart);
    if (hasStart) {
      const stopped = await page.evaluate(() => {
        loop(performance.now());
        const r = { rafId, running };
        running = true; // keep the suite's frozen state for the cases below
        return r;
      });
      check("no frame is scheduled once the game is over",
        stopped.rafId === null, stopped.rafId);
      check("the loop marks itself stopped", stopped.running === false,
        stopped.running);
    }
  }

  console.log("11. restart clears everything");
  {
    const s = await read();
    check("preconditions: game is over with a score on the board",
      s.gameOver === true && s.ai.score === WIN_SCORE);
    await page.evaluate(() => restart());
    const t = await read();
    check("scores cleared", t.player.score === 0 && t.ai.score === 0);
    check("the live region is reset too",
      (await readerText()) === "You 0, AI 0", await readerText());
    check("gameOver cleared", t.gameOver === false);
    check("paddles recentred", t.player.y === MAX_Y / 2 && t.ai.y === MAX_Y / 2);
    check("ball re-served from the centre", isCentred(t.ball), where(t.ball));
  }

  console.log("12. paddle controls");
  {
    await freeze();
    await set({ player: { y: 200 } });
    await page.keyboard.down("w");
    await step(3);
    const up = (await read()).player.y;
    await page.keyboard.up("w");
    check("w moves the paddle up", up < 200, up);

    await page.keyboard.down("s");
    await step(3);
    const down = (await read()).player.y;
    await page.keyboard.up("s");
    check("s moves the paddle back down", down > up, `${up} -> ${down}`);

    await page.keyboard.down("ArrowUp");
    await step(200);
    await page.keyboard.up("ArrowUp");
    check("clamped at the top edge", (await read()).player.y === 0,
      (await read()).player.y);

    await page.keyboard.down("ArrowDown");
    await step(200);
    await page.keyboard.up("ArrowDown");
    check("clamped at the bottom edge", (await read()).player.y === MAX_Y,
      (await read()).player.y);

    // The arrows must not scroll the document out from under the board.
    await page.evaluate(() => { document.body.style.minHeight = "3000px"; });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.keyboard.down("ArrowDown");
    await page.waitForTimeout(60);
    await page.keyboard.up("ArrowDown");
    await page.keyboard.press("Space");
    await page.waitForTimeout(60);
    check("Space does not scroll the page",
      (await page.evaluate(() => window.scrollY)) === 0,
      await page.evaluate(() => window.scrollY));
    check("arrow keys do not scroll the page",
      (await page.evaluate(() => window.scrollY)) === 0,
      await page.evaluate(() => window.scrollY));
    await page.evaluate(() => { document.body.style.minHeight = ""; });

    const box = await (await page.$("#board")).boundingBox();

    // A brushed mouse must not take the paddle off the keyboard mid-rally, so
    // the pointer only takes over after moving far enough to look deliberate.
    await set({ player: { y: 200 } });
    const midY = box.y + box.height * 0.5;
    await page.mouse.move(box.x + box.width / 2, midY);
    await page.mouse.move(box.x + box.width / 2, midY + 4);
    await page.waitForTimeout(60);
    check("a small nudge does not steal control from the keyboard",
      (await read()).player.y === 200, (await read()).player.y);

    const clientY = box.y + box.height * 0.25;
    await page.mouse.move(box.x + box.width / 2, clientY);
    await page.waitForTimeout(60);
    const scale = HEIGHT / box.height;
    const want = Math.max(0, Math.min(MAX_Y, (clientY - box.y) * scale - PADDLE_HEIGHT / 2));
    const got = (await read()).player.y;
    check("a deliberate move does hand over to the pointer",
      Math.abs(got - want) < 1.5, `${got} vs ${want}`);

    // ...and the keyboard takes it straight back on the next keypress.
    await page.keyboard.down("w");
    await step(3);
    await page.keyboard.up("w");
    check("a keypress reclaims control from the pointer",
      (await read()).player.y < got, `${got} -> ${(await read()).player.y}`);
  }

  console.log("13. the canvas palette follows the OS theme");
  {
    await page.emulateMedia({ colorScheme: "light" });
    await page.waitForTimeout(80);
    const light = await page.evaluate(() => ({ ...colors }));
    await page.emulateMedia({ colorScheme: "dark" });
    await page.waitForTimeout(80);
    const dark = await page.evaluate(() => ({ ...colors }));
    check("foreground changes with the theme, without a reload",
      light.fg !== dark.fg, `${light.fg} -> ${dark.fg}`);
    check("the palette is fully populated in both",
      [light.fg, light.accent, light.border, dark.fg, dark.accent, dark.border]
        .every((c) => typeof c === "string" && c.length > 0));
    await page.emulateMedia({ colorScheme: "light" });
  }

  console.log("14. the how-to-play panel");
  {
    await page.evaluate(() => restart());
    check("status is game state only, with no controls in it",
      !/W\/S|arrow|mouse/i.test(await page.textContent("#status")),
      await page.textContent("#status"));

    check("panel hidden by default", !(await page.isVisible("#instructions")));
    check("aria-expanded starts false",
      (await page.getAttribute("#help-toggle", "aria-expanded")) === "false");
    check("the icon button has an accessible name",
      (await page.getAttribute("#help-toggle", "aria-label") || "").length > 0,
      await page.getAttribute("#help-toggle", "aria-label"));

    const boardBefore = await (await page.$("#board")).boundingBox();
    await page.click("#help-toggle");
    await page.waitForTimeout(120);
    check("the button reveals it", await page.isVisible("#instructions"));
    check("aria-expanded flips to true",
      (await page.getAttribute("#help-toggle", "aria-expanded")) === "true");
    const boardAfter = await (await page.$("#board")).boundingBox();
    check("opening it does not move the board",
      Math.abs(boardAfter.y - boardBefore.y) < 0.5,
      `${boardBefore.y} -> ${boardAfter.y}`);

    const text = await page.textContent("#instructions");
    check("it covers keyboard, mouse and serving",
      ["W", "S", "Mouse", "Space"].every((t) => text.includes(t)), text.trim());
    check("the win score comes from the constant, not the markup",
      (await page.textContent("#win-score")) === String(WIN_SCORE),
      await page.textContent("#win-score"));

    // The panel button is focused after that click, so Space belongs to it.
    const before = await page.evaluate(() => phase);
    await page.keyboard.press("Space");
    await page.waitForTimeout(120);
    check("Space on a focused button does not also serve",
      (await page.evaluate(() => phase)) === before && before === "menu",
      `${before} -> ${await page.evaluate(() => phase)}`);
    check("it toggles the panel shut instead",
      !(await page.isVisible("#instructions")));

    await page.click("#help-toggle");
    await page.waitForTimeout(120);
    await page.click("#help-toggle");
    await page.waitForTimeout(120);
    check("the button hides it again", !(await page.isVisible("#instructions")));
    check("aria-expanded back to false",
      (await page.getAttribute("#help-toggle", "aria-expanded")) === "false");
  }

  console.log("15. pause");
  {
    await freeze();
    await set({ ball: { x: 300, y: 200, vx: 6, vy: 0 } });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(60);
    check("Escape pauses", await page.evaluate(() => paused));
    await step(10);
    check("nothing moves while paused", (await read()).ball.x === 300,
      (await read()).ball.x);
    check("status says so",
      (await page.textContent("#status")).toLowerCase().includes("paused"),
      await page.textContent("#status"));

    // Paused real time is dropped, not banked up to replay on resume.
    const banked = await page.evaluate(() => {
      loop(performance.now() + 5000);
      cancelAnimationFrame(rafId); // loop scheduled a frame; take it back
      return { acc: accumulator, x: ball.x };
    });
    check("a paused frame banks no time", banked.acc === 0, banked.acc);
    check("and moves nothing", banked.x === 300, banked.x);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(60);
    check("Escape resumes", !(await page.evaluate(() => paused)));
    await step(1);
    check("play carries on from where it stopped", (await read()).ball.x === 306,
      (await read()).ball.x);

    await page.keyboard.press("p");
    await page.waitForTimeout(60);
    check("p pauses too", await page.evaluate(() => paused));
    await page.keyboard.press("p");
    await page.waitForTimeout(60);
    check("and resumes", !(await page.evaluate(() => paused)));

    // These four are dispatched rather than driven by a real focus change, and
    // that is a harness limit, not a preference. bringToFront() was tried three
    // ways - a second page, a second page in a headed browser, and a second tab
    // in the same context - and none of them produce a blur, a visibilitychange
    // or even a hasFocus() flip: it activates the CDP target without moving the
    // window manager's focus. Anything better needs XTEST against the real
    // desktop, which CLAUDE.md warns lands on whatever window is on top. So what
    // is covered here is the wiring, not the browser's delivery of the event.
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await page.waitForTimeout(60);
    check("losing the window pauses the game", await page.evaluate(() => paused));
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await page.waitForTimeout(60);
    check("getting it back does not resume for you - a live ball is the thing "
      + "being avoided", await page.evaluate(() => paused));

    // Mouse-only players need a way back in without the keyboard.
    const bb = await (await page.$("#board")).boundingBox();
    await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await page.waitForTimeout(60);
    check("clicking the board resumes", !(await page.evaluate(() => paused)));

    // The visibility handler on its own, since a backgrounded tab may deliver
    // either event.
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    check("a hidden tab pauses", await page.evaluate(() => paused));
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { value: false, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    check("becoming visible again does not resume either",
      await page.evaluate(() => paused));

    await page.evaluate(() => restart());
    check("restart clears the pause", !(await page.evaluate(() => paused)));
  }

  // Sections 16-18 describe how the ai *moves*. Blink teleports it, and since
  // powerups reached every mode it can fire in the middle of any of these on a
  // random roll - which would show up as a flaky suite rather than an honest
  // failure. Silence the moves while the mover is under test.
  const savedModes = await page.evaluate(() => {
    const was = Object.fromEntries(MOVES.map((m) => [m, ABILITY[m].modes]));
    for (const m of MOVES) ABILITY[m].modes = [];
    return was;
  });

  console.log("16. how the ai behaves");
  {
    // These two describe the old chasing ai's behaviour by contradiction, so they
    // are the before/after evidence for this change.
    await freeze();
    await set({ ai: { y: 0 }, ball: { x: 300, y: 30, vx: -5, vy: 0 } });
    await step(45); // enough to recentre, short of conceding the point
    const idle = (await read()).ai.y;
    check("it returns to the centre while the ball is away",
      Math.abs(idle - MAX_Y / 2) < 1, idle);
    check("rather than following a ball not being sent to it",
      Math.abs(idle - 30) > 100, idle);

    await freeze();
    await set({ ai: { y: 0 }, ball: { x: 100, y: 380, vx: 5, vy: 0 } });
    const react = await page.evaluate(() => {
      const before = ai.y;
      for (let i = 0; i < AI.reactionTicks; i++) update();
      const during = ai.y;
      update();
      return { before, during, after: ai.y, ticks: AI.reactionTicks };
    });
    check("it holds still through a reaction delay",
      react.during === react.before, `${react.before} -> ${react.during}`);
    check("then starts moving", react.after !== react.during,
      `${react.during} -> ${react.after}`);
    check("winding up rather than snapping to full speed",
      Math.abs(react.after - react.during) < consts.PADDLE_SPEED,
      `moved ${Math.abs(react.after - react.during).toFixed(2)}px on its first tick`);

    // Braking later than it can stop is what produces the overshoot; it has to
    // come back, the way a hand does.
    const swing = await page.evaluate(() => {
      if (typeof AI === "undefined") return null;
      cancelAnimationFrame(rafId);
      restart();
      // A live approach with glancing switched off, so the target this sets
      // stays put and only the movement is under test.
      phase = "play";
      ball = { x: 100, y: 200, vx: 5, vy: 0 };
      ai.y = 0; aiVel = 0; aiTarget = 200;
      aiApproaching = true; aiReactionLeft = 0; aiNextRead = 1e6;
      const trace = [];
      for (let i = 0; i < 150; i++) { updateAi(); trace.push(ai.y); }
      const speeds = trace.map((v, i) => (i ? Math.abs(v - trace[i - 1]) : 0));
      return { peak: Math.max(...trace), settled: trace[149],
               topSpeed: Math.max(...speeds), normal: AI.speed, panic: AI.panicSpeed };
    });
    check("it overshoots its target", !!swing && swing.peak > 200.5,
      swing && `peak ${swing.peak.toFixed(1)} for a target of 200`);
    check("and settles back onto it", !!swing && Math.abs(swing.settled - 200) < 0.5,
      swing && swing.settled.toFixed(2));
    check("it lunges above its normal speed when badly out of position",
      !!swing && swing.topSpeed > swing.normal + 0.1,
      swing && `${swing.topSpeed.toFixed(2)} vs a normal ${swing.normal}`);
    check("but not above its panic speed",
      !!swing && swing.topSpeed <= swing.panic + 1e-9,
      swing && swing.topSpeed.toFixed(2));
  }

  console.log("17. the ai reads the ball rather than solving it");
  {
    const hasAi = await page.evaluate(() => typeof predictInterceptY === "function");
    check("there is an intercept prediction to test", hasAi);
    const aiRun = (fn, arg) => hasAi ? page.evaluate(fn, arg) : null;

    // With full lookahead the prediction must match the game's own physics, not
    // arithmetic done here: park the paddle off the board, run the ball to the
    // ai's plane, compare. vx divides the distance exactly, so the ball lands on
    // the plane rather than past it.
    for (const vy of hasAi ? [0, 5, 11] : []) {
      const r = await page.evaluate((v) => {
        cancelAnimationFrame(rafId);
        restart();
        phase = "play";
        ball = { x: 100, y: 100, vx: 5, vy: v };
        const predicted = predictInterceptY(Infinity);
        const real = updateAi;
        updateAi = () => {};
        ai.y = 10000; // parked where it cannot interfere
        let guard = 0;
        while (ball.x < AI_PLANE && guard++ < 10000) update();
        const out = { predicted, actual: ball.y };
        updateAi = real;
        return out;
      }, vy);
      check(`a full read matches the simulated path (vy=${vy})`,
        Math.abs(r.predicted - r.actual) < 2,
        `predicted ${r.predicted.toFixed(1)}, landed ${r.actual.toFixed(1)}`);
    }

    check("no prediction for a ball travelling away", hasAi && await page.evaluate(
      () => {
        ball = { x: 300, y: 200, vx: -5, vy: 0 };
        return typeof predictInterceptY === "function"
          ? predictInterceptY(Infinity) : 0;
      }) === null);

    // Seeing one bounce ahead is a genuine misread of a ball that bounces more,
    // which is the shot that most exposed the old ai as a machine.
    const short = await aiRun(() => {
      cancelAnimationFrame(rafId);
      restart();
      phase = "play";
      ball = { x: 100, y: 100, vx: 5, vy: 11 }; // bounces twice on the way over
      return { full: predictInterceptY(Infinity), limited: predictInterceptY(1) };
    });
    check("a limited lookahead misreads a multi-bounce shot",
      !!short && Math.abs(short.full - short.limited) > 50,
      short && `full ${short.full.toFixed(0)} vs one-bounce ${short.limited.toFixed(0)}`);

    // The whole complaint: it must not be standing on the answer the moment the
    // ball is struck. Compare where it is early against where the ball will
    // actually arrive.
    const walk = await aiRun(() => {
      cancelAnimationFrame(rafId);
      restart();
      phase = "play";
      ai.y = (HEIGHT - PADDLE_HEIGHT) / 2;
      ball = { x: PLAYER_PLANE, y: 60, vx: 6, vy: 9 };
      const truth = predictInterceptY(Infinity) + BALL_SIZE / 2 - PADDLE_HEIGHT / 2;
      const early = [];
      for (let i = 0; i < 30; i++) { update(); early.push(ai.y); }
      let guard = 0;
      while (ball.vx > 0 && guard++ < 400) update();
      return { truth, earliest: early[8], settled: ai.y };
    });
    check("it is not standing on the answer just after the ball is struck",
      !!walk && Math.abs(walk.earliest - walk.truth) > 25,
      walk && `at tick 8 it is ${Math.abs(walk.earliest - walk.truth).toFixed(0)}px off`);

    // Turning every knob off must reproduce the old direct mover exactly, so any
    // of this can be isolated or backed out without editing code.
    const off = await aiRun(() => {
      const saved = { ...AI };
      Object.assign(AI, {
        reactionTicks: 0, lookaheadBounces: Infinity, resampleTicks: 1,
        resampleJitter: 0, readErrorFarPx: 0, readErrorNearPx: 0,
        readJitterPx: 0, aimSpread: 0, accelTicks: 0, brakeTicks: 1,
        panicSpeed: AI.speed,
      });
      cancelAnimationFrame(rafId);
      restart();
      phase = "play";
      ai.y = 0;
      ball = { x: 100, y: 300, vx: 5, vy: 0 };
      update();
      const step1 = ai.y;
      let guard = 0;
      while (ball.vx > 0 && guard++ < 500) update();
      const out = { step1, speed: AI.speed, vx: ball.vx, conceded: player.score };
      Object.assign(AI, saved);
      return out;
    });
    check("with every knob off it moves at full speed from the first tick",
      !!off && Math.abs(off.step1 - off.speed) < 1e-9, off && off.step1);
    check("and a perfect read intercepts the ball",
      !!off && off.vx < 0 && off.conceded === 0,
      off && `vx=${off.vx.toFixed(2)} conceded=${off.conceded}`);

    // A read bad enough still misses: the error is real, not decorative.
    const missed = await aiRun(() => {
      const saved = { ...AI };
      Object.assign(AI, { reactionTicks: 0, readJitterPx: 0, aimSpread: 0 });
      cancelAnimationFrame(rafId);
      restart();
      phase = "play";
      ai.y = 0;
      ball = { x: 100, y: 380, vx: 5, vy: 0 };
      update();
      aiErrorSign = -1;
      AI.readErrorFarPx = 400;
      AI.readErrorNearPx = 400;
      let guard = 0;
      while (player.score === 0 && guard++ < 500) update();
      const out = { scored: player.score };
      Object.assign(AI, saved);
      return out;
    });
    check("a bad enough read misses it", !!missed && missed.scored === 1,
      missed && missed.scored);

    // Its read tightens as the ball comes in, and stays loose for most of the
    // flight rather than tightening evenly - that is what stops it committing.
    const conv = await aiRun(() => {
      const saved = { ...AI };
      Object.assign(AI, { readJitterPx: 0, aimSpread: 0, lookaheadBounces: Infinity });
      cancelAnimationFrame(rafId);
      restart();
      phase = "play";
      const sample = (x) => {
        ball = { x, y: 200, vx: 6, vy: 0 };
        aiErrorSign = 1; // fix the direction so only the magnitude varies
        aiGlance();
        const truth = predictInterceptY(Infinity) + BALL_SIZE / 2 - PADDLE_HEIGHT / 2;
        return Math.abs(aiTarget - truth);
      };
      const out = {
        far: sample(PLAYER_PLANE + 10),
        mid: sample((PLAYER_PLANE + AI_PLANE) / 2),
        near: sample(AI_PLANE - 20),
      };
      Object.assign(AI, saved);
      return out;
    });
    check("its read tightens as the ball comes in",
      !!conv && conv.far > conv.mid && conv.mid > conv.near,
      conv && `${conv.far.toFixed(0)} -> ${conv.mid.toFixed(0)} -> ${conv.near.toFixed(0)}`);
    check("and is still well out halfway, rather than tightening evenly",
      !!conv && conv.mid > (conv.far + conv.near) / 2,
      conv && `${conv.mid.toFixed(0)} vs an even ${((conv.far + conv.near) / 2).toFixed(0)}`);
    check("but never becomes certain",
      !!conv && conv.near > 1, conv && conv.near.toFixed(1));

    // A slow ball is easy to follow; the paddle should look settled on it rather
    // than fidgeting the way it does under a fast one.
    const twitch = await aiRun(() => {
      const saved = { ...AI };
      Object.assign(AI, {
        readErrorFarPx: 0, readErrorNearPx: 0, lookaheadBounces: Infinity,
        aimSpread: 0,
      });
      cancelAnimationFrame(rafId);
      restart();
      phase = "play";
      const spreadAt = (speed) => {
        const seen = [];
        for (let i = 0; i < 300; i++) {
          ball = { x: 300, y: 200, vx: speed, vy: 0 };
          aiErrorSign = 0; // isolate the per-glance wobble
          aiGlance();
          seen.push(aiTarget);
        }
        return Math.max(...seen) - Math.min(...seen);
      };
      const out = { slow: spreadAt(BALL_SPEED), fast: spreadAt(BALL_SPEED_MAX) };
      Object.assign(AI, saved);
      return out;
    });
    check("it wobbles far less following a slow ball",
      !!twitch && twitch.slow < twitch.fast * 0.5,
      twitch && `${twitch.slow.toFixed(1)}px slow vs ${twitch.fast.toFixed(1)}px fast`);
    check("but still wobbles under a fast one", !!twitch && twitch.fast > 2,
      twitch && twitch.fast.toFixed(1));

    // Where on its paddle it aims is what varies the angle it returns at.
    const angles = {};
    for (const aim of hasAi ? [0.9, -0.9] : []) {
      angles[aim] = await aiRun((a) => {
        const saved = { ...AI };
        Object.assign(AI, {
          reactionTicks: 0, resampleTicks: 1, resampleJitter: 0,
          readErrorFarPx: 0, readErrorNearPx: 0, readJitterPx: 0,
          accelTicks: 0, brakeTicks: 1,
        });
        cancelAnimationFrame(rafId);
        restart();
        phase = "play";
        ai.y = 0;
        ball = { x: 100, y: 200, vx: 5, vy: 0 };
        update();
        aiAim = a;
        let guard = 0;
        while (ball.vx > 0 && guard++ < 500) { aiAim = a; update(); }
        const out = ball.vy;
        Object.assign(AI, saved);
        return out;
      }, aim);
    }
    check("aiming low returns the ball downward", angles[0.9] > 0, angles[0.9]);
    check("aiming high returns it upward", angles[-0.9] < 0, angles[-0.9]);
  }

  console.log("18. the ai is beatable, and competent");
  {
    // The one property that actually matters and that no other check reaches. It
    // caught a real regression: making the ai feel human took it from 91% to
    // saving every single shot, because a read that converges to near-certainty
    // plus a fast recovery means it always gets there in the end.
    const shots = 400;
    const saved = await page.evaluate((n) => {
      if (typeof AI === "undefined") return null;
      cancelAnimationFrame(rafId);
      let s = 0;
      for (let i = 0; i < n; i++) {
        restart();
        phase = "play";
        ai.y = (HEIGHT - PADDLE_HEIGHT) / 2;
        const angle = (Math.random() * 2 - 1) * (Math.PI / 3);
        const speed = 5 + Math.random() * 5;
        ball = { x: PLAYER_PLANE, y: Math.random() * (HEIGHT - BALL_SIZE),
                 vx: speed * Math.cos(angle), vy: speed * Math.sin(angle) };
        let guard = 0;
        while (ball.vx > 0 && player.score === 0 && guard++ < 800) update();
        if (player.score === 0) s++;
      }
      return s;
    }, shots);
    const rate = saved === null ? null : (100 * saved) / shots;
    // Deliberately a wide band. It is there to catch "unbeatable" and "hopeless",
    // not to pin a tuning value that is meant to be adjusted by feel.
    check("the ai misses some of what is thrown at it",
      rate !== null && rate < 98, rate !== null && `saves ${rate.toFixed(1)}%`);
    check("but saves most of it", rate !== null && rate > 80,
      rate !== null && `saves ${rate.toFixed(1)}%`);
  }

  // The mover has been characterised; hand the moves back.
  await page.evaluate((was) => {
    for (const m of MOVES) ABILITY[m].modes = was[m];
  }, savedModes);

  console.log("19. paddle collision is a crossing, not a position");
  {
    // Already past the plane when the paddle arrives. The old half-plane test
    // rescued this, because ball.x <= PADDLE_WIDTH stays true on the way out.
    await freeze();
    await set({ player: { y: 260 }, ball: { x: 1, y: 300, vx: -3, vy: 0 } });
    await step(1);
    const late = await read();
    check("a paddle arriving after the ball has passed does not save it",
      late.ai.score === 1, `score=${late.ai.score} vx=${late.ball.vx}`);

    // In place before the crossing: still an ordinary save.
    await freeze();
    await set({ player: { y: 260 }, ball: { x: 40, y: 300, vx: -6, vy: 0 } });
    await step(10);
    const good = await read();
    check("a paddle in place before the crossing still saves",
      good.ball.vx > 0 && good.ai.score === 0,
      `vx=${good.ball.vx} score=${good.ai.score}`);

    // The hit is judged where the path crossed the plane, not where the ball
    // finished the tick. vy is past the speed cap here on purpose: at real
    // speeds the gap between the two is only a few pixels, which is too small
    // to assert on cleanly but is exactly the band at the paddle ends where the
    // answer differs.
    await freeze();
    await set({ player: { y: 160 }, ball: { x: 16, y: 160, vx: -8, vy: 100 } });
    await step(1);
    const steep = await read();
    check("judged at the crossing point, not at the end of the tick",
      steep.ball.vx > 0, `vx=${steep.ball.vx} y=${steep.ball.y}`);
  }

  console.log("20. drawing, and containment under absurd input");
  {
    // draw() is otherwise almost untested: every case above freezes the loop, so
    // it only ever runs in the few frames before that. A throw in here would show
    // up as a dead board and nothing else would catch it.
    const drew = await page.evaluate(() => {
      const done = [];
      try {
        cancelAnimationFrame(rafId);
        restart(); draw(); done.push("serve");
        phase = "play";
        ball = { x: 10, y: 0, vx: 9, vy: -9 }; draw(); done.push("play, ball on a wall");
        phase = "countdown"; draw(); done.push("countdown");
        paused = true; draw(); done.push("paused");
        paused = false; gameOver = true; draw(); done.push("game over");
        gameOver = false;
        player.score = 12; ai.score = 9; draw(); done.push("two-digit scores");
        ai.y = 0; player.y = HEIGHT - PADDLE_HEIGHT; draw(); done.push("paddles at the edges");
        restart();
        return { ok: true, done };
      } catch (e) {
        return { ok: false, done, error: String(e) };
      }
    });
    check("draw survives every game state", drew.ok,
      drew.ok ? `${drew.done.length} states` : `failed after ${drew.done.length}: ${drew.error}`);

    // The wall bounce reflects the overshoot and clamps behind that. The clamp is
    // the thing standing between a bad velocity and a ball that leaves the board.
    await freeze();
    await set({ ball: { x: 300, y: 5, vx: 0, vy: -900 } });
    await step(1);
    const flung = (await read()).ball;
    check("an absurd upward velocity cannot throw the ball off the board",
      flung.y >= 0 && flung.y <= HEIGHT - BALL_SIZE, flung.y);
    await freeze();
    await set({ ball: { x: 300, y: HEIGHT - BALL_SIZE - 5, vx: 0, vy: 900 } });
    await step(1);
    const flung2 = (await read()).ball;
    check("nor an absurd downward one",
      flung2.y >= 0 && flung2.y <= HEIGHT - BALL_SIZE, flung2.y);
  }

  console.log("21. a whole game, end to end");
  {
    // Everything above forces state to reach a situation. Nothing plays the game.
    // This drives the real phase machine from the first serve to a win, with a
    // player that returns everything, so the ai has to concede WIN_SCORE times.
    const game = await page.evaluate((budget) => {
      cancelAnimationFrame(rafId);
      restart();
      const seen = new Set([phase]);
      let sawCountdown = false;
      let ticks = 0;
      document.getElementById("play").click(); // leaves the menu, enters "serve"
      seen.add(phase);
      serve(); // and the player presses Space
      while (!gameOver && ticks++ < budget) {
        // A player that never misses: park the paddle on the ball.
        player.y = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT,
          ball.y + BALL_SIZE / 2 - PADDLE_HEIGHT / 2));
        update();
        seen.add(phase);
        if (phase === "countdown") sawCountdown = true;
      }
      return { gameOver, ticks, phases: [...seen], sawCountdown,
               player: player.score, ai: ai.score, status: statusEl.textContent,
               heading: menuHeading.textContent };
    }, 200000);

    check("the game reaches a conclusion", game.gameOver, `after ${game.ticks} ticks`);
    check("someone reached the win score",
      Math.max(game.player, game.ai) === WIN_SCORE, `${game.player}-${game.ai}`);
    check("a player who returns everything wins", game.player === WIN_SCORE,
      `${game.player}-${game.ai}`);
    check("the ai does concede points in real play", game.player > 0);
    check("it passed through every phase",
      ["serve", "play", "countdown"].every((p) => game.phases.includes(p)),
      game.phases.join(", "));
    check("points did not chain without the pause between them", game.sawCountdown);
    check("the menu announces the result", /win|wins/i.test(game.heading),
      game.heading);
    check("and the status line is left to it", game.status.trim() === "",
      game.status);
  }

  console.log("22. restarting and pausing at awkward moments");
  {
    // Restart is otherwise only exercised from a finished game.
    await freeze();
    await set({ ball: { x: 200, y: 150, vx: 6, vy: 3 }, player: { y: 40 } });
    await step(5);
    await page.evaluate(() => { player.score = 3; ai.score = 2; restart(); });
    const mid = await read();
    check("restarting mid-rally clears the score",
      mid.player.score === 0 && mid.ai.score === 0,
      `${mid.player.score}-${mid.ai.score}`);
    check("and parks the ball", mid.ball.vx === 0 && isCentred(mid.ball),
      where(mid.ball));
    check("and returns to the menu",
      (await page.evaluate(() => phase)) === "menu" && await page.isVisible("#menu"),
      await page.evaluate(() => phase));

    // Pausing during the countdown must hold the countdown too, not just the ball.
    await freeze();
    await set({ player: { y: 0 }, ball: { x: 40, y: 300, vx: -6, vy: 0 } });
    await stepToScore(30);
    check("preconditions: mid-countdown",
      (await page.evaluate(() => phase)) === "countdown");
    const before = await page.evaluate(() => serveTicks);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(60);
    await step(20);
    check("the serve countdown holds while paused",
      (await page.evaluate(() => serveTicks)) === before,
      `${before} -> ${await page.evaluate(() => serveTicks)}`);
    check("and the game has not served itself",
      (await page.evaluate(() => phase)) === "countdown");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(60);
    await step(before + 2);
    check("resuming lets it finish counting down and serve",
      (await page.evaluate(() => phase)) === "play",
      await page.evaluate(() => phase));
  }

  console.log("23. the difficulty menu");
  {
    await page.evaluate(() => restart());
    check("Restart brings the menu back", await page.isVisible("#menu"));
    const checked = () => page.evaluate(() =>
      [...document.querySelectorAll("#difficulty [data-level]")]
        .filter((b) => b.getAttribute("aria-checked") === "true")
        .map((b) => b.dataset.level));
    check("exactly one difficulty is selected", (await checked()).length === 1,
      (await checked()).join(","));

    await page.click('#difficulty [data-level="assisted"]');
    check("clicking one selects it", (await checked())[0] === "assisted",
      (await checked()).join(","));
    check("and deselects the others", (await checked()).length === 1);
    check("selecting does not start the game",
      (await page.evaluate(() => phase)) === "menu" && await page.isVisible("#menu"));
    check("it actually reaches the ai",
      (await page.evaluate(() => AI.reactionTicks))
        === (await page.evaluate(() => DIFFICULTY.assisted.ai.reactionTicks)));

    await page.click("#play");
    await page.waitForTimeout(80);
    check("Play hides the menu", !(await page.isVisible("#menu")));
    check("and drops into the serve prompt, not a live ball",
      (await page.evaluate(() => phase)) === "serve",
      await page.evaluate(() => phase));
    check("with the ball still parked",
      (await page.evaluate(() => ball.vx)) === 0);
    check("Space now serves rather than re-pressing Play", await (async () => {
      await page.keyboard.press("Space");
      await page.waitForTimeout(80);
      return (await page.evaluate(() => phase)) === "play";
    })());

    // The choice survives a reload.
    await page.reload();
    await page.waitForSelector("#board");
    check("the choice is remembered across a reload",
      (await page.evaluate(() => difficulty)) === "assisted",
      await page.evaluate(() => difficulty));
    check("and the button shows it", (await checked())[0] === "assisted");

    // ...and an unavailable localStorage falls back rather than throwing.
    const blocked = await browser.newPage();
    await blocked.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() { throw new Error("site data blocked"); },
      });
    });
    const blockedErrors = [];
    blocked.on("pageerror", (e) => blockedErrors.push(String(e)));
    await blocked.goto(PAGE);
    await blocked.waitForSelector("#board");
    check("a blocked localStorage does not break the page",
      blockedErrors.length === 0, blockedErrors.join("; "));
    check("and falls back to the default difficulty",
      (await blocked.evaluate(() => difficulty)) === "normal",
      await blocked.evaluate(() => difficulty));
    await blocked.close();

    // The presets have to differ in the direction they claim to.
    await page.evaluate(() => { localStorage.removeItem("pong.difficulty"); });
    const rates = await page.evaluate((n) => {
      cancelAnimationFrame(rafId);
      const saved = { ...AI };
      const out = {};
      for (const level of Object.keys(DIFFICULTY)) {
        applyDifficulty(level);
        let s = 0;
        for (let i = 0; i < n; i++) {
          restart();
          phase = "play";
          ai.y = (HEIGHT - PADDLE_HEIGHT) / 2;
          const a = (Math.random() * 2 - 1) * (Math.PI / 3);
          const sp = 5 + Math.random() * 5;
          ball = { x: PLAYER_PLANE, y: Math.random() * (HEIGHT - BALL_SIZE),
                   vx: sp * Math.cos(a), vy: sp * Math.sin(a) };
          let g = 0;
          while (ball.vx > 0 && player.score === 0 && g++ < 800) update();
          if (player.score === 0) s++;
        }
        out[level] = (100 * s) / n;
      }
      Object.assign(AI, saved);
      return out;
    }, 600);
    const shown = Object.entries(rates)
      .map(([k, v]) => `${k} ${v.toFixed(0)}%`).join(", ");
    // Each mode plays its own ball now, so these are not on one scale and the
    // old "harder saves more" ordering across all three would be comparing
    // different games. What still has to be true is that the mode you are meant
    // to play is winnable, and that the joke mode is harder than it.
    check("Normal is genuinely beatable", rates.normal < 93, shown);
    check("Normal is not a walkover either", rates.normal > 70, shown);
    check("Insane is harder than Normal", rates.insane > rates.normal, shown);
    await page.evaluate(() => { restart(); applyDifficulty("normal"); });
  }

  console.log("24. Play starts a match, including after one has ended");
  {
    // Nothing is frozen here on purpose. The failure this guards against was the
    // loop having stopped itself, which a harness holding rafId hides completely.
    await page.reload();
    await page.waitForSelector("#board");
    await page.click("#play");

    // Win the game the way one is actually won: hand the last point to the live
    // loop rather than setting gameOver by hand, so the loop really does stop.
    await page.evaluate(() => {
      player.score = WIN_SCORE - 1;
      phase = "play";
      ball = { x: WIDTH - 2, y: HEIGHT / 2, vx: 30, vy: 0 };
    });
    await page.waitForFunction(() => gameOver === true, null, { timeout: 2000 });
    check("the menu returns when the game ends", await page.isVisible("#menu"));
    check("with the result in its heading",
      (await page.textContent("#menu-heading")).includes("win"),
      await page.textContent("#menu-heading"));
    check("and the loop has stopped scheduling frames",
      (await page.evaluate(() => running)) === false);

    await page.click("#play");
    const s24 = await page.evaluate(() => ({
      gameOver, phase, paused,
      score: `${player.score}-${ai.score}`,
      status: document.getElementById("status").textContent.trim(),
      menuHidden: document.getElementById("menu").hidden,
    }));
    check("Play clears the finished game", s24.gameOver === false, s24.gameOver);
    check("and resets the score", s24.score === "0-0", s24.score);
    check("and hides the menu", s24.menuHidden === true);
    check("and drops into the serve prompt", s24.phase === "serve", s24.phase);
    check("and stops claiming somebody won",
      !s24.status.includes("win"), s24.status);
    check("the live region resets too",
      (await readerText()) === "You 0, AI 0", await readerText());

    // The outcome that actually matters: the board is alive again.
    await page.keyboard.press("Space");
    const before24 = await page.evaluate(() => ball.x);
    await page.waitForTimeout(300);
    const after24 = await page.evaluate(() => ball.x);
    check("the ball is live again after Play",
      after24 !== before24, `${before24} -> ${after24}`);

    // Play from the load menu must still be a fresh match, not a reset of one
    // already in progress - the case that was working before and is easy to break.
    await page.reload();
    await page.waitForSelector("#board");
    await page.click("#play");
    await page.keyboard.press("Space");
    await page.waitForTimeout(200);
    check("Play from the load menu still starts a rally",
      (await page.evaluate(() => phase)) === "play",
      await page.evaluate(() => phase));
  }

  console.log("25. the joke modes, and a configurable win score");
  {
    await page.reload();
    await page.waitForSelector("#board");
    const levels = () => page.evaluate(() =>
      [...document.querySelectorAll("#difficulty [data-level]")].map((b) => b.dataset.level));
    check("three difficulties are offered",
      (await levels()).join(",") === "assisted,normal,insane",
      (await levels()).join(","));

    // Normal is the only mode with no `game` half, which is what makes it the
    // one with no handicap on either side: stock ball, stock paddles.
    const ballOf = (level) => page.evaluate((l) => {
      applyDifficulty(l);
      return { speed: BALL_SPEED, max: BALL_SPEED_MAX,
               player: PLAYER_PADDLE_SCALE, ai: AI_PADDLE_SCALE };
    }, level);
    const mid = [await ballOf("normal")];
    check("Normal plays the stock ball and stock paddles",
      await page.evaluate((b) => b.speed === GAME_DEFAULTS.BALL_SPEED
        && b.max === GAME_DEFAULTS.BALL_SPEED_MAX
        && b.player === 1 && b.ai === 1, mid[0]),
      JSON.stringify(mid[0]));

    const assisted = await ballOf("assisted");
    const insane = await ballOf("insane");
    check("Assisted slows the ball down",
      assisted.speed < mid[0].speed && assisted.max < mid[0].max,
      JSON.stringify(assisted));
    check("Insane speeds it up",
      insane.speed > mid[0].speed && insane.max > mid[0].max,
      JSON.stringify(insane));

    // The failure this guards: applyGame writing only the overridden fields would
    // leave Insane's ball behind when you switched back down.
    const back = await ballOf("normal");
    check("switching back off Insane restores the default ball",
      back.speed === mid[0].speed && back.max === mid[0].max,
      JSON.stringify(back));
    check("and does not leave junk on the ai",
      (await page.evaluate(() => AI.speed)) === (await page.evaluate(() => AI_DEFAULTS.speed)));

    // Insane must stay beatable in principle. An ai that never misses means the
    // player can never take a point, so the match can only ever be lost.
    const insaneSaves = await page.evaluate((n) => {
      cancelAnimationFrame(rafId);
      applyDifficulty("insane");
      let saves = 0;
      for (let i = 0; i < n; i++) {
        restart();
        phase = "play";
        ai.y = (HEIGHT - PADDLE_HEIGHT) / 2;
        const a = (Math.random() * 2 - 1) * MAX_BOUNCE_ANGLE;
        const sp = BALL_SPEED + Math.random() * (BALL_SPEED_MAX - BALL_SPEED);
        ball = { x: PLAYER_PLANE, y: Math.random() * (HEIGHT - BALL_SIZE),
                 vx: sp * Math.cos(a), vy: sp * Math.sin(a) };
        let g = 0;
        while (ball.vx > 0 && player.score === 0 && g++ < 800) update();
        if (player.score === 0) saves++;
      }
      return (100 * saves) / n;
    }, 900);
    check("Insane is brutal", insaneSaves > 90, `${insaneSaves.toFixed(1)}%`);
    // The sample is 900 rather than 400 because this is the check that would
    // flake: Insane really does save ~99%, so a smaller run of pure saves is a
    // coin toss that reads as a softlock. Blink now lasting the whole flight
    // pushed it close enough to matter.
    check("but not literally unbeatable", insaneSaves < 100, `${insaneSaves.toFixed(1)}%`);

    // --- win score ---------------------------------------------------------
    await page.reload();
    await page.waitForSelector("#board");
    const scoreBtns = () => page.evaluate(() =>
      [...document.querySelectorAll("#win-score-choice [data-score]")]
        .filter((b) => b.getAttribute("aria-checked") === "true")
        .map((b) => b.dataset.score));
    check("exactly one win score is selected", (await scoreBtns()).length === 1,
      (await scoreBtns()).join(","));
    check("the ? panel states it",
      (await page.textContent("#win-score")) === (await scoreBtns())[0],
      await page.textContent("#win-score"));

    await page.click('#win-score-choice [data-score="11"]');
    check("clicking one selects it", (await scoreBtns())[0] === "11");
    check("and the ? panel follows it rather than staying at load-time",
      (await page.textContent("#win-score")) === "11",
      await page.textContent("#win-score"));
    check("choosing does not start the game",
      (await page.evaluate(() => phase)) === "menu");

    await page.click("#play");
    const at5 = await page.evaluate(() => {
      cancelAnimationFrame(rafId);
      player.score = 4;
      phase = "play";
      ball = { x: WIDTH - 2, y: HEIGHT / 2, vx: 30, vy: 0 };
      update();
      return { score: player.score, gameOver };
    });
    check("first to 11 does not end at 5", at5.score === 5 && !at5.gameOver,
      JSON.stringify(at5));
    const at11 = await page.evaluate(() => {
      player.score = 10;
      phase = "play";
      ball = { x: WIDTH - 2, y: HEIGHT / 2, vx: 30, vy: 0 };
      update();
      return { score: player.score, gameOver };
    });
    check("and does end at 11", at11.score === 11 && at11.gameOver,
      JSON.stringify(at11));

    await page.reload();
    await page.waitForSelector("#board");
    check("the win score survives a reload",
      (await page.evaluate(() => WIN_SCORE)) === 11,
      await page.evaluate(() => WIN_SCORE));

    const noStore = await browser.newPage();
    await noStore.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() { throw new Error("site data blocked"); },
      });
    });
    const noStoreErrors = [];
    noStore.on("pageerror", (e) => noStoreErrors.push(String(e)));
    await noStore.goto(PAGE);
    await noStore.waitForSelector("#board");
    check("a blocked localStorage still does not break the page",
      noStoreErrors.length === 0, noStoreErrors.join("; "));
    check("and the win score falls back to the default",
      (await noStore.evaluate(() => WIN_SCORE)) === 5,
      await noStore.evaluate(() => WIN_SCORE));
    await noStore.close();

    await page.evaluate(() => {
      localStorage.removeItem("pong.winScore");
      localStorage.removeItem("pong.difficulty");
    });
  }

  console.log("26. abilities");
  {
    await page.reload();
    await page.waitForSelector("#board");
    // Every case sets up its own position, so the loop stays frozen throughout.
    const setup = (level) => page.evaluate((l) => {
      cancelAnimationFrame(rafId);
      applyDifficulty(l);
      restart();
      document.getElementById("menu").hidden = true;
      phase = "play";
    }, level);

    // Every mode has moves now, so the gate that matters is which ones. Assisted
    // is the player's mode: it must never get the opponent's three.
    await setup("assisted");
    const inAssisted = await page.evaluate(() =>
      MOVES.filter((name) => armMove(name)));
    check("Assisted gets your moves and not the opponent's",
      inAssisted.join(",") === "expand,clutch", inAssisted.join(","));

    await setup("normal");
    const inNormal = await page.evaluate(() =>
      MOVES.filter((name) => armMove(name)));
    check("Normal gets all five", inNormal.length === 5, inNormal.join(","));

    // --- blink -------------------------------------------------------------
    await setup("insane");
    const blink = await page.evaluate(() => {
      ball = { x: 200, y: 200, vx: 6, vy: 0 };
      ai.y = 160;
      armMove("blink");
      const seen = [];
      for (let i = 0; i < 60; i++) { update(); seen.push(ai.y); }
      const jumps = seen.slice(1).map((v, i) => Math.abs(v - seen[i]));
      return { biggest: Math.max(...jumps), reachable: AI.panicSpeed,
               onBoard: seen.every((y) => y >= 0 && y <= HEIGHT - ai.h) };
    });
    check("blink moves the paddle further than it could ever travel",
      blink.biggest > blink.reachable * 3, `${blink.biggest.toFixed(0)}px/tick`);
    check("and never leaves the board", blink.onBoard);

    // It is supposed to be nearly unbeatable while it lasts - that is the joke.
    const blinkSaves = await page.evaluate((n) => {
      let saved = 0;
      for (let i = 0; i < n; i++) {
        restart();
        document.getElementById("menu").hidden = true;
        phase = "play";
        const a = (Math.random() * 2 - 1) * MAX_BOUNCE_ANGLE;
        const sp = BALL_SPEED + Math.random() * (BALL_SPEED_MAX - BALL_SPEED);
        ball = { x: PLAYER_PLANE, y: Math.random() * (HEIGHT - BALL_SIZE),
                 vx: sp * Math.cos(a), vy: sp * Math.sin(a) };
        moveState.blink.cooldown = 0;
        armMove("blink");
        let g = 0;
        while (ball.vx > 0 && player.score === 0 && g++ < 800) update();
        if (player.score === 0) saved++;
      }
      return (100 * saved) / n;
    }, 120);
    check("blink saves nearly everything it is used on", blinkSaves > 90,
      `${blinkSaves.toFixed(0)}%`);

    // --- overdrive ---------------------------------------------------------
    await setup("insane");
    const od = await page.evaluate(() => {
      ball = { x: AI_PLANE - 5, y: 200, vx: 8, vy: 0 };
      ai.y = 200 - ai.h / 2;
      armMove("overdrive");
      const effectDuringTelegraph = [];
      while (moveState.overdrive.phase === "telegraph") {
        effectDuringTelegraph.push(Math.hypot(ball.vx, ball.vy));
        tickAbilities();
      }
      const before = Math.hypot(ball.vx, ball.vy);
      update();
      return { before, after: Math.hypot(ball.vx, ball.vy), cap: BALL_SPEED_MAX,
               spent: moveState.overdrive.phase,
               telegraphTicks: effectDuringTelegraph.length,
               unchangedWhileCharging:
                 effectDuringTelegraph.every((v) => v === effectDuringTelegraph[0]) };
    });
    check("overdrive returns the ball above the normal speed cap",
      od.after > od.cap, `${od.after.toFixed(1)} vs cap ${od.cap}`);
    check("and it is faster than the shot that arrived", od.after > od.before);
    check("it is spent on contact rather than lingering", od.spent === "idle", od.spent);
    check("and the telegraph is a warning, not an effect",
      od.telegraphTicks > 0 && od.unchangedWhileCharging, od.telegraphTicks);

    // --- squeeze -----------------------------------------------------------
    await setup("insane");
    const sq = await page.evaluate(() => {
      const base = player.h;
      armMove("squeeze");
      while (moveState.squeeze.phase === "telegraph") update();
      const first = player.h;
      for (let i = 0; i < 80; i++) update();
      const settled = player.h;
      while (moveState.squeeze.phase === "active") update();
      for (let i = 0; i < 120; i++) update();
      return { base, first, settled, restored: player.h,
               target: PADDLE_HEIGHT * ABILITY.squeeze.scale };
    });
    check("squeeze shrinks your paddle", sq.settled < sq.base,
      `${sq.base} -> ${sq.settled.toFixed(1)}`);
    check("it eases rather than snapping to the new size",
      sq.first > sq.settled && sq.first < sq.base,
      `first tick ${sq.first.toFixed(1)} of ${sq.base} -> ${sq.target}`);
    check("and it wears off", Math.abs(sq.restored - sq.base) < 0.5,
      sq.restored.toFixed(1));

    // --- expand ------------------------------------------------------------
    await setup("assisted");
    const ex = await page.evaluate(() => {
      const base = player.h;
      // Returning the ball well must NOT earn it: the paddle is mercy, not a
      // reward. A long rally used to hand it over twice while the player was
      // comfortably winning the point.
      const rallied = [];
      for (let i = 0; i < 8; i++) {
        onPlayerReturn(player.y + player.h / 2);
        rallied.push(moveState.expand.phase);
      }
      const fromRallying = rallied.every((ph) => ph === "idle");
      armMove("expand");
      for (let i = 0; i < 120; i++) update();
      return { base, fromRallying, grown: player.h,
               target: PADDLE_HEIGHT * ABILITY.expand.scale };
    });
    check("rallying well never earns a bigger paddle", ex.fromRallying);
    check("and it actually grows when it is earned", ex.grown > ex.base,
      `${ex.base} -> ${ex.grown.toFixed(1)}`);

    // The score gap holds the paddle rather than firing it once: it comes at the
    // configured gap and goes when the gap is smaller, however long that takes.
    await setup("assisted");
    const behind = await page.evaluate(() => {
      const gap = ABILITY.expand.behindToTrigger;
      const concede = () => {
        phase = "play";
        ball = { x: -1, y: 200, vx: -5, vy: 0 };
        update();
      };
      const win = () => {
        phase = "play";
        ball = { x: WIDTH + 1, y: 200, vx: 5, vy: 0 };
        update();
      };
      const seen = [];
      player.score = 0; ai.score = 0;
      for (let i = 0; i < gap; i++) {
        concede();
        seen.push({ gap: ai.score - player.score, phase: moveState.expand.phase });
      }
      // Survives a long wait at the same gap - nothing about it is timed. The
      // phase is parked so the wait does not play the rest of the match out.
      phase = "serve";
      for (let i = 0; i < 2000; i++) update();
      const afterAges = moveState.expand.phase;
      const sizeWhileBehind = player.h;
      win();                       // gap closes to one short of the threshold
      const afterClosing = { gap: ai.score - player.score,
                             phase: moveState.expand.phase };
      for (let i = 0; i < 120; i++) update();
      return { seen, afterAges, sizeWhileBehind, afterClosing,
               sizeAfter: player.h, base: baseHeight(player), gap };
    });
    check("a gap one short of the threshold does nothing",
      behind.seen.slice(0, -1).every((st) => st.phase === "idle"),
      behind.seen.map((st) => `${st.gap}:${st.phase}`).join(" "));
    check("reaching it brings the paddle out",
      behind.seen[behind.seen.length - 1].phase !== "idle",
      behind.seen.map((st) => `${st.gap}:${st.phase}`).join(" "));
    check("and it does not time out while the gap stands",
      behind.afterAges !== "idle", behind.afterAges);
    check("closing the gap takes it away",
      behind.afterClosing.phase === "idle",
      `gap ${behind.afterClosing.gap}, ${behind.afterClosing.phase}`);
    check("and the paddle actually returns to normal",
      behind.sizeWhileBehind > behind.base
        && Math.abs(behind.sizeAfter - behind.base) < 0.5,
      `${behind.sizeWhileBehind.toFixed(1)} -> ${behind.sizeAfter.toFixed(1)}`);

    // A losing run earns it independently of the score gap, so the test zeroes the
    // behind trigger - otherwise either one passing would look like both working.
    await setup("assisted");
    const run = await page.evaluate(() => {
      const savedBehind = ABILITY.expand.behindToTrigger;
      ABILITY.expand.behindToTrigger = 0;
      const concede = () => {
        phase = "play";
        ball = { x: -1, y: 200, vx: -5, vy: 0 };
        update();
      };
      const win = () => {
        phase = "play";
        ball = { x: WIDTH + 1, y: 200, vx: 5, vy: 0 };
        update();
      };
      // Two on the trot is not enough.
      resetAbilities();
      player.score = 0; ai.score = 0;
      concede(); concede();
      const afterTwo = moveState.expand.phase;
      // A point of your own wipes the run.
      win();
      concede(); concede();
      const afterBreak = moveState.expand.phase;
      // Three in a row does it.
      resetAbilities();
      player.score = 0; ai.score = 0;
      concede(); concede(); concede();
      const afterThree = moveState.expand.phase;
      // It holds while the run stands rather than paying out and clearing.
      phase = "serve";
      for (let i = 0; i < 2000; i++) update();
      const afterAges = moveState.expand.phase;
      const runStanding = concededStreak;
      concede();
      const afterFourth = moveState.expand.phase;
      win();
      const afterWinning = moveState.expand.phase;
      ABILITY.expand.behindToTrigger = savedBehind;
      return { afterTwo, afterBreak, afterThree, afterAges, runStanding,
               afterFourth, afterWinning };
    });
    check("two points lost on the trot is not enough",
      run.afterTwo === "idle", run.afterTwo);
    check("and winning one wipes the run", run.afterBreak === "idle",
      run.afterBreak);
    check("three lost in a row earns a bigger paddle",
      run.afterThree !== "idle", run.afterThree);
    check("and the run is not cleared by paying out",
      run.runStanding >= 3, run.runStanding);
    check("the paddle holds while the run stands",
      run.afterAges !== "idle" && run.afterFourth !== "idle",
      `${run.afterAges}/${run.afterFourth}`);
    check("and winning a point takes it away",
      run.afterWinning === "idle", run.afterWinning);

    // --- clutch ------------------------------------------------------------
    await setup("assisted");
    const clutch = await page.evaluate(() => {
      const steps = [];
      for (let i = 0; i < ABILITY.clutch.segments; i++) {
        onPlayerReturn(player.y + player.h - 1);       // caught on the very end
        steps.push({ meter: clutchCharge, phase: moveState.clutch.phase });
      }
      resetAbilities();
      const centres = [];
      for (let i = 0; i < ABILITY.clutch.segments + 1; i++) {
        onPlayerReturn(player.y + player.h / 2);       // dead centre
        centres.push(clutchCharge);
      }
      return { steps, centres, segments: ABILITY.clutch.segments };
    });
    check("a close call fills a segment rather than charging outright",
      clutch.steps[0].meter === 1 && clutch.steps[0].phase === "idle",
      JSON.stringify(clutch.steps[0]));
    check("the meter fills one segment at a time",
      clutch.steps.slice(0, -1).every((st, i) => st.meter === i + 1),
      clutch.steps.map((st) => st.meter).join(","));
    check("filling it charges the shot and empties the meter",
      clutch.steps[clutch.steps.length - 1].phase !== "idle"
        && clutch.steps[clutch.steps.length - 1].meter === 0,
      JSON.stringify(clutch.steps[clutch.steps.length - 1]));
    check("catching it dead centre never fills anything",
      clutch.centres.every((m) => m === 0), clutch.centres.join(","));

    // The band is a fraction of the paddle's BASE size, not its current one, so
    // an active Expand must not widen the band that earns the next charge.
    await setup("assisted");
    const band = await page.evaluate(() => {
      // rel is how far down the paddle the ball's centre landed.
      const hitAt = (rel) => {
        resetAbilities();
        onPlayerReturn(player.y + rel - BALL_SIZE / 2);
        return clutchCharge;
      };
      const base = baseHeight(player);
      const edge = base * ABILITY.clutch.edgeFraction;
      const inside = hitAt(edge - 2);
      const outside = hitAt(edge + 2);
      // Now grow the paddle and retest a point that only counts if the band grew
      // with it.
      resetAbilities();
      armMove("expand");
      for (let i = 0; i < 120; i++) update();
      const grownEdge = player.h * ABILITY.clutch.edgeFraction;
      const betweenTheTwo = hitAt((edge + grownEdge) / 2);
      return { base, edge, grown: player.h, grownEdge, inside, outside,
               betweenTheTwo };
    });
    check("a hit inside the band fills a segment", band.inside === 1,
      `${band.edge.toFixed(1)}px band, got ${band.inside}`);
    check("and a hit just outside it does not", band.outside === 0, band.outside);
    check("the band does not grow when the paddle does",
      band.betweenTheTwo === 0,
      `base band ${band.edge.toFixed(1)}px, paddle ${band.grown.toFixed(0)}px ` +
      `would give ${band.grownEdge.toFixed(1)}px`);

    // Filling a pip has to be visible where the player is looking, and completing
    // the meter runs a sequence the paddle waits for.
    await setup("assisted");
    const fx = await page.evaluate(() => {
      phase = "serve";                       // park the ball; only time passes
      player.y = 150;
      const pipPx = (i) => {
        const x = METER.x + i * (METER.w + METER.gap) + METER.w / 2;
        const d = ctx.getImageData(Math.round(x),
          Math.round(METER.y + METER.h / 2), 1, 1).data;
        return [d[0], d[1], d[2]];
      };
      const paddleGlows = () => {
        const d = ctx.getImageData(PADDLE_WIDTH + 5,
          Math.round(player.y + player.h / 2), 1, 1).data;
        return `${d[0]},${d[1]},${d[2]}` !== "255,255,255";
      };
      const edgeHit = () => onPlayerReturn(player.y + 2 - BALL_SIZE / 2);

      // One close call.
      resetAbilities();
      edgeHit();
      draw();
      const atFill = pipPx(0);
      const burst = paddleFlash.t;
      for (let i = 0; i < ABILITY.pop.pipTicks + 2; i++) update();
      draw();
      const settled = pipPx(0);

      // Complete it, and watch when the paddle owns up.
      resetAbilities();
      clutchCharge = ABILITY.clutch.segments - 1;
      edgeHit();
      const armedAtOnce = moveState.clutch.phase;
      const during = [];
      let guard = 0;
      while (meterSeq >= 0 && guard++ < 400) {
        draw();
        during.push(paddleGlows());
        update();
      }
      draw();
      const afterSeq = paddleGlows();

      // Spending it mid-sequence must call the celebration off.
      resetAbilities();
      clutchCharge = ABILITY.clutch.segments - 1;
      edgeHit();
      const seqRunning = meterSeq >= 0;
      phase = "play";
      ball = { x: PLAYER_PLANE + 1, y: player.y + player.h / 2,
               vx: -BALL_SPEED, vy: 0 };
      update();
      return { atFill, settled, burst, armedAtOnce, during, afterSeq,
               seqRunning, seqAfterSpend: meterSeq,
               spentPhase: moveState.clutch.phase, guard };
    });
    const white = (c) => c[0] > 230 && c[1] > 230 && c[2] > 230;
    check("a filling pip flashes white rather than just turning green",
      white(fx.atFill) && !white(fx.settled),
      `${fx.atFill.join(",")} -> ${fx.settled.join(",")}`);
    check("and the paddle bursts at the point of contact", fx.burst > 0, fx.burst);
    check("completing the meter arms the charge immediately",
      fx.armedAtOnce === "active", fx.armedAtOnce);
    check("but the paddle stays quiet for the whole celebration",
      fx.during.length > 10 && fx.during.every((g) => g === false),
      `${fx.during.length} ticks, ${fx.during.filter(Boolean).length} glowing`);
    check("and lights up the moment it ends", fx.afterSeq === true, fx.afterSeq);
    check("spending the charge mid-celebration calls it off",
      fx.seqRunning && fx.seqAfterSpend === -1 && fx.spentPhase === "idle",
      `${fx.seqAfterSpend}, ${fx.spentPhase}`);

    // Read the canvas rather than the state: a meter nobody can see is the exact
    // problem this replaced.
    const pips = await page.evaluate(() => {
      const at = (i) => {
        const x = METER.x + i * (METER.w + METER.gap) + METER.w / 2;
        const d = ctx.getImageData(Math.round(x),
          Math.round(METER.y + METER.h / 2), 1, 1).data;
        return `${d[0]},${d[1]},${d[2]}`;
      };
      const snap = () => { draw(); return [at(0), at(1), at(2)]; };
      applyDifficulty("assisted");
      restart();
      document.getElementById("menu").hidden = true;
      phase = "play";
      const empty = snap();
      clutchCharge = 2;
      const two = snap();
      clutchCharge = 0;
      armMove("clutch");
      const charged = snap();
      applyDifficulty("insane");
      restart();
      document.getElementById("menu").hidden = true;
      phase = "play";
      return { empty, two, charged, absent: snap() };
    });
    check("an empty meter paints no filled pips",
      new Set(pips.empty).size === 1, pips.empty.join(" | "));
    check("two close calls light exactly two pips",
      pips.two[0] === pips.two[1] && pips.two[2] === pips.empty[2]
        && pips.two[0] !== pips.empty[0], pips.two.join(" | "));
    check("a charged shot lights all three",
      new Set(pips.charged).size === 1 && pips.charged[0] !== pips.empty[0],
      pips.charged.join(" | "));
    check("and no meter is drawn in a mode that has no clutch",
      pips.absent.join() === pips.empty.join(), pips.absent.join(" | "));

    // Expand recolours the paddle and does nothing else. A glow bleeds outside the
    // paddle rect, so sampling just past its edge is what separates the two tells.
    const tells = await page.evaluate(() => {
      applyDifficulty("assisted");
      restart();
      document.getElementById("menu").hidden = true;
      phase = "play";
      player.y = 150;
      const inside = () => {
        const d = ctx.getImageData(PADDLE_WIDTH - 3,
          Math.round(player.y + player.h / 2), 1, 1).data;
        return `${d[0]},${d[1]},${d[2]}`;
      };
      const justOutside = () => {
        const d = ctx.getImageData(PADDLE_WIDTH + 5,
          Math.round(player.y + player.h / 2), 1, 1).data;
        return `${d[0]},${d[1]},${d[2]}`;
      };
      const topEdgeOver = (n) => {
        const seen = new Set();
        for (let i = 0; i < n; i++) { update(); draw(); seen.add(inside()); }
        return seen.size;
      };

      draw();
      const plain = { in: inside(), out: justOutside() };

      armMove("expand");
      while (moveState.expand.phase !== "active") update();
      for (let i = 0; i < 60; i++) update();
      draw();
      const grown = player.h;
      const ex = { in: inside(), out: justOutside(), steady: topEdgeOver(20) };

      resetAbilities();
      restart();
      document.getElementById("menu").hidden = true;
      phase = "play";
      player.y = 150;
      armMove("clutch");
      update();
      draw();
      const cl = { in: inside(), out: justOutside() };

      // Both at once: the charge must still be the thing you see.
      resetAbilities();
      armMove("expand");
      while (moveState.expand.phase !== "active") update();
      armMove("clutch");
      for (let i = 0; i < 40; i++) update();
      draw();
      const both = justOutside();
      return { plain, ex, cl, both, grown, base: PADDLE_HEIGHT };
    });
    check("expand recolours the paddle", tells.ex.in !== tells.plain.in,
      `${tells.plain.in} -> ${tells.ex.in}`);
    check("and grows it", tells.grown > tells.base,
      `${tells.base} -> ${tells.grown.toFixed(1)}`);
    check("but casts no glow past its own edge",
      tells.ex.out === tells.plain.out,
      `${tells.ex.out} vs plain ${tells.plain.out}`);
    check("and does not twitch", tells.ex.steady === 1, tells.ex.steady);
    check("a held charge still glows past the edge",
      tells.cl.out !== tells.plain.out,
      `${tells.cl.out} vs plain ${tells.plain.out}`);
    check("and is not masked by an active expand",
      tells.both !== tells.plain.out, tells.both);

    // Through a real collision rather than by calling onPlayerReturn: if the hook
    // ran before the bounce, the close call would spend the charge on the very
    // hit that earned it and the player would never see it.
    await setup("assisted");
    const earned = await page.evaluate(() => {
      clutchCharge = ABILITY.clutch.segments - 1;   // one close call from full
      player.y = 150;
      ball = { x: PLAYER_PLANE + 4, y: player.y + player.h - BALL_SIZE,
               vx: -6, vy: 0 };
      update();
      return { phase: moveState.clutch.phase, bounced: ball.vx > 0 };
    });
    check("a real edge save leaves the charge in hand, not spent on itself",
      earned.bounced && earned.phase !== "idle", JSON.stringify(earned));

    // The charged shot is the drama, so it must not depend on what arrived: it
    // used to scale off the incoming ball, which meant a charge earned on a slow
    // rally fired a slow "dramatic" shot.
    const charged = await page.evaluate(() => {
      const fire = (incoming) => {
        restart();
        document.getElementById("menu").hidden = true;
        phase = "play";
        moveState.clutch.cooldown = 0;
        armMove("clutch");
        ball = { x: PLAYER_PLANE + 1, y: player.y + player.h / 2,
                 vx: -incoming, vy: 0 };
        update();
        return Math.hypot(ball.vx, ball.vy);
      };
      const slow = fire(BALL_SPEED);
      const fast = fire(BALL_SPEED_MAX);
      return { slow, fast, cap: BALL_SPEED_MAX,
               expected: BALL_SPEED_MAX * ABILITY.clutch.chargedMultiplier };
    });
    check("a charged shot leaves far above the mode's own speed cap",
      charged.slow > charged.cap * 2,
      `${charged.slow.toFixed(1)} vs cap ${charged.cap}`);
    check("and at the same speed however slowly the ball arrived",
      Math.abs(charged.slow - charged.fast) < 1e-9,
      `${charged.slow.toFixed(1)} / ${charged.fast.toFixed(1)}`);

    // One shot, not a lasting change to the rally.
    await setup("assisted");
    const decayed = await page.evaluate(() => {
      armMove("clutch");
      ball = { x: PLAYER_PLANE + 1, y: player.y + player.h / 2,
               vx: -BALL_SPEED, vy: 0 };
      update();
      const outgoing = Math.hypot(ball.vx, ball.vy);
      let guard = 0;
      while (ball.vx > 0 && guard++ < 400) {
        ai.y = ball.y - ai.h / 2;      // make sure the opponent gets to it
        clampPaddle(ai);
        update();
      }
      return { outgoing, returned: Math.hypot(ball.vx, ball.vy),
               cap: BALL_SPEED_MAX };
    });
    check("if the opponent returns it the ball comes back at ordinary speed",
      decayed.returned <= decayed.cap + 1e-9 && decayed.outgoing > decayed.cap,
      `${decayed.outgoing.toFixed(1)} out, ${decayed.returned.toFixed(1)} back`);

    // The glow is a promise, and it has to wait for you to cash it.
    await setup("assisted");
    const held = await page.evaluate(() => {
      armMove("clutch");
      for (let i = 0; i < 3000; i++) tickAbilities();
      const afterAges = moveState.clutch.phase;
      ball = { x: PLAYER_PLANE + 1, y: player.y + player.h / 2,
               vx: -BALL_SPEED, vy: 0 };
      update();
      return { afterAges, afterHitting: moveState.clutch.phase };
    });
    check("the charge waits indefinitely rather than timing out",
      held.afterAges === "active", held.afterAges);
    check("and is spent the moment you hit something with it",
      held.afterHitting === "idle", held.afterHitting);

    // Expand is a state, so using it must not wear it out. An earlier version
    // ended after two returns, which meant a long rally handed it back mid-point.
    await setup("assisted");
    const lasted = await page.evaluate(() => {
      const base = player.h;
      armMove("expand");
      for (let i = 0; i < 60; i++) update();
      const grown = player.h;
      const phases = [];
      for (let i = 0; i < 10; i++) {
        onPlayerReturn(player.y + player.h / 2);
        phases.push(moveState.expand.phase);
      }
      phase = "serve";
      for (let i = 0; i < 2000; i++) update();
      return { base, grown, stillBig: player.h, phases };
    });
    check("hitting the ball with the big paddle does not use it up",
      lasted.phases.every((ph) => ph !== "idle"),
      lasted.phases.join(","));
    check("and it is still there long after any timer would have run",
      lasted.stillBig > lasted.base + 1,
      `${lasted.base} -> ${lasted.stillBig.toFixed(1)}`);

    // --- cooldowns ---------------------------------------------------------
    await setup("insane");
    const chain = await page.evaluate(() => {
      armMove("squeeze");
      while (moveState.squeeze.phase !== "idle") update();
      return { immediately: armMove("squeeze"),
               cooldown: moveState.squeeze.cooldown };
    });
    check("a move cannot chain straight into itself",
      chain.immediately === false && chain.cooldown > 0, JSON.stringify(chain));

    // --- switching modes ---------------------------------------------------
    const sizes = await page.evaluate(() => {
      applyDifficulty("insane");
      armMove("squeeze");
      const shrunk = player.hTarget;
      applyDifficulty("normal");
      return { shrunk, afterSwitch: player.h, armed: moveState.squeeze.phase };
    });
    check("switching mode restores the paddle", sizes.afterSwitch === 80,
      sizes.afterSwitch);
    check("and disarms whatever was pending", sizes.armed === "idle", sizes.armed);

    // --- everything off ----------------------------------------------------
    // The same contract the AI object carries: turning it all off has to give
    // back the plain game, so any of this can be isolated by setting numbers.
    const off = await page.evaluate(() => {
      applyDifficulty("insane");
      // After applyDifficulty, not before: it restores ABILITY from its pristine
      // copy, which would put the modes straight back.
      const saved = {};
      for (const name of MOVES) { saved[name] = ABILITY[name].modes; ABILITY[name].modes = []; }
      restart();
      document.getElementById("menu").hidden = true;
      phase = "play";
      let armed = 0;
      const heights = new Set();
      for (let i = 0; i < 400; i++) {
        ball = { x: 200, y: 200, vx: 6, vy: 2 };
        update();
        heights.add(player.h);
        for (const name of MOVES) if (moveState[name].phase !== "idle") armed++;
      }
      for (const name of MOVES) ABILITY[name].modes = saved[name];
      return { armed, heights: [...heights] };
    });
    check("with every move disabled, none ever fires", off.armed === 0, off.armed);
    check("and the paddle never changes size", off.heights.length === 1,
      off.heights.join(","));

    await page.evaluate(() => {
      applyDifficulty("normal");
      localStorage.removeItem("pong.difficulty");
      restart();
    });
  }

  console.log("27. Expand answers two different questions");
  {
    await page.reload();
    await page.waitForSelector("#board");
    const setup = (level) => page.evaluate((l) => {
      cancelAnimationFrame(rafId);
      applyDifficulty(l);
      restart();
      document.getElementById("menu").hidden = true;
      phase = "play";
    }, level);
    const phaseOf = () => page.evaluate(() => moveState.expand.phase);

    // --- Normal: earned, and only earned --------------------------------
    await setup("normal");
    const losing = await page.evaluate(() => {
      // Four points down and four conceded in a row: everything that hands the
      // paddle over in Assisted, and none of it may do anything here.
      for (let i = 0; i < 4; i++) { ai.score += 1; onScore("ai"); }
      return { phase: moveState.expand.phase, gap: ai.score - player.score };
    });
    check("losing badly does not hand you a bigger paddle in Normal",
      losing.phase === "idle", `${losing.phase}, ${losing.gap} down`);

    await setup("normal");
    const earned = await page.evaluate(() => {
      const need = ABILITY.expand.returnsToTrigger;
      const before = [];
      for (let i = 0; i < need - 1; i++) {
        onPlayerReturn(player.y + player.h / 2);
        before.push(moveState.expand.phase);
      }
      onPlayerReturn(player.y + player.h / 2);
      return { before, at: moveState.expand.phase, need };
    });
    check("a rally short of the target earns nothing",
      earned.before.every((p) => p === "idle"), earned.before.join(","));
    check("and the return that reaches it arms Expand",
      earned.at !== "idle", `${earned.at} after ${earned.need}`);

    // The whole point of the entrance: a reward has to look like one.
    const flash = await page.evaluate(() => {
      for (let i = 0; i < ABILITY.expand.telegraphTicks + 2; i++) tickAbilities();
      return { phase: moveState.expand.phase, flash: paddleFlash.t,
               grew: player.hTarget > baseHeight(player) };
    });
    check("it grows the paddle", flash.grew, flash.phase);
    check("and bursts on arrival, which Assisted's version does not",
      flash.flash > 0, flash.flash);

    // Winning a point must NOT take it away. This is the check that catches
    // syncExpand running in a mode it does not govern: with the guard gone it
    // ends the move at every point, whoever won it.
    const kept = await page.evaluate(() => {
      player.score += 1;
      onScore("player");
      return { phase: moveState.expand.phase, big: player.hTarget > baseHeight(player) };
    });
    check("winning a point keeps the paddle you earned",
      kept.phase === "active", kept.phase);
    check("and it is still the big one", kept.big);

    // --- ...and taken away by the two things that should take it away ---
    const conceded = await page.evaluate(() => {
      ai.score += 1;
      onScore("ai");
      return { phase: moveState.expand.phase, size: player.hTarget };
    });
    check("conceding a point takes the earned paddle back",
      conceded.phase === "idle", conceded.phase);
    check("and the paddle goes back to normal", 
      await page.evaluate((s) => s === baseHeight(player), conceded.size),
      conceded.size);

    await setup("normal");
    const expiry = await page.evaluate(() => {
      const spec = ABILITY.expand;
      for (let i = 0; i < spec.returnsToTrigger; i++) {
        onPlayerReturn(player.y + player.h / 2);
      }
      for (let i = 0; i < spec.telegraphTicks + 2; i++) tickAbilities();
      const armed = moveState.expand.phase;
      // Well past the duration, and nothing else touched. Bounded rather than
      // durationTicks + 5, because a broken preset can set that to Infinity and
      // a test that hangs is worse than one that fails.
      const cap = Math.min(spec.durationTicks + 5, 5000);
      for (let i = 0; i < cap; i++) tickAbilities();
      return { armed, after: moveState.expand.phase, dur: spec.durationTicks };
    });
    check("the earned paddle was actually active", expiry.armed === "active",
      expiry.armed);
    check("and it does run out on its own", expiry.after === "idle",
      `${expiry.after} after ${expiry.dur} ticks`);

    // --- Assisted: the state model, unchanged ----------------------------
    await setup("assisted");
    const held = await page.evaluate(() => {
      const need = ABILITY.expand.behindToTrigger;
      for (let i = 0; i < need; i++) { ai.score += 1; onScore("ai"); }
      const on = moveState.expand.phase;
      // Far longer than Normal's timer: a state does not expire.
      for (let i = 0; i < 2000; i++) tickAbilities();
      return { on, later: moveState.expand.phase };
    });
    check("Assisted still hands it over for falling behind", held.on !== "idle",
      held.on);
    check("and holds it there rather than timing out", held.later !== "idle",
      held.later);

    await setup("assisted");
    const rally = await page.evaluate(() => {
      for (let i = 0; i < 12; i++) onPlayerReturn(player.y + player.h / 2);
      return moveState.expand.phase;
    });
    check("a long rally earns nothing in Assisted - it is not a reward there",
      rally === "idle", rally);

    // --- presets must not leak into one another --------------------------
    const leak = await page.evaluate(() => {
      applyDifficulty("insane");
      const insane = ABILITY.blink.chance;
      applyDifficulty("normal");
      const normal = ABILITY.blink.chance;
      applyDifficulty("insane");
      return { insane, normal, back: ABILITY.blink.chance,
               spec: DIFFICULTY.normal.ability.blink.chance };
    });
    check("a preset's ability tuning actually lands",
      leak.normal === leak.spec, `${leak.normal} vs ${leak.spec}`);
    check("Normal's moves are tuned below Insane's", leak.normal < leak.insane,
      `${leak.normal} vs ${leak.insane}`);
    check("and switching back restores Insane's, not Normal's",
      leak.back === leak.insane, `${leak.back} vs ${leak.insane}`);

    // Assisted names no ability overrides at all, so it must land on the
    // pristine values rather than on whatever the last mode left behind.
    const pristine = await page.evaluate(() => {
      applyDifficulty("normal");
      applyDifficulty("assisted");
      return { got: ABILITY.expand.durationTicks,
               want: ABILITY_DEFAULTS.expand.durationTicks,
               returns: ABILITY.expand.returnsToTrigger };
    });
    check("a mode with no ability half gets the pristine copy",
      pristine.got === pristine.want, `${pristine.got} vs ${pristine.want}`);
    check("so Normal's earned trigger does not follow it there",
      pristine.returns === 0, pristine.returns);

    await page.evaluate(() => {
      applyDifficulty("normal");
      localStorage.removeItem("pong.difficulty");
      restart();
    });
  }

  console.log("27b. a selected mode button is readable");
  {
    await page.reload();
    await page.waitForSelector("#board");
    // A whole class of bug rather than one: the mode colours and the generic
    // "selected" rule have identical specificity, so whichever is written last
    // wins. Normal shipped blue-on-blue for exactly that reason.
    const levels = await page.evaluate(() =>
      [...document.querySelectorAll("#difficulty [data-level]")].map((b) => b.dataset.level));
    for (const level of levels) {
      const seen = await page.evaluate((l) => {
        const btn = document.querySelector(`#difficulty [data-level="${l}"]`);
        btn.click();
        const css = getComputedStyle(btn);
        return { fg: css.color, bg: css.backgroundColor,
                 checked: btn.getAttribute("aria-checked") };
      }, level);
      check(`${level} is actually selected by the click`, seen.checked === "true");
      check(`${level}'s label is not the same colour as its background`,
        seen.fg !== seen.bg, `${seen.fg} on ${seen.bg}`);
    }
    await page.evaluate(() => {
      localStorage.removeItem("pong.difficulty");
      applyDifficulty("normal");
    });
  }

  console.log("28. the squeeze attack, and blink lasting as long as the ball");
  {
    await page.reload();
    await page.waitForSelector("#board");
    await page.evaluate(() => {
      cancelAnimationFrame(rafId);
      // Counts red-dominant pixels in a vertical strip. Brightness will not do:
      // the light theme's background is near-white, so it lights up every pixel.
      window.redIn = (x, w) => {
        const d = ctx.getImageData(x, 0, w, HEIGHT).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] > d[i + 1] + 40 && d[i] > d[i + 2] + 40 && d[i + 3] > 0) n++;
        }
        return n;
      };
      window.stage = () => {
        applyDifficulty("insane");
        restart();
        document.getElementById("menu").hidden = true;
        phase = "play";
        ball = { x: 300, y: 200, vx: 6, vy: 0 };
        player.y = 100;
        ai.y = 260;
      };
    });

    // --- the wind-up belongs to the attacker -----------------------------
    const windup = await page.evaluate(() => {
      stage();
      draw();
      const quiet = { mid: redIn(150, 300), you: redIn(0, PADDLE_WIDTH) };
      armMove("squeeze");
      for (let i = 0; i < 8; i++) tickAbilities();
      draw();
      return { quiet, opponent: redIn(WIDTH - PADDLE_WIDTH - 12, 12),
               you: redIn(0, PADDLE_WIDTH), mid: redIn(150, 300) };
    });
    check("nothing is red before it starts",
      windup.quiet.mid === 0 && windup.quiet.you === 0, JSON.stringify(windup.quiet));
    check("the wind-up lights the opponent's paddle", windup.opponent > 0,
      windup.opponent);
    check("and leaves yours alone - you are the target, not the owner",
      windup.you === 0, windup.you);
    check("nothing has crossed the board yet", windup.mid === 0, windup.mid);

    // --- then the bolt crosses -------------------------------------------
    const fired = await page.evaluate(() => {
      for (let i = 0; i < ABILITY.squeeze.telegraphTicks; i++) tickAbilities();
      tickLightning();
      draw();
      const onFire = redIn(150, 300);
      // Well past the bolt's life, but while the squeeze itself is still on.
      for (let i = 0; i < ABILITY.squeeze.boltTicks + 2; i++) tickLightning();
      draw();
      return { onFire, after: redIn(150, 300), still: moveActive("squeeze"),
               opponent: redIn(WIDTH - PADDLE_WIDTH - 12, 12) };
    });
    check("firing throws a bolt across the board", fired.onFire > 100,
      fired.onFire);
    check("and the opponent stops charging once it has fired",
      fired.opponent === 0, fired.opponent);
    check("and the bolt does not hang around", fired.after < fired.onFire / 4,
      `${fired.onFire} -> ${fired.after}`);
    check("while the squeeze itself is still running", fired.still);

    // --- and your paddle is left crackling -------------------------------
    const hit = await page.evaluate(() => {
      for (let i = 0; i < 30; i++) { tickAbilities(); tickLightning(); easePaddles(); }
      draw();
      return { beside: redIn(PADDLE_WIDTH + 1, 20),
               smaller: player.h < baseHeight(player), arcs: arcs.length };
    });
    check("your paddle is left crackling", hit.beside > 0, hit.beside);
    check("and smaller", hit.smaller);

    // Every knob names its off value, and these are no exception.
    const off = await page.evaluate(() => {
      // After stage(), not before: it calls applyDifficulty, which restores
      // ABILITY from the pristine copy and would undo both of these.
      stage();
      const spec = ABILITY.squeeze;
      const was = { bolt: spec.boltTicks, arc: spec.arcPx };
      spec.boltTicks = 0;
      spec.arcPx = 0;
      armMove("squeeze");
      for (let i = 0; i < spec.telegraphTicks + 2; i++) { tickAbilities(); tickLightning(); }
      draw();
      const out = { mid: redIn(150, 300), beside: redIn(PADDLE_WIDTH + 1, 20),
                    shrank: player.hTarget < baseHeight(player) };
      spec.boltTicks = was.bolt;
      spec.arcPx = was.arc;
      return out;
    });
    check("boltTicks 0 draws no bolt", off.mid === 0, off.mid);
    check("arcPx 0 draws no crackle", off.beside === 0, off.beside);
    check("and it still shrinks the paddle - the effect is not the visuals",
      off.shrank);

    // --- blink lasts exactly as long as the ball is coming ---------------
    const flight = await page.evaluate((n) => {
      cancelAnimationFrame(rafId);
      const out = {};
      for (const level of ["normal", "insane"]) {
        applyDifficulty(level);
        let alive = 0, endedAfter = 0;
        for (let i = 0; i < n; i++) {
          restart();
          document.getElementById("menu").hidden = true;
          phase = "play";
          ai.y = (HEIGHT - ai.h) / 2;
          const a = (Math.random() * 2 - 1) * MAX_BOUNCE_ANGLE;
          const sp = BALL_SPEED + Math.random() * (BALL_SPEED_MAX - BALL_SPEED);
          ball = { x: PLAYER_PLANE, y: Math.random() * (HEIGHT - BALL_SIZE),
                   vx: sp * Math.cos(a), vy: sp * Math.sin(a) };
          armMove("blink");
          let guard = 0;
          while (ball.vx > 0 && guard++ < 900) update();
          if (moveState.blink.phase === "active") alive++;
          update();          // one tick past the ball turning round
          if (moveState.blink.phase === "idle") endedAfter++;
        }
        out[level] = { alive, endedAfter, n };
      }
      applyDifficulty("normal");
      return out;
    }, 60);
    for (const level of ["normal", "insane"]) {
      const f = flight[level];
      check(`blink is still there when the ball arrives in ${level}`,
        f.alive === f.n, `${f.alive}/${f.n}`);
      check(`and lets go once it has been dealt with in ${level}`,
        f.endedAfter === f.n, `${f.endedAfter}/${f.n}`);
    }

    await page.evaluate(() => {
      applyDifficulty("normal");
      localStorage.removeItem("pong.difficulty");
      restart();
    });
  }

  check("no page errors", errors.length === 0, errors.join("; "));

  await browser.close();
  process.exit(report());
})();
