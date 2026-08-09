/**
 * The match engine.
 *
 * Field hockey is not football with sticks, and the engine is built around the
 * differences that actually decide games:
 *
 *  - Four 15-minute quarters, with a real break in momentum and fatigue at each.
 *  - Penalty corners are the single biggest source of goals. A club with an
 *    elite drag flicker scores from set pieces that an equal club cannot.
 *  - Unlimited rolling substitutions, so stamina is managed rather than endured,
 *    and a deep bench is worth real points over a season.
 *  - Green (2 min), yellow (5-10 min) and red cards leave you short-handed,
 *    which in a 60-minute game is punishing.
 *  - Shootouts are 8-second one-on-one runs from the 23-metre line, not
 *    stationary penalties.
 */

import { Rng, clamp } from './rng'
import { effectiveRating, rollInjury } from './players'
import {
  type Club, type Player, type Position, type Tactics, type Lineup,
  type MatchEvent, type MatchResult, type TeamMatchStats, type PlayerMatchLine,
  FORMATIONS,
} from './types'

export interface TeamSetup {
  club: Club
  players: Player[]
  lineup: Lineup
  tactics: Tactics
}

/** Per-player mutable state for the duration of one match. */
interface OnField {
  player: Player
  position: Position
  /** Falls as the player works; rolling subs let it recover on the bench. */
  matchCondition: number
  onPitch: boolean
  minutes: number
  goals: number
  assists: number
  saves: number
  /** Minute the player is available again after a card. */
  suspendedUntil: number
  cardPoints: number
  sentOff: boolean
  ratingDelta: number
}

interface TeamState {
  setup: TeamSetup
  squad: OnField[]
  stats: TeamMatchStats
  goals: number
  /** Cached each minute: the drag flicker actually on the pitch. */
  flicker: OnField | null
}

const PRESS_FACTOR = { high: 1.14, mid: 1.0, low: 0.88 }
const PRESS_FATIGUE = { high: 1.35, mid: 1.0, low: 0.78 }
const PRESS_COUNTER_RISK = { high: 1.3, mid: 1.0, low: 0.75 }
const TEMPO_ENTRY = { slow: 0.9, balanced: 1.0, fast: 1.14 }
const TEMPO_TURNOVER = { slow: 0.85, balanced: 1.0, fast: 1.25 }
const AGGRESSION_TACKLE = { contain: 0.9, balanced: 1.0, aggressive: 1.15 }
const AGGRESSION_CARDS = { contain: 0.6, balanced: 1.0, aggressive: 1.75 }
const ROTATION_THRESHOLD = { minimal: 45, balanced: 62, heavy: 74 }

function unitStrength(team: TeamState, positions: Position[]): number {
  const active = team.squad.filter((s) => s.onPitch && positions.includes(s.position))
  if (active.length === 0) return 20
  let total = 0
  for (const s of active) {
    total += effectiveRating(s.player, s.position) * (0.55 + 0.45 * (s.matchCondition / 100))
  }
  return total / active.length
}

/**
 * How many players a team currently commits to a unit.
 *
 * Average quality alone cannot tell an attacking shape from a defensive one —
 * a fourth forward is usually a weaker player, so the average drops even though
 * the team is committing more bodies forward. Formation only means something if
 * the count is fed in separately.
 */
function unitCount(team: TeamState, positions: Position[]): number {
  return team.squad.filter((s) => s.onPitch && positions.includes(s.position)).length
}

const ATTACK_POSITIONS: Position[] = ['WG', 'ST', 'AM']
const DEFENCE_POSITIONS: Position[] = ['SW', 'FB', 'HB']

/** Scale a unit's influence by how many players are committed to it, around a baseline of four. */
function commitmentFactor(count: number): number {
  return 0.55 + 0.45 * (count / 4)
}

function keeper(team: TeamState): OnField | null {
  return team.squad.find((s) => s.onPitch && s.position === 'GK') ?? null
}

function outfieldOnPitch(team: TeamState): OnField[] {
  return team.squad.filter((s) => s.onPitch && s.position !== 'GK')
}

/** Pick a player to be credited with an event, weighted by a relevant attribute. */
function pickBy(
  rng: Rng,
  team: TeamState,
  weight: (s: OnField) => number,
): OnField | null {
  const candidates = outfieldOnPitch(team)
  if (candidates.length === 0) return null
  return rng.weighted(candidates, (s) => Math.max(0.01, weight(s)))
}

