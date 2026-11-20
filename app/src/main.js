// VICE HEAT: Leonida Cover Studio — editor wiring.
// Builds the control panel, handles panel selection, drag-to-crop, zoom,
// editable role tags, shuffle, title controls and PNG export. All drawing
// goes through cover.js; this file only owns state, input and the DOM.

import {
  PANELS,
  LAYOUTS,
  GRADES,
  ALT_TITLES,
  EXPORT_SIZES,
  defaultState,
  panelDef,
  photoUrl,
  layoutPanels,
  drawCover,
  shuffleState,
} from './cover.js';
import { SHOTS } from './shots.js';

const $ = (sel) => document.querySelector(sel);
const canvas = $('#coverCanvas');
const ctx = canvas.getContext('2d');

let state = defaultState();
let selectedId = 'duo';
let images = new Map();
let geom = [];
let coverMode = false;
let dragging = null;

function selectedPanel() {
  return state.panels.find((p) => p.id === selectedId) ?? state.panels[0];
}

function loadImage(key) {
  if (images.has(key)) return Promise.resolve(images.get(key));
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      images.set(key, img);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = photoUrl(key);
  });
}

async function ensureImages() {
  const keys = [...new Set(state.panels.map((p) => p.photo))];
  await Promise.all(keys.map(loadImage));
}

function draw() {
  const W = canvas.width;
  const H = canvas.height;
  geom = drawCover(ctx, state, images, W, H);
  syncControls();
  return geom;
}

async function redraw() {
  await ensureImages();
  draw();
}

// Fit the visible canvas to its stage box in editor mode, or to the full
// viewport in cover mode (used for the exported-cover screenshots).
function fitCanvas() {
  if (coverMode) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
  } else {
    const stage = $('#stage');
    const box = stage.getBoundingClientRect();
    const side = Math.max(320, Math.floor(Math.min(box.width, box.height - 8)));
    canvas.width = 1080;
    canvas.height = 1080;
    canvas.style.width = `${side}px`;
    canvas.style.height = `${side}px`;
  }
}

function renderExport(w, h) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const octx = off.getContext('2d');
  drawCover(octx, state, images, w, h);
  return off;
}

function downloadCanvas(off, filename) {
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'vice-heat';
}

async function exportSize(size) {
  await ensureImages();
  const off = renderExport(size.w, size.h);
  downloadCanvas(off, `${slug(state.title)}-${size.w}x${size.h}.png`);
  setStatus(`Exported ${size.label} PNG — ${slug(state.title)}-${size.w}x${size.h}.png`);
}

async function exportAll() {
  for (const size of EXPORT_SIZES) {
    await exportSize(size);
    await new Promise((r) => setTimeout(r, 120));
  }
  setStatus(`Exported all 4 sizes: ${EXPORT_SIZES.map((s) => s.label).join(', ')}`);
}

function setStatus(msg) {
  const el = $('#statusLine');
  if (el) el.textContent = msg;
}

// ---- control panel -------------------------------------------------------

function buildButtons(container, entries, activeKey, onPick) {
  container.innerHTML = '';
  for (const [key, def] of Object.entries(entries)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick' + (key === activeKey ? ' active' : '');
    b.textContent = def.name;
    b.title = def.blurb ?? def.name;
    b.dataset.key = key;
    b.addEventListener('click', () => {
      onPick(key);
      redraw();
    });
    container.appendChild(b);
  }
}

function buildLayoutButtons() {
  buildButtons($('#layoutBtns'), LAYOUTS, state.layout, (key) => {
    state.layout = key;
    setStatus(`Layout: ${LAYOUTS[key].name}`);
  });
}

function buildGradeButtons() {
  buildButtons($('#gradeBtns'), GRADES, state.grade, (key) => {
    state.grade = key;
    setStatus(`Grade: ${GRADES[key].name} @ ${state.intensity}%`);
  });
}

