// The six pieces, drawn rather than typed. This used to be a map of Unicode
// chess characters (U+2654-265F) written into each square's textContent, and
// every one of them fell through to whatever face the reader's OS served: VT323
// stops at Latin Extended and has no chess glyphs at all. Stroke SVG on the
// hub's own 48x48 icon grid at the hub's own weight fixes that and gives the
// site one drawing hand — see design/DESIGN.md, "Chess: the vector grid".
//
// One weight, one grid, no fills. Every piece stands on the same base bar,
// which is what makes six different silhouettes read as one set.
const PIECE_PATHS = {
  P:
    '<circle cx="24" cy="12.5" r="4.5"/>' +
    '<path d="M19 19h10l-2 4h-6z"/>' +
    '<path d="M21 23c0 6-2.5 9-4 12h14c-1.5-3-4-6-4-12"/>' +
    '<path d="M13 35h22v5H13z"/>',

  R:
    '<path d="M14 9h5v4h4V9h4v4h4V9h5v11H14z"/>' +
    '<path d="M17.5 20l1.5 13h10l1.5-13"/>' +
    '<path d="M13 33h22v6H13z"/>',

  B:
    '<circle cx="24" cy="9" r="2.5"/>' +
    '<path d="M24 12.5c-5.5 4-8 8.5-8 12.5 0 4.5 3.6 7.5 8 7.5s8-3 8-7.5c0-4-2.5-8.5-8-12.5z"/>' +
    '<path d="M24 18l3.5 4.5"/>' +
    '<path d="M13 35h22v5H13z"/>',

  // Straight lines only — chosen over three rounder alternatives. The parts
  // that identify it are the wedge muzzle with the jaw cut back under it, the
  // straight forehead, and the single pointed ear; lose any of those and it
  // stops being a horse. It is the only piece in the set with no curve in it.
  N:
    '<path d="M16 35L17 27L23 22L12 25L10 19.5L17 12L22 9L20.5 3.5L27 8.5L32 14.5L34 23V35Z"/>' +
    '<circle cx="19.5" cy="15.5" r="1.3" fill="currentColor" stroke="none"/>' +
    '<path d="M13 35h22v5H13z"/>',

  Q:
    '<circle cx="11.5" cy="12.5" r="2.2"/><circle cx="17.5" cy="9.5" r="2.2"/>' +
    '<circle cx="24" cy="8" r="2.2"/><circle cx="30.5" cy="9.5" r="2.2"/>' +
    '<circle cx="36.5" cy="12.5" r="2.2"/>' +
    '<path d="M11.5 15L15 28h18l3.5-13-6.5 7-6-11-6 11z"/>' +
    '<path d="M15 28h18l-1.5 5h-15z"/>' +
    '<path d="M13 35h22v5H13z"/>',

  // "Broad": a wide dome, a collar band, and the standard base. Chosen after
  // two entire further sets were rejected, both on silhouette — do not redraw
  // it as a taller, narrower figure, which is the shape both rejected sets
  // shared. design/DESIGN.md records why.
  K:
    '<path d="M24 4V13"/><path d="M20.5 8.5H27.5"/>' +
    '<path d="M24 14.5c-4.5-1.8-10 1-11 6.8-.8 4.8 1.2 9.8 1.8 12.7h18.4' +
      'c.6-2.9 2.6-7.9 1.8-12.7-1-5.8-6.5-8.6-11-6.8z"/>' +
    '<path d="M15 28h18" stroke-width="1.5"/>' +
    '<path d="M13 35h22v5H13z"/>',
};

// The standard values, and the order every chess interface puts a tray in.
const PIECE_VALUES = { Q: 9, R: 5, B: 3, N: 3, P: 1 };
const TRAY_ORDER = "QRBNP";

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restart");
const takenByWhiteEl = document.getElementById("taken-by-white");
const takenByBlackEl = document.getElementById("taken-by-black");

