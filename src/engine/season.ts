/**
 * Season structure: fixture generation, league tables, and the end-of-season
 * play-offs and promotion/relegation that the England Hockey League uses.
 *
 * The Premier Division plays a double round robin and then settles the title in
 * a play-off between the top four, which is why finishing first in the regular
 * season is worth a semi-final place rather than the trophy itself.
 */

import { Rng } from './rng'
import type { Fixture, TableRow, MatchResult, Division, Region } from './types'

/**
 * Circle method round robin. Produces a balanced schedule where every club
 * plays every other once per half of the season, alternating home and away.
 */
export function generateFixtures(
  rng: Rng,
  divisionId: string,
  clubIds: string[],
  opts: { startDay?: number; daysBetweenRounds?: number } = {},
): Fixture[] {
  const { startDay = 0, daysBetweenRounds = 7 } = opts

  // An odd number of clubs needs a bye, represented by a null slot.
  const teams: (string | null)[] = rng.shuffle(clubIds.slice())
  if (teams.length % 2 === 1) teams.push(null)

  const n = teams.length
  const roundsPerHalf = n - 1
  const fixtures: Fixture[] = []
  let fixtureSeq = 0

  for (let round = 0; round < roundsPerHalf; round++) {
    for (let i = 0; i < n / 2; i++) {
      const a = teams[i]
      const b = teams[n - 1 - i]
      if (a === null || b === null) continue

      // Alternate which side is at home so the schedule stays balanced.
      const aHome = (round + i) % 2 === 0

      // First half of the season.
      fixtures.push({
        id: `${divisionId}-f${fixtureSeq++}`,
        round: round + 1,
        day: startDay + round * daysBetweenRounds,
        divisionId,
        homeClubId: aHome ? a : b,
        awayClubId: aHome ? b : a,
        played: false,
        result: null,
        stage: 'league',
      })

      // Reverse fixture in the second half.
      fixtures.push({
        id: `${divisionId}-f${fixtureSeq++}`,
        round: roundsPerHalf + round + 1,
        day: startDay + (roundsPerHalf + round) * daysBetweenRounds,
        divisionId,
        homeClubId: aHome ? b : a,
        awayClubId: aHome ? a : b,
        played: false,
        result: null,
        stage: 'league',
      })
    }

    // Rotate all but the first team.
    teams.splice(1, 0, teams.pop() as string | null)
  }

  return fixtures.sort((x, y) => x.round - y.round)
}

export function emptyTable(clubIds: string[]): TableRow[] {
  return clubIds.map((clubId) => ({
    clubId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0,
  }))
}

/**
 * Build a table from played fixtures. Three points for a win, one for a draw.
 * A knockout shootout does not change the league points — league games that
 * finish level are simply draws.
 */
export function buildTable(clubIds: string[], fixtures: Fixture[]): TableRow[] {
  const rows = new Map<string, TableRow>(emptyTable(clubIds).map((r) => [r.clubId, r]))

  for (const fixture of fixtures) {
    if (!fixture.played || !fixture.result || fixture.stage !== 'league') continue
    const home = rows.get(fixture.homeClubId)
    const away = rows.get(fixture.awayClubId)
    if (!home || !away) continue

    const { homeGoals, awayGoals } = fixture.result
    home.played += 1
    away.played += 1
    home.goalsFor += homeGoals
    home.goalsAgainst += awayGoals
    away.goalsFor += awayGoals
    away.goalsAgainst += homeGoals

    if (homeGoals > awayGoals) {
      home.won += 1; home.points += 3; away.lost += 1
    } else if (awayGoals > homeGoals) {
      away.won += 1; away.points += 3; home.lost += 1
    } else {
      home.drawn += 1; home.points += 1
      away.drawn += 1; away.points += 1
    }
  }

  return sortTable([...rows.values()])
}

/** Points, then goal difference, then goals scored, then alphabetical by id for stability. */
export function sortTable(rows: TableRow[]): TableRow[] {
  return rows.slice().sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    const gdA = a.goalsFor - a.goalsAgainst
    const gdB = b.goalsFor - b.goalsAgainst
    if (gdB !== gdA) return gdB - gdA
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
    return a.clubId.localeCompare(b.clubId)
  })
}

export function goalDifference(row: TableRow): number {
  return row.goalsFor - row.goalsAgainst
}

/**
 * Premier Division title play-off: top four, 1v4 and 2v3, then a final.
 * Returns the semi-final fixtures; the final is created once they are played.
 */
