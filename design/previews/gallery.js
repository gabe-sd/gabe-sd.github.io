/* Preview gallery for the redesign's first phase.
 *
 * Throwaway. This is not the site and none of it is meant to be ported: it
 * exists so a whole visual direction can be looked at rather than described.
 * The real work goes into shared.css, hub.css and the hub's index.html once
 * one of these is chosen.
 *
 * Every variant gets identical content and identical structure. Only the
 * stylesheet in variants/<id>.css differs, which is the point: what you are
 * comparing is the design, not the copy.
 */

/* ---------------------------------------------------------------- content */

/* The six real games. Descriptions are copied verbatim from the hub —
 * visitor-facing prose is Gabriel's and is not the art director's to rewrite. */
const GAMES = [
  { id: 'tic-tac-toe', name: 'Tic Tac Toe', desc: 'Classic 3x3, two players', cat: 'strategy', players: '2 PLAYERS', icon: 'ttt' },
  { id: 'pong', name: 'Anime Pong', desc: 'You vs. the AI paddle', cat: 'arcade', players: '1 PLAYER', icon: 'pong' },
  { id: 'minesweeper', name: 'Minesweeper', desc: 'Clear the board, avoid the mines', cat: 'puzzle', players: '1 PLAYER', icon: 'mine' },
  { id: 'chess', name: 'Chess', desc: 'Full rules, two players, local pass-and-play', cat: 'strategy', players: '2 PLAYERS', icon: 'chess' },
  { id: 'flappy-bird', name: 'Flappy Bird', desc: 'Flap through the pipes, one tap at a time', cat: 'arcade', players: '1 PLAYER', icon: 'bird' },
  { id: 'sudoku', name: 'Sudoku', desc: 'Fill the grid, no repeats in any row, column, or box', cat: 'puzzle', players: '1 PLAYER', icon: 'sudoku' },
];

/* ------------------------------------------------------------------ icons */

/* Stroke icons, drawn on one 48x48 grid at a single weight so the set reads as
 * a set. They inherit colour through currentColor. */
const LINE_ICONS = {
  ttt: `<g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round">
      <line x1="19" y1="8" x2="19" y2="40"/><line x1="29" y1="8" x2="29" y2="40"/>
      <line x1="8" y1="19" x2="40" y2="19"/><line x1="8" y1="29" x2="40" y2="29"/>
      <line x1="11" y1="11" x2="16" y2="16"/><line x1="16" y1="11" x2="11" y2="16"/>
      <circle cx="34.5" cy="34.5" r="3.8"/></g>`,
  pong: `<line x1="24" y1="9" x2="24" y2="39" stroke="currentColor" stroke-width="2"
        stroke-dasharray="2 6" stroke-linecap="round" opacity="0.5"/>
      <rect x="7" y="13" width="5" height="20" rx="2" fill="currentColor"/>
      <rect x="36" y="18" width="5" height="20" rx="2" fill="currentColor"/>
      <circle cx="29" cy="21" r="4" fill="currentColor"/>`,
  mine: `<g stroke="currentColor" stroke-width="3.2" stroke-linecap="round">
      <line x1="24" y1="13" x2="24" y2="8"/><line x1="24" y1="37" x2="24" y2="42"/>
      <line x1="12" y1="25" x2="7" y2="25"/><line x1="36" y1="25" x2="41" y2="25"/>
      <line x1="15.5" y1="16.5" x2="12" y2="13"/><line x1="32.5" y1="33.5" x2="36" y2="37"/>
      <line x1="32.5" y1="16.5" x2="36" y2="13"/><line x1="15.5" y1="33.5" x2="12" y2="37"/></g>
      <circle cx="24" cy="25" r="12" fill="currentColor"/>
      <circle cx="19.5" cy="20.5" r="2.5" fill="var(--icon-hole, #040604)"/>`,
  chess: `<g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">
      <circle cx="24" cy="12.5" r="4.5"/>
      <path d="M19 19h10l-2 4h-6z"/>
      <path d="M21 23c0 6-2.5 9-4 12h14c-1.5-3-4-6-4-12"/>
      <path d="M13 35h22v5H13z"/></g>`,
  bird: `<ellipse cx="21" cy="23" rx="11.5" ry="9.5" fill="none" stroke="currentColor" stroke-width="2.5"/>
      <path d="M31.8 20.5l9 2.5-9 2.5z" fill="currentColor"/>
      <circle cx="26" cy="19.5" r="2" fill="currentColor"/>
      <path d="M14.5 20.5c6 0.5 9.5 3.5 11 8-6.5 0.5-10.5-2.5-11-8z" fill="currentColor"/>
      <path d="M10.5 20.5l-7-4 1.5 8z" fill="currentColor"/>
      <path d="M17 32.3l-1.6 6M23.5 32.3l-1 6" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round"/>`,
  sudoku: `<g fill="none" stroke="currentColor" stroke-width="2.4">
      <rect x="8" y="8" width="32" height="32"/>
      <line x1="18.6" y1="8" x2="18.6" y2="40" stroke-width="1.4"/>
      <line x1="29.3" y1="8" x2="29.3" y2="40" stroke-width="1.4"/>
      <line x1="8" y1="18.6" x2="40" y2="18.6" stroke-width="1.4"/>
      <line x1="8" y1="29.3" x2="40" y2="29.3" stroke-width="1.4"/></g>
      <g fill="currentColor"><rect x="11.5" y="12" width="4" height="3.2"/>
      <rect x="22.2" y="22.6" width="4" height="3.2"/>
      <rect x="32.9" y="33.3" width="4" height="3.2"/></g>`,
};

