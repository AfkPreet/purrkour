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
export function glow(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
const h32 = (n) => { let x = (n | 0) ^ 0x9e3779b9; x = Math.imul(x ^ (x >>> 16), 0x85ebca6b); x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };

// ---------- sky ----------
export function drawSky(ctx, W, H, d, t, camX) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, d.skyTop); g.addColorStop(1, d.skyBot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // stars (slow parallax)
  const off = camX * 0.02;
  for (let i = 0; i < 70; i++) {
    const sx = ((h32(i) * 1.7 * W - off * 40) % (W + 20) + W + 20) % (W + 20) - 10;
    const sy = h32(i + 500) * H * 0.75;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.5 + h32(i + 900)) + i));
    ctx.globalAlpha = tw * 0.8;
    ctx.fillStyle = '#fff6e0';
    const r = 0.8 + h32(i + 300) * 1.6;
    ctx.fillRect(sx, sy, r, r);
  }
  ctx.globalAlpha = 1;
  // the moon, huge and blushing
  const mx = W * 0.78, my = H * 0.2, mr = Math.min(W, H) * 0.13;
  glow(ctx, mx, my, mr * 2.6, 'rgba(255,246,224,0.55)', 0.5);
  ctx.fillStyle = '#fff6e0'; ell(ctx, mx, my, mr, mr); ctx.fill();
  ctx.fillStyle = 'rgba(228,205,170,0.5)';
  ell(ctx, mx - mr * 0.3, my - mr * 0.25, mr * 0.16, mr * 0.16); ctx.fill();
  ell(ctx, mx + mr * 0.25, my + mr * 0.1, mr * 0.11, mr * 0.11); ctx.fill();
  ell(ctx, mx - mr * 0.05, my + mr * 0.4, mr * 0.09, mr * 0.09); ctx.fill();
  ctx.fillStyle = 'rgba(255,170,160,0.35)'; // moon blush
  ell(ctx, mx - mr * 0.5, my + mr * 0.32, mr * 0.18, mr * 0.1); ctx.fill();
  ell(ctx, mx + mr * 0.5, my + mr * 0.32, mr * 0.18, mr * 0.1); ctx.fill();
  // drifting clouds
  for (let i = 0; i < 3; i++) {
    const cx = ((h32(i + 40) * (W * 1.6) + t * (4 + i * 2) - off * 60) % (W * 1.4)) - W * 0.2;
    const cy = H * (0.12 + h32(i + 60) * 0.25);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ell(ctx, cx, cy, 60 + i * 30, 16 + i * 5); ctx.fill();
    ell(ctx, cx + 40, cy - 10, 40 + i * 20, 14 + i * 4); ctx.fill();
  }
}

// ---------- skyline layers ----------
export function drawSkyline(ctx, W, H, d, camX, layer) {
  const speed = layer === 0 ? 0.12 : 0.35;
  const color = layer === 0 ? d.far : d.mid;
  const base = layer === 0 ? H * 0.9 : H * 1.02;
  const off = camX * speed;
  const bw = layer === 0 ? 90 : 120;
  ctx.fillStyle = color;
  const first = Math.floor(off / bw) - 1;
  for (let i = first; i * bw - off < W + bw; i++) {
    const x = i * bw - off;
    const hgt = (layer === 0 ? 0.28 : 0.4) * H * (0.5 + h32(i * 7 + layer * 999));
    const w = bw * (0.55 + h32(i * 13 + layer) * 0.4);
    rr(ctx, x, base - hgt, w, hgt + 40, 6);
    ctx.fill();
    if (h32(i * 3 + layer) > 0.5) { // water tower / antenna silhouettes
      ctx.fillRect(x + w * 0.3, base - hgt - 14, 2, 14);
      ell(ctx, x + w * 0.3 + 1, base - hgt - 16, 4, 3); ctx.fill();
    }
    if (layer === 1) { // lit windows
      const rows = Math.floor(hgt / 26), cols = Math.floor(w / 20);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const k = h32(i * 131 + r * 17 + c * 7);
        if (k > 0.72) {
          ctx.fillStyle = `rgba(255,207,111,${0.25 + k * 0.4})`;
          rr(ctx, x + 8 + c * 20, base - hgt + 10 + r * 26, 9, 12, 2); ctx.fill();
        }
      }
      ctx.fillStyle = color;
    }
  }
}