export function createSemiFinals(divisionId: string, table: TableRow[], day: number): Fixture[] {
  const top4 = table.slice(0, 4)
  if (top4.length < 4) return []
  return [
    {
      id: `${divisionId}-sf1`, round: 999, day, divisionId,
      homeClubId: top4[0].clubId, awayClubId: top4[3].clubId,
      played: false, result: null, stage: 'semi-final',
    },
    {
      id: `${divisionId}-sf2`, round: 999, day, divisionId,
      homeClubId: top4[1].clubId, awayClubId: top4[2].clubId,
      played: false, result: null, stage: 'semi-final',
    },
  ]
}

export function createFinal(divisionId: string, semis: Fixture[], day: number): Fixture | null {
  const winners = semis.map(winnerOf).filter((id): id is string => id !== null)
  if (winners.length < 2) return null
  return {
    id: `${divisionId}-final`, round: 1000, day, divisionId,
    homeClubId: winners[0], awayClubId: winners[1],
    played: false, result: null, stage: 'final',
  }
}

/** Winner of a knockout tie, resolving a shootout if there was one. */
export function winnerOf(fixture: Fixture): string | null {
  if (!fixture.played || !fixture.result) return null
  const { homeGoals, awayGoals, shootout } = fixture.result
  if (homeGoals > awayGoals) return fixture.homeClubId
  if (awayGoals > homeGoals) return fixture.awayClubId
  if (shootout) {
    return shootout.homeGoals > shootout.awayGoals ? fixture.homeClubId : fixture.awayClubId
  }
  return null
}

export interface SeasonOutcome {
  /** Clubs going up, by division id they came from. */
  promoted: { clubId: string; fromDivisionId: string; toDivisionId: string }[]
  /** Clubs going down. */
  relegated: { clubId: string; fromDivisionId: string; toDivisionId: string }[]
  /** Play-off champion per division that has one. */
  champions: Record<string, string>
}

/**
 * Work out promotion and relegation across the pyramid.
 *
 * Each division's champions go up into the division above. Clubs finishing in
 * the relegation places drop into whichever division below covers their part of
 * the country — a club relegated from the Premier Division goes into Division
 * One North or South depending on where it actually plays, and the same split
 * applies again between Division One and the four Conferences.
 *
 * A division with nowhere to relegate to (the bottom of the modelled pyramid,
 * or a Conference whose area league is not modelled) simply keeps its clubs.
 */
export function resolvePromotionRelegation(
  divisions: Division[],
  tables: Record<string, TableRow[]>,
  clubRegion: (clubId: string) => Region,
  divisionRegions: (divisionId: string) => Region[],
  opts: { relegationCount?: number } = {},
): SeasonOutcome {
  const { relegationCount = 2 } = opts
  const outcome: SeasonOutcome = { promoted: [], relegated: [], champions: {} }

  for (const division of divisions) {
    const table = tables[division.id]
    if (!table || table.length === 0) continue

    if (division.promotesTo) {
      const winner = table[0]
      if (winner) {
        outcome.promoted.push({
          clubId: winner.clubId,
          fromDivisionId: division.id,
          toDivisionId: division.promotesTo,
        })
      }
    }

    if (division.relegatesTo && division.relegatesTo.length > 0) {
      const targets = division.relegatesTo
      for (const row of table.slice(-relegationCount)) {
        const region = clubRegion(row.clubId)
        // Prefer the division below that actually covers this club's region.
        const target = targets.find((id) => divisionRegions(id).includes(region)) ?? targets[0]
        outcome.relegated.push({
          clubId: row.clubId,
          fromDivisionId: division.id,
          toDivisionId: target,
        })
      }
    }
  }

  return outcome
}

/** Aggregate a division's played fixtures into headline numbers, for the season review. */
export function divisionSummary(fixtures: Fixture[]): {
  matches: number
  goals: number
  goalsPerGame: number
  cornerGoals: number
  cornerShare: number
} {
  let matches = 0
  let goals = 0
  let cornerGoals = 0

  for (const fixture of fixtures) {
    if (!fixture.played || !fixture.result) continue
    matches += 1
    goals += fixture.result.homeGoals + fixture.result.awayGoals
    cornerGoals += fixture.result.stats.home.cornerGoals + fixture.result.stats.away.cornerGoals
  }

  return {
    matches,
    goals,
    goalsPerGame: matches ? goals / matches : 0,
    cornerGoals,
    cornerShare: goals ? cornerGoals / goals : 0,
  }
}

/** Convenience for tests and the season review screen. */
export function resultLine(result: MatchResult): string {
  const base = `${result.homeGoals}-${result.awayGoals}`
  return result.shootout ? `${base} (${result.shootout.homeGoals}-${result.shootout.awayGoals} SO)` : base
}
