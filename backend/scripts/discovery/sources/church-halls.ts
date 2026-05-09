import axios from 'axios';

export interface ChurchHall {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: string;
  source: string;
  address?: string;
  postcode?: string;
}

export async function fetchChurchHalls(): Promise<ChurchHall[]> {
  // Overpass QL: places of worship in London with hall/community facilities
  const query = `
    [out:json][timeout:25];
    area["name"="London"]["admin_level"="8"]->.searchArea;
    (
      node["amenity"="place_of_worship"]["community_centre"="yes"](area.searchArea);
      node["amenity"="place_of_worship"]["building:use"="hall"](area.searchArea);
      node["building"="church_hall"](area.searchArea);
      way["building"="church_hall"](area.searchArea);
    );
    out center body limit 100;
  `;

  try {
    const response = await axios.post(
      'https://overpass-api.de/api/interpreter',
      `data=${encodeURIComponent(query)}`,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 30000,
      }
    );

    const elements = response.data?.elements || [];
    const venues: ChurchHall[] = [];

    for (const el of elements) {
      const name = el.tags?.name || el.tags?.['addr:housename'];
      if (!name) continue;

      const lat = el.lat || el.center?.lat;
      const lon = el.lon || el.center?.lon;
      if (!lat || !lon) continue;

      venues.push({
        id: `church-${el.id}`,
        name: name.includes('Hall') ? name : `${name} Parish Hall`,
        lat,
        lon,
        type: 'community_hall',
        source: 'church_halls',
        address: el.tags?.['addr:street'] || '',
        postcode: el.tags?.['addr:postcode'] || '',
      });
    }

    return venues;
  } catch (error: any) {
    console.error('Failed to fetch church halls:', error.message);
    return [];
  }
}
