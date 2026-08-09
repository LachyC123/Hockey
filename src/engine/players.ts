/**
 * Player generation, rating and development.
 *
 * Ratings are position-weighted: a sweeper's rating is driven by positioning
 * and tackling, a striker's by finishing and circle entry, a drag-flick
 * specialist's by dragFlick. That means the "best player" in a squad depends on
 * where you play them, which is the point.
 */

import { Rng, clamp } from './rng'
import {
  type Attributes, type AttributeKey, type Player, type Position, type Gender,
  type DataProvenance, emptyStats, OUTFIELD_POSITIONS,
} from './types'
import {
  MALE_FIRST_NAMES, FEMALE_FIRST_NAMES, SURNAMES, NATIONALITY_WEIGHTS,
  FOREIGN_SURNAMES, FOREIGN_FIRST_NAMES,
} from '../data/names'

/**
 * How much each attribute contributes to a player's effective rating in a given
 * position. Weights within a position sum to roughly 1.
 */
const POSITION_WEIGHTS: Record<Position, Partial<Record<AttributeKey, number>>> = {
  GK: {
    shotStopping: 0.30, reflexArc: 0.20, rushing: 0.14, clearing: 0.12,
    positioning: 0.10, composure: 0.08, decisions: 0.06,
  },
  SW: {
    positioning: 0.20, tackling: 0.17, decisions: 0.13, passing: 0.11, strength: 0.09,
    composure: 0.08, aerial: 0.07, stickWork: 0.05, pace: 0.05, discipline: 0.05,
  },
  FB: {
    tackling: 0.20, positioning: 0.16, pace: 0.12, strength: 0.11, passing: 0.10,
    aerial: 0.08, decisions: 0.08, discipline: 0.07, stickWork: 0.05, workRate: 0.03,
  },
  HB: {
    tackling: 0.16, positioning: 0.14, passing: 0.14, workRate: 0.12, stickWork: 0.11,
    decisions: 0.10, stamina: 0.08, pace: 0.07, aerial: 0.05, discipline: 0.03,
  },
  CM: {
    passing: 0.19, stickWork: 0.16, decisions: 0.15, workRate: 0.12, positioning: 0.10,
    stamina: 0.09, tackling: 0.08, agility: 0.06, circleEntry: 0.05,
  },
  AM: {
    stickWork: 0.19, passing: 0.16, decisions: 0.14, circleEntry: 0.13, agility: 0.11,
    finishing: 0.10, pace: 0.08, composure: 0.05, workRate: 0.04,
  },
  WG: {
    pace: 0.20, circleEntry: 0.18, stickWork: 0.16, agility: 0.13, finishing: 0.11,
    passing: 0.08, workRate: 0.07, stamina: 0.04, decisions: 0.03,
  },
  ST: {
    finishing: 0.26, circleEntry: 0.18, stickWork: 0.13, composure: 0.11, agility: 0.10,
    pace: 0.09, strength: 0.07, positioning: 0.04, decisions: 0.02,
  },
}

/**
 * Baseline attribute profile per position, before quality scaling. Values are a
 * 0-1 share of the player's overall quality budget — higher means this position
 * type is expected to be strong there.
 */
const POSITION_PROFILE: Record<Position, Partial<Record<AttributeKey, number>>> = {
  GK: { shotStopping: 1.0, reflexArc: 0.95, rushing: 0.9, clearing: 0.9, positioning: 0.85, composure: 0.8 },
  SW: { positioning: 1.0, tackling: 0.95, passing: 0.85, aerial: 0.9, composure: 0.85, strength: 0.85, leadership: 0.9 },
  FB: { tackling: 1.0, positioning: 0.9, strength: 0.9, pace: 0.85, aerial: 0.85 },
  HB: { tackling: 0.9, workRate: 0.95, passing: 0.9, stamina: 0.95, positioning: 0.85 },
  CM: { passing: 1.0, stickWork: 0.95, decisions: 0.95, workRate: 0.95, stamina: 1.0 },
  AM: { stickWork: 1.0, circleEntry: 0.9, passing: 0.9, agility: 0.9, finishing: 0.8 },
  WG: { pace: 1.0, agility: 0.95, circleEntry: 0.95, stickWork: 0.9, finishing: 0.8 },
  ST: { finishing: 1.0, circleEntry: 0.95, composure: 0.9, agility: 0.85, strength: 0.8 },
}

