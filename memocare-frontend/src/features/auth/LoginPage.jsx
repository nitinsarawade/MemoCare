import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { useAuth } from '../../auth/AuthContext';
import { Button, FormRow } from '../../components/ui/primitives';
import { authService } from '../../api';

export default function LoginPage() {
  const { login, loginByManagementCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneMode, setPhoneMode] = useState(false); // false = email login, true = hospital admin code
  const [managementCode, setManagementCode] = useState('');

  const redirectTo = location.state?.from?.pathname || '/dashboard';

  const submit = async (e, overrides) => {
    // Play the 1.5s MemoCare banner splash as the dashboard loads in.
    window.dispatchEvent(new Event('memocare:splash-replay'));
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(overrides?.email ?? email, overrides?.password ?? password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Could not sign in. Check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const submitManagementCode = async (e) => {
    // Play the 1.5s MemoCare banner splash as the dashboard loads in.
    window.dispatchEvent(new Event('memocare:splash-replay'));
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginByManagementCode(managementCode);
      navigate(redirectTo, { replace: true });
    } catch (err) { setError(err.message || 'Could not sign in as Hospital Management.'); }
    finally { setLoading(false); }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue to your MemoCare dashboard."
      footer={
        <>
          Don&apos;t have an account? <Link to="/signup">Create one</Link>
        </>
      }
    >
      {error && <div className="auth-banner auth-banner-error">{error}</div>}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Button type="button" size="sm" variant={!phoneMode ? 'primary' : 'ghost'} onClick={() => setPhoneMode(false)}>Email login</Button>
        <Button type="button" size="sm" variant={phoneMode ? 'primary' : 'ghost'} onClick={() => setPhoneMode(true)}>Hospital admin code</Button>
      </div>
      {phoneMode ? (
        <form onSubmit={submitManagementCode}>
          <FormRow label="Hospital admin code"><input type="password" required value={managementCode} onChange={(e) => setManagementCode(e.target.value)} placeholder="Enter management code" /></FormRow>
          <Button type="submit" size="lg" loading={loading} style={{ width: '100%' }}>Sign in as Hospital Management</Button>
        </form>
      ) : (
      <form onSubmit={submit}>
        <FormRow label="Email">
          <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </FormRow>
        <FormRow label="Password">
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </FormRow>
        <div style={{ textAlign: 'right', marginBottom: 18, marginTop: -6 }}>
          <Link to="/forgot-password" style={{ fontSize: 13 }}>Forgot password?</Link>
        </div>
        <Button type="submit" size="lg" loading={loading} style={{ width: '100%' }}>
          Sign in
        </Button>
      </form>
      )}

    </AuthLayout>
  );
}
