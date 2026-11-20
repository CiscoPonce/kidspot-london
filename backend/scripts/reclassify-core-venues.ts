import { fileURLToPath } from 'node:url';
import { db } from '../src/clients/db.js';
import { logger } from '../src/config/logger.js';

interface CandidateVenue {
  id: number;
  name: string;
  source: string;
  type: string;
  description: string | null;
  website: string | null;
}

export interface ReclassifySummary {
  scanned: number;
  deactivated: number;
  reclassified: Record<string, number>;
  unmatched: number;
  dryRun: boolean;
}

const COMMUNITY_SOURCES = new Set(['community-halls', 'council_csv', 'charity_commission']);

function shouldDeactivate(v: CandidateVenue): string | null {
  if (v.source === 'google' && v.type === 'other' && /^mcdonald'?s\b/i.test(v.name)) {
    return 'Non-family fast food chain';
  }
  if (v.id === 28 || v.id === 158 || v.id === 394) {
    return 'Non-family / non-venue listing audited by ID';
  }
  if (/senior citizens|high commission|embassy/i.test(v.name)) {
    return 'Non-family facility or diplomatic mission';
  }
  if (/english-heritage\.org\.uk\/visit\/blue-plaques|mcdonalds\.com/i.test(v.website || '')) {
    return 'Non-venue plaque or fast-food website';
  }
  return null;
}

function classifyType(v: CandidateVenue): string | null {
  if (
    v.id === 161568 ||
    /leisure\s?cent|sports\s?cent/i.test(v.name) ||
    /better\.org\.uk\/leisure-centre/i.test(v.website || '')
  ) {
    return 'leisure_centre';
  }
  if (v.id === 16476 || /\bmuseum\b/i.test(v.name)) {
    return 'museum';
  }
  if (/\blibrary\b/i.test(v.name)) {
    return 'library';
  }
  if (/soft\s?play|play\s?barn|playworld|playtown|playzone|inflata|trampoline/i.test(v.name)) {
    return 'softplay';
  }
  if (COMMUNITY_SOURCES.has(v.source) || (v.source === 'google' && v.type === 'unknown')) {
    return 'community_hall';
  }
  return null;
}

async function insertProvenance(
  venueId: number,
  field: string,
  oldVal: string | null,
  newVal: string,
  reason: string,
): Promise<void> {
  await db.query(
    `INSERT INTO venue_provenance_log (venue_id, field_name, old_value, new_value, source, changed_by, reason)
     VALUES ($1, $2, $3, $4, 'reclassify_core_venues', 'script', $5)`,
    [venueId, field, oldVal, newVal, reason],
  );
}

/** Reclassifies active core 'other'/'unknown' venues and deactivates verified non-venue rows. */
export async function reclassifyCoreVenues(dryRun = false): Promise<ReclassifySummary> {
  const summary: ReclassifySummary = {
    scanned: 0,
    deactivated: 0,
    reclassified: {},
    unmatched: 0,
    dryRun,
  };

  const { rows } = await db.query(
    `SELECT id, name, source, type, description, website
     FROM venues
     WHERE is_active = TRUE
       AND venue_scope = 'core'
       AND editor_locked = FALSE
       AND type IN ('other', 'unknown')
     ORDER BY id ASC`,
  );

  for (const venue of rows as CandidateVenue[]) {
    summary.scanned++;

    const deactivateReason = shouldDeactivate(venue);
    if (deactivateReason) {
      if (!dryRun) {
        await db.query(
          `UPDATE venues
           SET is_active = FALSE,
               venue_scope = 'excluded',
               scope_reason = $2,
               updated_at = NOW()
           WHERE id = $1 AND editor_locked = FALSE`,
          [venue.id, deactivateReason],
        );
        await insertProvenance(venue.id, 'is_active', 'true', 'false', deactivateReason);
      }
      summary.deactivated++;
      continue;
    }

    const nextType = classifyType(venue);
    if (!nextType) {
      summary.unmatched++;
      continue;
    }

    if (!dryRun) {
      await db.query(
        `UPDATE venues
         SET type = $1,
             updated_at = NOW()
         WHERE id = $2 AND editor_locked = FALSE`,
        [nextType, venue.id],
      );
      await insertProvenance(
        venue.id,
        'type',
        venue.type,
        nextType,
        `Reclassified core ${venue.source} (${venue.type}) -> ${nextType}`,
      );
    }
    summary.reclassified[nextType] = (summary.reclassified[nextType] || 0) + 1;
  }

  logger.info(summary, 'Core venue reclassification complete');
  return summary;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dryRun = process.argv.includes('--dry-run');
  reclassifyCoreVenues(dryRun)
    .then((res) => {
      console.log(JSON.stringify(res));
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
