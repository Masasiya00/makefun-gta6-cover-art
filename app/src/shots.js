// VICE HEAT: Leonida Cover Studio — fixed screenshot scenes (app/src/shots.js).
//
// ?shot=editor shows the full editor with a photo loaded; ?shot=cover shows
// the cover alone, edge to edge. The query picks the layout, grade,
// intensity and title, and `w`/`h` size the cover canvas, so the capture
// script can shoot each scene at its real post size. window.__shotReady is
// set once the frame is painted, which is the capture script's signal.

import { GRADE_KEYS, LAYOUT_KEYS } from './cover.js';

function paintWhenReady() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.__shotReady = true;
      resolve();
    }));
  });
}

function applyQueryToState(query, state) {
  const layout = query.get('layout');
  if (layout && LAYOUT_KEYS.includes(layout)) state.layout = layout;
  const grade = query.get('grade');
  if (grade && GRADE_KEYS.includes(grade)) state.grade = grade;
  const intensity = Number(query.get('intensity'));
  if (Number.isFinite(intensity)) state.intensity = Math.max(0, Math.min(100, intensity));
  const title = query.get('title') ?? query.get('caption');
  if (title) state.title = title.toUpperCase().slice(0, 24);
  const subtitle = query.get('subtitle');
  if (subtitle) state.subtitle = subtitle.slice(0, 24);
  const tagline = query.get('tagline');
  if (tagline) state.tagline = tagline.slice(0, 80);
  const quote = query.get('quote');
  if (quote) state.quote = quote.slice(0, 80);
  const titlePos = query.get('titlepos');
  if (['top', 'middle', 'bottom'].includes(titlePos)) state.titlePos = titlePos;
}

export async function runShot(shot, query, state, helpers) {
  applyQueryToState(query, state);
  const canvas = document.getElementById('cover');
  if (shot === 'cover') {
    // Cover alone: hide the editor chrome and size the canvas to the shot.
    document.body.classList.add('shot-cover');
    const w = Number(query.get('w')) || 1080;
    const h = Number(query.get('h')) || 1080;
    canvas.width = w;
    canvas.height = h;
    const { renderCover } = await import('./cover.js');
    renderCover(canvas.getContext('2d'), state, w, h);
    await paintWhenReady();
    return;
  }
  // Editor scene, and the fallback for any unknown ?shot= value: the full
  // studio, preview drawn by the editor itself. Never hang without
  // __shotReady — a capture that waits forever helps nobody.
  document.body.classList.add('shot-editor');
  helpers.drawPreview();
  await paintWhenReady();
}
