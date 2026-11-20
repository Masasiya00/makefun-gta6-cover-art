// VICE HEAT: Leonida Cover Studio — editor.
// Wires the controls in index.html to the renderer in cover.js, handles uploads,
// drag-crop / zoom per panel, editable role tags, Shuffle / Reset and 1-click
// export in 4 post sizes. Also serves the ?shot=cover / ?shot=editor modes the
// screenshot maker uses: in cover mode the page is just the cover, fullscreen.
import {
  SAMPLES, GRADES, GRADE_IDS, LAYOUTS, TITLES,
  layoutPanels, renderCover, clampCrop,
} from './cover.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const SHOT = params.get('shot') || '';

function defaultPanels() {
  return SAMPLES.map((s) => ({
    sampleId: s.id, img: null, crop: { zoom: 1, ox: 0, oy: 0 }, role: s.role,
  }));
}

const state = {
  layout: 'grid9',
  grade: 'sunset',
  intensity: 70,
  title: 'VICE HEAT',
  subtitle: 'LEONIDA',
  tagline: 'Welcome to Leonida',
  quote: '"Partners in crime."',
  titlePos: 'top',
  outline: true,
  outlineWidth: 6,
  shadow: 12,
  panels: defaultPanels(),
};

let selectedPanel = 0;
let laid = null; // last layout result for the preview canvas
let previewScale = 1; // preview-canvas px per cover px
const canvas = $('cover');
const ctx = canvas.getContext('2d');

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function loadSamples() {
  const jobs = SAMPLES.map(async (s, i) => {
    const img = await loadImage(s.file);
    state.panels[i].img = img;
  });
  await Promise.all(jobs);
}

function applyShotParams() {
  const layout = params.get('layout');
  if (layout && LAYOUTS.some((l) => l.id === layout)) state.layout = layout;
  const photo = params.get('photo');
  if (photo) {
    const idx = SAMPLES.findIndex((s) => s.id === photo);
    if (idx >= 0) {
      // Rotate the sample order so the requested photo leads the cover.
      const order = SAMPLES.map((_, i) => (idx + i) % SAMPLES.length);
      state.panels = order.map((si, i) => ({
        sampleId: SAMPLES[si].id,
        img: state.panels[si] ? state.panels[si].img : null,
        crop: { zoom: 1, ox: 0, oy: 0 },
        role: SAMPLES[si].role,
      }));
    }
  }
  const caption = params.get('caption');
  if (caption) state.title = caption;
  const grade = params.get('grade');
  if (grade && GRADES[grade]) state.grade = grade;
}

// Render the preview (editor) or the fullscreen cover (shot mode).
function render() {
  if (SHOT === 'cover') {
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    previewScale = 1;
    laid = renderCover(ctx, w, h, state);
  } else {
    canvas.width = 1080;
    canvas.height = 1080;
    previewScale = canvas.width / 1080;
    laid = renderCover(ctx, 1080, 1080, state);
  }
  drawSelection();
}

function drawSelection() {
  if (SHOT === 'cover' || !laid) return;
  const p = laid.panels[selectedPanel];
  if (!p) return;
  ctx.save();
  ctx.strokeStyle = '#ffd319';
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 8]);
  ctx.strokeRect(p.x + 2, p.y + 2, p.w - 4, p.h - 4);
  ctx.restore();
}

// ---- controls ----
function buildLayoutButtons() {
  const box = $('layoutBtns');
  box.innerHTML = '';
  for (const l of LAYOUTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = l.name;
    b.dataset.layout = l.id;
    b.className = 'pill' + (state.layout === l.id ? ' active' : '');
    b.addEventListener('click', () => {
      state.layout = l.id;
      buildLayoutButtons();
      render();
    });
    box.appendChild(b);
  }
}

function buildGradeButtons() {
  const box = $('gradeBtns');
  box.innerHTML = '';
  for (const id of GRADE_IDS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = GRADES[id].name;
    b.dataset.grade = id;
    b.className = 'pill' + (state.grade === id ? ' active' : '');
    b.addEventListener('click', () => {
      state.grade = id;
      buildGradeButtons();
      render();
    });
    box.appendChild(b);
  }
}