/** Positions that plausibly cover for each other, used to assign a secondary. */
const POSITION_NEIGHBOURS: Record<Position, Position[]> = {
  GK: [],
  SW: ['FB', 'HB'],
  FB: ['SW', 'HB'],
  HB: ['FB', 'CM'],
  CM: ['HB', 'AM'],
  AM: ['CM', 'WG'],
  WG: ['AM', 'ST'],
  ST: ['WG', 'AM'],
}

/**
 * Squad shape used when generating a full club roster of 20.
 *
 * Ordered as a plausible first eleven followed by the fringe, because
 * generateSquad applies a depth penalty by index. Grouping by position instead
 * would quietly make every club's forwards worse than its defenders.
 */
const SQUAD_SHAPE: Position[] = [
  // First eleven, in a 4-3-3.
  'GK', 'SW', 'FB', 'FB', 'HB', 'CM', 'CM', 'AM', 'WG', 'WG', 'ST',
  // Bench and fringe.
  'GK', 'FB', 'HB', 'CM', 'AM', 'WG', 'ST', 'SW', 'ST',
]

/**
 * Effective rating of a player in a position, 1-100.
 * Out-of-position play costs a flat penalty on top of the weight mismatch.
 */
export function ratingAt(player: Player, position: Position): number {
  const weights = POSITION_WEIGHTS[position]
  let total = 0
  for (const key of Object.keys(weights) as AttributeKey[]) {
    total += player.attributes[key] * (weights[key] ?? 0)
  }
  // Attributes are 1-20, so scale to 1-100.
  let rating = total * 5

  if (player.position !== position) {
    const familiar = player.secondary.includes(position)
    const bothOutfield = position !== 'GK' && player.position !== 'GK'
    if (!bothOutfield) rating *= 0.45 // keeper in the field, or vice versa
    else if (familiar) rating *= 0.94
    else rating *= 0.82
  }
  return clamp(rating, 1, 100)
}

/** Rating in the player's own best position. */
export function overall(player: Player): number {
  return ratingAt(player, player.position)
}

/**
 * What the player is actually capable of today, once condition, sharpness,
 * morale and injury are taken into account. This is what the match engine uses.
 */
export function effectiveRating(player: Player, position: Position): number {
  const base = ratingAt(player, position)
  const conditionFactor = 0.62 + 0.38 * (player.condition / 100)
  const sharpnessFactor = 0.88 + 0.12 * (player.sharpness / 100)
  const moraleFactor = 0.94 + 0.06 * (player.morale / 100)
  return base * conditionFactor * sharpnessFactor * moraleFactor
}

/** Star rating out of 5, in half steps, for quick squad scanning. */
export function stars(rating: number): number {
  return Math.round((rating / 100) * 10) / 2
}

function pickNationality(rng: Rng, university: boolean): string {
  // University sides are overwhelmingly domestic.
  const pool = university
    ? NATIONALITY_WEIGHTS.map((n) => ({ ...n, weight: n.code === 'ENG' ? n.weight * 3 : n.weight * 0.3 }))
    : NATIONALITY_WEIGHTS
  const picked = rng.weighted(pool, (n) => n.weight)
  return picked?.code ?? 'ENG'
}

function pickName(rng: Rng, gender: Gender, nationality: string): { firstName: string; lastName: string } {
  const british = nationality === 'ENG'
  if (!british && FOREIGN_FIRST_NAMES[nationality] && FOREIGN_SURNAMES[nationality]) {
    return {
      firstName: rng.pick(FOREIGN_FIRST_NAMES[nationality][gender]),
      lastName: rng.pick(FOREIGN_SURNAMES[nationality]),
    }
  }
  return {
    firstName: rng.pick(gender === 'men' ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES),
    lastName: rng.pick(SURNAMES),
  }
}

