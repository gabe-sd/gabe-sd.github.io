// Throwaway: one contact sheet of bird/pipe colour pairs. Not committed.
const { chromium } = require('./node_modules/playwright-core');
const W = '/home/g/git/gabe-sd.github.io/.claude/worktrees/redesign-flappy-bird';

// [caption, pipeStyle, gateHue, birdStyle, birdHue]
const PAIRS = [
  ['rose / amber conduit', 'b', 'cyan', 'wire', 'rose'],
  ['rose / cyan gate', 'c', 'cyan', 'wire', 'rose'],
  ['rose / fern gate', 'c', 'fern', 'wire', 'rose'],
  ['rose / violet gate', 'c', 'violet', 'wire', 'rose'],
  ['lime / violet gate', 'c', 'violet', 'wire', 'lime'],
  ['cyan / amber conduit', 'b', 'cyan', 'wire', 'cyan'],
  ['white / cyan gate', 'c', 'cyan', 'wire', 'hot'],
  ['amber / fern gate', 'c', 'fern', 'wire', 'amber'],
];

(async () => {
  const b = await chromium.launch({ executablePath: '/snap/bin/chromium', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 });
  await p.goto('http://localhost:45791/games/flappy-bird/index.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts && document.fonts.ready);

  const shots = [];
  for (const [caption, ps, gh, bs, bh] of PAIRS) {
    const url = await p.evaluate(([ps, gh, bs, bh]) => {
      pipeStyle = ps; gateHue = gh; birdStyle = bs; birdHue = bh; birdGlow = 10;
      phase = 'play';
      bird = { y: 250, vy: -3 };
      // One fixed layout, so every frame is the same picture in another colour.
      pipes = [{ x: 200, gapTop: 150, passed: false }, { x: 420, gapTop: 300, passed: false }];
      draw();
      return document.getElementById('board').toDataURL();
    }, [ps, gh, bs, bh]);
    shots.push([caption, url]);
  }

  await p.evaluate((shots) => {
    document.body.innerHTML = `<div id="sheet" style="display:flex;flex-wrap:wrap;gap:14px;
      padding:14px;background:#0a0704;width:1360px;font:13px monospace;color:#b8790a">
      ${shots.map(([c, u]) => `<figure style="margin:0;width:320px">
        <img src="${u}" style="width:320px;display:block;border:1px solid #3d2807">
        <figcaption style="padding-top:5px;letter-spacing:.12em">${c}</figcaption>
      </figure>`).join('')}</div>`;
  }, shots);
  await p.locator('#sheet').screenshot({ path: `${W}/pairs.png` });
  await b.close();
})();
