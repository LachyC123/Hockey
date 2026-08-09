#!/usr/bin/env node
/**
 * Squad importer.
 *
 * Turns real England Hockey squad data into the JSON files the game loads from
 * src/data/squads/. Two modes:
 *
 *   --from-csv <file>    Convert a CSV you have assembled by hand or exported
 *                        from somewhere else. Works entirely offline and is the
 *                        mode to reach for first.
 *
 *   --fetch <url>        Scrape a club or team page and try to pull a squad list
 *                        out of it. Best effort: club sites are built on several
 *                        different platforms (Pitchero, GMS, bespoke), so the
 *                        extraction rules in EXTRACTORS below will need adapting
 *                        per site. Run with --dump to see the raw candidates the
 *                        scraper found before committing to a file.
 *
 * IMPORTANT — this scraping mode has not been verified against the live England
 * Hockey site. It was written in an environment where englandhockey.co.uk and
 * gms.englandhockey.co.uk are blocked by network policy, so the selectors are
 * reasoned from page structure rather than tested against real HTML. Expect to
 * adjust them. --dump exists precisely so you can see what is coming back.
 *
 * Examples:
 *   node scripts/import-squads.mjs --from-csv data/formby.csv --club m-np:formby
 *   node scripts/import-squads.mjs --fetch https://example.org/team --club m-np:formby --dump
 *   node scripts/import-squads.mjs --list-clubs --division m-np
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SQUAD_DIR = join(ROOT, 'src', 'data', 'squads')

/* ------------------------------------------------------------------ args */

function parseArgs(argv) {
  const args = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]
    if (token.startsWith('--')) {
      const key = token.slice(2)
      const next = argv[i + 1]
      if (next === undefined || next.startsWith('--')) {
        args[key] = true
      } else {
        args[key] = next
        i++
      }
    } else {
      args._.push(token)
    }
  }
  return args
}

/* ------------------------------------------------------- club id resolution */

/**
 * Read club ids straight out of the game's own data file, so the importer can
 * never write a squad for a club the game does not know about.
 */
function loadClubIds() {
  const source = readFileSync(join(ROOT, 'src', 'data', 'clubs.ts'), 'utf8')
  const rows = [...source.matchAll(/^\s*\[\s*'([^']+)'.*?,\s*'((?:m|w)-[a-z0-9]+)',\s*'(north|midlands|east|west|south)'/gm)]
  return rows.map(([, name, divisionId]) => ({
    name,
    divisionId,
    id: `${divisionId}:${slugify(name)}`,
  }))
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/hockey club|hockey|\b2nd xi\b/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/* ------------------------------------------------------------------ csv */

/** Minimal CSV reader that copes with quoted fields containing commas. */
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else { quoted = false }
      } else {
        field += char
      }
      continue
    }
    if (char === '"') { quoted = true }
    else if (char === ',') { row.push(field); field = '' }
    else if (char === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (char !== '\r') { field += char }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

const CSV_ALIASES = {
  firstname: 'firstName', first: 'firstName', forename: 'firstName',
  lastname: 'lastName', last: 'lastName', surname: 'lastName',
  name: 'name', player: 'name', fullname: 'name',
  position: 'position', pos: 'position',
  number: 'number', no: 'number', shirt: 'number', squadnumber: 'number',
  age: 'age', nationality: 'nationality', nation: 'nationality', country: 'nationality',
  caps: 'caps', rating: 'rating', ability: 'rating',
  dragflicker: 'dragFlicker', flicker: 'dragFlicker',
}

function fromCsv(path) {
  const rows = parseCsv(readFileSync(path, 'utf8'))
  if (rows.length < 2) throw new Error(`${path}: needs a header row and at least one player`)

  const header = rows[0].map((h) => CSV_ALIASES[h.trim().toLowerCase().replace(/[^a-z]/g, '')] ?? h.trim())

  return rows.slice(1).map((cells) => {
    const record = {}
    header.forEach((key, index) => {
      const value = (cells[index] ?? '').trim()
      if (value !== '') record[key] = value
    })
    return normalisePlayer(record)
  }).filter(Boolean)
}

/** Coerce a loose record into the schema the game expects. */
function normalisePlayer(record) {
  let firstName = record.firstName
  let lastName = record.lastName

  if (!firstName && record.name) {
    const parts = record.name.trim().split(/\s+/)
    firstName = parts.shift() ?? ''
    lastName = parts.join(' ')
  }
  if (!firstName || !lastName) return null

  const player = { firstName, lastName, position: record.position ?? 'CM' }
  if (record.number) player.number = Number(record.number)
  if (record.age) player.age = Number(record.age)
  if (record.nationality) player.nationality = record.nationality.toUpperCase()
  if (record.caps) player.caps = Number(record.caps)
  if (record.rating) player.rating = Number(record.rating)
  if (record.dragFlicker) {
    player.dragFlicker = /^(1|y|yes|true)$/i.test(String(record.dragFlicker))
  }

  // Drop fields that came through as NaN rather than writing rubbish to disk.
  for (const key of ['number', 'age', 'caps', 'rating']) {
    if (key in player && !Number.isFinite(player[key])) delete player[key]
  }
  return player
}

/* ---------------------------------------------------------------- fetch */

/**
 * Candidate extraction rules, most specific first. Club sites differ, so this
 * is where to adapt when a page does not parse. Each returns an array of raw
 * { name, position, number } records.
 */
const EXTRACTORS = [
  {
    // Pitchero squad pages list players in cards with a name link and a role.
    name: 'pitchero',
    test: (html) => /pitchero/i.test(html),
    run: (html) => {
      const out = []
      const re = /class="[^"]*squad-member[^"]*"[\s\S]{0,400}?>([A-Z][A-Za-z'’-]+ [A-Z][A-Za-z'’\- ]+)<[\s\S]{0,300}?(?:>([A-Za-z ]{3,24})<)?/g
      for (const match of html.matchAll(re)) {
        out.push({ name: clean(match[1]), position: clean(match[2] ?? '') })
      }
      return out
    },
  },
  {
    // Generic table: a row with a shirt number, a name and a position.
    name: 'table',
    test: () => true,
    run: (html) => {
      const out = []
      for (const row of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
        const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)]
          .map((cell) => clean(cell[1]))
          .filter((text) => text !== '')
        if (cells.length < 2) continue
        const number = cells.find((c) => /^\d{1,2}$/.test(c))
        const name = cells.find((c) => /^[A-Z][A-Za-z'’-]+ [A-Z][A-Za-z'’\- ]+$/.test(c))
        const position = cells.find((c) => /^(GK|SW|FB|HB|CM|AM|WG|ST|goalkeeper|defender|midfielder|forward|striker)$/i.test(c))
        if (name) out.push({ name, position: position ?? '', number })
      }
      return out
    },
  },
]

