// main.ts — entrypoint for the VICE HEAT make.fun submission (Node 22+).
// Copies app/ and screenshots/ from this repository to the output directory
// and writes /output/dossier.json with buildDossier from the kit's
// vendor/makefun-app.ts (byte-for-byte the scorer's own copy — never edit it).
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.

import { buildDossier } from './vendor/makefun-app.ts';
import {
  cpSync, existsSync, mkdirSync, readdirSync, readFileSync,
  rmSync, statSync, writeFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const DOSSIER_MAX_BYTES = 1.5 * 1024 * 1024; // 1.5 MiB

// Remove only the CONTENTS of the output dir — never the directory itself,
// so a later mkdir never has to recreate a path whose parent lost write
// permission (the EACCES trap from an earlier round).
function cleanOutput(dir: string): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

function ensureDir(dir: string): void {
  // mkdirSync (even recursive) on a directory that already exists can fail
  // with EACCES when the parent is not writable — only create when absent.
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function copyTree(src: string, dest: string): void {
  ensureDir(dest);
  cpSync(src, dest, { recursive: true });
}

function main(): void {
  ensureDir(OUT_DIR);
  cleanOutput(OUT_DIR);
  ensureDir(join(OUT_DIR, 'app'));
  ensureDir(join(OUT_DIR, 'screenshots'));

  if (!existsSync(join(REPO_ROOT, 'app'))) throw new Error('repo has no app/ directory');
  if (!existsSync(join(REPO_ROOT, 'screenshots'))) throw new Error('repo has no screenshots/ directory');
  copyTree(join(REPO_ROOT, 'app'), join(OUT_DIR, 'app'));
  copyTree(join(REPO_ROOT, 'screenshots'), join(OUT_DIR, 'screenshots'));

  const dossier = buildDossier(OUT_DIR, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 256 * 1024 },
    app_max_files: 993,
    app_max_bytes: 48 * 1024 * 1024,
    app_path_max_bytes: 1000,
  });
  writeFileSync(join(OUT_DIR, 'dossier.json'), dossier);

  // Validation: size cap + the keys the dossier must carry.
  const size = statSync(join(OUT_DIR, 'dossier.json')).size;
  if (size > DOSSIER_MAX_BYTES) {
    throw new Error(`dossier.json is ${size} bytes, over the 1.5 MiB cap`);
  }
  const doc = JSON.parse(readFileSync(join(OUT_DIR, 'dossier.json'), 'utf8'));
  for (const key of ['cover', 'images', 'schema', 'text']) {
    if (!(key in doc)) throw new Error(`dossier.json is missing key: ${key}`);
  }
  if (!Array.isArray(doc.images) || doc.images.length !== 4) {
    throw new Error(`dossier.json embeds ${doc.images?.length ?? 0} screenshots, expected 4`);
  }
  for (const img of doc.images) {
    if (typeof img.base64 !== 'string' || img.base64.length === 0) {
      throw new Error(`dossier image ${img.name} has no base64 payload`);
    }
    console.log(`  image ${img.name}: ${img.media_type}, base64 ${img.base64.length} chars`);
  }
  console.log(`dossier.json: ${size} bytes, schema=${doc.schema}, cover=${doc.cover}, images=${doc.images.length}`);
  console.log(`output written to ${OUT_DIR}`);
}

main();
