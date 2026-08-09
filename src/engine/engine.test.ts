/**
 * Engine tests.
 *
 * The important ones here are the calibration tests: a match engine that
 * produces football scorelines is wrong, however clean the code is. Field
 * hockey at this level runs to roughly five or six goals a game across both
 * sides, with something close to a third of them coming from penalty corners.
 */

import { describe, it, expect } from 'vitest'
import { Rng } from './rng'
import { simulateMatch, positionSlots, type TeamSetup } from './match'
import { generateSquad, ratingAt, overall } from './players'
import { generateFixtures, buildTable, sortTable, resolvePromotionRelegation } from './season'
import { newGame, advanceRound, advancePlayoffs, startNextSeason, autoLineup, tableFor } from './game'
import { defaultTactics, type Club, type Division, type TableRow } from './types'
import { CLUBS, DIVISIONS, clubsInDivision, getDivision } from '../data/clubs'

function makeClub(id: string, reputation: number): Club {
  return {
    id, name: id, shortName: id, abbr: id.slice(0, 3).toUpperCase(),
    town: 'Nowhere', venue: 'Nowhere Park', region: 'north', founded: 1900,
    colours: { primary: '#000', secondary: '#fff', text: '#fff' },
    reputation, divisionId: 'test', university: false,
    finances: { balance: 0, income: 0 },
  }
}

function makeSetup(rng: Rng, id: string, reputation: number): TeamSetup {
  const club = makeClub(id, reputation)
  const players = generateSquad(rng, {
    clubId: id, reputation, gender: 'men', university: false,
  })
  const tactics = defaultTactics()
  return { club, players, lineup: autoLineup(players, tactics), tactics }
}

