import type { GameState } from '../engine/game'
import type { Fixture } from '../engine/types'
import { fullName } from '../engine/players'
import { Crest, Panel, Empty } from './components'

const EVENT_CLASS: Record<string, string> = {
  'goal-field': 'goal',
  'goal-corner': 'goal',
  'goal-stroke': 'goal',
  quarter: 'quarter',
  green: 'card-green',
  yellow: 'card-yellow',
  red: 'card-red',
}

/** Full match report: scoreline, timeline, team stats and the best performers. */
export function MatchScreen({
  state, fixture, onClose,
}: {
  state: GameState
  fixture: Fixture
  onClose: () => void
}) {
  const result = fixture.result
  const home = state.clubs[fixture.homeClubId]
  const away = state.clubs[fixture.awayClubId]

  if (!result) {
    return (
      <div className="modal-backdrop" onClick={onClose} role="presentation">
        <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog">
          <Empty>This match has not been played.</Empty>
        </div>
      </div>
    )
  }

  const allPlayers = [
    ...(state.players[fixture.homeClubId] ?? []),
    ...(state.players[fixture.awayClubId] ?? []),
  ]
  const byId = new Map(allPlayers.map((p) => [p.id, p]))

  const performers = Object.values(result.playerLines)
    .filter((line) => byId.has(line.playerId))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 6)

  const hasDetail = result.events.length > 0

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="modal-head">
          <div className="row-main">
            <div className="row-title">
              {fixture.stage && fixture.stage !== 'league'
                ? fixture.stage === 'final' ? 'Final' : 'Semi-final'
                : `Round ${fixture.round}`}
            </div>
            <div className="row-sub">{home.venue}</div>
          </div>
          <button type="button" className="btn sm ghost" onClick={onClose}>Close</button>
        </div>

        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="scoreline">
            <div className="side">
              <Crest club={home} size="lg" />
              <span className="nm">{home.shortName}</span>
            </div>
            <div className="score">{result.homeGoals}–{result.awayGoals}</div>
            <div className="side">
              <Crest club={away} size="lg" />
              <span className="nm">{away.shortName}</span>
            </div>
          </div>

          {result.shootout && (
            <div className="center note">
              Won {result.shootout.homeGoals}–{result.shootout.awayGoals} on shootout by{' '}
              {result.shootout.homeGoals > result.shootout.awayGoals ? home.shortName : away.shortName}
            </div>
          )}

          <Panel title="Match stats">
            <StatRow label="Possession" home={`${result.stats.home.possession}%`} away={`${result.stats.away.possession}%`} />
            <StatRow label="Circle entries" home={result.stats.home.circleEntries} away={result.stats.away.circleEntries} />
            <StatRow label="Shots" home={result.stats.home.shots} away={result.stats.away.shots} />
            <StatRow label="On target" home={result.stats.home.shotsOnTarget} away={result.stats.away.shotsOnTarget} />
            <StatRow label="Penalty corners" home={result.stats.home.penaltyCorners} away={result.stats.away.penaltyCorners} />
            <StatRow label="Corner goals" home={result.stats.home.cornerGoals} away={result.stats.away.cornerGoals} />
            <StatRow label="Strokes" home={result.stats.home.strokes} away={result.stats.away.strokes} />
            <StatRow label="Saves" home={result.stats.home.saves} away={result.stats.away.saves} />
            <StatRow
              label="Cards"
              home={cardSummary(result.stats.home)}
              away={cardSummary(result.stats.away)}
            />
          </Panel>

          {hasDetail ? (
            <Panel title="Timeline" flush>
              <div className="timeline">
                {result.events
                  // Saves are in the stats; listing every one buries the goals.
                  .filter((event) => event.kind !== 'save')
                  .map((event, index) => (
                    <div className={`tl-item ${EVENT_CLASS[event.kind] ?? ''}`} key={index}>
                      <span className="tl-min">
                        {event.kind === 'quarter' ? '' : `${event.minute}'`}
                      </span>
                      <span className="tl-text">{event.text}</span>
                    </div>
                  ))}
              </div>
            </Panel>
          ) : (
            <div className="note">
              Detailed commentary is only kept for your own matches, to stay inside the
              browser's storage limit.
            </div>
          )}

          {performers.length > 0 && (
            <Panel title="Best on the pitch" flush>
              {performers.map((line) => {
                const player = byId.get(line.playerId)!
                return (
                  <div className="row" key={line.playerId}>
                    <div className="row-main">
                      <div className="row-title">{fullName(player)}</div>
                      <div className="row-sub">
                        {state.clubs[player.clubId]?.shortName} · {line.minutes} mins
                        {line.goals > 0 && ` · ${line.goals} goal${line.goals > 1 ? 's' : ''}`}
                        {line.assists > 0 && ` · ${line.assists} assist${line.assists > 1 ? 's' : ''}`}
                        {line.saves > 0 && ` · ${line.saves} saves`}
                      </div>
                    </div>
                    <span className="rating hi">{line.rating.toFixed(1)}</span>
                  </div>
                )
              })}
            </Panel>
          )}

          <button type="button" className="btn primary wide" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}

function cardSummary(stats: { greens: number; yellows: number; reds: number }): string {
  const parts: string[] = []
  if (stats.greens) parts.push(`${stats.greens}G`)
  if (stats.yellows) parts.push(`${stats.yellows}Y`)
  if (stats.reds) parts.push(`${stats.reds}R`)
  return parts.length ? parts.join(' ') : '—'
}

function StatRow({ label, home, away }: { label: string; home: string | number; away: string | number }) {
  const h = typeof home === 'number' ? home : parseFloat(home) || 0
  const a = typeof away === 'number' ? away : parseFloat(away) || 0
  const total = h + a
  const homePct = total > 0 ? (h / total) * 100 : 50

  return (
    <div style={{ marginBottom: 10 }}>
      <div className="split tiny" style={{ marginBottom: 4 }}>
        <strong>{home}</strong>
        <span className="muted">{label}</span>
        <strong>{away}</strong>
      </div>
      <div style={{ display: 'flex', gap: 3, height: 4 }}>
        <div style={{ flex: homePct, background: 'var(--accent)', borderRadius: 2 }} />
        <div style={{ flex: 100 - homePct, background: 'var(--line)', borderRadius: 2 }} />
      </div>
    </div>
  )
}
