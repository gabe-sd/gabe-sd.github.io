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
const winScoreBtns = [...document.querySelectorAll("#win-score-choice [data-score]")];

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const PADDLE_WIDTH = 10;
// The height both paddles start at. Each paddle carries its own `h` from here,
// because the abilities below stretch and shrink them independently - this is the
// base, not the current size, and anything reading a live paddle wants `.h`.
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
// Assisted and Insane are characters rather than points on a difficulty scale:
// each has moves it occasionally uses. Same contract as AI above - every knob
// names the value that switches its feature off, so any one of these can be
// isolated, weakened or removed without unpicking the rest. `modes: []` disables
// a move outright.
//
// Every move telegraphs before it lands. That is the rule that keeps them from
// feeling arbitrary: you see it coming, so losing to one is something that
// happened rather than something the game did to you behind your back.
const ABILITY = {
  // Shared. behindBonusPerPoint is how strongly falling behind summons a move,
  // for either side; 0 = the score is ignored and only the base chance applies.
  behindBonusPerPoint: 0.18,
  resizeTicks: 20,   // ticks a paddle takes to reach a new size; 0 = instant
  vibratePx: 3,      // how hard a charging paddle shakes; 0 = perfectly still
  activeVibratePx: 6,// ...and how hard it shakes once the charge is held. Its own
                     // knob because a held charge has no wind-up to grow out of,
                     // so it has to announce itself flat out; 0 = perfectly still
  pulseTicks: 24,    // period of the held-charge glow pulse, in ticks. Ticks and
                     // not milliseconds, or it would breathe at a different rate
                     // on a 144Hz monitor than on a 60Hz one; 0 = a steady glow
  afterimages: 4,    // ghosts left behind by a blink; 0 = none
  stutterTicks: 6,   // period of a stuttering wind-up, in ticks; 0 = steady
  // A held charge is drawn as its own layer, on top of whatever tell the paddle
  // is showing. A paddle draws one tell at a time, so without this an opponent
  // holding a charged shot stops looking charged the moment it winds up
  // something else - and a charge you cannot see is a shot you cannot brace for.
  chargedHaloPx: 14, // reach of the aura around a charged paddle; 0 = no aura
  chargedCorePx: 4,  // width of the white-hot core down its face; 0 = none

  // The meter's celebration, all counted in ticks so it plays at the same rate on
  // any monitor. Filling the third pip runs: that pip's own pop, then a sweep
  // left to right, then all three flaring together - and only when that finishes
  // does the paddle admit it is charged.
  pop: {
    pipTicks: 12,       // one pip's flash; 0 = no pop at all
    ringPx: 22,         // how far the ring expands out of a pip; 0 = flash only
    pipGrowPx: 5,       // how far the pip itself swells and springs back; 0 = flat
    sweepTicks: 4,      // gap between pips in the completion sweep; 0 = no sweep
    flareTicks: 16,     // the closing all-three flare; 0 = none
    paddleTicks: 14,    // flash on the paddle where the ball landed; 0 = none
    paddleSpreadPx: 28, // how far that flash spreads from the contact point
  },

  // --- The opponent's moves ------------------------------------------------
  // Every mode that lists them fires these; a preset's `ability` half tunes how
  // often and how hard. Insane is the tuning they were designed at.
  blink: {
    modes: ["normal", "insane"],
    tell: "charge",       // glows, pulses and shakes; "tint" only recolours
    // All three of the opponent's moves are red, because red means it is doing
    // something to you. What separates them is how they wind up, so you can read
    // which is coming rather than only what it was afterwards. "swell" is the
    // plain ramp and the default for anything that does not say otherwise.
    windUp: "stutter",    // flickers on and off, like something misfiring
    chance: 0.4,          // per approach of the ball; 0 = never
    cooldownTicks: 150,
    telegraphTicks: 12,   // 0 = no warning at all
    // Bound to the ball, not to a clock: it ends when the ball stops coming, so
    // it is always still there for the save or the miss. A timer could not track
    // this - flight time varies with ball speed, and the value that survived a
    // fast ball ended less than halfway across a slow one. Measured before the
    // change: still active on arrival 0% of the time in Normal, 41% in Insane.
    // A finite number here caps it early again, which is the off switch.
    durationTicks: Infinity,
    hopTicks: 3,          // ticks between teleports; higher = calmer
    lockPx: 150,          // within this of its plane it stops showing off and
                          // hops onto the real intercept; 0 = shows off throughout
    accuracyPx: 4,        // how close those on-target hops land
  },
  overdrive: {
    modes: ["normal", "insane"],
    tell: "charge",       // glows, pulses and shakes; "tint" only recolours
    windUp: "swell",      // one long steady build; the slowest and biggest tell
    chance: 0.3,
    cooldownTicks: 260,
    telegraphTicks: 45,   // long on purpose: the charge is the whole show
    durationTicks: Infinity, // held until it is spent on a shot; a number expires it
    chargedMultiplier: 1.5,  // the charged shot leaves at this multiple of the
                             // mode's own speed cap, whatever arrived; 1 = an
                             // ordinary shot at full pace. Being a multiple of
                             // the *cap* is the point: an ordinary shot's speed
                             // depends on what arrived, so anything close to 1
                             // is dramatic early in a rally and invisible late,
                             // which is exactly when it is being watched for.
  },
  squeeze: {
    modes: ["normal", "insane"],
    tell: "charge",       // glows, pulses and shakes; "tint" only recolours
    windUp: "crackle",    // barely shakes; the gathering lightning is the tell
    chance: 0.25,
    cooldownTicks: 320,
    telegraphTicks: 26,
    durationTicks: 210,
    scale: 0.7,           // fraction of your paddle's *base* size it shrinks to,
                          // not of PADDLE_HEIGHT: the base varies by mode, and an
                          // absolute target would shrink you by different amounts
                          // in different modes for no stated reason. 1 = no shrink
    // The attack is drawn as something the opponent *does to you*: it charges on
    // its own paddle, throws a bolt across the board, and your paddle arrives
    // shrunken and crackling. The old version glowed and shook your paddle in
    // villain red, which reads as a reward you were handed - see DESIGN.md.
    tellWhile: "telegraph", // the charge is the wind-up only; after it fires the
                            // effect is on the other paddle. "" = glow throughout
    boltTicks: 22,        // how long the bolt hangs after it lands; 0 = no bolt
    boltSegments: 16,     // joints along the bolt; 1 = a straight beam
    boltSpreadPx: 34,     // how far it strays from the straight line; 0 = a beam
    boltForks: 3,         // branches thrown off the main bolt; 0 = none
    arcPx: 9,             // how far the crackle reaches off a squeezed paddle;
                          // 0 = it shrinks silently, with no electricity at all
    flickerTicks: 3,      // ticks between redraws of bolt and crackle. In ticks,
                          // like everything that moves here, or it would flicker
                          // twice as fast on a 144Hz monitor; 0 = frozen
  },

  // --- Your moves ----------------------------------------------------------
  // Assisted is the tuning these were designed at. Expand answers two different
  // questions depending on the mode - see returnsToTrigger below.
  expand: {
    modes: ["assisted", "normal", "insane"],
    // Growing to nearly twice its size is announcement enough, and unlike squeeze
    // this is not a warning about anything - there is nothing to brace for. The
    // charge treatment on top read as a second, different thing happening.
    tell: "tint",
    chance: 0,            // never random: it is earned, not rolled
    telegraphTicks: 10,
    // Expand is not an event with a duration - it is a *state*. You have the big
    // paddle for exactly as long as you are in trouble, and it goes away when you
    // are not. Nothing here expires: durationTicks and cooldownTicks are neutral
    // because the conditions below start and end it.
    durationTicks: Infinity,
    cooldownTicks: 0,
    scale: 1.35,          // multiple of your paddle's *base* size; 1 = no growth
    // Two of these are *situation* triggers and one is a *reward* trigger, and
    // the difference decides how the move ends. With either situation trigger set
    // the move is a state: held exactly while the trouble lasts (see syncExpand).
    // With neither set it is earned instead, runs on durationTicks, and is taken
    // away the moment you concede.
    behindToTrigger: 3,   // held while this many points behind, and dropped once
                          // the gap is smaller; 0 = never from the score
    concededToTrigger: 3, // held after this many points lost in a row, and
                          // dropped the moment you win one; 0 = never from a run
    returnsToTrigger: 0,  // earned by this many returns without conceding a
                          // point; 0 = never earned, which is what makes the two
                          // triggers above the only way in
    // Arriving as a reward has to look different from arriving as help, so the
    // earned version bursts on the paddle the way a filled meter does.
    entranceTicks: 0,     // 0 = it simply appears, which is the Assisted look
  },
  clutch: {
    modes: ["assisted", "normal", "insane"],
    tell: "charge",
    chance: 0,
    cooldownTicks: 120,
    telegraphTicks: 0,    // earned by a save that has already happened
    durationTicks: Infinity, // the glow stays until you hit something with it
    // The band at each end of your paddle that counts as a close call, as a
    // fraction of the paddle's *base* size rather than a pixel count. Absolute
    // silently drifted: raising Assisted's base paddle from 80 to 120 turned the
    // old 12px into a fifth of the paddle where it had been nearly a third, and
    // made charging one noticeably harder without anyone touching this. Measured
    // against the base and not the current size, so an active Expand does not
    // widen its own follow-up. 0 = never.
    edgeFraction: 0.15,
    segments: 3,          // close calls needed to fill the meter; 1 = charged by
                          // a single one, which is how it worked before there was
                          // anything on screen to watch fill up
    chargedMultiplier: 2.6, // deliberately far above the mode's cap: the whole
                            // point is a shot that is dramatically faster than
                            // anything Assisted otherwise produces
  },
};

