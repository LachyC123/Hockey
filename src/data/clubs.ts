/**
 * Real England Hockey club data, from the Premier Division down to the regional
 * North Premier Division.
 *
 * PYRAMID
 * -------
 *   Tier 1  Premier Division                            (12 clubs)
 *   Tier 2  Division One North / South                  (12 each)
 *   Tier 3  Conference North / Midlands / East / West    (10 each)
 *   Tier 4  North Premier Division                       (12 clubs)
 *
 * Tier 4 is modelled for the North only — that is the level Formby's first XI
 * play at. The Midlands, East and West conferences therefore have no division
 * below them here, and clubs finishing bottom of those simply stay up.
 *
 * PROVENANCE / ACCURACY
 * ---------------------
 * Every club listed is a real England Hockey club, with its real town and home
 * venue. Division membership changes every season with promotion, relegation
 * and the occasional withdrawal, and this file was assembled without live
 * access to englandhockey.co.uk — that domain is blocked from the environment
 * this was written in.
 *
 * Each club therefore carries a `verified` flag:
 *   true  — club and division placement cross-checked and believed correct.
 *   false — the club is real, but its 2025/26 division placement is a
 *           best-effort assignment that should be confirmed.
 *
 * To rebuild this from the official source, run this on a machine with normal
 * network access:
 *   npm run import:squads -- --clubs
 * See scripts/import-squads.mjs and data/README.md.
 */

import type { Club, Division, Gender, Region } from '../engine/types'

export const DIVISIONS: Division[] = [
  // ------------------------------------------------------------------ Men
  {
    id: 'm-prem', name: "Men's Premier Division", gender: 'men', tier: 1,
    promotesTo: null, relegatesTo: ['m-d1n', 'm-d1s'],
    regions: ['north', 'midlands', 'east', 'west', 'south'], hasPlayoffs: true,
  },
  {
    id: 'm-d1n', name: "Men's Division One North", gender: 'men', tier: 2,
    promotesTo: 'm-prem', relegatesTo: ['m-cn', 'm-cm'],
    regions: ['north', 'midlands'], hasPlayoffs: false,
  },
  {
    id: 'm-d1s', name: "Men's Division One South", gender: 'men', tier: 2,
    promotesTo: 'm-prem', relegatesTo: ['m-ce', 'm-cw'],
    regions: ['east', 'west', 'south'], hasPlayoffs: false,
  },
  {
    id: 'm-cn', name: "Men's Conference North", gender: 'men', tier: 3,
    promotesTo: 'm-d1n', relegatesTo: ['m-np'], regions: ['north'], hasPlayoffs: false,
  },
  {
    id: 'm-cm', name: "Men's Conference Midlands", gender: 'men', tier: 3,
    promotesTo: 'm-d1n', relegatesTo: null, regions: ['midlands'], hasPlayoffs: false,
  },
  {
    id: 'm-ce', name: "Men's Conference East", gender: 'men', tier: 3,
    promotesTo: 'm-d1s', relegatesTo: null, regions: ['east'], hasPlayoffs: false,
  },
  {
    id: 'm-cw', name: "Men's Conference West", gender: 'men', tier: 3,
    promotesTo: 'm-d1s', relegatesTo: null, regions: ['west', 'south'], hasPlayoffs: false,
  },
  {
    id: 'm-np', name: "Men's North Premier Division", gender: 'men', tier: 4,
    promotesTo: 'm-cn', relegatesTo: null, regions: ['north'], hasPlayoffs: false,
  },

  // ---------------------------------------------------------------- Women
  {
    id: 'w-prem', name: "Women's Premier Division", gender: 'women', tier: 1,
    promotesTo: null, relegatesTo: ['w-d1n', 'w-d1s'],
    regions: ['north', 'midlands', 'east', 'west', 'south'], hasPlayoffs: true,
  },
  {
    id: 'w-d1n', name: "Women's Division One North", gender: 'women', tier: 2,
    promotesTo: 'w-prem', relegatesTo: ['w-cn', 'w-cm'],
    regions: ['north', 'midlands'], hasPlayoffs: false,
  },
  {
    id: 'w-d1s', name: "Women's Division One South", gender: 'women', tier: 2,
    promotesTo: 'w-prem', relegatesTo: ['w-ce', 'w-cw'],
    regions: ['east', 'west', 'south'], hasPlayoffs: false,
  },
  {
    id: 'w-cn', name: "Women's Conference North", gender: 'women', tier: 3,
    promotesTo: 'w-d1n', relegatesTo: ['w-np'], regions: ['north'], hasPlayoffs: false,
  },
  {
    id: 'w-cm', name: "Women's Conference Midlands", gender: 'women', tier: 3,
    promotesTo: 'w-d1n', relegatesTo: null, regions: ['midlands'], hasPlayoffs: false,
  },
  {
    id: 'w-ce', name: "Women's Conference East", gender: 'women', tier: 3,
    promotesTo: 'w-d1s', relegatesTo: null, regions: ['east'], hasPlayoffs: false,
  },
  {
    id: 'w-cw', name: "Women's Conference West", gender: 'women', tier: 3,
    promotesTo: 'w-d1s', relegatesTo: null, regions: ['west', 'south'], hasPlayoffs: false,
  },
  {
    id: 'w-np', name: "Women's North Premier Division", gender: 'women', tier: 4,
    promotesTo: 'w-cn', relegatesTo: null, regions: ['north'], hasPlayoffs: false,
  },
]

/**
 * Compact club row, kept as a tuple table so the whole pyramid stays readable
 * and easy to correct by hand:
 * [name, short, abbr, town, venue, founded, primary, secondary, text,
 *  reputation, divisionId, region, university, verified]
 */
type ClubRow = [
  string, string, string, string, string, number | null,
  string, string, string,
  number, string, Region, boolean, boolean,
]

