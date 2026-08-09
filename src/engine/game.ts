/**
 * Game state: creating a save, advancing through a season, and rolling the
 * pyramid over into the next one.
 *
 * Only the pyramid for the chosen gender is simulated, which keeps a season at
 * roughly nine hundred matches rather than double that.
 */

import { Rng, clamp } from './rng'
import {
  type Player, type Club, type Fixture, type TableRow, type Tactics, type Lineup,
  type TrainingPlan, type Gender, type Position, type Region, type Division,
  defaultTactics, emptyStats, FORMATIONS,
} from './types'
import {
  effectiveRating, generateSquad, bestFlicker, bestStrokeTaker, bestCaptain,
  trainWeek, ageUp, generatePlayer, overall, fullName,
} from './players'
import { simulateMatch, applyMatchAftermath, positionSlots, type TeamSetup } from './match'
import {
  generateFixtures, buildTable, createSemiFinals, createFinal, winnerOf,
  resolvePromotionRelegation,
} from './season'
import { CLUBS, DIVISIONS, divisionsForGender, getDivision } from '../data/clubs'
import { loadImportedSquads, buildSquadFromImport } from '../data/squads'

export interface NewsItem {
  season: number
  round: number
  kind: 'result' | 'league' | 'squad' | 'transfer' | 'season'
  text: string
}

export interface SeasonRecord {
  season: number
  divisionId: string
  divisionName: string
  position: number
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  points: number
  champion: string | null
  playoffResult: string | null
}

export interface GameState {
  seed: string
  rngState: number
  gender: Gender
  /** The club the player manages. */
  clubId: string
  season: number
  /** Rounds already played. The next round to play is `round + 1`. */
  round: number
  totalRounds: number
  phase: 'league' | 'playoffs' | 'complete'
  clubs: Record<string, Club>
  players: Record<string, Player[]>
  fixtures: Record<string, Fixture[]>
  playoffs: Record<string, Fixture[]>
  tactics: Tactics
  lineup: Lineup
  training: TrainingPlan
  news: NewsItem[]
  history: SeasonRecord[]
  /** Club ids grouped by the division they are currently in. */
  divisionMembers: Record<string, string[]>
  /** True when at least one club's squad came from imported real data. */
  usingRealSquads: boolean
}

const SQUAD_SIZE_MIN = 16

/** Create a new save. */
export function newGame(opts: { seed?: string; gender: Gender; clubId: string }): GameState {
  const seed = opts.seed ?? `${opts.clubId}-${opts.gender}`
  const rng = new Rng(seed)

  const divisions = divisionsForGender(opts.gender)
  const divisionIds = new Set(divisions.map((d) => d.id))

  const clubs: Record<string, Club> = {}
  const players: Record<string, Player[]> = {}
  const divisionMembers: Record<string, string[]> = {}
  const imported = loadImportedSquads()
  let usingRealSquads = false

  for (const seedClub of CLUBS) {
    if (!divisionIds.has(seedClub.divisionId)) continue

    // Copy so a save never mutates the seed data.
    const club: Club = {
      ...seedClub,
      colours: { ...seedClub.colours },
      finances: { ...seedClub.finances },
    }
    clubs[club.id] = club
    ;(divisionMembers[club.divisionId] ??= []).push(club.id)

    const importedSquad = imported.get(club.id)
    if (importedSquad) {
      usingRealSquads = true
      players[club.id] = buildSquadFromImport(rng, importedSquad, {
        clubId: club.id,
        reputation: club.reputation,
        gender: opts.gender,
        university: club.university,
      })
    } else {
      players[club.id] = generateSquad(rng, {
        clubId: club.id,
        reputation: club.reputation,
        gender: opts.gender,
        university: club.university,
      })
    }
  }

  const fixtures: Record<string, Fixture[]> = {}
  let totalRounds = 0
  for (const division of divisions) {
    const members = divisionMembers[division.id] ?? []
    if (members.length < 2) continue
    fixtures[division.id] = generateFixtures(rng, division.id, members)
    totalRounds = Math.max(totalRounds, Math.max(...fixtures[division.id].map((f) => f.round)))
  }

  const tactics = defaultTactics()
  const state: GameState = {
    seed,
    rngState: rng.getState(),
    gender: opts.gender,
    clubId: opts.clubId,
    season: 1,
    round: 0,
    totalRounds,
    phase: 'league',
    clubs,
    players,
    fixtures,
    playoffs: {},
    tactics,
    lineup: autoLineup(players[opts.clubId] ?? [], tactics),
    training: { focus: 'technical', intensity: 'normal' },
    news: [],
    history: [],
    divisionMembers,
    usingRealSquads,
  }

  const club = clubs[opts.clubId]
  const division = getDivision(club.divisionId)
  state.news.push({
    season: 1, round: 0, kind: 'season',
    text: `You take charge of ${club.name}, competing in the ${division.name}. ${
      usingRealSquads ? 'Real squad data loaded.' : 'Squads generated — import real squads to replace them.'
    }`,
  })

  return state
}

