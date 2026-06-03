import type { Venue } from './api';

export interface TrustSignal {
  id: string;
  label: string;
  icon: string; // Material Symbols name
  tone: 'verified' | 'info';
}

/**
 * Derive ONLY verifiable trust signals from real venue fields.
 *
 * Phase 18C FE-11: this replaces the old isSafeChecked() heuristic that
 * fabricated a "Safe-checked" badge from rating >= 4. Nothing here is inferred
 * from a star rating — every signal maps to a concrete, checkable fact.
 */
export function trustSignals(venue: Venue): TrustSignal[] {
  const signals: TrustSignal[] = [];

  if (venue.fhrs_establishment_id) {
    signals.push({
      id: 'fhrs',
      label: 'Food hygiene rated',
      icon: 'verified_user',
      tone: 'verified',
    });
  }

  if (venue.claimed_at) {
    signals.push({
      id: 'owner',
      label: 'Owner verified',
      icon: 'how_to_reg',
      tone: 'verified',
    });
  }

  const features = (venue.features || []).map((f) => String(f).toLowerCase());
  if (features.some((f) => /wheelchair|accessible|accessib|disabled|step[-\s]?free/.test(f))) {
    signals.push({
      id: 'accessible',
      label: 'Accessible',
      icon: 'accessible',
      tone: 'info',
    });
  }

  return signals;
}
