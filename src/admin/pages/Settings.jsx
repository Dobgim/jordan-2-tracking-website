import { useState } from 'react';
import { useResource } from '../api.js';
import { useAuth } from '../AdminApp.jsx';
import { changePassword, getSettings, grantAdmin, listAdmins, removeAdmin, saveSettings } from '../data.js';
import { ErrorBox, Icon, Loading, PageHeader, formatDate } from '../ui.jsx';

/* Everything configurable lives here and in the database - nothing is kept on a local machine. */
export default function Settings() {
  const settings = useResource(() => getSettings({ fresh: true }));

  return (
    <>
      <PageHeader title="Settings" subtitle="Your account, the tracking map, invoice details and administrators." />
      <div className="grid-2 grid-2--even">
        <div className="stack">
          <AccountCard />
          {settings.data ? <MapsCard initial={settings.data} /> : <LoadingCard title="Google Maps" state={settings} />}
          <AdminsCard />
        </div>
        <div className="stack">
          {settings.data ? <CompanyCard initial={settings.data} /> : <LoadingCard title="Company & invoices" state={settings} />}
        </div>
      </div>
    </>
  );
}

function LoadingCard({ title, state }) {
  return (
    <section className="card">
      <div className="card__head">
        <h2>{title}</h2>
      </div>
      <div className="card__body">{state.error ? <ErrorBox message={state.error} onRetry={state.reload} /> : <Loading />}</div>
    </section>
  );
}

function useSaver() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const run = async (fn, message) => {
    setBusy(true);
    setError('');
    setDone('');
    try {
      await fn();
      setDone(message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, done, setError, run };
}

function AccountCard() {
  const { user } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const saver = useSaver();
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (form.newPassword.length < 8) return saver.setError('The new password must be at least 8 characters.');
    if (form.newPassword !== form.confirm) return saver.setError('The new passwords do not match.');
    return saver.run(async () => {
      await changePassword(user.email, form.currentPassword, form.newPassword);
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    }, 'Password updated.');
  };

  return (
    <section className="card">
      <div className="card__head">
        <h2>Your account</h2>
        <span className="muted small">Admin since {formatDate(user.createdAt)}</span>
      </div>
      <form className="card__body stack stack--tight" onSubmit={submit}>
        <div className="field">
          <span>Email</span>
          <div className="readonly">{user.email}</div>
        </div>
        {saver.error && <ErrorBox message={saver.error} />}
        {saver.done && <div className="alert alert--success">{saver.done}</div>}
        <label className="field">
          <span>Current password</span>
          <input type="password" value={form.currentPassword} onChange={set('currentPassword')} autoComplete="current-password" required />
        </label>
        <div className="form-grid">
          <label className="field">
            <span>
              New password <em className="hint">8+ characters</em>
            </span>
            <input type="password" value={form.newPassword} onChange={set('newPassword')} autoComplete="new-password" required />
          </label>
          <label className="field">
            <span>Confirm new password</span>
            <input type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" required />
          </label>
        </div>
        <button type="submit" className="btn btn--primary" disabled={saver.busy}>
          <Icon name="lock" size={16} />
          {saver.busy ? 'Updating…' : 'Change password'}
        </button>
      </form>
    </section>
  );
}

function MapsCard({ initial }) {
  const [key, setKey] = useState(initial.google_maps_api_key || '');
  const saver = useSaver();

  const submit = (e) => {
    e.preventDefault();
    saver.run(() => saveSettings({ google_maps_api_key: key.trim() }), 'Saved. Reload the page for the map to use the new key.');
  };

  return (
    <section className="card">
      <div className="card__head">
        <h2>Google Maps</h2>
        <span className={`badge badge--${key ? 'ok' : 'bad'}`}>{key ? 'Configured' : 'Not set'}</span>
      </div>
      <form className="card__body stack stack--tight" onSubmit={submit}>
        {saver.error && <ErrorBox message={saver.error} />}
        {saver.done && <div className="alert alert--success">{saver.done}</div>}
        <label className="field">
          <span>API key</span>
          <input className="mono" value={key} onChange={(e) => setKey(e.target.value)} spellCheck={false} autoComplete="off" />
        </label>
        <p className="form-note">
          Used for the live tracking map, address lookup and road routes. It needs the Maps JavaScript, Geocoding and
          Directions APIs. Browsers can see this key, so in Google Cloud restrict it to your website's domain.
        </p>
        <button type="submit" className="btn btn--dark" disabled={saver.busy}>
          <Icon name="check" size={16} />
          {saver.busy ? 'Saving…' : 'Save key'}
        </button>
      </form>
    </section>
  );
}

