// Fixed scenes for screenshots: ?shot=cover shows the cover alone at the page size,
// ?shot=editor shows the editor with samples loaded. Params: layout, grade, caption
// (title), subtitle, tagline. Sets window.__shotReady once painted.
// main.js already loads samples and draws; this module only applies the query params
// before the first draw by running before main.js finishes its async load.
import { SAMPLES } from './cover.js';

export function applyShotParams() {
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot');
  if (!shot) return null;
  if (shot === 'cover') document.body.classList.add('shot-cover');
  return {
    shot,
    layout: q.get('layout'),
    grade: q.get('grade'),
    title: q.get('caption') || q.get('title'),
    subtitle: q.get('subtitle'),
    tagline: q.get('tagline'),
  };
}

// Called from main.js after samples load + first draw.
export function markShotReady() {
  const q = new URLSearchParams(location.search);
  if (!q.get('shot')) return;
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
export { SAMPLES };