const MOVES = ["blink", "overdrive", "squeeze", "expand", "clutch"];

// Same discipline as AI_DEFAULTS: a pristine copy, restored in full on every
// change of mode, so a preset that tunes a move down cannot leave it tuned down
// in the next mode. structuredClone rather than a spread because the values are
// nested one deep, and rather than JSON because durationTicks is Infinity, which
// JSON turns into null.
const ABILITY_DEFAULTS = structuredClone(ABILITY);

// Writes *every* field on every call, not just the overridden ones - the same
// reason applyGame() does. Nested move specs are replaced wholesale rather than
// merged into, so nothing survives that the preset did not ask for.
function applyAbility(overrides = {}) {
  const fresh = structuredClone(ABILITY_DEFAULTS);
  for (const key of Object.keys(fresh)) {
    const base = fresh[key];
    ABILITY[key] = base && typeof base === "object" && !Array.isArray(base)
      ? Object.assign(base, overrides[key])
      : overrides[key] ?? base;
  }
}

// Three modes, each a character rather than a notch on a scale. A preset may
// override three things, and each has a pristine copy behind it so nothing leaks
// between modes: `ai` (how well the opponent reads the ball), `game` (the ball
// and the paddles both sides get) and `ability` (how the moves are tuned here).
// Every mode has moves. That is what removed Easy, Medium and Hard: they differed
// in `ai` alone and were the only modes without powerups, so once powerups were
// everywhere there were five names for three real differences.
// The figures are what each preset measured at; they are starting points to tune
// by feel, not settings to preserve.
const DIFFICULTY = {
  // Assisted is for someone who has barely played, and what makes that fun is
  // rallies, not a scoreline. Its ai is therefore *competent* - a crippled
  // opponent does not play gently, it ends the point by missing. The handicap
  // lives on the player's side instead: a slow ball and a much bigger paddle.
  assisted: {
    ai: { speed: 4.5, reactionTicks: 34, lookaheadBounces: 0, readErrorFarPx: 120,
          readErrorNearPx: 45, aimSpread: 0.15, panicSpeed: 4.5 },
    game: { BALL_SPEED: 3.5, BALL_SPEED_MAX: 6.5, PLAYER_PADDLE_SCALE: 1.5 },
  },
  // Normal is the one you are meant to play: beatable without being handed to
  // you, and no handicap on either side - it is the only mode with no `game`
  // half, so both paddles are the stock size and the ball is the stock ball.
  // Every move is available here, tuned well below Insane's settings: the moves
  // are the show, not the difficulty.
  normal: {                                                        // ~86% saves
    ai: { readErrorNearPx: 45, reactionTicks: 18 },
    ability: {
      // No durationTicks override: blink ends when the ball is dealt with, and a
      // number here would put the old early-expiry bug back in this mode alone.
      blink: { chance: 0.16, cooldownTicks: 460, accuracyPx: 16, lockPx: 110 },
      // No chargedMultiplier override: 1.05 made the wind-up promise a shot it
      // did not deliver - 10.5 against a cap of 10, indistinguishable from an
      // ordinary shot late in a rally, which is when it is being watched for.
      overdrive: { chance: 0.16, cooldownTicks: 440 },
      squeeze: { chance: 0.13, cooldownTicks: 560, durationTicks: 150, scale: 0.82 },
      // Earned, not given: no situation triggers at all, so this runs on a timer
      // and is lost the moment you concede.
      expand: { behindToTrigger: 0, concededToTrigger: 0, returnsToTrigger: 6,
                durationTicks: 480, cooldownTicks: 240, scale: 1.3,
                entranceTicks: 30 },
      // Assisted's multiplier is deliberately far above its own low cap. Normal's
      // cap is much higher, so the same number would be absurd here.
      clutch: { chargedMultiplier: 1.9, cooldownTicks: 200 },
    },
  },
  insane: {
    ai: { speed: 6, reactionTicks: 2, lookaheadBounces: Infinity, resampleTicks: 2,
          resampleJitter: 1, readErrorFarPx: 24, readErrorNearPx: 28,
          readConvergence: 0.7, readJitterPx: 2, panicSpeed: 10 },
    game: { BALL_SPEED: 7, BALL_SPEED_MAX: 14, PLAYER_PADDLE_SCALE: 0.8 },
  },
};
// Applied over a pristine copy each time, or switching down from a preset would
// leave whatever the previous one had overridden.
const AI_DEFAULTS = { ...AI };
const DIFFICULTY_KEY = "pong.difficulty";
let difficulty = "normal";
const BALL_SIZE = 10;
// Points needed to take the match. `let` because the menu sets it; the ? panel
// reads it from here rather than hardcoding it, so it has to be refreshed
// whenever it changes and not only at load.
const WIN_SCORES = [5, 7, 11];
const WIN_SCORE_KEY = "pong.winScore";
let WIN_SCORE = WIN_SCORES[0];

