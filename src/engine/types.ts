/**
 * Core domain types.
 *
 * The attribute model is deliberately hockey-specific rather than a football
 * sim with the labels swapped. The things that decide field hockey matches —
 * penalty corners, circle entries, press structure, rolling substitutions and
 * card management — each have first-class attributes behind them.
 */

export type Gender = 'men' | 'women'

/**
 * Field hockey positions. Hockey uses a sweeper/half distinction that has no
 * clean football equivalent, so we keep the sport's own vocabulary.
 */
export type Position =
  | 'GK' // goalkeeper
  | 'SW' // sweeper / last line
  | 'FB' // full back
  | 'HB' // half back
  | 'CM' // centre midfield
  | 'AM' // attacking midfield / inside
  | 'WG' // winger
  | 'ST' // striker

export const OUTFIELD_POSITIONS: Position[] = ['SW', 'FB', 'HB', 'CM', 'AM', 'WG', 'ST']
export const ALL_POSITIONS: Position[] = ['GK', ...OUTFIELD_POSITIONS]

/** Broad unit a position belongs to, used for team-strength aggregation. */
export type Unit = 'keeper' | 'defence' | 'midfield' | 'attack'

export const POSITION_UNIT: Record<Position, Unit> = {
  GK: 'keeper',
  SW: 'defence',
  FB: 'defence',
  HB: 'defence',
  CM: 'midfield',
  AM: 'midfield',
  WG: 'attack',
  ST: 'attack',
}

/**
 * Player attributes, 1-20 in the tradition of the genre.
 *
 * Grouped into technical / physical / mental / keeping. Keeping attributes are
 * only meaningful for goalkeepers and are generated low for outfielders.
 */
export interface Attributes {
  // --- Technical ---
  /** Close control, receiving on the reverse, 3D skill, eliminating a defender. */
  stickWork: number
  /** Range and weight of pass, both push and slap/hit. */
  passing: number
  /** Jab, block tackle, channelling, timing of the challenge. */
  tackling: number
  /** Open-play finishing: deflections, tips, reverse-stick strikes. */
  finishing: number
  /** Aerial ball: launching, receiving under pressure, and contesting. */
  aerial: number
  /** Drag flick execution at a penalty corner. Specialist attribute. */
  dragFlick: number
  /** Injecting and trapping at a penalty corner, plus straight-strike work. */
  cornerCraft: number
  /** Winning penalty corners: driving the baseline, hunting the foot. */
  circleEntry: number

  // --- Physical ---
  /** Top-end speed on the counter and recovering. */
  pace: number
  /** Fitness ceiling; drives how quickly match sharpness drains. */
  stamina: number
  /** Body contact, holding off, strength of hit. */
  strength: number
  /** Change of direction, low centre of gravity, quick feet. */
  agility: number

  // --- Mental ---
  /** Off-ball structure: pressing triggers, marking, covering the sweeper. */
  positioning: number
  /** Choosing the right option quickly under pressure. */
  decisions: number
  /** Holding technique in high-leverage moments (shootouts, late PCs). */
  composure: number
  /** Repeat high-intensity effort, pressing engine. */
  workRate: number
  /** Staying the right side of the umpire. Low discipline means green/yellow cards. */
  discipline: number
  /** Drives team morale, shootout order, captaincy suitability. */
  leadership: number

  // --- Goalkeeping ---
  /** Reaction saves, angles, close-range blocking. */
  shotStopping: number
  /** Clearing with pads and stick, distribution out of the D. */
  clearing: number
  /** Charging out one-on-one and at the top of a corner. */
  rushing: number
  /** Handling and reach for high balls and drag flicks. */
  reflexArc: number
}

export type AttributeKey = keyof Attributes

export const TECHNICAL_ATTRS: AttributeKey[] = [
  'stickWork', 'passing', 'tackling', 'finishing', 'aerial', 'dragFlick', 'cornerCraft', 'circleEntry',
]
export const PHYSICAL_ATTRS: AttributeKey[] = ['pace', 'stamina', 'strength', 'agility']
export const MENTAL_ATTRS: AttributeKey[] = [
  'positioning', 'decisions', 'composure', 'workRate', 'discipline', 'leadership',
]
export const KEEPER_ATTRS: AttributeKey[] = ['shotStopping', 'clearing', 'rushing', 'reflexArc']

