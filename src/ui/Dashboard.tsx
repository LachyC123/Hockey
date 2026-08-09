import type { GameState } from '../engine/game'
import { nextUserFixture, userFixtures, tableFor } from '../engine/game'
import { getDivision } from '../data/clubs'
import { overall } from '../engine/players'
import { Crest, Panel, KeyValue, Empty } from './components'
import type { Fixture } from '../engine/types'

function formOf(state: GameState): string[] {
  return userFixtures(state)
    .filter((f) => f.played && f.result)
    .slice(-5)
    .map((f) => {
      const home = f.homeClubId === state.clubId
      const us = home ? f.result!.homeGoals : f.result!.awayGoals
      const them = home ? f.result!.awayGoals : f.result!.homeGoals
      return us > them ? 'W' : us < them ? 'L' : 'D'
    })
}

function FormPips({ form }: { form: string[] }) {
  if (form.length === 0) return <span className="muted tiny">No games played</span>
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {form.map((r, i) => (
        <span
          key={i}
          className="pill"
          style={{
            width: 22, textAlign: 'center', padding: '2px 0',
            background: r === 'W' ? 'rgba(53,208,127,0.18)' : r === 'L' ? 'rgba(244,97,79,0.16)' : 'var(--panel-2)',
            color: r === 'W' ? 'var(--accent)' : r === 'L' ? 'var(--danger)' : 'var(--text-dim)',
            borderColor: 'transparent',
          }}
        >
          {r}
        </span>
      ))}
    </div>
  )
}

export function Dashboard({
  state, onPlay, onViewMatch,
}: {
  state: GameState
  onPlay: () => void
  onViewMatch: (fixture: Fixture) => void
}) {
  const club = state.clubs[state.clubId]
  const division = getDivision(club.divisionId)
  const table = tableFor(state, club.divisionId)
  const position = table.findIndex((r) => r.clubId === state.clubId) + 1
  const row = table.find((r) => r.clubId === state.clubId)
  const fixture = nextUserFixture(state)
  const played = userFixtures(state).filter((f) => f.played)
  const last = played[played.length - 1]

  const squad = state.players[state.clubId] ?? []
  const available = squad.filter((p) => !p.injury && p.banMatches === 0)
  const unavailable = squad.length - available.length
  const bestPlayer = squad.length
    ? squad.reduce((a, b) => (overall(b) > overall(a) ? b : a))
    : null

  return (
    <>
      <Panel title="League position">
        <div className="kv-grid">
          {/* Before a ball is kicked every club is on nil, so a position is meaningless. */}
          <KeyValue
            label="Position"
            value={position > 0 && (row?.played ?? 0) > 0 ? `${position}${ordinal(position)}` : '—'}
          />
          <KeyValue label="Points" value={row?.points ?? 0} />
          <KeyValue label="Played" value={row?.played ?? 0} />
          <KeyValue
            label="Goal diff"
            value={row ? formatDiff(row.goalsFor - row.goalsAgainst) : '0'}
          />
        </div>
        <div className="split" style={{ marginTop: 12 }}>
          <span className="tiny muted">Form</span>
          <FormPips form={formOf(state)} />
        </div>
      </Panel>

      <Panel title={state.phase === 'playoffs' ? 'Play-offs' : 'Next fixture'}>
        {fixture ? (
          <>
            <div className="scoreline">
              <div className="side">
                <Crest club={state.clubs[fixture.homeClubId]} size="lg" />
                <span className="nm">{state.clubs[fixture.homeClubId].shortName}</span>
              </div>
              <div className="score" style={{ fontSize: 20, color: 'var(--text-dim)' }}>v</div>
              <div className="side">
                <Crest club={state.clubs[fixture.awayClubId]} size="lg" />
                <span className="nm">{state.clubs[fixture.awayClubId].shortName}</span>
              </div>
            </div>
            <div className="center tiny muted" style={{ marginBottom: 12 }}>
              Round {fixture.round} · {state.clubs[fixture.homeClubId].venue}
            </div>
            <button type="button" className="btn primary wide" onClick={onPlay}>
              Play match
            </button>
          </>
        ) : state.phase === 'complete' ? (
          <Empty>Season complete. Start the next one from the League tab.</Empty>
        ) : (
          <>
            <Empty>No league fixture left — the play-offs decide the title.</Empty>
            <button type="button" className="btn primary wide" onClick={onPlay}>
              Continue
            </button>
          </>
        )}
      </Panel>

      {last?.result && (
        <Panel title="Last result" flush>
          <button type="button" className="row tap" onClick={() => onViewMatch(last)}>
            <Crest club={state.clubs[last.homeClubId]} size="sm" />
            <div className="row-main">
              <div className="row-title">
                {state.clubs[last.homeClubId].shortName} {last.result.homeGoals}–
                {last.result.awayGoals} {state.clubs[last.awayClubId].shortName}
              </div>
              <div className="row-sub">
                {last.result.stats.home.penaltyCorners + last.result.stats.away.penaltyCorners} penalty corners · tap for the full report
              </div>
            </div>
          </button>
        </Panel>
      )}

      <Panel title="Squad">
        <div className="kv-grid">
          <KeyValue label="Players" value={squad.length} />
          <KeyValue label="Unavailable" value={unavailable} />
          <KeyValue
            label="Avg rating"
            value={squad.length
              ? Math.round(squad.reduce((sum, p) => sum + overall(p), 0) / squad.length)
              : 0}
          />
          <KeyValue label="Reputation" value={club.reputation} />
        </div>
        {bestPlayer && (
          <div className="note" style={{ marginTop: 11 }}>
            Star player: <strong>{bestPlayer.firstName} {bestPlayer.lastName}</strong> ({bestPlayer.position})
          </div>
        )}
      </Panel>

      <Panel title="Club" >
        <div className="note">
          <strong>{club.name}</strong><br />
          {club.town} · {club.venue}
          {club.founded && <> · founded {club.founded}</>}<br />
          {division.name} (tier {division.tier})
        </div>
      </Panel>

      {state.news.length > 0 && (
        <Panel title="News" flush>
          {state.news.slice(-8).reverse().map((item, index) => (
            <div className="row" key={index}>
              <div className="row-main">
                <div className="row-sub" style={{ color: 'var(--text)' }}>{item.text}</div>
                <div className="row-sub">Season {item.season}{item.round ? ` · round ${item.round}` : ''}</div>
              </div>
            </div>
          ))}
        </Panel>
      )}
    </>
  )
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th'
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
}

function formatDiff(n: number): string {
  return n > 0 ? `+${n}` : `${n}`
}
