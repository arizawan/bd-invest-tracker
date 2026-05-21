/**
 * Fetch DSE stock data from dsebd.org
 * Parses the latest share price page and extracts key metrics
 */
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function fetch(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'BD-Invest-Tracker/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve(body));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseDSEIndex(html) {
  const indices = {};
  // DSEX
  const dsexMatch = html.match(/DSEX[^]*?(\d[\d,]+\.\d+)/);
  if (dsexMatch) indices.DSEX = parseFloat(dsexMatch[1].replace(/,/g, ''));

  // DS30
  const ds30Match = html.match(/DS30[^]*?(\d[\d,]+\.\d+)/);
  if (ds30Match) indices.DS30 = parseFloat(ds30Match[1].replace(/,/g, ''));

  // DSES
  const dsesMatch = html.match(/DSES[^]*?(\d[\d,]+\.\d+)/);
  if (dsesMatch) indices.DSES = parseFloat(dsesMatch[1].replace(/,/g, ''));

  return indices;
}

function parseDSETopStocks(html) {
  const stocks = [];
  // Match table rows: TRADING CODE | LTP | HIGH | LOW | CLOSEP | YCP | CHANGE | ...
  const rowRegex = /<tr[^>]*>\s*<td[^>]*>(\d+)<\/td>\s*<td[^>]*><a[^>]*>([A-Z0-9()&\-]+)<\/a><\/td>\s*<td[^>]*>([\d,.]+)<\/td>\s*<td[^>]*>([\d,.]+)<\/td>\s*<td[^>]*>([\d,.]+)<\/td>\s*<td[^>]*>([\d,.]+)<\/td>\s*<td[^>]*>([\d,.\-+]+)<\/td>/gi;

  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    stocks.push({
      rank: parseInt(match[1]),
      code: match[2].trim(),
      ltp: parseFloat(match[3].replace(/,/g, '')),
      high: parseFloat(match[4].replace(/,/g, '')),
      low: parseFloat(match[5].replace(/,/g, '')),
      close: parseFloat(match[6].replace(/,/g, '')),
      change: parseFloat(match[7].replace(/,/g, '')),
    });
    if (stocks.length >= 50) break;
  }
  return stocks;
}

function parseDSEMarketSummary(html) {
  const summary = {};
  // Total Trade
  const totalTradeMatch = html.match(/Total\s*Trade[^>]*>\s*(\d[\d,]*)/i);
  if (totalTradeMatch) summary.totalTrade = parseInt(totalTradeMatch[1].replace(/,/g, ''));

  // Total Volume
  const totalVolMatch = html.match(/Total\s*Volume[^>]*>\s*(\d[\d,]*)/i);
  if (totalVolMatch) summary.totalVolume = parseInt(totalVolMatch[1].replace(/,/g, ''));

  // Total Value
  const totalValMatch = html.match(/Total\s*Value[^>]*>\s*([\d,.]+)/i);
  if (totalValMatch) summary.totalValueMn = parseFloat(totalValMatch[1].replace(/,/g, ''));

  // Advanced / Declined / Unchanged
  const advMatch = html.match(/Issues\s*Advanced[^>]*>\s*(\d+)/i);
  if (advMatch) summary.advanced = parseInt(advMatch[1]);

  const decMatch = html.match(/Issues\s*declined[^>]*>\s*(\d+)/i);
  if (decMatch) summary.declined = parseInt(decMatch[1]);

  const uncMatch = html.match(/Issues\s*Unchanged[^>]*>\s*(\d+)/i);
  if (uncMatch) summary.unchanged = parseInt(uncMatch[1]);

  return summary;
}

async function main() {
  try {
    console.log('Fetching DSE data...');
    const html = await fetch('https://www.dsebd.org/latest_share_price_scroll_by_ltp.php');

    const indices = parseDSEIndex(html);
    const stocks = parseDSETopStocks(html);
    const summary = parseDSEMarketSummary(html);

    const dseData = {
      fetchedAt: new Date().toISOString(),
      marketDate: new Date().toISOString().split('T')[0],
      indices,
      summary,
      topStocks: stocks,
    };

    // Also fetch main page for full market summary
    try {
      const mainHtml = await fetch('https://www.dsebd.org');
      const mainIndices = parseDSEIndex(mainHtml);
      if (Object.keys(mainIndices).length > Object.keys(indices).length) {
        dseData.indices = { ...dseData.indices, ...mainIndices };
      }
      const mainSummary = parseDSEMarketSummary(mainHtml);
      dseData.summary = { ...dseData.summary, ...mainSummary };
    } catch (e) {
      console.warn('Could not fetch DSE main page:', e.message);
    }

    fs.writeFileSync(path.join(DATA_DIR, 'dse.json'), JSON.stringify(dseData, null, 2));
    console.log(`DSE data saved: ${stocks.length} stocks, indices: ${JSON.stringify(indices)}`);
  } catch (err) {
    console.error('Error fetching DSE data:', err.message);
    process.exit(1);
  }
}

main();
