const { spawn } = require('child_process');
const autocannon = require('autocannon');
const path = require('path');
const http = require('http');

const targetUrl = process.env.TARGET_URL || 'http://localhost:4000/api/search/venues?lat=51.5000&lon=-0.0800&radius_miles=5';

function waitForServer(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          setTimeout(check, 1000);
        }
      }).on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error('Server timed out'));
        } else {
          setTimeout(check, 1000);
        }
      });
    };
    check();
  });
}

async function runProfile(type = 'doctor') {
  console.log(`Starting profiling with clinic ${type}...`);
  
  const clinicPath = path.resolve(__dirname, '../node_modules/.bin/clinic');
  const serverPath = path.resolve(__dirname, '../src/server.js');
  
  const clinicProcess = spawn(clinicPath, [type, '--', 'node', serverPath], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: 'inherit'
  });

  try {
    console.log('Waiting for server to be ready...');
    await waitForServer('http://localhost:4000/health');
    
    console.log(`Starting load test against: ${targetUrl}`);
    const result = await autocannon({
      url: targetUrl,
      connections: 50,
      duration: 5,
      pipelining: 1,
    });

    console.log('Load test completed.');
    console.log(`- Throughput: ${result.requests.average} req/sec`);
    console.log(`- Average Latency: ${result.latency.average} ms`);
    console.log(`- Max Latency: ${result.latency.max} ms`);
    console.log(`- Error count: ${result.errors + result.timeouts}`);
  } catch (err) {
    console.error('Profiling failed:', err);
  } finally {
    console.log('Stopping clinic and generating report...');
    clinicProcess.kill('SIGINT');
    
    await new Promise(resolve => {
      clinicProcess.on('exit', () => resolve());
    });
  }
}

async function main() {
  // First run doctor
  await runProfile('doctor');
  // Then run flame
  // await runProfile('flame');
}

main().catch(err => {
  console.error('Main failed:', err);
  process.exit(1);
});
