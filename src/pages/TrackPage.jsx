import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import ShipmentMap from '../components/ShipmentMap.jsx';
import { Stripes } from '../components/ui.jsx';
import { company } from '../data/site.jsx';
import { readTrackCode } from '../lib/navigation.js';
import { getPublicSettings, trackShipment } from '../lib/publicApi.js';

/*
 * /track — every "Tracking" / "Track And Trace" link, the tracking boxes on
 * the site and the invoice QR codes lead here, with the number in ?code=.
 */

const REFRESH_MS = 30000;
const STEPS = ['Pending', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered'];

const STATUS_STYLES = {
  pending: 'bg-slate-100 text-slate-700',
  'picked-up': 'bg-sky-100 text-sky-800',
  'in-transit': 'bg-blue-100 text-royal',
  'out-for-delivery': 'bg-amber-100 text-amber-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  'on-hold': 'bg-orange-100 text-orange-800',
  cancelled: 'bg-red-100 text-red-700',
};

export const formatDate = (iso, withTime = false) => {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: withTime ? undefined : 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
};

const Label = ({ children }) => <span className="block text-[12px] font-semibold tracking-[0.08em] text-body uppercase">{children}</span>;

function Card({ className = '', children }) {
  return <div className={`rounded-2xl border border-line bg-white p-6 shadow-[0_20px_50px_rgb(17_25_78/0.06)] sm:p-9 ${className}`}>{children}</div>;
}

function Spinner() {
  return <span className="inline-block size-5 animate-spin rounded-full border-2 border-line border-t-brand" aria-hidden="true" />;
}

function ShipmentResult({ shipment, mapsKey, clockOffset }) {
  const lastRegular = shipment.events.find((e) => STEPS.includes(e.status))?.status;
  const currentStep = STEPS.indexOf(STEPS.includes(shipment.status) ? shipment.status : lastRegular || 'Pending');
  const exception = !STEPS.includes(shipment.status);
  const statusKey = shipment.status.toLowerCase().replace(/\s+/g, '-');

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-5 rounded-xl bg-mist p-5">
        <div>
          <Label>Current status</Label>
          <span className={`mt-1.5 inline-block rounded-full px-3.5 py-1 font-heading text-[15px] font-semibold ${STATUS_STYLES[statusKey] || 'bg-slate-100 text-navy'}`}>
            {shipment.status}
          </span>
        </div>
        {shipment.estimatedDelivery && (
          <div className="text-right">
            <Label>{shipment.status === 'Delivered' ? 'Delivery date' : 'Estimated delivery'}</Label>
            <strong className="mt-1 block font-heading text-[18px] text-navy">{formatDate(shipment.estimatedDelivery)}</strong>
          </div>
        )}
      </div>

      {exception && (
        <p className="mt-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-[15px] text-orange-900">
          This shipment is currently <strong>{shipment.status.toLowerCase()}</strong>. Contact our support team for details.
        </p>
      )}

      <div className="mt-6 flex items-center gap-4">
        <div className="min-w-0">
          <Label>From</Label>
          <strong className="block font-heading text-[17px] text-navy">{shipment.origin}</strong>
        </div>
        <span className="relative h-px min-w-10 flex-1 border-t-2 border-dashed border-line" aria-hidden="true">
          <Icon name="arrowRight" size={16} className="absolute -top-[9px] left-1/2 -translate-x-1/2 bg-white px-0.5 text-brand" />
        </span>
        <div className="min-w-0 text-right">
          <Label>To</Label>
          <strong className="block font-heading text-[17px] text-navy">{shipment.destination}</strong>
        </div>
      </div>

      <div className="mt-6">
        {mapsKey === null ? (
          <div className="flex h-[380px] items-center justify-center gap-3 rounded-xl bg-mist text-navy">
            <Spinner /> Loading map…
          </div>
        ) : (
          <ShipmentMap shipment={shipment} apiKey={mapsKey} clockOffsetMs={clockOffset} height={380} />
        )}
      </div>

      <ol className="mt-9 grid grid-cols-5 gap-1" aria-label="Delivery progress">
        {STEPS.map((step, i) => {
          const done = i <= currentStep;
          return (
            <li key={step} className="relative flex flex-col items-center text-center">
              {i > 0 && (
                <span className={`absolute top-[9px] right-1/2 h-0.5 w-full ${done ? (exception ? 'bg-body/40' : 'bg-brand') : 'bg-line'}`} aria-hidden="true" />
              )}
              <span
                className={`relative grid size-5 place-items-center rounded-full border-2 ${
                  done ? (exception ? 'border-body/50 bg-body/50' : 'border-brand bg-brand') : 'border-line bg-white'
                }`}
              >
                {done && <Icon name="check" size={11} strokeWidth={3} className="text-white" />}
              </span>
              <span className={`mt-2 text-[12px] leading-tight sm:text-[13px] ${done ? 'font-semibold text-navy' : 'text-body'}`}>{step}</span>
            </li>
          );
        })}
      </ol>

      {(shipment.freightType || shipment.weight || shipment.service) && (
        <dl className="mt-9 grid gap-3 sm:grid-cols-3">
          {[
            ['Freight', shipment.freightType],
            ['Weight', shipment.weight],
            ['Service', shipment.service],
          ]
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="rounded-lg border border-line px-4 py-3">
                <dt>
                  <Label>{k}</Label>
                </dt>
                <dd className="mt-0.5 font-heading text-[16px] font-medium text-navy">{v}</dd>
              </div>
            ))}
        </dl>
      )}

      <h3 className="mt-10 text-[20px] font-semibold">Tracking history</h3>
      <ol className="mt-5 border-l-2 border-line pl-6">
        {shipment.events.map((ev, i) => (
          <li key={i} className="relative pb-6 last:pb-0">
            <span className={`absolute top-1.5 -left-[31px] size-3 rounded-full ring-4 ring-white ${i === 0 ? 'bg-brand' : 'bg-royal/40'}`} aria-hidden="true" />
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <strong className="font-heading text-[16px] text-navy">{ev.status}</strong>
              <span className="text-[13px]">{formatDate(ev.date, true)}</span>
            </div>
            {(ev.location || ev.note) && <p className="mt-1 text-[15px]">{[ev.location, ev.note].filter(Boolean).join(' — ')}</p>}
          </li>
        ))}
      </ol>
    </>
  );
}

