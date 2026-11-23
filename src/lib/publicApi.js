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

/** { photo } on success, or { error: 'wrong_postal' | 'too_many' | 'no_postal' | 'no_photo' | 'not_found' }. */
export const getDeliveryPhoto = (code, eventId, postal) =>
  rpc('delivery_photo', { p_code: code, p_event_id: eventId, p_postal: postal });

/** Saves the receiver's delivery instruction and returns the saved values or an error code. */
export async function saveDeliveryInstruction(code, instruction, note = '') {
  const data = await rpc('save_delivery_instruction', { p_code: code, p_instruction: instruction, p_note: note });
  const messages = {
    not_found: 'This shipment could not be found.',
    shipment_closed: 'Delivery instructions can no longer be changed for this shipment.',
    invalid_instruction: 'Please select a valid delivery instruction.',
    invalid_note: 'Please add delivery details (up to 500 characters) for Other.',
  };
  if (data?.error) throw new Error(messages[data.error] || 'Could not save delivery instructions. Please try again.');
  return data;
}

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
