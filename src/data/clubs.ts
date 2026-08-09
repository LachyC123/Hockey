/**
 * Real England Hockey League clubs.
 *
 * PROVENANCE / ACCURACY
 * ---------------------
 * Club names, towns and home venues here are real England Hockey League clubs.
 * The exact division membership for a given season changes every year with
 * promotion, relegation and the occasional club withdrawal, and this file was
 * assembled without live access to englandhockey.co.uk.
 *
 * Every club therefore carries a `verified` flag:
 *   true  — the club and its division are cross-checked and believed correct.
 *   false — the club is real, but its division placement for 2025/26 is a
 *           best-effort placement and should be confirmed.
 *
 * To refresh this against the official source, run:
 *   npm run import:squads -- --clubs
 * from a machine with access to gms.englandhockey.co.uk. See
 * scripts/import-squads.mjs and data/README.md.
 */

import type { Club, Division, Gender } from '../engine/types'

export const DIVISIONS: Division[] = [
  { id: 'm-prem', name: "Men's Premier Division", gender: 'men', tier: 1, promotesTo: null, relegatesTo: 'm-d1n', hasPlayoffs: true },
  { id: 'm-d1n', name: "Men's Division One North", gender: 'men', tier: 2, promotesTo: 'm-prem', relegatesTo: null, hasPlayoffs: false },
  { id: 'm-d1s', name: "Men's Division One South", gender: 'men', tier: 2, promotesTo: 'm-prem', relegatesTo: null, hasPlayoffs: false },
  { id: 'w-prem', name: "Women's Premier Division", gender: 'women', tier: 1, promotesTo: null, relegatesTo: 'w-d1n', hasPlayoffs: true },
  { id: 'w-d1n', name: "Women's Division One North", gender: 'women', tier: 2, promotesTo: 'w-prem', relegatesTo: null, hasPlayoffs: false },
  { id: 'w-d1s', name: "Women's Division One South", gender: 'women', tier: 2, promotesTo: 'w-prem', relegatesTo: null, hasPlayoffs: false },
]

/**
 * Compact club row. Kept as a tuple table so the whole league pyramid stays
 * readable and easy to correct by hand:
 * [name, shortName, abbr, town, venue, founded, primary, secondary, text, reputation, divisionId, university, verified]
 */
type ClubRow = [
  string, string, string, string, string, number | null,
  string, string, string,
  number, string, boolean, boolean,
]

