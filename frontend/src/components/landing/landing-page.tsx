'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { HeroSearchForm } from '@/components/search/hero-search-form';
import { VenueImagePlaceholder } from '@/components/venues/venue-image-placeholder';
import { formatPartyPrice } from '@/lib/venue-images';
import type { Venue } from '@/lib/api';

const QUICK_CATEGORIES = [
  { id: 'softplay', label: 'Soft play', desc: 'Indoor frames & toddler zones' },
  { id: 'community_hall', label: 'Party halls', desc: 'Bring your own food & cake' },
  { id: 'leisure_centre', label: 'Activity centres', desc: 'Pool, trampoline & soft play' },
  { id: 'park', label: 'Parks & outdoor', desc: 'Playgrounds & picnic space' },
  { id: 'museum', label: 'Museums', desc: 'Hands-on weekend discovery' },
  { id: 'library', label: 'Libraries', desc: 'Free rhyme time & story play' },
];

const TYPE_LABEL: Record<string, string> = {
  softplay: 'Soft play',
  community_hall: 'Hall hire',
  leisure_centre: 'Leisure centre',
  park: 'Outdoor',
  museum: 'Museum',
  library: 'Library',
  cafe: 'Café',
};

const STEPS = [
  {
    n: '01',
    title: 'Search a postcode',
    body: 'Choose birthday party or activity, keep it on under-7s, and see soft play, halls and parks nearby.',
  },
  {
    n: '02',
    title: 'Save a shortlist',
    body: 'Heart two or three options. Compare capacity and who to call — side by side.',
  },
  {
    n: '03',
    title: 'Call the venue',
    body: 'Ask about age range, the date and the price. We do not fake availability or take deposits.',
  },
];

const WEDGES = [
  {
    title: 'Built for under-7s',
    body: 'Soft play, halls, parks and libraries first. We do not invent official age ratings — you still ask the venue.',
  },
  {
    title: 'A party or a playdate',
    body: 'Same finder for a birthday, a toddler session or a Saturday activity. Pick the intent, then call.',
  },
  {
    title: 'A Saturday workflow',
    body: 'Search, save, compare, call. No sign-up wall. No marketplace checkout that the venue never sees.',
  },
];

function firstImage(venue: Venue): string | undefined {
  if (venue.image_url) return venue.image_url;
  if (Array.isArray(venue.images) && venue.images.length > 0) return venue.images[0];
  return undefined;
}

function ExperienceCard({ venue }: { venue: Venue }) {
  const imageUrl = firstImage(venue);
  const typeLabel = TYPE_LABEL[venue.type] || 'Venue';
  const partyPrice = formatPartyPrice(venue);
  const [imgFailed, setImgFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setImgFailed(false);
  }, [imageUrl]);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setImgFailed(true);
    }
  }, [imageUrl]);

  return (
    <Link
      href={`/venue/${venue.slug}`}
      className="group flex w-[270px] shrink-0 flex-col overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-dark/30 hover:shadow-md sm:w-[300px]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-brand-cream-dark">
        {imageUrl && !imgFailed ? (
          <img
            ref={imgRef}
            src={imageUrl}
            alt={venue.name}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <VenueImagePlaceholder type={venue.type} name={venue.name} />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-dark shadow-sm">
          {typeLabel}
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          {venue.borough && (
            <p className="text-xs font-medium text-brand-muted">{venue.borough}</p>
          )}
          <h3 className="mt-1 line-clamp-2 font-display text-lg font-semibold leading-snug text-brand-dark">
            {venue.name}
          </h3>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-brand-border/70 pt-2.5 text-xs">
          <span className="font-semibold text-brand-dark">
            {partyPrice || 'Price on enquiry'}
          </span>
          <span className="font-semibold text-brand-dark group-hover:underline">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}

function BrandBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#FFF8E8]" aria-hidden>
      <div className="absolute -left-16 -top-24 h-[32rem] w-[32rem] rounded-full bg-[#FFE27A]/90 blur-3xl" />
      <div className="absolute right-[-5rem] top-0 h-[24rem] w-[24rem] rounded-full bg-[#FFC9A8]/80 blur-3xl" />
      <div className="absolute bottom-[-7rem] left-1/4 h-[26rem] w-[26rem] rounded-full bg-[#B8E4F5]/75 blur-3xl" />
      <div className="absolute right-1/4 bottom-10 h-56 w-56 rounded-full bg-[#C8E8C4]/80 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.55),transparent_60%)]" />
    </div>
  );
}

