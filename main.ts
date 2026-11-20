// VICE HEAT: Leonida Cover Studio — entrypoint (Node 22, standard library
// only). Hands the entry in: copies app/ and screenshots/ from beside this
// file to /output (or MAKEFUN_OUTPUT_DIR outside the grader) and writes
// /output/dossier.json with the vendored make.fun library, exactly as the
// kit's starter does — the sealed scorer rebuilds that dossier byte for
// byte, so this file never invents its own dossier format.
//
// Screenshot capture is a development-only branch: with
// MAKEFUN_CAPTURE=1 it first runs the repo's capture-shots.py helper, which
// serves app/ and shoots the four scenes in shots.json at their literal
// post sizes into <output>/shots-literal/. The branch is skipped entirely
// when the variable is unset (the grader never sets it), so a grading run
// is just the copy + dossier build and finishes in well under a second.
// A failed capture never fails the hand-in: the repo's screenshots/ are
// still copied and the dossier still built from them.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function captureShotsLiteral(): void {
  if (process.env.MAKEFUN_CAPTURE !== '1') return;
  const helper = join(here, 'capture-shots.py');
  const shots = join(here, 'shots.json');
  if (!existsSync(helper) || !existsSync(shots)) {
    console.warn('main.ts: capture skipped, capture-shots.py or shots.json is missing');
    return;
  }
  const dest = join(out, 'shots-literal');
  mkdirSync(dest, { recursive: true });
  const run = spawnSync('python3', [helper, '--out', dest], {
    cwd: here,
    timeout: 120000,
    encoding: 'utf8',
  });
  if (run.error) {
    console.warn(`main.ts: capture failed to start (${run.error.message}); using repo screenshots/`);
    return;
  }
  if (run.status !== 0) {
    console.warn(`main.ts: capture exited ${run.status}; using repo screenshots/`);
    if (run.stderr) console.warn(run.stderr.slice(0, 2000));
    return;
  }
  console.log(`main.ts: literal captures written to ${dest}`);
  if (run.stdout) console.log(run.stdout.trim().slice(0, 2000));
}

mkdirSync(out, { recursive: true });
captureShotsLiteral();

cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Fail fast, with a readable message, when the hand-in holds the wrong
// number of screenshots: the gate wants 3 or 4, and a count of 1 or 2
// would otherwise sail through buildDossier and fail only at the scorer.
const shotNames = readdirSync(join(out, 'screenshots'))
  .filter((name) => !name.startsWith('.'))
  .sort();
if (shotNames.length < 3 || shotNames.length > 4) {
  throw new Error(`main.ts: expected 3 or 4 screenshots, found ${shotNames.length}`);
}

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

for (const name of shotNames) {
  const size = statSync(join(out, 'screenshots', name)).size;
  console.log(`main.ts: screenshot ${name} — ${size} bytes`);
}
console.log(`main.ts: dossier.json — ${dossier.length} bytes, ${shotNames.length} screenshots`);