const CLUB_ROWS: ClubRow[] = [
  // ---------------------------------------------------------------- Men's Premier Division
  ['Surbiton Hockey Club', 'Surbiton', 'SUR', 'Surbiton, London', 'Sugden Road', 1874, '#00843d', '#ffffff', '#ffffff', 94, 'm-prem', false, true],
  ['Old Georgians Hockey Club', 'Old Georgians', 'OGS', 'Broadbridge Heath, West Sussex', 'Broadbridge Heath Leisure Centre', 1936, '#0b2d6b', '#e01a2b', '#ffffff', 96, 'm-prem', false, true],
  ['Wimbledon Hockey Club', 'Wimbledon', 'WIM', 'Wimbledon, London', 'Raynes Park Sports Ground', 1883, '#0a3d91', '#ffd200', '#ffffff', 90, 'm-prem', false, true],
  ['Hampstead & Westminster Hockey Club', 'Hampstead & West.', 'HAW', 'Paddington, London', 'Paddington Recreation Ground', 1894, '#7b1b2e', '#f2f2f2', '#ffffff', 88, 'm-prem', false, true],
  ['Beeston Hockey Club', 'Beeston', 'BEE', 'Nottingham', 'Highfields', 1900, '#0f6b3a', '#ffffff', '#ffffff', 87, 'm-prem', false, true],
  ['Holcombe Hockey Club', 'Holcombe', 'HOL', 'Holcombe Park, Kent', 'Holcombe Park', 1904, '#0b1d51', '#8dc63f', '#ffffff', 85, 'm-prem', false, true],
  ['East Grinstead Hockey Club', 'East Grinstead', 'EGR', 'East Grinstead, West Sussex', 'Saint Hill', 1888, '#c8102e', '#0b2d6b', '#ffffff', 84, 'm-prem', false, true],
  ['Oxted Hockey Club', 'Oxted', 'OXT', 'Oxted, Surrey', 'Master Park', 1920, '#00205b', '#f5a800', '#ffffff', 78, 'm-prem', false, false],
  ['University of Exeter Hockey Club', 'Exeter Uni', 'EXE', 'Exeter, Devon', 'Topsham Sports Ground', 1955, '#00543c', '#f2c75c', '#ffffff', 76, 'm-prem', true, false],
  ['Brooklands Manchester University Hockey Club', 'Brooklands MU', 'BMU', 'Sale, Greater Manchester', 'Brooklands Sports Club', 1878, '#7a1f3d', '#ffffff', '#ffffff', 75, 'm-prem', true, false],
  ['Cardiff & Met Hockey Club', 'Cardiff & Met', 'CMH', 'Cardiff', 'Cyncoed Campus', 1893, '#0057b8', '#ffd100', '#ffffff', 74, 'm-prem', true, false],
  ['Reading Hockey Club', 'Reading', 'RDG', 'Sonning Lane, Reading', 'Sonning Lane', 1893, '#1b1b1b', '#e8e8e8', '#ffffff', 77, 'm-prem', false, false],

  // ---------------------------------------------------------------- Men's Division One North
  ['Bowdon Hockey Club', 'Bowdon', 'BOW', 'Bowdon, Greater Manchester', 'Clay Lane', 1888, '#00693e', '#ffffff', '#ffffff', 66, 'm-d1n', false, false],
  ['Sheffield Hallam Hockey Club', 'Sheffield Hallam', 'SHH', 'Sheffield', 'Abbeydale Sports Club', 1990, '#0d3b66', '#f4a259', '#ffffff', 62, 'm-d1n', false, false],
  ['Leeds Hockey Club', 'Leeds', 'LEE', 'Leeds, West Yorkshire', 'Weetwood', 1893, '#004b87', '#ffffff', '#ffffff', 60, 'm-d1n', false, false],
  ['Loughborough Students Hockey Club', 'Loughborough Students', 'LBS', 'Loughborough, Leicestershire', 'Loughborough University', 1909, '#6f2c91', '#ffffff', '#ffffff', 68, 'm-d1n', true, false],
  ['University of Birmingham Hockey Club', 'Birmingham Uni', 'BIR', 'Birmingham', 'Bournbrook', 1900, '#1b3f8b', '#c8102e', '#ffffff', 65, 'm-d1n', true, false],
  ['Doncaster Hockey Club', 'Doncaster', 'DON', 'Doncaster, South Yorkshire', 'Doncaster Deaf Trust', 1904, '#e01a2b', '#111111', '#ffffff', 56, 'm-d1n', false, false],
  ['Deeside Ramblers Hockey Club', 'Deeside Ramblers', 'DER', 'Chester', 'Deeside Ramblers Ground', 1923, '#0b6e4f', '#ffcc00', '#ffffff', 55, 'm-d1n', false, false],
  ['Timperley Hockey Club', 'Timperley', 'TIM', 'Timperley, Greater Manchester', 'Pickering Lodge', 1902, '#1d3557', '#e63946', '#ffffff', 57, 'm-d1n', false, false],
  ['Cannock Hockey Club', 'Cannock', 'CAN', 'Cannock, Staffordshire', 'Hednesford Road', 1893, '#c8102e', '#ffffff', '#ffffff', 61, 'm-d1n', false, false],
  ['Olton & West Warwicks Hockey Club', 'Olton & West Warwicks', 'OWW', 'Solihull, West Midlands', 'Dovehouse Lane', 1892, '#00483a', '#f2b134', '#ffffff', 54, 'm-d1n', false, false],
  ['Belper Hockey Club', 'Belper', 'BEL', 'Belper, Derbyshire', 'Belper Sports Centre', 1907, '#8b1e3f', '#ffffff', '#ffffff', 52, 'm-d1n', false, false],
  ['University of Nottingham Hockey Club', 'Nottingham Uni', 'NTU', 'Nottingham', 'Highfields Sports Ground', 1948, '#003c71', '#ffffff', '#ffffff', 63, 'm-d1n', true, false],

  // ---------------------------------------------------------------- Men's Division One South
  ['Sevenoaks Hockey Club', 'Sevenoaks', 'SEV', 'Sevenoaks, Kent', 'Hollybush Lane', 1901, '#0a2a5e', '#f0b323', '#ffffff', 70, 'm-d1s', false, false],
  ['Canterbury Hockey Club', 'Canterbury', 'CAT', 'Canterbury, Kent', 'Polo Farm Sports Club', 1901, '#5b2c6f', '#ffffff', '#ffffff', 69, 'm-d1s', false, false],
  ['Southgate Hockey Club', 'Southgate', 'SGT', 'Enfield, London', 'Trent Park', 1886, '#00205b', '#c8102e', '#ffffff', 67, 'm-d1s', false, false],
  ['Teddington Hockey Club', 'Teddington', 'TED', 'Teddington, London', 'Bushy Park', 1885, '#006747', '#ffffff', '#ffffff', 66, 'm-d1s', false, false],
  ['Richmond Hockey Club', 'Richmond', 'RIC', 'Richmond, London', 'Old Deer Park', 1892, '#7a003c', '#f5f5f5', '#ffffff', 60, 'm-d1s', false, false],
  ['Havant Hockey Club', 'Havant', 'HAV', 'Havant, Hampshire', 'Fraser Road', 1904, '#004b8d', '#ffd100', '#ffffff', 62, 'm-d1s', false, false],
  ['Cambridge City Hockey Club', 'Cambridge City', 'CCH', 'Cambridge', 'Wilberforce Road', 1923, '#00a3ad', '#111111', '#ffffff', 59, 'm-d1s', false, false],
  ['Oxford Hawks Hockey Club', 'Oxford Hawks', 'OXH', 'Oxford', 'Banbury Road North', 1974, '#1f3a93', '#f6c700', '#ffffff', 58, 'm-d1s', false, false],
  ['Brighton & Hove Hockey Club', 'Brighton & Hove', 'BHH', 'Brighton, East Sussex', 'Blatchington Mill', 1902, '#0057b8', '#ffffff', '#ffffff', 55, 'm-d1s', false, false],
  ['St Albans Hockey Club', 'St Albans', 'STA', 'St Albans, Hertfordshire', 'Highfield Park', 1894, '#c8102e', '#0b2d6b', '#ffffff', 56, 'm-d1s', false, false],
  ['Guildford Hockey Club', 'Guildford', 'GUI', 'Guildford, Surrey', 'Guildford Sports Ground', 1896, '#00483a', '#ffffff', '#ffffff', 64, 'm-d1s', false, false],
  ['Chichester Hockey Club', 'Chichester', 'CHI', 'Chichester, West Sussex', 'Oaklands Park', 1901, '#1b1f3b', '#e4a010', '#ffffff', 53, 'm-d1s', false, false],

  // ---------------------------------------------------------------- Women's Premier Division
  ['Surbiton Hockey Club', 'Surbiton', 'SUR', 'Surbiton, London', 'Sugden Road', 1874, '#00843d', '#ffffff', '#ffffff', 95, 'w-prem', false, true],
  ['Reading Hockey Club', 'Reading', 'RDG', 'Sonning Lane, Reading', 'Sonning Lane', 1893, '#1b1b1b', '#e8e8e8', '#ffffff', 93, 'w-prem', false, true],
  ['East Grinstead Hockey Club', 'East Grinstead', 'EGR', 'East Grinstead, West Sussex', 'Saint Hill', 1888, '#c8102e', '#0b2d6b', '#ffffff', 87, 'w-prem', false, true],
  ['Beeston Hockey Club', 'Beeston', 'BEE', 'Nottingham', 'Highfields', 1900, '#0f6b3a', '#ffffff', '#ffffff', 86, 'w-prem', false, true],
  ['Hampstead & Westminster Hockey Club', 'Hampstead & West.', 'HAW', 'Paddington, London', 'Paddington Recreation Ground', 1894, '#7b1b2e', '#f2f2f2', '#ffffff', 84, 'w-prem', false, true],
  ['Wimbledon Hockey Club', 'Wimbledon', 'WIM', 'Wimbledon, London', 'Raynes Park Sports Ground', 1883, '#0a3d91', '#ffd200', '#ffffff', 83, 'w-prem', false, true],
  ['Clifton Robinsons Hockey Club', 'Clifton Robinsons', 'CLR', 'Bristol', 'Coombe Dingle', 1908, '#0b2d6b', '#8dc63f', '#ffffff', 80, 'w-prem', false, false],
  ['University of Nottingham Hockey Club', 'Nottingham Uni', 'NTU', 'Nottingham', 'Highfields Sports Ground', 1948, '#003c71', '#ffffff', '#ffffff', 76, 'w-prem', true, false],
  ['University of Birmingham Hockey Club', 'Birmingham Uni', 'BIR', 'Birmingham', 'Bournbrook', 1900, '#1b3f8b', '#c8102e', '#ffffff', 78, 'w-prem', true, false],
  ['Loughborough Students Hockey Club', 'Loughborough Students', 'LBS', 'Loughborough, Leicestershire', 'Loughborough University', 1909, '#6f2c91', '#ffffff', '#ffffff', 77, 'w-prem', true, false],
  ['Barnes Hockey Club', 'Barnes', 'BAR', 'Barnes, London', 'Barn Elms', 1901, '#004b87', '#e01a2b', '#ffffff', 72, 'w-prem', false, false],
  ['Durham University Hockey Club', 'Durham Uni', 'DUR', 'Durham', 'Maiden Castle', 1899, '#68246d', '#ffffff', '#ffffff', 73, 'w-prem', true, false],

  // ---------------------------------------------------------------- Women's Division One North
  ['Bowdon Hightown Hockey Club', 'Bowdon Hightown', 'BHT', 'Bowdon, Greater Manchester', 'Clay Lane', 1897, '#00693e', '#ffd200', '#ffffff', 68, 'w-d1n', false, false],
  ['Ben Rhydding Hockey Club', 'Ben Rhydding', 'BRH', 'Ilkley, West Yorkshire', 'Ben Rhydding Sports Club', 1890, '#0b2d6b', '#ffffff', '#ffffff', 64, 'w-d1n', false, false],
  ['Leeds Hockey Club', 'Leeds', 'LEE', 'Leeds, West Yorkshire', 'Weetwood', 1893, '#004b87', '#ffffff', '#ffffff', 60, 'w-d1n', false, false],
  ['Sheffield Hallam Hockey Club', 'Sheffield Hallam', 'SHH', 'Sheffield', 'Abbeydale Sports Club', 1990, '#0d3b66', '#f4a259', '#ffffff', 61, 'w-d1n', false, false],
  ['Timperley Hockey Club', 'Timperley', 'TIM', 'Timperley, Greater Manchester', 'Pickering Lodge', 1902, '#1d3557', '#e63946', '#ffffff', 58, 'w-d1n', false, false],
  ['Brooklands Poynton Hockey Club', 'Brooklands Poynton', 'BPY', 'Sale, Greater Manchester', 'Brooklands Sports Club', 1878, '#7a1f3d', '#ffffff', '#ffffff', 62, 'w-d1n', false, false],
  ['Doncaster Hockey Club', 'Doncaster', 'DON', 'Doncaster, South Yorkshire', 'Doncaster Deaf Trust', 1904, '#e01a2b', '#111111', '#ffffff', 55, 'w-d1n', false, false],
  ['Sutton Coldfield Hockey Club', 'Sutton Coldfield', 'SUT', 'Sutton Coldfield, West Midlands', 'Rectory Park', 1900, '#00205b', '#f5a800', '#ffffff', 57, 'w-d1n', false, false],
  ['Olton & West Warwicks Hockey Club', 'Olton & West Warwicks', 'OWW', 'Solihull, West Midlands', 'Dovehouse Lane', 1892, '#00483a', '#f2b134', '#ffffff', 54, 'w-d1n', false, false],
  ['Belper Hockey Club', 'Belper', 'BEL', 'Belper, Derbyshire', 'Belper Sports Centre', 1907, '#8b1e3f', '#ffffff', '#ffffff', 52, 'w-d1n', false, false],
  ['Wakefield Hockey Club', 'Wakefield', 'WAK', 'Wakefield, West Yorkshire', 'College Grove', 1900, '#1f6f4a', '#ffffff', '#ffffff', 51, 'w-d1n', false, false],
  ['University of Durham 2nd XI', 'Durham Uni II', 'DU2', 'Durham', 'Maiden Castle', 1899, '#68246d', '#cccccc', '#ffffff', 53, 'w-d1n', true, false],

  // ---------------------------------------------------------------- Women's Division One South
  ['Canterbury Hockey Club', 'Canterbury', 'CAT', 'Canterbury, Kent', 'Polo Farm Sports Club', 1901, '#5b2c6f', '#ffffff', '#ffffff', 70, 'w-d1s', false, false],
  ['Sevenoaks Hockey Club', 'Sevenoaks', 'SEV', 'Sevenoaks, Kent', 'Hollybush Lane', 1901, '#0a2a5e', '#f0b323', '#ffffff', 66, 'w-d1s', false, false],
  ['Southgate Hockey Club', 'Southgate', 'SGT', 'Enfield, London', 'Trent Park', 1886, '#00205b', '#c8102e', '#ffffff', 63, 'w-d1s', false, false],
  ['Trojans Hockey Club', 'Trojans', 'TRO', 'Southampton, Hampshire', 'Stoneham Lane', 1874, '#0b6e4f', '#ffffff', '#ffffff', 61, 'w-d1s', false, false],
  ['Oxford Hawks Hockey Club', 'Oxford Hawks', 'OXH', 'Oxford', 'Banbury Road North', 1974, '#1f3a93', '#f6c700', '#ffffff', 62, 'w-d1s', false, false],
  ['Basingstoke Hockey Club', 'Basingstoke', 'BAS', 'Basingstoke, Hampshire', 'Down Grange', 1897, '#c8102e', '#ffffff', '#ffffff', 57, 'w-d1s', false, false],
  ['Bedford Hockey Club', 'Bedford', 'BED', 'Bedford', 'Bedford Athletic', 1900, '#00427a', '#ffd200', '#ffffff', 56, 'w-d1s', false, false],
  ['St Albans Hockey Club', 'St Albans', 'STA', 'St Albans, Hertfordshire', 'Highfield Park', 1894, '#c8102e', '#0b2d6b', '#ffffff', 58, 'w-d1s', false, false],
  ['Harleston Magpies Hockey Club', 'Harleston Magpies', 'HAM', 'Harleston, Norfolk', 'Weybread Sports Ground', 1900, '#111111', '#ffffff', '#ffffff', 64, 'w-d1s', false, false],
  ['Ipswich Hockey Club', 'Ipswich', 'IPS', 'Ipswich, Suffolk', 'Tuddenham Road', 1898, '#0057b8', '#ffffff', '#ffffff', 55, 'w-d1s', false, false],
  ['Horsham Hockey Club', 'Horsham', 'HOR', 'Horsham, West Sussex', 'Horsham Sports Club', 1902, '#00693e', '#f2c75c', '#ffffff', 53, 'w-d1s', false, false],
  ['University of Exeter Hockey Club', 'Exeter Uni', 'EXE', 'Exeter, Devon', 'Topsham Sports Ground', 1955, '#00543c', '#f2c75c', '#ffffff', 65, 'w-d1s', true, false],
]

