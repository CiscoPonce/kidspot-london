'use client';

import { useState, useEffect } from 'react';

interface RadiusSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function RadiusSlider({ value, onChange }: RadiusSliderProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setLocalValue(newValue);
    onChange(newValue);
  };

  // Calculate percentage for track fill
  const percentage = ((localValue - 1) / (10 - 1)) * 100;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <span className="text-sm text-secondary-600">Radius</span>
        <span className="text-sm font-medium text-secondary-900">
          Within {localValue} mile{localValue !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="relative mt-2">
        {/* Custom track with fill */}
        <div className="absolute top-1/2 left-0 right-0 h-2 -translate-y-1/2 rounded-full bg-secondary-200" />
        <div 
          className="absolute top-1/2 left-0 h-2 -translate-y-1/2 rounded-full bg-primary-500 transition-all"
          style={{ width: `${percentage}%` }}
        />

        {/* Range input - transparent overlay */}
        <input
          type="range"
          min="1"
          max="10"
          step="0.5"
          value={localValue}
          onChange={handleChange}
          className="relative w-full appearance-none bg-transparent cursor-pointer z-10
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-primary-500
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-white
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:active:scale-110
            [&::-moz-range-thumb]:w-5
            [&::-moz-range-thumb]:h-5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-primary-500
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-white
            [&::-moz-range-thumb]:shadow-md
            [&::-moz-range-thumb]:cursor-pointer
            [&::-moz-range-thumb]:active:scale-110"
          style={{
            // Webkit specific for thumb positioning
            '--thumb-offset': '0px'
          }}
        />
      </div>

      <div className="flex justify-between mt-1">
        <span className="text-xs text-secondary-400">1 mi</span>
        <span className="text-xs text-secondary-400">10 mi</span>
      </div>
    </div>
  );
}