// One physics tick. Every speed constant here is per tick, not per rendered
// frame: loop() runs a whole number of ticks per frame, so the game plays the
// same at 60Hz and 144Hz. The values are unchanged from when they were per-frame
// at 60Hz, so the feel on a 60Hz display is exactly what it was.
const TICK_MS = 1000 / 60;
// Longest stretch of real time a single frame may simulate. A backgrounded tab
// stops receiving frames, so without this the first frame back tries to catch up
// on however long it was away, all at once.
const MAX_CATCHUP_MS = 250;

// Ball speed is a *game* knob rather than an ai one: Assisted and Insane move it,
// which is exactly why they are a different kind of preset. `let`, so a preset
// can change them, with the starting values captured as the pristine copy that
// applyGame() restores every time - the same discipline AI_DEFAULTS gives AI.
let BALL_SPEED = 5;
let BALL_SPEED_MAX = 10;
// The size each paddle returns to when nothing is acting on it, as a fraction of
// PADDLE_HEIGHT. 1 = the ordinary paddle.
let PLAYER_PADDLE_SCALE = 1;
let AI_PADDLE_SCALE = 1;
const GAME_DEFAULTS = {
  BALL_SPEED, BALL_SPEED_MAX, PLAYER_PADDLE_SCALE, AI_PADDLE_SCALE,
};
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
    // Whose move it is: the villain's red, yours green.
    villain: style.getPropertyValue("--lose").trim() || "#ef4444",
    hero: style.getPropertyValue("--win").trim() || "#22c55e",
  };
}

let colors = readColors();
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
darkQuery.addEventListener("change", () => { colors = readColors(); });

// `h` is the size drawn and collided against; `hTarget` is what it is easing
// towards. They differ only while a resize is animating.
function newPaddle() {
  return {
    y: HEIGHT / 2 - PADDLE_HEIGHT / 2,
    score: 0,
    h: PADDLE_HEIGHT,
    hTarget: PADDLE_HEIGHT,
  };
}

let player = newPaddle();
let ai = newPaddle();
let ball = centredBall();
let keys = { up: false, down: false };
let gameOver = false;
let rafId = null;
let accumulator = 0;
// Frames are not a clock, so anything that pulses counts ticks instead.
let tickCount = 0;
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
// Keeps a paddle on the board. Its height varies, so the lower bound does too.
function clampPaddle(p) {
  p.y = Math.max(0, Math.min(HEIGHT - p.h, p.y));
}

// --- Abilities -------------------------------------------------------------
// Each move is idle, in "telegraph" (visible wind-up, no effect yet) or "active".
// The cooldown counts down in every phase, so nothing can chain into itself.
let moveState = {};
let blinkHop = 0;
let aiGhosts = [];
// Close calls banked towards the next charged shot. Drawn, so the reward is
// something you watch approach rather than something that silently arrives.
let clutchCharge = 0;
// Purely visual, and deliberately separate from the move state: the charge arms
// the instant the meter fills, and only the *telling* of it is delayed.
let pips = [];                 // { t, max } per segment, counting down
let meterSeq = -1;             // ticks into the completion sequence; -1 = idle
// A white burst on your paddle. Shared: the meter fills one of these and so does
// an earned Expand, at different lengths, so it carries its own `max` rather than
// reading one from whichever knob happened to fire it.
let paddleFlash = { t: 0, max: 1, y: 0 };
// The squeeze bolt, and the crackle left on the paddle it hit. Both hold their
// generated shape rather than regenerating per frame: draw() runs per rendered
// frame, so a shape rebuilt there would flicker at the monitor's rate instead of
// the game's.
let bolt = { t: 0, max: 1, points: [], forks: [] };
let arcs = [];
// The lightning gathering on the opponent while a squeeze winds up, which is
// what makes that wind-up readable as *this* move rather than one of the others.
let chargeArcs = [];
// Player returns since the last point conceded, which is what earns an Expand in
// a mode that hands it out for playing well rather than for losing.
let returnStreak = 0;
// Points conceded back to back. Separate from the score gap: losing three on the
// trot while still level is its own kind of trouble.
let concededStreak = 0;

