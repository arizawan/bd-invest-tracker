/**
 * Fetch DSE stock data from dsebd.org
 * The share price page uses a ticker format (not a data table).
 * Market summary is on the main homepage.
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

/**
 * Parse stocks from the ticker page.
 * Format: <a class='abhead'>CODE PRICE <img tkup/tkdown> CHANGE PCT%</a>
 */
function parseTickerStocks(html) {
  const stocks = [];
  // Format: <a class='abhead'>CODE&nbsp;PRICE&nbsp;<img ...tkup.gif...><br>CHANGE&nbsp;&nbsp;&nbsp;&nbsp;PCT%</a>
  // Code can contain letters, digits, (), -, and &amp; (HTML entity for &)
  const re = /([A-Z0-9()\-]+(?:&amp;[A-Z]+)?)&nbsp;([\d.]+)&nbsp;<img[^>]*(tkup|tkdown|tkneutral)\.gif[^>]*>[\s\S]*?<br>[\s\S]*?([+\-\d.]+)(?:&nbsp;)+([+\-\d.]+)%/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    stocks.push({
      code: match[1].replace(/&amp;/g, '&').trim(),
      ltp: parseFloat(match[2]),
      direction: match[3] === 'tkup' ? 'up' : match[3] === 'tkdown' ? 'down' : 'neutral',
      change: parseFloat(match[4]),
      changePct: parseFloat(match[5]),
    });
    if (stocks.length >= 400) break;
  }
  return stocks;
}

/**
 * Parse market summary from the main DSE homepage.
 * Values are in <div class="colorlight"> tags after label divs.
 */
function parseMarketSummary(html) {
  const summary = {};

  // Total Trade / Volume / Value section
  // Pattern: "Total Trade" label → next colorlight div → number
  const tradeSection = html.match(
    /Total Trade[\s\S]*?colorlight[^>]*>\s*([\d,]+)\s*<\/div>[\s\S]*?colorlight[^>]*>\s*([\d,]+)\s*<\/div>[\s\S]*?colorlight[^>]*>\s*([\d,.]+)\s*<\/div>/i
  );
  if (tradeSection) {
    summary.totalTrade = parseInt(tradeSection[1].replace(/,/g, ''));
    summary.totalVolume = parseInt(tradeSection[2].replace(/,/g, ''));
    summary.totalValueMn = parseFloat(tradeSection[3].replace(/,/g, ''));
  }

  // Advanced / Declined / Unchanged section
  const advSection = html.match(
    /Issues Advanced[\s\S]*?colorlight[^>]*>\s*(\d+)\s*<\/div>[\s\S]*?colorlight[^>]*>\s*(\d+)\s*<\/div>[\s\S]*?colorlight[^>]*>\s*(\d+)\s*<\/div>/i
  );
  if (advSection) {
    summary.advanced = parseInt(advSection[1]);
    summary.declined = parseInt(advSection[2]);
    summary.unchanged = parseInt(advSection[3]);
  }

  return summary;
}

/**
 * Parse DSE indices from the homepage.
 * Index values are embedded as JS data for Dygraph charts.
 * Format: "YYYY-MM-DD HH:MM,VALUE\n"+...
 */
function parseIndices(html) {
  const indices = {};

  // Find chart title markers to locate data sections
  const broadIdx = html.indexOf('DSE Broad Index');
  const shariahIdx = html.indexOf('DSE Shariah Index');

  // DSEX data is before "DSE Shariah Index" section (or just find all date-value pairs)
  const re = /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}),(\d+\.\d+)/g;
  const allPairs = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    allPairs.push({ ts: m[1], val: parseFloat(m[2]), pos: m.index });
  }

  if (allPairs.length === 0) return indices;

  // Split into series by detecting large value jumps
  const series = [[allPairs[0]]];
  for (let i = 1; i < allPairs.length; i++) {
    const prev = series[series.length - 1][series[series.length - 1].length - 1];
    if (Math.abs(allPairs[i].val - prev.val) > 1000) {
      series.push([allPairs[i]]);
    } else {
      series[series.length - 1].push(allPairs[i]);
    }
  }

  // Identify series by value range
  for (const s of series) {
    const lastVal = s[s.length - 1].val;
    if (lastVal > 4000) {
      indices.DSEX = Math.round(lastVal * 100) / 100;
    } else if (lastVal > 1000 && lastVal < 2000) {
      indices.DSES = Math.round(lastVal * 100) / 100;
    } else if (lastVal > 1800 && lastVal < 2500) {
      indices.DS30 = Math.round(lastVal * 100) / 100;
    }
  }

  return indices;
}

async function main() {
  try {
    console.log('Fetching DSE share price ticker...');
    const tickerHtml = await fetch('https://www.dsebd.org/latest_share_price_scroll_by_ltp.php');
    const stocks = parseTickerStocks(tickerHtml);
    console.log(`Parsed ${stocks.length} stocks from ticker`);

    let indices = {};
    let summary = {};

    // Fetch main page for indices and market summary
    try {
      console.log('Fetching DSE main page...');
      const mainHtml = await fetch('https://www.dsebd.org');
      indices = parseIndices(mainHtml);
      summary = parseMarketSummary(mainHtml);
      console.log(`Indices: ${JSON.stringify(indices)}`);
      console.log(`Summary: ${JSON.stringify(summary)}`);
    } catch (e) {
      console.warn('Could not fetch DSE main page:', e.message);
    }

    // Sort stocks by LTP descending for "top stocks" view
    const topStocks = [...stocks].sort((a, b) => b.ltp - a.ltp).slice(0, 50);

    const dseData = {
      fetchedAt: new Date().toISOString(),
      marketDate: new Date().toISOString().split('T')[0],
      indices,
      summary,
      topStocks,
    };

    fs.writeFileSync(path.join(DATA_DIR, 'dse.json'), JSON.stringify(dseData, null, 2));
    console.log(`DSE data saved: ${topStocks.length} top stocks, indices: ${JSON.stringify(indices)}`);
  } catch (err) {
    console.error('Error fetching DSE data:', err.message);
    process.exit(1);
  }
}

main();
