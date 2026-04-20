import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getVenueBySlug } from '@/lib/api';
import { VenueDetailContent } from '@/components/venues/venue-detail-content';

interface Props {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const venue = await getVenueBySlug(params.slug);
    const title = `${venue.name} | KidSpot London`;
    const description = `Details, location, and contact information for ${venue.name} in ${venue.borough || 'London'}.`;
    
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        url: `https://kidspot.london/venue/${venue.slug}`,
        images: [
          {
            url: '/og-image.png',
            width: 1200,
            height: 630,
            alt: 'KidSpot London - Child-friendly venues',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: ['/og-image.png'],
      },
    };
  } catch (error) {
    return {
      title: 'Venue Not Found | KidSpot London',
    };
  }
}

export default async function VenuePage({ params }: Props) {
  let venue;
  try {
    venue = await getVenueBySlug(params.slug);
  } catch (error) {
    console.error('Error fetching venue:', error);
    return notFound();
  }

  if (!venue) {
    return notFound();
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: venue.name,
    description: venue.description || `Child-friendly venue in ${venue.borough || 'London'}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: venue.borough || 'London',
      addressCountry: 'GB',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: venue.lat,
      longitude: venue.lon,
    },
    url: `https://kidspot.london/venue/${venue.slug}`,
    image: 'https://kidspot.london/og-image.png',
  };

  return (
    <div className="min-h-screen bg-secondary-50 pb-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Navigation Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-white/80 px-4 backdrop-blur-md">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Search
        </Link>
        <div className="ml-auto">
          <Link href="/" className="text-lg font-bold tracking-tight text-secondary-900">
            Kid<span className="text-primary-600">Spot</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto mt-6 max-w-2xl px-4">
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <VenueDetailContent 
            venue={venue} 
            showCloseButton={false}
          />
        </div>

        {/* SEO Content / Footer area */}
        <div className="mt-8 text-center text-secondary-500">
          <p className="text-sm">
            Discover more family-friendly spots in {venue.borough || 'London'} on KidSpot.
          </p>
        </div>
      </main>
    </div>
  );
}
