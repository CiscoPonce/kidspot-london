'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-on-background p-6 text-center">
      <span
        className="material-symbols-outlined text-[72px] text-on-primary-container bg-primary-container rounded-3xl px-5 py-3 mb-6"
        aria-hidden="true"
      >
        explore_off
      </span>
      <h1 className="font-display text-5xl font-bold tracking-tight">404</h1>
      <h2 className="font-display text-xl font-semibold mt-2">
        We couldn&apos;t find that page
      </h2>
      <p className="text-on-surface-variant max-w-md mt-3 leading-relaxed">
        The venue or page you&apos;re looking for might have moved, been
        removed, or never existed. Head back to the homepage to keep exploring.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-primary-container text-on-primary-container rounded-full font-semibold hover:brightness-95 active:scale-95 transition shadow-lg shadow-primary-container/40"
      >
        <span className="material-symbols-outlined text-[20px]">home</span>
        Return home
      </Link>
    </div>
  );
}
