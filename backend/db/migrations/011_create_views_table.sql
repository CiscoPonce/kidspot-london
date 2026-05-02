-- Migration 011: Create venue views table
-- Tracks impressions/page views for venues to calculate CTR

CREATE TABLE IF NOT EXISTS venue_views (
    id BIGSERIAL PRIMARY KEY,
    venue_id BIGINT REFERENCES venues(id),
    fallback_id TEXT,               -- For OSM/Brave venues
    user_ip_hash TEXT,              -- Anonymized IP
    user_agent TEXT,
    referrer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_venue_views_venue ON venue_views(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_views_fallback ON venue_views(fallback_id);
CREATE INDEX IF NOT EXISTS idx_venue_views_date ON venue_views(created_at);

-- View for CTR reporting
CREATE OR REPLACE VIEW venue_ctr_report AS
SELECT 
    v.id as venue_id,
    v.name,
    v.sponsor_tier,
    COUNT(DISTINCT vv.id) as total_views,
    COUNT(DISTINCT oc.id) as total_clicks,
    CASE 
        WHEN COUNT(DISTINCT vv.id) > 0 
        THEN (COUNT(DISTINCT oc.id)::float / COUNT(DISTINCT vv.id)::float) * 100 
        ELSE 0 
    END as ctr_percentage
FROM venues v
LEFT JOIN venue_views vv ON v.id = vv.venue_id
LEFT JOIN outbound_clicks oc ON v.id = oc.venue_id
GROUP BY v.id, v.name, v.sponsor_tier;