// Colour arrives through currentColor from .piece-w / .piece-b, so a piece
// never carries a colour of its own — which is what lets the same markup serve
// the live board and the dimmed capture trays.
function pieceSVG(piece) {
  const cls = color(piece) === "w" ? "piece-w" : "piece-b";
  return '<svg class="' + cls + '" viewBox="0 0 48 48" fill="none" ' +
    'stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" ' +
    'stroke-linecap="round" aria-hidden="true">' +
    PIECE_PATHS[type(piece)] + "</svg>";
}

let squareEls = [];
let state = null;

function initialBoard() {
  const empty = () => Array.from({ length: 8 }, () => Array(8).fill(null));
  const b = empty();
  const backRank = ["R", "N", "B", "Q", "K", "B", "N", "R"];
  for (let c = 0; c < 8; c++) {
    b[0][c] = "b" + backRank[c];
    b[1][c] = "bP";
    b[6][c] = "wP";
    b[7][c] = "w" + backRank[c];
  }
  return b;
}

function newGameState() {
  return {
    board: initialBoard(),
    turn: "w",
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    selected: null,
    legalMoves: [],
    gameOver: false,
    // Display only, and deliberately outside applyMove, which is pure and gets
    // called once per candidate move while filtering for legality — anything
    // recorded in there would count every move nobody played.
    captured: { w: [], b: [] },  // captured[side] = what that side has taken
    lastMove: null,              // { from: {r,c}, to: {r,c} }
  };
}

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function color(piece) {
  return piece ? piece[0] : null;
}

function type(piece) {
  return piece ? piece[1] : null;
}

function opponent(c) {
  return c === "w" ? "b" : "w";
}

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

function findKing(board, kingColor) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === kingColor + "K") return { r, c };
    }
  }
  return null;
}

const KNIGHT_OFFSETS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
];
const KING_OFFSETS = [
  [-1, -1], [-1, 0], [-1, 1], [0, -1],
  [0, 1], [1, -1], [1, 0], [1, 1],
];
const DIAGONAL_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ORTHOGONAL_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function isSquareAttacked(board, r, c, byColor) {
  const pawnDir = byColor === "w" ? 1 : -1;
  for (const dc of [-1, 1]) {
    const rr = r + pawnDir;
    const cc = c + dc;
    if (inBounds(rr, cc) && board[rr][cc] === byColor + "P") return true;
  }

  for (const [dr, dc] of KNIGHT_OFFSETS) {
    const rr = r + dr;
    const cc = c + dc;
    if (inBounds(rr, cc) && board[rr][cc] === byColor + "N") return true;
  }

  for (const [dr, dc] of KING_OFFSETS) {
    const rr = r + dr;
    const cc = c + dc;
    if (inBounds(rr, cc) && board[rr][cc] === byColor + "K") return true;
  }

  for (const [dr, dc] of DIAGONAL_DIRS) {
    let rr = r + dr;
    let cc = c + dc;
    while (inBounds(rr, cc)) {
      const p = board[rr][cc];
      if (p) {
        if (color(p) === byColor && (type(p) === "B" || type(p) === "Q")) return true;
        break;
      }
      rr += dr;
      cc += dc;
    }
  }

  for (const [dr, dc] of ORTHOGONAL_DIRS) {
    let rr = r + dr;
    let cc = c + dc;
    while (inBounds(rr, cc)) {
      const p = board[rr][cc];
      if (p) {
        if (color(p) === byColor && (type(p) === "R" || type(p) === "Q")) return true;
        break;
      }
      rr += dr;
      cc += dc;
    }
  }

  return false;
}

function isInCheck(board, kingColor) {
  const king = findKing(board, kingColor);
  if (!king) return false;
  return isSquareAttacked(board, king.r, king.c, opponent(kingColor));
}

