import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { fetchVenuesByType } from '@/lib/api';
import { VENUE_TYPES } from '@/lib/constants';
import { notFound } from 'next/navigation';

export const revalidate = 86400;

export async function generateMetadata({ params }: { params: { type: string } }): Promise<Metadata> {
  const typeParam = decodeURIComponent(params.type);
  const venueType = VENUE_TYPES.find(t => t.id === typeParam);

  if (!venueType) {
    return {
      title: 'Category Not Found | KidSpot London',
    };
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

export default async function CategoryPage({ params }: { params: { type: string } }) {
  const typeParam = decodeURIComponent(params.type);
  const venueType = VENUE_TYPES.find(t => t.id === typeParam);

  if (!venueType) {
    notFound();
  }

  const data = await fetchVenuesByType(venueType.value);
  const venues = data.all;

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
      }
    }))
  };

  return (
    <main className="min-h-screen bg-secondary-50 pb-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Header */}
      <div className="bg-white border-b border-secondary-200">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <Link 
            href="/"
            className="inline-flex items-center text-sm text-secondary-500 hover:text-primary-600 mb-4 transition-colors"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to Search
          </Link>
          <h1 className="text-3xl font-bold text-secondary-900 sm:text-4xl">
            Best {venueType.label} for kids in London
          </h1>
          <p className="mt-2 text-lg text-secondary-600">
            Showing {venues.length} venues across London
          </p>
        </div>
      </div>

      {/* Venue List */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {venues.length === 0 ? (
          <div className="bg-white rounded-xl border border-secondary-200 p-12 text-center">
            <h2 className="text-xl font-semibold text-secondary-900 mb-2">No venues found yet</h2>
            <p className="text-secondary-600">
              We haven't indexed any {venueType.label.toLowerCase()} yet. Check back soon.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {venues.map((venue) => (
              <Link
                key={venue.id}
                href={`/venue/${venue.slug}`}
                className="block bg-white p-4 rounded-xl border border-secondary-200 hover:border-primary-300 hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-secondary-900 group-hover:text-primary-600 transition-colors">
                      {venue.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-secondary-500 capitalize">
                        {venue.type.replace('_', ' ')}
                      </span>
                      {venue.borough && (
                        <>
                          <span className="text-secondary-300">•</span>
                          <span className="text-secondary-500">
                            {venue.borough}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {venue.sponsor_tier && (
                    <span className="px-2 py-1 rounded-md bg-amber-100 text-amber-800 text-xs font-bold uppercase">
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
