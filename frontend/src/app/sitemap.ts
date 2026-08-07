import { MetadataRoute } from 'next';
import { fetchAllSlugs } from '@/lib/api';
import { LONDON_AREAS, VENUE_TYPES } from '@/lib/constants';

const BASE_URL = 'https://kidspot.london';
const CHUNK_SIZE = 5000;

export async function generateSitemaps() {
  try {
    const venueSlugs = await fetchAllSlugs();
    const numChunks = Math.ceil(venueSlugs.length / CHUNK_SIZE) || 1;
    return Array.from({ length: numChunks }, (_, i) => ({ id: i }));
  } catch (error) {
    console.error('Error in generateSitemaps:', error);
    return [{ id: 0 }];
  }
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [];

  if (id === 0) {
    // 1. Homepage
    routes.push({
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    });

    // 2. All borough landing pages
    LONDON_AREAS.forEach((borough) => {
      routes.push({
        url: `${BASE_URL}/venues-in/${encodeURIComponent(borough.toLowerCase())}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    });

    // 3. All category landing pages
    VENUE_TYPES.forEach((type) => {
      routes.push({
        url: `${BASE_URL}/venues-by/${type.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    });
  }

  // 4. All venue detail pages (sliced by id)
  try {
    const venueSlugs = await fetchAllSlugs();
    const start = id * CHUNK_SIZE;
    const end = start + CHUNK_SIZE;
    const chunk = venueSlugs.slice(start, end);

    chunk.forEach((v) => {
      routes.push({
        url: `${BASE_URL}/venue/${v.slug}`,
        lastModified: v.updated_at ? new Date(v.updated_at) : new Date(),
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    });
  } catch (error) {
    console.error(`Error fetching venue slugs for sitemap chunk ${id}:`, error);
  }

  return routes;
}