/** Small shared presentational pieces. */

import type { ReactNode } from 'react'
import type { Club, Player, Position } from '../engine/types'
import { POSITION_UNIT } from '../engine/types'
import { overall, fullName } from '../engine/players'

export function Crest({ club, size = 'md' }: { club: Club; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'crest lg' : size === 'sm' ? 'crest sm' : 'crest'
  return (
    <div
      className={cls}
      style={{
        background: `linear-gradient(140deg, ${club.colours.primary} 0%, ${club.colours.primary} 52%, ${club.colours.secondary} 52%, ${club.colours.secondary} 100%)`,
        color: club.colours.text,
      }}
      aria-hidden
    >
      {club.abbr}
    </div>
  )
}

export function Panel({
  title, action, children, flush,
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  flush?: boolean
}) {
  return (
    <section className="panel">
      {title && (
        <header className="panel-head">
          <h2 className="panel-title">{title}</h2>
          {action}
        </header>
      )}
      <div className={flush ? 'panel-body flush' : 'panel-body'}>{children}</div>
    </section>
  )
}

const UNIT_CLASS: Record<string, string> = {
  keeper: 'gk', defence: 'def', midfield: 'mid', attack: 'att',
}

export function PositionPill({ position }: { position: Position }) {
  return <span className={`pill ${UNIT_CLASS[POSITION_UNIT[position]]}`}>{position}</span>
}

export function Rating({ value }: { value: number }) {
  const cls = value >= 72 ? 'hi' : value >= 52 ? 'mid' : 'lo'
  return <span className={`rating ${cls}`}>{Math.round(value)}</span>
}

export function Bar({ value, max = 100, colour }: { value: number; max?: number; colour?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const fill = colour
    ?? (pct > 66 ? 'var(--accent)' : pct > 33 ? 'var(--warn)' : 'var(--danger)')
  return (
    <div className="bar">
      <i style={{ width: `${pct}%`, background: fill }} />
    </div>
  )
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="kv">
      <div className="kv-label">{label}</div>
      <div className="kv-value">{value}</div>
    </div>
  )
}

/** A player's availability, shown as a short human phrase rather than a code. */
export function availabilityOf(player: Player): { text: string; bad: boolean } | null {
  if (player.injury) {
    return { text: `${player.injury.name} — ${player.injury.matches} match${player.injury.matches === 1 ? '' : 'es'}`, bad: true }
  }
  if (player.banMatches > 0) {
    return { text: `Suspended — ${player.banMatches} match${player.banMatches === 1 ? '' : 'es'}`, bad: true }
  }
  if (player.condition < 55) return { text: `Tired (${Math.round(player.condition)}%)`, bad: false }
  return null
}

export function PlayerRow({
  player, onClick, right, selected,
}: {
  player: Player
  onClick?: () => void
  right?: ReactNode
  selected?: boolean
}) {
  const availability = availabilityOf(player)
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      className={`row ${onClick ? 'tap' : ''} ${selected ? 'on' : ''}`}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      <PositionPill position={player.position} />
      <div className="row-main">
        <div className="row-title">
          {fullName(player)}{' '}
          {player.provenance === 'imported' && <span className="badge-real">REAL</span>}
        </div>
        <div className="row-sub">
          {player.age} · {player.nationality}
          {player.attributes.dragFlick >= 12 && ' · drag flicker'}
          {availability && (
            <span style={{ color: availability.bad ? 'var(--danger)' : 'var(--warn)' }}>
              {' '}· {availability.text}
            </span>
          )}
        </div>
      </div>
      <div className="row-right">{right ?? <Rating value={overall(player)} />}</div>
    </Tag>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}