function buildPanelList() {
  const list = $('panelList');
  list.innerHTML = '';
  state.panels.forEach((panel, i) => {
    const row = document.createElement('div');
    row.className = 'panel-row' + (selectedPanel === i ? ' selected' : '');
    row.addEventListener('click', () => { selectedPanel = i; buildPanelList(); render(); });

    const thumb = document.createElement('img');
    thumb.className = 'thumb';
    thumb.alt = SAMPLES.find((s) => s.id === panel.sampleId)?.label || 'panel';
    thumb.src = panel.img ? panel.img.src : '';
    row.appendChild(thumb);

    const meta = document.createElement('div');
    meta.className = 'panel-meta';
    const name = document.createElement('div');
    name.className = 'panel-name';
    name.textContent = `${i + 1}. ${SAMPLES.find((s) => s.id === panel.sampleId)?.label || 'Photo'}`;
    meta.appendChild(name);

    // Role tag: click the label -> a floating input appears -> Enter saves.
    const roleBtn = document.createElement('button');
    roleBtn.type = 'button';
    roleBtn.className = 'role-tag';
    roleBtn.textContent = panel.role;
    roleBtn.title = 'Click to edit the role tag';
    roleBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      openRoleEditor(roleBtn, i);
    });
    meta.appendChild(roleBtn);
    row.appendChild(meta);

    const up = document.createElement('label');
    up.className = 'upload-btn';
    up.textContent = 'Upload';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.className = 'panel-upload';
    input.dataset.panel = String(i);
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      if (img) {
        state.panels[i].img = img;
        state.panels[i].sampleId = 'custom';
        state.panels[i].crop = { zoom: 1, ox: 0, oy: 0 };
        selectedPanel = i;
        buildPanelList();
        render();
      }
    });
    up.appendChild(input);
    row.appendChild(up);
    list.appendChild(row);
  });
}

// Floating role-tag editor: an input placed over the label; Enter saves.
function openRoleEditor(anchor, index) {
  closeRoleEditor(true);
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'role-input';
  input.value = state.panels[index].role;
  input.maxLength = 28;
  input.setAttribute('data-role-editor', '1');
  anchor.replaceWith(input);
  input.focus();
  input.select();
  let saved = false;
  const save = () => {
    if (saved) return; // Enter fires save, then blur fires again on removal.
    saved = true;
    const v = input.value.trim().toUpperCase();
    if (v) state.panels[index].role = v;
    closeRoleEditor(false);
    buildPanelList();
    render();
  };
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') save();
    if (ev.key === 'Escape') { closeRoleEditor(false); buildPanelList(); render(); }
    ev.stopPropagation();
  });
  input.addEventListener('blur', save);
}

function closeRoleEditor(cancel) {
  const old = document.querySelector('[data-role-editor]');
  if (old && cancel) old.remove();
}

function syncControlValues() {
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('taglineInput').value = state.tagline;
  $('quoteInput').value = state.quote;
  $('titlePos').value = state.titlePos;
  $('outlineToggle').checked = state.outline;
  $('outlineWidth').value = String(state.outlineWidth);
  $('outlineWidthVal').textContent = `${state.outlineWidth}px`;
  $('shadowRange').value = String(state.shadow);
  $('shadowVal').textContent = `${state.shadow}px`;
  $('intensity').value = String(state.intensity);
  $('intensityVal').textContent = `${state.intensity}%`;
  $('outlineWidth').disabled = !state.outline;
}

// ---- drag crop / zoom on the preview canvas ----
function canvasPoint(ev) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((ev.clientX - r.left) / r.width) * canvas.width,
    y: ((ev.clientY - r.top) / r.height) * canvas.height,
  };
}

