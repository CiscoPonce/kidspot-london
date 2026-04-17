'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl, { Map as MapLibreMap, NavigationControl, Popup } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useSearch } from '../../hooks/use-search';
import { useMapContext } from './map-context';
import type { Venue } from '../../lib/api';

// OpenMapTiles/CartoDB style for London (free, no API key)
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

// Default London center if no search location
const DEFAULT_CENTER: [number, number] = [-0.1276, 51.5074]; // [lon, lat]
const DEFAULT_ZOOM = 12;

// Sponsor tier colors
const SPONSOR_COLORS: Record<string, string> = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
  default: '#3b82f6',
};

export interface VenueMapProps {
  venues: Venue[];
  onVenueSelect?: (venue: Venue) => void;
}

export function VenueMap({ venues, onVenueSelect }: VenueMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const { lat, lon } = useSearch();
  const { setMap } = useMapContext();

  // Set up markers on the map
  const setupMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Clean up existing markers/popup
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }

    // If no venues, don't add any sources/layers
    if (!venues.length) return;

    // Create GeoJSON from venues
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: venues.map((venue) => ({
        type: 'Feature',
        properties: {
          id: venue.id,
          name: venue.name,
          sponsor_tier: venue.sponsor_tier,
        },
        geometry: {
          type: 'Point',
          coordinates: [venue.lon, venue.lat],
        },
      })),
    };

    // Remove existing source and layers if they exist
    if (map.getLayer('clusters')) map.removeLayer('clusters');
    if (map.getLayer('cluster-count')) map.removeLayer('cluster-count');
    if (map.getLayer('unclustered-point')) map.removeLayer('unclustered-point');
    if (map.getSource('venues')) map.removeSource('venues');

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
        'circle-color': '#6366f1',
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,
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
  }, [venues, mapLoaded]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
      pitchWithRotate: false,
    });

    // Add navigation controls
    map.addControl(
      new NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: false,
      }),
      'top-right'
    );

    // Add attribution manually (required by most tile providers)
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
      }),
      'bottom-right'
    );

    map.on('load', () => {
      setMapLoaded(true);
      setMap(map);
    });

    map.on('error', (e) => {
      console.error('Map error:', e);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setMap(null);
    };
  }, [setMap]);

  // Set up markers when venues or mapLoaded changes
  useEffect(() => {
    setupMarkers();
  }, [setupMarkers]);

  // Set up click handlers after map loads
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Click on cluster to zoom in
    const handleClusterClick = (e: maplibregl.MapMouseEvent) => {
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
    };

    // Click on unclustered point to show popup
    const handlePointClick = (e: maplibregl.MapMouseEvent) => {
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
      if (venue && onVenueSelect) {
        onVenueSelect(venue);
      }
    };

    // Change cursor on hover
    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('click', 'clusters', handleClusterClick);
    map.on('click', 'unclustered-point', handlePointClick);
    map.on('mouseenter', 'clusters', handleMouseEnter);
    map.on('mouseleave', 'clusters', handleMouseLeave);
    map.on('mouseenter', 'unclustered-point', handleMouseEnter);
    map.on('mouseleave', 'unclustered-point', handleMouseLeave);

    return () => {
      map.off('click', 'clusters', handleClusterClick);
      map.off('click', 'unclustered-point', handlePointClick);
      map.off('mouseenter', 'clusters', handleMouseEnter);
      map.off('mouseleave', 'clusters', handleMouseLeave);
      map.off('mouseenter', 'unclustered-point', handleMouseEnter);
      map.off('mouseleave', 'unclustered-point', handleMouseLeave);
    };
  }, [mapLoaded, venues, onVenueSelect]);

  // Fly to search location when it changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || lat === null || lon === null) return;

    mapRef.current.flyTo({
      center: [lon, lat],
      zoom: DEFAULT_ZOOM,
      duration: 1000,
    });
  }, [lat, lon, mapLoaded]);

  return (
    <div className="relative w-full" style={{ height: '50vh' }}>
      <div
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full"
        style={{ minHeight: '300px' }}
      />

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary-100">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
            <p className="text-sm text-secondary-600">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}
