/**
 * Fetch Bangladesh Bank data - exchange rates, interest rates, money market
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

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
}

function parseExchangeRates(html) {
  const rates = [];
  // Parse the FX rate table from Bangladesh Bank
  const tableMatch = html.match(/<table[^>]*class="table"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return rates;

  const rows = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
  for (const row of rows) {
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
    if (cells.length >= 3) {
      const currency = stripHtml(cells[0]);
      const buyRate = parseFloat(stripHtml(cells[1]).replace(/,/g, ''));
      const sellRate = parseFloat(stripHtml(cells[2]).replace(/,/g, ''));
      if (currency && !isNaN(buyRate)) {
        rates.push({ currency, buy: buyRate, sell: isNaN(sellRate) ? null : sellRate });
      }
    }
  }
  return rates;
}

function parseReferenceRate(html) {
  // Parse the spot reference rate table
  const rates = [];
  const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
  for (const row of rows) {
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
    if (cells.length >= 3) {
      const date = stripHtml(cells[0]);
      const amRate = parseFloat(stripHtml(cells[1]).replace(/,/g, ''));
      const pmRate = parseFloat(stripHtml(cells[2]).replace(/,/g, ''));
      if (date && !isNaN(amRate)) {
        rates.push({ date, am: amRate, pm: isNaN(pmRate) ? null : pmRate });
      }
    }
  }
  return rates;
}

async function main() {
  try {
    console.log('Fetching Bangladesh Bank data...');

    // Fetch USD/BDT reference rate
    let referenceRates = [];
    try {
      const refHtml = await fetch('https://www.bb.org.bd/en/index.php/econdata/rfrexrate');
      referenceRates = parseReferenceRate(refHtml);
    } catch (e) {
      console.warn('Could not fetch reference rate:', e.message);
    }

    // Fetch main page for call money rate and MMRR
    let callMoneyRate = null;
    let mmrr = null;
    try {
      const mainHtml = await fetch('https://www.bb.org.bd/en/index.php');
      const callMatch = mainHtml.match(/Call\s*Money\s*Rate[\s\S]*?(\d+\.?\d*)/i);
      if (callMatch) callMoneyRate = parseFloat(callMatch[1]);

      const mmrrMatch = mainHtml.match(/DOMMR[^]*?(\d+\.?\d*)/);
      if (mmrrMatch) mmrr = { DOMMR: parseFloat(mmrrMatch[1]) };

      const bofrMatch = mainHtml.match(/BOFR[^]*?(\d+\.?\d*)/);
      if (bofrMatch) mmrr.BOFR = parseFloat(bofrMatch[1]);
    } catch (e) {
      console.warn('Could not fetch BB main page:', e.message);
    }

    const bbData = {
      fetchedAt: new Date().toISOString(),
      exchangeRate: {
        USD_BDT: referenceRates.length > 0 ? referenceRates[0] : null,
        history: referenceRates.slice(0, 20),
      },
      moneyMarket: {
        callMoneyRate,
        mmrr,
      },
    };

    fs.writeFileSync(path.join(DATA_DIR, 'bb-rates.json'), JSON.stringify(bbData, null, 2));
    console.log(`BB data saved: USD/BDT=${JSON.stringify(bbData.exchangeRate.USD_BDT)}, call rate=${callMoneyRate}`);
  } catch (err) {
    console.error('Error fetching BB data:', err.message);
    process.exit(1);
  }
}

main();
