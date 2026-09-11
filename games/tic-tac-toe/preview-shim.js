// PREVIEW ONLY — mirrors game state into attributes preview.css reads, and on
// the pages that ask for drawn marks swaps the letter for an SVG. The build does
// this in script.js itself; this exists so the previews run the real game
// untouched. Deleted before handover.
(function () {
  const boardEl = document.getElementById("board");
  const drawn = document.body.dataset.marks === "drawn";
  const SVG = {
    X: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 13L35 35M35 13L13 35" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>',
    O: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="11.5" fill="none" stroke="currentColor" stroke-width="3.2"/></svg>',
  };

  function sync() {
    cells.forEach((cell, i) => {
      const mark = board[i] || "";
      if (cell.dataset.mark !== mark) cell.dataset.mark = mark;
      if (drawn && mark && !cell.querySelector("svg")) {
        cell.innerHTML = SVG[mark] + '<span class="sr">' + mark + "</span>";
      }
    });
    boardEl.dataset.turn = gameOver ? "" : currentPlayer;
    boardEl.dataset.over = gameOver ? (checkWinner() ? "win" : "draw") : "";
  }

  new MutationObserver(sync).observe(boardEl, { subtree: true, childList: true, characterData: true });
  restartBtn.addEventListener("click", sync);
  sync();
})();
