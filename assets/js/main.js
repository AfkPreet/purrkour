// Purrkour - boot, screens, HUD, and wiring.
import { STR, SKINS, LEVEL_NAMES, FLOP_LINES, DISTRICTS } from './config.js';
import { loadSave, persist } from './save.js';
import { AudioEngine } from './audio.js';
import { Game } from './game.js';
import { drawCatPortrait, drawVignette, drawCoin } from './art.js';

const $ = (id) => document.getElementById(id);
const save = loadSave();
const audio = new AudioEngine();
audio.sound = save.sound; audio.music = save.music;

const canvas = $('game');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, dpr = 1;

let screen = 'title'; // title | map | shop | story | play
let paused = false;
let flopTimer = null;
let pendingAfterStory = null;
let storySeq = [], storyIdx = 0, storyT = 0;

const skinById = (id) => SKINS.find((s) => s.id === id) || SKINS[0];

// A pointerdown that swaps screens must eat the same tap's trailing click, or the
// click lands on whatever button appears under the finger (ghost click).
function swallowNextClick() {
  const stop = (e) => { e.preventDefault(); e.stopPropagation(); cleanup(); };
  const cleanup = () => { document.removeEventListener('click', stop, true); clearTimeout(tid); };
  document.addEventListener('click', stop, true);
  const tid = setTimeout(cleanup, 500);
}

// ---------- game events ----------
const game = new Game(audio, {
  onCoin(run) {
    $('coin-count').textContent = run;
    const chip = $('coin-chip');
    chip.classList.remove('squish'); void chip.offsetWidth; chip.classList.add('squish');
  },
  onProgress(f) {
    const pct = Math.round(f * 100);
    if (pct === lastPct) return;
    lastPct = pct;
    $('moonbar-fill').style.width = `${pct}%`;
    $('moonbar').classList.toggle('near', pct >= 85); // the window ahead starts to breathe
  },
  onDistance(m) {
    if (m === lastDist) return;
    lastDist = m;
    const best = Math.max(save.endlessBest, m);
    $('dist-chip').innerHTML = `${m} m<small style="display:block;font-size:12px;opacity:0.75">BEST ${best} m${m > save.endlessBest && save.endlessBest > 0 ? ' &#9733;' : ''}</small>`;
  },
  onTutorial(id) { showTut([null, STR.tut1, STR.tut2, STR.tut3][id]); },
  onSparkle() {},
  onPower() {},
  onStarSave() {},
  onFlopStart() { hide('hud'); },
  onFlopDone(fromTap) {
    if (fromTap) { bankRun(); restartRun(); return; }
    if (!$('flop-card').classList.contains('hidden')) return;
    if (game.endless) {
      $('flop-line').textContent = FLOP_LINES[Math.floor(Math.random() * FLOP_LINES.length)];
      $('flop-extra').textContent = `${game.distance} m   ·   BEST ${Math.max(save.endlessBest, game.distance)} m`;
    } else {
      $('flop-line').textContent = FLOP_LINES[Math.floor(Math.random() * FLOP_LINES.length)];
      $('flop-extra').textContent = '';
    }
    bankRun();
    show('flop-card');
    flopTimer = setTimeout(restartRun, 1400);
  },
  onClearDone() { onLevelCleared(); },
});
game.skin = skinById(save.skin);

// ---------- helpers ----------
function show(id) { $(id).classList.remove('hidden'); }
function hide(id) { $(id).classList.add('hidden'); }
function hideAllScreens() { for (const id of ['title', 'map', 'shop', 'story', 'clear-card', 'flop-card', 'pause-card', 'hud', 'tut']) hide(id); }

let lastPct = -1, lastDist = -1;

// idempotent: the run's counters are zeroed once banked, so overlapping paths
// (flop card + pause + leave, tap-retry, clear) can all call this safely
function bankRun() {
  if (game.coinsRun > 0) { save.coins += game.coinsRun; game.coinsRun = 0; }
  if (game.sparkleFound && !game.endless) save.sparkles[game.levelIndex] = true;
  if (game.endless) save.endlessBest = Math.max(save.endlessBest, game.distance);
  save.totalPurrfects += game.purrfects || 0;
  game.purrfects = 0;
  persist();
}

