// Purrkour - game engine: fixed-step physics, the Purr-Pounce, rendering.
import { PHYS, DISTRICTS, districtFor, purrPeriod, powerFor, jumpVel, COMBO_X2, COMBO_X3, SPARKLE_VALUE } from './config.js';
import { compileLevel, makeEndlessChunk } from './levels.js';
import * as art from './art.js';

const STEP = 1 / 120;

export class Game {
  constructor(audio, ev) {
    this.audio = audio;
    this.ev = ev; // { onCoin, onClearDone, onFlopStart, onFlopDone, onPurrfect, onSparkle, onTutorial, onPower, onProgress, onDistance, onStarSave }
    this.mode = 'title';
    this.skin = null;
    this.acc = 0;
    this.t = 0;
    this.particles = [];
    this.floats = [];
    this.shakeT = 0;
    this.glowT = 0;
    this.startTitle();
  }

  // ---------- setup ----------
  startTitle() {
    this.mode = 'title';
    this.level = null;
    this.district = DISTRICTS[0];
    this.t = 0;
    this.cat = this._newCat(2, 0);
    this.cat.loaf = true;
    this.cam = { x: -1.2, y: -6.8 };
    this.particles = []; this.floats = [];
  }

  startLevel(index, fresh = true) {
    this.levelIndex = index;
    this.endless = false;
    this.level = compileLevel(index);
    this.district = this.level.district;
    this._resetRun(fresh);
  }

  startEndless(fresh = true) {
    this.endless = true;
    this.levelIndex = -1;
    this.endlessChunks = 0;
    this.endlessTierBase = 0;
    const first = makeEndlessChunk(1, 0, 0, 0);
    this.level = first;
    this.level.goalX = Infinity;
    this.district = DISTRICTS[0];
    this._lastChunkEnd = first.length;
    this._resetRun(fresh);
  }

  _resetRun(fresh = false) {
    // a fresh level entry opens with Mochi loafing beside the GO lantern; retries skip it
    this.mode = fresh ? 'ready' : 'play';
    this.readyT = 0;
    this.t = 0;
    // re-roll the purr alignment every attempt: position is a pure function of level
    // time, so without this a muted game replays identical purr phases at every gap
    this.purrSeed = Math.random() * 7;
    for (const p of this.level.platforms) { p.crumbleT = -1; p.fallY = 0; }
    for (const c of this.level.coins) { c.taken = false; c.hinted = false; c.fx = 0; c.fy = 0; c.dx = 0; c.dy = 0; }
    for (const o of this.level.obstacles) { o.hit = false; o.hitT = 0; }
    for (const pw of this.level.powerups) pw.taken = false;
    const p0 = this.level.platforms[0];
    this.cat = this._newCat(1.2, p0.y);
    this.cat.plat = p0;
    this.groundY = p0.y;
    this.cam = { x: 1.2 - 3, y: p0.y - 7 };
    this.coinsRun = 0; this.purrfects = 0; this.combo = 0; this.sparkleFound = false;
    this.milkT = 0; this.magnetT = 0; this.bell = false;
    this.particles = []; this.floats = [];
    this.tutSent = {};
    this.flopT = 0; this.clearT = 0;
    this.flopSent = false; this.clearSent = false;
    this.distance = 0;
  }

  _newCat(x, y) {
    return {
      x, y, vy: 0, grounded: true, plat: null, coyote: 0, runPhase: 0,
      squash: 0, squashV: 0, diving: false, diveStart: -9, sinceDive: 9,
      bufferF: null, bufferPurrfect: false, bufferT: 0,
      lockT: 0, stumbleT: 0, sprayT: 0, snapT: 0, mossOn: false,
      bonked: false, invuln: 0, bounceFly: 0,
      rot: 0, blink: 0, blinkTimer: 2 + Math.random() * 3, earBounce: 0,
      loaf: false, happy: 0, scarf: [],
    };
  }

