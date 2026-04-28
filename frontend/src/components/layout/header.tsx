'use client';

import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full bg-background/85 backdrop-blur-md border-b border-outline-variant/60">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-4 sm:px-6 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-on-background hover:text-primary transition-colors"
          aria-label="KidSpot home"
        >
          <span
            className="material-symbols-outlined text-[28px] text-on-primary-container bg-primary-container rounded-full p-1"
            aria-hidden="true"
          >
            child_care
          </span>
          <span className="font-display text-xl font-bold tracking-tight">
            KidSpot
          </span>
          <span className="hidden sm:inline text-xs font-semibold tracking-wider uppercase text-on-surface-variant ml-1">
            London
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-on-surface-variant">
          <Link
            href="/"
            className="px-3 py-2 rounded-full hover:bg-surface-container transition-colors"
          >
            Explore
          </Link>
          <Link
            href="/#trust"
            className="px-3 py-2 rounded-full hover:bg-surface-container transition-colors"
          >
            How it works
          </Link>
          <Link
            href="/#footer"
            className="px-3 py-2 rounded-full hover:bg-surface-container transition-colors"
          >
            About
          </Link>
        </nav>

        <a
          href="https://tally.so/r/n0XOXO"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 bg-primary-container text-on-primary-container text-sm font-semibold px-4 py-2 rounded-full hover:brightness-95 active:scale-95 transition"
        >
          <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
          Feedback
        </a>
      </div>
    </header>
  );
}
