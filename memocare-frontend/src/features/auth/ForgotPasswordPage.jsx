import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { authService } from '../../api';
import { Button, FormRow } from '../../components/ui/primitives';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err) {
      // Backend intentionally doesn't reveal whether the email exists; show the generic message either way.
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a link to choose a new password." footer={<Link to="/login">Back to sign in</Link>}>
      {sent ? (
        <div className="auth-banner auth-banner-success">
          If an account exists for that email, a reset link is on its way. It's valid for a limited time.
        </div>
      ) : (
        <form onSubmit={submit}>
          {error && <div className="auth-banner auth-banner-error">{error}</div>}
          <FormRow label="Email">
            <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormRow>
          <Button type="submit" size="lg" loading={loading} style={{ width: '100%' }}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