/* The same six as pixel art, for the variants where a drawn curve would be a
 * lie about the display they are imitating. '#' is a lit pixel. */
const PIXEL_ICONS = {
  ttt: ['..#..#..', '..#..#..', '########', '..#..#..', '..#..#..', '########', '..#..#..', '..#..#..'],
  pong: ['........', '#...#...', '#...#..#', '#...#..#', '#.#.#..#', '....#..#', '....#...', '........'],
  mine: ['......#.', '..###.#.', '.#####..', '#######.', '#######.', '#######.', '.#####..', '..###...'],
  chess: ['..###...', '..###...', '...#....', '..###...', '.#####..', '..###...', '.#####..', '#######.'],
  bird: ['........', '..####..', '.#.#.##.', '.######.', '########', '.#####..', '..###...', '........'],
  sudoku: ['########', '#.#..#.#', '#.#..#.#', '########', '#.#..#.#', '#.#..#.#', '########', '........'],
};

function lineIcon(name) {
  return `<svg class="ico" viewBox="0 0 48 48" aria-hidden="true">${LINE_ICONS[name]}</svg>`;
}

function pixelIcon(name) {
  const rows = PIXEL_ICONS[name];
  const w = rows[0].length;
  const h = rows.length;
  let r = '';
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rows[y][x] === '#') r += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    }
  }
  return `<svg class="ico" viewBox="0 0 ${w} ${h}" aria-hidden="true" shape-rendering="crispEdges"><g fill="currentColor">${r}</g></svg>`;
}

function iconFor(kind, game) {
  if (kind === 'pixel') return pixelIcon(game.icon);
  if (kind === 'none') return '';
  return lineIcon(game.icon);
}

/* ------------------------------------------------------------------ parts */

function tileHTML(v, g, i) {
  return `<a class="tile" href="#" data-i="${i}" data-cat="${g.cat}">
    <span class="tico">${iconFor(v.icons, g)}</span>
    <span class="tname">${g.name}</span>
    <span class="tdesc">${g.desc}</span>
    <span class="tcat">${g.cat.toUpperCase()}</span>
    <span class="tnum">${String(i + 1).padStart(2, '0')}</span>
  </a>`;
}

function infoHTML(v) {
  return `<div class="info" data-cat="strategy">
    <span class="ilabel">SELECTED</span>
    <span class="inm">Tic Tac Toe</span>
    <span class="imeta">STRATEGY · 2 PLAYERS</span>
    <span class="idesc">Classic 3x3, two players</span>
    <span class="icta">${v.cta || 'PRESS TO PLAY'}</span>
  </div>`;
}

/* The strip that answers the question the hub cannot: what this palette does to
 * a board you have to read. Minesweeper's eight numbers are the hard case. */
