/* All dashboard reads and writes go through here (Supabase, protected by RLS). */
import { supabase } from '../lib/supabase.js';

function friendlyError(error) {
  const msg = error?.message || 'Something went wrong.';
  if (error?.code === '23505' && msg.includes('tracking_number')) return new Error('Another shipment already uses this tracking number.');
  if (error?.code === '23514' && msg.includes('tracking_number')) {
    return new Error('The tracking number may only use letters, numbers and dashes (4–40 characters).');
  }
  if (error?.code === '23514') return new Error('Some details are missing or invalid. Please check the required fields.');
  if (error?.code === 'PGRST116') return new Error('Not found, or you no longer have access.');
  if (/JWT|not authenticated|invalid claim/i.test(msg)) return new Error('Your session has expired. Please sign in again.');
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return new Error('Cannot reach the database. Check your internet connection.');
  return new Error(msg);
}

const must = ({ data, error }) => {
  if (error) throw friendlyError(error);
  return data;
};

const numOrNull = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

/* ---------------- shipments ---------------- */
export const fromRow = (r) => ({
  id: r.id,
  trackingNumber: r.tracking_number,
  invoiceNumber: r.invoice_number,
  status: r.status,
  origin: r.origin,
  destination: r.destination,
  originLat: numOrNull(r.origin_lat),
  originLng: numOrNull(r.origin_lng),
  destLat: numOrNull(r.dest_lat),
  destLng: numOrNull(r.dest_lng),
  routePolyline: r.route_polyline,
  routeDistanceKm: numOrNull(r.route_distance_km),
  freightType: r.freight_type,
  service: r.service,
  weight: r.weight,
  dimensions: r.dimensions,
  estimatedDelivery: r.estimated_delivery,
  departureAt: r.departure_at,
  speedKmh: numOrNull(r.speed_kmh),
  progressKm: numOrNull(r.progress_km),
  progressAt: r.progress_at,
  sender: r.sender || {},
  receiver: r.receiver || {},
  notes: r.notes || '',
  invoice: r.invoice || {},
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  events: (r.shipment_events || [])
    .map((e) => ({ id: e.id, date: e.date, status: e.status, location: e.location, note: e.note, createdAt: e.created_at }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
});

// progress_km / progress_at are deliberately absent: the database maintains them
const toRow = (s) => ({
  tracking_number: s.trackingNumber || '',
  status: s.status,
  origin: s.origin.trim(),
  destination: s.destination.trim(),
  origin_lat: numOrNull(s.originLat),
  origin_lng: numOrNull(s.originLng),
  dest_lat: numOrNull(s.destLat),
  dest_lng: numOrNull(s.destLng),
  route_polyline: s.routePolyline || null,
  route_distance_km: numOrNull(s.routeDistanceKm),
  freight_type: s.freightType,
  service: s.service || '',
  weight: s.weight || '',
  dimensions: s.dimensions || '',
  estimated_delivery: s.estimatedDelivery || null,
  departure_at: s.departureAt || null,
  speed_kmh: numOrNull(s.speedKmh) || 60,
  sender: s.sender || {},
  receiver: s.receiver || {},
  notes: s.notes || '',
  invoice: s.invoice || {},
});

export async function listShipments() {
  return must(await supabase.from('shipments').select('*').order('updated_at', { ascending: false })).map(fromRow);
}

export async function getShipment(id) {
  return fromRow(must(await supabase.from('shipments').select('*, shipment_events(*)').eq('id', id).single()));
}

export async function createShipment(s) {
  const row = must(await supabase.from('shipments').insert(toRow(s)).select('id').single());
  return getShipment(row.id);
}

export async function updateShipment(id, s) {
  must(await supabase.from('shipments').update(toRow(s)).eq('id', id).select('id').single());
  return getShipment(id);
}

export async function deleteShipment(id) {
  must(await supabase.from('shipments').delete().eq('id', id));
}

export async function addEvent(shipmentId, event) {
  must(
    await supabase.from('shipment_events').insert({
      shipment_id: shipmentId,
      status: event.status,
      location: event.location || '',
      note: event.note || '',
      date: event.date,
    })
  );
  return getShipment(shipmentId);
}

export async function deleteEvent(shipmentId, eventId) {
  must(await supabase.from('shipment_events').delete().eq('id', eventId));
  return getShipment(shipmentId);
}

/* ---------------- overview ---------------- */
const STATUSES = ['Pending', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'On Hold', 'Cancelled'];

export async function getStats() {
  const [shipments, quotes, subscribers] = await Promise.all([
    supabase.from('shipments').select('id, tracking_number, status, origin, destination, updated_at').order('updated_at', { ascending: false }),
    supabase.from('quotes').select('id, name, email, origin, destination, status, created_at').order('created_at', { ascending: false }),
    supabase.from('subscribers').select('id', { count: 'exact', head: true }),
  ]);
  const ships = must(shipments);
  const qs = must(quotes);
  if (subscribers.error) throw friendlyError(subscribers.error);

  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  ships.forEach((s) => (byStatus[s.status] = (byStatus[s.status] || 0) + 1));
  return {
    totals: {
      shipments: ships.length,
      active: byStatus['Picked Up'] + byStatus['In Transit'] + byStatus['Out for Delivery'],
      delivered: byStatus.Delivered,
      quotes: qs.length,
      newQuotes: qs.filter((q) => q.status === 'new').length,
      subscribers: subscribers.count || 0,
    },
    byStatus,
    recentShipments: ships.slice(0, 6).map((r) => ({
      id: r.id,
      trackingNumber: r.tracking_number,
      status: r.status,
      origin: r.origin,
      destination: r.destination,
      updatedAt: r.updated_at,
    })),
    recentQuotes: qs.slice(0, 5).map(quoteFromRow),
  };
}

/* ---------------- quotes / subscribers ---------------- */
const quoteFromRow = (r) => ({
  id: r.id,
  name: r.name,
  email: r.email,
  phone: r.phone,
  dimensions: r.dimensions,
  freightType: r.freight_type,
  incoterms: r.incoterms,
  origin: r.origin,
  destination: r.destination,
  service: r.service,
  status: r.status,
  createdAt: r.created_at,
});

export async function listQuotes() {
  return must(await supabase.from('quotes').select('*').order('created_at', { ascending: false })).map(quoteFromRow);
}

export async function setQuoteStatus(id, status) {
  must(await supabase.from('quotes').update({ status, updated_at: new Date().toISOString() }).eq('id', id));
}

export async function deleteQuote(id) {
  must(await supabase.from('quotes').delete().eq('id', id));
}

export async function listSubscribers() {
  return must(await supabase.from('subscribers').select('*').order('created_at', { ascending: false })).map((r) => ({
    id: r.id,
    email: r.email,
    createdAt: r.created_at,
  }));
}

export async function deleteSubscriber(id) {
  must(await supabase.from('subscribers').delete().eq('id', id));
}

/* ---------------- settings / admins ---------------- */
let settingsCache = null;

/** The settings row (snake_case, as stored). Cached for the session. */
export async function getSettings({ fresh = false } = {}) {
  if (!settingsCache || fresh) {
    settingsCache = must(await supabase.from('settings').select('*').eq('id', 1).single());
  }
  return settingsCache;
}

export async function saveSettings(fields) {
  settingsCache = must(
    await supabase
      .from('settings')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select('*')
      .single()
  );
  return settingsCache;
}

export async function listAdmins() {
  return must(await supabase.from('admins').select('*').order('created_at', { ascending: true }));
}

export async function grantAdmin(email) {
  return must(await supabase.rpc('grant_admin', { p_email: email }));
}

export async function removeAdmin(userId) {
  must(await supabase.from('admins').delete().eq('user_id', userId));
}

/** Confirms the current password, then sets a new one. */
export async function changePassword(email, currentPassword, newPassword) {
  const check = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (check.error) throw new Error('Your current password is incorrect.');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw friendlyError(error);
}
