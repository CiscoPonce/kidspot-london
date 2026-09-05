/** Show a UK phone only when it looks like a real number, not scrape junk. */
export function displayPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  let digits = trimmed.replace(/\D/g, '');
  if (digits.startsWith('44')) digits = `0${digits.slice(2)}`;
  if (!/^0[12378]\d{8,9}$/.test(digits)) return null;
  if (digits.startsWith('020') && digits.length !== 11) return null;
  if (digits.startsWith('07') && digits.length !== 11) return null;
  if (/^(\d)\1+$/.test(digits)) return null;
  if (/00000|11111|22222|66666|99999|123456/.test(digits)) return null;
  return trimmed;
}

export function displayWebsite(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  if (/openstreetmap\.org|yelp\.|tripadvisor\.|example\.|facebook\.com\/p\//i.test(trimmed)) {
    return null;
  }
  return trimmed;
}
