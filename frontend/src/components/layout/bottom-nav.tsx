'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Explore', icon: 'explore', href: '/' },
  { label: 'Map', icon: 'map', href: '#map' },
  { label: 'Saved', icon: 'favorite', href: '/saved' },
  { label: 'Profile', icon: 'person', href: '/profile' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white dark:bg-zinc-900 fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] border-t border-zinc-100 dark:border-zinc-800 rounded-t-[32px] z-50 md:hidden">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center justify-center rounded-2xl px-5 py-2 active:scale-90 transition-all duration-300 ease-out group
              ${isActive 
                ? 'bg-[#EFDF00] text-zinc-900 shadow-sm' 
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
          >
            <span className={`material-symbols-outlined group-hover:scale-110 transition-transform
              ${isActive ? 'fill-1' : 'fill-0'}`}
              style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}` }}
            >
              {item.icon}
            </span>
            <span className="font-space-grotesk text-[12px] font-semibold mt-1">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
