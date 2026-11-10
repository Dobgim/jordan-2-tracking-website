// Emails the sender and the receiver when a shipment is created or its status
// changes. Called by the database trigger in
// supabase/migrations/20261110000400_email_notifications.sql.
//
// Secrets (Supabase -> Edge Functions -> Secrets):
//   NOTIFY_WEBHOOK_SECRET  shared with the trigger (private.app_secrets)
//   SMTP_HOST              e.g. mail.thejordanslogistics.com
//   SMTP_PORT              465 (SSL)
//   SMTP_USER              support@thejordanslogistics.com
//   SMTP_PASS              the mailbox password
//   SMTP_FROM              optional, defaults to SMTP_USER
import nodemailer from 'npm:nodemailer@6.9.16';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const env = (k: string) => Deno.env.get(k) ?? '';
const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const STATUS_TEXT: Record<string, string> = {
  Pending: 'has been registered and is waiting to be picked up.',
  'Picked Up': 'has been picked up and is being prepared for departure.',
  'In Transit': 'is on its way to the destination.',
  'Out for Delivery': 'is out for delivery and will arrive soon.',
  Delivered: 'has been delivered.',
  'On Hold': 'is temporarily on hold. Our team will update you shortly.',
  Cancelled: 'has been cancelled. Contact us if you have any questions.',
};

