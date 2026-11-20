// Fixed scenes for screenshots. `?shot=cover` shows one exported cover alone,
// full-bleed, at its export size; `?shot=editor` shows the editor with a sample
// photo loaded. window.__shotReady is set once the scene is painted.
import { SIZES, LAYOUTS } from './cover.js';

const SAMPLES = ['samples/pier.jpg', 'samples/boulevard.jpg'];

function ready() {
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

export async function runShot(shot, query, h) {
  const title = query.get('title') ?? 'Sunset Heist';
  const subtitle = query.get('subtitle') ?? 'Vice Cover Studio';
  const layout = query.get('layout') ?? 'trio';
  const grade = query.get('grade') ?? 'sunset';
  const size = query.get('size') ?? 'square';
  h.state.title = title;
  h.state.subtitle = subtitle;
  h.state.layout = LAYOUTS[layout] ? layout : 'trio';
  h.state.grade = grade;
  h.state.size = SIZES[size] ? size : 'square';
  const first = query.get('photo') ?? 'pier';
  const second = query.get('photo2') ?? 'boulevard';
  await h.addPhoto(`samples/${first}.jpg`, `Sample: ${first}`);
  await h.addPhoto(`samples/${second}.jpg`, `Sample: ${second}`);
  h.state.panels[0].photo = 0;
  h.state.panels[1].photo = 1;
  h.state.panels[2].photo = 0;
  h.state.panels[3].photo = 1;
  if (query.get('zoom2')) h.state.panels[1].zoom = Number(query.get('zoom2'));
  if (query.get('zoom3')) h.state.panels[2].zoom = Number(query.get('zoom3'));
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    document.getElementById('title').value = title;
    document.getElementById('subtitle').value = subtitle;
    h.redraw();
    ready();
    return;
  }
  // Editor scene: wire the controls, then paint with the samples loaded.
  document.getElementById('title').value = title;
  document.getElementById('subtitle').value = subtitle;
  h.syncLayoutButtons();
  h.syncGradeButtons();
  h.syncSizeButtons();
  h.syncPanelControls();
  h.renderThumbs();
  h.redraw();
  ready();
}