function generatePseudoMoves(gs, r, c) {
  const board = gs.board;
  const piece = board[r][c];
  if (!piece) return [];
  const pc = color(piece);
  const pt = type(piece);
  const moves = [];

  if (pt === "P") {
    const dir = pc === "w" ? -1 : 1;
    const startRow = pc === "w" ? 6 : 1;
    const promoRow = pc === "w" ? 0 : 7;

    if (inBounds(r + dir, c) && !board[r + dir][c]) {
      moves.push({ from: { r, c }, to: { r: r + dir, c }, promotion: r + dir === promoRow });
      if (r === startRow && !board[r + 2 * dir][c]) {
        moves.push({ from: { r, c }, to: { r: r + 2 * dir, c }, isDoubleStep: true });
      }
    }
    for (const dc of [-1, 1]) {
      const rr = r + dir;
      const cc = c + dc;
      if (!inBounds(rr, cc)) continue;
      const target = board[rr][cc];
      if (target && color(target) !== pc) {
        moves.push({ from: { r, c }, to: { r: rr, c: cc }, capture: true, promotion: rr === promoRow });
      } else if (
        gs.enPassant &&
        gs.enPassant.r === rr &&
        gs.enPassant.c === cc
      ) {
        moves.push({ from: { r, c }, to: { r: rr, c: cc }, enPassant: true, capture: true });
      }
    }
  } else if (pt === "N") {
    for (const [dr, dc] of KNIGHT_OFFSETS) {
      const rr = r + dr;
      const cc = c + dc;
      if (!inBounds(rr, cc)) continue;
      const target = board[rr][cc];
      if (!target || color(target) !== pc) {
        moves.push({ from: { r, c }, to: { r: rr, c: cc }, capture: !!target });
      }
    }
  } else if (pt === "K") {
    for (const [dr, dc] of KING_OFFSETS) {
      const rr = r + dr;
      const cc = c + dc;
      if (!inBounds(rr, cc)) continue;
      const target = board[rr][cc];
      if (!target || color(target) !== pc) {
        moves.push({ from: { r, c }, to: { r: rr, c: cc }, capture: !!target });
      }
    }
  } else {
    const dirs =
      pt === "B" ? DIAGONAL_DIRS : pt === "R" ? ORTHOGONAL_DIRS : [...DIAGONAL_DIRS, ...ORTHOGONAL_DIRS];
    for (const [dr, dc] of dirs) {
      let rr = r + dr;
      let cc = c + dc;
      while (inBounds(rr, cc)) {
        const target = board[rr][cc];
        if (!target) {
          moves.push({ from: { r, c }, to: { r: rr, c: cc } });
        } else {
          if (color(target) !== pc) moves.push({ from: { r, c }, to: { r: rr, c: cc }, capture: true });
          break;
        }
        rr += dr;
        cc += dc;
      }
    }
  }

  return moves;
}

function addCastlingMoves(gs, r, c, moves) {
  const piece = gs.board[r][c];
  const pc = color(piece);
  if (type(piece) !== "K") return;
  const home = pc === "w" ? 7 : 0;
  if (r !== home || c !== 4) return;
  if (isInCheck(gs.board, pc)) return;

  const kingsideRight = pc === "w" ? gs.castling.wK : gs.castling.bK;
  if (
    kingsideRight &&
    !gs.board[home][5] &&
    !gs.board[home][6] &&
    gs.board[home][7] === pc + "R" &&
    !isSquareAttacked(gs.board, home, 5, opponent(pc)) &&
    !isSquareAttacked(gs.board, home, 6, opponent(pc))
  ) {
    moves.push({ from: { r, c }, to: { r: home, c: 6 }, castle: "kingside" });
  }

  const queensideRight = pc === "w" ? gs.castling.wQ : gs.castling.bQ;
  if (
    queensideRight &&
    !gs.board[home][1] &&
    !gs.board[home][2] &&
    !gs.board[home][3] &&
    gs.board[home][0] === pc + "R" &&
    !isSquareAttacked(gs.board, home, 3, opponent(pc)) &&
    !isSquareAttacked(gs.board, home, 2, opponent(pc))
  ) {
    moves.push({ from: { r, c }, to: { r: home, c: 2 }, castle: "queenside" });
  }
}

