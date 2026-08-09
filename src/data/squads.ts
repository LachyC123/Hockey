/**
 * Real squad loading.
 *
 * Any JSON file dropped into src/data/squads/ is picked up at build time and
 * used in place of a generated squad for that club. The format is deliberately
 * forgiving: a name and a position is enough, and anything you leave out is
 * filled in from the club's reputation.
 *
 * No public source publishes per-player ability ratings for England Hockey
 * League players, so attributes are modelled from whatever signal the file
 * does carry — an optional `rating`, senior caps, and the club's standing.
 * Names, positions, squad numbers, ages and nationalities are used exactly as
 * given.
 *
 * See data/README.md for the schema and scripts/import-squads.mjs for a tool
 * that builds these files from the England Hockey site.
 */

import { Rng, clamp } from '../engine/rng'
import { generatePlayer } from '../engine/players'
import { emptyStats, type Player, type Position, type Gender, type Attributes } from '../engine/types'

export interface ImportedPlayer {
  firstName: string
  lastName: string
  /** One of the engine's positions. 'MID'/'DEF'/'FWD' are also accepted and mapped. */
  position: string
  number?: number
  age?: number
  nationality?: string
  caps?: number
  /** Optional 1-100 ability hint. Falls back to the club's reputation. */
  rating?: number
  /** Optional explicit attribute overrides, 1-20 each. */
  attributes?: Partial<Attributes>
  /** Marks a known drag-flick specialist when attributes are not supplied. */
  dragFlicker?: boolean
}

export interface ImportedSquad {
  /** Club id as used in src/data/clubs.ts, e.g. "m-prem:surbiton". */
  club: string
  /** Where the data came from, shown in the app so provenance is visible. */
  source?: string
  /** ISO date the data was retrieved. */
  retrieved?: string
  players: ImportedPlayer[]
}

/** Loose position strings that importers commonly produce, mapped to engine positions. */
const POSITION_ALIASES: Record<string, Position> = {
  gk: 'GK', goalkeeper: 'GK', keeper: 'GK',
  sw: 'SW', sweeper: 'SW',
  fb: 'FB', 'full back': 'FB', fullback: 'FB', def: 'FB', defender: 'FB', defence: 'FB',
  hb: 'HB', 'half back': 'HB', halfback: 'HB',
  cm: 'CM', mid: 'CM', midfield: 'CM', midfielder: 'CM',
  am: 'AM', 'attacking midfield': 'AM', inside: 'AM',
  wg: 'WG', wing: 'WG', winger: 'WG',
  st: 'ST', fwd: 'ST', forward: 'ST', striker: 'ST', attack: 'ST', attacker: 'ST',
}

export function normalisePosition(raw: string): Position {
  const key = raw.trim().toLowerCase()
  return POSITION_ALIASES[key] ?? 'CM'
}

// Vite inlines every squad file at build time; the app ships with whatever is present.
const SQUAD_MODULES = import.meta.glob<{ default: ImportedSquad }>('./squads/*.json', { eager: true })

export function loadImportedSquads(): Map<string, ImportedSquad> {
  const byClub = new Map<string, ImportedSquad>()
  for (const path in SQUAD_MODULES) {
    const squad = SQUAD_MODULES[path]?.default
    if (!squad?.club || !Array.isArray(squad.players) || squad.players.length === 0) continue
    byClub.set(squad.club, squad)
  }
  return byClub
}

/**
 * Turn an imported squad into engine players.
 *
 * Real identity fields are preserved verbatim. Ability is generated around the
 * supplied rating so that a real squad list still produces a squad with a
 * believable spread between its first eleven and its fringe.
 */
export function buildSquadFromImport(
  rng: Rng,
  squad: ImportedSquad,
  opts: { clubId: string; reputation: number; gender: Gender; university: boolean },
): Player[] {
  const { clubId, reputation, gender, university } = opts
  const squadCentre = 22 + reputation * 0.63

  const players = squad.players.map((entry, index) => {
    const position = normalisePosition(entry.position)
    // Players listed earlier in a squad list tend to be the regulars.
    const depthPenalty = index < 11 ? 0 : (index - 10) * 1.2
    const quality = clamp(
      entry.rating ?? rng.normal(squadCentre - depthPenalty, 5.5),
      12,
      97,
    )

    const player = generatePlayer(rng, {
      clubId,
      position,
      quality,
      gender,
      university,
      reputation,
      number: entry.number ?? index + 1,
      age: entry.age,
    })

    // Overwrite the generated identity with the real one.
    player.firstName = entry.firstName
    player.lastName = entry.lastName
    player.nationality = entry.nationality ?? player.nationality
    player.caps = entry.caps ?? player.caps
    player.provenance = 'imported'
    player.id = `${clubId}#${slug(entry.firstName)}-${slug(entry.lastName)}-${entry.number ?? index + 1}`

    // Senior internationals are better than their club's average by definition.
    if (player.caps > 0 && entry.rating === undefined) {
      const bump = clamp(player.caps / 12, 0, 8)
      for (const key of Object.keys(player.attributes) as (keyof Attributes)[]) {
        if (key === 'discipline') continue
        player.attributes[key] = clamp(Math.round(player.attributes[key] + bump / 4), 1, 20)
      }
    }

    if (entry.dragFlicker && player.attributes.dragFlick < 8) {
      player.attributes.dragFlick = clamp(Math.round(quality / 5.2), 8, 20)
    }

    if (entry.attributes) {
      for (const [key, value] of Object.entries(entry.attributes)) {
        if (typeof value === 'number') {
          player.attributes[key as keyof Attributes] = clamp(Math.round(value), 1, 20)
        }
      }
    }

    player.seasonStats = emptyStats()
    return player
  })

  return ensureLegalSquad(rng, players, opts)
}

/**
 * A squad needs at least two keepers and enough outfielders to name a bench.
 * Real squad lists are often incomplete, so pad rather than fail.
 */
function ensureLegalSquad(
  rng: Rng,
  players: Player[],
  opts: { clubId: string; reputation: number; gender: Gender; university: boolean },
): Player[] {
  const { clubId, reputation, gender, university } = opts
  const squadCentre = 22 + reputation * 0.63
  const out = players.slice()

  const keepers = out.filter((p) => p.position === 'GK').length
  for (let i = keepers; i < 2; i++) {
    out.push(generatePlayer(rng, {
      clubId, position: 'GK', quality: clamp(rng.normal(squadCentre - 8, 5), 12, 90),
      gender, university, reputation, number: 40 + i,
    }))
  }

  const fillPositions: Position[] = ['FB', 'HB', 'CM', 'AM', 'WG', 'ST']
  let n = 50
  while (out.length < 16) {
    out.push(generatePlayer(rng, {
      clubId,
      position: fillPositions[(out.length + n) % fillPositions.length],
      quality: clamp(rng.normal(squadCentre - 10, 5), 12, 90),
      gender, university, reputation, number: n++,
    }))
  }

  // Squad numbers must be unique for the UI to be readable.
  const used = new Set<number>()
  for (const player of out) {
    let number = player.number
    while (used.has(number)) number += 1
    player.number = number
    used.add(number)
  }

  return out
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '')
}
