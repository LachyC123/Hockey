import { useMemo, useState } from 'react'
import type { GameState } from '../engine/game'
import { pyramid } from '../engine/game'
import { getDivision } from '../data/clubs'
import type { Player } from '../engine/types'
import { fullName } from '../engine/players'
import { Panel, Empty, PositionPill } from './components'

type Board = 'scorers' | 'corners' | 'assists' | 'keepers' | 'ratings' | 'cards'

const BOARDS: { key: Board; label: string; note: string }[] = [
  { key: 'scorers', label: 'Goals', note: 'Leading scorers in all competitions.' },
  { key: 'corners', label: 'Corners', note: 'Goals scored from penalty corners — the drag flickers and strikers of the division.' },
  { key: 'assists', label: 'Assists', note: 'Players creating goals for others.' },
  { key: 'keepers', label: 'Keepers', note: 'Ranked on clean sheets, then saves.' },
  { key: 'ratings', label: 'Ratings', note: 'Average match rating, minimum five appearances.' },
  { key: 'cards', label: 'Cards', note: 'Green, yellow and red cards accumulated.' },
]

export function StatsScreen({ state }: { state: GameState }) {
  const userDivision = state.clubs[state.clubId].divisionId
  const [divisionId, setDivisionId] = useState(userDivision)
  const [board, setBoard] = useState<Board>('scorers')

  const divisions = pyramid(state)

  const players = useMemo(() => {
    const clubIds = state.divisionMembers[divisionId] ?? []
    return clubIds.flatMap((clubId) => state.players[clubId] ?? [])
  }, [state, divisionId])

  const ranked = useMemo(() => rank(players, board), [players, board])
  const active = BOARDS.find((b) => b.key === board)!

  return (
    <>
      <Panel title="Division">
        <select
          className="choice"
          style={{ width: '100%', textAlign: 'left', padding: '10px 11px', color: 'var(--text)' }}
          value={divisionId}
          onChange={(event) => setDivisionId(event.target.value)}
        >
          {divisions.map((division) => (
            <option key={division.id} value={division.id}>
              Tier {division.tier} — {division.name}
            </option>
          ))}
        </select>
      </Panel>

      <div className="choice-grid">
        {BOARDS.map((option) => (
          <button
            key={option.key}
            type="button"
            className={`choice ${board === option.key ? 'on' : ''}`}
            onClick={() => setBoard(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <Panel title={`${getDivision(divisionId).name} · ${active.label}`} flush>
        {ranked.length === 0 && <Empty>No numbers yet — play some matches.</Empty>}
        {ranked.map((entry, index) => (
          <div
            className="row"
            key={entry.player.id}
            style={entry.player.clubId === state.clubId
              ? { background: 'rgba(53, 208, 127, 0.07)' }
              : undefined}
          >
            <span className="pos" style={{ width: 20, color: 'var(--text-faint)', fontSize: 12 }}>
              {index + 1}
            </span>
            <PositionPill position={entry.player.position} />
            <div className="row-main">
              <div className="row-title">{fullName(entry.player)}</div>
              <div className="row-sub">
                {state.clubs[entry.player.clubId]?.shortName} · {entry.detail}
              </div>
            </div>
            <div className="row-right">
              <span className="rating hi">{entry.value}</span>
            </div>
          </div>
        ))}
      </Panel>

      <div className="note">{active.note}</div>
    </>
  )
}

interface Entry {
  player: Player
  value: string
  detail: string
}

function rank(players: Player[], board: Board): Entry[] {
  const withApps = players.filter((p) => p.seasonStats.appearances > 0)

  switch (board) {
    case 'scorers':
      return withApps
        .filter((p) => p.seasonStats.goals > 0)
        .sort((a, b) => b.seasonStats.goals - a.seasonStats.goals)
        .slice(0, 25)
        .map((player) => ({
          player,
          value: String(player.seasonStats.goals),
          detail: `${player.seasonStats.appearances} apps · ${player.seasonStats.fieldGoals} open play, ${player.seasonStats.cornerGoals} corners`,
        }))

    case 'corners':
      return withApps
        .filter((p) => p.seasonStats.cornerGoals > 0)
        .sort((a, b) => b.seasonStats.cornerGoals - a.seasonStats.cornerGoals)
        .slice(0, 25)
        .map((player) => ({
          player,
          value: String(player.seasonStats.cornerGoals),
          detail: `drag flick ${player.attributes.dragFlick} · ${player.seasonStats.goals} goals total`,
        }))

    case 'assists':
      return withApps
        .filter((p) => p.seasonStats.assists > 0)
        .sort((a, b) => b.seasonStats.assists - a.seasonStats.assists)
        .slice(0, 25)
        .map((player) => ({
          player,
          value: String(player.seasonStats.assists),
          detail: `${player.seasonStats.appearances} apps`,
        }))

    case 'keepers':
      return withApps
        .filter((p) => p.position === 'GK')
        .sort((a, b) =>
          b.seasonStats.cleanSheets - a.seasonStats.cleanSheets
          || b.seasonStats.saves - a.seasonStats.saves)
        .slice(0, 25)
        .map((player) => ({
          player,
          value: String(player.seasonStats.cleanSheets),
          detail: `${player.seasonStats.saves} saves · ${player.seasonStats.goalsConceded} conceded`,
        }))

    case 'ratings':
      return withApps
        .filter((p) => p.seasonStats.appearances >= 5)
        .sort((a, b) =>
          (b.seasonStats.ratingSum / b.seasonStats.appearances)
          - (a.seasonStats.ratingSum / a.seasonStats.appearances))
        .slice(0, 25)
        .map((player) => ({
          player,
          value: (player.seasonStats.ratingSum / player.seasonStats.appearances).toFixed(2),
          detail: `${player.seasonStats.appearances} apps`,
        }))

    case 'cards':
      return withApps
        .map((player) => ({
          player,
          points: player.seasonStats.greenCards + player.seasonStats.yellowCards * 2 + player.seasonStats.redCards * 5,
        }))
        .filter((entry) => entry.points > 0)
        .sort((a, b) => b.points - a.points)
        .slice(0, 25)
        .map(({ player }) => ({
          player,
          value: String(
            player.seasonStats.greenCards + player.seasonStats.yellowCards + player.seasonStats.redCards,
          ),
          detail: `${player.seasonStats.greenCards}G ${player.seasonStats.yellowCards}Y ${player.seasonStats.redCards}R · discipline ${player.attributes.discipline}`,
        }))
  }
}
