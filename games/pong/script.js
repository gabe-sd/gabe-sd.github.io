const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restart");
const helpToggle = document.getElementById("help-toggle");
const instructions = document.getElementById("instructions");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 80;
const PADDLE_SPEED = 6;
const AI_SPEED = 4.5;
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
let phase = "serve";
let serveTicks = 0;
let serveTo = Math.random() < 0.5 ? 1 : -1; // -1 travels left, towards the player

function centredBall() {
  return { x: WIDTH / 2, y: HEIGHT / 2, vx: 0, vy: 0 };
}

// dir is the direction of travel, not a random choice: the serve goes to whoever
// conceded the last point, so a point cannot be won by the coin flip that used to
// decide this.
function newBall(dir) {
  const angle = (Math.random() * 0.6 - 0.3) * Math.PI;
  return {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    vx: dir * BALL_SPEED * Math.cos(angle),
    vy: BALL_SPEED * Math.sin(angle),
  };
}

function serve() {
  ball = newBall(serveTo);
  phase = "play";
  updateStatus();
}

function updateStatus() {
  if (gameOver) return; // the win or loss message stands until restart
  const score = `You ${player.score} — ${ai.score} AI`;
  if (phase === "countdown") {
    statusEl.textContent = `${score} · serving…`;
  } else if (phase === "serve") {
    statusEl.textContent = player.score || ai.score
      ? `${score} · press Space to serve`
      : "Press Space to serve";
  } else {
    statusEl.textContent = score;
  }
}

// Reflect off a paddle, dir being the direction the ball leaves in. The angle
// comes from where the ball struck relative to the paddle's centre, and the
// speed is recomputed from scratch and capped. The previous version multiplied
// vx and *added* to vy on every hit, so vy grew without bound - a long rally
// ended with the ball travelling almost vertically and outrunning the collision
// check.
function bounce(paddleY, dir) {
  const offset = ball.y + BALL_SIZE / 2 - (paddleY + PADDLE_HEIGHT / 2);
  const hit = Math.max(-1, Math.min(1, offset / (PADDLE_HEIGHT / 2)));
  const angle = hit * MAX_BOUNCE_ANGLE;
  const speed = Math.min(Math.hypot(ball.vx, ball.vy) * BALL_SPEEDUP, BALL_SPEED_MAX);
  ball.vx = dir * speed * Math.cos(angle);
  ball.vy = speed * Math.sin(angle);
}

function update() {
  if (gameOver) return;

  if (control === "keyboard") {
    if (keys.up) player.y -= PADDLE_SPEED;
    if (keys.down) player.y += PADDLE_SPEED;
  }
  player.y = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, player.y));

  const aiCenter = ai.y + PADDLE_HEIGHT / 2;
  if (aiCenter < ball.y - 10) ai.y += AI_SPEED;
  else if (aiCenter > ball.y + 10) ai.y -= AI_SPEED;
  ai.y = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, ai.y));

  // Paddles keep moving between points so both sides can get into position, but
  // the ball waits.
  if (phase === "countdown") {
    serveTicks -= 1;
    if (serveTicks <= 0) serve();
    return;
  }
  if (phase !== "play") return;

  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.y <= 0 || ball.y >= HEIGHT - BALL_SIZE) {
    ball.vy *= -1;
    ball.y = Math.max(0, Math.min(HEIGHT - BALL_SIZE, ball.y));
  }

  if (
    ball.x <= PADDLE_WIDTH &&
    ball.y + BALL_SIZE >= player.y &&
    ball.y <= player.y + PADDLE_HEIGHT &&
    ball.vx < 0
  ) {
    bounce(player.y, 1);
    ball.x = PADDLE_WIDTH;
  }

  if (
    ball.x >= WIDTH - PADDLE_WIDTH - BALL_SIZE &&
    ball.y + BALL_SIZE >= ai.y &&
    ball.y <= ai.y + PADDLE_HEIGHT &&
    ball.vx > 0
  ) {
    bounce(ai.y, -1);
    ball.x = WIDTH - PADDLE_WIDTH - BALL_SIZE;
  }

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
    statusEl.textContent =
      player.score > ai.score ? "You win! 🎉" : "AI wins!";
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
  advance(now - lastFrame);
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
    if (phase === "serve") serve();
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

function restart() {
  player = { y: HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 };
  ai = { y: HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 };
  ball = centredBall();
  gameOver = false;
  accumulator = 0;
  control = "keyboard";
  pointerAnchor = null;
  phase = "serve";
  serveTo = Math.random() < 0.5 ? 1 : -1;
  updateStatus();
  start();
}

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
canvas.addEventListener("pointermove", handlePointerMove);
canvas.addEventListener("pointerdown", () => { if (phase === "serve") serve(); });
restartBtn.addEventListener("click", restart);
helpToggle.addEventListener("click", toggleHelp);

// The win score is stated in the panel, so it is filled in from the constant
// rather than written into the markup twice.
document.getElementById("win-score").textContent = WIN_SCORE;

updateStatus();
start();