/**
 * Generate one player.
 *
 * @param quality 1-100 target overall in the player's own position, before noise.
 */
export function generatePlayer(
  rng: Rng,
  opts: {
    clubId: string
    position: Position
    quality: number
    gender: Gender
    university: boolean
    number: number
    age?: number
  },
): Player {
  const { clubId, position, quality, gender, university, number } = opts

  // University squads skew young; club squads span the full adult range.
  const age = opts.age ?? (university ? rng.int(18, 23) : Math.round(clamp(rng.normal(25, 4.2), 17, 38)))

  const nationality = pickNationality(rng, university)
  const { firstName, lastName } = pickName(rng, gender, nationality)

  const profile = POSITION_PROFILE[position]
  const isKeeper = position === 'GK'

  // Convert the 1-100 quality target into a 1-20 attribute centre.
  const centre = clamp(quality / 5, 2, 19)

  const attr = (key: AttributeKey, defaultShare: number): number => {
    const share = profile[key] ?? defaultShare
    // Strong attributes cluster near the centre, weak ones sit below it.
    const mean = centre * (0.62 + 0.38 * share)
    return Math.round(clamp(rng.normal(mean, 2.0), 1, 20))
  }

  const attributes: Attributes = {
    stickWork: attr('stickWork', 0.7),
    passing: attr('passing', 0.7),
    tackling: attr('tackling', 0.6),
    finishing: attr('finishing', 0.5),
    aerial: attr('aerial', 0.55),
    // Drag flicking is a genuine specialism — most players simply cannot do it.
    dragFlick: 0,
    cornerCraft: attr('cornerCraft', 0.5),
    circleEntry: attr('circleEntry', 0.55),
    pace: attr('pace', 0.7),
    stamina: attr('stamina', 0.75),
    strength: attr('strength', 0.65),
    agility: attr('agility', 0.7),
    positioning: attr('positioning', 0.7),
    decisions: attr('decisions', 0.7),
    composure: attr('composure', 0.68),
    workRate: attr('workRate', 0.75),
    discipline: Math.round(clamp(rng.normal(12, 3.2), 1, 20)),
    leadership: Math.round(clamp(rng.normal(centre * 0.6, 3.0), 1, 20)),
    shotStopping: isKeeper ? attr('shotStopping', 1) : rng.int(1, 4),
    clearing: isKeeper ? attr('clearing', 1) : rng.int(1, 5),
    rushing: isKeeper ? attr('rushing', 1) : rng.int(1, 4),
    reflexArc: isKeeper ? attr('reflexArc', 1) : rng.int(1, 4),
  }

  // Roughly one in five outfielders can flick, concentrated among defenders and
  // midfielders — which mirrors how clubs actually find their corner battery.
  const flickChance = isKeeper ? 0 : position === 'SW' || position === 'FB' || position === 'CM' ? 0.34 : 0.12
  if (rng.chance(flickChance)) {
    attributes.dragFlick = Math.round(clamp(rng.normal(centre * 0.95, 2.6), 4, 20))
    attributes.cornerCraft = Math.round(clamp(attributes.cornerCraft + rng.int(1, 3), 1, 20))
  }

  // Young players have room to grow; the older you are the closer to your ceiling.
  const currentAbility = quality
  const growthRoom = age < 24 ? rng.float(6, 26) : age < 28 ? rng.float(0, 8) : 0
  const potential = clamp(Math.round(currentAbility + growthRoom), 1, 100)

  const wageBase = university ? 0 : Math.round(Math.pow(quality / 10, 2.6) * 4)

  return {
    id: `${clubId}#${number}-${Rng.hash(`${firstName}${lastName}${number}${clubId}`).toString(36)}`,
    firstName,
    lastName,
    clubId,
    position,
    secondary: rng.chance(0.55) ? [rng.pick(POSITION_NEIGHBOURS[position] ?? [])].filter(Boolean) as Position[] : [],
    age,
    nationality,
    caps: quality > 82 && rng.chance(0.5) ? rng.int(1, 120) : 0,
    attributes,
    potential,
    condition: rng.int(88, 100),
    sharpness: rng.int(55, 85),
    morale: rng.int(55, 85),
    injury: null,
    banMatches: 0,
    number,
    provenance: 'generated' as DataProvenance,
    contract: {
      yearsRemaining: university ? 1 : rng.int(1, 3),
      wage: wageBase,
    },
    seasonStats: emptyStats(),
  }
}

