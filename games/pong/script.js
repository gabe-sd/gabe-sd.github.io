const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restart");
const helpToggle = document.getElementById("help-toggle");
const instructions = document.getElementById("instructions");
const scoreReader = document.getElementById("score-reader");
const menu = document.getElementById("menu");
const menuHeading = document.getElementById("menu-heading");
const playBtn = document.getElementById("play");
const difficultyBtns = [...document.querySelectorAll("#difficulty [data-level]")];

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 80;
const PADDLE_SPEED = 6;
// Everything the ai does, in one place. The point of the numbers is that its
// mistakes emerge from reading the ball badly rather than from deciding up front
// how much to miss by — it must not solve the whole trajectory the moment the
// ball is struck. Every knob names the value that switches its feature off, so
// any of this can be isolated or removed without unpicking the rest.
const AI = {
  speed: 4.5,             // normal top speed, px per tick
  reactionTicks: 12,      // stands still this long after the ball turns; 0 = instant

  // Reading the ball.
  lookaheadBounces: 1,    // wall bounces it can see coming; Infinity = perfect read
  resampleTicks: 9,       // ticks between glances at the ball; 1 = watches constantly
  resampleJitter: 4,      // +/- ticks of variation in that; 0 = metronomic
  readErrorFarPx: 70,     // how far out its read is at the far end of the board
  readErrorNearPx: 30,    // ...and by the time the ball arrives. Never 0: nobody
                          // is certain, and an ai that ends up certain never misses
  readConvergence: 0.55,  // <1 keeps it wrong for most of the flight and realises
                          // late, which is what stops it committing early; 1 = the
                          // read tightens evenly all the way in
  readJitterPx: 5,        // fresh wobble on each glance at full ball speed; 0 = none
  jitterAtSlowBall: 0.15, // fraction of that wobble at serve speed. A slow ball is
                          // easy to follow and the paddle should look settled on
                          // it; 1 = wobble the same however fast the ball is
  aimSpread: 0.6,         // how far off its own centre it tries to hit; 0 = dead centre

  // Moving the paddle. accelTicks 0 with brakeTicks 1 is the old behaviour
  // exactly: full speed instantly, dead stop on arrival.
  accelTicks: 7,          // ticks to wind up to full speed; 0 = no easing
  brakeTicks: 2,          // how early it starts slowing. Below about 4 it brakes
                          // later than it can stop and overshoots by a few px,
                          // then corrects; 4 or more glides straight in
  panicSpeed: 7,          // speed when badly out of position; = speed disables it
  panicDistancePx: 90,    // how far behind it must be to lunge; Infinity = never
};

// Difficulty is a set of overrides on AI and nothing else — both sides play the
// same game, so the share of shots the ai saves measures the difference honestly.
// The figures are what each preset measured at; they are starting points to tune
// by feel, not settings to preserve.
const DIFFICULTY = {
  easy: { readErrorNearPx: 60, reactionTicks: 24, lookaheadBounces: 0 }, // ~73%
  medium: { readErrorNearPx: 45, reactionTicks: 18 },                    // ~87%
  hard: { readErrorNearPx: 22, reactionTicks: 8 },                       // ~95%
};
// Applied over a pristine copy each time, or switching down from a preset would
// leave whatever the previous one had overridden.
const AI_DEFAULTS = { ...AI };
const DIFFICULTY_KEY = "pong.difficulty";
let difficulty = "medium";
const BALL_SIZE = 10;
const WIN_SCORE = 5;

// One physics tick. Every speed constant here is per tick, not per rendered
// frame: loop() runs a whole number of ticks per frame, so the game plays the
// same at 60Hz and 144Hz. The values are unchanged from when they were per-frame
// at 60Hz, so the feel on a 60Hz display is exactly what it was.
const TICK_MS = 1000 / 60;
// Longest stretch of real time a single frame may simulate. A backgrounded tab
// stops receiving frames, so without this the first frame back tries to catch up
// on however long it was away, all at once.
const MAX_CATCHUP_MS = 250;

