import { z } from 'zod';

export const searchQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
  radius_miles: z.coerce.number().positive().max(50).default(5),
  type: z.enum(['softplay', 'community_hall', 'leisure_centre', 'library', 'park', 'museum', 'cafe', 'other']).optional(),
  borough: z.string().optional(),
  postcode: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
}).refine(data => data.borough || (data.lat !== undefined && data.lon !== undefined) || data.type, {
  message: 'Either borough, (lat and lon), or type are required',
  path: ['lat', 'lon', 'borough', 'type']
});
