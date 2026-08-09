import { useState } from 'react'
import type { GameState } from '../engine/game'
import { autoLineup, reconcileLineup } from '../engine/game'
import { positionSlots } from '../engine/match'
import type { Formation, Player, Position, Tactics, TrainingPlan } from '../engine/types'
import { FORMATIONS } from '../engine/types'
import { effectiveRating, overall, shortName } from '../engine/players'
import { Panel, PlayerRow, Rating, Empty } from './components'

const OPTIONS: {
  key: keyof Tactics
  label: string
  note: string
  values: { value: string; label: string }[]
}[] = [
  {
    key: 'press', label: 'Press', note: 'A high press wins the ball back further up the pitch, but it drains legs and leaves space behind for the counter.',
    values: [
      { value: 'high', label: 'High' }, { value: 'mid', label: 'Mid block' }, { value: 'low', label: 'Low' },
    ],
  },
  {
    key: 'tempo', label: 'Tempo', note: 'Playing fast creates more circle entries and more turnovers on the way there.',
    values: [
      { value: 'slow', label: 'Slow' }, { value: 'balanced', label: 'Balanced' }, { value: 'fast', label: 'Fast' },
    ],
  },
  {
    key: 'width', label: 'Width', note: 'Going wide hunts the baseline and wins more penalty corners.',
    values: [
      { value: 'narrow', label: 'Narrow' }, { value: 'balanced', label: 'Balanced' }, { value: 'wide', label: 'Wide' },
    ],
  },
  {
    key: 'cornerRoutine', label: 'Penalty corner routine', note: 'A drag flick is the highest-percentage option, but only with someone who can actually flick. Variations create more rebounds.',
    values: [
      { value: 'drag-flick', label: 'Drag flick' }, { value: 'straight-strike', label: 'Straight strike' }, { value: 'variation', label: 'Variation' },
    ],
  },
  {
    key: 'aggression', label: 'Tackling', note: 'Aggressive tackling wins more balls and collects more green and yellow cards. Being a player down for ten minutes of a sixty-minute game hurts.',
    values: [
      { value: 'contain', label: 'Contain' }, { value: 'balanced', label: 'Balanced' }, { value: 'aggressive', label: 'Aggressive' },
    ],
  },
  {
    key: 'rotation', label: 'Rolling substitutions', note: 'Hockey has unlimited substitutions. Rotating heavily keeps legs fresh late on but breaks up rhythm and leans on your bench.',
    values: [
      { value: 'minimal', label: 'Minimal' }, { value: 'balanced', label: 'Balanced' }, { value: 'heavy', label: 'Heavy' },
    ],
  },
]

const TRAINING_FOCUS: { value: TrainingPlan['focus']; label: string }[] = [
  { value: 'fitness', label: 'Fitness' },
  { value: 'technical', label: 'Technical' },
  { value: 'set-pieces', label: 'Set pieces' },
  { value: 'defensive-shape', label: 'Defensive shape' },
  { value: 'attacking-play', label: 'Attacking play' },
  { value: 'recovery', label: 'Recovery' },
]

