// Measures how often Pong's ai saves a shot, which is the number every claim in
// games/pong/DESIGN.md about difficulty rests on. Not part of `npm test`: it is a
// tuning instrument, not an assertion. The suite guards the *range*; this tells
// you where inside it a change landed.
//
//   node tests/ai-sweep.js                        # every entry in DIFFICULTY
//   N=2000 node tests/ai-sweep.js                 # more samples, tighter figure
//   node tests/ai-sweep.js '{"readErrorNearPx":40,"speed":3.5}'   # a one-off
//
// Comparability is the whole point. A number produced by a differently shaped
// harness cannot be set against the ones already recorded, so change this rather
// than writing another one.
//
// One caveat the harness cannot fix: Assisted and Insane also change the ball, so
// each is measured against its own ball rather than a shared one. Their figures
// say "how often does this mode's ai save this mode's ball" and are not on the
// same scale as Easy/Medium/Hard, which all play the identical game.
const { launch, url } = require("./helpers");

const N = Number(process.env.N || 900);
const adhoc = process.argv[2] ? JSON.parse(process.argv[2]) : null;

(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  await page.goto(url("/games/pong/index.html"));
  await page.waitForSelector("#board");

  // One shot: the ball leaves the player's paddle at a random legal angle and
  // speed, with the ai starting centred, and either it saves or it concedes.
  // A level name goes through applyDifficulty so the preset's game-level knobs
  // land too; ad-hoc overrides are still applied straight onto AI.
  const measure = (level, overrides, n) => page.evaluate(([lvl, o, count]) => {
    cancelAnimationFrame(rafId);
    const was = difficulty;
    if (lvl) applyDifficulty(lvl);
    const restore = { ...AI };
    if (o) Object.assign(AI, o);
    let saves = 0;
    for (let i = 0; i < count; i++) {
      restart();
      phase = "play";
      ai.y = (HEIGHT - PADDLE_HEIGHT) / 2;
      const angle = (Math.random() * 2 - 1) * MAX_BOUNCE_ANGLE;
      const speed = BALL_SPEED + Math.random() * (BALL_SPEED_MAX - BALL_SPEED);
      ball = {
        x: PLAYER_PLANE,
        y: Math.random() * (HEIGHT - BALL_SIZE),
        vx: speed * Math.cos(angle),
        vy: speed * Math.sin(angle),
      };
      let guard = 0;
      while (ball.vx > 0 && player.score === 0 && guard++ < 800) update();
      if (player.score === 0) saves++;
    }
    Object.assign(AI, restore);
    applyDifficulty(was);
    return saves;
  }, [level, overrides, n]);

  const report = async (label, level, overrides) => {
    const saves = await measure(level, overrides, N);
    const pct = ((100 * saves) / N).toFixed(1);
    console.log(`  ${label.padEnd(24)} saves ${pct.padStart(5)}%   (${saves}/${N})`);
  };

  console.log(`${N} shots each\n`);
  if (adhoc) {
    await report("ad hoc", null, adhoc);
  } else {
    await report("as loaded", null, null);
    for (const level of await page.evaluate(() => Object.keys(DIFFICULTY))) {
      const own = await page.evaluate((l) => !!DIFFICULTY[l].game, level);
      await report(level + (own ? " *" : ""), level, null);
    }
    console.log("\n  * plays its own ball; not comparable with the others.");
  }
  await browser.close();
})();
