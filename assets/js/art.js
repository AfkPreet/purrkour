// Purrkour - all art, drawn as soft kawaii flat-vector in canvas. No image files.
// Convention: functions take screen-space px coordinates plus u = pixels per world unit.

// ---------- tiny helpers ----------
export function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}
export function ell(ctx, x, y, rx, ry) {
  ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2); ctx.closePath();
}
export function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s, y - s * 0.45, x - s * 0.45, y - s * 1.1, x, y - s * 0.4);
  ctx.bezierCurveTo(x + s * 0.45, y - s * 1.1, x + s, y - s * 0.45, x, y + s * 0.35);
  ctx.closePath();
}
export function starPath(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
}
// glow uses pre-rendered sprites (a fresh radial gradient per call is too hot for phones)
const glowCache = new Map();
function glowSprite(color) {
  let c = glowCache.get(color);
  if (!c) {
    if (glowCache.size > 48) glowCache.clear();
    c = document.createElement('canvas');
    c.width = c.height = 64;
    const g2 = c.getContext('2d');
    const grad = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g2.fillStyle = grad; g2.fillRect(0, 0, 64, 64);
    glowCache.set(color, c);
  }
  return c;
}
export function glow(ctx, x, y, r, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
  ctx.restore();
}
const h32 = (n) => { let x = (n | 0) ^ 0x9e3779b9; x = Math.imul(x ^ (x >>> 16), 0x85ebca6b); x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };

// ---------- color helpers ----------
function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}
const mixCache = new Map();
function mixC(a, b, k) {
  const key = a + b + k;
  let v = mixCache.get(key);
  if (!v) {
    const A = hexRgb(a), B = hexRgb(b);
    v = `rgb(${Math.round(A[0] + (B[0] - A[0]) * k)},${Math.round(A[1] + (B[1] - A[1]) * k)},${Math.round(A[2] + (B[2] - A[2]) * k)})`;
    mixCache.set(key, v);
  }
  return v;
}
function rgba(hex, a) {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// grain tile: breaks gradient banding on OLED screens, baked into cached layers
let noiseTile = null;
function getNoise() {
  if (!noiseTile) {
    noiseTile = document.createElement('canvas');
    noiseTile.width = noiseTile.height = 128;
    const g = noiseTile.getContext('2d');
    const img = g.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = (Math.random() * 7) | 0;
    }
    g.putImageData(img, 0, 0);
  }
  return noiseTile;
}

// ---------- sky ----------
// static sky (gradient + horizon city-glow + grain) cached per district and size:
// one drawImage per frame instead of a full-screen gradient build
const skyCache = new Map();
function skyLayer(d, W, H) {
  const key = `${d.key}|${W}x${H}`;
  let c = skyCache.get(key);
  if (!c) {
    if (skyCache.size > 8) skyCache.clear();
    c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, d.skyTop);
    grad.addColorStop(0.58, d.skyBot);
    grad.addColorStop(1, mixC(d.skyBot, d.accent, 0.2));
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    if (d.key === 'heights') { // faint diagonal nebula, moonrise only
      const nb = g.createLinearGradient(0, H * 0.02, W, H * 0.34);
      nb.addColorStop(0, 'rgba(184,166,255,0)');
      nb.addColorStop(0.5, 'rgba(184,166,255,0.07)');
      nb.addColorStop(1, 'rgba(184,166,255,0)');
      g.fillStyle = nb; g.fillRect(0, 0, W, H * 0.5);
    }
    // the city breathing below the rooftops: warm horizon band
    const warm = mixC(d.accent, '#ffcf6f', 0.5);
    const hg = g.createLinearGradient(0, H * 0.4, 0, H * 0.84);
    hg.addColorStop(0, warm.replace('rgb', 'rgba').replace(')', ',0)'));
    hg.addColorStop(0.55, warm.replace('rgb', 'rgba').replace(')', ',0.11)'));
    hg.addColorStop(1, warm.replace('rgb', 'rgba').replace(')', ',0.16)'));
    g.fillStyle = hg; g.fillRect(0, H * 0.4, W, H * 0.44);
    // corner vignette baked in: free at runtime
    const rad = g.createRadialGradient(W / 2, H * 0.42, H * 0.5, W / 2, H * 0.42, H * 0.95);
    rad.addColorStop(0, 'rgba(10,8,26,0)');
    rad.addColorStop(1, 'rgba(10,8,26,0.22)');
    g.fillStyle = rad; g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.55;
    g.fillStyle = g.createPattern(getNoise(), 'repeat');
    g.fillRect(0, 0, W, H);
    g.globalAlpha = 1;
    skyCache.set(key, c);
  }
  return c;
}

// kawaii cumulus sprites: bumpy tops, flat-ish bottoms, moonlit cream rim.
// generous canvas margins keep every gradient inside the sprite (no hard clips)
let cloudSprites = null;
function getClouds() {
  if (!cloudSprites) {
    cloudSprites = [[256, 128], [180, 96]].map(([w, h]) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d');
      const puffs = [[0.34, 0.56, 0.11], [0.5, 0.48, 0.13], [0.66, 0.56, 0.1], [0.44, 0.62, 0.1], [0.58, 0.63, 0.09]];
      for (const pass of [0, 1]) {
        for (const [px, py, pr] of puffs) {
          const R = pr * w * (pass ? 0.85 : 1);
          const cyp = (py - pass * 0.04) * h;
          const grad = g.createRadialGradient(px * w, cyp, 0, px * w, cyp, R);
          const col = pass ? '255,246,224' : '205,210,240';
          grad.addColorStop(0, `rgba(${col},${pass ? 0.25 : 0.45})`);
          grad.addColorStop(1, `rgba(${col},0)`);
          g.fillStyle = grad;
          g.beginPath(); g.arc(px * w, cyp, R, 0, Math.PI * 2); g.fill();
        }
      }
      return c;
    });
  }
  return cloudSprites;
}

function drawMoon(ctx, mx, my, mr) {
  glow(ctx, mx, my, mr * 2.8, 'rgba(255,246,224,0.5)', 0.45);
  ctx.fillStyle = '#fff6e0'; ell(ctx, mx, my, mr, mr); ctx.fill();
  ctx.fillStyle = 'rgba(228,205,170,0.5)';
  ell(ctx, mx + mr * 0.3, my - mr * 0.25, mr * 0.16, mr * 0.16); ctx.fill();
  ell(ctx, mx - mr * 0.25, my + mr * 0.1, mr * 0.11, mr * 0.11); ctx.fill();
  ell(ctx, mx + mr * 0.05, my + mr * 0.4, mr * 0.09, mr * 0.09); ctx.fill();
  ctx.fillStyle = 'rgba(255,170,160,0.35)'; // moon blush
  ell(ctx, mx - mr * 0.5, my + mr * 0.32, mr * 0.18, mr * 0.1); ctx.fill();
  ell(ctx, mx + mr * 0.5, my + mr * 0.32, mr * 0.18, mr * 0.1); ctx.fill();
}

// district moon placement: Moonrise Heights earns a huge low moon
function moonSpot(d, W, H, title) {
  if (title) return { x: W * 0.76, y: H * 0.33, r: Math.min(W, H) * 0.13 };
  if (d.key === 'heights') return { x: W * 0.74, y: H * 0.28, r: Math.min(W, H) * 0.165 };
  return { x: W * 0.78, y: H * 0.18, r: Math.min(W, H) * (d.key === 'oldtown' ? 0.115 : 0.125) };
}

