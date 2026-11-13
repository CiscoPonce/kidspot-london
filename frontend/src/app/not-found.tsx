'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-brand-paper px-6 py-16 text-center text-brand-dark">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">404</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
        We couldn’t find that page
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-brand-muted">
        The venue or page might have moved. Head back to search and try a postcode.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/search"
          className="inline-flex rounded-xl bg-brand-yellow px-5 py-2.5 text-sm font-semibold text-brand-dark hover:bg-brand-yellow-hover"
        >
          Find venues
        </Link>
        <Link
          href="/"
          className="inline-flex rounded-xl border border-brand-border bg-white px-5 py-2.5 text-sm font-semibold text-brand-dark"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
