'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl, { Map as MapLibreMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { isWebGLSupported } from '../../lib/webgl-support';
import { MapFallback } from './map-fallback';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export interface VenueMapSnippetProps {
  lat: number;
  lon: number;
  name: string;
  zoom?: number;
}

export function VenueMapSnippet({ lat, lon, name, zoom = 15 }: VenueMapSnippetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [mapUnavailable, setMapUnavailable] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    if (!isWebGLSupported()) {
      setMapUnavailable(true);
      return;
    }

    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container: containerRef.current,
        style: MAP_STYLE,
        center: [lon, lat],
        zoom,
        attributionControl: false,
        interactive: false,
        pitchWithRotate: false,
      });
    } catch (err) {
      console.error('VenueMapSnippet: failed to initialize MapLibre.', err);
      setMapUnavailable(true);
      return;
    }

    map.on('load', () => {
      // Add a marker at the venue location
      const el = document.createElement('div');
      el.className = 'venue-snippet-marker';
      el.style.cssText = `
        width: 20px;
        height: 20px;
        background-color: #3b82f6;
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        cursor: default;
      `;

      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([lon, lat])
        .addTo(map);
    });

    mapRef.current = map;

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lon, zoom]);

  // Update marker position if lat/lon changes
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    markerRef.current.setLngLat([lon, lat]);
    mapRef.current.setCenter([lon, lat]);
  }, [lat, lon]);

  if (mapUnavailable) {
    return <MapFallback variant="snippet" />;
  }

  return (
    <div
      className="relative w-full rounded-lg overflow-hidden"
      style={{ height: 150 }}
      aria-label={`Map showing location of ${name}`}
      role="img"
    >
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
