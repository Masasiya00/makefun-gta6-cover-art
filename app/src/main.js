// VICE HEAT: Leonida Cover Studio — editor wiring.
// Pick a layout + grade, load photos into panels (upload / drag-drop / samples),
// drag to crop, edit the lettering, export PNG in 3 sizes. Fully offline.
import { drawCover, defaultState, SAMPLES, GRADES, LAYOUTS, layoutCells } from './cover.js';
import { applyShotParams, markShotReady } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const state = defaultState();
state.showSelection = true;
let cells = [];
let drag = null; // {x,y,ox,oy}

// Screenshot mode (?shot=cover|editor&layout=&grade=&caption=...): apply params first.
const shotParams = applyShotParams();
if (shotParams) {
  if (shotParams.layout && LAYOUTS[shotParams.layout]) state.layout = shotParams.layout;
  if (shotParams.grade && GRADES[shotParams.grade]) state.grade = shotParams.grade;
  if (shotParams.title) state.title = shotParams.title;
  if (shotParams.subtitle) state.subtitle = shotParams.subtitle;
  if (shotParams.tagline) state.tagline = shotParams.tagline;
  if (shotParams.shot === 'cover') {
    state.showSelection = false;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadSamples() {
  await Promise.all(SAMPLES.map(async (s) => {
    try { s.img = await loadImage(s.file); } catch { s.img = null; }
  }));
  for (let i = 0; i < state.panels.length; i++) {
    const s = SAMPLES.find((x) => x.id === state.panels[i].sample);
    if (s) state.panels[i].img = s.img;
  }
}

function redraw() {
  cells = drawCover(canvas.getContext('2d'), canvas.width, canvas.height, state);
  $('selLabel').textContent = `Panel ${state.selected + 1} — ${SAMPLES.find((s) => s.id === state.panels[state.selected].sample)?.label ?? 'empty'}`;
  $('zoom').value = state.panels[state.selected].zoom || 1;
  document.querySelectorAll('#samples img').forEach((el) => {
    el.classList.toggle('active', el.dataset.sample === state.panels[state.selected].sample);
  });
}

function setAspect(w, h) {
  canvas.width = w; canvas.height = h;
  document.querySelectorAll('[data-aspect]').forEach((b) => b.classList.toggle('active', +b.dataset.w === w && +b.dataset.h === h));
  redraw();
}

function buildControls() {
  // Layouts
  const lay = $('layouts');
  for (const [key, v] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = v.name; b.dataset.layout = key;
    b.onclick = () => {
      state.layout = key;
      document.querySelectorAll('#layouts button').forEach((x) => x.classList.toggle('active', x === b));
      redraw();
    };
    if (key === state.layout) b.classList.add('active');
    lay.appendChild(b);
  }
  // Grades
  const gr = $('grades');
  for (const [key, v] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = v.name; b.dataset.grade = key;
    b.style.background = `linear-gradient(135deg, ${v.sky[1]}, ${v.sky[2]})`;
    b.onclick = () => {
      state.grade = key;
      document.querySelectorAll('#grades button').forEach((x) => x.classList.toggle('active', x === b));
      redraw();
    };
    if (key === state.grade) b.classList.add('active');
    gr.appendChild(b);
  }
  // Samples
  const sm = $('samples');
  for (const s of SAMPLES) {
    const img = document.createElement('img');
    img.src = s.file; img.alt = s.label; img.title = s.label; img.dataset.sample = s.id;
    img.onclick = () => {
      const p = state.panels[state.selected];
      p.sample = s.id; p.img = s.img || null; p.zoom = 1; p.ox = 0; p.oy = 0;
      redraw();
    };
    sm.appendChild(img);
  }
  // Furniture toggles
  for (const [key, label] of [['seal', 'Seal stamp'], ['billing', 'Billing block'], ['stars', 'Star strip'], ['callouts', 'Callout lines']]) {
    const lab = document.createElement('label');
    lab.className = 'check';
    lab.innerHTML = `<input type="checkbox" ${state.furniture[key] ? 'checked' : ''}> ${label}`;
    lab.querySelector('input').onchange = (e) => { state.furniture[key] = e.target.checked; redraw(); };
    $('furniture').appendChild(lab);
  }
}

function exportPNG(w, h, name) {
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  const s2 = { ...state, showSelection: false };
  drawCover(off.getContext('2d'), w, h, s2);
  off.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    $('status').textContent = `Saved ${name} (${w}x${h})`;
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

function wire() {
  $('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
  $('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  $('tagline').addEventListener('input', (e) => { state.tagline = e.target.value; redraw(); });
  $('quote').addEventListener('input', (e) => { state.quote = e.target.value; redraw(); });
  $('zoom').addEventListener('input', (e) => {
    state.panels[state.selected].zoom = parseFloat(e.target.value);
    redraw();
  });
  $('resetCrop').onclick = () => {
    const p = state.panels[state.selected];
    p.zoom = 1; p.ox = 0; p.oy = 0; redraw();
  };
  $('upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const p = state.panels[state.selected];
    p.img = await loadImage(URL.createObjectURL(file));
    p.sample = null; p.zoom = 1; p.ox = 0; p.oy = 0;
    redraw();
    $('status').textContent = `Loaded ${file.name} into panel ${state.selected + 1}`;
  });
  $('exportAll').onclick = () => {
    exportPNG(1080, 1080, 'vice-heat-cover-1080x1080.png');
    exportPNG(1080, 1350, 'vice-heat-cover-1080x1350.png');
    exportPNG(1920, 1080, 'vice-heat-cover-1920x1080.png');
  };
  $('exportSquare').onclick = () => exportPNG(1080, 1080, 'vice-heat-cover-1080x1080.png');
  $('exportPortrait').onclick = () => exportPNG(1080, 1350, 'vice-heat-cover-1080x1350.png');
  $('exportWide').onclick = () => exportPNG(1920, 1080, 'vice-heat-cover-1920x1080.png');
  document.querySelectorAll('[data-aspect]').forEach((b) => {
    b.onclick = () => setAspect(+b.dataset.w, +b.dataset.h);
  });

  // Canvas: click a panel to select it, drag to crop/position the photo.
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
  };
  canvas.addEventListener('pointerdown', (e) => {
    const p = pos(e);
    const hit = cells.find((c) => p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h);
    if (!hit) return;
    state.selected = hit.i;
    const panel = state.panels[hit.i];
    drag = { x: p.x, y: p.y, ox: panel.ox || 0, oy: panel.oy || 0 };
    canvas.setPointerCapture(e.pointerId);
    redraw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = pos(e);
    const panel = state.panels[state.selected];
    panel.ox = drag.ox + (p.x - drag.x) / canvas.width;
    panel.oy = drag.oy + (p.y - drag.y) / canvas.height;
    redraw();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });

  // Drag-drop a photo file onto the canvas
  canvas.addEventListener('dragover', (e) => e.preventDefault());
  canvas.addEventListener('drop', async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const p = pos(e);
    const hit = cells.find((c) => p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h);
    const idx = hit ? hit.i : state.selected;
    const panel = state.panels[idx];
    panel.img = await loadImage(URL.createObjectURL(file));
    panel.sample = null; panel.zoom = 1; panel.ox = 0; panel.oy = 0;
    state.selected = idx;
    redraw();
  });
}

buildControls();
wire();
// Sync control inputs with shot params (so the editor screenshot shows the caption).
if (shotParams) {
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('tagline').value = state.tagline;
  $('quote').value = state.quote;
  document.querySelectorAll('#layouts button').forEach((x) => x.classList.toggle('active', x.dataset.layout === state.layout));
  document.querySelectorAll('#grades button').forEach((x) => x.classList.toggle('active', x.dataset.grade === state.grade));
}
await loadSamples();
redraw();
window.__appReady = true;
markShotReady();
