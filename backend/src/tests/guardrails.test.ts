import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../clients/db.js';
import { venueService } from '../services/venueService.js';

describe('Enrichment Guardrails', () => {
  let venueId: number;

  beforeAll(async () => {
    // Setup test venue
    const result = await db.query(
      `INSERT INTO venues (name, lat, lon, type, source, source_id, slug)
       VALUES ('Guardrail Test Venue', 51.5, -0.1, 'softplay', 'test', 'test_guardrail_1', 'guardrail-test-venue')
       RETURNING id`
    );
    venueId = result.rows[0].id;
  });

  afterAll(async () => {
    await db.query('DELETE FROM venue_provenance_log WHERE venue_id = $1', [venueId]);
    await db.query('DELETE FROM venues WHERE id = $1', [venueId]);
  });

  it('should verify venue initial state', async () => {
    const venue = await venueService.getVenueById(venueId);
    expect(venue).toBeDefined();
    expect(venue?.editor_locked).toBe(false);
    expect(venue?.manual_source).toBeNull();
  });

  it('should verify editor_locked status', async () => {
    // 1. Lock the venue
    await db.query('UPDATE venues SET editor_locked = TRUE WHERE id = $1', [venueId]);

    // 2. Check editor_locked status
    const isLocked = await venueService.checkEditorLocked(venueId);
    expect(isLocked).toBe(true);
  });

  it('should log provenance manually', async () => {
    // 1. Log a manual change
    await venueService.logProvenance({
      venue_id: venueId,
      field_name: 'type',
      old_value: 'softplay',
      new_value: 'park',
      source: 'manual',
      changed_by: 'user:123',
      reason: 'Manual correction'
    });

    // 2. Verify it's in the log
    const logs = await venueService.getVenueProvenance(venueId);
    expect(logs.length).toBeGreaterThan(0);
    const manualLog = logs.find(l => l.source === 'manual');
    expect(manualLog).toBeDefined();
    expect(manualLog?.field_name).toBe('type');
    expect(manualLog?.new_value).toBe('park');
  });

  it('should automatically log changes via trigger', async () => {
    // 1. Update type directly in DB
    await db.query('UPDATE venues SET type = \'cafe\' WHERE id = $1', [venueId]);

    // 2. Verify trigger logged it
    // Note: We might need a small delay or just query again
    const logs = await venueService.getVenueProvenance(venueId);
    const typeLog = logs.find(l => l.field_name === 'type' && l.new_value === 'cafe' && l.changed_by === 'system:trigger');
    expect(typeLog).toBeDefined();
  });

  it('should track manual_source', async () => {
    // 1. Set manual_source
    await db.query('UPDATE venues SET manual_source = \'manual\' WHERE id = $1', [venueId]);

    const venue = await venueService.getVenueById(venueId);
    expect(venue?.manual_source).toBe('manual');
  });
});
