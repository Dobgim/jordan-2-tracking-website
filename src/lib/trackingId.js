/*
 * Tracking numbers look like  TJ-2026-K7QX4M9  — brand prefix, year, and seven
 * characters from an alphabet without look-alikes (no 0/O, 1/I/L), so a
 * customer can read one out over the phone without mistakes. 32^7 ≈ 34 billion
 * combinations per year; the database trigger generates the same format when
 * a shipment is saved without one (supabase/migrations/*_tracking_ids.sql).
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateTrackingId(date = new Date()) {
  const bytes = new Uint32Array(7);
  crypto.getRandomValues(bytes);
  let code = '';
  for (const b of bytes) code += ALPHABET[b % ALPHABET.length];
  return `TJ-${date.getFullYear()}-${code}`;
}
