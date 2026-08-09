/**
 * Squad import tests.
 *
 * The whole point of the import path is that real identity survives it. If a
 * name, position or squad number gets mangled on the way in, the game is
 * quietly lying about being built on real data.
 */

import { describe, it, expect } from 'vitest'
import { Rng } from '../engine/rng'
import { buildSquadFromImport, normalisePosition, type ImportedSquad } from './squads'
import { overall } from '../engine/players'

const squad: ImportedSquad = {
  club: 'm-np:formby',
  source: 'test',
  players: [
    { firstName: 'Ada', lastName: 'Lovelace', position: 'CM', number: 8, age: 24, nationality: 'ENG' },
    { firstName: 'Grace', lastName: 'Hopper', position: 'goalkeeper', number: 1, age: 31 },
    { firstName: 'Alan', lastName: 'Turing', position: 'SW', number: 4, dragFlicker: true },
    { firstName: 'Karen', lastName: 'Sparck Jones', position: 'striker', number: 9, caps: 40 },
    { firstName: 'Edsger', lastName: 'Dijkstra', position: 'WG', number: 11, nationality: 'NED', rating: 78 },
  ],
}

const options = { clubId: 'm-np:formby', reputation: 36, gender: 'men' as const, university: false }

describe('position normalisation', () => {
  it('maps loose position names onto engine positions', () => {
    expect(normalisePosition('goalkeeper')).toBe('GK')
    expect(normalisePosition('Keeper')).toBe('GK')
    expect(normalisePosition('striker')).toBe('ST')
    expect(normalisePosition('midfielder')).toBe('CM')
    expect(normalisePosition('full back')).toBe('FB')
    expect(normalisePosition('GK')).toBe('GK')
  })

  it('falls back to centre midfield for anything unrecognised', () => {
    expect(normalisePosition('utility')).toBe('CM')
  })
})

describe('building a squad from imported data', () => {
  const built = buildSquadFromImport(new Rng('import'), squad, options)

  it('preserves every real name exactly', () => {
    for (const entry of squad.players) {
      const found = built.find(
        (p) => p.firstName === entry.firstName && p.lastName === entry.lastName,
      )
      expect(found, `${entry.firstName} ${entry.lastName} missing`).toBeDefined()
    }
  })

  it('preserves positions, numbers, ages, nationalities and caps', () => {
    const ada = built.find((p) => p.lastName === 'Lovelace')!
    expect(ada.position).toBe('CM')
    expect(ada.number).toBe(8)
    expect(ada.age).toBe(24)
    expect(ada.nationality).toBe('ENG')

    const grace = built.find((p) => p.lastName === 'Hopper')!
    expect(grace.position).toBe('GK')

    const karen = built.find((p) => p.lastName === 'Sparck Jones')!
    expect(karen.position).toBe('ST')
    expect(karen.caps).toBe(40)

    const edsger = built.find((p) => p.lastName === 'Dijkstra')!
    expect(edsger.nationality).toBe('NED')
  })

  it('marks imported players as real and padding as generated', () => {
    const ada = built.find((p) => p.lastName === 'Lovelace')!
    expect(ada.provenance).toBe('imported')

    const padded = built.filter((p) => p.provenance === 'generated')
    expect(padded.length).toBeGreaterThan(0)
    for (const player of padded) {
      expect(squad.players.some((e) => e.lastName === player.lastName && e.firstName === player.firstName))
        .toBe(false)
    }
  })

  it('honours an explicit rating hint', () => {
    const edsger = built.find((p) => p.lastName === 'Dijkstra')!
    // 78 was requested; position weighting means it will not land exactly there.
    expect(overall(edsger)).toBeGreaterThan(60)
  })

  it('gives a flagged specialist a real drag flick', () => {
    const alan = built.find((p) => p.lastName === 'Turing')!
    expect(alan.attributes.dragFlick).toBeGreaterThanOrEqual(8)
  })

  it('pads a short squad up to a legal size with two keepers', () => {
    expect(built.length).toBeGreaterThanOrEqual(16)
    expect(built.filter((p) => p.position === 'GK').length).toBeGreaterThanOrEqual(2)
  })

  it('never issues the same squad number twice', () => {
    const numbers = built.map((p) => p.number)
    expect(new Set(numbers).size).toBe(numbers.length)
  })

  it('applies explicit attribute overrides', () => {
    const withOverride = buildSquadFromImport(
      new Rng('override'),
      {
        club: 'm-np:formby',
        players: [{ firstName: 'Test', lastName: 'Player', position: 'ST', attributes: { pace: 19, finishing: 3 } }],
      },
      options,
    )
    const player = withOverride.find((p) => p.lastName === 'Player')!
    expect(player.attributes.pace).toBe(19)
    expect(player.attributes.finishing).toBe(3)
  })
})