const BALL_SPEED = 5;
const BALL_SPEED_MAX = 10;
const BALL_SPEEDUP = 1.05;
// Steepest a paddle can send the ball, measured off the horizontal.
const MAX_BOUNCE_ANGLE = Math.PI / 3;
// Pause between a point and the next serve, in ticks. Counted in ticks rather
// than milliseconds so it is exact and does not need a second clock.
const SERVE_DELAY_TICKS = 60;
// The vertical lines a ball has to cross to reach a paddle: the inside face of
// each one, offset on the right by the ball's own width.
// ball.x/y are the ball's top left corner, so centring it means backing off half
// its width. Setting them to WIDTH/2, HEIGHT/2 put it a full half-width right of
// the centre line, which draw() renders at exactly WIDTH/2.
const CENTRE_X = WIDTH / 2 - BALL_SIZE / 2;
const CENTRE_Y = HEIGHT / 2 - BALL_SIZE / 2;
const PLAYER_PLANE = PADDLE_WIDTH;
const AI_PLANE = WIDTH - PADDLE_WIDTH - BALL_SIZE;

// A canvas cannot read CSS custom properties, so the theme tokens are copied
// into plain values here and re-copied whenever the OS theme flips.
function readColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    fg: style.getPropertyValue("--fg").trim() || "#1c1c1e",
    accent: style.getPropertyValue("--accent").trim() || "#3b82f6",
    border: style.getPropertyValue("--cell-border").trim() || "#c7c7cc",
  };
}

let colors = readColors();
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
darkQuery.addEventListener("change", () => { colors = readColors(); });

let player = { y: HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 };
let ai = { y: HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 };
let ball = centredBall();
let keys = { up: false, down: false };
let gameOver = false;
let rafId = null;
let accumulator = 0;
let lastFrame = null;
let running = false;
let control = "keyboard"; // or "pointer" - whichever the player last used
let pointerAnchor = null;
// "serve" waits for the player, "countdown" is the pause after a point, "play" is
// a live ball. The ball sits still at the centre in everything but "play".
let phase = "menu";
let serveTicks = 0;
let serveTo = Math.random() < 0.5 ? 1 : -1; // -1 travels left, towards the player
let paused = false;
let aiTarget = (HEIGHT - PADDLE_HEIGHT) / 2;
let aiVel = 0;
let aiNextRead = 0;
let aiErrorSign = 0; // which way this approach's misread leans, rolled once
let aiAim = 0;
let aiReactionLeft = 0;
let aiApproaching = false;

// localStorage throws rather than returning null when it is unavailable, so every
// access is wrapped and "cannot read" falls back to the default.
function loadDifficulty() {
  try {
    const raw = localStorage.getItem(DIFFICULTY_KEY);
    return DIFFICULTY[raw] ? raw : null;
  } catch {
    return null;
  }
}

function saveDifficulty(level) {
  try {
    localStorage.setItem(DIFFICULTY_KEY, level);
  } catch {
    // Not being able to remember the choice is not worth breaking the game over.
  }
}

function applyDifficulty(level) {
  difficulty = DIFFICULTY[level] ? level : "medium";
  Object.assign(AI, AI_DEFAULTS, DIFFICULTY[difficulty]);
  for (const b of difficultyBtns) {
    b.setAttribute("aria-checked", String(b.dataset.level === difficulty));
  }
}

function showMenu(heading = "") {
  phase = "menu";
  menuHeading.textContent = heading;
  menu.hidden = false;
  updateStatus();
}

function centredBall() {
  return { x: CENTRE_X, y: CENTRE_Y, vx: 0, vy: 0 };
}

// dir is the direction of travel, not a random choice: the serve goes to whoever
// conceded the last point, so a point cannot be won by the coin flip that used to
// decide this.
function newBall(dir) {
  const angle = (Math.random() * 0.6 - 0.3) * Math.PI;
  return {
    x: CENTRE_X,
    y: CENTRE_Y,
    vx: dir * BALL_SPEED * Math.cos(angle),
    vy: BALL_SPEED * Math.sin(angle),
  };
}

