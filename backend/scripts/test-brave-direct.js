const axios = require('axios');
require('dotenv').config();

async function testBrave() {
  const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
  if (!BRAVE_API_KEY) {
    console.error('BRAVE_API_KEY is not set in .env');
    process.exit(1);
  }

  console.log('Testing Brave Search API key...');
  const searchQuery = 'child friendly venues near New York';

  try {
    const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      params: {
        q: searchQuery,
        count: 5
      },
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': BRAVE_API_KEY
      },
      timeout: 10000
    });

    console.log('Status:', response.status);
    if (response.data && response.data.web && response.data.web.results) {
      console.log('SUCCESS: Brave Search API returned results!');
      console.log(`Found ${response.data.web.results.length} results.`);
      console.log('First result title:', response.data.web.results[0].title);
    } else {
      console.log('Unexpected response format:', JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    console.error('Brave Search API error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Message:', error.message);
    }
  }
}

testBrave();
