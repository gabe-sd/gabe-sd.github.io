// PREVIEW ONLY — the refinement panel on preview C: a colour for each mark, the
// win style, and buttons that set a board up so an end state can be looked at
// without playing one out. Choices ride in the URL hash, so a reload keeps them.
(function () {
  const HUES = ["pale", "amber", "hot", "cyan", "jade", "lime", "coral", "rose", "violet"];
  const SETUPS = [
    ["X · diagonal", [0, 1, 4, 2, 8]],
    ["O · row", [0, 3, 1, 4, 8, 5]],
    ["X · column", [0, 1, 3, 2, 6]],
    ["O · anti-diagonal", [0, 2, 1, 4, 5, 6]],
    ["Draw", [0, 1, 2, 4, 3, 5, 7, 6, 8]],
  ];
  const boardEl = document.getElementById("board");
  const lab = document.querySelector(".lab");
  const state = Object.assign(
    { x: "pale", o: "jade", win: "strike", dim: "1" },
    Object.fromEntries(new URLSearchParams(location.hash.slice(1)))
  );

  const swatches = (k) => HUES.map((n) =>
    `<button class="sw" data-k="${k}" data-v="${n}" title="${n}" style="background:var(--p-${n})"></button>`).join("");
  const opt = (k, v, label) => `<button class="lab-opt" data-k="${k}" data-v="${v}">${label}</button>`;
  const row = (label, html) => `<span class="lab-k">${label}</span><div class="lab-v">${html}</div>`;

  lab.innerHTML =
    row('X <b data-name="x"></b>', swatches("x")) +
    row('O <b data-name="o"></b>', swatches("o")) +
    row("WIN", opt("win", "glow", "Glow") + opt("win", "strike", "Strike") + opt("win", "behind", "Behind")) +
    row("OTHERS", opt("dim", "1", "Dim") + opt("dim", "0", "Keep lit")) +
    row("SET UP", SETUPS.map(([l], i) => `<button class="lab-opt" data-setup="${i}">${l}</button>`).join(""));

  function apply() {
    boardEl.style.setProperty("--x", `var(--p-${state.x})`);
    boardEl.style.setProperty("--o", `var(--p-${state.o})`);
    document.body.dataset.win = state.win;
    document.body.dataset.dim = state.dim;
    lab.querySelector('[data-name="x"]').textContent = state.x;
    lab.querySelector('[data-name="o"]').textContent = state.o;
    lab.querySelectorAll("[data-k]").forEach((b) =>
      b.setAttribute("aria-pressed", String(state[b.dataset.k] === b.dataset.v)));
    history.replaceState(null, "", "#" + new URLSearchParams(state));
  }

  lab.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.setup) {
      restart();
      SETUPS[b.dataset.setup][1].forEach((i) => cells[i].click());
      return;
    }
    state[b.dataset.k] = b.dataset.v;
    apply();
  });

  apply();
})();