function startLevel(i, fresh = true) {
  hideAllScreens();
  clearTimeout(flopTimer);
  clearTimeout(tutTimer);
  screen = 'play'; paused = false;
  game.skin = skinById(save.skin);
  game.startLevel(i, fresh);
  $('level-chip').innerHTML = `<b>${i + 1}</b><span>${LEVEL_NAMES[i]}</span>`;
  $('coin-count').textContent = '0';
  $('moonbar-fill').style.width = '0%';
  $('moonbar').classList.remove('near');
  hide('dist-chip'); show('hud'); $('moonbar').classList.remove('hidden');
  audio.startMusic(Math.min(3, Math.floor(i / 5)));
}

function startEndless(fresh = true) {
  hideAllScreens();
  clearTimeout(flopTimer);
  clearTimeout(tutTimer);
  screen = 'play'; paused = false;
  lastDist = -1;
  game.skin = skinById(save.skin);
  game.startEndless(fresh);
  $('level-chip').innerHTML = `<b>&#8734;</b><span>${STR.endlessName}</span>`;
  $('coin-count').textContent = '0';
  $('moonbar').classList.add('hidden');
  show('hud'); show('dist-chip'); $('dist-chip').textContent = '0 m';
  audio.startMusic(0);
}

function restartRun() {
  if (document.hidden) { clearTimeout(flopTimer); flopTimer = setTimeout(restartRun, 600); return; }
  clearTimeout(flopTimer);
  hide('flop-card');
  if (game.endless) startEndless(false);
  else startLevel(game.levelIndex, false);
}

function onLevelCleared() {
  const i = game.levelIndex;
  const stats = { coins: game.coinsRun, purrfects: game.purrfects, sparkle: game.sparkleFound };
  bankRun();
  save.cleared = Math.max(save.cleared, i + 1);
  if (i === 19) save.endlessUnlocked = true;
  persist();
  const showCard = () => {
    screen = 'play';
    $('clear-stats').innerHTML =
      `Fish Coins +${stats.coins}<br>Purrfects ${stats.purrfects}` +
      (stats.sparkle ? `<br><span class="pink">${STR.sparkleFound}</span>` : '');
    $('next-btn').textContent = i === 19 ? (save.endlessUnlocked ? STR.endlessName : STR.map) : STR.next;
    show('clear-card');
    audio.levelClear();
  };
  if (i === 9 && !save.storySeen.half) { save.storySeen.half = true; persist(); runStory([3], showCard); }
  else if (i === 19 && !save.storySeen.end) { save.storySeen.end = true; persist(); runStory([4], () => { showCard(); showTutText(STR.endlessUnlocked, 4000); }); }
  else showCard();
}

// ---------- story ----------
function runStory(indices, done) {
  hideAllScreens();
  screen = 'story';
  storySeq = indices; storyIdx = 0; storyT = 0;
  pendingAfterStory = done;
  $('story-caption').textContent = STR.story[storySeq[0]];
  show('story');
}
function advanceStory() {
  if (screen !== 'story' || storyIdx >= storySeq.length) return;
  storyIdx++;
  if (storyIdx >= storySeq.length) {
    hide('story');
    screen = 'play';
    const done = pendingAfterStory; pendingAfterStory = null;
    done?.();
  } else {
    storyT = 0;
    $('story-caption').textContent = STR.story[storySeq[storyIdx]];
  }
}

// ---------- tutorial toast ----------
let tutTimer = null;
function showTut(text) { showTutText(text, 2600); }
function showTutText(text, ms) {
  const el = $('tut');
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(tutTimer);
  tutTimer = setTimeout(() => el.classList.add('hidden'), ms);
}

// ---------- title ----------
function openTitle() {
  hideAllScreens();
  clearTimeout(flopTimer);
  screen = 'title';
  game.startTitle();
  game.skin = skinById(save.skin);
  show('title');
  updateToggles();
  if (audio.ctx) audio.startMusic('title');
}

function playPressed() {
  audio.unlock(); audio.tapUI();
  if (!save.storySeen.intro) {
    save.storySeen.intro = true; persist();
    runStory([0, 1, 2], () => startLevel(0));
  } else {
    startLevel(Math.min(19, save.cleared));
  }
}

function updateToggles() {
  $('snd-btn').classList.toggle('off', !save.sound);
  $('mus-btn').classList.toggle('off', !save.music);
}

