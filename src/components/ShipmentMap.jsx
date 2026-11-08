import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../lib/googleMaps.js';
import {
  arrivalMs,
  coveredKm,
  formatDuration,
  formatKm,
  formatWhen,
  isMoving,
  movementState,
} from '../lib/tracking.js';
import './shipmentMap.css';

/*
 * Live map of a shipment: the route, the distance already covered, and the
 * package moving along it in real time (updated every second from the
 * database checkpoint - see lib/tracking.js). Shared by the website's
 * tracking pop-up and the admin dashboard.
 */

const VEHICLE_ICONS = {
  truck:
    '<path d="M2 6h11v9H2z"/><path d="M13 9h4l3 3.5V15h-7"/><circle cx="6" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/>',
  ship: '<path d="M3 14l1.6 4.2c.2.5.7.8 1.2.8h12.4c.5 0 1-.3 1.2-.8L21 14H3z"/><path d="M5 14V9h14v5"/><path d="M9 9V5h6v4"/>',
  plane:
    '<path d="M21 15.5v-2l-8-5V3.8a1.5 1.5 0 0 0-3 0v4.7l-8 5v2l8-2.5v4.3L8 18.7v1.8l3.5-1 3.5 1v-1.8L13 17.3V13z"/>',
  train:
    '<rect x="5" y="3" width="14" height="13" rx="3"/><path d="M5 10h14"/><circle cx="9" cy="13" r=".8"/><circle cx="15" cy="13" r=".8"/><path d="M8 20l2-4M16 20l-2-4"/>',
};
const VEHICLE_BY_FREIGHT = { 'Ship Freight': 'ship', 'Plane Freight': 'plane', 'Train Freight': 'train' };

const MAP_STYLE = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cfe0f3' }] },
];

const svgIcon = (google, svg, size) => ({
  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
  scaledSize: new google.maps.Size(size, size),
  anchor: new google.maps.Point(size / 2, size / 2),
});

