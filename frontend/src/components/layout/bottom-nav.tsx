'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Explore', icon: 'explore', href: '/' },
  { label: 'Map', icon: 'map', href: '#map' },
  { label: 'Saved', icon: 'bookmark', href: '/saved' },
  { label: 'Profile', icon: 'person', href: '/profile' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 w-full h-16 z-50 flex justify-around items-stretch bg-white dark:bg-black rounded-none border-t border-black dark:border-white shadow-none md:hidden">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center justify-center w-full h-full transition-all duration-150 group
              ${isActive 
                ? 'bg-renault-yellow text-absolute-black' 
                : 'text-absolute-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900'
              }`}
          >
            <span className="material-symbols-outlined mb-1 group-hover:scale-110 transition-transform">
              {item.icon}
            </span>
            <span className="font-space-grotesk text-[10px] font-bold uppercase tracking-wide">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