// ---------- map ----------
function openMap() {
  hideAllScreens();
  screen = 'map';
  const list = $('map-list');
  list.innerHTML = '';
  for (let d = 0; d < 4; d++) {
    const dh = document.createElement('div');
    dh.className = 'district-h';
    dh.textContent = DISTRICTS[d].name.toUpperCase();
    dh.style.color = DISTRICTS[d].accent;
    list.appendChild(dh);
    const row = document.createElement('div');
    row.className = 'node-row';
    row.style.setProperty('--acc', DISTRICTS[d].accent);
    for (let k = 0; k < 5; k++) {
      const i = d * 5 + k;
      const node = document.createElement('button');
      const cleared = i < save.cleared;
      const open = i <= save.cleared;
      node.className = 'node' + (cleared ? ' cleared' : '') + (open ? '' : ' locked') + (i === save.cleared ? ' current' : '');
      node.innerHTML = `<b>${i + 1}</b><i>${LEVEL_NAMES[i]}</i>` + (save.sparkles[i] ? '<em class="badge"></em>' : '');
      node.addEventListener('click', () => {
        audio.unlock();
        if (!open) { audio.denied(); node.classList.add('wobble'); setTimeout(() => node.classList.remove('wobble'), 400); return; }
        audio.tapUI(); startLevel(i);
      });
      row.appendChild(node);
    }
    list.appendChild(row);
  }
  const e = document.createElement('button');
  e.className = 'endless-node' + (save.endlessUnlocked ? '' : ' locked');
  e.innerHTML = `<b>${STR.endlessName}</b><i>${save.endlessUnlocked ? STR.endlessTag + (save.endlessBest ? `  ·  BEST ${save.endlessBest} m` : '') : 'clear rooftop 20 to unlock'}</i>`;
  e.addEventListener('click', () => {
    audio.unlock();
    if (!save.endlessUnlocked) { audio.denied(); return; }
    audio.tapUI(); startEndless();
  });
  list.appendChild(e);
  show('map');
}

// ---------- shop ----------
function openShop() {
  hideAllScreens();
  screen = 'shop';
  $('shop-balance').textContent = save.coins;
  const list = $('shop-list');
  list.innerHTML = '';
  for (const s of SKINS) {
    const owned = save.skins.includes(s.id);
    const wearing = save.skin === s.id;
    const card = document.createElement('div');
    card.className = 'skin-card' + (wearing ? ' wearing' : '');
    const cv = document.createElement('canvas');
    const pd = Math.min(3, window.devicePixelRatio || 1); // crisp on retina phones
    cv.width = cv.height = Math.round(64 * pd);
    cv.className = 'portrait';
    cv.style.boxShadow = `inset 0 0 0 2px ${s.scarf}55`;
    const pctx = cv.getContext('2d');
    pctx.setTransform(pd, 0, 0, pd, 0, 0);
    drawCatPortrait(pctx, 64, s);
    card.appendChild(cv);
    const info = document.createElement('div');
    info.className = 'skin-info';
    info.innerHTML = `<b>${s.name}</b><i>${s.flavor}</i>`;
    card.appendChild(info);
    const btn = document.createElement('button');
    btn.className = 'skin-btn' + (wearing ? ' active' : owned ? '' : ' buy');
    btn.textContent = wearing ? STR.wearing : owned ? STR.wear : `${STR.unlock} · \u{1F41F}${s.price}`;
    btn.addEventListener('click', () => {
      audio.unlock();
      if (wearing) return;
      if (owned) { audio.tapUI(); save.skin = s.id; persist(); openShop(); return; }
      if (save.coins >= s.price) {
        audio.sparkleFish();
        save.coins -= s.price; save.skins.push(s.id); save.skin = s.id; persist(); openShop();
      } else {
        audio.denied();
        btn.textContent = STR.poor;
        btn.classList.add('wobble');
        setTimeout(() => { btn.classList.remove('wobble'); btn.textContent = `${STR.unlock} · \u{1F41F}${s.price}`; }, 1100);
      }
    });
    card.appendChild(btn);
    list.appendChild(card);
  }
  show('shop');
}

// ---------- pause ----------
function pauseGame() {
  if (screen !== 'play' || paused) return;
  // nothing to pause while a result card is up; also keeps the flop timer honest
  if (!$('flop-card').classList.contains('hidden') || !$('clear-card').classList.contains('hidden')) return;
  clearTimeout(flopTimer);
  paused = true;
  audio.setPurr(0);
  show('pause-card');
}
function resumeGame() { paused = false; hide('pause-card'); }
function leaveLevel() {
  // leaving during the clear celebration still counts as clearing the level
  if (!game.endless && game.mode === 'clear') {
    save.cleared = Math.max(save.cleared, game.levelIndex + 1);
    if (game.levelIndex === 19) save.endlessUnlocked = true;
  }
  bankRun();
  paused = false;
  openTitle();
}

