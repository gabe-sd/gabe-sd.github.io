# Minesweeper: what a reader must not break

The invariants for Minesweeper, kept in its own folder so that changing this game
touches no file another game's agent is editing. `CLAUDE.md` holds only what
every game shares — the page contract, the theme, the testing rules.

A design doc is only worth having if it is true, so **changing how a game plays
means updating this file in the same commit**, including whatever was tried and
rejected along the way. Rejected alternatives are the most valuable thing here and
the easiest to lose. Keep values out of it; those live in the code as named
constants, and a doc that repeats them is wrong the first time one is tuned.

**Minesweeper** (`games/minesweeper/script.js`) places mines lazily on the first
reveal, excluding the 3x3 around that cell, so the first click is always safe —
`grid` is empty until then. `floodReveal` recurses through zero-adjacency cells.
Chording fires on middle **mousedown** (see below). The HUD counter shows flags
left to place (`MINE_COUNT - flagCount`), which is why it carries a flag icon;
the bomb icon means an actual revealed mine.

## Page ids

On top of the shared `#board`, `#status` and `#restart` from `CLAUDE.md`'s page
contract: `#flag-count`, `#timer`, `#best-time`, `#help-toggle`, `#instructions`,
and a gear button `#settings-toggle` opening `#settings`, which holds
`#reset-best`.

## Stored data

`minesweeper.bestTime.9x9-10` — the best time, keyed by board configuration, so
adding a difficulty later cannot compare records across board sizes. Read and
written through `loadBestTime`/`saveBestTime`/`clearBestTime`, each wrapped
because `localStorage` throws rather than returning `null` when it is
unavailable. `tests/best-time.test.js` covers that path by making storage throw.

The gear panel's Reset best time button clears the key. It is disabled whenever
`loadBestTime()` returns `null`, which covers both "no record yet" and "storage
unavailable" — there is nothing to clear either way, and the greyed-out button is
the whole explanation, so it carries no note. Clearing cannot be undone, so the
button is two-step: the first click arms it, the second clears. Anything else
destructive added to that panel should follow the same pattern.