function sampleHTML() {
  const sudokuCells = [
    ['5', 'given'], ['3', 'given'], ['', ''],
    ['', 'sel'], ['7', 'entered'], ['', ''],
    ['9', 'given'], ['', ''], ['8', 'entered'],
  ].map(([d, c]) => `<span class="scell ${c}">${d}</span>`).join('');

  const mineCells = [1, 2, 3, 4, 5, 6, 7, 8]
    .map((n) => `<span class="mcell n${n}">${n}</span>`).join('')
    + `<span class="mcell flag">⚑</span><span class="mcell hidden-cell"></span>`;

  return `<section class="sample">
    <h3 class="sample-h">How it reads in a game</h3>
    <div class="sample-row">
      <div class="sbox">
        <span class="sbox-h">Sudoku</span>
        <div class="sgrid">${sudokuCells}</div>
      </div>
      <div class="sbox">
        <span class="sbox-h">Minesweeper 1&ndash;8</span>
        <div class="mgrid">${mineCells}</div>
      </div>
      <div class="sbox">
        <span class="sbox-h">Pong</span>
        <div class="pbar"><span class="pscore">03</span><span class="plabel">YOU</span>
          <span class="pdiv"></span>
          <span class="plabel">CPU</span><span class="pscore">05</span></div>
        <div class="pcourt"><span class="ppad l"></span><span class="pball"></span><span class="ppad r"></span></div>
      </div>
    </div>
  </section>`;
}

/* --------------------------------------------------------------- variants */

