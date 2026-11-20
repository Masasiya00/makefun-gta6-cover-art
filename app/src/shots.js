// app/src/shots.js — the four dossier screenshots, as a JS module.
// Kept in sync with shots.json at the repo root (same file, width, height,
// label and url). main.ts reads shots.json; the app can import this module.

export const SHOTS = [
  {
    file: '1-cover.jpg',
    width: 1920,
    height: 1080,
    label: 'Cover grid Sunset 1920x1080',
    url: '/?mode=cover&layout=grid&grade=sunset&intensity=85',
  },
  {
    file: '2-editor.jpg',
    width: 1280,
    height: 720,
    label: 'Editor Magazine Spread Ocean 1280x720',
    url: '/?mode=editor&layout=magazine&grade=ocean&intensity=70&role_duo=PARTNERS%20IN%20CRIME',
  },
  {
    file: '3-cover-square.jpg',
    width: 1080,
    height: 1080,
    label: 'Cover slanted Neon 1080x1080',
    url: '/?mode=cover&layout=slanted&grade=neon&intensity=90',
  },
  {
    file: '4-cover-portrait.jpg',
    width: 1080,
    height: 1350,
    label: 'Cover hero Twilight 1080x1350',
    url: '/?mode=cover&layout=hero&grade=twilight&intensity=80',
  },
];
