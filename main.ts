// VICE HEAT — entrypoint (Node 22). Copies app/ + screenshots/ into the
// output directory and writes dossier.json via the kit vendor's
// buildDossier, then exits 0.
//
// NOTE on the import: the kit vendor in this repo is vendor/makefun-app.ts
// (its buildDossier is what the kit ships). There is no
// vendor/makefun-frontend.ts in this repo, so this file imports the vendor
// module that actually exists. The vendor file itself is never modified.
//
// Two filesystem rules that keep this working for the grader (which runs as
// an unprivileged user whose parent directory may not be writable):
//  1. Only the CONTENTS of the output dir are ever removed — never the dir
//     itself (removing the dir needs a write on its parent: EACCES).
//  2. mkdirSync runs only when the dir does NOT exist yet (mkdirSync with
//     recursive:true on an existing dir also fails EACCES without a
//     writable parent).
// And one decoding rule: buildDossier returns a Uint8Array — decode it as
// UTF-8 with TextDecoder BEFORE JSON.parse, or the parse crashes.
import { buildDossier } from './vendor/makefun-app.ts';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const DOSSIER_MAX_BYTES = 1.5 * 1024 * 1024;

const CAPS = {
  text_max_bytes: 1400000,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 4096
};

function clearContentsOnly(dir) {
  // Rule 1: remove entries inside dir, never dir itself.
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    rmSync(join(dir, name), { recursive: true, force: true });
  }
}

function ensureDir(dir) {
  // Rule 2: mkdir only when missing.
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function main() {
  ensureDir(OUT_DIR);
  clearContentsOnly(OUT_DIR);

  const appSrc = join(ROOT, 'app');
  const shotsSrc = join(ROOT, 'screenshots');
  cpSync(appSrc, join(OUT_DIR, 'app'), { recursive: true });
  if (existsSync(shotsSrc)) {
    cpSync(shotsSrc, join(OUT_DIR, 'screenshots'), { recursive: true });
  } else {
    ensureDir(join(OUT_DIR, 'screenshots'));
  }
  if (!existsSync(join(OUT_DIR, 'app', 'index.html'))) {
    throw new Error('app/index.html missing from output — copy failed');
  }
  const shotFiles = readdirSync(join(OUT_DIR, 'screenshots')).filter((n) => /\.(jpe?g|png)$/i.test(n));
  if (shotFiles.length !== 4) {
    throw new Error('expected 4 screenshots in output, found ' + shotFiles.length);
  }

  const bytes = buildDossier(OUT_DIR, CAPS);
  if (!(bytes instanceof Uint8Array)) {
    throw new Error('buildDossier did not return a Uint8Array');
  }
  // Decode UTF-8 FIRST, then parse — JSON.parse on raw bytes crashes.
  const text = new TextDecoder('utf-8').decode(bytes);
  const dossier = JSON.parse(text);

  for (const key of ['cover', 'images', 'schema', 'text']) {
    if (!(key in dossier)) throw new Error('dossier missing key: ' + key);
  }
  if (!Array.isArray(dossier.images) || dossier.images.length === 0) {
    throw new Error('dossier has no embedded screenshots');
  }
  for (const img of dossier.images) {
    if (typeof img.base64 !== 'string' || img.base64.length === 0) {
      throw new Error('dossier image without embedded base64 data: ' + (img.name || '?'));
    }
  }
  if (bytes.byteLength > DOSSIER_MAX_BYTES) {
    throw new Error('dossier ' + bytes.byteLength + ' B exceeds 1.5 MiB cap');
  }

  const dossierPath = join(OUT_DIR, 'dossier.json');
  writeFileSync(dossierPath, bytes);
  const written = statSync(dossierPath).size;
  console.log('dossier.json: ' + written + ' B, ' + dossier.images.length + ' screenshots embedded, keys cover/images/schema/text ok');
  console.log('output: ' + OUT_DIR);
}

try {
  main();
} catch (err) {
  console.error('main.ts failed:', err instanceof Error ? err.message : err);
  process.exit(1);
}
