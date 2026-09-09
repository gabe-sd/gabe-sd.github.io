// Throwaway: does classic-Flappy green need a new hue, or does jade do?
const { chromium } = require('./node_modules/playwright-core');
const W = '/home/g/git/gabe-sd.github.io/.claude/worktrees/redesign-flappy-bird';

const CASES = [
  ['amber / fern — a new seventh hue', 'fern'],
  ['amber / jade — already in the palette', 'jade'],
  ['amber / lime — already in the palette', 'lime'],
];

(async () => {
  const b = await chromium.launch({ executablePath: '/snap/bin/chromium', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 2 });
  await p.goto('http://localhost:45791/games/flappy-bird/index.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts && document.fonts.ready);

  const shots = [];
  for (const [caption, gh] of CASES) {
    const url = await p.evaluate((gh) => {
      pipeStyle = 'c'; gateHue = gh; birdStyle = 'wire'; birdHue = 'amber';
      beakHue = 'hot'; worldHue = 'pipe'; birdGlow = 10;
      phase = 'play';
      bird = { y: 250, vy: -3 };
      pipes = [{ x: 190, gapTop: 150, passed: false }, { x: 410, gapTop: 300, passed: false }];
      draw();
      return document.getElementById('board').toDataURL();
    }, gh);
    shots.push([caption, url]);
  }

  await p.evaluate((shots) => {
    document.body.innerHTML = `<div id="sheet" style="display:flex;gap:16px;padding:16px;
      background:#0a0704;width:1160px;font:13px monospace;color:#b8790a">
      ${shots.map(([c, u]) => `<figure style="margin:0;width:352px">
        <img src="${u}" style="width:352px;display:block;border:1px solid #3d2807">
        <figcaption style="padding-top:6px;letter-spacing:.1em">${c}</figcaption>
      </figure>`).join('')}</div>`;
  }, shots);
  await p.locator('#sheet').screenshot({ path: `${W}/greens.png` });
  await b.close();
})();
