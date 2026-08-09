/**
 * Name pools used to generate squads when no real squad data has been imported.
 *
 * These are ordinary British given names and surnames, combined at random. They
 * are not intended to resemble any specific person. Once real squads are
 * imported into data/squads/, generated names are only used to pad a squad out
 * to a legal size.
 */

export const MALE_FIRST_NAMES = [
  'Alex', 'Alfie', 'Andrew', 'Angus', 'Archie', 'Arthur', 'Ben', 'Callum', 'Cameron', 'Charlie',
  'Chris', 'Dan', 'David', 'Dominic', 'Ed', 'Elliot', 'Finn', 'Freddie', 'George', 'Harry',
  'Henry', 'Hugo', 'Isaac', 'Jack', 'Jacob', 'James', 'Jamie', 'Joe', 'Jonny', 'Josh',
  'Kieran', 'Lewis', 'Liam', 'Louis', 'Luke', 'Marcus', 'Matt', 'Max', 'Michael', 'Nathan',
  'Nick', 'Oliver', 'Ollie', 'Oscar', 'Owen', 'Patrick', 'Peter', 'Reuben', 'Rhys', 'Richard',
  'Robbie', 'Rory', 'Ross', 'Sam', 'Scott', 'Sean', 'Seb', 'Simon', 'Stuart', 'Theo',
  'Thomas', 'Tim', 'Toby', 'Tom', 'Will', 'Zach',
]

export const FEMALE_FIRST_NAMES = [
  'Abbie', 'Alice', 'Amelia', 'Amy', 'Anna', 'Beth', 'Bryony', 'Caitlin', 'Charlotte', 'Chloe',
  'Claire', 'Daisy', 'Ella', 'Ellie', 'Emily', 'Emma', 'Erin', 'Esme', 'Eve', 'Fiona',
  'Freya', 'Georgia', 'Grace', 'Hannah', 'Harriet', 'Hollie', 'Imogen', 'Isabel', 'Isla', 'Issy',
  'Jess', 'Jodie', 'Josie', 'Katie', 'Keira', 'Laura', 'Leah', 'Libby', 'Lily', 'Lucy',
  'Maddie', 'Maisie', 'Martha', 'Megan', 'Mia', 'Millie', 'Molly', 'Naomi', 'Niamh', 'Olivia',
  'Phoebe', 'Poppy', 'Rachel', 'Rebecca', 'Rosie', 'Ruby', 'Sarah', 'Sophie', 'Tess', 'Tilly',
  'Verity', 'Zara', 'Zoe',
]

