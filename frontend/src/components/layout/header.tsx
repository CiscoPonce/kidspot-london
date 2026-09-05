'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useShortlist } from '@/hooks/use-shortlist';

export function Header() {
  const pathname = usePathname();
  const { count } = useShortlist();

  const linkClass = (active: boolean) =>
    `text-sm transition-colors hover:text-brand-dark ${
      active ? 'font-semibold text-brand-dark' : 'font-medium text-brand-muted'
    }`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-brand-border bg-brand-paper/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-brand-dark hover:opacity-90"
          aria-label="KidSpot home"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-yellow text-sm font-bold text-brand-dark">
            KS
          </div>
          <span className="font-display text-lg font-semibold tracking-tight text-brand-dark">
            KidSpot
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          <Link href="/" className={linkClass(pathname === '/')}>
            Search
          </Link>
          <Link href="/saved" className={linkClass(pathname === '/saved')}>
            Saved{count > 0 ? ` (${count})` : ''}
          </Link>
          <Link href="/compare" className={linkClass(pathname === '/compare')}>
            Compare
          </Link>
        </nav>
      </div>
    </header>
  );
}
