'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, BookmarkPlus, Check } from 'lucide-react';
import type { Venue } from '@/lib/api';
import { getVenueBySlug } from '@/lib/api';
import { decodeShortlist } from '@/lib/shortlist-link';
import { CompareTable } from '@/components/venues/compare-table';
import { PartyChecklist } from '@/components/venues/party-checklist';
import { useShortlist } from '@/hooks/use-shortlist';

function SharedShortlist() {
  const params = useSearchParams();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const { add } = useShortlist();

  useEffect(() => {
    const slugs = decodeShortlist(params.get('v'));
    if (slugs.length === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      // Each id is re-fetched from the public API; the URL is never trusted.
      const results = await Promise.allSettled(slugs.map((s) => getVenueBySlug(s)));
      if (cancelled) return;
      const fetched: Venue[] = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map((r) => r.value?.data?.basic)
        .filter((v): v is Venue => !!v && !!v.id);
      setVenues(fetched);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  const handleSaveAll = () => {
    venues.forEach((v) => add(v));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-brand-dark pb-24">
      <header className="sticky top-0 z-40 w-full bg-[#FFFDF5]/90 backdrop-blur-md border-b border-[#EBE5D3]">
        <div className="mx-auto max-w-6xl flex items-center gap-4 px-4 sm:px-6 py-3">
          <Link href="/" className="p-2 rounded-full hover:bg-[#F3EEDA] transition-colors" aria-label="Go home">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="font-display text-xl font-bold flex-1">Shared party shortlist</h1>
          {venues.length > 0 && (
            <button
              type="button"
              onClick={handleSaveAll}
              className="inline-flex items-center gap-2 rounded-full bg-brand-dark text-white px-5 py-2 text-xs font-bold shadow-md hover:bg-black active:scale-95 transition-all"
            >
              {saved ? <Check size={16} /> : <BookmarkPlus size={16} />}
              {saved ? 'Saved' : 'Save these'}
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        {loading ? (
          <p className="text-[#5E5E5E] py-12 text-center text-sm font-medium">Loading shortlist…</p>
        ) : venues.length === 0 ? (
          <div className="py-12 text-center space-y-4">
            <p className="text-[#5E5E5E] text-sm font-medium">This shortlist link is empty or no longer available.</p>
            <Link
              href="/"
              className="inline-block bg-brand-yellow text-brand-dark font-bold text-sm px-8 py-3.5 rounded-full hover:bg-brand-yellow-hover active:scale-95 transition-all shadow-md"
            >
              Find party venues
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-on-surface-variant mb-4">
              Someone shared {venues.length} venue{venues.length === 1 ? '' : 's'} they&apos;re considering for a party.
            </p>
            <CompareTable venues={venues} readOnly />
            <section aria-label="Party planning checklist" className="pt-6">
              <PartyChecklist />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default function ShortlistPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SharedShortlist />
    </Suspense>
  );
}
