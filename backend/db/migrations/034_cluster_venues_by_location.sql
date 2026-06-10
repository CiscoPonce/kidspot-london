-- Migration 034: Cluster venues table by location index
-- Description: Physically reorders the venues table on disk based on the spatial index to speed up radius queries.

-- Command to cluster the table
CLUSTER venues USING idx_venues_location;
