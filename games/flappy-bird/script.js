const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("best-score");
const restartBtn = document.getElementById("restart");
const helpToggle = document.getElementById("help-toggle");
const instructionsEl = document.getElementById("instructions");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// One physics tick. Every speed and distance-per-time constant below is per
// tick, not per rendered frame: loop() runs a whole number of ticks per frame,
// so the bird falls at the same rate on a 60Hz display and a 144Hz one. Scaling
// by a frame delta instead would make the same flap clear a different gap on
// different machines, and make a recorded run unreproducible.
const TICK_MS = 1000 / 60;
// Longest stretch of real time one frame may simulate, so a stalled frame is
// caught up on rather than replayed all at once.
const MAX_CATCHUP_MS = 250;

const GRAVITY = 0.45;         // added to vy every tick
const FLAP_VELOCITY = -7.6;   // vy is *set* to this, never added to: a flap is a
                              // fixed hop, so mashing cannot accumulate lift
const MAX_FALL_SPEED = 11;    // terminal velocity, px per tick
const SCROLL_SPEED = 2.4;     // px the world moves left each tick

const BIRD_X = 90;            // the bird never moves horizontally; the world does
const BIRD_SIZE = 24;
const BIRD_START_Y = HEIGHT / 2 - BIRD_SIZE / 2;

const PIPE_WIDTH = 60;
const PIPE_GAP = 150;         // the hole the bird flies through
const PIPE_SPACING = 220;     // gap between one pipe's left edge and the next
const PIPE_MARGIN = 60;       // closest a gap comes to the ceiling or the ground
// Far enough off-screen that a new run gives you a few seconds before the first
// pipe arrives, rather than starting mid-emergency.
const FIRST_PIPE_X = WIDTH + 60;

// A flap restarts a finished run, but not one already in the air when it ended:
// without this a player mashing the button is flying again before they have
// registered that they died.
const RESTART_LOCKOUT_MS = 600;

const BEST_SCORE_KEY = "flappy.bestScore";

const READY_PROMPT = "Click, tap or press Space to flap";

// A canvas cannot read CSS custom properties, so the values the board paints
// with are copied into plain ones here. The palette is dark-only, so this runs
// once — see design/DESIGN.md, "Dark only". The sky is not among them: the
// canvas is cleared rather than filled, so #board's background shows through.
//
// Every fallback is the value design/DESIGN.md records for that name, so a
// missing token paints today's palette rather than a design that was replaced.
function readColors() {
  const style = getComputedStyle(document.documentElement);
  const p = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
  return {
    // The bird is the machine's own amber, and it is the only amber inside the
    // board: the world's edges take the pipes' hue so the two do not collide.
    bird: p("--p-amber", "#ffb000"),
    // Dying is an outcome, so it is the one thing here that reads --lose.
    dead: p("--lose", "#ff6a56"),
    eye: p("--p-hot", "#fff2da"),
    pupil: p("--bg", "#0a0704"),
    // The pipes, the ground that ends the run and the ceiling that only stops
    // you — one hue for the whole world, so the bird is the only other thing.
    world: p("--p-cyan", "#6fdcf2"),
  };
}

