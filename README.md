# TheJordans — Logistics & Freight (React + Tailwind)

A clean React 18 + Tailwind CSS v4 rebuild of the TheJordans website, with a
live shipment-tracking page and the admin dashboard. Data lives in Supabase.

| URL | Page |
|---|---|
| `/` | Home |
| `/about` | About Us |
| `/services` | Services |
| `/news` and `/news/:slug` | News list and article pages |
| `/track?code=TJ-240001` | Tracking: status, live map, progress, history |
| `/contact` | Contact details, quote form, FAQ, office map |
| `/admin` | Admin dashboard (Supabase Auth login) |

Every page has its own URL (React Router); links switch pages without a reload.
The layout is responsive from 320px phones up to wide desktops.

## Run locally

```bash
npm install
cp .env.example .env.local   # then paste your Google Maps key
npm run dev                  # http://localhost:5290
npm run build                # production build in dist/
```

## Google Maps key

The live map uses the key saved in **Admin → Settings**. If that is empty, it
falls back to `VITE_GOOGLE_MAPS_API_KEY` from `.env.local` (on Vercel: add it
under Project → Settings → Environment Variables). `.env.local` is git-ignored.
Restrict the key to your domains in Google Cloud → Credentials.

## Structure

- `src/data/site.jsx` — all text, links and images (edit content here)
- `src/sections/` — home page sections
- `src/components/` — header, footer, overlays, floating widgets, shared UI
- `src/pages/Pages.jsx` — Home, About, Services, News, Article, Contact, 404
- `src/pages/TrackPage.jsx` — the tracking page
- `src/lib/` — Supabase calls, map loader, package-movement maths
- `src/admin/` — admin dashboard (own entry `admin.html`, own stylesheet)
- `supabase/migrations/` — database schema
