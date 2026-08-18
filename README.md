# Purrkour

*A rooftop lullaby.* One tap, twenty moonlit rooftops, one small gift for Hana.

Purrkour is a one-thumb kawaii parkour game for the phone browser. Mochi, a
marshmallow-round kitten with a flopped ear and a hand-knitted scarf, runs the
night rooftops to reach her faraway best friend's windowsill. Her purr is the
power gauge: it swells and fades with the music, and your jump is as strong as
her purr the instant you tap. Tap on the swell for a PURRFECT pounce; tap in
the air for a Whisker Dive. Falling is never a death, just a cute flop into a
laundry cart and an instant retry.

- 20 handcrafted bite-size levels across 4 districts, each slightly harder
- PURRFECT combos multiply coin value; one hidden Sparkle Fish per level
- Power-ups: Moon Milk (low gravity), Magnet Fish (coin magnet), Star Bell (fall save)
- The Yarn Shop: 8 unlockable cats, each with their own trail
- Endless Night mode after the final rooftop
- All art is code-drawn vector, all sound is synthesized WebAudio; no assets, no build step

## Play

Serve the folder statically and open it on a phone (or desktop; Space = tap):

```
python3 -m http.server 8123
```

## Design and tests

- `DESIGN.md` - the full studio design brief the game was built from
- `tools/validate-levels.mjs` - simulates the real jump physics against every
  gap in all 20 levels (plus endless chunks) and asserts clearability with
  margin: `node tools/validate-levels.mjs`
- The purr-rhythm difficulty is validated: no PURRFECT is required before
  district D, and exactly two Moon Leaps demand one.

## Tech

Plain HTML plus ES modules, Canvas 2D, fixed-step physics at 120 Hz,
localStorage saves with an in-memory fallback, PWA manifest for
add-to-home-screen. Level geometry and physics constants live in pure modules
shared by the game and the Node validator.
