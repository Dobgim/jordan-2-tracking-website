/*
 * Package movement - mirrors public.covered_km() in the database.
 *
 * The database stores a checkpoint (progress_km at progress_at). While the
 * status is "In Transit" or "Out for Delivery" the package advances at
 * speed_kmh from that checkpoint; any other status holds it in place. Status
 * changes re-checkpoint in the database, so the distance covered never jumps.
 */
export const MOVING_STATUSES = ['In Transit', 'Out for Delivery'];

// realistic average speeds including stops, km/h
export const DEFAULT_SPEEDS = {
  'Truck Freight': 60,
  'Train Freight': 80,
  'Ship Freight': 30,
  'Plane Freight': 750,
};

export const LAND_FREIGHT = ['Truck Freight', 'Train Freight'];

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

export const isMoving = (status) => MOVING_STATUSES.includes(status);

/** Kilometres covered at `nowMs`, capped at the route length. */
export function coveredKm(s, totalKm, nowMs) {
  let km = num(s.progressKm) || 0;
  if (isMoving(s.status)) {
    const since = nowMs - Date.parse(s.progressAt);
    if (since > 0) km += ((num(s.speedKmh) || 0) * since) / 3.6e6;
  }
  if (s.status === 'Delivered' && totalKm) km = totalKm;
  return totalKm ? Math.min(km, totalKm) : km;
}

/** What the package is doing right now, for labels. */
export function movementState(s, covered, totalKm, nowMs) {
  if (s.status === 'Delivered') return { key: 'delivered', label: 'Delivered' };
  if (s.status === 'Cancelled') return { key: 'stopped', label: 'Cancelled — stopped' };
  if (s.status === 'On Hold') return { key: 'paused', label: 'On hold — position held' };
  if (isMoving(s.status)) {
    const departs = Date.parse(s.progressAt);
    if (departs > nowMs) return { key: 'waiting', label: `Departs ${formatWhen(departs)}` };
    if (totalKm && covered >= totalKm) return { key: 'arriving', label: 'Arriving at destination' };
    return { key: 'moving', label: 'On the move' };
  }
  return { key: 'waiting', label: covered > 0 ? 'Stopped' : 'Waiting at origin' };
}

/** Estimated arrival (ms epoch) at the current speed, or null when not moving. */
export function arrivalMs(s, covered, totalKm, nowMs) {
  const speed = num(s.speedKmh);
  if (!totalKm || !speed || !isMoving(s.status)) return null;
  const start = Math.max(nowMs, Date.parse(s.progressAt));
  return start + ((totalKm - covered) / speed) * 3.6e6;
}

export function formatKm(km) {
  if (km === null || km === undefined || Number.isNaN(km)) return '—';
  return km < 10 ? `${km.toFixed(2)} km` : `${Math.round(km).toLocaleString()} km`;
}

export function formatWhen(ms) {
  return new Date(ms).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(ms) {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h ${minutes % 60} min`;
  return `${Math.floor(hours / 24)} d ${hours % 24} h`;
}
