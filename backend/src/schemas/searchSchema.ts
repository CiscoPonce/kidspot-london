import { z } from 'zod';

const FACETS = [
  'soft_play',
  'trampoline',
  'party_room',
  'activity_session',
  'farm_venue',
  'museum_programme',
  'hall_hire',
  'outdoor_play',
  'cafe',
  'wheelchair_accessible',
  'parking'
] as const;

export const searchQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
  radius_miles: z.coerce.number().positive().max(50).default(5),
  type: z.enum(['softplay', 'community_hall', 'leisure_centre', 'library', 'park', 'museum', 'cafe', 'other']).optional(),
  facets: z.preprocess((val) => {
    if (typeof val === 'string') return val.split(',');
    return val;
  }, z.array(z.enum(FACETS)).optional()),
  borough: z.string().optional(),
  postcode: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  include_parks: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .optional()
    .transform((v) => v === true || v === 'true' || v === '1'),
}).refine(data => data.borough || (data.lat !== undefined && data.lon !== undefined) || data.type || (data.facets && data.facets.length > 0), {
  message: 'Either borough, (lat and lon), type, or facets are required',
  path: ['lat', 'lon', 'borough', 'type', 'facets']
});

export const facetSearchSchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
  radius_miles: z.coerce.number().positive().max(50).default(5),
  facets: z.preprocess((val) => {
    if (typeof val === 'string') return val.split(',');
    return val;
  }, z.array(z.enum(FACETS)).default([])),
  borough: z.string().optional(),
  postcode: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  include_parks: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .optional()
    .transform((v) => v === true || v === 'true' || v === '1'),
});
