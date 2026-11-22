import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { authService } from '../../api';
import { Spinner } from '../../components/ui/primitives';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState('loading'); // loading | success | error

  useEffect(() => {
    if (!token) {
      setState('error');
      return;
    }
    authService
      .verifyEmail(token)
      .then(() => setState('success'))
      .catch(() => setState('error'));
  }, [token]);

  return (
    <AuthLayout title="Email verification" footer={<Link to="/login">Back to sign in</Link>}>
      {state === 'loading' && <Spinner label="Verifying your email…" />}
      {state === 'success' && (
        <div className="auth-banner auth-banner-success">Your email is verified. You can sign in now.</div>
      )}
      {state === 'error' && (
        <div className="auth-banner auth-banner-error">
          That verification link is invalid or has expired. Try signing in — if your account still needs
          verification, you can request a new link.
        </div>
      )}
    </AuthLayout>
  );
}
