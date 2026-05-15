import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(import.meta.dirname, '../.env') });

const APIFY_TOKEN = process.env.APIFY_TOKEN;

async function testApifyBatch() {
  if (!APIFY_TOKEN) {
    console.error('APIFY_TOKEN environment variable is missing.');
    process.exit(1);
  }

  const searchStringsArray = ['Science Museum London UK'];

  console.log('Triggering Apify Actor: compass~crawler-google-places...');
  const runResponse = await fetch(`https://api.apify.com/v2/acts/compass~crawler-google-places/runs?token=${APIFY_TOKEN}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      searchStringsArray,
      maxCrawledPlacesPerSearch: 1,
      language: 'en',
      countryCode: 'gb'
    })
  });

  if (!runResponse.ok) {
    const errText = await runResponse.text();
    console.error(`Failed to start Apify run. Status: ${runResponse.status}`, errText);
    return;
  }

  const runData = await runResponse.json();
  const runId = runData.data.id;
  console.log(`Apify run started successfully. Run ID: ${runId}`);

  // Poll until run completes
  let runStatus = runData.data.status;
  console.log(`Polling Apify run status...`);
  while (runStatus !== 'SUCCEEDED' && runStatus !== 'FAILED' && runStatus !== 'ABORTED' && runStatus !== 'TIMED-OUT') {
    await new Promise(resolve => setTimeout(resolve, 5000)); // wait 5 seconds
    const statusRes = await fetch(`https://api.apify.com/v2/acts/compass~crawler-google-places/runs/${runId}?token=${APIFY_TOKEN}`);
    if (!statusRes.ok) {
      console.error(`Failed to fetch run status. Status: ${statusRes.status}`);
      return;
    }
    const statusData = await statusRes.json();
    runStatus = statusData.data.status;
    console.log(`Current status: ${runStatus}`);
  }

  if (runStatus !== 'SUCCEEDED') {
    console.error(`Apify run did not succeed. Final status: ${runStatus}`);
    return;
  }

  console.log('Apify run succeeded. Fetching dataset...');
  const defaultDatasetId = runData.data.defaultDatasetId;
  
  const datasetRes = await fetch(`https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${APIFY_TOKEN}`);
  if (!datasetRes.ok) {
    console.error(`Failed to fetch dataset. Status: ${datasetRes.status}`);
    return;
  }
  
  const items = await datasetRes.json();
  console.log(`Fetched ${items.length} items from dataset.`);
  if (items.length > 0) {
    console.log('First item structure:');
    console.dir(items[0], { depth: 2 });
  }
}

testApifyBatch().catch(console.error);
