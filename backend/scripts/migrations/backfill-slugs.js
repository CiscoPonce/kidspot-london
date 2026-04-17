const { Pool } = require('pg');
const { generateSlug } = require('../../src/utils/slug');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://kidspot_admin:password@localhost:5432/kidspot'
});

async function backfill() {
  const client = await pool.connect();
  try {
    const { rows: venues } = await client.query('SELECT id, name, borough FROM venues WHERE slug IS NULL');
    console.log(`Found ${venues.length} venues to backfill.`);

    for (const venue of venues) {
      let currentBorough = venue.borough || 'London';
      let slug = generateSlug(venue.name, currentBorough);
      let unique = false;
      let attempts = 0;

      while (!unique && attempts < 10) {
        try {
          // Note: using a subquery to check for slug existence might be more robust 
          // but ON CONFLICT doesn't apply to UPDATE easily for different rows.
          // We rely on the unique constraint violation to trigger retry with hash.
          await client.query('UPDATE venues SET slug = $1 WHERE id = $2', [slug, venue.id]);
          unique = true;
          // console.log(`Set slug for ${venue.name}: ${slug}`);
        } catch (err) {
          if (err.code === '23505') { // unique_violation
            slug = generateSlug(venue.name, currentBorough, { appendHash: true });
            attempts++;
          } else {
            console.error(`Error updating venue ${venue.id}:`, err.message);
            throw err;
          }
        }
      }
      if (!unique) {
        console.error(`Failed to generate unique slug for venue ${venue.id} after ${attempts} attempts: ${venue.name}`);
      }
    }
    console.log('Backfill complete.');
  } catch (err) {
    console.error('Fatal error during backfill:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

backfill().catch(err => {
  console.error('Fatal error in backfill script:', err);
  process.exit(1);
});