function resetAbilities() {
  moveState = {};
  for (const name of MOVES) {
    moveState[name] = { phase: "idle", ticks: 0, cooldown: 0 };
  }
  blinkHop = 0;
  aiGhosts = [];
  clutchCharge = 0;
  concededStreak = 0;
  pips = ABILITY.clutch.segments > 0
    ? Array.from({ length: ABILITY.clutch.segments }, () => ({ t: 0, max: 1 }))
    : [];
  meterSeq = -1;
  paddleFlash = { t: 0, max: 1, y: 0 };
  bolt = { t: 0, max: 1, points: [], forks: [] };
  arcs = [];
  chargeArcs = [];
  returnStreak = 0;
}

// A jagged path between two points: walk the straight line and push each joint
// sideways. The ends are pinned, so it always leaves the opponent's paddle and
// lands on yours however far the middle wanders.
function makeBolt(x0, y0, x1, y1, segments, spreadPx) {
  const pts = [{ x: x0, y: y0 }];
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    // Slack tapers to nothing at both ends, so it reads as one bolt rather than
    // a line that happens to start and finish in the right places.
    const slack = spreadPx * Math.sin(Math.PI * t);
    pts.push({
      x: x0 + (x1 - x0) * t,
      y: y0 + (y1 - y0) * t + (Math.random() * 2 - 1) * slack,
    });
  }
  pts.push({ x: x1, y: y1 });
  return pts;
}

// Short branches thrown off the main path, which is most of what separates
// lightning from a wobbly line.
function makeForks(pts, count, spreadPx) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const at = 1 + Math.floor(Math.random() * (pts.length - 2));
    const from = pts[at];
    out.push(makeBolt(
      from.x, from.y,
      from.x + (Math.random() * 2 - 1) * spreadPx * 2,
      from.y + (Math.random() * 2 - 1) * spreadPx * 1.5,
      3, spreadPx * 0.4
    ));
  }
  return out;
}

// The crackle left on a paddle that has been hit: little arcs off its edges.
// Always thrown *into* the board. Your paddle sits against the left wall, so an
// arc aimed the other way is drawn off-screen and simply lost - and when a whole
// batch happened to pick that direction the effect vanished for a moment, which
// showed up as a test failing roughly one run in thirty.
function makeArcs(p, x, reachPx, dir = 1) {
  const out = [];
  const edge = dir > 0 ? x + PADDLE_WIDTH : x;
  const n = 3 + Math.floor(p.h / 22);
  for (let i = 0; i < n; i++) {
    const y = p.y + Math.random() * p.h;
    out.push(makeBolt(
      edge, y,
      edge + dir * reachPx * (0.5 + Math.random()),
      y + (Math.random() * 2 - 1) * reachPx,
      3, reachPx * 0.5
    ));
  }
  // And one off each end, which is where a paddle that just shrank draws the eye.
  for (const end of [-1, 1]) {
    const y = end < 0 ? p.y : p.y + p.h;
    out.push(makeBolt(
      x + PADDLE_WIDTH / 2, y,
      x + PADDLE_WIDTH / 2 + (Math.random() * 2 - 1) * reachPx,
      y + end * reachPx * (0.5 + Math.random()),
      3, reachPx * 0.4
    ));
  }
  return out;
}

function fireBolt() {
  const spec = ABILITY.squeeze;
  if (spec.boltTicks <= 0) return;
  const pts = makeBolt(
    WIDTH - PADDLE_WIDTH, ai.y + ai.h / 2,
    PADDLE_WIDTH, player.y + player.h / 2,
    Math.max(1, spec.boltSegments), spec.boltSpreadPx
  );
  bolt = {
    t: spec.boltTicks, max: spec.boltTicks, points: pts,
    forks: makeForks(pts, spec.boltForks, spec.boltSpreadPx),
  };
}

function popPip(i, ticks) {
  if (ticks > 0 && pips[i]) pips[i] = { t: ticks, max: ticks };
}

// The whole sequence is a timeline in ticks rather than nested timers, so it can
// be reasoned about - and cancelled - in one place.
function tickMeterFx() {
  for (const pip of pips) if (pip.t > 0) pip.t -= 1;
  if (paddleFlash.t > 0) paddleFlash.t -= 1;
  tickLightning();
  if (meterSeq < 0) return;
  const P = ABILITY.pop;
  const n = pips.length;
  const sweepAt = P.pipTicks;
  const flareAt = sweepAt + n * P.sweepTicks;
  for (let i = 0; i < n; i++) {
    if (meterSeq === sweepAt + i * P.sweepTicks) popPip(i, P.pipTicks);
  }
  if (meterSeq === flareAt) for (let i = 0; i < n; i++) popPip(i, P.flareTicks);
  meterSeq += 1;
  if (meterSeq >= flareAt + P.flareTicks) meterSeq = -1;
}

// Bolt and crackle are regenerated on a tick count rather than per frame, so
// they flicker at the same rate on any monitor.
function tickLightning() {
  const spec = ABILITY.squeeze;
  const every = Math.max(1, spec.flickerTicks);
  if (bolt.t > 0) {
    bolt.t -= 1;
    if (spec.flickerTicks > 0 && bolt.t % every === 0 && bolt.points.length) {
      const p = bolt.points;
      bolt.points = makeBolt(p[0].x, p[0].y, p[p.length - 1].x, p[p.length - 1].y,
        Math.max(1, spec.boltSegments), spec.boltSpreadPx);
      bolt.forks = makeForks(bolt.points, spec.boltForks, spec.boltSpreadPx);
    }
  }
  const winding = moveState.squeeze && moveState.squeeze.phase === "telegraph";
  if (winding && spec.arcPx > 0) {
    if (chargeArcs.length === 0 || spec.flickerTicks <= 0
        || moveState.squeeze.ticks % every === 0) {
      // Into the board from the right-hand paddle, hence the -1.
      chargeArcs = makeArcs(ai, WIDTH - PADDLE_WIDTH, spec.arcPx * 0.8, -1);
    }
  } else {
    chargeArcs = [];
  }
  if (!moveActive("squeeze") || spec.arcPx <= 0) {
    arcs = [];
    return;
  }
  if (arcs.length === 0 || spec.flickerTicks <= 0
      || moveState.squeeze.ticks % every === 0) {
    arcs = makeArcs(player, 0, spec.arcPx);
  }
}

function moveActive(name) {
  return !!moveState[name] && moveState[name].phase === "active";
}

function moveAvailable(name) {
  const st = moveState[name];
  return !!st && ABILITY[name].modes.includes(difficulty)
    && st.phase === "idle" && st.cooldown <= 0;
}

