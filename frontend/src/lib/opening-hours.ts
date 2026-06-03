/**
 * "Open now" computation across the TWO formats KidSpot stores opening hours in:
 *   1. Google/Yelp JSON object: { open: [{ start: "0700", end: "1900", day: 0 }, ...] }
 *      (day: 0 = Monday ... 6 = Sunday, per Google Places).
 *   2. OSM string: "Mo-Fr 09:30-17:00; Sa 10:00-16:00".
 *
 * Returns 'open' | 'closed' | 'unknown'. Unknown is honest — most venues have
 * no hours data and we never guess.
 */

export type OpenState = 'open' | 'closed' | 'unknown';

const OSM_DAYS: Record<string, number> = {
  mo: 0, tu: 1, we: 2, th: 3, fr: 4, sa: 5, su: 6,
};

function nowParts(date = new Date()): { day: number; minutes: number } {
  // JS getDay(): 0 = Sunday ... 6 = Saturday. Convert to Mon=0..Sun=6.
  const jsDay = date.getDay();
  const day = (jsDay + 6) % 7;
  return { day, minutes: date.getHours() * 60 + date.getMinutes() };
}

function hhmmToMinutes(v: string): number | null {
  const m = v.match(/^(\d{1,2}):?(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function checkInterval(startMin: number, endMin: number, now: number): boolean {
  if (endMin <= startMin) {
    // Overnight span (e.g. 22:00-02:00).
    return now >= startMin || now < endMin;
  }
  return now >= startMin && now < endMin;
}

function fromGoogleJson(periods: any[], now: { day: number; minutes: number }): OpenState {
  let sawValid = false;
  for (const p of periods) {
    if (!p || typeof p.day !== 'number' || !p.start || !p.end) continue;
    const start = hhmmToMinutes(String(p.start).replace(/(\d{2})(\d{2})/, '$1:$2'));
    const end = hhmmToMinutes(String(p.end).replace(/(\d{2})(\d{2})/, '$1:$2'));
    if (start == null || end == null) continue;
    sawValid = true;
    if (p.day === now.day && checkInterval(start, end, now.minutes)) return 'open';
  }
  return sawValid ? 'closed' : 'unknown';
}

function fromOsmString(spec: string, now: { day: number; minutes: number }): OpenState {
  const lower = spec.toLowerCase().trim();
  if (lower.includes('24/7')) return 'open';
  let sawValid = false;
  for (const rawRule of lower.split(';')) {
    const rule = rawRule.trim();
    if (!rule) continue;
    // e.g. "mo-fr 09:30-17:00" or "sa 10:00-16:00"
    const m = rule.match(/^([a-z]{2})(?:-([a-z]{2}))?\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/);
    if (!m) continue;
    const startDay = OSM_DAYS[m[1]];
    const endDay = m[2] ? OSM_DAYS[m[2]] : startDay;
    if (startDay == null || endDay == null) continue;
    const startMin = hhmmToMinutes(m[3]);
    const endMin = hhmmToMinutes(m[4]);
    if (startMin == null || endMin == null) continue;
    sawValid = true;
    const inDayRange =
      startDay <= endDay
        ? now.day >= startDay && now.day <= endDay
        : now.day >= startDay || now.day <= endDay;
    if (inDayRange && checkInterval(startMin, endMin, now.minutes)) return 'open';
  }
  return sawValid ? 'closed' : 'unknown';
}

export function isOpenNow(openingHours: unknown, date = new Date()): OpenState {
  if (!openingHours) return 'unknown';
  const now = nowParts(date);

  let value: any = openingHours;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return 'unknown';
    // Could be a JSON string of the Google/Yelp object.
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        value = JSON.parse(trimmed);
      } catch {
        return fromOsmString(trimmed, now);
      }
    } else {
      return fromOsmString(trimmed, now);
    }
  }

  if (Array.isArray(value)) return fromGoogleJson(value, now);
  if (value && Array.isArray(value.open)) return fromGoogleJson(value.open, now);
  if (value && Array.isArray(value.periods)) return fromGoogleJson(value.periods, now);

  return 'unknown';
}
