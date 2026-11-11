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

/*
 * The package badge faces its final destination: road/rail/sea vehicles
 * (drawn facing right) flip to face left when the destination lies to the
 * west, planes rotate to the exact bearing, and a pointer on the rim always
 * aims straight at the destination. `heading` is degrees clockwise from north.
 */
const packageIcon = (google, kind, heading = 90) => {
  const h = Math.round(heading);
  const vehicle =
    kind === 'plane'
      ? `rotate(${h} 28 28) translate(16 16)`
      : h < 0 || h > 180
        ? 'translate(40 16) scale(-1 1)'
        : 'translate(16 16)';
  return svgIcon(
    google,
    `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">
      <g transform="rotate(${h} 28 28)"><path d="M28 1.5 35 10.5H21z" fill="#11194E" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></g>
      <circle cx="28" cy="28" r="19" fill="#FE000B" stroke="#fff" stroke-width="3"/>
      <g transform="${vehicle}" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${VEHICLE_ICONS[kind]}</g>
    </svg>`,
    56
  );
};

const pointIcon = (google, color, letter) =>
  svgIcon(
    google,
    `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
      <circle cx="15" cy="15" r="12.5" fill="${color}" stroke="#fff" stroke-width="2.5"/>
      <text x="15" y="19.5" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#fff">${letter}</text>
    </svg>`,
    30
  );

/*
 * Card pinned above a point on the map (ORIGIN / DESTINATION / the package's
 * live status and current place). Built once per Google Maps instance.
 */
let TagClass = null;
function mapTag(google, map, position, variant, key, value) {
  if (!TagClass) {
    TagClass = class extends google.maps.OverlayView {
      constructor(pos, cls) {
        super();
        this.position = pos;
        this.div = document.createElement('div');
        this.div.className = `tj-maptag tj-maptag--${cls}`;
        this.div.innerHTML = '<span class="tj-maptag__card"><span class="tj-maptag__k"></span><strong class="tj-maptag__v"></strong></span>';
        this.k = this.div.querySelector('.tj-maptag__k');
        this.v = this.div.querySelector('.tj-maptag__v');
      }
      setText(k, v) {
        if (this.k.textContent !== k) this.k.textContent = k;
        if (this.v.textContent !== v) {
          this.v.textContent = v;
          this.v.title = v;
        }
      }
      moveTo(pos) {
        this.position = pos;
        this.draw();
      }
      onAdd() {
        this.getPanes().floatPane.appendChild(this.div);
      }
      draw() {
        const proj = this.getProjection();
        if (!proj || !this.position) return;
        const pt = proj.fromLatLngToDivPixel(this.position);
        this.div.style.left = `${pt.x}px`;
        this.div.style.top = `${pt.y}px`;
      }
      onRemove() {
        this.div.remove();
      }
    };
  }
  const tag = new TagClass(position, variant);
  tag.setText(key, value);
  tag.setMap(map);
  return tag;
}

/** "Quarter, Town, Country" from a reverse-geocoding result (or a sea/ocean name). */
function placeName(results) {
  if (!results?.length) return '';
  const find = (...types) => {
    for (const r of results) {
      const c = r.address_components?.find((x) => types.some((t) => x.types.includes(t)));
      if (c) return c.long_name;
    }
    return '';
  };
  const country = find('country');
  if (!country) return find('natural_feature');
  const quarter = find('neighborhood', 'sublocality_level_1', 'sublocality');
  const town = find('locality', 'postal_town') || find('administrative_area_level_2');
  const region = find('administrative_area_level_1');
  const parts = [quarter, town, region, country].filter(Boolean);
  return parts.filter((p, i) => parts.indexOf(p) === i).join(', ');
}

