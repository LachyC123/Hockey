# Sideline

A field hockey management simulation built on the real England Hockey league
pyramid — 176 real clubs across 16 divisions, from the Premier Division down to
the North Premier Division where Formby's first XI play.

Web app. React + TypeScript + Vite. No backend, no accounts, no timers, no ads.

```bash
npm install
npm run dev
```

## Why it isn't just a football manager with sticks

The attribute model, the match engine and the tactics are all built around what
actually decides hockey matches rather than football ones.

**Penalty corners are the game.** Around a third of all goals come from them.
Drag flicking is a genuine specialism — most players simply cannot do it, so a
club with an elite flicker scores from set pieces an otherwise equal club
cannot. The routine you pick matters: a drag flick is the highest-percentage
option but needs someone who can take it, a straight strike leans on the
injector and stopper working cleanly, and a worked variation trades conversion
rate for rebounds.

**Rolling substitutions are unlimited.** Stamina is managed, not endured, so
squad depth is worth real points across a season and your rotation policy is a
live tactical lever rather than a menu setting.

**Cards cost you time on the pitch.** Green is two minutes, yellow is five to
ten, red ends your afternoon. In a sixty-minute game, being a player down is
punishing, which makes tackling aggression a genuine trade-off.

**Positions use the sport's own vocabulary.** Sweeper, full back, half back,
inside — not a back four borrowed from somewhere else. Ratings are
position-weighted, so the best player in your squad depends on where you play
them.

**Shootouts are eight-second one-on-one runs** from the 23-metre line, decided
by the attacker's stick skill against the keeper's willingness to come out.

### Calibration

The engine is measured against real hockey, not eyeballed. `npm test` prints:

```
goals per match          5.60          real hockey ≈ 5-7
corner goals per match   1.99          share of all goals 35.4%  (real ≈ 30-40%)
penalty corners         10.56          real ≈ 8-12 combined
shots / on target       26.15 / 14.31  (55% on target)
cards g/y/r              2.04 / 0.42 / 0.04
common scorelines        1-2, 3-2, 2-3, 3-1, 2-1
```

Those numbers are asserted in the test suite, so a change that turns hockey into
football fails the build.

## The pyramid

| Tier | Men | Women |
|---|---|---|
| 1 | Premier Division | Premier Division |
| 2 | Division One North / South | Division One North / South |
| 3 | Conference North / Midlands / East / West | Conference North / Midlands / East / West |
| 4 | North Premier Division | North Premier Division |

Promotion and relegation run the whole way up and down, and route regionally —
a club relegated from the Premier Division drops into whichever Division One
covers its part of the country. The Premier Division settles its title in a
top-four play-off, so finishing first wins you a semi-final, not a trophy.

Tier 4 is modelled for the North only, because that is the level Formby play at.
The Midlands, East and West conferences have nothing below them here.

You can start at any club in any division. Taking Formby from tier four to the
Premier Division is four promotions and a very different game from inheriting
Surbiton.

## Real data, and what that actually means

Club names, towns, home venues and the league structure are real. **Players are
not, by default** — they are generated with realistic British name pools until
you import real squads.

Two honest caveats, both surfaced inside the app on the Data tab:

- **Division placements need checking.** Every club is real, but which division
  it sits in for 2025/26 was assembled without access to `englandhockey.co.uk`,
  which is blocked from the environment this was built in. Each club carries a
  `verified` flag; the unverified ones are best-effort placements.
- **Attributes are always modelled.** No public source publishes ability ratings
  for England Hockey League players. Even after importing a real squad, the
  twenty-two attributes are generated from the club's standing, the listed
  position and any `rating` hint you supply. Names, positions, numbers, ages,
  nationalities and caps are used exactly as given.

### Importing real squads

Drop JSON files into `src/data/squads/` and the game uses them instead of
generated squads. A name and a position per player is enough; everything else is
filled in.

```bash
node scripts/import-squads.mjs --list-clubs --division m-np
node scripts/import-squads.mjs --club m-np:formby --from-csv squad.csv
```

Full schema and a worked example in [`data/README.md`](data/README.md).

## Layout

```
src/
  engine/
    types.ts      Domain model — attributes, positions, tactics, fixtures
    rng.ts        Seeded PRNG; same seed replays a season exactly
    players.ts    Generation, position-weighted ratings, training, ageing
    match.ts      The match engine
    season.ts     Fixtures, tables, play-offs, promotion and relegation
    game.ts       Save state, advancing rounds, rolling over seasons
  data/
    clubs.ts      176 real clubs across 16 divisions
    names.ts      Name pools for generated players
    squads.ts     Real squad loading
    squads/       Drop imported squad JSON here
  ui/             Screens
scripts/
  import-squads.mjs
```

## Commands

```bash
npm run dev        # dev server
npm run build      # production build
npm test           # engine tests and calibration report
npm run typecheck  # tsc --noEmit
```

## Saves

Progress is stored in `localStorage`. A completed season is around 2.3MB against
a typical 5MB quota, which works because commentary is kept only for your own
matches — everyone else's results keep their score and team totals, which is
enough to rebuild every table exactly. If a save ever fails, the app says so
rather than losing your season quietly.
