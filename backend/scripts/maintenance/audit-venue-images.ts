import { db } from '../../src/clients/db.js';

async function auditImages() {
  const { rows } = await db.query(
    `SELECT id, name, type, website, images[1] as img 
     FROM venues 
     WHERE array_length(images, 1) > 0 
     LIMIT 20`
  );

  console.log(`\n=== AUDITING ACTUAL VENUE IMAGE URLS IN DATABASE (${rows.length} venues) ===\n`);

  for (const r of rows) {
    try {
      const res = await fetch(r.img, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(5000),
      });
      const status = res.status;
      const contentType = res.headers.get('content-type') || 'unknown';
      const isOk = res.ok && contentType.startsWith('image/');
      console.log(`${isOk ? '✅' : '⚠️'} [Status ${status} | ${contentType}] ${r.name} (${r.type})\n   URL: ${r.img.slice(0, 90)}\n`);
    } catch (err: any) {
      console.log(`❌ [FETCH ERROR: ${err.message}] ${r.name} (${r.type})\n   URL: ${r.img.slice(0, 90)}\n`);
    }
  }

  process.exit(0);
}

auditImages().catch(console.error);
