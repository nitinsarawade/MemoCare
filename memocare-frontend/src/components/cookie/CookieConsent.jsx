import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import './cookieConsent.css';

const STORAGE_KEY = 'memocare-cookie-consent';

/**
 * One-time cookie consent banner. The "essential only" choice refuses
 * nothing extra — MemoCare has no tracking cookies at all — it simply
 * records a narrower consent for future, optional cookies.
 */
export default function CookieConsent() {
  // Initial state read straight from localStorage so the banner never
  // flashes for users who already decided.
  const [decision] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });
  const [decided, setDecided] = useState(null);

  if (decision || decided) return null;

  const choose = (value) => {
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* private mode: banner just reappears next visit */ }
    setDecided(value);
  };

  return (
    <aside className="cookie-banner" role="dialog" aria-label="Cookie preferences">
      <div className="cookie-banner-text">
        <Cookie size={20} style={{ flexShrink: 0, marginTop: 2 }} />
        <p>
          <strong>We use minimal cookies.</strong> Only what's needed to keep you signed in and to
          remember this choice — no ads, no tracking. Read our{' '}
          <Link to="/cookies">Cookie Policy</Link>.
        </p>
      </div>
      <div className="cookie-banner-actions">
        <button type="button" className="cookie-btn cookie-btn-secondary" onClick={() => choose('essential')}>
          Essential only
        </button>
        <button type="button" className="cookie-btn cookie-btn-primary" onClick={() => choose('accepted')}>
          Accept all
        </button>
      </div>
    </aside>
  );
}
