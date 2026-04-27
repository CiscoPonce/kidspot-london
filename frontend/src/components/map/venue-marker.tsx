'use client';

import { useEffect, useRef, useCallback } from 'react';
import maplibregl, { Marker, Popup } from 'maplibre-gl';
import type { Venue } from '../../lib/api';

export interface VenueMarkerProps {
  map: maplibregl.Map;
  venues: Venue[];
  onVenueClick?: (venue: Venue) => void;
}

// Sponsor tier colors
const SPONSOR_COLORS: Record<string, string> = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
  default: '#3b82f6', // primary blue
};

// Cluster colors
const CLUSTER_COLOR = '#6366f1'; // indigo

function getMarkerColor(venue: Venue): string {
  return SPONSOR_COLORS[venue.sponsor_tier || ''] || SPONSOR_COLORS.default;
}

function createClusterMarkerElement(count: number): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'cluster-marker';
  el.style.cssText = `
    background-color: ${CLUSTER_COLOR};
    color: white;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 14px;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    cursor: pointer;
  `;
  el.textContent = count.toString();
  return el;
}

function createVenueMarkerElement(venue: Venue): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'venue-marker';
  el.style.cssText = `
    width: 32px;
    height: 32px;
    cursor: pointer;
    transition: transform 0.2s;
  `;

  const color = getMarkerColor(venue);
  el.innerHTML = `
    <svg viewBox="0 0 32 32" width="32" height="32">
      <path d="M16 2C10.477 2 6 6.477 6 12c0 7.5 10 18 10 18s10-10.5 10-18c0-5.523-4.477-10-10-10z" fill="${color}"/>
      <circle cx="16" cy="12" r="5" fill="white"/>
    </svg>
  `;

  el.addEventListener('mouseenter', () => {
    el.style.transform = 'scale(1.2)';
  });
  el.addEventListener('mouseleave', () => {
    el.style.transform = 'scale(1)';
  });

  return el;
}

export function useVenueMarkers({ map, venues, onVenueClick }: VenueMarkerProps) {
  const markersRef = useRef<Marker[]>([]);
  const popupRef = useRef<Popup | null>(null);

  const cleanup = useCallback(() => {
    // Remove all existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!map || !venues.length) {
      cleanup();
      return;
    }

    cleanup();

    // Create GeoJSON from venues
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: venues
        .filter((v) => v.lat !== null && v.lon !== null)
        .map((venue) => ({
          type: 'Feature',
          properties: {
            id: venue.id,
            name: venue.name,
            sponsor_tier: venue.sponsor_tier,
          },
          geometry: {
            type: 'Point',
            coordinates: [venue.lon!, venue.lat!] as [number, number],
          },
        })),
    };

    // Add GeoJSON source with clustering
    map.addSource('venues', {
      type: 'geojson',
      data: geojson,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 60,
    });

    // Add cluster circles layer
    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'venues',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': CLUSTER_COLOR,
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20, // radius for clusters with < 10 points
          10,
          25,
          50,
          30,
        ],
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
      },
    });

    // Add cluster count labels
    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'venues',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 14,
      },
      paint: {
        'text-color': '#ffffff',
      },
    });

    // Add unclustered point markers
    map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'venues',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': [
          'case',
          ['==', ['get', 'sponsor_tier'], 'gold'], SPONSOR_COLORS.gold,
          ['==', ['get', 'sponsor_tier'], 'silver'], SPONSOR_COLORS.silver,
          ['==', ['get', 'sponsor_tier'], 'bronze'], SPONSOR_COLORS.bronze,
          SPONSOR_COLORS.default,
        ],
        'circle-radius': 10,
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
      },
    });

    // Click on cluster to zoom in
    map.on('click', 'clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      if (!features.length) return;

      const clusterId = features[0].properties?.cluster_id;
      const source = map.getSource('venues') as maplibregl.GeoJSONSource;

      source.getClusterExpansionZoom(clusterId).then((zoom) => {
        const geometry = features[0].geometry;
        if (geometry.type === 'Point') {
          map.easeTo({
            center: geometry.coordinates as [number, number],
            zoom: zoom ?? 14,
          });
        }
      }).catch(() => {});
    });

    // Click on unclustered point to show popup
    map.on('click', 'unclustered-point', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['unclustered-point'] });
      if (!features.length) return;

      const feature = features[0];
      const geometry = feature.geometry;

      if (geometry.type !== 'Point') return;

      const coords = geometry.coordinates.slice() as [number, number];
      const { name, id } = feature.properties || {};

      // Find the full venue object
      const venue = venues.find((v) => v.id === id);

      // Show popup
      if (popupRef.current) {
        popupRef.current.remove();
      }

      popupRef.current = new Popup({ offset: 15 })
        .setLngLat(coords)
        .setHTML(`<strong>${name || 'Venue'}</strong>`)
        .addTo(map);

      // Call onVenueClick callback if provided
      if (venue && onVenueClick) {
        onVenueClick(venue);
      }
    });

    // Change cursor on hover
    map.on('mouseenter', 'clusters', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'clusters', () => {
      map.getCanvas().style.cursor = '';
    });
    map.on('mouseenter', 'unclustered-point', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'unclustered-point', () => {
      map.getCanvas().style.cursor = '';
    });

    // Cleanup function
    return () => {
      cleanup();
      if (map.getLayer('clusters')) map.removeLayer('clusters');
      if (map.getLayer('cluster-count')) map.removeLayer('cluster-count');
      if (map.getLayer('unclustered-point')) map.removeLayer('unclustered-point');
      if (map.getSource('venues')) map.removeSource('venues');
    };
  }, [map, venues, onVenueClick, cleanup]);

  return { cleanup };
}