/**
 * Generate a full squad for a club. Squad quality is centred on club reputation
 * with a spread, so a Premier Division side has a clear first eleven and a
 * weaker fringe rather than 20 identical players.
 */
export function generateSquad(
  rng: Rng,
  opts: { clubId: string; reputation: number; gender: Gender; university: boolean },
): Player[] {
  const { clubId, reputation, gender, university } = opts
  const players: Player[] = []

  // Reputation 50 -> squad centred around 52; reputation 95 -> around 82.
  const squadCentre = 22 + reputation * 0.63

  SQUAD_SHAPE.forEach((position, i) => {
    // The first eleven slots in the shape get the better players.
    const depthPenalty = i < 11 ? 0 : (i - 10) * 1.35
    const quality = clamp(rng.normal(squadCentre - depthPenalty, 5.5), 12, 97)
    players.push(
      generatePlayer(rng, {
        clubId, position, quality, gender, university, number: i + 1,
      }),
    )
  })

  return players
}

/** Best available drag flicker in a squad, or null if the club has none. */
export function bestFlicker(players: Player[]): Player | null {
  const candidates = players.filter((p) => p.attributes.dragFlick >= 4 && p.position !== 'GK')
  if (candidates.length === 0) return null
  return candidates.reduce((a, b) => (b.attributes.dragFlick > a.attributes.dragFlick ? b : a))
}

/** Best available penalty stroke taker: composure first, then finishing. */
export function bestStrokeTaker(players: Player[]): Player | null {
  const candidates = players.filter((p) => p.position !== 'GK')
  if (candidates.length === 0) return null
  const score = (p: Player) => p.attributes.composure * 1.4 + p.attributes.finishing
  return candidates.reduce((a, b) => (score(b) > score(a) ? b : a))
}

/** Most suitable captain: leadership, weighted by ability and experience. */
export function bestCaptain(players: Player[]): Player | null {
  if (players.length === 0) return null
  const score = (p: Player) => p.attributes.leadership * 2 + overall(p) / 10 + Math.min(p.age, 32) / 4
  return players.reduce((a, b) => (score(b) > score(a) ? b : a))
}

/**
 * Which attribute groups a training focus improves, and by how much relative to
 * a normal week.
 */
const TRAINING_TARGETS: Record<string, AttributeKey[]> = {
  fitness: ['stamina', 'pace', 'strength', 'agility'],
  technical: ['stickWork', 'passing', 'aerial', 'finishing'],
  'set-pieces': ['dragFlick', 'cornerCraft', 'composure'],
  'defensive-shape': ['tackling', 'positioning', 'discipline'],
  'attacking-play': ['circleEntry', 'finishing', 'decisions'],
  recovery: [],
}

/**
 * Apply one week of training. Development is age-curved: under-23s improve
 * readily, late twenties plateau, and past about 31 physical attributes decline
 * whatever you do.
 */
