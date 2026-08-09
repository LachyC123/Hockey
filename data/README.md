# Data

Everything the game knows about English hockey lives here or in `src/data/`.

## What is real, and what is not

| Thing | Source | Status |
|---|---|---|
| Club names, towns, home venues | Real England Hockey clubs | Real |
| League structure and tiers | Real England Hockey pyramid | Real |
| Which division a club is in **this season** | Assembled offline | **Best effort — see below** |
| Player names, ages, positions | Generated, unless you import real squads | Not real by default |
| Player attributes (1–20 ratings) | Modelled | Never real — nobody publishes these |

### Division placements need checking

Club names and locations are real. Which division each club sits in for 2025/26
changes every season with promotion, relegation and the occasional withdrawal,
and the club list in `src/data/clubs.ts` was assembled without access to
`englandhockey.co.uk` — that domain is blocked from the environment this was
built in.

Every club carries a `verified` flag in the last column of its row:

- `true` — placement cross-checked and believed correct.
- `false` — the club is real, but its division for this season is a best-effort
  assignment worth confirming.

The table is one line per club and designed to be corrected by hand. Fixing a
placement is a one-word edit.

### Player attributes are modelled, always

No public source publishes ability ratings for England Hockey League players.
Even when you import a real squad, the twenty-two attributes behind each player
are generated — from the club's standing, the player's listed position, their
senior caps if known, and an optional `rating` you can supply yourself.

What *is* used exactly as given: names, positions, squad numbers, ages,
nationalities and caps.

## Importing real squads

Squad files go in `src/data/squads/`. Any `.json` file in that directory is
picked up at build time and replaces the generated squad for whichever club its
`club` field names. Nothing is bundled by default.

### Schema

```jsonc
{
  "club": "m-np:formby",           // required — must match an id in src/data/clubs.ts
  "source": "https://…",            // optional — shown in the app for provenance
  "retrieved": "2026-08-09",        // optional — ISO date
  "players": [
    {
      "firstName": "Ada",           // required
      "lastName": "Lovelace",       // required
      "position": "CM",             // required — see positions below
      "number": 8,                  // optional — squad number
      "age": 24,                    // optional — otherwise generated
      "nationality": "ENG",         // optional — ENG, WAL, SCO, IRL, NED, AUS, …
      "caps": 12,                   // optional — senior international caps
      "rating": 62,                 // optional — 1-100 ability hint
      "dragFlicker": true,          // optional — marks a penalty corner specialist
      "attributes": { "pace": 16 }  // optional — override any attribute, 1-20
    }
  ]
}
```

Only `club`, `firstName`, `lastName` and `position` matter. Everything else is
filled in from the club's standing if you leave it out, so a bare name-and-
position list is a perfectly good import.

Squads shorter than sixteen players, or with fewer than two goalkeepers, are
padded with generated players so the club can always field a legal side. Padded
players are marked as generated and real ones as imported, and the app shows a
`REAL` badge next to the latter.

### Positions

| Code | Meaning |
|---|---|
| `GK` | Goalkeeper |
| `SW` | Sweeper |
| `FB` | Full back |
| `HB` | Half back |
| `CM` | Centre midfield |
| `AM` | Attacking midfield / inside |
| `WG` | Winger |
| `ST` | Striker |

Loose values are accepted and mapped: `defender`, `midfielder`, `forward`,
`keeper`, `striker` and similar all resolve to the nearest code.

### The importer script

```bash
# See the club ids you can import against
node scripts/import-squads.mjs --list-clubs --division m-np

# Convert a CSV you have assembled (offline, always works)
node scripts/import-squads.mjs --club m-np:formby --from-csv myfile.csv

# Try to scrape a club or team page
node scripts/import-squads.mjs --club m-np:formby --fetch https://… --dump
```

CSV columns, in any order, header row required. Only a name and a position are
needed:

```csv
name,position,number,age,nationality,caps,rating,dragFlicker
Ada Lovelace,CM,8,24,ENG,,62,
Grace Hopper,GK,1,31,ENG,,,
```

`firstName` and `lastName` columns work instead of a combined `name`.

**On the `--fetch` mode:** it has not been verified against the live England
Hockey site, because that site is unreachable from the environment this was
written in. The extraction rules in `EXTRACTORS` are reasoned from typical page
structure rather than tested against real HTML, and club sites run on several
different platforms. Run with `--dump` first to see what comes back, and expect
to adjust the selectors. The `--from-csv` path has no such caveat.

`example-squad.json` in this directory shows the format with placeholder names.
Copy it into `src/data/squads/` and replace the contents.
