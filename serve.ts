// serve.ts — tiny static server for the VICE HEAT app (Node 22+).
// Usage: node serve.ts  →  http://localhost:8080/
// Serves only files under app/; nothing else on disk is exposed.

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), 'app');
const PORT = Number(process.env.PORT || 8080);

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.md': 'text/markdown; charset=utf-8',
};

const server = createServer((req, res) => {
  const raw = decodeURIComponent((req.url || '/').split('?')[0]);
  const rel = normalize(raw === '/' ? '/index.html' : raw).replace(/^[/\\]+/, '');
  const file = join(APP_DIR, rel);
  if (!file.startsWith(APP_DIR) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found\n');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});

server.listen(PORT, () => {
  console.log(`VICE HEAT serving app/ at http://localhost:${PORT}/`);
});
