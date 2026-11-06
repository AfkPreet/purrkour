// Purrkour - level data and geometry compiler. Pure module: must run under Node (no DOM).
import { PHYS, DISTRICTS, LEVEL_NAMES, districtFor, jumpVel } from './config.js';

// ---------- tiny seeded RNG (deterministic decorations + endless mode) ----------
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- authoring DSL ----------
// R(width, dy, opts) - a roof. dy > 0 steps DOWN, dy < 0 steps UP (relative to previous roof).
// G(width, opts) - a gap. opts: { wind: +u/s tailwind while airborne, coins:false to skip the arc,
//                                 sparkle: extra height for a hidden Sparkle Fish over this gap }
const R = (w, dy = 0, opts = {}) => ({ t: 'roof', w, dy, ...opts });
const G = (w, opts = {}) => ({ t: 'gap', w, ...opts });

// Roof opts:
//   obs: [{ t:'pigeon'|'ac'|'antenna', x }]  x relative to roof start
//   power: { t:'milk'|'magnet'|'bell', x }
//   moss: [[x0,x1]]      slippery band (no jumping while on it), relative coords
//   bouncy: true         striped awning - auto-bounce on landing
//   crumble: true        wobbles, then drops PHYS.crumbleDelay after first touch
//   mover: { amp, period } vertical sine motion
//   sprinkler: { x, period, duty } water arc above the roof, cycling on/off
//   coins: 'line'|false  coin row on the roof (default 'line' when w >= 4.4 and clear)
//   sparkle: { x, up }   hidden Sparkle Fish floating `up` units above this roof
//   deco: string         art hint ('chimney','clock','sign','train','greenhouse','window',...)

// ---------- the 20 levels ----------
// District A - OLD TOWN TILES (speed 3.4). Mandatory gaps <= 2.2, up-steps <= 0.8.
const L1 = [ // Bakery Roof - teach the pounce
  R(8, 0, { deco: 'bakery' }), G(1.2), R(5), G(1.4), R(4.5, 0.6), G(1.5),
  R(4, -0.4, { sparkle: { x: 2.0, up: 2.1 } }), G(1.6), R(5, 0.6), G(1.4), R(7, 0, { deco: 'chimney' }),
];
const L2 = [ // Chimney Row - teach PURRFECT
  R(7, 0, { deco: 'chimney' }), G(1.6), R(4), G(1.8), R(3.6, 0.5), G(2.0),
  R(4, 0, { deco: 'chimney' }), G(2.2, { sparkle: 2.2 }), R(4.4, -0.5), G(1.8), R(3.6, 0.5), G(2.0), R(6.5, 0, { deco: 'chimney' }),
];
const L3 = [ // The Clothesline - teach the Whisker Dive
  R(6.5), G(1.6), R(3.6, 1.4), G(1.6), R(3.4, 1.4, { coins: 'line' }), G(1.8),
  R(3.6, -0.8), G(1.8), R(3.2, 1.6, { sparkle: { x: 1.6, up: 2.1 } }), G(2.0), R(3.4, 1.2), G(1.8), R(6.5, 0, { deco: 'clothesline' }),
];
const L4 = [ // Tabby Alley - pigeons + MOON MILK intro
  R(6.5), G(1.8), R(4.4, 0, { obs: [{ t: 'pigeon', x: 2.6 }] }), G(1.8),
  R(4.6, 0.5, { power: { t: 'milk', x: 1.2 } }), G(2.2), R(4, -0.5), G(2.0),
  R(4.4, 0, { obs: [{ t: 'ac', x: 2.4 }], sparkle: { x: 3.4, up: 2.1 } }), G(2.2), R(4, 0.5, { obs: [{ t: 'pigeon', x: 2.2 }] }), G(1.8), R(6.5),
];
const L5 = [ // The Clock Tower - staircase up, big swoop down
  R(6), G(1.6), R(3.2, -0.7), G(1.6), R(3.0, -0.7), G(1.5), R(3.0, -0.8, { deco: 'clock' }),
  G(1.6), R(3.2, -0.7, { sparkle: { x: 1.4, up: 2.1 } }), G(2.2), R(4, 2.2, { obs: [{ t: 'antenna', x: 2.2 }] }),
  G(2.0), R(3.6, 1.4), G(2.2), R(6.5, 0.8),
];

