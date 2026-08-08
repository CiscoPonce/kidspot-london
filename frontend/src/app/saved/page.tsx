'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Heart, Share2, Trash2, Check } from 'lucide-react';
import { useShortlist } from '@/hooks/use-shortlist';
import { CompareTable } from '@/components/venues/compare-table';
import { buildShortlistUrl } from '@/lib/shortlist-link';

export default function SavedPage() {
  const { items, remove, clear } = useShortlist();
  const [copied, setCopied] = useState(false);

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
      /* user cancelled — fall through to copy */
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
    <div className="min-h-screen bg-[#FFFDF5] text-brand-dark pb-24">
      <header className="sticky top-0 z-40 w-full bg-[#FFFDF5]/90 backdrop-blur-md border-b border-[#EBE5D3]">
        <div className="mx-auto max-w-6xl flex items-center gap-4 px-4 sm:px-6 py-3">
          <Link
            href="/"
            className="p-2 rounded-full hover:bg-[#F3EEDA] transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={24} />
          </Link>
          <h1 className="font-display text-xl font-bold flex-1">Party Shortlist</h1>
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-2 rounded-full bg-brand-dark text-white px-5 py-2 text-xs font-bold shadow-md hover:bg-black active:scale-95 transition-all"
            >
              {copied ? <Check size={16} /> : <Share2 size={16} />}
              {copied ? 'Link copied' : 'Share Shortlist'}
            </button>
          )}
        </div>
      </header>

      {items.length === 0 ? (
        <main className="mx-auto max-w-6xl px-4 sm:px-6 py-16 text-center">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-[#F3EEDA] text-brand-dark flex items-center justify-center shadow-sm">
              <Heart size={36} />
            </div>
            <div>
              <h2 className="font-display text-2xl font-extrabold text-brand-dark">No venues shortlisted yet</h2>
              <p className="mt-2 text-sm text-[#5E5E5E] max-w-sm mx-auto">
                Tap the heart on any venue card to save it, compare your favourites side-by-side, and share with parents planning the party.
              </p>
            </div>
            <Link
              href="/"
              className="bg-brand-yellow text-brand-dark font-bold text-sm px-8 py-3.5 rounded-full hover:bg-brand-yellow-hover active:scale-95 transition-all shadow-md"
            >
              Explore Birthday Venues
            </Link>
          </div>
        </main>
      ) : (
        <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-on-surface-variant">
              {items.length} venue{items.length === 1 ? '' : 's'} shortlisted
            </p>
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-error"
            >
              <Trash2 size={15} /> Clear
            </button>
          </div>

          <section aria-label="Compare shortlisted venues">
            <h2 className="font-display text-lg font-bold mb-3">Compare</h2>
            <CompareTable venues={items} onRemove={remove} />
          </section>
        </main>
      )}
    </div>
  );
}