/* Rough sea / ocean name for a point the geocoder cannot name (open water). */
const WATERS = [
  ['Gulf of Mexico', 18, 31, -98, -81],
  ['Caribbean Sea', 9, 22, -88, -60],
  ['Mediterranean Sea', 30, 46, -6, 36],
  ['Black Sea', 40.5, 47, 27, 42],
  ['Red Sea', 12, 30, 32, 44],
  ['Persian Gulf', 23, 30.5, 47, 57],
  ['Arabian Sea', 5, 25, 51, 77],
  ['Bay of Bengal', 5, 23, 79, 95],
  ['South China Sea', 0, 23, 99, 121],
  ['East China Sea', 23, 34, 117, 131],
  ['Sea of Japan', 34, 52, 127, 142],
  ['North Sea', 51, 61, -4, 9],
  ['Baltic Sea', 53, 66, 9, 30],
  ['Bay of Biscay', 43, 48, -10, -1],
  ['English Channel', 48.5, 51, -6, 2],
  ['Gulf of Guinea', -5, 7, -10, 10],
  ['Coral Sea', -30, -9, 142, 165],
  ['Tasman Sea', -45, -30, 147, 172],
];
function waterName(lat, lng) {
  const hit = WATERS.find(([, a, b, c, d]) => lat >= a && lat <= b && lng >= c && lng <= d);
  if (hit) return hit[0];
  if (lat > 66) return 'Arctic Ocean';
  if (lat < -60) return 'Southern Ocean';
  if (lng >= 20 && lng < 120 && lat < 25) return 'Indian Ocean';
  const half = lat >= 0 ? 'North' : 'South';
  const atlantic = lng >= -100 && lng < 20 && !(lat < 15 && lng < -80) && !(lat < 9 && lng < -77);
  return `${half} ${atlantic ? 'Atlantic' : 'Pacific'} Ocean`;
}

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
  const [place, setPlace] = useState('');
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
    setPlace('');

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
        const kind = VEHICLE_BY_FREIGHT[s.freightType] || 'truck';
        const destPoint = path[path.length - 1];
        let lastHeading = null;
        const pkg = new google.maps.Marker({
          map,
          position: path[0],
          icon: packageIcon(google, kind, google.maps.geometry.spherical.computeHeading(path[0], destPoint)),
          title: 'Your package',
          zIndex: 10,
        });
        const originTag = mapTag(google, map, path[0], 'origin', 'Origin', s.origin || '');
        const destTag = mapTag(google, map, destPoint, 'dest', 'Destination', s.destination || '');
        const pkgTag = mapTag(google, map, path[0], 'pkg', s.status || 'Status', s.origin || '');
        overlays = [remaining, covered, start, end, pkg, originTag, destTag, pkgTag];

        // Where the package is right now: reverse-geocoded when it has moved
        // far enough (at most every 20 s), so the tag names the quarter, town
        // and country it is passing through.
        const geocoder = new google.maps.Geocoder();
        const geo = { busy: false, pt: null, at: 0, status: null, name: '', water: false };
        const locate = (point, fraction, status) => {
          if (fraction <= 0.0005) return live.current.origin || '';
          if (fraction >= 0.9995) return live.current.destination || '';
          const stale =
            geo.pt === null ||
            geo.status !== status ||
            (Date.now() - geo.at > 20000 && google.maps.geometry.spherical.computeDistanceBetween(point, geo.pt) > 1000);
          if (stale && !geo.busy) {
            geo.busy = true;
            geo.pt = point;
            geo.at = Date.now();
            geo.status = status;
            geocoder
              .geocode({ location: point })
              .then(({ results }) => placeName(results))
              .catch(() => '')
              .then((name) => {
                geo.busy = false;
                if (cancelled) return;
                geo.water = !name;
                geo.name = name || waterName(point.lat(), point.lng());
              });
          }
          return geo.name || 'Locating…';
        };

        // Numbers and the package marker refresh 5x a second so the receiver
        // can see it creep forward even when the whole route is on screen;
        // the (heavier) covered-route line is redrawn once a second.
        let ticks = 0;
        const tick = () => {
          const cur = live.current;
          const now = Date.now() + offset.current;
          const routeKm = cur.routeDistanceKm !== null && cur.routeDistanceKm !== undefined ? Number(cur.routeDistanceKm) : pathMeters / 1000;
          const km = coveredKm(cur, routeKm, now);
          const fraction = routeKm ? Math.min(1, km / routeKm) : 0;
          const { point, index } = pointAlong(google, path, cumulative, fraction * pathMeters);
          pkg.setPosition(point);
          pkgTag.moveTo(point);
          const here = locate(point, fraction, cur.status);
          const enRoute = geo.name && fraction > 0.0005 && fraction < 0.9995;
          const text = !enRoute
            ? here
            : kind === 'plane' && isMoving(cur.status)
              ? `Over ${geo.water ? 'the ' : ''}${here}`
              : geo.water && kind !== 'ship'
                ? `Near the ${here}`
                : here;
          pkgTag.setText(cur.status || 'Status', text);
          setPlace(text);
          // keep the vehicle facing its final destination (re-drawn only when the bearing changes)
          if (google.maps.geometry.spherical.computeDistanceBetween(point, destPoint) > 50) {
            const heading = Math.round(google.maps.geometry.spherical.computeHeading(point, destPoint) / 5) * 5;
            if (heading !== lastHeading) {
              lastHeading = heading;
              pkg.setIcon(packageIcon(google, kind, heading));
            }
          }
          if (ticks++ % 5 === 0) {
            covered.setPath([...path.slice(0, index), point]);
            if (followRef.current) map.panTo(point);
          }
          const state = movementState(cur, km, routeKm, now);
          setStats({
            covered: km,
            total: routeKm,
            fraction,
            state,
            arrival: arrivalMs(cur, km, routeKm, now),
            now,
          });
        };
        tick();
        timer = setInterval(tick, 200);
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
  const speed = Number(shipment.speedKmh) || 0;
  // show enough decimals that the last digit changes every second while moving
  const percentDigits =
    moving && stats.total ? Math.min(5, Math.max(2, Math.ceil(-Math.log10((speed / 3600 / stats.total) * 100)))) : 1;
  const percentText = stats ? (stats.fraction * 100).toFixed(percentDigits) : '0';
  const kmText = stats ? (moving ? `${stats.covered.toFixed(3)} km` : formatKm(stats.covered)) : '';
  const vehicle = VEHICLE_BY_FREIGHT[shipment.freightType] || 'truck';

  return (
    <div className="tj-mapbox">
      <div className="tj-map" style={{ height }}>
        <div ref={canvas} className="tj-map__canvas" />
        {error && <div className="tj-map__error">{error}</div>}
        {!error && stats && (
          <div className={`tj-map__hud tj-map__hud--${stats.state.key}`} aria-live="off">
            <span className="tj-map__hud-label">
              <span className="tj-map__dot" />
              {moving ? 'Live' : stats.state.key === 'delivered' ? 'Delivered' : 'Progress'}
            </span>
            <strong className="tj-map__hud-percent">{percentText}%</strong>
            <span className="tj-map__hud-km">{kmText} covered</span>
          </div>
        )}
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
            <span className="tj-map__percent">
              <strong>{percentText}%</strong> of the journey completed
            </span>
          </div>
          {place && (
            <p className="tj-map__where">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
                <circle cx="12" cy="9.5" r="2.5" />
              </svg>
              <span>Current location:</span>
              <strong>{place}</strong>
            </p>
          )}
          <div className={`tj-map__bar${moving ? ' is-moving' : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(stats.fraction * 100)}>
            <span className="tj-map__fill" style={{ width: `${stats.fraction * 100}%` }} />
            <span className="tj-map__rider" style={{ left: `${stats.fraction * 100}%` }} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: VEHICLE_ICONS[vehicle] }} />
            </span>
          </div>
          <div className="tj-map__ends">
            <span>{shipment.origin}</span>
            <span>{shipment.destination}</span>
          </div>
          <dl className="tj-map__facts">
            <div>
              <dt>Covered</dt>
              <dd>{kmText}</dd>
            </div>
            <div>
              <dt>Remaining</dt>
              <dd>{moving ? `${Math.max(0, stats.total - stats.covered).toFixed(3)} km` : formatKm(Math.max(0, stats.total - stats.covered))}</dd>
            </div>
            <div>
              <dt>Speed</dt>
              <dd>{moving ? `${Math.round(speed)} km/h` : '0 km/h'}</dd>
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
