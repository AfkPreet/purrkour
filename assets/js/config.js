// Purrkour - shared constants. Pure module: must run under Node (no DOM).

export const PHYS = {
  g: 22,            // gravity, u/s^2
  vmax: 9.2,        // full-power jump velocity, u/s
  minPow: 0.62,     // power factor at the bottom of the purr
  purrfectPow: 1.12,// power factor inside the PURRFECT window
  purrfectWin: 0.110, // seconds around the purr peak that count as PURRFECT
  coyote: 0.12,     // coyote time after running off an edge
  buffer: 0.13,     // input buffer before landing
  diveVel: 14,      // downward velocity of a Whisker Dive
  snapWin: 0.22,    // dive-to-landing window for a Snap Landing
  snapBoost: 1.18,  // run-speed multiplier after a Snap Landing
  snapTime: 0.8,    // seconds the snap boost lasts
  vyMax: 17,        // terminal fall speed
  catHW: 0.28,      // cat half-width for landings
  coinR: 0.45,      // coin pickup radius
  magnetR: 2.6,     // magnet fish pull radius
  stumbleSlow: 0.5, // speed multiplier while stumbling
  stumbleTime: 0.6,
  stumbleLock: 0.3, // seconds jumps are locked after a stumble
  sprayTime: 0.5,   // sprinkler slowdown
  spraySlow: 0.7,
  bounceVel: 9.6,   // awning auto-bounce velocity
  bounceBoost: 1.2, // run-speed multiplier during a bounce flight
  crumbleDelay: 0.7,// seconds a crumble tile holds after first touch
  milkTime: 6, milkGravity: 0.45,
  magnetTime: 8,
  lowCeil: -7,      // soft ceiling (world y, negative is up) - never reached in play
};

// Purr cycle: peak every 2 beats (full swell-and-fade = 2 beats). phase() in [0,1], 1 at the peak.
export const purrPeriod = (bpm) => 120 / bpm;
export const purrPhase = (t, bpm) => 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / purrPeriod(bpm));
// Time (within a cycle) to the nearest purr peak.
export function timeToPeak(t, bpm) {
  const P = purrPeriod(bpm);
  const tc = ((t % P) + P) % P;
  return Math.abs(tc - P / 2);
}
export const isPurrfect = (t, bpm) => timeToPeak(t, bpm) <= PHYS.purrfectWin;
export const powerFor = (phase) => PHYS.minPow + (1 - PHYS.minPow) * phase;
export const jumpVel = (f) => PHYS.vmax * f;

export const DISTRICTS = [
  {
    key: 'oldtown', name: 'Old Town Tiles', speed: 3.4, bpm: 92,
    skyTop: '#191b3a', skyBot: '#2a2d5e',
    far: '#262347', mid: '#332f58',
    roof: '#a65b4b', roofEdge: '#8a4a3d', wall: '#4a3a55', wallLit: '#ffcf6f',
    accent: '#e8927c',
  },
  {
    key: 'market', name: 'Neon Market', speed: 3.8, bpm: 96,
    skyTop: '#171a38', skyBot: '#33245c',
    far: '#241f4a', mid: '#3a2c63',
    roof: '#546a8c', roofEdge: '#43566f', wall: '#3c3160', wallLit: '#ffd98a',
    accent: '#ff9fd0',
  },
  {
    key: 'garden', name: 'Garden Terraces', speed: 4.2, bpm: 100,
    skyTop: '#16203c', skyBot: '#274a63',
    far: '#1f2c4c', mid: '#2f4468',
    roof: '#4f7d6b', roofEdge: '#3f6555', wall: '#37455f', wallLit: '#ffe3a1',
    accent: '#9fe0b7',
  },
  {
    key: 'heights', name: 'Moonrise Heights', speed: 4.6, bpm: 104,
    skyTop: '#131530', skyBot: '#3b2b63',
    far: '#201d44', mid: '#2d2857',
    roof: '#5a5680', roofEdge: '#484468', wall: '#332f58', wallLit: '#ffd9b0',
    accent: '#b8a6ff',
  },
];
export const districtFor = (levelIndex) => DISTRICTS[Math.min(3, Math.floor(levelIndex / 5))];

export const LEVEL_NAMES = [
  'Bakery Roof', 'Chimney Row', 'The Clothesline', 'Tabby Alley', 'The Clock Tower',
  'Lantern Street', 'Noodle Sign', 'Fish Market Roofs', 'Arcade Glow', 'The Night Train',
  'Fern Balconies', 'Sprinkler Waltz', 'The Greenhouse', 'Koi Pond Roof', 'Wisteria Steps',
  'Wind Chime Spires', 'The Crane', 'Crumbling Eaves', 'Starlight Scaffold', "Hana's Window",
];

