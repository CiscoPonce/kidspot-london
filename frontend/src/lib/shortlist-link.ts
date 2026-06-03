/**
 * Share a shortlist via an encoded, no-auth URL (Phase 18C FE-13).
 *
 * The link only ever carries venue ids/slugs. The recipient's page decodes them
 * and re-fetches each venue from the public API (ids validated server-side), so
 * nothing from the URL is ever trusted or rendered as markup.
 */

const MAX_ITEMS = 30;

export function encodeShortlist(ids: Array<string | number>): string {
  const clean = ids
    .map((id) => String(id).trim())
    .filter((id) => /^[A-Za-z0-9_-]+$/.test(id))
    .slice(0, MAX_ITEMS);
  return clean.join(',');
}

export function decodeShortlist(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const decoded = decodeURIComponent(value);
    return decoded
      .split(',')
      .map((s) => s.trim())
      .filter((s) => /^[A-Za-z0-9_-]+$/.test(s))
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function buildShortlistUrl(ids: Array<string | number>, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/shortlist?v=${encodeURIComponent(encodeShortlist(ids))}`;
}
