// Flappy Bird: the flight model, the pipes, the score and its stored best.
// The loop is frozen with cancelAnimationFrame(rafId) and update() is stepped by
// hand, so nothing here depends on real frame timing - see "Scripts are classic,
// not modules" in CLAUDE.md for why those globals are reachable.
//
// Assertions are about outcomes (did it climb, did that score, did that end the
// run) rather than about pixels per frame, so retiming the loop does not rewrite
// the suite. Nothing measures the canvas: what is drawn is checked by playing it.
const { launch, url, makeChecks } = require("./helpers");

const PAGE = url("/games/flappy-bird/index.html");
const { check, report } = makeChecks();

(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 700, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(PAGE);
  await page.waitForSelector("#board");
  // A clean slate, cleared once here rather than from an init script: this page
  // is reloaded further down to prove the record survives, and an init script
  // would wipe it on the way back in.
  await page.evaluate(() => {
    localStorage.removeItem("flappy.bestScore");
    restart();
  });

  const freeze = () => page.evaluate(() => {
    cancelAnimationFrame(rafId);
    running = false;
    rafId = null;
  });
  // Freeze, reset, and drop into "play": most cases below place the bird and the
  // pipes by hand, and update() does nothing outside that phase.
  const freezePlaying = async () => {
    await page.evaluate(() => {
      restart();
      cancelAnimationFrame(rafId);
      running = false;
      rafId = null;
      phase = "play";
    });
  };
  const step = (n = 1) => page.evaluate((k) => { for (let i = 0; i < k; i++) update(); }, n);
  const read = () => page.evaluate(() => ({
    phase, score, best: loadBestScore(), bird: { ...bird },
    pipes: pipes.map((p) => ({ ...p })),
    status: document.getElementById("status").textContent,
    scoreText: document.getElementById("score").textContent,
    bestText: document.getElementById("best-score").textContent,
  }));
  const set = (v) => page.evaluate((s) => {
    if (s.bird) bird = { ...bird, ...s.bird };
    if (s.pipes) pipes = s.pipes;
    if (s.score !== undefined) score = s.score;
    if (s.phase !== undefined) phase = s.phase;
  }, v);

  const C = await page.evaluate(`({
    WIDTH, HEIGHT, TICK_MS, MAX_CATCHUP_MS, GRAVITY, FLAP_VELOCITY, MAX_FALL_SPEED,
    SCROLL_SPEED, BIRD_X, BIRD_SIZE, BIRD_START_Y, PIPE_WIDTH, PIPE_GAP,
    PIPE_SPACING, PIPE_MARGIN, FIRST_PIPE_X, RESTART_LOCKOUT_MS,
  })`);

  console.log("1. state at load");
  await freeze();
  {
    const s = await read();
    check("waiting for the first flap", s.phase === "ready", s.phase);
    check("score starts at zero", s.score === 0, s.score);
    check("bird starts at its resting height", s.bird.y === C.BIRD_START_Y, s.bird.y);
    check("bird is not already falling", s.bird.vy === 0, s.bird.vy);
    check("one pipe seeded, off the right edge",
      s.pipes.length === 1 && s.pipes[0].x >= C.WIDTH, JSON.stringify(s.pipes));
    check("status prompts for a flap", /flap/i.test(s.status), s.status);
    check("no best score yet", s.bestText.includes("—"), s.bestText);
    check("instructions hidden by default", !(await page.isVisible("#instructions")));
  }

  console.log("2. the harness is actually frozen, and nothing moves before the first flap");
  {
    const before = await read();
    await step(30);
    const after = await read();
    check("update() is inert outside play",
      after.bird.y === before.bird.y && after.pipes[0].x === before.pipes[0].x,
      `${before.bird.y} -> ${after.bird.y}`);
    await page.waitForTimeout(120);
    const later = await read();
    check("no live loop is moving it either", later.bird.y === before.bird.y,
      `${before.bird.y} -> ${later.bird.y}`);
  }

  console.log("3. a flap starts the run and lifts the bird");
  await page.evaluate(() => { flap(); cancelAnimationFrame(rafId); running = false; rafId = null; });
  {
    const s = await read();
    check("phase is now play", s.phase === "play", s.phase);
    check("flap set an upward velocity", s.bird.vy === C.FLAP_VELOCITY, s.bird.vy);
    check("start prompt cleared once flying", s.status.trim() === "",
      JSON.stringify(s.status));
    const before = s.bird.y;
    await step(5);
    const after = (await read()).bird.y;
    check("the bird climbed", after < before, `${before} -> ${after}`);
  }

  console.log("4. a flap sets the velocity rather than adding to it");
  await freezePlaying();
  await page.evaluate(() => { flap(); flap(); flap(); });
  {
    const s = await read();
    check("three flaps lift no harder than one", s.bird.vy === C.FLAP_VELOCITY, s.bird.vy);
  }
  // A held key repeats at the OS rate, which is a flap per repeat unless the
  // handler ignores them - see the messy-input rules in CLAUDE.md.
  await set({ bird: { y: C.BIRD_START_Y, vy: 3 } });
  const press = (repeat) => page.evaluate((r) => document.dispatchEvent(
    new KeyboardEvent("keydown", { key: " ", repeat: r, bubbles: true })), repeat);
  await press(true);
  check("a held key does not autofire", (await read()).bird.vy === 3,
    (await read()).bird.vy);
  await press(false);
  check("the press itself still flaps", (await read()).bird.vy === C.FLAP_VELOCITY,
    (await read()).bird.vy);

  console.log("5. gravity pulls it back down, up to a terminal speed");
  await freezePlaying();
  await set({ bird: { y: 40, vy: 0 }, pipes: [] });
  await step(6);
  {
    const s = await read();
    check("falling", s.bird.vy > 0 && s.bird.y > 40, `y ${s.bird.y} vy ${s.bird.vy}`);
  }
  await set({ bird: { y: 20, vy: 0 }, pipes: [] });
  await step(200);
  {
    const s = await read();
    check("fall speed is capped", s.bird.vy <= C.MAX_FALL_SPEED, s.bird.vy);
  }

  console.log("6. the ceiling stops the bird, it does not kill it");
  await freezePlaying();
  await set({ bird: { y: 4, vy: -30 }, pipes: [] });
  await step(1);
  {
    const s = await read();
    check("held at the ceiling", s.bird.y === 0, s.bird.y);
    check("upward velocity cancelled", s.bird.vy === 0, s.bird.vy);
    check("still alive", s.phase === "play", s.phase);
  }

  console.log("7. the ground ends the run");
  await freezePlaying();
  await set({ bird: { y: C.HEIGHT - C.BIRD_SIZE - 2, vy: 6 }, pipes: [] });
  await step(1);
  {
    const s = await read();
    check("run over", s.phase === "over", s.phase);
    check("status says what happened", /ground/i.test(s.status), s.status);
  }

  console.log("8. clearing a pipe scores, once");
  await freezePlaying();
  // Right edge one scroll step from passing the bird, gap centred on it.
  await set({
    bird: { y: C.BIRD_START_Y, vy: 0 },
    pipes: [{
      x: C.BIRD_X - C.PIPE_WIDTH + 1,
      gapTop: C.BIRD_START_Y + C.BIRD_SIZE / 2 - C.PIPE_GAP / 2,
      passed: false,
    }],
  });
  await step(1);
  {
    const s = await read();
    check("score went up", s.score === 1, s.score);
    check("hud shows it", s.scoreText.includes("1"), s.scoreText);
    check("the pipe is marked as counted", s.pipes[0].passed === true);
  }
  await step(1);
  check("the same pipe cannot score twice", (await read()).score === 1);

  console.log("9. touching a pipe ends the run");
  await freezePlaying();
  await set({
    bird: { y: C.BIRD_START_Y, vy: 0 },
    pipes: [{ x: C.BIRD_X, gapTop: C.HEIGHT - C.PIPE_GAP, passed: false }],
  });
  await step(1);
  {
    const s = await read();
    check("run over", s.phase === "over", s.phase);
    check("status says it was a pipe", /pipe/i.test(s.status), s.status);
  }

  console.log("10. flying through the gap does not");
  await freezePlaying();
  await set({
    bird: { y: C.BIRD_START_Y, vy: 0 },
    pipes: [{
      x: C.BIRD_X - 4,
      gapTop: C.BIRD_START_Y + C.BIRD_SIZE / 2 - C.PIPE_GAP / 2,
      passed: false,
    }],
  });
  // Held level so the gap is cleared on flight rather than by falling out of it.
  await page.evaluate((n) => { for (let i = 0; i < n; i++) { bird.vy = 0; update(); } },
    Math.ceil((C.PIPE_WIDTH + 4) / C.SCROLL_SPEED) + 2);
  {
    const s = await read();
    check("still flying", s.phase === "play", s.phase);
    check("and it counted", s.score === 1, s.score);
  }

  console.log("11. pipes keep coming, evenly spaced");
  await freezePlaying();
  await set({ bird: { y: C.BIRD_START_Y, vy: 0 }, pipes: [] });
  await page.evaluate((n) => { for (let i = 0; i < n; i++) { bird.vy = 0; bird.y = BIRD_START_Y; update(); } },
    Math.ceil((C.FIRST_PIPE_X + C.PIPE_SPACING * 2) / C.SCROLL_SPEED));
  {
    const s = await read();
    check("more than one pipe on the go", s.pipes.length >= 2, s.pipes.length);
    const gaps = s.pipes.slice(1).map((p, i) => p.x - s.pipes[i].x);
    check("spacing is exact and uniform",
      gaps.every((g) => Math.abs(g - C.PIPE_SPACING) < 1e-6), gaps.join(", "));
    const inRange = s.pipes.every((p) =>
      p.gapTop >= C.PIPE_MARGIN && p.gapTop + C.PIPE_GAP <= C.HEIGHT - C.PIPE_MARGIN);
    check("every gap is reachable, none jammed against an edge", inRange,
      s.pipes.map((p) => Math.round(p.gapTop)).join(", "));
    check("pipes left behind are dropped",
      s.pipes.every((p) => p.x + C.PIPE_WIDTH >= 0), s.pipes.map((p) => Math.round(p.x)).join(", "));
  }

  console.log("12. the same real time gives the same flight, however the frames land");
  const flightFor = (chunks, ms) => page.evaluate(({ chunks, ms }) => {
    restart();
    cancelAnimationFrame(rafId);
    running = false;
    rafId = null;
    phase = "play";
    bird = { y: BIRD_START_Y, vy: 0 };
    pipes = [];
    accumulator = 0;
    for (let i = 0; i < chunks; i++) advance(ms);
    return bird.y;
  }, { chunks, ms });
  {
    // Inside MAX_CATCHUP_MS, so no frame here is clamped.
    const total = Math.min(C.MAX_CATCHUP_MS, 200);
    const oneFrame = await flightFor(1, total);
    const manyFrames = await flightFor(10, total / 10);
    // Within one tick, not identical: the accumulator carries the leftover, so a
    // span landing exactly on a tick boundary can fall either side of it by one.
    // What this rules out is the real failure - scaling by a frame delta, where
    // ten frames and one frame diverge by the whole ratio between them.
    check("one long frame matches ten short ones, to within a tick",
      Math.abs(oneFrame - manyFrames) <= C.MAX_FALL_SPEED, `${oneFrame} vs ${manyFrames}`);
    const ticks = await page.evaluate((ms) => {
      accumulator = 0;
      return advance(ms);
    }, C.MAX_CATCHUP_MS * 4);
    check("a stalled frame is capped rather than replayed whole",
      ticks <= Math.ceil(C.MAX_CATCHUP_MS / C.TICK_MS), ticks);
  }

  console.log("13. a finished run is not restarted by the flap that was already in flight");
  await freezePlaying();
  await page.evaluate(() => { score = 3; endRun("pipe"); });
  await page.evaluate(() => flap());
  check("still over", (await read()).phase === "over");
  // Wind the clock back past the lockout rather than waiting it out.
  await page.evaluate((ms) => { overAt = performance.now() - ms - 50; }, C.RESTART_LOCKOUT_MS);
  await page.evaluate(() => { flap(); cancelAnimationFrame(rafId); running = false; rafId = null; });
  {
    const s = await read();
    check("a later flap starts a new run", s.phase !== "over", s.phase);
    check("score reset", s.score === 0, s.score);
    check("bird back at its resting height", s.bird.y === C.BIRD_START_Y, s.bird.y);
  }

  console.log("14. the best score is kept, and only beaten upwards");
  await freezePlaying();
  await page.evaluate(() => { score = 7; endRun("pipe"); });
  {
    const s = await read();
    check("best recorded", s.best === 7, s.best);
    check("hud shows it", s.bestText.includes("7"), s.bestText);
    check("status calls it out", /best/i.test(s.status), s.status);
  }
  check("stored under the documented key",
    (await page.evaluate(() => localStorage.getItem("flappy.bestScore"))) === "7");
  await freezePlaying();
  await page.evaluate(() => { score = 2; endRun("ground"); });
  {
    const s = await read();
    check("a worse run leaves it alone", s.best === 7, s.best);
    check("and does not claim a record", !/best/i.test(s.status), s.status);
  }

  console.log("15. it survives a reload");
  await page.reload();
  await page.waitForSelector("#board");
  await freeze();
  {
    const s = await read();
    check("best restored", s.best === 7, s.best);
    check("score starts over", s.score === 0, s.score);
  }

  console.log("16. restart clears the run but not the record");
  await page.evaluate(() => { phase = "play"; score = 4; bird.y = 10; });
  await page.click("#restart");
  await freeze();
  {
    const s = await read();
    check("back to waiting", s.phase === "ready", s.phase);
    check("score cleared", s.score === 0, s.score);
    check("bird re-centred", s.bird.y === C.BIRD_START_Y, s.bird.y);
    check("one pipe seeded again", s.pipes.length === 1, s.pipes.length);
    check("prompt is back", /flap/i.test(s.status), s.status);
    check("record kept", s.best === 7, s.best);
  }

  console.log("17. the help panel, and who owns the Space bar afterwards");
  await page.click("#help-toggle");
  await page.waitForTimeout(120);
  check("panel visible", await page.isVisible("#instructions"));
  check("aria-expanded=true",
    (await page.getAttribute("#help-toggle", "aria-expanded")) === "true");
  check("label flips", (await page.textContent("#help-toggle")).includes("Hide"),
    await page.textContent("#help-toggle"));
  await page.focus("#help-toggle");
  await page.keyboard.press("Space");
  await page.waitForTimeout(60);
  await freeze();
  {
    const s = await read();
    check("the bird stayed put", s.phase === "ready", s.phase);
    check("panel toggled instead", !(await page.isVisible("#instructions")));
  }

  // The reported bug, replayed: a round flown with Space, then How to play
  // clicked with the mouse, and from then on Space belonged to the button - the
  // panel opening and closing instead of the bird flapping, even after clicking
  // the board. Stubbed loop so no live frame races the reads; what is under test
  // is which element the key reaches, not how fast a frame lands.
  await page.evaluate(() => { start = () => {}; });
  await page.click("#restart");
  await page.keyboard.press("Space");
  check("Space flies the bird to begin with", (await read()).phase === "play",
    (await read()).phase);
  await page.click("#help-toggle");
  await page.click("#restart");
  await page.keyboard.press("Space");
  {
    const s = await read();
    check("Space still flaps after clicking How to play", s.phase === "play", s.phase);
    check("and the panel it opened stayed open",
      await page.isVisible("#instructions"));
  }

  // The other half of the report: whatever had the focus, clicking the board
  // hands the keyboard back to the game.
  await page.click("#help-toggle");
  await page.click("#restart");
  await page.focus("#help-toggle");
  await page.click("#board", { position: { x: 200, y: 300 } });
  await page.keyboard.press("Space");
  {
    const s = await read();
    check("clicking the board takes the keyboard back", s.phase === "play", s.phase);
    check("so Space did not reach the button",
      (await page.getAttribute("#help-toggle", "aria-expanded")) === "false",
      await page.getAttribute("#help-toggle", "aria-expanded"));
  }

  console.log("18. clicking the board flaps");
  await page.click("#restart");
  await page.click("#board", { position: { x: 200, y: 300 } });
  {
    const s = await read();
    check("a click launches the run", s.phase === "play", s.phase);
    check("and lifts the bird", s.bird.vy === C.FLAP_VELOCITY, s.bird.vy);
  }

  check("no page errors", errors.length === 0, errors.join("; "));

  console.log("19. the game survives localStorage being unavailable");
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
  // First, because an unguarded read throws while the script is still loading and
  // every check after it would then be reading a half-run page.
  check("nothing thrown on load", errors2.length === 0, errors2.join("; "));
  check("page still loads",
    (await page2.evaluate(() => (typeof phase === "string" ? phase : null))) === "ready");
  // The dash in the HUD is in the HTML to begin with, so seeing one proves
  // nothing on its own - this is the part only a guarded read can produce.
  check("the guarded read reports no record rather than throwing",
    await page2.evaluate(() => {
      try { return loadBestScore() === null; } catch { return false; }
    }));
  check("best shows a dash",
    (await page2.textContent("#best-score")).includes("—"),
    await page2.textContent("#best-score"));
  const over = await page2.evaluate(() => {
    try {
      phase = "play";
      score = 5;
      endRun("pipe");
      return { phase, status: document.getElementById("status").textContent };
    } catch (e) {
      return { phase: `threw: ${e.message}`, status: "" };
    }
  });
  check("still playable to the end", over.phase === "over", over.phase);
  check("does not falsely claim a record", !/best/i.test(over.status), over.status);
  check("nothing thrown with storage disabled", errors2.length === 0, errors2.join("; "));

  await browser.close();
  process.exit(report());
})();
