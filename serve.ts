// VICE HEAT: Leonida Cover Studio — static file server for app/.
// Serves the app offline at http://localhost:8080 (or $PORT). No build
// step, no network fetch: every file comes from the app/ directory next
// to this file, and paths that climb out of it are refused.
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_DIR = resolve(join(fileURLToPath(import.meta.url), '..', 'app'));
const PORT = Number(process.env.PORT ?? 8080);

const TYPES = {
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
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') rel = '/index.html';
    const file = resolve(join(APP_DIR, rel));
    if (!file.startsWith(APP_DIR + '/') && file !== APP_DIR) {
      res.writeHead(403, { 'content-type': 'text/plain' });
      res.end('forbidden');
      return;
    }
    const st = statSync(file);
    if (!st.isFile()) throw new Error('not a file');
    res.writeHead(200, {
      'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'content-length': st.size,
      'cache-control': 'no-cache',
    });
    res.end(readFileSync(file));
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`VICE HEAT serving app/ at http://localhost:${PORT}`);
});