// ---------- platforms (buildings + roofs) ----------
export function drawPlatform(ctx, px, py, pw, u, p, d, t, camBottom) {
  const wallH = camBottom - py + 10;
  // wall
  const wg = ctx.createLinearGradient(0, py, 0, py + Math.max(wallH, 1));
  wg.addColorStop(0, d.wall); wg.addColorStop(1, shade(d.wall, -18));
  ctx.fillStyle = wg;
  ctx.fillRect(px + 2, py + u * 0.12, pw - 4, wallH);
  // windows on the wall
  const cols = Math.max(1, Math.floor(pw / (u * 1.1)));
  const rows = Math.min(6, Math.max(1, Math.floor(wallH / (u * 1.3))));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const k = h32(p.i * 733 + r * 31 + c * 11);
    if (k > 0.5) {
      const lit = k > 0.78;
      ctx.fillStyle = lit ? d.wallLit : 'rgba(20,20,40,0.5)';
      const wx = px + u * 0.35 + c * (pw - u * 0.6) / cols;
      const wy = py + u * 0.7 + r * u * 1.3;
      rr(ctx, wx, wy, u * 0.5, u * 0.65, u * 0.08); ctx.fill();
      if (lit && h32(p.i * 91 + r * 7 + c) > 0.8) { // a little cat silhouette in a window
        ctx.fillStyle = 'rgba(30,25,50,0.85)';
        ell(ctx, wx + u * 0.25, wy + u * 0.5, u * 0.12, u * 0.1); ctx.fill();
        ell(ctx, wx + u * 0.25, wy + u * 0.36, u * 0.08, u * 0.08); ctx.fill();
      }
    }
  }
  // roof slab
  const roofC = p.crumble ? shade(d.roof, -8) : d.roof;
  ctx.fillStyle = roofC;
  rr(ctx, px, py - u * 0.06, pw, u * 0.3, u * 0.1); ctx.fill();
  ctx.fillStyle = d.roofEdge;
  rr(ctx, px, py + u * 0.14, pw, u * 0.12, u * 0.05); ctx.fill();
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
  } else if (d.key === 'heights') {
    ctx.fillStyle = 'rgba(255,246,224,0.18)';
    rr(ctx, px, py - u * 0.06, pw, u * 0.08, u * 0.04); ctx.fill();
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
      if (on) glow(ctx, sx + u * 0.35, py - u * 1.1, u * 1.4, d.accent, 0.35);
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
    const hue = (t * 90) % 360;
    glow(ctx, x, y, r * 3, `hsla(${hue},90%,70%,0.7)`, 0.6);
    ctx.fillStyle = `hsl(${hue},85%,72%)`;
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
  ell(ctx, -r * 0.2, -r * 0.3, r * 0.16, r * 0.09); ctx.fill();
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
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ell(ctx, x - r * 0.4, y - r * 0.45, r * 0.16, r * 0.1); ctx.fill();
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
      ctx.font = `${u * 0.24}px sans-serif`;
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
export function drawCart(ctx, x, y, u) {
  ctx.fillStyle = '#c9c5dd';
  rr(ctx, x - u * 1.1, y - u * 0.9, u * 2.2, u * 0.9, u * 0.14); ctx.fill();
  ctx.fillStyle = '#b0abc9';
  rr(ctx, x - u * 1.1, y - u * 0.9, u * 2.2, u * 0.2, u * 0.1); ctx.fill();
  // soft laundry
  ctx.fillStyle = '#fff3e0'; ell(ctx, x - u * 0.5, y - u * 0.85, u * 0.4, u * 0.2); ctx.fill();
  ctx.fillStyle = '#ff9fd0'; ell(ctx, x + u * 0.1, y - u * 0.9, u * 0.35, u * 0.18); ctx.fill();
  ctx.fillStyle = '#9fe0b7'; ell(ctx, x + u * 0.6, y - u * 0.82, u * 0.3, u * 0.16); ctx.fill();
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
  ctx.save();
  ctx.translate(x, y);
  if (pose.rot) ctx.rotate(pose.rot);
  const sq = pose.squash || 0;
  ctx.scale(1 + sq * 0.22, 1 - sq * 0.22);

  // purr aura
  if (pose.purr > 0.02 && !pose.loaf) {
    const pr = s * (0.75 + pose.purr * 0.55);
    glow(ctx, 0, -s * 0.42, pr * 1.9, skin.trail, 0.10 + pose.purr * 0.3);
    if (pose.purrfectFlash > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${0.75 * pose.purrfectFlash})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, -s * 0.42, pr * (1.5 - pose.purrfectFlash * 0.4), 0, Math.PI * 2); ctx.stroke();
    }
  }

  // scarf ribbon (behind the body)
  if (scarfPts && scarfPts.length > 1) {
    ctx.strokeStyle = skin.scarf;
    ctx.lineCap = 'round';
    for (let i = 1; i < scarfPts.length; i++) {
      const p0 = scarfPts[i - 1], p1 = scarfPts[i];
      ctx.lineWidth = s * 0.16 * (1 - i / scarfPts.length) + 1.2;
      ctx.beginPath(); ctx.moveTo(p0.x - x, p0.y - y - s * 0.5); ctx.lineTo(p1.x - x, p1.y - y - s * 0.5); ctx.stroke();
    }
  }

  const run = pose.grounded && !pose.loaf ? Math.sin(pose.runPhase * Math.PI * 2) : 0;
  const bob = run * s * 0.03;

  // tail: coiled spring on the ground, streaming in the air
  ctx.strokeStyle = skin.body; ctx.lineCap = 'round'; ctx.lineWidth = s * 0.16;
  ctx.beginPath();
  if (pose.loaf) {
    ctx.moveTo(s * 0.3, -s * 0.18); ctx.quadraticCurveTo(s * 0.62, -s * 0.2, s * 0.55, -s * 0.05);
  } else if (pose.grounded) {
    const wag = Math.sin(t * (4 + pose.purr * 6)) * s * 0.12;
    ctx.moveTo(s * 0.34, -s * 0.36); ctx.quadraticCurveTo(s * 0.72, -s * 0.7 + wag, s * 0.6, -s * (0.95 + pose.purr * 0.08) + wag);
  } else {
    const tr = pose.diving ? 0.6 : Math.max(-0.5, Math.min(0.5, -pose.vy * 0.05));
    ctx.moveTo(s * 0.34, -s * 0.4); ctx.quadraticCurveTo(s * 0.85, -s * (0.5 - tr * 0.4), s * 1.0, -s * (0.35 + tr));
  }
  ctx.stroke();
  ctx.strokeStyle = skin.scarf2; ctx.lineWidth = s * 0.16;
  // (tail tip in a darker tone)
  const tip = ctx.lineWidth; ctx.lineWidth = tip;

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
  // flopped LEFT ear (behind head, drawn folded over)
  ctx.fillStyle = skin.body;
  ctx.save();
  ctx.translate(hx - s * 0.26, hy - s * 0.3);
  ctx.rotate(-0.5 + (pose.earBounce || 0) * 0.35);
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
      ctx.fillStyle = skin.eye;
      ctx.save();
      ctx.translate(ex, eyeY); ctx.scale(1, Math.max(0.08, 1 - blink));
      ell(ctx, 0, 0, s * 0.105, s * 0.13); ctx.fill();
      ctx.fillStyle = 'rgba(30,20,20,0.85)';
      ell(ctx, 0, s * 0.01, s * 0.065, s * 0.09); ctx.fill();
      ctx.fillStyle = '#fff';
      ell(ctx, -s * 0.03, -s * 0.05, s * 0.032, s * 0.04); ctx.fill();
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

