'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useShortlist } from '@/hooks/use-shortlist';

const NAV_ITEMS = [
  { label: 'Explore', icon: 'search', href: '/' },
  { label: 'Saved', icon: 'favorite_border', activeIcon: 'favorite', href: '/saved' },
  { label: 'Bookings', icon: 'calendar_today', href: '/booking/packages' },
  { label: 'Safety', icon: 'verified_user', href: '/how-it-works' },
];

export function BottomNav() {
  const pathname = usePathname();
  const { count } = useShortlist();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#FFFDF5]/95 backdrop-blur-md border-t border-[#EBE5D3] pb-[env(safe-area-inset-bottom)] shadow-lg">
      <ul className="flex justify-around items-center px-4 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            (item.href === '/' && pathname === '/') ||
            (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className="flex flex-col items-center justify-center transition-all group"
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-brand-yellow text-brand-dark shadow-sm scale-105'
                      : 'text-[#5E5E5E] group-hover:bg-[#F3EEDA]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px] font-medium">
                    {isActive && item.activeIcon ? item.activeIcon : item.icon}
                  </span>
                  {item.label === 'Saved' && count > 0 && (
                    <span className="absolute top-1 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-dark px-1 text-[10px] font-bold text-white">
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[11px] font-semibold mt-1 ${
                    isActive ? 'text-brand-dark' : 'text-[#5E5E5E]'
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
