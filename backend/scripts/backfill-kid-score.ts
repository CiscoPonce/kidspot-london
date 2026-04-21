import { db } from '../src/clients/db.js';
import { calculateKidScore } from '../src/scoring/kidScore.js';

async function backfillKidScore() {
  console.log('Starting kid_score backfill...');
  
  try {
    const limit = process.argv.includes('--limit') 
      ? parseInt(process.argv[process.argv.indexOf('--limit') + 1], 10) 
      : null;
    
    let query = 'SELECT id, name, type, rating, user_ratings_total FROM venues WHERE is_active = TRUE';
    if (limit) {
      query += ` LIMIT ${limit}`;
    }
    
    const result = await db.query(query);
    const venues = result.rows;
    
    console.log(`Found ${venues.length} active venues to process.`);
    
    let updatedCount = 0;
    
    for (const venue of venues) {
      const score = calculateKidScore({
        name: venue.name,
        types: [venue.type],
        rating: venue.rating ? parseFloat(venue.rating) : undefined,
        user_ratings_total: venue.user_ratings_total
      });
      
      await db.query(
        'UPDATE venues SET kid_score = $1 WHERE id = $2',
        [score, venue.id]
      );
      
      updatedCount++;
      if (updatedCount % 100 === 0) {
        console.log(`Processed ${updatedCount}/${venues.length} venues...`);
      }
    }
    
    console.log(`Backfill complete. Updated ${updatedCount} venues.`);
  } catch (error) {
    console.error('Error during backfill:', error);
  } finally {
    await db.pool.end();
  }
}

backfillKidScore();