export const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  stickWork: 'Stick Work',
  passing: 'Passing',
  tackling: 'Tackling',
  finishing: 'Finishing',
  aerial: 'Aerial',
  dragFlick: 'Drag Flick',
  cornerCraft: 'Corner Craft',
  circleEntry: 'Circle Entry',
  pace: 'Pace',
  stamina: 'Stamina',
  strength: 'Strength',
  agility: 'Agility',
  positioning: 'Positioning',
  decisions: 'Decisions',
  composure: 'Composure',
  workRate: 'Work Rate',
  discipline: 'Discipline',
  leadership: 'Leadership',
  shotStopping: 'Shot Stopping',
  clearing: 'Clearing',
  rushing: 'Rushing',
  reflexArc: 'Reflexes',
}

/** Where a player's data came from. Real imported squads are marked so the UI can say so. */
export type DataProvenance = 'imported' | 'generated'

export interface Player {
  id: string
  firstName: string
  lastName: string
  clubId: string
  /** Primary position. */
  position: Position
  /** Positions the player can fill without an out-of-position penalty. */
  secondary: Position[]
  age: number
  /** Nationality as an ISO-ish short code, e.g. ENG, WAL, NED, AUS. */
  nationality: string
  /** Senior international caps, if known. Drives reputation. */
  caps: number
  attributes: Attributes
  /** Hidden ceiling, 1-200 in current-ability terms; drives development. */
  potential: number
  /** 0-100. Drops with hard matches, recovers with rest. Gates performance. */
  condition: number
  /** 0-100 match sharpness. Built by minutes, decays when unused. */
  sharpness: number
  /** 0-100. Affects effort and transfer-request likelihood. */
  morale: number
  injury: Injury | null
  /** Matches remaining on a card suspension. */
  banMatches: number
  /** Squad number. */
  number: number
  provenance: DataProvenance
  contract: {
    /** Seasons remaining, including the current one. */
    yearsRemaining: number
    /** Weekly wage in GBP. Club hockey is semi-professional, so these are modest. */
    wage: number
  }
  /** Per-season accumulated stats, keyed by season index. */
  seasonStats: PlayerSeasonStats
}

export interface Injury {
  name: string
  /** Matches the player will miss. */
  matches: number
}

export interface PlayerSeasonStats {
  appearances: number
  minutes: number
  goals: number
  /** Goals from open play. */
  fieldGoals: number
  /** Goals from penalty corners (flicks and strikes). */
  cornerGoals: number
  /** Goals from penalty strokes. */
  strokeGoals: number
  assists: number
  greenCards: number
  yellowCards: number
  redCards: number
  /** Goalkeeper only. */
  saves: number
  goalsConceded: number
  cleanSheets: number
  /** Sum of per-match ratings, used with appearances to derive an average. */
  ratingSum: number
}

export function emptyStats(): PlayerSeasonStats {
  return {
    appearances: 0, minutes: 0, goals: 0, fieldGoals: 0, cornerGoals: 0, strokeGoals: 0,
    assists: 0, greenCards: 0, yellowCards: 0, redCards: 0, saves: 0, goalsConceded: 0,
    cleanSheets: 0, ratingSum: 0,
  }
}

export interface Club {
  id: string
  /** Full club name as it appears in England Hockey competitions. */
  name: string
  /** Short name for tables and match display. */
  shortName: string
  /** 3-4 letter abbreviation. */
  abbr: string
  town: string
  /** Home pitch, where known. */
  venue: string
  founded: number | null
  colours: { primary: string; secondary: string; text: string }
  /** 1-100. Drives transfer pull, youth intake quality and finances. */
  reputation: number
  /** Which division the club starts in, by division id. */
  divisionId: string
  /** True for university sides, which have high churn and a younger age profile. */
  university: boolean
  finances: {
    balance: number
    /** Per-season sponsorship and subs income. */
    income: number
  }
}

export interface Division {
  id: string
  name: string
  gender: Gender
  /** 1 = Premier Division, 2 = Division One, 3 = Conference. */
  tier: number
  /** Divisions one tier up that clubs can be promoted into. */
  promotesTo: string | null
  relegatesTo: string | null
  /** Premier Division ends in a title playoff; lower divisions do not. */
  hasPlayoffs: boolean
}

export interface Fixture {
  id: string
  round: number
  /** Day index within the season calendar. */
  day: number
  divisionId: string
  homeClubId: string
  awayClubId: string
  played: boolean
  result: MatchResult | null
  /** Set for playoff and cup ties. */
  stage?: 'league' | 'semi-final' | 'final' | 'promotion-playoff'
}

