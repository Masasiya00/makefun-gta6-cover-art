// shots.js — screenshot runner for VICE HEAT (Node, Playwright).
// Run from the repo root with the static server up:
//   node serve.ts &  node app/src/shots.js
// Reads shots.json at the repo root and writes each shot to output/.
// This file is NOT loaded by index.html — it runs in Node only, so its
// `playwright` import is never checked by the app's references gate.

import { chromium } from 'playwright';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));
const outDir = join(root, 'output');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const base = process.env.VICEHEAT_URL || 'http://localhost:8080/';
const browser = await chromium.launch();
try {
  for (const shot of shots) {
    const page = await browser.newPage({ viewport: { width: shot.width, height: shot.height } });
    await page.goto(`${base}?shot=${encodeURIComponent(shot.id)}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.VICEHEAT !== undefined, { timeout: 15000 });
    await page.evaluate((s) => window.VICEHEAT.applyShotParams(s), shot);
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(outDir, shot.file), quality: 70 });
    console.log(`shot ${shot.id}: ${shot.width}x${shot.height} -> output/${shot.file}`);
    await page.close();
  }
} finally {
  await browser.close();
}
console.log('done');
