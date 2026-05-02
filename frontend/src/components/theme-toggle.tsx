'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full glass hover:bg-white/10 transition-colors duration-200 flex items-center gap-2 group"
      aria-label="Toggle theme"
    >
      <div className="relative w-6 h-6 flex items-center justify-center">
        {theme === 'dark' ? (
          <Sun className="w-5 h-5 text-amber-400 transition-transform duration-500 group-hover:rotate-45" />
        ) : (
          <Moon className="w-5 h-5 text-slate-700 transition-transform duration-500 group-hover:-rotate-12" />
        )}
      </div>
      <span className="text-xs font-bold uppercase tracking-wider hidden sm:block px-1">
        {theme === 'dark' ? 'King Mode' : 'Clean Slate'}
      </span>
    </button>
  );
}
