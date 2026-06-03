'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useShortlist } from '@/hooks/use-shortlist';

const NAV_ITEMS = [
  { label: 'Explore', icon: 'explore', href: '/' },
  { label: 'Map', icon: 'map', href: '/#map' },
  { label: 'Saved', icon: 'favorite', href: '/saved' },
  { label: 'About', icon: 'info', href: '/#trust' },
];

export function BottomNav() {
  const pathname = usePathname();
  const { count } = useShortlist();

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
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center min-w-[64px] py-1.5 px-3 rounded-2xl transition-all
                  ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
              >
                <span className="relative">
                  <span
                    className="material-symbols-outlined text-[24px]"
                    style={{
                      fontVariationSettings: `'FILL' ${isActive ? 1 : 0}`,
                    }}
                  >
                    {item.icon}
                  </span>
                  {item.label === 'Saved' && count > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-on-primary">
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
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