const packageIcon = (google, kind) =>
  svgIcon(
    google,
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="21" fill="#FE000B" stroke="#fff" stroke-width="3"/>
      <g transform="translate(12 12)" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${VEHICLE_ICONS[kind]}</g>
    </svg>`,
    48
  );

const pointIcon = (google, color, letter) =>
  svgIcon(
    google,
    `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
      <circle cx="15" cy="15" r="12.5" fill="${color}" stroke="#fff" stroke-width="2.5"/>
      <text x="15" y="19.5" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#fff">${letter}</text>
    </svg>`,
    30
  );

function buildPath(google, s) {
  if (s.routePolyline) {
    const decoded = google.maps.geometry.encoding.decodePath(s.routePolyline);
    if (decoded.length > 1) return decoded;
  }
  // sea / air (or no road route): follow the great-circle line
  const a = new google.maps.LatLng(Number(s.originLat), Number(s.originLng));
  const b = new google.maps.LatLng(Number(s.destLat), Number(s.destLng));
  const points = [];
  for (let i = 0; i <= 160; i++) points.push(google.maps.geometry.spherical.interpolate(a, b, i / 160));
  return points;
}

/** Point `meters` along the path, plus the index of the vertex after it. */
function pointAlong(google, path, cumulative, meters) {
  const last = cumulative[cumulative.length - 1];
  if (meters <= 0) return { point: path[0], index: 1 };
  if (meters >= last) return { point: path[path.length - 1], index: path.length };
  let lo = 1;
  let hi = cumulative.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid] < meters) lo = mid + 1;
    else hi = mid;
  }
  const segStart = cumulative[lo - 1];
  const segLength = cumulative[lo] - segStart;
  const t = segLength ? (meters - segStart) / segLength : 0;
  return { point: google.maps.geometry.spherical.interpolate(path[lo - 1], path[lo], t), index: lo };
}

export default function ShipmentMap({ shipment, apiKey, clockOffsetMs = 0, height = 320 }) {
  const canvas = useRef(null);
  const mapRef = useRef(null);
  const live = useRef(shipment);
  const offset = useRef(clockOffsetMs);
  const followRef = useRef(false);
  live.current = shipment;
  offset.current = clockOffsetMs;

  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [follow, setFollow] = useState(false);
  followRef.current = follow;

  const hasCoords = [shipment.originLat, shipment.originLng, shipment.destLat, shipment.destLng].every(
    (v) => v !== null && v !== undefined && v !== ''
  );
  // the map is rebuilt only when the route itself changes; status/progress
  // updates flow through `live` without redrawing
  const routeKey = hasCoords
    ? [shipment.originLat, shipment.originLng, shipment.destLat, shipment.destLng, shipment.routePolyline || '', shipment.freightType].join('|')
    : '';

  useEffect(() => {
    if (!routeKey) return undefined;
    let cancelled = false;
    let timer = null;
    let overlays = [];
    setError('');
    setStats(null);

    const onAuthFailure = () => setError('Google Maps rejected the API key. Check it in Admin → Settings.');
    window.addEventListener('tj:maps-auth-failure', onAuthFailure);

    loadGoogleMaps(apiKey)
      .then((google) => {
        if (cancelled || !canvas.current) return;
        const s = live.current;
        const path = buildPath(google, s);
        const cumulative = [0];
        for (let i = 1; i < path.length; i++) {
          cumulative.push(cumulative[i - 1] + google.maps.geometry.spherical.computeDistanceBetween(path[i - 1], path[i]));
        }
        const pathMeters = cumulative[cumulative.length - 1];
        const geodesic = !s.routePolyline;

        const map = new google.maps.Map(canvas.current, {
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
          gestureHandling: 'cooperative',
          styles: MAP_STYLE,
        });
        mapRef.current = map;
        const bounds = new google.maps.LatLngBounds();
        path.forEach((p) => bounds.extend(p));
        map.fitBounds(bounds, 56);

        const remaining = new google.maps.Polyline({
          map,
          path,
          geodesic,
          strokeOpacity: 0,
          icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.85, strokeColor: '#7d8299', scale: 3 }, offset: '0', repeat: '13px' }],
        });
        const covered = new google.maps.Polyline({ map, path: [], geodesic, strokeColor: '#11194E', strokeOpacity: 1, strokeWeight: 5 });
        const start = new google.maps.Marker({ map, position: path[0], icon: pointIcon(google, '#11194E', 'A'), title: s.origin, zIndex: 2 });
        const end = new google.maps.Marker({ map, position: path[path.length - 1], icon: pointIcon(google, '#FE000B', 'B'), title: s.destination, zIndex: 2 });
        const pkg = new google.maps.Marker({
          map,
          position: path[0],
          icon: packageIcon(google, VEHICLE_BY_FREIGHT[s.freightType] || 'truck'),
          title: 'Your package',
          zIndex: 10,
        });
        overlays = [remaining, covered, start, end, pkg];

        const tick = () => {
          const cur = live.current;
          const now = Date.now() + offset.current;
          const routeKm = cur.routeDistanceKm !== null && cur.routeDistanceKm !== undefined ? Number(cur.routeDistanceKm) : pathMeters / 1000;
          const km = coveredKm(cur, routeKm, now);
          const fraction = routeKm ? km / routeKm : 0;
          const { point, index } = pointAlong(google, path, cumulative, fraction * pathMeters);
          pkg.setPosition(point);
          covered.setPath([...path.slice(0, index), point]);
          if (followRef.current) map.panTo(point);
          const state = movementState(cur, km, routeKm, now);
          setStats({
            covered: km,
            total: routeKm,
            percent: Math.min(100, Math.round(fraction * 1000) / 10),
            state,
            arrival: arrivalMs(cur, km, routeKm, now),
            now,
          });
        };
        tick();
        timer = setInterval(tick, 1000);
      })
      .catch((err) => !cancelled && setError(err.message));

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('tj:maps-auth-failure', onAuthFailure);
      overlays.forEach((o) => o.setMap(null));
      mapRef.current = null;
    };
  }, [routeKey, apiKey]);

  const toggleFollow = () => {
    const next = !follow;
    setFollow(next);
    const map = mapRef.current;
    if (next && map && map.getZoom() < 9) map.setZoom(9);
  };

  if (!hasCoords) {
    return (
      <div className="tj-mapbox">
        <div className="tj-map tj-map--empty" style={{ height }}>
          <span>The map will appear once the origin and destination have been located.</span>
        </div>
      </div>
    );
  }

  const moving = stats?.state.key === 'moving';

  return (
    <div className="tj-mapbox">
      <div className="tj-map" style={{ height }}>
        <div ref={canvas} className="tj-map__canvas" />
        {error && <div className="tj-map__error">{error}</div>}
        {!error && stats && (
          <button type="button" className={`tj-map__follow${follow ? ' is-on' : ''}`} onClick={toggleFollow}>
            {follow ? 'Following package' : 'Follow package'}
          </button>
        )}
      </div>

      {stats && !error && (
        <div className="tj-map__stats">
          <div className="tj-map__headline">
            <span className={`tj-map__state tj-map__state--${stats.state.key}`}>
              <span className="tj-map__dot" />
              {stats.state.label}
            </span>
            <span className="tj-map__percent">{stats.percent}% of the journey</span>
          </div>
          <div className="tj-map__bar" aria-hidden="true">
            <span style={{ width: `${stats.percent}%` }} />
          </div>
          <dl className="tj-map__facts">
            <div>
              <dt>Covered</dt>
              <dd>{formatKm(stats.covered)}</dd>
            </div>
            <div>
              <dt>Remaining</dt>
              <dd>{formatKm(Math.max(0, stats.total - stats.covered))}</dd>
            </div>
            <div>
              <dt>Speed</dt>
              <dd>{moving ? `${Math.round(Number(shipment.speedKmh))} km/h` : '0 km/h'}</dd>
            </div>
            <div>
              <dt>{stats.arrival ? 'Arrives in' : 'Total route'}</dt>
              <dd title={stats.arrival ? formatWhen(stats.arrival) : undefined}>
                {stats.arrival ? formatDuration(stats.arrival - stats.now) : formatKm(stats.total)}
              </dd>
            </div>
          </dl>
          {stats.arrival && isMoving(shipment.status) && (
            <p className="tj-map__note">Estimated arrival {formatWhen(stats.arrival)} at the current speed.</p>
          )}
        </div>
      )}
    </div>
  );
}
