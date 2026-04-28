'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Explore', icon: 'explore', href: '/' },
  { label: 'Map', icon: 'map', href: '/#map' },
  { label: 'Saved', icon: 'favorite', href: '/saved' },
  { label: 'About', icon: 'info', href: '/#trust' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant pb-[env(safe-area-inset-bottom)]">
      <ul className="flex justify-around items-center px-2 pt-2 pb-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            (item.href === '/' && pathname === '/') ||
            (item.href.startsWith('/') &&
              !item.href.startsWith('/#') &&
              pathname.startsWith(item.href) &&
              item.href !== '/');
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                className={`flex flex-col items-center justify-center min-w-[64px] py-1.5 px-3 rounded-2xl transition-all
                  ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
              >
                <span
                  className="material-symbols-outlined text-[24px]"
                  style={{
                    fontVariationSettings: `'FILL' ${isActive ? 1 : 0}`,
                  }}
                >
                  {item.icon}
                </span>
                <span className="text-[11px] font-semibold mt-0.5">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