// A move gets likelier the further its owner is behind, which is what turns it
// from a random annoyance into the opponent stopping playing around.
function moveChance(name, ownerScore, otherScore) {
  const deficit = Math.max(0, otherScore - ownerScore);
  return ABILITY[name].chance + deficit * ABILITY.behindBonusPerPoint;
}

function armMove(name) {
  if (!moveAvailable(name)) return false;
  const st = moveState[name];
  st.phase = "telegraph";
  st.ticks = ABILITY[name].telegraphTicks;
  if (st.ticks <= 0) startMove(name);
  return true;
}

function startMove(name) {
  const spec = ABILITY[name];
  const st = moveState[name];
  st.phase = "active";
  st.ticks = spec.durationTicks;
  if (name === "blink") {
    blinkHop = 0;
    aiGhosts = [];
  }
  if (name === "squeeze" || name === "expand") {
    player.hTarget = baseHeight(player) * spec.scale;
  }
  // The wind-up happened on the opponent's paddle; this is the attack crossing.
  if (name === "squeeze") fireBolt();
  // Help arriving needs no announcement; a reward does. Assisted leaves this at
  // 0 and the paddle simply grows, which is the difference between the two.
  if (name === "expand" && spec.entranceTicks > 0) {
    paddleFlash = {
      t: spec.entranceTicks, max: spec.entranceTicks, y: player.y + player.h / 2,
    };
  }
}

function endMove(name) {
  const st = moveState[name];
  if (!st || st.phase === "idle") return;   // safe to call unconditionally
  st.phase = "idle";
  st.ticks = 0;
  st.cooldown = ABILITY[name].cooldownTicks;
  if (name === "blink") aiGhosts = [];
  if (name === "squeeze" || name === "expand") player.hTarget = baseHeight(player);
}

// Charged shots are spent on contact rather than running out, so a paddle stops
// glowing the instant it lands one.
function consumeMove(name) {
  if (!moveActive(name)) return false;
  if (name === "clutch") meterSeq = -1;   // nothing left to celebrate
  endMove(name);
  return true;
}

function tickAbilities() {
  for (const name of MOVES) {
    const st = moveState[name];
    if (!st) continue;
    if (st.cooldown > 0) st.cooldown -= 1;
    if (st.phase === "idle") continue;
    st.ticks -= 1;
    if (st.ticks > 0) continue;
    if (st.phase === "telegraph") startMove(name);
    else endMove(name);
  }
}

// Paddles change size about their own centre, over resizeTicks rather than in one
// frame: an instant resize reads as a glitch, an eased one reads as a move.
function easePaddles() {
  const k = ABILITY.resizeTicks > 0
    ? 1 - Math.pow(0.05, 1 / ABILITY.resizeTicks)
    : 1;
  for (const p of [player, ai]) {
    if (p.h === p.hTarget) continue;
    const centre = p.y + p.h / 2;
    p.h += (p.hTarget - p.h) * k;
    if (Math.abs(p.hTarget - p.h) < 0.4) p.h = p.hTarget;
    p.y = centre - p.h / 2;
    clampPaddle(p);
  }
}

// Blink: hop somewhere absurd while the ball is still far away, then hop onto the
// real intercept once it is close. The showing-off half is why it reads as a
// villain move rather than as the paddle simply being fast.
function blinkTeleport() {
  const spec = ABILITY.blink;
  blinkHop -= 1;
  if (blinkHop > 0) return;
  blinkHop = spec.hopTicks;
  if (ABILITY.afterimages > 0) {
    aiGhosts.push(ai.y);
    while (aiGhosts.length > ABILITY.afterimages) aiGhosts.shift();
  }
  const hit = predictInterceptY(Infinity);
  if (hit !== null && AI_PLANE - ball.x < spec.lockPx) {
    ai.y = hit + BALL_SIZE / 2 - ai.h / 2
      + (Math.random() * 2 - 1) * spec.accuracyPx;
  } else {
    ai.y = Math.random() * (HEIGHT - ai.h);
  }
  clampPaddle(ai);
  aiVel = 0;
}

// Are you in trouble right now? Two separate kinds of it: a losing run, and a
// gap on the scoreboard. Only checked when a point is scored, because neither can
// change at any other time.
// Which kind of Expand is this mode running? With a situation trigger set it is
// a state, held while the trouble lasts. With none set it is a reward, and the
// generic duration and the concede below are what take it away.
function expandIsState() {
  const ex = ABILITY.expand;
  return ex.behindToTrigger > 0 || ex.concededToTrigger > 0;
}

function expandWanted() {
  const ex = ABILITY.expand;
  if (!ex.modes.includes(difficulty)) return false;
  if (ex.behindToTrigger > 0 && ai.score - player.score >= ex.behindToTrigger) {
    return true;
  }
  return ex.concededToTrigger > 0 && concededStreak >= ex.concededToTrigger;
}

// Hold the paddle to the condition rather than firing it off and hoping. Both
// calls are no-ops when the state already matches, so this is safe to run at
// every point.
function syncExpand() {
  if (!expandIsState()) return;      // earned, not held: nothing to sync it to
  if (expandWanted()) armMove("expand");
  else if (moveState.expand && moveState.expand.phase !== "idle") endMove("expand");
}

// Catching the ball on the very end of the paddle is the close call that fills
// the meter. Returning it well is *not* rewarded here - see the design doc.
function onPlayerReturn(hitY) {
  // Counted before anything else can return early: the streak is a record of
  // play, not of close calls.
  returnStreak += 1;
  const ex = ABILITY.expand;
  if (!expandIsState() && ex.returnsToTrigger > 0
      && returnStreak >= ex.returnsToTrigger && armMove("expand")) {
    // Earned from scratch each time, rather than staying earned once the streak
    // is long: otherwise one good rally hands it back the instant it expires.
    returnStreak = 0;
  }
  const cl = ABILITY.clutch;
  if (cl.edgeFraction <= 0 || moveActive("clutch")) return; // one in hand is enough
  const edge = baseHeight(player) * cl.edgeFraction;
  const rel = hitY + BALL_SIZE / 2 - player.y;
  if (rel >= edge && rel <= player.h - edge) return;
  // Banked rather than spent: the segments stay put if the move is still on
  // cooldown, so a close call is never quietly thrown away.
  const was = clutchCharge;
  clutchCharge = Math.min(cl.segments, clutchCharge + 1);
  if (clutchCharge === was) return;      // already full and waiting on a cooldown
  popPip(clutchCharge - 1, ABILITY.pop.pipTicks);
  // The meter is in the corner and your eye is on the ball, so the paddle says it
  // too, at the exact spot the ball landed.
  paddleFlash = {
    t: ABILITY.pop.paddleTicks, max: ABILITY.pop.paddleTicks,
    y: hitY + BALL_SIZE / 2,
  };
  if (clutchCharge >= cl.segments && armMove("clutch")) {
    clutchCharge = 0;
    meterSeq = 0;
  }
}
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

