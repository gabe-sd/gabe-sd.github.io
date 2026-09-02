// Measures how often Pong's ai saves a shot, which is the number every claim in
// games/pong/DESIGN.md about difficulty rests on. Not part of `npm test`: it is a
// tuning instrument, not an assertion. The suite guards the *range*; this tells
// you where inside it a change landed.
//
// **Being outside `npm test` means nothing checks that this file still runs.**
// Run it after editing it, even for a change that alters no measurement - a
// reformatted column is exactly the edit that feels too safe to re-run, and a
// green suite will not tell you it now dies on load. `tests/README.md` says more.
//
//   node tests/ai-sweep.js                        # every entry in DIFFICULTY
//   N=2000 node tests/ai-sweep.js                 # more samples, tighter figure
//   node tests/ai-sweep.js '{"readErrorNearPx":40,"speed":3.5}'   # a one-off
//   REACH=1 node tests/ai-sweep.js                # and the same shot at *you*
//
// Comparability is the whole point. A number produced by a differently shaped
// harness cannot be set against the ones already recorded, so change this rather
// than writing another one.
//
// REACH=1 adds the mirror question, which the ai figure cannot answer and which
// `games/pong/DESIGN.md` flags as this harness's blind spot: not "did the ai get
// there" but "could *you* have". It fires the shot the other way, at a paddle
// driven perfectly - no reading error, no reaction delay, straight at the true
// intercept from the first tick - so a miss is the shot being physically out of
// reach at `PADDLE_SPEED` rather than the player being bad at it.
//
// It reports a **limit**, not a pass rate. Every mode saves 100% of random shots
// from a centred start, which says nothing; the speed at which that stops being
// true says how much room the mode has left. Two columns:
//
//   clean/squeezed  the fastest ball whose worst shot - dead straight, so the
//                   fewest ticks in flight, at the corner furthest from the
//                   paddle - is still reachable, and the headroom over the cap
//                   the mode plays. Negative headroom means the mode can produce
//                   a shot no keyboard input could save. Reported for both
//                   paddle sizes, because a squeezed one has further to travel
//                   and less of it to arrive with.
//   tunnelled       shots that beat a paddle pinned on the intercept every tick.
//                   Anything but none is the ball passing *through* a paddle
//                   that was in the right place - a bug, not a difficulty
//                   question.
//
// Both numeric columns are headed "worst shot reachable to" in the output rather
// than only explained down here, because a row quoted on its own would otherwise
// read as a fact about the game instead of about a constructed shot.
//
// A mouse is bound by none of it: pointer control is deliberately not rate
// limited (see DESIGN.md), so it covers any distance in one tick.
//
// One caveat the harness cannot fix: Assisted and Insane also change the ball, so
// each is measured against its own ball rather than a shared one. Their figures
// say "how often does this mode's ai save this mode's ball" and are not on the
// same scale as Easy/Medium/Hard, which all play the identical game.
const { launch, url } = require("./helpers");

