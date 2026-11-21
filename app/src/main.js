// main.js — editor UI for VICE HEAT: Leonida Cover Studio.
// Wires the controls, the live canvas preview, per-panel upload + drag
// crop/zoom, editable role tags, shuffle, reset and one-click PNG export.
// Chip geometry comes ONLY from cover.js (chipRect / chipAt) — this file
// never recomputes a chip rect with its own formula.

import {
  LAYOUTS, GRADES, SHUFFLE_TITLES, PHOTO_NAMES, SAMPLE_FILES,
  defaultState, defaultPanels, drawCover, chipAt,
  loadSampleImages, titleFontSize, layoutPanels, panelZone,
} from './cover.js';

const state = defaultState();
state.previewW = 900;
state.previewH = 900;

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const editor = document.getElementById('editor');
const tagEditor = document.getElementById('tag-editor');
const tagInput = document.getElementById('tag-input');
const panelList = document.getElementById('panel-list');

let images = {};
let selectedPanel = 0;
let drag = null; // { panel, lastX, lastY }
let uploadCount = 0;

function render() {
  canvas.width = state.previewW;
  canvas.height = state.previewH;
  drawCover(ctx, state, images, state.previewW, state.previewH);
  buildPanelList();
}

// Fit the canvas CSS box into its container; the backing store (previewW/H)
// is untouched — only the displayed size changes.
function fitStage() {
  const wrap = document.getElementById('stage-wrap');
  if (!wrap) return;
  const availW = wrap.clientWidth;
  const availH = wrap.clientHeight || window.innerHeight * 0.7;
  const scale = Math.min(availW / state.previewW, availH / state.previewH, 1);
  canvas.style.width = `${Math.floor(state.previewW * scale)}px`;
  canvas.style.height = `${Math.floor(state.previewH * scale)}px`;
}

// Live scale from the canvas on screen right now — never a stored
// previewScale variable, which goes stale the moment the window resizes.
function liveScale() {
  const rect = canvas.getBoundingClientRect();
  return { sx: rect.width / canvas.width, sy: rect.height / canvas.height, rect };
}

function canvasPoint(ev) {
  const { sx, sy, rect } = liveScale();
  return { x: (ev.clientX - rect.left) / sx, y: (ev.clientY - rect.top) / sy };
}

function openTagEditor(chip) {
  // setTimeout 0: a mousedown blur closes the floating editor ~2ms after
  // it opens if we show it synchronously — deferring dodges that race.
  setTimeout(() => {
    const { sx, sy, rect } = liveScale();
    tagEditor.style.display = 'block';
    tagEditor.style.left = `${rect.left + chip.x * sx}px`;
    tagEditor.style.top = `${rect.top + chip.y * sy}px`;
    tagEditor.style.width = `${Math.max(90, chip.w * sx)}px`;
    tagInput.value = chip.label;
    tagInput.dataset.panel = String(chip.panel);
    tagInput.focus();
    tagInput.select();
  }, 0);
}

function closeTagEditor(save) {
  if (tagEditor.style.display === 'none') return;
  if (save) {
    const i = Number(tagInput.dataset.panel || 0);
    const value = tagInput.value.trim().toUpperCase().slice(0, 24) || 'UNTITLED';
    if (state.panels[i]) state.panels[i].tag = value;
  }
  tagEditor.style.display = 'none';
  render();
}

tagInput.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') { ev.preventDefault(); closeTagEditor(true); }
  if (ev.key === 'Escape') closeTagEditor(false);
  ev.stopPropagation();
});
tagInput.addEventListener('blur', () => closeTagEditor(true));

canvas.addEventListener('mousedown', (ev) => {
  const p = canvasPoint(ev);
  const hit = chipAt(state, canvas.width, canvas.height, p.x, p.y);
  if (hit) {
    selectedPanel = hit.panel;
    openTagEditor(hit);
    return;
  }
  // Select the panel under the cursor and start a drag-pan of its crop.
  selectedPanel = panelIndexAt(p.x, p.y);
  drag = { panel: selectedPanel, lastX: ev.clientX, lastY: ev.clientY };
  render();
});

