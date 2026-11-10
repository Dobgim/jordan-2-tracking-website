# TheJordans — Logistics & Freight (React + Tailwind)

A clean React 18 + Tailwind CSS v4 rebuild of the TheJordans website, with a
live shipment-tracking page and the admin dashboard. Data lives in Supabase.

| URL | Page |
|---|---|
| `/` | Home |
| `/about` | About Us |
| `/services` | Services |
| `/news` and `/news/:slug` | News list and article pages |
| `/track?code=TJ-2026-K7QX4M9` | Tracking: status, live map, progress, history |
| `/contact` | Contact details, quote form, FAQ, office map |
| `/admin` | Admin dashboard (Supabase Auth login) |

Every page has its own URL (React Router); links switch pages without a reload.
The layout is responsive from 320px phones up to wide desktops.

## Going live on your own domain

Everything (shipments, tracking history, quotes, subscribers, settings, the
Google Maps key and the admin login) is stored in the cloud in Supabase, so
the website is just static files: no server or database to install.

**Shared hosting (Hostinger, cPanel, Namecheap…)**
1. Upload the **contents** of the `dist/` folder into `public_html/`
   (it includes `.htaccess`, which makes page URLs like `/track` and `/admin` work;
   show hidden files if you don't see it).
2. Open `https://your-domain/admin` and sign in.

**Vercel / Netlify** — import this folder; build command `npm run build`,
output `dist`. (`vercel.json` is included.)

**After going live**
- Admin → Settings: fill in the company name, phone, email and address
  (shown on invoices and the tracking page) and **change the admin password**.
- Google Cloud → Credentials: restrict the Maps API key to your domain.

## Rebuild after editing

```bash
npm install
npm run dev     # http://localhost:5290
npm run build   # production build in dist/
```

## Google Maps key

The live map uses the key saved in **Admin → Settings** (stored in the
database). `VITE_GOOGLE_MAPS_API_KEY` in `.env.local` is only an optional
fallback for development.

## Tracking numbers & movement

- Tracking numbers are generated automatically, e.g. `TJ-2026-K7QX4M9`.
- The package moves on the map only while it is **In Transit** or **Out for
  Delivery**: road 60 km/h, rail 80, sea 30, air 750 (editable per shipment).
- **On Hold** (or any other status) freezes it exactly where it is; the
  distance covered is never lost and never goes back to the origin.
- The tracking page shows a live percentage and distance covered, updating
  several times a second.

## Structure

- `src/data/site.jsx` — all text, links and images (edit content here)
- `src/sections/` — home page sections
- `src/components/` — header, footer, overlays, floating widgets, shared UI
- `src/pages/Pages.jsx` — Home, About, Services, News, Article, Contact, 404
- `src/pages/TrackPage.jsx` — the tracking page
- `src/lib/` — Supabase calls, map loader, package-movement maths
- `src/admin/` — admin dashboard (own entry `admin.html`, own stylesheet)
- `supabase/migrations/` — database schema