function serve() {
  ball = newBall(serveTo);
  phase = "play";
  updateStatus();
}

function setPaused(value) {
  if (gameOver || paused === value) return;
  paused = value;
  updateStatus();
}

// #status is game state only. draw() already paints both scores across the top of
// the canvas, so repeating them here would be the same information twice; the
// score goes to the hidden live region instead, which is the only way it reaches
// anyone not looking at the canvas.
function updateStatus() {
  scoreReader.textContent = `You ${player.score}, AI ${ai.score}`;
  if (phase === "menu") {
    statusEl.textContent = ""; // the menu heading carries the result
  } else if (gameOver) {
    statusEl.textContent = player.score > ai.score ? "You win! 🎉" : "AI wins!";
  } else if (paused) {
    statusEl.textContent = "Paused · Esc to resume";
  } else if (phase === "countdown") {
    statusEl.textContent = "Serving…";
  } else if (phase === "serve") {
    statusEl.textContent = "Press Space to serve";
  } else {
    statusEl.textContent = ""; // nothing to say during a rally
  }
}

// Reflect off a paddle, dir being the direction the ball leaves in. The angle
// comes from where the ball struck relative to the paddle's centre, and the
// speed is recomputed from scratch and capped. The previous version multiplied
// vx and *added* to vy on every hit, so vy grew without bound - a long rally
// ended with the ball travelling almost vertically and outrunning the collision
// check.
// Where the ball's path this tick crossed a vertical plane, or null if it did not
// cross it going the right way. Testing the crossing rather than the position at
// the end of the tick is what stops a paddle catching a ball that is already
// past it: `ball.x <= PADDLE_WIDTH` stays true for several ticks as a missed
// ball travels off the board, so a late-arriving paddle used to rescue it.
// Where the ball will meet the ai's plane. Walking the bounces rather than
// folding the path means the walk can be cut short: an ai that can only see one
// bounce ahead genuinely misreads a ball that is going to bounce three times,
// which is the case that most exposed the old one as a machine. The returned y
// can fall outside the board when the lookahead runs out — that is the misread,
// and the paddle clamp turns it into "parked against a wall, lost it".
function predictInterceptY(maxBounces = Infinity) {
  if (ball.vx <= 0) return null;
  const dist = AI_PLANE - ball.x;
  if (dist <= 0) return null;
  const span = HEIGHT - BALL_SIZE;
  let y = ball.y;
  let vy = ball.vy;
  let left = dist / ball.vx; // ticks until it arrives
  let bounces = 0;
  while (left > 0) {
    const toWall = vy > 0 ? (span - y) / vy : vy < 0 ? -y / vy : Infinity;
    if (!(toWall < left) || bounces >= maxBounces) {
      y += vy * left;
      break;
    }
    y += vy * toWall;
    left -= toWall;
    vy = -vy;
    bounces += 1;
  }
  return y;
}

// Take a fresh look at the ball and decide where to stand. Called on a timer
// rather than every tick, so the paddle is always acting on a slightly old read.
// 0 at serve speed, 1 at the speed cap. The ai reads a slow ball comfortably and
// a fast one badly, so what it is watching scales its wobble rather than every
// shot being equally hard to follow.
function ballSpeedFraction() {
  const speed = Math.hypot(ball.vx, ball.vy);
  const range = Math.max(1e-9, BALL_SPEED_MAX - BALL_SPEED);
  return Math.max(0, Math.min(1, (speed - BALL_SPEED) / range));
}

