/**
 * BD Invest Tracker — Frontend app
 * Loads JSON data files and renders dashboard
 */
(function () {
  'use strict';

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
    if (bbData?.exchangeRate?.USD_BDT) {
      const fx = bbData.exchangeRate.USD_BDT;
      document.getElementById('fx-rate').textContent = fmt(fx.am || fx.pm);
      document.getElementById('fx-date').textContent = fx.date || '';
    }

    if (dseData?.indices) {
      const idx = dseData.indices;
      document.getElementById('dsex-value').textContent = fmt(idx.DSEX || idx.DS30, 0);
      if (dseData.summary) {
        const adv = dseData.summary.advanced || 0;
        const dec = dseData.summary.declined || 0;
        document.getElementById('dsex-change').textContent = `${adv} up / ${dec} down`;
      }
    }

    if (bbData?.moneyMarket?.callMoneyRate) {
      document.getElementById('call-rate').textContent = bbData.moneyMarket.callMoneyRate + '%';
    }

    if (dseData?.summary) {
      document.getElementById('total-trades').textContent = fmtInt(dseData.summary.totalTrade);
      document.getElementById('total-volume').textContent = fmtInt(dseData.summary.totalVolume);
      document.getElementById('total-value').textContent = fmt(dseData.summary.totalValueMn, 1);
      document.getElementById('advanced').textContent = dseData.summary.advanced || '—';
      document.getElementById('declined').textContent = dseData.summary.declined || '—';
      document.getElementById('unchanged').textContent = dseData.summary.unchanged || '—';
    }
  }

  // ── Render: Cross Rates ──
  function renderCrossRates(bbData) {
    const tbody = document.getElementById('cross-rates-body');
    if (!bbData?.crossRates || Object.keys(bbData.crossRates).length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="loading">No cross rate data available</td></tr>';
      return;
    }

    const currencyNames = {
      USD: '🇺🇸 US Dollar', EUR: '🇪🇺 Euro', GBP: '🇬🇧 British Pound',
      AUD: '🇦🇺 Australian Dollar', JPY: '🇯🇵 Japanese Yen', CAD: '🇨🇦 Canadian Dollar',
      SEK: '🇸🇪 Swedish Krona', SGD: '🇸🇬 Singapore Dollar',
      CNH: '🇨🇳 Chinese Yuan', INR: '🇮🇳 Indian Rupee', LKR: '🇱🇰 Sri Lankan Rupee',
      THB: '🇹🇭 Thai Baht', MYR: '🇲🇾 Malaysian Ringgit', SAR: '🇸🇦 Saudi Riyal',
      AED: '🇦🇪 UAE Dirham', BHD: '🇧🇭 Bahraini Dinar', KWD: '🇰🇼 Kuwaiti Dinar',
    };

    // USD first, then alphabetical
    const ccys = Object.keys(bbData.crossRates).sort((a, b) => {
      if (a === 'USD') return -1;
      if (b === 'USD') return 1;
      return a.localeCompare(b);
    });

    document.getElementById('cross-rate-date').textContent = new Date(bbData.fetchedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    tbody.innerHTML = ccys.map(ccy => {
      const r = bbData.crossRates[ccy];
      const name = currencyNames[ccy] || ccy;
      const mid = ((r.bid + r.ask) / 2);
      // For JPY, INR, LKR, SEK show "1 BDT = X units" format
      const isSmall = mid < 5;
      return `<tr>
        <td><strong>${name}</strong></td>
        <td>${fmt(r.bid, 4)}</td>
        <td>${fmt(r.ask, 4)}</td>
        <td>${isSmall ? fmt(1 / mid, 2) + ' ' + ccy : fmt(mid, 2) + ' BDT'}</td>
      </tr>`;
    }).join('');
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

  // ── Render: Bank FDR Rates ──
  function renderFDR(bankData) {
    const tbody = document.getElementById('fdr-body');
    if (!bankData?.banks) {
      tbody.innerHTML = '<tr><td colspan="8" class="loading">No bank data available</td></tr>';
      return;
    }

    document.getElementById('bank-verified-date').textContent = bankData.lastVerified || '—';

    const tenures = ['3_months', '6_months', '12_months', '24_months', '36_months'];

    const banks = Object.entries(bankData.banks).sort((a, b) => {
      const a12 = a[1].fdr?.['12_months']?.regular || 0;
      const b12 = b[1].fdr?.['12_months']?.regular || 0;
      return b12 - a12;
    });

    tbody.innerHTML = banks.map(([name, bank]) => {
      const cells = tenures.map(t => {
        const rate = bank.fdr?.[t]?.regular;
        return rate ? `<td class="rate-cell">${rate.toFixed(2)}%</td>` : '<td>—</td>';
      });

      const nrbCell = bank.nrb?.specialFDR
        ? `<td class="rate-high">✓ ${bank.nrb.nrbFdrRate}%</td>`
        : '<td>—</td>';

      return `<tr>
        <td><strong>${name}</strong></td>
        <td>${bank.type}</td>
        ${cells.join('')}
        ${nrbCell}
      </tr>`;
    }).join('');
  }

  // ── Render: DPS Rates ──
  function renderDPS(bankData) {
    const tbody = document.getElementById('dps-body');
    if (!bankData?.banks) {
      tbody.innerHTML = '<tr><td colspan="5" class="loading">No bank data available</td></tr>';
      return;
    }

    const banks = Object.entries(bankData.banks)
      .filter(([_, b]) => b.dps)
      .sort((a, b) => (b[1].dps?.annualReturn || 0) - (a[1].dps?.annualReturn || 0));

    tbody.innerHTML = banks.map(([name, bank]) => {
      const d = bank.dps;
      return `<tr>
        <td><strong>${name}</strong></td>
        <td class="rate-good">${d.annualReturn.toFixed(2)}%</td>
        <td>৳${fmtInt(d.minMonthly)}</td>
        <td>৳${fmtInt(d.maxMonthly)}</td>
        <td>${d.tenure}</td>
      </tr>`;
    }).join('');
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
    if (tier.flatRate) return `<p>${tier.label}: <strong>${tier.flatRate}%</strong></p>`;
    if (tier.maturityRate) return `<p>${tier.label}: <strong>Maturity: ${tier.maturityRate}%</strong></p>`;
    if (tier.yearlyRates) {
      const rows = Object.entries(tier.yearlyRates).map(([yr, rate]) =>
        `<tr><td>Year ${yr}</td><td style="text-align:right;font-weight:600">${rate}%</td></tr>`
      ).join('');
      return `<p style="font-size:0.8rem;color:#6b7280;margin:4px 0">${tier.label}</p><table class="tier-table"><tbody>${rows}</tbody></table>`;
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

    tbody.innerHTML = dseData.topStocks.slice(0, 30).map((s, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${s.code}</strong></td>
        <td>${fmt(s.ltp)}</td>
        <td>${s.direction === 'up' ? '↑' : s.direction === 'down' ? '↓' : '—'}</td>
        <td class="${changeClass(s.change)}">${changeText(s.change)}</td>
        <td class="${changeClass(s.changePct)}">${s.changePct > 0 ? '+' : ''}${fmt(s.changePct)}%</td>
      </tr>
    `).join('');
  }

  // ── Render: Gainers & Losers ──
  function renderGainersLosers(dseData) {
    const gainersBody = document.getElementById('gainers-body');
    const losersBody = document.getElementById('losers-body');

    if (!dseData?.topStocks?.length) {
      gainersBody.innerHTML = '<tr><td colspan="3" class="loading">—</td></tr>';
      losersBody.innerHTML = '<tr><td colspan="3" class="loading">—</td></tr>';
      return;
    }

    const allStocks = dseData.topStocks;
    const gainers = [...allStocks].filter(s => s.changePct > 0).sort((a, b) => b.changePct - a.changePct).slice(0, 10);
    const losers = [...allStocks].filter(s => s.changePct < 0).sort((a, b) => a.changePct - b.changePct).slice(0, 10);

    gainersBody.innerHTML = gainers.map(s => `
      <tr>
        <td><strong>${s.code}</strong></td>
        <td>৳${fmt(s.ltp)}</td>
        <td class="change-pos">+${fmt(s.changePct)}%</td>
      </tr>
    `).join('');

    losersBody.innerHTML = losers.map(s => `
      <tr>
        <td><strong>${s.code}</strong></td>
        <td>৳${fmt(s.ltp)}</td>
        <td class="change-neg">${fmt(s.changePct)}%</td>
      </tr>
    `).join('');
  }

  // ── Main ──
  async function init() {
    const [meta, bbData, dseData, savingsData, bankData] = await Promise.all([
      loadJSON('last-updated.json'),
      loadJSON('bb-rates.json'),
      loadJSON('dse.json'),
      loadJSON('savings-rates.json'),
      loadJSON('bank-rates.json'),
    ]);

    renderTimestamp(meta);
    renderOverview(bbData, dseData);
    renderCrossRates(bbData);
    renderFXHistory(bbData);
    renderFDR(bankData);
    renderDPS(bankData);
    renderSavings(savingsData);
    renderStocks(dseData);
    renderGainersLosers(dseData);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
