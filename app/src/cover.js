// VICE HEAT: Leonida Cover Studio — canvas cover renderer.
// Sample art is freely-licensed photography (see app/SOURCES.md), pre-graded
// warm Vice City sunset; or user uploads.
// Fonts: vendored OFL Anton (fonts/Anton-Regular.ttf), never a Rockstar font.

export const SAMPLES = [
  { id: 'duo', file: 'samples/duo.jpg', label: 'Duo Sunset', role: 'THE DUO' },
  { id: 'beach', file: 'samples/beach.jpg', label: 'Beach Sunset', role: 'VICE BEACH' },
  { id: 'skyline', file: 'samples/skyline.jpg', label: 'Neon Skyline', role: 'VICE CITY' },
  { id: 'car', file: 'samples/car.jpg', label: 'Ocean Drive', role: 'GETAWAY' },
  { id: 'heli', file: 'samples/heli.jpg', label: 'Bay Heli', role: 'AIR SUPPORT' },
  { id: 'pool', file: 'samples/pool.jpg', label: 'Poolside', role: 'POOLSIDE' },
  { id: 'gator', file: 'samples/gator.jpg', label: 'Swamp Gator', role: 'LEONIDA WILD' },
  { id: 'boulevard', file: 'samples/boulevard.jpg', label: 'Boulevard', role: 'BOULEVARD' },
  { id: 'pier', file: 'samples/pier.jpg', label: 'Pier', role: 'THE PIER' },
];

export const GRADES = {
  sunset:       { name: 'Sunset',       sky: ['#2b1055', '#ff2e88', '#ff7e3d'], tint: 'rgba(255,46,136,0.20)', title: ['#ffd166', '#ff5e8a'], accent: '#ff2e88', glow: '#ff7e3d' },
  neon:         { name: 'Neon Night',   sky: ['#0b1035', '#3b1a7a', '#ff2ea6'], tint: 'rgba(0,229,255,0.16)',  title: ['#00e5ff', '#ff2ea6'], accent: '#00e5ff', glow: '#ff2ea6' },
  twilight:     { name: 'Twilight Gold',sky: ['#3a1c00', '#b8860b', '#ffd166'], tint: 'rgba(255,179,71,0.20)',  title: ['#fff3c4', '#ffb347'], accent: '#ffb347', glow: '#ffd166' },
  coral:        { name: 'Coral Heat',   sky: ['#5c1030', '#ff6b6b', '#ff9e7d'], tint: 'rgba(255,107,107,0.22)', title: ['#ffe9a8', '#ff6b6b'], accent: '#ff6b6b', glow: '#ff9e7d' },
  violet:       { name: 'Vice Violet',  sky: ['#12082e', '#8e2de2', '#ff6a00'], tint: 'rgba(142,45,226,0.22)',  title: ['#e0aaff', '#ff6a00'], accent: '#c77dff', glow: '#8e2de2' },
  noir:         { name: 'Mono Noir',    sky: ['#0a0a0a', '#3d3d3d', '#8a8a8a'], tint: 'rgba(0,0,0,0.25)',        title: ['#ffffff', '#bdbdbd'], accent: '#ffffff', glow: '#8a8a8a' },
};

export const LAYOUTS = {
  grid9:   { name: '9-Panel Cover Grid', panels: 9 },
  slanted: { name: 'Slanted Panels', panels: 5 },
  quad:    { name: '4-Panel', panels: 4 },
  hero:    { name: 'Single Hero', panels: 1 },
};

// Default panel assignment: [duo centre, beach, skyline, car, heli, pool, boulevard, pier, gator]
export const DEFAULT_PANELS = ['duo', 'beach', 'skyline', 'car', 'heli', 'pool', 'boulevard', 'pier', 'gator'];
// Default crop offsets (fraction of panel size) so each photo is framed on its
// subject in the 9-panel grid: the driver sits at the left edge of the car
// photo, and the helicopter's tail at the left edge of the heli photo.
export const DEFAULT_OFFSETS = { car: { ox: 0.10, oy: 0 }, heli: { ox: 0.12, oy: 0 } };
export const CALLOUTS = ['THE DUO', 'VICE BEACH', 'VICE CITY', 'GETAWAY DRIVER', 'AIR SUPPORT', 'POOLSIDE', 'BOULEVARD', 'THE PIER', 'LEONIDA WILD'];

