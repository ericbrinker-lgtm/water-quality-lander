# Water quality lander — project documentation

Last updated: 2026-04-02

## What this is

A single-page marketing landing page for 4Patriots. A visitor enters their zip code and gets a personalized water quality report based on real EPA drinking water violation data. The page is designed to create urgency about local water quality, then drive a click to a 4Patriots product page.

The live flow is: hero page with zip code form → loading spinner with rotating status messages → results page with violation counts, charts, contaminant list, plain-English commentary, and a CTA button.

## Who built it

Eric Brinker (eric.brinker@4patriots.com), Director of Advertising, Channel Strategy & Innovation at 4Patriots. Built with Claude (Anthropic) in April 2026.

## File structure

```
Water Quality API/
├── public/
│   └── index.html            # The entire landing page (HTML + CSS + JS in one file)
├── api/
│   ├── water-systems.js      # Vercel serverless function: proxies EPA water system lookups
│   └── violations.js         # Vercel serverless function: proxies EPA violation lookups
├── server.js                 # Local dev server (Express, reuses the api/ functions)
├── vercel.json               # Vercel deployment config
├── package.json              # Dependencies (just Express for local dev)
├── .gitignore
└── PROJECT.md                # This file
```

## How it works

### Data source

The page uses the EPA Envirofacts Data Service API. This is a free, public, unauthenticated REST API run by the US Environmental Protection Agency. It exposes data from the Safe Drinking Water Information System (SDWIS).

Two endpoints are used:

1. **Water systems by zip code:** `https://data.epa.gov/efservice/WATER_SYSTEM/ZIP_CODE/{zip}/JSON`
   Returns all public water systems serving a given zip code. Each record includes a PWSID (public water system ID), population served, and system metadata.

2. **Violations by water system:** `https://data.epa.gov/efservice/VIOLATION/PWSID/{pwsid}/IS_HEALTH_BASED_IND/Y/JSON`
   Returns all health-based violations for a given water system. The `IS_HEALTH_BASED_IND/Y` filter limits results to violations that exceeded a health-based standard (MCL, MRDL, or treatment technique), excluding paperwork-only violations.

API docs: https://www.epa.gov/enviro/envirofacts-data-service-api

### Why there's a proxy server

The EPA API does not set CORS headers, which means browsers block direct JavaScript calls to it. The `api/` folder contains two small proxy functions that sit between the browser and the EPA. The browser calls our proxy; our proxy calls the EPA and returns the data.

On Vercel, these run as serverless functions automatically. For local development, `server.js` serves the same functions through Express.

### Lookup flow (what happens when a user enters a zip code)

1. The browser calls `/api/water-systems?zip=37067`
2. The proxy fetches all public water systems for that zip from the EPA
3. The browser extracts the unique PWSIDs (water system IDs) from the response
4. The browser calls `/api/violations?pwsid={id}` for up to 5 water systems in parallel
5. All violations are combined and the results page is rendered client-side

### Caching

Both serverless functions set a `Cache-Control` header: `s-maxage=86400, stale-while-revalidate=3600`. This tells Vercel's CDN to cache each unique API response for 24 hours. After the cache expires, the next request serves stale data instantly while refreshing in the background.

This means the EPA only gets hit once per unique zip code per day, no matter how many visitors look up that zip. Errors (502s) are not cached.

### Ad tracking parameter pass-through

The page captures all query parameters from the incoming URL and appends them to the CTA link. This means if someone lands on `yoursite.com?utm_source=facebook&utm_campaign=water&fbclid=abc123`, the CTA button will point to `https://go.4patriots.com/ofc-flash-sale/?utm_source=facebook&utm_campaign=water&fbclid=abc123`.

This works for any parameters — UTMs, fbclid, gclid, ttclid, or custom ad platform params. Nothing is filtered or stripped.

The logic is in the `buildCtaUrl()` and `applyCtaParams()` functions near the top of the `<script>` block in `index.html`.

### CTA destination

The CTA button points to: `https://go.4patriots.com/ofc-flash-sale/`

To change this, edit the `CTA_BASE` constant near the top of the `<script>` block in `public/index.html`.

### Results page content

The results page includes:

