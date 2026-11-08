import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResource } from '../api.js';
import { deleteQuote, listQuotes, setQuoteStatus } from '../data.js';
import { EmptyState, ErrorBox, Icon, Loading, PageHeader, QUOTE_STATUSES, QuoteBadge, formatDate, quoteLabel } from '../ui.jsx';

export default function Quotes() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useResource(listQuotes);
  const [filter, setFilter] = useState('new');
  const [actionError, setActionError] = useState('');

  const quotes = data || [];
  const counts = Object.fromEntries(QUOTE_STATUSES.map((s) => [s, quotes.filter((q) => q.status === s).length]));
  const visible = filter === 'all' ? quotes : quotes.filter((q) => q.status === filter);

  const changeStatus = async (q, status) => {
    setActionError('');
    try {
      await setQuoteStatus(q.id, status);
      reload();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const remove = async (q) => {
    if (!window.confirm(`Delete the quote request from ${q.name}?`)) return;
    setActionError('');
    try {
      await deleteQuote(q.id);
      reload();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const tabs = [...QUOTE_STATUSES.map((s) => [s, quoteLabel(s), counts[s]]), ['all', 'All', quotes.length]];

  return (
    <>
      <PageHeader title="Quote requests" subtitle="Sent from the “Request a quote” form on the website." />

      <div className="tabs" role="tablist">
        {tabs.map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            className={`tab${filter === key ? ' is-active' : ''}`}
            onClick={() => setFilter(key)}
          >
            {label}
            <span className="tab__count">{count}</span>
          </button>
        ))}
      </div>

      {actionError && <ErrorBox message={actionError} />}

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !visible.length ? (
        <section className="card">
          <EmptyState icon="quote" title={quotes.length ? 'Nothing in this list' : 'No quote requests yet'}>
            {quotes.length
              ? 'Pick another tab to see the rest.'
              : 'When visitors send the quote form on the website, their requests show up here.'}
          </EmptyState>
        </section>
      ) : (
        <div className="quote-list">
          {visible.map((q) => (
            <article key={q.id} className="card quote">
              <header className="quote__head">
                <div>
                  <h2>{q.name}</h2>
                  <span className="muted small">Received {formatDate(q.createdAt, true)}</span>
                </div>
                <QuoteBadge status={q.status} />
              </header>

              <dl className="quote__details">
                <div>
                  <dt>Email</dt>
                  <dd>
                    <a href={`mailto:${q.email}`}>{q.email}</a>
                  </dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>
                    <a href={`tel:${q.phone}`}>{q.phone}</a>
                  </dd>
                </div>
                <div>
                  <dt>Route</dt>
                  <dd>{[q.origin, q.destination].filter(Boolean).join(' → ') || '—'}</dd>
                </div>
                <div>
                  <dt>Freight</dt>
                  <dd>{q.freightType || '—'}</dd>
                </div>
                <div>
                  <dt>Incoterms</dt>
                  <dd>{q.incoterms || '—'}</dd>
                </div>
                <div>
                  <dt>Dimensions</dt>
                  <dd>{q.dimensions || '—'}</dd>
                </div>
                <div>
                  <dt>Service</dt>
                  <dd>{q.service || '—'}</dd>
                </div>
              </dl>

              <footer className="quote__actions">
                <label className="inline-field">
                  <span className="muted small">Status</span>
                  <select className="input select-sm" value={q.status} onChange={(e) => changeStatus(q, e.target.value)}>
                    {QUOTE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {quoteLabel(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="quote__buttons">
                  <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => remove(q)}>
                    <Icon name="trash" size={14} />
                    Delete
                  </button>
                  <button
                    type="button"
                    className="btn btn--dark btn--sm"
                    onClick={() => navigate('/shipments/new', { state: { fromQuote: q } })}
                  >
                    <Icon name="truck" size={14} />
                    Create shipment
                  </button>
                </div>
              </footer>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