// District B - NEON MARKET (speed 3.8). Mandatory gaps <= 2.6.
const L6 = [ // Lantern Street - moving laundry lines
  R(6.5, 0, { deco: 'lanterns' }), G(2.0), R(4), G(2.2), R(3.0, 0, { mover: { amp: 0.5, period: 2.2 } }),
  G(2.2), R(3.6, 0.5), G(2.4, { sparkle: 2.2 }), R(3.0, 0, { mover: { amp: 0.5, period: 2.6 } }),
  G(2.2), R(3.6, -0.5, { obs: [{ t: 'pigeon', x: 1.8 }] }), G(2.4), R(6.5, 0.5, { deco: 'lanterns' }),
];
const L7 = [ // Noodle Sign - MAGNET FISH intro, coin feast
  R(6, 0, { deco: 'sign' }), G(2.2), R(4.2, 0, { power: { t: 'magnet', x: 1.4 } }), G(2.4),
  R(3.6, 0.6, { coins: 'line' }), G(2.2), R(3.4, -0.6, { coins: 'line' }), G(2.4),
  R(3.6, 0.6, { coins: 'line', sparkle: { x: 1.4, up: 2.1 } }), G(2.4), R(3.4, 0, { obs: [{ t: 'ac', x: 1.6 }] }), G(2.2), R(6, 0, { deco: 'sign' }),
];
const L8 = [ // Fish Market Roofs - busy obstacles
  R(6), G(2.2), R(4.4, 0, { obs: [{ t: 'pigeon', x: 1.8 }] }), G(2.4),
  R(4, 0.5, { obs: [{ t: 'antenna', x: 2.0 }] }), G(2.4), R(3.6, -0.5), G(2.6, { sparkle: 2.2 }),
  R(4.4, 0, { obs: [{ t: 'pigeon', x: 2.4 }] }), G(2.4), R(4, 0.5, { obs: [{ t: 'ac', x: 1.6 }] }), G(2.4), R(6, 0, { deco: 'market' }),
];
const L9 = [ // Arcade Glow - the combo alley: even gaps beg for chained PURRFECTs
  R(6, 0, { deco: 'arcade' }), G(2.2), R(2.8), G(2.2), R(2.8), G(2.2), R(2.8, 0, { sparkle: { x: 1.4, up: 2.1 } }),
  G(2.2), R(2.8), G(2.2), R(2.8), G(2.2), R(2.8), G(2.4), R(6, 0, { deco: 'arcade' }),
];
const L10 = [ // The Night Train - long low ride, then the jump off
  R(6), G(2.2), R(3.4, 1.2), G(2.4), R(12, 1.8, { deco: 'train', obs: [{ t: 'ac', x: 4 }, { t: 'ac', x: 8 }], coins: 'line' }),
  G(2.2), R(3.6, -0.8, { sparkle: { x: 1.8, up: 2.1 } }), G(2.6), R(4, 0, { obs: [{ t: 'pigeon', x: 2.0 }] }), G(2.4), R(6.5, 0.5),
];