export const SKINS = [
  { id: 'mochi', name: 'Mochi', price: 0, flavor: 'The bravest marshmallow on the skyline.',
    body: '#fff3e0', belly: '#fffdf7', ear: '#ffb9a8', scarf: '#e0475b', scarf2: '#c23349',
    trail: '#ffd98a', eye: '#c98a2d', pattern: 'none' },
  { id: 'nori', name: 'Nori', price: 150, flavor: 'A shadow with moon-green eyes. Very sneaky. Very soft.',
    body: '#3a3a4a', belly: '#54546a', ear: '#8a7f9e', scarf: '#7fe3c3', scarf2: '#57c9a6',
    trail: '#a5ffe0', eye: '#9fe87f', pattern: 'none' },
  { id: 'miso', name: 'Miso', price: 250, flavor: 'Calico chaos. Has never once landed gracefully. Adored anyway.',
    body: '#fff3e0', belly: '#fffdf7', ear: '#ffb9a8', scarf: '#f5a13c', scarf2: '#d9862a',
    trail: '#ffc46b', eye: '#b8762f', pattern: 'calico' },
  { id: 'sirpounce', name: 'Sir Pounce', price: 350, flavor: 'A tuxedo gentleman. The bow tie is load-bearing.',
    body: '#3d3d4d', belly: '#fffdf7', ear: '#9c8fae', scarf: '#e8e6f2', scarf2: '#c9c5dd',
    trail: '#e8e6f2', eye: '#e8b74f', pattern: 'tuxedo' },
  { id: 'boba', name: 'Boba', price: 500, flavor: '90% nap, 10% rocket.',
    body: '#b98d63', belly: '#e6c9a8', ear: '#e0a686', scarf: '#7d5636', scarf2: '#63402a',
    trail: '#ffdcb0', eye: '#6b4a2f', pattern: 'tabby' },
  { id: 'sakura', name: 'Sakura', price: 650, flavor: 'Petals follow her everywhere. Nobody knows why.',
    body: '#ffe3ec', belly: '#fff6f9', ear: '#ff9fc0', scarf: '#e05a8c', scarf2: '#c24371',
    trail: '#ffb9d4', eye: '#c9527d', pattern: 'none' },
  { id: 'cloud', name: 'Cloud', price: 800, flavor: 'Possibly a small cloud that learned to meow.',
    body: '#dceafc', belly: '#f4f9ff', ear: '#b0c8ec', scarf: '#7fb3f0', scarf2: '#5f97dd',
    trail: '#cfe4ff', eye: '#5f87c9', pattern: 'none' },
  { id: 'neon', name: 'Neon', price: 1000, flavor: 'Downloaded from a billboard. Purrs in synthwave.',
    body: '#241f45', belly: '#37306b', ear: '#ff5fa8', scarf: '#33f0e0', scarf2: '#1fc9bb',
    trail: '#ff5fa8', eye: '#33f0e0', pattern: 'neon' },
];

export const FLOP_LINES = [
  'Mrrp! The ground was closer than it looked.',
  'Gravity 1, Mochi 0. Rematch?',
  'She meant to do that. (She did not.)',
  'A perfect 10 from the pigeon judges.',
  'The laundry cart strikes again.',
  'Nine lives, zero regrets.',
];

export const STR = {
  title: 'PURRKOUR',
  subtitle: 'a rooftop lullaby',
  play: 'TAP TO PLAY',
  shop: 'THE YARN SHOP',
  map: 'ROOFTOPS',
  version: 'Purrkour v1.0 - made with love for Hana',
  mapHeader: "THE WAY TO HANA'S WINDOW",
  shopHeader: 'THE YARN SHOP',
  shopSub: 'spend your fish, wear your dreams',
  wear: 'WEAR', wearing: 'WEARING', unlock: 'UNLOCK',
  poor: 'Not enough fish... yet!',
  clear: 'LEVEL CLEAR!',
  next: 'NEXT ROOF', replay: 'REPLAY',
  retry: 'TAP TO RETRY',
  pause: 'CAT NAP', resume: 'KEEP RUNNING', leave: 'LEAVE LEVEL',
  tut1: 'Tap to pounce!',
  tut2: 'Tap when the purr glows big - PURRFECT!',
  tut3: 'Tap in the air to dive!',
  purrfect: 'PURRFECT!',
  sparkleFound: 'Sparkle Fish found!',
  endlessName: 'ENDLESS NIGHT',
  endlessTag: 'how far can the purr carry you?',
  endlessUnlocked: 'ENDLESS NIGHT unlocked - run as far as the moon will take you.',
  story: [
    'Mochi grew up in Hana’s bakery, warm as fresh bread.',
    'Then Hana moved. Twenty rooftops away.',
    'Twenty rooftops is nothing for a brave cat with a purr.',
    'Halfway. The moon keeps her company.',
    'Goodnight, Hana. See you tomorrow night.',
  ],
};

export const SPARKLE_VALUE = 25;
export const COMBO_X2 = 3;   // combo needed for x2 coins
export const COMBO_X3 = 6;   // combo needed for x3 coins
