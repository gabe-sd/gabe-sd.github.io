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

function newBall() {
  const angle = (Math.random() * 0.6 - 0.3) * Math.PI;
  const dir = Math.random() < 0.5 ? 1 : -1;
  return {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    vx: dir * 5 * Math.cos(angle),
    vy: 5 * Math.sin(angle),
  };
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
    ball.vx *= -1.05;
    const hitPos = (ball.y - player.y) / PADDLE_HEIGHT - 0.5;
    ball.vy += hitPos * 4;
    ball.x = PADDLE_WIDTH;
  }

  if (
    ball.x >= WIDTH - PADDLE_WIDTH - BALL_SIZE &&
    ball.y + BALL_SIZE >= ai.y &&
    ball.y <= ai.y + PADDLE_HEIGHT &&
    ball.vx > 0
  ) {
    ball.vx *= -1.05;
    const hitPos = (ball.y - ai.y) / PADDLE_HEIGHT - 0.5;
    ball.vy += hitPos * 4;
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

function loop() {
  update();
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
  statusEl.textContent = "First to 5 wins · W/S or ↑/↓ to move";
}

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
canvas.addEventListener("pointermove", handlePointerMove);
restartBtn.addEventListener("click", restart);

loop();