function buildTeamState(setup: TeamSetup): TeamState {
  const byId = new Map(setup.players.map((p) => [p.id, p]))
  const shape = FORMATIONS[setup.tactics.formation]
  const outfieldSlots = positionSlots(shape.def, shape.mid, shape.fwd)

  const squad: OnField[] = []

  const starting = setup.lineup.starting
  starting.forEach((id, index) => {
    const player = byId.get(id)
    if (!player) return
    // Slot 0 is the keeper; the rest map onto the formation's shape.
    const position: Position = index === 0 ? 'GK' : outfieldSlots[index - 1] ?? 'CM'
    squad.push(newOnField(player, position, true))
  })

  for (const id of setup.lineup.bench) {
    const player = byId.get(id)
    if (!player) continue
    squad.push(newOnField(player, player.position, false))
  }

  const state: TeamState = {
    setup,
    squad,
    stats: {
      circleEntries: 0, shots: 0, shotsOnTarget: 0, penaltyCorners: 0, cornerGoals: 0,
      strokes: 0, possession: 0, greens: 0, yellows: 0, reds: 0, saves: 0,
    },
    goals: 0,
    flicker: null,
  }
  refreshFlicker(state)
  return state
}

function newOnField(player: Player, position: Position, onPitch: boolean): OnField {
  return {
    player,
    position,
    matchCondition: player.condition,
    onPitch,
    minutes: 0,
    goals: 0,
    assists: 0,
    saves: 0,
    suspendedUntil: 0,
    cardPoints: 0,
    sentOff: false,
    ratingDelta: 0,
  }
}

/** Turn a formation split into concrete positions for the ten outfielders. */
export function positionSlots(def: number, mid: number, fwd: number): Position[] {
  const slots: Position[] = []
  // The deepest defender is the sweeper; a back five adds a second.
  for (let i = 0; i < def; i++) slots.push(i === 0 ? 'SW' : i === 1 && def >= 5 ? 'SW' : i < 3 ? 'FB' : 'HB')
  for (let i = 0; i < mid; i++) slots.push(i < Math.ceil(mid / 2) ? 'CM' : 'AM')
  for (let i = 0; i < fwd; i++) slots.push(i === 0 ? 'ST' : i === 1 && fwd >= 3 ? 'ST' : 'WG')
  return slots
}

function refreshFlicker(team: TeamState): void {
  const designated = team.setup.lineup.flickerId
  const onPitch = team.squad.filter((s) => s.onPitch && s.player.attributes.dragFlick >= 4)
  const preferred = onPitch.find((s) => s.player.id === designated)
  team.flicker = preferred
    ?? (onPitch.length
      ? onPitch.reduce((a, b) => (b.player.attributes.dragFlick > a.player.attributes.dragFlick ? b : a))
      : null)
}

/**
 * Rolling substitutions. Hockey allows unlimited subs, so this runs every
 * minute rather than only at set points, and the manager's rotation policy sets
 * how tired a player is allowed to get before coming off.
 */
function applyRollingSubs(rng: Rng, team: TeamState, minute: number): void {
  const threshold = ROTATION_THRESHOLD[team.setup.tactics.rotation]
  const tired = team.squad
    .filter((s) => s.onPitch && s.position !== 'GK' && !s.sentOff && s.suspendedUntil <= minute)
    .filter((s) => s.matchCondition < threshold)
    .sort((a, b) => a.matchCondition - b.matchCondition)

  for (const out of tired) {
    // A replacement must be fresher and available.
    const options = team.squad.filter(
      (s) => !s.onPitch && !s.sentOff && s.suspendedUntil <= minute
        && s.matchCondition > out.matchCondition + 12
        && s.position !== 'GK',
    )
    if (options.length === 0) continue

    // Prefer someone who can play the slot being vacated.
    const replacement = rng.weighted(options, (s) => {
      const fit = s.player.position === out.position ? 3
        : s.player.secondary.includes(out.position) ? 2 : 1
      return fit * (s.matchCondition / 100) * (effectiveRating(s.player, out.position) / 50)
    })
    if (!replacement) continue

    out.onPitch = false
    replacement.onPitch = true
    replacement.position = out.position
  }
  refreshFlicker(team)
}