const N = Number(process.env.N || 900);
const adhoc = process.argv[2] ? JSON.parse(process.argv[2]) : null;
const REACH = !!process.env.REACH;

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

  // The mirror question, asked as a limit rather than a percentage. A pass rate
  // here reads 100% on every mode and tells you nothing; the speed at which it
  // *stops* being 100% tells you how much room a mode has left.
  //
  // The shot is the worst one the game can produce: dead straight, so it spends
  // the fewest possible ticks in flight, fired at the corner furthest from where
  // the paddle is parked. The paddle is driven perfectly - no reading error, no
  // reaction delay - so a miss is the shot being out of reach at `PADDLE_SPEED`,
  // not the player being bad at it.
  const savedAt = (level, speed, scale) => page.evaluate(([lvl, sp, s]) => {
    cancelAnimationFrame(rafId);
    const was = difficulty;
    applyDifficulty(lvl);
    // Moves off, so this measures the mode's ball rather than the ball plus
    // whatever the opponent happened to be doing to your paddle at the time.
    // The `scale` argument is how a squeezed paddle gets asked about instead.
    const savedModes = Object.fromEntries(MOVES.map((m) => [m, ABILITY[m].modes]));
    for (const m of MOVES) ABILITY[m].modes = [];
    const h = baseHeight(player) * s;
    let ok = true;
    for (const low of [false, true]) {   // both corners: the paddle is not symmetric in play
      restart();
      phase = "play";
      // Settled at the size being asked about - easePaddles() would otherwise
      // spend the opening ticks still resizing it.
      player.h = h;
      player.hTarget = h;
      player.y = low ? 0 : HEIGHT - h;
      ball = { x: AI_PLANE, y: low ? HEIGHT - BALL_SIZE : 0, vx: -sp, vy: 0 };
      let guard = 0;
      while (ball.vx < 0 && ai.score === 0 && guard++ < 6000) {
        const want = Math.max(0, Math.min(HEIGHT - player.h,
          ball.y + BALL_SIZE / 2 - player.h / 2));
        player.y += Math.max(-PADDLE_SPEED,
          Math.min(PADDLE_SPEED, want - player.y));
        update();
      }
      if (ai.score !== 0) ok = false;
      ai.score = 0;
      player.score = 0;
    }
    for (const m of MOVES) ABILITY[m].modes = savedModes[m];
    applyDifficulty(was);
    return ok;
  }, [level, speed, scale]);

  const limitFor = async (level, scale) => {
    let lo = 1, hi = 60;
    if (!(await savedAt(level, lo, scale))) return null;
    if (await savedAt(level, hi, scale)) return Infinity;
    while (hi - lo > 0.01) {
      const mid = (lo + hi) / 2;
      if (await savedAt(level, mid, scale)) lo = mid; else hi = mid;
    }
    return lo;
  };

  // Anything but 100% here is the ball passing a paddle that was in the right
  // place - tunnelling, which would be a bug rather than a difficulty question.
  const pinnedSaves = (level, n) => page.evaluate(([lvl, count]) => {
    cancelAnimationFrame(rafId);
    const was = difficulty;
    applyDifficulty(lvl);
    const savedModes = Object.fromEntries(MOVES.map((m) => [m, ABILITY[m].modes]));
    for (const m of MOVES) ABILITY[m].modes = [];
    // predictInterceptY only reads towards AI_PLANE. Rather than restate its
    // physics here and let the two drift, mirror the ball and ask the game's own
    // predictor: WIDTH - BALL_SIZE - x maps PLAYER_PLANE onto AI_PLANE exactly,
    // and leaves y alone.
    const interceptAtPlayer = () => {
      const x = ball.x;
      const vx = ball.vx;
      ball.x = WIDTH - BALL_SIZE - x;
      ball.vx = -vx;
      const y = predictInterceptY();
      ball.x = x;
      ball.vx = vx;
      return y;
    };
    let saves = 0;
    for (let i = 0; i < count; i++) {
      restart();
      phase = "play";
      const h = baseHeight(player);
      player.h = h;
      player.hTarget = h;
      player.y = (HEIGHT - h) / 2;
      const angle = (Math.random() * 2 - 1) * MAX_BOUNCE_ANGLE;
      const speed = BALL_SPEED + Math.random() * (BALL_SPEED_MAX - BALL_SPEED);
      ball = {
        x: AI_PLANE,
        y: Math.random() * (HEIGHT - BALL_SIZE),
        vx: -speed * Math.cos(angle),
        vy: speed * Math.sin(angle),
      };
      let guard = 0;
      while (ball.vx < 0 && ai.score === 0 && guard++ < 800) {
        const aim = interceptAtPlayer();
        if (aim !== null) {
          player.y = Math.max(0, Math.min(HEIGHT - player.h,
            aim + BALL_SIZE / 2 - player.h / 2));
        }
        update();
      }
      if (ai.score === 0) saves++;
    }
    for (const m of MOVES) ABILITY[m].modes = savedModes[m];
    applyDifficulty(was);
    return saves;
  }, [level, n]);

  const reportReach = async (level) => {
    const cfg = await page.evaluate((l) => {
      const was = difficulty;
      applyDifficulty(l);
      const out = { cap: BALL_SPEED_MAX, h: baseHeight(player),
                    squeeze: ABILITY.squeeze.scale };
      applyDifficulty(was);
      return out;
    }, level);
    const show = (v) => v === null ? " none"
      : v === Infinity ? "  any" : v.toFixed(2).padStart(5);
    const gap = (v) => typeof v !== "number" ? "     "
      : (v - cfg.cap >= 0 ? "+" : "") + (v - cfg.cap).toFixed(2);
    const clean = await limitFor(level, 1);
    const squeezed = await limitFor(level, cfg.squeeze);
    const pinned = await pinnedSaves(level, N);
    console.log(`  ${level.padEnd(10)} ${String(cfg.cap).padStart(5)}`
      + ` ${(cfg.h + "px").padStart(7)}`
      + `   ${show(clean)} ${gap(clean).padStart(7)}`
      + `   ${show(squeezed)} ${gap(squeezed).padStart(7)}`
      + `   ${pinned === N ? "  none" : String(N - pinned).padStart(6)}`);
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

  if (REACH) {
    console.log("\ncan you reach it? the worst shot each mode can produce,"
      + " against a perfect keyboard player\n");
    // "worst shot" sits in the header rather than only in the legend, so a row
    // quoted on its own still says what it is a fact about. It is a constructed
    // shot, not ordinary play, and the difference decides things.
    console.log("                                worst shot reachable to");
    console.log("  mode         cap  paddle"
      + "         clean          squeezed      tunnelled");
    for (const level of await page.evaluate(() => Object.keys(DIFFICULTY))) {
      await reportReach(level);
    }
    console.log("\n  clean/squeezed  the fastest ball whose worst shot a paddle"
      + " at PADDLE_SPEED still gets");
    console.log("                  to, and the headroom over the cap that mode"
      + " actually plays. Negative");
    console.log("                  means the mode can produce a shot no"
      + " keyboard input could save. A");
    console.log("                  mouse is not bound by this at all - pointer"
      + " control is deliberately");
    console.log("                  not rate limited.");
    console.log(`  tunnelled       shots that beat a paddle pinned on the`
      + ` intercept, out of ${N}.`);
    console.log("                  Anything but none is a bug rather than a"
      + " difficulty question.");
  }
  await browser.close();
})();
