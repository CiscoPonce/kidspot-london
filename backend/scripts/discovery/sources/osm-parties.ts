import { fetchOverpassWithRetry } from './overpass-utils.js';

export interface OSMVenue {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: string;
  source: string;
}

export async function fetchOSMPartyVenues(): Promise<OSMVenue[]> {
  // Overpass QL query targeting London party-friendly amenities
  const query = `
    [out:json][timeout:25];
    area["name"="London"]["admin_level"="8"]->.searchArea;
    (
      node["amenity"="community_centre"](area.searchArea);
      node["amenity"="village_hall"](area.searchArea);
      node["leisure"="indoor_play"](area.searchArea);
      node["leisure"="trampoline_park"](area.searchArea);
    );
    out body 20;
  `;

  try {
    const data = await fetchOverpassWithRetry(query);
    const elements = data?.elements || [];
    const venues: OSMVenue[] = [];

    for (const el of elements) {
      if (el.tags?.name) {
        venues.push({
          id: el.id.toString(),
          name: el.tags.name,
          lat: el.lat,
          lon: el.lon,
          type: el.tags.amenity || el.tags.leisure || 'party_venue',
          source: 'osm'
        });
      }
    }

    return venues;
  } catch (error: any) {
    console.error('Failed to fetch OSM party venues:', error.message);
    return [];
  }
}
