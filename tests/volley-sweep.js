// Measures how long a *volley* is - your contact to your next contact - and how
// many of them each effect aimed at the player actually covers. Not part of
// `npm test`: like ai-sweep.js it is a ruler, not an assertion.
//
// **Being outside `npm test` means nothing checks that this file still runs.**
// Run it after editing it, even for a change that alters no measurement, because
// a green suite will not tell you it now dies on load. `tests/README.md` says
// more.
//
//   node tests/volley-sweep.js              # every mode
//   P=200 node tests/volley-sweep.js        # more points, tighter figure
//
// Why this exists. `games/pong/DESIGN.md` sets the duration of anything aimed at
// the player in volleys rather than ticks, because an effect that starts while
// the ball is heading *away* from you spends part of its life before you can
// feel it - roughly half a volley. The squeeze shipped once with a duration that
// looked generous and covered *zero* of the player's next contacts. A volley
// varies by more than a factor of two across the modes, because they play
// different balls, so it has to be measured per mode rather than assumed.
//
// The suite guards the outcome ("still shrunk when the ball comes back"); this
// tells you where inside that a change landed. Change this rather than writing
// another one, for the same reason ai-sweep.js says so.
const { launch, url } = require("./helpers");

const POINTS = Number(process.env.P || 80);

(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  await page.goto(url("/games/pong/index.html"));
  await page.waitForSelector("#board");

  // A volley with the moves silenced: this is the rally's own rhythm, which is
  // the unit the durations are expressed in.
  const volleyOf = (level, points) => page.evaluate(([lvl, n]) => {
    cancelAnimationFrame(rafId);
    applyDifficulty(lvl);
    const saved = Object.fromEntries(MOVES.map((m) => [m, ABILITY[m].modes]));
    for (const m of MOVES) ABILITY[m].modes = [];
    restart();
    document.getElementById("menu").hidden = true;
    const gaps = [];
    for (let p = 0; p < n; p++) {
      const start = player.score + ai.score;
      phase = "play";
      ball = { x: WIDTH / 2, y: Math.random() * (HEIGHT - BALL_SIZE),
               vx: -BALL_SPEED, vy: (Math.random() * 2 - 1) * 2 };
      let t = 0, last = null, guard = 0;
      while (player.score + ai.score === start && guard++ < 4000) {
        const before = Math.sign(ball.vx);
        const want = ball.y + BALL_SIZE / 2 - player.h / 2;
        player.y = Math.max(0, Math.min(HEIGHT - player.h,
          player.y + Math.max(-6, Math.min(6, want - player.y))));
        update();
        t += 1;
        if (before < 0 && Math.sign(ball.vx) > 0) {
          if (last !== null) gaps.push(t - last);
          last = t;
        }
      }
      if (player.score >= WIN_SCORE || ai.score >= WIN_SCORE) {
        player.score = 0;
        ai.score = 0;
        gameOver = false;
      }
    }
    for (const m of MOVES) ABILITY[m].modes = saved[m];
    applyDifficulty(lvl);
    gaps.sort((a, b) => a - b);
    return gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0;
  }, [level, points]);

  // How many of your next contacts an effect is still running for. Both paddles
  // are glued to the ball so the rally cannot end for some other reason - with
  // only the player tracking, the ai misses and the point ends early, which
  // reads as the effect failing.
  const coverOf = (level, move, runs) => page.evaluate(([lvl, name, n]) => {
    cancelAnimationFrame(rafId);
    applyDifficulty(lvl);
    if (!ABILITY[name].modes.includes(lvl)) return null;
    const out = [];
    for (let k = 0; k < n; k++) {
      restart();
      document.getElementById("menu").hidden = true;
      phase = "play";
      player.y = HEIGHT / 2 - player.h / 2;
      ai.y = HEIGHT / 2 - ai.h / 2;
      // Fired where a real one fires: as the ball turns away from you.
      ball = { x: PLAYER_PLANE + 20, y: HEIGHT / 2, vx: BALL_SPEED, vy: 0 };
      armMove(name);
      startMove(name);
      const realAi = updateAi;
      updateAi = () => {};
      let contacts = 0, covered = 0, guard = 0;
      const glue = (p) => {
        p.y = Math.max(0, Math.min(HEIGHT - p.h, ball.y + BALL_SIZE / 2 - p.h / 2));
      };
      while (contacts < 8 && guard++ < 8000) {
        const before = Math.sign(ball.vx);
        glue(player);
        glue(ai);
        update();
        if (before < 0 && Math.sign(ball.vx) > 0) {
          contacts += 1;
          // The move's own phase, not the paddle's size. Size says only "this
          // paddle is not its normal height", and the other size move firing
          // later in the same rally counted as this one still running - which
          // reported a squeeze covering twice as many contacts as it does.
          if (moveActive(name)) covered += 1;
        }
      }
      updateAi = realAi;
      out.push(covered);
    }
    applyDifficulty(lvl);
    return out.reduce((a, b) => a + b, 0) / out.length;
  }, [level, move, runs]);

  console.log(`${POINTS} points per mode\n`);
  for (const level of await page.evaluate(() => Object.keys(DIFFICULTY))) {
    const volley = await volleyOf(level, POINTS);
    const parts = [];
    for (const move of ["squeeze", "expand"]) {
      const cover = await coverOf(level, move, 20);
      parts.push(cover === null
        ? `${move} n/a`
        : `${move} covers ${cover.toFixed(1)} contacts`);
    }
    console.log(`  ${level.padEnd(9)} volley ${String(volley).padStart(4)} ticks   `
      + parts.join(",  "));
  }
  console.log("\n  A volley is your contact to your next contact, moves silenced.");
  console.log("  'covers' counts how many of your next contacts the effect is"
    + " still running for,");
  console.log("  and stops counting at 8 - so 8.0 means it never ended, which is"
    + " what a state does.");
  await browser.close();
})();
