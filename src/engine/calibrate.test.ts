/**
 * Calibration report.
 *
 * Not an assertion-heavy test — it prints the engine's aggregate output so the
 * numbers can be compared against what real England Hockey League matches look
 * like. Run with `npx vitest run calibrate` and read the table.
 */

import { describe, it } from 'vitest'
import { Rng } from './rng'
import { simulateMatch, type TeamSetup } from './match'
import { generateSquad } from './players'
import { autoLineup } from './game'
import { defaultTactics, type Club } from './types'

function setup(rng: Rng, id: string, reputation: number): TeamSetup {
  const club: Club = {
    id, name: id, shortName: id, abbr: 'XXX', town: 't', venue: 'v', region: 'north',
    founded: 1900, colours: { primary: '#000', secondary: '#fff', text: '#fff' },
    reputation, divisionId: 'd', university: false, finances: { balance: 0, income: 0 },
  }
  const players = generateSquad(rng, { clubId: id, reputation, gender: 'men', university: false })
  const tactics = defaultTactics()
  return { club, players, lineup: autoLineup(players, tactics), tactics }
}

describe('calibration report', () => {
  it('prints aggregate match statistics', () => {
    const rng = new Rng('report')
    const N = 500
    let goals = 0, cornerGoals = 0, strokeGoals = 0, corners = 0, entries = 0
    let shots = 0, onTarget = 0, saves = 0, greens = 0, yellows = 0, reds = 0
    let homeWins = 0, draws = 0, awayWins = 0
    const scoreline = new Map<string, number>()

    for (let i = 0; i < N; i++) {
      const home = setup(rng, `h${i}`, 84)
      const away = setup(rng, `a${i}`, 84)
      const r = simulateMatch(rng, home, away)

      goals += r.homeGoals + r.awayGoals
      cornerGoals += r.stats.home.cornerGoals + r.stats.away.cornerGoals
      strokeGoals += r.events.filter((e) => e.kind === 'goal-stroke').length
      corners += r.stats.home.penaltyCorners + r.stats.away.penaltyCorners
      entries += r.stats.home.circleEntries + r.stats.away.circleEntries
      shots += r.stats.home.shots + r.stats.away.shots
      onTarget += r.stats.home.shotsOnTarget + r.stats.away.shotsOnTarget
      saves += r.stats.home.saves + r.stats.away.saves
      greens += r.stats.home.greens + r.stats.away.greens
      yellows += r.stats.home.yellows + r.stats.away.yellows
      reds += r.stats.home.reds + r.stats.away.reds

      if (r.homeGoals > r.awayGoals) homeWins++
      else if (r.homeGoals < r.awayGoals) awayWins++
      else draws++

      const key = `${r.homeGoals}-${r.awayGoals}`
      scoreline.set(key, (scoreline.get(key) ?? 0) + 1)
    }

    const per = (n: number) => (n / N).toFixed(2)
    const top = [...scoreline.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)

    console.log(`
  ── Engine calibration over ${N} matches (two evenly matched Premier sides) ──
  goals per match          ${per(goals)}          real hockey ≈ 5-7
  corner goals per match   ${per(cornerGoals)}          share of all goals ${(cornerGoals / goals * 100).toFixed(1)}%  (real ≈ 30-40%)
  stroke goals per match   ${per(strokeGoals)}
  penalty corners          ${per(corners)}          real ≈ 8-12 combined
  circle entries           ${per(entries)}
  shots / on target        ${per(shots)} / ${per(onTarget)}   (${(onTarget / shots * 100).toFixed(0)}% on target)
  saves per match          ${per(saves)}
  cards g/y/r              ${per(greens)} / ${per(yellows)} / ${per(reds)}
  results H/D/A            ${(homeWins / N * 100).toFixed(0)}% / ${(draws / N * 100).toFixed(0)}% / ${(awayWins / N * 100).toFixed(0)}%
  common scorelines        ${top.map(([k, v]) => `${k} (${(v / N * 100).toFixed(0)}%)`).join(', ')}
`)
  })
})
