// VICE HEAT: Leonida Cover Studio — entrypoint (Node 22, no build step).
// Hands the entry in: it re-renders the 4 screenshots headlessly from the
// app itself (best effort — the committed screenshots/ are the fallback),
// copies app/ and screenshots/ to the output directory, and writes
// dossier.json with the kit's buildDossier from vendor/makefun-app.ts.
//
//   MAKEFUN_OUTPUT_DIR=/tmp/vice-heat-out node main.ts
// Outside the grader MAKEFUN_OUTPUT_DIR stands in for /output.

import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const REPO = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const SHOT_PORT = 8123;

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

// The headless screenshot driver (Python + Playwright): reads shots.json,
// loads each shot URL in Chromium, waits for the app to signal readiness,
// captures the viewport at the literal shots.json dimensions, then saves
// it as a JPEG sized only by quality to fit the gate's 256 KiB cap —
// the capture is NEVER resized, so the file always matches shots.json.
const DRIVER = `
import json, sys
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

def launch(pw):
    try:
        return pw.chromium.launch(args=["--no-sandbox", "--force-device-scale-factor=1"])
    except Exception:
        # The installed chromium can be newer than this playwright's default.
        import glob, os
        cands = sorted(glob.glob(os.path.expanduser("~/.cache/ms-playwright/chromium-*/chrome-linux/chrome")))
        return pw.chromium.launch(executable_path=cands[-1],
                                  args=["--no-sandbox", "--force-device-scale-factor=1"])

shots = json.loads(Path(sys.argv[1]).read_text())["shots"]
base = sys.argv[2].rstrip("/")
out = Path(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)
problems = []
with sync_playwright() as pw:
    browser = launch(pw)
    for shot in shots:
        page = browser.new_page(viewport={"width": shot["width"], "height": shot["height"]})
        notes = []
        page.on("console", lambda m: notes.append(m.type + ": " + m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: notes.append("pageerror: " + str(e)))
        page.goto(base + shot["url"], wait_until="networkidle")
        try:
            page.wait_for_function("window.__viceHeatReady === true", timeout=20000)
        except Exception as e:
            problems.append({"file": shot["file"], "error": "app never became ready: " + str(e)})
            page.close()
            continue
        page.wait_for_timeout(600)
        full = out / ("full-" + shot["file"])
        page.screenshot(path=str(full))
        page.close()
        im = Image.open(full).convert("RGB")
        # Literal dimensions: the capture is kept exactly as shot, so the
        # file always matches shots.json. Only JPEG quality drops to fit
        # the gate's 256 KiB cap — never the pixel size.
        target = out / shot["file"]
        quality = 88
        im.save(target, quality=quality)
        while target.stat().st_size > 262144 and quality > 50:
            quality -= 8
            im.save(target, quality=quality)
        full.unlink()
        bad = [n for n in notes if n.startswith("error") or n.startswith("pageerror")]
        if bad:
            problems.append({"file": shot["file"], "console": bad})
    browser.close()
print(json.dumps({"ok": True, "problems": problems}))
`;

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
    let out = '';
    let err = '';
    child.stdout?.on('data', (d) => { out += d; });
    child.stderr?.on('data', (d) => { err += d; });
    child.on('error', (e) => resolve({ code: -1, out, err: String(e) }));
    child.on('close', (code) => resolve({ code, out, err }));
  });
}

async function waitForServer(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

// Re-render screenshots into `dest`. Returns true when all 4 landed.
async function renderScreenshots(dest) {
  const tmp = mkdtempSync(join(tmpdir(), 'vice-heat-shots-'));
  const driverPath = join(tmp, 'driver.py');
  writeFileSync(driverPath, DRIVER);
  const server = spawn('node', ['serve.ts'], {
    cwd: REPO,
    env: { ...process.env, PORT: String(SHOT_PORT) },
    stdio: 'ignore',
  });
  try {
    const base = `http://127.0.0.1:${SHOT_PORT}`;
    if (!(await waitForServer(`${base}/`))) {
      console.warn('main.ts: static server did not come up; keeping committed screenshots');
      return false;
    }
    const staged = join(tmp, 'shots');
    mkdirSync(staged, { recursive: true });
    const result = await run('python3', [driverPath, join(REPO, 'shots.json'), base, staged]);
    let report = { ok: false, problems: ['driver produced no report'] };
    try {
      report = JSON.parse(result.out.trim().split('\n').pop());
    } catch {
      /* keep the fallback report */
    }
    if (result.code !== 0 || !report.ok) {
      console.warn('main.ts: screenshot driver failed; keeping committed screenshots', result.err.slice(0, 500));
      return false;
    }
    if (report.problems?.length) {
      console.warn('main.ts: screenshot problems:', JSON.stringify(report.problems).slice(0, 1000));
    }
    const shots = JSON.parse(readFileSync(join(REPO, 'shots.json'), 'utf8')).shots;
    for (const shot of shots) {
      const file = join(staged, shot.file);
      if (!existsSync(file)) {
        console.warn(`main.ts: missing screenshot ${shot.file}; keeping committed screenshots`);
        return false;
      }
    }
    rmSync(dest, { recursive: true, force: true });
    mkdirSync(dest, { recursive: true });
    cpSync(staged, dest, { recursive: true });
    return true;
  } finally {
    server.kill();
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const shotDir = join(OUT, 'screenshots');
  const rendered = await renderScreenshots(shotDir);
  console.log(`main.ts: screenshots ${rendered ? 're-rendered headlessly' : 'copied from the repository'}`);
  if (!rendered) {
    rmSync(shotDir, { recursive: true, force: true });
    cpSync(join(REPO, 'screenshots'), shotDir, { recursive: true });
  }
  const appDir = join(OUT, 'app');
  rmSync(appDir, { recursive: true, force: true });
  cpSync(join(REPO, 'app'), appDir, { recursive: true });
  const dossier = buildDossier(OUT, CAPS);
  writeFileSync(join(OUT, 'dossier.json'), dossier);
  const parsed = JSON.parse(new TextDecoder().decode(dossier));
  console.log(JSON.stringify({
    cover: parsed.cover,
    images: parsed.images,
    schema: parsed.schema,
    text_bytes: new TextEncoder().encode(parsed.text).length,
    dossier_bytes: dossier.length,
    output: OUT,
  }, null, 2));
}

main().catch((err) => {
  console.error('main.ts failed:', err);
  process.exit(1);
});