function buildSampleGrid() {
  const grid = $('#sampleGrid');
  grid.innerHTML = '';
  for (const p of PANELS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.title = `${p.role} — ${p.note}`;
    const img = document.createElement('img');
    img.src = photoUrl(p.sample);
    img.alt = p.role;
    img.loading = 'lazy';
    const cap = document.createElement('span');
    cap.textContent = p.role;
    b.append(img, cap);
    b.addEventListener('click', () => {
      const panel = selectedPanel();
      panel.photo = p.sample;
      panel.panX = 0;
      panel.panY = 0;
      panel.zoom = 1;
      setStatus(`${panel.role}: foto diganti ke ${p.role}`);
      redraw();
    });
    grid.appendChild(b);
  }
}

function buildExportButtons() {
  const box = $('#exportBtns');
  box.innerHTML = '';
  for (const size of EXPORT_SIZES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'export-btn';
    b.textContent = `PNG ${size.label}`;
    b.addEventListener('click', () => exportSize(size));
    box.appendChild(b);
  }
}

function buildPresetSelect() {
  const sel = $('#presetSelect');
  sel.innerHTML = '<option value="">Preset screenshot…</option>';
  for (const shot of SHOTS) {
    const o = document.createElement('option');
    o.value = shot.file;
    o.textContent = `${shot.file} — ${shot.label}`;
    sel.appendChild(o);
  }
  sel.addEventListener('change', () => {
    const shot = SHOTS.find((s) => s.file === sel.value);
    if (!shot) return;
    applyParams(new URLSearchParams(shot.url.split('?')[1] ?? ''));
    redraw();
    setStatus(`Preset ${shot.file} diterapkan: ${shot.label}`);
  });
}

function syncControls() {
  const setActive = (container, key) => {
    container?.querySelectorAll('.pick').forEach((b) => b.classList.toggle('active', b.dataset.key === key));
  };
  setActive($('#layoutBtns'), state.layout);
  setActive($('#gradeBtns'), state.grade);
  const intensity = $('#intensityRange');
  if (intensity) intensity.value = String(state.intensity);
  const iv = $('#intensityVal');
  if (iv) iv.textContent = `${state.intensity}%`;
  const title = $('#titleInput');
  if (title && document.activeElement !== title) title.value = state.title;
  const posBtns = $('#titlePosBtns');
  posBtns?.querySelectorAll('.pick').forEach((b) => b.classList.toggle('active', b.dataset.key === state.titlePos));
  const outline = $('#outlineToggle');
  if (outline) outline.checked = state.titleOutline;
  const ow = $('#outlineRange');
  if (ow) ow.value = String(state.outlineWidth);
  const sh = $('#shadowRange');
  if (sh) sh.value = String(state.shadow);
  const zoom = $('#zoomRange');
  if (zoom) zoom.value = String(Math.round(selectedPanel().zoom * 100));
  const role = $('#roleInput');
  if (role && document.activeElement !== role) role.value = selectedPanel().role;
  const info = $('#panelInfo');
  if (info) {
    const p = selectedPanel();
    info.textContent = `${p.role} — ${panelDef(p.id).note} — drag foto untuk crop, scroll untuk zoom`;
  }
  document.querySelectorAll('.thumb').forEach((t, i) => {
    t.classList.toggle('in-use', state.panels.some((p) => p.photo === PANELS[i].sample));
  });
}

// ---- role tag editing ----------------------------------------------------

function canvasPoint(ev) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((ev.clientX - r.left) / r.width) * canvas.width,
    y: ((ev.clientY - r.top) / r.height) * canvas.height,
  };
}

function hitLabel(pt) {
  for (const g of geom) {
    const l = g.label;
    if (l && pt.x >= l.x - 4 && pt.x <= l.x + l.w + 4 && pt.y >= l.y - 4 && pt.y <= l.y + l.h + 4) return g;
  }
  return null;
}