function fmtDate(v?: string | null) {
  if (!v) return '';
  const d = new Date(v.length === 10 ? v + 'T00:00:00Z' : v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function emailHtml(o: {
  heading: string;
  intro: string;
  s: Record<string, any>;
  role: 'sender' | 'receiver';
  name: string;
  trackUrl: string;
  latest?: { location?: string; note?: string } | null;
  co: Record<string, any>;
}) {
  const { s, co } = o;
  const rows = [
    ['Tracking number', s.tracking_number],
    ['Status', s.status],
    ['From', s.origin],
    ['To', s.destination],
    [o.role === 'sender' ? 'Receiver' : 'Sender', (o.role === 'sender' ? s.receiver?.name : s.sender?.name) || ''],
    ['Freight', s.freight_type],
    ['Weight', s.weight],
    ['Expected delivery', [fmtDate(s.estimated_delivery), s.estimated_delivery_time].filter(Boolean).join(', ')],
    ['Latest update', [o.latest?.location, o.latest?.note].filter(Boolean).join(' — ')],
  ].filter(([, v]) => v);
  const contact = [co.company_phone, co.company_email].filter(Boolean).map(esc).join(' &nbsp;·&nbsp; ');
  return `<!doctype html><html><body style="margin:0;background:#f3f3f6;font-family:Arial,Helvetica,sans-serif;color:#11194e">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#11194e;padding:22px 28px;color:#fff">
  <div style="font-size:18px;font-weight:bold">${esc(co.company_name || 'TheJordans Logistics & Freight')}</div>
  <div style="font-size:13px;color:#c9cbe0;margin-top:2px">Shipment notification</div>
</td></tr>
<tr><td style="height:4px;background:#fe000b"></td></tr>
<tr><td style="padding:28px">
  <h1 style="margin:0 0 12px;font-size:21px">${esc(o.heading)}</h1>
  <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#3b4060">Hello ${esc(o.name || 'there')},<br>${o.intro}</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px">
  ${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:9px 0;border-bottom:1px solid #eeeff3;color:#6b7090;width:42%">${esc(k)}</td><td style="padding:9px 0;border-bottom:1px solid #eeeff3;font-weight:bold">${esc(v)}</td></tr>`
    )
    .join('')}
  </table>
  <p style="margin:24px 0 8px;text-align:center"><a href="${esc(o.trackUrl)}" style="display:inline-block;background:#fe000b;color:#fff;text-decoration:none;font-weight:bold;padding:13px 26px;border-radius:8px;font-size:15px">Track your shipment live</a></p>
  <p style="margin:0;text-align:center;font-size:12px;color:#8a8fa6">See it move on the map and download your invoice.</p>
</td></tr>
<tr><td style="background:#f7f7fa;padding:16px 28px;font-size:12px;line-height:1.6;color:#6b7090">
  ${co.company_address ? esc(co.company_address) + '<br>' : ''}${contact}
</td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== env('NOTIFY_WEBHOOK_SECRET') || !env('NOTIFY_WEBHOOK_SECRET')) {
    return new Response('forbidden', { status: 403 });
  }
  const { type, shipment_id } = await req.json().catch(() => ({}));
  if (!shipment_id) return new Response('missing shipment', { status: 400 });

  // give the dashboard a moment to save the tracking events that go with the change
  await new Promise((r) => setTimeout(r, 4000));

  const [{ data: s }, { data: co }, { data: ev }] = await Promise.all([
    db.from('shipments').select('*').eq('id', shipment_id).maybeSingle(),
    db.from('settings').select('*').eq('id', 1).maybeSingle(),
    db.from('shipment_events').select('location, note').eq('shipment_id', shipment_id).order('date', { ascending: false }).order('created_at', { ascending: false }).limit(1),
  ]);
  if (!s) return new Response('shipment not found', { status: 404 });
  const company = co ?? {};
  const site = String(company.company_website || 'https://thejordanslogistics.com').replace(/\/+$/, '');
  const trackUrl = `${site.startsWith('http') ? site : 'https://' + site}/track?code=${encodeURIComponent(s.tracking_number)}`;
  const latest = ev?.[0] ?? null;

  const recipients = (['sender', 'receiver'] as const)
    .map((role) => ({ role, email: String(s[role]?.email || '').trim(), name: String(s[role]?.name || '') }))
    .filter((r) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email));
  // same address for both parties: one email
  const unique = recipients.filter((r, i) => recipients.findIndex((x) => x.email.toLowerCase() === r.email.toLowerCase()) === i);

  const created = type === 'created';
  const subject = created
    ? `Shipment ${s.tracking_number} created — ${s.origin} to ${s.destination}`
    : `Shipment ${s.tracking_number} is now ${s.status}`;

  const log = (to: string, ok: boolean, error = '') =>
    db.from('email_log').insert({ shipment_id, recipient: to, subject, kind: created ? 'created' : 'status', ok, error: error.slice(0, 500) });

  if (!env('SMTP_HOST') || !env('SMTP_USER') || !env('SMTP_PASS')) {
    await Promise.all(unique.map((r) => log(r.email, false, 'Email is not configured yet (SMTP secrets missing).')));
    return Response.json({ sent: 0, reason: 'smtp not configured' });
  }

  const port = Number(env('SMTP_PORT') || 465);
  const transport = nodemailer.createTransport({
    host: env('SMTP_HOST'),
    port,
    secure: port === 465,
    auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') },
  });
  const from = `"${String(company.company_name || 'TheJordans Logistics').replace(/"/g, '')}" <${env('SMTP_FROM') || env('SMTP_USER')}>`;

  let sent = 0;
  for (const r of unique) {
    const intro = created
      ? `A new shipment ${r.role === 'sender' ? 'you are sending' : 'addressed to you'} has been created. Your tracking number is <strong>${esc(s.tracking_number)}</strong>.`
      : `Your shipment <strong>${esc(s.tracking_number)}</strong> ${esc(STATUS_TEXT[s.status] || `is now ${s.status}.`)}`;
    try {
      await transport.sendMail({
        from,
        to: r.email,
        replyTo: company.company_email || undefined,
        subject,
        html: emailHtml({ heading: created ? 'Your shipment has been created' : `Status update: ${s.status}`, intro, s, role: r.role, name: r.name, trackUrl, latest, co: company }),
        text: `${subject}\n\nTrack it live: ${trackUrl}`,
      });
      sent++;
      await log(r.email, true);
    } catch (err) {
      await log(r.email, false, String((err as Error)?.message || err));
    }
  }
  return Response.json({ sent });
});