function loadWinScore() {
  try {
    const n = Number(localStorage.getItem(WIN_SCORE_KEY));
    return WIN_SCORES.includes(n) ? n : null;
  } catch {
    return null;
  }
}

function saveWinScore(n) {
  try {
    localStorage.setItem(WIN_SCORE_KEY, String(n));
  } catch {
    // Not being able to remember the choice is not worth breaking the game over.
  }
}

// Both rows in the menu are radiogroups over a data attribute, so which one is
// selected is the same job twice.
function markSelected(buttons, key, value) {
  for (const b of buttons) {
    b.setAttribute("aria-checked", String(b.dataset[key] === String(value)));
  }
}

// Writes every field every time rather than only the overridden ones, so
// switching down from Insane cannot leave its faster ball behind.
function applyGame(overrides = {}) {
  BALL_SPEED = overrides.BALL_SPEED ?? GAME_DEFAULTS.BALL_SPEED;
  BALL_SPEED_MAX = overrides.BALL_SPEED_MAX ?? GAME_DEFAULTS.BALL_SPEED_MAX;
  PLAYER_PADDLE_SCALE =
    overrides.PLAYER_PADDLE_SCALE ?? GAME_DEFAULTS.PLAYER_PADDLE_SCALE;
  AI_PADDLE_SCALE = overrides.AI_PADDLE_SCALE ?? GAME_DEFAULTS.AI_PADDLE_SCALE;
}

// What a paddle settles back to once nothing is acting on it.
function baseHeight(p) {
  return PADDLE_HEIGHT * (p === player ? PLAYER_PADDLE_SCALE : AI_PADDLE_SCALE);
}

function applyDifficulty(level) {
  difficulty = DIFFICULTY[level] ? level : "normal";
  const preset = DIFFICULTY[difficulty];
  Object.assign(AI, AI_DEFAULTS, preset.ai);
  applyGame(preset.game);
  // Before resetAbilities(), which sizes the meter from ABILITY.clutch.segments.
  applyAbility(preset.ability);
  // Switching mode in the menu has to take the previous mode's paddles and any
  // armed move with it, or Insane's short paddle survives into Easy.
  resetAbilities();
  for (const p of [player, ai]) {
    p.h = p.hTarget = baseHeight(p);
    clampPaddle(p);
  }
  markSelected(difficultyBtns, "level", difficulty);
}

function applyWinScore(n) {
  WIN_SCORE = WIN_SCORES.includes(n) ? n : WIN_SCORES[0];
  markSelected(winScoreBtns, "score", WIN_SCORE);
  // The ? panel states the target. Filling it in only at load left it confidently
  // wrong the moment the choice could change.
  document.getElementById("win-score").textContent = WIN_SCORE;
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
    - aiAim * (ai.h / 2) - ai.h / 2;
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
    // The villain decides whether to do something about this one.
    for (const name of ["blink", "overdrive", "squeeze"]) {
      if (Math.random() < moveChance(name, ai.score, player.score)) armMove(name);
    }
  }
  // The ball has been dealt with, so the thing blink existed to answer is over.
  if (!approaching && aiApproaching) endMove("blink");
  aiApproaching = approaching;

  // Blinking overrides everything, reaction delay included - that is the point.
  if (moveActive("blink") && approaching) {
    blinkTeleport();
    return;
  }

  if (!approaching) {
    aiTarget = (HEIGHT - ai.h) / 2;
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
  clampPaddle(ai);
}

function crossingY(prevX, prevY, planeX) {
  const crossed = ball.vx < 0
    ? prevX > planeX && ball.x <= planeX
    : prevX < planeX && ball.x >= planeX;
  if (!crossed) return null;
  const t = (planeX - prevX) / (ball.x - prevX);
  return prevY + (ball.y - prevY) * t;
}

// Takes the paddle rather than its y: the angle is measured against that
// paddle's own centre and half-height, which the abilities make vary.
function bounce(paddle, dir) {
  const offset = ball.y + BALL_SIZE / 2 - (paddle.y + paddle.h / 2);
  const hit = Math.max(-1, Math.min(1, offset / (paddle.h / 2)));
  const angle = hit * MAX_BOUNCE_ANGLE;
  // A charged shot is spent here and leaves at a flat multiple of the mode's own
  // speed cap rather than a multiple of whatever arrived: scaling off the
  // incoming ball meant a charge earned on a slow rally fired a slow shot, which
  // is no drama at all. Nothing lifts the cap for the *return* of it, so if the
  // opponent gets a paddle to it the ball comes back at ordinary speed - the
  // charge is one shot, not a lasting change to the rally.
  const charge = paddle === ai ? "overdrive" : "clutch";
  const spec = ABILITY[charge];
  const carried = Math.hypot(ball.vx, ball.vy);
  const speed = consumeMove(charge)
    ? BALL_SPEED_MAX * spec.chargedMultiplier
    : Math.min(carried * BALL_SPEEDUP, BALL_SPEED_MAX);
  ball.vx = dir * speed * Math.cos(angle);
  ball.vy = speed * Math.sin(angle);
}

