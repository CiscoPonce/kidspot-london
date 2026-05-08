-- Migration 015: FHRS Integration
-- Authoritative food business data for address normalisation and trust scores

-- 0. Enable pg_trgm for fuzzy name matching if not already present
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Create FHRS establishments table
CREATE TABLE IF NOT EXISTS fhrs_establishments (
    id BIGINT PRIMARY KEY, -- fhrsID from API
    business_name TEXT NOT NULL,
    business_type TEXT NOT NULL,
    business_type_id INTEGER,
    address_line1 TEXT,
    address_line2 TEXT,
    address_line3 TEXT,
    address_line4 TEXT,
    postcode TEXT,
    rating_value TEXT,
    rating_key TEXT,
    rating_date TIMESTAMPTZ,
    local_authority_name TEXT,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    scores_hygiene INTEGER,
    scores_structural INTEGER,
    scores_confidence_in_management INTEGER,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for FHRS queries
CREATE INDEX IF NOT EXISTS idx_fhrs_postcode ON fhrs_establishments(postcode);
CREATE INDEX IF NOT EXISTS idx_fhrs_business_type ON fhrs_establishments(business_type);
CREATE INDEX IF NOT EXISTS idx_fhrs_name_trgm ON fhrs_establishments USING gin(business_name gin_trgm_ops);

-- 3. Add FHRS ID to venues table for direct matching
ALTER TABLE venues ADD COLUMN IF NOT EXISTS fhrs_establishment_id BIGINT REFERENCES fhrs_establishments(id);
CREATE INDEX IF NOT EXISTS idx_venues_fhrs_id ON venues(fhrs_establishment_id);

-- 4. Create FHRS business type allowlist table
CREATE TABLE IF NOT EXISTS fhrs_business_type_allowlist (
    id SERIAL PRIMARY KEY,
    business_type TEXT UNIQUE NOT NULL,
    is_party_relevant BOOLEAN DEFAULT TRUE,
    trust_boost_multiplier NUMERIC DEFAULT 1.1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Seed initial allowlist (party-relevant types)
INSERT INTO fhrs_business_type_allowlist (business_type, is_party_relevant, trust_boost_multiplier)
VALUES 
    ('Restaurant/Cafe/Canteen', TRUE, 1.1),
    ('Pub/bar/nightclub', TRUE, 1.1),
    ('Other catering premises', TRUE, 1.05),
    ('School/college/university', FALSE, 1.0),
    ('Retailers - other', FALSE, 1.0),
    ('Hospitals/Childcare/Caring Premises', TRUE, 1.05),
    ('Hotel/bed & breakfast/guest house', TRUE, 1.1),
    ('Mobile caterer', FALSE, 1.0),
    ('Takeaway/sandwich shop', FALSE, 1.0),
    ('Distributors/Transporters', FALSE, 1.0),
    ('Farmers/growers', FALSE, 1.0),
    ('Importers/Exporters', FALSE, 1.0),
    ('Manufacturers/packers', FALSE, 1.0)
ON CONFLICT (business_type) DO UPDATE SET
    is_party_relevant = EXCLUDED.is_party_relevant,
    trust_boost_multiplier = EXCLUDED.trust_boost_multiplier;

-- 6. Create function to check if FHRS business type is party-relevant
CREATE OR REPLACE FUNCTION is_fhrs_type_relevant(p_business_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_relevant BOOLEAN;
BEGIN
    SELECT is_party_relevant INTO v_relevant
    FROM fhrs_business_type_allowlist
    WHERE business_type = p_business_type;
    
    RETURN COALESCE(v_relevant, FALSE);
END;
$$ LANGUAGE plpgsql;

-- 7. Create view for party-relevant FHRS establishments
CREATE OR REPLACE VIEW v_party_relevant_fhrs AS
SELECT e.*
FROM fhrs_establishments e
JOIN fhrs_business_type_allowlist a ON e.business_type = a.business_type
WHERE a.is_party_relevant = TRUE;