export interface MatchResult {
  homeGoals: number
  awayGoals: number
  /** Populated when a knockout tie is level after full time. */
  shootout: { homeGoals: number; awayGoals: number } | null
  events: MatchEvent[]
  stats: { home: TeamMatchStats; away: TeamMatchStats }
  /** Per-player ratings and contributions, keyed by player id. */
  playerLines: Record<string, PlayerMatchLine>
}

export interface TeamMatchStats {
  circleEntries: number
  shots: number
  shotsOnTarget: number
  penaltyCorners: number
  cornerGoals: number
  strokes: number
  possession: number
  greens: number
  yellows: number
  reds: number
  saves: number
}

export interface PlayerMatchLine {
  playerId: string
  minutes: number
  goals: number
  assists: number
  saves: number
  rating: number
}

export type MatchEventKind =
  | 'goal-field'
  | 'goal-corner'
  | 'goal-stroke'
  | 'save'
  | 'corner-won'
  | 'green'
  | 'yellow'
  | 'red'
  | 'injury'
  | 'quarter'
  | 'shootout'

export interface MatchEvent {
  minute: number
  quarter: 1 | 2 | 3 | 4
  kind: MatchEventKind
  clubId: string
  playerId: string | null
  assistPlayerId?: string | null
  text: string
}

export interface TableRow {
  clubId: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  points: number
}

/** Manager-set tactical instructions. These feed directly into the match engine. */
export interface Tactics {
  /** How high and hard the team presses. High press wins the ball back further up but tires legs and concedes counters. */
  press: 'high' | 'mid' | 'low'
  /** Speed the team plays at. Fast creates more entries but more turnovers. */
  tempo: 'slow' | 'balanced' | 'fast'
  /** Overload the middle or use the width to hunt baseline entries. */
  width: 'narrow' | 'balanced' | 'wide'
  /** Primary penalty corner routine. */
  cornerRoutine: 'drag-flick' | 'straight-strike' | 'variation'
  /** How aggressively the team tackles. More aggression wins more balls and more cards. */
  aggression: 'contain' | 'balanced' | 'aggressive'
  /** Rolling substitution policy — hockey has unlimited subs, so this is a real lever. */
  rotation: 'minimal' | 'balanced' | 'heavy'
  /** Formation as a defenders-midfielders-forwards split of the 10 outfielders. */
  formation: Formation
}

export type Formation = '4-3-3' | '3-4-3' | '4-4-2' | '5-3-2' | '3-3-4'

export const FORMATIONS: Record<Formation, { def: number; mid: number; fwd: number; note: string }> = {
  '4-3-3': { def: 4, mid: 3, fwd: 3, note: 'The club-hockey default. Balanced press, three up to hunt entries.' },
  '3-4-3': { def: 3, mid: 4, fwd: 3, note: 'Midfield overload. Strong in transition, exposed to the counter.' },
  '4-4-2': { def: 4, mid: 4, fwd: 2, note: 'Solid mid block, two strikers to press the centre backs.' },
  '5-3-2': { def: 5, mid: 3, fwd: 2, note: 'Low block with a spare sweeper. Concedes possession, hard to break down.' },
  '3-3-4': { def: 3, mid: 3, fwd: 4, note: 'All-out attack. Piles on circle entries, leaks counters.' },
}

export function defaultTactics(): Tactics {
  return {
    press: 'mid',
    tempo: 'balanced',
    width: 'balanced',
    cornerRoutine: 'drag-flick',
    aggression: 'balanced',
    rotation: 'balanced',
    formation: '4-3-3',
  }
}

/** A single club's selected team for a match. */
export interface Lineup {
  /** Exactly 11 player ids: 1 keeper + 10 outfield. */
  starting: string[]
  /** Rolling substitutes, typically 5. */
  bench: string[]
  /** Designated drag flicker; falls back to the best available. */
  flickerId: string | null
  /** Designated penalty stroke taker. */
  strokeTakerId: string | null
  captainId: string | null
}

export interface TrainingPlan {
  /** Which attribute group the week's sessions emphasise. */
  focus: 'fitness' | 'technical' | 'set-pieces' | 'defensive-shape' | 'attacking-play' | 'recovery'
  /** Higher intensity develops faster but raises injury risk and drains condition. */
  intensity: 'light' | 'normal' | 'hard'
}
