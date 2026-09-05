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

/* ------------------------------------------------------------------ intro */

const INTRO = `
<div class="intro">
  <h1>Eleven directions for the site's look</h1>
  <p class="intro-lede">Nothing here is built. These are complete hub compositions, one per
  direction, so a whole visual world can be judged by looking at it rather than
  described. Pick one — or two to cross — and the real <code>shared.css</code>,
  <code>hub.css</code> and hub markup get built on it properly. Everything in this
  gallery is thrown away.</p>

  <div class="intro-cols">
    <section>
      <h2>How to look at it</h2>
      <ul>
        <li>The tabs across the top switch direction. <b>Left and right arrow keys</b> also work.</li>
        <li><b>Hover a game tile</b> — the panel below the grid fills in. On a phone, <b>tap once
        to select and again to play</b>. That two-tap behaviour is the thing you said you wanted
        to try against a real page rather than decide from a description, so try it on your phone
        and tell me whether it feels right.</li>
        <li>On the CRT directions the caption bar has a <b>CRT texture</b> control: none / subtle /
        as mocked / heavy. Switch it while looking at the boards at the bottom.</li>
        <li>The tiles don't actually launch anything — this is a picture of the hub, not the hub.</li>
      </ul>
    </section>

    <section>
      <h2>Look at the bottom of every page</h2>
      <p>Each direction carries a strip called <b>“How it reads in a game”</b>: a Sudoku fragment,
      Minesweeper's eight numbers, and a Pong scorebar. That strip is the honest half of this
      review. The hub flatters every palette — a board you have to read does not, and the site is
      six boards behind one hub. If a direction looks glorious up top and falls apart down there,
      that is the direction telling you something.</p>
    </section>
  </div>

  <h2>What I need you to decide</h2>
  <ol class="intro-q">
    <li><b>Which direction</b> — or which two, if you want one crossed with another.</li>
    <li><b>How much CRT texture</b>, if any. This is a real question with a measured answer below.</li>
    <li><b>Does the two-tap info panel feel right on a phone?</b></li>
    <li><b>Does colour-by-category survive?</b> Some directions use a different hue per category,
    some deliberately don't. You can see both.</li>
  </ol>

  <h2>What's already settled, and what a pick would reopen</h2>
  <p>Dark only, one palette, self-hosted VT323. Two directions here break that on purpose so you
  can see the trade rather than take my word for it: <b>Arcade Flyer</b> is printed on light paper,
  and <b>Handheld</b> is a pale olive LCD. Choosing either reopens dark-only, which means all six
  game boards need a light treatment too. That is a big bill and you should know it is attached.</p>

  <h2>What the previews measured</h2>
  <ul class="intro-find">
    <li><b>Heavy CRT texture is not viable behind a real board.</b> At the heavy setting the dark
    line every 3.5px cuts two bands through every Minesweeper digit and the saturated ones break
    into fragments. The only fix found was cells about 35% larger — which a 16×30 board cannot
    afford. At <i>as mocked</i> and below the same digits are fine. So the texture is a question of
    degree, and its ceiling is set by Minesweeper rather than by taste.</li>
    <li><b>Eight distinguishable numbers do not exist inside one hue.</b> Five directions arrived at
    this independently: a single-hue palette gets five or six steps and the rest need a second
    <i>device</i> — an underline, an inverted cell, a dithered field, a border, a weight change —
    rather than another colour.</li>
    <li><b>VT323 carries less colour than the contrast maths predicts</b>, because its strokes are
    one pixel wide. Colours that pass a numeric check still vanish when set in it.</li>
    <li><b>The mockup's scanline was modelled backwards.</b> A scanline is the dark gap between
    lines, not the line; a white stripe on a near-black page has nothing to lighten and is
    invisible. The version here draws the gap.</li>
  </ul>

  <h2>What I'd pick, since you asked me to be the artist</h2>
  <p class="intro-rec">The best-looking single page is <b>Amber Monitor</b>, and the best
  <i>system</i> is <b>Cold Terminal</b>. They are not the same thing and the difference is worth a
  minute of your time.</p>
  <p>Amber is a single-hue world. That is exactly why it is calm, and it means the site has no
  second colour left for an error, a warning, or "them versus you" — Pong's opponent can only be
  the dimmer paddle. The redesign's own plan for Pong is a magenta player against a red opponent,
  and amber cannot do that. Green keeps that budget intact.</p>
  <p><b>So my recommendation is Cold Terminal as the base, with three things taken from the
  others:</b> Amber's roominess and larger type — the reference grid is tighter than it needs to
  be; Vector Neon's discipline of tuning the glow per element instead of setting one everywhere;
  and the CRT texture kept at <i>as mocked</i>, never heavy, and dropped entirely behind the puzzle
  boards. If you would rather have the warm one, Amber is buildable as it stands and the cost is
  the paragraph above.</p>
  <p class="intro-rec-alt">Two others deserve a mention rather than a vote. <b>Schematic</b> is the
  most surprising thing here and has the most natural answer to the eight numbers. <b>Signal</b> is
  the most confident page in the set and would make a good voice for the parts of the site that are
  not games — an about page, a rules panel — even if it is too austere to be the arcade itself.</p>

  <p class="intro-foot">Use the tabs, or press → to start.</p>
</div>`;

