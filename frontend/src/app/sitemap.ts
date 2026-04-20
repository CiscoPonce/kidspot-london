import { MetadataRoute } from 'next';
import { fetchAllSlugs } from '@/lib/api';
import { LONDON_AREAS, VENUE_TYPES } from '@/lib/constants';

const BASE_URL = 'https://kidspot.london';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Homepage
  const routes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ];

  // 2. All borough landing pages
  const boroughRoutes: MetadataRoute.Sitemap = LONDON_AREAS.map((borough) => ({
    url: `${BASE_URL}/venues-in/${encodeURIComponent(borough.toLowerCase())}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // 3. All category landing pages
  const categoryRoutes: MetadataRoute.Sitemap = VENUE_TYPES.map((type) => ({
    url: `${BASE_URL}/venues-by/${type.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // 4. All venue detail pages
  let venueRoutes: MetadataRoute.Sitemap = [];
  try {
    const venueSlugs = await fetchAllSlugs();
    venueRoutes = venueSlugs.map((v) => ({
      url: `${BASE_URL}/venue/${v.slug}`,
      lastModified: v.updated_at ? new Date(v.updated_at) : new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    }));
  } catch (error) {
    console.error('Error fetching venue slugs for sitemap:', error);
  }

  return [...routes, ...boroughRoutes, ...categoryRoutes, ...venueRoutes];
}
