'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useShortlist } from '@/hooks/use-shortlist';

const NAV_ITEMS = [
  { label: 'Search', icon: 'search', href: '/' },
  { label: 'Saved', icon: 'bookmark', activeIcon: 'bookmark', href: '/saved' },
  { label: 'Compare', icon: 'compare_arrows', href: '/compare' },
];

export function BottomNav() {
  const pathname = usePathname();
  const { count } = useShortlist();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-brand-border bg-brand-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      <ul className="flex items-center justify-around px-2 py-1.5">
        {NAV_ITEMS.map((item) => {
          const isActive =
            (item.href === '/' && pathname === '/') ||
            (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <li key={item.label} className="relative">
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className="flex min-h-11 min-w-14 flex-col items-center justify-center px-3 py-1"
              >
                <span
                  className={`material-symbols-outlined text-[22px] ${
                    isActive ? 'text-brand-dark' : 'text-brand-muted'
                  }`}
                >
                  {isActive && item.activeIcon ? item.activeIcon : item.icon}
                </span>
                {item.label === 'Saved' && count > 0 && (
                  <span className="absolute right-1 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-dark px-1 text-[10px] font-semibold text-white">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
                <span
                  className={`mt-0.5 text-[11px] ${
                    isActive ? 'font-semibold text-brand-dark' : 'font-medium text-brand-muted'
                  }`}
                >
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