/** Pick the strongest available eleven for a formation, plus a bench of five. */
export function autoLineup(squad: Player[], tactics: Tactics): Lineup {
  const available = squad.filter((p) => !p.injury && p.banMatches === 0)
  const pool = available.length >= SQUAD_SIZE_MIN ? available : squad.slice()

  const shape = FORMATIONS[tactics.formation]
  const slots = positionSlots(shape.def, shape.mid, shape.fwd)

  const used = new Set<string>()

  // Keeper first — nobody else can do the job.
  const keepers = pool.filter((p) => p.position === 'GK')
  const keeper = keepers.length
    ? keepers.reduce((a, b) => (effectiveRating(b, 'GK') > effectiveRating(a, 'GK') ? b : a))
    : pool[0]
  const starting: string[] = []
  if (keeper) {
    starting.push(keeper.id)
    used.add(keeper.id)
  }

  // Then fill each outfield slot with the best remaining player for it.
  for (const slot of slots) {
    const candidates = pool.filter((p) => !used.has(p.id) && p.position !== 'GK')
    if (candidates.length === 0) break
    const best = candidates.reduce((a, b) => (effectiveRating(b, slot) > effectiveRating(a, slot) ? b : a))
    starting.push(best.id)
    used.add(best.id)
  }

  // Bench: the five best remaining outfielders, plus a reserve keeper if there is one.
  const remaining = pool.filter((p) => !used.has(p.id))
  const reserveKeeper = remaining.find((p) => p.position === 'GK')
  const outfieldBench = remaining
    .filter((p) => p.position !== 'GK')
    .sort((a, b) => overall(b) - overall(a))
    .slice(0, reserveKeeper ? 5 : 6)
  const bench = [...outfieldBench.map((p) => p.id)]
  if (reserveKeeper) bench.push(reserveKeeper.id)

  const startingPlayers = starting
    .map((id) => squad.find((p) => p.id === id))
    .filter((p): p is Player => Boolean(p))

  return {
    starting,
    bench,
    flickerId: bestFlicker(startingPlayers)?.id ?? bestFlicker(pool)?.id ?? null,
    strokeTakerId: bestStrokeTaker(startingPlayers)?.id ?? null,
    captainId: bestCaptain(startingPlayers)?.id ?? null,
  }
}

/** AI tactics: clubs lean into what their squad is good at. */
function aiTactics(rng: Rng, squad: Player[]): Tactics {
  const tactics = defaultTactics()
  const avgStamina = squad.reduce((sum, p) => sum + p.attributes.stamina, 0) / Math.max(1, squad.length)
  const flicker = bestFlicker(squad)

  tactics.press = avgStamina > 14 ? 'high' : avgStamina < 11 ? 'low' : 'mid'
  tactics.cornerRoutine = flicker && flicker.attributes.dragFlick >= 13
    ? 'drag-flick'
    : rng.chance(0.5) ? 'straight-strike' : 'variation'
  tactics.formation = rng.weighted(
    ['4-3-3', '3-4-3', '4-4-2', '5-3-2'] as const,
    (f) => (f === '4-3-3' ? 4 : f === '3-4-3' ? 2 : f === '4-4-2' ? 2 : 1),
  ) ?? '4-3-3'
  tactics.tempo = rng.pick(['slow', 'balanced', 'balanced', 'fast'] as const)
  tactics.aggression = rng.pick(['contain', 'balanced', 'balanced', 'aggressive'] as const)
  tactics.rotation = rng.pick(['balanced', 'balanced', 'heavy'] as const)
  return tactics
}

