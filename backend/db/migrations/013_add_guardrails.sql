-- Migration 013: Add enrichment guardrails and provenance tracking
-- Prevents silent regressions where batch jobs overwrite manual seeds and editor-locked venues

-- 1. Add guardrail columns to venues table
ALTER TABLE venues ADD COLUMN IF NOT EXISTS editor_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS manual_source TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS primary_label TEXT;

-- 2. Create provenance tracking table
CREATE TABLE IF NOT EXISTS venue_provenance_log (
    id BIGSERIAL PRIMARY KEY,
    venue_id BIGINT NOT NULL REFERENCES venues(id),
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    source TEXT NOT NULL,
    changed_by TEXT NOT NULL, -- 'system:jobname', 'user:id', 'admin:id'
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes for provenance queries
CREATE INDEX IF NOT EXISTS idx_provenance_venue ON venue_provenance_log(venue_id);
CREATE INDEX IF NOT EXISTS idx_provenance_date ON venue_provenance_log(created_at);
CREATE INDEX IF NOT EXISTS idx_provenance_source ON venue_provenance_log(source);

-- 4. Create function for logging changes
CREATE OR REPLACE FUNCTION log_venue_change(
    p_venue_id BIGINT,
    p_field_name TEXT,
    p_old_value TEXT,
    p_new_value TEXT,
    p_source TEXT,
    p_changed_by TEXT,
    p_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO venue_provenance_log (
        venue_id, field_name, old_value, new_value, source, changed_by, reason
    ) VALUES (
        p_venue_id, p_field_name, p_old_value, p_new_value, p_source, p_changed_by, p_reason
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger function to automatically log critical changes
CREATE OR REPLACE FUNCTION trg_log_venue_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log type change
    IF (OLD.type IS DISTINCT FROM NEW.type) THEN
        PERFORM log_venue_change(NEW.id, 'type', OLD.type, NEW.type, NEW.source, 'system:trigger', 'Automatic audit log');
    END IF;

    -- Log primary_label change
    IF (OLD.primary_label IS DISTINCT FROM NEW.primary_label) THEN
        PERFORM log_venue_change(NEW.id, 'primary_label', OLD.primary_label, NEW.primary_label, NEW.source, 'system:trigger', 'Automatic audit log');
    END IF;

    -- Log features change
    IF (OLD.features IS DISTINCT FROM NEW.features) THEN
        PERFORM log_venue_change(NEW.id, 'features', OLD.features::text, NEW.features::text, NEW.source, 'system:trigger', 'Automatic audit log');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on venues table
DROP TRIGGER IF EXISTS venue_changes_audit ON venues;
CREATE TRIGGER venue_changes_audit
AFTER UPDATE ON venues
FOR EACH ROW
EXECUTE FUNCTION trg_log_venue_changes();
