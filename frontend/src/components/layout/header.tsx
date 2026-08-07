'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FFFDF5]/90 backdrop-blur-md border-b border-[#EBE5D3]">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-4 sm:px-8 py-3.5">
        <Link
          href="/"
          className="flex items-center gap-2 text-brand-dark hover:opacity-90 transition-opacity"
          aria-label="KidSpot home"
        >
          <div className="w-8 h-8 rounded-full bg-brand-yellow flex items-center justify-center font-bold text-brand-dark text-sm">
            KS
          </div>
          <span className="font-display text-2xl font-bold tracking-tight text-brand-dark">
            KidSpot
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#4A4732]">
          <Link
            href="/"
            className={`transition-colors hover:text-brand-dark relative py-1 ${
              pathname === '/' ? 'text-brand-dark font-bold' : ''
            }`}
          >
            Venues
            {pathname === '/' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-dark rounded-full" />
            )}
          </Link>
          <Link
            href="/how-it-works"
            className={`transition-colors hover:text-brand-dark relative py-1 ${
              pathname === '/how-it-works' ? 'text-brand-dark font-bold' : ''
            }`}
          >
            How it Works
            {pathname === '/how-it-works' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-dark rounded-full" />
            )}
          </Link>
          <Link
            href="/booking/packages"
            className={`transition-colors hover:text-brand-dark relative py-1 ${
              pathname.startsWith('/booking') ? 'text-brand-dark font-bold' : ''
            }`}
          >
            Packages
            {pathname.startsWith('/booking') && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-dark rounded-full" />
            )}
          </Link>
          <Link
            href="/saved"
            className={`transition-colors hover:text-brand-dark relative py-1 ${
              pathname === '/saved' ? 'text-brand-dark font-bold' : ''
            }`}
          >
            Saved
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/booking/packages"
            className="inline-flex items-center justify-center bg-brand-yellow text-brand-dark text-sm font-bold px-5 py-2.5 rounded-full hover:bg-brand-yellow-hover active:scale-95 transition-all shadow-sm"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </header>
  );
}