export function LandingPage({ previews = [] }: { previews?: Venue[] }) {
  const strip = previews.slice(0, 6);

  return (
    <div className="bg-brand-paper pb-24 text-brand-dark md:pb-0">
      <section className="relative overflow-hidden text-brand-dark">
        <BrandBackdrop />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-14 sm:px-8 lg:grid-cols-12 lg:items-center lg:gap-12 lg:py-20">
          <div className="lg:col-span-7">
            <p className="inline-flex w-fit items-center rounded-full border border-brand-dark/10 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-muted backdrop-blur">
              Greater London · under-7s
            </p>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[0.95] tracking-tight text-brand-dark sm:text-6xl lg:text-7xl">
              Playtime
              <br />
              starts now.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-brand-muted sm:text-lg">
              Find the birthday — or Saturday play — for children under seven.
              Shortlist what fits, then call. No fake calendars.
            </p>

            <div className="mt-7 max-w-2xl rounded-3xl border border-brand-border bg-white p-3 text-brand-dark shadow-lg shadow-brand-dark/5 sm:p-4">
              <HeroSearchForm afterSearchHref="/search" />
              <p className="mt-2 px-1 text-xs text-brand-muted">
                Try E15, SW11 or N1. Ask the venue about their age range — we do not invent ratings.
              </p>
            </div>

            <dl className="mt-8 grid max-w-xl grid-cols-3 gap-6 text-brand-dark">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">Places</dt>
                <dd className="mt-1 font-display text-2xl font-semibold sm:text-3xl">2,200+</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">Built for</dt>
                <dd className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Under 7s</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">You plan</dt>
                <dd className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Party + play</dd>
              </div>
            </dl>
          </div>

          <aside className="lg:col-span-5">
            <div className="rounded-3xl border border-brand-border bg-white/90 p-5 shadow-lg shadow-brand-dark/5 backdrop-blur sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-muted">
                Browse by type
              </p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-brand-dark">
                Where do you want to go?
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {QUICK_CATEGORIES.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/venues-by/${cat.id}`}
                    className="group rounded-2xl border border-brand-border bg-brand-paper/60 p-3.5 transition hover:border-brand-dark/30 hover:bg-white"
                  >
                    <p className="font-display text-base font-semibold text-brand-dark group-hover:underline">
                      {cat.label}
                    </p>
                    <p className="mt-0.5 text-xs text-brand-muted">{cat.desc}</p>
                  </Link>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-brand-border pt-3 text-xs">
                <span className="text-brand-muted">Own or run a venue?</span>
                <Link href="/owner/login" className="font-semibold text-brand-dark hover:underline">
                  Claim or sponsor →
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-white py-16 text-brand-dark sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-muted">
                Choose this Saturday
              </p>
              <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                Nearby for under-7s
              </h2>
            </div>
            <Link
              href="/search"
              className="inline-flex rounded-full bg-brand-yellow px-5 py-2.5 text-sm font-semibold text-brand-dark hover:bg-brand-yellow-hover"
            >
              See all nearby
            </Link>
          </div>
        </div>
        <div className="mt-10 flex gap-4 overflow-x-auto px-4 pb-2 sm:px-8 lg:px-[max(2rem,calc((100vw-80rem)/2+2rem))]">
          {strip.length > 0 ? (
            strip.map((venue) => (
              <ExperienceCard key={venue.id} venue={venue} />
            ))
          ) : (
            <p className="text-sm text-brand-muted">Search a postcode to see live places.</p>
          )}
        </div>
      </section>

      <section className="bg-brand-paper">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-muted">
              How it works
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Three steps.
              <br />
              Then you call.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-brand-muted">
              Built for the parent with a handful of under-7s, a postcode, and twenty minutes between school run and dinner.
            </p>
            <Link
              href="/search"
              className="mt-8 inline-flex rounded-full bg-brand-yellow px-5 py-2.5 text-sm font-semibold text-brand-dark hover:bg-brand-yellow-hover"
            >
              Find a party or activity
            </Link>
          </div>
          <ol className="grid gap-4 sm:grid-cols-3 lg:col-span-7">
            {STEPS.map((step) => (
              <li key={step.n} className="rounded-3xl bg-white p-6 shadow-sm">
                <span className="font-display text-3xl font-semibold text-brand-olive">{step.n}</span>
                <h3 className="mt-4 font-display text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-8">
          <h2 className="max-w-2xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Not another venue marketplace
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-brand-muted">
            Other sites sell rooms to any age. KidSpot is a finder for parents organising under-7 parties and play — with a number to call.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {WEDGES.map((item) => (
              <article key={item.title} className="border-t border-brand-border pt-6">
                <h3 className="font-display text-2xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-brand-muted">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden text-brand-dark">
        <BrandBackdrop />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-8 sm:py-32">
          <h2 className="max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Saturday is coming.
            <br />
            Find the play tonight.
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-brand-muted sm:text-base">
            Type a postcode, pick party or activity, save two or three options, then call.
            That is the whole product — no account, no fake calendar.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/search"
              className="inline-flex rounded-full bg-brand-yellow px-6 py-3 text-sm font-semibold text-brand-dark hover:bg-brand-yellow-hover"
            >
              Find a place
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex rounded-full border border-brand-dark/15 bg-white/70 px-6 py-3 text-sm font-semibold text-brand-dark hover:bg-white"
            >
              How it works
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
