import { useCallback, useEffect, useState } from 'react'
import type { GameState } from './engine/game'
import {
  newGame, advanceRound, advancePlayoffs, startNextSeason, nextUserFixture,
} from './engine/game'
import { getDivision } from './data/clubs'
import type { Fixture, Gender } from './engine/types'
import { loadGame, saveGame, clearSave } from './save'
import { Crest } from './ui/components'
import { ClubSelect } from './ui/ClubSelect'
import { Dashboard } from './ui/Dashboard'
import { SquadScreen } from './ui/SquadScreen'
import { TacticsScreen } from './ui/TacticsScreen'
import { LeagueScreen } from './ui/LeagueScreen'
import { StatsScreen } from './ui/StatsScreen'
import { DataScreen } from './ui/DataScreen'
import { MatchScreen } from './ui/MatchScreen'

type Tab = 'home' | 'squad' | 'tactics' | 'league' | 'stats' | 'data'

const TABS: { key: Tab; label: string; icon: JSX.Element }[] = [
  { key: 'home', label: 'Club', icon: <IconHome /> },
  { key: 'squad', label: 'Squad', icon: <IconSquad /> },
  { key: 'tactics', label: 'Tactics', icon: <IconTactics /> },
  { key: 'league', label: 'League', icon: <IconLeague /> },
  { key: 'stats', label: 'Stats', icon: <IconStats /> },
  { key: 'data', label: 'Data', icon: <IconData /> },
]

export function App() {
  const [state, setState] = useState<GameState | null>(null)
  const [tab, setTab] = useState<Tab>('home')
  const [viewing, setViewing] = useState<Fixture | null>(null)
  const [booted, setBooted] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Restore a save on first load.
  useEffect(() => {
    setState(loadGame())
    setBooted(true)
  }, [])

  // Persist after every change. Failures surface rather than disappearing.
  useEffect(() => {
    if (!state) return
    const result = saveGame(state)
    setSaveError(result.ok ? null : result.error)
  }, [state])

  const mutate = useCallback((apply: (draft: GameState) => void) => {
    setState((current) => {
      if (!current) return current
      // The engine mutates in place, so clone the wrapper to trigger a render.
      const draft: GameState = { ...current }
      apply(draft)
      return draft
    })
  }, [])

  const start = (gender: Gender, clubId: string) => {
    const fresh = newGame({ gender, clubId })
    setState(fresh)
    setTab('home')
  }

  const play = () => {
    if (!state) return
    if (state.phase === 'league') {
      const before = nextUserFixture(state)
      mutate((draft) => {
        advanceRound(draft)
      })
      // Show the report for the match just played.
      if (before) {
        setState((current) => {
          if (!current) return current
          const played = (current.fixtures[getDivision(current.clubs[current.clubId].divisionId).id] ?? [])
            .find((f) => f.id === before.id)
          if (played?.played) setViewing(played)
          return current
        })
      }
    } else if (state.phase === 'playoffs') {
      mutate((draft) => {
        advancePlayoffs(draft)
      })
    }
  }

  const nextSeason = () => {
    mutate((draft) => {
      startNextSeason(draft)
    })
    setTab('home')
  }

  const quit = () => {
    clearSave()
    setState(null)
    setTab('home')
  }

  if (!booted) {
    return <div className="loading">Loading…</div>
  }

  if (!state) {
    return <ClubSelect onStart={start} />
  }

  const club = state.clubs[state.clubId]
  const division = getDivision(club.divisionId)

  return (
    <div className="app">
      <header className="topbar">
        <Crest club={club} />
        <div className="topbar-titles">
          <div className="topbar-title">{club.name}</div>
          <div className="topbar-sub">
            {division.name} · Season {state.season}
            {state.phase === 'league' && ` · Round ${state.round}/${state.totalRounds}`}
            {state.phase === 'playoffs' && ' · Play-offs'}
            {state.phase === 'complete' && ' · Season complete'}
          </div>
        </div>
      </header>

      <main className="content">
        {saveError && (
          <div className="panel" style={{ borderColor: 'var(--danger)' }}>
            <div className="panel-body note" style={{ color: 'var(--danger)' }}>
              Could not save progress: {saveError}
            </div>
          </div>
        )}

        {tab === 'home' && (
          <Dashboard state={state} onPlay={play} onViewMatch={setViewing} />
        )}
        {tab === 'squad' && <SquadScreen state={state} />}
        {tab === 'tactics' && <TacticsScreen state={state} onChange={mutate} />}
        {tab === 'league' && (
          <LeagueScreen state={state} onViewMatch={setViewing} onAdvance={nextSeason} />
        )}
        {tab === 'stats' && <StatsScreen state={state} />}
        {tab === 'data' && <DataScreen state={state} onQuit={quit} />}
      </main>

      <nav className="tabbar">
        <div className="tabbar-inner">
          {TABS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              className={`tab ${tab === entry.key ? 'active' : ''}`}
              onClick={() => setTab(entry.key)}
            >
              {entry.icon}
              <span>{entry.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {viewing && (
        <MatchScreen state={state} fixture={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ icons */

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" />
    </svg>
  )
}
function IconSquad() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <circle cx="17.5" cy="9.5" r="2.4" /><path d="M15 20a5 5 0 0 1 6.9-4.6" />
    </svg>
  )
}
function IconTactics() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3.5" width="18" height="17" rx="2" /><path d="M3 12h18" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  )
}
function IconLeague() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />
    </svg>
  )
}
function IconStats() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 20V11" /><path d="M12 20V4" /><path d="M19 20v-6" />
    </svg>
  )
}
function IconData() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="6" rx="7.5" ry="3" /><path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6" />
      <path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" />
    </svg>
  )
}