function applyMove(gs, move) {
  const board = cloneBoard(gs.board);
  const piece = board[move.from.r][move.from.c];
  const pc = color(piece);

  if (move.enPassant) {
    const capturedRow = move.from.r;
    board[capturedRow][move.to.c] = null;
  }

  board[move.to.r][move.to.c] = piece;
  board[move.from.r][move.from.c] = null;

  if (move.promotion) {
    board[move.to.r][move.to.c] = pc + "Q";
  }

  if (move.castle === "kingside") {
    const home = move.from.r;
    board[home][5] = board[home][7];
    board[home][7] = null;
  } else if (move.castle === "queenside") {
    const home = move.from.r;
    board[home][3] = board[home][0];
    board[home][0] = null;
  }

  const castling = { ...gs.castling };
  if (type(piece) === "K") {
    if (pc === "w") { castling.wK = false; castling.wQ = false; }
    else { castling.bK = false; castling.bQ = false; }
  }
  if (type(piece) === "R") {
    if (pc === "w" && move.from.r === 7 && move.from.c === 0) castling.wQ = false;
    if (pc === "w" && move.from.r === 7 && move.from.c === 7) castling.wK = false;
    if (pc === "b" && move.from.r === 0 && move.from.c === 0) castling.bQ = false;
    if (pc === "b" && move.from.r === 0 && move.from.c === 7) castling.bK = false;
  }
  if (board[move.to.r][move.to.c] && move.to.r === 0 && move.to.c === 0) castling.bQ = false;
  if (board[move.to.r][move.to.c] && move.to.r === 0 && move.to.c === 7) castling.bK = false;
  if (board[move.to.r][move.to.c] && move.to.r === 7 && move.to.c === 0) castling.wQ = false;
  if (board[move.to.r][move.to.c] && move.to.r === 7 && move.to.c === 7) castling.wK = false;

  let enPassant = null;
  if (move.isDoubleStep) {
    enPassant = { r: (move.from.r + move.to.r) / 2, c: move.from.c };
  }

  return { board, castling, enPassant };
}

function getLegalMoves(gs, r, c) {
  const piece = gs.board[r][c];
  if (!piece || color(piece) !== gs.turn) return [];
  const pseudo = generatePseudoMoves(gs, r, c);
  addCastlingMoves(gs, r, c, pseudo);

  return pseudo.filter((move) => {
    const { board } = applyMove(gs, move);
    return !isInCheck(board, gs.turn);
  });
}

function hasAnyLegalMove(gs, forColor) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = gs.board[r][c];
      if (piece && color(piece) === forColor) {
        if (getLegalMoves({ ...gs, turn: forColor }, r, c).length > 0) return true;
      }
    }
  }
  return false;
}

function buildBoard() {
  boardEl.innerHTML = "";
  squareEls = [];
  for (let r = 0; r < 8; r++) {
    const row = [];
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement("div");
      sq.className = "square " + ((r + c) % 2 === 0 ? "light" : "dark");
      sq.setAttribute("role", "gridcell");
      sq.addEventListener("click", () => handleSquareClick(r, c));
      boardEl.appendChild(sq);
      row.push(sq);
    }
    squareEls.push(row);
  }
}

function render() {
  const inCheckColor = isInCheck(state.board, state.turn) ? state.turn : null;
  const kingPos = inCheckColor ? findKing(state.board, inCheckColor) : null;

  // The move marks follow the side to move; style.css reads this. One colour
  // means one side, the same reading rule the pieces themselves follow.
  boardEl.dataset.turn = state.turn;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = squareEls[r][c];
      const piece = state.board[r][c];
      sq.classList.remove("selected", "check", "last");
      sq.innerHTML = piece ? pieceSVG(piece) : "";

      if (state.selected && state.selected.r === r && state.selected.c === c) {
        sq.classList.add("selected");
      }
      if (kingPos && kingPos.r === r && kingPos.c === c) {
        sq.classList.add("check");
      }
      if (isLastMoveSquare(r, c)) {
        sq.classList.add("last");
      }
    }
  }

  for (const move of state.legalMoves) {
    const sq = squareEls[move.to.r][move.to.c];
    const marker = document.createElement("div");
    marker.className = state.board[move.to.r][move.to.c] || move.enPassant ? "ring" : "dot";
    sq.appendChild(marker);
  }

  renderTrays();
}

