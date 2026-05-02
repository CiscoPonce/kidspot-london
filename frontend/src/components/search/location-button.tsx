'use client';

import { useCurrentPosition, type PositionPermissionState } from '@/hooks/use-location';
import { MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';

interface LocationButtonProps {
  onLocationReceived: (lat: number, lon: number) => void;
}

export function LocationButton({ onLocationReceived }: LocationButtonProps) {
  const { position, loading, error, permissionState, requestLocation } = useCurrentPosition();
  const [showSuccess, setShowSuccess] = useState(false);

  // Notify parent when position is obtained
  useEffect(() => {
    if (position) {
      onLocationReceived(position.lat, position.lon);
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [position, onLocationReceived]);

  const getStatusText = () => {
    if (loading) return 'Getting location...';
    if (error) return error;
    if (showSuccess) return 'Location set!';
    if (permissionState === 'denied') return 'Permission denied';
    if (permissionState === 'unavailable') return 'Not available';
    return 'Use My Location';
  };

  const getStatusColor = () => {
    if (loading) return 'bg-secondary-100 text-secondary-600 border-secondary-300';
    if (error || permissionState === 'denied') return 'bg-red-50 text-red-600 border-red-200';
    if (showSuccess) return 'bg-green-50 text-green-600 border-green-200';
    return 'bg-white text-secondary-700 border-secondary-300 hover:border-primary-400 hover:bg-primary-50';
  };

  return (
    <button
      type="button"
      onClick={requestLocation}
      disabled={loading || permissionState === 'denied' || permissionState === 'unavailable'}
      className={`
        flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg border-2 
        font-medium transition-all duration-200 min-h-[44px]
        active:scale-98 disabled:cursor-not-allowed
        ${getStatusColor()}
      `}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <MapPin className="w-5 h-5" />
      )}
      <span className="text-sm">{getStatusText()}</span>
    </button>
  );
}