const FEATURES = [
  { icon: 'pin', title: 'Live map', text: 'Watch your package move along its route in real time.' },
  { icon: 'clock', title: 'Every checkpoint', text: 'See each pickup, hub and hand-over as it happens.' },
  { icon: 'truck', title: 'Delivery estimate', text: 'Know when to expect it, based on the current speed.' },
];

export default function TrackPage() {
  const [code, setCode] = useState(readTrackCode);
  const [input, setInput] = useState(code);
  const [state, setState] = useState({});
  const [clockOffset, setClockOffset] = useState(0);
  const [settings, setSettings] = useState(null);
  const resultRef = useRef(null);
  const searched = useRef(false);

  useEffect(() => {
    document.title = 'Track Your Shipment – TheJordans Logistics & Freight';
  }, []);

  // back/forward, and tracking boxes elsewhere on the page
  useEffect(() => {
    const sync = () => {
      const next = readTrackCode();
      searched.current = true;
      setCode(next);
      setInput(next);
    };
    window.addEventListener('popstate', sync);
    window.addEventListener('tj:track', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('tj:track', sync);
    };
  }, []);

  useEffect(() => {
    getPublicSettings()
      .then((s) => setSettings(s || {}))
      .catch(() => setSettings({}));
  }, []);

  const load = useCallback(
    async (silent) => {
      if (!code) return setState({});
      if (!silent) setState({ loading: true });
      try {
        const sentAt = Date.now();
        const shipment = await trackShipment(code);
        if (!shipment) return setState({ notFound: true });
        // align the map animation with the database clock, not the visitor's
        setClockOffset(Date.parse(shipment.serverNow) - (sentAt + Date.now()) / 2);
        setState({ shipment });
      } catch (err) {
        if (!silent) setState({ error: err.message });
      }
    },
    [code]
  );

  useEffect(() => {
    load(false);
    if (!code) return undefined;
    // pick up status changes made in the dashboard while the page is open
    const timer = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load, code]);

  const found = state.shipment?.trackingNumber;
  useEffect(() => {
    if (searched.current && (found || state.notFound)) {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [found, state.notFound]);

  const submit = (e) => {
    e.preventDefault();
    const next = input.trim();
    if (!next) return;
    searched.current = true;
    window.history.pushState(null, '', '/track?code=' + encodeURIComponent(next));
    if (next === code) load(false);
    else setCode(next);
  };

  const phone = settings?.companyPhone || company.phone;

  return (
    <main>
      <section className="container-wide">
        <div className="relative overflow-hidden rounded-[13px] bg-gradient-to-br from-navy to-royal px-5 py-16 sm:px-10 lg:py-[100px]">
          <Stripes className="pointer-events-none absolute right-0 bottom-0 h-full w-auto text-white/[0.05]" />
          <div className="relative mx-auto max-w-[860px] text-center">
            <nav aria-label="Breadcrumb" className="flex justify-center gap-2 text-[14px] text-white/70">
              <a href="/" className="hover:text-white">
                Home
              </a>
              <span aria-hidden="true">/</span>
              <span className="text-white">Tracking</span>
            </nav>
            <h1 className="mt-4 text-[40px] leading-tight font-semibold text-white sm:text-[60px]">Track Your Shipment</h1>
            <p className="mx-auto mt-4 max-w-[560px] text-[17px] text-white/80">
              Enter your tracking number to see the latest status of your delivery — live on the map.
            </p>
            <form onSubmit={submit} role="search" className="mx-auto mt-9 flex max-w-[640px] flex-col gap-3 rounded-xl bg-white p-2 sm:flex-row">
              <label className="flex flex-1 items-center gap-3 px-4">
                <Icon name="box" size={20} className="shrink-0 text-brand" />
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter your tracking number"
                  aria-label="Tracking number"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className="h-[52px] min-w-0 flex-1 bg-transparent text-[16px] text-navy outline-none placeholder:text-body"
                />
              </label>
              <button
                type="submit"
                disabled={!input.trim() || state.loading}
                className="h-[52px] rounded-lg bg-brand px-7 font-heading text-[15px] font-semibold text-white transition-colors hover:bg-navy disabled:cursor-not-allowed disabled:opacity-60"
              >
                {state.loading ? 'Searching…' : 'Track Shipment'}
              </button>
            </form>
            <p className="mt-4 text-[14px] text-white/65">Your tracking number is on your receipt and invoice — or scan the QR code on the invoice.</p>
          </div>
        </div>
      </section>

      <section ref={resultRef} aria-live="polite" className="container-x scroll-mt-28 py-14 lg:py-20">
        {!code && (
          <div className="grid gap-6 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-line p-7">
                <span className="grid size-12 place-items-center rounded-full bg-royal text-white">
                  <Icon name={f.icon} size={21} />
                </span>
                <strong className="mt-5 block font-heading text-[19px] font-medium text-navy">{f.title}</strong>
                <span className="mt-1 block">{f.text}</span>
              </div>
            ))}
          </div>
        )}

        {state.loading && (
          <Card className="flex items-center justify-center gap-3 text-navy">
            <Spinner /> Looking up {code.toUpperCase()}…
          </Card>
        )}

        {state.notFound && (
          <Card className="text-center">
            <strong className="block font-heading text-[22px] text-navy">No shipment found</strong>
            <p className="mx-auto mt-2 max-w-[560px]">
              We couldn't find a shipment with the tracking number “{code.toUpperCase()}”. Please check the number and try again, or contact our support team on {phone}.
            </p>
          </Card>
        )}

        {state.error && (
          <Card className="text-center">
            <strong className="block font-heading text-[22px] text-navy">Something went wrong</strong>
            <p className="mt-2">{state.error}</p>
          </Card>
        )}

        {state.shipment && (
          <Card className="mx-auto max-w-[960px]">
            <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-6">
              <div>
                <Label>Tracking number</Label>
                <h2 className="mt-1 text-[28px] font-semibold tracking-tight">{state.shipment.trackingNumber}</h2>
              </div>
              <span className="text-[13px]">Updated {formatDate(state.shipment.updatedAt, true)} · refreshes automatically</span>
            </header>
            <ShipmentResult shipment={state.shipment} mapsKey={settings ? settings.googleMapsApiKey || '' : null} clockOffset={clockOffset} />
          </Card>
        )}
      </section>
    </main>
  );
}