function buildSetup(state: GameState, rng: Rng, clubId: string): TeamSetup {
  const squad = state.players[clubId] ?? []
  const isUser = clubId === state.clubId
  const tactics = isUser ? state.tactics : aiTactics(rng, squad)
  const lineup = isUser
    ? reconcileLineup(state.lineup, squad, tactics)
    : autoLineup(squad, tactics)
  return { club: state.clubs[clubId], players: squad, lineup, tactics }
}

/**
 * A saved lineup can go stale — players get injured, suspended or transferred.
 * Drop anyone unavailable and top the eleven back up from the squad.
 */
export function reconcileLineup(lineup: Lineup, squad: Player[], tactics: Tactics): Lineup {
  const byId = new Map(squad.map((p) => [p.id, p]))
  const isAvailable = (id: string) => {
    const player = byId.get(id)
    return Boolean(player && !player.injury && player.banMatches === 0)
  }

  const starting = lineup.starting.filter(isAvailable)
  const bench = lineup.bench.filter(isAvailable)

  if (starting.length === 11) {
    return { ...lineup, starting, bench }
  }

  // Rebuild from scratch rather than trying to patch a broken eleven.
  const rebuilt = autoLineup(squad, tactics)
  return {
    ...rebuilt,
    flickerId: lineup.flickerId && isAvailable(lineup.flickerId) ? lineup.flickerId : rebuilt.flickerId,
    strokeTakerId: lineup.strokeTakerId && isAvailable(lineup.strokeTakerId) ? lineup.strokeTakerId : rebuilt.strokeTakerId,
    captainId: lineup.captainId && isAvailable(lineup.captainId) ? lineup.captainId : rebuilt.captainId,
  }
}

/** Play every fixture in the next round, across the whole pyramid. */
export function advanceRound(state: GameState): { userFixture: Fixture | null } {
  if (state.phase !== 'league') return { userFixture: null }

  const rng = new Rng(state.seed)
  rng.setState(state.rngState)

  const nextRound = state.round + 1
  let userFixture: Fixture | null = null

  for (const divisionId of Object.keys(state.fixtures)) {
    for (const fixture of state.fixtures[divisionId]) {
      if (fixture.round !== nextRound || fixture.played) continue

      const home = buildSetup(state, rng, fixture.homeClubId)
      const away = buildSetup(state, rng, fixture.awayClubId)
      const result = simulateMatch(rng, home, away, { allowShootout: false })

      fixture.result = result
      fixture.played = true

      applyMatchAftermath(rng, state.players[fixture.homeClubId], result, fixture.homeClubId, result.awayGoals)
      applyMatchAftermath(rng, state.players[fixture.awayClubId], result, fixture.awayClubId, result.homeGoals)

      if (fixture.homeClubId === state.clubId || fixture.awayClubId === state.clubId) {
        userFixture = fixture
      }
    }
  }

  // Suspensions and injuries tick down one match per round.
  for (const clubId of Object.keys(state.players)) {
    for (const player of state.players[clubId]) {
      if (player.banMatches > 0) player.banMatches -= 1
      if (player.injury) {
        player.injury.matches -= 1
        if (player.injury.matches <= 0) {
          player.injury = null
          player.condition = clamp(player.condition, 0, 70)
          player.sharpness = clamp(player.sharpness - 15, 0, 100)
        }
      }
    }
  }

  // One training week between fixtures.
  runTrainingWeek(state, rng)

  state.round = nextRound
  state.rngState = rng.getState()

  if (userFixture?.result) {
    const home = state.clubs[userFixture.homeClubId]
    const away = state.clubs[userFixture.awayClubId]
    state.news.push({
      season: state.season, round: nextRound, kind: 'result',
      text: `${home.shortName} ${userFixture.result.homeGoals}-${userFixture.result.awayGoals} ${away.shortName}`,
    })
  }

  if (state.round >= state.totalRounds) {
    startPlayoffs(state)
  }

  state.lineup = reconcileLineup(state.lineup, state.players[state.clubId] ?? [], state.tactics)
  return { userFixture }
}