describe('Rng', () => {
  it('is deterministic for a given seed', () => {
    const a = new Rng('formby')
    const b = new Rng('formby')
    const seqA = Array.from({ length: 50 }, () => a.next())
    const seqB = Array.from({ length: 50 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('produces different streams for different seeds', () => {
    const a = new Rng('formby')
    const b = new Rng('southport')
    expect(a.next()).not.toEqual(b.next())
  })

  it('can save and restore its state mid-stream', () => {
    const rng = new Rng('state')
    rng.next()
    const saved = rng.getState()
    const expected = [rng.next(), rng.next(), rng.next()]
    rng.setState(saved)
    expect([rng.next(), rng.next(), rng.next()]).toEqual(expected)
  })
})

describe('player generation', () => {
  it('rates players higher in their own position than out of it', () => {
    const rng = new Rng('positions')
    const squad = generateSquad(rng, {
      clubId: 'c', reputation: 80, gender: 'men', university: false,
    })
    const striker = squad.find((p) => p.position === 'ST')!
    expect(ratingAt(striker, 'ST')).toBeGreaterThan(ratingAt(striker, 'SW'))
  })

  it('does not put an outfielder in goal without a heavy penalty', () => {
    const rng = new Rng('keepers')
    const squad = generateSquad(rng, {
      clubId: 'c', reputation: 80, gender: 'men', university: false,
    })
    const outfielder = squad.find((p) => p.position === 'CM')!
    expect(ratingAt(outfielder, 'GK')).toBeLessThan(ratingAt(outfielder, 'CM') * 0.6)
  })

  it('scales squad quality with club reputation', () => {
    const rng = new Rng('quality')
    const strong = generateSquad(rng, { clubId: 'a', reputation: 95, gender: 'men', university: false })
    const weak = generateSquad(rng, { clubId: 'b', reputation: 30, gender: 'men', university: false })
    const avg = (squad: typeof strong) => squad.reduce((sum, p) => sum + overall(p), 0) / squad.length
    expect(avg(strong)).toBeGreaterThan(avg(weak) + 15)
  })

  it('makes drag flicking a specialism rather than a universal skill', () => {
    const rng = new Rng('flicks')
    const squad = generateSquad(rng, { clubId: 'c', reputation: 85, gender: 'men', university: false })
    const flickers = squad.filter((p) => p.attributes.dragFlick >= 4)
    expect(flickers.length).toBeGreaterThan(0)
    expect(flickers.length).toBeLessThan(squad.length / 2)
  })
})

describe('formation shapes', () => {
  it('always fills ten outfield slots', () => {
    expect(positionSlots(4, 3, 3)).toHaveLength(10)
    expect(positionSlots(3, 4, 3)).toHaveLength(10)
    expect(positionSlots(5, 3, 2)).toHaveLength(10)
  })

  it('puts a sweeper at the back of every shape', () => {
    expect(positionSlots(4, 3, 3)[0]).toBe('SW')
    expect(positionSlots(3, 3, 4)[0]).toBe('SW')
  })
})

describe('match engine calibration', () => {
  // One sample of 400 matches between evenly matched Premier Division sides.
  const rng = new Rng('calibration')
  const results = Array.from({ length: 400 }, (_, i) => {
    const home = makeSetup(rng, `home${i}`, 85)
    const away = makeSetup(rng, `away${i}`, 85)
    return simulateMatch(rng, home, away)
  })

  const totalGoals = results.reduce((sum, r) => sum + r.homeGoals + r.awayGoals, 0)
  const goalsPerGame = totalGoals / results.length

  it('produces a realistic number of goals per game', () => {
    // Elite field hockey runs around 5-7 total goals per match.
    expect(goalsPerGame).toBeGreaterThan(3.5)
    expect(goalsPerGame).toBeLessThan(8.5)
  })

  it('makes penalty corners a major source of goals', () => {
    const cornerGoals = results.reduce(
      (sum, r) => sum + r.stats.home.cornerGoals + r.stats.away.cornerGoals, 0,
    )
    const share = cornerGoals / totalGoals
    // Corners account for something in the region of a quarter to a half of goals.
    expect(share).toBeGreaterThan(0.15)
    expect(share).toBeLessThan(0.55)
  })

  it('awards a believable number of penalty corners per match', () => {
    const corners = results.reduce(
      (sum, r) => sum + r.stats.home.penaltyCorners + r.stats.away.penaltyCorners, 0,
    ) / results.length
    expect(corners).toBeGreaterThan(4)
    expect(corners).toBeLessThan(18)
  })

  it('keeps penalty strokes rare', () => {
    const strokes = results.reduce(
      (sum, r) => sum + r.stats.home.strokes + r.stats.away.strokes, 0,
    ) / results.length
    expect(strokes).toBeLessThan(1.2)
  })

  it('issues far more green cards than reds', () => {
    const greens = results.reduce((sum, r) => sum + r.stats.home.greens + r.stats.away.greens, 0)
    const reds = results.reduce((sum, r) => sum + r.stats.home.reds + r.stats.away.reds, 0)
    expect(greens).toBeGreaterThan(reds * 5)
  })

  it('gives the home side a small edge, not a decisive one', () => {
    const homeWins = results.filter((r) => r.homeGoals > r.awayGoals).length
    const awayWins = results.filter((r) => r.awayGoals > r.homeGoals).length
    expect(homeWins).toBeGreaterThan(awayWins)
    expect(homeWins).toBeLessThan(results.length * 0.62)
  })

  it('records possession as a complementary split', () => {
    for (const result of results.slice(0, 20)) {
      expect(result.stats.home.possession + result.stats.away.possession).toBe(100)
    }
  })
})

describe('match engine fairness', () => {
  it('lets the stronger side win clearly more often', () => {
    const rng = new Rng('strength')
    let strongWins = 0
    let weakWins = 0
    for (let i = 0; i < 200; i++) {
      const strong = makeSetup(rng, `strong${i}`, 95)
      const weak = makeSetup(rng, `weak${i}`, 45)
      const result = simulateMatch(rng, strong, weak)
      if (result.homeGoals > result.awayGoals) strongWins++
      if (result.awayGoals > result.homeGoals) weakWins++
    }
    expect(strongWins).toBeGreaterThan(weakWins * 3)
  })

  it('does not produce a fixed result for the same two clubs', () => {
    const rng = new Rng('variance')
    const scores = new Set<string>()
    for (let i = 0; i < 30; i++) {
      const home = makeSetup(rng, 'h', 80)
      const away = makeSetup(rng, 'a', 80)
      const result = simulateMatch(rng, home, away)
      scores.add(`${result.homeGoals}-${result.awayGoals}`)
    }
    expect(scores.size).toBeGreaterThan(6)
  })

  it('always resolves a knockout tie when a shootout is allowed', () => {
    const rng = new Rng('shootout')
    for (let i = 0; i < 60; i++) {
      const home = makeSetup(rng, `h${i}`, 80)
      const away = makeSetup(rng, `a${i}`, 80)
      const result = simulateMatch(rng, home, away, { allowShootout: true })
      if (result.homeGoals === result.awayGoals) {
        expect(result.shootout).not.toBeNull()
        expect(result.shootout!.homeGoals).not.toBe(result.shootout!.awayGoals)
      }
    }
  })

  it('rates every player who actually took the pitch', () => {
    const rng = new Rng('ratings')
    const home = makeSetup(rng, 'h', 80)
    const away = makeSetup(rng, 'a', 80)
    const result = simulateMatch(rng, home, away)
    const lines = Object.values(result.playerLines)
    expect(lines.length).toBeGreaterThanOrEqual(22)
    for (const line of lines) {
      expect(line.rating).toBeGreaterThanOrEqual(1)
      expect(line.rating).toBeLessThanOrEqual(10)
      expect(line.minutes).toBeGreaterThan(0)
    }
  })

  it('uses rolling substitutions, so the bench gets minutes', () => {
    const rng = new Rng('subs')
    const home = makeSetup(rng, 'h', 80)
    home.tactics.rotation = 'heavy'
    const away = makeSetup(rng, 'a', 80)
    const result = simulateMatch(rng, home, away)
    const benchWithMinutes = home.lineup.bench.filter((id) => (result.playerLines[id]?.minutes ?? 0) > 0)
    expect(benchWithMinutes.length).toBeGreaterThan(0)
  })
})

describe('tactics have consequences', () => {
  const sample = (configure: (setup: TeamSetup) => void, seed: string) => {
    const rng = new Rng(seed)
    let entries = 0
    let conceded = 0
    for (let i = 0; i < 120; i++) {
      const home = makeSetup(rng, `h${i}`, 78)
      const away = makeSetup(rng, `a${i}`, 78)
      configure(home)
      const result = simulateMatch(rng, home, away)
      entries += result.stats.home.circleEntries
      conceded += result.awayGoals
    }
    return { entries: entries / 120, conceded: conceded / 120 }
  }

  it('makes an all-out attacking shape create more and concede more', () => {
    const attacking = sample((s) => { s.tactics.formation = '3-3-4'; s.tactics.tempo = 'fast' }, 'atk')
    const defensive = sample((s) => { s.tactics.formation = '5-3-2'; s.tactics.tempo = 'slow' }, 'def')
    expect(attacking.entries).toBeGreaterThan(defensive.entries)
    expect(attacking.conceded).toBeGreaterThan(defensive.conceded)
  })

  it('makes aggressive tackling cost cards', () => {
    const rng = new Rng('cards')
    let aggressive = 0
    let contain = 0
    for (let i = 0; i < 120; i++) {
      const a = makeSetup(rng, `a${i}`, 75)
      a.tactics.aggression = 'aggressive'
      const b = makeSetup(rng, `b${i}`, 75)
      b.tactics.aggression = 'contain'
      const result = simulateMatch(rng, a, b)
      aggressive += result.stats.home.greens + result.stats.home.yellows + result.stats.home.reds
      contain += result.stats.away.greens + result.stats.away.yellows + result.stats.away.reds
    }
    expect(aggressive).toBeGreaterThan(contain)
  })

  it('rewards a drag-flick routine when the club has a specialist', () => {
    const rng = new Rng('flick-routine')
    let withFlicker = 0
    let without = 0
    for (let i = 0; i < 150; i++) {
      const home = makeSetup(rng, `h${i}`, 82)
      const away = makeSetup(rng, `a${i}`, 82)

      // Give the home side an elite flicker and use the routine.
      const candidate = home.players.find((p) => p.position === 'SW')!
      candidate.attributes.dragFlick = 19
      candidate.attributes.cornerCraft = 18
      home.lineup = autoLineup(home.players, home.tactics)
      home.lineup.flickerId = candidate.id
      home.tactics.cornerRoutine = 'drag-flick'
      away.tactics.cornerRoutine = 'straight-strike'

      const result = simulateMatch(rng, home, away)
      withFlicker += result.stats.home.cornerGoals
      without += result.stats.away.cornerGoals
    }
    expect(withFlicker).toBeGreaterThan(without)
  })
})

describe('fixtures and tables', () => {
  it('gives every club a home and away game against every other', () => {
    const rng = new Rng('fixtures')
    const clubIds = ['a', 'b', 'c', 'd', 'e', 'f']
    const fixtures = generateFixtures(rng, 'test', clubIds)

    expect(fixtures).toHaveLength(clubIds.length * (clubIds.length - 1))

    for (const home of clubIds) {
      for (const away of clubIds) {
        if (home === away) continue
        const matches = fixtures.filter((f) => f.homeClubId === home && f.awayClubId === away)
        expect(matches).toHaveLength(1)
      }
    }
  })

  it('gives every club the same number of games', () => {
    const rng = new Rng('balance')
    const clubIds = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l']
    const fixtures = generateFixtures(rng, 'test', clubIds)
    for (const id of clubIds) {
      const played = fixtures.filter((f) => f.homeClubId === id || f.awayClubId === id)
      expect(played).toHaveLength((clubIds.length - 1) * 2)
    }
  })

  it('handles an odd number of clubs with byes', () => {
    const rng = new Rng('odd')
    const clubIds = ['a', 'b', 'c', 'd', 'e']
    const fixtures = generateFixtures(rng, 'test', clubIds)
    expect(fixtures).toHaveLength(clubIds.length * (clubIds.length - 1))
  })

  it('sorts a table on points, then goal difference, then goals scored', () => {
    const rows: TableRow[] = [
      { clubId: 'a', played: 2, won: 1, drawn: 0, lost: 1, goalsFor: 3, goalsAgainst: 3, points: 3 },
      { clubId: 'b', played: 2, won: 1, drawn: 0, lost: 1, goalsFor: 6, goalsAgainst: 6, points: 3 },
      { clubId: 'c', played: 2, won: 2, drawn: 0, lost: 0, goalsFor: 4, goalsAgainst: 1, points: 6 },
      { clubId: 'd', played: 2, won: 0, drawn: 0, lost: 2, goalsFor: 1, goalsAgainst: 4, points: 0 },
    ]
    const sorted = sortTable(rows)
    expect(sorted.map((r) => r.clubId)).toEqual(['c', 'b', 'a', 'd'])
  })

  it('awards three points for a win and one for a draw', () => {
    const fixtures = [
      {
        id: 'f1', round: 1, day: 0, divisionId: 'test', homeClubId: 'a', awayClubId: 'b',
        played: true, stage: 'league' as const,
        result: {
          homeGoals: 3, awayGoals: 1, shootout: null, events: [], playerLines: {},
          stats: { home: blankStats(), away: blankStats() },
        },
      },
      {
        id: 'f2', round: 2, day: 7, divisionId: 'test', homeClubId: 'b', awayClubId: 'a',
        played: true, stage: 'league' as const,
        result: {
          homeGoals: 2, awayGoals: 2, shootout: null, events: [], playerLines: {},
          stats: { home: blankStats(), away: blankStats() },
        },
      },
    ]
    const table = buildTable(['a', 'b'], fixtures)
    const a = table.find((r) => r.clubId === 'a')!
    const b = table.find((r) => r.clubId === 'b')!
    expect(a.points).toBe(4)
    expect(b.points).toBe(1)
    expect(a.goalsFor).toBe(5)
    expect(a.goalsAgainst).toBe(3)
  })
})

function blankStats() {
  return {
    circleEntries: 0, shots: 0, shotsOnTarget: 0, penaltyCorners: 0, cornerGoals: 0,
    strokes: 0, possession: 50, greens: 0, yellows: 0, reds: 0, saves: 0,
  }
}

describe('club data', () => {
  it('covers the pyramid from the Premier Division to the North Premier Division', () => {
    const tiers = new Set(DIVISIONS.map((d) => d.tier))
    expect([...tiers].sort()).toEqual([1, 2, 3, 4])
  })

  it('includes Formby in the North Premier Division', () => {
    const northPremier = clubsInDivision('m-np')
    const formby = northPremier.find((c) => c.shortName === 'Formby')
    expect(formby).toBeDefined()
    expect(formby!.town).toContain('Formby')
    expect(getDivision('m-np').tier).toBe(4)
  })

  it('gives every club a unique id', () => {
    const ids = CLUBS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('places every club in a division that exists', () => {
    const divisionIds = new Set(DIVISIONS.map((d) => d.id))
    for (const club of CLUBS) {
      expect(divisionIds.has(club.divisionId)).toBe(true)
    }
  })

  it('gives every division at least ten clubs', () => {
    for (const division of DIVISIONS) {
      expect(clubsInDivision(division.id).length).toBeGreaterThanOrEqual(10)
    }
  })

  it('wires promotion so every division leads up to the Premier Division', () => {
    for (const division of DIVISIONS) {
      let current: Division | undefined = division
      let hops = 0
      while (current?.promotesTo && hops < 10) {
        current = DIVISIONS.find((d) => d.id === current!.promotesTo)
        hops++
      }
      expect(current?.tier).toBe(1)
      expect(current?.gender).toBe(division.gender)
    }
  })

  it('only relegates into a division of the same gender and a lower tier', () => {
    for (const division of DIVISIONS) {
      for (const targetId of division.relegatesTo ?? []) {
        const target = DIVISIONS.find((d) => d.id === targetId)!
        expect(target).toBeDefined()
        expect(target.gender).toBe(division.gender)
        expect(target.tier).toBeGreaterThan(division.tier)
      }
    }
  })
})

describe('promotion and relegation', () => {
  it('sends clubs down into the division that covers their region', () => {
    const divisions = DIVISIONS.filter((d) => d.id === 'm-prem')
    const table: TableRow[] = ['a', 'b', 'c', 'd'].map((clubId, i) => ({
      clubId, played: 10, won: 10 - i * 3, drawn: 0, lost: i * 3,
      goalsFor: 20, goalsAgainst: 10, points: 30 - i * 9,
    }))
    const regions: Record<string, 'north' | 'south'> = { a: 'north', b: 'north', c: 'north', d: 'south' }

    const outcome = resolvePromotionRelegation(
      divisions,
      { 'm-prem': table },
      (clubId) => regions[clubId],
      (divisionId) => DIVISIONS.find((d) => d.id === divisionId)?.regions ?? [],
    )

    expect(outcome.relegated).toHaveLength(2)
    const d = outcome.relegated.find((r) => r.clubId === 'd')!
    expect(d.toDivisionId).toBe('m-d1s')
    const c = outcome.relegated.find((r) => r.clubId === 'c')!
    expect(c.toDivisionId).toBe('m-d1n')
  })
})

describe('a full season', () => {
  it('plays out, produces a champion, and rolls into the next season', () => {
    const state = newGame({ seed: 'season-test', gender: 'men', clubId: 'm-np:formby' })

    expect(state.clubs[state.clubId].shortName).toBe('Formby')
    expect(state.totalRounds).toBeGreaterThan(15)

    while (state.phase === 'league') {
      advanceRound(state)
    }
    while (state.phase === 'playoffs') {
      advancePlayoffs(state)
    }
    expect(state.phase).toBe('complete')

    // Every league fixture in the pyramid should now be played.
    for (const divisionId of Object.keys(state.fixtures)) {
      const unplayed = state.fixtures[divisionId].filter((f) => !f.played)
      expect(unplayed).toHaveLength(0)
    }

    // The table must add up: games played equals fixtures involving that club.
    const table = tableFor(state, 'm-np')
    for (const row of table) {
      expect(row.played).toBe(row.won + row.drawn + row.lost)
      expect(row.points).toBe(row.won * 3 + row.drawn)
    }
    expect(table[0].points).toBeGreaterThan(table[table.length - 1].points)

    // Players should have accumulated stats.
    const squad = state.players[state.clubId]
    const appearances = squad.reduce((sum, p) => sum + p.seasonStats.appearances, 0)
    expect(appearances).toBeGreaterThan(100)

    expect(state.history).toHaveLength(1)

    const seasonOne = state.season
    startNextSeason(state)
    expect(state.season).toBe(seasonOne + 1)
    expect(state.round).toBe(0)
    expect(state.phase).toBe('league')
    for (const clubId of Object.keys(state.players)) {
      expect(state.players[clubId].length).toBeGreaterThanOrEqual(16)
      expect(state.players[clubId].filter((p) => p.position === 'GK').length).toBeGreaterThanOrEqual(2)
      expect(state.players[clubId].every((p) => p.seasonStats.appearances === 0)).toBe(true)
    }
  })

  it('is reproducible from the same seed', () => {
    const run = () => {
      const state = newGame({ seed: 'repro', gender: 'women', clubId: 'w-np:formby' })
      for (let i = 0; i < 6; i++) advanceRound(state)
      return tableFor(state, 'w-np').map((r) => `${r.clubId}:${r.points}:${r.goalsFor}`)
    }
    expect(run()).toEqual(run())
  })

  it('lets a manager start at any level of the pyramid', () => {
    for (const clubId of ['m-prem:surbiton', 'm-cn:leek', 'm-np:formby', 'w-prem:reading']) {
      const gender = clubId.startsWith('w-') ? 'women' : 'men'
      const state = newGame({ seed: `start-${clubId}`, gender, clubId })
      expect(state.clubs[state.clubId]).toBeDefined()
      const fixtures = state.fixtures[state.clubs[clubId].divisionId]
      expect(fixtures.length).toBeGreaterThan(0)
      advanceRound(state)
      expect(state.round).toBe(1)
    }
  })
})
