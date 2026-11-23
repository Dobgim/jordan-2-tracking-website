import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import ShipmentMap from '../components/ShipmentMap.jsx';
import ShipmentInvoice from '../components/ShipmentInvoice.jsx';
import { Stripes } from '../components/ui.jsx';
import { company } from '../data/site.jsx';
import { getDeliveryPhoto, getPublicSettings, saveDeliveryInstruction, trackShipment } from '../lib/publicApi.js';

/*
 * /track — every "Tracking" / "Track And Trace" link, the tracking boxes on
 * the site and the invoice QR codes lead here, with the number in ?code=.
 */

const REFRESH_MS = 30000;
const STEPS = ['Label Created', 'Facility Received', 'In Transit', 'Out for Delivery', 'Delivered'];

const STATUS_STYLES = {
  'label-created': 'bg-slate-100 text-slate-700',
  'facility-received': 'bg-sky-100 text-sky-800',
  'in-transit': 'bg-blue-100 text-royal',
  'out-for-delivery': 'bg-amber-100 text-amber-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  delayed: 'bg-amber-100 text-amber-800',
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

const PHOTO_ERRORS = {
  wrong_postal: 'That postal code does not match this shipment. Please check it and try again.',
  too_many: 'Too many attempts. Please wait 15 minutes and try again, or contact support.',
  no_postal: 'This photo cannot be unlocked online yet. Please contact support.',
  no_photo: 'This photo is no longer available.',
  not_found: 'This shipment could not be found.',
};

/* Asks for the receiver's postal code, then shows the delivery photo. */
function DeliveryPhotoDialog({ trackingNumber, event, onClose }) {
  const [postal, setPostal] = useState('');
  const [state, setState] = useState({});

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    if (!postal.trim()) return;
    setState({ busy: true });
    try {
      const res = await getDeliveryPhoto(trackingNumber, event.id, postal.trim());
      setState(res?.photo ? { photo: res.photo } : { error: PHOTO_ERRORS[res?.error] || 'Something went wrong. Please try again.' });
    } catch (err) {
      setState({ error: err.message });
    }
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-navy/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Delivery confirmation"
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full overflow-hidden rounded-2xl bg-white shadow-2xl ${state.photo ? 'max-w-[760px]' : 'max-w-[420px]'}`}
      >
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-full bg-white/90 text-navy hover:bg-mist">
          <Icon name="close" size={18} />
        </button>
        {state.photo ? (
          <div className="p-4 sm:p-6">
            <strong className="block pr-10 font-heading text-[18px] text-navy">Delivery confirmation</strong>
            <span className="text-[14px]">
              {event.status} · {formatDate(event.date, true)}
            </span>
            <img src={state.photo} alt="Delivery confirmation photo" className="mt-4 max-h-[70vh] w-full rounded-xl object-contain bg-mist" />
            <a
              href={state.photo}
              download={`delivery-${trackingNumber}.jpg`}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 font-heading text-[14px] font-semibold text-white hover:bg-brand"
            >
              <Icon name="arrowDown" size={16} /> Download photo
            </a>
          </div>
        ) : (
          <form onSubmit={submit} className="p-6 sm:p-8">
            <span className="grid size-12 place-items-center rounded-full bg-orange-50 text-[#F7931E]">
              <Icon name="lock" size={22} />
            </span>
            <strong className="mt-4 block font-heading text-[20px] text-navy">View delivery confirmation</strong>
            <p className="mt-1 text-[15px]">For privacy, enter the receiver&apos;s postal code to view the delivery photo.</p>
            <input
              value={postal}
              onChange={(e) => setPostal(e.target.value)}
              placeholder="Receiver's postal code"
              aria-label="Receiver's postal code"
              autoComplete="postal-code"
              autoFocus
              className="mt-5 h-12 w-full rounded-lg border border-line px-4 text-[16px] text-navy outline-none focus:border-navy"
            />
            {state.error && <p className="mt-3 text-[14px] text-red-700">{state.error}</p>}
            <button
              type="submit"
              disabled={!postal.trim() || state.busy}
              className="mt-4 h-12 w-full rounded-lg bg-brand font-heading text-[15px] font-semibold text-white transition-colors hover:bg-navy disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state.busy ? 'Checking…' : 'View photo'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* "Need help?" box with the support email and phone number. */
function ContactSupport({ settings }) {
  const email = settings?.companyEmail || company.supportEmail;
  const phone = settings?.companyPhone || company.supportPhone;
  const tel = 'tel:' + String(phone).replace(/[^\d+]/g, '');
  return (
    <div className="mt-8 rounded-xl border border-line bg-mist p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-navy text-white">
            <Icon name="headset" size={20} />
          </span>
          <div>
            <strong className="block font-heading text-[17px] text-navy">Need help with this shipment?</strong>
            <span className="block text-[14px]">Our support team is here for you.</span>
          </div>
        </div>
        <a
          href={`mailto:${email}`}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-5 font-heading text-[14px] font-semibold text-white transition-colors hover:bg-navy"
        >
          <Icon name="headset" size={17} /> Contact Support
        </a>
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        <a href={`mailto:${email}`} className="flex min-w-0 items-center gap-3 rounded-lg bg-white px-4 py-3 text-navy hover:text-brand">
          <Icon name="mail" size={18} className="shrink-0 text-brand" />
          <span className="truncate text-[15px] font-medium">{email}</span>
        </a>
        <a href={tel} className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 text-navy hover:text-brand">
          <Icon name="phone" size={18} className="shrink-0 text-brand" />
          <span className="text-[15px] font-medium">{phone}</span>
        </a>
      </div>
    </div>
  );
}

function ClearanceNotice({ shipment, settings }) {
  if (shipment.status !== 'On Hold' || !(Number(shipment.amountDue) > 0)) return null;
  const currency = shipment.currency || 'USD';
  let amount;
  try {
    amount = new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(shipment.amountDue));
  } catch {
    amount = `${currency} ${Number(shipment.amountDue).toFixed(2)}`;
  }
  const email = settings?.companyEmail || company.supportEmail;

  return (
    <section className="mt-5 border border-line border-l-[8px] border-l-red-600 bg-[#f7f7f7] p-6 sm:p-8">
      <h3 className="font-heading text-[22px] font-bold text-navy">Clearance Required</h3>
      <p className="mt-3 text-[17px] text-body">Outstanding payment required to release this shipment.</p>
      <p className="mt-2 text-[20px] font-bold text-navy">Amount Due: {amount}</p>
      <a
        href={`mailto:${email}?subject=${encodeURIComponent(`Clearance payment for ${shipment.trackingNumber}`)}`}
        className="mt-5 inline-flex min-h-12 items-center rounded-lg bg-navy px-6 py-3 font-heading text-[16px] font-semibold text-white transition-colors hover:bg-brand"
      >
        <Icon name="headset" size={18} className="mr-2" /> Contact Support
      </a>
    </section>
  );
}

const DELIVERY_INSTRUCTIONS = ['Leave at door', 'Hand it to me', 'Leave with a neighbor', 'Leave at reception', 'Other'];

function DeliveryInstructions({ shipment, onSaved }) {
  const [instruction, setInstruction] = useState(shipment.deliveryInstruction || '');
  const [note, setNote] = useState(shipment.deliveryInstructionNote || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const closed = ['Delivered', 'Cancelled'].includes(shipment.status);

  useEffect(() => {
    setInstruction(shipment.deliveryInstruction || '');
    setNote(shipment.deliveryInstructionNote || '');
  }, [shipment.deliveryInstruction, shipment.deliveryInstructionNote]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const saved = await saveDeliveryInstruction(shipment.trackingNumber, instruction, note);
      onSaved(saved);
      setMessage('Your delivery instructions have been saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-9 rounded-xl border border-line bg-white p-5 sm:p-7">
      <h3 className="font-heading text-[20px] font-semibold text-navy">Delivery Instructions</h3>
      <p className="mt-3 text-[16px]">
        Current instruction: <strong>{shipment.deliveryInstruction || 'None selected'}</strong>
        {shipment.deliveryInstructionNote ? ` — ${shipment.deliveryInstructionNote}` : ''}
      </p>
      {!closed && (
        <form onSubmit={save} className="mt-5 max-w-[560px]">
          <label className="block text-[14px] font-medium text-body" htmlFor="delivery-instruction">Select Instruction</label>
          <select
            id="delivery-instruction"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            required
            className="mt-2 h-12 w-full rounded-lg border border-line bg-white px-4 text-[16px] text-navy outline-none focus:border-navy"
          >
            <option value="" disabled>Select an instruction</option>
            {DELIVERY_INSTRUCTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          {instruction === 'Other' && (
            <label className="mt-4 block text-[14px] font-medium text-body" htmlFor="delivery-instruction-note">
              Delivery details
              <textarea
                id="delivery-instruction-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                required
                rows={3}
                className="mt-2 w-full rounded-lg border border-line px-4 py-3 text-[16px] text-navy outline-none focus:border-navy"
                placeholder="Tell us where or how to leave the package"
              />
            </label>
          )}
          {error && <p className="mt-3 text-[14px] text-red-700" role="alert">{error}</p>}
          {message && <p className="mt-3 text-[14px] text-emerald-700" role="status">{message}</p>}
          <button
            type="submit"
            disabled={!instruction || (instruction === 'Other' && !note.trim()) || saving}
            className="mt-4 min-h-12 rounded-lg bg-navy px-6 py-3 font-heading text-[15px] font-semibold uppercase text-white transition-colors hover:bg-brand disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Instructions'}
          </button>
        </form>
      )}
    </section>
  );
}

function ShipmentResult({ shipment, mapsKey, clockOffset, settings, onShipmentChange }) {
  const [photoEvent, setPhotoEvent] = useState(null);
  const lastRegular = shipment.events.find((e) => STEPS.includes(e.status))?.status;
  const currentStep = STEPS.indexOf(STEPS.includes(shipment.status) ? shipment.status : lastRegular || 'Label Created');
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
      <ClearanceNotice shipment={shipment} settings={settings} />

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

      <ContactSupport settings={settings} />

      {(shipment.freightType || shipment.weight || shipment.service || shipment.pieceType) && (
        <dl className="mt-9 grid gap-3 sm:grid-cols-3">
          {[
            ['Freight', shipment.freightType],
            ['Weight', shipment.weight],
            ['Service', shipment.service],
            ['Piece type', shipment.pieceType],
            ['Expected time', shipment.estimatedDeliveryTime],
            ['Package', shipment.packageDescription],
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

      <DeliveryInstructions
        shipment={shipment}
        onSaved={(saved) => onShipmentChange({ ...shipment, ...saved })}
      />

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
            {ev.hasPhoto && ev.id && (
              <button
                type="button"
                onClick={() => setPhotoEvent(ev)}
                className="mt-2.5 inline-flex items-center gap-3 font-heading text-[15px] font-semibold text-[#F7931E] hover:text-brand"
              >
                <Icon name="image" size={24} strokeWidth={1.5} />
                View Delivery Confirmation
              </button>
            )}
          </li>
        ))}
      </ol>
      {photoEvent && <DeliveryPhotoDialog trackingNumber={shipment.trackingNumber} event={photoEvent} onClose={() => setPhotoEvent(null)} />}

      <h3 id="invoice" className="mt-12 text-[20px] font-semibold">Invoice</h3>
      <p className="mt-1 mb-5 text-[15px]">Your shipment invoice, with a QR code that opens this tracking page. Download it as a PDF to keep or share.</p>
      <ShipmentInvoice
        shipment={shipment}
        company={{
          name: settings?.companyName,
          address: settings?.companyAddress,
          phone: settings?.companyPhone,
          email: settings?.companyEmail,
          website: settings?.companyWebsite,
          terms: settings?.invoiceTerms,
        }}
      />
    </>
  );
}

const FEATURES = [
  { icon: 'pin', title: 'Live map', text: 'Watch your package move along its route in real time.' },
  { icon: 'clock', title: 'Every checkpoint', text: 'See each pickup, hub and hand-over as it happens.' },
  { icon: 'truck', title: 'Delivery estimate', text: 'Know when to expect it, based on the current speed.' },
];

export default function TrackPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const code = (params.get('code') || params.get('track') || '').trim();
  const [input, setInput] = useState(code);
  const [state, setState] = useState({});
  const [clockOffset, setClockOffset] = useState(0);
  const [settings, setSettings] = useState(null);
  const resultRef = useRef(null);
  const searched = useRef(false);

  useEffect(() => {
    document.title = 'Track Your Shipment – TheJordans Logistics & Freight';
  }, []);

  // back/forward, and tracking boxes elsewhere (header search, widget)
  useEffect(() => {
    setInput(code);
  }, [code]);

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
    if (next === code) load(false);
    else navigate('/track?code=' + encodeURIComponent(next));
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
            <ShipmentResult
              shipment={state.shipment}
              mapsKey={settings ? settings.googleMapsApiKey || '' : null}
              clockOffset={clockOffset}
              settings={settings}
              onShipmentChange={(shipment) => setState((current) => ({ ...current, shipment }))}
            />
          </Card>
        )}
      </section>
    </main>
  );
}