export function drawSky(ctx, W, H, d, t, camX, relY = 0, title = false) {
  ctx.drawImage(skyLayer(d, W, H), 0, 0);
  // stars: denser at the zenith, three temperatures, slow parallax
  const off = camX * 0.02;
  const nStars = d.key === 'heights' ? 100 : 70;
  for (let i = 0; i < nStars; i++) {
    const sx = ((h32(i) * 1.7 * W - off * 40) % (W + 20) + W + 20) % (W + 20) - 10;
    const sy = Math.pow(h32(i + 500), 1.6) * H * 0.72 - relY * 0.02;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.5 + h32(i + 900)) + i));
    const temp = h32(i + 700);
    ctx.globalAlpha = tw * 0.8;
    ctx.fillStyle = temp > 0.35 ? '#fff6e0' : temp > 0.1 ? '#cfe0ff' : '#ffd9c4';
    const r = 0.8 + h32(i + 300) * 1.6;
    ctx.fillRect(sx, sy, r, r);
  }
  // five hero stars with soft cross flares
  ctx.fillStyle = '#fff6e0';
  for (let i = 0; i < 5; i++) {
    const sx = ((h32(i + 60) * 1.4 * W - off * 40) % (W + 20) + W + 20) % (W + 20) - 10;
    const sy = H * (0.05 + h32(i + 77) * 0.26) - relY * 0.02;
    ctx.globalAlpha = 0.35 + 0.45 * Math.abs(Math.sin(t * 0.8 + i * 2));
    ctx.fillRect(sx - 4, sy - 0.5, 8, 1);
    ctx.fillRect(sx - 0.5, sy - 4, 1, 8);
    ctx.fillRect(sx - 1, sy - 1, 2, 2);
  }
  ctx.globalAlpha = 1;
  // a shooting star, once every ~26 seconds, for the patient
  const cyc = t % 26;
  if (cyc < 0.7) {
    const seed = Math.floor(t / 26);
    const hx = h32(seed + 11) * W * 0.8 + cyc * 140, hy = H * 0.08 + cyc * 90;
    ctx.strokeStyle = `rgba(255,246,224,${0.7 * (1 - cyc / 0.7)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - 38, hy - 24); ctx.stroke();
  }
  const m = moonSpot(d, W, H, title);
  const my = m.y - relY * 0.035;
  drawMoon(ctx, m.x, my, m.r);
  // drifting moonlit clouds: quiet whispers, two depths
  const sprites = getClouds();
  for (let i = 0; i < 4; i++) {
    const far = i < 2;
    const spr = far ? sprites[1] : sprites[0];
    const drift = t * (far ? 3 : 5 + i) - camX * (far ? 0.16 : 0.4);
    const R = W * 1.6, raw = h32(i + 40) * R + drift;
    const cx = ((raw % R) + R) % R - W * 0.3;
    const cy = H * (far ? 0.04 + h32(i + 60) * 0.08 : 0.15 + h32(i + 61) * 0.14) - relY * 0.05;
    const sc = far ? 0.65 : 0.8 + h32(i + 62) * 0.25;
    ctx.globalAlpha = far ? 0.35 : 0.5;
    ctx.drawImage(spr, cx, cy, spr.width * sc, spr.height * sc);
    if (d.key === 'market' && !far) { // neon underglow on market clouds
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = 'rgba(255,159,208,0.5)';
      ell(ctx, cx + spr.width * sc * 0.5, cy + spr.height * sc * 0.62, spr.width * sc * 0.3, spr.height * sc * 0.12);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // district signatures in the mid-sky band
  if (d.key === 'oldtown') { // chimney smoke drifting up from the town below
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.08 + i * 0.33) % 1;
      const wx = ((h32(i + 200) * W * 1.3 - off * 30) % (W + 60) + W + 60) % (W + 60) - 30;
      ctx.fillStyle = `rgba(230,225,240,${0.05 * (1 - ph)})`;
      ell(ctx, wx + ph * 30, H * (0.52 - ph * 0.14), 26 + ph * 26, 12 + ph * 10); ctx.fill();
    }
  } else if (d.key === 'garden') { // fireflies wandering above the terraces
    for (let i = 0; i < 7; i++) {
      const fx = ((h32(i + 300) * W * 1.2 + Math.sin(t * 0.3 + i * 1.7) * 40 - off * 30) % (W + 40) + W + 40) % (W + 40) - 20;
      const fy = H * (0.36 + h32(i + 310) * 0.16) + Math.sin(t * 0.7 + i * 2.4) * 14;
      glow(ctx, fx, fy, 7, 'rgba(207,232,159,0.8)', 0.15 + 0.15 * Math.sin(t * 1.3 + i * 2));
    }
  }
}

// ---------- skyline layers ----------
// layer 2 = distant ridge in the haze, 0 = far, 1 = mid. relY: vertical parallax px.
const lineColor = new Map();
function skylineColor(d, layer) {
  const key = d.key + layer;
  let v = lineColor.get(key);
  if (!v) {
    v = layer === 2 ? mixC(d.far, d.skyBot, 0.6) : layer === 0 ? mixC(d.far, d.skyBot, 0.5) : mixC(d.mid, d.skyBot, 0.12);
    lineColor.set(key, v);
  }
  return v;
}
export function drawSkyline(ctx, W, H, d, camX, layer, relY = 0) {
  const speed = layer === 2 ? 0.05 : layer === 0 ? 0.12 : 0.35;
  const color = skylineColor(d, layer);
  const lift = Math.max(-H * 0.08, Math.min(H * 0.08, relY * (layer === 2 ? 0.03 : layer === 0 ? 0.05 : 0.12)));
  const base = (layer === 2 ? H * 0.54 : layer === 0 ? H * 0.66 : H * 0.84) + lift;
  const off = camX * speed;
  const bw = layer === 2 ? 46 : layer === 0 ? 90 : 104;
  ctx.fillStyle = color;
  const first = Math.floor(off / bw) - 1;
  for (let i = first; i * bw - off < W + bw; i++) {
    const x = i * bw - off;
    const hgt = layer === 2
      ? H * (0.05 + 0.07 * h32(i * 7 + 1998))
      : (layer === 0 ? 0.17 : 0.21) * H * (0.5 + h32(i * 7 + layer * 999));
    const w = bw * (0.55 + h32(i * 13 + layer) * 0.4);
    if (layer === 2) {
      ctx.fillRect(x, base - hgt, w, hgt + 40);
      if (h32(i * 17 + 5) > 0.8) { // one sleepy window far away
        ctx.fillStyle = 'rgba(255,216,150,0.2)';
        ctx.fillRect(x + w * 0.4, base - hgt + 6, 1.5, 2.5);
        ctx.fillStyle = color;
      }
      continue;
    }
    rr(ctx, x, base - hgt, w, hgt + 40, 6);
    ctx.fill();
    // district-flavored rooftop silhouettes
    const kind = h32(i * 3 + layer);
    if (kind > 0.72) {
      ctx.fillRect(x + w * 0.3, base - hgt - 14, 2, 14);
      ell(ctx, x + w * 0.3 + 1, base - hgt - 16, 4, 3); ctx.fill();
    } else if (kind > 0.5) {
      if (d.key === 'oldtown') {
        for (let s = 0; s < 3; s++) { ctx.beginPath(); ctx.arc(x + w * 0.25 + s * 9, base - hgt, 5, Math.PI, 0); ctx.fill(); }
      } else if (d.key === 'market') {
        ctx.fillRect(x + w * 0.55, base - hgt - 10, 3, 10);
        ctx.fillStyle = rgba(d.accent, 0.25);
        ctx.fillRect(x + w * 0.55 - 2, base - hgt - 14, 7, 5);
        ctx.fillStyle = color;
      } else if (d.key === 'garden') {
        ell(ctx, x + w * 0.4, base - hgt - 4, 8, 10); ctx.fill();
      } else {
        ctx.fillRect(x + w * 0.5, base - hgt - 15, 2, 15);
      }
    }
    if (layer === 1) { // lit windows, dim and small: distance, not competition
      const rows = Math.floor(hgt / 30), cols = Math.floor(w / 24);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const k = h32(i * 131 + r * 17 + c * 7);
        if (k > 0.76) {
          ctx.fillStyle = rgba(d.wallLit, 0.2 + k * 0.18);
          ctx.fillRect(x + 8 + c * 24, base - hgt + 10 + r * 30, 7, 9);
        }
      }
      ctx.fillStyle = color;
    }
  }
}

// drifting low haze that veils the skylines: cached strip per district
const hazeCache = new Map();
function hazeStrip(d) {
  let c = hazeCache.get(d.key);
  if (!c) {
    c = document.createElement('canvas'); c.width = 512; c.height = 96;
    const g = c.getContext('2d');
    const warm = mixC(d.skyBot, '#ffcf6f', 0.35);
    const grad = g.createLinearGradient(0, 0, 0, 96);
    grad.addColorStop(0, warm.replace('rgb', 'rgba').replace(')', ',0)'));
    grad.addColorStop(0.6, warm.replace('rgb', 'rgba').replace(')', ',0.32)'));
    grad.addColorStop(1, warm.replace('rgb', 'rgba').replace(')', ',0)'));
    g.fillStyle = grad;
    g.fillRect(0, 14, 512, 82);
    // soft bulges along the top edge so it reads as mist, not a ruler
    for (let i = 0; i < 6; i++) {
      const bx = 40 + i * 82, br = 34 + h32(i + 9) * 26;
      const bg = g.createRadialGradient(bx, 30, 0, bx, 30, br);
      bg.addColorStop(0, warm.replace('rgb', 'rgba').replace(')', ',0.2)'));
      bg.addColorStop(1, warm.replace('rgb', 'rgba').replace(')', ',0)'));
      g.fillStyle = bg;
      g.beginPath(); g.arc(bx, 30, br, 0, Math.PI * 2); g.fill();
    }
    hazeCache.set(d.key, c);
  }
  return c;
}
export function drawHaze(ctx, W, H, d, t, camX) {
  const strip = hazeStrip(d);
  const y = H * 0.56, h = H * 0.17;
  const drift = Math.sin(t * 0.07) * 24; // slow breath, one draw
  ctx.globalAlpha = 0.5;
  ctx.drawImage(strip, drift - 24, y, W + 48, h);
  ctx.globalAlpha = 1;
}

// the long drop into the streets below: a bottom fade strip, the only
// full-width overlay paid for at runtime (corner vignette lives in the sky cache)
let gradeStrip = null;
export function drawGrade(ctx, W, H) {
  if (!gradeStrip) {
    gradeStrip = document.createElement('canvas');
    gradeStrip.width = 8; gradeStrip.height = 128;
    const g = gradeStrip.getContext('2d');
    const deep = g.createLinearGradient(0, 0, 0, 128);
    deep.addColorStop(0, 'rgba(13,14,34,0)');
    deep.addColorStop(1, 'rgba(13,14,34,0.32)');
    g.fillStyle = deep; g.fillRect(0, 0, 8, 128);
  }
  ctx.drawImage(gradeStrip, 0, H * 0.72, W, H * 0.28);
}

// ---------- platforms (buildings + roofs) ----------
export function drawPlatform(ctx, px, py, pw, u, p, d, t, camBottom) {
  const wallH = camBottom - py + 10;
  // wall: two flat fills instead of a per-frame gradient
  ctx.fillStyle = d.wall;
  ctx.fillRect(px + 2, py + u * 0.12, pw - 4, wallH);
  ctx.fillStyle = shade(d.wall, -14);
  ctx.fillRect(px + 2, py + u * 0.12 + wallH * 0.55, pw - 4, wallH * 0.45);
  // wall volume: moon (upper right) side lit, street side in shadow
  if (pw > u * 0.9) {
    ctx.fillStyle = shade(d.wall, 10);
    ctx.fillRect(px + pw - u * 0.18, py + u * 0.12, u * 0.14, wallH);
    ctx.fillStyle = shade(d.wall, -22);
    ctx.fillRect(px + 2, py + u * 0.12, u * 0.14, wallH);
  }
  // windows on the wall (lit ones bloom softly into the room around them)
  const cols = Math.max(1, Math.floor(pw / (u * 1.1)));
  const rows = Math.min(6, Math.max(1, Math.floor(wallH / (u * 1.3))));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const k = h32(p.i * 733 + r * 31 + c * 11);
    if (k > 0.5) {
      const lit = k > 0.78;
      const wx = px + u * 0.35 + c * (pw - u * 0.6) / cols;
      const wy = py + u * 0.7 + r * u * 1.3;
      // bloom only the top row: the light that matters, at a fraction of the cost
      if (lit && r === 0) glow(ctx, wx + u * 0.25, wy + u * 0.33, u * 0.85, 'rgba(255,207,111,0.35)', 0.3);
      ctx.fillStyle = lit ? d.wallLit : 'rgba(20,20,40,0.5)';
      rr(ctx, wx, wy, u * 0.5, u * 0.65, u * 0.08); ctx.fill();
      if (lit && h32(p.i * 91 + r * 7 + c) > 0.8) { // a little cat silhouette in a window
        ctx.fillStyle = 'rgba(30,25,50,0.85)';
        ell(ctx, wx + u * 0.25, wy + u * 0.5, u * 0.12, u * 0.1); ctx.fill();
        ell(ctx, wx + u * 0.25, wy + u * 0.36, u * 0.08, u * 0.08); ctx.fill();
      }
    }
  }
  // shadow seam where the eave overhangs the wall
  ctx.fillStyle = 'rgba(16,14,34,0.28)';
  ctx.fillRect(px + 2, py + u * 0.26, pw - 4, u * 0.1);
  // roof slab
  const roofC = p.crumble ? shade(d.roof, -8) : d.roof;
  ctx.fillStyle = roofC;
  rr(ctx, px, py - u * 0.06, pw, u * 0.3, u * 0.1); ctx.fill();
  ctx.fillStyle = d.roofEdge;
  rr(ctx, px, py + u * 0.14, pw, u * 0.12, u * 0.05); ctx.fill();
  // moonlight rims the edge players judge their jumps by
  ctx.fillStyle = 'rgba(255,243,220,0.3)';
  rr(ctx, px + u * 0.04, py - u * 0.075, pw - u * 0.08, u * 0.05, u * 0.03); ctx.fill();
  // district roof detailing
  if (d.key === 'oldtown') {
    ctx.fillStyle = shade(d.roof, 14);
    for (let x = px + u * 0.2; x < px + pw - u * 0.2; x += u * 0.42) {
      ctx.beginPath(); ctx.arc(x, py - u * 0.02, u * 0.16, Math.PI, 0); ctx.fill();
    }
  } else if (d.key === 'market') {
    ctx.strokeStyle = shade(d.roof, 18); ctx.lineWidth = 1;
    for (let x = px + u * 0.4; x < px + pw; x += u * 0.6) {
      ctx.beginPath(); ctx.moveTo(x, py - u * 0.04); ctx.lineTo(x - u * 0.12, py + u * 0.12); ctx.stroke();
    }
  } else if (d.key === 'garden') {
    ctx.fillStyle = '#6fae8a';
    for (let x = px + u * 0.15; x < px + pw - u * 0.1; x += u * 0.22) {
      const bh = u * (0.1 + h32(Math.floor(x)) * 0.12);
      ctx.fillRect(x, py - bh - u * 0.04, u * 0.06, bh);
    }
  }
  if (p.crumble) {
    ctx.strokeStyle = 'rgba(30,25,45,0.5)'; ctx.lineWidth = 1.4;
    for (let i = 0; i < Math.floor(pw / (u * 0.5)); i++) {
      const cx = px + u * 0.25 + i * u * 0.5;
      ctx.beginPath(); ctx.moveTo(cx, py - u * 0.02); ctx.lineTo(cx + u * 0.1, py + u * 0.12); ctx.lineTo(cx - u * 0.04, py + u * 0.2); ctx.stroke();
    }
  }
  if (p.mover) { // hanging platform: ropes up and out of frame
    ctx.strokeStyle = 'rgba(200,190,220,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px + u * 0.3, py); ctx.lineTo(px + u * 0.3, -20);
    ctx.moveTo(px + pw - u * 0.3, py); ctx.lineTo(px + pw - u * 0.3, -20); ctx.stroke();
  }
  // moss (slippery glass) bands
  for (const m of p.mossPx || []) {
    ctx.fillStyle = 'rgba(159,224,183,0.65)';
    rr(ctx, m[0], py - u * 0.08, m[1] - m[0], u * 0.2, u * 0.08); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let x = m[0] + u * 0.2; x < m[1] - u * 0.1; x += u * 0.5) {
      ctx.beginPath(); ctx.moveTo(x, py + u * 0.06); ctx.lineTo(x + u * 0.16, py - u * 0.06); ctx.stroke();
    }
  }
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

// bouncy awning drawn instead of a roof slab
export function drawAwning(ctx, px, py, pw, u, squish, accent) {
  const seg = pw / 4;
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 === 0 ? accent : '#fff3e0';
    ctx.beginPath();
    ctx.moveTo(px + i * seg, py + u * 0.18);
    ctx.quadraticCurveTo(px + (i + 0.5) * seg, py - u * (0.34 - squish * 0.3), px + (i + 1) * seg, py + u * 0.18);
    ctx.quadraticCurveTo(px + (i + 0.5) * seg, py + u * (0.34 - squish * 0.1), px + i * seg, py + u * 0.18);
    ctx.fill();
  }
  // moonlit rim on the scallop crowns
  ctx.strokeStyle = 'rgba(255,243,220,0.22)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(px + i * seg + 2, py + u * 0.16);
    ctx.quadraticCurveTo(px + (i + 0.5) * seg, py - u * (0.36 - squish * 0.3), px + (i + 1) * seg - 2, py + u * 0.16);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(120,90,110,0.6)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(px + 2, py + u * 0.16); ctx.lineTo(px + 2, py + u * 1.1);
  ctx.moveTo(px + pw - 2, py + u * 0.16); ctx.lineTo(px + pw - 2, py + u * 1.1); ctx.stroke();
}

// ---------- decorations ----------
export function drawDeco(ctx, deco, px, py, pw, u, d, t) {
  ctx.save();
  switch (deco) {
    case 'bakery': {
      rr(ctx, px + u * 0.4, py - u * 1.15, u * 2.2, u * 0.75, u * 0.14);
      ctx.fillStyle = '#7a4a3a'; ctx.fill();
      ctx.fillStyle = '#ffcf6f'; ell(ctx, px + u * 1.0, py - u * 0.78, u * 0.28, u * 0.2); ctx.fill();
      ell(ctx, px + u * 1.6, py - u * 0.78, u * 0.28, u * 0.2); ctx.fill();
      glow(ctx, px + u * 1.5, py - u * 0.8, u * 1.2, 'rgba(255,207,111,0.5)', 0.5);
      break;
    }
    case 'chimney': {
      const cx = px + pw * 0.7;
      ctx.fillStyle = shade(d.roof, -20);
      rr(ctx, cx, py - u * 0.9, u * 0.55, u * 0.95, u * 0.08); ctx.fill();
      rr(ctx, cx - u * 0.06, py - u * 1.0, u * 0.67, u * 0.18, u * 0.06); ctx.fill();
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.4 + i * 0.33) % 1;
        ctx.fillStyle = `rgba(230,225,240,${0.25 * (1 - ph)})`;
        ell(ctx, cx + u * 0.28 + Math.sin(t + i) * u * 0.15, py - u * (1.1 + ph * 1.2), u * (0.14 + ph * 0.22), u * (0.12 + ph * 0.18)); ctx.fill();
      }
      break;
    }
    case 'clock': {
      const cx = px + pw * 0.5;
      ctx.fillStyle = shade(d.wall, 10);
      rr(ctx, cx - u * 0.5, py - u * 2.1, u * 1.0, u * 2.15, u * 0.1); ctx.fill();
      ctx.fillStyle = '#fff6e0'; ell(ctx, cx, py - u * 1.55, u * 0.34, u * 0.34); ctx.fill();
      ctx.strokeStyle = '#4a3a55'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, py - u * 1.55); ctx.lineTo(cx, py - u * 1.8);
      ctx.moveTo(cx, py - u * 1.55); ctx.lineTo(cx + u * 0.18, py - u * 1.5); ctx.stroke();
      glow(ctx, cx, py - u * 1.55, u * 0.8, 'rgba(255,246,224,0.4)', 0.4);
      break;
    }
    case 'lanterns': {
      ctx.strokeStyle = 'rgba(200,190,220,0.4)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px, py - u * 1.2);
      ctx.quadraticCurveTo(px + pw / 2, py - u * 0.85, px + pw, py - u * 1.2); ctx.stroke();
      for (let i = 1; i <= 3; i++) {
        const lx = px + (pw * i) / 4;
        const ly = py - u * (1.05 + 0.12 * Math.cos((i / 4 - 0.5) * 2)) + Math.sin(t * 2 + i) * u * 0.04;
        const col = ['#ff9fd0', '#ffcf6f', '#9fe0b7'][i - 1];
        glow(ctx, lx, ly + u * 0.2, u * 0.7, col, 0.35);
        ctx.fillStyle = col; rr(ctx, lx - u * 0.14, ly, u * 0.28, u * 0.4, u * 0.12); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(lx - u * 0.02, ly + u * 0.4, u * 0.04, u * 0.08);
        ctx.globalAlpha = 0.1; // lantern light pooling on the roof below
        ctx.fillStyle = col; ell(ctx, lx, py, u * 0.7, u * 0.14); ctx.fill();
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'sign': {
      const sx = px + pw * 0.72;
      ctx.fillStyle = '#2c2a4d';
      rr(ctx, sx, py - u * 2.0, u * 0.7, u * 2.0, u * 0.1); ctx.fill();
      const on = Math.sin(t * 3) > -0.85; // gentle neon flicker
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = on ? d.accent : shade('#664466', -10);
        rr(ctx, sx + u * 0.14, py - u * (1.85 - i * 0.45), u * 0.42, u * 0.3, u * 0.08); ctx.fill();
      }
      if (on) {
        glow(ctx, sx + u * 0.35, py - u * 1.1, u * 1.4, d.accent, 0.35);
        ctx.globalAlpha = 0.1; // neon wash on the roof
        ctx.fillStyle = d.accent; ell(ctx, sx + u * 0.35, py, u * 0.9, u * 0.16); ctx.fill();
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'arcade': {
      rr(ctx, px + u * 0.3, py - u * 0.95, pw - u * 0.6, u * 0.6, u * 0.2);
      ctx.fillStyle = '#241f45'; ctx.fill();
      for (let i = 0; i < Math.floor((pw - u) / (u * 0.4)); i++) {
        const on = Math.floor(t * 4 + i) % 3 === 0;
        ctx.fillStyle = on ? '#ff9fd0' : '#33f0e0';
        ell(ctx, px + u * 0.55 + i * u * 0.4, py - u * 0.65, u * 0.07, u * 0.07); ctx.fill();
      }
      break;
    }
    case 'train': {
      // wheels + windows: the roof IS the train top
      ctx.fillStyle = '#3c3150';
      for (let x = px + u * 0.8; x < px + pw - u * 0.5; x += u * 1.6) {
        ell(ctx, x, py + u * 2.1, u * 0.4, u * 0.4); ctx.fill();
      }
      ctx.fillStyle = d.wallLit;
      for (let x = px + u * 0.6; x < px + pw - u * 0.8; x += u * 1.2) {
        rr(ctx, x, py + u * 0.7, u * 0.6, u * 0.5, u * 0.1); ctx.fill();
      }
      break;
    }
    case 'greenhouse': {
      ctx.fillStyle = 'rgba(159,224,183,0.2)';
      ctx.beginPath(); ctx.moveTo(px + u * 0.4, py); ctx.lineTo(px + pw / 2, py - u * 0.9); ctx.lineTo(px + pw - u * 0.4, py); ctx.fill();
      ctx.strokeStyle = 'rgba(220,255,235,0.4)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px + u * 0.4, py); ctx.lineTo(px + pw / 2, py - u * 0.9); ctx.lineTo(px + pw - u * 0.4, py); ctx.stroke();
      break;
    }
    case 'pond': {
      ell(ctx, px + pw / 2, py + u * 0.06, pw * 0.28, u * 0.12);
      ctx.fillStyle = 'rgba(120,190,220,0.7)'; ctx.fill();
      ctx.fillStyle = '#ff9a5c';
      ell(ctx, px + pw / 2 + Math.sin(t) * pw * 0.12, py + u * 0.04, u * 0.1, u * 0.05); ctx.fill();
      break;
    }
    case 'wisteria': {
      for (let i = 0; i < Math.floor(pw / (u * 0.8)); i++) {
        const wx = px + u * 0.5 + i * u * 0.8;
        ctx.fillStyle = 'rgba(184,166,255,0.75)';
        for (let j = 0; j < 3; j++) ell(ctx, wx + Math.sin(t + i + j) * 2, py - u * 0.15 + j * u * 0.16, u * 0.1 - j * u * 0.02, u * 0.12), ctx.fill();
      }
      break;
    }
    case 'chimes': {
      const cx2 = px + pw * 0.35;
      ctx.strokeStyle = 'rgba(220,210,240,0.6)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx2 - u * 0.4, py - u * 1.0); ctx.lineTo(cx2 + u * 0.4, py - u * 1.0); ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const hx = cx2 - u * 0.25 + i * u * 0.25, sw = Math.sin(t * 2.4 + i) * u * 0.05;
        ctx.beginPath(); ctx.moveTo(hx, py - u * 1.0); ctx.lineTo(hx + sw, py - u * 0.6); ctx.stroke();
        ctx.fillStyle = '#fff6e0'; rr(ctx, hx + sw - u * 0.03, py - u * 0.62, u * 0.06, u * 0.22, u * 0.03); ctx.fill();
      }
      break;
    }
    case 'crane': {
      ctx.fillStyle = '#e8b74f';
      rr(ctx, px - u * 0.2, py - u * 1.4, pw + u * 0.4, u * 0.18, u * 0.06); ctx.fill();
      ctx.strokeStyle = '#e8b74f'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px + pw / 2, py - u * 1.3); ctx.lineTo(px + pw / 2, py - u * 0.3); ctx.stroke();
      ell(ctx, px + pw / 2, py - u * 0.24, u * 0.09, u * 0.09); ctx.fillStyle = '#c9c5dd'; ctx.fill();
      break;
    }
    case 'scaffold': {
      ctx.strokeStyle = 'rgba(200,190,220,0.45)'; ctx.lineWidth = 2;
      for (let x = px + u * 0.3; x < px + pw; x += u * 1.2) {
        ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x, py + u * 1.6); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(px, py + u * 0.9); ctx.lineTo(px + pw, py + u * 0.9); ctx.stroke();
      break;
    }
    case 'ferns': {
      for (let i = 0; i < 2; i++) {
        const fx = px + pw * (0.25 + i * 0.5);
        ctx.fillStyle = '#8a5a4a'; rr(ctx, fx - u * 0.16, py - u * 0.26, u * 0.32, u * 0.26, u * 0.06); ctx.fill();
        ctx.strokeStyle = '#6fae8a'; ctx.lineWidth = 2;
        for (let j = -2; j <= 2; j++) {
          ctx.beginPath(); ctx.moveTo(fx, py - u * 0.24);
          ctx.quadraticCurveTo(fx + j * u * 0.14, py - u * 0.6, fx + j * u * 0.22, py - u * (0.5 + Math.abs(j) * 0.06)); ctx.stroke();
        }
      }
      break;
    }
    case 'clothesline': {
      ctx.strokeStyle = 'rgba(200,190,220,0.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px + u * 0.3, py - u * 1.1);
      ctx.quadraticCurveTo(px + pw / 2, py - u * 0.8, px + pw - u * 0.3, py - u * 1.1); ctx.stroke();
      const cols = ['#ff9fd0', '#9fe0b7', '#ffcf6f'];
      for (let i = 0; i < 3; i++) {
        const lx = px + pw * (0.3 + i * 0.2);
        ctx.fillStyle = cols[i];
        rr(ctx, lx, py - u * (0.98 - i * 0.03) + Math.sin(t * 1.6 + i) * 2, u * 0.3, u * 0.42, u * 0.06); ctx.fill();
      }
      ctx.fillStyle = '#8a7f9e';
      ctx.fillRect(px + u * 0.27, py - u * 1.1, u * 0.06, u * 1.1);
      ctx.fillRect(px + pw - u * 0.33, py - u * 1.1, u * 0.06, u * 1.1);
      break;
    }
    case 'market': {
      ctx.fillStyle = '#7a4a3a'; rr(ctx, px + u * 0.5, py - u * 0.4, u * 0.6, u * 0.4, u * 0.05); ctx.fill();
      ctx.fillStyle = '#546a8c'; rr(ctx, px + u * 1.2, py - u * 0.3, u * 0.5, u * 0.3, u * 0.05); ctx.fill();
      ctx.fillStyle = '#ffcf6f'; ell(ctx, px + u * 0.8, py - u * 0.5, u * 0.16, u * 0.08); ctx.fill();
      break;
    }
    case 'eaves': case 'heights': {
      ctx.fillStyle = 'rgba(255,246,224,0.12)';
      for (let i = 0; i < 3; i++) { ell(ctx, px + pw * (0.2 + i * 0.3), py - u * 0.05, u * 0.1, u * 0.04); ctx.fill(); }
      break;
    }
    case 'window': { // Hana's window, at the end of the last roof
      const wx = px + pw - u * 2.6, wy = py - u * 2.4;
      ctx.fillStyle = shade(d.wall, 16);
      rr(ctx, wx - u * 0.3, wy - u * 0.3, u * 2.2, u * 2.75, u * 0.1); ctx.fill();
      glow(ctx, wx + u * 0.8, wy + u * 0.9, u * 2.4, 'rgba(255,207,111,0.6)', 0.65);
      ctx.fillStyle = '#ffcf6f';
      rr(ctx, wx, wy, u * 1.6, u * 2.0, u * 0.12); ctx.fill();
      ctx.strokeStyle = shade(d.wall, 16); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(wx + u * 0.8, wy); ctx.lineTo(wx + u * 0.8, wy + u * 2.0);
      ctx.moveTo(wx, wy + u * 1.0); ctx.lineTo(wx + u * 1.6, wy + u * 1.0); ctx.stroke();
      // sleeping silhouette
      ctx.fillStyle = 'rgba(90,60,60,0.55)';
      ell(ctx, wx + u * 0.45, wy + u * 1.62, u * 0.22, u * 0.18); ctx.fill();
      rr(ctx, wx + u * 0.3, wy + u * 1.7, u * 1.1, u * 0.26, u * 0.1); ctx.fill();
      // flower pot on the sill
      ctx.fillStyle = '#c26a4a'; rr(ctx, wx + u * 1.7, py - u * 0.5, u * 0.34, u * 0.3, u * 0.05); ctx.fill();
      ctx.fillStyle = '#ff9fd0'; ell(ctx, wx + u * 1.87, py - u * 0.62, u * 0.12, u * 0.12); ctx.fill();
      break;
    }
  }
  ctx.restore();
}

// sprinkler: head + arcs of droplets when active
export function drawSprinkler(ctx, sx, sy, u, active, phase, t) {
  ctx.fillStyle = '#8a7f9e';
  rr(ctx, sx - u * 0.1, sy - u * 0.24, u * 0.2, u * 0.24, u * 0.05); ctx.fill();
  if (active) {
    ctx.fillStyle = 'rgba(160,220,255,0.8)';
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI * 0.15 - (i / 10) * Math.PI * 0.7;
      const rad = u * (0.4 + ((t * 3 + i * 0.13) % 1) * 0.9);
      ell(ctx, sx + Math.cos(a) * rad, sy - u * 0.2 + Math.sin(a) * rad * 0.8, u * 0.05, u * 0.05);
      ctx.fill();
    }
  }
}

// ---------- items ----------
export function drawCoin(ctx, x, y, u, t, sparkle, id) {
  const bob = Math.sin(t * 2.4 + id * 1.3) * u * 0.05;
  const spin = Math.abs(Math.sin(t * 2 + id));
  const r = sparkle ? u * 0.34 : u * 0.24;
  y += bob;
  if (sparkle) {
    // shimmer through the house triad only: pink, gold, lavender
    const triad = ['#ff9fd0', '#ffd98a', '#b8a6ff'];
    const step = Math.floor(t * 2) % 3;
    glow(ctx, x, y, r * 3, rgba(triad[step], 0.7), 0.6);
    ctx.fillStyle = mixC(triad[step], triad[(step + 1) % 3], Math.round(((t * 2) % 1) * 8) / 8);
  } else {
    glow(ctx, x, y, r * 2, 'rgba(255,217,138,0.5)', 0.4);
    ctx.fillStyle = '#ffd98a';
  }
  // fish cookie: body + tail
  ctx.save();
  ctx.translate(x, y); ctx.scale(0.4 + spin * 0.6, 1);
  ell(ctx, 0, 0, r, r * 0.72); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(r * 0.7, 0); ctx.lineTo(r * 1.35, -r * 0.5); ctx.lineTo(r * 1.35, r * 0.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(120,80,30,0.65)';
  ell(ctx, -r * 0.4, -r * 0.15, r * 0.08, r * 0.08); ctx.fill();
  ctx.strokeStyle = 'rgba(120,80,30,0.4)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(-r * 0.1, r * 0.1, r * 0.3, 0.2, Math.PI - 0.6); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ell(ctx, r * 0.2, -r * 0.3, r * 0.16, r * 0.09); ctx.fill();
  ctx.restore();
  if (sparkle) {
    for (let i = 0; i < 3; i++) {
      const a = t * 2 + (i * Math.PI * 2) / 3;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      starPath(ctx, x + Math.cos(a) * r * 1.7, y + Math.sin(a) * r * 1.4, u * 0.06); ctx.fill();
    }
  }
}

export function drawPowerup(ctx, x, y, u, t, type, id) {
  const bob = Math.sin(t * 2 + id) * u * 0.08;
  y += bob;
  const r = u * 0.46;
  glow(ctx, x, y, r * 2.4, 'rgba(180,200,255,0.5)', 0.5);
  ctx.fillStyle = 'rgba(200,220,255,0.22)';
  ell(ctx, x, y, r, r); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ell(ctx, x + r * 0.4, y - r * 0.45, r * 0.16, r * 0.1); ctx.fill();
  if (type === 'milk') {
    ctx.fillStyle = '#fff6e0'; rr(ctx, x - u * 0.12, y - u * 0.2, u * 0.24, u * 0.38, u * 0.07); ctx.fill();
    ctx.fillStyle = '#b8a6ff'; rr(ctx, x - u * 0.07, y - u * 0.3, u * 0.14, u * 0.12, u * 0.04); ctx.fill();
    starPath(ctx, x + u * 0.01, y - u * 0.0, u * 0.07); ctx.fillStyle = '#b8a6ff'; ctx.fill();
  } else if (type === 'magnet') {
    ctx.strokeStyle = '#ff7f7f'; ctx.lineWidth = u * 0.11;
    ctx.beginPath(); ctx.arc(x, y - u * 0.04, u * 0.16, Math.PI, 0); ctx.stroke();
    ctx.strokeStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(x - u * 0.16, y - 0.04 * u); ctx.lineTo(x - u * 0.16, y + u * 0.14);
    ctx.moveTo(x + u * 0.16, y - 0.04 * u); ctx.lineTo(x + u * 0.16, y + u * 0.14); ctx.stroke();
  } else { // bell
    ctx.fillStyle = '#ffd98a';
    ctx.beginPath(); ctx.arc(x, y - u * 0.02, u * 0.17, Math.PI, 0);
    ctx.lineTo(x + u * 0.2, y + u * 0.12); ctx.lineTo(x - u * 0.2, y + u * 0.12); ctx.closePath(); ctx.fill();
    ell(ctx, x, y + u * 0.17, u * 0.05, u * 0.05); ctx.fill();
  }
}

// ---------- obstacles ----------
export function drawObstacle(ctx, o, x, y, u, t) {
  if (o.t === 'pigeon') {
    if (o.hit) { // flying away, huffily
      const fT = o.hitT;
      const fx = x + fT * u * 2.2, fy = y - u * 0.5 - fT * u * 3;
      ctx.fillStyle = '#8a8fae';
      ell(ctx, fx, fy, u * 0.22, u * 0.18); ctx.fill();
      const flap = Math.sin(fT * 30) * u * 0.2;
      ell(ctx, fx - u * 0.1, fy - flap * 0.5 - u * 0.05, u * 0.18, u * 0.07); ctx.fill();
      return;
    }
    const breathe = 1 + Math.sin(t * 1.8) * 0.04;
    ctx.fillStyle = '#8a8fae';
    ell(ctx, x, y - u * 0.24 * breathe, u * 0.26, u * 0.24 * breathe); ctx.fill();
    ell(ctx, x + u * 0.14, y - u * 0.42, u * 0.13, u * 0.12); ctx.fill();
    ctx.fillStyle = '#ffb46b';
    ctx.beginPath(); ctx.moveTo(x + u * 0.26, y - u * 0.42); ctx.lineTo(x + u * 0.34, y - u * 0.4); ctx.lineTo(x + u * 0.26, y - u * 0.37); ctx.fill();
    ctx.strokeStyle = '#3a3a4a'; ctx.lineWidth = 1.2; // sleepy closed eye
    ctx.beginPath(); ctx.arc(x + u * 0.15, y - u * 0.43, u * 0.04, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.fillStyle = 'rgba(120,140,200,0.5)';
    if (Math.sin(t * 1.2) > 0.4) { // zzz
      ctx.font = `700 ${u * 0.24}px 'Baloo 2', sans-serif`;
      ctx.fillText('z', x + u * 0.32, y - u * 0.6);
    }
  } else if (o.t === 'ac') {
    ctx.fillStyle = '#9aa2b8';
    rr(ctx, x - u * 0.35, y - u * 0.5, u * 0.7, u * 0.5, u * 0.08); ctx.fill();
    ctx.strokeStyle = '#6a7288'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y - u * 0.26, u * 0.15, 0, Math.PI * 2); ctx.stroke();
    const a = t * (o.hit ? 12 : 4);
    ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * u * 0.13, y - u * 0.26 - Math.sin(a) * u * 0.13);
    ctx.lineTo(x + Math.cos(a) * u * 0.13, y - u * 0.26 + Math.sin(a) * u * 0.13); ctx.stroke();
  } else { // antenna
    const sway = o.hit ? Math.sin(o.hitT * 18) * (1 - Math.min(1, o.hitT)) * 0.2 : 0;
    ctx.save(); ctx.translate(x, y); ctx.rotate(sway);
    ctx.strokeStyle = '#8a8fae'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -u * 0.85); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-u * 0.22, -u * 0.85); ctx.lineTo(u * 0.22, -u * 0.55);
    ctx.moveTo(u * 0.22, -u * 0.85); ctx.lineTo(-u * 0.22, -u * 0.55); ctx.stroke();
    ell(ctx, 0, -u * 0.88, u * 0.05, u * 0.05); ctx.fillStyle = '#ff7f7f'; ctx.fill();
    ctx.restore();
  }
}

// ---------- the goal ----------
export function drawGoal(ctx, x, y, u, t, isWindow) {
  if (isWindow) return; // Hana's window is drawn by the 'window' deco
  ctx.strokeStyle = '#8a7f9e'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - u * 1.5); ctx.stroke();
  const sway = Math.sin(t * 1.4) * u * 0.04;
  glow(ctx, x + sway, y - u * 1.15, u * 1.6, 'rgba(255,207,111,0.65)', 0.7);
  ctx.fillStyle = '#ffcf6f';
  rr(ctx, x - u * 0.26 + sway, y - u * 1.5, u * 0.52, u * 0.7, u * 0.2); ctx.fill();
  ctx.strokeStyle = 'rgba(200,120,60,0.5)'; ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(x - u * 0.26 + sway, y - u * 1.5 + (i * u * 0.7) / 4);
    ctx.lineTo(x + u * 0.26 + sway, y - u * 1.5 + (i * u * 0.7) / 4); ctx.stroke();
  }
  for (let i = 0; i < 4; i++) { // fireflies
    const a = t * (0.8 + i * 0.3) + i * 2;
    const fx = x + Math.cos(a) * u * (0.8 + i * 0.2), fy = y - u * 1.1 + Math.sin(a * 1.3) * u * 0.5;
    glow(ctx, fx, fy, u * 0.24, 'rgba(200,255,150,0.9)', 0.8);
  }
}

// ---------- the laundry cart (flop catcher) ----------
export function drawCart(ctx, x, y, u, squish = 0) {
  y += u * 0.06 * squish; // the whole cart dips as it catches her
  ctx.fillStyle = '#c9c5dd';
  rr(ctx, x - u * 1.1, y - u * 0.9, u * 2.2, u * 0.9, u * 0.14); ctx.fill();
  ctx.fillStyle = '#b0abc9';
  rr(ctx, x - u * 1.1, y - u * 0.9, u * 2.2, u * 0.2, u * 0.1); ctx.fill();
  // soft laundry, flattening under the landing
  const sqx = 1 + 0.2 * squish, sqy = 1 - 0.35 * squish;
  ctx.fillStyle = '#fff3e0'; ell(ctx, x - u * 0.5, y - u * 0.85, u * 0.4 * sqx, u * 0.2 * sqy); ctx.fill();
  ctx.fillStyle = '#ff9fd0'; ell(ctx, x + u * 0.1, y - u * 0.9, u * 0.35 * sqx, u * 0.18 * sqy); ctx.fill();
  ctx.fillStyle = '#9fe0b7'; ell(ctx, x + u * 0.6, y - u * 0.82, u * 0.3 * sqx, u * 0.16 * sqy); ctx.fill();
  ctx.fillStyle = '#6a6288';
  ell(ctx, x - u * 0.7, y + u * 0.05, u * 0.18, u * 0.18); ctx.fill();
  ell(ctx, x + u * 0.7, y + u * 0.05, u * 0.18, u * 0.18); ctx.fill();
}

// ---------- Mochi ----------
// pose: { grounded, vy, runPhase, squash (-1 stretch .. +1 squash), diving, loaf,
//         rot, blink (0..1, 1 = closed), happy, purr (0..1), purrfectFlash (0..1),
//         mossSlide, stumble }
export function drawCat(ctx, x, y, u, pose, skin, t, scarfPts) {
  const s = u; // shorthand: 1 world unit
  const flash = pose.purrfectFlash || 0;
  ctx.save();
  ctx.translate(x, y);
  if (pose.rot) ctx.rotate(pose.rot);
  else if (!pose.grounded && !pose.loaf && !pose.diving) {
    // lean into the arc of the jump
    ctx.rotate(Math.max(-0.18, Math.min(0.3, pose.vy * 0.03)));
  } else if (pose.grounded && !pose.loaf) {
    ctx.rotate(Math.sin(pose.runPhase * Math.PI * 2) * 0.05); // gallop rock
  }
  const sq = pose.squash || 0;
  let sX = 1 + sq * 0.22, sY = 1 - sq * 0.22;
  if (!pose.grounded && !pose.loaf) {
    // stretch on launch, plump at the apex
    const st = Math.max(-0.16, Math.min(0.22, -pose.vy * 0.028));
    sX *= 1 - st * 0.55; sY *= 1 + st;
  }
  if (flash > 0) { sX *= 1 + 0.08 * flash; sY *= 1 + 0.08 * flash; } // purrfect pop
  ctx.scale(sX, sY);

  // purr aura: one soft glow, breathing like a heartbeat that quickens as it swells
  if (pose.purr > 0.02 && !pose.loaf) {
    const beat = 1 + 0.06 * Math.sin(t * 6 + pose.purr * 8);
    const pr = s * (0.75 + pose.purr * 0.55) * beat;
    glow(ctx, 0, -s * 0.42, pr * 1.9, skin.trail, 0.08 + pose.purr * 0.24);
  }
  if (flash > 0 && !pose.loaf) {
    // warm gold halo, not a white wireframe
    const fr = s * (0.9 + (1 - flash) * 0.9);
    ctx.strokeStyle = `rgba(255,217,138,${0.38 * flash})`;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, -s * 0.42, fr, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(255,246,224,${0.25 * flash})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, -s * 0.42, fr, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = rgba(skin.trail === '#fff' ? '#ffd98a' : skin.trail, 0.5 * flash);
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, -s * 0.42, fr * 1.45, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${0.85 * flash})`;
    for (let k = 0; k < 5; k++) {
      const a = t * 2 + (k * Math.PI * 2) / 5;
      starPath(ctx, Math.cos(a) * fr * 1.25, -s * 0.42 + Math.sin(a) * fr * 1.25, s * 0.08);
      ctx.fill();
    }
  }

  // scarf: a fluttering tapered ribbon of Mochi's own path (behind the body)
  if (scarfPts && scarfPts.length > 2) {
    const n = scarfPts.length;
    // centerline: neck anchor, then breadcrumb history with flutter and a soft droop
    const mid = [[-s * 0.1, -s * 0.62]];
    for (let i = 1; i < n; i++) {
      const k = i / (n - 1);
      mid.push([
        scarfPts[i].x - x,
        scarfPts[i].y - y - s * 0.62 + Math.sin(t * 10 - i * 1.1) * s * 0.06 * k + k * k * s * 0.06,
      ]);
    }
    // widths applied along each segment's normal so the ribbon works at any angle
    const top = [], bot = [];
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1);
      const w = s * 0.09 * (1 - k) + s * 0.028;
      const a = mid[Math.max(0, i - 1)], b = mid[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      top.push([mid[i][0] + nx * w, mid[i][1] + ny * w]);
      bot.push([mid[i][0] - nx * w, mid[i][1] - ny * w]);
    }
    ctx.fillStyle = skin.scarf;
    ctx.beginPath();
    ctx.moveTo(top[0][0], top[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(top[i][0], top[i][1]);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
    ctx.closePath(); ctx.fill();
    // darker stripe near the tip
    ctx.strokeStyle = skin.scarf2; ctx.lineCap = 'round';
    ctx.lineWidth = s * 0.045;
    ctx.beginPath();
    const i0 = Math.max(1, n - 4);
    ctx.moveTo(mid[i0][0], mid[i0][1]);
    for (let i = i0 + 1; i < n; i++) ctx.lineTo(mid[i][0], mid[i][1]);
    ctx.stroke();
  }

  const run = pose.grounded && !pose.loaf ? Math.sin(pose.runPhase * Math.PI * 2) : 0;
  const bob = run * s * 0.055;

  // tail: coiled spring on the ground, streaming in the air, ear-pink at the tip
  ctx.strokeStyle = skin.body; ctx.lineCap = 'round'; ctx.lineWidth = s * 0.16;
  let tailEndX, tailEndY;
  ctx.beginPath();
  if (pose.loaf) {
    ctx.moveTo(s * 0.3, -s * 0.18); ctx.quadraticCurveTo(s * 0.62, -s * 0.2, s * 0.55, -s * 0.05);
    tailEndX = s * 0.55; tailEndY = -s * 0.05;
  } else if (pose.grounded) {
    const wag = Math.sin(t * (4 + pose.purr * 6)) * s * 0.12;
    ctx.moveTo(s * 0.34, -s * 0.36); ctx.quadraticCurveTo(s * 0.72, -s * 0.7 + wag, s * 0.6, -s * (0.95 + pose.purr * 0.08) + wag);
    tailEndX = s * 0.6; tailEndY = -s * (0.95 + pose.purr * 0.08) + wag;
  } else {
    const tr = pose.diving ? 0.6 : Math.max(-0.5, Math.min(0.5, -pose.vy * 0.05));
    ctx.moveTo(s * 0.34, -s * 0.4); ctx.quadraticCurveTo(s * 0.85, -s * (0.5 - tr * 0.4), s * 1.0, -s * (0.35 + tr));
    tailEndX = s * 1.0; tailEndY = -s * (0.35 + tr);
  }
  ctx.stroke();
  ctx.fillStyle = skin.ear;
  ell(ctx, tailEndX, tailEndY, s * 0.085, s * 0.085); ctx.fill();

  // legs
  if (!pose.loaf) {
    ctx.strokeStyle = skin.body; ctx.lineWidth = s * 0.17;
    if (pose.grounded) {
      for (let i = 0; i < 4; i++) {
        const ph = pose.runPhase * Math.PI * 2 + (i % 2) * Math.PI + (i < 2 ? 0.5 : 0);
        const lx = -s * 0.24 + (i % 2) * s * 0.16 + (i < 2 ? s * 0.28 : -s * 0.1);
        const ly = Math.max(0, -Math.sin(ph)) * -s * 0.12;
        ctx.beginPath(); ctx.moveTo(lx, -s * 0.25); ctx.lineTo(lx + Math.cos(ph) * s * 0.08, ly); ctx.stroke();
      }
    } else if (pose.diving) {
      ctx.beginPath(); ctx.moveTo(s * 0.18, -s * 0.3); ctx.lineTo(s * 0.48, -s * 0.12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * 0.05, -s * 0.28); ctx.lineTo(s * 0.35, -s * 0.06); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 0.3); ctx.lineTo(-s * 0.45, -s * 0.1); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(s * 0.2, -s * 0.3); ctx.lineTo(s * 0.34, -s * 0.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.25, -s * 0.3); ctx.lineTo(-s * 0.38, -s * 0.14); ctx.stroke();
    }
  }

  // body
  ctx.fillStyle = skin.body;
  if (pose.loaf) { ell(ctx, 0, -s * 0.3 + bob, s * 0.55, s * 0.34); ctx.fill(); }
  else { ell(ctx, 0, -s * 0.38 + bob, s * 0.48, s * 0.36); ctx.fill(); }
  if (skin.pattern === 'tuxedo' || skin.pattern !== 'none') applyPattern(ctx, skin, s, bob);
  ctx.fillStyle = skin.belly;
  ell(ctx, -s * 0.05, -s * 0.26 + bob, s * 0.3, s * 0.2); ctx.fill();

  // head (big!)
  const hx = pose.loaf ? -s * 0.22 : -s * 0.3;
  const hy = (pose.loaf ? -s * 0.6 : -s * 0.72) + bob * 0.6;
  drawCatHead(ctx, hx, hy, s, skin, pose, t);
  // scarf knot just under the chin: a tiny bow
  const flap = Math.sin(t * 5) * s * 0.015;
  ctx.fillStyle = skin.scarf;
  ell(ctx, hx - 0.02 * s, hy + s * 0.41, s * 0.055, s * 0.04); ctx.fill();
  ctx.fillStyle = skin.scarf2;
  ell(ctx, hx + s * 0.07, hy + s * 0.46 + flap, s * 0.032, s * 0.055); ctx.fill();

  ctx.restore();
}

