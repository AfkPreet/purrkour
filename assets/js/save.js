// Purrkour - persistence with in-memory fallback (some webviews block localStorage).
const KEY = 'purrkour_save_v1';

const DEFAULTS = {
  v: 1,
  coins: 0,
  cleared: 0,            // highest level cleared (1-based count)
  sparkles: {},          // { levelIndex: true }
  skins: ['mochi'],
  skin: 'mochi',
  endlessBest: 0,
  endlessUnlocked: false,
  storySeen: { intro: false, half: false, end: false },
  sound: true,
  music: true,
  totalPurrfects: 0,
};

let mem = null;

function storageOK() {
  try {
    localStorage.setItem('__pk_test', '1');
    localStorage.removeItem('__pk_test');
    return true;
  } catch { return false; }
}
const hasLS = typeof localStorage !== 'undefined' && storageOK();

export function loadSave() {
  if (mem) return mem;
  let data = null;
  if (hasLS) {
    try { data = JSON.parse(localStorage.getItem(KEY)); } catch { data = null; }
  }
  mem = { ...structuredClone(DEFAULTS), ...(data || {}) };
  mem.storySeen = { ...DEFAULTS.storySeen, ...(mem.storySeen || {}) };
  if (!Array.isArray(mem.skins) || !mem.skins.includes('mochi')) mem.skins = ['mochi'];
  return mem;
}

export function persist() {
  if (!mem) return;
  if (hasLS) {
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch { /* full or blocked - keep playing */ }
  }
}
