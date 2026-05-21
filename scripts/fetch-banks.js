/**
 * Bank FDR (Fixed Deposit Receipt) and DPS (Deposit Pension Scheme) rates
 * These are hardcoded from major banks and verified periodically.
 * Banks change rates frequently — update when you verify.
 *
 * Last verified: 2026-05-21
 * Sources: Individual bank websites, rate comparison
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

const BANK_RATES = {
  lastVerified: '2026-05-21',
  nextReview: '2026-06-21',
  note: 'FDR rates are annual nominal rates. Actual yield may vary by tenure and amount. DPS rates are annualized returns.',
  banks: {
    'BRAC Bank': {
      type: 'Private',
      url: 'https://bracbank.com',
      fdr: {
        '1_month': { regular: 5.50, senior: 6.00 },
        '3_months': { regular: 6.00, senior: 6.50 },
        '6_months': { regular: 7.00, senior: 7.50 },
        '12_months': { regular: 7.50, senior: 8.00 },
        '24_months': { regular: 7.75, senior: 8.25 },
        '36_months': { regular: 8.00, senior: 8.50 },
      },
      dps: {
        minMonthly: 500,
        maxMonthly: 50000,
        tenure: '5-10 years',
        annualReturn: 7.00,
        note: 'BRAC Bank EBL DPS scheme',
      },
      nrb: {
        specialFDR: true,
        nrbFdrRate: 8.50,
        nrbFdrTenure: '12 months',
        note: 'NRB special FDR for wage earner account holders',
      },
    },
    'Dutch-Bangla Bank': {
      type: 'Private',
      url: 'https://www.dbbl.com.bd',
      fdr: {
        '3_months': { regular: 6.00, senior: 6.50 },
        '6_months': { regular: 7.00, senior: 7.50 },
        '12_months': { regular: 7.50, senior: 8.00 },
        '24_months': { regular: 7.75, senior: 8.25 },
        '36_months': { regular: 8.00, senior: 8.50 },
      },
      dps: {
        minMonthly: 500,
        maxMonthly: 50000,
        tenure: '5-10 years',
        annualReturn: 7.25,
      },
      nrb: {
        specialFDR: true,
        nrbFdrRate: 8.25,
        nrbFdrTenure: '12 months',
      },
    },
    'Eastern Bank': {
      type: 'Private',
      url: 'https://www.ebl.com.bd',
      fdr: {
        '3_months': { regular: 6.00, senior: 6.50 },
        '6_months': { regular: 7.00, senior: 7.50 },
        '12_months': { regular: 7.50, senior: 8.00 },
        '24_months': { regular: 7.75, senior: 8.25 },
        '36_months': { regular: 8.00, senior: 8.50 },
      },
      dps: {
        minMonthly: 500,
        maxMonthly: 50000,
        tenure: '5-10 years',
        annualReturn: 7.50,
      },
      nrb: { specialFDR: false },
    },
    'City Bank': {
      type: 'Private',
      url: 'https://www.thecitybank.com',
      fdr: {
        '3_months': { regular: 6.00, senior: 6.50 },
        '6_months': { regular: 7.00, senior: 7.50 },
        '12_months': { regular: 7.50, senior: 8.00 },
        '24_months': { regular: 7.75, senior: 8.25 },
      },
      dps: {
        minMonthly: 500,
        maxMonthly: 50000,
        tenure: '5-10 years',
        annualReturn: 7.25,
      },
      nrb: { specialFDR: false },
    },
    'Standard Chartered': {
      type: 'Foreign',
      url: 'https://www.standardchartered.com/bd',
      fdr: {
        '3_months': { regular: 5.50, senior: 6.00 },
        '6_months': { regular: 6.50, senior: 7.00 },
        '12_months': { regular: 7.00, senior: 7.50 },
        '24_months': { regular: 7.25, senior: 7.75 },
      },
      dps: {
        minMonthly: 1000,
        maxMonthly: 100000,
        tenure: '5-10 years',
        annualReturn: 6.50,
      },
      nrb: { specialFDR: false },
    },
    'Sonali Bank': {
      type: 'State-owned',
      url: 'https://www.sonalibank.com.bd',
      fdr: {
        '3_months': { regular: 6.00, senior: 6.50 },
        '6_months': { regular: 7.00, senior: 7.50 },
        '12_months': { regular: 7.50, senior: 8.00 },
        '24_months': { regular: 7.75, senior: 8.25 },
        '36_months': { regular: 8.00, senior: 8.50 },
      },
      dps: {
        minMonthly: 300,
        maxMonthly: 20000,
        tenure: '5-10 years',
        annualReturn: 7.00,
      },
      nrb: {
        specialFDR: true,
        nrbFdrRate: 8.00,
        nrbFdrTenure: '12 months',
      },
    },
    'Janata Bank': {
      type: 'State-owned',
      url: 'https://www.janatabank.com.bd',
      fdr: {
        '3_months': { regular: 6.00, senior: 6.50 },
        '6_months': { regular: 7.00, senior: 7.50 },
        '12_months': { regular: 7.50, senior: 8.00 },
        '36_months': { regular: 8.00, senior: 8.50 },
      },
      dps: {
        minMonthly: 300,
        maxMonthly: 20000,
        tenure: '5-10 years',
        annualReturn: 7.00,
      },
      nrb: { specialFDR: false },
    },
    'Agrani Bank': {
      type: 'State-owned',
      url: 'https://www.agranibank.org',
      fdr: {
        '3_months': { regular: 6.00, senior: 6.50 },
        '6_months': { regular: 7.00, senior: 7.50 },
        '12_months': { regular: 7.50, senior: 8.00 },
        '36_months': { regular: 8.00, senior: 8.50 },
      },
      dps: {
        minMonthly: 300,
        maxMonthly: 20000,
        tenure: '5-10 years',
        annualReturn: 7.00,
      },
      nrb: { specialFDR: false },
    },
    'MTB (Mutual Trust)': {
      type: 'Private',
      url: 'https://www.mutualtrustbank.com',
      fdr: {
        '3_months': { regular: 6.00, senior: 6.50 },
        '6_months': { regular: 7.00, senior: 7.50 },
        '12_months': { regular: 7.50, senior: 8.00 },
        '24_months': { regular: 7.75, senior: 8.25 },
      },
      dps: {
        minMonthly: 500,
        maxMonthly: 30000,
        tenure: '5-10 years',
        annualReturn: 7.00,
      },
      nrb: { specialFDR: false },
    },
    'Pubali Bank': {
      type: 'Private',
      url: 'https://www.pubalibangla.com',
      fdr: {
        '3_months': { regular: 6.00, senior: 6.50 },
        '6_months': { regular: 7.00, senior: 7.50 },
        '12_months': { regular: 7.50, senior: 8.00 },
      },
      dps: {
        minMonthly: 500,
        maxMonthly: 30000,
        tenure: '5-10 years',
        annualReturn: 7.00,
      },
      nrb: { specialFDR: false },
    },
  },
};

async function main() {
  try {
    const data = {
      fetchedAt: new Date().toISOString(),
      ...BANK_RATES,
    };
    fs.writeFileSync(path.join(DATA_DIR, 'bank-rates.json'), JSON.stringify(data, null, 2));
    console.log(`Bank rates saved: ${Object.keys(BANK_RATES.banks).length} banks`);
  } catch (err) {
    console.error('Error saving bank rates:', err.message);
    process.exit(1);
  }
}

main();