function CompanyCard({ initial }) {
  const [form, setForm] = useState({
    company_name: initial.company_name || '',
    company_address: initial.company_address || '',
    company_phone: initial.company_phone || '',
    company_email: initial.company_email || '',
    company_website: initial.company_website || '',
    currency: initial.currency || 'USD',
    tax_rate: initial.tax_rate ?? 0,
    invoice_terms: initial.invoice_terms || '',
  });
  const saver = useSaver();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    saver.run(
      () =>
        saveSettings({
          ...form,
          currency: form.currency.trim().toUpperCase().slice(0, 3) || 'USD',
          tax_rate: Number(form.tax_rate) || 0,
        }),
      'Company details saved.'
    );
  };

  return (
    <section className="card">
      <div className="card__head">
        <h2>Company &amp; invoices</h2>
        <span className="muted small">Printed on every invoice</span>
      </div>
      <form className="card__body stack stack--tight" onSubmit={submit}>
        {saver.error && <ErrorBox message={saver.error} />}
        {saver.done && <div className="alert alert--success">{saver.done}</div>}
        <label className="field">
          <span>Company name</span>
          <input value={form.company_name} onChange={set('company_name')} required />
        </label>
        <label className="field">
          <span>Address</span>
          <textarea rows={2} value={form.company_address} onChange={set('company_address')} />
        </label>
        <div className="form-grid">
          <label className="field">
            <span>Phone</span>
            <input value={form.company_phone} onChange={set('company_phone')} />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" value={form.company_email} onChange={set('company_email')} />
          </label>
          <label className="field">
            <span>Website</span>
            <input value={form.company_website} onChange={set('company_website')} placeholder="www.example.com" />
          </label>
          <div className="form-grid">
            <label className="field">
              <span>Currency</span>
              <input className="mono" maxLength={3} value={form.currency} onChange={set('currency')} />
            </label>
            <label className="field">
              <span>Tax %</span>
              <input type="number" min="0" max="100" step="0.01" value={form.tax_rate} onChange={set('tax_rate')} />
            </label>
          </div>
        </div>
        <label className="field">
          <span>Invoice terms</span>
          <textarea rows={3} value={form.invoice_terms} onChange={set('invoice_terms')} />
        </label>
        <p className="form-note">Currency and tax rate are the defaults for new shipments; each invoice can override them.</p>
        <button type="submit" className="btn btn--dark" disabled={saver.busy}>
          <Icon name="check" size={16} />
          {saver.busy ? 'Saving…' : 'Save details'}
        </button>
      </form>
    </section>
  );
}

function AdminsCard() {
  const { user } = useAuth();
  const admins = useResource(listAdmins);
  const [email, setEmail] = useState('');
  const saver = useSaver();

  const grant = (e) => {
    e.preventDefault();
    saver.run(async () => {
      await grantAdmin(email.trim());
      setEmail('');
      await admins.reload();
    }, 'Admin access granted.');
  };

  const revoke = (a) => {
    if (!window.confirm(`Remove admin access for ${a.email}?`)) return;
    saver.run(async () => {
      await removeAdmin(a.user_id);
      await admins.reload();
    }, 'Admin access removed.');
  };

  return (
    <section className="card">
      <div className="card__head">
        <h2>Administrators</h2>
        <span className="muted small">{admins.data?.length ?? '…'} total</span>
      </div>
      <div className="card__body stack stack--tight">
        {saver.error && <ErrorBox message={saver.error} />}
        {saver.done && <div className="alert alert--success">{saver.done}</div>}
        {admins.error ? (
          <ErrorBox message={admins.error} onRetry={admins.reload} />
        ) : !admins.data ? (
          <Loading />
        ) : (
          <ul className="admins">
            {admins.data.map((a) => (
              <li key={a.user_id}>
                <div>
                  <strong>{a.email}</strong>
                  <div className="muted small">Added {formatDate(a.created_at)}</div>
                </div>
                {a.user_id === user.id ? (
                  <span className="badge badge--neutral">You</span>
                ) : (
                  <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => revoke(a)} disabled={saver.busy}>
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <form className="field" onSubmit={grant}>
          <span>Give admin access</span>
          <div className="inline-form">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="person@company.com" required />
            <button type="submit" className="btn btn--dark" disabled={saver.busy || !email}>
              Grant
            </button>
          </div>
        </form>
        <p className="form-note">
          First create the person's login in Supabase (Authentication → Users → Add user, tick “Auto confirm”), then grant
          access here with the same email.
        </p>
      </div>
    </section>
  );
}
