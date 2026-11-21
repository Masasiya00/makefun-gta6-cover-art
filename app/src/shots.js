// VICE HEAT — screenshot runner: takes the 4 shots in shots.json with
// Playwright. Run while `node serve.ts` serves the app on :8080:
//   node app/src/shots.js
// Playwright lives in ~/workspace/node_modules (never inside this repo) and
// the browser binary in ~/.cache/ms-playwright — nothing is installed here.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'shots.json'), 'utf8')).shots;
const BASE = process.env.SHOTS_BASE || 'http://localhost:8080';
const OUT = path.join(ROOT, 'screenshots');

function playwright() {
  try {
    return require(path.join(os.homedir(), 'workspace', 'node_modules', 'playwright'));
  } catch (_) {
    return require('playwright');
  }
}

function chromeBinary() {
  const dir = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (!fs.existsSync(dir)) return undefined;
  const names = fs.readdirSync(dir).filter((n) => n.startsWith('chromium-')).sort().reverse();
  for (const n of names) {
    const p = path.join(dir, n, 'chrome-linux', 'chrome');
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

(async () => {
  const { chromium } = playwright();
  const executablePath = chromeBinary();
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  fs.mkdirSync(OUT, { recursive: true });
  for (const shot of SHOTS) {
    const page = await browser.newPage({ viewport: { width: shot.width, height: shot.height } });
    await page.goto(BASE + shot.path, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1800);
    try {
      await page.waitForFunction(() => document.fonts && document.fonts.status === 'loaded', null, { timeout: 5000 });
    } catch (_) { /* fonts fall back to system condensed; the shot still counts */ }
    await page.waitForTimeout(400);
    const file = path.join(OUT, shot.file);
    await page.screenshot({ path: file, type: 'jpeg', quality: 82 });
    const bytes = fs.statSync(file).size;
    console.log(shot.file + ' ' + shot.width + 'x' + shot.height + ' ' + bytes + ' B' + (bytes > 262144 ? '  OVER 256 KiB!' : ''));
    await page.close();
  }
  await browser.close();
  console.log('done: ' + SHOTS.length + ' shots in ' + OUT);
})().catch((err) => {
  console.error('shots failed:', err);
  process.exit(1);
});
