import express from 'express';
import { verifyHmac } from '../middleware/hmac.js';
// @ts-ignore
import { processStaleVenues } from '../../scripts/cron-agent.js';

const router = express.Router();

router.post('/ingest/stale', verifyHmac, async (req, res) => {
  try {
    // We can either await it or run it in the background
    // Since it processes limited batches (e.g. 50), awaiting is okay,
    // but running in the background ensures we don't hold the connection too long.
    // Let's await it as it's a cron job and the caller might want to know when it finishes.
    await processStaleVenues();
    res.status(200).json({ success: true, message: 'Stale venues processed successfully' });
  } catch (error: any) {
    console.error('Error processing stale venues:', error);
    res.status(500).json({ success: false, error: 'Internal server error while processing stale venues' });
  }
});

export default router;