function hitPanel(pt) {
  if (!laid) return -1;
  for (let i = laid.panels.length - 1; i >= 0; i--) {
    const p = laid.panels[i];
    if (pt.x >= p.x && pt.x <= p.x + p.w && pt.y >= p.y && pt.y <= p.y + p.h) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (ev) => {
  if (SHOT === 'cover') return;
  const pt = canvasPoint(ev);
  const i = hitPanel(pt);
  if (i < 0) return;
  selectedPanel = i;
  buildPanelList();
  const panel = state.panels[i];
  drag = { index: i, startX: pt.x, startY: pt.y, ox: panel.crop.ox, oy: panel.crop.oy };
  canvas.setPointerCapture(ev.pointerId);
  render();
});
canvas.addEventListener('pointermove', (ev) => {
  if (!drag) return;
  const pt = canvasPoint(ev);
  const panel = state.panels[drag.index];
  const img = panel.img;
  const laidPanel = laid.panels[drag.index];
  if (!img || !laidPanel) return;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const next = clampCrop(iw, ih, laidPanel.w, laidPanel.h, {
    zoom: panel.crop.zoom,
    ox: drag.ox + (pt.x - drag.startX),
    oy: drag.oy + (pt.y - drag.startY),
  });
  panel.crop = next;
  render();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointercancel', () => { drag = null; });
canvas.addEventListener('wheel', (ev) => {
  if (SHOT === 'cover') return;
  ev.preventDefault();
  const pt = canvasPoint(ev);
  const i = hitPanel(pt);
  if (i < 0) return;
  const panel = state.panels[i];
  const img = panel.img;
  const laidPanel = laid.panels[i];
  if (!img || !laidPanel) return;
  const zoom = Math.max(1, Math.min(4, panel.crop.zoom * Math.pow(1.0015, -ev.deltaY)));
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  panel.crop = clampCrop(iw, ih, laidPanel.w, laidPanel.h, { zoom, ox: panel.crop.ox, oy: panel.crop.oy });
  selectedPanel = i;
  buildPanelList();
  render();
}, { passive: false });

// ---- shuffle / reset ----
function shuffleAll() {
  const order = state.panels.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const shuffled = order.map((si) => ({
    sampleId: state.panels[si].sampleId,
    img: state.panels[si].img,
    crop: { zoom: 1, ox: 0, oy: 0 },
    role: state.panels[si].role,
  }));
  state.panels = shuffled;
  const grades = GRADE_IDS.filter((g) => g !== state.grade);
  state.grade = grades[Math.floor(Math.random() * grades.length)];
  const titles = TITLES.filter((t) => t !== state.title);
  state.title = titles[Math.floor(Math.random() * titles.length)];
  buildGradeButtons();
  buildPanelList();
  syncControlValues();
  render();
}

function resetAll() {
  const keepImgs = state.panels.map((p) => p.img);
  state.layout = 'grid9';
  state.grade = 'sunset';
  state.intensity = 70;
  state.title = 'VICE HEAT';
  state.subtitle = 'LEONIDA';
  state.tagline = 'Welcome to Leonida';
  state.quote = '"Partners in crime."';
  state.titlePos = 'top';
  state.outline = true;
  state.outlineWidth = 6;
  state.shadow = 12;
  state.panels = defaultPanels();
  state.panels.forEach((p, i) => { p.img = keepImgs[i]; });
  selectedPanel = 0;
  buildLayoutButtons();
  buildGradeButtons();
  buildPanelList();
  syncControlValues();
  render();
}

// ---- export ----
export function exportCover(w, h) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const octx = off.getContext('2d');
  renderCover(octx, w, h, state);
  return off;
}

function downloadExport(w, h) {
  const off = exportCover(w, h);
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-heat-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

function wireControls() {
  $('titleInput').addEventListener('input', (e) => { state.title = e.target.value; render(); });
  $('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; render(); });
  $('taglineInput').addEventListener('input', (e) => { state.tagline = e.target.value; render(); });
  $('quoteInput').addEventListener('input', (e) => { state.quote = e.target.value; render(); });
  $('titlePos').addEventListener('change', (e) => { state.titlePos = e.target.value; render(); });
  $('outlineToggle').addEventListener('change', (e) => {
    state.outline = e.target.checked;
    $('outlineWidth').disabled = !state.outline;
    render();
  });
  $('outlineWidth').addEventListener('input', (e) => {
    state.outlineWidth = Number(e.target.value);
    $('outlineWidthVal').textContent = `${state.outlineWidth}px`;
    render();
  });
  $('shadowRange').addEventListener('input', (e) => {
    state.shadow = Number(e.target.value);
    $('shadowVal').textContent = `${state.shadow}px`;
    render();
  });
  $('intensity').addEventListener('input', (e) => {
    state.intensity = Number(e.target.value);
    $('intensityVal').textContent = `${state.intensity}%`;
    render();
  });
  $('shuffleBtn').addEventListener('click', shuffleAll);
  $('resetBtn').addEventListener('click', resetAll);
  document.querySelectorAll('[data-export]').forEach((b) => {
    b.addEventListener('click', () => {
      const [w, h] = b.dataset.export.split('x').map(Number);
      downloadExport(w, h);
    });
  });
}

// Test / screenshot hook: the playtest and shots.js drive the app through this.
window.__viceHeat = {
  get state() { return state; },
  get laid() { return laid; },
  get ready() { return Boolean(window.__viceHeatReady); },
  render,
  shuffleAll,
  resetAll,
  exportCover,
  setLayout(id) { state.layout = id; buildLayoutButtons(); render(); },
  setGrade(id) { state.grade = id; buildGradeButtons(); render(); },
  setIntensity(v) { state.intensity = v; syncControlValues(); render(); },
};

async function init() {
  await loadSamples();
  applyShotParams();
  if (SHOT === 'cover') document.body.classList.add('shot-cover');
  if (document.fonts) {
    try {
      await document.fonts.load('80px Anton');
      await document.fonts.ready;
    } catch (e) { /* Anton falls back to Arial Black; still renders */ }
  }
  if (SHOT !== 'cover') {
    buildLayoutButtons();
    buildGradeButtons();
    buildPanelList();
    syncControlValues();
    wireControls();
  }
  render();
  window.__viceHeatReady = true;
}

init();
