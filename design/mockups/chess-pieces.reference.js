/* Chess, direction C — the six pieces, and the capture trays that reuse them.
 *
 * Reference, not a patch. Classic script style to match the repo: no module, no
 * export, top-level bindings reachable from devtools and from a test harness.
 *
 * These paths are the deliverable of the design session. They were drawn and
 * revised against a served page at 54px, which is the size that decides them;
 * the knight went through four candidates and the king through three whole sets.
 * Retyping them from a screenshot is not possible, so they are given verbatim.
 */

/* One weight, one grid, no fills. Every piece stands on the same base bar, which
   is what makes eight different silhouettes read as one set. */
var PIECE_PATHS = {
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

  // Straight lines only — chosen over three rounder alternatives. The parts that
  // identify it are the wedge muzzle with the jaw cut back under it, the straight
  // forehead, and the single pointed ear; lose any of those and it stops being a
  // horse. It is the only piece in the set with no curve in it.
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

  // "Broad": a wide dome, a collar band, and the standard base. Chosen after two
  // entire sets were rejected — see design/DESIGN.md, and do not redraw it as a
  // taller, narrower figure, which is the shape both rejected sets shared.
  K:
    '<path d="M24 4V13"/><path d="M20.5 8.5H27.5"/>' +
    '<path d="M24 14.5c-4.5-1.8-10 1-11 6.8-.8 4.8 1.2 9.8 1.8 12.7h18.4' +
      'c.6-2.9 2.6-7.9 1.8-12.7-1-5.8-6.5-8.6-11-6.8z"/>' +
    '<path d="M15 28h18" stroke-width="1.5"/>' +
    '<path d="M13 35h22v5H13z"/>'
};

/* The wrapper every piece shares. Colour arrives through currentColor from
   .piece-w / .piece-b, so a piece never carries a colour of its own — which is
   what lets the same markup serve the board and the dimmed capture trays. */
function pieceSVG(piece, extraClass) {
  var white = piece === piece.toUpperCase();
  var cls = (white ? "piece-w" : "piece-b") + (extraClass ? " " + extraClass : "");
  return '<svg class="' + cls + '" viewBox="0 0 48 48" fill="none" ' +
    'stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" ' +
    'stroke-linecap="round" aria-hidden="true">' +
    PIECE_PATHS[piece.toUpperCase()] + '</svg>';
}

/* ---------- the capture trays ---------- */

var PIECE_VALUE = { Q: 9, R: 5, B: 3, N: 3, P: 1 };

/* Q R B N P, the way every chess interface orders a tray. */
var TRAY_ORDER = "QRBNP";

function trayOrder(a, b) {
  return TRAY_ORDER.indexOf(a.toUpperCase()) - TRAY_ORDER.indexOf(b.toUpperCase());
}

function materialOf(taken) {
  var total = 0;
  for (var i = 0; i < taken.length; i++) total += PIECE_VALUE[taken[i].toUpperCase()];
  return total;
}

/* One number on the whole board: the difference, on the side that is ahead.
   Two running totals is two numbers to subtract before learning the only thing a
   player reads for, and the losing side showing nothing is itself the fastest
   way to say who is losing. */
function renderTrays(takenByWhite, takenByBlack) {
  var diff = materialOf(takenByWhite) - materialOf(takenByBlack);
  paintTray(document.getElementById("taken-by-white"), takenByWhite, diff > 0 ? diff : 0);
  paintTray(document.getElementById("taken-by-black"), takenByBlack, diff < 0 ? -diff : 0);
}

function paintTray(el, taken, advantage) {
  var sorted = taken.slice().sort(trayOrder);
  var html = '<span class="pcs">';
  for (var i = 0; i < sorted.length; i++) html += pieceSVG(sorted[i]);
  html += "</span>";
  if (advantage > 0) html += '<span class="adv">+' + advantage + "</span>";
  el.innerHTML = html;
}

/* ---------- what this replaces ---------- */

/* games/chess/script.js currently holds PIECE_GLYPHS, a map of Unicode chess
   characters, and writes one into each square's textContent. That map goes: VT323
   has no glyphs in U+2654–265F, so every one of them was being served by whatever
   face the reader's OS happened to fall back to. Swapping textContent for
   pieceSVG() is the whole of the change on the board itself.
   
   The trays are new: two elements, two ids, and a call to renderTrays() wherever
   a capture is applied. Both ids go into games/chess/DESIGN.md in the same commit,
   or tests/docs-check.js fails on them. */
