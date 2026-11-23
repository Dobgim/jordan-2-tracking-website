// Emails the sender and the receiver when a shipment is created or its status
// changes, and notifies the company when a receiver saves delivery instructions.
// Called by the database trigger in
// supabase/migrations/20261110000400_email_notifications.sql.
//
// Secrets (Supabase -> Edge Functions -> Secrets):
//   NOTIFY_WEBHOOK_SECRET  shared with the trigger (private.app_secrets)
//   SMTP_HOST              e.g. mail.thejordanslogistics.com
//   SMTP_PORT              465 (SSL)
//   SMTP_USER              support@thejordanslogistics.com
//   SMTP_PASS              the mailbox password
//   SMTP_FROM              optional, defaults to SMTP_USER
//
// The dashboard also calls it ("Resend failed emails") with the admin login token
// and { type: "resend", shipment_id } to retry failed shipment and instruction emails.
import nodemailer from 'npm:nodemailer@6.9.16';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const env = (k: string) => Deno.env.get(k) ?? '';
const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const STATUS_TEXT: Record<string, string> = {
  'Label Created': 'has a shipping label and is waiting to be handed over to us.',
  'Facility Received': 'has arrived at our facility and is being prepared for departure.',
  'In Transit': 'is on its way to the destination.',
  'Out for Delivery': 'is out for delivery and will arrive soon.',
  Delivered: 'has been delivered.',
  Delayed: 'is delayed. We are working to get it moving again and will update you shortly.',
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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

/** True when the request carries the login token of a dashboard admin. */
async function isAdminRequest(req: Request) {
  const auth = req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return false;
  const asUser = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    auth: { persistSession: false },
    global: { headers: { Authorization: auth } },
  });
  const { data, error } = await asUser.rpc('is_admin');
  return !error && data === true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const { type, shipment_id } = await req.json().catch(() => ({}));
  const secret = env('NOTIFY_WEBHOOK_SECRET');
  const fromTrigger = !!secret && req.headers.get('x-webhook-secret') === secret;
  const resend = type === 'resend';
  if (!(fromTrigger || (resend && (await isAdminRequest(req))))) return reply({ error: 'forbidden' }, 403);
  if (!shipment_id) return reply({ error: 'missing shipment' }, 400);

  // give the dashboard a moment to save the tracking events that go with the change
  if (!resend) await new Promise((r) => setTimeout(r, 4000));

  const [{ data: s }, { data: co }, { data: ev }, { data: past }] = await Promise.all([
    db.from('shipments').select('*').eq('id', shipment_id).maybeSingle(),
    db.from('settings').select('*').eq('id', 1).maybeSingle(),
    db.from('shipment_events').select('location, note').eq('shipment_id', shipment_id).order('date', { ascending: false }).order('created_at', { ascending: false }).limit(1),
    resend
      ? db.from('email_log').select('id, recipient, kind, ok, created_at').eq('shipment_id', shipment_id).order('created_at', { ascending: true })
      : Promise.resolve({ data: [] as any[] }),
  ]);
  if (!s) return reply({ error: 'shipment not found' }, 404);
  const company = co ?? {};
  const site = String(company.company_website || 'https://thejordanslogistics.com').replace(/\/+$/, '');
  const trackUrl = `${site.startsWith('http') ? site : 'https://' + site}/track?code=${encodeURIComponent(s.tracking_number)}`;
  const latest = ev?.[0] ?? null;

  const recipients = (['sender', 'receiver'] as const)
    .map((role) => ({ role, email: String(s[role]?.email || '').trim(), name: String(s[role]?.name || '') }))
    .filter((r) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email));
  // same address for both parties: one email
  let unique = recipients.filter((r, i) => recipients.findIndex((x) => x.email.toLowerCase() === r.email.toLowerCase()) === i);

  // Resend: only people whose most recent email failed. Anyone who never received
  // the "shipment created" email gets that one (it shows the current status too);
  // everyone else gets an update with the current status.
  const history = (email: string) =>
    (past ?? []).filter(
      (p: any) => String(p.recipient).toLowerCase() === email.toLowerCase() && ['created', 'status'].includes(p.kind)
    );
  const instructionHistory = (past ?? []).filter((p: any) => p.kind === 'delivery_instruction');
  const latestInstruction = instructionHistory[instructionHistory.length - 1];
  const resendInstruction = resend && !!latestInstruction && !latestInstruction.ok;
  if (resend) {
    unique = unique.filter((r) => {
      const h = history(r.email);
      return h.length > 0 && !h[h.length - 1].ok;
    });
    if (!unique.length && !resendInstruction) return reply({ sent: 0, failed: 0, reason: 'nothing to resend' });
  }
  const kindFor = (email: string): 'created' | 'status' => {
    if (!resend) return type === 'created' ? 'created' : 'status';
    return history(email).some((p: any) => p.kind === 'created' && p.ok) ? 'status' : 'created';
  };
  const subjectFor = (kind: string) =>
    kind === 'created'
      ? `Shipment ${s.tracking_number} created — ${s.origin} to ${s.destination}`
      : kind === 'delivery_instruction'
        ? `Delivery instruction for shipment ${s.tracking_number}`
        : `Shipment ${s.tracking_number} is now ${s.status}`;

  const log = (to: string, kind: string, ok: boolean, error = '') =>
    db.from('email_log').insert({ shipment_id, recipient: to, subject: subjectFor(kind), kind, ok, error: error.slice(0, 500) });

  const instructionRecipient = String(company.company_email || env('SMTP_USER') || 'Company inbox not configured').trim();
  if (!env('SMTP_HOST') || !env('SMTP_USER') || !env('SMTP_PASS')) {
    const reason = 'Email is not configured yet (SMTP secrets missing).';
    if (!resend) await Promise.all(unique.map((r) => log(r.email, kindFor(r.email), false, reason)));
    if (type === 'delivery_instruction') {
      await log(instructionRecipient, 'delivery_instruction', false, reason);
    }
    return reply({
      sent: 0,
      failed: unique.length + (type === 'delivery_instruction' || resendInstruction ? 1 : 0),
      error: reason,
    });
  }

  const port = Number(env('SMTP_PORT') || 465);
  const transport = nodemailer.createTransport({
    host: env('SMTP_HOST'),
    port,
    secure: port === 465,
    auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') },
  });
  const from = `"${String(company.company_name || 'TheJordans Logistics').replace(/"/g, '')}" <${env('SMTP_FROM') || env('SMTP_USER')}>`;
  const instructionSubject = subjectFor('delivery_instruction');
  const sendInstructionNotice = async () => {
    try {
      await transport.sendMail({
        from,
        to: instructionRecipient,
        replyTo: company.company_email || undefined,
        subject: instructionSubject,
        html: `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#11194e">
          <h2>Delivery instruction received</h2>
          <p>The receiver selected a delivery instruction for shipment <strong>${esc(s.tracking_number)}</strong>.</p>
          <p><strong>Instruction:</strong> ${esc(s.delivery_instruction || '—')}</p>
          ${s.delivery_instruction_note ? `<p><strong>Details:</strong> ${esc(s.delivery_instruction_note)}</p>` : ''}
          <p><strong>Shipment status:</strong> ${esc(s.status)}</p>
          <p><a href="${esc(trackUrl)}">View shipment tracking</a></p>
        </body></html>`,
        text: `${instructionSubject}\n\nInstruction: ${s.delivery_instruction || '—'}${s.delivery_instruction_note ? `\nDetails: ${s.delivery_instruction_note}` : ''}\n\n${trackUrl}`,
      });
      if (resendInstruction) {
        await db.from('email_log').delete().eq('shipment_id', shipment_id).eq('kind', 'delivery_instruction').eq('ok', false);
      } else {
        await log(instructionRecipient, 'delivery_instruction', true);
      }
      return true;
    } catch (err) {
      const message = String((err as Error)?.message || err);
      if (!resendInstruction) await log(instructionRecipient, 'delivery_instruction', false, message);
      return false;
    }
  };

  if (type === 'delivery_instruction') {
    const sent = await sendInstructionNotice();
    return reply({ sent: sent ? 1 : 0, failed: sent ? 0 : 1 });
  }

  let sent = 0;
  let lastError = '';
  for (const r of unique) {
    const kind = kindFor(r.email);
    const created = kind === 'created';
    const subject = subjectFor(kind);
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
      if (resend) {
        // the earlier failed attempts are covered by this email
        const failedIds = history(r.email).filter((p: any) => !p.ok).map((p: any) => p.id);
        if (failedIds.length) await db.from('email_log').delete().in('id', failedIds);
      }
      await log(r.email, kind, true);
    } catch (err) {
      lastError = String((err as Error)?.message || err);
      // a failed resend leaves the existing failed entries in place
      if (!resend) await log(r.email, kind, false, lastError);
    }
  }
  const instructionSent = resendInstruction ? await sendInstructionNotice() : false;
  if (resendInstruction && !instructionSent) lastError = lastError || 'Could not send the delivery instruction email.';
  return reply({
    sent: sent + (instructionSent ? 1 : 0),
    failed: unique.length - sent + (resendInstruction && !instructionSent ? 1 : 0),
    error: lastError || undefined,
  });
});
