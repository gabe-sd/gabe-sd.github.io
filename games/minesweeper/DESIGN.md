# Minesweeper: what a reader must not break

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
