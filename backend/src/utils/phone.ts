/**
 * Normalizes UK phone numbers to a standard format.
 * Strips whitespace, handles +44/0 prefixes.
 */
export function normalizeUkPhone(phone: string): string | null {
  if (!phone) return null;

  // Strip all non-numeric except +
  let clean = phone.replace(/[^\d+]/g, '');

  // Handle +44 prefix
  if (clean.startsWith('+44')) {
    clean = '0' + clean.slice(3);
  }

  // Basic UK length check (usually 10-11 digits)
  if (clean.length < 10 || clean.length > 12) {
    // If it starts with 0 and looks like a valid UK mobile or landline
    if (!clean.startsWith('0')) return null;
  }

  // Standardize on 0 prefix
  if (clean.startsWith('44') && !phone.includes('+')) {
    clean = '0' + clean.slice(2);
  }

  return clean;
}

/**
 * Validates if a string looks like a valid UK phone number
 */
export function isValidUkPhone(phone: string): boolean {
  const normalized = normalizeUkPhone(phone);
  if (!normalized) return false;
  
  // UK numbers start with 01, 02, 03, 07, or 08
  return /^(01|02|03|07|08)\d{8,10}$/.test(normalized);
}