/* -------------------------------------------------------- reference sheet */

/* The values behind each direction, so a later project can take a palette or a
 * pairing without reading eleven stylesheets. Every hex here is one a variant
 * actually uses; the contrast figures are against that variant's own ground. */
const REFERENCE = [
  {
    id: 'cold', name: 'Cold Terminal',
    ground: '#040604',
    swatches: [['#040604', 'ground'], ['#070c07', 'panel'], ['#143a20', 'hairline'],
      ['#14612d', 'dimmest'], ['#1f9e46', 'dim'], ['#33ff66', 'phosphor'],
      ['#ffb000', 'amber'], ['#3fd4ff', 'cyan'], ['#ff4dd8', 'magenta']],
    type: 'VT323 at 19px, upper case throughout, 0.05–0.18em tracking on labels.',
    numbers: ['#3fd4ff', '#33ff66', '#ffb000', '#ff4dd8', '#ff5a4d', '#24d9a8', '#ffffff', '#9db3a4'],
    note: 'One green plus the other real monitor phosphors, borrowed rather than invented. Keeps a full hue budget for a second accent, which the single-hue directions do not.',
  },
  {
    id: 'amber', name: 'Amber Monitor',
    ground: '#0a0704',
    swatches: [['#0a0704', 'ground (brown-black)'], ['#150f07', 'panel'], ['#221709', 'lit panel'],
      ['#3d2807', 'hairline'], ['#7a5008', 'rule'], ['#b8790a', 'dim — text floor'],
      ['#f2bc62', 'secondary'], ['#ffb000', 'amber'], ['#ffd694', 'pale'], ['#fff2da', 'white-hot']],
    type: 'VT323 at 22px, sentence case (lowercase + ::first-letter, since text-transform: capitalize cannot do it). Wordmark 3.1rem.',
    numbers: ['#ffb000', '#fff2da', '#ffd24d', '#d3c0a2', '#c98511', '#a89a8a'],
    note: 'Six colours plus an underline mark for 7 and 8 — three luminance bands crossed with saturated amber against near-neutral bone. Eight distinguishable ambers do not exist at board size. Bloom is stacked 6/22/46/96px shadows, none of them tight.',
  },
  {
    id: 'vector', name: 'Vector Neon',
    ground: '#000000',
    swatches: [['#000000', 'ground (true black)'], ['#14556b', 'rest hairline'], ['#2a9dc4', 'working rule'],
      ['#79b6cd', 'dim read'], ['#bfeaff', 'body read'], ['#3fd4ff', 'beam'],
      ['#ff4dd8', 'second beam'], ['#ffffff', 'core']],
    type: 'VT323 at 20px, 0.3–0.42em tracking. Orbitron 700 for the wordmark only — at 900 it stops reading as a beam.',
    numbers: ['#3fd4ff', '#3fff9f', '#ff4dd8', '#ffb43f', '#ff5147', '#c79dff', '#ffffff', '#c8ff3f'],
    note: 'The strongest eight in the set, structurally: a vector gun draws any colour, so hue never has to be rationed. Body copy takes no glow at all — glow is tuned per element or small text turns to mush.',
  },
  {
    id: 'quiet', name: 'Quiet Phosphor',
    ground: '#0b0d0b',
    swatches: [['#0b0d0b', 'ground'], ['#10140f', 'raised'], ['#1e2620', 'hairline'],
      ['#2e3a32', 'board divider'], ['#74877b', 'dimmest (4.7:1)'], ['#8fa697', 'secondary (6.8:1)'],
      ['#cfe3d5', 'body (13.9:1)'], ['#eaf3ec', 'headings (16.9:1)'], ['#33ff66', 'accent — twice only']],
    type: 'IBM Plex Mono for everything read; VT323 for the wordmark (54px) and numerals only. Scale 11/12/13/15/17/30/54 on a 4px grid, 24px text line.',
    numbers: ['#9ecbdb', '#89d1a1', '#d9e9b9', '#4f89b0', '#e4ece9', '#2cbaba', '#869d80', '#aca75d'],
    note: 'All inside a 56–204° hue band, separated on lightness and saturation, every pair ≥ ΔE 20 in CIE L*a*b*. The most restrained set here, and three of them still read alike at small size — that is the honest cost of one hue band.',
  },
  {
    id: 'cabinet', name: 'Full Cabinet',
    ground: '#050806',
    swatches: [['#0b0a09', 'cabinet edge'], ['#241f1b', 'plastic, shadow'], ['#4a423a', 'plastic'],
      ['#6a5e51', 'plastic, lit'], ['#050806', 'glass'], ['#0c130e', 'tile'],
      ['#46ff7d', 'strategy'], ['#ffb52e', 'puzzle'], ['#6fdcff', 'arcade'], ['#fff6e2', 'marquee']],
    type: 'VT323 at 20px for everything readable; Press Start 2P only where short and chunky — 23px wordmark, 11px chips, at line-height 1.75–2.',
    numbers: ['#8ecdff', '#5cff94', '#ff6f62', '#cfa6ff', '#ffc850', '#4df0d8', '#ffffff', '#ff92e0'],
    note: 'The marquee panel is the light and the letters are opaque ink — a dark panel with glowing letters just reads as another panel. Under heavy scanlines these digits needed cells 35% larger to survive, which is why heavy texture cannot go behind a real board.',
  },
  {
    id: 'dmg', name: 'Handheld',
    ground: '#9bbc0f',
    swatches: [['#0f380f', 'ink'], ['#306230', 'mid'], ['#8bac0f', 'light'], ['#9bbc0f', 'LCD ground'],
      ['#403d36', 'desk'], ['#6f6c63', 'recess'], ['#9f9c92', 'bevel'], ['#c8c4b8', 'shell'],
      ['#dcd8cd', 'shell, lit'], ['#a8342c', 'power LED']],
    type: 'Press Start 2P throughout on an 8 / 12 / 16 / 24px scale and nothing between, line-height 1.9.',
    numbers: null,
    note: 'Four tones, eight numbers, three axes: field (pale / dithered / dark), glyph, and a 4px inset ring. They split 4–4 into dark-on-light and light-on-dark, which is worth more when reading a board than any pair being maximally distinct. The dither is a 4px checker of two palette tones — literally how the hardware faked shades it did not have. Note that #8bac0f and #9bbc0f are a 6% luminance step: this is a three-tone palette pretending to be four.',
  },
  {
    id: 'riso', name: 'Arcade Flyer',
    ground: '#f6f1e6',
    swatches: [['#f6f1e6', 'paper'], ['#ff4d6d', 'ink 1 — fluoro pink'], ['#2b41ff', 'ink 2 — blue'],
      ['#2b146d', 'overprint (generated)']],
    type: 'Archivo Black for display, clamp(2.6rem, 8.2vw, 5.4rem) at the top; Space Grotesk for anything read as a sentence.',
    numbers: null,
    note: 'The third colour is not chosen — mix-blend-mode: multiply on an offset second plate produces it, which is what a second ink plate physically does. The eight numbers are ink/ground pairs, four of them reversed out of a solid. Pink measures 2.6:1 against the paper, so it can never carry text: the workable palette is really blue plus overprint.',
  },
  {
    id: 'blueprint', name: 'Schematic',
    ground: '#0b1a2b',
    swatches: [['#091622', 'recess'], ['#0b1a2b', 'paper'], ['#0e2133', 'part fill'],
      ['#22506e', 'faintest'], ['#3d7fa6', 'construction'], ['#9dc4dd', 'annotation (9.4:1)'],
      ['#7fd4ff', 'line work'], ['#dff0fb', 'chalk'], ['#ffc46b', 'selection only']],
    type: 'IBM Plex Mono throughout, 15px base; annotations 8.5–10.5px at 0.18–0.24em. The monospacing is load-bearing — the title block aligns on literal spaces inside content strings.',
    numbers: ['#7fd4ff', '#6ee7a8', '#ffc46b', '#b39bff', '#ff8a76', '#45d6cd', '#dff0fb', '#a3b8c8'],
    note: 'Five hues well apart, then two neutrals split by lightness — a legend rather than a ramp, which is a schematic’s native idiom. Category chips reuse three of the same eight instead of starting a second coding system, and exclude amber so selection stays unambiguous.',
  },
  {
    id: 'teletext', name: 'Teletext',
    ground: '#000000',
    swatches: [['#000000', 'ground'], ['#0000ff', 'blue — structure only'], ['#ff0000', 'red — alarm only'],
      ['#ff00ff', 'magenta'], ['#00ff00', 'green — "go" only'], ['#00ffff', 'cyan'],
      ['#ffff00', 'yellow'], ['#ffffff', 'white']],
    type: 'Silkscreen. It is not monospaced (i is 0.375em, m is 0.875em) but its digits are exactly 0.75em, so the character cell is derived from the digit: 18px = 0.75 × the 24px base, and every structural box is a whole multiple of it.',
    numbers: null,
    note: 'Six usable colours, eight values, and no brightness ramp at all. 1–5 are coloured glyphs on black; 6–8 invert to black glyphs on solid blocks, separating the set on two axes so 1 and 6 can share a hue. Blue is 2.4:1 on black and never carries text — giving the unusable colour every structural job is what let every hairline be deleted.',
  },
  {
    id: 'neon', name: 'Neon Cabinet',
    ground: '#0d0618',
    swatches: [['#0a0518', 'well'], ['#0d0618', 'ground'], ['#170e2b', 'glass'], ['#241541', 'lit glass'],
      ['#b0a4cc', 'labels — floor'], ['#ece7f8', 'copy'], ['#00e5ff', 'cyan — leads'],
      ['#ff2d95', 'magenta — the singled-out thing']],
    type: 'Space Grotesk for words; Orbitron in four places only — wordmark, selected name, score, board cells. Never body copy.',
    numbers: ['#00e5ff', '#4dff9e', '#ffd23f', '#8fb0e8', '#ff7a3d', '#ffffff', '#c9a0ff', '#ff3b5c'],
    note: 'Two accents are resolved by rule rather than balance: at most one magenta object is on screen at a time, so magenta is always the answer to "which one?". Only 5–8 glow — with every shadow forced off all eight stayed distinguishable, proving hue carries the separation. Chrome text needs filter: drop-shadow; a text-shadow shows through a transparent fill and turns it to mud.',
  },
  {
    id: 'brutal', name: 'Signal',
    ground: '#0b0b0b',
    swatches: [['#0b0b0b', 'ground'], ['#2a2a26', 'hairline'], ['#2e2e2a', 'inert solid'],
      ['#45453f', 'box edge'], ['#8b8b85', 'dimmest (5.8:1)'], ['#b9b9b2', 'secondary (9.9:1)'],
      ['#f5f5f0', 'text'], ['#ff3b00', 'accent — five uses']],
    type: 'Space Mono 400/700, Archivo Black for the wordmark and the index numbers. Scale 99 / 67 / 48 / 24 / 18 / 16 / 13 / 11 — a 9:1 span, and the jumps are the composition.',
    numbers: null,
    note: 'One accent, so the eight numbers escalate by device instead: three greys, then weight, then a rule under the glyph, then a box, then inversion to a solid white block, then the accent spent on 8 — the only number that is genuinely dangerous.',
  },
];

