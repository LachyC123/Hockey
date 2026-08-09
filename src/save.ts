/**
 * Save and load.
 *
 * A season across the whole pyramid is roughly nine hundred matches, and each
 * result carries an event list and a per-player line. Storing all of that blows
 * past the browser's storage quota, so results for matches the manager was not
 * involved in are trimmed to their score and team totals — enough to rebuild
 * every league table exactly, without the commentary nobody will read.
 */

import type { GameState } from './engine/game'
import type { Fixture, MatchResult } from './engine/types'

const KEY = 'sideline.save.v1'

function trimResult(result: MatchResult): MatchResult {
  return { ...result, events: [], playerLines: {} }
}

function trimFixtures(fixtures: Fixture[], clubId: string): Fixture[] {
  return fixtures.map((fixture) => {
    const involved = fixture.homeClubId === clubId || fixture.awayClubId === clubId
    if (involved || !fixture.result) return fixture
    return { ...fixture, result: trimResult(fixture.result) }
  })
}

export function serialise(state: GameState): string {
  const fixtures: Record<string, Fixture[]> = {}
  for (const divisionId of Object.keys(state.fixtures)) {
    fixtures[divisionId] = trimFixtures(state.fixtures[divisionId], state.clubId)
  }
  const playoffs: Record<string, Fixture[]> = {}
  for (const divisionId of Object.keys(state.playoffs)) {
    playoffs[divisionId] = trimFixtures(state.playoffs[divisionId], state.clubId)
  }
  return JSON.stringify({ ...state, fixtures, playoffs })
}

export function saveGame(state: GameState): { ok: true } | { ok: false; error: string } {
  try {
    localStorage.setItem(KEY, serialise(state))
    return { ok: true }
  } catch (error) {
    // Quota errors are the realistic failure here; report rather than swallow.
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GameState
    // A save from an older build may be missing newer fields; treat as absent.
    if (!parsed.clubs || !parsed.players || !parsed.fixtures) return null
    return parsed
  } catch {
    return null
  }
}

export function hasSave(): boolean {
  try {
    return localStorage.getItem(KEY) !== null
  } catch {
    return false
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing useful to do if storage is unavailable.
  }
}
