import { db } from '../../../src/clients/db.js';
import { logger } from '../../../src/config/logger.js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const APIFY_TOKEN = process.env.APIFY_TOKEN || process.env.APIFY_API_TOKEN;
const ACTOR_ID = 'compass~crawler-google-places';

export async function enrichViaApify(limit: number = 20) {
  logger.info(`Starting Apify Enrichment batch for up to ${limit} venues...`);

  const stats = { enriched: 0, skipped: 0, failed: 0 };

  try {
    // 1. Fetch high-value venues for enrichment/refresh
    // For 'softplay', we refresh even if data exists to ensure accuracy
    // For others, we only enrich if missing website/phone
    const { rows: venues } = await db.query(
      `SELECT id, name, type, lat, lon 
       FROM venues 
       WHERE is_active = TRUE 
       AND (
         (type = 'softplay' AND (enriched_at IS NULL OR enriched_at < NOW() - INTERVAL '30 days'))
         OR 
         (type IN ('leisure_centre', 'museum', 'library', 'community_hall') AND (website IS NULL OR phone IS NULL))
       )
       ORDER BY (type = 'softplay') DESC, kid_score DESC NULLS LAST, id ASC
       LIMIT $1`,
      [limit]
    );

    if (venues.length === 0) {
      logger.info('No venues require enrichment. Exiting.');
      return stats;
    }

    logger.info(`Found ${venues.length} venues for enrichment.`);

    // 2. Construct search strings with ID for reliable matching in webhook
    const searchStrings = venues.map((v) => `${v.name} London UK #ID:${v.id}`);

    let enrichedData: any[] = [];

    // 3. Trigger Apify Actor or use dummy responses
    if (!APIFY_TOKEN || APIFY_TOKEN.includes('dummy')) {
      logger.info('Using dummy Apify execution for prototype...');
      enrichedData = venues.map((v, index) => ({
        searchString: `${v.name} London UK #ID:${v.id}`,
        website: `https://www.example${index}.com`,
        phone: `+44 20 7946 000${index % 10}`,
        totalScore: 4.5 + (index % 5) * 0.1,
        reviewsCount: 100 + index * 10,
        openingHours: [
          { day: 'Monday', hours: '9 AM - 5 PM' },
          { day: 'Tuesday', hours: '9 AM - 5 PM' },
          { day: 'Wednesday', hours: '9 AM - 5 PM' },
          { day: 'Thursday', hours: '9 AM - 5 PM' },
          { day: 'Friday', hours: '9 AM - 5 PM' },
          { day: 'Saturday', hours: '10 AM - 4 PM' },
          { day: 'Sunday', hours: 'Closed' }
        ],
        imageUrls: [`https://images.unsplash.com/photo-1566433316213-3fe62ca97277?q=80&w=400`],
        emails: [`contact@example${index}.com`]
      }));
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      logger.info('Triggering live Apify Actor with webhook...');
      const webhookSecret = process.env.APIFY_WEBHOOK_SECRET || 'dev-secret';
      const apiBaseUrl = process.env.API_BASE_URL || 'https://api.kidspot.london';
      const webhookUrl = `${apiBaseUrl}/api/admin/webhooks/apify?token=${webhookSecret}`;

      const webhooksParam = Buffer.from(JSON.stringify([{
        eventTypes: ["ACTOR.RUN.SUCCEEDED"],
        requestUrl: webhookUrl
      }])).toString('base64');

      const response = await fetch(`https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}&webhooks=${webhooksParam}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchStringsArray: searchStrings,
          maxCrawledPlacesPerSearch: 1,
          language: 'en',
          countryCode: 'gb',
          scrapeCompanyWebsite: true // Deep enrichment: find emails/socials
        })
      });

      if (!response.ok) {
        if (response.status === 402) {
          logger.error('Apify run failed: Insufficient funds/credits. Please top up your Apify account.');
          throw new Error('Apify insufficient funds');
        }
        throw new Error(`Apify run trigger failed: ${response.statusText}`);
      }

      const runData = await response.json() as any;
      const runId = runData.data.id;
      logger.info(`Apify run triggered with ID: ${runId}. Webhook will process results.`);
      
      // Return early for live runs as we won't have the data yet
      return { 
        triggered: true, 
        runId, 
        enriched: 0, 
        skipped: 0, 
        failed: 0,
        count: venues.length 
      };
    }

    logger.info(`Retrieved ${enrichedData.length} records from Apify (Dummy Mode).`);

    // 4. Update the database (Only reached in Dummy Mode or if we hadn't returned early)
    for (const venue of venues) {
      const searchStr = `${venue.name} London UK #ID:${venue.id}`;
      
      const item = enrichedData.find(d => d.searchString === searchStr);

      if (item) {
        const cleanPhone = item.phone ? item.phone.replace(/\s+/g, '') : null;
        const openingHours = item.openingHours ? JSON.stringify(item.openingHours) : null;
        const email = (item.emails && item.emails.length > 0) ? item.emails[0] : (item.email || null);

        await db.query(
          `UPDATE venues 
           SET website = COALESCE(NULLIF($1, ''), website),
               phone = COALESCE(NULLIF($2, ''), phone),
               rating = COALESCE($3, rating),
               user_ratings_total = COALESCE($4, user_ratings_total),
               opening_hours = COALESCE(NULLIF($5, ''), opening_hours),
               images = CASE WHEN $6::text[] IS NOT NULL AND array_length($6::text[], 1) > 0 THEN $6 ELSE images END,
               email = COALESCE(NULLIF($7, ''), email),
               enriched_at = NOW()
           WHERE id = $8`,
          [
            item.website || null, 
            cleanPhone, 
            item.totalScore || null, 
            item.reviewsCount || null,
            openingHours,
            item.imageUrls || null,
            email,
            venue.id
          ]
        );
        logger.info(`Enriched venue ID ${venue.id}: ${venue.name}`);
        stats.enriched++;
      } else {
        await db.query(`UPDATE venues SET enriched_at = NOW() WHERE id = $1`, [venue.id]);
        logger.warn(`No Apify match found for venue ID ${venue.id}: ${venue.name}`);
        stats.skipped++;
      }
    }

    logger.info('Apify Enrichment batch completed successfully.');
    return stats;
  } catch (error) {
    logger.error({ err: error }, 'Apify Enrichment failed');
    stats.failed++;
    throw error;
  }
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  enrichViaApify()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