// District C - GARDEN TERRACES (speed 4.2). Mandatory gaps <= 3.0, awning chains use short gaps.
const L11 = [ // Fern Balconies - bouncy awnings
  R(6, 0, { deco: 'ferns' }), G(2.4), R(4, 0.5), G(1.8), R(1.4, 1.2, { bouncy: true }), G(1.8),
  R(3.6, -1.2), G(2.6), R(4, 0.5, { obs: [{ t: 'pigeon', x: 2.0 }] }), G(1.8),
  R(1.4, 1.4, { bouncy: true, sparkle: { x: 0.7, up: 1.9 } }), G(1.8), R(3.6, -1.4), G(2.6), R(6, 0.5, { deco: 'ferns' }),
];
const L12 = [ // Sprinkler Waltz - STAR BELL intro, timed sprays
  R(6, 0, { power: { t: 'bell', x: 3.5 } }), G(2.4), R(4.6, 0, { sprinkler: { x: 2.4, period: 2.4, duty: 0.45 } }),
  G(2.6), R(4.2, 0.5, { sprinkler: { x: 2.0, period: 2.0, duty: 0.45 } }), G(2.6),
  R(4, -0.5, { sparkle: { x: 2.0, up: 2.1 } }), G(2.8), R(4.6, 0, { sprinkler: { x: 2.6, period: 2.2, duty: 0.5 } }), G(2.6), R(6, 0, { deco: 'garden' }),
];
const L13 = [ // The Greenhouse - slippery glass moss
  R(6, 0, { deco: 'greenhouse' }), G(2.4), R(4.6, 0, { moss: [[1.2, 2.8]] }), G(2.6),
  R(4.4, 0.5, { moss: [[1.0, 2.4]] }), G(2.6), R(4, -0.5, { obs: [{ t: 'antenna', x: 2.0 }] }),
  G(2.8, { sparkle: 2.2 }), R(4.8, 0, { moss: [[1.4, 3.2]], deco: 'greenhouse' }), G(2.8), R(6, 0.5),
];
const L14 = [ // Koi Pond Roof - fountains and one big milk-assisted leap
  R(6, 0, { deco: 'pond' }), G(2.4), R(4.4, 0, { power: { t: 'milk', x: 1.6 }, sprinkler: { x: 3.0, period: 2.2, duty: 0.4 } }),
  G(3.0), R(4, 0.5), G(2.6), R(4, 0, { sprinkler: { x: 2.0, period: 2.0, duty: 0.4 }, sparkle: { x: 3.2, up: 2.1 } }),
  G(2.8), R(4.2, 0.5, { obs: [{ t: 'pigeon', x: 2.2 }] }), G(2.8), R(6, 0, { deco: 'pond' }),
];
const L15 = [ // Wisteria Steps - up the terraces, down the cascade
  R(6, 0, { deco: 'wisteria' }), G(2.2), R(3.0, -0.8), G(2.2), R(2.8, -0.8, { mover: { amp: 0.4, period: 2.4 } }),
  G(2.2), R(2.8, -0.8), G(2.4, { sparkle: 2.2 }), R(3.2, -0.6), G(2.8), R(3.6, 2.0),
  G(2.8), R(3.4, 1.6, { obs: [{ t: 'pigeon', x: 1.6 }] }), G(3.0), R(6, 1.2, { deco: 'wisteria' }),
];

// District D - MOONRISE HEIGHTS (speed 4.6). Mandatory gaps <= 3.4 (longest are tailwind-assisted).
const L16 = [ // Wind Chime Spires - the wind arrives
  R(6, 0, { deco: 'chimes' }), G(2.6), R(3.6, 0), G(3.0, { wind: 0.8 }), R(3.4, 0.5),
  G(2.8), R(3.2, -0.5, { obs: [{ t: 'antenna', x: 1.2 }] }), G(3.2, { wind: 1.0, sparkle: 2.2 }),
  R(3.6, 0.5), G(2.8), R(3.2, 0, { mover: { amp: 0.5, period: 2.4 } }), G(3.0, { wind: 0.8 }), R(6, 0.5, { deco: 'chimes' }),
];
const L17 = [ // The Crane - narrow beams, slow swings
  R(6, 0, { deco: 'crane' }), G(2.8), R(2.0, 0, { mover: { amp: 0.7, period: 3.0 } }), G(2.6),
  R(1.8, 0.5), G(2.8), R(2.0, -0.5, { mover: { amp: 0.7, period: 3.4 } }), G(3.0, { wind: 0.8 }),
  R(2.0, 0.5, { sparkle: { x: 1.0, up: 2.1 } }), G(2.8), R(1.8, 0, { mover: { amp: 0.6, period: 2.8 } }), G(3.0, { wind: 0.8 }), R(6, 0.5, { deco: 'crane' }),
];
const L18 = [ // Crumbling Eaves - do not linger
  R(6), G(2.6), R(2.2, 0.5, { crumble: true }), G(2.6), R(2.2, 0, { crumble: true }), G(2.8),
  R(3.6, -0.5, { obs: [{ t: 'pigeon', x: 1.6 }] }), G(3.0, { sparkle: 2.2 }), R(2.2, 0.5, { crumble: true }),
  G(2.8), R(2.0, 0, { crumble: true }), G(3.2, { wind: 1.0 }), R(6, 0.5, { deco: 'eaves' }),
];
const L19 = [ // Starlight Scaffold - everything at once
  R(6, 0, { deco: 'scaffold' }), G(2.8), R(2.4, 0, { mover: { amp: 0.6, period: 2.6 } }), G(3.0, { wind: 0.8 }),
  R(2.2, 0.5, { crumble: true }), G(2.8), R(2.6, -0.5, { obs: [{ t: 'antenna', x: 0.8 }] }),
  G(3.2, { wind: 1.0 }), R(2.2, 0, { mover: { amp: 0.6, period: 3.0 } }), G(2.8),
  R(2.4, 0.5, { crumble: true, sparkle: { x: 1.2, up: 2.1 } }), G(4.2), R(6, 0.5, { deco: 'scaffold' }), // the Moon Leap - PURRFECT required
];
const L20 = [ // Hana's Window - one last brave run, then a gentle landing
  R(6, 0, { deco: 'heights' }), G(3.0, { wind: 0.8 }), R(2.6, 0.5, { crumble: true }), G(3.0),
  R(2.8, -0.5, { mover: { amp: 0.5, period: 2.6 } }), G(3.2, { wind: 1.0 }), R(3.0, 0.5),
  G(4.2, { sparkle: 2.2 }), R(4, 0.5), G(2.6), R(4.5, 1.0, { coins: 'line' }), // one last Moon Leap to the window

  G(2.0), R(5, 0.8, { coins: 'line' }), G(1.6), R(9, 0.6, { deco: 'window' }),
];