/* Structure and copy live here; the look lives in variants/<id>.css. */
const VARIANTS = [
  {
    id: 'cold', group: 'A', name: 'Cold Terminal', icons: 'line', crt: 'mock',
    brand: 'GAME ARCADE', nav: ['GAMES', 'ABOUT'],
    strap: 'ARCADE OS 1.0 — 6 CABINETS ONLINE — SELECT A CABINET',
    foot: 'NO ACCOUNTS · NO NETWORK · YOUR SCORES STAY ON THIS MACHINE',
    pitch: 'The mockup, tightened. Dense grid, hairline rules, one green, everything upper case.',
    cost: 'The scanlines sit over the game boards too. Look at the Sudoku sample before you fall for the header.',
  },
  {
    id: 'amber', group: 'A', name: 'Amber Monitor', icons: 'line', crt: 'soft',
    brand: 'GAME ARCADE', nav: ['GAMES', 'ABOUT'],
    strap: 'Six games. Pick one.',
    foot: 'No accounts. No network. Scores stay on this machine.',
    pitch: 'The same idea on P3 amber rather than P1 green: warmer, softer, no scanlines, and it breathes.',
    cost: 'Amber is a single-hue world — there is no second accent left for a warning or an error state.',
  },
  {
    id: 'vector', group: 'A', name: 'Vector Neon', icons: 'line', crt: 'off',
    brand: 'GAME ARCADE', nav: ['GAMES', 'ABOUT'],
    strap: 'SELECT GAME',
    foot: 'INSERT NOTHING · PLAY FREE',
    pitch: 'Not a raster screen at all. Pure black, hairline strokes, hard glow — Asteroids and Tempest drew light, not pixels.',
    cost: 'Nothing is filled, so hit targets read as outlines. Small text needs the glow turned down to stay sharp.',
  },
  {
    id: 'quiet', group: 'A', name: 'Quiet Phosphor', icons: 'line', crt: 'off',
    brand: 'Game Arcade', nav: ['Games', 'About'],
    strap: 'Six small games, playable in a browser tab.',
    foot: 'No accounts, no network. Everything is stored on this machine.',
    pitch: 'The palette without the costume. Same phosphor green, but no glow, no scanlines, generous space, and the type set for reading.',
    cost: 'It stops being an arcade. This is the variant that will still look right in three years, and the least fun tonight.',
  },
  {
    id: 'cabinet', group: 'A', name: 'Full Cabinet', icons: 'pixel', crt: 'heavy',
    brand: 'GABE·SD ARCADE', nav: ['GAMES', 'ABOUT'],
    strap: '★ SIX CABINETS ★ ALWAYS ON ★ NO COINS ★',
    foot: 'PUSH START',
    pitch: 'Everything at once: bezel, curved glass, marquee, colour per category, a glare band that drifts across the screen.',
    cost: 'The most fun and the least readable. Every effect here is a tax on the six games behind it.',
  },
  {
    id: 'dmg', group: 'B', name: 'Handheld', icons: 'pixel', crt: 'off',
    brand: 'GAME ARCADE', nav: ['GAMES', 'ABOUT'],
    strap: 'SELECT ▶',
    foot: 'BATT ▮▮▮▯',
    pitch: 'A 1989 handheld: four shades of olive LCD, a plastic shell around the screen, and type that never pretends to be smooth.',
    cost: 'Four tones is the whole palette. Low contrast by design, which is charming and is also genuinely harder to read.',
  },
  {
    id: 'riso', group: 'B', name: 'Arcade Flyer', icons: 'line', crt: 'off',
    brand: 'GAME ARCADE', nav: ['GAMES', 'ABOUT'],
    strap: 'SIX GAMES / FREE PLAY / NO QUARTERS REQUIRED',
    foot: 'PRINTED IN TWO COLOURS · NO ACCOUNTS · NO NETWORK',
    pitch: 'Paper, not a screen. Off-white stock, two spot inks slightly out of register, halftone dots, display type that shouts.',
    cost: 'Light, not dark — this walks away from the settled decision entirely. Every game would need a light board to match.',
  },
  {
    id: 'blueprint', group: 'B', name: 'Schematic', icons: 'line', crt: 'off',
    brand: 'GAME ARCADE', nav: ['GAMES', 'ABOUT'],
    strap: 'SHEET 1 OF 1 — CABINET INDEX — SCALE 1:1',
    foot: 'DRAWN BY HAND · REV. 2026.09 · NO ACCOUNTS · NO NETWORK',
    pitch: 'Drafting paper. Cyan on navy, a hairline grid under everything, dimension lines, and each game annotated like a part.',
    cost: 'The annotations are decoration pretending to be information. Charming once; possibly irritating on the fiftieth visit.',
  },
  {
    id: 'teletext', group: 'B', name: 'Teletext', icons: 'pixel', crt: 'soft',
    brand: 'ARCADE', nav: ['GAMES', 'ABOUT'],
    strap: 'P100 GABE-SD ARCADE      SIX GAMES',
    foot: 'HOLD ▪ REVEAL ▪ INDEX 100',
    pitch: 'Ceefax. Saturated primaries straight out of the 1974 spec, block mosaics, double-height headings, a coloured page header.',
    cost: 'Seven colours, all at full saturation, none of them subtle. It is loud in a way that cannot be dialled down.',
  },
  {
    id: 'neon', group: 'B', name: 'Neon Cabinet', icons: 'line', crt: 'soft',
    brand: 'GAME ARCADE', nav: ['GAMES', 'ABOUT'],
    strap: 'SIX GAMES · FREE PLAY · OPEN ALL NIGHT',
    foot: 'NO ACCOUNTS · NO NETWORK · SCORES STAY HERE',
    pitch: 'The arcade rather than the terminal: deep violet-black, magenta and cyan tube signage, a horizon grid, chrome on the wordmark.',
    cost: 'Two strong accents fight for attention, and the glow is doing the work the layout should be doing.',
  },
  {
    id: 'brutal', group: 'B', name: 'Signal', icons: 'none', crt: 'off',
    brand: 'GAME ARCADE', nav: ['GAMES', 'ABOUT'],
    strap: 'SIX GAMES. NO DECORATION.',
    foot: 'NO ACCOUNTS. NO NETWORK. SCORES STAY ON THIS MACHINE.',
    pitch: 'No icons, no colour but one. Huge type, thick rules, hard left edge, numbers doing the work pictures usually do.',
    cost: 'Nothing here says arcade. It is a strong site and a quiet one, and it throws away the whole phosphor idea.',
  },
];

/* ------------------------------------------------------------------ build */

const stage = document.getElementById('stage');
const tabs = document.getElementById('tabs');
const caption = document.getElementById('caption');

