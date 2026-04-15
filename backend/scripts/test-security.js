/**
 * Security Features Test Script
 * 
 * Tests rate limiting, security headers, CORS, input validation,
 * and error handling for the KidSpot API.
 */

const axios = require('axios');
const http = require('http');

const API_BASE = process.env.API_BASE || 'http://localhost:4000';

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, message) {
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${name}`);
  if (message) console.log(`  → ${message}`);
  results.tests.push({ name, passed, message });
  if (passed) results.passed++;
  else results.failed++;
}

async function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: JSON.parse(data)
          });
        } catch {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Test 1: Security headers via Helmet.js
async function testSecurityHeaders() {
  console.log('\n--- Testing Security Headers ---');
  
  try {
    const res = await makeRequest({
      host: API_BASE.replace('http://', ''),
      path: '/health',
      method: 'GET'
    });

    // Check HSTS header
    const hasHSTS = res.headers['strict-transport-security'];
    logTest('HSTS header present', !!hasHSTS, 
      hasHSTS ? `HSTS: ${hasHSTS}` : 'Missing Strict-Transport-Security header');

    // Check NoSniff header
    const hasNoSniff = res.headers['x-content-type-options'];
    logTest('X-Content-Type-Options header present', hasNoSniff === 'nosniff',
      hasNoSniff ? `X-Content-Type-Options: ${hasNoSniff}` : 'Missing X-Content-Type-Options header');

    // Check X-Frame-Options header
    const hasFrameguard = res.headers['x-frame-options'];
    logTest('X-Frame-Options header present', !!hasFrameguard,
      hasFrameguard ? `X-Frame-Options: ${hasFrameguard}` : 'Missing X-Frame-Options header');

    // Check Content-Security-Policy header
    const hasCSP = res.headers['content-security-policy'];
    logTest('Content-Security-Policy header present', !!hasCSP,
      hasCSP ? 'CSP configured' : 'CSP header present (may be expected in development)');

  } catch (error) {
    logTest('Security headers test', false, `Error: ${error.message}`);
  }
}

// Test 2: Rate limiting
async function testRateLimiting() {
  console.log('\n--- Testing Rate Limiting ---');
  
  const host = API_BASE.replace('http://', '');
  
  // Make 60 requests quickly to trigger rate limit
  let rateLimited = false;
  let requests Made = 0;
  
  for (let i = 0; i < 65; i++) {
    try {
      const res = await makeRequest({
        host,
        path: '/api/search/venues?lat=51.5074&lon=-0.1278',
        method: 'GET'
      });
      requestsMade++;
      
      if (res.status === 429) {
        rateLimited = true;
        break;
      }
    } catch (error) {
      // Ignore errors during rate limit test
    }
  }

  logTest('Rate limiting triggers after 60 requests', rateLimited,
    rateLimited ? 'Got 429 after 60 requests' : `Made ${requestsMade} requests without rate limit`);
}

// Test 3: CORS configuration
async function testCORS() {
  console.log('\n--- Testing CORS ---');
  
  try {
    // Preflight request
    const res = await makeRequest({
      host: API_BASE.replace('http://', ''),
      path: '/api/search/venues?lat=51.5074&lon=-0.1278',
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://example.com',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });

    const hasCORSHeaders = res.headers['access-control-allow-origin'];
    logTest('CORS headers present', !!hasCORSHeaders,
      hasCORSHeaders ? `Access-Control-Allow-Origin: ${hasCORSHeaders}` : 'Missing CORS headers');

  } catch (error) {
    logTest('CORS test', false, `Error: ${error.message}`);
  }
}

// Test 4: Input validation
async function testInputValidation() {
  console.log('\n--- Testing Input Validation ---');
  
  const host = API_BASE.replace('http://', '');
  
  // Test invalid lat
  try {
    const res = await axios.get(`${API_BASE}/api/search/venues?lat=200&lon=-0.1278`);
    logTest('Rejects invalid lat > 90', res.status === 400, 'Should return 400 for invalid lat');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      logTest('Rejects invalid lat > 90', true, 'Correctly returned 400');
    } else {
      logTest('Rejects invalid lat > 90', false, `Unexpected error: ${error.message}`);
    }
  }

  // Test invalid lon
  try {
    const res = await axios.get(`${API_BASE}/api/search/venues?lat=51.5074&lon=-500`);
    logTest('Rejects invalid lon > 180', res.status === 400, 'Should return 400 for invalid lon');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      logTest('Rejects invalid lon > 180', true, 'Correctly returned 400');
    } else {
      logTest('Rejects invalid lon > 180', false, `Unexpected error: ${error.message}`);
    }
  }

  // Test invalid radius
  try {
    const res = await axios.get(`${API_BASE}/api/search/venues?lat=51.5074&lon=-0.1278&radius_miles=200`);
    logTest('Rejects invalid radius > 50', res.status === 400, 'Should return 400 for invalid radius');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      logTest('Rejects invalid radius > 50', true, 'Correctly returned 400');
    } else {
      logTest('Rejects invalid radius > 50', false, `Unexpected error: ${error.message}`);
    }
  }

  // Test invalid type
  try {
    const res = await axios.get(`${API_BASE}/api/search/venues?lat=51.5074&lon=-0.1278&type=invalid`);
    logTest('Rejects invalid type', res.status === 400, 'Should return 400 for invalid type');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      logTest('Rejects invalid type', true, 'Correctly returned 400');
    } else {
      logTest('Rejects invalid type', false, `Unexpected error: ${error.message}`);
    }
  }

  // Test invalid venue id
  try {
    const res = await axios.get(`${API_BASE}/api/search/venues/invalid/details`);
    logTest('Rejects invalid venue id', res.status === 400, 'Should return 400 for invalid id');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      logTest('Rejects invalid venue id', true, 'Correctly returned 400');
    } else {
      logTest('Rejects invalid venue id', false, `Unexpected error: ${error.message}`);
    }
  }

  // Test negative venue id
  try {
    const res = await axios.get(`${API_BASE}/api/search/venues/-5/details`);
    logTest('Rejects negative venue id', res.status === 400, 'Should return 400 for negative id');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      logTest('Rejects negative venue id', true, 'Correctly returned 400');
    } else {
      logTest('Rejects negative venue id', false, `Unexpected error: ${error.message}`);
    }
  }
}

// Test 5: Error handling
async function testErrorHandling() {
  console.log('\n--- Testing Error Handling ---');
  
  // Test 404 handler
  try {
    const res = await axios.get(`${API_BASE}/api/nonexistent`);
    logTest('Returns 404 for unknown routes', res.status === 404, 'Got 404 status');
  } catch (error) {
    if (error.response && error.response.status === 404) {
      logTest('Returns 404 for unknown routes', true, 'Correctly returned 404');
    } else {
      logTest('Returns 404 for unknown routes', false, `Unexpected error: ${error.message}`);
    }
  }

  // Test that error messages are generic (no information leakage)
  try {
    const res = await axios.get(`${API_BASE}/api/search/venues?lat=invalid&lon=-0.1278`);
    logTest('Error message does not leak sensitive info', 
      res.data.error && !res.data.error.includes('database') && !res.data.error.includes('stack'),
      res.data.error ? `Error: ${res.data.error}` : 'No error message');
  } catch (error) {
    if (error.response) {
      const errorMsg = error.response.data.error || '';
      const isGeneric = !errorMsg.includes('database') && !errorMsg.includes('sql') && !errorMsg.includes('stack');
      logTest('Error message does not leak sensitive info', isGeneric,
        isGeneric ? 'Error is generic' : `Error leaks info: ${errorMsg}`);
    } else {
      logTest('Error message does not leak sensitive info', false, `Unexpected error: ${error.message}`);
    }
  }
}

// Test 6: Valid inputs work correctly
async function testValidInputs() {
  console.log('\n--- Testing Valid Inputs ---');
  
  // Test valid search
  try {
    const res = await axios.get(`${API_BASE}/api/search/venues?lat=51.5074&lon=-0.1278&radius_miles=5&type=softplay&limit=10`);
    logTest('Valid search parameters work', res.status === 200 && res.data.success === true,
      res.data.success ? 'Search returned results' : 'Search failed');
  } catch (error) {
    logTest('Valid search parameters work', false, `Error: ${error.message}`);
  }

  // Test missing lat/lon
  try {
    const res = await axios.get(`${API_BASE}/api/search/venues`);
    logTest('Requires lat and lon parameters', res.status === 400, 'Should return 400 for missing params');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      logTest('Requires lat and lon parameters', true, 'Correctly returned 400');
    } else {
      logTest('Requires lat and lon parameters', false, `Unexpected error: ${error.message}`);
    }
  }
}

// Run all tests
async function runTests() {
  console.log('=================================================');
  console.log('  KidSpot API Security Features Test Suite');
  console.log('=================================================');
  console.log(`Target: ${API_BASE}`);

  await testSecurityHeaders();
  await testRateLimiting();
  await testCORS();
  await testInputValidation();
  await testErrorHandling();
  await testValidInputs();

  console.log('\n=================================================');
  console.log('  Test Results');
  console.log('=================================================');
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Total:  ${results.passed + results.failed}`);
  console.log('=================================================');

  if (results.failed > 0) {
    console.log('\nFailed tests:');
    results.tests.filter(t => !t.passed).forEach(t => {
      console.log(`  - ${t.name}: ${t.message}`);
    });
    process.exit(1);
  } else {
    console.log('\nAll tests passed!');
    process.exit(0);
  }
}

// Allow running directly
if (require.main === module) {
  runTests().catch(err => {
    console.error('Test suite error:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