export function trainWeek(
  rng: Rng,
  player: Player,
  focus: keyof typeof TRAINING_TARGETS,
  intensity: 'light' | 'normal' | 'hard',
): void {
  const intensityMult = intensity === 'light' ? 0.5 : intensity === 'hard' ? 1.6 : 1

  // Condition: hard weeks cost more than they recover.
  const recovery = intensity === 'light' ? 14 : intensity === 'hard' ? 4 : 9
  player.condition = clamp(player.condition + recovery, 0, 100)
  player.sharpness = clamp(player.sharpness + (focus === 'recovery' ? 0 : 2 * intensityMult) - 1, 0, 100)

  const current = overall(player)
  const headroom = player.potential - current

  // Age curve for the chance of a bump.
  let ageFactor: number
  if (player.age <= 21) ageFactor = 1.25
  else if (player.age <= 24) ageFactor = 1.0
  else if (player.age <= 28) ageFactor = 0.55
  else if (player.age <= 31) ageFactor = 0.2
  else ageFactor = 0.05

  const targets = TRAINING_TARGETS[focus] ?? []
  if (targets.length > 0 && headroom > 0) {
    const p = clamp(0.05 * intensityMult * ageFactor * (headroom / 20), 0, 0.45)
    if (rng.chance(p)) {
      const key = rng.pick(targets)
      // Never train a drag flick into someone who has never flicked a ball.
      if (!(key === 'dragFlick' && player.attributes.dragFlick === 0)) {
        player.attributes[key] = clamp(player.attributes[key] + 1, 1, 20)
      }
    }
  }

  // Physical decline for older players, regardless of focus.
  if (player.age >= 31 && rng.chance(0.035 * (player.age - 30))) {
    const key = rng.pick(['pace', 'stamina', 'agility'] as AttributeKey[])
    player.attributes[key] = clamp(player.attributes[key] - 1, 1, 20)
  }

  // Hard training carries an injury risk. Light weeks are close to safe.
  const injuryRisk = intensity === 'hard' ? 0.028 : intensity === 'normal' ? 0.012 : 0.004
  if (!player.injury && rng.chance(injuryRisk * (player.condition < 60 ? 2 : 1))) {
    player.injury = rollInjury(rng, true)
  }
}

const TRAINING_INJURIES = [
  ['Tight hamstring', 1, 2],
  ['Rolled ankle', 1, 3],
  ['Back spasm', 1, 2],
  ['Knee soreness', 2, 4],
  ['Groin strain', 2, 5],
] as const

const MATCH_INJURIES = [
  ['Stick to the hand', 1, 2],
  ['Ball to the foot', 1, 2],
  ['Corked thigh', 1, 3],
  ['Ankle ligament damage', 3, 8],
  ['Hamstring tear', 4, 10],
  ['Facial injury', 1, 4],
  ['Concussion protocol', 3, 6],
  ['Knee ligament damage', 10, 24],
  ['Broken hand', 6, 14],
] as const

export function rollInjury(rng: Rng, fromTraining: boolean) {
  const table = fromTraining ? TRAINING_INJURIES : MATCH_INJURIES
  const [name, min, max] = rng.pick(table as readonly (readonly [string, number, number])[])
  return { name, matches: rng.int(min, max) }
}

/** Age a player by one year and apply the natural attribute drift that comes with it. */
export function ageUp(rng: Rng, player: Player): void {
  player.age += 1
  if (player.age >= 30) {
    const declines = player.age >= 34 ? 3 : player.age >= 32 ? 2 : 1
    for (let i = 0; i < declines; i++) {
      const key = rng.pick(['pace', 'stamina', 'agility', 'strength'] as AttributeKey[])
      player.attributes[key] = clamp(player.attributes[key] - rng.int(0, 1), 1, 20)
    }
  }
  // Experience: reading of the game keeps improving well into the thirties.
  if (player.age >= 24 && rng.chance(0.4)) {
    const key = rng.pick(['positioning', 'decisions', 'composure', 'leadership'] as AttributeKey[])
    player.attributes[key] = clamp(player.attributes[key] + 1, 1, 20)
  }
}

export function fullName(p: Player): string {
  return `${p.firstName} ${p.lastName}`
}

export function shortName(p: Player): string {
  return `${p.firstName.charAt(0)}. ${p.lastName}`
}

export { OUTFIELD_POSITIONS, POSITION_WEIGHTS }
