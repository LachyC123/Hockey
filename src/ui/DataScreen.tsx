import type { GameState } from '../engine/game'
import { CLUBS, DIVISIONS, dataCoverage, getDivision } from '../data/clubs'
import { Panel, KeyValue } from './components'

/**
 * Data provenance.
 *
 * The game is built on real clubs, so it should be honest about which parts of
 * that data have been checked and which have not, and it should say plainly how
 * to replace the generated squads with real ones.
 */
export function DataScreen({ state, onQuit }: { state: GameState; onQuit: () => void }) {
  const coverage = dataCoverage()
  const squads = Object.values(state.players)
  const imported = squads.flat().filter((p) => p.provenance === 'imported').length
  const total = squads.flat().length

  const unverified = CLUBS.filter((c) => !c.verified)
  const genderDivisions = DIVISIONS.filter((d) => d.gender === state.gender)

  return (
    <>
      <Panel title="Coverage">
        <div className="kv-grid">
          <KeyValue label="Clubs" value={coverage.clubs} />
          <KeyValue label="Divisions" value={coverage.divisions} />
          <KeyValue label="Tiers" value={4} />
          <KeyValue label="Real players" value={imported} />
        </div>
        <div className="note" style={{ marginTop: 11 }}>
          {imported > 0
            ? `${imported} of ${total} players in this save came from imported squad data.`
            : `All ${total} players in this save are generated. Real club names, towns, venues and league structure are used throughout; the people are not real.`}
        </div>
      </Panel>

      <Panel title="The pyramid">
        {genderDivisions.map((division) => {
          const count = (state.divisionMembers[division.id] ?? []).length
          return (
            <div className="split" key={division.id} style={{ padding: '5px 0' }}>
              <span className="tiny">
                <span className="muted">T{division.tier}</span> {division.name}
              </span>
              <span className="tiny muted">{count} clubs</span>
            </div>
          )
        })}
        <div className="field-note">
          Tier 4 is modelled for the North only, because that is the level Formby's first XI
          play at. The Midlands, East and West conferences have no division below them here.
        </div>
      </Panel>

      <Panel title="Accuracy">
        <div className="note">
          Every club in this game is a real England Hockey club, with its real town and home
          venue. Division membership changes each season with promotion, relegation and the
          occasional withdrawal, and the club lists were assembled without live access to
          englandhockey.co.uk.
        </div>
        <div className="note" style={{ marginTop: 10 }}>
          <strong>{coverage.verified}</strong> of {coverage.clubs} clubs have a division
          placement that has been cross-checked. The remaining {unverified.length} are real
          clubs whose placement for this season is a best-effort assignment — worth confirming
          before you take any of it as fact.
        </div>
      </Panel>

      <Panel title="Importing real squads">
        <div className="note">
          Squad lists are not bundled, because no public source publishes them in a usable
          form. To load real players, run this on a machine with normal network access:
        </div>
        <div className="note" style={{ marginTop: 9 }}>
          <code>npm run import:squads -- --division m-np</code>
        </div>
        <div className="note" style={{ marginTop: 9 }}>
          It writes one JSON file per club into <code>src/data/squads/</code>, which the game
          picks up automatically on the next build. Anything you leave out of a file is filled
          in from the club's standing, so a name and a position per player is enough. The
          format is documented in <code>data/README.md</code>.
        </div>
        <div className="note" style={{ marginTop: 9 }}>
          Attributes are modelled rather than sourced — nobody publishes ability ratings for
          England Hockey League players. Names, positions, ages, squad numbers and caps are
          used exactly as given.
        </div>
      </Panel>

      <Panel title="This save">
        <div className="note">
          Managing <strong>{state.clubs[state.clubId].name}</strong> in the{' '}
          {getDivision(state.clubs[state.clubId].divisionId).name}.<br />
          Season {state.season}, round {state.round} of {state.totalRounds}.<br />
          Seed <code>{state.seed}</code> — the same seed replays the same season exactly.
        </div>
        <button
          type="button"
          className="btn wide"
          style={{ marginTop: 12, color: 'var(--danger)' }}
          onClick={onQuit}
        >
          Abandon save and pick a new club
        </button>
      </Panel>
    </>
  )
}