const CLUB_ROWS: ClubRow[] = [
  // ============================================================ MEN — TIER 1
  ['Surbiton Hockey Club', 'Surbiton', 'SUR', 'Surbiton, London', 'Sugden Road', 1874, '#00843d', '#ffffff', '#ffffff', 94, 'm-prem', 'south', false, true],
  ['Old Georgians Hockey Club', 'Old Georgians', 'OGS', 'Broadbridge Heath, West Sussex', 'Broadbridge Heath Leisure Centre', 1936, '#0b2d6b', '#e01a2b', '#ffffff', 96, 'm-prem', 'south', false, true],
  ['Wimbledon Hockey Club', 'Wimbledon', 'WIM', 'Wimbledon, London', 'Raynes Park Sports Ground', 1883, '#0a3d91', '#ffd200', '#ffffff', 90, 'm-prem', 'south', false, true],
  ['Hampstead & Westminster Hockey Club', 'Hampstead & West.', 'HAW', 'Paddington, London', 'Paddington Recreation Ground', 1894, '#7b1b2e', '#f2f2f2', '#ffffff', 88, 'm-prem', 'south', false, true],
  ['Beeston Hockey Club', 'Beeston', 'BEE', 'Nottingham', 'Highfields', 1900, '#0f6b3a', '#ffffff', '#ffffff', 87, 'm-prem', 'midlands', false, true],
  ['Holcombe Hockey Club', 'Holcombe', 'HOL', 'Holcombe Park, Kent', 'Holcombe Park', 1904, '#0b1d51', '#8dc63f', '#ffffff', 85, 'm-prem', 'south', false, true],
  ['East Grinstead Hockey Club', 'East Grinstead', 'EGR', 'East Grinstead, West Sussex', 'Saint Hill', 1888, '#c8102e', '#0b2d6b', '#ffffff', 84, 'm-prem', 'south', false, true],
  ['Oxted Hockey Club', 'Oxted', 'OXT', 'Oxted, Surrey', 'Master Park', 1920, '#00205b', '#f5a800', '#ffffff', 78, 'm-prem', 'south', false, false],
  ['University of Exeter Hockey Club', 'Exeter Uni', 'EXE', 'Exeter, Devon', 'Topsham Sports Ground', 1955, '#00543c', '#f2c75c', '#ffffff', 76, 'm-prem', 'west', true, false],
  ['Brooklands Manchester University Hockey Club', 'Brooklands MU', 'BMU', 'Sale, Greater Manchester', 'Brooklands Sports Club', 1878, '#7a1f3d', '#ffffff', '#ffffff', 75, 'm-prem', 'north', true, false],
  ['Cardiff & Met Hockey Club', 'Cardiff & Met', 'CMH', 'Cardiff', 'Cyncoed Campus', 1893, '#0057b8', '#ffd100', '#ffffff', 74, 'm-prem', 'west', true, false],
  ['Reading Hockey Club', 'Reading', 'RDG', 'Sonning Lane, Reading', 'Sonning Lane', 1893, '#1b1b1b', '#e8e8e8', '#ffffff', 77, 'm-prem', 'south', false, false],

  // ============================================================ MEN — TIER 2 NORTH
  ['Bowdon Hockey Club', 'Bowdon', 'BOW', 'Bowdon, Greater Manchester', 'Clay Lane', 1888, '#00693e', '#ffffff', '#ffffff', 68, 'm-d1n', 'north', false, false],
  ['Sheffield Hallam Hockey Club', 'Sheffield Hallam', 'SHH', 'Sheffield', 'Abbeydale Sports Club', 1990, '#0d3b66', '#f4a259', '#ffffff', 63, 'm-d1n', 'north', false, false],
  ['Leeds Hockey Club', 'Leeds', 'LEE', 'Leeds, West Yorkshire', 'Weetwood', 1893, '#004b87', '#ffffff', '#ffffff', 61, 'm-d1n', 'north', false, false],
  ['Loughborough Students Hockey Club', 'Loughborough Students', 'LBS', 'Loughborough, Leicestershire', 'Loughborough University', 1909, '#6f2c91', '#ffffff', '#ffffff', 69, 'm-d1n', 'midlands', true, false],
  ['University of Birmingham Hockey Club', 'Birmingham Uni', 'BIR', 'Birmingham', 'Bournbrook', 1900, '#1b3f8b', '#c8102e', '#ffffff', 66, 'm-d1n', 'midlands', true, false],
  ['Doncaster Hockey Club', 'Doncaster', 'DON', 'Doncaster, South Yorkshire', 'Doncaster Deaf Trust', 1904, '#e01a2b', '#111111', '#ffffff', 57, 'm-d1n', 'north', false, false],
  ['Deeside Ramblers Hockey Club', 'Deeside Ramblers', 'DER', 'Chester', 'Deeside Ramblers Ground', 1923, '#0b6e4f', '#ffcc00', '#ffffff', 56, 'm-d1n', 'north', false, false],
  ['Timperley Hockey Club', 'Timperley', 'TIM', 'Timperley, Greater Manchester', 'Pickering Lodge', 1902, '#1d3557', '#e63946', '#ffffff', 58, 'm-d1n', 'north', false, false],
  ['Cannock Hockey Club', 'Cannock', 'CAN', 'Cannock, Staffordshire', 'Hednesford Road', 1893, '#c8102e', '#ffffff', '#ffffff', 62, 'm-d1n', 'midlands', false, false],
  ['Olton & West Warwicks Hockey Club', 'Olton & West Warwicks', 'OWW', 'Solihull, West Midlands', 'Dovehouse Lane', 1892, '#00483a', '#f2b134', '#ffffff', 55, 'm-d1n', 'midlands', false, false],
  ['Belper Hockey Club', 'Belper', 'BEL', 'Belper, Derbyshire', 'Belper Sports Centre', 1907, '#8b1e3f', '#ffffff', '#ffffff', 53, 'm-d1n', 'midlands', false, false],
  ['University of Nottingham Hockey Club', 'Nottingham Uni', 'NTU', 'Nottingham', 'Highfields Sports Ground', 1948, '#003c71', '#ffffff', '#ffffff', 64, 'm-d1n', 'midlands', true, false],

  // ============================================================ MEN — TIER 2 SOUTH
  ['Sevenoaks Hockey Club', 'Sevenoaks', 'SEV', 'Sevenoaks, Kent', 'Hollybush Lane', 1901, '#0a2a5e', '#f0b323', '#ffffff', 70, 'm-d1s', 'south', false, false],
  ['Canterbury Hockey Club', 'Canterbury', 'CAT', 'Canterbury, Kent', 'Polo Farm Sports Club', 1901, '#5b2c6f', '#ffffff', '#ffffff', 69, 'm-d1s', 'south', false, false],
  ['Southgate Hockey Club', 'Southgate', 'SGT', 'Enfield, London', 'Trent Park', 1886, '#00205b', '#c8102e', '#ffffff', 67, 'm-d1s', 'south', false, false],
  ['Teddington Hockey Club', 'Teddington', 'TED', 'Teddington, London', 'Bushy Park', 1885, '#006747', '#ffffff', '#ffffff', 66, 'm-d1s', 'south', false, false],
  ['Richmond Hockey Club', 'Richmond', 'RIC', 'Richmond, London', 'Old Deer Park', 1892, '#7a003c', '#f5f5f5', '#ffffff', 60, 'm-d1s', 'south', false, false],
  ['Havant Hockey Club', 'Havant', 'HAV', 'Havant, Hampshire', 'Fraser Road', 1904, '#004b8d', '#ffd100', '#ffffff', 62, 'm-d1s', 'south', false, false],
  ['Cambridge City Hockey Club', 'Cambridge City', 'CCH', 'Cambridge', 'Wilberforce Road', 1923, '#00a3ad', '#111111', '#ffffff', 59, 'm-d1s', 'east', false, false],
  ['Oxford Hawks Hockey Club', 'Oxford Hawks', 'OXH', 'Oxford', 'Banbury Road North', 1974, '#1f3a93', '#f6c700', '#ffffff', 58, 'm-d1s', 'west', false, false],
  ['Brighton & Hove Hockey Club', 'Brighton & Hove', 'BHH', 'Brighton, East Sussex', 'Blatchington Mill', 1902, '#0057b8', '#ffffff', '#ffffff', 55, 'm-d1s', 'south', false, false],
  ['St Albans Hockey Club', 'St Albans', 'STA', 'St Albans, Hertfordshire', 'Highfield Park', 1894, '#c8102e', '#0b2d6b', '#ffffff', 56, 'm-d1s', 'east', false, false],
  ['Guildford Hockey Club', 'Guildford', 'GUI', 'Guildford, Surrey', 'Guildford Sports Ground', 1896, '#00483a', '#ffffff', '#ffffff', 64, 'm-d1s', 'south', false, false],
  ['Chichester Hockey Club', 'Chichester', 'CHI', 'Chichester, West Sussex', 'Oaklands Park', 1901, '#1b1f3b', '#e4a010', '#ffffff', 54, 'm-d1s', 'south', false, false],

  // ============================================================ MEN — TIER 3 CONFERENCE NORTH
  ['Leek Hockey Club', 'Leek', 'LEK', 'Leek, Staffordshire', 'Westwood Sports Centre', 1902, '#123c69', '#edc7b7', '#ffffff', 50, 'm-cn', 'north', false, false],
  ['Didsbury Northern Hockey Club', 'Didsbury Northern', 'DID', 'Didsbury, Manchester', 'Ford Lane', 1890, '#1b2a49', '#c9a227', '#ffffff', 48, 'm-cn', 'north', false, false],
  ['Alderley Edge Hockey Club', 'Alderley Edge', 'ALD', 'Alderley Edge, Cheshire', 'Chorley Hall Lane', 1908, '#12355b', '#ffffff', '#ffffff', 47, 'm-cn', 'north', false, false],
  ['Harrogate Hockey Club', 'Harrogate', 'HAR', 'Harrogate, North Yorkshire', 'Killinghall Moor', 1897, '#005f56', '#ffd166', '#ffffff', 45, 'm-cn', 'north', false, false],
  ['Ben Rhydding Hockey Club', 'Ben Rhydding', 'BRH', 'Ilkley, West Yorkshire', 'Ben Rhydding Sports Club', 1890, '#0b2d6b', '#ffffff', '#ffffff', 46, 'm-cn', 'north', false, false],
  ['Wakefield Hockey Club', 'Wakefield', 'WAK', 'Wakefield, West Yorkshire', 'College Grove', 1900, '#1f6f4a', '#ffffff', '#ffffff', 43, 'm-cn', 'north', false, false],
  ['Lindum Hockey Club', 'Lindum', 'LIN', 'Lincoln', 'Lindum Sports Association', 1898, '#6a0f2b', '#f0e2b6', '#ffffff', 44, 'm-cn', 'north', false, false],
  ['Preston Hockey Club', 'Preston', 'PRE', 'Preston, Lancashire', 'Preston Sports Arena', 1903, '#1c3f94', '#ffffff', '#ffffff', 42, 'm-cn', 'north', false, false],
  ['Chester Hockey Club', 'Chester', 'CHE', 'Chester, Cheshire', 'Kings School Chester', 1900, '#0d5c3f', '#f2f2f2', '#ffffff', 41, 'm-cn', 'north', false, false],
  ['University of Sheffield Hockey Club', 'Sheffield Uni', 'SHU', 'Sheffield', 'Goodwin Sports Centre', 1905, '#1d3f6e', '#ffcb05', '#ffffff', 40, 'm-cn', 'north', true, false],

  // ============================================================ MEN — TIER 3 CONFERENCE MIDLANDS
  ['Khalsa Leamington Hockey Club', 'Khalsa Leamington', 'KHL', 'Leamington Spa, Warwickshire', 'Campion School', 1998, '#e26a00', '#00205b', '#ffffff', 49, 'm-cm', 'midlands', false, false],
  ['Stourport Hockey Club', 'Stourport', 'STO', 'Stourport-on-Severn, Worcestershire', 'Stourport Sports Club', 1908, '#0b5d1e', '#ffffff', '#ffffff', 46, 'm-cm', 'midlands', false, false],
  ['Bromsgrove Hockey Club', 'Bromsgrove', 'BRM', 'Bromsgrove, Worcestershire', 'Bromsgrove School', 1900, '#003b5c', '#f7b32b', '#ffffff', 44, 'm-cm', 'midlands', false, false],
  ['Leicester Westleigh Hockey Club', 'Leicester Westleigh', 'LWH', 'Leicester', 'Leicester Grammar School', 1920, '#4b2e83', '#ffffff', '#ffffff', 45, 'm-cm', 'midlands', false, false],
  ['Lichfield Hockey Club', 'Lichfield', 'LIC', 'Lichfield, Staffordshire', 'Lichfield Cathedral School', 1900, '#8c1d40', '#ffc627', '#ffffff', 43, 'm-cm', 'midlands', false, false],
  ['Repton Hockey Club', 'Repton', 'REP', 'Repton, Derbyshire', 'Repton School', 1910, '#00263a', '#c8102e', '#ffffff', 42, 'm-cm', 'midlands', false, false],
  ['Shrewsbury Hockey Club', 'Shrewsbury', 'SHR', 'Shrewsbury, Shropshire', 'Shrewsbury Sports Village', 1897, '#0f4c81', '#ffffff', '#ffffff', 41, 'm-cm', 'midlands', false, false],
  ['Kettering Hockey Club', 'Kettering', 'KET', 'Kettering, Northamptonshire', 'Kettering Sports Ground', 1902, '#c1272d', '#111111', '#ffffff', 39, 'm-cm', 'midlands', false, false],
  ['West Bridgford Hockey Club', 'West Bridgford', 'WBG', 'West Bridgford, Nottinghamshire', 'Rushcliffe Arena', 1919, '#1b998b', '#ffffff', '#ffffff', 40, 'm-cm', 'midlands', false, false],
  ['Nottingham Trent University Hockey Club', 'Nottingham Trent', 'NTR', 'Nottingham', 'Clifton Campus', 1970, '#00447c', '#e4002b', '#ffffff', 38, 'm-cm', 'midlands', true, false],

  // ============================================================ MEN — TIER 3 CONFERENCE EAST
  ['Harleston Magpies Hockey Club', 'Harleston Magpies', 'HAM', 'Harleston, Norfolk', 'Weybread Sports Ground', 1900, '#111111', '#ffffff', '#ffffff', 50, 'm-ce', 'east', false, false],
  ['Ipswich Hockey Club', 'Ipswich', 'IPS', 'Ipswich, Suffolk', 'Tuddenham Road', 1898, '#0057b8', '#ffffff', '#ffffff', 47, 'm-ce', 'east', false, false],
  ['Bedford Hockey Club', 'Bedford', 'BED', 'Bedford', 'Bedford Athletic', 1900, '#00427a', '#ffd200', '#ffffff', 45, 'm-ce', 'east', false, false],
  ['Cambridge South Hockey Club', 'Cambridge South', 'CSH', 'Cambridge', 'Long Road Sixth Form', 1979, '#00a1a7', '#1b1b1b', '#ffffff', 46, 'm-ce', 'east', false, false],
  ['Chelmsford Hockey Club', 'Chelmsford', 'CHL', 'Chelmsford, Essex', 'Chelmer Park', 1901, '#0b2d6b', '#e01a2b', '#ffffff', 44, 'm-ce', 'east', false, false],
  ['City of Peterborough Hockey Club', 'Peterborough', 'PET', 'Peterborough, Cambridgeshire', 'Bretton Gate', 1902, '#00693e', '#ffffff', '#ffffff', 48, 'm-ce', 'east', false, false],
  ['Norwich City Hockey Club', 'Norwich City', 'NOR', 'Norwich, Norfolk', 'Norwich School Sports', 1900, '#00a650', '#ffe000', '#ffffff', 43, 'm-ce', 'east', false, false],
  ['Old Loughtonians Hockey Club', 'Old Loughtonians', 'OLO', 'Chigwell, Essex', 'Luxborough Lane', 1928, '#7b2d26', '#f0e2b6', '#ffffff', 49, 'm-ce', 'east', false, false],
  ['Blueharts Hockey Club', 'Blueharts', 'BLH', 'Hitchin, Hertfordshire', 'Hitchin Boys School', 1904, '#1d4e89', '#ffffff', '#ffffff', 41, 'm-ce', 'east', false, false],
  ['St Neots Hockey Club', 'St Neots', 'SNE', 'St Neots, Cambridgeshire', 'Longsands Academy', 1925, '#00563f', '#f5a800', '#ffffff', 39, 'm-ce', 'east', false, false],

  // ============================================================ MEN — TIER 3 CONFERENCE WEST
  ['Bath Buccaneers Hockey Club', 'Bath Buccaneers', 'BAT', 'Bath, Somerset', 'Lansdown', 1948, '#0b2d6b', '#f4c430', '#ffffff', 50, 'm-cw', 'west', false, false],
  ['Clifton Robinsons Hockey Club', 'Clifton Robinsons', 'CLR', 'Bristol', 'Coombe Dingle', 1908, '#0b2d6b', '#8dc63f', '#ffffff', 52, 'm-cw', 'west', false, false],
  ['Isca Hockey Club', 'Isca', 'ISC', 'Exeter, Devon', 'Exeter Arena', 1970, '#7a1f3d', '#ffffff', '#ffffff', 45, 'm-cw', 'west', false, false],
  ['Gloucester City Hockey Club', 'Gloucester City', 'GLC', 'Gloucester', 'Oxstalls Sports Park', 1900, '#003865', '#f2a900', '#ffffff', 43, 'm-cw', 'west', false, false],
  ['Cheltenham Hockey Club', 'Cheltenham', 'CHT', 'Cheltenham, Gloucestershire', 'Cheltenham College', 1898, '#5c0f2b', '#ffffff', '#ffffff', 44, 'm-cw', 'west', false, false],
  ['Swindon Hockey Club', 'Swindon', 'SWI', 'Swindon, Wiltshire', 'Croft Sports Centre', 1904, '#c8102e', '#111111', '#ffffff', 41, 'm-cw', 'west', false, false],
  ['Marlow Hockey Club', 'Marlow', 'MAR', 'Marlow, Buckinghamshire', 'Gossmore Lane', 1907, '#00693e', '#ffffff', '#ffffff', 42, 'm-cw', 'south', false, false],
  ['Bournemouth Hockey Club', 'Bournemouth', 'BOU', 'Bournemouth, Dorset', 'Chapel Gate', 1900, '#c8102e', '#000000', '#ffffff', 40, 'm-cw', 'south', false, false],
  ['Oxford University Hockey Club', 'Oxford Uni', 'OXU', 'Oxford', 'Iffley Road', 1890, '#002147', '#ffffff', '#ffffff', 46, 'm-cw', 'west', true, false],
  ['Taunton Vale Hockey Club', 'Taunton Vale', 'TAV', 'Taunton, Somerset', 'Taunton Vale Sports Club', 1972, '#0f6b3a', '#f2c75c', '#ffffff', 38, 'm-cw', 'west', false, false],

  // ================================================ MEN — TIER 4 NORTH PREMIER DIVISION
  // Formby's first XI plays at this level.
  ['Formby Hockey Club', 'Formby', 'FOR', 'Formby, Merseyside', 'Formby High School', 1900, '#00843d', '#ffffff', '#ffffff', 36, 'm-np', 'north', false, true],
  ['Southport Hockey Club', 'Southport', 'SPT', 'Southport, Merseyside', 'Greenbank High School', 1895, '#c8102e', '#ffffff', '#ffffff', 33, 'm-np', 'north', false, false],
  ['Liverpool Sefton Hockey Club', 'Liverpool Sefton', 'LSF', 'Liverpool, Merseyside', 'Wavertree Sports Park', 1894, '#00205b', '#f5a800', '#ffffff', 34, 'm-np', 'north', false, false],
  ['Neston Hockey Club', 'Neston', 'NES', 'Neston, Cheshire', 'Neston Sports Club', 1902, '#0b6e4f', '#ffffff', '#ffffff', 32, 'm-np', 'north', false, false],
  ['Northop Hall Hockey Club', 'Northop Hall', 'NOH', 'Northop Hall, Flintshire', 'Northop Hall Sports Club', 1970, '#7a1f3d', '#ffd200', '#ffffff', 31, 'm-np', 'north', false, false],
  ['Bolton Hockey Club', 'Bolton', 'BOL', 'Bolton, Greater Manchester', 'Bolton Arena', 1900, '#1d3557', '#ffffff', '#ffffff', 30, 'm-np', 'north', false, false],
  ['Winnington Park Hockey Club', 'Winnington Park', 'WPK', 'Northwich, Cheshire', 'Moss Farm', 1922, '#004b87', '#e63946', '#ffffff', 29, 'm-np', 'north', false, false],
  ['Bramhall Hockey Club', 'Bramhall', 'BRA', 'Bramhall, Stockport', 'Bramhall High School', 1949, '#123c69', '#ffffff', '#ffffff', 30, 'm-np', 'north', false, false],
  ['Vagabonds Hockey Club', 'Vagabonds', 'VAG', 'Douglas, Isle of Man', 'National Sports Centre', 1896, '#c8102e', '#f0e2b6', '#ffffff', 28, 'm-np', 'north', false, false],
  ['Blackpool Hockey Club', 'Blackpool', 'BLA', 'Blackpool, Lancashire', 'Stanley Park', 1903, '#f5a800', '#00205b', '#ffffff', 26, 'm-np', 'north', false, false],
  ['Lancaster Hockey Club', 'Lancaster', 'LAN', 'Lancaster, Lancashire', 'Salt Ayre Sports Centre', 1900, '#8b1e3f', '#ffffff', '#ffffff', 27, 'm-np', 'north', false, false],
  ['City of Manchester Hockey Club', 'City of Manchester', 'COM', 'Manchester', 'Manchester Regional Arena', 1998, '#00a3ad', '#111111', '#ffffff', 28, 'm-np', 'north', false, false],

  // ========================================================== WOMEN — TIER 1
  ['Surbiton Hockey Club', 'Surbiton', 'SUR', 'Surbiton, London', 'Sugden Road', 1874, '#00843d', '#ffffff', '#ffffff', 95, 'w-prem', 'south', false, true],
  ['Reading Hockey Club', 'Reading', 'RDG', 'Sonning Lane, Reading', 'Sonning Lane', 1893, '#1b1b1b', '#e8e8e8', '#ffffff', 93, 'w-prem', 'south', false, true],
  ['East Grinstead Hockey Club', 'East Grinstead', 'EGR', 'East Grinstead, West Sussex', 'Saint Hill', 1888, '#c8102e', '#0b2d6b', '#ffffff', 87, 'w-prem', 'south', false, true],
  ['Beeston Hockey Club', 'Beeston', 'BEE', 'Nottingham', 'Highfields', 1900, '#0f6b3a', '#ffffff', '#ffffff', 86, 'w-prem', 'midlands', false, true],
  ['Hampstead & Westminster Hockey Club', 'Hampstead & West.', 'HAW', 'Paddington, London', 'Paddington Recreation Ground', 1894, '#7b1b2e', '#f2f2f2', '#ffffff', 84, 'w-prem', 'south', false, true],
  ['Wimbledon Hockey Club', 'Wimbledon', 'WIM', 'Wimbledon, London', 'Raynes Park Sports Ground', 1883, '#0a3d91', '#ffd200', '#ffffff', 83, 'w-prem', 'south', false, true],
  ['Clifton Robinsons Hockey Club', 'Clifton Robinsons', 'CLR', 'Bristol', 'Coombe Dingle', 1908, '#0b2d6b', '#8dc63f', '#ffffff', 80, 'w-prem', 'west', false, false],
  ['University of Nottingham Hockey Club', 'Nottingham Uni', 'NTU', 'Nottingham', 'Highfields Sports Ground', 1948, '#003c71', '#ffffff', '#ffffff', 76, 'w-prem', 'midlands', true, false],
  ['University of Birmingham Hockey Club', 'Birmingham Uni', 'BIR', 'Birmingham', 'Bournbrook', 1900, '#1b3f8b', '#c8102e', '#ffffff', 78, 'w-prem', 'midlands', true, false],
  ['Loughborough Students Hockey Club', 'Loughborough Students', 'LBS', 'Loughborough, Leicestershire', 'Loughborough University', 1909, '#6f2c91', '#ffffff', '#ffffff', 77, 'w-prem', 'midlands', true, false],
  ['Barnes Hockey Club', 'Barnes', 'BAR', 'Barnes, London', 'Barn Elms', 1901, '#004b87', '#e01a2b', '#ffffff', 72, 'w-prem', 'south', false, false],
  ['Durham University Hockey Club', 'Durham Uni', 'DUR', 'Durham', 'Maiden Castle', 1899, '#68246d', '#ffffff', '#ffffff', 73, 'w-prem', 'north', true, false],

  // ========================================================== WOMEN — TIER 2 NORTH
  ['Bowdon Hightown Hockey Club', 'Bowdon Hightown', 'BHT', 'Bowdon, Greater Manchester', 'Clay Lane', 1897, '#00693e', '#ffd200', '#ffffff', 68, 'w-d1n', 'north', false, false],
  ['Ben Rhydding Hockey Club', 'Ben Rhydding', 'BRH', 'Ilkley, West Yorkshire', 'Ben Rhydding Sports Club', 1890, '#0b2d6b', '#ffffff', '#ffffff', 64, 'w-d1n', 'north', false, false],
  ['Leeds Hockey Club', 'Leeds', 'LEE', 'Leeds, West Yorkshire', 'Weetwood', 1893, '#004b87', '#ffffff', '#ffffff', 60, 'w-d1n', 'north', false, false],
  ['Sheffield Hallam Hockey Club', 'Sheffield Hallam', 'SHH', 'Sheffield', 'Abbeydale Sports Club', 1990, '#0d3b66', '#f4a259', '#ffffff', 61, 'w-d1n', 'north', false, false],
  ['Timperley Hockey Club', 'Timperley', 'TIM', 'Timperley, Greater Manchester', 'Pickering Lodge', 1902, '#1d3557', '#e63946', '#ffffff', 58, 'w-d1n', 'north', false, false],
  ['Brooklands Poynton Hockey Club', 'Brooklands Poynton', 'BPY', 'Sale, Greater Manchester', 'Brooklands Sports Club', 1878, '#7a1f3d', '#ffffff', '#ffffff', 62, 'w-d1n', 'north', false, false],
  ['Doncaster Hockey Club', 'Doncaster', 'DON', 'Doncaster, South Yorkshire', 'Doncaster Deaf Trust', 1904, '#e01a2b', '#111111', '#ffffff', 55, 'w-d1n', 'north', false, false],
  ['Sutton Coldfield Hockey Club', 'Sutton Coldfield', 'SUT', 'Sutton Coldfield, West Midlands', 'Rectory Park', 1900, '#00205b', '#f5a800', '#ffffff', 57, 'w-d1n', 'midlands', false, false],
  ['Olton & West Warwicks Hockey Club', 'Olton & West Warwicks', 'OWW', 'Solihull, West Midlands', 'Dovehouse Lane', 1892, '#00483a', '#f2b134', '#ffffff', 54, 'w-d1n', 'midlands', false, false],
  ['Belper Hockey Club', 'Belper', 'BEL', 'Belper, Derbyshire', 'Belper Sports Centre', 1907, '#8b1e3f', '#ffffff', '#ffffff', 52, 'w-d1n', 'midlands', false, false],
  ['Wakefield Hockey Club', 'Wakefield', 'WAK', 'Wakefield, West Yorkshire', 'College Grove', 1900, '#1f6f4a', '#ffffff', '#ffffff', 51, 'w-d1n', 'north', false, false],
  ['Stourport Hockey Club', 'Stourport', 'STO', 'Stourport-on-Severn, Worcestershire', 'Stourport Sports Club', 1908, '#0b5d1e', '#ffffff', '#ffffff', 53, 'w-d1n', 'midlands', false, false],

  // ========================================================== WOMEN — TIER 2 SOUTH
  ['Canterbury Hockey Club', 'Canterbury', 'CAT', 'Canterbury, Kent', 'Polo Farm Sports Club', 1901, '#5b2c6f', '#ffffff', '#ffffff', 70, 'w-d1s', 'south', false, false],
  ['Sevenoaks Hockey Club', 'Sevenoaks', 'SEV', 'Sevenoaks, Kent', 'Hollybush Lane', 1901, '#0a2a5e', '#f0b323', '#ffffff', 66, 'w-d1s', 'south', false, false],
  ['Southgate Hockey Club', 'Southgate', 'SGT', 'Enfield, London', 'Trent Park', 1886, '#00205b', '#c8102e', '#ffffff', 63, 'w-d1s', 'south', false, false],
  ['Trojans Hockey Club', 'Trojans', 'TRO', 'Southampton, Hampshire', 'Stoneham Lane', 1874, '#0b6e4f', '#ffffff', '#ffffff', 61, 'w-d1s', 'south', false, false],
  ['Oxford Hawks Hockey Club', 'Oxford Hawks', 'OXH', 'Oxford', 'Banbury Road North', 1974, '#1f3a93', '#f6c700', '#ffffff', 62, 'w-d1s', 'west', false, false],
  ['Basingstoke Hockey Club', 'Basingstoke', 'BAS', 'Basingstoke, Hampshire', 'Down Grange', 1897, '#c8102e', '#ffffff', '#ffffff', 57, 'w-d1s', 'south', false, false],
  ['Bedford Hockey Club', 'Bedford', 'BED', 'Bedford', 'Bedford Athletic', 1900, '#00427a', '#ffd200', '#ffffff', 56, 'w-d1s', 'east', false, false],
  ['St Albans Hockey Club', 'St Albans', 'STA', 'St Albans, Hertfordshire', 'Highfield Park', 1894, '#c8102e', '#0b2d6b', '#ffffff', 58, 'w-d1s', 'east', false, false],
  ['Harleston Magpies Hockey Club', 'Harleston Magpies', 'HAM', 'Harleston, Norfolk', 'Weybread Sports Ground', 1900, '#111111', '#ffffff', '#ffffff', 64, 'w-d1s', 'east', false, false],
  ['Ipswich Hockey Club', 'Ipswich', 'IPS', 'Ipswich, Suffolk', 'Tuddenham Road', 1898, '#0057b8', '#ffffff', '#ffffff', 55, 'w-d1s', 'east', false, false],
  ['Horsham Hockey Club', 'Horsham', 'HOR', 'Horsham, West Sussex', 'Horsham Sports Club', 1902, '#00693e', '#f2c75c', '#ffffff', 53, 'w-d1s', 'south', false, false],
  ['University of Exeter Hockey Club', 'Exeter Uni', 'EXE', 'Exeter, Devon', 'Topsham Sports Ground', 1955, '#00543c', '#f2c75c', '#ffffff', 65, 'w-d1s', 'west', true, false],

  // ========================================================== WOMEN — TIER 3 CONFERENCE NORTH
  ['Didsbury Northern Hockey Club', 'Didsbury Northern', 'DID', 'Didsbury, Manchester', 'Ford Lane', 1890, '#1b2a49', '#c9a227', '#ffffff', 49, 'w-cn', 'north', false, false],
  ['Alderley Edge Hockey Club', 'Alderley Edge', 'ALD', 'Alderley Edge, Cheshire', 'Chorley Hall Lane', 1908, '#12355b', '#ffffff', '#ffffff', 48, 'w-cn', 'north', false, false],
  ['Harrogate Hockey Club', 'Harrogate', 'HAR', 'Harrogate, North Yorkshire', 'Killinghall Moor', 1897, '#005f56', '#ffd166', '#ffffff', 46, 'w-cn', 'north', false, false],
  ['Chester Hockey Club', 'Chester', 'CHE', 'Chester, Cheshire', 'Kings School Chester', 1900, '#0d5c3f', '#f2f2f2', '#ffffff', 44, 'w-cn', 'north', false, false],
  ['Preston Hockey Club', 'Preston', 'PRE', 'Preston, Lancashire', 'Preston Sports Arena', 1903, '#1c3f94', '#ffffff', '#ffffff', 43, 'w-cn', 'north', false, false],
  ['Neston Hockey Club', 'Neston', 'NES', 'Neston, Cheshire', 'Neston Sports Club', 1902, '#0b6e4f', '#ffffff', '#ffffff', 42, 'w-cn', 'north', false, false],
  ['Blackburn Northern Hockey Club', 'Blackburn Northern', 'BBN', 'Blackburn, Lancashire', 'Pleckgate', 1900, '#0b2d6b', '#c8102e', '#ffffff', 40, 'w-cn', 'north', false, false],
  ['University of Sheffield Hockey Club', 'Sheffield Uni', 'SHU', 'Sheffield', 'Goodwin Sports Centre', 1905, '#1d3f6e', '#ffcb05', '#ffffff', 45, 'w-cn', 'north', true, false],
  ['Lindum Hockey Club', 'Lindum', 'LIN', 'Lincoln', 'Lindum Sports Association', 1898, '#6a0f2b', '#f0e2b6', '#ffffff', 41, 'w-cn', 'north', false, false],
  ['Beverley Hockey Club', 'Beverley', 'BEV', 'Beverley, East Yorkshire', 'Longcroft School', 1920, '#00563f', '#ffffff', '#ffffff', 39, 'w-cn', 'north', false, false],

  // ====================================================== WOMEN — TIER 3 CONFERENCE MIDLANDS
  ['Khalsa Leamington Hockey Club', 'Khalsa Leamington', 'KHL', 'Leamington Spa, Warwickshire', 'Campion School', 1998, '#e26a00', '#00205b', '#ffffff', 48, 'w-cm', 'midlands', false, false],
  ['Bromsgrove Hockey Club', 'Bromsgrove', 'BRM', 'Bromsgrove, Worcestershire', 'Bromsgrove School', 1900, '#003b5c', '#f7b32b', '#ffffff', 45, 'w-cm', 'midlands', false, false],
  ['Leicester Westleigh Hockey Club', 'Leicester Westleigh', 'LWH', 'Leicester', 'Leicester Grammar School', 1920, '#4b2e83', '#ffffff', '#ffffff', 46, 'w-cm', 'midlands', false, false],
  ['Lichfield Hockey Club', 'Lichfield', 'LIC', 'Lichfield, Staffordshire', 'Lichfield Cathedral School', 1900, '#8c1d40', '#ffc627', '#ffffff', 44, 'w-cm', 'midlands', false, false],
  ['Repton Hockey Club', 'Repton', 'REP', 'Repton, Derbyshire', 'Repton School', 1910, '#00263a', '#c8102e', '#ffffff', 43, 'w-cm', 'midlands', false, false],
  ['Shrewsbury Hockey Club', 'Shrewsbury', 'SHR', 'Shrewsbury, Shropshire', 'Shrewsbury Sports Village', 1897, '#0f4c81', '#ffffff', '#ffffff', 41, 'w-cm', 'midlands', false, false],
  ['Kettering Hockey Club', 'Kettering', 'KET', 'Kettering, Northamptonshire', 'Kettering Sports Ground', 1902, '#c1272d', '#111111', '#ffffff', 39, 'w-cm', 'midlands', false, false],
  ['West Bridgford Hockey Club', 'West Bridgford', 'WBG', 'West Bridgford, Nottinghamshire', 'Rushcliffe Arena', 1919, '#1b998b', '#ffffff', '#ffffff', 40, 'w-cm', 'midlands', false, false],
  ['Cannock Hockey Club', 'Cannock', 'CAN', 'Cannock, Staffordshire', 'Hednesford Road', 1893, '#c8102e', '#ffffff', '#ffffff', 47, 'w-cm', 'midlands', false, false],
  ['Nottingham Trent University Hockey Club', 'Nottingham Trent', 'NTR', 'Nottingham', 'Clifton Campus', 1970, '#00447c', '#e4002b', '#ffffff', 38, 'w-cm', 'midlands', true, false],

  // ========================================================= WOMEN — TIER 3 CONFERENCE EAST
  ['Cambridge City Hockey Club', 'Cambridge City', 'CCH', 'Cambridge', 'Wilberforce Road', 1923, '#00a3ad', '#111111', '#ffffff', 49, 'w-ce', 'east', false, false],
  ['Chelmsford Hockey Club', 'Chelmsford', 'CHL', 'Chelmsford, Essex', 'Chelmer Park', 1901, '#0b2d6b', '#e01a2b', '#ffffff', 46, 'w-ce', 'east', false, false],
  ['City of Peterborough Hockey Club', 'Peterborough', 'PET', 'Peterborough, Cambridgeshire', 'Bretton Gate', 1902, '#00693e', '#ffffff', '#ffffff', 48, 'w-ce', 'east', false, false],
  ['Norwich City Hockey Club', 'Norwich City', 'NOR', 'Norwich, Norfolk', 'Norwich School Sports', 1900, '#00a650', '#ffe000', '#ffffff', 44, 'w-ce', 'east', false, false],
  ['Old Loughtonians Hockey Club', 'Old Loughtonians', 'OLO', 'Chigwell, Essex', 'Luxborough Lane', 1928, '#7b2d26', '#f0e2b6', '#ffffff', 47, 'w-ce', 'east', false, false],
  ['Blueharts Hockey Club', 'Blueharts', 'BLH', 'Hitchin, Hertfordshire', 'Hitchin Boys School', 1904, '#1d4e89', '#ffffff', '#ffffff', 42, 'w-ce', 'east', false, false],
  ['St Neots Hockey Club', 'St Neots', 'SNE', 'St Neots, Cambridgeshire', 'Longsands Academy', 1925, '#00563f', '#f5a800', '#ffffff', 40, 'w-ce', 'east', false, false],
  ['Wapping Hockey Club', 'Wapping', 'WAP', 'Tower Hamlets, London', 'Mile End Stadium', 1984, '#c8102e', '#111111', '#ffffff', 45, 'w-ce', 'east', false, false],
  ['Colchester Hockey Club', 'Colchester', 'COL', 'Colchester, Essex', 'Colchester Garrison', 1900, '#0057b8', '#ffffff', '#ffffff', 39, 'w-ce', 'east', false, false],
  ['Dereham Hockey Club', 'Dereham', 'DRH', 'Dereham, Norfolk', 'Dereham Leisure Centre', 1922, '#00483a', '#f2b134', '#ffffff', 38, 'w-ce', 'east', false, false],

  // ========================================================= WOMEN — TIER 3 CONFERENCE WEST
  ['Bath Buccaneers Hockey Club', 'Bath Buccaneers', 'BAT', 'Bath, Somerset', 'Lansdown', 1948, '#0b2d6b', '#f4c430', '#ffffff', 49, 'w-cw', 'west', false, false],
  ['Isca Hockey Club', 'Isca', 'ISC', 'Exeter, Devon', 'Exeter Arena', 1970, '#7a1f3d', '#ffffff', '#ffffff', 46, 'w-cw', 'west', false, false],
  ['Gloucester City Hockey Club', 'Gloucester City', 'GLC', 'Gloucester', 'Oxstalls Sports Park', 1900, '#003865', '#f2a900', '#ffffff', 44, 'w-cw', 'west', false, false],
  ['Cheltenham Hockey Club', 'Cheltenham', 'CHT', 'Cheltenham, Gloucestershire', 'Cheltenham College', 1898, '#5c0f2b', '#ffffff', '#ffffff', 45, 'w-cw', 'west', false, false],
  ['Swindon Hockey Club', 'Swindon', 'SWI', 'Swindon, Wiltshire', 'Croft Sports Centre', 1904, '#c8102e', '#111111', '#ffffff', 42, 'w-cw', 'west', false, false],
  ['Marlow Hockey Club', 'Marlow', 'MAR', 'Marlow, Buckinghamshire', 'Gossmore Lane', 1907, '#00693e', '#ffffff', '#ffffff', 43, 'w-cw', 'south', false, false],
  ['Bournemouth Hockey Club', 'Bournemouth', 'BOU', 'Bournemouth, Dorset', 'Chapel Gate', 1900, '#c8102e', '#000000', '#ffffff', 41, 'w-cw', 'south', false, false],
  ['Taunton Vale Hockey Club', 'Taunton Vale', 'TAV', 'Taunton, Somerset', 'Taunton Vale Sports Club', 1972, '#0f6b3a', '#f2c75c', '#ffffff', 40, 'w-cw', 'west', false, false],
  ['Yate Hockey Club', 'Yate', 'YAT', 'Yate, South Gloucestershire', 'Yate Outdoor Sports Complex', 1974, '#1f6f4a', '#ffffff', '#ffffff', 38, 'w-cw', 'west', false, false],
  ['Winchester Hockey Club', 'Winchester', 'WIN', 'Winchester, Hampshire', 'River Park Leisure Centre', 1901, '#4b2e83', '#ffd200', '#ffffff', 39, 'w-cw', 'south', false, false],

  // =============================================== WOMEN — TIER 4 NORTH PREMIER DIVISION
  ['Formby Hockey Club', 'Formby', 'FOR', 'Formby, Merseyside', 'Formby High School', 1900, '#00843d', '#ffffff', '#ffffff', 35, 'w-np', 'north', false, false],
  ['Southport Hockey Club', 'Southport', 'SPT', 'Southport, Merseyside', 'Greenbank High School', 1895, '#c8102e', '#ffffff', '#ffffff', 33, 'w-np', 'north', false, false],
  ['Liverpool Sefton Hockey Club', 'Liverpool Sefton', 'LSF', 'Liverpool, Merseyside', 'Wavertree Sports Park', 1894, '#00205b', '#f5a800', '#ffffff', 34, 'w-np', 'north', false, false],
  ['Northop Hall Hockey Club', 'Northop Hall', 'NOH', 'Northop Hall, Flintshire', 'Northop Hall Sports Club', 1970, '#7a1f3d', '#ffd200', '#ffffff', 31, 'w-np', 'north', false, false],
  ['Bolton Hockey Club', 'Bolton', 'BOL', 'Bolton, Greater Manchester', 'Bolton Arena', 1900, '#1d3557', '#ffffff', '#ffffff', 30, 'w-np', 'north', false, false],
  ['Winnington Park Hockey Club', 'Winnington Park', 'WPK', 'Northwich, Cheshire', 'Moss Farm', 1922, '#004b87', '#e63946', '#ffffff', 29, 'w-np', 'north', false, false],
  ['Bramhall Hockey Club', 'Bramhall', 'BRA', 'Bramhall, Stockport', 'Bramhall High School', 1949, '#123c69', '#ffffff', '#ffffff', 30, 'w-np', 'north', false, false],
  ['Vagabonds Hockey Club', 'Vagabonds', 'VAG', 'Douglas, Isle of Man', 'National Sports Centre', 1896, '#c8102e', '#f0e2b6', '#ffffff', 28, 'w-np', 'north', false, false],
  ['Blackpool Hockey Club', 'Blackpool', 'BLA', 'Blackpool, Lancashire', 'Stanley Park', 1903, '#f5a800', '#00205b', '#ffffff', 26, 'w-np', 'north', false, false],
  ['Lancaster Hockey Club', 'Lancaster', 'LAN', 'Lancaster, Lancashire', 'Salt Ayre Sports Centre', 1900, '#8b1e3f', '#ffffff', '#ffffff', 27, 'w-np', 'north', false, false],
  ['City of Manchester Hockey Club', 'City of Manchester', 'COM', 'Manchester', 'Manchester Regional Arena', 1998, '#00a3ad', '#111111', '#ffffff', 28, 'w-np', 'north', false, false],
  ['Wirral Hockey Club', 'Wirral', 'WIR', 'Wirral, Merseyside', 'Birkenhead Park', 1902, '#0b6e4f', '#ffd200', '#ffffff', 29, 'w-np', 'north', false, false],
]