/** Drain condition for everyone on the pitch, and recover for those resting. */
function tickFatigue(team: TeamState, minute: number): void {
  const pressLoad = PRESS_FATIGUE[team.setup.tactics.press]
  const tempoLoad = team.setup.tactics.tempo === 'fast' ? 1.15 : team.setup.tactics.tempo === 'slow' ? 0.9 : 1

  for (const s of team.squad) {
    if (s.onPitch && !s.sentOff && s.suspendedUntil <= minute) {
      s.minutes += 1
      if (s.position === 'GK') {
        s.matchCondition = clamp(s.matchCondition - 0.15, 0, 100)
        continue
      }
      // Higher stamina means a flatter drain curve.
      const staminaFactor = 1.7 - s.player.attributes.stamina / 20
      const drain = 1.05 * pressLoad * tempoLoad * staminaFactor
      s.matchCondition = clamp(s.matchCondition - drain, 0, 100)
    } else if (!s.onPitch) {
      s.matchCondition = clamp(s.matchCondition + 1.5, 0, 100)
    }
  }
}

/** Number of outfielders currently available — cards leave a team short. */
function outfieldCount(team: TeamState, minute: number): number {
  return team.squad.filter((s) => s.onPitch && s.position !== 'GK' && !s.sentOff && s.suspendedUntil <= minute).length
}

function quarterOf(minute: number): 1 | 2 | 3 | 4 {
  if (minute <= 15) return 1
  if (minute <= 30) return 2
  if (minute <= 45) return 3
  return 4
}

export interface SimulateOptions {
  /** Home advantage multiplier on attacking phases. Modest in club hockey. */
  homeAdvantage?: number
  /** Knockout ties go to a shootout when level. */
  allowShootout?: boolean
  /** Push per-minute commentary into the event list. */
  verbose?: boolean
}

export function simulateMatch(
  rng: Rng,
  home: TeamSetup,
  away: TeamSetup,
  options: SimulateOptions = {},
): MatchResult {
  const { homeAdvantage = 1.06, allowShootout = false } = options

  const H = buildTeamState(home)
  const A = buildTeamState(away)
  const events: MatchEvent[] = []

  let possessionH = 0
  let possessionTotal = 0

  for (let minute = 1; minute <= 60; minute++) {
    const quarter = quarterOf(minute)

    // Quarter breaks: a short recovery for everyone still on the pitch.
    if (minute === 16 || minute === 31 || minute === 46) {
      for (const team of [H, A]) {
        for (const s of team.squad) {
          s.matchCondition = clamp(s.matchCondition + (minute === 31 ? 9 : 5), 0, 100)
        }
      }
      events.push({
        minute: minute - 1, quarter: quarterOf(minute - 1), kind: 'quarter', clubId: home.club.id,
        playerId: null,
        text: `End of Q${quarterOf(minute - 1)} — ${home.club.shortName} ${H.goals}-${A.goals} ${away.club.shortName}`,
      })
    }

    applyRollingSubs(rng, H, minute)
    applyRollingSubs(rng, A, minute)

    // Midfield control decides who gets the ball, adjusted for numbers on the pitch.
    const hMid = unitStrength(H, ['CM', 'AM', 'HB']) * PRESS_FACTOR[H.setup.tactics.press]
      * (outfieldCount(H, minute) / 10) * homeAdvantage
    const aMid = unitStrength(A, ['CM', 'AM', 'HB']) * PRESS_FACTOR[A.setup.tactics.press]
      * (outfieldCount(A, minute) / 10)

    const hShare = hMid / (hMid + aMid)
    possessionH += hShare
    possessionTotal += 1

    // Each minute produces roughly one meaningful attacking phase, occasionally two.
    const phases = rng.chance(0.28) ? 2 : 1
    for (let p = 0; p < phases; p++) {
      const attackingHome = rng.chance(hShare)
      const atk = attackingHome ? H : A
      const def = attackingHome ? A : H
      resolvePhase(rng, atk, def, minute, quarter, events, attackingHome ? homeAdvantage : 1)
    }

    tickFatigue(H, minute)
    tickFatigue(A, minute)
  }

  H.stats.possession = Math.round((possessionH / possessionTotal) * 100)
  A.stats.possession = 100 - H.stats.possession

  let shootout: { homeGoals: number; awayGoals: number } | null = null
  if (allowShootout && H.goals === A.goals) {
    shootout = runShootout(rng, H, A, events)
  }

  return {
    homeGoals: H.goals,
    awayGoals: A.goals,
    shootout,
    events,
    stats: { home: H.stats, away: A.stats },
    playerLines: buildPlayerLines(H, A),
  }
}