function update() {
  if (gameOver || paused) return;

  tickCount += 1;
  tickMeterFx();
  // Both run in every phase: a cooldown should keep counting between points, and
  // a resize that started mid-rally should finish rather than freeze at the serve.
  tickAbilities();
  easePaddles();

  if (control === "keyboard") {
    if (keys.up) player.y -= PADDLE_SPEED;
    if (keys.down) player.y += PADDLE_SPEED;
  }
  clampPaddle(player);

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
    if (y !== null && y + BALL_SIZE >= player.y && y <= player.y + player.h) {
      ball.y = y;
      bounce(player, 1);
      ball.x = PLAYER_PLANE;
      // After the bounce, or a close call would spend the charge it just earned.
      onPlayerReturn(y);
    }
  } else if (ball.vx > 0) {
    const y = crossingY(prevX, prevY, AI_PLANE);
    if (y !== null && y + BALL_SIZE >= ai.y && y <= ai.y + ai.h) {
      ball.y = y;
      bounce(ai, -1);
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
    onScore("ai");
  } else if (ball.x > WIDTH) {
    player.score += 1;
    serveTo = 1;
    onScore("player");
  }
}

// `scorer` is who won the point, passed rather than inferred: the run of points
// conceded is not recoverable from the score once it has been added.
function onScore(scorer) {
  if (player.score >= WIN_SCORE || ai.score >= WIN_SCORE) {
    gameOver = true;
    showMenu(player.score > ai.score ? "You win! 🎉" : "AI wins!");
    return;
  }
  concededStreak = scorer === "ai" ? concededStreak + 1 : 0;
  if (scorer === "ai") {
    returnStreak = 0;
    // An earned Expand is lost by conceding. A situational one is not - being
    // scored on is the very thing it is there for - so syncExpand owns that case.
    if (!expandIsState() && moveState.expand && moveState.expand.phase !== "idle") {
      endMove("expand");
    }
  }
  syncExpand();
  ball = centredBall();
  phase = "countdown";
  serveTicks = SERVE_DELAY_TICKS;
  updateStatus();
}

// Which moves show on which paddle, in order of precedence. The colour says whose
// move it is rather than what it does: red is the villain acting, green is yours.
// Clutch first: its pulse is the only thing that says a charge is in hand, while
// expand's tell is the paddle's own size and shows whatever is drawn over it.
// Squeeze is listed on the *opponent's* paddle even though it lands on yours:
// the wind-up is something it does, and the bolt carries it across. Listing it
// on yours made the victim look like the one with the powerup.
const PLAYER_TELLS = [["clutch", "hero"], ["expand", "hero"]];
const AI_TELLS = [
  ["squeeze", "villain"], ["overdrive", "villain"], ["blink", "villain"],
];

// A paddle winding up shakes and glows harder the closer it is to firing; one
// that is charged and waiting glows steadily. Both are how you know it is coming.
// What drawPaddle last worked out for each side. Exposed for the harness: the
// wind-up styles differ in how the glow *moves* over time, and counting lit
// pixels on a paddle that is deliberately shaking measures the shake instead.
let lastTell = { player: null, ai: null };

function drawPaddle(p, x, tells) {
  let shake = 0;
  let glow = 0;
  let tint = null;
  let showing = null;
  for (const [name, who] of tells) {
    const st = moveState[name];
    if (!st || st.phase === "idle") continue;
    // Armed, but the meter is still celebrating: the paddle lights up as the
    // payoff at the end of the sweep rather than halfway through it.
    if (name === "clutch" && meterSeq >= 0) continue;
    const spec = ABILITY[name];
    // A move whose effect lands somewhere else only tells while it is winding up.
    if (spec.tellWhile && st.phase !== spec.tellWhile) continue;
    tint = colors[who];
    if (spec.tell === "tint") break;   // the colour is the whole tell
    if (st.phase === "telegraph") {
      const t = spec.telegraphTicks > 0 ? 1 - st.ticks / spec.telegraphTicks : 1;
      if (spec.windUp === "stutter") {
        // Flickering rather than building: it reads as something misfiring, and
        // it is the shortest of the three so it has to register immediately.
        const on = ABILITY.stutterTicks > 0
          ? tickCount % ABILITY.stutterTicks < ABILITY.stutterTicks / 2
          : true;
        glow = on ? 1 : 0.12;
        shake = ABILITY.vibratePx * (on ? 1.8 : 0.2);
      } else if (spec.windUp === "crackle") {
        // Nearly still. The arcs gathering on the paddle are the tell here, and
        // a shaking paddle underneath them just muddies it.
        glow = 0.35 + 0.65 * t;
        shake = ABILITY.vibratePx * 0.25;
      } else {
        glow = t;
        shake = ABILITY.vibratePx * t;
      }
    } else {
      // A held charge pulses rather than glowing flat: a steady light reads as
      // part of the paddle, and a moving one reads as something waiting to go off.
      glow = ABILITY.pulseTicks > 0
        ? 0.55 + 0.45 * Math.sin((tickCount / ABILITY.pulseTicks) * Math.PI * 2)
        : 1;
      shake = ABILITY.activeVibratePx;
    }
    showing = name;
    break;
  }
  lastTell[p === ai ? "ai" : "player"] = showing
    ? { name: showing, glow, shake }
    : null;
  ctx.save();
  if (tint) {
    ctx.fillStyle = tint;
    // Guarded: an unguarded shadowBlur would leave a halo on a tint-only tell.
    if (glow > 0) {
      ctx.shadowColor = tint;
      ctx.shadowBlur = 4 + 20 * glow;
    }
  } else {
    ctx.fillStyle = colors.fg;
  }
  ctx.fillRect(x, p.y + (shake > 0 ? (Math.random() * 2 - 1) * shake : 0),
    PADDLE_WIDTH, p.h);
  ctx.restore();
}

// Three pips on the player's side of the board. Empty ones are outlined so the
// meter reads as "two of three" rather than as two loose marks, which is what
// makes a partly-filled one explain itself the first time you see it.
const METER = { x: 14, y: HEIGHT - 18, w: 20, h: 7, gap: 4 };

// One segment. A popping pip throws a ring outward, swells past its own size and
// burns white at the core before settling back to green.
function drawPip(i, lit, charged) {
  const P = ABILITY.pop;
  const x = METER.x + i * (METER.w + METER.gap);
  const pip = pips[i];
  const p = pip && pip.t > 0 ? pip.t / pip.max : 0;   // 1 at the flash, 0 at rest

  if (p > 0 && P.ringPx > 0) {
    const g = (1 - p) * P.ringPx;
    ctx.save();
    ctx.globalAlpha = p;
    ctx.strokeStyle = colors.hero;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - g, METER.y - g, METER.w + 2 * g, METER.h + 2 * g);
    ctx.restore();
  }

  ctx.save();
  if (!lit) {
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, METER.y + 0.5, METER.w - 1, METER.h - 1);
    ctx.restore();
    return;
  }
  const g = p * P.pipGrowPx;
  const box = [x - g, METER.y - g, METER.w + 2 * g, METER.h + 2 * g];
  if (charged || p > 0) {
    ctx.shadowColor = colors.hero;
    ctx.shadowBlur = 12 + 20 * p;
  }
  ctx.fillStyle = colors.hero;
  ctx.fillRect(...box);
  if (p > 0) {
    ctx.globalAlpha = p;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(...box);
  }
  ctx.restore();
}

