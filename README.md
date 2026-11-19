# Fordon Systems — B2B IT Hub & Portfolio

Static front-end (HTML5, CSS3, Vanilla JS) — no build step, no runtime dependencies.
Works on GitHub Pages / Cloudflare Pages, both on a custom domain and in a sub-directory (all paths are relative).

## Structure

```
index.html              Home: hero, trust bar, hex grid, about, contact + lead wizard
software.html           Pillar: Software & Applications (+ product modules block)
infrastruktura.html     Pillar: IT Infrastructure
bazy-danych.html        Pillar: Data & SQL
integracje.html         Pillar: Integrations & Automation
audyty.html             Pillar: Audits & Optimisation
kontakt.html            Consulting & contact + lead wizard (?pillar=..., ?channel=...)
stats.html              Internal stats view (noindex, not linked in navigation)
css/style.css           Design system & layout
js/config.js            APP_CONFIG — the only file to edit for deployment settings
js/app.js               Components, tracking, lead form, stats
assets/                 favicon.svg, michal-zielinski.jpg (add the photo here)
.nojekyll               Disables Jekyll on GitHub Pages
CNAME.example           Rename to CNAME when a custom domain is configured
```

## Configuration (`js/config.js`)

| Key | Purpose |
| --- | --- |
| `mode` | `"static"` (Phase 1, no backend) or `"api"` (Phase 2) |
| `apiBaseUrl` | Phase 2 backend origin, e.g. `https://api.fordonsystems.pl` |
| `socialLinks.linkedin / facebook` | Social URLs (Facebook placeholder renders as inactive until replaced) |
| `contact.email / teamsUrl / phone` | Contact data used across all pages |
| `company.nip / regon` | Shown in the footer once filled in |
| `privacyPolicyUrl` | Link displayed next to the RODO consent checkbox |
| `metaPixel.enabled / pixelId` | Meta Pixel (requires a cookie-consent mechanism) |
| `analytics.*` | Own-traffic exclusion (localhost, hosts, DNT/GPC, `?notrack=1`) |

Pillar ids for pre-filling the form: `software`, `infra`, `sql`, `integration`, `audit`, `consulting`
(e.g. `kontakt.html?pillar=sql#formularz`).

## Phase 2 — switching to the API

1. Set `mode: "api"` and `apiBaseUrl` in `js/config.js`.
2. Add the API origin to `connect-src` in the CSP `<meta>` tag of **every** HTML page.
3. Backend endpoints (CORS for the site origin, JSON):
   - `POST /api/leads` — lead payload (see `collectPayload` in `js/app.js`); validate server-side, send CAPI `Lead` with `event_id = leadId`.
   - `POST /api/analytics/visit` — page view; also accept `text/plain` bodies (sendBeacon fallback).
   - `GET /api/analytics/summary` — protected (bearer token / Cloudflare Access); response shape documented in `js/app.js` (section 8).

## Local preview

```
python -m http.server 8080
```

Localhost traffic is excluded from analytics by default (`analytics.excludeLocalhost`).