/**
 * Resolve a single attacking phase: build-up, circle entry, then a shot, a
 * penalty corner, a stroke or nothing.
 */
function resolvePhase(
  rng: Rng,
  atk: TeamState,
  def: TeamState,
  minute: number,
  quarter: 1 | 2 | 3 | 4,
  events: MatchEvent[],
  homeBoost: number,
): void {
  const atkTactics = atk.setup.tactics
  const defTactics = def.setup.tactics

  const atkMid = unitStrength(atk, ['CM', 'AM', 'HB'])
  const atkFwd = unitStrength(atk, ['WG', 'ST', 'AM'])
  const defLine = unitStrength(def, ['SW', 'FB', 'HB'])

  const numbersAtk = outfieldCount(atk, minute) / 10
  const numbersDef = outfieldCount(def, minute) / 10

  // Build-up: can the attack get through the press and into the circle?
  // Both quality and the number of bodies committed count, so a 3-3-4 really
  // does create more than a 5-3-2 — and leaves more space behind it.
  const entryPower = (atkMid * 0.45 + atkFwd * 0.55)
    * TEMPO_ENTRY[atkTactics.tempo]
    * (atkTactics.width === 'wide' ? 1.06 : atkTactics.width === 'narrow' ? 0.97 : 1)
    * commitmentFactor(unitCount(atk, ATTACK_POSITIONS))
    * numbersAtk * homeBoost
  const resistance = defLine
    * PRESS_FACTOR[defTactics.press]
    * commitmentFactor(unitCount(def, DEFENCE_POSITIONS))
    * numbersDef

  let entryChance = 0.42 * (entryPower / (entryPower + resistance)) * 2
  // A high press concedes more when it is beaten.
  entryChance *= PRESS_COUNTER_RISK[defTactics.press] * 0.5 + 0.6
  // Fast tempo turns the ball over more often before the circle.
  entryChance /= TEMPO_TURNOVER[atkTactics.tempo] * 0.35 + 0.68
  entryChance = clamp(entryChance, 0.05, 0.72)

  if (!rng.chance(entryChance)) {
    maybeCard(rng, def, minute, quarter, events, 0.35)
    return
  }

  atk.stats.circleEntries += 1

  // In the circle: shot, penalty corner won, penalty stroke, or nothing.
  const entrant = pickBy(rng, atk, (s) => s.player.attributes.circleEntry * (s.matchCondition / 100))
  const cornerHunting = atkTactics.width === 'wide' ? 1.15 : 1

  const roll = rng.next()
  const pcChance = 0.30 * cornerHunting * AGGRESSION_TACKLE[defTactics.aggression]
  const strokeChance = 0.014 * AGGRESSION_CARDS[defTactics.aggression]

  if (roll < strokeChance) {
    resolveStroke(rng, atk, def, minute, quarter, events)
  } else if (roll < strokeChance + pcChance) {
    if (entrant) {
      events.push({
        minute, quarter, kind: 'corner-won', clubId: atk.setup.club.id, playerId: entrant.player.id,
        text: `${entrant.player.lastName} wins a penalty corner for ${atk.setup.club.shortName}`,
      })
      entrant.ratingDelta += 0.08
    }
    resolveCorner(rng, atk, def, minute, quarter, events)
  } else if (roll < strokeChance + pcChance + 0.46) {
    resolveOpenPlayShot(rng, atk, def, minute, quarter, events, entrant)
  }
  // Remaining share: the entry comes to nothing, cleared by the defence.

  maybeCard(rng, def, minute, quarter, events, 1)
}