function aiGlance() {
  const hit = predictInterceptY(AI.lookaheadBounces);
  if (hit === null) return;
  // Its read tightens as the ball gets closer: a long way out it is guessing,
  // and by the time the ball arrives it mostly knows. This is what stops it
  // walking straight to the answer the instant the ball is struck.
  const far = (AI_PLANE - ball.x) / (AI_PLANE - PLAYER_PLANE);
  const t = Math.max(0, Math.min(1, far));
  const spread = AI.readErrorNearPx
    + (AI.readErrorFarPx - AI.readErrorNearPx) * Math.pow(t, AI.readConvergence);
  const jitter = AI.readJitterPx
    * (AI.jitterAtSlowBall + (1 - AI.jitterAtSlowBall) * ballSpeedFraction());
  const wobble = (Math.random() * 2 - 1) * jitter;
  aiTarget = hit + aiErrorSign * spread + wobble + BALL_SIZE / 2
    - aiAim * (PADDLE_HEIGHT / 2) - PADDLE_HEIGHT / 2;
}

// It only reacts to a ball coming at it, and drifts back to the middle between
// shots the way a player waiting for a serve does.
function updateAi() {
  const approaching = phase === "play" && ball.vx > 0;
  if (approaching && !aiApproaching) {
    aiErrorSign = Math.random() * 2 - 1;
    aiAim = (Math.random() * 2 - 1) * AI.aimSpread;
    aiReactionLeft = AI.reactionTicks;
    aiNextRead = 0;
  }
  aiApproaching = approaching;

  if (!approaching) {
    aiTarget = (HEIGHT - PADDLE_HEIGHT) / 2;
  } else if (aiReactionLeft > 0) {
    aiReactionLeft -= 1;
    aiVel = 0;
    return; // has not reacted yet
  } else if (aiNextRead > 0) {
    aiNextRead -= 1;
  } else {
    aiGlance();
    aiNextRead = Math.max(0, Math.round(
      AI.resampleTicks + (Math.random() * 2 - 1) * AI.resampleJitter));
  }

  // Aim for a speed proportional to how far it has to go, then change speed by a
  // limited amount per tick. The overshoot-and-correct is not bolted on: it falls
  // out of not being able to stop instantly, the same way a hand does not.
  const delta = aiTarget - ai.y;
  const top = Math.abs(delta) > AI.panicDistancePx ? AI.panicSpeed : AI.speed;
  const accel = AI.accelTicks > 0 ? top / AI.accelTicks : Infinity;
  const wanted = Math.max(-top, Math.min(top, delta / Math.max(0.5, AI.brakeTicks)));
  aiVel += Math.max(-accel, Math.min(accel, wanted - aiVel));
  ai.y += aiVel;
  ai.y = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, ai.y));
}

function crossingY(prevX, prevY, planeX) {
  const crossed = ball.vx < 0
    ? prevX > planeX && ball.x <= planeX
    : prevX < planeX && ball.x >= planeX;
  if (!crossed) return null;
  const t = (planeX - prevX) / (ball.x - prevX);
  return prevY + (ball.y - prevY) * t;
}

function bounce(paddleY, dir) {
  const offset = ball.y + BALL_SIZE / 2 - (paddleY + PADDLE_HEIGHT / 2);
  const hit = Math.max(-1, Math.min(1, offset / (PADDLE_HEIGHT / 2)));
  const angle = hit * MAX_BOUNCE_ANGLE;
  const speed = Math.min(Math.hypot(ball.vx, ball.vy) * BALL_SPEEDUP, BALL_SPEED_MAX);
  ball.vx = dir * speed * Math.cos(angle);
  ball.vy = speed * Math.sin(angle);
}