function hitPanel(pt) {
  // Duo overlaps neighbours in the grid: test it first so it stays clickable.
  const ordered = [...geom].sort((a, b) => (a.id === 'duo' ? -1 : b.id === 'duo' ? 1 : 0));
  for (const g of ordered) {
    if (g.points) {
      // Point-in-polygon for slanted slices.
      let inside = false;
      for (let i = 0, j = g.points.length - 1; i < g.points.length; j = i++) {
        const [xi, yi] = g.points[i];
        const [xj, yj] = g.points[j];
        if (yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) return g;
    } else if (pt.x >= g.x && pt.x <= g.x + g.w && pt.y >= g.y && pt.y <= g.y + g.h) {
      return g;
    }
  }
  return null;
}

function openRoleEditor(g) {
  const stage = $('#stageWrap');
  const input = $('#roleEditor');
  const r = canvas.getBoundingClientRect();
  const sr = stage.getBoundingClientRect();
  const sx = (g.label.x / canvas.width) * r.width;
  const sy = (g.label.y / canvas.height) * r.height;
  const sw = (g.label.w / canvas.width) * r.width;
  input.style.display = 'block';
  input.style.left = `${r.left - sr.left + sx}px`;
  input.style.top = `${r.top - sr.top + sy}px`;
  input.style.width = `${Math.max(90, sw + 24)}px`;
  input.value = g.role;
  input.dataset.panel = g.id;
  input.focus();
  input.select();
}

function commitRoleEditor() {
  const input = $('#roleEditor');
  if (input.style.display === 'none' || !input.dataset.panel) return;
  const panel = state.panels.find((p) => p.id === input.dataset.panel);
  const value = input.value.trim().toUpperCase().slice(0, 24);
  if (panel && value) {
    panel.role = value;
    setStatus(`Role tag diubah: ${panel.role}`);
  }
  input.style.display = 'none';
  input.dataset.panel = '';
  redraw();
}

function bindCanvas() {
  canvas.addEventListener('pointerdown', (ev) => {
    if (coverMode) return;
    const pt = canvasPoint(ev);
    const labelHit = hitLabel(pt);
    if (labelHit) {
      selectedId = labelHit.id;
      openRoleEditor(labelHit);
      syncControls();
      return;
    }
    const panelHit = hitPanel(pt);
    if (!panelHit) return;
    selectedId = panelHit.id;
    canvas.setPointerCapture(ev.pointerId);
    dragging = { x: ev.clientX, y: ev.clientY, panel: selectedPanel() };
    syncControls();
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!dragging) return;
    const panel = dragging.panel;
    const g = geom.find((x) => x.id === panel.id);
    if (!g) return;
    const r = canvas.getBoundingClientRect();
    const dx = ((ev.clientX - dragging.x) / r.width) * canvas.width;
    const dy = ((ev.clientY - dragging.y) / r.height) * canvas.height;
    // Convert pixel drag into pan units; the clamp in drawPhotoCover keeps
    // the photo covering the panel at all times.
    panel.panX += (dx / Math.max(1, g.w)) * 2;
    panel.panY += (dy / Math.max(1, g.h)) * 2;
    dragging.x = ev.clientX;
    dragging.y = ev.clientY;
    draw();
  });
  const endDrag = () => {
    dragging = null;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (ev) => {
    if (coverMode) return;
    ev.preventDefault();
    const panel = selectedPanel();
    panel.zoom = Math.max(1, Math.min(3, panel.zoom + (ev.deltaY < 0 ? 0.12 : -0.12)));
    draw();
  }, { passive: false });
}

// ---- URL params (drives the headless screenshots too) --------------------

function applyParams(params) {
  if (params.has('layout') && LAYOUTS[params.get('layout')]) state.layout = params.get('layout');
  if (params.has('grade') && GRADES[params.get('grade')]) state.grade = params.get('grade');
  if (params.has('intensity')) {
    const v = parseInt(params.get('intensity'), 10);
    if (Number.isFinite(v)) state.intensity = Math.max(0, Math.min(100, v));
  }
  if (params.has('title')) state.title = params.get('title').slice(0, 24);
  if (params.has('titlePos') && ['top', 'middle', 'bottom'].includes(params.get('titlePos'))) {
    state.titlePos = params.get('titlePos');
  }
  if (params.has('outline')) state.titleOutline = params.get('outline') !== '0';
  if (params.has('outlineWidth')) {
    const v = parseInt(params.get('outlineWidth'), 10);
    if (Number.isFinite(v)) state.outlineWidth = Math.max(0, Math.min(100, v));
  }
  if (params.has('shadow')) {
    const v = parseInt(params.get('shadow'), 10);
    if (Number.isFinite(v)) state.shadow = Math.max(0, Math.min(100, v));
  }
  for (const [key, value] of params.entries()) {
    if (key.startsWith('role_')) {
      const id = key.slice(5);
      const panel = state.panels.find((p) => p.id === id);
      if (panel && value.trim()) panel.role = value.trim().toUpperCase().slice(0, 24);
    }
  }
  if (params.has('mode')) coverMode = params.get('mode') === 'cover';
}

