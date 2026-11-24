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
the website is primarily static files. Manual shipment reminders use a small
PHP endpoint on the hosting account to send through the company's SMTP mailbox.

**Shared hosting (Hostinger, cPanel, Namecheap…)**
1. Upload the **contents** of the `dist/` folder into `public_html/`
   (it includes `.htaccess`, which makes page URLs like `/track` and `/admin` work;
   show hidden files if you don't see it).
2. Open `https://your-domain/admin` and sign in.

**Vercel / Netlify** — import this folder; build command `npm run build`,
output `dist`. (`vercel.json` is included.) Manual email reminders require
PHP hosting and do not run on static-only hosting.

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

## Email notifications

When a shipment is created, and every time its status changes, the sender and
the receiver get an email (if their email addresses are filled in) with the
status, route and a "Track your shipment live" button. Each shipment's admin
page lists what was sent under **Email notifications**.

When a receiver saves delivery instructions on the tracking page, the current
instruction is saved with the shipment and the company email in Admin → Settings
is notified. Admins can see the saved instruction in the shipment record.
For shipments on hold, set **Amount due for clearance** in the admin shipment
form and set that shipment's **Invoice currency** using a 3-letter ISO 4217
code (XAF is unavailable); the tracking page shows the formatted amount and a
contact-support button.
The tracking page uses the clearance panel as its single shipment-specific
support panel and does not repeat the general support contacts or the generic
on-hold alert.
On an individual shipment's admin page, **Send status reminder** emails the
sender and receiver the latest shipment status and tracking link.

Automatic shipment emails and retries for failed automatic emails use the
`notify-shipment` Supabase Edge Function. Manual status reminders use
`public/api/send-reminder.php` and PHPMailer to send through the hosting SMTP
mailbox; the PHP endpoint checks the admin session and loads the shipment using
the signed-in admin's existing Supabase access, but Supabase does not send the
reminder email.

To enable hosting-sent reminders, copy `public/api/reminder-config.example.php`
to `/home/ACCOUNT/private/reminder-config.php` (outside `public_html`) and set
the correct SMTP host, port, mailbox username and password. Keep this private
file out of the website ZIP and source control. The hosting needs PHP with cURL
and OpenSSL enabled. The reminder endpoint is only accessible to signed-in
admins; it sends to the sender/receiver email addresses saved on that shipment.

Automatic email notifications still require the mailbox in cPanel → Email
Accounts, the SMTP secrets in Supabase → Edge Functions → Secrets, and the
`notify-shipment` Edge Function deployed to Supabase.