function runTrainingWeek(state: GameState, rng: Rng): void {
  for (const clubId of Object.keys(state.players)) {
    const isUser = clubId === state.clubId
    const plan = isUser ? state.training : aiTrainingPlan(rng)
    for (const player of state.players[clubId]) {
      if (player.injury) {
        player.condition = clamp(player.condition + 8, 0, 100)
        continue
      }
      trainWeek(rng, player, plan.focus, plan.intensity)
    }
  }
}

function aiTrainingPlan(rng: Rng): TrainingPlan {
  return {
    focus: rng.pick(['fitness', 'technical', 'set-pieces', 'defensive-shape', 'attacking-play'] as const),
    intensity: rng.pick(['light', 'normal', 'normal', 'hard'] as const),
  }
}

/** Table for a division as it currently stands. */
export function tableFor(state: GameState, divisionId: string): TableRow[] {
  return buildTable(state.divisionMembers[divisionId] ?? [], state.fixtures[divisionId] ?? [])
}

function startPlayoffs(state: GameState): void {
  const divisions = divisionsForGender(state.gender).filter((d) => d.hasPlayoffs)
  let anyPlayoffs = false

  for (const division of divisions) {
    const table = tableFor(state, division.id)
    const semis = createSemiFinals(division.id, table, state.totalRounds * 7 + 7)
    if (semis.length > 0) {
      state.playoffs[division.id] = semis
      anyPlayoffs = true
    }
  }

  state.phase = anyPlayoffs ? 'playoffs' : 'complete'
  if (!anyPlayoffs) {
    finaliseSeason(state)
    return
  }

  const userDivision = state.clubs[state.clubId].divisionId
  const userSemis = state.playoffs[userDivision]
  const inPlayoffs = userSemis?.some((f) => f.homeClubId === state.clubId || f.awayClubId === state.clubId)
  state.news.push({
    season: state.season, round: state.round, kind: 'season',
    text: inPlayoffs
      ? 'The regular season is over and you have made the title play-offs.'
      : 'The regular season is over. The title play-offs are under way.',
  })
}

/** Play the semi-finals, then the final. Knockout ties go to a shootout when level. */
export function advancePlayoffs(state: GameState): void {
  if (state.phase !== 'playoffs') return

  const rng = new Rng(state.seed)
  rng.setState(state.rngState)

  for (const divisionId of Object.keys(state.playoffs)) {
    const ties = state.playoffs[divisionId]

    const unplayedSemis = ties.filter((f) => f.stage === 'semi-final' && !f.played)
    if (unplayedSemis.length > 0) {
      for (const tie of unplayedSemis) {
        playKnockout(state, rng, tie)
      }
      const semis = ties.filter((f) => f.stage === 'semi-final')
      const final = createFinal(divisionId, semis, state.totalRounds * 7 + 14)
      if (final) ties.push(final)
      continue
    }

    const final = ties.find((f) => f.stage === 'final' && !f.played)
    if (final) playKnockout(state, rng, final)
  }

  state.rngState = rng.getState()

  const allDone = Object.values(state.playoffs).every(
    (ties) => ties.some((f) => f.stage === 'final' && f.played),
  )
  if (allDone) {
    state.phase = 'complete'
    finaliseSeason(state)
  }
}

function playKnockout(state: GameState, rng: Rng, fixture: Fixture): void {
  const home = buildSetup(state, rng, fixture.homeClubId)
  const away = buildSetup(state, rng, fixture.awayClubId)
  const result = simulateMatch(rng, home, away, { allowShootout: true })
  fixture.result = result
  fixture.played = true

  applyMatchAftermath(rng, state.players[fixture.homeClubId], result, fixture.homeClubId, result.awayGoals)
  applyMatchAftermath(rng, state.players[fixture.awayClubId], result, fixture.awayClubId, result.homeGoals)

  if (fixture.homeClubId === state.clubId || fixture.awayClubId === state.clubId) {
    const opponentId = fixture.homeClubId === state.clubId ? fixture.awayClubId : fixture.homeClubId
    const won = winnerOf(fixture) === state.clubId
    state.news.push({
      season: state.season, round: state.round, kind: 'season',
      text: `${fixture.stage === 'final' ? 'Final' : 'Semi-final'} against ${
        state.clubs[opponentId].shortName}: ${won ? 'won' : 'lost'} ${result.homeGoals}-${result.awayGoals}${
        result.shootout ? ` (${result.shootout.homeGoals}-${result.shootout.awayGoals} on shootout)` : ''}`,
    })
  }
}

