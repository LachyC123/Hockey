import { useState } from 'react'
import type { GameState } from '../engine/game'
import { tableFor, pyramid, userFixtures } from '../engine/game'
import { getDivision } from '../data/clubs'
import type { Fixture } from '../engine/types'
import { Crest, Panel, Empty } from './components'

export function LeagueScreen({
  state, onViewMatch, onAdvance,
}: {
  state: GameState
  onViewMatch: (fixture: Fixture) => void
  onAdvance: () => void
}) {
  const userDivisionId = state.clubs[state.clubId].divisionId
  const [divisionId, setDivisionId] = useState(userDivisionId)
  const [view, setView] = useState<'table' | 'fixtures' | 'history'>('table')

  const divisions = pyramid(state)
  const division = getDivision(divisionId)
  const table = tableFor(state, divisionId)
  const playoffs = state.playoffs[divisionId] ?? []

  // Promotion and relegation places, so the table reads at a glance.
  const promotionPlaces = division.promotesTo ? 1 : 0
  const relegationPlaces = division.relegatesTo?.length ? 2 : 0

  return (
    <>
      <div className="choice-grid">
        {(['table', 'fixtures', 'history'] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={`choice ${view === option ? 'on' : ''}`}
            onClick={() => setView(option)}
          >
            {option === 'table' ? 'Table' : option === 'fixtures' ? 'Fixtures' : 'History'}
          </button>
        ))}
      </div>

      {view !== 'history' && (
        <Panel title="Division">
          <select
            className="choice"
            style={{ width: '100%', textAlign: 'left', padding: '10px 11px', color: 'var(--text)' }}
            value={divisionId}
            onChange={(event) => setDivisionId(event.target.value)}
          >
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                Tier {d.tier} — {d.name}
              </option>
            ))}
          </select>
        </Panel>
      )}

      {view === 'table' && (
        <>
          <Panel title={division.name} flush>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', paddingLeft: 10 }}>#</th>
                    <th>Club</th>
                    <th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th>
                    <th style={{ paddingRight: 11 }}>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((row, index) => {
                    const club = state.clubs[row.clubId]
                    if (!club) return null
                    const classes = [
                      row.clubId === state.clubId ? 'you' : '',
                      index < promotionPlaces ? 'promo' : '',
                      index >= table.length - relegationPlaces ? 'releg' : '',
                    ].filter(Boolean).join(' ')
                    return (
                      <tr key={row.clubId} className={classes}>
                        <td className="pos">{index + 1}</td>
                        <td>
                          <div className="club-cell">
                            <Crest club={club} size="sm" />
                            <span className="club-name">{club.shortName}</span>
                          </div>
                        </td>
                        <td>{row.played}</td>
                        <td>{row.won}</td>
                        <td>{row.drawn}</td>
                        <td>{row.lost}</td>
                        <td>{row.goalsFor}</td>
                        <td>{row.goalsAgainst}</td>
                        <td>{formatDiff(row.goalsFor - row.goalsAgainst)}</td>
                        <td className="pts">{row.points}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="note">
            {division.promotesTo && <>Champions promoted to the {getDivision(division.promotesTo).name}. </>}
            {division.relegatesTo?.length
              ? <>Bottom two relegated to the {division.relegatesTo.map((id) => getDivision(id).name).join(' or ')}, by region.</>
              : <>No division below this one is modelled, so nobody is relegated.</>}
          </div>

          {playoffs.length > 0 && (
            <Panel title="Title play-offs" flush>
              {playoffs.map((tie) => (
                <button
                  key={tie.id}
                  type="button"
                  className="row tap"
                  onClick={() => tie.played && onViewMatch(tie)}
                >
                  <div className="row-main">
                    <div className="row-title">
                      {state.clubs[tie.homeClubId]?.shortName} v {state.clubs[tie.awayClubId]?.shortName}
                    </div>
                    <div className="row-sub">{tie.stage === 'final' ? 'Final' : 'Semi-final'}</div>
                  </div>
                  <div className="row-right">
                    {tie.played && tie.result
                      ? <strong>{tie.result.homeGoals}–{tie.result.awayGoals}</strong>
                      : <span className="muted tiny">To play</span>}
                  </div>
                </button>
              ))}
            </Panel>
          )}

          {state.phase === 'complete' && (
            <button type="button" className="btn primary wide" onClick={onAdvance}>
              Start season {state.season + 1}
            </button>
          )}
        </>
      )}

      {view === 'fixtures' && (
        <Panel title="Fixtures" flush>
          <FixtureList state={state} divisionId={divisionId} onViewMatch={onViewMatch} />
        </Panel>
      )}

      {view === 'history' && (
        <Panel title="Your record" flush>
          {state.history.length === 0 && <Empty>No completed seasons yet.</Empty>}
          {state.history.slice().reverse().map((record) => (
            <div className="row" key={record.season}>
              <div className="row-main">
                <div className="row-title">
                  Season {record.season} — {record.position}
                  {ordinal(record.position)} in the {record.divisionName}
                </div>
                <div className="row-sub">
                  {record.won}W {record.drawn}D {record.lost}L · {record.points} pts ·{' '}
                  {record.goalsFor}:{record.goalsAgainst}
                  {record.playoffResult && ` · play-offs: ${record.playoffResult}`}
                </div>
              </div>
            </div>
          ))}
        </Panel>
      )}
    </>
  )
}

function FixtureList({
  state, divisionId, onViewMatch,
}: {
  state: GameState
  divisionId: string
  onViewMatch: (fixture: Fixture) => void
}) {
  const userDivision = state.clubs[state.clubId].divisionId
  const list = divisionId === userDivision
    ? userFixtures(state)
    : (state.fixtures[divisionId] ?? []).filter((f) => f.round <= state.round + 2)

  if (list.length === 0) return <Empty>No fixtures.</Empty>

  return (
    <>
      {list.map((fixture) => {
        const home = state.clubs[fixture.homeClubId]
        const away = state.clubs[fixture.awayClubId]
        if (!home || !away) return null
        return (
          <button
            key={fixture.id}
            type="button"
            className="row tap"
            onClick={() => fixture.played && onViewMatch(fixture)}
            disabled={!fixture.played}
          >
            <span className="pill flat" style={{ minWidth: 30, textAlign: 'center' }}>
              {fixture.stage && fixture.stage !== 'league' ? 'PO' : fixture.round}
            </span>
            <div className="row-main">
              <div className="row-title">{home.shortName} v {away.shortName}</div>
              <div className="row-sub">{home.venue}</div>
            </div>
            <div className="row-right">
              {fixture.played && fixture.result ? (
                <strong>{fixture.result.homeGoals}–{fixture.result.awayGoals}</strong>
              ) : (
                <span className="muted tiny">—</span>
              )}
            </div>
          </button>
        )
      })}
    </>
  )
}

function formatDiff(n: number): string {
  return n > 0 ? `+${n}` : `${n}`
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th'
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
}
