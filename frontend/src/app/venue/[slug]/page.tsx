import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getVenueBySlug } from '@/lib/api';
import { VenueDetailContent } from '@/components/venues/venue-detail-content';

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const response = await getVenueBySlug(resolvedParams.slug);
    const venue = response.data.basic;
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
  } catch {
    return {
      title: 'Venue Not Found | KidSpot London',
    };
  }
}

export default async function VenuePage({ params }: Props) {
  let response;
  try {
    const resolvedParams = await params;
    response = await getVenueBySlug(resolvedParams.slug);
  } catch (error) {
    console.error('Error fetching venue:', error);
    return notFound();
  }

  if (!response?.data?.basic) {
    return notFound();
  }

  const venue = response.data.basic;
  const fullDetails = response.data.details;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: venue.name,
    description: `Child-friendly venue in ${venue.borough || 'London'}`,
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
    amenityFeature: [
      {
        '@type': 'LocationFeatureSpecification',
        name: 'Child Friendly',
        value: true,
      },
    ],
  };

  if (venue.rating && venue.user_ratings_total) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: venue.rating,
      reviewCount: venue.user_ratings_total,
    };
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="sticky top-0 z-30 flex h-14 items-center border-b border-outline-variant bg-background/85 backdrop-blur-md px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-tertiary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to search
        </Link>
        <div className="ml-auto">
          <Link
            href="/"
            className="font-display text-lg font-bold tracking-tight"
          >
            Kid<span className="text-tertiary">Spot</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto mt-6 max-w-2xl px-4">
        <div className="overflow-hidden rounded-3xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          <VenueDetailContent
            venue={venue}
            details={fullDetails}
            showCloseButton={false}
          />
        </div>

        <p className="mt-8 text-center text-sm text-on-surface-variant">
          Discover more family-friendly spots in {venue.borough || 'London'} on KidSpot.
        </p>
      </main>
    </div>
  );
}
