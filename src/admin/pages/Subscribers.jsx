import { useState } from 'react';
import { useResource } from '../api.js';
import { deleteSubscriber, listSubscribers } from '../data.js';
import { EmptyState, ErrorBox, Icon, Loading, PageHeader, formatDate } from '../ui.jsx';

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export default function Subscribers() {
  const { data, error, loading, reload } = useResource(listSubscribers);
  const [actionError, setActionError] = useState('');
  const subscribers = data || [];

  const exportCsv = () => {
    const rows = [['email', 'subscribed_at'], ...subscribers.map((s) => [s.email, s.createdAt])];
    const blob = new Blob([rows.map((r) => r.map(csvCell).join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thejordans-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const remove = async (s) => {
    if (!window.confirm(`Remove ${s.email} from the list?`)) return;
    setActionError('');
    try {
      await deleteSubscriber(s.id);
      reload();
    } catch (err) {
      setActionError(err.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Subscribers"
        subtitle="Newsletter sign-ups from the website footer."
        actions={
          <button type="button" className="btn btn--ghost" onClick={exportCsv} disabled={!subscribers.length}>
            <Icon name="download" size={16} />
            Export CSV
          </button>
        }
      />

      {actionError && <ErrorBox message={actionError} />}

      <section className="card">
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <div className="card__body">
            <ErrorBox message={error} onRetry={reload} />
          </div>
        ) : !subscribers.length ? (
          <EmptyState icon="mail" title="No subscribers yet">
            Email addresses entered in the footer sign-up form appear here.
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Subscribed</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {subscribers.map((s) => (
                  <tr key={s.id}>
                    <td className="strong">
                      <a href={`mailto:${s.email}`}>{s.email}</a>
                    </td>
                    <td className="muted">{formatDate(s.createdAt, true)}</td>
                    <td className="row-actions">
                      <button
                        type="button"
                        className="icon-btn icon-btn--danger"
                        onClick={() => remove(s)}
                        aria-label={`Remove ${s.email}`}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