function drawClutchMeter() {
  const spec = ABILITY.clutch;
  if (!spec.modes.includes(difficulty) || spec.segments <= 0) return;
  const charged = moveActive("clutch");
  const filled = charged ? spec.segments : clutchCharge;
  for (let i = 0; i < spec.segments; i++) drawPip(i, i < filled, charged);
}

// The meter is in the corner and your eye is on the ball, so the paddle says it
// too - a white burst at the exact point of contact, spreading as it fades.
function drawPaddleFlash() {
  const P = ABILITY.pop;
  if (paddleFlash.t <= 0) return;
  const p = paddleFlash.t / paddleFlash.max;
  const spread = (1 - p) * P.paddleSpreadPx;
  ctx.save();
  ctx.globalAlpha = p;
  ctx.shadowColor = colors.hero;
  ctx.shadowBlur = 24 * p;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, paddleFlash.y - 3 - spread,
    PADDLE_WIDTH + spread * 0.5, 6 + spread * 2);
  ctx.restore();
}

// One jagged path, drawn twice: a wide soft stroke for the glow and a thin white
// core on top. That pairing is what stops it reading as a red scribble.
function strokePath(pts, width, colour, alpha) {
  if (pts.length < 2) return;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}

// Which unspent charged shot, if any, this paddle is holding. Both sides have
// one: the opponent's Overdrive and your Clutch are the same idea pointed in
// opposite directions, so they are drawn the same way.
function chargeHeldBy(p) {
  const name = p === ai ? "overdrive" : "clutch";
  if (!moveActive(name)) return null;
  // Clutch arms the instant the meter fills, but the meter is still celebrating;
  // the paddle lights up at the end of that sweep, not halfway through it.
  if (name === "clutch" && meterSeq >= 0) return null;
  return name;
}

// Drawn separately from the tell rather than as one of them, because a paddle
// shows a single tell and a held charge has to survive the paddle winding up
// something else on top of it.
function drawCharged(p, x, who) {
  if (!chargeHeldBy(p)) return;
  const halo = ABILITY.chargedHaloPx;
  const core = ABILITY.chargedCorePx;
  if (halo <= 0 && core <= 0) return;
  // Ticks, not milliseconds, so it breathes at the same rate on any monitor.
  const pulse = ABILITY.pulseTicks > 0
    ? 0.6 + 0.4 * Math.sin((tickCount / ABILITY.pulseTicks) * Math.PI * 2)
    : 1;
  ctx.save();
  if (halo > 0) {
    ctx.globalAlpha = 0.35 * pulse;
    ctx.fillStyle = colors[who];
    ctx.shadowColor = colors[who];
    ctx.shadowBlur = halo * pulse;
    ctx.fillRect(x - halo / 2, p.y - halo / 2, PADDLE_WIDTH + halo, p.h + halo);
  }
  if (core > 0) {
    ctx.globalAlpha = 0.85 * pulse;
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = colors[who];
    ctx.shadowBlur = 12;
    const cx = x + (PADDLE_WIDTH - core) / 2;
    ctx.fillRect(cx, p.y + 2, core, Math.max(0, p.h - 4));
  }
  ctx.restore();
}

function drawLightning() {
  const spec = ABILITY.squeeze;
  ctx.save();
  if (bolt.t > 0 && bolt.points.length > 1) {
    const p = bolt.t / bolt.max;
    ctx.shadowColor = colors.villain;
    ctx.shadowBlur = 18 * p;
    for (const fork of bolt.forks) strokePath(fork, 2, colors.villain, 0.7 * p);
    strokePath(bolt.points, 7, colors.villain, 0.55 * p);
    strokePath(bolt.points, 2.5, "#ffffff", p);
  }
  for (const set of [arcs, chargeArcs]) {
    if (set.length === 0) continue;
    ctx.shadowColor = colors.villain;
    ctx.shadowBlur = 10;
    for (const arc of set) {
      strokePath(arc, 3.5, colors.villain, 0.65);
      strokePath(arc, 1.5, "#ffffff", 0.9);
    }
  }
  ctx.restore();
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

  // Ghosts first, so the paddle itself lands on top of its own trail.
  if (aiGhosts.length > 0) {
    ctx.save();
    ctx.fillStyle = colors.villain;
    for (let i = 0; i < aiGhosts.length; i++) {
      ctx.globalAlpha = 0.1 + 0.2 * ((i + 1) / aiGhosts.length);
      ctx.fillRect(WIDTH - PADDLE_WIDTH, aiGhosts[i], PADDLE_WIDTH, ai.h);
    }
    ctx.restore();
  }

  drawPaddle(player, 0, PLAYER_TELLS);
  drawPaddle(ai, WIDTH - PADDLE_WIDTH, AI_TELLS);
  // Over the paddles: the bolt starts and ends on them, and the crackle has to
  // sit on top of the paddle it is crackling over.
  drawCharged(player, 0, "hero");
  drawCharged(ai, WIDTH - PADDLE_WIDTH, "villain");
  drawLightning();
  drawPaddleFlash();
  drawClutchMeter();

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
  player.y = Math.max(0, Math.min(HEIGHT - player.h, y - player.h / 2));
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
  player = newPaddle();
  ai = newPaddle();
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
  resetAbilities();
  for (const p of [player, ai]) {
    p.h = p.hTarget = baseHeight(p);
    p.y = HEIGHT / 2 - p.h / 2;
  }
  aiTarget = (HEIGHT - ai.h) / 2;
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

for (const b of winScoreBtns) {
  b.addEventListener("click", () => {
    applyWinScore(Number(b.dataset.score));
    saveWinScore(WIN_SCORE);
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

applyDifficulty(loadDifficulty() ?? "normal");
applyWinScore(loadWinScore() ?? WIN_SCORES[0]);
showMenu();
start();
