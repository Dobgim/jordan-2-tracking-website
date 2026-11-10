import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import ShipmentMap from '../../components/ShipmentMap.jsx';
import { DEFAULT_SPEEDS, formatKm } from '../../lib/tracking.js';
import { useResource } from '../api.js';
import { addEvent, createShipment, deleteEvent, deleteShipment, getSettings, getShipment, listEmailLog, updateShipment } from '../data.js';
import { normaliseInvoice } from '../invoice.js';
import { locateRoute } from '../route.js';
import { generateTrackingId } from '../../lib/trackingId.js';
import { ErrorBox, FREIGHT_TYPES, Icon, Loading, PageHeader, SERVICES, STATUSES, StatusBadge, formatDate } from '../ui.jsx';

const PIECE_TYPES = ['Box', 'Envelope', 'Pallet', 'Crate', 'Carton', 'Container', 'Vehicle', 'Other'];


const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocalInput = (value) => (value ? new Date(value).toISOString() : null);
const trackUrlFor = (code) => `${window.location.origin}/track?code=${encodeURIComponent(code)}`;
const blankEvent = () => ({ status: 'Pending', date: toLocalInput(new Date().toISOString()), location: '', note: '' });
const dateIn = (days) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);

const blankInvoice = (settings) => ({
  currency: settings?.currency || 'USD',
  taxRate: settings?.tax_rate ?? 0,
  items: [{ description: 'Freight charges', quantity: 1, unitPrice: '' }],
  discount: '',
  amountPaid: '',
  paymentMethod: 'Bank transfer',
  dueDate: dateIn(14),
  notes: '',
});

const EMPTY = {
  trackingNumber: '',
  status: 'Pending',
  origin: '',
  destination: '',
  freightType: 'Truck Freight',
  service: '',
  weight: '',
  dimensions: '',
  estimatedDelivery: '',
  estimatedDeliveryTime: '',
  pieceType: '',
  packageDescription: '',
  departureAt: '',
  speedKmh: DEFAULT_SPEEDS['Truck Freight'],
  notes: '',
  sender: { name: '', phone: '', email: '', address: '' },
  receiver: { name: '', phone: '', email: '', address: '' },
  invoice: null, // filled from Settings once they load
};

const toForm = (s) => ({
  trackingNumber: s.trackingNumber,
  status: s.status,
  origin: s.origin,
  destination: s.destination,
  freightType: s.freightType || 'Truck Freight',
  service: s.service || '',
  weight: s.weight || '',
  dimensions: s.dimensions || '',
  estimatedDelivery: s.estimatedDelivery || '',
  estimatedDeliveryTime: s.estimatedDeliveryTime || '',
  pieceType: s.pieceType || '',
  packageDescription: s.packageDescription || '',
  departureAt: toLocalInput(s.departureAt),
  speedKmh: s.speedKmh ?? DEFAULT_SPEEDS[s.freightType] ?? 60,
  notes: s.notes || '',
  sender: { ...EMPTY.sender, ...s.sender },
  receiver: { ...EMPTY.receiver, ...s.receiver },
  invoice: {
    ...blankInvoice(null),
    ...s.invoice,
    items: s.invoice?.items?.length ? s.invoice.items : blankInvoice(null).items,
  },
});

// "Create shipment" on a quote request pre-fills the form from it
const fromQuote = (q) => {
  const freightType = FREIGHT_TYPES.includes(q.freightType) ? q.freightType : EMPTY.freightType;
  return {
    ...EMPTY,
    origin: q.origin || '',
    destination: q.destination || '',
    freightType,
    speedKmh: DEFAULT_SPEEDS[freightType],
    service: SERVICES.includes(q.service) ? q.service : '',
    dimensions: q.dimensions || '',
    sender: { name: q.name || '', phone: q.phone || '', email: q.email || '' },
    notes: q.incoterms ? `Incoterms: ${q.incoterms}` : '',
  };
};

