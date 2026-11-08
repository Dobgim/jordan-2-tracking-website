import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { getSettings, getShipment } from '../data.js';
import { computeInvoice, formatMoney } from '../invoice.js';
import { Icon, formatDate } from '../ui.jsx';
import './invoice.css';

/* Printable A4 invoice with a QR code that opens the shipment's live tracking. */
export default function Invoice() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [qr, setQr] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getShipment(id), getSettings()])
      .then(([shipment, settings]) => active && setData({ shipment, settings }))
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [id]);

  const trackUrl = data ? `${window.location.origin}/track?code=${encodeURIComponent(data.shipment.trackingNumber)}` : '';

  useEffect(() => {
    if (!trackUrl) return;
    QRCode.toDataURL(trackUrl, {
      width: 360,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#11194E', light: '#FFFFFF' },
    })
      .then(setQr)
      .catch(() => setQr(''));
  }, [trackUrl]);

  useEffect(() => {
    if (!data) return undefined;
    // becomes the suggested file name when saving as PDF
    document.title = `Invoice ${data.shipment.invoiceNumber} - ${data.settings.company_name}`;
    return () => {
      document.title = 'TheJordans Admin';
    };
  }, [data]);

  const toolbar = (
    <div className="invoice-toolbar">
      <Link to={`/shipments/${id}`} className="btn btn--ghost">
        <Icon name="back" size={16} />
        Back to shipment
      </Link>
      {data && (
        <button type="button" className="btn btn--primary" onClick={() => window.print()}>
          <Icon name="download" size={16} />
          Print / Save as PDF
        </button>
      )}
    </div>
  );

  if (error) {
    return (
      <div className="invoice-page">
        {toolbar}
        <div className="alert alert--error invoice-error">{error}</div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="boot">
        <span className="spinner" aria-label="Loading" />
      </div>
    );
  }

  const { shipment: s, settings: co } = data;
  const inv = s.invoice || {};
  const currency = inv.currency || co.currency || 'USD';
  const t = computeInvoice({ ...inv, taxRate: inv.taxRate ?? co.tax_rate });
  const money = (v) => formatMoney(v, currency);
  const statusKey = t.status.toLowerCase().replace(/\s+/g, '-');
  const companyLines = [co.company_address, co.company_phone, co.company_email, co.company_website].filter(Boolean);

  return (
    <div className="invoice-page">
      {toolbar}

      <article className="invoice">
        <header className="inv-top">
          <div className="inv-brand">
            <img src="/uploads/2026/02/logo-light.webp" alt={co.company_name} />
            <strong>{co.company_name}</strong>
            {companyLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <div className="inv-title">
            <h1>INVOICE</h1>
            <dl>
              <dt>Invoice no.</dt>
              <dd>{s.invoiceNumber}</dd>
              <dt>Issued</dt>
              <dd>{formatDate(s.createdAt)}</dd>
              <dt>Due</dt>
              <dd>{inv.dueDate ? formatDate(inv.dueDate) : 'On receipt'}</dd>
              <dt>Tracking no.</dt>
              <dd>{s.trackingNumber}</dd>
            </dl>
            <span className={`inv-status inv-status--${statusKey}`}>{t.status}</span>
          </div>
        </header>

        <div className="inv-body">
          <section className="inv-parties">
            <div>
              <p className="inv-label">Bill to</p>
              <strong>{s.sender?.name || '—'}</strong>
              {s.sender?.email && <p>{s.sender.email}</p>}
              {s.sender?.phone && <p>{s.sender.phone}</p>}
              <p>{s.origin}</p>
            </div>
            <div>
              <p className="inv-label">Ship to</p>
              <strong>{s.receiver?.name || '—'}</strong>
              {s.receiver?.address && <p>{s.receiver.address}</p>}
              {!s.receiver?.address && <p>{s.destination}</p>}
              {s.receiver?.phone && <p>{s.receiver.phone}</p>}
              {s.receiver?.email && <p>{s.receiver.email}</p>}
            </div>
            <div>
              <p className="inv-label">Shipment</p>
              <dl>
                <dt>Freight</dt>
                <dd>{s.freightType}</dd>
                {s.service && (
                  <>
                    <dt>Service</dt>
                    <dd>{s.service}</dd>
                  </>
                )}
                {s.weight && (
                  <>
                    <dt>Weight</dt>
                    <dd>{s.weight}</dd>
                  </>
                )}
                {s.dimensions && (
                  <>
                    <dt>Size</dt>
                    <dd>{s.dimensions}</dd>
                  </>
                )}
                {s.estimatedDelivery && (
                  <>
                    <dt>ETA</dt>
                    <dd>{formatDate(s.estimatedDelivery)}</dd>
                  </>
                )}
              </dl>
            </div>
          </section>

          <div className="inv-route">
            <span>{s.origin}</span>
            <span className="inv-route__line" aria-hidden="true" />
            <span>{s.destination}</span>
          </div>

          <table className="inv-items">
            <thead>
              <tr>
                <th className="inv-items__n">#</th>
                <th>Description</th>
                <th className="num">Qty</th>
                <th className="num">Unit price</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {t.items.length ? (
                t.items.map((it, i) => (
                  <tr key={i}>
                    <td className="inv-items__n">{String(i + 1).padStart(2, '0')}</td>
                    <td>{it.description || 'Charge'}</td>
                    <td className="num">{it.quantity}</td>
                    <td className="num">{money(it.unitPrice)}</td>
                    <td className="num">{money(it.amount)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="inv-items__empty">
                    No charges have been added to this shipment yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <section className="inv-bottom">
            <div className="inv-qr">
              {qr ? <img src={qr} alt={`QR code linking to tracking for ${s.trackingNumber}`} /> : <span className="inv-qr__placeholder" />}
              <div>
                <strong>Scan to track your shipment</strong>
                <p>Point your phone camera at the code to follow {s.trackingNumber} live on the map.</p>
                <code>{trackUrl}</code>
              </div>
            </div>

            <dl className="inv-totals">
              <div>
                <dt>Subtotal</dt>
                <dd>{money(t.subtotal)}</dd>
              </div>
              {t.discount > 0 && (
                <div>
                  <dt>Discount</dt>
                  <dd>−{money(t.discount)}</dd>
                </div>
              )}
              <div>
                <dt>Tax ({t.taxRate}%)</dt>
                <dd>{money(t.tax)}</dd>
              </div>
              <div className="inv-grand">
                <dt>Total</dt>
                <dd>{money(t.total)}</dd>
              </div>
              <div>
                <dt>Amount paid</dt>
                <dd>{money(t.paid)}</dd>
              </div>
              <div className="inv-balance">
                <dt>Balance due</dt>
                <dd>{money(t.balance)}</dd>
              </div>
            </dl>
          </section>

          <section className="inv-notes">
            <div>
              <p className="inv-label">Payment</p>
              <p>
                {inv.paymentMethod ? `Method: ${inv.paymentMethod}` : 'Contact us for payment details.'}
                {'\n'}Please quote invoice {s.invoiceNumber} with your payment.
              </p>
            </div>
            <div>
              <p className="inv-label">Notes &amp; terms</p>
              <p>{[inv.notes, co.invoice_terms].filter(Boolean).join('\n\n') || 'Thank you for your business.'}</p>
            </div>
          </section>
        </div>

        <footer className="inv-foot">
          <span>
            Thank you for shipping with <strong>{co.company_name}</strong>.
          </span>
          <span>{[co.company_phone, co.company_email].filter(Boolean).join('  ·  ')}</span>
        </footer>
      </article>
    </div>
  );
}