function clean(html) {
  return String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchSquad(url, { dump }) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'sideline-squad-importer/1.0 (personal use)' },
  })
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`)
  const html = await response.text()

  const extractor = EXTRACTORS.find((candidate) => candidate.test(html))
  const raw = extractor.run(html)

  if (dump) {
    console.log(`\nExtractor: ${extractor.name}`)
    console.log(`Found ${raw.length} candidate rows:\n`)
    for (const record of raw) console.log(`  ${JSON.stringify(record)}`)
    console.log('\nIf this looks wrong, adjust EXTRACTORS in scripts/import-squads.mjs.\n')
  }

  const players = raw
    .map((record) => normalisePlayer({
      name: record.name,
      position: record.position || 'CM',
      number: record.number,
    }))
    .filter(Boolean)

  // A squad list should not contain the same person twice.
  const seen = new Set()
  return players.filter((player) => {
    const key = `${player.firstName} ${player.lastName}`.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/* ----------------------------------------------------------------- write */

function writeSquad(clubId, players, source) {
  if (!existsSync(SQUAD_DIR)) mkdirSync(SQUAD_DIR, { recursive: true })

  const squad = {
    club: clubId,
    source: source ?? 'manual',
    retrieved: new Date().toISOString().slice(0, 10),
    players,
  }

  const filename = `${clubId.replace(':', '_')}.json`
  const path = join(SQUAD_DIR, filename)
  writeFileSync(path, `${JSON.stringify(squad, null, 2)}\n`)
  return path
}

/* ------------------------------------------------------------------ main */

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const clubs = loadClubIds()

  if (args['list-clubs']) {
    const filtered = args.division
      ? clubs.filter((c) => c.divisionId === args.division)
      : clubs
    if (filtered.length === 0) {
      console.error(`No clubs found${args.division ? ` in division ${args.division}` : ''}.`)
      process.exit(1)
    }
    for (const club of filtered) console.log(`${club.id.padEnd(34)} ${club.name}`)
    console.log(`\n${filtered.length} clubs.`)
    return
  }

  const clubId = args.club
  if (!clubId) {
    console.error(USAGE)
    process.exit(1)
  }
  if (!clubs.some((c) => c.id === clubId)) {
    console.error(`Unknown club id "${clubId}".`)
    console.error('Run with --list-clubs to see valid ids.')
    process.exit(1)
  }

  let players
  let source

  if (args['from-csv']) {
    players = fromCsv(args['from-csv'])
    source = `csv:${args['from-csv']}`
  } else if (args.fetch) {
    players = await fetchSquad(args.fetch, { dump: Boolean(args.dump) })
    source = args.fetch
  } else {
    console.error(USAGE)
    process.exit(1)
  }

  if (players.length === 0) {
    console.error('No players extracted — nothing written.')
    if (!args.dump) console.error('Re-run with --dump to see what the scraper found.')
    process.exit(1)
  }

  const path = writeSquad(clubId, players, source)
  console.log(`Wrote ${players.length} players to ${path}`)
  console.log('Rebuild the app (npm run dev) and the game will use them.')
}

const USAGE = `
Usage:
  node scripts/import-squads.mjs --list-clubs [--division m-np]
  node scripts/import-squads.mjs --club <clubId> --from-csv <file.csv>
  node scripts/import-squads.mjs --club <clubId> --fetch <url> [--dump]

CSV columns (only name and position are required):
  name | firstName,lastName, position, number, age, nationality, caps, rating, dragFlicker

See data/README.md for the full schema.
`

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
