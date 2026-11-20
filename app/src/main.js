// Vice Cover Studio — wires the editor page: photo uploads, panel picking and
// panning, layout / grade / size choices, caption editing, PNG export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, renderExport, defaultState, panelRects, LAYOUTS, GRADES, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const state = defaultState();
let photos = []; // { img, name } — the user's photos plus the two samples
let selected = 0;

function redraw() {
  const size = SIZES[state.size];
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas, state, photos.map((p) => p.img));
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function addPhoto(url, name) {
  const img = await loadImage(url);
  photos.push({ img, name });
  renderThumbs();
  return photos.length - 1;
}

function renderThumbs() {
  const box = document.getElementById('thumbs');
  box.textContent = '';
  photos.forEach((p, i) => {
    const thumb = document.createElement('img');
    thumb.src = p.img.src;
    thumb.alt = p.name;
    thumb.title = `${p.name} — click to use in the selected panel`;
    if (state.panels.some((panel, j) => j < (LAYOUTS[state.layout].panels) && panel.photo === i)) {
      thumb.classList.add('used');
    }
    thumb.addEventListener('click', () => {
      state.panels[selected].photo = i;
      syncPanelControls();
      renderThumbs();
      redraw();
    });
    box.appendChild(thumb);
  });
}

function choiceButtons(boxId, entries, current, onPick) {
  const box = document.getElementById(boxId);
  box.textContent = '';
  for (const [key, entry] of Object.entries(entries)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = entry.label;
    btn.setAttribute('aria-pressed', String(key === current));
    if (entry.hint) btn.title = entry.hint;
    btn.addEventListener('click', () => onPick(key));
    box.appendChild(btn);
  }
}

function syncLayoutButtons() {
  choiceButtons('layouts', LAYOUTS, state.layout, (key) => {
    state.layout = key;
    if (selected >= LAYOUTS[key].panels) selected = 0;
    document.getElementById('layout-hint').textContent = LAYOUTS[key].hint;
    syncLayoutButtons();
    syncPanelControls();
    renderThumbs();
    redraw();
  });
  document.getElementById('layout-hint').textContent = LAYOUTS[state.layout].hint;
}

function syncGradeButtons() {
  choiceButtons('grades', GRADES, state.grade, (key) => {
    state.grade = key;
    syncGradeButtons();
    redraw();
  });
}

function syncSizeButtons() {
  choiceButtons('sizes', SIZES, state.size, (key) => {
    state.size = key;
    syncSizeButtons();
    redraw();
  });
}

function syncPanelControls() {
  const panel = state.panels[selected];
  const zoom = document.getElementById('zoom');
  const dx = document.getElementById('dx');
  const dy = document.getElementById('dy');
  zoom.value = panel.zoom;
  dx.value = panel.dx;
  dy.value = panel.dy;
  document.getElementById('zoom-val').textContent = `${Number(panel.zoom).toFixed(2)}×`;
  document.getElementById('dx-val').textContent = Number(panel.dx).toFixed(2);
  document.getElementById('dy-val').textContent = Number(panel.dy).toFixed(2);
}

function bindPanelSliders() {
  const zoom = document.getElementById('zoom');
  const dx = document.getElementById('dx');
  const dy = document.getElementById('dy');
  zoom.addEventListener('input', () => { state.panels[selected].zoom = Number(zoom.value); syncPanelControls(); redraw(); });
  dx.addEventListener('input', () => { state.panels[selected].dx = Number(dx.value); syncPanelControls(); redraw(); });
  dy.addEventListener('input', () => { state.panels[selected].dy = Number(dy.value); syncPanelControls(); redraw(); });
}

/** Maps a pointer event on the preview canvas to a panel index (or -1). */
function panelAtEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  return rects.findIndex((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
}

function bindCanvasPickAndPan() {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  canvas.addEventListener('pointerdown', (e) => {
    const hit = panelAtEvent(e);
    if (hit < 0) return;
    selected = hit;
    syncPanelControls();
    renderThumbs();
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const panel = state.panels[selected];
    panel.dx = Math.max(-0.5, Math.min(0.5, panel.dx + (e.clientX - lastX) / rect.width));
    panel.dy = Math.max(-0.5, Math.min(0.5, panel.dy + (e.clientY - lastY) / rect.height));
    lastX = e.clientX;
    lastY = e.clientY;
    syncPanelControls();
    redraw();
  });
  const stop = () => { dragging = false; };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);
}

function bindInputs() {
  document.getElementById('photos').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    if (!files.length) return;
    for (const file of files) {
      const index = await addPhoto(URL.createObjectURL(file), file.name);
      state.panels[selected].photo = index;
    }
    syncPanelControls();
    redraw();
    status.textContent = `Added ${files.length} photo${files.length > 1 ? 's' : ''}.`;
  });
  document.getElementById('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
  document.getElementById('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  document.getElementById('export').addEventListener('click', () => {
    const out = renderExport(state, photos.map((p) => p.img), state.size);
    const size = SIZES[state.size];
    out.toBlob((blob) => {
      if (!blob) { status.textContent = 'Export failed in this browser.'; return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-cover-${size.w}x${size.h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      status.textContent = `Saved vice-cover-${size.w}x${size.h}.png`;
    }, 'image/png');
  });
}

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    state, redraw, addPhoto, syncLayoutButtons, syncGradeButtons, syncSizeButtons,
    syncPanelControls, renderThumbs, setSelected: (i) => { selected = i; },
  });
} else {
  bindInputs();
  bindPanelSliders();
  bindCanvasPickAndPan();
  syncLayoutButtons();
  syncGradeButtons();
  syncSizeButtons();
  syncPanelControls();
  addPhoto('samples/pier.jpg', 'Sample: Pier').then(() => addPhoto('samples/boulevard.jpg', 'Sample: Boulevard')).then(redraw);
  redraw();
}
