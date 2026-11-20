// VICE HEAT: Leonida Cover Studio — make.fun entry program (Node 22).
// Hands the app in: generates the 4 screenshots fresh with app/src/shots.js
// (Playwright + Chromium, literal dimensions from shots.json, JPEG quality
// floor 50, each under 256 KiB), copies app/ and screenshots/ beside this
// file to the output directory, and writes dossier.json with the vendored
// make.fun library (buildDossier). Outside the grader, MAKEFUN_OUTPUT_DIR
// stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// If screenshot generation is unavailable in the sandbox, the already
// witnessed screenshots/ shipped in the repo are used instead, so the
// dossier is always built from real screenshots of this app.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function shotFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.(png|jpe?g)$/i.test(f))
    .map((f) => join(dir, f))
    .filter((f) => statSync(f).isFile() && statSync(f).size <= 262144);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });

const outShots = join(out, 'screenshots');
mkdirSync(outShots, { recursive: true });

// 1. Generate the screenshots fresh, at the literal dimensions in shots.json.
let generated = false;
const gen = spawnSync(
  process.execPath,
  [join(here, 'app', 'src', 'shots.js'), outShots],
  { cwd: here, stdio: 'inherit', timeout: 180000 },
);
if (gen.status === 0 && shotFiles(outShots).length === 4) {
  generated = true;
  console.log('main.ts: screenshots generated fresh by shots.js');
} else {
  console.log('main.ts: screenshot generation unavailable, falling back to repo screenshots/');
  if (existsSync(join(here, 'screenshots'))) {
    cpSync(join(here, 'screenshots'), outShots, { recursive: true });
  }
}
const shots = shotFiles(outShots);
if (shots.length !== 4) {
  throw new Error(`main.ts: expected 4 screenshots, found ${shots.length}`);
}
for (const f of shots) {
  console.log(`main.ts: screenshot ${f} bytes=${statSync(f).size}`);
}

// 2. Build the dossier the judge reads (keys cover/images/schema/text,
//    4 screenshots embedded as base64) — byte for byte what buildDossier
//    writes from app/ and screenshots/, at most 1.5 MiB.
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);
const dossierBytes = Buffer.byteLength(dossier, 'utf8');
if (dossierBytes > 1572864) {
  throw new Error(`main.ts: dossier.json ${dossierBytes} bytes exceeds the 1.5 MiB cap`);
}
const parsed = JSON.parse(typeof dossier === 'string' ? dossier : new TextDecoder().decode(dossier));
for (const key of ['cover', 'images', 'schema', 'text']) {
  if (!(key in parsed)) throw new Error(`main.ts: dossier.json is missing key "${key}"`);
}
console.log(`main.ts: dossier.json bytes=${dossierBytes} generated=${generated}`);
console.log(`main.ts: done, output in ${out}`);
