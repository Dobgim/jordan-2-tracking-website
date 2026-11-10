import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AdminApp.jsx';
import { Icon } from '../ui.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <section className="login__panel" aria-hidden="true">
        <img src="/images/logo-light.webp" alt="" className="login__panel-logo" />
        <div>
          <p className="login__eyebrow">Operations console</p>
          <h2>Every shipment, quote and customer in one place.</h2>
          <p className="login__lede">
            Create shipments, watch them move on the live map, post tracking updates your customers see instantly, and
            issue invoices.
          </p>
        </div>
        <span className="login__stripe" />
      </section>

      <section className="login__form-wrap">
        <form className="login__card" onSubmit={submit} noValidate>
          <img src="/images/logo-light.webp" alt="TheJordans" className="login__logo" />
          <h1>Sign in to the dashboard</h1>
          <p className="muted">Use your administrator account.</p>

          {error && (
            <div className="alert alert--error" role="alert">
              {error}
            </div>
          )}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <div className="input-group">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button type="button" className="input-group__btn" onClick={() => setShowPassword((s) => !s)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={busy || !email || !password}>
            <Icon name="lock" size={16} />
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <a href="/" className="login__back">
            ← Back to the website
          </a>
        </form>
      </section>
    </div>
  );
}
