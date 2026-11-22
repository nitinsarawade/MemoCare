import ThemeToggle from '../../theme/ThemeToggle';
import './auth.css';
import Logo from '../../components/brand/Logo';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <>
    <ThemeToggle floating />
    <div className="auth-page">
      <div className="auth-hero">
        <div className="auth-hero-inner">
          <div className="auth-brand">
            <Logo variant="dark-bg" height={38} />
            <span className="brand-name">MemoCare</span>
          </div>
          <h1>Cognitive-health screening, grounded in real speech.</h1>
          <p>
            MemoCare turns a short recorded voice sample into transparent, explainable risk indicators —
            built to support families and clinicians, never to replace a diagnosis.
          </p>
          <ul className="auth-hero-points">
            <li>Speech &amp; language analysis from real transcription</li>
            <li>Screening tests scored server-side, never gameable</li>
            <li>Role-aware views for family, caretakers, and hospital staff</li>
          </ul>
        </div>
      </div>
      <div className="auth-form-side">
        <div className="auth-form-card">
          <h2>{title}</h2>
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          {children}
          {footer && <div className="auth-footer">{footer}</div>}
        </div>
      </div>
    </div>
    </>
  );
}
