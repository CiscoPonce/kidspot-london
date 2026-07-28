import { fetchOverpassWithRetry } from './overpass-utils.js';

export interface SchoolVenue {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: string;
  source: string;
  address?: string;
  postcode?: string;
}

export async function fetchSchoolLettings(): Promise<SchoolVenue[]> {
  // Overpass QL: schools in London that have hall/community facilities
  const query = `
    [out:json][timeout:25];
    area["name"="London"]["admin_level"="8"]->.searchArea;
    (
      node["amenity"="school"]["community_centre"="yes"](area.searchArea);
      node["amenity"="school"]["leisure"="sports_hall"](area.searchArea);
      way["amenity"="school"](area.searchArea);
    );
    out center 100;
  `;

  try {
    const data = await fetchOverpassWithRetry(query);
    const elements = data?.elements || [];
    const venues: SchoolVenue[] = [];

    for (const el of elements) {
      const name = el.tags?.name;
      if (!name) continue;

      // Only keep schools that look like they offer lettings
      const hasHall =
        el.tags?.['community_centre'] === 'yes' ||
        el.tags?.['leisure'] === 'sports_hall' ||
        el.tags?.['building'] === 'school';

      if (!hasHall && !el.tags?.['amenity']) continue;

      const lat = el.lat || el.center?.lat;
      const lon = el.lon || el.center?.lon;
      if (!lat || !lon) continue;

      venues.push({
        id: `school-${el.id}`,
        name: `${name} (Hall Hire)`,
        lat,
        lon,
        type: 'community_hall',
        source: 'school_lettings',
        address: el.tags?.['addr:street'] || '',
        postcode: el.tags?.['addr:postcode'] || '',
      });
    }

    return venues;
  } catch (error: any) {
    console.error('Failed to fetch school lettings:', error.message);
    return [];
  }
}