function resolveOpenPlayShot(
  rng: Rng,
  atk: TeamState,
  def: TeamState,
  minute: number,
  quarter: 1 | 2 | 3 | 4,
  events: MatchEvent[],
  creator: OnField | null,
): void {
  const shooter = pickBy(rng, atk, (s) => {
    const positional = s.position === 'ST' ? 3.2 : s.position === 'WG' ? 2.1 : s.position === 'AM' ? 1.6 : 0.35
    return positional * s.player.attributes.finishing * (s.matchCondition / 100)
  })
  if (!shooter) return

  atk.stats.shots += 1

  const gk = keeper(def)
  const finishing = shooter.player.attributes.finishing
  const composure = shooter.player.attributes.composure
  const shotQuality = (finishing * 0.62 + composure * 0.2 + shooter.player.attributes.agility * 0.18)
    * (0.6 + 0.4 * (shooter.matchCondition / 100))

  // Roughly half of open-play shots are on target.
  const onTarget = rng.chance(clamp(0.28 + shotQuality / 62, 0.2, 0.72))
  if (!onTarget) {
    shooter.ratingDelta -= 0.05
    return
  }
  atk.stats.shotsOnTarget += 1

  const keeping = gk
    ? (gk.player.attributes.shotStopping * 0.55 + gk.player.attributes.reflexArc * 0.3
      + gk.player.attributes.positioning * 0.15) * (0.7 + 0.3 * (gk.matchCondition / 100))
    : 4

  // Deflections and tips from close range are hard to stop; keepers still win most duels.
  const goalChance = clamp(0.46 * (shotQuality / (shotQuality + keeping * 1.15)) * 2, 0.06, 0.72)

  if (rng.chance(goalChance)) {
    scoreGoal(rng, atk, def, shooter, creator && creator !== shooter ? creator : null, minute, quarter, events, 'goal-field')
  } else if (gk) {
    gk.saves += 1
    def.stats.saves += 1
    gk.ratingDelta += 0.12
    shooter.ratingDelta -= 0.02
    events.push({
      minute, quarter, kind: 'save', clubId: def.setup.club.id, playerId: gk.player.id,
      text: `${gk.player.lastName} saves from ${shooter.player.lastName}`,
    })
  }
}

/**
 * Penalty corner. This is where hockey matches are won.
 *
 * The routine matters: a drag flick is the highest-percentage option but only if
 * you have someone who can actually flick, a straight strike depends on the
 * injector and stopper working cleanly, and a variation trades conversion rate
 * for a better chance of a rebound or a second corner.
 */
function resolveCorner(
  rng: Rng,
  atk: TeamState,
  def: TeamState,
  minute: number,
  quarter: 1 | 2 | 3 | 4,
  events: MatchEvent[],
): void {
  atk.stats.penaltyCorners += 1

  const gk = keeper(def)
  const routine = atk.setup.tactics.cornerRoutine
  refreshFlicker(atk)

  // Injector and stopper quality: a corner that never gets set up cannot score.
  const battery = outfieldOnPitch(atk)
  const craft = battery.length
    ? battery.reduce((max, s) => Math.max(max, s.player.attributes.cornerCraft), 0)
    : 5
  const setupClean = rng.chance(clamp(0.58 + craft / 40, 0.5, 0.94))
  if (!setupClean) return

  let taker: OnField | null
  let power: number

  if (routine === 'drag-flick' && atk.flicker) {
    taker = atk.flicker
    power = taker.player.attributes.dragFlick * 0.78 + taker.player.attributes.composure * 0.22
  } else if (routine === 'variation') {
    // A worked routine leans on stick skill and decision-making rather than raw power.
    taker = pickBy(rng, atk, (s) => s.player.attributes.stickWork * s.player.attributes.decisions)
    power = taker
      ? (taker.player.attributes.stickWork * 0.4 + taker.player.attributes.finishing * 0.35
        + taker.player.attributes.decisions * 0.25) * 0.88
      : 6
  } else {
    // Straight strike, or a drag-flick routine with nobody to take it.
    taker = pickBy(rng, atk, (s) => s.player.attributes.strength * s.player.attributes.cornerCraft)
    power = taker
      ? taker.player.attributes.strength * 0.45 + taker.player.attributes.cornerCraft * 0.4
        + taker.player.attributes.finishing * 0.15
      : 6
  }
  if (!taker) return

  atk.stats.shots += 1

  // The defence: keeper plus the first runner charging off the line.
  const runners = outfieldOnPitch(def)
  const runnerQuality = runners.length
    ? runners.reduce((max, s) => Math.max(max, s.player.attributes.pace * 0.5 + s.player.attributes.positioning * 0.5), 0)
    : 6
  const keeperQuality = gk
    ? gk.player.attributes.reflexArc * 0.5 + gk.player.attributes.shotStopping * 0.35 + gk.player.attributes.rushing * 0.15
    : 5
  const defence = keeperQuality * 0.68 + runnerQuality * 0.32

  // Penalty corner conversion sits around one in five even for good batteries;
  // an elite flicker against a weak defence pushes towards one in three.
  const conversion = clamp(0.20 * (power / (power + defence)) * 2, 0.03, 0.38)

  if (rng.chance(conversion)) {
    atk.stats.shotsOnTarget += 1
    atk.stats.cornerGoals += 1
    scoreGoal(rng, atk, def, taker, null, minute, quarter, events, 'goal-corner')
    return
  }

  // Not converted: saved, blocked, or it comes back out for a rebound.
  const onTarget = rng.chance(0.55)
  if (onTarget) {
    atk.stats.shotsOnTarget += 1
    if (gk) {
      gk.saves += 1
      def.stats.saves += 1
      gk.ratingDelta += 0.14
      events.push({
        minute, quarter, kind: 'save', clubId: def.setup.club.id, playerId: gk.player.id,
        text: `${gk.player.lastName} keeps out the corner from ${taker.player.lastName}`,
      })
    }
  }

  // Rebound chance — variations create the most scramble.
  const reboundChance = routine === 'variation' ? 0.16 : 0.10
  if (rng.chance(reboundChance)) {
    const poacher = pickBy(rng, atk, (s) => (s.position === 'ST' ? 3 : 1) * s.player.attributes.finishing)
    if (poacher && rng.chance(0.34)) {
      scoreGoal(rng, atk, def, poacher, taker, minute, quarter, events, 'goal-field')
    }
  }
}