/** Slug a club name plus division into a stable id, e.g. "m-prem:surbiton". */
function clubId(divisionId: string, name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/hockey club|hockey|\b2nd xi\b/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${divisionId}:${slug}`
}

export interface SeedClub extends Club {
  verified: boolean
}

export const CLUBS: SeedClub[] = CLUB_ROWS.map((row) => {
  const [
    name, shortName, abbr, town, venue, founded,
    primary, secondary, text,
    reputation, divisionId, university, verified,
  ] = row
  return {
    id: clubId(divisionId, name),
    name,
    shortName,
    abbr,
    town,
    venue,
    founded,
    colours: { primary, secondary, text },
    reputation,
    divisionId,
    university,
    verified,
    finances: {
      // Club hockey in England is semi-professional; budgets are small and
      // scale with reputation rather than with broadcast money.
      balance: Math.round(reputation * 900 + 8000),
      income: Math.round(reputation * 1400 + 20000),
    },
  }
})

export function clubsInDivision(divisionId: string): SeedClub[] {
  return CLUBS.filter((c) => c.divisionId === divisionId)
}

export function divisionsForGender(gender: Gender): Division[] {
  return DIVISIONS.filter((d) => d.gender === gender)
}

export function getDivision(id: string): Division {
  const d = DIVISIONS.find((x) => x.id === id)
  if (!d) throw new Error(`Unknown division: ${id}`)
  return d
}
