/**
 * Curated London Kids' Birthday Party Venues Seed Script.
 *
 * 1. Promotes verified existing DB venues (Castle Climbing, Climbing District,
 *    Coram's Fields, Mudchute Park & Farm) to party_capable = TRUE, venue_scope = 'core'.
 * 2. Geocodes verified postcodes via postcodes.io (free UK govt data) and
 *    inserts 21 open, high-demand London kids' party venues across role-play
 *    villages, boutique play cafes, gymnastics, bowling, farms, circus, and pottery.
 *
 * Usage:
 *   npx tsx scripts/discovery/sources/seed-curated-london-venues.ts
 */

import { fileURLToPath } from 'node:url';
import { db } from '../../../src/clients/db.js';
import { logger } from '../../../src/config/logger.js';

interface CuratedVenue {
  name: string;
  type: 'softplay' | 'community_hall' | 'leisure_centre' | 'park' | 'museum' | 'cafe';
  address: string;
  postcode: string;
  website: string;
  description: string;
}

const CURATED_VENUES: CuratedVenue[] = [
  {
    name: 'Role2Play',
    type: 'softplay',
    address: '75 Fulbourne Road, Walthamstow, London',
    postcode: 'E17 4EZ',
    website: 'https://www.role2play.co.uk',
    description: 'Child-sized indoor role-play village in Walthamstow with themed play zones (supermarket, café, medical centre, construction site) for under-7s birthday parties.',
  },
  {
    name: 'Little Street - Wallington',
    type: 'softplay',
    address: 'Unit 13, Wallington Square Shopping Centre, Woodcote Road, Wallington',
    postcode: 'SM6 8RG',
    website: 'https://www.little-street.co.uk',
    description: 'Scaled-down indoor role-play town in Wallington featuring a theatre, vets, pizza parlour, post office, and fire engine with controlled-capacity party sessions.',
  },
  {
    name: 'The Grove Playtown',
    type: 'softplay',
    address: 'Birchen Grove Garden Centre, Birchen Grove, Kingsbury, London',
    postcode: 'NW9 8RY',
    website: 'https://www.birchengrovegc.co.uk',
    description: 'Indoor role-play village in North-West London offering 2-hour exclusive party hire with a dedicated decorated party room where families can bring their own food.',
  },
  {
    name: 'Millie & Maisie',
    type: 'cafe',
    address: '76-78 Rectory Grove, Clapham, London',
    postcode: 'SW4 0ED',
    website: 'https://www.millieandmaisie.com',
    description: 'Boutique play café in Clapham Old Town with Montessori-style play upstairs, mini soft play with slide and ball pit downstairs, and under-5s party packages.',
  },
  {
    name: 'Mome London',
    type: 'cafe',
    address: '408-410 St John Street, Angel, London',
    postcode: 'EC1V 4NJ',
    website: 'https://momelondon.com',
    description: 'Modern family play café in Angel featuring soft play, sensory zones, kitchen corners, and an art workshop tailored for babies and toddlers.',
  },
  {
    name: 'Bertie & Boo Adventure Island',
    type: 'softplay',
    address: '205-207 Balham High Road, London',
    postcode: 'SW17 7BQ',
    website: 'https://www.bertieandboo.com',
    description: 'Story-driven kids party venue in Balham/Tooting with themed soft play, bouncy castles, bubble discos, character hosts, and party food.',
  },
  {
    name: 'The Little Gym - Chiswick',
    type: 'leisure_centre',
    address: 'Quintin Hogg Memorial Sports Ground, Hartington Road, Chiswick, London',
    postcode: 'W4 3AN',
    website: 'https://chiswick.thelittlegym.co.uk',
    description: 'Private 90-minute instructor-led gymnastics birthday parties for ages 1–12 with exclusive access to mats, bars, beams, and music games.',
  },
  {
    name: 'The Little Gym - Hampstead',
    type: 'leisure_centre',
    address: '255 Finchley Road, Hampstead, London',
    postcode: 'NW3 6LU',
    website: 'https://hampstead.thelittlegym.co.uk',
    description: 'Private instructor-led gymnastics birthday parties for ages 1–12 in Hampstead with full equipment access, games, and setup/cleanup included.',
  },
  {
    name: 'The Little Gym - Wandsworth & Fulham',
    type: 'leisure_centre',
    address: 'Unit 8, Compass House, Riverside West, Smugglers Way, London',
    postcode: 'SW18 1DB',
    website: 'https://wandsworthfulham.thelittlegym.co.uk',
    description: 'Exclusive-use gymnastics birthday parties for ages 1–12 in Wandsworth with qualified instructors leading custom games and physical challenges.',
  },
  {
    name: 'National Centre for Circus Arts',
    type: 'leisure_centre',
    address: 'Coronet Street, Hoxton, London',
    postcode: 'N1 6HD',
    website: 'https://www.nationalcircus.org.uk',
    description: 'High-energy private circus birthday parties (ages 8+) near Old Street where kids learn tightwire walking, juggling, and static trapeze.',
  },
  {
    name: 'Social Pottery - Kentish Town',
    type: 'community_hall',
    address: 'Studio 136, 136-138 Kentish Town Road, London',
    postcode: 'NW1 9QB',
    website: 'https://www.socialpottery.co.uk',
    description: 'Creative pottery painting and clay craft studio in Kentish Town offering children’s birthday party packages with all materials and cleanup included.',
  },
  {
    name: 'All Star Lanes - Stratford',
    type: 'leisure_centre',
    address: 'Westfield Stratford City, The Loft, Second Floor, London',
    postcode: 'E20 1ET',
    website: 'https://www.allstarlanes.co.uk/locations/stratford',
    description: 'Boutique bowling alley in Westfield Stratford offering kids birthday party packages with lightweight balls, ramps, meals, and drinks.',
  },
  {
    name: 'All Star Lanes - Brick Lane',
    type: 'leisure_centre',
    address: '95 Brick Lane, London',
    postcode: 'E1 6QL',
    website: 'https://www.allstarlanes.co.uk/locations/brick-lane',
    description: 'Boutique bowling venue on Brick Lane with kids birthday party deals including bowling, ramps, kids meals, and soft drinks.',
  },
  {
    name: 'All Star Lanes - Holborn',
    type: 'leisure_centre',
    address: 'Victoria House, Bloomsbury Place, London',
    postcode: 'WC1B 4DA',
    website: 'https://www.allstarlanes.co.uk/locations/holborn',
    description: 'Central London bowling venue in Holborn offering children’s birthday party packages with bowling, ramps, and kids dining.',
  },
  {
    name: 'All Star Lanes - White City',
    type: 'leisure_centre',
    address: 'Westfield London, Ariel Way, White City, London',
    postcode: 'W12 7FU',
    website: 'https://www.allstarlanes.co.uk/locations/white-city',
    description: 'Boutique bowling alley at Westfield London White City hosting kids birthday parties with bowling, bumpers/ramps, and food packages.',
  },
  {
    name: 'Hollywood Bowl - The O2',
    type: 'leisure_centre',
    address: 'The O2, Peninsula Square, Greenwich Peninsula, London',
    postcode: 'SE10 0DX',
    website: 'https://www.hollywoodbowl.co.uk/our-centres/the-o2',
    description: 'Family bowling and arcade centre inside The O2 with kids birthday packages including bowling, kids meals, unlimited squash, and party extras.',
  },
  {
    name: 'Hollywood Bowl - Finchley',
    type: 'leisure_centre',
    address: 'Leisure Way, High Road, North Finchley, London',
    postcode: 'N12 0GL',
    website: 'https://www.hollywoodbowl.co.uk/our-centres/finchley',
    description: 'North London bowling and arcade centre offering structured kids birthday party packages with ramps, food, and free game vouchers.',
  },
  {
    name: 'Hollywood Bowl - Surrey Quays',
    type: 'leisure_centre',
    address: 'Surrey Quays Leisure Park, Surrey Quays Road, Rotherhithe, London',
    postcode: 'SE16 7LW',
    website: 'https://www.hollywoodbowl.co.uk/our-centres/surrey-quays',
    description: 'South-East London bowling and arcade venue with kids birthday party packages including lanes, diner meals, and arcade fun.',
  },
  {
    name: "Battersea Park Children's Zoo",
    type: 'park',
    address: 'Battersea Park, Carriage Drive North, London',
    postcode: 'SW11 4NJ',
    website: 'https://www.batterseaparkzoo.co.uk',
    description: 'Children’s zoo in Battersea Park offering structured birthday party packages with guided tours, animal handling, crafts, and full zoo entry.',
  },
  {
    name: 'Deen City Farm',
    type: 'park',
    address: '39 Windsor Avenue, Merton Abbey, London',
    postcode: 'SW19 2RR',
    website: 'https://www.deencityfarm.co.uk',
    description: 'Community urban farm in Merton offering children’s farmyard birthday experiences with animals and outdoor/educational spaces.',
  },
  {
    name: 'Hackney City Farm',
    type: 'park',
    address: '1a Goldsmiths Row, Hackney, London',
    postcode: 'E2 8QA',
    website: 'https://hackneycityfarm.co.uk',
    description: 'Beloved East London city farm with pigs, donkeys, sheep, goats, and on-site café/room space for younger children’s birthday gatherings.',
  },
  {
    name: 'Vauxhall City Farm',
    type: 'park',
    address: '165 Tyers Street, Vauxhall, London',
    postcode: 'SE11 5HS',
    website: 'https://www.vauxhallcityfarm.org',
    description: 'Urban farm in Vauxhall offering animal meet-and-greets and children’s party room hire close to central London.',
  },
];

