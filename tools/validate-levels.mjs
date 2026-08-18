// Purrkour level fairness validator. Run: node tools/validate-levels.mjs
// Simulates the real jump physics against every mandatory gap in all 20 levels
// (and a sweep of endless chunks) and asserts clearability with margin.
import { PHYS, districtFor, jumpVel } from '../assets/js/config.js';
import { LEVEL_DEFS, compileLevel, makeEndlessChunk, LEVEL_NAMES } from '../assets/js/levels.js';

const DT = 1 / 240;
let failures = 0;
const fail = (msg) => { failures++; console.error('  FAIL  ' + msg); };

// Simulate one jump. A jump "lands" if it either crosses the target roof top from
// above inside the platform, or passes over the platform high enough that a Whisker
// Dive from there would drop onto it (the dive drifts forward while falling).
function simJump({ x0, y0, vy0, S, wind, toX0, toX1, toY }) {
  let x = x0, y = y0, vy = vy0, prevY = y0, prevX = x0;
  const Seff = S + (wind || 0);
  for (let t = 0; t < 4; t += DT) {
    prevY = y; prevX = x;
    vy = Math.min(PHYS.vyMax, vy + PHYS.g * DT);
    y += vy * DT;
    x += Seff * DT;
    // wall bonk: crossing the leading edge below roof level
    if (prevX < toX0 && x >= toX0 && y > toY + 0.05 && prevY > toY + 0.05) return { landed: false, bonk: true };
    // natural landing: crossing the roof top from above, within the platform
    if (vy > 0 && prevY <= toY && y >= toY && x >= toX0 && x <= toX1) return { landed: true, landX: x };
    // divable: above the platform with room for the dive's forward drift
    if (y <= toY && x >= toX0 + 0.05 && x + Seff * (toY - y) / PHYS.diveVel <= toX1 - 0.1) return { landed: true, landX: x, dive: true };
    if (y > y0 + 9) return { landed: false };
    if (x > toX1 + 1) return { landed: false };
  }
  return { landed: false };
}

function minPowerForGap(from, to, gap, S) {
  // worst cases: takeoff from a mover at its lowest, landing on a mover at its highest.
  // Clearability is an interval in f (too much power can overshoot a narrow roof,
  // though the dive rescues most of that), so scan upward for the first f that lands.
  const y0 = from.y + (from.mover ? from.mover.amp : 0);
  const toY = to.y - (to.mover ? to.mover.amp : 0);
  const clears = (f) => simJump({ x0: from.x1, y0, vy0: -jumpVel(f), S, wind: gap.wind, toX0: to.x0, toX1: to.x1, toY }).landed;
  for (let f = PHYS.minPow; f <= PHYS.purrfectPow + 1e-9; f += 0.005) if (clears(f)) return f;
  return null;
}

function checkBounceReach(from, to, gap, S) {
  // worst case: bounce from the awning's leading edge
  const y0 = from.y;
  const toY = to.y - (to.mover ? to.mover.amp : 0);
  return simJump({ x0: from.x0 + 0.05, y0, vy0: -PHYS.bounceVel, S: S * PHYS.bounceBoost, wind: gap.wind, toX0: to.x0, toX1: to.x1, toY }).landed;
}

function checkSparkle(c, level, S) {
  // reachable if some PURRFECT jump (or awning bounce) passes within 0.5u
  let best = Infinity;
  for (const p of level.platforms) {
    if (p.x0 > c.x + 0.5 || p.y < c.y) continue;
    const step = 0.1;
    for (let tx = Math.max(p.x0 + 0.1, c.x - 5); tx <= Math.min(p.x1, c.x + 0.3); tx += step) {
      const vy0 = p.bouncy ? -PHYS.bounceVel : -jumpVel(PHYS.purrfectPow);
      const Seff = p.bouncy ? S * PHYS.bounceBoost : S;
      let x = tx, y = p.y + (p.mover ? p.mover.amp : 0), vy = vy0;
      for (let t = 0; t < 2.5; t += DT) {
        vy += PHYS.g * DT; y += vy * DT; x += Seff * DT;
        const d = Math.hypot(x - c.x, y - c.y);
        if (d < best) best = d;
        if (y > p.y + 6) break;
      }
    }
  }
  return best;
}

