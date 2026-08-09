import { useMemo, useState } from 'react'
import type { GameState } from '../engine/game'
import type { Player, AttributeKey } from '../engine/types'
import {
  TECHNICAL_ATTRS, PHYSICAL_ATTRS, MENTAL_ATTRS, KEEPER_ATTRS, ATTRIBUTE_LABELS,
} from '../engine/types'
import { overall, ratingAt, fullName } from '../engine/players'
import { Panel, PlayerRow, Rating, Bar, Empty, PositionPill } from './components'

type SortKey = 'rating' | 'position' | 'age' | 'goals' | 'apps'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'rating', label: 'Rating' },
  { key: 'position', label: 'Position' },
  { key: 'age', label: 'Age' },
  { key: 'goals', label: 'Goals' },
  { key: 'apps', label: 'Apps' },
]

const POSITION_ORDER = ['GK', 'SW', 'FB', 'HB', 'CM', 'AM', 'WG', 'ST']

export function SquadScreen({ state }: { state: GameState }) {
  const squad = state.players[state.clubId] ?? []
  const [sort, setSort] = useState<SortKey>('rating')
  const [selected, setSelected] = useState<Player | null>(null)

  const sorted = useMemo(() => {
    const list = squad.slice()
    switch (sort) {
      case 'position':
        return list.sort((a, b) =>
          POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position)
          || overall(b) - overall(a))
      case 'age':
        return list.sort((a, b) => a.age - b.age)
      case 'goals':
        return list.sort((a, b) => b.seasonStats.goals - a.seasonStats.goals)
      case 'apps':
        return list.sort((a, b) => b.seasonStats.appearances - a.seasonStats.appearances)
      default:
        return list.sort((a, b) => overall(b) - overall(a))
    }
  }, [squad, sort])

  const importedCount = squad.filter((p) => p.provenance === 'imported').length

  return (
    <>
      <div className="choice-grid">
        {SORTS.map((option) => (
          <button
            key={option.key}
            type="button"
            className={`choice ${sort === option.key ? 'on' : ''}`}
            onClick={() => setSort(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <Panel title={`Squad · ${squad.length} players`} flush>
        {sorted.length === 0 && <Empty>No players.</Empty>}
        {sorted.map((player) => (
          <PlayerRow
            key={player.id}
            player={player}
            onClick={() => setSelected(player)}
            right={
              sort === 'goals'
                ? <span className="rating">{player.seasonStats.goals}</span>
                : sort === 'apps'
                  ? <span className="rating">{player.seasonStats.appearances}</span>
                  : sort === 'age'
                    ? <span className="rating">{player.age}</span>
                    : <Rating value={overall(player)} />
            }
          />
        ))}
      </Panel>

      <div className="note">
        {importedCount > 0
          ? `${importedCount} of ${squad.length} players came from imported real squad data.`
          : 'These squads are generated. Import real squads to replace them — see the Data tab.'}
      </div>

      {selected && <PlayerDetail player={selected} onClose={() => setSelected(null)} />}
    </>
  )
}

function AttrList({ player, keys }: { player: Player; keys: AttributeKey[] }) {
  return (
    <div className="attr-grid">
      {keys.map((key) => {
        const value = player.attributes[key]
        return (
          <div className="attr" key={key}>
            <span className="attr-name">{ATTRIBUTE_LABELS[key]}</span>
            <span className={`attr-val ${value >= 15 ? 'hi' : value <= 7 ? 'lo' : ''}`}>{value}</span>
          </div>
        )
      })}
    </div>
  )
}

function PlayerDetail({ player, onClose }: { player: Player; onClose: () => void }) {
  const stats = player.seasonStats
  const avgRating = stats.appearances > 0 ? (stats.ratingSum / stats.appearances).toFixed(2) : '—'
  const isKeeper = player.position === 'GK'

  // Show where else this player could sensibly be used.
  const alternatives = POSITION_ORDER
    .filter((p) => p !== player.position && p !== 'GK' && !isKeeper)
    .map((p) => ({ position: p, rating: ratingAt(player, p as Player['position']) }))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3)

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="modal-head">
          <PositionPill position={player.position} />
          <div className="row-main">
            <div className="row-title">
              {fullName(player)}{' '}
              {player.provenance === 'imported' && <span className="badge-real">REAL</span>}
            </div>
            <div className="row-sub">
              #{player.number} · {player.age} years · {player.nationality}
              {player.caps > 0 && ` · ${player.caps} caps`}
            </div>
          </div>
          <Rating value={overall(player)} />
        </div>

        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div className="split tiny muted"><span>Condition</span><span>{Math.round(player.condition)}%</span></div>
            <Bar value={player.condition} />
            <div className="split tiny muted" style={{ marginTop: 8 }}><span>Match sharpness</span><span>{Math.round(player.sharpness)}%</span></div>
            <Bar value={player.sharpness} />
            <div className="split tiny muted" style={{ marginTop: 8 }}><span>Morale</span><span>{Math.round(player.morale)}%</span></div>
            <Bar value={player.morale} />
          </div>

          {player.injury && (
            <div className="note" style={{ color: 'var(--danger)' }}>
              Injured: {player.injury.name} — out for {player.injury.matches} match
              {player.injury.matches === 1 ? '' : 'es'}.
            </div>
          )}
          {player.banMatches > 0 && (
            <div className="note" style={{ color: 'var(--danger)' }}>
              Suspended for {player.banMatches} match{player.banMatches === 1 ? '' : 'es'}.
            </div>
          )}

          <div>
            <div className="section-title" style={{ marginBottom: 8 }}>This season</div>
            <div className="kv-grid">
              <div className="kv"><div className="kv-label">Apps</div><div className="kv-value">{stats.appearances}</div></div>
              <div className="kv"><div className="kv-label">Goals</div><div className="kv-value">{stats.goals}</div></div>
              <div className="kv"><div className="kv-label">Assists</div><div className="kv-value">{stats.assists}</div></div>
              <div className="kv"><div className="kv-label">Avg rating</div><div className="kv-value">{avgRating}</div></div>
            </div>
            {stats.goals > 0 && (
              <div className="note" style={{ marginTop: 9 }}>
                {stats.fieldGoals} from open play · {stats.cornerGoals} from penalty corners
                {stats.strokeGoals > 0 && ` · ${stats.strokeGoals} from strokes`}
              </div>
            )}
            {isKeeper && stats.appearances > 0 && (
              <div className="note" style={{ marginTop: 9 }}>
                {stats.saves} saves · {stats.goalsConceded} conceded · {stats.cleanSheets} clean sheets
              </div>
            )}
            {(stats.greenCards + stats.yellowCards + stats.redCards) > 0 && (
              <div className="note" style={{ marginTop: 9 }}>
                Cards: {stats.greenCards} green · {stats.yellowCards} yellow · {stats.redCards} red
              </div>
            )}
          </div>

          {isKeeper && (
            <div>
              <div className="section-title" style={{ marginBottom: 8 }}>Goalkeeping</div>
              <AttrList player={player} keys={KEEPER_ATTRS} />
            </div>
          )}

          <div>
            <div className="section-title" style={{ marginBottom: 8 }}>Technical</div>
            <AttrList player={player} keys={TECHNICAL_ATTRS} />
          </div>
          <div>
            <div className="section-title" style={{ marginBottom: 8 }}>Physical</div>
            <AttrList player={player} keys={PHYSICAL_ATTRS} />
          </div>
          <div>
            <div className="section-title" style={{ marginBottom: 8 }}>Mental</div>
            <AttrList player={player} keys={MENTAL_ATTRS} />
          </div>

          {alternatives.length > 0 && (
            <div>
              <div className="section-title" style={{ marginBottom: 8 }}>Other positions</div>
              <div className="note">
                {alternatives.map((alt) => `${alt.position} ${Math.round(alt.rating)}`).join(' · ')}
                {player.secondary.length > 0 && ` — trained at ${player.secondary.join(', ')}`}
              </div>
            </div>
          )}

          <button type="button" className="btn wide" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
