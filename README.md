# 🇧🇩 BD Invest Tracker

**Free, live Bangladesh investment data dashboard for NRB expats.**

**Live site**: [arizawan.github.io/bd-invest-tracker](https://arizawan.github.io/bd-invest-tracker/)

Live data: stock prices, exchange rates, savings certificate (Sanchayapatra) rates — updated daily, 100% free to host and run.

## Architecture

```
┌─────────────────┐     ┌──────────────────────────┐     ┌──────────────┐
│  GitHub Actions  │────▶│  data/*.json              │────▶│ GitHub Pages │
│  (daily cron)    │     │  → copied to docs/data/   │     │  (serves     │
│  fetches data    │     │    for Pages access        │     │   /docs/)    │
└─────────────────┘     └──────────────────────────┘     └──────────────┘
     FREE                      FREE                           FREE
```

**Zero cost. Zero servers. Zero dependencies.**

- **GitHub Pages** — Free static hosting (serves `/docs` folder)
- **GitHub Actions** — Free daily cron (~30 min/month, free: 2000 min)
- **Vanilla HTML/CSS/JS** — No build tools, no frameworks, no npm install
- **Data flow**: Actions fetch data → copy to `docs/data/` → Pages serves it

## 🤖 AI / LLM Readability

This site is designed to be fully readable by LLMs and AI agents:

| Resource | URL | Purpose |
|----------|-----|---------|
| **llms.txt** | [/llms.txt](https://arizawan.github.io/bd-invest-tracker/llms.txt) | Concise AI agent instructions (emerging standard) |
| **llms-full.txt** | [/llms-full.txt](https://arizawan.github.io/bd-invest-tracker/llms-full.txt) | Full markdown data reference |
| **OpenAPI spec** | [/.well-known/openapi.json](https://arizawan.github.io/bd-invest-tracker/.well-known/openapi.json) | Machine-readable API specification |
| **AI Plugin** | [/.well-known/ai-plugin.json](https://arizawan.github.io/bd-invest-tracker/.well-known/ai-plugin.json) | OpenAI plugin manifest |

### JSON Data Endpoints (No Auth, No CORS Issues)

| Endpoint | Description |
|----------|-------------|
| [/data/dse.json](https://arizawan.github.io/bd-invest-tracker/data/dse.json) | DSE stock prices (276 companies), indices, market summary |
| [/data/bb-rates.json](https://arizawan.github.io/bd-invest-tracker/data/bb-rates.json) | USD/BDT + 11-currency cross rates, call money rate |
| [/data/savings-rates.json](https://arizawan.github.io/bd-invest-tracker/data/savings-rates.json) | Sanchayapatra rates (8 government schemes) |
| [/data/bank-rates.json](https://arizawan.github.io/bd-invest-tracker/data/bank-rates.json) | Bank FDR/DPS rates (10 banks) |
| [/data/last-updated.json](https://arizawan.github.io/bd-invest-tracker/data/last-updated.json) | Data freshness timestamp |

### SEO & Structured Data

- **JSON-LD schemas**: WebApplication, Dataset, FAQPage (8 questions), BreadcrumbList, FinancialProduct ItemList
- **Semantic HTML**: `<section>`, `<time>`, `<nav>`, `aria-label`, `role` attributes
- **Data attributes**: `data-metric`, `data-currency`, `data-field` on key elements
- **Meta tags**: Open Graph, Twitter Cards, AI-specific (`ai-site-type`, `ai-data-format`)
- **robots.txt**: Explicitly allows all major AI crawlers (GPTBot, CCBot, ClaudeBot, etc.)

## Data Sources

| Source | Data | URL |
|---|---|---|
| Dhaka Stock Exchange | Stock prices, indices | [dsebd.org](https://www.dsebd.org) |
| Bangladesh Bank | FX rates, money market | [bb.org.bd](https://www.bb.org.bd) |
| IRD / National Savings | Sanchayapatra rates | [ird.gov.bd](https://ird.gov.bd) |
| 10 Major Banks | FDR & DPS rates | Individual bank websites |

## Setup (5 minutes)

### 1. Fork this repo

### 2. Enable GitHub Pages
- Go to Settings → Pages
- Source: Deploy from branch
- Branch: `main`, Folder: `/docs`
- Save

### 3. Enable GitHub Actions
- Go to Actions tab
- Enable workflows
- The `fetch-data.yml` will run daily at 9:30 AM UTC (3:30 PM BST)

### 4. Manual first run
- Go to Actions → "Fetch Investment Data"
- Click "Run workflow"

Your site will be live at `https://yourusername.github.io/bd-invest-tracker/`

### Alternative: Deploy to Vercel or Cloudflare Pages

```bash
# Vercel (automatic deploys from GitHub)
npm i -g vercel && vercel --prod

# Cloudflare Pages (connect GitHub repo in dashboard)
# Set build output directory to: docs
# No build command needed
```

## Local Development

```bash
# No install needed — just use a local server
python3 -m http.server 8000 --directory docs
# Open http://localhost:8000

# Or run the fetcher manually
node scripts/fetch-all.js
```

## Project Structure

```
bd-invest-tracker/
├── .github/workflows/
│   └── fetch-data.yml        # Daily cron: fetch + copy to docs/data/
├── scripts/
│   ├── fetch-dse.js          # DSE stock data (ticker regex + Dygraph parser)
│   ├── fetch-bb.js           # Bangladesh Bank rates (USD/BDT + 11 currencies)
│   ├── fetch-savings.js      # Sanchayapatra rates (8 schemes, hardcoded)
│   ├── fetch-banks.js        # Bank FDR/DPS rates (10 banks, hardcoded)
│   └── fetch-all.js          # Master runner
├── data/                     # Source of truth (auto-updated by Actions)
│   ├── dse.json
│   ├── bb-rates.json
│   ├── savings-rates.json
│   ├── bank-rates.json
│   └── last-updated.json
├── docs/                     # GitHub Pages serves this folder
│   ├── data/                 # ← Auto-copied from /data by Actions
│   ├── .well-known/
│   │   ├── ai-plugin.json    # OpenAI plugin manifest
│   │   └── openapi.json      # OpenAPI 3.0 spec for JSON endpoints
│   ├── index.html            # Dashboard (semantic HTML, JSON-LD, ARIA)
│   ├── styles.css            # Dark Magic UI theme
│   ├── app.js                # Frontend logic (reads ./data/*.json)
│   ├── llms.txt              # AI agent instructions
│   ├── llms-full.txt         # Full data in markdown
│   ├── sitemap.xml           # All pages + JSON endpoints
│   └── robots.txt            # Allows all crawlers including AI bots
└── README.md
```

## Updating Rates

### Sanchayapatra Rates
Government-set, reviewed every ~6 months. When rates change:
1. Edit `scripts/fetch-savings.js`
2. Update the `HARDCODED_RATES` object with new rates
3. Commit and push

### Bank FDR/DPS Rates
Updated monthly. When rates change:
1. Edit `scripts/fetch-banks.js`
2. Update the relevant bank entries
3. Commit and push

## Adding New Data Sources

1. Create `scripts/fetch-<source>.js`
2. Output JSON to `data/<source>.json`
3. Add to `scripts/fetch-all.js`
4. Add rendering logic in `docs/app.js`
5. Add endpoint to `docs/sitemap.xml` and `docs/.well-known/openapi.json`
6. Update `docs/llms.txt` with new endpoint description

## Cost Analysis

| Component | Monthly Cost |
|---|---|
| GitHub Pages | $0 (free tier) |
| GitHub Actions | $0 (~30 min/month, free: 2000 min) |
| Data sources | $0 (public websites) |
| Domain | $0 (username.github.io) or ~$10/yr custom |
| **Total** | **$0/month** |

## License

MIT — Use, modify, share freely.