// shop portrait: just the head, big
export function drawCatPortrait(ctx, size, skin) {
  ctx.clearRect(0, 0, size, size);
  drawCatHead(ctx, size * 0.52, size * 0.55, size * 1.05, skin, { blink: 0 }, 0);
}

// ---------- story vignettes ----------
export function drawVignette(ctx, W, H, idx, t) {
  ctx.fillStyle = '#131530'; ctx.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H * 0.42, u = Math.min(W, H) / 7.2;
  const mochiSkin = { body: '#fff3e0', belly: '#fffdf7', ear: '#ffb9a8', scarf: '#e0475b', scarf2: '#c23349', trail: '#ffd98a', eye: '#c98a2d', pattern: 'none' };
  // stars everywhere
  for (let i = 0; i < 40; i++) {
    ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t + i * 1.7));
    ctx.fillStyle = '#fff6e0';
    ctx.fillRect(h32(i) * W, h32(i + 99) * H * 0.6, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;
  if (idx === 0) { // the bakery, warm as fresh bread
    glow(ctx, cx, cy, u * 4, 'rgba(255,207,111,0.7)', 0.8);
    ctx.fillStyle = '#3a2c40'; rr(ctx, cx - u * 2.6, cy - u * 2.2, u * 5.2, u * 4, u * 0.3); ctx.fill();
    ctx.fillStyle = '#ffcf6f'; rr(ctx, cx - u * 1.9, cy - u * 1.5, u * 3.8, u * 2.6, u * 0.2); ctx.fill();
    // hana silhouette (bun hair)
    ctx.fillStyle = '#7a4a3a';
    ell(ctx, cx + u * 0.7, cy - u * 0.1, u * 0.45, u * 0.5); ctx.fill();
    ell(ctx, cx + u * 0.7, cy - u * 0.72, u * 0.34, u * 0.34); ctx.fill();
    ell(ctx, cx + u * 0.7, cy - u * 1.06, u * 0.14, u * 0.14); ctx.fill();
    // kitten mochi on the sill
    drawCatHead(ctx, cx - u * 0.9, cy + u * 0.5, u * 0.9, mochiSkin, { blink: 0, happy: true }, t);
    // steam hearts
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.5 + i * 0.33) % 1;
      ctx.fillStyle = `rgba(255,159,208,${0.7 * (1 - ph)})`;
      heartPath(ctx, cx - u * 1.6 + i * u * 0.5, cy - u * 0.4 - ph * u * 1.4, u * 0.16); ctx.fill();
    }
  } else if (idx === 1) { // the moving truck
    ctx.fillStyle = '#2a2d5e'; ctx.fillRect(0, cy + u * 1.6, W, u * 2);
    ctx.fillStyle = '#c9c5dd';
    rr(ctx, cx - u * 2.2, cy - u * 0.4, u * 3, u * 2, u * 0.2); ctx.fill();
    rr(ctx, cx + u * 0.8, cy + u * 0.4, u * 1.6, u * 1.2, u * 0.2); ctx.fill();
    ctx.fillStyle = '#8a86a8'; ell(ctx, cx - u * 1.3, cy + u * 1.7, u * 0.4, u * 0.4); ctx.fill();
    ell(ctx, cx + u * 1.5, cy + u * 1.7, u * 0.4, u * 0.4); ctx.fill();
    ctx.fillStyle = '#ffcf6f'; rr(ctx, cx + u * 1.0, cy + u * 0.6, u * 0.5, u * 0.5, u * 0.1); ctx.fill();
    // tiny mochi watching, small and far
    drawCat(ctx, cx - u * 3.3, cy + u * 1.6, u * 0.7, { grounded: true, loaf: true, blink: 0, purr: 0 }, mochiSkin, t, null);
    glow(ctx, W * 0.8, H * 0.15, u * 2, 'rgba(255,246,224,0.6)', 0.6);
    ctx.fillStyle = '#fff6e0'; ell(ctx, W * 0.8, H * 0.15, u * 0.8, u * 0.8); ctx.fill();
  } else if (idx === 2) { // brave cat with a purr
    glow(ctx, cx, cy - u, u * 5, 'rgba(255,246,224,0.5)', 0.6);
    ctx.fillStyle = '#fff6e0'; ell(ctx, cx, cy - u, u * 2.2, u * 2.2); ctx.fill();
    ctx.fillStyle = 'rgba(255,170,160,0.35)';
    ell(ctx, cx - u, cy - u * 0.3, u * 0.4, u * 0.22); ctx.fill();
    ell(ctx, cx + u, cy - u * 0.3, u * 0.4, u * 0.22); ctx.fill();
    ctx.fillStyle = '#2c2a4d'; rr(ctx, cx - W, cy + u * 1.3, W * 2, u * 3, u * 0.2); ctx.fill();
    drawCat(ctx, cx, cy + u * 1.35, u * 1.5, { grounded: true, runPhase: 0, blink: 0, purr: 0.9, squash: 0 }, mochiSkin, t, null);
    starPath(ctx, cx + u * 1.4, cy - u * 1.8, u * 0.18); ctx.fillStyle = '#fff'; ctx.fill();
  } else if (idx === 3) { // halfway, under the awning
    glow(ctx, W * 0.75, H * 0.2, u * 3, 'rgba(255,246,224,0.6)', 0.7);
    ctx.fillStyle = '#fff6e0'; ell(ctx, W * 0.75, H * 0.2, u * 1.4, u * 1.4); ctx.fill();
    ctx.fillStyle = '#2c2a4d'; rr(ctx, cx - W, cy + u * 1.3, W * 2, u * 3, u * 0.2); ctx.fill();
    // awning
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? '#fff3e0' : '#ff9fd0';
      ctx.beginPath();
      ctx.moveTo(cx - u * 2 + i * u, cy + u * 0.1);
      ctx.quadraticCurveTo(cx - u * 1.5 + i * u, cy - u * 0.3, cx - u + i * u, cy + u * 0.1);
      ctx.lineTo(cx - u + i * u, cy + u * 0.35); ctx.lineTo(cx - u * 2 + i * u, cy + u * 0.35); ctx.fill();
    }
    drawCat(ctx, cx - u * 0.4, cy + u * 1.35, u * 1.3, { grounded: true, loaf: true, blink: Math.sin(t * 0.7) > 0.9 ? 1 : 0, purr: 0.5 }, mochiSkin, t, null);
    // city lights below
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = `rgba(255,207,111,${0.3 + h32(i) * 0.5})`;
      rr(ctx, W * h32(i * 3), cy + u * (2 + h32(i + 7)), u * 0.14, u * 0.2, 2); ctx.fill();
    }
  } else { // goodnight, Hana
    glow(ctx, cx, cy, u * 4.4, 'rgba(255,207,111,0.75)', 0.85);
    ctx.fillStyle = '#3a2c40'; rr(ctx, cx - u * 2.4, cy - u * 2.4, u * 4.8, u * 4.2, u * 0.3); ctx.fill();
    ctx.fillStyle = '#ffcf6f'; rr(ctx, cx - u * 1.8, cy - u * 1.8, u * 3.6, u * 3.0, u * 0.2); ctx.fill();
    // bed + sleeping hana, smiling
    ctx.fillStyle = '#e88aa0'; rr(ctx, cx - u * 1.4, cy + u * 0.2, u * 2.6, u * 0.7, u * 0.2); ctx.fill();
    ctx.fillStyle = '#7a4a3a'; ell(ctx, cx - u * 1.0, cy + u * 0.1, u * 0.3, u * 0.28); ctx.fill();
    ctx.strokeStyle = '#5a3a2a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx - u * 1.0, cy + u * 0.16, u * 0.12, 0.3, Math.PI - 0.3); ctx.stroke();
    // mochi on the sill with the gift
    drawCat(ctx, cx - u * 0.2, cy + u * 1.9, u * 1.1, { grounded: true, loaf: true, blink: 0, happy: true, purr: 0.8 }, mochiSkin, t, null);
    starPath(ctx, cx + u * 0.75, cy + u * 1.62, u * 0.16);
    ctx.fillStyle = '#ffd98a'; ctx.fill();
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.4 + i * 0.33) % 1;
      ctx.fillStyle = `rgba(255,159,208,${0.8 * (1 - ph)})`;
      heartPath(ctx, cx + u * (0.5 - i * 0.5), cy + u * 0.9 - ph * u, u * (0.12 + i * 0.03)); ctx.fill();
    }
  }
}