function update() {
  if (gameOver || paused) return;

  if (control === "keyboard") {
    if (keys.up) player.y -= PADDLE_SPEED;
    if (keys.down) player.y += PADDLE_SPEED;
  }
  player.y = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, player.y));

  updateAi();

  // Paddles keep moving between points so both sides can get into position, but
  // the ball waits.
  if (phase === "countdown") {
    serveTicks -= 1;
    if (serveTicks <= 0) serve();
    return;
  }
  if (phase !== "play") return;

  const prevX = ball.x;
  const prevY = ball.y;
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Paddles before walls, so a wall bounce cannot bend the path that the
  // crossing test above is interpolating along.
  if (ball.vx < 0) {
    const y = crossingY(prevX, prevY, PLAYER_PLANE);
    if (y !== null && y + BALL_SIZE >= player.y && y <= player.y + PADDLE_HEIGHT) {
      ball.y = y;
      bounce(player.y, 1);
      ball.x = PLAYER_PLANE;
    }
  } else if (ball.vx > 0) {
    const y = crossingY(prevX, prevY, AI_PLANE);
    if (y !== null && y + BALL_SIZE >= ai.y && y <= ai.y + PADDLE_HEIGHT) {
      ball.y = y;
      bounce(ai.y, -1);
      ball.x = AI_PLANE;
    }
  }

  // Reflect the overshoot rather than clamping to the wall. Clamping quietly ate
  // up to |vy| of vertical travel at every bounce, which made the ball drift from
  // any straight-line prediction of where it would end up - 13px out over two
  // bounces at vy=11.
  const floor = HEIGHT - BALL_SIZE;
  if (ball.y < 0) {
    ball.y = -ball.y;
    ball.vy *= -1;
  } else if (ball.y > floor) {
    ball.y = 2 * floor - ball.y;
    ball.vy *= -1;
  }
  ball.y = Math.max(0, Math.min(floor, ball.y));

  if (ball.x < 0) {
    ai.score += 1;
    serveTo = -1; // back at the player who just conceded
    onScore();
  } else if (ball.x > WIDTH) {
    player.score += 1;
    serveTo = 1;
    onScore();
  }
}

function onScore() {
  if (player.score >= WIN_SCORE || ai.score >= WIN_SCORE) {
    gameOver = true;
    showMenu(player.score > ai.score ? "You win! 🎉" : "AI wins!");
    return;
  }
  ball = centredBall();
  phase = "countdown";
  serveTicks = SERVE_DELAY_TICKS;
  updateStatus();
}

function draw() {
  ctx.fillStyle = getComputedStyle(canvas).backgroundColor;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = colors.border;
  ctx.setLineDash([6, 10]);
  ctx.beginPath();
  ctx.moveTo(WIDTH / 2, 0);
  ctx.lineTo(WIDTH / 2, HEIGHT);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = colors.fg;
  ctx.fillRect(0, player.y, PADDLE_WIDTH, PADDLE_HEIGHT);
  ctx.fillRect(WIDTH - PADDLE_WIDTH, ai.y, PADDLE_WIDTH, PADDLE_HEIGHT);

  ctx.fillStyle = colors.accent;
  ctx.fillRect(ball.x, ball.y, BALL_SIZE, BALL_SIZE);

  ctx.fillStyle = colors.fg;
  ctx.font = "bold 28px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(player.score, WIDTH / 2 - 40, 40);
  ctx.fillText(ai.score, WIDTH / 2 + 40, 40);
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
  if (paused) {
    // Hold the clock still rather than banking real time to replay on resume.
    accumulator = 0;
  } else {
    advance(now - lastFrame);
  }
  lastFrame = now;
  draw();
  // Nothing moves once the game is over, so stop scheduling frames rather than
  // redrawing a frozen board forever. restart() starts it again.
  if (gameOver) {
    running = false;
    rafId = null;
    return;
  }
  rafId = requestAnimationFrame(loop);
}

// Guarded by `running` rather than by rafId, so that a caller which has already
// cancelled the pending frame - the test harness does exactly this - does not
// get the loop restarted underneath it by restart().
function start() {
  if (running) return;
  running = true;
  lastFrame = null;
  rafId = requestAnimationFrame(loop);
}

// Handing control to the pointer on *any* movement would not fix anything: the
// problem is the mouse being brushed mid-rally, not moved on purpose. It has to
// travel far enough to look deliberate first.
const POINTER_TAKEOVER_PX = 12;

const UP_KEYS = ["w", "W", "ArrowUp"];
const DOWN_KEYS = ["s", "S", "ArrowDown"];

// Returns which direction a key means, or null if the game does not use it.
function keyDirection(key) {
  if (UP_KEYS.includes(key)) return "up";
  if (DOWN_KEYS.includes(key)) return "down";
  return null;
}

