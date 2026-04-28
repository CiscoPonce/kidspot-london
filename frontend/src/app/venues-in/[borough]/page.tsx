import { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, ArrowLeft } from 'lucide-react';
import { fetchVenuesByBorough } from '@/lib/api';
import { LONDON_AREAS } from '@/lib/constants';
import { notFound } from 'next/navigation';

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ borough: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const boroughParam = decodeURIComponent(resolvedParams.borough);
  const boroughName = LONDON_AREAS.find(
    (b) => b.toLowerCase() === boroughParam.toLowerCase()
  );

  if (!boroughName) {
    return { title: 'Borough Not Found | KidSpot London' };
  }

  const title = `Best child-friendly venues in ${boroughName} | KidSpot London`;
  const description = `Discover the top-rated child-friendly venues, soft play areas, and community halls in ${boroughName}, London.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://kidspot.london/venues-in/${encodeURIComponent(boroughName.toLowerCase())}`,
      images: ['/og-image.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.png'],
    },
  };
}

export default async function BoroughPage({
  params,
}: {
  params: Promise<{ borough: string }>;
}) {
  const resolvedParams = await params;
  const boroughParam = decodeURIComponent(resolvedParams.borough);
  const boroughName = LONDON_AREAS.find(
    (b) => b.toLowerCase() === boroughParam.toLowerCase()
  );

  if (!boroughName) {
    notFound();
  }

  const response = await fetchVenuesByBorough(boroughName);
  const venues = response.data.all;

  const centerLat = venues.length > 0 ? venues[0].lat : 51.5074;
  const centerLon = venues.length > 0 ? venues[0].lon : -0.1278;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: venues.map((venue, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'LocalBusiness',
        name: venue.name,
        url: `https://kidspot.london/venue/${venue.slug}`,
      },
    })),
  };

  return (
    <main className="min-h-screen bg-background pb-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="border-b border-outline-variant bg-surface-container-lowest">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-on-surface-variant hover:text-tertiary transition-colors mb-4"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to search
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
            Best child-friendly venues in {boroughName}
          </h1>
          <p className="mt-2 text-on-surface-variant">
            Showing {venues.length} venues in this area
          </p>

          <div className="mt-6">
            <Link
              href={`/?lat=${centerLat}&lon=${centerLon}&radius=2`}
              className="inline-flex items-center px-4 py-2 bg-primary-container text-on-primary-container rounded-full text-sm font-semibold hover:brightness-95 active:scale-95 transition shadow-sm"
            >
              <MapPin size={16} className="mr-2" />
              View on map
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {venues.length === 0 ? (
          <div className="ks-card text-center py-12 px-6">
            <h2 className="font-display text-xl font-semibold mb-2">
              No venues found yet
            </h2>
            <p className="text-on-surface-variant">
              We haven&apos;t indexed any venues in {boroughName} yet. Check back soon or try a nearby borough.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4">
            {venues.map((venue) => (
              <Link
                key={venue.id}
                href={`/venue/${venue.slug}`}
                className="ks-card group block p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-display text-xl font-semibold tracking-tight group-hover:text-tertiary transition-colors">
                      {venue.name}
                    </h2>
                    <p className="text-sm text-on-surface-variant capitalize mt-1">
                      {venue.type.replace('_', ' ')}
                    </p>
                  </div>
                  {venue.sponsor_tier && (
                    <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      {venue.sponsor_tier}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
