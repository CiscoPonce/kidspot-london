const REJECT_PATTERNS = [
  /base64,/i,
  /\.svg(?:\?.*)?$/i,
  /\.ico(?:\?.*)?$/i,
  /placeholder/i,
  /allowdefault=1/i,
  /(?:^|\/|_|-)(?:logo\d*|favicon|icon\d*|avatar|badge|tracking|pixel|spinner|transparent|blank|spacer|sprite|crest|share)(?:s)?(?:-|_|\.|\/|\?|$)/i,
  /(?:^|\/|_|-)(?:default\d+|default[-_.]?(?:img|image|avatar|thumb|photo|pic|banner))(?:-|_|\.|\/|\?|$)/i,
  /(?:1x1|16x16|32x32|48x48)\.(?:png|jpe?g|gif|webp)/i,
  /https?:\/\/(?:[^/]*\.)?x\.com(?:\/|\?|$)/i,
  /facebook\.com|twitter\.com|instagram\.com|linkedin\.com|youtube\.com|tripadvisor\.com|google-map|staticmap|wikimedia\.org|geograph\.org|property-images-uk|rightmove\.co\.uk/i,
];

const LOW_PRIORITY_PATTERN = /(?:^|\/|_|-)(?:banner|header)(?:s)?(?:-|_|\.|\/|\?|$)/i;

/** Returns true when an image URL is a logo, icon, placeholder, social link, or non-photo asset. */
export function isRejectedImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (!/^https?:\/\/.+/i.test(trimmed)) return true;
  return REJECT_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/** Returns true when an image URL looks like a site banner or header rather than a primary venue photo. */
export function isLowPriorityImageUrl(url: string): boolean {
  return LOW_PRIORITY_PATTERN.test(url);
}

/** Deduplicates, filters out rejected URLs, and places real photos ahead of banner/header images. */
export function cleanAndRankImages(urls: string[]): string[] {
  const seen = new Set<string>();
  const primary: string[] = [];
  const secondary: string[] = [];

  for (const raw of urls) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    if (isRejectedImageUrl(trimmed)) continue;

    if (isLowPriorityImageUrl(trimmed)) {
      secondary.push(trimmed);
    } else {
      primary.push(trimmed);
    }
  }

  return [...primary, ...secondary];
}
