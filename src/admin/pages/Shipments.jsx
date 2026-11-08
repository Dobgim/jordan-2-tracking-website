import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useResource } from '../api.js';
import { deleteShipment, listShipments } from '../data.js';
import { EmptyState, ErrorBox, Icon, Loading, PageHeader, STATUSES, StatusBadge, formatDate } from '../ui.jsx';

export default function Shipments() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useResource(listShipments);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [actionError, setActionError] = useState('');

  const shipments = data || [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shipments.filter((s) => {
      if (status && s.status !== status) return false;
      if (!q) return true;
      return [s.trackingNumber, s.invoiceNumber, s.origin, s.destination, s.sender?.name, s.receiver?.name, s.receiver?.email]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q));
    });
  }, [shipments, query, status]);

  const remove = async (e, s) => {
    e.stopPropagation();
    if (!window.confirm(`Delete shipment ${s.trackingNumber}? Customers will no longer be able to track it.`)) return;
    setActionError('');
    try {
      await deleteShipment(s.id);
      reload();
    } catch (err) {
      setActionError(err.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Shipments"
        subtitle="Everything customers can track on the website."
        actions={
          <Link to="/shipments/new" className="btn btn--primary">
            <Icon name="plus" size={16} />
            New shipment
          </Link>
        }
      />

      {actionError && <ErrorBox message={actionError} />}

      <section className="card">
        <div className="toolbar">
          <label className="search">
            <Icon name="search" size={16} />
            <input
              type="search"
              placeholder="Search tracking #, invoice #, city or customer…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search shipments"
            />
          </label>
          <select className="input select-sm" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <span className="muted small toolbar__count">
            {filtered.length} of {shipments.length}
          </span>
        </div>

        {loading && !data ? (
          <Loading />
        ) : error ? (
          <div className="card__body">
            <ErrorBox message={error} onRetry={reload} />
          </div>
        ) : !shipments.length ? (
          <EmptyState icon="truck" title="No shipments yet">
            <Link to="/shipments/new">Create a shipment</Link> and share its tracking number with your customer.
          </EmptyState>
        ) : !filtered.length ? (
          <EmptyState icon="search" title="No matches">
            Try a different search or status.
          </EmptyState>
        ) : (
          <>
          {/* phones: one tappable card per shipment */}
          <ul className="ship-cards">
            {filtered.map((s) => (
              <li key={s.id}>
                <Link to={`/shipments/${s.id}`} className="ship-card">
                  <span className="ship-card__top">
                    <span className="mono strong">{s.trackingNumber}</span>
                    <StatusBadge status={s.status} />
                  </span>
                  <span className="ship-card__route">
                    {s.origin} <Icon name="arrow" size={12} /> {s.destination}
                  </span>
                  <span className="ship-card__meta">
                    <span>{s.receiver?.name || 'No receiver'}</span>
                    <span>Updated {formatDate(s.updatedAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="table-wrap shipments-table">
            <table>
              <thead>
                <tr>
                  <th>Tracking #</th>
                  <th>Receiver</th>
                  <th>Route</th>
                  <th>Freight</th>
                  <th>Status</th>
                  <th>Est. delivery</th>
                  <th>Updated</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="is-clickable" onClick={() => navigate(`/shipments/${s.id}`)}>
                    <td className="mono strong">{s.trackingNumber}</td>
                    <td>
                      <div className="strong">{s.receiver?.name || '—'}</div>
                      {s.receiver?.email && <div className="muted small">{s.receiver.email}</div>}
                    </td>
                    <td>
                      <span className="route">
                        {s.origin} <Icon name="arrow" size={12} /> {s.destination}
                      </span>
                    </td>
                    <td className="nowrap">{s.freightType || '—'}</td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="nowrap">{formatDate(s.estimatedDelivery)}</td>
                    <td className="muted nowrap">{formatDate(s.updatedAt)}</td>
                    <td className="row-actions">
                      <Link
                        to={`/shipments/${s.id}/invoice`}
                        className="icon-btn"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Invoice for ${s.trackingNumber}`}
                        title="Invoice"
                      >
                        <Icon name="quote" size={16} />
                      </Link>
                      <Link
                        to={`/shipments/${s.id}`}
                        className="icon-btn"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Edit ${s.trackingNumber}`}
                        title="Edit"
                      >
                        <Icon name="edit" size={16} />
                      </Link>
                      <button
                        type="button"
                        className="icon-btn icon-btn--danger"
                        onClick={(e) => remove(e, s)}
                        aria-label={`Delete ${s.trackingNumber}`}
                        title="Delete"
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
    </>
  );
}
