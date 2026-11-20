// VICE HEAT screenshot maker.
// Reads shots.json at the repo root, serves app/ on a local port, and captures
// each declared shot with Playwright + Chromium at its LITERAL dimensions
// (no downscaling): the viewport is exactly w x h and the screenshot is the
// viewport. JPEG quality starts at 82 and steps down to the floor of 50 until
// the file fits the 256 KiB cap. Usage: node app/src/shots.js <outDir>
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import http from 'node:http';
import { spawn } from 'node:child_process';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..', '..');
const appDir = join(repoRoot, 'app');
const outDir = process.argv[2] || join(repoRoot, 'output', 'screenshots');
const shots = JSON.parse(readFileSync(join(repoRoot, 'shots.json'), 'utf8'));

const require = createRequire(import.meta.url);
let chromium = null;
for (const name of ['playwright-core', 'playwright']) {
  try {
    chromium = require(name).chromium;
    break;
  } catch (e) { /* try the next package */ }
}
if (!chromium) throw new Error('shots.js needs playwright-core or playwright installed');

function findChromiumExecutable() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    join(process.env.HOME || '', '.cache', 'ms-playwright', 'chromium-1255', 'chrome-linux', 'chrome'),
    join(process.env.HOME || '', '.cache', 'ms-playwright', 'chromium_headless_shell-1255', 'chrome-headless-shell-linux64', 'chrome-headless-shell'),
  ].filter(Boolean);
  for (const c of candidates) if (existsSync(c)) return c;
  return undefined; // let Playwright pick its bundled Chromium
}

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.ttf': 'font/ttf', '.svg': 'image/svg+xml',
};

function serveApp(port) {
  const server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let path = decodeURIComponent(url.pathname);
      if (path === '/') path = '/index.html';
      const file = join(appDir, path);
      if (!file.startsWith(appDir) || !existsSync(file)) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      const ext = path.slice(path.lastIndexOf('.'));
      res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' });
      res.end(readFileSync(file));
    } catch (e) {
      res.writeHead(500);
      res.end('error');
    }
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const port = 18081;
  const server = await serveApp(port);
  const executablePath = findChromiumExecutable();
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  try {
    for (const shot of shots) {
      const page = await browser.newPage({ viewport: { width: shot.w, height: shot.h } });
      const errors = [];
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(`http://127.0.0.1:${port}/${shot.query}`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__viceHeat && window.__viceHeat.ready, null, { timeout: 30000 });
      await page.waitForTimeout(400);
      const target = join(outDir, shot.name);
      let quality = 82;
      let buf = Buffer.alloc(0);
      while (true) {
        buf = await page.screenshot({ type: 'jpeg', quality });
        if (buf.length <= 262144 || quality <= 50) break;
        quality = quality <= 58 ? 50 : quality - 12;
      }
      writeFileSync(target, buf);
      console.log(`shot ${shot.name} ${shot.w}x${shot.h} quality=${quality} bytes=${buf.length} consoleErrors=${errors.length}`);
      if (errors.length) console.log(`  console errors: ${errors.join(' | ')}`);
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error('shots.js failed:', e);
  process.exit(1);
});
