# Plan 23-04: SEO, Analytics & Frontend Image Fallback Polish

## Objectives Addressed
1. **Dynamic Sitemap Generation**: Implemented `frontend/src/app/sitemap.ts` to programmatically generate a sitemap for the homepage, `/shortlist`, `/saved`, all 33 canonical London Borough landing pages, and standalone venue pages.
2. **Robots.txt Configuration**: Created `frontend/public/robots.txt` with standard crawling rules (`User-agent: *`, `Allow: /`) and pointing to the dynamically generated sitemap (`Sitemap: https://kidspot.london/sitemap.xml`).
3. **Analytics Integration**: Verified Plausible analytics tracking helpers (`usePlausible`) were correctly integrated in `venue-card.tsx` for tracking venue selections, shortlist saves, and party enquiry clicks.
4. **Client-side Image Fallback**: Updated `venue-card.tsx` with a robust client-side retry logic and a stable `onError` fallback for broken remote images.

## Outcomes
- Improved SEO capabilities through dynamic sitemap and explicit crawling rules.
- Ensured privacy-friendly tracking of important user interactions without compromising user experience.
- Strengthened UI resilience against failed external image loads, ensuring a graceful degradation for the end user.