export const SURNAMES = [
  'Abbott', 'Adams', 'Allen', 'Andrews', 'Ashby', 'Atkinson', 'Bailey', 'Baker', 'Ball', 'Barlow',
  'Barnes', 'Bell', 'Bennett', 'Berry', 'Bishop', 'Blake', 'Bolton', 'Bond', 'Booth', 'Bowen',
  'Bradley', 'Brooks', 'Brown', 'Bryant', 'Burton', 'Butler', 'Campbell', 'Carter', 'Chapman', 'Clark',
  'Clarke', 'Cole', 'Collins', 'Cooper', 'Cox', 'Craig', 'Crawford', 'Cross', 'Curtis', 'Dale',
  'Davies', 'Dawson', 'Dixon', 'Doyle', 'Duncan', 'Dunn', 'Edwards', 'Elliott', 'Ellis', 'Evans',
  'Farrell', 'Fisher', 'Fletcher', 'Ford', 'Foster', 'Fox', 'Francis', 'Fraser', 'Gale', 'Gardner',
  'George', 'Gibson', 'Gill', 'Gordon', 'Graham', 'Grant', 'Gray', 'Green', 'Griffiths', 'Hall',
  'Hamilton', 'Hancock', 'Harding', 'Hardy', 'Harper', 'Harris', 'Harrison', 'Hart', 'Harvey', 'Hayes',
  'Haywood', 'Henderson', 'Hicks', 'Hill', 'Hodgson', 'Holland', 'Holmes', 'Hooper', 'Hopkins', 'Howard',
  'Hughes', 'Hunt', 'Hunter', 'Jackson', 'James', 'Jenkins', 'Johnson', 'Jones', 'Kelly', 'Kemp',
  'Kennedy', 'Kerr', 'King', 'Knight', 'Lambert', 'Lane', 'Lawrence', 'Lawson', 'Lee', 'Lewis',
  'Lloyd', 'Long', 'Lowe', 'Lucas', 'Lynch', 'Mackenzie', 'Marsh', 'Marshall', 'Martin', 'Mason',
  'Matthews', 'May', 'McDonald', 'Miller', 'Mills', 'Mitchell', 'Moore', 'Moran', 'Morgan', 'Morris',
  'Murphy', 'Murray', 'Nash', 'Naylor', 'Newman', 'Nicholls', 'Norris', 'Owen', 'Page', 'Palmer',
  'Parker', 'Parsons', 'Patel', 'Payne', 'Pearce', 'Pearson', 'Perry', 'Phillips', 'Pope', 'Porter',
  'Potter', 'Powell', 'Price', 'Pritchard', 'Quinn', 'Read', 'Reed', 'Reid', 'Reynolds', 'Rhodes',
  'Richards', 'Richardson', 'Riley', 'Roberts', 'Robertson', 'Robinson', 'Rogers', 'Rose', 'Ross', 'Rowe',
  'Russell', 'Ryan', 'Sanders', 'Saunders', 'Savage', 'Scott', 'Shaw', 'Sheppard', 'Short', 'Simpson',
  'Sinclair', 'Slater', 'Smith', 'Spencer', 'Stevens', 'Stewart', 'Stone', 'Sutton', 'Swift', 'Talbot',
  'Taylor', 'Thomas', 'Thompson', 'Thomson', 'Turner', 'Wade', 'Walker', 'Wallace', 'Walsh', 'Ward',
  'Warren', 'Watkins', 'Watson', 'Watts', 'Webb', 'Webster', 'Wells', 'West', 'Wheeler', 'White',
  'Whitfield', 'Wilkinson', 'Williams', 'Wilson', 'Wood', 'Woods', 'Wright', 'Young',
]

/**
 * Overseas players are a real feature of the England Hockey League, but only
 * near the top of it. A Premier Division club regularly signs Dutch, Australian
 * and South African players; a club league side in Merseyside is drawn almost
 * entirely from within twenty miles.
 *
 * `tier` marks how far down the pyramid a nationality realistically appears:
 *   'home'     — England, and the other home nations, at every level.
 *   'overseas' — scaled down sharply with club reputation.
 */
export const NATIONALITY_WEIGHTS: {
  code: string
  label: string
  weight: number
  origin: 'england' | 'home' | 'overseas'
}[] = [
  { code: 'ENG', label: 'England', weight: 74, origin: 'england' },
  { code: 'WAL', label: 'Wales', weight: 4, origin: 'home' },
  { code: 'SCO', label: 'Scotland', weight: 4, origin: 'home' },
  { code: 'IRL', label: 'Ireland', weight: 3, origin: 'home' },
  { code: 'NED', label: 'Netherlands', weight: 3, origin: 'overseas' },
  { code: 'AUS', label: 'Australia', weight: 3, origin: 'overseas' },
  { code: 'RSA', label: 'South Africa', weight: 3, origin: 'overseas' },
  { code: 'GER', label: 'Germany', weight: 2, origin: 'overseas' },
  { code: 'ARG', label: 'Argentina', weight: 1, origin: 'overseas' },
  { code: 'IND', label: 'India', weight: 1, origin: 'overseas' },
  { code: 'NZL', label: 'New Zealand', weight: 1, origin: 'overseas' },
  { code: 'ESP', label: 'Spain', weight: 1, origin: 'overseas' },
]