export const LEVEL_DEFS = [L1, L2, L3, L4, L5, L6, L7, L8, L9, L10, L11, L12, L13, L14, L15, L16, L17, L18, L19, L20];

// ---------- compiler ----------
// Turns a segment list into world geometry:
// { platforms:[{x0,x1,y, bouncy, crumble, mover, moss:[[x0,x1]], sprinkler, deco, i}],
//   gaps:[{x0,x1,yFrom,yTo,wind}], coins:[{x,y,sparkle}], obstacles:[{t,x,y}],
//   powerups:[{t,x,y}], goalX, length, startY }
// Levels are authored as one "verse"; expandLevelDef repeats the verse (with the
// Sparkle Fish only in the first pass) so each level reaches its 20-45s target length.
function stripOnRepeat(seg) {
  const { sparkle, ...rest } = seg;
  // Moon Leaps (oversized gaps) only happen once, on the first verse
  if (rest.t === 'gap' && rest.w > 3.4) return { ...rest, w: 3.0, wind: 0.8 };
  return rest;
}
function expandLevelDef(def, li) {
  const passes = li < 5 ? 2 : 3;
  const first = def[0], last = def[def.length - 1];
  const body = def.slice(1, -1); // starts and ends with a gap
  const out = [first];
  for (let r = 0; r < passes; r++) {
    out.push(...(r === 0 ? body : body.map(stripOnRepeat)));
    if (r < passes - 1) out.push(R(4.5, 0.5, {})); // breather roof between verses
  }
  out.push(last);
  return out;
}

export function compileLevel(defOrIndex, index = null) {
  const def = Array.isArray(defOrIndex) ? defOrIndex : expandLevelDef(LEVEL_DEFS[defOrIndex], defOrIndex);
  const li = index !== null ? index : (Array.isArray(defOrIndex) ? 0 : defOrIndex);
  const dist = districtFor(li);
  const S = dist.speed;

  const platforms = [], gaps = [], coins = [], obstacles = [], powerups = [];
  let x = 0, y = 0;
  let pendingGap = null;

  for (const seg of def) {
    if (seg.t === 'gap') {
      pendingGap = { x0: x, x1: x + seg.w, yFrom: y, wind: seg.wind || 0, sparkle: typeof seg.sparkle === 'number' ? seg.sparkle : 0, coins: seg.coins !== false };
      x += seg.w;
    } else {
      y += seg.dy;
      const p = {
        i: platforms.length, x0: x, x1: x + seg.w, y,
        bouncy: !!seg.bouncy, crumble: !!seg.crumble,
        mover: seg.mover || null, moss: (seg.moss || []).map(([a, b]) => [x + a, x + b]),
        sprinkler: seg.sprinkler ? { ...seg.sprinkler, x: x + seg.sprinkler.x } : null,
        deco: seg.deco || null,
      };
      platforms.push(p);
      if (pendingGap) {
        pendingGap.yTo = y;
        gaps.push(pendingGap);
        // coin arcs on alternating gaps (and always on the long ones, as guidance)
        const wantArc = pendingGap.coins && (gaps.length % 2 === 1 || pendingGap.x1 - pendingGap.x0 >= 3.0);
        if (wantArc) layCoinArc(coins, pendingGap, S);
        if (pendingGap.sparkle) {
          const midX = (pendingGap.x0 + pendingGap.x1) / 2;
          coins.push({ x: midX, y: pendingGap.yFrom - pendingGap.sparkle, sparkle: true });
        }
        pendingGap = null;
      }
      if (seg.obs) for (const o of seg.obs) obstacles.push({ t: o.t, x: x + o.x, y });
      if (seg.power) powerups.push({ t: seg.power.t, x: x + seg.power.x, y: y - 1.4 });
      const autoLine = seg.coins === 'line' || (seg.coins === undefined && seg.w >= 5.2 && !seg.moss && !seg.obs && platforms.length > 1 && !seg.bouncy && !seg.sprinkler);
      if (autoLine) {
        const n = Math.min(4, Math.floor(seg.w / 0.9) - 1);
        for (let k = 0; k < n; k++) coins.push({ x: x + seg.w / 2 + (k - (n - 1) / 2) * 0.8, y: y - 0.85, sparkle: false });
      }
      if (seg.sparkle && typeof seg.sparkle === 'object') coins.push({ x: x + seg.sparkle.x, y: y - seg.sparkle.up, sparkle: true });
      x += seg.w;
    }
  }
  const last = platforms[platforms.length - 1];
  const goalX = last.x1 - 1.6;
  return { platforms, gaps, coins, obstacles, powerups, goalX, length: x, startY: platforms[0].y, district: dist, index: li };
}

