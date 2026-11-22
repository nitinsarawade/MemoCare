import './ui.css';

export function Button({ variant = 'primary', size = 'md', as: As = 'button', loading, children, disabled, ...rest }) {
  return (
    <As className={`btn btn-${variant} btn-${size}`} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="btn-spinner" aria-hidden="true" /> : null}
      <span className={loading ? 'btn-label-loading' : undefined}>{children}</span>
    </As>
  );
}

export function IconButton({ label, children, ...rest }) {
  return (
    <button className="icon-btn" aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}

export function Card({ children, className = '', as: As = 'div', ...rest }) {
  return (
    <As className={`card ${className}`} {...rest}>
      {children}
    </As>
  );
}

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p className="page-header-desc">{description}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}

const RISK_LABEL = { LOW: 'Low risk', MODERATE: 'Moderate risk', HIGH: 'High risk' };

export function RiskBadge({ level, size = 'md' }) {
  const key = (level || 'UNKNOWN').toUpperCase();
  const label = RISK_LABEL[key] || 'Not yet assessed';
  return (
    <span className={`risk-badge risk-${key.toLowerCase()} risk-${size}`}>
      <span className="risk-dot" />
      {label}
    </span>
  );
}

const STATUS_TONE = {
  success: 'tone-success',
  warning: 'tone-warning',
  danger: 'tone-danger',
  neutral: 'tone-neutral',
  info: 'tone-info',
};

export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge ${STATUS_TONE[tone] || STATUS_TONE.neutral}`}>{children}</span>;
}

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="spinner-block" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function LoadingState({ label = 'Loading…', rows = 3 }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="skeleton-line" key={i} style={{ width: `${88 - i * 14}%` }} />
      ))}
      <span className="visually-hidden">{label}</span>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = "Something didn't load" }) {
  const message = error?.message || 'An unexpected error occurred.';
  const isForbidden = error?.isForbidden;
  return (
    <div className="error-state">
      <h3>{isForbidden ? "You don't have access to this" : title}</h3>
      <p>{isForbidden ? "Your account role doesn't include this feature." : message}</p>
      {onRetry && !isForbidden && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Forbidden({ message = "You don't have access to this." }) {
  return (
    <div className="error-state">
      <h3>Access restricted</h3>
      <p>{message}</p>
    </div>
  );
}

export function FieldError({ children }) {
  if (!children) return null;
  return <div className="field-error">{children}</div>;
}

export function FormRow({ label, htmlFor, error, hint, children }) {
  return (
    <div className="form-row">
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {hint && !error && <div className="field-hint">{hint}</div>}
      <FieldError>{error}</FieldError>
    </div>
  );
}