// ---- boot ----------------------------------------------------------------

async function boot() {
  const params = new URLSearchParams(window.location.search);
  applyParams(params);
  document.body.classList.toggle('cover-mode', coverMode);
  if (!coverMode) {
    buildLayoutButtons();
    buildGradeButtons();
    buildSampleGrid();
    buildExportButtons();
    buildPresetSelect();
    bindCanvas();

    $('#shuffleBtn').addEventListener('click', () => {
      const before = state.panels.map((p) => p.photo).join('|');
      state = shuffleState(state);
      const after = state.panels.map((p) => p.photo).join('|');
      setStatus(`Shuffle! Grade: ${GRADES[state.grade].name} — Judul: ${state.title}${before === after ? ' (urutan foto sama, coba lagi)' : ''}`);
      redraw();
    });
    $('#intensityRange').addEventListener('input', (ev) => {
      state.intensity = parseInt(ev.target.value, 10);
      draw();
    });
    $('#titleInput').addEventListener('input', (ev) => {
      state.title = ev.target.value.toUpperCase().slice(0, 24);
      draw();
    });
    $('#titlePosBtns').addEventListener('click', (ev) => {
      const key = ev.target.dataset?.key;
      if (!key) return;
      state.titlePos = key;
      draw();
    });
    $('#outlineToggle').addEventListener('change', (ev) => {
      state.titleOutline = ev.target.checked;
      draw();
    });
    $('#outlineRange').addEventListener('input', (ev) => {
      state.outlineWidth = parseInt(ev.target.value, 10);
      draw();
    });
    $('#shadowRange').addEventListener('input', (ev) => {
      state.shadow = parseInt(ev.target.value, 10);
      draw();
    });
    $('#zoomRange').addEventListener('input', (ev) => {
      selectedPanel().zoom = parseInt(ev.target.value, 10) / 100;
      draw();
    });
    $('#roleInput').addEventListener('change', (ev) => {
      const value = ev.target.value.trim().toUpperCase().slice(0, 24);
      if (value) {
        selectedPanel().role = value;
        setStatus(`Role tag diubah: ${value}`);
        redraw();
      }
    });
    $('#uploadInput').addEventListener('change', (ev) => {
      const file = ev.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const panel = selectedPanel();
        panel.photo = String(reader.result);
        panel.panX = 0;
        panel.panY = 0;
        panel.zoom = 1;
        images.delete(panel.photo);
        setStatus(`Foto sendiri dimuat ke panel ${panel.role}`);
        redraw();
      };
      reader.readAsDataURL(file);
    });
    $('#exportAllBtn').addEventListener('click', exportAll);
    $('#roleEditor').addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') commitRoleEditor();
      if (ev.key === 'Escape') {
        $('#roleEditor').style.display = 'none';
      }
      ev.stopPropagation();
    });
    $('#roleEditor').addEventListener('blur', commitRoleEditor);
    window.addEventListener('resize', () => {
      fitCanvas();
      draw();
    });
  }
  fitCanvas();
  try {
    await document.fonts.load('100px Anton');
    await document.fonts.ready;
  } catch (_) {
    /* Anton falls back to Arial Black; the cover still draws */
  }
  await redraw();
  window.__viceHeat = {
    state: () => state,
    setState(next) {
      state = next;
      return redraw();
    },
    draw,
    redraw,
    renderExport,
    exportSize,
    exportAll,
    layoutPanels: (layout, w, h) => layoutPanels(layout, w, h),
    geom: () => geom,
    shots: SHOTS,
  };
  window.__viceHeatReady = true;
}

boot();