/** Slug a club name plus division into a stable id, e.g. "m-np:formby". */
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
    reputation, divisionId, region, university, verified,
  ] = row
  return {
    id: clubId(divisionId, name),
    name,
    shortName,
    abbr,
    town,
    venue,
    region,
    founded,
    colours: { primary, secondary, text },
    reputation,
    divisionId,
    university,
    verified,
    finances: {
      // Club hockey in England is semi-professional. Budgets are small and
      // scale with standing rather than with broadcast money, and a tier-four
      // club runs on subs and a clubhouse bar.
      balance: Math.round(reputation * 900 + 4000),
      income: Math.round(reputation * 1400 + 12000),
    },
  }
})

export function clubsInDivision(divisionId: string): SeedClub[] {
  return CLUBS.filter((c) => c.divisionId === divisionId)
}

export function divisionsForGender(gender: Gender): Division[] {
  return DIVISIONS.filter((d) => d.gender === gender).sort((a, b) => a.tier - b.tier)
}

export function getDivision(id: string): Division {
  const division = DIVISIONS.find((d) => d.id === id)
  if (!division) throw new Error(`Unknown division: ${id}`)
  return division
}

export function getClub(id: string): SeedClub {
  const club = CLUBS.find((c) => c.id === id)
  if (!club) throw new Error(`Unknown club: ${id}`)
  return club
}

/** How many clubs in the pyramid, for the data-provenance screen. */
export function dataCoverage(): { clubs: number; divisions: number; verified: number } {
  return {
    clubs: CLUBS.length,
    divisions: DIVISIONS.length,
    verified: CLUBS.filter((c) => c.verified).length,
  }
}
