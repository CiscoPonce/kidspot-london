'use client';

import React from 'react';

export function Header() {
  return (
    <header className="sticky top-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-white dark:bg-black rounded-none border-b border-black dark:border-white shadow-none">
      <button 
        aria-label="Menu" 
        className="scale-95 active:opacity-80 flex items-center justify-center min-w-[touch-target-min] min-h-[touch-target-min]"
      >
        <span className="material-symbols-outlined text-black dark:text-white hover:text-renault-blue transition-colors duration-200">
          menu
        </span>
      </button>
      
      <h1 className="font-space-grotesk font-bold uppercase tracking-tighter text-2xl text-black dark:text-white">
        KIDSPOT
      </h1>
      
      <button 
        aria-label="Search" 
        className="scale-95 active:opacity-80 flex items-center justify-center min-w-[touch-target-min] min-h-[touch-target-min]"
      >
        <span className="material-symbols-outlined text-black dark:text-white hover:text-renault-blue transition-colors duration-200">
          search
        </span>
      </button>
      
      <div className="hidden md:flex gap-6">
        {/* Desktop Nav Placeholder */}
      </div>
    </header>
  );
}
