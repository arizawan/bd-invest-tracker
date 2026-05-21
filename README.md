# 🇧🇩 BD Invest Tracker

**Free, live Bangladesh investment data dashboard for NRB expats.**

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

## Data Sources

| Source | Data | URL |
|---|---|---|
| Dhaka Stock Exchange | Stock prices, indices | dsebd.org |
| Bangladesh Bank | FX rates, money market | bb.org.bd |
| IRD / National Savings | Sanchayapatra rates | ird.gov.bd |

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
│   └── fetch-data.yml      # Daily cron: fetch + copy to docs/data/
├── scripts/
│   ├── fetch-dse.js        # DSE stock data
│   ├── fetch-bb.js         # Bangladesh Bank rates
│   ├── fetch-savings.js    # Sanchayapatra rates
│   └── fetch-all.js        # Master runner
├── data/                   # Source of truth (auto-updated by Actions)
│   ├── dse.json
│   ├── bb-rates.json
│   ├── savings-rates.json
│   └── last-updated.json
├── docs/                   # GitHub Pages serves this folder
│   ├── data/               # ← Auto-copied from /data by Actions
│   ├── index.html          # Dashboard
│   ├── styles.css          # Styles
│   └── app.js              # Frontend logic (reads ./data/*.json)
└── README.md
```

## Updating Sanchayapatra Rates

Savings rates are set by government notification and reviewed every ~6 months. When rates change:

1. Edit `scripts/fetch-savings.js`
2. Update the `HARDCODED_RATES` object with new rates
3. Commit and push
4. The next Actions run will use the new rates

## Adding New Data Sources

1. Create `scripts/fetch-<source>.js`
2. Output JSON to `data/<source>.json`
3. Add to `scripts/fetch-all.js`
4. Add rendering logic in `docs/app.js`

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
