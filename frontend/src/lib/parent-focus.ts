export type ParentIntent = 'party' | 'activity';
export type AgeBand = 'under7' | 'any';

/** Types that usually work for younger children. Not an official age rating. */
export const UNDER7_TYPE_SCORE: Record<ParentIntent, Record<string, number>> = {
  party: {
    softplay: 90,
    community_hall: 70,
    library: 35,
    park: 30,
    leisure_centre: 25,
    museum: 10,
  },
  activity: {
    park: 80,
    library: 75,
    softplay: 70,
    leisure_centre: 55,
    museum: 40,
    community_hall: 20,
  },
};
