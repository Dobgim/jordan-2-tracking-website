import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { Icon } from './ui.jsx';
import Login from './pages/Login.jsx';
import Overview from './pages/Overview.jsx';
import Shipments from './pages/Shipments.jsx';
import ShipmentForm from './pages/ShipmentForm.jsx';
import Invoice from './pages/Invoice.jsx';
import Quotes from './pages/Quotes.jsx';
import Subscribers from './pages/Subscribers.jsx';
import Settings from './pages/Settings.jsx';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const NAV = [
  { to: '/', label: 'Overview', icon: 'dashboard', end: true },
  { to: '/shipments', label: 'Shipments', icon: 'truck' },
  { to: '/quotes', label: 'Quote requests', icon: 'quote' },
  { to: '/subscribers', label: 'Subscribers', icon: 'mail' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

/** The signed-in user if they are listed in public.admins, otherwise null. */
async function loadAdmin(session) {
  if (!session) return null;
  const { data, error } = await supabase
    .from('admins')
    .select('email, created_at')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (error || !data) return null;
  return { id: session.user.id, email: data.email || session.user.email, createdAt: data.created_at };
}

export default function AdminApp() {
  // undefined while the session check is in flight, null when signed out
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const admin = await loadAdmin(data.session);
      if (data.session && !admin) await supabase.auth.signOut();
      if (active) setUser(admin);
    });
    // expired refresh token, sign-out in another tab, ...
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setUser(null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const auth = {
    user,
    login: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw new Error(
          /invalid login credentials/i.test(error.message) ? 'Incorrect email or password.' : error.message
        );
      }
      const admin = await loadAdmin(data.session);
      if (!admin) {
        await supabase.auth.signOut();
        throw new Error("This account doesn't have admin access.");
      }
      setUser(admin);
    },
    logout: async () => {
      await supabase.auth.signOut();
      setUser(null);
    },
  };

  if (user === undefined) {
    return (
      <div className="boot">
        <span className="spinner" aria-label="Loading" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={auth}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/shipments/:id/invoice" element={user ? <Invoice /> : <RedirectToLogin />} />
        <Route element={user ? <Layout /> : <RedirectToLogin />}>
          <Route index element={<Overview />} />
          <Route path="shipments" element={<Shipments />} />
          <Route path="shipments/new" element={<ShipmentForm key="new" />} />
          <Route path="shipments/:id" element={<KeyedShipmentForm />} />
          <Route path="quotes" element={<Quotes />} />
          <Route path="subscribers" element={<Subscribers />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}

function RedirectToLogin() {
  const location = useLocation();
  return <Navigate to="/login" replace state={{ from: location }} />;
}

// remount the form when moving between shipments so its state starts fresh
function KeyedShipmentForm() {
  const { id } = useParams();
  return <ShipmentForm key={id} />;
}

function Layout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className={`shell${menuOpen ? ' shell--menu' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar__brand">
          <img src="/uploads/2026/02/logo-light.webp" alt="TheJordans" />
          <span className="sidebar__tag">Admin</span>
        </div>
        <nav className="sidebar__nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `navlink${isActive ? ' is-active' : ''}`}
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__foot">
          <a className="navlink" href="/" target="_blank" rel="noreferrer">
            <Icon name="external" />
            View website
          </a>
        </div>
      </aside>

      <div className="scrim" onClick={() => setMenuOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button type="button" className="icon-btn topbar__menu" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Icon name="menu" />
          </button>
          <div className="topbar__spacer" />
          <div className="topbar__user">
            <span className="avatar">{user.email[0].toUpperCase()}</span>
            <span>{user.email}</span>
          </div>
          <button type="button" className="btn btn--ghost btn--sm" onClick={logout}>
            <Icon name="logout" size={16} />
            Sign out
          </button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