function referenceHTML() {
  const block = (r) => `
    <section class="ref-item">
      <h3><a href="#${r.id}" class="ref-jump">${r.name}</a></h3>
      <div class="ref-sw">${r.swatches.map(([hex, role]) => `
        <span class="ref-chip">
          <b style="background:${hex}"></b>
          <code>${hex}</code>
          <i>${role}</i>
        </span>`).join('')}</div>
      <p class="ref-type"><b>Type.</b> ${r.type}</p>
      ${r.numbers ? `<p class="ref-nums"><b>Minesweeper 1–8.</b>
        ${r.numbers.map((h, i) => `<span class="ref-num" style="color:${h}">${i + 1}</span>`).join('')}
        <span class="ref-hexes">${r.numbers.join(' · ')}</span></p>` : ''}
      <p class="ref-note">${r.note}</p>
    </section>`;

  return `
  <div class="intro ref">
    <h1>Retro interface reference</h1>
    <p class="intro-lede">Eleven complete interface directions, with the values behind each one:
    the palette as copyable hexes, the typefaces and the scale, and how each solved the hardest
    problem in the set — eight Minesweeper numbers that have to stay apart from each other and
    legible on the ground. Every hex here is one the direction actually uses. Click a name to see
    it built.</p>

    <h2>What generalises, whatever you are building</h2>
    <ul class="intro-find">
      <li><b>A pixel typeface carries less colour than the contrast maths predicts.</b> VT323's
      strokes are one pixel wide, so a colour that clears 4.5:1 as a solid glyph can still vanish.
      The usable bottom of a ramp sits about two steps above where the numbers say it does.</li>
      <li><b>Eight distinguishable values do not exist inside one hue.</b> Five of these arrived at
      that independently: you get five or six steps, and the rest need a second <i>device</i> — an
      underline, an inverted cell, a dithered field, a border, a weight change.</li>
      <li><b>A scanline is the dark gap between lines, not the line.</b> A white stripe over a
      near-black page has nothing to lighten and is invisible. Draw the gap.</li>
      <li><b>Scanline texture has a density ceiling.</b> A 1.5px dark line every 3.5px cuts two
      bands through a glyph at normal board sizes and saturated mid-tones fragment. Light texture
      is free; heavy texture costs about 35% more glyph size to stay readable.</li>
      <li><b>Chrome and other gradient-filled text takes <code>filter: drop-shadow</code></b>, never
      <code>text-shadow</code> — with a transparent fill the shadow draws through the glyph.</li>
    </ul>

    <h2>The eleven</h2>
    ${REFERENCE.map(block).join('')}

    <p class="intro-foot">Built as a design review for the arcade's redesign, September 2026.</p>
  </div>`;
}

