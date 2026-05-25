import axios from 'axios';
import env from '../config/env.js';
import { logger } from '../config/logger.js';

const GEOAPIFY_BASE = 'https://api.geoapify.com/v2';

export interface GeoapifyPlace {
  place_id: string;
  name?: string;
  lat: number;
  lon: number;
  formatted?: string;
  website?: string;
  contact?: { email?: string; phone?: string };
  opening_hours?: string;
  categories?: string[];
  datasource?: { raw?: { osm_id?: number; osm_type?: string } };
}

function mapCategoriesToType(categories: string[] = [], name = ''): string {
  const lower = name.toLowerCase();
  const cats = categories.join(' ').toLowerCase();
  if (cats.includes('playground') || lower.includes('soft play') || lower.includes('softplay')) return 'softplay';
  if (cats.includes('swimming_pool') || cats.includes('sports_centre') || cats.includes('fitness') || lower.includes('leisure')) return 'leisure_centre';
  if (cats.includes('community_center') || cats.includes('community_centre')) return 'community_hall';
  if (cats.includes('museum')) return 'museum';
  if (cats.includes('library')) return 'library';
  if (cats.includes('kindergarten') || cats.includes('childcare')) return 'other';
  if (cats.includes('park') || cats.includes('playground')) return 'park';
  return 'other';
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function scoreGeoapifyMatch(venueName: string, place: GeoapifyPlace, distanceM?: number): number {
  const vn = normalizeName(venueName);
  const pn = normalizeName(place.name || '');
  if (!vn || !pn) return 0;
  if (vn === pn) return 1;
  if (vn.includes(pn) || pn.includes(vn)) return 0.9;
  const vw = vn.split(' ').filter((w) => w.length > 2);
  const pw = pn.split(' ').filter((w) => w.length > 2);
  const overlap = vw.filter((w) => pw.some((p) => p.includes(w) || w.includes(p))).length;
  const wordScore = overlap / Math.max(vw.length, pw.length);
  const dist = distanceM ?? 9999;
  const distScore = dist <= 100 ? 1 : dist <= 250 ? 0.7 : dist <= 500 ? 0.4 : 0;
  return wordScore * 0.7 + distScore * 0.3;
}

function featureToPlace(feature: any): GeoapifyPlace | null {
  const p = feature?.properties;
  if (!p) return null;
  const [lon, lat] = feature.geometry?.coordinates || [p.lon, p.lat];
  if (lat == null || lon == null) return null;
  return {
    place_id: p.place_id,
    name: p.name,
    lat,
    lon,
    formatted: p.formatted,
    website: p.website,
    contact: p.contact,
    opening_hours: p.opening_hours,
    categories: p.categories,
    datasource: p.datasource,
  };
}

export const geoapifyService = {
  isConfigured(): boolean {
    return Boolean(env.GEOAPIFY_API_KEY);
  },

  mapCategoriesToType,

  async searchPlaces(params: {
    categories: string;
    latitude: number;
    longitude: number;
    radius?: number;
    name?: string;
    limit?: number;
  }): Promise<GeoapifyPlace[]> {
    if (!env.GEOAPIFY_API_KEY) return [];

    try {
      const query: Record<string, string | number> = {
        categories: params.categories,
        filter: `circle:${params.longitude},${params.latitude},${params.radius ?? 500}`,
        limit: params.limit ?? 5,
        apiKey: env.GEOAPIFY_API_KEY,
      };
      if (params.name) query.name = params.name;

      const response = await axios.get(`${GEOAPIFY_BASE}/places`, {
        params: query,
        timeout: 15000,
      });

      return (response.data?.features || [])
        .map(featureToPlace)
        .filter(Boolean) as GeoapifyPlace[];
    } catch (error: any) {
      logger.error({ err: error, message: error?.response?.data?.message }, 'Geoapify search failed');
      return [];
    }
  },

  async findBestMatch(params: {
    name: string;
    latitude: number;
    longitude: number;
    categories?: string;
    minScore?: number;
  }): Promise<{ place: GeoapifyPlace; score: number } | null> {
    const categories = params.categories ||
      'leisure.playground,sport.sports_centre,sport.swimming_pool,activity.community_center,entertainment.museum,childcare.kindergarten';

    const results = await this.searchPlaces({
      categories,
      latitude: params.latitude,
      longitude: params.longitude,
      radius: 500,
      name: params.name,
      limit: 5,
    });

    if (results.length === 0) {
      // Retry without name filter — broader search
      const broad = await this.searchPlaces({
        categories,
        latitude: params.latitude,
        longitude: params.longitude,
        radius: 300,
        limit: 10,
      });
      results.push(...broad);
    }

    const minScore = params.minScore ?? 0.45;
    let best: { place: GeoapifyPlace; score: number } | null = null;

    for (const place of results) {
      const dist = haversineM(params.latitude, params.longitude, place.lat, place.lon);
      const score = scoreGeoapifyMatch(params.name, place, dist);
      if (score >= minScore && (!best || score > best.score)) {
        best = { place, score };
      }
    }
    return best;
  },
};

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