// ---------- input ----------
function gameTap() {
  audio.unlock();
  if (screen === 'story') { audio.tapUI(); swallowNextClick(); advanceStory(); return; }
  if (screen !== 'play' || paused) return;
  game.tap();
}
document.addEventListener('pointerdown', (e) => {
  audio.unlock();
  if (audio.ctx && screen === 'title' && !audio.mood) audio.startMusic('title');
  if (e.target.closest('button')) return;
  if (screen === 'play' && !$('flop-card').classList.contains('hidden')) { swallowNextClick(); restartRun(); return; }
  if (screen === 'play' && !$('clear-card').classList.contains('hidden')) return;
  gameTap();
});
document.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if ((e.code === 'Space' || e.code === 'ArrowUp') && (screen === 'play' || screen === 'story') && !e.target.closest?.('button')) {
    e.preventDefault();
    if (screen === 'play' && !$('flop-card').classList.contains('hidden')) { restartRun(); return; }
    gameTap();
  }
  if (e.code === 'Escape' && screen === 'play') (paused ? resumeGame : pauseGame)();
});
canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

// buttons
$('play-btn').addEventListener('click', playPressed);
$('shop-btn').addEventListener('click', () => { audio.unlock(); audio.tapUI(); openShop(); });
$('map-btn').addEventListener('click', () => { audio.unlock(); audio.tapUI(); openMap(); });
$('shop-back').addEventListener('click', () => { audio.tapUI(); openTitle(); });
$('map-back').addEventListener('click', () => { audio.tapUI(); openTitle(); });
$('pause-btn').addEventListener('click', () => { audio.tapUI(); pauseGame(); });
$('resume-btn').addEventListener('click', () => { audio.tapUI(); resumeGame(); });
$('leave-btn').addEventListener('click', () => { audio.tapUI(); leaveLevel(); });
$('next-btn').addEventListener('click', () => {
  audio.tapUI(); hide('clear-card');
  const i = game.levelIndex;
  if (i === 19) { if (save.endlessUnlocked) startEndless(); else openMap(); }
  else startLevel(i + 1);
});
$('replay-btn').addEventListener('click', () => { audio.tapUI(); hide('clear-card'); startLevel(game.levelIndex); });
$('clear-map-btn').addEventListener('click', () => { audio.tapUI(); openMap(); });
$('snd-btn').addEventListener('click', () => {
  audio.unlock();
  save.sound = !save.sound; persist(); audio.setSound(save.sound); updateToggles(); audio.tapUI();
});
$('mus-btn').addEventListener('click', () => {
  audio.unlock();
  save.music = !save.music; persist(); audio.setMusic(save.music); updateToggles(); audio.tapUI();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (screen === 'play' && !paused) pauseGame();
    audio.ctx?.suspend();
  } else {
    audio.ctx?.resume();
  }
});

// ---------- canvas + loop ----------
function resize() {
  dpr = Math.min(2.2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
  const sc = $('story-canvas');
  sc.width = Math.round(sc.clientWidth * dpr); sc.height = Math.round(sc.clientHeight * dpr);
}
window.addEventListener('resize', resize);
resize();

// coin icon in the HUD
{
  const icv = $('coin-icon');
  icv.width = icv.height = 44;
  const ictx = icv.getContext('2d');
  drawCoin(ictx, 20, 24, 40, 1.2, false, 1);
}

let last = performance.now();
let pausedFrameDrawn = false;
let sizeCheck = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  // self-heal canvas size (iOS rotation can fire resize with stale dimensions)
  if (++sizeCheck > 30) {
    sizeCheck = 0;
    if (window.innerWidth !== W || window.innerHeight !== H) resize();
  }
  if (!paused) { game.update(dt); pausedFrameDrawn = false; }
  const covered = screen === 'map' || screen === 'shop' || screen === 'story';
  if (!covered && !(paused && pausedFrameDrawn)) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    game.render(ctx, W, H);
    if (paused) pausedFrameDrawn = true;
  }
  if (screen === 'story') {
    storyT += dt;
    const sc = $('story-canvas');
    const cw = Math.round(sc.clientWidth * dpr), ch = Math.round(sc.clientHeight * dpr);
    if (cw > 0 && (sc.width !== cw || sc.height !== ch)) { sc.width = cw; sc.height = ch; }
    if (sc.width > 0) {
      const sctx = sc.getContext('2d');
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawVignette(sctx, sc.width / dpr, sc.height / dpr, storySeq[storyIdx], storyT);
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

openTitle();

// debug/testing hook (harmless in production)
window.__pk = { game, save, audio, startLevel, startEndless, openMap, openShop, openTitle };
