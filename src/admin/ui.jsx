/* Shared building blocks for the admin screens. */

export const STATUSES = ['Pending', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'On Hold', 'Cancelled'];
export const FREIGHT_TYPES = ['Truck Freight', 'Ship Freight', 'Train Freight', 'Plane Freight'];
export const SERVICES = ['Fragile', 'Express', 'Insurance', 'Packaging'];
export const QUOTE_STATUSES = ['new', 'contacted', 'closed'];

const STATUS_TONE = {
  Pending: 'neutral',
  'Picked Up': 'info',
  'In Transit': 'info',
  'Out for Delivery': 'warn',
  Delivered: 'ok',
  'On Hold': 'warn',
  Cancelled: 'bad',
};
const QUOTE_TONE = { new: 'bad', contacted: 'info', closed: 'neutral' };
const QUOTE_LABEL = { new: 'New', contacted: 'Contacted', closed: 'Closed' };

export const quoteLabel = (s) => QUOTE_LABEL[s] || s;

export function StatusBadge({ status }) {
  return <span className={`badge badge--${STATUS_TONE[status] || 'neutral'}`}>{status}</span>;
}

export function QuoteBadge({ status }) {
  return <span className={`badge badge--${QUOTE_TONE[status] || 'neutral'}`}>{quoteLabel(status)}</span>;
}

export function formatDate(iso, withTime = false) {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="page-head">
      <div>
        {back}
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-head__actions">{actions}</div>}
    </div>
  );
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="state">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="alert alert--error">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = 'box', title, children }) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <Icon name={icon} />
      </span>
      <strong>{title}</strong>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}

const ICONS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  box: (
    <>
      <path d="M21 8l-9-5-9 5 9 5 9-5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </>
  ),
  quote: (
    <>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
      <path d="M8 13h8M8 17h5" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  settings: (
    <>
      <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
      <circle cx="15" cy="6" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  external: (
    <>
      <path d="M15 3h6v6" />
      <path d="M10 14L21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </>
  ),
  back: <path d="M19 12H5M12 19l-7-7 7-7" />,
  truck: (
    <>
      <path d="M3 6h11v10H3z" />
      <path d="M14 10h4l3 3v3h-7" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  check: <path d="M20 6L9 17l-5-5" />,
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0" />
      <path d="M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-5-6.7" />
    </>
  ),
  arrow: <path d="M5 12h14M13 5l7 7-7 7" />,
  download: (
    <>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M4 21h16" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
};

export function Icon({ name, size = 18 }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}