export function TacticsScreen({
  state, onChange,
}: {
  state: GameState
  onChange: (mutate: (draft: GameState) => void) => void
}) {
  const squad = state.players[state.clubId] ?? []
  const [swapSlot, setSwapSlot] = useState<number | null>(null)

  const lineup = state.lineup
  const shape = FORMATIONS[state.tactics.formation]
  const slots: Position[] = ['GK', ...positionSlots(shape.def, shape.mid, shape.fwd)]

  const byId = new Map(squad.map((p) => [p.id, p]))
  const starters = lineup.starting.map((id) => byId.get(id)).filter((p): p is Player => Boolean(p))

  const setTactic = (key: keyof Tactics, value: string) => {
    onChange((draft) => {
      draft.tactics = { ...draft.tactics, [key]: value } as Tactics
      // Changing formation invalidates the slot mapping, so re-pick the eleven.
      if (key === 'formation') {
        draft.lineup = autoLineup(draft.players[draft.clubId] ?? [], draft.tactics)
      }
    })
  }

  const swapIn = (slotIndex: number, playerId: string) => {
    onChange((draft) => {
      const starting = draft.lineup.starting.slice()
      const bench = draft.lineup.bench.slice()
      const outgoing = starting[slotIndex]
      const benchIndex = bench.indexOf(playerId)

      if (benchIndex >= 0) {
        bench[benchIndex] = outgoing
      } else {
        // Swapping two starters.
        const other = starting.indexOf(playerId)
        if (other >= 0) starting[other] = outgoing
      }
      starting[slotIndex] = playerId
      draft.lineup = { ...draft.lineup, starting, bench }
    })
    setSwapSlot(null)
  }

  return (
    <>
      <Panel title="Formation">
        <div className="choice-grid">
          {(Object.keys(FORMATIONS) as Formation[]).map((formation) => (
            <button
              key={formation}
              type="button"
              className={`choice ${state.tactics.formation === formation ? 'on' : ''}`}
              onClick={() => setTactic('formation', formation)}
            >
              {formation}
            </button>
          ))}
        </div>
        <div className="field-note">{shape.note}</div>
      </Panel>

      <Panel
        title="Starting eleven"
        action={
          <button
            type="button"
            className="btn sm ghost"
            onClick={() => onChange((draft) => {
              draft.lineup = autoLineup(draft.players[draft.clubId] ?? [], draft.tactics)
            })}
          >
            Auto pick
          </button>
        }
      >
        <PitchView
          state={state}
          slots={slots}
          starters={starters}
          onSlotTap={(index) => setSwapSlot(index)}
        />
        <div className="field-note">
          Tap a shirt to change who plays there. Ratings shown are for that position — a
          midfielder pushed to full back will read lower than his own.
        </div>
      </Panel>

      <Panel title="Set-piece duties">
        <DutyPicker
          label="Drag flicker"
          note="Takes penalty corners when the routine is set to drag flick."
          players={starters}
          value={lineup.flickerId}
          rank={(p) => p.attributes.dragFlick}
          suffix={(p) => `flick ${p.attributes.dragFlick}`}
          onPick={(id) => onChange((draft) => { draft.lineup = { ...draft.lineup, flickerId: id } })}
        />
        <DutyPicker
          label="Penalty stroke"
          note="Steps up for strokes."
          players={starters}
          value={lineup.strokeTakerId}
          rank={(p) => p.attributes.composure * 1.4 + p.attributes.finishing}
          suffix={(p) => `composure ${p.attributes.composure}`}
          onPick={(id) => onChange((draft) => { draft.lineup = { ...draft.lineup, strokeTakerId: id } })}
        />
        <DutyPicker
          label="Captain"
          note="Leads the side and steadies morale."
          players={starters}
          value={lineup.captainId}
          rank={(p) => p.attributes.leadership}
          suffix={(p) => `leadership ${p.attributes.leadership}`}
          onPick={(id) => onChange((draft) => { draft.lineup = { ...draft.lineup, captainId: id } })}
        />
      </Panel>

      {OPTIONS.map((option) => (
        <Panel key={option.key} title={option.label}>
          <div className="choice-grid">
            {option.values.map((choice) => (
              <button
                key={choice.value}
                type="button"
                className={`choice ${state.tactics[option.key] === choice.value ? 'on' : ''}`}
                onClick={() => setTactic(option.key, choice.value)}
              >
                {choice.label}
              </button>
            ))}
          </div>
          <div className="field-note">{option.note}</div>
        </Panel>
      ))}

      <Panel title="Training">
        <div className="field">
          <div className="field-label">Weekly focus</div>
          <div className="choice-grid">
            {TRAINING_FOCUS.map((focus) => (
              <button
                key={focus.value}
                type="button"
                className={`choice ${state.training.focus === focus.value ? 'on' : ''}`}
                onClick={() => onChange((draft) => { draft.training = { ...draft.training, focus: focus.value } })}
              >
                {focus.label}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <div className="field-label">Intensity</div>
          <div className="choice-grid">
            {(['light', 'normal', 'hard'] as const).map((intensity) => (
              <button
                key={intensity}
                type="button"
                className={`choice ${state.training.intensity === intensity ? 'on' : ''}`}
                onClick={() => onChange((draft) => { draft.training = { ...draft.training, intensity } })}
              >
                {intensity[0].toUpperCase() + intensity.slice(1)}
              </button>
            ))}
          </div>
          <div className="field-note">
            Hard weeks develop players faster but drain condition and carry a real injury risk.
            Young players improve far more readily than those past about 28.
          </div>
        </div>
      </Panel>

      {swapSlot !== null && (
        <SwapModal
          state={state}
          slot={slots[swapSlot]}
          currentId={lineup.starting[swapSlot]}
          onPick={(id) => swapIn(swapSlot, id)}
          onClose={() => setSwapSlot(null)}
        />
      )}
    </>
  )
}

function PitchView({
  state, slots, starters, onSlotTap,
}: {
  state: GameState
  slots: Position[]
  starters: Player[]
  onSlotTap: (index: number) => void
}) {
  const club = state.clubs[state.clubId]

  // Group slot indices into lines by unit, keeper at the back.
  const lines: number[][] = [[], [], [], []]
  slots.forEach((slot, index) => {
    if (slot === 'GK') lines[0].push(index)
    else if (slot === 'SW' || slot === 'FB' || slot === 'HB') lines[1].push(index)
    else if (slot === 'CM' || slot === 'AM') lines[2].push(index)
    else lines[3].push(index)
  })

  return (
    <div className="formation-pitch">
      {lines.map((line, lineIndex) => (
        <div className="formation-line" key={lineIndex}>
          {line.map((slotIndex) => {
            const player = starters[slotIndex]
            const slot = slots[slotIndex]
            return (
              <button
                key={slotIndex}
                type="button"
                className="formation-slot"
                onClick={() => onSlotTap(slotIndex)}
              >
                <div
                  className="formation-shirt"
                  style={{
                    background: club.colours.primary,
                    color: club.colours.text,
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)',
                  }}
                >
                  {player?.number ?? '—'}
                </div>
                <div className="formation-name">{player ? shortName(player) : 'Empty'}</div>
                <div className="tiny" style={{ color: 'var(--text-faint)' }}>
                  {slot} {player ? Math.round(effectiveRating(player, slot)) : ''}
                </div>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function DutyPicker({
  label, note, players, value, rank, suffix, onPick,
}: {
  label: string
  note: string
  players: Player[]
  value: string | null
  rank: (p: Player) => number
  suffix: (p: Player) => string
  onPick: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const current = players.find((p) => p.id === value)
  const ranked = players.slice().sort((a, b) => rank(b) - rank(a))

  return (
    <div className="field">
      <div className="field-label">{label}</div>
      <button type="button" className="btn wide" onClick={() => setOpen(!open)}>
        {current ? `${shortName(current)} — ${suffix(current)}` : 'Not set'}
      </button>
      {open && (
        <div className="panel" style={{ marginTop: 8 }}>
          {ranked.map((player) => (
            <button
              key={player.id}
              type="button"
              className={`selectable ${player.id === value ? 'on' : ''}`}
              onClick={() => { onPick(player.id); setOpen(false) }}
            >
              <div className="row-main">
                <div className="row-title">{shortName(player)}</div>
                <div className="row-sub">{player.position} · {suffix(player)}</div>
              </div>
              <Rating value={overall(player)} />
            </button>
          ))}
        </div>
      )}
      <div className="field-note">{note}</div>
    </div>
  )
}

function SwapModal({
  state, slot, currentId, onPick, onClose,
}: {
  state: GameState
  slot: Position
  currentId: string | undefined
  onPick: (id: string) => void
  onClose: () => void
}) {
  const squad = state.players[state.clubId] ?? []
  const lineup = reconcileLineup(state.lineup, squad, state.tactics)
  const byId = new Map(squad.map((p) => [p.id, p]))

  const candidates = squad
    .filter((p) => p.id !== currentId)
    .filter((p) => (slot === 'GK' ? p.position === 'GK' : p.position !== 'GK'))
    .sort((a, b) => effectiveRating(b, slot) - effectiveRating(a, slot))

  const inStarting = new Set(lineup.starting)

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="modal-head">
          <div className="row-main">
            <div className="row-title">Pick a player for {slot}</div>
            <div className="row-sub">
              Currently {currentId ? shortName(byId.get(currentId)!) : 'empty'} · ratings are for this position
            </div>
          </div>
          <button type="button" className="btn sm ghost" onClick={onClose}>Close</button>
        </div>
        {candidates.length === 0 && <Empty>No alternatives available.</Empty>}
        {candidates.map((player) => (
          <PlayerRow
            key={player.id}
            player={player}
            onClick={() => onPick(player.id)}
            right={
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {inStarting.has(player.id) && <span className="pill flat">XI</span>}
                <Rating value={effectiveRating(player, slot)} />
              </div>
            }
          />
        ))}
      </div>
    </div>
  )
}