  // ---------- purr ----------
  purrInfo(back = 0) {
    const clock = this.audio.purrClock();
    const bpm = clock ? clock.bpm : this.district.bpm;
    const t = (clock ? clock.t : this.t + (this.purrSeed || 0)) - back;
    const P = purrPeriod(bpm);
    const tc = ((t % P) + P) % P;
    const phase = 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / P);
    const toPeak = Math.abs(tc - P / 2);
    return { phase, purrfect: toPeak <= PHYS.purrfectWin, P };
  }

  // players react ~150ms late: judge a tap by the best purr moment it was aimed at
  purrJudge() {
    let best = this.purrInfo(0);
    for (const back of [0.08, 0.16]) {
      const p = this.purrInfo(back);
      if (p.purrfect && !best.purrfect) best = p;
      else if (p.phase > best.phase && !best.purrfect) best = p;
    }
    return best;
  }

  // ---------- input ----------
  tap() {
    if (this.mode === 'flop') { this.ev.onFlopDone?.(true); return; }
    if (this.mode === 'ready') { this._beginRun(); return; }
    if (this.mode !== 'play') return;
    const c = this.cat;
    if (c.grounded || c.coyote > 0) {
      this._jump();
    } else if (!c.diving) {
      c.diving = true; c.diveStart = this.t; c.sinceDive = 0;
      c.vy = Math.max(c.vy, PHYS.diveVel);
      this.audio.dive();
      this._burst(c.x, c.y - 0.5, 4, 'spark', '#cfe4ff');
    } else {
      // second tap while diving: buffered jump for the instant of landing
      const { phase, purrfect } = this.purrJudge();
      c.bufferF = purrfect ? PHYS.purrfectPow : powerFor(phase);
      c.bufferPurrfect = purrfect;
      c.bufferT = PHYS.buffer;
    }
  }

  _jump(fromBuffer = false) {
    const c = this.cat;
    if (c.lockT > 0) { this.audio.denied(); return; }
    if (c.mossOn) { this.audio.denied(); this._float(c.x, c.y - 1.6, '!', '#9fe0b7'); return; }
    let f, purrfect;
    if (fromBuffer && c.bufferF !== null) { f = c.bufferF; purrfect = c.bufferPurrfect; c.bufferF = null; }
    else { const info = this.purrJudge(); purrfect = info.purrfect; f = purrfect ? PHYS.purrfectPow : powerFor(info.phase); }
    c.vy = -jumpVel(f);
    c.grounded = false; c.plat = null; c.coyote = 0; c.diving = false;
    c.stumbleT = 0; // shake it off
    c.squashV = -6;
    this.audio.pounce(f);
    this._burst(c.x, c.y, 5, 'dust');
    if (purrfect) {
      this.combo++;
      this.purrfects++;
      this.glowT = 0.5;
      this.audio.purrfect();
      navigator.vibrate?.(18);
      this._float(c.x, c.y - 2.2, this.combo > 1 ? `PURRFECT! x${this.combo}` : 'PURRFECT!', '#ffd98a');
      this._burst(c.x, c.y - 1, 10, 'spark', this.skin.trail);
      this._pop(c.x, c.y - 2.0, 'heart');
    } else {
      this.combo = 0;
    }
  }

  // ---------- fixed step ----------
  update(dt) {
    this.acc += Math.min(dt, 0.1);
    while (this.acc >= STEP) { this.acc -= STEP; this._step(STEP); }
    const { phase } = this.purrInfo();
    const audible = this.mode === 'play' || this.mode === 'title' || this.mode === 'ready';
    this.audio.setPurr(audible ? phase : 0, this.milkT > 0);
  }

  _beginRun() {
    if (this.mode !== 'ready') return;
    this.mode = 'play';
    const c = this.cat;
    c.loaf = false;
    c.happy = 0.7;
    this._pop(c.x + 0.9, c.y - 1.2, 'heart'); // the GO lantern boop
    this.audio.goalChime();
  }

  _step(dt) {
    this.t += dt;
    const c = this.cat;
    this.glowT = Math.max(0, this.glowT - dt);
    this.shakeT = Math.max(0, this.shakeT - dt);
    c.blinkTimer -= dt;
    if (c.blinkTimer < 0) { c.blinkTimer = 2.4 + Math.random() * 2.6; c.blink = 1; }
    if (c.blink > 0) c.blink = Math.max(0, c.blink - dt * 8);
    c.squash += c.squashV * dt; c.squashV += (-c.squash * 60 - c.squashV * 9) * dt;
    c.earBounce *= 1 - dt * 6;
    c.happy = Math.max(0, c.happy - dt);
    this._stepParticles(dt);

    if (this.mode === 'title') { this._stepTitle(dt); return; }
    if (this.mode === 'flop') { this._stepFlop(dt); return; }
    if (this.mode === 'clear') { this._stepClear(dt); return; }
    if (this.mode === 'ready') {
      this.cat.loaf = true;
      this.readyT += dt;
      if (this.readyT > 0.9) this._beginRun();
      this._camera(dt);
      return;
    }
    if (this.mode !== 'play') return;

    // timers
    c.lockT = Math.max(0, c.lockT - dt);
    c.stumbleT = Math.max(0, c.stumbleT - dt);
    c.sprayT = Math.max(0, c.sprayT - dt);
    c.snapT = Math.max(0, c.snapT - dt);
    c.invuln = Math.max(0, c.invuln - dt);
    c.coyote = Math.max(0, c.coyote - dt);
    c.bufferT = Math.max(0, c.bufferT - dt);
    if (c.bufferT <= 0) c.bufferF = null;
    c.sinceDive += dt;
    c.bounceFly = Math.max(0, c.bounceFly - dt);
    this.milkT = Math.max(0, this.milkT - dt);
    this.magnetT = Math.max(0, this.magnetT - dt);

    // horizontal speed
    let S = this.endless ? this._endlessSpeed() : this.district.speed;
    if (c.snapT > 0) S *= PHYS.snapBoost;
    if (c.stumbleT > 0) S *= PHYS.stumbleSlow;
    if (c.sprayT > 0) S *= PHYS.spraySlow;
    if (c.bounceFly > 0) S *= PHYS.bounceBoost;
    let wind = 0;
    if (!c.grounded) {
      for (const g of this.level.gaps) {
        if (g.wind && c.x > g.x0 - 0.3 && c.x < g.x1 + 0.3) { wind = g.wind; break; }
      }
    }
    if (!c.bonked) c.x += (S + wind) * dt;
    if (wind && Math.random() < 0.3) this._spawnStreak(c);
    c.runPhase = (c.runPhase + S * dt * 0.55) % 1;

    // scarf trail
    if (!c.scarf.length || Math.hypot(c.x - c.scarf[0].x, c.y - c.scarf[0].y) > 0.12) {
      c.scarf.unshift({ x: c.x, y: c.y });
      if (c.scarf.length > 9) c.scarf.pop();
    }

    // platform bookkeeping
    for (const p of this.level.platforms) {
      if (p.crumbleT >= 0 && !p.fallen) {
        p.crumbleT += dt;
        if (p.crumbleT > PHYS.crumbleDelay) { p.fallen = true; if (c.plat === p) { c.grounded = false; c.plat = null; c.coyote = 0; } }
      }
      if (p.fallen) p.fallY += dt * 6;
    }

    if (c.grounded && c.plat) {
      const p = c.plat;
      c.y = this._platY(p);
      // ran off the edge?
      if (c.x - PHYS.catHW > p.x1) {
        c.grounded = false; c.plat = null; c.coyote = PHYS.coyote;
      } else {
        // moss
        c.mossOn = p.moss.some((m) => c.x > m[0] && c.x < m[1]);
        if (c.mossOn && Math.random() < 0.2) this._burst(c.x - 0.3, c.y, 1, 'spark', '#9fe0b7');
        // sprinkler spray hits even while running under it
        this._checkSpray(p, c, dt);
        // obstacles
        if (c.invuln <= 0) {
          for (const o of this.level.obstacles) {
            if (!o.hit && Math.abs(c.x - o.x) < 0.42 && Math.abs(this._platY(p) - o.y) < 0.6) {
              o.hit = true; o.hitT = 0;
              c.stumbleT = PHYS.stumbleTime; c.lockT = PHYS.stumbleLock;
              this.shakeT = 0.2;
              this.combo = 0;
              if (o.t === 'pigeon') { this.audio.pigeon(); this._burst(c.x + 0.3, c.y - 0.6, 6, 'feather'); }
              else this.audio.stumble();
              this._float(c.x, c.y - 1.8, 'oof!', '#ffb9a8');
              navigator.vibrate?.(10);
            }
          }
        }
        // trigger crumble
        if (p.crumble && p.crumbleT < 0) { p.crumbleT = 0; this.audio.stumble(); }
      }
    } else {
      // airborne
      c.mossOn = false;
      const gFac = this.milkT > 0 ? PHYS.milkGravity : 1;
      const prevY = c.y;
      c.vy = Math.min(PHYS.vyMax, c.vy + PHYS.g * gFac * dt);
      c.y += c.vy * dt;
      // landing / bonk
      for (const p of this.level.platforms) {
        if (p.fallen) continue;
        if (p.x0 - PHYS.catHW > c.x + 1 || p.x1 + PHYS.catHW < c.x - 1) continue;
        const py = this._platY(p);
        // movers rise during the step: compare against the surface where it WAS
        const pyPrev = p.mover ? this._platY(p, this.t - dt) : py;
        const front = c.x + PHYS.catHW;
        if (!c.bonked && front >= p.x0 && front - (S + wind) * dt < p.x0 && c.y > py + 0.12 && prevY > py + 0.12) {
          c.bonked = true; c.x = p.x0 - PHYS.catHW - 0.02; c.vy = Math.max(c.vy, 1.5);
          this.audio.bonk(); this.shakeT = 0.25;
          this._burst(c.x + 0.3, c.y - 0.5, 6, 'spark', '#c9c5dd');
          navigator.vibrate?.(14);
        }
        if (c.vy > 0 && prevY <= pyPrev && c.y >= py && c.x + PHYS.catHW >= p.x0 && c.x - PHYS.catHW <= p.x1) {
          this._land(p);
          break;
        }
      }
      // sprinkler spray mid-air
      for (const p of this.level.platforms) this._checkSpray(p, c, dt);
      // purrfect combo trail
      if (this.combo > 0 && Math.random() < 0.5) {
        this._trail(c);
      }
      // fall rescue / flop (flop begins while Mochi is still on screen, so the
      // slow-mo tumble into the laundry cart is actually visible)
      if (this.bell && c.y > this.groundY + 3.2 && c.vy > 0) this._starSave();
      else if (c.y > this.groundY + 4.6 && c.vy > 0) this._startFlop();
    }

    // coins
    const magnet = this.magnetT > 0;
    for (const coin of this.level.coins) {
      if (coin.taken) continue;
      const cx = coin.x + coin.dx, cy = coin.y + coin.dy;
      const dx = c.x - cx, dyy = (c.y - 0.5) - cy;
      const d2 = dx * dx + dyy * dyy;
      if (magnet && d2 < PHYS.magnetR * PHYS.magnetR) {
        const d = Math.sqrt(d2) || 1;
        coin.fx = (coin.fx + (dx / d) * 34 * dt) * (1 - 3.5 * dt);
        coin.fy = (coin.fy + (dyy / d) * 34 * dt) * (1 - 3.5 * dt);
        coin.dx += coin.fx * dt; coin.dy += coin.fy * dt;
      }
      const rr2 = (coin.sparkle ? 0.62 : magnet ? 0.8 : PHYS.coinR) ** 2;
      if (d2 < rr2) {
        coin.taken = true;
        if (coin.sparkle) {
          this.sparkleFound = true;
          this.coinsRun += SPARKLE_VALUE;
          this.audio.sparkleFish();
          this._float(cx, cy - 0.6, `+${SPARKLE_VALUE} SPARKLE FISH!`, '#ff9fd0');
          this._burst(cx, cy, 16, 'spark', '#ff9fd0');
          this.ev.onSparkle?.();
          navigator.vibrate?.([12, 40, 12]);
        } else {
          const mult = this.combo >= COMBO_X3 ? 3 : this.combo >= COMBO_X2 ? 2 : 1;
          this.coinsRun += mult;
          this.audio.coin(this.comboCoinStep = (this.comboCoinStep || 0) + 1);
          if (mult > 1) this._float(cx, cy - 0.5, `x${mult}!`, '#ffd98a');
          this._burst(cx, cy, 3, 'spark', '#ffd98a');
          this.particles.push({ type: 'coinfly', x: cx, y: cy, k: 0, vx: 0, vy: 0, life: 9, max: 9 });
        }
        this.ev.onCoin?.(this.coinsRun);
      }
    }
    if (this.comboCoinStep && c.grounded) this.comboCoinStep = 0;

    // powerups
    for (const pw of this.level.powerups) {
      if (pw.taken) continue;
      if ((c.x - pw.x) ** 2 + (c.y - 0.5 - pw.y) ** 2 < 0.55) {
        pw.taken = true;
        this.audio.pop();
        this._burst(pw.x, pw.y, 10, 'spark', '#cfe4ff');
        if (pw.t === 'milk') { this.milkT = PHYS.milkTime; this.audio.milk(); this._float(pw.x, pw.y - 0.8, 'MOON MILK!', '#b8a6ff'); }
        if (pw.t === 'magnet') { this.magnetT = PHYS.magnetTime; this._float(pw.x, pw.y - 0.8, 'MAGNET FISH!', '#ff9fd0'); }
        if (pw.t === 'bell') { this.bell = true; this.audio.bellPickup(); this._float(pw.x, pw.y - 0.8, 'STAR BELL!', '#ffd98a'); }
        this.ev.onPower?.(pw.t);
        navigator.vibrate?.(12);
      }
    }

    // a soft chime hints when the hidden Sparkle Fish is near
    for (const coin of this.level.coins) {
      if (coin.sparkle && !coin.taken && !coin.hinted && coin.x - c.x > 0 && coin.x - c.x < 5) {
        coin.hinted = true;
        this.audio.sparkleNear();
      }
    }

    // dreamy drifting sparkles while Moon Milk is active
    if (this.milkT > 0 && Math.random() < dt * 16) {
      this.particles.push({ type: 'spark', x: this.cam.x + Math.random() * this._viewW, y: this.cam.y + Math.random() * this._viewH, vx: 0, vy: -0.3, life: 1, max: 1, color: '#d8ccff' });
    }

    // tutorial (level 1 only)
    if (this.levelIndex === 0) {
      for (const trig of [{ x: 1.6, id: 1 }, { x: 13, id: 2 }, { x: 25, id: 3 }]) {
        if (!this.tutSent[trig.id] && c.x > trig.x) { this.tutSent[trig.id] = true; this.ev.onTutorial?.(trig.id); }
      }
    }

    // goal / endless growth
    if (!this.endless && c.x >= this.level.goalX) {
      this.mode = 'clear'; this.clearT = 0;
      const goalPlat = this.level.platforms[this.level.platforms.length - 1];
      c.grounded = true; c.plat = goalPlat; c.y = this._platY(goalPlat);
      this.groundY = c.y;
      c.vy = 0; c.diving = false; c.happy = 5;
      this.audio.goalChime();
    }
    if (this.endless) {
      this.distance = Math.max(this.distance, Math.floor(c.x));
      this.ev.onDistance?.(this.distance);
      if (c.x > this._lastChunkEnd - 26) this._growEndless();
      // prune what is far behind
      if (this.level.platforms.length > 90) {
        const cut = c.x - 30;
        this.level.platforms = this.level.platforms.filter((p) => p.x1 > cut);
        this.level.coins = this.level.coins.filter((k) => k.x > cut);
        this.level.obstacles = this.level.obstacles.filter((o) => o.x > cut);
        this.level.powerups = this.level.powerups.filter((o) => o.x > cut);
        this.level.gaps = this.level.gaps.filter((g) => g.x1 > cut);
      }
    }
    if (!this.endless) this.ev.onProgress?.(Math.min(1, c.x / this.level.goalX));

    this._camera(dt);
  }

  _platY(p, tOv = null) {
    const t = tOv === null ? this.t : tOv;
    let y = p.y + (p.fallY || 0);
    if (p.mover) y += Math.sin((t * Math.PI * 2) / p.mover.period + p.i) * p.mover.amp;
    if (p.crumbleT >= 0 && !p.fallen) y += Math.sin(t * 40) * 0.03; // wobble
    return y;
  }

  _land(p) {
    const c = this.cat;
    const wasDive = c.sinceDive < PHYS.snapWin;
    c.diving = false;
    if (p.bouncy) {
      c.vy = -PHYS.bounceVel;
      c.bounceFly = 1.2;
      c.grounded = false;
      c.squashV = 8;
      this.audio.boing();
      this._burst(c.x, this._platY(p), 6, 'spark', '#ff9fd0');
      navigator.vibrate?.(10);
      return;
    }
    c.grounded = true; c.plat = p; c.vy = 0; c.bonked = false; c.bounceFly = 0;
    c.y = this._platY(p);
    this.groundY = c.y;
    c.squashV = 7; c.earBounce = 1;
    this.audio.pomf(wasDive);
    this._burst(c.x, c.y, wasDive ? 9 : 5, 'dust');
    if (wasDive) {
      c.snapT = PHYS.snapTime;
      this.audio.snap();
      this._float(c.x, c.y - 1.9, 'SNAPPY!', '#cfe4ff');
      this.shakeT = 0.12;
      navigator.vibrate?.(8);
    }
    if (p.crumble && p.crumbleT < 0) p.crumbleT = 0;
    if (c.bufferT > 0 && c.bufferF !== null) this._jump(true);
  }

  _checkSpray(p, c, dt) {
    if (!p.sprinkler || c.sprayT > 0 || c.invuln > 0) return;
    const s = p.sprinkler;
    const active = (this.t % s.period) < s.period * s.duty;
    if (active && Math.abs(c.x - s.x) < 0.6 && c.y > this._platY(p) - 1.7 && c.y < this._platY(p) + 0.2) {
      c.sprayT = PHYS.sprayTime;
      this.combo = 0;
      this.audio.stumble();
      this._burst(c.x, c.y - 0.8, 8, 'spark', '#a0dcff');
      this._float(c.x, c.y - 1.8, 'pff!', '#a0dcff');
    }
  }

  _starSave() {
    const c = this.cat;
    this.bell = false;
    const target = this.level.platforms.find((p) => !p.fallen && p.x1 > c.x + 0.4) || this.level.platforms[this.level.platforms.length - 1];
    const tx = Math.max(target.x0 + 0.5, Math.min(c.x + 1, target.x1 - 0.5));
    for (let i = 0; i < 14; i++) {
      this.particles.push({ type: 'star', x: c.x + (i / 14) * (tx - c.x), y: c.y - (i / 14) * (c.y - (this._platY(target) - 2.4)), vx: 0, vy: 0, life: 0.7 + i * 0.03, max: 0.9, color: '#ffd98a' });
    }
    c.x = tx; c.y = this._platY(target) - 2.4; c.vy = 0; c.invuln = 1.2; c.diving = false; c.bonked = false;
    this.audio.starSave();
    this._float(c.x, c.y - 1.4, 'STAR BELL!', '#ffd98a');
    this.ev.onStarSave?.();
    navigator.vibrate?.([10, 30, 10]);
  }

  _startFlop() {
    this.mode = 'flop';
    this.flopT = 0;
    this.cat.diving = false;
    this.cat.scarf.length = 0;
    this.cat.vy = Math.min(this.cat.vy, 2.5); // ease into the slow-mo tumble
    this.audio.flop();
    this.cartX = this.cat.x + 0.6;
    this.cartY = Math.max(this.cam.y + this._viewH - 0.6, this.cat.y + 3.2);
    this.flopLanded = false;
    this.ev.onFlopStart?.();
  }

  _stepFlop(dt) {
    const c = this.cat;
    this.flopT += dt;
    if (!this.flopLanded) {
      c.rot += dt * 7;
      c.vy = Math.min(6, c.vy + PHYS.g * 0.25 * dt); // dreamy slow-mo fall
      c.y += c.vy * dt;
      if (c.y >= this.cartY - 0.7) {
        this.flopLanded = true;
        c.y = this.cartY - 0.7; c.rot = 0;
        this.audio.pomf(true);
        this.audio.mew();
        this._burst(c.x, c.y, 10, 'dust');
        for (let i = 0; i < 3; i++) this._pop(c.x + (i - 1) * 0.5, c.y - 1.2, 'heart');
        navigator.vibrate?.(20);
      }
    } else if (this.flopT > 1.35 && !this.flopSent) {
      this.flopSent = true;
      this.ev.onFlopDone?.(false);
    }
  }

  _stepClear(dt) {
    const c = this.cat;
    this.clearT += dt;
    const sit = this.level.goalX + 0.7;
    if (c.x < sit) { c.x += this.district.speed * 0.6 * dt; c.runPhase = (c.runPhase + dt * 2) % 1; }
    else {
      c.loaf = true;
      if (Math.random() < dt * 3) this._pop(c.x + (Math.random() - 0.5), c.y - 1.6, 'heart');
    }
    if (this.clearT > 1.6 && !this.clearSent) { this.clearSent = true; this.ev.onClearDone?.(); }
    this._camera(dt);
  }

  _stepTitle(dt) {
    const c = this.cat;
    c.y = 0;
    // moths drift around the lantern glow
    if (Math.random() < dt * 2) {
      this.particles.push({ type: 'firefly', x: this.cam.x + Math.random() * 10, y: -2 - Math.random() * 3, vx: (Math.random() - 0.5), vy: (Math.random() - 0.5) * 0.4, life: 4, max: 4, color: '#cfe89f' });
    }
  }

  _growEndless() {
    this.endlessChunks++;
    const tier = Math.min(8, Math.floor(this.distance / 70));
    const last = this.level.platforms[this.level.platforms.length - 1];
    const chunk = makeEndlessChunk(1000 + this.endlessChunks * 7919, tier, last.x1 + 1.9, last.y + 0.4);
    // stitch: record the joining gap
    this.level.gaps.push({ x0: last.x1, x1: chunk.platforms[0].x0, yFrom: last.y, yTo: chunk.platforms[0].y, wind: 0 });
    for (const p of chunk.platforms) { p.i = this.level.platforms.length; p.crumbleT = -1; p.fallY = 0; this.level.platforms.push(p); }
    for (const k of chunk.coins) { k.taken = false; k.dx = 0; k.dy = 0; k.fx = 0; k.fy = 0; if (!k.sparkle) this.level.coins.push(k); }
    for (const o of chunk.obstacles) { o.hit = false; o.hitT = 0; this.level.obstacles.push(o); }
    for (const pw of chunk.powerups) { pw.taken = false; this.level.powerups.push(pw); }
    for (const g of chunk.gaps) this.level.gaps.push(g);
    this._lastChunkEnd = chunk.platforms[chunk.platforms.length - 1].x1;
    this.district = DISTRICTS[Math.floor(this.distance / 90) % 4];
  }

  _endlessSpeed() { return Math.min(5.2, 3.4 + this.distance * 0.006); }

  _camera(dt) {
    const c = this.cat;
    this.cam.x = c.x - this._viewW * 0.3;
    const target = this.groundY - this._viewH * 0.62;
    this.cam.y += (target - this.cam.y) * Math.min(1, dt * 2.6);
  }

  // ---------- particles ----------
  _stepParticles(dt) {
    for (const o of this.level?.obstacles || []) if (o.hit) o.hitT += dt;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.type === 'coinfly') { p.k += dt * 2.8; if (p.k >= 1) this.particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.type === 'dust') { p.vx *= 1 - dt * 3; p.vy -= dt * 1.5; }
      if (p.type === 'feather') { p.vy += dt * 1.2; p.vx = Math.sin(p.life * 6) * 1.2; }
      if (p.type === 'heart') p.vy -= dt * 0.8;
      if (p.type === 'spark') { p.vy += dt * 2; }
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.t += dt; f.y -= dt * 0.9;
      if (f.t > 1.2) this.floats.splice(i, 1);
    }
  }
  _burst(x, y, n, type, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 0.8 + Math.random() * 2;
      this.particles.push({ type, x, y: y - 0.15, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.8, life: 0.4 + Math.random() * 0.4, max: 0.8, color });
    }
  }
  _trail(c) {
    this.particles.push({ type: 'spark', x: c.x - 0.3, y: c.y - 0.4, vx: -0.5, vy: 0.2, life: 0.5, max: 0.5, color: this.combo >= COMBO_X2 ? `hsl(${(this.t * 300) % 360},90%,70%)` : this.skin.trail });
  }
  _pop(x, y, type) {
    this.particles.push({ type, x, y, vx: (Math.random() - 0.5), vy: -1.2, life: 0.9, max: 0.9, color: '#ff9fd0' });
  }
  _float(x, y, text, color) {
    this.floats.push({ x, y, text, color, t: 0 });
  }
  _spawnStreak(c) {
    this.particles.push({ type: 'streak', x: c.x + 3 + Math.random() * 3, y: c.y - 2 + Math.random() * 3, vx: -6, vy: 0, life: 0.5, max: 0.5, color: 'rgba(255,255,255,0.5)' });
  }

  // ---------- render ----------
  get _viewW() { return this._vw || 10; }
  get _viewH() { return this._vh || 16; }

  render(ctx, W, H) {
    const u = Math.min(W / 10, H / 9);
    this._vw = W / u; this._vh = H / u;
    const shake = this.shakeT > 0 ? Math.sin(this.t * 70) * this.shakeT * 6 : 0;
    const camX = this.cam.x, camY = this.cam.y;
    const sx = (wx) => (wx - camX) * u + shake;
    const sy = (wy) => (wy - camY) * u + shake * 0.6;

    art.drawSky(ctx, W, H, this.district, this.t, camX);
    art.drawSkyline(ctx, W, H, this.district, camX * u, 0);
    art.drawSkyline(ctx, W, H, this.district, camX * u, 1);

    const lvl = this.level;
    if (lvl) {
      for (const p of lvl.platforms) {
        if (p.x1 < camX - 2 || p.x0 > camX + this._viewW + 2) continue;
        const py = sy(this._platY(p));
        const px = sx(p.x0), pw = (p.x1 - p.x0) * u;
        if (p.fallen && p.fallY > 8) continue;
        p.mossPx = p.moss.map((m) => [sx(m[0]), sx(m[1])]);
        if (p.bouncy) {
          art.drawAwning(ctx, px, py, pw, u, this.cat.plat === p ? 0.4 : 0, this.district.accent);
        } else {
          art.drawPlatform(ctx, px, py, pw, u, p, this.district, this.t, H);
        }
        if (p.deco) art.drawDeco(ctx, p.deco, px, py, pw, u, this.district, this.t);
        if (p.sprinkler) {
          const active = (this.t % p.sprinkler.period) < p.sprinkler.period * p.sprinkler.duty;
          art.drawSprinkler(ctx, sx(p.sprinkler.x), py, u, active, 0, this.t);
        }
      }
      // goal lantern
      if (!this.endless && lvl.goalX < camX + this._viewW + 2) {
        const gp = lvl.platforms[lvl.platforms.length - 1];
        art.drawGoal(ctx, sx(lvl.goalX + 0.9), sy(this._platY(gp)), u, this.t, this.levelIndex === 19);
      }
      // the little GO lantern Mochi boops at level start
      if ((this.mode === 'ready' || this.t < 2.2) && !this.endless && this.mode !== 'title') {
        art.drawGoal(ctx, sx(2.5), sy(this._platY(lvl.platforms[0])), u * 0.7, this.t, false);
      }
      for (const o of lvl.obstacles) {
        if (o.x < camX - 2 || o.x > camX + this._viewW + 2) continue;
        art.drawObstacle(ctx, o, sx(o.x), sy(o.y), u, this.t);
      }
      let ci = 0;
      for (const coin of lvl.coins) {
        ci++;
        if (coin.taken || coin.x < camX - 1 || coin.x > camX + this._viewW + 1) continue;
        art.drawCoin(ctx, sx(coin.x + coin.dx), sy(coin.y + coin.dy), u, this.t, coin.sparkle, ci);
      }
      let pi = 0;
      for (const pw of lvl.powerups) {
        pi++;
        if (pw.taken || pw.x < camX - 1 || pw.x > camX + this._viewW + 1) continue;
        art.drawPowerup(ctx, sx(pw.x), sy(pw.y), u, this.t, pw.t, pi);
      }
    }

    // flop cart
    if (this.mode === 'flop') art.drawCart(ctx, sx(this.cartX), sy(this.cartY), u);

    // the cat
    const c = this.cat;
    const { phase, purrfect } = this.purrInfo();
    const pose = {
      grounded: c.grounded || this.mode === 'clear' || this.mode === 'title',
      vy: c.vy, runPhase: c.runPhase, squash: c.squash,
      diving: c.diving, loaf: c.loaf || (this.mode === 'clear' && this.clearT > 0.8),
      rot: this.mode === 'flop' && !this.flopLanded ? c.rot : (c.diving ? 0.45 : 0),
      blink: this.mode === 'flop' && this.flopLanded ? 0 : c.blink,
      happy: c.happy > 0 || (this.mode === 'flop' && this.flopLanded),
      purr: this.mode === 'flop' ? 0 : phase,
      purrfectFlash: purrfect ? 1 : 0,
      earBounce: c.earBounce,
    };
    const scarfScreen = c.scarf.map((p) => ({ x: sx(p.x), y: sy(p.y) }));
    art.drawCat(ctx, sx(c.x), sy(c.y), u, pose, this.skin, this.t, scarfScreen);
    if (this.bell) { // tiny bell on the scarf
      ctx.fillStyle = '#ffd98a';
      art.ell(ctx, sx(c.x) + u * 0.1, sy(c.y) - u * 0.35, u * 0.07, u * 0.07); ctx.fill();
    }
    if (this.mode === 'flop' && this.flopLanded) { // dizzy stars
      for (let i = 0; i < 3; i++) {
        const a = this.t * 4 + (i * Math.PI * 2) / 3;
        art.starPath(ctx, sx(c.x) + Math.cos(a) * u * 0.55, sy(c.y) - u * 1.15 + Math.sin(a) * u * 0.14, u * 0.09);
        ctx.fillStyle = '#ffd98a'; ctx.fill();
      }
    }

    // particles
    for (const p of this.particles) {
      if (p.type === 'coinfly') {
        // fish coin flying up to the HUD counter (screen-space, eased)
        if (p.sx === undefined) { p.sx = sx(p.x); p.sy = sy(p.y); }
        const e = p.k * p.k * (3 - 2 * p.k);
        const fx2 = p.sx + (W - 84 - p.sx) * e, fy2 = p.sy + (34 - p.sy) * e;
        art.drawCoin(ctx, fx2, fy2, u * (1 - 0.5 * e), this.t, false, 3);
        continue;
      }
      const a = Math.max(0, p.life / p.max);
      const x = sx(p.x), y = sy(p.y);
      ctx.globalAlpha = a;
      if (p.type === 'dust') { ctx.fillStyle = 'rgba(230,225,240,0.8)'; art.ell(ctx, x, y, u * 0.09 * (2 - a), u * 0.07 * (2 - a)); ctx.fill(); }
      else if (p.type === 'spark') { ctx.fillStyle = p.color || '#fff'; art.starPath(ctx, x, y, u * 0.08 * (0.5 + a)); ctx.fill(); }
      else if (p.type === 'heart') { ctx.fillStyle = p.color; art.heartPath(ctx, x, y, u * 0.14); ctx.fill(); }
      else if (p.type === 'feather') { ctx.fillStyle = '#c8cde0'; art.ell(ctx, x, y, u * 0.12, u * 0.05); ctx.fill(); }
      else if (p.type === 'star') { ctx.fillStyle = p.color; art.starPath(ctx, x, y, u * 0.12); ctx.fill(); }
      else if (p.type === 'firefly') { art.glow(ctx, x, y, u * 0.2, 'rgba(207,232,159,0.9)', a * 0.8); }
      else if (p.type === 'streak') { ctx.strokeStyle = p.color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + u * 0.8, y); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }

    // floating texts
    for (const f of this.floats) {
      const a = Math.max(0, 1 - f.t / 1.2);
      ctx.globalAlpha = a;
      ctx.font = `700 ${Math.round(u * 0.42)}px 'Baloo 2', sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,18,40,0.7)';
      ctx.strokeText(f.text, sx(f.x), sy(f.y));
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, sx(f.x), sy(f.y));
      ctx.globalAlpha = 1;
    }

    // full-screen overlays: gradients cached per canvas size, faded via globalAlpha
    if (!this._ovl || this._ovlW !== W || this._ovlH !== H) {
      this._ovlW = W; this._ovlH = H;
      const mg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
      mg.addColorStop(0, 'rgba(184,166,255,0)'); mg.addColorStop(1, 'rgba(184,166,255,0.35)');
      const pg = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.7);
      pg.addColorStop(0, 'rgba(255,217,138,0)'); pg.addColorStop(1, 'rgba(255,217,138,0.25)');
      this._ovl = { mg, pg };
    }
    if (this.milkT > 0) {
      ctx.globalAlpha = Math.min(1, this.milkT);
      ctx.fillStyle = this._ovl.mg; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (this.glowT > 0) {
      ctx.globalAlpha = this.glowT;
      ctx.fillStyle = this._ovl.pg; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }
}
