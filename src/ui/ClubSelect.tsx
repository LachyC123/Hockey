import { useMemo, useState } from 'react'
import { CLUBS, DIVISIONS, divisionsForGender, dataCoverage } from '../data/clubs'
import type { Gender } from '../engine/types'
import { Crest, Panel } from './components'

/**
 * Opening screen: pick a gender, then a club anywhere in the pyramid. Starting
 * at Formby in the North Premier Division and trying to climb four tiers is a
 * very different game from taking over Surbiton, and both should be one tap away.
 */
export function ClubSelect({ onStart }: { onStart: (gender: Gender, clubId: string) => void }) {
  const [gender, setGender] = useState<Gender>('men')
  const [query, setQuery] = useState('')

  const divisions = useMemo(() => divisionsForGender(gender), [gender])
  const coverage = dataCoverage()

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return CLUBS.filter((club) => {
      const division = DIVISIONS.find((d) => d.id === club.divisionId)
      if (division?.gender !== gender) return false
      if (!needle) return true
      return club.name.toLowerCase().includes(needle) || club.town.toLowerCase().includes(needle)
    })
  }, [gender, query])

  return (
    <div className="app">
      <div className="content" style={{ paddingBottom: 24 }}>
        <div style={{ padding: '18px 2px 4px' }}>
          <h1 style={{ margin: 0, fontSize: 27, letterSpacing: '-0.02em' }}>Sideline</h1>
          <p className="note" style={{ marginTop: 6 }}>
            Field hockey management across the England Hockey pyramid — {coverage.clubs} real clubs
            in {coverage.divisions} divisions, from the Premier Division down to the North Premier Division.
          </p>
        </div>

        <div className="choice-grid">
          {(['men', 'women'] as Gender[]).map((option) => (
            <button
              key={option}
              type="button"
              className={`choice ${gender === option ? 'on' : ''}`}
              onClick={() => setGender(option)}
            >
              {option === 'men' ? "Men's pyramid" : "Women's pyramid"}
            </button>
          ))}
        </div>

        <input
          className="choice"
          style={{ textAlign: 'left', padding: '11px 12px', color: 'var(--text)' }}
          placeholder="Search clubs or towns…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        {divisions.map((division) => {
          const clubs = filtered.filter((club) => club.divisionId === division.id)
          if (clubs.length === 0) return null
          return (
            <Panel key={division.id} title={`Tier ${division.tier} · ${division.name}`} flush>
              {clubs.map((club) => (
                <button
                  key={club.id}
                  type="button"
                  className="row tap"
                  onClick={() => onStart(gender, club.id)}
                >
                  <Crest club={club} />
                  <div className="row-main">
                    <div className="row-title">{club.shortName}</div>
                    <div className="row-sub">{club.town} · {club.venue}</div>
                  </div>
                  <div className="row-right">
                    <span className="pill flat">REP {club.reputation}</span>
                  </div>
                </button>
              ))}
            </Panel>
          )
        })}

        {filtered.length === 0 && (
          <Panel><div className="empty">No clubs match “{query}”.</div></Panel>
        )}
      </div>
    </div>
  )
}