/** Record the season in history, then roll the pyramid over. */
function finaliseSeason(state: GameState): void {
  const divisions = divisionsForGender(state.gender)
  const tables: Record<string, TableRow[]> = {}
  for (const division of divisions) {
    tables[division.id] = tableFor(state, division.id)
  }

  const userClub = state.clubs[state.clubId]
  const userDivision = getDivision(userClub.divisionId)
  const userTable = tables[userDivision.id] ?? []
  const userRow = userTable.find((r) => r.clubId === state.clubId)
  const position = userTable.findIndex((r) => r.clubId === state.clubId) + 1

  const finalTie = state.playoffs[userDivision.id]?.find((f) => f.stage === 'final' && f.played)
  const championId = finalTie ? winnerOf(finalTie) : userTable[0]?.clubId ?? null

  let playoffResult: string | null = null
  const userTies = state.playoffs[userDivision.id]?.filter(
    (f) => f.homeClubId === state.clubId || f.awayClubId === state.clubId,
  ) ?? []
  if (userTies.length > 0) {
    const wonFinal = userTies.some((f) => f.stage === 'final' && winnerOf(f) === state.clubId)
    const reachedFinal = userTies.some((f) => f.stage === 'final')
    playoffResult = wonFinal ? 'Champions' : reachedFinal ? 'Runners-up' : 'Semi-finalists'
  }

  if (userRow) {
    state.history.push({
      season: state.season,
      divisionId: userDivision.id,
      divisionName: userDivision.name,
      position,
      played: userRow.played,
      won: userRow.won,
      drawn: userRow.drawn,
      lost: userRow.lost,
      goalsFor: userRow.goalsFor,
      goalsAgainst: userRow.goalsAgainst,
      points: userRow.points,
      champion: championId ? state.clubs[championId]?.shortName ?? null : null,
      playoffResult,
    })
  }

  const outcome = resolvePromotionRelegation(
    divisions,
    tables,
    (clubId) => state.clubs[clubId]?.region ?? 'south',
    (divisionId) => DIVISIONS.find((d) => d.id === divisionId)?.regions ?? [],
  )

  for (const move of [...outcome.promoted, ...outcome.relegated]) {
    const club = state.clubs[move.clubId]
    if (!club) continue
    club.divisionId = move.toDivisionId
    const wentUp = outcome.promoted.includes(move)
    // Standing follows results.
    club.reputation = clamp(club.reputation + (wentUp ? 5 : -4), 5, 100)
    if (move.clubId === state.clubId) {
      state.news.push({
        season: state.season, round: state.round, kind: 'season',
        text: wentUp
          ? `Promoted! ${club.name} move up to the ${getDivision(move.toDivisionId).name}.`
          : `Relegated. ${club.name} drop into the ${getDivision(move.toDivisionId).name}.`,
      })
    }
  }
}

