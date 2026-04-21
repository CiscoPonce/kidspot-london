import { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, ArrowLeft } from 'lucide-react';
import { fetchVenuesByBorough } from '@/lib/api';
import { LONDON_AREAS } from '@/lib/constants';
import { notFound } from 'next/navigation';

export const revalidate = 86400;

export async function generateMetadata({ params }: { params: Promise<{ borough: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const boroughParam = decodeURIComponent(resolvedParams.borough);
  const boroughName = LONDON_AREAS.find(
    (b) => b.toLowerCase() === boroughParam.toLowerCase()
  );

  if (!boroughName) {
    return {
      title: 'Borough Not Found | KidSpot London',
    };
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

export default async function BoroughPage({ params }: { params: Promise<{ borough: string }> }) {
  const resolvedParams = await params;
  const boroughParam = decodeURIComponent(resolvedParams.borough);
  
  // Find the canonical name from our list
  const boroughName = LONDON_AREAS.find(
    (b) => b.toLowerCase() === boroughParam.toLowerCase()
  );

  if (!boroughName) {
    notFound();
  }

  const data = await fetchVenuesByBorough(boroughName);
  const venues = data.all;

  // Use the first venue's coordinates as the center for the map link, 
  // or default to London center if no venues found
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
            Best child-friendly venues in {boroughName}
          </h1>
          <p className="mt-2 text-lg text-secondary-600">
            Showing {venues.length} venues in this area
          </p>
          
          <div className="mt-6">
            <Link
              href={`/?lat=${centerLat}&lon=${centerLon}&radius=2`}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-all shadow-sm"
            >
              <MapPin size={16} className="mr-2" />
              View on Map
            </Link>
          </div>
        </div>
      </div>

      {/* Venue List */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {venues.length === 0 ? (
          <div className="bg-white rounded-xl border border-secondary-200 p-12 text-center">
            <h2 className="text-xl font-semibold text-secondary-900 mb-2">No venues found yet</h2>
            <p className="text-secondary-600">
              We haven&apos;t indexed any venues in {boroughName} yet. Check back soon or try a nearby borough.
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
                    <p className="text-secondary-500 capitalize mt-1">
                      {venue.type.replace('_', ' ')}
                    </p>
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
