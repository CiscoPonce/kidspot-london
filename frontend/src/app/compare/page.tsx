'use client';

import Link from 'next/link';
import { useShortlist } from '@/hooks/use-shortlist';
import { CompareTable } from '@/components/venues/compare-table';
import { PartyChecklist } from '@/components/venues/party-checklist';

export default function ComparePage() {
  const { items, remove } = useShortlist();

  return (
    <div className="min-h-screen bg-brand-paper pb-24 text-brand-dark">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
        <h1 className="text-2xl font-semibold tracking-tight">Compare</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Capacity, cake, food and who to call — pick two or three, then enquire.
        </p>

        {items.length === 0 ? (
          <div className="mt-10 rounded-xl border border-brand-border bg-white px-6 py-12 text-center">
            <h2 className="text-lg font-semibold">Save venues first</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-brand-muted">
              Add two or three options from search, then come back here to pick who to call.
            </p>
            <Link
              href="/"
              className="mt-5 inline-block rounded-lg bg-brand-yellow px-5 py-2.5 text-sm font-semibold text-brand-dark"
            >
              Search nearby
            </Link>
          </div>
        ) : items.length === 1 ? (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-brand-muted">
              One venue saved. Add another to compare, or enquire now.
            </p>
            <CompareTable venues={items} onRemove={remove} />
            <Link href="/" className="inline-block text-sm font-semibold text-brand-dark underline">
              Add another venue
            </Link>
          </div>
        ) : (
          <div className="mt-8">
            <CompareTable venues={items} onRemove={remove} />
          </div>
        )}

        <section className="mt-10" aria-label="Party planning checklist">
          <PartyChecklist />
        </section>
      </div>
    </div>
  );
}
