// Throwaway: amber against rose, over three gate hues, alive and dead.
const { chromium } = require('./node_modules/playwright-core');
const W = '/home/g/git/gabe-sd.github.io/.claude/worktrees/redesign-flappy-bird';

// [caption, gateHue, birdHue, phase]
const CASES = [
  ['amber / fern', 'fern', 'amber', 'play'],
  ['amber / cyan', 'cyan', 'amber', 'play'],
  ['rose / cyan', 'cyan', 'rose', 'play'],
  ['amber / fern — dead', 'fern', 'amber', 'over'],
  ['amber / cyan — dead', 'cyan', 'amber', 'over'],
  ['rose / cyan — dead', 'cyan', 'rose', 'over'],
];

(async () => {
  const b = await chromium.launch({ executablePath: '/snap/bin/chromium', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1500, height: 1200 }, deviceScaleFactor: 2 });
  await p.goto('http://localhost:45791/games/flappy-bird/index.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts && document.fonts.ready);

  const shots = [];
  for (const [caption, gh, bh, ph] of CASES) {
    const url = await p.evaluate(([gh, bh, ph]) => {
      pipeStyle = 'c'; gateHue = gh; birdStyle = 'wire'; birdHue = bh; birdGlow = 10;
      phase = ph;
      bird = { y: 250, vy: -3 };
      pipes = [{ x: 190, gapTop: 150, passed: false }, { x: 410, gapTop: 300, passed: false }];
      draw();
      return document.getElementById('board').toDataURL();
    }, [gh, bh, ph]);
    shots.push([caption, url]);
  }

  await p.evaluate((shots) => {
    document.body.innerHTML = `<div id="sheet" style="display:flex;flex-wrap:wrap;gap:16px;
      padding:16px;background:#0a0704;width:1160px;font:13px monospace;color:#b8790a">
      ${shots.map(([c, u]) => `<figure style="margin:0;width:352px">
        <img src="${u}" style="width:352px;display:block;border:1px solid #3d2807">
        <figcaption style="padding-top:6px;letter-spacing:.1em">${c}</figcaption>
      </figure>`).join('')}</div>`;
  }, shots);
  await p.locator('#sheet').screenshot({ path: `${W}/amber-vs-rose.png` });
  await b.close();
})();
