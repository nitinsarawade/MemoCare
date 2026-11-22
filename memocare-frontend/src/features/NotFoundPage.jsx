import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/primitives';
import { useDocumentMeta } from '../components/seo/DocumentMeta';
import '../features/notfound.css';

export default function NotFoundPage() {
  useDocumentMeta({ title: 'Page not found — MemoCare', description: "We couldn't find the page you were looking for." });

  return (
    <div className="nf-wrap" role="main" aria-label="Page not found">
      <img
        src="/memocare-logo.jpg"
        alt="MemoCare mascot looking as confused as you are — page not found"
        className="nf-mascot"
        width={220}
        height={220}
      />
      <p className="nf-code" aria-hidden="true">404</p>
      <h1 className="nf-title">This page wandered off</h1>
      <p className="nf-sub">
        The page you're looking for doesn't exist, was moved, or the link is incorrect.
      </p>
      <div className="nf-actions">
        <Button as={Link} to="/dashboard" size="sm">
          <Home size={15} style={{ marginRight: 6, verticalAlign: -2 }} /> Back to dashboard
        </Button>
        <Button as={Link} to="/login" variant="secondary" size="sm">
          <ArrowLeft size={15} style={{ marginRight: 6, verticalAlign: -2 }} /> Go to login
        </Button>
      </div>
      <nav className="nf-links" aria-label="Helpful links">
        <Link to="/privacy">Privacy Policy</Link>
        <span aria-hidden="true">·</span>
        <Link to="/terms">Terms &amp; Conditions</Link>
        <span aria-hidden="true">·</span>
        <Link to="/cookies">Cookie Policy</Link>
      </nav>
    </div>
  );
}