function resolveStroke(
  rng: Rng,
  atk: TeamState,
  def: TeamState,
  minute: number,
  quarter: 1 | 2 | 3 | 4,
  events: MatchEvent[],
): void {
  atk.stats.strokes += 1
  atk.stats.shots += 1
  atk.stats.shotsOnTarget += 1

  const designated = atk.squad.find((s) => s.onPitch && s.player.id === atk.setup.lineup.strokeTakerId)
  const taker = designated ?? pickBy(rng, atk, (s) => s.player.attributes.composure * 1.5 + s.player.attributes.finishing)
  if (!taker) return

  const gk = keeper(def)
  const takerQuality = taker.player.attributes.composure * 0.6 + taker.player.attributes.finishing * 0.4
  const keeperQuality = gk ? gk.player.attributes.shotStopping * 0.6 + gk.player.attributes.reflexArc * 0.4 : 5

  // Strokes are converted around three quarters of the time.
  const chance = clamp(0.62 + (takerQuality - keeperQuality) * 0.018, 0.45, 0.92)

  if (rng.chance(chance)) {
    scoreGoal(rng, atk, def, taker, null, minute, quarter, events, 'goal-stroke')
  } else if (gk) {
    gk.saves += 1
    def.stats.saves += 1
    gk.ratingDelta += 0.35
    taker.ratingDelta -= 0.3
    events.push({
      minute, quarter, kind: 'save', clubId: def.setup.club.id, playerId: gk.player.id,
      text: `${gk.player.lastName} saves the penalty stroke from ${taker.player.lastName}!`,
    })
  }
}

function scoreGoal(
  rng: Rng,
  atk: TeamState,
  def: TeamState,
  scorer: OnField,
  assister: OnField | null,
  minute: number,
  quarter: 1 | 2 | 3 | 4,
  events: MatchEvent[],
  kind: 'goal-field' | 'goal-corner' | 'goal-stroke',
): void {
  atk.goals += 1
  scorer.goals += 1
  scorer.ratingDelta += kind === 'goal-stroke' ? 0.55 : 0.85
  if (assister) {
    assister.assists += 1
    assister.ratingDelta += 0.35
  }

  const gk = keeper(def)
  if (gk) gk.ratingDelta -= 0.18

  const how = kind === 'goal-corner'
    ? `${atk.setup.tactics.cornerRoutine === 'drag-flick' ? 'drag flicks' : atk.setup.tactics.cornerRoutine === 'variation' ? 'finishes a worked routine' : 'strikes'} it home from the corner`
    : kind === 'goal-stroke'
      ? 'converts the penalty stroke'
      : rng.pick(['finishes from close range', 'deflects it in', 'tucks it away on the reverse', 'buries the rebound'])

  events.push({
    minute, quarter, kind, clubId: atk.setup.club.id, playerId: scorer.player.id,
    assistPlayerId: assister?.player.id ?? null,
    text: `GOAL! ${scorer.player.lastName} ${how} for ${atk.setup.club.shortName}`,
  })
}

