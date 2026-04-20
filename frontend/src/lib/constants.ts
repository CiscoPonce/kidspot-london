export const LONDON_AREAS = [
  "Camden",
  "Greenwich",
  "Hackney",
  "Hammersmith and Fulham",
  "Islington",
  "Kensington and Chelsea",
  "Lambeth",
  "Lewisham",
  "Southwark",
  "Tower Hamlets",
  "Wandsworth",
  "Westminster",
  "Barking and Dagenham",
  "Barnet",
  "Bexley",
  "Brent",
  "Bromley",
  "Croydon",
  "Ealing",
  "Enfield",
  "Haringey",
  "Harrow",
  "Havering",
  "Hillingdon",
  "Hounslow",
  "Kingston upon Thames",
  "Merton",
  "Newham",
  "Redbridge",
  "Richmond upon Thames",
  "Sutton",
  "Waltham Forest",
  "City of London"
] as const;

export type LondonArea = typeof LONDON_AREAS[number];

export const VENUE_TYPES = [
  { id: 'soft-play', label: 'Soft Play', value: 'softplay' },
  { id: 'community-hall', label: 'Community Halls', value: 'community_hall' },
  { id: 'leisure-centre', label: 'Leisure Centres', value: 'leisure_centre' },
  { id: 'library', label: 'Libraries', value: 'library' },
  { id: 'park', label: 'Parks & Playgrounds', value: 'park' },
  { id: 'museum', label: 'Museums', value: 'museum' },
  { id: 'cafe', label: 'Child-Friendly Cafes', value: 'cafe' }
] as const;

export type VenueType = typeof VENUE_TYPES[number]['id'];
