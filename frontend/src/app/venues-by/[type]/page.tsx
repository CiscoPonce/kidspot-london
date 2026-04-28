import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { fetchVenuesByType } from '@/lib/api';
import { VENUE_TYPES } from '@/lib/constants';
import { notFound } from 'next/navigation';

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const typeParam = decodeURIComponent(resolvedParams.type);
  const venueType = VENUE_TYPES.find((t) => t.id === typeParam);

  if (!venueType) {
    return { title: 'Category Not Found | KidSpot London' };
  }

  const title = `Best ${venueType.label} for kids in London | KidSpot London`;
  const description = `Discover the top-rated ${venueType.label.toLowerCase()} for children and families across London. Find the perfect venue for your next outing or party.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://kidspot.london/venues-by/${venueType.id}`,
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

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const resolvedParams = await params;
  const typeParam = decodeURIComponent(resolvedParams.type);
  const venueType = VENUE_TYPES.find((t) => t.id === typeParam);

  if (!venueType) {
    notFound();
  }

  const response = await fetchVenuesByType(venueType.value);
  const venues = response.data.all;

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
            Best {venueType.label} for kids in London
          </h1>
          <p className="mt-2 text-on-surface-variant">
            Showing {venues.length} venues across London
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {venues.length === 0 ? (
          <div className="ks-card text-center py-12 px-6">
            <h2 className="font-display text-xl font-semibold mb-2">
              No venues found yet
            </h2>
            <p className="text-on-surface-variant">
              We haven&apos;t indexed any {venueType.label.toLowerCase()} yet. Check back soon.
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
                    <p className="text-sm text-on-surface-variant mt-1">
                      <span className="capitalize">
                        {venue.type.replace('_', ' ')}
                      </span>
                      {venue.borough ? ` · ${venue.borough}` : ''}
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