const routeOf = (s) => ({
  originLat: s.originLat,
  originLng: s.originLng,
  destLat: s.destLat,
  destLng: s.destLng,
  routePolyline: s.routePolyline,
  routeDistanceKm: s.routeDistanceKm,
});
const NO_ROUTE = { originLat: null, originLng: null, destLat: null, destLng: null, routePolyline: null, routeDistanceKm: null };

export default function ShipmentForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const location = useLocation();
  const { data: settings } = useResource(() => getSettings());

  const [form, setForm] = useState(() =>
    isNew
      ? { ...(location.state?.fromQuote ? fromQuote(location.state.fromQuote) : EMPTY), trackingNumber: generateTrackingId() }
      : null
  );
  const [shipment, setShipment] = useState(null);
  // timeline events entered while creating a shipment (saved right after it)
  const [newEvents, setNewEvents] = useState(() => (isNew ? [blankEvent()] : []));
  const setNewEvent = (i, key) => (e) =>
    setNewEvents((list) => list.map((ev, j) => (j === i ? { ...ev, [key]: e.target.value } : ev)));
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [warning, setWarning] = useState(location.state?.warning || '');

  // new shipments take their currency and tax rate from Settings
  useEffect(() => {
    if (settings) setForm((f) => (f && !f.invoice ? { ...f, invoice: blankInvoice(settings) } : f));
  }, [settings]);

  useEffect(() => {
    if (isNew) return undefined;
    let active = true;
    getShipment(id)
      .then((s) => {
        if (!active) return;
        setShipment(s);
        setForm(toForm(s));
      })
      .catch((err) => active && setLoadError(err.message));
    return () => {
      active = false;
    };
  }, [id, isNew]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setParty = (party, key) => (e) => setForm((f) => ({ ...f, [party]: { ...f[party], [key]: e.target.value } }));
  const setFreight = (e) => {
    const freightType = e.target.value;
    setForm((f) => ({ ...f, freightType, speedKmh: DEFAULT_SPEEDS[freightType] ?? f.speedKmh }));
  };
  const invoiceOf = (f) => f.invoice || blankInvoice(settings);
  const setInvoice = (key) => (e) => setForm((f) => ({ ...f, invoice: { ...invoiceOf(f), [key]: e.target.value } }));
  const setItem = (index, key) => (e) =>
    setForm((f) => {
      const inv = invoiceOf(f);
      return { ...f, invoice: { ...inv, items: inv.items.map((it, i) => (i === index ? { ...it, [key]: e.target.value } : it)) } };
    });
  const addItem = () =>
    setForm((f) => {
      const inv = invoiceOf(f);
      return { ...f, invoice: { ...inv, items: [...inv.items, { description: '', quantity: 1, unitPrice: '' }] } };
    });
  const removeItem = (index) =>
    setForm((f) => {
      const inv = invoiceOf(f);
      return { ...f, invoice: { ...inv, items: inv.items.filter((_, i) => i !== index) } };
    });

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setWarning('');
    if (!form.origin.trim() || !form.destination.trim() || !form.receiver.name.trim()) {
      setError("Origin, destination and the receiver's name are required.");
      return;
    }

    try {
      const addressChanged = !shipment || form.origin.trim() !== shipment.origin || form.destination.trim() !== shipment.destination;
      const needsRoute = addressChanged || form.freightType !== shipment.freightType || shipment.originLat === null;
      let route = shipment ? routeOf(shipment) : NO_ROUTE;
      let warn = '';

      if (needsRoute) {
        setSaving('Locating the route on the map…');
        try {
          const located = await locateRoute(form, settings?.google_maps_api_key);
          route = located;
          warn = located.note;
        } catch (err) {
          if (addressChanged) route = NO_ROUTE;
          warn = `${err.message} The shipment was saved without a map.`;
        }
      }

      setSaving('Saving…');
      const payload = {
        ...form,
        ...route,
        departureAt: fromLocalInput(form.departureAt),
        speedKmh: Number(form.speedKmh) || DEFAULT_SPEEDS[form.freightType] || 60,
        invoice: normaliseInvoice(invoiceOf(form)),
      };

      if (isNew) {
        const created = await createShipment(payload);
        const events = newEvents.filter((ev) => ev.location.trim() || ev.note.trim());
        for (const ev of events) {
          await addEvent(created.id, { ...ev, date: fromLocalInput(ev.date) || new Date().toISOString() });
        }
        navigate(`/shipments/${created.id}`, {
          replace: true,
          state: {
            notice: `Shipment ${created.trackingNumber} created. Share this tracking number with your customer.`,
            warning: warn,
          },
        });
        return;
      }
      const updated = await updateShipment(id, payload);
      setShipment(updated);
      setForm(toForm(updated));
      setNotice('Changes saved.');
      setWarning(warn);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving('');
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete shipment ${shipment.trackingNumber}? Customers will no longer be able to track it.`)) return;
    try {
      await deleteShipment(id);
      navigate('/shipments', { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  const back = (
    <Link to="/shipments" className="back-link">
      <Icon name="back" size={14} /> Shipments
    </Link>
  );

  if (loadError) {
    return (
      <>
        <PageHeader title="Shipment" back={back} />
        <ErrorBox message={loadError} />
      </>
    );
  }
  if (!form) {
    return (
      <>
        <PageHeader title="Shipment" back={back} />
        <Loading />
      </>
    );
  }


  return (
    <>
      <PageHeader
        back={back}
        title={isNew ? 'New shipment' : shipment.trackingNumber}
        subtitle={
          isNew ? (
            location.state?.fromQuote
              ? 'Pre-filled from a quote request — check the details and save.'
              : 'A unique tracking number has been generated — share it with your customer after saving.'
          ) : (
            <>
              <StatusBadge status={shipment.status} />
              <span className="muted">
                · Invoice {shipment.invoiceNumber} · Created {formatDate(shipment.createdAt)}
              </span>
            </>
          )
        }
        actions={
          !isNew && (
            <>
              <Link to={`/shipments/${id}/invoice`} className="btn btn--ghost">
                <Icon name="quote" size={16} />
                Invoice
              </Link>
              <button type="button" className="btn btn--danger-ghost" onClick={remove}>
                <Icon name="trash" size={16} />
                Delete
              </button>
            </>
          )
        }
      />

      {notice && (
        <div className="alert alert--success">
          <span>{notice}</span>
          {shipment && (
            <a className="btn btn--ghost btn--sm" href={trackUrlFor(shipment.trackingNumber)} target="_blank" rel="noreferrer">
              <Icon name="external" size={14} />
              View on website
            </a>
          )}
        </div>
      )}
      {warning && <div className="alert alert--warn">{warning}</div>}

      <div className={isNew ? '' : 'grid-2 grid-2--form'}>
        <form className="stack" onSubmit={save}>
          {error && <ErrorBox message={error} />}

          <section className="card">
            <div className="card__head">
              <h2>Shipment</h2>
            </div>
            <div className="card__body form-grid">
              <label className="field">
                <span>
                  Tracking number <em className="hint">{isNew ? 'auto-generated' : ''}</em>
                </span>
                <div className="input-group">
                  <input className="mono" value={form.trackingNumber} onChange={set('trackingNumber')} placeholder="TJ-2026-XXXXXXX" />
                  {isNew && (
                    <button
                      type="button"
                      className="input-group__btn"
                      title="Generate a new tracking number"
                      onClick={() => setForm((f) => ({ ...f, trackingNumber: generateTrackingId() }))}
                    >
                      New
                    </button>
                  )}
                </div>
              </label>
              <label className="field">
                <span>Status</span>
                <select value={form.status} onChange={set('status')}>
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Freight type</span>
                <select value={form.freightType} onChange={setFreight}>
                  {FREIGHT_TYPES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Service</span>
                <select value={form.service} onChange={set('service')}>
                  <option value="">Standard</option>
                  {SERVICES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Weight</span>
                <input value={form.weight} onChange={set('weight')} placeholder="e.g. 250 kg" />
              </label>
              <label className="field">
                <span>Dimensions</span>
                <input value={form.dimensions} onChange={set('dimensions')} placeholder="L × W × H" />
              </label>
              <label className="field">
                <span>Piece type</span>
                <select value={form.pieceType} onChange={set('pieceType')}>
                  <option value="">Select type</option>
                  {PIECE_TYPES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Expected delivery date</span>
                <input type="date" value={form.estimatedDelivery} onChange={set('estimatedDelivery')} />
              </label>
              <label className="field">
                <span>Expected delivery time</span>
                <input type="time" value={form.estimatedDeliveryTime} onChange={set('estimatedDeliveryTime')} />
              </label>
              <label className="field span-2">
                <span>Package description</span>
                <textarea value={form.packageDescription} onChange={set('packageDescription')} placeholder="Describe the package contents" />
              </label>
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <h2>Route &amp; movement</h2>
              {shipment?.routeDistanceKm ? (
                <span className="muted small">
                  {formatKm(shipment.routeDistanceKm)} {shipment.routePolyline ? 'by road' : 'direct line'}
                </span>
              ) : null}
            </div>
            <div className="card__body form-grid">
              <label className="field">
                <span>Origin *</span>
                <input value={form.origin} onChange={set('origin')} placeholder="City, country" required />
              </label>
              <label className="field">
                <span>Destination *</span>
                <input value={form.destination} onChange={set('destination')} placeholder="City, country" required />
              </label>
              <label className="field">
                <span>
                  Departure <em className="hint">when it starts moving</em>
                </span>
                <input type="datetime-local" value={form.departureAt} onChange={set('departureAt')} />
              </label>
              <label className="field">
                <span>
                  Average speed <em className="hint">km/h</em>
                </span>
                <input type="number" min="1" max="1200" step="1" value={form.speedKmh} onChange={set('speedKmh')} />
              </label>
              <p className="form-note span-2">
                The package moves on the map only while the status is <strong>In Transit</strong> or{' '}
                <strong>Out for Delivery</strong>, at this real-world speed (road 60, rail 80, sea 30, air 750 km/h). Any
                other status holds it exactly where it is. Leave the departure empty to start from the time it goes In
                Transit.
              </p>
            </div>
          </section>

          <div className="grid-2 grid-2--even">
            <section className="card">
              <div className="card__head">
                <h2>Sender</h2>
                <span className="muted small">Shown on the invoice</span>
              </div>
              <div className="card__body stack stack--tight">
                <label className="field">
                  <span>Name</span>
                  <input value={form.sender.name} onChange={setParty('sender', 'name')} />
                </label>
                <label className="field">
                  <span>Phone</span>
                  <input type="tel" value={form.sender.phone} onChange={setParty('sender', 'phone')} />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input type="email" value={form.sender.email} onChange={setParty('sender', 'email')} />
                </label>
                <label className="field">
                  <span>Address</span>
                  <input value={form.sender.address || ''} onChange={setParty('sender', 'address')} placeholder="Full address" />
                </label>
              </div>
            </section>

            <section className="card">
              <div className="card__head">
                <h2>Receiver</h2>
              </div>
              <div className="card__body stack stack--tight">
                <label className="field">
                  <span>Name *</span>
                  <input value={form.receiver.name} onChange={setParty('receiver', 'name')} required />
                </label>
                <label className="field">
                  <span>Phone</span>
                  <input type="tel" value={form.receiver.phone} onChange={setParty('receiver', 'phone')} />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input type="email" value={form.receiver.email} onChange={setParty('receiver', 'email')} />
                </label>
                <label className="field">
                  <span>Delivery address</span>
                  <input value={form.receiver.address} onChange={setParty('receiver', 'address')} />
                </label>
              </div>
            </section>
          </div>

          {isNew && (
            <section className="card">
              <div className="card__head">
                <h2>Timeline events</h2>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setNewEvents((l) => [...l, blankEvent()])}>
                  <Icon name="plus" size={14} />
                  Add event
                </button>
              </div>
              <div className="card__body stack stack--tight">
                {newEvents.length === 0 && <p className="form-note">No events yet. Add the first tracking update the customer will see.</p>}
                {newEvents.map((ev, i) => (
                  <div key={i} className="event-row">
                    <label className="field">
                      <span>Status</span>
                      <select value={ev.status} onChange={setNewEvent(i, 'status')}>
                        {STATUSES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Date &amp; time</span>
                      <input type="datetime-local" value={ev.date} onChange={setNewEvent(i, 'date')} />
                    </label>
                    <label className="field">
                      <span>Location</span>
                      <input value={ev.location} onChange={setNewEvent(i, 'location')} placeholder="e.g. London, UK" />
                    </label>
                    <label className="field">
                      <span>Note for the customer</span>
                      <input value={ev.note} onChange={setNewEvent(i, 'note')} placeholder="e.g. Package received at our hub" />
                    </label>
                    <button
                      type="button"
                      className="icon-btn icon-btn--danger event-row__x"
                      aria-label="Remove event"
                      onClick={() => setNewEvents((l) => l.filter((_, j) => j !== i))}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="card">
            <div className="card__head">
              <h2>Internal notes</h2>
              <span className="muted small">Not shown to customers</span>
            </div>
            <div className="card__body">
              <label className="field">
                <textarea value={form.notes} onChange={set('notes')} rows={3} aria-label="Internal notes" />
              </label>
            </div>
          </section>

          <div className="form-actions">
            <Link to="/shipments" className="btn btn--ghost">
              Cancel
            </Link>
            <button type="submit" className="btn btn--primary" disabled={Boolean(saving)}>
              <Icon name="check" size={16} />
              {saving || (isNew ? 'Create shipment' : 'Save changes')}
            </button>
          </div>
        </form>

        {!isNew && (
          <aside className="stack">
            <TrackingCode shipment={shipment} />

            <section className="card">
              <div className="card__head">
                <h2>Live position</h2>
                <StatusBadge status={shipment.status} />
              </div>
              <div className="card__body">
                {settings ? (
                  <ShipmentMap shipment={shipment} apiKey={settings.google_maps_api_key} height={300} />
                ) : (
                  <Loading label="Loading map…" />
                )}
              </div>
            </section>

            <TrackingHistory
              shipment={shipment}
              onChange={(s) => {
                setShipment(s);
                setForm((f) => ({ ...f, status: s.status }));
              }}
            />

            <EmailLog shipmentId={shipment.id} status={shipment.status} />
          </aside>
        )}
      </div>
    </>
  );
}

/* Emails sent automatically to the sender and receiver (see supabase/functions/notify-shipment). */
function EmailLog({ shipmentId, status }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let active = true;
    const load = () =>
      listEmailLog(shipmentId)
        .then((r) => active && setRows(r))
        .catch(() => active && setRows([]));
    load();
    // emails go out a few seconds after a change: check again shortly
    const timer = setTimeout(load, 9000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [shipmentId, status]);

  return (
    <section className="card">
      <div className="card__head">
        <h2>Email notifications</h2>
        <span className="muted small">Sender &amp; receiver</span>
      </div>
      <div className="card__body">
        {rows === null ? (
          <Loading />
        ) : rows.length === 0 ? (
          <p className="form-note">
            Emails are sent automatically when the shipment is created and whenever its status changes, to the sender and
            receiver email addresses above.
          </p>
        ) : (
          <ul className="list" style={{ padding: 0 }}>
            {rows.map((r) => (
              <li key={r.id} style={{ padding: '10px 0' }}>
                <div>
                  <span className="strong">{r.recipient}</span>
                  <span className="muted small">{r.subject}</span>
                  {!r.ok && r.error && <span className="small" style={{ color: 'var(--bad)' }}>{r.error}</span>}
                </div>
                <div className="list__meta">
                  <span className={`badge badge--${r.ok ? 'ok' : 'bad'}`}>{r.ok ? 'Sent' : 'Not sent'}</span>
                  <span className="muted small">{formatDate(r.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function TrackingCode({ shipment }) {
  const [copied, setCopied] = useState(false);
  const trackUrl = trackUrlFor(shipment.trackingNumber);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shipment.trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard can be unavailable on insecure origins */
    }
  };

  return (
    <section className="card tracking-code">
      <div className="card__body">
        <span className="muted small">Customer tracking number</span>
        <div className="tracking-code__row">
          <strong className="mono">{shipment.trackingNumber}</strong>
        </div>
        <p className="muted small">Customers enter this in the “Track your order” box, or scan the QR code on the invoice.</p>
        <div className="tracking-code__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={copy}>
            <Icon name={copied ? 'check' : 'copy'} size={14} />
            {copied ? 'Copied' : 'Copy'}
          </button>
          <a className="btn btn--ghost btn--sm" href={trackUrl} target="_blank" rel="noreferrer">
            <Icon name="external" size={14} />
            Customer view
          </a>
          <Link className="btn btn--ghost btn--sm" to={`/shipments/${shipment.id}/invoice`}>
            <Icon name="quote" size={14} />
            Invoice
          </Link>
        </div>
      </div>
    </section>
  );
}

const localNow = () => toLocalInput(new Date().toISOString());

function TrackingHistory({ shipment, onChange }) {
  const [draft, setDraft] = useState(() => ({ status: shipment.status, location: '', note: '', date: localNow() }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const updated = await addEvent(shipment.id, { ...draft, date: fromLocalInput(draft.date) || new Date().toISOString() });
      onChange(updated);
      setDraft({ status: updated.status, location: '', note: '', date: localNow() });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (event) => {
    if (!window.confirm('Delete this tracking update?')) return;
    try {
      onChange(await deleteEvent(shipment.id, event.id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <section className="card">
        <div className="card__head">
          <h2>Post tracking update</h2>
        </div>
        <form className="card__body stack stack--tight" onSubmit={add}>
          {error && <ErrorBox message={error} />}
          <div className="form-grid">
            <label className="field">
              <span>Status</span>
              <select value={draft.status} onChange={set('status')}>
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Date &amp; time</span>
              <input type="datetime-local" value={draft.date} onChange={set('date')} required />
            </label>
          </div>
          <label className="field">
            <span>Location</span>
            <input value={draft.location} onChange={set('location')} placeholder="e.g. Dallas, TX hub" />
          </label>
          <label className="field">
            <span>Note for the customer</span>
            <input value={draft.note} onChange={set('note')} placeholder="e.g. Departed regional hub" />
          </label>
          <button type="submit" className="btn btn--dark" disabled={busy}>
            <Icon name="plus" size={16} />
            {busy ? 'Posting…' : 'Post update'}
          </button>
        </form>
      </section>

      <section className="card">
        <div className="card__head">
          <h2>Tracking history</h2>
          <span className="muted small">
            {shipment.events.length} update{shipment.events.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="card__body">
          {shipment.events.length ? (
            <ol className="timeline">
              {shipment.events.map((ev) => (
                <li key={ev.id}>
                  <div className="timeline__head">
                    <StatusBadge status={ev.status} />
                    <button type="button" className="icon-btn icon-btn--danger icon-btn--sm" onClick={() => remove(ev)} aria-label="Delete update">
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                  {(ev.location || ev.note) && <p className="timeline__text">{[ev.location, ev.note].filter(Boolean).join(' — ')}</p>}
                  <span className="muted small">{formatDate(ev.date, true)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">No updates yet.</p>
          )}
        </div>
      </section>
    </>
  );
}