function applyPattern(ctx, skin, s, bob) {
  if (skin.pattern === 'calico') {
    ctx.fillStyle = '#f5a13c'; ell(ctx, s * 0.18, -s * 0.55 + bob, s * 0.18, s * 0.13); ctx.fill();
    ctx.fillStyle = '#4a4a5a'; ell(ctx, -s * 0.1, -s * 0.6 + bob, s * 0.13, s * 0.1); ctx.fill();
  } else if (skin.pattern === 'tabby') {
    ctx.strokeStyle = 'rgba(100,70,45,0.55)'; ctx.lineWidth = s * 0.05;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(s * 0.05 + i * s * 0.14, -s * 0.42 + bob, s * 0.28, -1.9, -0.9); ctx.stroke();
    }
  } else if (skin.pattern === 'neon') {
    ctx.strokeStyle = skin.scarf; ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.8;
    ell(ctx, 0, -s * 0.38 + bob, s * 0.5, s * 0.38); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

export function drawCatHead(ctx, hx, hy, s, skin, pose, t) {
  const blink = pose.blink || 0;
  // ears trail the jump arc
  const earLift = pose.grounded || pose.loaf ? 0 : Math.max(-0.2, Math.min(0.2, (pose.vy || 0) * 0.04));
  // flopped LEFT ear (behind head, drawn folded over)
  ctx.fillStyle = skin.body;
  ctx.save();
  ctx.translate(hx - s * 0.26, hy - s * 0.3);
  ctx.rotate(-0.5 + (pose.earBounce || 0) * 0.35 + earLift);
  ell(ctx, 0, 0, s * 0.17, s * 0.13); ctx.fill();
  ctx.fillStyle = skin.ear; ell(ctx, s * 0.01, s * 0.02, s * 0.09, s * 0.06); ctx.fill();
  ctx.restore();
  // right ear, up
  ctx.fillStyle = skin.body;
  ctx.beginPath();
  ctx.moveTo(hx + s * 0.1, hy - s * 0.32);
  ctx.quadraticCurveTo(hx + s * 0.16, hy - s * 0.62, hx + s * 0.3, hy - s * 0.5);
  ctx.quadraticCurveTo(hx + s * 0.38, hy - s * 0.34, hx + s * 0.3, hy - s * 0.24);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = skin.ear;
  ctx.beginPath();
  ctx.moveTo(hx + s * 0.17, hy - s * 0.36);
  ctx.quadraticCurveTo(hx + s * 0.2, hy - s * 0.52, hx + s * 0.28, hy - s * 0.45);
  ctx.quadraticCurveTo(hx + s * 0.31, hy - s * 0.34, hx + s * 0.26, hy - s * 0.3);
  ctx.closePath(); ctx.fill();
  // head
  ctx.fillStyle = skin.body;
  ell(ctx, hx, hy, s * 0.4, s * 0.36); ctx.fill();
  if (skin.pattern === 'tuxedo') {
    ctx.fillStyle = skin.belly;
    ell(ctx, hx - s * 0.05, hy + s * 0.12, s * 0.24, s * 0.18); ctx.fill();
  }
  if (skin.pattern === 'calico') {
    ctx.fillStyle = '#f5a13c'; ell(ctx, hx + s * 0.2, hy - s * 0.18, s * 0.14, s * 0.11); ctx.fill();
  }
  if (skin.pattern === 'tabby') { // forehead stripes
    ctx.fillStyle = 'rgba(100,70,45,0.55)';
    for (let i = 0; i < 3; i++) {
      rr(ctx, hx - s * 0.14 + i * s * 0.12, hy - s * 0.34, s * 0.05, s * 0.13 + (i === 1 ? s * 0.03 : 0), s * 0.02);
      ctx.fill();
    }
  }
  if (skin.pattern === 'neon') {
    ctx.strokeStyle = skin.scarf; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.8;
    ell(ctx, hx, hy, s * 0.4, s * 0.36); ctx.stroke(); ctx.globalAlpha = 1;
  }
  // eyes: giant, glossy
  const eyeY = hy - s * 0.02;
  for (const ex of [hx - s * 0.16, hx + s * 0.14]) {
    if (pose.happy) {
      ctx.strokeStyle = skin.eye; ctx.lineWidth = s * 0.05; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(ex, eyeY + s * 0.03, s * 0.09, Math.PI + 0.4, -0.4); ctx.stroke();
    } else {
      // pupils look where Mochi is going
      const pdx = pose.diving ? s * 0.028 : pose.grounded ? s * 0.018 : s * 0.01;
      const pdy = pose.loaf ? 0 : Math.max(-s * 0.035, Math.min(s * 0.04, (pose.vy || 0) * 0.008 * s));
      ctx.fillStyle = skin.eye;
      ctx.save();
      ctx.translate(ex, eyeY); ctx.scale(1, Math.max(0.08, 1 - blink));
      ell(ctx, 0, 0, s * 0.105, s * 0.13); ctx.fill();
      ctx.fillStyle = 'rgba(30,20,20,0.85)';
      ell(ctx, pdx, s * 0.01 + pdy, s * 0.065, s * 0.09); ctx.fill();
      ctx.fillStyle = '#fff';
      ell(ctx, -s * 0.03 - pdx * 0.3, -s * 0.05 - pdy * 0.3, s * 0.032, s * 0.04); ctx.fill();
      ell(ctx, s * 0.03, s * 0.04, s * 0.018, s * 0.022); ctx.fill();
      ctx.restore();
    }
  }
  // blush
  ctx.fillStyle = 'rgba(255,150,150,0.45)';
  ell(ctx, hx - s * 0.28, hy + s * 0.1, s * 0.08, s * 0.05); ctx.fill();
  ell(ctx, hx + s * 0.26, hy + s * 0.1, s * 0.08, s * 0.05); ctx.fill();
  // nose + w mouth
  ctx.fillStyle = '#ff9fb0';
  ell(ctx, hx - s * 0.01, hy + s * 0.1, s * 0.035, s * 0.025); ctx.fill();
  ctx.strokeStyle = 'rgba(90,60,60,0.75)'; ctx.lineWidth = s * 0.024; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hx - s * 0.01, hy + s * 0.13);
  ctx.quadraticCurveTo(hx - s * 0.05, hy + s * 0.18, hx - s * 0.09, hy + s * 0.14);
  ctx.moveTo(hx - s * 0.01, hy + s * 0.13);
  ctx.quadraticCurveTo(hx + s * 0.03, hy + s * 0.18, hx + s * 0.07, hy + s * 0.14);
  ctx.stroke();
  // whisker dots
  ctx.fillStyle = 'rgba(90,60,60,0.5)';
  for (let i = 0; i < 3; i++) {
    ell(ctx, hx - s * 0.3 + i * s * 0.035, hy + s * 0.18 + (i % 2) * s * 0.02, s * 0.012, s * 0.012); ctx.fill();
    ell(ctx, hx + s * 0.2 + i * s * 0.035, hy + s * 0.18 + (i % 2) * s * 0.02, s * 0.012, s * 0.012); ctx.fill();
  }
}