canvas.addEventListener('mousemove', (ev) => {
  if (!drag) return;
  const panel = state.panels[drag.panel];
  if (!panel) return;
  const { sx, sy } = liveScale();
  const dx = (ev.clientX - drag.lastX) / sx;
  const dy = (ev.clientY - drag.lastY) / sy;
  // Pan the crop; drawPhotoCover clamps it so the photo always covers.
  panel.crop.x = (panel.crop.x ?? 0.5) - dx / canvas.width;
  panel.crop.y = (panel.crop.y ?? 0.5) - dy / canvas.height;
  drag.lastX = ev.clientX;
  drag.lastY = ev.clientY;
  render();
});

window.addEventListener('mouseup', () => { drag = null; });

canvas.addEventListener('wheel', (ev) => {
  ev.preventDefault();
  const panel = state.panels[selectedPanel];
  if (!panel) return;
  const factor = ev.deltaY < 0 ? 1.1 : 1 / 1.1;
  panel.crop.zoom = Math.max(1, Math.min(4, (panel.crop.zoom || 1) * factor));
  render();
}, { passive: false });

function panelIndexAt(px, py) {
  // True point-in-panel test against the layout rects from cover.js.
  const zone = panelZone(state, canvas.width, canvas.height);
  const rects = layoutPanels(state.layout, zone);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return 0;
}

function buildPanelList() {
  panelList.innerHTML = '';
  state.panels.forEach((panel, i) => {
    const row = document.createElement('div');
    row.className = 'panel-row' + (i === selectedPanel ? ' selected' : '');
    const thumb = document.createElement('span');
    thumb.className = 'panel-thumb';
    thumb.textContent = String(i + 1);
    const name = document.createElement('span');
    name.className = 'panel-name';
    name.textContent = `${panel.tag} — ${panel.photo}`;
    const pick = document.createElement('select');
    pick.className = 'panel-photo';
    pick.setAttribute('aria-label', `Photo for panel ${i + 1}`);
    PHOTO_NAMES.forEach((n) => {
      const opt = document.createElement('option');
      opt.value = n;
      opt.textContent = n;
      if (n === panel.photo) opt.selected = true;
      pick.appendChild(opt);
    });
    // Uploaded photos appear as extra options once loaded.
    Object.keys(images).filter((k) => k.startsWith('up')).forEach((k) => {
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = `upload ${k.slice(2)}`;
      if (k === panel.photo) opt.selected = true;
      pick.appendChild(opt);
    });
    pick.addEventListener('change', () => {
      panel.photo = pick.value;
      render();
    });
    row.addEventListener('click', () => { selectedPanel = i; render(); });
    row.append(thumb, name, pick);
    panelList.appendChild(row);
  });
}

