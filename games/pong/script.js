const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restart");

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

const style = getComputedStyle(document.documentElement);
const colors = {
  fg: style.getPropertyValue("--fg").trim() || "#1c1c1e",
  accent: style.getPropertyValue("--accent").trim() || "#3b82f6",
  border: style.getPropertyValue("--cell-border").trim() || "#c7c7cc",
};

let player = { y: HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 };
let ai = { y: HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 };
let ball = newBall();
let keys = { up: false, down: false };
let gameOver = false;
let rafId = null;
let accumulator = 0;
let lastFrame = null;

function newBall() {
  const angle = (Math.random() * 0.6 - 0.3) * Math.PI;
  const dir = Math.random() < 0.5 ? 1 : -1;
  return {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    vx: dir * BALL_SPEED * Math.cos(angle),
    vy: BALL_SPEED * Math.sin(angle),
  };
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

  if (keys.up) player.y -= PADDLE_SPEED;
  if (keys.down) player.y += PADDLE_SPEED;
  player.y = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, player.y));

  const aiCenter = ai.y + PADDLE_HEIGHT / 2;
  if (aiCenter < ball.y - 10) ai.y += AI_SPEED;
  else if (aiCenter > ball.y + 10) ai.y -= AI_SPEED;
  ai.y = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, ai.y));

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
    onScore();
  } else if (ball.x > WIDTH) {
    player.score += 1;
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
  ball = newBall();
  statusEl.textContent = `You ${player.score} — ${ai.score} AI`;
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
  rafId = requestAnimationFrame(loop);
}

function handleKeyDown(e) {
  if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") keys.up = true;
  if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") keys.down = true;
}

function handleKeyUp(e) {
  if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") keys.up = false;
  if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") keys.down = false;
}

function handlePointerMove(e) {
  const rect = canvas.getBoundingClientRect();
  const scale = HEIGHT / rect.height;
  const y = (e.clientY - rect.top) * scale;
  player.y = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, y - PADDLE_HEIGHT / 2));
}

function restart() {
  player = { y: HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 };
  ai = { y: HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 };
  ball = newBall();
  gameOver = false;
  accumulator = 0;
  statusEl.textContent = "First to 5 wins · W/S or ↑/↓ to move";
}

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
canvas.addEventListener("pointermove", handlePointerMove);
restartBtn.addEventListener("click", restart);

rafId = requestAnimationFrame(loop);
