/**
 * Fetch Bangladesh Bank data
 * - USD/BDT reference rate (AM/PM)
 * - Cross rates (EUR, GBP, SGD, INR, JPY, AUD, CAD, etc.)
 * - Derived NRB-relevant rates (SAR, AED, QAR, OMR, BHD, KWD, THB, MYR)
 * - Call money rate, MMRR
 */

// Gulf currencies pegged to USD (rate = units per 1 USD)
const PEGGED_CURRENCIES = {
  SAR: 3.75,      // Saudi Riyal (fixed since 1986)
  AED: 3.6725,    // UAE Dirham (fixed since 1997)
  QAR: 3.64,      // Qatari Riyal (fixed since 2001)
  OMR: 0.3845,    // Omani Rial (fixed since 1986)
  BHD: 0.376,     // Bahraini Dinar (fixed since 1980)
  KWD: 0.2997,    // Kuwaiti Dinar (managed peg ~0.30)
};

// Free API for floating SE Asian currencies (no key needed)
const FX_API_URL = 'https://open.er-api.com/v6/latest/USD';
const FLOATING_CCYS = ['THB', 'MYR'];
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

function parseReferenceRate(html) {
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

/**
 * Parse cross rates from BB exchange rate page.
 * The markdown-like page has tables with Currency | Bid Rate | Ask Rate.
 * But the HTML version has <table> elements.
 */
function parseCrossRates(html) {
  const rates = {};

  // Try HTML table parsing first
  const tableMatches = html.match(/<table[^>]*>([\s\S]*?)<\/table>/gi) || [];
  for (const table of tableMatches) {
    const rows = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    for (const row of rows) {
      const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
      if (cells.length >= 3) {
        const ccy = stripHtml(cells[0]).trim();
        const bid = parseFloat(stripHtml(cells[1]).replace(/,/g, ''));
        const ask = parseFloat(stripHtml(cells[2]).replace(/,/g, ''));
        if (ccy && ccy.length === 3 && !isNaN(bid)) {
          rates[ccy] = { bid, ask: isNaN(ask) ? bid : ask };
        }
      }
    }
  }

  // Fallback: parse markdown-style table from the fetched text
  if (Object.keys(rates).length === 0) {
    const lines = html.split('\n');
    for (const line of lines) {
      const m = line.match(/^\|\s*([A-Z]{3})\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|/);
      if (m) {
        rates[m[1]] = { bid: parseFloat(m[2]), ask: parseFloat(m[3]) };
      }
    }
  }

  return rates;
}

async function main() {
  try {
    console.log('Fetching Bangladesh Bank data...');

    // 1. USD/BDT reference rate
    let referenceRates = [];
    try {
      const refHtml = await fetch('https://www.bb.org.bd/en/index.php/econdata/rfrexrate');
      referenceRates = parseReferenceRate(refHtml);
      console.log(`  Reference rates: ${referenceRates.length} days`);
    } catch (e) {
      console.warn('  Could not fetch reference rate:', e.message);
    }

    // 2. Cross rates (multi-currency)
    let crossRates = {};
    try {
      const crossHtml = await fetch('https://www.bb.org.bd/en/index.php/econdata/exchangerate');
      crossRates = parseCrossRates(crossHtml);
      console.log(`  Cross rates: ${Object.keys(crossRates).join(', ')}`);
    } catch (e) {
      console.warn('  Could not fetch cross rates:', e.message);
    }

    // 3. Derived NRB-relevant rates (pegged Gulf currencies + THB/MYR)
    const usdBdt = referenceRates.length > 0
      ? (referenceRates[0].am || referenceRates[0].pm || 122.75)
      : (crossRates.USD?.bid || 122.75);

    // Pegged: BDT/CCY = USD_BDT / PEG_RATE
    for (const [ccy, pegRate] of Object.entries(PEGGED_CURRENCIES)) {
      const bdtPerCcy = usdBdt / pegRate;
      crossRates[ccy] = { bid: Math.round(bdtPerCcy * 100) / 100, ask: Math.round(bdtPerCcy * 100) / 100 };
    }
    console.log(`  Pegged rates added: ${Object.keys(PEGGED_CURRENCIES).join(', ')}`);

    // Floating: THB, MYR via free API
    try {
      const fxApiBody = await fetch(FX_API_URL);
      const fxData = JSON.parse(fxApiBody);
      if (fxData.rates) {
        for (const ccy of FLOATING_CCYS) {
          if (fxData.rates[ccy]) {
            const bdtPerCcy = usdBdt / fxData.rates[ccy];
            crossRates[ccy] = { bid: Math.round(bdtPerCcy * 100) / 100, ask: Math.round(bdtPerCcy * 100) / 100 };
          }
        }
        console.log(`  Floating rates added: ${FLOATING_CCYS.filter(c => fxData.rates[c]).join(', ')}`);
      }
    } catch (e) {
      console.warn('  Could not fetch THB/MYR rates:', e.message);
    }

    // 4. Main page for call money rate and MMRR
    let callMoneyRate = null;
    let mmrr = null;
    try {
      const mainHtml = await fetch('https://www.bb.org.bd/en/index.php');
      const callMatch = mainHtml.match(/Call\s*Money\s*Rate[\s\S]*?(\d+\.?\d*)/i);
      if (callMatch) callMoneyRate = parseFloat(callMatch[1]);

      const mmrrMatch = mainHtml.match(/DOMMR[^]*?(\d+\.?\d*)/);
      if (mmrrMatch) mmrr = { DOMMR: parseFloat(mmrrMatch[1]) };

      const bofrMatch = mainHtml.match(/BOFR[^]*?(\d+\.?\d*)/);
      if (bofrMatch) mmrr = mmrr || {};
      if (bofrMatch && mmrr) mmrr.BOFR = parseFloat(bofrMatch[1]);
    } catch (e) {
      console.warn('  Could not fetch BB main page:', e.message);
    }

    const bbData = {
      fetchedAt: new Date().toISOString(),
      exchangeRate: {
        USD_BDT: referenceRates.length > 0 ? referenceRates[0] : null,
        history: referenceRates.slice(0, 30),
      },
      crossRates,
      moneyMarket: {
        callMoneyRate,
        mmrr,
      },
    };

    fs.writeFileSync(path.join(DATA_DIR, 'bb-rates.json'), JSON.stringify(bbData, null, 2));
    console.log(`BB data saved: USD/BDT=${JSON.stringify(bbData.exchangeRate.USD_BDT)}, cross=${Object.keys(crossRates).length} currencies (incl. ${Object.keys(PEGGED_CURRENCIES).length} pegged + ${FLOATING_CCYS.length} floating), call=${callMoneyRate}`);
  } catch (err) {
    console.error('Error fetching BB data:', err.message);
    process.exit(1);
  }
}

main();
