const TYPE_WEIGHTS: Record<string, number> = {
  'softplay': 10,
  'park': 8,
  'community_hall': 6,
  'other': 2
};

const DISQUALIFYING_TYPES = new Set([
  'bar', 'liquor_store', 'casino', 'adult_entertainment', 'night_club'
]);

const KEYWORD_BOOSTS: Record<string, number> = {
  'birthday': 2,
  'party': 2,
  'play': 1,
  'children': 1,
  'kids': 1,
  'family': 1
};

/**
 * Calculates a Kid Score (0-20) based on venue types and keyword signals.
 * Logic ported from legacy Python prototype database_manager.py.
 */
export function calculateKidScore(venue: {
  name: string;
  types: string[];
  rating?: number;
  user_ratings_total?: number;
}): number {
  // 1. Disqualification check [CITED: prposal.md]
  if (venue.types.some(t => DISQUALIFYING_TYPES.has(t))) return 0;

  let score = 0;

  // 2. Base weight by type
  const baseType = venue.types.find(t => TYPE_WEIGHTS[t]);
  score += TYPE_WEIGHTS[baseType || 'other'] || 0;

  // 3. Keyword boosts (case-insensitive)
  const nameLower = venue.name.toLowerCase();
  Object.entries(KEYWORD_BOOSTS).forEach(([kw, boost]) => {
    if (nameLower.includes(kw)) score += boost;
  });

  // 4. Rating adjustment (normalized to 0-5)
  if (venue.rating && venue.user_ratings_total && venue.user_ratings_total > 5) {
    score += (venue.rating / 5) * 2;
  }

  return Math.min(score, 20); // Cap at 20 for database stability
}