// Coin arc over a gap, tracing a 0.92-power jump from just before the edge.
function layCoinArc(coins, gap, S) {
  const v = jumpVel(0.92);
  const x0 = gap.x0 - 0.15, y0 = gap.yFrom;
  const y1 = gap.yTo, g = PHYS.g;
  const Sw = S + (gap.wind || 0);
  const dy = y1 - y0; // +down
  const disc = v * v + 2 * g * dy;
  if (disc <= 0) return;
  const T = (v + Math.sqrt(disc)) / g;
  const n = 3;
  for (let k = 1; k <= n; k++) {
    const t = (k / (n + 1)) * T;
    const cx = x0 + Sw * t;
    const cy = y0 - (v * t - 0.5 * g * t * t);
    if (cx < gap.x1 + 0.9) coins.push({ x: cx, y: cy - 0.35, sparkle: false });
  }
}

// ---------- endless mode ----------
// Chains procedural chunks; difficulty ramps with the tier.
export function makeEndlessChunk(seed, tier, startX, startY) {
  const r = rng(seed);
  const t3 = Math.min(3, tier);
  const maxGap = [2.0, 2.4, 2.8, 3.2][t3] + Math.min(0.2, tier * 0.05);
  const n = 5 + Math.floor(r() * 3);
  const roofs = [];
  for (let i = 0; i < n; i++) {
    let w = 2.6 + r() * 2.8;
    let dy = (r() - 0.45) * 1.4;
    if (i === 0) dy = 0;
    dy = Math.max(-0.6, Math.min(1.6, dy));
    const opts = {};
    if (t3 >= 1 && r() < 0.2) opts.mover = { amp: 0.5, period: 2.2 + r() };
    else if (t3 >= 3 && r() < 0.15) { opts.crumble = true; w = 2.0 + r() * 0.4; }
    if (r() < 0.22 && w >= 3.0) opts.obs = [{ t: ['pigeon', 'ac', 'antenna'][Math.floor(r() * 3)], x: 0.8 + r() * (w - 2.8) }];
    if (r() < 0.12 && w >= 3.0) opts.power = { t: ['milk', 'magnet', 'bell'][Math.floor(r() * 3)], x: 0.8 + r() * (w - 1.6) };
    roofs.push(R(w, dy, opts));
  }
  const def = [roofs[0]];
  for (let i = 1; i < n; i++) {
    let cap = maxGap;
    if (roofs[i].mover) cap -= 0.5;      // landing on a swing: shorter gap
    if (roofs[i].dy < 0) cap -= 0.4;     // up-steps get shorter gaps
    const gw = 1.6 + r() * Math.max(0.2, cap - 1.6);
    def.push(G(gw, r() < 0.25 && t3 >= 3 ? { wind: 0.8 } : {}), roofs[i]);
  }
  const c = compileLevel(def, Math.min(19, tier * 5));
  for (const p of c.platforms) { p.x0 += startX; p.x1 += startX; p.y += startY; for (const m of p.moss) { m[0] += startX; m[1] += startX; } if (p.sprinkler) p.sprinkler.x += startX; }
  for (const g2 of c.gaps) { g2.x0 += startX; g2.x1 += startX; g2.yFrom += startY; g2.yTo += startY; }
  for (const cn of c.coins) { cn.x += startX; cn.y += startY; }
  for (const o of c.obstacles) { o.x += startX; o.y += startY; }
  for (const p2 of c.powerups) { p2.x += startX; p2.y += startY; }
  return c;
}

export { LEVEL_NAMES };
