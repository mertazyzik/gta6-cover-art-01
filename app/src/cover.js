// Vice Cover Studio — the cover engine. Draws GTA-style multi-panel cover art
// onto a canvas: several photo panels, a sunset or neon colour grade, bold
// caption lettering and comic-style panel frames. Pure canvas 2D; the only
// images it ever draws are the user's own photos (or the bundled samples).

export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 x 1350' },
  landscape: { w: 1920, h: 1080, label: '1920 x 1080' },
};

export const LAYOUTS = {
  hero: { label: 'Hero', panels: 1, hint: 'One full-bleed photo' },
  duo: { label: 'Duo', panels: 2, hint: 'Two side-by-side panels' },
  trio: { label: 'Trio', panels: 3, hint: 'Big panel + two stacked' },
  quad: { label: 'Quad', panels: 4, hint: 'Four-panel comic grid' },
};

export const GRADES = {
  sunset: { label: 'Sunset', accent: '#ff5a3c', stops: ['rgba(255,120,40,0.10)', 'rgba(255,80,60,0.30)', 'rgba(190,30,110,0.55)'] },
  neon: { label: 'Neon Night', accent: '#00e5ff', stops: ['rgba(0,229,255,0.12)', 'rgba(120,40,255,0.28)', 'rgba(255,0,128,0.45)'] },
  vice: { label: 'Vice Pink', accent: '#ff2e88', stops: ['rgba(255,46,136,0.10)', 'rgba(200,40,180,0.30)', 'rgba(90,20,140,0.55)'] },
  noir: { label: 'Noir Teal', accent: '#2dd4bf', stops: ['rgba(20,60,70,0.15)', 'rgba(10,40,60,0.35)', 'rgba(0,10,25,0.60)'] },
};

export function defaultState() {
  return {
    layout: 'trio',
    size: 'square',
    grade: 'sunset',
    title: 'Sunset Heist',
    subtitle: 'Vice Cover Studio',
    panels: [
      { photo: 0, zoom: 1, dx: 0, dy: 0 },
      { photo: 1, zoom: 1, dx: 0, dy: 0 },
      { photo: 0, zoom: 1.15, dx: 0, dy: 0 },
      { photo: 1, zoom: 1, dx: 0, dy: 0 },
    ],
  };
}

/** Panel rectangles for a layout inside a w x h cover, with a gap between panels. */
export function panelRects(layout, w, h) {
  const g = Math.max(6, Math.round(w * 0.006));
  if (layout === 'hero') return [{ x: 0, y: 0, w, h }];
  if (layout === 'duo') {
    const half = (w - g) / 2;
    return [
      { x: 0, y: 0, w: half, h },
      { x: half + g, y: 0, w: half, h },
    ];
  }
  if (layout === 'trio') {
    const left = Math.round(w * 0.58);
    const right = w - left - g;
    const halfH = (h - g) / 2;
    return [
      { x: 0, y: 0, w: left, h },
      { x: left + g, y: 0, w: right, h: halfH },
      { x: left + g, y: halfH + g, w: right, h: halfH },
    ];
  }
  const halfW = (w - g) / 2;
  const halfH = (h - g) / 2;
  return [
    { x: 0, y: 0, w: halfW, h: halfH },
    { x: halfW + g, y: 0, w: halfW, h: halfH },
    { x: 0, y: halfH + g, w: halfW, h: halfH },
    { x: halfW + g, y: halfH + g, w: halfW, h: halfH },
  ];
}

/** Draws one photo into a panel rect, cover-fit, with zoom and pan offsets. */
function drawPanelPhoto(ctx, img, rect, panel) {
  if (!img) return;
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * panel.zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const cx = rect.x + rect.w / 2 + panel.dx * rect.w;
  const cy = rect.y + rect.h / 2 + panel.dy * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
  ctx.restore();
}

/** Washes the whole cover with the grade's tint, then darkens the corners. */
function applyGrade(ctx, w, h, grade) {
  const g = GRADES[grade] ?? GRADES.sunset;
  const tint = ctx.createLinearGradient(0, h * 0.15, w * 0.4, h);
  tint.addColorStop(0, g.stops[0]);
  tint.addColorStop(0.55, g.stops[1]);
  tint.addColorStop(1, g.stops[2]);
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, w, h);
  const vig = ctx.createRadialGradient(
    w / 2, h * 0.45, Math.min(w, h) * 0.35,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

/** Bold caption: a slanted accent bar, outlined title, small spaced subtitle. */
function drawCaption(ctx, w, h, state) {
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  const pad = Math.round(w * 0.045);
  const baseY = h - Math.round(h * 0.055);
  if (subtitle) {
    const subSize = Math.max(14, Math.round(w * 0.022));
    ctx.font = `700 ${subSize}px Arial, Helvetica, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.28)}px`; } catch { /* older canvas */ }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = subSize * 0.3;
    ctx.fillText(subtitle, pad, baseY);
    ctx.shadowBlur = 0;
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
  if (!title) return;
  let size = Math.round(w * 0.105);
  ctx.font = `900 ${size}px "Arial Black", Arial, Helvetica, sans-serif`;
  // Leave room for the outline stroke, which straddles the measured width.
  const maxW = w - pad * 2 - Math.round(w * 0.02);
  while (ctx.measureText(title).width > maxW && size > 16) {
    size -= 2;
    ctx.font = `900 ${size}px "Arial Black", Arial, Helvetica, sans-serif`;
  }
  const titleY = subtitle ? baseY - Math.round(size * 0.62) : baseY;
  const barH = Math.round(size * 0.16);
  const barY = titleY - size - Math.round(size * 0.28);
  const barW = Math.min(maxW, ctx.measureText(title).width * 0.55);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pad, barY);
  ctx.lineTo(pad + barW, barY);
  ctx.lineTo(pad + barW - barH, barY + barH);
  ctx.lineTo(pad, barY + barH);
  ctx.closePath();
  ctx.fillStyle = grade.accent;
  ctx.fill();
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(10,5,20,0.9)';
  ctx.lineWidth = Math.max(3, Math.round(size * 0.09));
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = Math.round(size * 0.14);
  ctx.shadowOffsetY = Math.round(size * 0.03);
  ctx.strokeText(title, pad, titleY);
  ctx.fillText(title, pad, titleY);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

/**
 * Draws the full cover onto `canvas` (already at the export size) from
 * `state` and `photos` (an array of images, or null per slot).
 */
export function drawCover(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.fillStyle = '#14081f';
  ctx.fillRect(0, 0, w, h);
  const rects = panelRects(state.layout, w, h);
  const count = LAYOUTS[state.layout]?.panels ?? 1;
  for (let i = 0; i < count; i += 1) {
    const panel = state.panels[i] ?? { photo: 0, zoom: 1, dx: 0, dy: 0 };
    drawPanelPhoto(ctx, photos[panel.photo] ?? null, rects[i], panel);
  }
  applyGrade(ctx, w, h, state.grade);
  ctx.lineWidth = Math.max(3, Math.round(w * 0.004));
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  for (let i = 0; i < count; i += 1) {
    ctx.strokeRect(rects[i].x, rects[i].y, rects[i].w, rects[i].h);
  }
  drawCaption(ctx, w, h, state);
}

/** Renders the cover at an export size onto a fresh canvas and returns it. */
export function renderExport(state, photos, sizeKey) {
  const size = SIZES[sizeKey] ?? SIZES.square;
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas, { ...state, size: sizeKey }, photos);
  return canvas;
}
