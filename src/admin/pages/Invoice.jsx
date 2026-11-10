import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ShipmentInvoice from '../../components/ShipmentInvoice.jsx';
import { getSettings, getShipment } from '../data.js';
import { Icon } from '../ui.jsx';

/* The same invoice customers see on the tracking page, with download + print. */
export default function Invoice() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getShipment(id), getSettings()])
      .then(([shipment, settings]) => active && setData({ shipment, settings }))
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [id]);

  const co = data?.settings || {};
  return (
    <div className="invoice-admin">
      <Link to={`/shipments/${id}`} className="btn btn--ghost" style={{ marginBottom: 16 }}>
        <Icon name="back" size={16} />
        Back to shipment
      </Link>
      {error && <div className="alert alert--error">{error}</div>}
      {!data && !error && (
        <div className="state">
          <span className="spinner" aria-label="Loading" />
        </div>
      )}
      {data && (
        <ShipmentInvoice
          shipment={data.shipment}
          company={{
            name: co.company_name,
            address: co.company_address,
            phone: co.company_phone,
            email: co.company_email,
            website: co.company_website,
            terms: co.invoice_terms,
          }}
        />
      )}
    </div>
  );
}