console.log('Purrkour level validator\n');
let totalCoins = 0;
for (let li = 0; li < LEVEL_DEFS.length; li++) {
  const level = compileLevel(li);
  const S = level.district.speed;
  const cap = li < 10 ? 0.92 : li < 15 ? 1.0 : PHYS.purrfectPow;
  let maxF = 0, purrfectGaps = 0;

  for (let gi = 0; gi < level.gaps.length; gi++) {
    const gap = level.gaps[gi];
    const from = level.platforms[gi], to = level.platforms[gi + 1];
    if (from.bouncy) {
      if (!checkBounceReach(from, to, gap, S)) fail(`L${li + 1} gap ${gi + 1}: awning bounce cannot reach next roof`);
      continue;
    }
    const f = minPowerForGap(from, to, gap, S);
    if (f === null) { fail(`L${li + 1} gap ${gi + 1} (w=${(gap.x1 - gap.x0).toFixed(1)}): unclearable even at PURRFECT`); continue; }
    if (f > cap - 0.02) fail(`L${li + 1} gap ${gi + 1} (w=${(gap.x1 - gap.x0).toFixed(1)}): needs f=${f.toFixed(3)}, cap ${cap}`);
    if (f > 1.0) purrfectGaps++;
    maxF = Math.max(maxF, f);
  }

  for (const p of level.platforms) {
    for (const m of p.moss) if (p.x1 - m[1] < 0.8) fail(`L${li + 1}: moss ends ${(p.x1 - m[1]).toFixed(2)}u before an edge (<0.8)`);
    if (p.crumble && (p.x1 - p.x0) / S > PHYS.crumbleDelay - 0.05) fail(`L${li + 1}: crumble roof too long to cross (${((p.x1 - p.x0) / S).toFixed(2)}s vs ${PHYS.crumbleDelay}s)`);
  }
  for (const o of level.obstacles) {
    const p = level.platforms.find((pp) => o.x >= pp.x0 && o.x <= pp.x1);
    if (p && p.x1 - o.x < 1.2) fail(`L${li + 1}: obstacle ${o.t} only ${(p.x1 - o.x).toFixed(2)}u before an edge (<1.2)`);
  }
  const sparkles = level.coins.filter((c) => c.sparkle);
  if (sparkles.length !== 1) fail(`L${li + 1}: expected exactly 1 Sparkle Fish, found ${sparkles.length}`);
  for (const c of sparkles) {
    const d = checkSparkle(c, level, S);
    if (d > 0.5) fail(`L${li + 1}: Sparkle Fish unreachable (closest pass ${d.toFixed(2)}u)`);
  }
  const coins = level.coins.filter((c) => !c.sparkle).length;
  totalCoins += coins;
  const dur = level.length / S;
  console.log(`L${String(li + 1).padStart(2)} ${LEVEL_NAMES[li].padEnd(20)} len=${level.length.toFixed(0).padStart(4)}u  ~${dur.toFixed(0).padStart(2)}s  coins=${String(coins).padStart(2)}  maxF=${maxF.toFixed(2)}  purrfectGaps=${purrfectGaps}`);
}
console.log(`\nTotal base coins across 20 levels: ${totalCoins} (+${20 * 25} from Sparkle Fish)`);

// endless sweep
let endlessGaps = 0;
for (let seed = 1; seed <= 40; seed++) {
  const tier = seed % 9;
  const c = makeEndlessChunk(seed * 7919, tier, 0, 0);
  for (let gi = 0; gi < c.gaps.length; gi++) {
    const from = c.platforms[gi], to = c.platforms[gi + 1];
    const gap = c.gaps[gi];
    endlessGaps++;
    if (from.bouncy) { if (!checkBounceReach(from, to, gap, c.district.speed)) fail(`endless seed ${seed} gap ${gi}: awning unreachable`); continue; }
    const f = minPowerForGap(from, to, gap, c.district.speed);
    if (f === null || f > PHYS.purrfectPow - 0.02) fail(`endless seed ${seed} tier ${tier} gap ${gi}: needs f=${f === null ? 'unclearable' : f.toFixed(3)}`);
  }
}
console.log(`Endless sweep: ${endlessGaps} gaps checked across 40 chunks`);

if (failures) { console.error(`\n${failures} FAILURES`); process.exit(1); }
console.log('\nAll checks passed.');