VARIANTS.forEach((v) => {
  const sec = document.createElement('section');
  sec.className = 'variant';
  sec.id = 'v-' + v.id;
  sec.dataset.crt = v.crt;
  sec.hidden = true;
  sec.innerHTML = `
    <div class="deco" aria-hidden="true"></div>
    <div class="screen">
      <header class="top">
        <span class="brand">${v.brand}</span>
        <nav class="nav">${v.nav.map((n, i) => `<a href="#" class="${i === 0 ? 'active' : ''}">${n}</a>`).join('')}</nav>
      </header>
      <p class="strap">${v.strap}</p>
      <div class="grid">${GAMES.map((g, i) => tileHTML(v, g, i)).join('')}</div>
      ${infoHTML(v)}
      ${sampleHTML()}
      <footer class="foot">${v.foot}</footer>
    </div>
    <div class="crt" aria-hidden="true"></div>`;
  stage.appendChild(sec);

  const tab = document.createElement('button');
  tab.className = 'chrome-tab';
  tab.dataset.id = v.id;
  tab.innerHTML = `<span class="tab-group">${v.group}</span>${v.name}`;
  tab.addEventListener('click', () => show(v.id));
  tabs.appendChild(tab);

  wireSelection(sec);
});

/* Hover and focus fill the info panel; on a touch screen the first tap selects
 * and the second would launch. That two-tap behaviour is the thing Gabriel
 * wanted to try against a real page rather than decide from a description. */
function wireSelection(sec) {
  const info = sec.querySelector('.info');
  const tiles = [...sec.querySelectorAll('.tile')];
  let selected = -1;

  const select = (i) => {
    const g = GAMES[i];
    selected = i;
    tiles.forEach((t, j) => t.classList.toggle('is-selected', j === i));
    info.dataset.cat = g.cat;
    info.querySelector('.inm').textContent = g.name;
    info.querySelector('.imeta').textContent = `${g.cat.toUpperCase()} · ${g.players}`;
    info.querySelector('.idesc').textContent = g.desc;
  };

  tiles.forEach((t, i) => {
    t.addEventListener('mouseenter', () => select(i));
    t.addEventListener('focus', () => select(i));
    t.addEventListener('click', (e) => {
      e.preventDefault();
      if (selected === i) {
        info.classList.add('is-launching');
        setTimeout(() => info.classList.remove('is-launching'), 700);
      } else {
        select(i);
      }
    });
  });

  select(0);
}

/* ----------------------------------------------------------------- chrome */

let current = null;

function show(id) {
  const v = VARIANTS.find((x) => x.id === id) || VARIANTS[0];
  current = v;
  VARIANTS.forEach((x) => { document.getElementById('v-' + x.id).hidden = x.id !== v.id; });
  [...tabs.children].forEach((t) => t.classList.toggle('is-on', t.dataset.id === v.id));
  document.body.dataset.variant = v.id;
  if (location.hash.slice(1) !== v.id) history.replaceState(null, '', '#' + v.id);
  renderCaption(v);
  window.scrollTo(0, 0);
}

function renderCaption(v) {
  const n = VARIANTS.indexOf(v) + 1;
  caption.innerHTML = `
    <div class="cap-main">
      <span class="cap-n">${String(n).padStart(2, '0')}/${VARIANTS.length}</span>
      <span class="cap-name">${v.name}</span>
      <span class="cap-pitch">${v.pitch}</span>
    </div>
    <div class="cap-side">
      <span class="cap-cost"><b>What it costs:</b> ${v.cost}</span>
      ${v.crt !== 'off' ? crtControlHTML(v) : ''}
    </div>`;
  const ctl = caption.querySelector('.crt-ctl');
  if (ctl) {
    ctl.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      document.getElementById('v-' + v.id).dataset.crt = b.dataset.level;
      v.crt = b.dataset.level;
      renderCaption(v);
    });
  }
}

function crtControlHTML(v) {
  const levels = [['off', 'none'], ['soft', 'subtle'], ['mock', 'as mocked'], ['heavy', 'heavy']];
  return `<span class="crt-ctl">CRT texture:
    ${levels.map(([lv, label]) => `<button data-level="${lv}" class="${v.crt === lv ? 'on' : ''}">${label}</button>`).join('')}
  </span>`;
}

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'BUTTON' && e.key === ' ') return;
  const i = VARIANTS.indexOf(current);
  if (e.key === 'ArrowRight') show(VARIANTS[(i + 1) % VARIANTS.length].id);
  if (e.key === 'ArrowLeft') show(VARIANTS[(i - 1 + VARIANTS.length) % VARIANTS.length].id);
});

show(location.hash.slice(1) || VARIANTS[0].id);
