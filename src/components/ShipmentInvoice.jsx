import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import './shipmentInvoice.css';

/*
 * Shipment invoice - generated from the shipment itself, shown on the public
 * tracking page and in the admin. Carries a QR code that opens the live
 * tracking page, and downloads as an A4 PDF (libraries load on first click).
 */

const fmtDate = (iso, withTime = false) => {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
};

/** Code 128 barcode of the tracking number, as a PNG data URL. */
function barcodeFor(code) {
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, code, { format: 'CODE128', width: 2, height: 64, margin: 0, displayValue: false, lineColor: '#11194E' });
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

function Party({ label, party = {}, place }) {
  const rows = [
    ['Address', party.address || place],
    ['Phone', party.phone],
    ['Email', party.email],
  ].filter(([, v]) => v);
  return (
    <div>
      <p className="sinv-label">{label}</p>
      <strong>{party.name || '—'}</strong>
      <dl>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export const trackUrlFor = (code) => `${window.location.origin}/track?code=${encodeURIComponent(code)}`;

export default function ShipmentInvoice({ shipment: s, company = {} }) {
  const sheet = useRef(null);
  const [qr, setQr] = useState('');
  const [barcode, setBarcode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const trackUrl = trackUrlFor(s.trackingNumber);
  const companyName = company.name || 'TheJordans Logistics & Freight';

  useEffect(() => {
    QRCode.toDataURL(trackUrl, { width: 360, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#11194E', light: '#FFFFFF' } })
      .then(setQr)
      .catch(() => setQr(''));
    setBarcode(barcodeFor(s.trackingNumber));
  }, [trackUrl, s.trackingNumber]);

  const download = async () => {
    setBusy(true);
    setError('');
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')]);
      const canvas = await html2canvas(sheet.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        windowWidth: 1200, // always lay the PDF out like a desktop A4 page
        onclone: (doc) => {
          const el = doc.querySelector('[data-invoice-sheet]');
          if (el) el.classList.add('sinv--pdf');
        },
      });
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
      const pageW = 210;
      const pageH = 297;
      let w = pageW;
      let h = (canvas.height * w) / canvas.width;
      if (h > pageH) {
        h = pageH;
        w = (canvas.width * h) / canvas.height;
      }
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', (pageW - w) / 2, 0, w, h);
      pdf.save(`Invoice-${s.invoiceNumber || s.trackingNumber}.pdf`);
    } catch {
      setError('The PDF could not be created on this device. Use Print instead and choose “Save as PDF”.');
    } finally {
      setBusy(false);
    }
  };

  const details = [
    ['Freight', s.freightType],
    ['Service', s.service || 'Standard'],
    ['Piece type', s.pieceType],
    ['Weight', s.weight],
    ['Dimensions', s.dimensions],
    ['Ship date', fmtDate(s.departureAt || s.createdAt)],
    ['Expected delivery', [fmtDate(s.estimatedDelivery), s.estimatedDeliveryTime].filter(Boolean).join(', ')],
  ].filter(([, v]) => v);
  const companyLines = [company.address, company.phone, company.email, company.website].filter(Boolean);
  const statusKey = (s.status || '').toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="sinv-wrap">
      <div className="sinv-actions">
        <button type="button" className="sinv-btn sinv-btn--primary" onClick={download} disabled={busy}>
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
          </svg>
          {busy ? 'Preparing PDF…' : 'Download invoice (PDF)'}
        </button>
        <button type="button" className="sinv-btn" onClick={() => window.print()}>
          Print
        </button>
      </div>
      {error && <p className="sinv-error">{error}</p>}

      <article className="sinv" ref={sheet} data-invoice-sheet>
        <header className="sinv-top">
          <div className="sinv-brand">
            <img src="/images/logo-light.webp" alt="" crossOrigin="anonymous" />
            <strong>{companyName}</strong>
            {companyLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
          <div className="sinv-title">
            <h2>INVOICE</h2>
            <dl>
              <dt>Invoice no.</dt>
              <dd>{s.invoiceNumber || '—'}</dd>
              <dt>Issued</dt>
              <dd>{fmtDate(s.createdAt)}</dd>
              <dt>Tracking no.</dt>
              <dd>{s.trackingNumber}</dd>
            </dl>
            <span className={`sinv-status sinv-status--${statusKey}`}>{s.status}</span>
          </div>
        </header>

        <div className="sinv-body">
          <section className="sinv-parties">
            <Party label="Sender information" party={s.sender} place={s.origin} />
            <Party label="Receiver information" party={s.receiver} place={s.destination} />
          </section>

          <div className="sinv-route">
            <div>
              <p className="sinv-label">Origin</p>
              <strong>{s.origin}</strong>
            </div>
            <span className="sinv-route__line" aria-hidden="true">
              <i />
            </span>
            <div className="sinv-route__end">
              <p className="sinv-label">Destination</p>
              <strong>{s.destination}</strong>
            </div>
          </div>

          <table className="sinv-table">
            <thead>
              <tr>
                <th>Shipment details</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {details.map(([k, v]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>{v}</td>
                </tr>
              ))}
              {s.packageDescription && (
                <tr>
                  <td>Package contents</td>
                  <td>{s.packageDescription}</td>
                </tr>
              )}
            </tbody>
          </table>

          <section className="sinv-qr">
            {qr ? <img src={qr} alt={`QR code for tracking ${s.trackingNumber}`} /> : <span className="sinv-qr__ph" />}
            <div className="sinv-qr__text">
              <strong>Scan to track your shipment</strong>
              <p>Point your phone camera at the QR code to follow {s.trackingNumber} live on the map.</p>
              <code>{trackUrl}</code>
            </div>
            {barcode && (
              <div className="sinv-barcode">
                <img src={barcode} alt={`Barcode ${s.trackingNumber}`} />
                <span>{s.trackingNumber}</span>
              </div>
            )}
          </section>

          {company.terms && (
            <section className="sinv-terms">
              <p className="sinv-label">Notes &amp; terms</p>
              <p>{company.terms}</p>
            </section>
          )}
        </div>

        <footer className="sinv-foot">
          <span>
            Thank you for shipping with <strong>{companyName}</strong>.
          </span>
          <span>{[company.phone, company.email].filter(Boolean).join('  ·  ')}</span>
        </footer>
      </article>
    </div>
  );
}
