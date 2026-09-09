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

// A canvas cannot read CSS custom properties, so the theme tokens are copied
// into plain values here and re-copied whenever the OS theme flips. The sky is
// not among them: the canvas is cleared rather than filled, so the background
// on #board in style.css shows through and follows the theme on its own.
function readColors() {
  const style = getComputedStyle(document.documentElement);
  const p = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
  return {
    // The bird is the arcade tile's own hue, the way Pong's player is.
    bird: p("--p-rose", "#ff7fcb"),
    // Dying is an outcome, so it is the one thing here that reads --lose.
    dead: p("--lose", "#ff6a56"),
    beak: p("--p-amber", "#ffb000"),
    eye: p("--p-hot", "#fff2da"),
    pupil: p("--bg", "#0a0704"),
    // The world's furniture: the ground that ends the run and the ceiling that
    // only stops you, which have to look like different kinds of edge.
    ground: p("--p-amber", "#ffb000"),
    ceiling: p("--p-rule", "#7a5008"),
    // The pipes, per direction. PREVIEW: two of these three go.
    coral: p("--lose", "#ff6a56"),
    amber: p("--p-amber", "#ffb000"),
    rule: p("--p-rule", "#7a5008"),
    body: p("--p-panel-lit", "#221709"),
    cyan: p("--p-cyan", "#6fdcf2"),
  };
}

let colors = readColors();
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
darkQuery.addEventListener("change", () => { colors = readColors(); draw(); });

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

function drawBird() {
  const r = BIRD_SIZE / 2;
  // Nose down as it falls, up as it climbs. Clamped so a long drop does not end
  // up flying backwards.
  const tilt = Math.max(-0.4, Math.min(0.9, bird.vy * 0.06));
  ctx.save();
  ctx.translate(BIRD_X + r, bird.y + r);
  ctx.rotate(tilt);

  ctx.fillStyle = phase === "over" ? colors.dead : colors.bird;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = colors.beak;
  ctx.beginPath();
  ctx.moveTo(r - 2, -2);
  ctx.lineTo(r + 7, 2);
  ctx.lineTo(r - 2, 6);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = colors.eye;
  ctx.beginPath();
  ctx.arc(r * 0.35, -r * 0.3, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.pupil;
  ctx.beginPath();
  ctx.arc(r * 0.5, -r * 0.3, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// PREVIEW: three directions for the pipes, one of which survives.
//
// Every one of them paints strictly *inside* the rectangle it is handed. The
// hitbox is exactly that rectangle, so a lip, an inset or a glow reaching past
// the edge would make the pipe a different size to look at than to fly through.
const PIPE_STYLES = {
  // Slab: solid, in the hue the opponent wears in Pong.
  a(x, y, w, h) {
    ctx.fillStyle = colors.coral;
    ctx.fillRect(x, y, w, h);
  },

  // Conduit: the machine's own amber. A dark body so the pipe still reads as
  // solid mass, a lit rim just inside the edge, and rungs across it.
  b(x, y, w, h) {
    ctx.fillStyle = colors.body;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = colors.rule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let ry = y + 16; ry < y + h - 10; ry += 16) {
      ctx.moveTo(x + 4, Math.round(ry) + 0.5);
      ctx.lineTo(x + w - 4, Math.round(ry) + 0.5);
    }
    ctx.stroke();
    ctx.strokeStyle = colors.amber;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  },

  // Gate: lit glass in a guest hue that is nobody's outcome. The glow is
  // clipped to the rectangle so the light stops where the pipe does.
  c(x, y, w, h) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = "rgba(111, 220, 242, 0.22)";
    ctx.fillRect(x, y, w, h);
    ctx.shadowColor = colors.cyan;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = colors.cyan;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.restore();
  },
};

let pipeStyle = "b";

// The two edges of the world, which behave differently and so cannot look the
// same. The ground is drawn on the pixels that end the run; the ceiling, which
// only stops the bird, is a broken dim rule.
function drawEdges() {
  ctx.fillStyle = colors.ground;
  ctx.fillRect(0, HEIGHT - 2, WIDTH, 2);
  ctx.fillStyle = colors.ceiling;
  for (let x = 0; x < WIDTH; x += 12) ctx.fillRect(x, 0, 7, 1);
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawEdges();
  for (const p of pipes) {
    PIPE_STYLES[pipeStyle](p.x, 0, PIPE_WIDTH, p.gapTop);
    PIPE_STYLES[pipeStyle](p.x, p.gapTop + PIPE_GAP, PIPE_WIDTH, HEIGHT - p.gapTop - PIPE_GAP);
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

/* ---------- PREVIEW ONLY — delete this block, PIPE_STYLES and #vstrip ---------- */

const BIRD_GLYPH = `<svg viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="21" cy="23" rx="11.5" ry="9.5" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M31.8 20.5l9 2.5-9 2.5z" fill="currentColor"/><circle cx="26" cy="19.5" r="2" fill="currentColor"/><path d="M14.5 20.5c6 0.5 9.5 3.5 11 8-6.5 0.5-10.5-2.5-11-8z" fill="currentColor"/><path d="M10.5 20.5l-7-4 1.5 8z" fill="currentColor"/><path d="M17 32.3l-1.6 6M23.5 32.3l-1 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

const CUP_GLYPH = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M16 11h16v8a8 8 0 0 1-16 0z" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M16 13h-4v3a5 5 0 0 0 5 5M32 13h4v3a5 5 0 0 1-5 5" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M24 27v6M18 37h12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`;

(function previewStrip() {
  const strip = document.getElementById("vstrip");
  if (!strip) return;
  const hud = document.querySelector(".hud");

  scoreEl.insertAdjacentHTML("afterbegin", `<span class="gly">${BIRD_GLYPH}</span>`);
  bestScoreEl.insertAdjacentHTML("afterbegin", `<span class="gly">${CUP_GLYPH}</span>`);
  hud.dataset.hud = "words";

  function group(label, options, apply) {
    strip.insertAdjacentHTML("beforeend", `<span>${label}</span>`);
    const made = options.map(([value, text]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = text;
      b.addEventListener("click", () => {
        apply(value);
        made.forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
        b.blur(); // Space is a flap key, and a focused button would eat it
      });
      strip.appendChild(b);
      return b;
    });
    made[0].click();
  }

  group("pipes", [["b", "conduit"], ["a", "slab"], ["c", "gate"]], (v) => {
    pipeStyle = v;
    draw();
  });
  group("readout", [["words", "words"], ["icons", "icons"]], (v) => {
    hud.dataset.hud = v;
  });
})();