/* --------------------------------------------------------------- variants */

/* Structure and copy live here; the look lives in variants/<id>.css. */
const VARIANTS = [
  { id: 'intro', group: '·', name: 'Start here', intro: true },
  { id: 'reference', group: '·', name: 'Reference', intro: true, reference: true },
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
    /* The title block this variant draws already carries "drawn by", the scale,
     * the sheet and the revision, so the footer must not say them a second
     * time - on a real drawing sheet nothing is lettered twice. */
    foot: 'NO ACCOUNTS · NO NETWORK · SCORES STAY ON THIS MACHINE',
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
  sec.hidden = true;

  if (v.intro) {
    sec.classList.add('is-intro');
    sec.innerHTML = v.reference ? referenceHTML() : INTRO;
    stage.appendChild(sec);
    addTab(v);
    if (v.reference) {
      sec.querySelectorAll('.ref-jump').forEach((a) => {
        a.addEventListener('click', (e) => { e.preventDefault(); show(a.getAttribute('href').slice(1)); });
      });
    }
    return;
  }

  sec.dataset.crt = v.crt;
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
  addTab(v);
  wireSelection(sec);
});

function addTab(v) {
  const tab = document.createElement('button');
  tab.className = 'chrome-tab';
  tab.dataset.id = v.id;
  tab.innerHTML = `<span class="tab-group">${v.group}</span>${v.name}`;
  tab.addEventListener('click', () => show(v.id));
  tabs.appendChild(tab);
}

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
  if (v.intro) {
    caption.innerHTML = v.reference
      ? `<div class="cap-main"><span class="cap-name">Reference</span>
         <span class="cap-pitch">The palettes, the type and the number solutions behind all
         eleven, as values rather than pictures.</span></div>`
      : `<div class="cap-main"><span class="cap-name">Preview gallery</span>
         <span class="cap-pitch">Eleven directions for the redesign. Read this page, then use the
         tabs or the arrow keys.</span></div>`;
    return;
  }
  const n = VARIANTS.indexOf(v) - 1;
  caption.innerHTML = `
    <div class="cap-main">
      <span class="cap-n">${String(n).padStart(2, '0')}/${VARIANTS.length - 2}</span>
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

/* The published archive opens on the reference sheet; the review copy opens on
 * the start page. The build injects __START__ for the former. */
show(location.hash.slice(1) || window.__START__ || VARIANTS[0].id);