- **Alert banner** — red if violations found, green if none (with a caveat that no violations doesn't mean clean water)
- **4 stat cards** — total violations, contaminants flagged, water systems, population served
- **Bar chart** — violations over time by year (only shown if data spans multiple years). Uses Chart.js 4.4.1 via CDN.
- **Doughnut chart** — violations by category (MCL exceeded, treatment technique, etc.)
- **Contaminant list** — top 8 most-cited contaminants, ranked by violation count
- **Commentary section** — plain-English interpretation that escalates in urgency based on violation count (0, 1-5, 6-20, 21+). Always ends with a reminder that the EPA only tracks what's reported.
- **CTA section** — "Protect your family's drinking water" with button

### Contaminant name mapping

The EPA API returns contaminant codes (like "1040"), not human-readable names. The `formatContaminant()` function in `index.html` maps common codes to names (e.g., 1040 → Arsenic, 1041 → Lead). If a code isn't in the map, it displays as "Contaminant #1040". The map covers the most common drinking water contaminants but is not exhaustive. To add more, edit the map object in that function.

### Commentary tone

The commentary is designed with marketing urgency in mind. It's tuned for a survival/preparedness audience. Even the "zero violations" case includes language about unregulated chemicals and standards not keeping pace with science. The `buildCommentary()` function in `index.html` controls this.

## How to run locally

```bash
cd "Water Quality API"
npm install
npm start
```

Then open http://localhost:3000. Enter a zip code (try 37067, 90210, 75001 for different results).

`server.js` is only used for local development. It is not used in the Vercel deployment.

## How to deploy to Vercel

The project is currently deployed via Vercel from a GitHub repo.

**GitHub repo:** https://github.com/ericbrinker-lgtm/water-quality-lander

**To deploy changes:**

```bash
git add .
git commit -m "Description of changes"
git push
```

Vercel auto-deploys on every push to `main`. The site updates within about 30 seconds.

**First-time Vercel setup (if starting fresh):**

1. Create a Vercel account at vercel.com (sign in with GitHub)
2. Click "Add New Project" → import the GitHub repo
3. Leave all settings as default → click Deploy
4. Vercel will give you a `.vercel.app` URL

**Custom domain:** Can be added in Vercel dashboard → project Settings → Domains. Add a CNAME record in your DNS provider pointing to `cname.vercel-dns.com`.

## Known limitations and future improvements

### EPA API reliability
The EPA API is free and has no SLA. It doesn't publish rate limits but also doesn't guarantee uptime. The 24-hour CDN caching mitigates this significantly, but the very first lookup for any given zip code is vulnerable to EPA downtime.

### No email capture
The current prototype collects zip code only. A future version could add an email field to capture leads before showing results.

### Missing polish for production
Before running significant paid traffic, consider adding:
- Favicon
- Open Graph meta tags (for social sharing previews / link unfurls)
- Google Analytics or tracking pixel (Meta, Google, etc.)
- Error monitoring (Vercel analytics or a logging webhook)

### Contaminant code coverage
The `formatContaminant()` map covers common codes but not all. Uncommon contaminants will display as "Contaminant #XXXX". The map can be expanded by referencing the EPA's contaminant code list.

### No lead form integration
There's no CRM or email platform integration. If email capture is added, it would need a backend endpoint or integration with something like Klaviyo, HubSpot, etc.

## EPA API reference

- Main docs: https://www.epa.gov/enviro/envirofacts-data-service-api
- API v1 docs: https://www.epa.gov/enviro/envirofacts-data-service-api-v1
- Interactive API viewer: https://enviro.epa.gov/envirofacts/metadata/api-viewer
- SDWIS data model: https://www.epa.gov/enviro/sdwis-model
- No API key required. No authentication. No published rate limits.
- Requests must complete within 15 minutes. Max 10,000 rows per response (paginate with `/rows/start:end`).

## Key decisions and why

| Decision | Why |
|---|---|
| Vercel over GCP/AWS | Simplest deploy path for a single-page lander. Auto-scaling, free tier, CDN caching built in. |
| Serverless proxy over direct API calls | EPA doesn't set CORS headers. Browser can't call it directly. |
| CDN caching over database caching | Zero additional infrastructure. Vercel's edge cache handles it natively via headers. |
| Single HTML file | Keeps the prototype simple. All CSS and JS are inline. Easy to iterate. |
| Health-based violations only | Filters out monitoring/reporting violations that don't indicate actual contamination. Makes the data more meaningful and alarming. |
| Chart.js via CDN | Lightweight charting with no build step. Loaded from Cloudflare CDN. |
