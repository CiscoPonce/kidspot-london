# Next Actions: Search Improvements & OSM Integration

Here is the status of the project and the tasks remaining to finalize the OpenStreetMap (OSM) and Brave Search fallback integration.

### What We Did Today
1. **Frontend Search Context:** Updated the frontend `useSearch` hook and API functions to pass the `postcode` to the backend.
2. **Brave Search Localization:** Updated the Brave Search fallback to append the postcode to the query (e.g., "park venues near e154gh London UK") for better location accuracy.
3. **OSM Overpass Integration:** Added an `fetchOsmSearchResults` fallback layer *before* the Brave Search fallback. If the local DB has no results, the system now asks OpenStreetMap first (which is free and rich in data like parks and community halls).
4. **406 Error Fix:** Fixed an issue where the Overpass API was rejecting our requests (HTTP 406) by switching from a `POST` request with plain text to a `GET` request with query parameters.

### Actions for Tomorrow

**1. Verify the OSM Fallback**
* Run a test search from the frontend (e.g., searching for "park" or "softplay" in a specific postcode).
* Check the backend logs (`docker logs kidspot-api-1`) to confirm that `OSM Overpass fallback triggered` and successfully returns elements without the 406 error.

**2. Fine-tune Fallback Logic**
* Currently, if OSM returns *any* results, the backend skips Brave Search entirely. We should decide if we want to **combine** the results from OSM and Brave instead of mutually excluding them.
* Review the Overpass query tags to ensure we are capturing the most relevant kid-friendly venues for each category.

**3. Fix Distance Sorting for Fallbacks**
* Fallback venues (from OSM and Brave) currently don't calculate `distance_miles` from the user's exact search coordinates on the fly. We need to add a Haversine distance calculation in the backend before returning fallback results, otherwise the frontend might struggle to sort them correctly.

**4. Commit and Push Changes**
* The modifications to `backend/src/services/venueService.ts`, `backend/src/schemas/searchSchema.ts`, `backend/src/types/venue.ts`, and the frontend components need to be committed and pushed to your Git repository.

### How to Resume
When you're back, simply read this document and run:
```bash
# Test the search API directly
curl -s "http://localhost:4000/api/search/venues?lat=51.5429&lon=0.0121&radius_miles=5&limit=50&type=park&postcode=e154gh" | jq '{total: .data.total, meta: .meta}'

# Check the API logs
docker logs kidspot-api-1 --tail 50
```