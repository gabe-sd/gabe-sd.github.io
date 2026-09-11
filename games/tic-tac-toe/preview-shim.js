// PREVIEW ONLY — mirrors game state into attributes preview.css reads, and on
// the pages that ask for drawn marks swaps the letter for an SVG. The build does
// this in script.js itself; this exists so the previews run the real game
// untouched. Deleted before handover.
(function () {
  const boardEl = document.getElementById("board");
  const drawn = document.body.dataset.marks === "drawn";
  const SVG = {
    // Each mark twice: a wide ground-coloured .halo under the lit .mk. The halo
    // only shows when a win line runs behind the marks, and is the gap it
    // stops short of.
    X: '<svg viewBox="0 0 48 48" aria-hidden="true"><path class="halo" d="M13 13L35 35M35 13L13 35" fill="none" stroke-width="11" stroke-linecap="round"/><path class="mk" d="M13 13L35 35M35 13L13 35" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>',
    O: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle class="halo" cx="24" cy="24" r="11.5" fill="none" stroke-width="11"/><circle class="mk" cx="24" cy="24" r="11.5" fill="none" stroke="currentColor" stroke-width="3.2"/></svg>',
  };

  function sync() {
    cells.forEach((cell, i) => {
      const mark = board[i] || "";
      if (cell.dataset.mark !== mark) cell.dataset.mark = mark;
      if (drawn && mark && !cell.querySelector("svg")) {
        cell.innerHTML = SVG[mark] + '<span class="sr">' + mark + "</span>";
      }
    });
    const win = gameOver && checkWinner();
    boardEl.dataset.turn = gameOver ? "" : currentPlayer;
    boardEl.dataset.over = gameOver ? (win ? "win" : "draw") : "";
    boardEl.dataset.winner = win ? win.player : "";
    strike(win);
  }

  // The line through a win: centre of the first square to centre of the last,
  // run on past both by a third of a square.
  function strike(win) {
    // A set-up button restarts and replays in one go, so the observer can see
    // one win replaced by another without the empty board between: key the
    // line to the squares it runs through, not just to whether there is one.
    let el = boardEl.querySelector(".strike");
    const key = win ? win.line.join() : "";
    if (el && el.dataset.line === key) return;
    if (el) el.remove();
    if (!win) return;
    // Worked out from the squares' indices in percent of the board, never from
    // measured pixels: a line measured when the game ends stays that size when
    // the board is resized under it (a phone turned, a window narrowed past the
    // small-screen breakpoint). The board is square, so one unit serves both axes.
    const centre = (i) => [((i % 3) + 0.5) / 3 * 100, (Math.floor(i / 3) + 0.5) / 3 * 100];
    const [ax, ay] = centre(win.line[0]), [cx, cy] = centre(win.line[2]);
    const ang = Math.atan2(cy - ay, cx - ax), ext = 0.32 / 3 * 100;
    el = document.createElement("i");
    el.className = "strike";
    el.dataset.line = key;
    el.setAttribute("aria-hidden", "true");
    el.style.left = ax - Math.cos(ang) * ext + "%";
    el.style.top = ay - Math.sin(ang) * ext + "%";
    el.style.width = Math.hypot(cx - ax, cy - ay) + 2 * ext + "%";
    el.style.setProperty("--a", ang + "rad");
    boardEl.appendChild(el);
  }

  new MutationObserver(sync).observe(boardEl, { subtree: true, childList: true, characterData: true });
  restartBtn.addEventListener("click", sync);
  sync();
})();