/**
 * Cards. Hockey uses a three-tier system and all of them cost you time on the
 * pitch, which matters far more in a 60-minute game than a booking does in football.
 */
function maybeCard(
  rng: Rng,
  team: TeamState,
  minute: number,
  quarter: 1 | 2 | 3 | 4,
  events: MatchEvent[],
  scale: number,
): void {
  const aggression = AGGRESSION_CARDS[team.setup.tactics.aggression]
  const base = 0.05 * aggression * scale
  if (!rng.chance(base)) return

  const offender = pickBy(rng, team, (s) => (21 - s.player.attributes.discipline) * (s.position === 'FB' || s.position === 'HB' ? 1.5 : 1))
  if (!offender) return

  // Green is by far the most common; a red is roughly a once-a-month event.
  const severityRoll = rng.next()
  if (severityRoll < 0.8) {
    offender.suspendedUntil = minute + 2
    offender.cardPoints += 1
    offender.ratingDelta -= 0.15
    team.stats.greens += 1
    events.push({
      minute, quarter, kind: 'green', clubId: team.setup.club.id, playerId: offender.player.id,
      text: `Green card — ${offender.player.lastName} (${team.setup.club.shortName}) off for two minutes`,
    })
  } else if (severityRoll < 0.985) {
    const length = rng.int(5, 10)
    offender.suspendedUntil = minute + length
    offender.cardPoints += 2
    offender.ratingDelta -= 0.45
    team.stats.yellows += 1
    events.push({
      minute, quarter, kind: 'yellow', clubId: team.setup.club.id, playerId: offender.player.id,
      text: `Yellow card — ${offender.player.lastName} (${team.setup.club.shortName}) suspended for ${length} minutes`,
    })
  } else {
    offender.sentOff = true
    offender.onPitch = false
    offender.cardPoints += 5
    offender.ratingDelta -= 1.2
    team.stats.reds += 1
    events.push({
      minute, quarter, kind: 'red', clubId: team.setup.club.id, playerId: offender.player.id,
      text: `RED CARD — ${offender.player.lastName} (${team.setup.club.shortName}) is sent off`,
    })
  }

  // A hard challenge occasionally leaves someone hurt.
  if (rng.chance(0.06)) {
    const hurt = pickBy(rng, team, () => 1)
    if (hurt && hurt.onPitch) {
      hurt.player.injury = rollInjury(rng, false)
      hurt.onPitch = false
      events.push({
        minute, quarter, kind: 'injury', clubId: team.setup.club.id, playerId: hurt.player.id,
        text: `${hurt.player.lastName} goes off injured — ${hurt.player.injury.name}`,
      })
    }
  }
}

/**
 * Shootout: alternating 8-second one-on-one runs from the 23-metre line, five
 * each then sudden death. Attacker's stick skill against the keeper's rushing.
 */