// A canvas needs a colour, not a colour and an alpha, so the translucent fills
// are mixed here rather than with color-mix().
function veil(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

const colors = readColors();

// "ready" waits for the first flap, "play" is a live run, "over" is a dead one.
// update() returns immediately outside "play", which is what lets a test place
// the bird and the pipes and then step time by hand.
let phase = "ready";
let bird = { y: BIRD_START_Y, vy: 0 };
let pipes = [];
let score = 0;
let overAt = 0;         // wall clock at death, for RESTART_LOCKOUT_MS only
let rafId = null;
let running = false;
let accumulator = 0;
let lastFrame = null;

// localStorage throws rather than returning null when it is unavailable, so
// every access is wrapped and "cannot read" degrades to having no record.
function loadBestScore() {
  try {
    const n = Number(localStorage.getItem(BEST_SCORE_KEY));
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

// Reports whether it stuck. A run only gets called a record if it was actually
// recorded, so a browser that cannot store anything says nothing rather than
// announcing a personal best on every single run.
function saveBestScore(n) {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(n));
    return true;
  } catch {
    return false;
  }
}

function newPipe(x) {
  const span = HEIGHT - PIPE_GAP - PIPE_MARGIN * 2;
  return { x, gapTop: PIPE_MARGIN + Math.random() * span, passed: false };
}

// The label beside each number is markup, so only the number is rewritten.
function renderScore() {
  scoreEl.querySelector(".n").textContent = String(score);
}

// Read back from storage rather than from a cached copy, so "unavailable" and
// "no record yet" are the same thing here and neither needs its own branch.
function renderBest() {
  const best = loadBestScore();
  bestScoreEl.querySelector(".n").textContent = best === null ? "—" : String(best);
}

// What the bird is touching, or null. The pipe hitbox is exactly the rectangles
// draw() paints - no lip, no inset - so what kills you is what you can see.
function collision() {
  if (bird.y + BIRD_SIZE >= HEIGHT) return "ground";
  for (const p of pipes) {
    if (BIRD_X + BIRD_SIZE <= p.x || BIRD_X >= p.x + PIPE_WIDTH) continue;
    if (bird.y < p.gapTop || bird.y + BIRD_SIZE > p.gapTop + PIPE_GAP) return "pipe";
  }
  return null;
}

function update() {
  if (phase !== "play") return;

  bird.vy = Math.min(bird.vy + GRAVITY, MAX_FALL_SPEED);
  bird.y += bird.vy;
  // The ceiling stops the bird rather than killing it. Dying to something above
  // the screen, that you cannot see coming, reads as the game cheating.
  if (bird.y < 0) {
    bird.y = 0;
    bird.vy = 0;
  }

  for (const p of pipes) {
    p.x -= SCROLL_SPEED;
    if (!p.passed && p.x + PIPE_WIDTH < BIRD_X) {
      p.passed = true;
      score++;
      renderScore();
    }
  }
  while (pipes.length && pipes[0].x + PIPE_WIDTH < 0) pipes.shift();
  // Spaced off the last pipe rather than off the screen edge, so the interval
  // stays exact however the ticks happen to land.
  const last = pipes[pipes.length - 1];
  if (!last || last.x <= WIDTH - PIPE_SPACING) {
    pipes.push(newPipe(last ? last.x + PIPE_SPACING : FIRST_PIPE_X));
  }

  const hit = collision();
  if (hit) endRun(hit);
}

function endRun(hit) {
  phase = "over";
  overAt = performance.now();
  const best = loadBestScore();
  const record = score > 0 && (best === null || score > best) && saveBestScore(score);
  renderBest();
  const what = hit === "ground" ? "Hit the ground" : "Hit a pipe";
  statusEl.textContent = record
    ? `New best — ${score} ${score === 1 ? "pipe" : "pipes"}! Flap to fly again.`
    : `${what} — ${score} cleared. Flap to fly again.`;
}
// How far the bird's light reaches past its own edge. It is the only thing on
// the board drawn outside its own hitbox, and it is deliberate: the glow says
// the bird is alive, and going out is half of how death reads.
const BIRD_GLOW = 10;

// The bird is drawn about the origin inside a box BIRD_SIZE across, which is
// exactly the hitbox: the bird has to be the size it kills at. An earlier beak
// reached seven pixels past its own right edge, which made the bird look wider
// than it flies — see games/flappy-bird/DESIGN.md.
//
// Line work rather than a solid shape, because everything else on the board is
// line work: the gates are hollow, the ceiling is a broken rule.
function drawBirdShape(r, c) {
  ctx.strokeStyle = c;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
  ctx.stroke();

  // The wing, solid, inside the circle rather than hung off it: ink on a hollow
  // body is what stops the outline reading as a plain ring.
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(-6.5, -1.5);
  ctx.bezierCurveTo(-2.5, -1, 0.5, 1.5, 1.5, 5);
  ctx.bezierCurveTo(-2.5, 5.5, -6, 2.5, -6.5, -1.5);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(r - 8, -2);
  ctx.lineTo(r - 1, 1);
  ctx.lineTo(r - 8, 4.5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = colors.eye;
  ctx.beginPath();
  ctx.arc(r * 0.3, -r * 0.34, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.pupil;
  ctx.beginPath();
  ctx.arc(r * 0.4, -r * 0.34, 1.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawBird() {
  const r = BIRD_SIZE / 2;
  // Nose down as it falls, up as it climbs. Clamped so a long drop does not end
  // up flying backwards.
  const tilt = Math.max(-0.4, Math.min(0.9, bird.vy * 0.06));
  const dead = phase === "over";
  const c = dead ? colors.dead : colors.bird;
  ctx.save();
  ctx.translate(BIRD_X + r, bird.y + r);
  ctx.rotate(tilt);
  // Death keeps the drawing and changes its state: the ink goes to the outcome
  // colour and the light goes out. Swapping the bird for a solid shape was
  // tried and rejected — on a board of line work it reads as a piece from
  // another game.
  //
  // A single shadowed pass is almost entirely hidden behind the shape casting
  // it, so the halo is built by repainting and the clean shape goes on top.
  if (!dead) {
    ctx.shadowColor = c;
    ctx.shadowBlur = BIRD_GLOW;
    drawBirdShape(r, c);
    drawBirdShape(r, c);
    ctx.shadowBlur = 0;
  }
  drawBirdShape(r, c);
  ctx.restore();
}

// A pipe is lit glass rather than a slab: a veil of its own hue, a rim just
// inside the edge, and a glow clipped to the rectangle so the light stops where
// the pipe does. Nothing is painted outside the rectangle it is handed — the
// hitbox is exactly that rectangle, and a lip or a spill would make the pipe a
// different size to fly through than to look at.
const PIPE_VEIL = 0.22;
const PIPE_GLOW = 14;

function drawPipe(x, y, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = veil(colors.world, PIPE_VEIL);
  ctx.fillRect(x, y, w, h);
  ctx.shadowColor = colors.world;
  ctx.shadowBlur = PIPE_GLOW;
  ctx.strokeStyle = colors.world;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.restore();
}

// The two edges of the world, which behave differently and so cannot look the
// same. The ground is drawn on the pixels that end the run; the ceiling, which
// only stops the bird, is a broken rule at half strength. Both wear the pipes'
// hue rather than the machine's amber, so the bird is the only amber inside
// the board.
const CEILING_VEIL = 0.45;

function drawEdges() {
  ctx.fillStyle = colors.world;
  ctx.fillRect(0, HEIGHT - 2, WIDTH, 2);
  ctx.fillStyle = veil(colors.world, CEILING_VEIL);
  for (let x = 0; x < WIDTH; x += 12) ctx.fillRect(x, 0, 7, 1);
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawEdges();
  for (const p of pipes) {
    drawPipe(p.x, 0, PIPE_WIDTH, p.gapTop);
    drawPipe(p.x, p.gapTop + PIPE_GAP, PIPE_WIDTH, HEIGHT - p.gapTop - PIPE_GAP);
  }
  drawBird();
}

// Drain accumulated real time into fixed-size ticks. Returns how many it ran,
// which is what makes the pacing testable without controlling the frame rate.
function advance(elapsedMs) {
  accumulator += Math.min(elapsedMs, MAX_CATCHUP_MS);
  let ticks = 0;
  while (accumulator >= TICK_MS) {
    update();
    accumulator -= TICK_MS;
    ticks++;
  }
  return ticks;
}

function loop(now) {
  if (lastFrame === null) lastFrame = now;
  advance(now - lastFrame);
  lastFrame = now;
  draw();
  // Nothing moves once the run is over, so stop scheduling frames rather than
  // redrawing a frozen board forever. restart() starts it again.
  if (phase === "over") {
    running = false;
    rafId = null;
    return;
  }
  rafId = requestAnimationFrame(loop);
}

// Guarded by `running` rather than by rafId, so a caller which has already
// cancelled the pending frame - the test harness does exactly this - does not
// get the loop restarted underneath it.
function start() {
  if (running) return;
  running = true;
  lastFrame = null;
  rafId = requestAnimationFrame(loop);
}

function stop() {
  running = false;
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
}

function flap() {
  if (phase === "over") {
    if (performance.now() - overAt >= RESTART_LOCKOUT_MS) restart();
    return;
  }
  if (phase === "ready") {
    phase = "play";
    statusEl.textContent = "";
    start();
  }
  bird.vy = FLAP_VELOCITY;
}

function restart() {
  stop();
  phase = "ready";
  bird = { y: BIRD_START_Y, vy: 0 };
  pipes = [newPipe(FIRST_PIPE_X)];
  score = 0;
  accumulator = 0;
  renderScore();
  renderBest();
  statusEl.textContent = READY_PROMPT;
  draw();
}

function toggleInstructions() {
  const open = instructionsEl.hasAttribute("hidden");
  instructionsEl.toggleAttribute("hidden", !open);
  helpToggle.setAttribute("aria-expanded", String(open));
  helpToggle.textContent = open ? "Hide instructions" : "How to play";
}

const FLAP_KEYS = [" ", "ArrowUp", "w", "W"];

function handleKeyDown(e) {
  // A held key repeats at the OS rate, and a flap per repeat is an autofire that
  // pins the bird to the ceiling. One press is one hop.
  if (e.repeat) return;
  if (!FLAP_KEYS.includes(e.key)) return;
  // A focused button takes Space and Enter as its own activation; flapping as
  // well would mean opening the help panel also launched the bird.
  if (e.target instanceof HTMLButtonElement) return;
  e.preventDefault(); // Space and the arrows scroll the document by default
  flap();
}

// A hidden tab gets no frames, so the first one back would otherwise simulate
// however long it was away - capped, but still a long enough fall to kill you
// while you were not looking. Forgetting the timestamp makes that frame span no
// time at all.
document.addEventListener("visibilitychange", () => { lastFrame = null; });

// A clicked button keeps the focus, and a focused button takes the Space bar as
// its own activation - so after clicking How to play, every Space toggled the
// panel instead of flapping. Hand the focus back on a *pointer* click only: a
// keyboard activation (detail 0) has to keep it, or tabbing through the controls
// would drop the focus on the first press.
function releaseFocus(e) {
  if (e.detail > 0) e.currentTarget.blur();
}

// pointerdown rather than click: it covers mouse and touch in one handler and
// fires at the press, so a flap lands when the finger goes down.
canvas.addEventListener("pointerdown", (e) => {
  // preventDefault suppresses the mousedown that would normally move the focus,
  // so do that part by hand. Clicking the board is a player saying the game has
  // the keyboard now, and it has to work whatever they clicked last.
  e.preventDefault();
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  flap();
});
document.addEventListener("keydown", handleKeyDown);
restartBtn.addEventListener("click", restart);
restartBtn.addEventListener("click", releaseFocus);
helpToggle.addEventListener("click", toggleInstructions);
helpToggle.addEventListener("click", releaseFocus);
restart();
