/**
 * Master fetcher - runs all data collectors
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function runScript(scriptName) {
  try {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Running ${scriptName}...`);
    console.log('='.repeat(50));
    execSync(`node ${path.join(__dirname, scriptName)}`, { stdio: 'inherit' });
    console.log(`✓ ${scriptName} completed`);
  } catch (err) {
    console.error(`✗ ${scriptName} failed:`, err.message);
    // Don't exit - continue with other scripts
  }
}

function main() {
  console.log('BD Invest Tracker - Data Fetch');
  console.log('Time:', new Date().toISOString());
  console.log('');

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Run all fetchers
  runScript('fetch-dse.js');
  runScript('fetch-bb.js');
  runScript('fetch-savings.js');
  runScript('fetch-banks.js');

  // Write last-updated timestamp
  const timestamp = {
    lastFetch: new Date().toISOString(),
    fetchDate: new Date().toISOString().split('T')[0],
    fetchTime: new Date().toTimeString().split(' ')[0],
  };

  fs.writeFileSync(path.join(DATA_DIR, 'last-updated.json'), JSON.stringify(timestamp, null, 2));

  console.log(`\n${'='.repeat(50)}`);
  console.log('All fetches complete!');
  console.log(`Last updated: ${timestamp.lastFetch}`);
  console.log('='.repeat(50));
}

main();
