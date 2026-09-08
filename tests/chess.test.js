// Chess: the capture trays, the marks, and the pieces being drawings.
//
// Chess had no suite of its own until the vector-grid restyle, which added the
// first state on the page worth protecting: what each side has taken, the
// material difference, and which mark is showing on which square. Legality is
// left alone here — it was correct before this branch and nothing on it touched
// the move generator.
//
// State is set through the globals rather than by clicking a game into shape,
// which is what "Scripts are classic, not modules" in CLAUDE.md buys us. Moves
// that matter are still played through handleSquareClick, because the capture
// bookkeeping lives in the click handler and setting state directly would step
// straight over the thing under test.
const { launch, url, makeChecks } = require("./helpers");

// Rows are ranks 8 down to 1; uppercase is White.
function boardFrom(rows) {
  return rows.map((row) =>
    row.split("").map((ch) => {
      if (ch === ".") return null;
      return (ch === ch.toUpperCase() ? "w" : "b") + ch.toUpperCase();
    })
  );
}

(async () => {
  const { check, report } = makeChecks();
  const browser = await launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url("/games/chess/index.html"));

  // ---- the pieces are drawings, not glyphs ----------------------------------

  console.log("1. every piece on the board is an SVG drawing");

  const opening = await page.evaluate(() => {
    const squares = [...document.querySelectorAll("#board .square")];
    const occupied = squares.filter((s) => s.childElementCount > 0);
    return {
      pieces: occupied.length,
      svgs: occupied.filter((s) => s.querySelector("svg")).length,
      // A glyph would leave text behind; a drawing leaves none.
      text: squares.map((s) => s.textContent).join("").trim().length,
      types: Object.keys(PIECE_PATHS).sort().join(""),
    };
  });

  check("32 pieces at the start", opening.pieces === 32, opening.pieces);
  check("every one of them is an svg", opening.svgs === 32, opening.svgs);
  check("no piece is drawn as text", opening.text === 0, opening.text);
  check("all six piece types have a path", opening.types === "BKNPQR", opening.types);

  // ---- the trays -----------------------------------------------------------

  console.log("2. a capture lands in the taker's tray");

  // 1. e4 d5 2. exd5 — White takes a pawn, played through the click handler.
  const afterCapture = await page.evaluate(() => {
    handleSquareClick(6, 4); handleSquareClick(4, 4);   // e2-e4
    handleSquareClick(1, 3); handleSquareClick(3, 3);   // d7-d5
    handleSquareClick(4, 4); handleSquareClick(3, 3);   // exd5
    return {
      white: state.captured.w.join(","),
      black: state.captured.b.join(","),
      whiteTray: document.querySelectorAll("#taken-by-white .pcs svg").length,
      blackTray: document.querySelectorAll("#taken-by-black .pcs svg").length,
      adv: (document.querySelector("#taken-by-white .adv") || {}).textContent,
      otherAdv: document.querySelector("#taken-by-black .adv"),
    };
  });

  check("White has taken one pawn", afterCapture.white === "bP", afterCapture.white);
  check("Black has taken nothing", afterCapture.black === "", `"${afterCapture.black}"`);
  check("White's tray draws one piece", afterCapture.whiteTray === 1, afterCapture.whiteTray);
  check("Black's tray draws none", afterCapture.blackTray === 0, afterCapture.blackTray);
  check("the leading side shows the difference", afterCapture.adv === "+1", afterCapture.adv);
  // The whole point of one number: the side that is behind says nothing at all.
  check("the trailing side shows no number", afterCapture.otherAdv === null);

  console.log("3. the tray is ordered Q R B N P and the figure is the difference");

  const ordered = await page.evaluate(() => {
    restart();
    state.captured.w = ["bP", "bN", "bQ", "bB"];
    state.captured.b = ["wR", "wR"];
    render();
    const drawn = [...document.querySelectorAll("#taken-by-white .pcs svg")]
      .map((svg) => svg.dataset.piece[1]);
    return {
      order: drawn.join(""),
      adv: (document.querySelector("#taken-by-white .adv") || {}).textContent,
      black: document.querySelector("#taken-by-black .adv"),
    };
  });

  // 9 + 3 + 3 + 1 = 16 against 10, so White is 6 ahead and Black shows nothing.
  check("ordered Q R B N P", ordered.order === "QBNP", ordered.order);
  check("the figure is the difference, not a total", ordered.adv === "+6", ordered.adv);
  check("only the leading side carries it", ordered.black === null);

  console.log("4. en passant is recorded, though the pawn is not on the target square");

  // The trap this exists for: applyMove clears a square the move never lands on,
  // so reading the captured piece off move.to would record nothing at all.
  const ep = await page.evaluate(() => {
    restart();
    state.board = [
      "rnbqkbnr",
      "pp.ppppp",
      "........",
      "....P...",
      "........",
      "........",
      "PPPP.PPP",
      "RNBQKBNR",
    ].map((row) =>
      row.split("").map((ch) => (ch === "." ? null : (ch === ch.toUpperCase() ? "w" : "b") + ch.toUpperCase()))
    );
    state.turn = "b";
    render();
    handleSquareClick(1, 5); handleSquareClick(3, 5);   // f7-f5, past the pawn
    handleSquareClick(3, 4); handleSquareClick(2, 5);   // exf6 en passant
    return {
      taken: state.captured.w.join(","),
      gone: state.board[3][5],
      tray: document.querySelectorAll("#taken-by-white .pcs svg").length,
    };
  });

  check("the en passant pawn is recorded", ep.taken === "bP", ep.taken);
  check("and it has left the board", ep.gone === null, ep.gone);
  check("and it is drawn in the tray", ep.tray === 1, ep.tray);

  // ---- the marks -----------------------------------------------------------

  console.log("5. the last move marks both of its squares");

  const last = await page.evaluate(() => {
    restart();
    handleSquareClick(6, 4); handleSquareClick(4, 4);   // e2-e4
    const marked = [...document.querySelectorAll("#board .square.last")];
    const all = [...document.querySelectorAll("#board .square")];
    return { count: marked.length, at: marked.map((s) => all.indexOf(s)).join(",") };
  });

  // Squares are appended in reading order, so e2 is index 52 and e4 is 36.
  check("both squares carry it", last.count === 2, last.count);
  check("and they are the from and the to", last.at === "36,52", last.at);

  console.log("6. the move marks follow the side to move");

  const turnMark = await page.evaluate(() => {
    restart();
    // Read it off #board, which is where data-turn lives and therefore where the
    // override lands — .board-stack only carries the default.
    const read = () =>
      getComputedStyle(document.getElementById("board")).getPropertyValue("--mark").trim();
    const white = { turn: board.dataset.turn, mark: read() };
    handleSquareClick(6, 4); handleSquareClick(4, 4);
    return { white, black: { turn: board.dataset.turn, mark: read() } };
  });

  check("White to move sets data-turn", turnMark.white.turn === "w", turnMark.white.turn);
  check("Black to move sets data-turn", turnMark.black.turn === "b", turnMark.black.turn);
  // The colours themselves are the art director's to change; that they *differ*
  // is the thing that carries the meaning, so that is what is asserted.
  check("and the two turns mark differently",
    turnMark.white.mark !== turnMark.black.mark,
    `${turnMark.white.mark} vs ${turnMark.black.mark}`);

  console.log("7. selection, check and last move each keep their own layer");

  // The guard for the defect this branch fixed: the reference CSS drew all three
  // on ::after, an element has one, and selecting a checked king silently lost
  // its ring. Asserting the three layers separately is what makes collapsing
  // them back onto one pseudo-element fail here rather than in a screenshot.
  const layers = await page.evaluate(() => {
    restart();
    // Black king on g8, White rook lifted to g6 down an open file: check. The
    // same square is selected and is one end of the last move.
    state.board[0][4] = null;     // the king leaves e8
    state.board[0][6] = "bK";     // for g8
    state.board[1][6] = null;     // and g7 opens the file
    state.board[2][6] = "wR";
    state.turn = "b";
    state.selected = { r: 0, c: 6 };
    state.legalMoves = getLegalMoves(state, 0, 6);
    state.lastMove = { from: { r: 7, c: 6 }, to: { r: 2, c: 6 } };
    render();
    const sq = [...document.querySelectorAll("#board .square")][6];
    const g6 = [...document.querySelectorAll("#board .square")][22];
    return {
      classes: sq.className,
      own: getComputedStyle(sq).boxShadow,
      after: getComputedStyle(sq, "::after").boxShadow,
      before: getComputedStyle(g6, "::before").backgroundColor,
    };
  });

  const coral = "255, 106, 86";
  const amber = "255, 176, 0";
  check("the king's square is checked and selected",
    /\bcheck\b/.test(layers.classes) && /\bselected\b/.test(layers.classes),
    layers.classes);
  check("check draws on the square itself", layers.own.includes(coral), layers.own.slice(0, 60));
  check("selection draws on ::after", layers.after.includes(amber), layers.after.slice(0, 60));
  check("the last move draws on ::before", layers.before.includes(amber), layers.before);

  check("no page errors", errors.length === 0, errors.join("; "));

  await browser.close();
  process.exit(report());
})();