function runShootout(rng: Rng, H: TeamState, A: TeamState, events: MatchEvent[]): { homeGoals: number; awayGoals: number } {
  const order = (team: TeamState) =>
    team.squad
      .filter((s) => !s.sentOff && s.position !== 'GK')
      .sort((a, b) =>
        (b.player.attributes.stickWork + b.player.attributes.composure)
        - (a.player.attributes.stickWork + a.player.attributes.composure))
      .slice(0, 8)

  const hTakers = order(H)
  const aTakers = order(A)
  let hGoals = 0
  let aGoals = 0

  const attempt = (team: TeamState, opponent: TeamState, taker: OnField | undefined): boolean => {
    if (!taker) return false
    const gk = keeper(opponent)
    const attack = taker.player.attributes.stickWork * 0.45 + taker.player.attributes.composure * 0.3
      + taker.player.attributes.agility * 0.25
    const defence = gk
      ? gk.player.attributes.rushing * 0.5 + gk.player.attributes.shotStopping * 0.3 + gk.player.attributes.reflexArc * 0.2
      : 5
    // One-on-ones favour the attacker, but not overwhelmingly.
    const scored = rng.chance(clamp(0.5 * (attack / (attack + defence)) * 2, 0.15, 0.8))
    events.push({
      minute: 60, quarter: 4, kind: 'shootout', clubId: team.setup.club.id, playerId: taker.player.id,
      text: `Shootout: ${taker.player.lastName} ${scored ? 'scores' : 'is denied'}`,
    })
    return scored
  }

  for (let i = 0; i < 5; i++) {
    if (attempt(H, A, hTakers[i])) hGoals++
    if (attempt(A, H, aTakers[i])) aGoals++
  }
  let i = 5
  while (hGoals === aGoals && i < 8) {
    if (attempt(H, A, hTakers[i])) hGoals++
    if (attempt(A, H, aTakers[i])) aGoals++
    i++
  }
  // Still level after everyone has gone: settle it rather than loop forever.
  while (hGoals === aGoals) {
    if (rng.chance(0.5)) hGoals++
    else aGoals++
  }
  return { homeGoals: hGoals, awayGoals: aGoals }
}

function buildPlayerLines(H: TeamState, A: TeamState): Record<string, PlayerMatchLine> {
  const lines: Record<string, PlayerMatchLine> = {}
  for (const [team, opponentGoals] of [[H, A.goals], [A, H.goals]] as const) {
    for (const s of team.squad) {
      if (s.minutes === 0) continue
      let rating = 6.4 + s.ratingDelta
      if (s.position === 'GK') {
        // Keepers are rated on what got past them relative to what they stopped.
        rating += clamp(s.saves * 0.14 - opponentGoals * 0.28, -2.5, 2.5)
        if (opponentGoals === 0 && s.minutes > 45) rating += 0.6
      }
      // Playing a long shift at low condition still counts for something.
      rating += clamp((s.minutes - 40) / 120, -0.3, 0.2)
      lines[s.player.id] = {
        playerId: s.player.id,
        minutes: s.minutes,
        goals: s.goals,
        assists: s.assists,
        saves: s.saves,
        rating: Math.round(clamp(rating, 1, 10) * 10) / 10,
      }
    }
  }
  return lines
}

/** Expose match-end condition so the season can carry fatigue between fixtures. */
export function applyMatchAftermath(
  rng: Rng,
  players: Player[],
  result: MatchResult,
  clubId: string,
  goalsConceded: number,
): void {
  for (const player of players) {
    const line = result.playerLines[player.id]
    if (!line) {
      // Did not feature: recover a little, lose sharpness.
      player.condition = clamp(player.condition + 6, 0, 100)
      player.sharpness = clamp(player.sharpness - 2.5, 0, 100)
      continue
    }

    player.condition = clamp(player.condition - line.minutes * 0.62 + 4, 0, 100)
    player.sharpness = clamp(player.sharpness + line.minutes * 0.22, 0, 100)

    const stats = player.seasonStats
    stats.appearances += 1
    stats.minutes += line.minutes
    stats.goals += line.goals
    stats.assists += line.assists
    stats.saves += line.saves
    stats.ratingSum += line.rating

    if (player.position === 'GK') {
      stats.goalsConceded += goalsConceded
      if (goalsConceded === 0 && line.minutes >= 45) stats.cleanSheets += 1
    }

    // Morale tracks performance.
    player.morale = clamp(player.morale + (line.rating - 6.5) * 3, 5, 100)
  }

  // Card and injury consequences recorded from the event list.
  for (const event of result.events) {
    if (event.clubId !== clubId || !event.playerId) continue
    const player = players.find((p) => p.id === event.playerId)
    if (!player) continue
    if (event.kind === 'goal-field') player.seasonStats.fieldGoals += 1
    if (event.kind === 'goal-corner') player.seasonStats.cornerGoals += 1
    if (event.kind === 'goal-stroke') player.seasonStats.strokeGoals += 1
    if (event.kind === 'green') player.seasonStats.greenCards += 1
    if (event.kind === 'yellow') player.seasonStats.yellowCards += 1
    if (event.kind === 'red') {
      player.seasonStats.redCards += 1
      player.banMatches = Math.max(player.banMatches, rng.int(1, 3))
    }
  }
}