// ---- Controls ----
function bindControls() {
  const layoutBar = document.getElementById('layout-bar');
  Object.entries(LAYOUTS).forEach(([key, def]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'layout-btn' + (key === state.layout ? ' active' : '');
    btn.textContent = def.label;
    btn.addEventListener('click', () => {
      state.layout = key;
      state.panels = defaultPanels(key);
      selectedPanel = 0;
      document.querySelectorAll('.layout-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      render();
    });
    layoutBar.appendChild(btn);
  });

  const gradeSel = document.getElementById('grade');
  Object.entries(GRADES).forEach(([key, def]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = def.label;
    gradeSel.appendChild(opt);
  });
  gradeSel.value = state.grade;
  gradeSel.addEventListener('change', () => { state.grade = gradeSel.value; render(); });

  const intensity = document.getElementById('grade-intensity');
  intensity.value = String(state.gradeIntensity);
  intensity.addEventListener('input', () => {
    state.gradeIntensity = Number(intensity.value);
    document.getElementById('grade-intensity-val').textContent = `${intensity.value}%`;
    render();
  });

  const titleInput = document.getElementById('title-input');
  titleInput.value = state.title;
  titleInput.addEventListener('input', () => { state.title = titleInput.value || 'VICE HEAT'; render(); });

  const posSel = document.getElementById('title-pos');
  posSel.value = state.titlePos;
  posSel.addEventListener('change', () => { state.titlePos = posSel.value; render(); });

  const outlineChk = document.getElementById('title-outline');
  outlineChk.checked = state.titleOutline;
  outlineChk.addEventListener('change', () => { state.titleOutline = outlineChk.checked; render(); });

  const outlineW = document.getElementById('outline-width');
  outlineW.value = String(state.outlineWidth);
  outlineW.addEventListener('input', () => { state.outlineWidth = Number(outlineW.value); render(); });

  const shadow = document.getElementById('title-shadow');
  shadow.value = String(state.titleShadow);
  shadow.addEventListener('input', () => { state.titleShadow = Number(shadow.value); render(); });

  document.getElementById('shuffle').addEventListener('click', () => {
    const photos = [...PHOTO_NAMES].sort(() => Math.random() - 0.5);
    state.panels.forEach((panel, i) => { panel.photo = photos[i % photos.length]; });
    const gradeKeys = Object.keys(GRADES);
    state.grade = gradeKeys[Math.floor(Math.random() * gradeKeys.length)];
    gradeSel.value = state.grade;
    state.title = SHUFFLE_TITLES[Math.floor(Math.random() * SHUFFLE_TITLES.length)];
    titleInput.value = state.title;
    render();
  });

  document.getElementById('reset').addEventListener('click', () => {
    const fresh = defaultState();
    Object.assign(state, fresh);
    state.previewW = 900;
    state.previewH = 900;
    selectedPanel = 0;
    titleInput.value = state.title;
    gradeSel.value = state.grade;
    intensity.value = String(state.gradeIntensity);
    posSel.value = state.titlePos;
    document.querySelectorAll('.layout-btn').forEach((b) => b.classList.toggle('active', b.textContent === LAYOUTS[state.layout].label));
    render();
    fitStage();
  });

  document.getElementById('upload-btn').addEventListener('click', () => {
    document.getElementById('upload-input').click();
  });
  document.getElementById('upload-input').addEventListener('change', (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const key = `up${++uploadCount}`;
    const img = new Image();
    img.onload = () => {
      images[key] = img;
      const panel = state.panels[selectedPanel];
      if (panel) { panel.photo = key; panel.crop = { x: 0.5, y: 0.5, zoom: 1 }; }
      render();
    };
    img.src = url;
    ev.target.value = '';
  });

  document.getElementById('export-btn').addEventListener('click', () => {
    const sizeSel = document.getElementById('export-size');
    const [w, h] = sizeSel.value.split('x').map(Number);
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    drawCover(off.getContext('2d'), state, images, w, h);
    off.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-heat-${w}x${h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }, 'image/png');
  });
}

// ---- Screenshot mode (used by shots.js) ----
// FIX (R7 defect 1): NEVER set editor.style.display = 'none' here — hiding
// the editor made cover screenshots render as one blank colour. For a
// cover shot we only add the shot-mode class (CSS hides the chrome) and
// size the preview to the live viewport BEFORE fitStage. For an editor
// shot we add no shot-mode class at all, so the controls stay visible.
export function applyShotParams(shot) {
  const s = shot || {};
  if (s.layout && LAYOUTS[s.layout]) {
    state.layout = s.layout;
    state.panels = defaultPanels(s.layout);
  }
  if (s.grade && GRADES[s.grade]) state.grade = s.grade;
  if (typeof s.gradeIntensity === 'number') state.gradeIntensity = s.gradeIntensity;
  if (typeof s.title === 'string' && s.title) state.title = s.title;
  if (s.titlePos) state.titlePos = s.titlePos;
  const isCover = s.kind === 'cover' || String(s.id || '').includes('cover');
  if (isCover) {
    document.body.classList.add('shot-mode');
    state.previewW = window.innerWidth;
    state.previewH = window.innerHeight;
    fitStage();
  } else {
    document.body.classList.remove('shot-mode');
  }
  render();
  return state;
}

window.VICEHEAT = { state, applyShotParams, render, fitStage, titleFontSize, SAMPLE_FILES };

bindControls();
loadSampleImages().then((loaded) => { images = loaded; render(); fitStage(); });
window.addEventListener('resize', fitStage);
render();
fitStage();