function handleKeyDown(e) {
  if (e.key === " ") {
    // A focused button takes Space as its own activation; serving as well would
    // mean opening the help panel also started the point.
    if (e.target instanceof HTMLButtonElement) return;
    e.preventDefault(); // Space scrolls the document by default
    if (phase === "serve" && !paused) serve();
    return;
  }

  // Escape rather than Space, which is already the serve. "p" is the habit a lot
  // of players have.
  if (e.key === "Escape" || e.key === "p" || e.key === "P") {
    e.preventDefault();
    setPaused(!paused);
    return;
  }
  const dir = keyDirection(e.key);
  if (!dir) return;
  // The arrows scroll the document by default, which drags the board out from
  // under the player on a short window.
  e.preventDefault();
  control = "keyboard";
  pointerAnchor = null;
  keys[dir] = true;
}

function handleKeyUp(e) {
  const dir = keyDirection(e.key);
  if (!dir) return;
  e.preventDefault();
  keys[dir] = false;
}

function handlePointerMove(e) {
  if (control === "keyboard") {
    if (pointerAnchor === null) {
      pointerAnchor = { x: e.clientX, y: e.clientY };
      return;
    }
    const moved = Math.hypot(e.clientX - pointerAnchor.x, e.clientY - pointerAnchor.y);
    if (moved < POINTER_TAKEOVER_PX) return;
    control = "pointer";
  }
  const rect = canvas.getBoundingClientRect();
  const scale = HEIGHT / rect.height;
  const y = (e.clientY - rect.top) * scale;
  player.y = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, y - PADDLE_HEIGHT / 2));
}

function toggleHelp() {
  const opening = instructions.hidden;
  instructions.hidden = !opening;
  helpToggle.setAttribute("aria-expanded", String(opening));
}

// Clear a match back to nothing. Deliberately does not set `phase` or touch the
// menu: the two ways *into* a match differ only in where they land, and both go
// through here first. Play used to skip this entirely, which was invisible from
// the load menu - nothing to clear, loop already running - and left a finished
// game finished when the same menu returned at the end of one.
function resetMatch() {
  player = { y: HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 };
  ai = { y: HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 };
  ball = centredBall();
  gameOver = false;
  accumulator = 0;
  control = "keyboard";
  pointerAnchor = null;
  serveTo = Math.random() < 0.5 ? 1 : -1;
  paused = false;
  aiApproaching = false;
  aiReactionLeft = 0;
  aiVel = 0;
  aiNextRead = 0;
  aiTarget = (HEIGHT - PADDLE_HEIGHT) / 2;
}

function restart() {
  resetMatch();
  showMenu();
  start();
}

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
canvas.addEventListener("pointermove", handlePointerMove);
canvas.addEventListener("pointerdown", () => {
  // A mouse-only player has to be able to get going again without the keyboard.
  if (paused) return setPaused(false);
  if (phase === "serve") serve();
});

// Losing the window mid-rally should not cost a point. Deliberately does not
// resume on focus: coming back to a live ball is the thing being avoided.
window.addEventListener("blur", () => setPaused(true));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) setPaused(true);
});
restartBtn.addEventListener("click", restart);

for (const b of difficultyBtns) {
  b.addEventListener("click", () => {
    applyDifficulty(b.dataset.level);
    saveDifficulty(difficulty);
  });
}

playBtn.addEventListener("click", () => {
  resetMatch();
  menu.hidden = true;
  phase = "serve";
  updateStatus();
  // loop() stops scheduling frames once a game is over, so coming back through
  // the end-of-game menu has to wind it up again. Guarded by `running`, so this
  // is a no-op on the load menu and cannot restart a loop a test has frozen.
  start();
  // Otherwise focus stays on Play and the first Space re-activates it instead of
  // serving.
  playBtn.blur();
});
helpToggle.addEventListener("click", toggleHelp);

// The win score is stated in the panel, so it is filled in from the constant
// rather than written into the markup twice.
document.getElementById("win-score").textContent = WIN_SCORE;

applyDifficulty(loadDifficulty() ?? "medium");
showMenu();
start();
