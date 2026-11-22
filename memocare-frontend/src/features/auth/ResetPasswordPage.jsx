import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { authService } from '../../api';
import { Button, FormRow } from '../../components/ui/primitives';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!token) {
      setError('This reset link is missing its token. Please request a new one.');
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      navigate('/login', { replace: true, state: { resetSuccess: true } });
    } catch (err) {
      setError(err.message || 'This link may have expired. Please request a new one.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Choose a new password" footer={<Link to="/login">Back to sign in</Link>}>
      {error && <div className="auth-banner auth-banner-error">{error}</div>}
      <form onSubmit={submit}>
        <FormRow label="New password" hint="At least 8 characters.">
          <input type="password" required minLength={8} autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
        </FormRow>
        <Button type="submit" size="lg" loading={loading} style={{ width: '100%' }}>
          Reset password
        </Button>
      </form>
    </AuthLayout>
  );
}
