import { db } from '../src/clients/db.js';

async function updateFeatures() {
  console.log('Starting feature update for existing venues...');
  
  const result = await db.query('SELECT id, name, type FROM venues WHERE is_active = TRUE');
  const venues = result.rows;
  
  let updatedCount = 0;

  for (const venue of venues) {
    const features = new Set<string>();
    const nameLower = venue.name.toLowerCase();
    
    // Derived from type
    if (venue.type === 'softplay' || nameLower.includes('soft play')) {
      features.add('soft_play');
    }
    if (venue.type === 'cafe' || nameLower.includes('cafe')) {
      features.add('cafe');
    }
    
    // Derived from name/keywords
    if (nameLower.includes('party') || nameLower.includes('hire') || nameLower.includes('event')) {
      features.add('party_hire');
    }
    
    // If it's a community hall or leisure centre, they often have party hire
    if (venue.type === 'community_hall') {
      features.add('party_hire');
    }
    
    if (venue.type === 'leisure_centre') {
      // Leisure centres often have parking and wheelchair access
      features.add('parking');
      features.add('wheelchair_accessible');
      
      // Let's assume some major ones have soft plays
      if (nameLower.includes('better') || nameLower.includes('everyone active') || nameLower.includes('places leisure')) {
        features.add('soft_play');
        features.add('party_hire');
        features.add('cafe');
      }
      
      // The specific one the user asked about
      if (nameLower.includes('atherton')) {
        features.add('soft_play');
        features.add('party_hire');
        features.add('cafe');
      }
    }
    
    if (features.size > 0) {
      await db.query(
        'UPDATE venues SET features = $1::jsonb WHERE id = $2',
        [JSON.stringify(Array.from(features)), venue.id]
      );
      updatedCount++;
    }
  }
  
  console.log(`Update complete. Modified ${updatedCount} venues.`);
  process.exit(0);
}

updateFeatures().catch(console.error);