export function defaultState() {
  return {
    layout: 'grid9',
    grade: 'sunset',
    title: 'VICE HEAT',
    subtitle: 'WELCOME TO LEONIDA',
    tagline: 'Two outlaws. One last score. No way back.',
    quote: '"The sun never sets on Vice City."',
    furniture: { seal: true, billing: true, stars: true, callouts: true },
    panels: DEFAULT_PANELS.map((s) => ({ sample: s, img: null, zoom: 1, ox: (DEFAULT_OFFSETS[s] || {}).ox || 0, oy: (DEFAULT_OFFSETS[s] || {}).oy || 0 })),
    selected: 0,
  };
}

/** Panel cell rectangles (pixels) for a layout inside the art area. */
export function layoutCells(layout, W, H) {
  const artH = H * 0.74; // art area; bottom 26% is the title band
  const g = Math.max(4, W * 0.006);
  const cells = [];
  if (layout === 'grid9') {
    const xs = [0, W * 0.30, W * 0.70, W];
    const ys = [0, artH * 0.36, artH * 0.68, artH];
    const cell = (x0, y0, x1, y1, i) => cells.push({ x: x0 + g / 2, y: y0 + g / 2, w: x1 - x0 - g, h: y1 - y0 - g, i });
    cell(xs[1], ys[0], xs[2], ys[2], 0); // tall centre duo
    cell(xs[0], ys[0], xs[1], ys[1], 1);
    cell(xs[2], ys[0], xs[3], ys[1], 2);
    cell(xs[0], ys[1], xs[1], ys[2], 3);
    cell(xs[2], ys[1], xs[3], ys[2], 4);
    cell(xs[0], ys[2], xs[1], ys[3], 5);
    cell(xs[1], ys[2], (xs[1] + xs[2]) / 2, ys[3], 6);
    cell((xs[1] + xs[2]) / 2, ys[2], xs[2], ys[3], 7);
    cell(xs[2], ys[2], xs[3], ys[3], 8);
  } else if (layout === 'slanted') {
    // Skip the portrait duo panel here: narrow slanted slices crop it badly.
    const idx = [1, 2, 3, 4, 5];
    const n = 5, slant = W * 0.03;
    for (let k = 0; k < n; k++) {
      const x0 = (W / n) * k, x1 = (W / n) * (k + 1);
      cells.push({ x: x0, y: 0, w: x1 - x0, h: artH, i: idx[k], slant: true, top: slant, poly: [
        [x0 + slant, 0], [x1 + slant, 0], [x1 - slant, artH], [x0 - slant, artH],
      ]});
    }
  } else if (layout === 'quad') {
    const mx = W / 2, my = artH / 2;
    cells.push({ x: g / 2, y: g / 2, w: mx - g, h: my - g, i: 0 });
    cells.push({ x: mx + g / 2, y: g / 2, w: mx - g, h: my - g, i: 1 });
    cells.push({ x: g / 2, y: my + g / 2, w: mx - g, h: my - g, i: 2 });
    cells.push({ x: mx + g / 2, y: my + g / 2, w: mx - g, h: my - g, i: 3 });
  } else { // hero
    cells.push({ x: 0, y: 0, w: W, h: artH, i: 0 });
  }
  return cells;
}

