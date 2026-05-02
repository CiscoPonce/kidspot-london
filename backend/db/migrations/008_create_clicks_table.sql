-- Create clicks table to track outbound traffic and lead generation
CREATE TABLE IF NOT EXISTS outbound_clicks (
    id BIGSERIAL PRIMARY KEY,
    venue_id BIGINT REFERENCES venues(id),
    fallback_id TEXT,               -- For OSM/Brave venues that aren't in our DB yet
    click_type TEXT NOT NULL,       -- 'website', 'booking', 'phone', 'direction'
    user_ip_hash TEXT,              -- Anonymized IP for privacy-first tracking
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_outbound_clicks_venue ON outbound_clicks(venue_id);
CREATE INDEX IF NOT EXISTS idx_outbound_clicks_fallback ON outbound_clicks(fallback_id);
CREATE INDEX IF NOT EXISTS idx_outbound_clicks_type ON outbound_clicks(click_type);
CREATE INDEX IF NOT EXISTS idx_outbound_clicks_date ON outbound_clicks(created_at);

-- View for sponsor reporting
CREATE OR REPLACE VIEW sponsor_click_report AS
SELECT 
    v.id as venue_id,
    v.name,
    v.sponsor_tier,
    c.click_type,
    COUNT(c.id) as total_clicks,
    DATE_TRUNC('day', c.created_at) as click_date
FROM venues v
JOIN outbound_clicks c ON v.id = c.venue_id
GROUP BY v.id, v.name, v.sponsor_tier, c.click_type, DATE_TRUNC('day', c.created_at)
ORDER BY click_date DESC, total_clicks DESC;
