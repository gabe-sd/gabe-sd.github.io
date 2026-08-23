// Pong physics and controls. The loop is frozen with cancelAnimationFrame(rafId)
// and update() is stepped by hand, so nothing here depends on real frame timing -
// see "Scripts are classic, not modules" in CLAUDE.md for why that is reachable.
//
// Assertions are deliberately about outcomes (did it bounce, did that score) and
// not about pixels-per-frame, so they survive movement becoming time-scaled.
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
  const freeze = () => page.evaluate(() => { cancelAnimationFrame(rafId); restart(); });
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
  const consts = await page.evaluate(() => ({
    WIDTH, HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT, BALL_SIZE, WIN_SCORE, PADDLE_SPEED,
  }));
  const { WIDTH, HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT, BALL_SIZE, WIN_SCORE } = consts;
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
    check("ball is on the board", s.ball.x > 0 && s.ball.x < WIDTH, s.ball.x);
    // Pinned: the game serves itself the instant the script runs. P6 makes it
    // wait for the player, at which point this inverts to vx === 0.
    check("ball is already in play on load (P6 changes this)", s.ball.vx !== 0,
      s.ball.vx);
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

  console.log("6. a clean miss scores");
  {
    await freeze();
    await set({ player: { y: 0 }, ball: { x: 40, y: 300, vx: -6, vy: 0 } });
    const steps = await stepToScore(30);
    const s = await read();
    check("ai scores when the ball passes the player", s.ai.score === 1, s.ai.score);
    check("it took the expected number of frames", steps > 0, steps);
    check("ball is re-served from the centre",
      s.ball.x === WIDTH / 2 && s.ball.y === HEIGHT / 2, `${s.ball.x},${s.ball.y}`);
    check("re-served ball is moving", s.ball.vx !== 0, s.ball.vx);
    check("status reports the score",
      (await page.textContent("#status")).includes("0"),
      await page.textContent("#status"));

    await freeze();
    await set({ ai: { y: 0 }, ball: { x: WIDTH - 40, y: 300, vx: 6, vy: 0 } });
    await stepToScore(30);
    check("player scores when the ball passes the ai",
      (await read()).player.score === 1);
  }

  console.log("7. reaching WIN_SCORE ends the game");
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
  }

  console.log("8. restart clears everything");
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

  console.log("9. paddle controls");
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

    const box = await (await page.$("#board")).boundingBox();
    const clientY = box.y + box.height * 0.25;
    await page.mouse.move(box.x + box.width / 2, clientY);
    await page.waitForTimeout(60);
    const scale = HEIGHT / box.height;
    const want = Math.max(0, Math.min(MAX_Y, (clientY - box.y) * scale - PADDLE_HEIGHT / 2));
    const got = (await read()).player.y;
    check("pointer centres the paddle on the cursor",
      Math.abs(got - want) < 1.5, `${got} vs ${want}`);
  }

  console.log("10. known bugs, pinned - these assertions invert when the fix lands");
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

    // P3: no speed cap - vx is multiplied by 1.05 on every hit, forever.
    await freeze();
    await set({ player: { y: 160 }, ball: { x: 16, y: 200, vx: -6, vy: 0 } });
    await step(1);
    check("P3: ball speeds up on every hit with no cap (bug)",
      Math.abs((await read()).ball.vx) > 6, (await read()).ball.vx);

    // P11: #status carries standing instructions, which CLAUDE.md reserves for a
    // collapsible panel. Expected to flip to "no controls text" when P11 lands.
    await page.evaluate(() => restart());
    const status = await page.textContent("#status");
    check("P11: controls are in the status line (contract violation)",
      status.includes("W/S"), status);
  }

  check("no page errors", errors.length === 0, errors.join("; "));

  await browser.close();
  process.exit(report());
})();
