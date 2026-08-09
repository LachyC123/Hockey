/**
 * Save-size and squad-realism guards.
 *
 * A full season across the pyramid is nearly nine hundred matches. If every
 * result kept its commentary the save would blow past the browser's storage
 * quota partway through a season and the game would silently stop saving, so
 * the size is asserted rather than assumed.
 */

import { describe, it, expect } from 'vitest'
import { newGame, advanceRound, advancePlayoffs } from './engine/game'
import { serialise } from './save'

/** Conservative floor for localStorage across browsers. */
const QUOTA_BYTES = 5 * 1024 * 1024

describe('save size', () => {
  it('keeps a completed season well inside the browser storage quota', () => {
    const state = newGame({ seed: 'save-size', gender: 'men', clubId: 'm-np:formby' })
    while (state.phase === 'league') advanceRound(state)
    while (state.phase === 'playoffs') advancePlayoffs(state)

    const bytes = serialise(state).length
    // Headroom for a second season's history and a longer news feed.
    expect(bytes).toBeLessThan(QUOTA_BYTES * 0.6)
  })

  it('keeps the manager\'s own match commentary but drops everyone else\'s', () => {
    const state = newGame({ seed: 'save-trim', gender: 'men', clubId: 'm-np:formby' })
    advanceRound(state)

    const restored = JSON.parse(serialise(state)) as typeof state
    const divisionId = state.clubs[state.clubId].divisionId
    const played = restored.fixtures[divisionId].filter((f) => f.played)

    const mine = played.find(
      (f) => f.homeClubId === state.clubId || f.awayClubId === state.clubId,
    )
    const theirs = played.find(
      (f) => f.homeClubId !== state.clubId && f.awayClubId !== state.clubId,
    )

    expect(mine?.result?.events.length).toBeGreaterThan(0)
    expect(theirs?.result?.events).toHaveLength(0)
    // The score must survive, or the league table would be wrong on reload.
    expect(theirs?.result?.homeGoals).toBeGreaterThanOrEqual(0)
  })
})

describe('squad realism', () => {
  it('keeps lower-tier squads overwhelmingly domestic', () => {
    // A club league side in Merseyside should not be a quarter Dutch.
    const state = newGame({ seed: 'nationality', gender: 'men', clubId: 'm-np:formby' })
    const squad = state.players['m-np:formby']
    const overseas = squad.filter(
      (p) => !['ENG', 'WAL', 'SCO', 'IRL'].includes(p.nationality),
    )
    expect(overseas.length / squad.length).toBeLessThan(0.1)
  })

  it('allows more overseas players at the top of the pyramid', () => {
    const state = newGame({ seed: 'nationality-prem', gender: 'men', clubId: 'm-prem:surbiton' })
    const topClubs = (state.divisionMembers['m-prem'] ?? []).flatMap((id) => state.players[id])
    const bottomClubs = (state.divisionMembers['m-np'] ?? []).flatMap((id) => state.players[id])

    const overseasShare = (players: typeof topClubs) =>
      players.filter((p) => !['ENG', 'WAL', 'SCO', 'IRL'].includes(p.nationality)).length
      / players.length

    expect(overseasShare(topClubs)).toBeGreaterThan(overseasShare(bottomClubs) + 0.05)
  })
})
