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
    // The ai cannot be asserted centred: it chases from the very first frame, so
    // by the time the loop can be frozen it has already moved. That it starts
    // reacting with no delay is the behaviour P8 replaces.
    check("ai paddle is on the board", s.ai.y >= 0 && s.ai.y <= MAX_Y, s.ai.y);
    check("ball starts centred", s.ball.x === WIDTH / 2 && s.ball.y === HEIGHT / 2,
      `${s.ball.x},${s.ball.y}`);
    check("ball waits to be served rather than launching itself",
      s.ball.vx === 0 && s.ball.vy === 0, `${s.ball.vx},${s.ball.vy}`);
    check("status prompts for a serve",
      (await page.textContent("#status")).includes("Press Space"),
      await page.textContent("#status"));
    check("canvas is 600x400", WIDTH === 600 && HEIGHT === 400, `${WIDTH}x${HEIGHT}`);
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
    check("ball returns to the centre",
      s.ball.x === WIDTH / 2 && s.ball.y === HEIGHT / 2, `${s.ball.x},${s.ball.y}`);
    check("ball waits rather than launching straight away", s.ball.vx === 0,
      s.ball.vx);
    check("status reports the score",
      (await page.textContent("#status")).includes("0"),
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
      (await page.textContent("#status")).includes("serving"),
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
      waiting.ball.x === WIDTH / 2 && waiting.ball.vx === 0,
      `${waiting.ball.x},${waiting.ball.vx}`);

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
    check("status announces the win",
      (await page.textContent("#status")).includes("You win"),
      await page.textContent("#status"));
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
    check("status announces the loss",
      (await page.textContent("#status")).includes("AI wins"),
      await page.textContent("#status"));

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
    check("gameOver cleared", t.gameOver === false);
    check("paddles recentred", t.player.y === MAX_Y / 2 && t.ai.y === MAX_Y / 2);
    check("ball re-served from the centre",
      t.ball.x === WIDTH / 2 && t.ball.y === HEIGHT / 2);
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
      (await page.evaluate(() => phase)) === before && before === "serve",
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

  console.log("15. known bugs, pinned - these assertions invert when the fix lands");
  {
    // P2: collision is a half-plane test (ball.x <= PADDLE_WIDTH), not a crossing
    // test, so a ball that already went past the paddle is still rescued if the
    // paddle arrives late. Expected to flip to "scores" when P2 lands.
    await freeze();
    await set({ player: { y: 260 }, ball: { x: 1, y: 300, vx: -3, vy: 0 } });
    await step(1);
    const s = await read();
    check("P2: a ball already past the paddle plane is still rescued (bug)",
      s.ball.vx > 0 && s.ai.score === 0, `vx=${s.ball.vx} score=${s.ai.score}`);
  }

  check("no page errors", errors.length === 0, errors.join("; "));

  await browser.close();
  process.exit(report());
})();