function isLastMoveSquare(r, c) {
  const m = state.lastMove;
  if (!m) return false;
  return (m.from.r === r && m.from.c === c) || (m.to.r === r && m.to.c === c);
}

function materialOf(taken) {
  return taken.reduce((sum, piece) => sum + PIECE_VALUES[type(piece)], 0);
}

// One number on the whole board: the material difference, carried only by the
// side that is ahead. Two running totals would be two numbers to subtract
// before learning the only thing a player reads for, and the losing side
// showing nothing is itself the fastest way to say who is losing.
function renderTrays() {
  const diff = materialOf(state.captured.w) - materialOf(state.captured.b);
  paintTray(takenByWhiteEl, state.captured.w, diff > 0 ? diff : 0);
  paintTray(takenByBlackEl, state.captured.b, diff < 0 ? -diff : 0);
}

function paintTray(el, taken, advantage) {
  const sorted = taken
    .slice()
    .sort((a, b) => TRAY_ORDER.indexOf(type(a)) - TRAY_ORDER.indexOf(type(b)));
  let html = '<span class="pcs">' + sorted.map(pieceSVG).join("") + "</span>";
  if (advantage > 0) html += '<span class="adv">+' + advantage + "</span>";
  el.innerHTML = html;
}

// What this move takes, if anything. Read off the board before the move is
// applied, because applyMove is pure and returns only the resulting position.
function capturedBy(move) {
  if (move.enPassant) return state.board[move.from.r][move.to.c];
  return state.board[move.to.r][move.to.c];
}

// The side is named and coloured to match its own army, so the sentence and the
// board agree without the reader checking twice. The colour is carried by a
// class on the side's name rather than by the turn, because at checkmate the
// side named is the winner and the side to move is the one that lost.
function side(c) {
  return `<span class="who ${c}">${c === "w" ? "WHITE" : "BLACK"}</span>`;
}

function updateStatus() {
  if (state.gameOver) return;
  const inCheck = isInCheck(state.board, state.turn);
  const anyMoves = hasAnyLegalMove(state, state.turn);

  if (!anyMoves && inCheck) {
    state.gameOver = true;
    statusEl.innerHTML = `Checkmate &#183; ${side(opponent(state.turn))} wins`;
  } else if (!anyMoves) {
    state.gameOver = true;
    statusEl.innerHTML = "Stalemate &#183; draw";
  } else if (inCheck) {
    statusEl.innerHTML = `${side(state.turn)} to move &#183; check`;
  } else {
    statusEl.innerHTML = `${side(state.turn)} to move`;
  }
}

function handleSquareClick(r, c) {
  if (state.gameOver) return;
  const piece = state.board[r][c];

  if (state.selected) {
    const move = state.legalMoves.find((m) => m.to.r === r && m.to.c === c);
    if (move) {
      const taken = capturedBy(move);
      const result = applyMove(state, move);
      state.board = result.board;
      state.castling = result.castling;
      state.enPassant = result.enPassant;
      if (taken) state.captured[state.turn].push(taken);
      state.lastMove = { from: move.from, to: move.to };
      state.turn = opponent(state.turn);
      state.selected = null;
      state.legalMoves = [];
      updateStatus();
      render();
      return;
    }

    if (piece && color(piece) === state.turn) {
      state.selected = { r, c };
      state.legalMoves = getLegalMoves(state, r, c);
      render();
      return;
    }

    state.selected = null;
    state.legalMoves = [];
    render();
    return;
  }

  if (piece && color(piece) === state.turn) {
    state.selected = { r, c };
    state.legalMoves = getLegalMoves(state, r, c);
    render();
  }
}

function restart() {
  state = newGameState();
  updateStatus();
  render();
}

buildBoard();
restartBtn.addEventListener("click", restart);
restart();
