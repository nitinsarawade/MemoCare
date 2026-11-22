import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { useAuth, ROLES } from '../../auth/AuthContext';
import { Button, FormRow } from '../../components/ui/primitives';

const ROLE_OPTIONS = [
  { value: ROLES.FAMILY, label: 'Family' },
  { value: ROLES.CARETAKER, label: 'Caretaker' },
  { value: ROLES.HOSPITAL_STAFF, label: 'Hospital Staff' },
  { value: ROLES.MEDICAL_STORE, label: 'Medical Store' },
];

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', role: ROLES.FAMILY, hospitalInviteCode: '',
  });
  const [error, setError] = useState('');
  const [done, setDone] = useState(null); // null | the account status returned by signup
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    // Play the 1.5s MemoCare banner splash as the dashboard loads in.
    window.dispatchEvent(new Event('memocare:splash-replay'));
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = { ...form };
      if (body.role !== ROLES.HOSPITAL_STAFF) delete body.hospitalInviteCode;
      const result = await signup(body);
      setDone(result?.status || 'PENDING_VERIFICATION');
    } catch (err) {
      setError(err.message || 'Could not create your account.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    // done reflects what the server actually did: if no real email could be sent
    // (local/dev setup with no SMTP configured), the account is already verified.
    const messages = {
      ACTIVE: 'Account created and ready to go — you can sign in now.',
      PENDING_APPROVAL: 'Account created. Your hospital invite code was accepted. Hospital Management must approve your professional role from Hospital management → Staff approvals before you can sign in.',
      PENDING_VERIFICATION: "Account created. We've sent a verification link to your email — verify it, then sign in.",
    };
    return (
      <AuthLayout title={done === 'ACTIVE' ? 'You’re all set' : 'Almost there'} footer={<Link to="/login">Back to sign in</Link>}>
        <div className="auth-banner auth-banner-success">{messages[done] || messages.PENDING_VERIFICATION}</div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create your account" subtitle="Set up MemoCare for yourself or the person you care for." footer={<>Already have an account? <Link to="/login">Sign in</Link></>}>
      {error && <div className="auth-banner auth-banner-error">{error}</div>}
      <form onSubmit={submit}>
        <div style={{ display: 'flex', gap: 10 }}>
          <FormRow label="First name">
            <input required value={form.firstName} onChange={set('firstName')} />
          </FormRow>
          <FormRow label="Last name">
            <input required value={form.lastName} onChange={set('lastName')} />
          </FormRow>
        </div>
        <FormRow label="Email">
          <input type="email" required value={form.email} onChange={set('email')} placeholder="you@example.com" />
        </FormRow>
        <FormRow label="Password" hint="At least 8 characters.">
          <input type="password" required minLength={8} value={form.password} onChange={set('password')} placeholder="••••••••" />
        </FormRow>

        <div className="form-row">
          <label>I am a…</label>
          <div className="auth-role-grid">
            {ROLE_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.value}
                className={`auth-role-option ${form.role === opt.value ? 'selected' : ''}`}
                onClick={() => setForm((f) => ({ ...f, role: opt.value }))}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {form.role === ROLES.HOSPITAL_STAFF && (
          <FormRow label="Hospital invite code" hint="Ask your hospital admin for this code.">
            <input required value={form.hospitalInviteCode} onChange={set('hospitalInviteCode')} placeholder="e.g. MC-XXXX-XXXX" />
          </FormRow>
        )}

        <Button type="submit" size="lg" loading={loading} style={{ width: '100%', marginTop: 6 }}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
