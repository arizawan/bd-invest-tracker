/**
 * BD Invest Tracker — Frontend app
 * Loads JSON data files and renders dashboard
 */
(function () {
  'use strict';

  // Data is copied to docs/data/ by GitHub Actions
  const DATA_PATH = './data/';

  // ── Helpers ──
  function fmt(n, decimals = 2) {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function fmtInt(n) {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toLocaleString('en-US');
  }

  function changeClass(val) {
    if (val > 0) return 'change-pos';
    if (val < 0) return 'change-neg';
    return '';
  }

  function changeText(val) {
    if (val == null) return '—';
    const prefix = val > 0 ? '+' : '';
    return `${prefix}${fmt(val)}`;
  }

  async function loadJSON(file) {
    try {
      const res = await fetch(`${DATA_PATH}${file}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn(`Failed to load ${file}:`, e.message);
      return null;
    }
  }

  // ── Render: Last Updated ──
  function renderTimestamp(meta) {
    const el = document.getElementById('last-updated');
    if (!meta) { el.textContent = '⚠️ Data unavailable'; return; }
    const d = new Date(meta.lastFetch);
    el.innerHTML = `Updated: ${d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}<br>${d.toLocaleTimeString('en-US')} UTC`;
  }

  // ── Render: Market Overview ──
  function renderOverview(bbData, dseData) {
    // FX Rate
    if (bbData?.exchangeRate?.USD_BDT) {
      const fx = bbData.exchangeRate.USD_BDT;
      document.getElementById('fx-rate').textContent = fmt(fx.am || fx.pm);
      document.getElementById('fx-date').textContent = fx.date || '';
    }

    // DSEX
    if (dseData?.indices) {
      const idx = dseData.indices;
      document.getElementById('dsex-value').textContent = fmt(idx.DSEX || idx.DS30, 0);
      if (dseData.summary) {
        const adv = dseData.summary.advanced || 0;
        const dec = dseData.summary.declined || 0;
        document.getElementById('dsex-change').textContent = `${adv} up / ${dec} down`;
      }
    }

    // Call rate
    if (bbData?.moneyMarket?.callMoneyRate) {
      document.getElementById('call-rate').textContent = bbData.moneyMarket.callMoneyRate + '%';
    }

    // Market stats
    if (dseData?.summary) {
      document.getElementById('total-trades').textContent = fmtInt(dseData.summary.totalTrade);
      document.getElementById('total-volume').textContent = fmtInt(dseData.summary.totalVolume);
      document.getElementById('total-value').textContent = fmt(dseData.summary.totalValueMn, 1);
      document.getElementById('advanced').textContent = dseData.summary.advanced || '—';
      document.getElementById('declined').textContent = dseData.summary.declined || '—';
      document.getElementById('unchanged').textContent = dseData.summary.unchanged || '—';
    }
  }

  // ── Render: FX History ──
  function renderFXHistory(bbData) {
    const tbody = document.getElementById('fx-history-body');
    if (!bbData?.exchangeRate?.history?.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="loading">No data available</td></tr>';
      return;
    }

    tbody.innerHTML = bbData.exchangeRate.history.map(r => `
      <tr>
        <td>${r.date || '—'}</td>
        <td>${r.am != null ? fmt(r.am, 4) : '—'}</td>
        <td>${r.pm != null ? fmt(r.pm, 4) : '—'}</td>
      </tr>
    `).join('');
  }

  // ── Render: Savings Rates ──
  function renderSavings(savingsData) {
    if (!savingsData?.schemes) return;

    document.getElementById('savings-date').textContent = savingsData.effectiveDate || '—';
    document.getElementById('savings-review').textContent = savingsData.nextReview || '—';

    const tbody = document.getElementById('savings-body');
    const schemes = Object.values(savingsData.schemes);

    tbody.innerHTML = schemes.map(s => {
      const bestRate = getBestRate(s);
      const isNRB = s.eligibility?.includes('NRB') || s.eligibility?.includes('Expatriate');
      return `
        <tr class="${isNRB ? 'highlight-row' : ''}">
          <td><strong>${s.name}</strong>${s.highlighted ? ' ⭐' : ''}${s.currency ? ` (${s.currency})` : ''}</td>
          <td>${s.tenure}</td>
          <td>${s.payout}</td>
          <td class="rate-good">${bestRate}</td>
          <td>${s.eligibility}</td>
        </tr>
      `;
    }).join('');

    // Detailed view
    const detailDiv = document.getElementById('savings-detail');
    detailDiv.innerHTML = schemes.map(s => {
      const isNRB = s.eligibility?.includes('NRB') || s.eligibility?.includes('Expatriate');
      return `
        <div class="scheme-card ${isNRB ? 'nrb' : ''}">
          <h4>${s.name} ${isNRB ? '⭐ NRB' : ''}</h4>
          <p>Tenure: ${s.tenure} · Payout: ${s.payout} · Eligibility: ${s.eligibility}</p>
          ${s.tiers.map(t => renderTierTable(t, s)).join('')}
        </div>
      `;
    }).join('');
  }

  function getBestRate(scheme) {
    let best = 0;
    for (const tier of scheme.tiers) {
      if (tier.yearlyRates) {
        const vals = Object.values(tier.yearlyRates);
        best = Math.max(best, ...vals);
      }
      if (tier.maturityRate) best = Math.max(best, tier.maturityRate);
      if (tier.flatRate) best = Math.max(best, tier.flatRate);
    }
    return best > 0 ? best.toFixed(2) + '%' : '—';
  }

  function renderTierTable(tier, scheme) {
    if (tier.flatRate) {
      return `<p>${tier.label}: <strong>${tier.flatRate}%</strong></p>`;
    }
    if (tier.maturityRate) {
      return `<p>${tier.label}: <strong>Maturity: ${tier.maturityRate}%</strong></p>`;
    }
    if (tier.yearlyRates) {
      const rows = Object.entries(tier.yearlyRates).map(([yr, rate]) =>
        `<tr><td>Year ${yr}</td><td style="text-align:right;font-weight:600">${rate}%</td></tr>`
      ).join('');
      return `
        <p style="font-size:0.8rem;color:#6b7280;margin:4px 0">${tier.label}</p>
        <table class="tier-table"><tbody>${rows}</tbody></table>
      `;
    }
    return '';
  }

  // ── Render: Stocks ──
  function renderStocks(dseData) {
    const tbody = document.getElementById('stocks-body');
    if (!dseData?.topStocks?.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="loading">No stock data available</td></tr>';
      return;
    }

    tbody.innerHTML = dseData.topStocks.map(s => `
      <tr>
        <td>${s.rank}</td>
        <td><strong>${s.code}</strong></td>
        <td>${fmt(s.ltp)}</td>
        <td>${fmt(s.high)}</td>
        <td>${fmt(s.low)}</td>
        <td class="${changeClass(s.change)}">${changeText(s.change)}</td>
      </tr>
    `).join('');
  }

  // ── Main ──
  async function init() {
    const [meta, bbData, dseData, savingsData] = await Promise.all([
      loadJSON('last-updated.json'),
      loadJSON('bb-rates.json'),
      loadJSON('dse.json'),
      loadJSON('savings-rates.json'),
    ]);

    renderTimestamp(meta);
    renderOverview(bbData, dseData);
    renderFXHistory(bbData);
    renderSavings(savingsData);
    renderStocks(dseData);
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
