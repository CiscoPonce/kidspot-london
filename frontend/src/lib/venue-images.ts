import type { Venue, VenueDetails } from '@/lib/api';

const TYPE_GRADIENTS: Record<string, string> = {
  softplay: 'from-[#FFF7B3] to-[#FFE066]',
  leisure_centre: 'from-[#D7CCF0] to-[#B9A7E6]',
  community_hall: 'from-[#FFCCBC] to-[#FFAB91]',
  museum: 'from-[#B3E5FC] to-[#81D4FA]',
  park: 'from-[#C8E6C9] to-[#A5D6A7]',
  library: 'from-[#E1BEE7] to-[#CE93D8]',
  cafe: 'from-[#FFE0B2] to-[#FFCC80]',
};

export function collectVenueImages(
  venue: Venue,
  details?: VenueDetails | null
): string[] {
  const urls = new Set<string>();
  const add = (u?: string | null) => {
    if (u && (u.startsWith('http://') || u.startsWith('https://'))) {
      urls.add(u);
    }
  };

  add(venue.image_url);
  venue.images?.forEach(add);
  add(details?.image_url);
  details?.images?.forEach(add);

  return [...urls];
}

export function venueTypeGradient(type?: string): string {
  return TYPE_GRADIENTS[type || ''] || 'from-[#F3EEDA] to-[#E8E2CD]';
}

export function formatPartyPrice(venue: Venue): string | null {
  if (typeof venue.party_price_from !== 'number') return null;
  const amount = Number.isInteger(venue.party_price_from)
    ? venue.party_price_from
    : venue.party_price_from.toFixed(2);
  const unit =
    venue.party_price_unit === 'per_hour'
      ? ' per hour'
      : venue.party_price_unit === 'flat'
        ? ' per party'
        : ' per child';
  return `£${amount}${unit}`;
}
