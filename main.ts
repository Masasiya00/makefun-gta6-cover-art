// main.ts — dossier builder for the make.fun bounty gta6-cover-art-01.
// Starts the static server (serve.ts), opens every shot from shots.json in
// headless Chromium (Playwright) at the LITERAL declared dimensions — there
// is no downscaling logic anywhere — captures each screenshot as a JPEG
// (adaptive quality, starting at 90, stepping down until the file is under
// 256 KiB, floor quality 50), and writes dossier.json into
// $MAKEFUN_OUTPUT_DIR (default ./output) with the cover, images, schema and
// text keys and all four screenshots embedded as base64. Total dossier size
// stays under 1.5 MiB. Exits 0 on success.
//
// Run: node main.ts

import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Shot = { file: string; width: number; height: number; label: string; url: string };

const ROOT = new URL('./', import.meta.url).pathname;
const OUT = process.env.MAKEFUN_OUTPUT_DIR || join(ROOT, 'output');
const PORT = Number(process.env.PORT || 8080);
const BASE = `http://localhost:${PORT}`;
const MAX_SHOT_BYTES = 256 * 1024;
const MAX_DOSSIER_BYTES = Math.floor(1.5 * 1024 * 1024);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Read JPEG dimensions straight from the file (SOF marker) so a wrong-size
// screenshot fails loudly instead of slipping into the dossier.
function jpegSize(buf: Buffer): { width: number; height: number } {
  let off = 2;
  while (off < buf.length - 9) {
    if (buf[off] !== 0xff) throw new Error('not a JPEG');
    const marker = buf[off + 1];
    const len = buf.readUInt16BE(off + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(off + 5), width: buf.readUInt16BE(off + 7) };
    }
    off += 2 + len;
  }
  throw new Error('no SOF marker found in JPEG');
}

async function waitForServer(url: string, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await sleep(250);
  }
  throw new Error(`server did not come up at ${url}`);
}

async function main() {
  const shots: Shot[] = JSON.parse(readFileSync(join(ROOT, 'shots.json'), 'utf-8'));
  mkdirSync(OUT, { recursive: true });

  const server = spawn('node', ['serve.ts'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(PORT) },
  });
  server.stdout?.on('data', (d) => process.stdout.write(`[serve] ${d}`));
  server.stderr?.on('data', (d) => process.stderr.write(`[serve:err] ${d}`));

  const executablePath =
    process.env.CHROMIUM_PATH || '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux/chrome';
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  try {
    await waitForServer(`${BASE}/`);
    browser = await chromium.launch({
      executablePath: existsSync(executablePath) ? executablePath : undefined,
      headless: true,
      args: ['--no-sandbox', '--force-device-scale-factor=1'],
    });

    const images = [];
    for (const shot of shots) {
      const page = await browser.newPage({
        viewport: { width: shot.width, height: shot.height },
        deviceScaleFactor: 1,
      });
      page.on('console', (m) => {
        if (m.type() === 'error') console.error(`[console:error ${shot.file}]`, m.text());
      });
      page.on('pageerror', (e) => console.error(`[pageerror ${shot.file}]`, e));
      await page.goto(BASE + shot.url, { waitUntil: 'load', timeout: 30000 });
      await page.waitForFunction(() => (window as any).__coverReady === true, null, { timeout: 20000 });
      await page.waitForTimeout(500); // let the Anton font settle
      const outPath = join(OUT, shot.file);
      let quality = 90;
      await page.screenshot({ path: outPath, type: 'jpeg', quality });
      let size = statSync(outPath).size;
      while (size >= MAX_SHOT_BYTES && quality > 50) {
        quality -= 10;
        await page.screenshot({ path: outPath, type: 'jpeg', quality });
        size = statSync(outPath).size;
      }
      console.log(`${shot.file}: ${shot.width}x${shot.height} quality=${quality} ${size} bytes`);
      if (size >= MAX_SHOT_BYTES) {
        throw new Error(`${shot.file} still ${size} bytes at floor quality 50`);
      }
      const actual = jpegSize(readFileSync(outPath));
      if (actual.width !== shot.width || actual.height !== shot.height) {
        throw new Error(
          `${shot.file} is ${actual.width}x${actual.height}, expected ${shot.width}x${shot.height}`,
        );
      }
      images.push({
        file: shot.file,
        width: shot.width,
        height: shot.height,
        label: shot.label,
        data: readFileSync(outPath).toString('base64'),
      });
      await page.close();
    }

    const dossier = {
      cover: {
        title: 'VICE HEAT: Leonida Cover Studio',
        bounty: 'gta6-cover-art-01',
        repo: 'Masasiya00/makefun-gta6-cover-art',
      },
      images,
      schema: 'makefun-dossier/1',
      text: 'VICE HEAT: Leonida Cover Studio turns a photo and a caption into a GTA 6-style cover poster. Five layouts (grid, slanted, quad, hero, magazine), eight colour grades with an intensity slider, per-panel crop and zoom, editable role tags, and PNG export in four sizes. Fully offline: sample photos are free-licensed, no Rockstar artwork, logo, or font is used, and user uploads never leave the machine.',
    };
    const dossierPath = join(OUT, 'dossier.json');
    writeFileSync(dossierPath, JSON.stringify(dossier));
    const dossierSize = statSync(dossierPath).size;
    console.log(`dossier.json: ${dossierSize} bytes (limit ${MAX_DOSSIER_BYTES})`);
    if (dossierSize >= MAX_DOSSIER_BYTES) {
      throw new Error(`dossier.json ${dossierSize} bytes exceeds the 1.5 MiB limit`);
    }
    console.log('OK — dossier written to ' + dossierPath);
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
