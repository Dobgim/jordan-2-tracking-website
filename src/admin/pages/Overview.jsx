import { Link, useNavigate } from 'react-router-dom';
import { useResource } from '../api.js';
import { useAuth } from '../AdminApp.jsx';
import { deleteShipment, getStats } from '../data.js';
import { EmptyState, ErrorBox, Icon, Loading, PageHeader, QuoteBadge, STATUSES, StatusBadge, formatDate } from '../ui.jsx';

export default function Overview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useResource(getStats);

  const remove = async (s) => {
    if (!window.confirm(`Delete shipment ${s.trackingNumber}? Customers will no longer be able to track it.`)) return;
    try {
      await deleteShipment(s.id);
      reload();
    } catch (err) {
      window.alert(err.message);
    }
  };

  const header = (
    <PageHeader
      title="Welcome back"
      subtitle={`Signed in as ${user.email}. Here's what is moving today.`}
      actions={
        <Link to="/shipments/new" className="btn btn--primary">
          <Icon name="plus" size={16} />
          Create New Shipment
        </Link>
      }
    />
  );

  if (loading && !data) return <>{header}<Loading /></>;
  if (error) return <>{header}<ErrorBox message={error} onRetry={reload} /></>;

  const { totals, byStatus, recentShipments, recentQuotes } = data;
  const maxStatus = Math.max(1, ...Object.values(byStatus));

  const cards = [
    { label: 'Total shipments', value: totals.shipments, icon: 'box', tone: 'navy', to: '/shipments' },
    { label: 'On the move', value: totals.active, icon: 'truck', tone: 'blue', to: '/shipments' },
    { label: 'Delivered', value: totals.delivered, icon: 'check', tone: 'green', to: '/shipments' },
    { label: 'New quote requests', value: totals.newQuotes, icon: 'quote', tone: 'red', to: '/quotes' },
    { label: 'Subscribers', value: totals.subscribers, icon: 'users', tone: 'amber', to: '/subscribers' },
  ];

  return (
    <>
      {header}

      <div className="stats">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="card stat">
            <span className={`stat__icon stat__icon--${c.tone}`}>
              <Icon name={c.icon} />
            </span>
            <span className="stat__value">{c.value}</span>
            <span className="stat__label">{c.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card__head">
            <h2>Recent shipments</h2>
            <Link to="/shipments" className="link-arrow">
              View all <Icon name="arrow" size={14} />
            </Link>
          </div>
          {recentShipments.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tracking ID</th>
                    <th>Destination</th>
                    <th>Status</th>
                    <th className="row-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentShipments.map((s) => (
                    <tr key={s.id} className="is-clickable" onClick={() => navigate(`/shipments/${s.id}`)}>
                      <td className="mono strong">{s.trackingNumber}</td>
                      <td>
                        <span className="route" title={`${s.origin} → ${s.destination}`}>
                          {s.destination}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                        <Link to={`/shipments/${s.id}`} className="icon-btn" title="Edit" aria-label={`Edit ${s.trackingNumber}`}>
                          <Icon name="edit" size={16} />
                        </Link>
                        <a
                          href={`/track?code=${encodeURIComponent(s.trackingNumber)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="icon-btn"
                          title="View tracking page"
                          aria-label={`View tracking page for ${s.trackingNumber}`}
                        >
                          <Icon name="external" size={16} />
                        </a>
                        <button
                          type="button"
                          className="icon-btn icon-btn--danger"
                          title="Delete"
                          aria-label={`Delete ${s.trackingNumber}`}
                          onClick={() => remove(s)}
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon="truck" title="No shipments yet">
              <Link to="/shipments/new">Create your first shipment</Link> to start tracking.
            </EmptyState>
          )}
        </section>

        <div className="stack">
          <section className="card">
            <div className="card__head">
              <h2>Shipments by status</h2>
            </div>
            <div className="card__body bars">
              {STATUSES.map((s) => (
                <div key={s} className="bar">
                  <span className="bar__label">{s}</span>
                  <span className="bar__track">
                    <span className="bar__fill" style={{ width: `${(byStatus[s] / maxStatus) * 100}%` }} />
                  </span>
                  <span className="bar__value">{byStatus[s]}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <h2>Latest quote requests</h2>
              <Link to="/quotes" className="link-arrow">
                View all <Icon name="arrow" size={14} />
              </Link>
            </div>
            {recentQuotes.length ? (
              <ul className="list">
                {recentQuotes.map((q) => (
                  <li key={q.id}>
                    <div>
                      <strong>{q.name}</strong>
                      <span className="muted small">
                        {[q.origin, q.destination].filter(Boolean).join(' → ') || q.email}
                      </span>
                    </div>
                    <div className="list__meta">
                      <QuoteBadge status={q.status} />
                      <span className="muted small">{formatDate(q.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="quote" title="No quote requests yet">
                Requests sent from the website's quote form appear here.
              </EmptyState>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
