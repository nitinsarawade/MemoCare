import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { useAuth } from '../../auth/AuthContext';
import { patientService } from '../../api';
import { Button, Spinner } from '../../components/ui/primitives';

export default function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState('idle'); // idle | working | success | error
  const [error, setError] = useState('');

  const accept = async () => {
    setState('working');
    setError('');
    try {
      await patientService.acceptInvite(token);
      setState('success');
      setTimeout(() => navigate('/dashboard', { replace: true }), 1200);
    } catch (err) {
      setError(err.message || 'This invite link is invalid or has expired.');
      setState('error');
    }
  };

  useEffect(() => {
    if (isAuthenticated && !isLoading && state === 'idle' && token) accept();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading]);

  if (isLoading) return null;

  if (!isAuthenticated) {
    return (
      <AuthLayout title="You've been invited" subtitle="Sign in or create an account to accept this invite to a patient's care team." footer={<Link to="/signup">Create an account</Link>}>
        <Button as={Link} to={`/login?redirect=/accept-invite?token=${encodeURIComponent(token)}`} size="lg" style={{ width: '100%' }}>
          Sign in to continue
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Accepting invite…">
      {state === 'working' && <Spinner label="Linking your account…" />}
      {state === 'success' && <div className="auth-banner auth-banner-success">You're linked. Taking you to your dashboard…</div>}
      {state === 'error' && <div className="auth-banner auth-banner-error">{error}</div>}
    </AuthLayout>
  );
}
