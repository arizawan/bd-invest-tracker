/**
 * National Savings (Sanchayapatra) rates
 * These change every 6 months - fetched from IRD website, with fallback to hardcoded
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

// Current rates as of January 1, 2026 (from IRD notification)
// Updated when government revises (every ~6 months)
const HARDCODED_RATES = {
  effectiveDate: '2026-01-01',
  nextReview: '2026-07-01',
  source: 'IRD Notification No. 08.00.0000.000.041.22.0006.20.183 (Dec 30, 2025)',
  schemes: {
    '5-year-bangladesh-sanchayapatra': {
      name: '5-Year Bangladesh Sanchayapatra',
      tenure: '5 years',
      payout: 'On maturity',
      tiers: [
        { label: 'Up to ৳7.5 Lakh', yearlyRates: { 1: 8.76, 2: 9.15, 3: 9.55, 4: 9.98, 5: 10.44 } },
        { label: 'Above ৳7.5 Lakh', yearlyRates: { 1: 8.74, 2: 9.12, 3: 9.53, 4: 9.96, 5: 10.41 } },
      ],
      maxInvestment: null,
      eligibility: 'All citizens',
    },
    '3-monthly-profit': {
      name: '3-Monthly Profit Basis Sanchayapatra',
      tenure: '3 years',
      payout: 'Quarterly',
      tiers: [
        { label: 'Up to ৳7.5 Lakh', yearlyRates: { 1: 9.54, 2: 10.00, 3: 10.48 } },
        { label: 'Above ৳7.5 Lakh', yearlyRates: { 1: 9.50, 2: 9.95, 3: 10.43 } },
      ],
      maxInvestment: null,
      eligibility: 'All citizens',
    },
    'pensioner-sanchayapatra': {
      name: 'Pensioner Sanchayapatra',
      tenure: '5 years',
      payout: 'On maturity',
      tiers: [
        { label: 'Up to ৳7.5 Lakh', yearlyRates: { 1: 8.87, 2: 9.28, 3: 9.70, 4: 10.14, 5: 10.59 } },
        { label: 'Above ৳7.5 Lakh', yearlyRates: { 1: 8.74, 2: 9.12, 3: 9.53, 4: 9.96, 5: 10.41 } },
      ],
      maxInvestment: null,
      eligibility: 'Retirees only',
    },
    'family-savings': {
      name: 'Family Savings Certificate (Paribar Sanchayapatra)',
      tenure: '5 years',
      payout: 'Monthly',
      tiers: [
        { label: 'Up to ৳7.5 Lakh', yearlyRates: { 1: 8.83, 2: 9.24, 3: 9.66, 4: 10.09, 5: 10.54 } },
        { label: 'Above ৳7.5 Lakh', yearlyRates: { 1: 8.74, 2: 9.12, 3: 9.53, 4: 9.96, 5: 10.41 } },
      ],
      maxInvestment: null,
      eligibility: 'Families (women优先)',
    },
    'wage-earner-bond': {
      name: 'Wage Earner Development Bond',
      tenure: '5 years',
      payout: 'On maturity',
      tiers: [
        { label: 'Up to ৳15 Lakh', maturityRate: 12.00 },
        { label: '৳15-30 Lakh', maturityRate: 10.50 },
        { label: '৳30-50 Lakh', maturityRate: 9.50 },
        { label: 'Above ৳50 Lakh', maturityRate: 9.00 },
      ],
      maxInvestment: null,
      eligibility: 'NRB / Expatriates only',
      highlighted: true,
    },
    'usd-premium-bond': {
      name: 'US Dollar Premium Bond',
      tenure: '3 years',
      payout: 'Periodic',
      currency: 'USD',
      tiers: [
        { label: 'Up to $100,000', yearlyRates: { 1: 6.50, 2: 7.00, 3: 7.50 } },
        { label: 'Above $100,000', yearlyRates: { 1: 6.00, 2: 6.50, 3: 7.00 } },
      ],
      maxInvestment: null,
      eligibility: 'NRB / Expatriates only',
      highlighted: true,
    },
    'usd-investment-bond': {
      name: 'US Dollar Investment Bond',
      tenure: '3 years',
      payout: 'On maturity',
      currency: 'USD',
      tiers: [
        { label: 'Up to $25,000', yearlyRates: { 1: 5.50, 2: 6.00, 3: 6.50 } },
        { label: 'Above $25,000', yearlyRates: { 1: 5.00, 2: 5.50, 3: 6.00 } },
      ],
      maxInvestment: null,
      eligibility: 'NRB / Expatriates only',
    },
    'post-office-savings': {
      name: 'Post Office Savings Bank – General Account',
      tenure: 'Ongoing',
      payout: 'Annual',
      tiers: [
        { label: 'All amounts', flatRate: 7.50 },
      ],
      maxInvestment: null,
      eligibility: 'All citizens',
    },
  },
};

async function main() {
  try {
    console.log('Fetching savings rates...');

    // Try to fetch from IRD website
    let rates = HARDCODED_RATES;
    let fetchedFromWeb = false;

    try {
      const html = await fetch('https://www.bb.org.bd/en/index.php/investfacility/sanchayapatra');
      // If we get a valid response, try to parse new rates
      // For now, fall back to hardcoded since parsing is complex
      // TODO: Add rate parsing logic if IRD provides structured data
    } catch (e) {
      console.warn('Could not fetch savings page, using hardcoded rates:', e.message);
    }

    const savingsData = {
      fetchedAt: new Date().toISOString(),
      source: fetchedFromWeb ? 'IRD Website' : rates.source,
      effectiveDate: rates.effectiveDate,
      nextReview: rates.nextReview,
      schemes: rates.schemes,
      note: 'Rates are set by government notification and reviewed every 6 months. '
        + 'Hardcoded rates are updated manually when government announces changes.',
    };

    // Load existing data to preserve history
    const historyPath = path.join(DATA_DIR, 'savings-history.json');
    let history = [];
    if (fs.existsSync(historyPath)) {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    }

    // Add current snapshot to history if date changed
    const lastEntry = history[history.length - 1];
    if (!lastEntry || lastEntry.effectiveDate !== rates.effectiveDate) {
      history.push({
        effectiveDate: rates.effectiveDate,
        schemes: rates.schemes,
      });
      fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
    }

    fs.writeFileSync(path.join(DATA_DIR, 'savings-rates.json'), JSON.stringify(savingsData, null, 2));
    console.log(`Savings rates saved: ${Object.keys(rates.schemes).length} schemes, effective ${rates.effectiveDate}`);
  } catch (err) {
    console.error('Error fetching savings data:', err.message);
    process.exit(1);
  }
}

main();
