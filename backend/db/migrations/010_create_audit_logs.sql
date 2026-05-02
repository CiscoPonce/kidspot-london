-- Migration 010: Create audit logs table
-- Tracks administrative actions and critical state changes

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    admin_id TEXT,               -- Anonymized or literal ID of the admin/system performing the action
    action_type TEXT NOT NULL,   -- 'claim_approved', 'tier_manual_update', 'revenue_refund', 'venue_deactivated'
    target_id BIGINT,            -- ID of the venue or claim being acted upon
    payload JSONB,               -- Detailed context (e.g. { previous_tier: 'none', new_tier: 'gold' })
    user_agent TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for filtering and reporting
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON audit_logs(created_at);

-- Add a column to track when a venue was first claimed (for growth metrics)
ALTER TABLE venues ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