/** Start the next season: age squads, reset stats, redraw fixtures. */
export function startNextSeason(state: GameState): void {
  const rng = new Rng(state.seed)
  rng.setState(state.rngState)

  for (const clubId of Object.keys(state.players)) {
    const club = state.clubs[clubId]
    const squad = state.players[clubId]

    for (const player of squad) {
      ageUp(rng, player)
      player.seasonStats = emptyStats()
      player.condition = rng.int(85, 100)
      player.sharpness = rng.int(40, 65)
      player.injury = null
      player.banMatches = 0
      player.contract.yearsRemaining -= 1
    }

    // Players leave when their contract runs out, when they age out, or when a
    // university side turns over its intake.
    const leaving = squad.filter((p) => {
      if (p.age >= 38) return true
      if (club.university && p.age >= 23) return true
      return p.contract.yearsRemaining <= 0 && rng.chance(0.35)
    })
    let remaining = squad.filter((p) => !leaving.includes(p))

    if (leaving.length > 0 && clubId === state.clubId) {
      state.news.push({
        season: state.season + 1, round: 0, kind: 'transfer',
        text: `Departures: ${leaving.map(fullName).join(', ')}`,
      })
    }

    // Replace departures, and top up to a legal squad size.
    const arrivals: Player[] = []
    const targetSize = Math.max(SQUAD_SIZE_MIN + 2, squad.length)
    const usedNumbers = new Set(remaining.map((p) => p.number))
    let nextNumber = 1
    const takeNumber = () => {
      while (usedNumbers.has(nextNumber)) nextNumber++
      usedNumbers.add(nextNumber)
      return nextNumber
    }

    while (remaining.length + arrivals.length < targetSize) {
      const needKeeper = remaining.filter((p) => p.position === 'GK').length
        + arrivals.filter((p) => p.position === 'GK').length < 2
      const position: Position = needKeeper
        ? 'GK'
        : rng.pick(['SW', 'FB', 'FB', 'HB', 'CM', 'CM', 'AM', 'WG', 'WG', 'ST', 'ST'] as Position[])
      // Signings track the club's standing, with the usual spread.
      const quality = clamp(rng.normal(22 + club.reputation * 0.63 - 4, 6), 12, 95)
      arrivals.push(generatePlayer(rng, {
        clubId,
        position,
        quality,
        gender: state.gender,
        university: club.university,
        number: takeNumber(),
      }))
    }

    if (arrivals.length > 0 && clubId === state.clubId) {
      state.news.push({
        season: state.season + 1, round: 0, kind: 'transfer',
        text: `Arrivals: ${arrivals.map(fullName).join(', ')}`,
      })
    }

    remaining = [...remaining, ...arrivals]
    for (const player of remaining) {
      player.clubId = clubId
      if (player.contract.yearsRemaining <= 0) player.contract.yearsRemaining = rng.int(1, 3)
    }
    state.players[clubId] = remaining
  }

  // Rebuild division membership from where clubs now sit.
  const divisionMembers: Record<string, string[]> = {}
  for (const club of Object.values(state.clubs)) {
    (divisionMembers[club.divisionId] ??= []).push(club.id)
  }
  state.divisionMembers = divisionMembers

  const fixtures: Record<string, Fixture[]> = {}
  let totalRounds = 0
  for (const division of divisionsForGender(state.gender)) {
    const members = divisionMembers[division.id] ?? []
    if (members.length < 2) continue
    fixtures[division.id] = generateFixtures(rng, division.id, members)
    totalRounds = Math.max(totalRounds, Math.max(...fixtures[division.id].map((f) => f.round)))
  }

  state.fixtures = fixtures
  state.playoffs = {}
  state.totalRounds = totalRounds
  state.round = 0
  state.season += 1
  state.phase = 'league'
  state.rngState = rng.getState()
  state.lineup = autoLineup(state.players[state.clubId] ?? [], state.tactics)

  const club = state.clubs[state.clubId]
  state.news.push({
    season: state.season, round: 0, kind: 'season',
    text: `Season ${state.season} begins. ${club.name} in the ${getDivision(club.divisionId).name}.`,
  })
}

/** Next fixture for the managed club, or null when the season is done. */
export function nextUserFixture(state: GameState): Fixture | null {
  const divisionId = state.clubs[state.clubId].divisionId
  const list = state.fixtures[divisionId] ?? []
  return list.find(
    (f) => !f.played && (f.homeClubId === state.clubId || f.awayClubId === state.clubId),
  ) ?? null
}

/** Every fixture the managed club has played or will play, in order. */
export function userFixtures(state: GameState): Fixture[] {
  const divisionId = state.clubs[state.clubId].divisionId
  const league = (state.fixtures[divisionId] ?? []).filter(
    (f) => f.homeClubId === state.clubId || f.awayClubId === state.clubId,
  )
  const playoffs = (state.playoffs[divisionId] ?? []).filter(
    (f) => f.homeClubId === state.clubId || f.awayClubId === state.clubId,
  )
  return [...league, ...playoffs].sort((a, b) => a.round - b.round)
}

/** Divisions in the pyramid for the current save, top tier first. */
export function pyramid(state: GameState): Division[] {
  return divisionsForGender(state.gender)
}

export function clubRegionLabel(region: Region): string {
  return region.charAt(0).toUpperCase() + region.slice(1)
}