/** Surname pools for the non-British nationalities, so overseas signings read right. */
export const FOREIGN_SURNAMES: Record<string, string[]> = {
  NED: ['de Jong', 'van Dam', 'Bakker', 'Visser', 'van Dijk', 'Jansen', 'de Vries', 'Mulder', 'Brouwer', 'van Leeuwen', 'Hoekstra', 'Verbeek'],
  AUS: ['Beale', 'Govers', 'Hayward', 'Wickham', 'Dawson', 'Sharp', 'Craig', 'Wilson', 'Brooks', 'Kavanagh'],
  RSA: ['Botha', 'du Toit', 'van der Merwe', 'Pretorius', 'Nel', 'Coetzee', 'Jacobs', 'Meyer', 'Steyn', 'Naidoo'],
  GER: ['Müller', 'Schmidt', 'Weber', 'Becker', 'Hoffmann', 'Wagner', 'Herzbruch', 'Grambusch', 'Zwicker', 'Fuchs'],
  ARG: ['Fernández', 'Martínez', 'Domene', 'Rey', 'Vila', 'Peillat', 'Ibarra', 'Gilardi', 'Sánchez', 'Ortiz'],
  IND: ['Singh', 'Kumar', 'Sharma', 'Reddy', 'Pillay', 'Chandran', 'Patel', 'Das', 'Yadav', 'Nair'],
  NZL: ['Hayde', 'Findlay', 'Russell', 'Child', 'Inglis', 'Macdonald', 'Watt', 'Lane'],
  ESP: ['García', 'Alegre', 'Bonastre', 'Ruiz', 'Miralles', 'Cunill', 'Reyné', 'Salles'],
  IRL: ["O'Brien", "O'Donoghue", 'Kelly', 'Walsh', 'Murphy', 'Byrne', 'Gormley', 'Cargo', 'Nelson'],
  SCO: ['Macdonald', 'Cameron', 'Ferguson', 'Robertson', 'Sinclair', 'Duncan', 'Fraser', 'Ralph'],
  WAL: ['Evans', 'Jones', 'Williams', 'Davies', 'Thomas', 'Rees', 'Morgan', 'Furlong'],
}

export const FOREIGN_FIRST_NAMES: Record<string, { men: string[]; women: string[] }> = {
  NED: { men: ['Thijs', 'Sander', 'Jip', 'Koen', 'Bram', 'Joep', 'Thierry', 'Floris'], women: ['Anne', 'Lidewij', 'Marijn', 'Fleur', 'Sanne', 'Xan', 'Pien', 'Yibbi'] },
  AUS: { men: ['Blake', 'Jake', 'Tom', 'Flynn', 'Corey', 'Lachlan', 'Jacob', 'Nathan'], women: ['Steph', 'Amy', 'Rosie', 'Kaitlin', 'Grace', 'Maddy', 'Jane', 'Ambrosia'] },
  RSA: { men: ['Dayaan', 'Keenan', 'Ignatius', 'Ryan', 'Matthew', 'Tevin', 'Nqobile'], women: ['Tarryn', 'Lilian', 'Kristen', 'Phumelela', 'Bianca', 'Erin'] },
  GER: { men: ['Niklas', 'Tom', 'Lukas', 'Jan', 'Moritz', 'Justus', 'Christopher'], women: ['Charlotte', 'Nike', 'Sonja', 'Hanna', 'Lisa', 'Pauline', 'Anne'] },
  ARG: { men: ['Agustín', 'Lucas', 'Maico', 'Nicolás', 'Tomás', 'Facundo', 'Martín'], women: ['Agustina', 'Delfina', 'Victoria', 'Julieta', 'Sofía', 'Valentina'] },
  IND: { men: ['Harmanpreet', 'Manpreet', 'Akashdeep', 'Rupinder', 'Vivek', 'Sumit'], women: ['Rani', 'Savita', 'Vandana', 'Neha', 'Deep', 'Sushila'] },
  NZL: { men: ['Kane', 'Sam', 'Hayden', 'Nick', 'Simon', 'Jared'], women: ['Olivia', 'Frances', 'Rose', 'Megan', 'Tessa', 'Hope'] },
  ESP: { men: ['Marc', 'Pau', 'Álvaro', 'Xavi', 'Borja', 'Enrique'], women: ['Lucía', 'Berta', 'Carola', 'Georgina', 'Beatriz', 'Marta'] },
  IRL: { men: ['Shane', 'Conor', 'Sean', 'Peter', 'Daragh', 'Michael'], women: ['Róisín', 'Katie', 'Sarah', 'Niamh', 'Hannah', 'Ellen'] },
  SCO: { men: ['Callum', 'Rory', 'Alan', 'Struan', 'Cammy', 'Fraser'], women: ['Sarah', 'Amy', 'Fiona', 'Katie', 'Charlotte', 'Ruth'] },
  WAL: { men: ['Rhys', 'Gareth', 'Dafydd', 'Owain', 'Lewis', 'Ioan'], women: ['Carys', 'Ffion', 'Eleri', 'Sioned', 'Bethan', 'Leah'] },
}
