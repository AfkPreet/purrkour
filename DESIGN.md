# PURRKOUR - Design Brief (locked)

Create and deploy a one-thumb mobile browser game. This brief is the build prompt: everything below is
specified so that a stranger could build the game from this document alone.

TITLE: Purrkour
ONE-LINE PITCH: A marshmallow-round kitten pounces across moonlit rooftops on the beat of her own purr,
carrying a tiny gift to her faraway best friend - one tap, twenty rooftops, infinite one-more-tries.

GENRE: Single-player, portrait-first, one-tap rhythm-parkour auto-runner. 20 bite-size handcrafted levels
plus an unlockable endless mode. Sessions of 2-5 minutes.

---

## 1. THE STAR - MOCHI

Mochi is a marshmallow-round cream kitten, drawn soft-vector kawaii with zero sharp corners:

- Body: a plump cream (#fff3e0) oval, bigger head than body, tiny stub legs, blob paws.
- Face: huge glossy amber eyes with twin star highlights, pink blush circles, a tiny "w" mouth,
  three dot-whiskers per cheek.
- Ears: peach-pink inner ears; the LEFT ear is permanently flopped over. It bounces on every landing.
- Tail: short and stubby with a slightly darker tip; it coils like a spring while she waits.
- Scarf: a little red hand-knitted scarf (knitted by Hana). It streams behind her mid-pounce and
  flutters like a tiny parachute during fails.
- Personality beats (idle animations): sits in loaf position at level start; slow-blinks at the player;
  tail-taps in rhythm with her purr; occasionally paws at a passing moth; boops the level's GO lantern
  with her nose to start the run.

Losing is never scary: Mochi never dies, she FLOPS (see section 6).

## 2. THE STORY (told in 5 wordless vignette cards with one caption line each)

Mochi grew up in Hana's bakery, warm as fresh bread. Then Hana's family moved - twenty rooftops away,
across the night city. Every night Mochi runs the rooftops to reach Hana's new windowsill before she
falls asleep, carrying one tiny gift: a ginkgo leaf, a bottle cap, a star-shaped candy.

- Card 1 (first launch): bakery window, kitten Mochi and Hana. Caption: "Mochi grew up in Hana's bakery, warm as fresh bread."
- Card 2 (first launch): a moving truck under the moon. Caption: "Then Hana moved. Twenty rooftops away."
- Card 3 (first launch): Mochi on a roof edge, scarf on, eyes sparkling. Caption: "Twenty rooftops is nothing for a brave cat with a purr."
- Card 4 (after level 10): Mochi under an awning, moon huge behind her. Caption: "Halfway. The moon keeps her company."
- Card 5 (after level 20): Hana's windowsill; Mochi places tonight's gift; Hana smiles in her sleep.
  Caption: "Goodnight, Hana. See you tomorrow night." Then: "ENDLESS NIGHT unlocked - run as far as the moon will take you."

All vignettes are tap-to-continue and skippable.

## 3. MECHANICS - THE PURR-POUNCE (the invented one-tap move)

Mochi auto-runs rightward. The whole game is ONE input: a tap anywhere on the screen.
The freshness: Mochi's own purr is the power gauge. Her purr swells and fades in a steady heartbeat
(a glowing aura ring plus a soft audible purr, synced to the music, peaking every 2 beats). Your jump
power is whatever her purr is doing the instant you tap.

- TAP while grounded = PURR-POUNCE. Jump power scales with the purr phase at the moment of the tap:
  62% power at the bottom of the purr, 100% at the peak.
- Tap inside the PURRFECT window (within ~110 ms of the purr peak, when the aura flashes and a heart
  pops above her head) = PURRFECT POUNCE: 112% power, rainbow-sparkle trail, screen-edge glow,
  "PURRFECT!" text, combo +1. Combo of 3+ doubles coin value ("x2!"), combo of 6+ triples it ("x3!").
  Any non-PURRFECT pounce resets the combo (gently - no penalty, the multiplier just returns to x1).
- TAP while airborne = WHISKER DIVE. Mochi snaps downward instantly (ears up, paws forward). Landing
  within 220 ms of starting a dive is a SNAP LANDING: a satisfying "pomf", a dust ring, and +18% run
  speed for 0.8 s. This is the mastery layer for catching low ledges and re-syncing with the purr.
- Forgiveness: 120 ms coyote time after running off an edge; 130 ms input buffer before landing.

Easy in five seconds: tapping always jumps, and mid-power jumps clear every mandatory gap in the early
levels. Hard to master: big gaps and the high coin routes need PURRFECTs, so players learn to plan WHERE
Mochi will be WHEN her purr peaks - a spatial-rhythmic intersection no other one-tap game asks for.

Desktop fallback (for sharing with friends on laptops): SPACE, mouse click, or any key = tap.

## 4. LEVEL / STRUCTURE

20 handcrafted levels, 20-45 seconds each, across 4 districts of 5 levels. Each level is a sequence of
rooftop platforms with gaps, height changes, decorations, obstacles, coin arcs, and one hidden Sparkle
Fish. Every level ends at a glowing paper GOAL LANTERN where Mochi sits and purrs; a "LEVEL CLEAR!"
card shows the haul. Difficulty rises by widening gaps, adding movement and hazards, and raising run
speed and music tempo per district.

District A - OLD TOWN TILES (levels 1-5). Terracotta roofs, warm amber windows, TV antennas, chimneys.
Run speed 3.4 u/s, music 92 BPM. Teaches pounce (1), PURRFECT (2), dive (3), introduces Moon Milk (4).
  1 Bakery Roof  2 Chimney Row  3 The Clothesline  4 Tabby Alley  5 The Clock Tower
District B - NEON MARKET (levels 6-10). Neon signs, paper lanterns, sliding laundry-line platforms.
Run speed 3.8 u/s, 96 BPM. Introduces moving platforms (6) and the Magnet Fish (7).
  6 Lantern Street  7 Noodle Sign  8 Fish Market Roofs  9 Arcade Glow  10 The Night Train
District C - GARDEN TERRACES (levels 11-15). Rooftop gardens, bouncy striped awnings (trampolines that
auto-bounce Mochi with a "boing"), timed sprinkler arcs to dive under. Run speed 4.2 u/s, 100 BPM.
Introduces the Star Bell (12).
  11 Fern Balconies  12 Sprinkler Waltz  13 The Greenhouse  14 Koi Pond Roof  15 Wisteria Steps
District D - MOONRISE HEIGHTS (levels 16-20). Tall indigo towers, wind gusts (visible streaks that push
Mochi mid-air), crumbling tiles (wobble, then drop after being stood on), the longest gaps. Run speed
4.6 u/s, 104 BPM.
  16 Wind Chime Spires  17 The Crane  18 Crumbling Eaves  19 Starlight Scaffold  20 Hana's Window

Obstacles are cute and non-lethal: sleepy pigeons (bump = stumble: brief slowdown, feathers puff, the
pigeon flaps off huffily), antenna clusters and AC units (jump over or stumble), slippery moss tiles
(no jump control while sliding). ONLY falling off the bottom of the screen fails the run.

ENDLESS NIGHT (post-game): procedurally chained level segments, escalating speed, tracked best distance,
coins count toward the shop. Unlocked by clearing level 20.

## 5. ECONOMY - FISH COINS, SPARKLE FISH, THE YARN SHOP

- FISH COINS: golden fish-shaped cookies laid in arcs that trace the ideal jump paths. Worth 1 each
  (x2 / x3 under PURRFECT combos). Coin totals persist across runs and levels (coins collected before a
  flop are kept - losing never takes anything away).
- SPARKLE FISH: exactly one per level, rainbow-shimmering, worth 25, hidden on a high or risky side
  route that usually needs a PURRFECT. A soft chime hints when one is near.
- THE YARN SHOP (from the title screen): unlock skins with Fish Coins. Each skin recolors Mochi, her
  scarf, and her sparkle trail. Roster (name - price - flavor line):
    Mochi - free - "The bravest marshmallow on the skyline."
    Nori - 150 - "A shadow with moon-green eyes. Very sneaky. Very soft."
    Miso - 250 - "Calico chaos. Has never once landed gracefully. Adored anyway."
    Sir Pounce - 350 - "A tuxedo gentleman. The bow tie is load-bearing."
    Boba - 500 - "Brown tabby. 90% nap, 10% rocket."
    Sakura - 650 - "Petals follow her everywhere. Nobody knows why."
    Cloud - 800 - "Possibly a small cloud that learned to meow."
    Neon - 1000 - "Downloaded from a billboard. Purrs in synthwave."
- A first full playthrough plus a little replay yields roughly 400-600 coins, so the first unlock lands
  early and the roster gives lasting reasons to return.

## 6. FAILING IS CUTE - THE FLOP

Falling triggers the FLOP, never a death: time slows, Mochi tumbles gently with her scarf fluttering
like a parachute, and she lands "pomf" in a conveniently passing laundry cart at the bottom of the
screen, pops her head out with spiral-dizzy eyes and a "mrrp?", while one rotating caption shows:
  "Mrrp! The ground was closer than it looked."
  "Gravity 1, Mochi 0. Rematch?"
  "She meant to do that. (She did not.)"
  "A perfect 10 from the pigeon judges."
  "The laundry cart strikes again."
  "Nine lives, zero regrets."
The level restarts automatically after 1.4 s, or instantly on tap ("TAP TO RETRY"). No lives, no ads,
no lost coins. Fail-to-retry is under two seconds.

## 7. POWER-UPS (float in soft soap bubbles; popping one is a sparkle-burst plus chime)

1. MOON MILK (a glowing bottle) - 6 s of dreamy low gravity: pounces float far, the purr slows and
   deepens, the screen gains drifting sparkles and a soft vignette.
2. MAGNET FISH (a horseshoe-magnet cookie) - 8 s coin magnetism: coins spiral into Mochi with an
   ascending chime arpeggio.
3. STAR BELL (a tiny gold bell that appears on Mochi's scarf) - one-charge fall save: falling with a
   Star Bell triggers a shooting star that swoops Mochi back onto the roof in a trail of stardust.
   Consumed on use.

## 8. ART DIRECTION (locked style - every asset follows it)

Soft kawaii flat-vector, drawn procedurally in canvas code (no image files, everything crisp at any DPI):
rounded shapes only, no outlines, gentle gradients. Night palette: deep indigo sky (#191b3a to #2a2d5e),
huge cream moon (#fff6e0) with a soft halo, star field with occasional shooting stars, silhouette
skyline layers in plum and slate (#3a3660, #2c2a4d), rooftops in muted terracotta / slate / indigo per
district, windows glowing warm amber (#ffcf6f) with a few lit silhouettes (a reading lamp, a cat-shaped
plant). Parallax: moon and stars (fixed), far skyline (slow), mid buildings with lit windows (medium),
playfield rooftops (full speed), foreground railing silhouettes (fast). Everything blushes: the moon has
blush, power-up bubbles have blush.

Juice rules (every action feels satisfying): squash-and-stretch on every jump and landing; landing dust
rings; PURRFECT rainbow trail plus tiny screen glow pulse; coins pop with a bounce-scale and fly a short
arc to the HUD counter; the HUD counter squishes on each pickup; goal lantern showers fireflies on level
clear; subtle camera dip on Snap Landings; light haptic pulse (where supported) on PURRFECT and level clear.

## 9. SOUND (all procedurally synthesized in WebAudio - no audio files)

- MUSIC: original lo-fi night loop per district - soft electric-piano seventh chords, warm triangle
  bass, brushed noise hats, sparse pentatonic melody plucks, vinyl-crackle layer. District tempos
  92 / 96 / 100 / 104 BPM; the purr peaks every 2 beats so the whole game breathes with the music.
  Title screen: slower, sleepier variation with crickets.
- THE PURR: a low band-passed rumble amplitude-modulated at ~25 Hz that swells and fades with the purr
  cycle - it IS the metronome, audible and visible.
- SFX: pounce "boing" (pitch rises with jump power), PURRFECT shimmer-chime, Whisker Dive whoosh,
  Snap Landing "pomf" plus dust, coin pentatonic pings that climb with combo, Sparkle Fish fanfare,
  bubble pop, Moon Milk dreamy pad swell, Star Bell jingle plus shooting-star whoosh, pigeon flap plus
  huffy coo, FLOP slide-whistle-down plus soft "mew", goal lantern firefly chimes, button tap pips.
- AMBIENCE: crickets, distant train horn (rare), night-city hush.
- Sound and music toggles in settings; the purr stays visible (aura ring) with sound off, so the rhythm
  mechanic is fully playable muted.

## 10. UI - LITERAL COPY (English)

- TITLE SCREEN: logo "PURRKOUR", subtitle "a rooftop lullaby", animated night scene with idle Mochi.
  Buttons: "TAP TO PLAY" (paw-shaped), "THE YARN SHOP", "ROOFTOPS" (level map), sound toggle, music
  toggle. Version line: "Purrkour v1.0 - made with love for Hana".
- TUTORIAL (level 1 only, floating hints): "Tap to pounce!" then "Tap when the purr glows big - PURRFECT!"
  then "Tap in the air to dive!"
- HUD: top-left level chip ("1 - Bakery Roof"); top-right fish counter ("x 12" beside a fish icon);
  progress moon-bar across the top filling toward a tiny window icon; floating combo text
  ("PURRFECT! x3"); pause button (small paw). Pause overlay: "CAT NAP" with "KEEP RUNNING" and
  "LEAVE LEVEL" buttons.
- LEVEL CLEAR CARD: "LEVEL CLEAR!", "Fish Coins +18", "Purrfects 5", "Sparkle Fish found!" (when found),
  buttons "NEXT ROOF", "REPLAY", "ROOFTOPS".
- FLOP CARD: rotating caption plus "TAP TO RETRY".
- LEVEL MAP: header "THE WAY TO HANA'S WINDOW", 20 nodes winding upward through the four districts,
  cleared nodes glow, Sparkle Fish found shown as a tiny fish badge per node, current node bounces.
- SHOP: header "THE YARN SHOP", subheader "spend your fish, wear your dreams", coin balance top-right,
  skin cards with portrait, name, flavor line, price; buttons "WEAR" / "WEARING" / "UNLOCK <price>";
  insufficient funds shows "Not enough fish... yet!" with a wobble.
- ENDLESS NIGHT entry (after clearing 20) on the level map: "ENDLESS NIGHT - how far can the purr
  carry you?" HUD adds a distance counter ("128 m"), records "BEST 512 m".

## 11. TECH

- Plain HTML plus ES-module JavaScript, Canvas 2D rendering, no build step, no external libraries.
  Files at repo root: index.html, manifest.webmanifest, icons; game code under assets/js/, all art and
  audio procedural.
- Portrait-first responsive canvas (works landscape and desktop too), devicePixelRatio-aware, world
  scale chosen so roughly 10 world units are visible ahead - two full jumps of look-ahead on a phone.
- Fixed-timestep physics (120 Hz) with interpolated rendering; localStorage persistence (coins, skins,
  progress, settings) with an in-memory fallback; WebAudio unlocked on first tap; touch-action none,
  no double-tap zoom, safe-area-inset padding; PWA manifest so "Add to Home Screen" gives a fullscreen
  app feel.
- Level geometry and physics constants live in pure modules that also run under Node, with a validator
  script that simulates every mandatory gap in all 20 levels and asserts it is clearable with margin
  (and that early-level gaps clear on mid-power taps).

## 12. DEPLOY AND SHARE CARD

- Deployed as a static site (Vercel) - public link, playable instantly on any phone browser.
- Social/share meta: og:title "Purrkour - a rooftop lullaby", og:description "Pounce on the purr.
  One tap, twenty moonlit rooftops, one small gift for Hana. The coziest way to lose five minutes.",
  og:image: 1200x630 render of Mochi mid-PURRFECT over the neon skyline with the PURRKOUR logo.
- Favicon: Mochi's face on an indigo circle (SVG plus PNG); apple-touch-icon 180x180.
- No brand or trademark references anywhere in game or metadata; all characters and names are original.

## Defaults chosen (correct me and I will adjust)

- Single-player only; leaderboards and multiplayer are out of scope for v1.
- The Higgsfield pipeline is not available in this environment, so deployment is a public Vercel link
  and the full source is pushed to the purrkour repo on the designated branch.
- All art and audio are procedural (code-drawn vectors, synthesized sound) for crispness, tiny load
  size, and zero external dependencies.
- Difficulty tuned "cozy-intense": every mandatory jump is clearable without PURRFECTs until district C;
  PURRFECTs are always the optimal line and required only for Sparkle Fish routes and a few district D gaps.
