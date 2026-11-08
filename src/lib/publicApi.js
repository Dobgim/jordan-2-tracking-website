import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

/*
 * The website's only doors into the database: SECURITY DEFINER functions that
 * return or accept exactly what a visitor may see or send.
 */
async function rpc(fn, args) {
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });
  } catch {
    throw new Error('We could not reach our server. Please check your connection and try again.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || 'Something went wrong. Please try again.');
  return data;
}

/** Shipment for a tracking number, or null when unknown. */
export const trackShipment = (code) => rpc('track_shipment', { p_code: code });

export const submitQuote = (quote) => rpc('submit_quote', { p: quote });

/** Resolves to 'subscribed' or 'exists'. */
export const subscribe = (email) => rpc('subscribe', { p_email: email });

let settingsPromise = null;
/** Map key + public contact details, fetched once per page load. */
export function getPublicSettings() {
  settingsPromise ??= rpc('get_public_settings', {}).catch((err) => {
    settingsPromise = null;
    throw err;
  });
  return settingsPromise;
}
