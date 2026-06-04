/**
 * Canonical 33 London boroughs + City of London.
 * Names match frontend LONDON_AREAS and SEO borough pages.
 */

export interface BoroughCentroid {
  name: string;
  lat: number;
  lon: number;
}

export const CANONICAL_LONDON_BOROUGHS: readonly BoroughCentroid[] = [
  { name: 'City of London', lat: 51.5155, lon: -0.0922 },
  { name: 'Westminster', lat: 51.4975, lon: -0.1357 },
  { name: 'Kensington and Chelsea', lat: 51.502, lon: -0.1949 },
  { name: 'Hammersmith and Fulham', lat: 51.492, lon: -0.2229 },
  { name: 'Wandsworth', lat: 51.4567, lon: -0.191 },
  { name: 'Lambeth', lat: 51.4607, lon: -0.1163 },
  { name: 'Southwark', lat: 51.4834, lon: -0.0824 },
  { name: 'Tower Hamlets', lat: 51.5099, lon: -0.0237 },
  { name: 'Hackney', lat: 51.545, lon: -0.0553 },
  { name: 'Islington', lat: 51.5416, lon: -0.1022 },
  { name: 'Camden', lat: 51.529, lon: -0.1258 },
  { name: 'Brent', lat: 51.5588, lon: -0.2817 },
  { name: 'Ealing', lat: 51.513, lon: -0.3089 },
  { name: 'Hounslow', lat: 51.4746, lon: -0.368 },
  { name: 'Richmond upon Thames', lat: 51.4479, lon: -0.326 },
  { name: 'Kingston upon Thames', lat: 51.4085, lon: -0.3064 },
  { name: 'Merton', lat: 51.4014, lon: -0.1958 },
  { name: 'Sutton', lat: 51.3618, lon: -0.1945 },
  { name: 'Croydon', lat: 51.3718, lon: -0.0977 },
  { name: 'Bromley', lat: 51.355, lon: 0.0556 },
  { name: 'Lewisham', lat: 51.4452, lon: -0.0209 },
  { name: 'Greenwich', lat: 51.4892, lon: 0.0648 },
  { name: 'Bexley', lat: 51.4549, lon: 0.1505 },
  { name: 'Havering', lat: 51.5812, lon: 0.1837 },
  { name: 'Barking and Dagenham', lat: 51.5607, lon: 0.1557 },
  { name: 'Redbridge', lat: 51.5886, lon: 0.0772 },
  { name: 'Newham', lat: 51.53, lon: 0.02 },
  { name: 'Waltham Forest', lat: 51.5908, lon: -0.0134 },
  { name: 'Haringey', lat: 51.59, lon: -0.111 },
  { name: 'Enfield', lat: 51.6562, lon: -0.08 },
  { name: 'Barnet', lat: 51.6252, lon: -0.2032 },
  { name: 'Harrow', lat: 51.5898, lon: -0.3346 },
  { name: 'Hillingdon', lat: 51.5441, lon: -0.476 },
] as const;

const CANONICAL_SET = new Set(CANONICAL_LONDON_BOROUGHS.map((b) => b.name));

/** Normalise free-text / Nominatim borough strings to a canonical name, or null. */
export function normalizeLondonBorough(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  let s = raw.trim().replace(/\s+/g, ' ');

  // Nominatim: "London Borough of Tower Hamlets"
  const lbMatch = s.match(/^London Borough of (.+)$/i);
  if (lbMatch) s = lbMatch[1].trim();

  if (s.match(/^City (and County )?of (the )?City of London/i)) return 'City of London';
  if (s.match(/^Royal Borough of /i)) s = s.replace(/^Royal Borough of /i, '').trim();

  // Case-insensitive exact match
  for (const b of CANONICAL_LONDON_BOROUGHS) {
    if (b.name.toLowerCase() === s.toLowerCase()) return b.name;
  }

  // Common aliases
  const aliases: Record<string, string> = {
    'hammersmith': 'Hammersmith and Fulham',
    'fulham': 'Hammersmith and Fulham',
    'kensington': 'Kensington and Chelsea',
    'chelsea': 'Kensington and Chelsea',
    'barking': 'Barking and Dagenham',
    'dagenham': 'Barking and Dagenham',
    'richmond': 'Richmond upon Thames',
    'kingston': 'Kingston upon Thames',
    'waltham forest': 'Waltham Forest',
    'tower hamlets': 'Tower Hamlets',
    'city of london': 'City of London',
  };
  const key = s.toLowerCase();
  if (aliases[key]) return aliases[key];
  if (CANONICAL_SET.has(s)) return s;

  return null;
}

export function geocodeBoroughCentroid(borough: string): BoroughCentroid | null {
  const norm = normalizeLondonBorough(borough);
  if (!norm) return null;
  return CANONICAL_LONDON_BOROUGHS.find((b) => b.name === norm) ?? null;
}
