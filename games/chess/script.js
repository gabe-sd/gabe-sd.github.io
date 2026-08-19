const PIECE_GLYPHS = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
};

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restart");

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

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = squareEls[r][c];
      const piece = state.board[r][c];
      sq.innerHTML = "";
      sq.classList.remove("selected", "check", "piece-w", "piece-b");
      sq.textContent = piece ? PIECE_GLYPHS[piece] : "";
      if (piece) sq.classList.add(color(piece) === "w" ? "piece-w" : "piece-b");

      if (state.selected && state.selected.r === r && state.selected.c === c) {
        sq.classList.add("selected");
      }
      if (kingPos && kingPos.r === r && kingPos.c === c) {
        sq.classList.add("check");
      }
    }
  }

  for (const move of state.legalMoves) {
    const sq = squareEls[move.to.r][move.to.c];
    const marker = document.createElement("div");
    marker.className = state.board[move.to.r][move.to.c] || move.enPassant ? "ring" : "dot";
    sq.appendChild(marker);
  }
}

function updateStatus() {
  if (state.gameOver) return;
  const turnName = state.turn === "w" ? "White" : "Black";
  const inCheck = isInCheck(state.board, state.turn);
  const anyMoves = hasAnyLegalMove(state, state.turn);

  if (!anyMoves && inCheck) {
    state.gameOver = true;
    statusEl.textContent = `Checkmate — ${state.turn === "w" ? "Black" : "White"} wins!`;
  } else if (!anyMoves) {
    state.gameOver = true;
    statusEl.textContent = "Stalemate — draw!";
  } else if (inCheck) {
    statusEl.textContent = `${turnName}'s turn — check!`;
  } else {
    statusEl.textContent = `${turnName}'s turn`;
  }
}

function handleSquareClick(r, c) {
  if (state.gameOver) return;
  const piece = state.board[r][c];

  if (state.selected) {
    const move = state.legalMoves.find((m) => m.to.r === r && m.to.c === c);
    if (move) {
      const result = applyMove(state, move);
      state.board = result.board;
      state.castling = result.castling;
      state.enPassant = result.enPassant;
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
