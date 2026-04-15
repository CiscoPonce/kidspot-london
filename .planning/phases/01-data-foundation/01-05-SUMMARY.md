---
phase: 01-data-foundation
plan: 05
subsystem: data-pipeline
tags:
  - gap-closure
  - london-datastore
  - data-acquisition
dependency_graph:
  requires:
    - 01-04
  provides:
    - backend/scripts/download-datastore.js (with verified working URLs)
    - backend/data/*.csv (downloaded venue data)
  affects:
    - backend/scripts/import-london-datastore.js
    - backend/data/ directory
tech_stack:
  added:
    - axios
  patterns:
    - Research-first approach for external data sources
    - Verification of URL availability before deployment
key_files:
  created:
    - backend/scripts/download-datastore.js (updated)
    - backend/data/leisure-centres.csv (Arts centres)
    - backend/data/community-halls.csv (Community centres)
    - backend/data/sports-facilities.csv (Sports participation stats)
decisions:
  - "GiGL Spaces to Visit and Open Space Friends Group datasets withdrawn from open data (Oct 2025)"
  - "Cultural Infrastructure Map 2019 provides working venue CSV downloads with point locations"
  - "Community centres and Arts centres from Cultural Infrastructure Map are suitable venue data sources"
  - "Sports facilities data is borough-level statistics, not venue locations"
metrics:
  duration: "~45 minutes"
  completed: "2026-04-15"
  commits: 1
  files_created: 3
---

# Phase 01 Plan 05: Gap Closure - London Datastore URLs

## Summary

Fixed gap G-02 by researching actual London Datastore URL availability and updating `download-datastore.js` with verified working URLs. Discovered that GiGL datasets were withdrawn in October 2025, requiring a pivot to Cultural Infrastructure Map 2019 datasets.

## One-Liner

London Datastore CSV download script updated with verified working URLs from Cultural Infrastructure Map 2019 (Arts centres, Community centres) and sports participation data.

## Research Findings (April 2026)

**Critical Discovery:**
- **GiGL Spaces to Visit (2rqo4)** - WITHDRAWN from open data October 2025
- **GiGL Open Space Friends Group subset (2nwly)** - WITHDRAWN from open data October 2025

The URLs in the original script returned HTTP 404 errors because GiGL withdrew their open data offerings.

**Working Alternatives Found:**
1. **Cultural Infrastructure Map 2019 (2ko88)** - Contains venue CSV files with point locations:
   - `Arts_centres.csv` - Multi-use cultural venues with name, address, lat/lon
   - `Community_centres.csv` - Community venues with name, address, lat/lon
   - `Pubs.csv`, `Music_venues_grassroots.csv`, `Theatres.csv`, etc.
2. **Physically Active Children (e18yk)** - Borough-level sports participation statistics

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Research real London Datastore URLs | `ff5fd36` | backend/scripts/download-datastore.js |
| 2 | Update download script with real URLs | `ff5fd36` | backend/scripts/download-datastore.js |
| 3 | Verify CSV downloads work | `ff5fd36` | backend/data/*.csv |

## Download Results

```
Starting London Datastore CSV downloads...

Downloading leisure-centres from Arts centres CSV...
✓ Downloaded leisure-centres to leisure-centres.csv (5.7KB)

Downloading community-halls from Community centres CSV...
✓ Downloaded community-halls to community-halls.csv (169.9KB)

Downloading sports-facilities from Physically Active Children CSV...
✓ Downloaded sports-facilities to sports-facilities.csv (2.5KB)

=== Download Summary ===
Total datasets: 3
Successful: 3
Failed: 0
```

## Data Quality Notes

| File | Records | Venue Data | Coordinates |
|------|---------|------------|-------------|
| leisure-centres.csv | Arts centres | ✓ name, address, website | ✓ lat/lon |
| community-halls.csv | Community centres | ✓ name, address, website | ✓ lat/lon |
| sports-facilities.csv | Borough stats | ✗ participation % | ✗ ward-level |

**For actual venue discovery** (names, addresses, geolocation), OpenStreetMap Overpass API remains the recommended approach:
```
https://overpass-api.de/api/interpreter?data=[out:json][timeout:180];area["name"="Greater London"]->.a;(node["leisure"](area.a););out center;
```

## Deviations from Plan

**1. [Rule 3 - Blocking Issue] GiGL datasets withdrawn**
- **Found during:** Task 3 (Verification)
- **Issue:** Original GiGL URLs returned HTTP 404 - datasets withdrawn Oct 2025
- **Fix:** Pivoted to Cultural Infrastructure Map 2019 datasets which provide venue point location data
- **Files modified:** backend/scripts/download-datastore.js
- **Commit:** `ff5fd36`

**2. Data source change**
- **Original assumption:** London Datastore hosts centralized venue CSVs
- **Reality:** No centralized venue CSV exists; must use Cultural Infrastructure Map or Overpass API
- **Impact:** Download script now works but data comes from different sources than originally planned

## Verification

- [x] `grep -c "placeholder" backend/scripts/download-datastore.js` returns 0
- [x] All 3 CSV files download successfully
- [x] CSV files contain parseable data with correct structure
- [x] leisure-centres.csv has 5.7KB of Arts centre venue data
- [x] community-halls.csv has 169.9KB of Community centre venue data
- [x] sports-facilities.csv has borough-level sports statistics

## Threat Flags

None - no security-relevant surface introduced. Script downloads public open data from London Datastore.

## Next Steps

- Consider importing Arts centres and Community centres data into venues table
- Overpass API should be used for comprehensive venue discovery (softplay, playgrounds, etc.)
- The 2019 Cultural Infrastructure Map data may be outdated - check 2023/2024 web app for latest data