// shop portrait: the head with its signature aura and scarf
export function drawCatPortrait(ctx, size, skin) {
  ctx.clearRect(0, 0, size, size);
  glow(ctx, size * 0.5, size * 0.55, size * 0.5, skin.trail, 0.35);
  drawCatHead(ctx, size * 0.5, size * 0.585, size * 0.94, skin, { blink: 0 }, 0);
  // scarf wrapped under the chin
  ctx.fillStyle = skin.scarf;
  rr(ctx, size * 0.18, size * 0.8, size * 0.64, size * 0.14, size * 0.07); ctx.fill();
  ctx.fillStyle = skin.scarf2;
  rr(ctx, size * 0.58, size * 0.86, size * 0.12, size * 0.13, size * 0.05); ctx.fill();
  ell(ctx, size * 0.6, size * 0.85, size * 0.07, size * 0.08); ctx.fill();
}

// ---------- story vignettes ----------
// storybook plate corner shading, built once
let plateShade = null;
function getPlateShade() {
  if (!plateShade) {
    plateShade = document.createElement('canvas');
    plateShade.width = plateShade.height = 128;
    const g = plateShade.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 34, 64, 64, 92);
    grad.addColorStop(0, 'rgba(10,11,30,0)');
    grad.addColorStop(1, 'rgba(10,11,30,0.55)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  }
  return plateShade;
}
export function drawVignette(ctx, W, H, idx, t) {
  ctx.fillStyle = '#131530'; ctx.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H * 0.42, u = Math.min(W, H) / 7.2;
  const mochiSkin = { body: '#fff3e0', belly: '#fffdf7', ear: '#ffb9a8', scarf: '#e0475b', scarf2: '#c23349', trail: '#ffd98a', eye: '#c98a2d', pattern: 'none' };
  // star dust plus a few slow sparkles
  for (let i = 0; i < 40; i++) {
    ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t + i * 1.7));
    ctx.fillStyle = '#fff6e0';
    ctx.fillRect(h32(i) * W, h32(i + 99) * H * 0.6, 1.5, 1.5);
  }
  for (let i = 0; i < 5; i++) {
    ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 1.3 + i * 2.1);
    ctx.fillStyle = '#fff6e0';
    starPath(ctx, h32(i + 400) * W, h32(i + 410) * H * 0.4, 2.5 + h32(i + 420) * 1.5);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // ambient wash: warm beats glow warm, the lonely beat glows cool
  if (idx === 0 || idx === 4) glow(ctx, cx, cy, u * 5.5, 'rgba(255,170,110,0.35)', 0.3);
  else if (idx === 1) glow(ctx, W * 0.25, H * 0.3, u * 4, 'rgba(120,130,220,0.5)', 0.18);
  else glow(ctx, W * 0.75, H * 0.2, u * 4, 'rgba(184,166,255,0.4)', 0.22);

  if (idx === 0) { // the bakery, warm as fresh bread
    // the street the bakery stands on
    ctx.fillStyle = '#1b1d3e'; ctx.fillRect(0, cy + u * 2.0, W, H);
    glow(ctx, cx, cy, u * 4, 'rgba(255,207,111,0.7)', 0.8);
    ctx.fillStyle = '#3a2c40'; rr(ctx, cx - u * 2.6, cy - u * 2.2, u * 5.2, u * 4.2, u * 0.3); ctx.fill();
    ctx.fillStyle = '#ffcf6f'; rr(ctx, cx - u * 1.9, cy - u * 1.5, u * 3.8, u * 2.6, u * 0.2); ctx.fill();
    // light spilling from the window onto the street
    ctx.fillStyle = 'rgba(255,207,111,0.1)';
    ctx.beginPath();
    ctx.moveTo(cx - u * 1.9, cy + u * 1.1); ctx.lineTo(cx + u * 1.9, cy + u * 1.1);
    ctx.lineTo(cx + u * 2.8, H); ctx.lineTo(cx - u * 2.8, H); ctx.fill();
    // scalloped bakery awning
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? '#fff3e0' : '#e8927c';
      const ax = cx - u * 1.9 + i * u * 0.95;
      ctx.beginPath();
      ctx.moveTo(ax, cy - u * 1.55);
      ctx.quadraticCurveTo(ax + u * 0.48, cy - u * 1.95, ax + u * 0.95, cy - u * 1.55);
      ctx.quadraticCurveTo(ax + u * 0.48, cy - u * 1.35, ax, cy - u * 1.55);
      ctx.fill();
    }
    // hanging round sign with a little heart
    ctx.fillStyle = '#7a4a3a'; ell(ctx, cx + u * 2.35, cy - u * 1.0, u * 0.32, u * 0.32); ctx.fill();
    ctx.fillStyle = '#ffcf6f'; heartPath(ctx, cx + u * 2.35, cy - u * 0.98, u * 0.16); ctx.fill();
    // counter with fresh buns
    ctx.fillStyle = '#b06a3a'; rr(ctx, cx - u * 1.9, cy + u * 0.55, u * 3.8, u * 0.55, u * 0.1); ctx.fill();
    for (let i = 0; i < 3; i++) {
      const bx = cx - u * 1.5 + i * u * 0.55 + u * 0.6;
      ctx.fillStyle = '#c98a4a'; ell(ctx, bx, cy + u * 0.45, u * 0.26, u * 0.18); ctx.fill();
      ctx.fillStyle = 'rgba(255,207,111,0.6)'; ell(ctx, bx, cy + u * 0.38, u * 0.16, u * 0.07); ctx.fill();
    }
    // hana, waving at her kitten
    ctx.fillStyle = '#5a3a2e';
    ell(ctx, cx + u * 0.85, cy - u * 0.05, u * 0.45, u * 0.5); ctx.fill();
    ell(ctx, cx + u * 0.85, cy - u * 0.72, u * 0.28, u * 0.28); ctx.fill();
    ell(ctx, cx + u * 0.85, cy - u * 1.04, u * 0.13, u * 0.13); ctx.fill();
    ctx.save();
    ctx.translate(cx + u * 0.45, cy - u * 0.5); ctx.rotate(-0.6);
    ell(ctx, 0, 0, u * 0.28, u * 0.09); ctx.fill();
    ctx.restore();
    // kitten mochi on the sill
    drawCatHead(ctx, cx - u * 0.9, cy + u * 0.5, u * 0.9, mochiSkin, { blink: 0, happy: true }, t);
    // steam hearts rising from the middle bun
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.5 + i * 0.33) % 1;
      ctx.fillStyle = `rgba(255,159,208,${0.7 * (1 - ph)})`;
      heartPath(ctx, cx - u * 0.3 + i * u * 0.35, cy + u * 0.2 - ph * u * 1.4, u * 0.16); ctx.fill();
    }
  } else if (idx === 1) { // the moving truck
    // far skyline behind the road
    ctx.fillStyle = '#1c1e40';
    for (let i = 0; i < 7; i++) {
      const bh = u * (0.5 + h32(i + 30) * 0.9);
      ctx.fillRect(i * W / 6.5, cy + u * 1.6 - bh, W / 8, bh);
    }
    // the road, all the way down
    ctx.fillStyle = '#2a2d5e'; ctx.fillRect(0, cy + u * 1.6, W, H);
    ctx.fillStyle = 'rgba(138,134,168,0.4)';
    for (let x = u * 0.3; x < W; x += u * 1.2) ctx.fillRect(x, cy + u * 2.6, u * 0.5, u * 0.08);
    // the truck, leaving
    ctx.fillStyle = '#c9c5dd';
    rr(ctx, cx - u * 2.2, cy - u * 0.4, u * 3, u * 2, u * 0.2); ctx.fill();
    rr(ctx, cx + u * 0.8, cy + u * 0.4, u * 1.6, u * 1.2, u * 0.2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - u * 1.2, cy - u * 0.3); ctx.lineTo(cx - u * 1.2, cy + u * 1.5);
    ctx.moveTo(cx - u * 0.2, cy - u * 0.3); ctx.lineTo(cx - u * 0.2, cy + u * 1.5); ctx.stroke();
    // taillights
    ctx.fillStyle = '#ff6a7a';
    rr(ctx, cx - u * 2.28, cy + u * 0.2, u * 0.1, u * 0.16, u * 0.03); ctx.fill();
    rr(ctx, cx - u * 2.28, cy + u * 1.1, u * 0.1, u * 0.16, u * 0.03); ctx.fill();
    glow(ctx, cx - u * 2.25, cy + u * 0.28, u * 0.35, 'rgba(255,106,122,0.7)', 0.4);
    glow(ctx, cx - u * 2.25, cy + u * 1.18, u * 0.35, 'rgba(255,106,122,0.7)', 0.4);
    // wheels with hubs
    ctx.fillStyle = '#8a86a8'; ell(ctx, cx - u * 1.3, cy + u * 1.7, u * 0.4, u * 0.4); ctx.fill();
    ell(ctx, cx + u * 1.5, cy + u * 1.7, u * 0.4, u * 0.4); ctx.fill();
    ctx.fillStyle = '#c9c5dd'; ell(ctx, cx - u * 1.3, cy + u * 1.7, u * 0.15, u * 0.15); ctx.fill();
    ell(ctx, cx + u * 1.5, cy + u * 1.7, u * 0.15, u * 0.15); ctx.fill();
    ctx.fillStyle = '#ffcf6f'; rr(ctx, cx + u * 1.0, cy + u * 0.6, u * 0.5, u * 0.5, u * 0.1); ctx.fill();
    // dust drifting behind it
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.6 + i * 0.33) % 1;
      ctx.fillStyle = `rgba(200,195,220,${0.14 * (1 - ph)})`;
      ell(ctx, cx - u * (2.6 + ph * 1.2 + i * 0.3), cy + u * 1.75, u * (0.2 + ph * 0.25), u * (0.14 + ph * 0.14)); ctx.fill();
    }
    // a streetlamp keeps tiny mochi company
    const lampX = cx - u * 2.45;
    ctx.fillStyle = '#232145'; rr(ctx, lampX - u * 0.035, cy - u * 0.3, u * 0.07, u * 1.9, u * 0.03); ctx.fill();
    ctx.fillStyle = '#3a3160'; ell(ctx, lampX, cy - u * 0.35, u * 0.16, u * 0.13); ctx.fill();
    ctx.fillStyle = '#ffcf6f'; ell(ctx, lampX, cy - u * 0.3, u * 0.07, u * 0.06); ctx.fill();
    glow(ctx, lampX, cy - u * 0.35, u * 1.3, 'rgba(255,207,111,0.6)', 0.45);
    ctx.fillStyle = 'rgba(255,207,111,0.07)';
    ctx.beginPath();
    ctx.moveTo(lampX, cy - u * 0.3);
    ctx.lineTo(lampX - u * 0.9, cy + u * 1.62); ctx.lineTo(lampX + u * 0.9, cy + u * 1.62); ctx.fill();
    drawCat(ctx, cx - u * 2.8, cy + u * 1.6, u * 0.7, { grounded: true, loaf: true, blink: 0, purr: 0 }, mochiSkin, t, null);
    glow(ctx, W * 0.8, H * 0.15, u * 2, 'rgba(255,246,224,0.6)', 0.6);
    ctx.fillStyle = '#fff6e0'; ell(ctx, W * 0.8, H * 0.15, u * 0.8, u * 0.8); ctx.fill();
  } else if (idx === 2) { // brave cat with a purr
    glow(ctx, cx, cy - u, u * 5, 'rgba(255,246,224,0.5)', 0.6);
    ctx.fillStyle = '#f3e4c4'; ell(ctx, cx, cy - u, u * 2.2, u * 2.2); ctx.fill();
    ctx.fillStyle = 'rgba(255,170,160,0.35)';
    ell(ctx, cx - u, cy - u * 1.7, u * 0.4, u * 0.22); ctx.fill();
    ell(ctx, cx + u, cy - u * 1.7, u * 0.4, u * 0.22); ctx.fill();
    // the purr, radiating like a heartbeat (clipped below by the roof)
    for (let k = 0; k < 2; k++) {
      const ph = (t * 0.7 + k * 0.5) % 1;
      ctx.strokeStyle = `rgba(255,217,138,${0.3 * (1 - ph)})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy + u * 0.9, u * 1.5 * (1.15 + 0.45 * ph), 0, Math.PI * 2); ctx.stroke();
    }
    // rooftop with tiled edge and chimneys
    ctx.fillStyle = '#2c2a4d'; rr(ctx, cx - W, cy + u * 1.3, W * 2, u * 3, u * 0.2); ctx.fill();
    ctx.fillStyle = '#232145';
    rr(ctx, cx - u * 2.85, cy + u * 0.65, u * 0.5, u * 0.7, u * 0.08); ctx.fill();
    rr(ctx, cx + u * 2.35, cy + u * 0.65, u * 0.5, u * 0.7, u * 0.08); ctx.fill();
    ctx.strokeStyle = 'rgba(255,246,224,0.12)'; ctx.lineWidth = 2;
    for (let x = cx - u * 3.2; x < cx + u * 3.4; x += u * 0.7) {
      ctx.beginPath(); ctx.arc(x, cy + u * 1.32, u * 0.35, Math.PI, 0); ctx.stroke();
    }
    // her silhouette held against the moon
    ctx.fillStyle = 'rgba(25,23,58,0.2)';
    ell(ctx, cx, cy + u * 0.75, u * 1.42, u * 1.2); ctx.fill();
    drawCat(ctx, cx, cy + u * 1.35, u * 1.5, { grounded: true, runPhase: 0, blink: 0, purr: 0.9, squash: 0 }, mochiSkin, t, null);
    starPath(ctx, cx + u * 1.4, cy - u * 1.8, u * 0.18); ctx.fillStyle = '#fff'; ctx.fill();
  } else if (idx === 3) { // halfway, under the awning
    glow(ctx, W * 0.75, H * 0.2, u * 3, 'rgba(255,246,224,0.6)', 0.7);
    ctx.fillStyle = '#fff6e0'; ell(ctx, W * 0.75, H * 0.2, u * 1.4, u * 1.4); ctx.fill();
    // lower town, asleep
    ctx.fillStyle = '#1c1e40';
    for (let i = 0; i < 8; i++) {
      const bh = u * (0.6 + h32(i + 50) * 1.3);
      const bx = (i * W) / 7.4;
      ctx.fillRect(bx, cy + u * 1.35 - bh, W / 9, bh);
      ctx.fillStyle = 'rgba(255,207,111,0.5)';
      for (let wY = 0; wY < 3; wY++) {
        if (h32(i * 9 + wY) > 0.55) {
          ctx.globalAlpha = 0.3 + h32(i * 7 + wY) * 0.5;
          ctx.fillRect(bx + W / 40, cy + u * 1.35 - bh + u * (0.15 + wY * 0.3), u * 0.12, u * 0.16);
        }
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#1c1e40';
    }
    ctx.fillStyle = '#2c2a4d'; rr(ctx, cx - W, cy + u * 1.3, W * 2, u * 3, u * 0.2); ctx.fill();
    // the shopfront she shelters against
    ctx.fillStyle = '#3a3160'; rr(ctx, cx - u * 2.55, cy - u * 0.55, u * 5.1, u * 1.9, u * 0.1); ctx.fill();
    ctx.fillStyle = 'rgba(255,217,138,0.85)';
    rr(ctx, cx + u * 1.1, cy + u * 0.2, u * 0.7, u * 0.55, u * 0.1); ctx.fill();
    // awning overhead, anchored properly
    ctx.fillStyle = '#232145'; rr(ctx, cx - u * 2.55, cy - u * 0.62, u * 5.1, u * 0.12, 2); ctx.fill();
    rr(ctx, cx - u * 2.4, cy - u * 0.55, u * 0.08, u * 1.9, u * 0.03); ctx.fill();
    rr(ctx, cx + u * 2.32, cy - u * 0.55, u * 0.08, u * 1.9, u * 0.03); ctx.fill();
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 ? '#fff3e0' : '#ff9fd0';
      const ax = cx - u * 2.5 + i * u;
      ctx.beginPath();
      ctx.moveTo(ax, cy - u * 0.55);
      ctx.quadraticCurveTo(ax + u * 0.5, cy - u * 1.0, ax + u, cy - u * 0.55);
      ctx.quadraticCurveTo(ax + u * 0.5, cy - u * 0.32, ax, cy - u * 0.55);
      ctx.fill();
    }
    // soft shade under the awning
    ctx.fillStyle = 'rgba(19,21,48,0.3)';
    ctx.fillRect(cx - u * 2.5, cy - u * 0.5, u * 5, u * 0.35);
    drawCat(ctx, cx - u * 0.4, cy + u * 1.35, u * 1.3, { grounded: true, loaf: true, blink: Math.sin(t * 0.7) > 0.9 ? 1 : 0, purr: 0.5 }, mochiSkin, t, null);
  } else { // goodnight, Hana
    // the street below, with her window light spilling down
    ctx.fillStyle = '#1b1d3e'; ctx.fillRect(0, cy + u * 2.1, W, H);
    glow(ctx, cx, cy, u * 4.4, 'rgba(255,207,111,0.75)', 0.85);
    ctx.fillStyle = '#3a2c40'; rr(ctx, cx - u * 2.4, cy - u * 2.4, u * 4.8, u * 4.2, u * 0.3); ctx.fill();
    ctx.fillStyle = '#ffcf6f'; rr(ctx, cx - u * 1.8, cy - u * 1.8, u * 3.6, u * 3.0, u * 0.2); ctx.fill();
    ctx.fillStyle = 'rgba(255,207,111,0.1)';
    ctx.beginPath();
    ctx.moveTo(cx - u * 1.8, cy + u * 1.2); ctx.lineTo(cx + u * 1.8, cy + u * 1.2);
    ctx.lineTo(cx + u * 2.6, H); ctx.lineTo(cx - u * 2.6, H); ctx.fill();
    // curtains at the window edges
    ctx.fillStyle = 'rgba(232,138,160,0.45)';
    rr(ctx, cx - u * 1.8, cy - u * 1.8, u * 0.35, u * 3.0, u * 0.1); ctx.fill();
    rr(ctx, cx + u * 1.45, cy - u * 1.8, u * 0.35, u * 3.0, u * 0.1); ctx.fill();
    // bed + sleeping hana, smiling
    ctx.fillStyle = '#e88aa0'; rr(ctx, cx - u * 1.4, cy + u * 0.2, u * 2.6, u * 0.7, u * 0.2); ctx.fill();
    ctx.fillStyle = '#d97690'; rr(ctx, cx - u * 1.4, cy + u * 0.2, u * 2.6, u * 0.12, u * 0.06); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (let i = 0; i < 3; i++) { ell(ctx, cx - u * 0.8 + i * u * 0.7, cy + u * 0.55, u * 0.05, u * 0.05); ctx.fill(); }
    ctx.fillStyle = '#fff3e0'; ell(ctx, cx - u * 1.15, cy + u * 0.3, u * 0.36, u * 0.2); ctx.fill();
    ctx.fillStyle = '#7a4a3a'; ell(ctx, cx - u * 1.0, cy + u * 0.1, u * 0.3, u * 0.28); ctx.fill();
    ctx.strokeStyle = '#3a2418'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); // closed sleeping eyes
    ctx.arc(cx - u * 1.1, cy + u * 0.08, u * 0.05, 0.3, Math.PI - 0.3);
    ctx.moveTo(cx - u * 0.85, cy + u * 0.08);
    ctx.arc(cx - u * 0.9, cy + u * 0.08, u * 0.05, 0.3, Math.PI - 0.3);
    ctx.stroke();
    ctx.strokeStyle = '#5a3a2a'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx - u * 1.0, cy + u * 0.18, u * 0.1, 0.4, Math.PI - 0.4); ctx.stroke();
    // the sill, and mochi resting on it with her gift
    ctx.fillStyle = '#4a3a55'; rr(ctx, cx - u * 2.0, cy + u * 1.42, u * 4.0, u * 0.32, u * 0.08); ctx.fill();
    ctx.fillStyle = '#6a5a78'; rr(ctx, cx - u * 2.0, cy + u * 1.42, u * 4.0, u * 0.07, u * 0.03); ctx.fill();
    drawCat(ctx, cx - u * 0.2, cy + u * 1.44, u * 1.1, { grounded: true, loaf: true, blink: 0, happy: true, purr: 0.8 }, mochiSkin, t, null);
    const twk = 1 + 0.1 * Math.sin(t * 3);
    glow(ctx, cx + u * 0.8, cy + u * 1.14, u * 0.6, 'rgba(255,217,138,0.8)', 0.5);
    starPath(ctx, cx + u * 0.8, cy + u * 1.14, u * 0.24 * twk);
    ctx.fillStyle = '#ffd98a'; ctx.fill();
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.4 + i * 0.33) % 1;
      ctx.fillStyle = `rgba(255,159,208,${0.8 * (1 - ph)})`;
      heartPath(ctx, cx + u * (0.5 - i * 0.5), cy + u * 0.9 - ph * u, u * (0.12 + i * 0.03)); ctx.fill();
    }
  }
  // storybook plate: corner shading + a fine gold frame
  ctx.drawImage(getPlateShade(), 0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,217,138,0.14)'; ctx.lineWidth = 1.5;
  rr(ctx, 7, 7, W - 14, H - 14, 20); ctx.stroke();
}
