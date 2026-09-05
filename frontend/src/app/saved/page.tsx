'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Share2, Trash2, Check } from 'lucide-react';
import { useShortlist } from '@/hooks/use-shortlist';
import { VenueCard } from '@/components/venues/venue-card';
import { PartyChecklist } from '@/components/venues/party-checklist';
import { buildShortlistUrl } from '@/lib/shortlist-link';

export default function SavedPage() {
  const { items, clear } = useShortlist();
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleShare = async () => {
    const url = buildShortlistUrl(items.map((v) => v.slug || v.id));
    const shareData = {
      title: 'My KidSpot party shortlist',
      text: `${items.length} venue${items.length === 1 ? '' : 's'} I'm considering for the party`,
      url,
    };
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      /* cancelled */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="min-h-screen bg-brand-paper pb-24 text-brand-dark">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Saved venues</h1>
            <p className="mt-1 text-sm text-brand-muted">
              {items.length === 0
                ? 'Tap the heart on a card to build your Saturday shortlist.'
                : `${items.length} saved · compare them, then call.`}
            </p>
          </div>
          {items.length > 0 && (
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border bg-white px-3 py-2 text-xs font-semibold text-brand-dark"
              >
                {copied ? <Check size={14} /> : <Share2 size={14} />}
                {copied ? 'Copied' : 'Share'}
              </button>
              <button
                type="button"
                onClick={clear}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-brand-muted hover:text-brand-dark"
              >
                <Trash2 size={14} /> Clear
              </button>
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div className="mt-10 rounded-xl border border-brand-border bg-white px-6 py-12 text-center">
            <Heart className="mx-auto text-brand-muted" size={28} />
            <h2 className="mt-4 text-lg font-semibold">Nothing saved yet</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-brand-muted">
              Search your postcode, save two or three options, then compare cake, food and capacity.
            </p>
            <Link
              href="/"
              className="mt-5 inline-block rounded-lg bg-brand-yellow px-5 py-2.5 text-sm font-semibold text-brand-dark"
            >
              Find venues
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {items.length >= 2 && (
              <Link
                href="/compare"
                className="inline-flex rounded-lg bg-brand-dark px-4 py-2 text-sm font-semibold text-white"
              >
                Compare {items.length} venues
              </Link>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {items.map((venue) => (
                <VenueCard
                  key={String(venue.id)}
                  venue={venue}
                  distance={venue.distance_miles || 0}
                  onSelect={() => router.push(`/venue/${venue.slug}`)}
                />
              ))}
            </div>
          </div>
        )}

        <section className="mt-10" aria-label="Party planning checklist">
          <PartyChecklist />
        </section>
      </div>
    </div>
  );
}
