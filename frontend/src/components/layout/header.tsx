'use client';

import React from 'react';

export function Header() {
  return (
    <header className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md sticky top-0 z-50 w-full shadow-[0_4px_20px_rgba(0,0,0,0.04)] border-b border-zinc-100 dark:border-zinc-800">
      <div className="flex justify-between items-center w-full px-6 py-4">
        <button className="text-zinc-900 dark:text-zinc-100 hover:opacity-80 transition-opacity active:scale-95 transition-transform duration-200">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
            child_care
          </span>
        </button>
        
        <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 font-space-grotesk">
          KidSpot
        </div>
        
        <button className="text-zinc-900 dark:text-zinc-100 hover:opacity-80 transition-opacity active:scale-95 transition-transform duration-200">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
            search
          </span>
        </button>
      </div>
    </header>
  );
}