function drawPhoto(ctx, img, x, y, w, h, zoom, ox, oy) {
  if (!img) return false;
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  if (!iw || !ih) return false;
  const scale = Math.max(w / iw, h / ih) * zoom;
  const pw = iw * scale, ph = ih * scale;
  let dx = x + (w - pw) / 2 + ox * w;
  let dy = y + (h - ph) / 2 + oy * h;
  // Never leave a gap: clamp so the photo always covers the whole cell.
  // (A crop offset must not push the photo off the cell when it exactly fits,
  // e.g. a wide panel at 1920x1080.)
  dx = Math.min(dx, x);
  dx = Math.max(dx, x + w - pw);
  dy = Math.min(dy, y);
  dy = Math.max(dy, y + h - ph);
  ctx.drawImage(img, dx, dy, pw, ph);
  return true;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitFont(ctx, text, maxW, start, family, weight = 400) {
  let size = start;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > maxW && size > 8) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/** Draws the whole cover onto ctx at W x H. Returns the panel cells (for hit-testing). */
export function drawCover(ctx, W, H, state) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  // Sky background
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, grade.sky[0]); sky.addColorStop(0.55, grade.sky[1]); sky.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const cells = layoutCells(state.layout, W, H);
  const artH = H * 0.74;
  const font = '"Anton","Arial Narrow",Impact,sans-serif';

  for (const c of cells) {
    const p = state.panels[c.i];
    ctx.save();
    if (c.poly) {
      ctx.beginPath();
      ctx.moveTo(c.poly[0][0], c.poly[0][1]);
      for (let k = 1; k < c.poly.length; k++) ctx.lineTo(c.poly[k][0], c.poly[k][1]);
      ctx.closePath(); ctx.clip();
    } else {
      ctx.beginPath(); ctx.rect(c.x, c.y, c.w, c.h); ctx.clip();
    }
    const drawn = p && p.img ? drawPhoto(ctx, p.img, c.x, c.y, c.w, c.h, p.zoom || 1, p.ox || 0, p.oy || 0) : false;
    if (!drawn) { // empty panel placeholder: grade-tinted panel with palm glyph
      const g2 = ctx.createLinearGradient(c.x, c.y, c.x, c.y + c.h);
      g2.addColorStop(0, grade.sky[1]); g2.addColorStop(1, grade.sky[0]);
      ctx.fillStyle = g2; ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = `${Math.max(14, c.w * 0.16)}px ${font}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('★', c.x + c.w / 2, c.y + c.h / 2 - c.h * 0.08);
      ctx.font = `bold ${Math.max(9, c.w * 0.045)}px system-ui, sans-serif`;
      ctx.fillText('ADD PHOTO', c.x + c.w / 2, c.y + c.h / 2 + c.h * 0.08);
    }
    // Grade tint + bottom shade
    ctx.fillStyle = grade.tint;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    const shade = ctx.createLinearGradient(0, c.y + c.h * 0.55, 0, c.y + c.h);
    shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = shade; ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.restore();

    // Frame: white inner line + black outline
    ctx.save();
    if (c.poly) {
      ctx.beginPath();
      ctx.moveTo(c.poly[0][0], c.poly[0][1]);
      for (let k = 1; k < c.poly.length; k++) ctx.lineTo(c.poly[k][0], c.poly[k][1]);
      ctx.closePath();
    } else ctx.rect(c.x, c.y, c.w, c.h);
    ctx.lineWidth = Math.max(2, W * 0.004); ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.lineWidth = Math.max(1, W * 0.002); ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.stroke();
    ctx.restore();

    // Role tag
    const role = CALLOUTS[c.i] || '';
    if (role) {
      const fs = Math.max(9, Math.min(20, W * 0.011));
      ctx.font = `bold ${fs}px system-ui, sans-serif`;
      const tw = ctx.measureText(role).width;
      const bx = c.x + Math.max(4, W * 0.006), by = c.y + c.h - fs - Math.max(8, W * 0.012);
      ctx.fillStyle = 'rgba(10,5,20,0.85)';
      roundRect(ctx, bx, by, tw + fs * 1.1, fs * 1.7, fs * 0.4); ctx.fill();
      ctx.fillStyle = grade.accent === '#ffffff' ? '#fff' : '#ffd166';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(role, bx + fs * 0.55, by + fs * 0.88);
    }
    // Selected panel highlight (editor only, drawn by main.js via state._selectedFlash)
    if (state.selected === c.i && state.showSelection) {
      ctx.save();
      ctx.lineWidth = Math.max(3, W * 0.006); ctx.strokeStyle = '#ffd166';
      ctx.setLineDash([W * 0.02, W * 0.01]);
      ctx.strokeRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4);
      ctx.restore();
    }
  }

  // Callout leader lines (top corners)
  if (state.furniture.callouts && state.layout === 'grid9') {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.fillStyle = '#fff';
    ctx.lineWidth = Math.max(1.5, W * 0.002);
    ctx.font = `bold ${Math.max(10, W * 0.012)}px system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    const callL = (x, y, tx, text) => {
      ctx.textAlign = 'left';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx - 14, y); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
      ctx.fillText(text, tx, y);
    };
    const callR = (x, y, tx, text) => { // text right-aligned, clear of the seal
      ctx.textAlign = 'right';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx + 14, y); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
      ctx.fillText(text, tx, y);
    };
    callL(W * 0.06, artH * 0.10, W * 0.10, 'VICE BEACH');
    callR(W * 0.94, artH * 0.10, W * 0.84, 'VICE CITY');
    ctx.restore();
  }

  // --- Title band ---
  const bandY = artH, bandH = H - artH;
  const bandGrad = ctx.createLinearGradient(0, bandY, 0, H);
  bandGrad.addColorStop(0, 'rgba(10,4,20,0.92)'); bandGrad.addColorStop(1, 'rgba(10,4,20,1)');
  ctx.fillStyle = bandGrad; ctx.fillRect(0, bandY, W, bandH);
  ctx.fillStyle = grade.accent; ctx.fillRect(0, bandY, W, Math.max(3, H * 0.006));

  // Star strip
  if (state.furniture.stars) {
    ctx.fillStyle = '#ffd166';
    ctx.font = `${Math.max(12, W * 0.016)}px ${font}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('★ ★ ★ ★ ★', W / 2, bandY + bandH * 0.09);
  }
  // Subtitle
  const subY = bandY + bandH * (state.furniture.stars ? 0.22 : 0.14);
  ctx.fillStyle = '#ffffff';
  const subSize = fitFont(ctx, (state.subtitle || '').toUpperCase(), W * 0.8, Math.max(11, W * 0.018), 'system-ui, sans-serif', 700);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText((state.subtitle || '').toUpperCase(), W / 2, subY);

  // Big gradient title with black outline + drop shadow
  const title = (state.title || 'VICE HEAT').toUpperCase();
  const titleSize = fitFont(ctx, title, W * 0.94, H * 0.10, font);
  const titleY = bandY + bandH * 0.52;
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${titleSize}px ${font}`;
  ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = titleSize * 0.18; ctx.shadowOffsetY = titleSize * 0.05;
  const tg = ctx.createLinearGradient(0, titleY - titleSize * 0.5, 0, titleY + titleSize * 0.5);
  tg.addColorStop(0, grade.title[0]); tg.addColorStop(1, grade.title[1]);
  ctx.lineWidth = Math.max(3, titleSize * 0.09); ctx.strokeStyle = '#12061f'; ctx.lineJoin = 'round';
  ctx.strokeText(title, W / 2, titleY);
  ctx.fillStyle = tg; ctx.fillText(title, W / 2, titleY);
  ctx.restore();

  // Tagline + quote, on separate lines
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  const tagSize = fitFont(ctx, state.tagline || '', W * 0.86, Math.max(10, W * 0.016), 'Georgia, serif', 400);
  ctx.font = `italic ${tagSize}px Georgia, serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(state.tagline || '', W / 2, bandY + bandH * 0.78);

  if (state.quote) {
    ctx.fillStyle = 'rgba(255,209,102,0.95)';
    const qSize = fitFont(ctx, state.quote, W * 0.8, Math.max(9, W * 0.013), 'Georgia, serif', 400);
    ctx.font = `italic ${qSize}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillText(state.quote, W / 2, bandY + bandH * 0.90);
  }

  // Billing block (fake credits, tiny)
  if (state.furniture.billing) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `${Math.max(7, W * 0.0075)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('LEONIDA PICTURES  •  A VICE HEAT PRODUCTION  •  STARRING THE DUO  •  MUSIC BY NEON COAST  •  FILMED IN VICE CITY, LEONIDA', W / 2, H - Math.max(6, H * 0.008));
  }

  // Seal stamp (top-right of art area)
  if (state.furniture.seal) {
    const sx = W - W * 0.075, sy = artH * 0.22, sr = Math.max(26, W * 0.045);
    ctx.save();
    ctx.translate(sx, sy); ctx.rotate(-0.22);
    ctx.beginPath(); ctx.arc(0, 0, sr, 0, 7);
    ctx.fillStyle = 'rgba(255,46,136,0.92)'; ctx.fill();
    ctx.lineWidth = Math.max(2, sr * 0.07); ctx.strokeStyle = '#ffd166'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, sr * 0.78, 0, 7); ctx.strokeStyle = 'rgba(255,209,102,0.9)'; ctx.lineWidth = Math.max(1, sr * 0.04); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${sr * 0.34}px ${font}`;
    ctx.fillText('LEONIDA', 0, -sr * 0.22);
    ctx.font = `bold ${sr * 0.26}px system-ui, sans-serif`;
    ctx.fillText('★ EST. 2026 ★', 0, sr * 0.28);
    ctx.restore();
  }
  return cells;
}
