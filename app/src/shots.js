// Screenshot definitions for VICE HEAT: Leonida Cover Studio.
// Each shot is a browser viewport plus the app URL that renders it; the
// headless driver in main.ts and the in-app preset menu both read this list,
// and shots.json at the repo root mirrors it for the Node side.
export const SHOTS = [
  {
    file: '1-cover.jpg',
    label: 'Cover grid Sunset 1920x1080',
    width: 1920,
    height: 1080,
    url: '/?mode=cover&layout=grid&grade=sunset&intensity=85',
  },
  {
    file: '2-editor.jpg',
    label: 'Editor Magazine Spread Ocean 1280x720',
    width: 1280,
    height: 720,
    url: '/?mode=editor&layout=magazine&grade=ocean&intensity=70&role_duo=PARTNERS%20IN%20CRIME',
  },
  {
    file: '3-cover-square.jpg',
    label: 'Cover slanted Neon 1080x1080',
    width: 1080,
    height: 1080,
    url: '/?mode=cover&layout=slanted&grade=neon&intensity=90',
  },
  {
    file: '4-cover-portrait.jpg',
    label: 'Cover hero Twilight 1080x1350',
    width: 1080,
    height: 1350,
    url: '/?mode=cover&layout=hero&grade=twilight&intensity=80',
  },
];