function makeSlug(name: string, postcode: string): string {
  const base = `${name}-${postcode}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base.slice(0, 90);
}

async function geocodePostcodes(
  postcodes: string[],
): Promise<Map<string, { lat: number; lon: number; borough: string | null }>> {
  const out = new Map<string, { lat: number; lon: number; borough: string | null }>();
  const res = await fetch('https://api.postcodes.io/postcodes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postcodes }),
  });

  if (!res.ok) {
    throw new Error(`postcodes.io returned ${res.status}`);
  }

  const json = (await res.json()) as {
    result?: Array<{
      query: string;
      result: {
        latitude: number;
        longitude: number;
        admin_district?: string | null;
        admin_ward?: string | null;
      } | null;
    }>;
  };

  for (const item of json.result || []) {
    if (item.result && Number.isFinite(item.result.latitude) && Number.isFinite(item.result.longitude)) {
      out.set(item.query.toUpperCase(), {
        lat: item.result.latitude,
        lon: item.result.longitude,
        borough: item.result.admin_ward || item.result.admin_district || null,
      });
    }
  }
  return out;
}

export async function seedCuratedLondonVenues(): Promise<void> {
  // 1. Promote 4 verified existing DB venues
  const promo = await db.query(
    `UPDATE venues
     SET party_capable = TRUE,
         venue_scope = 'core'
     WHERE id IN (3801, 1588, 9348, 8526)
       AND is_active = TRUE`,
  );
  logger.info({ promotedExisting: promo.rowCount }, 'Promoted existing famous London venues');

  // 2. Batch geocode curated postcodes
  const coords = await geocodePostcodes(CURATED_VENUES.map((v) => v.postcode));

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const v of CURATED_VENUES) {
    const geo = coords.get(v.postcode.toUpperCase());
    if (!geo) {
      logger.warn({ name: v.name, postcode: v.postcode }, 'Could not geocode postcode; skipping');
      skipped++;
      continue;
    }

    const existing = await db.query(
      `SELECT id FROM venues
       WHERE is_active = TRUE
         AND (LOWER(TRIM(name)) = LOWER(TRIM($1)) OR (REPLACE(UPPER(COALESCE(postcode,'')), ' ', '') = REPLACE(UPPER($2), ' ', '') AND LOWER(name) LIKE '%' || LOWER(SPLIT_PART($1, ' ', 1)) || '%'))
       LIMIT 1`,
      [v.name, v.postcode],
    );

    if (existing.rows.length > 0) {
      await db.query(
        `UPDATE venues
         SET party_capable = TRUE,
             venue_scope = 'core',
             website = COALESCE(NULLIF(website, ''), $2),
             description = COALESCE(NULLIF(description, ''), $3),
             address = COALESCE(NULLIF(address, ''), $4),
             updated_at = NOW()
         WHERE id = $1`,
        [existing.rows[0].id, v.website, v.description, v.address],
      );
      updated++;
      continue;
    }

    const slug = makeSlug(v.name, v.postcode);
    await db.query(
      `INSERT INTO venues (
         name, type, lat, lon, source, source_id, slug,
         address, postcode, borough, website, description,
         is_active, party_capable, venue_scope, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, 'curated_london_seed', $5, $6,
         $7, $8, $9, $10, $11,
         TRUE, TRUE, 'core', NOW(), NOW()
       )
       ON CONFLICT DO NOTHING`,
      [
        v.name,
        v.type,
        geo.lat,
        geo.lon,
        slug,
        slug,
        v.address,
        v.postcode,
        geo.borough,
        v.website,
        v.description,
      ],
    );
    inserted++;
  }

  logger.info({ inserted, updated, skipped }, 'Curated London venues seed complete');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedCuratedLondonVenues()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
