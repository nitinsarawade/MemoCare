import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth, ROLES } from '../../auth/AuthContext';
import { authService, adminService } from '../../api';
import { PageHeader, Card, Button, FormRow } from '../../components/ui/primitives';

export default function ProfilePage() {
  const { user, role, refreshMe } = useAuth();
  return (
    <div>
      <PageHeader eyebrow="Settings" title="Profile & settings" />
      <div className="overview-grid">
        <ProfileForm user={user} onSaved={refreshMe} />
        <PasswordForm />
        {(role === ROLES.HOSPITAL_STAFF || role === ROLES.ADMIN) && <MyHospitalForm />}
      </div>
    </div>
  );
}

function MyHospitalForm() {
  const hospitalQuery = useQuery({ queryKey: ['my-hospital'], queryFn: adminService.getMyHospital });
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const hospital = hospitalQuery.data;
  const values = form || { name: hospital?.name || '', address: hospital?.address || '' };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSaved(false);
    try {
      await adminService.updateMyHospital(values);
      await hospitalQuery.refetch();
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Could not save your hospital.');
    } finally {
      setLoading(false);
    }
  };

  if (hospitalQuery.isLoading) return null;
  if (!hospital) return null;

  return (
    <Card>
      <h3 style={{ marginBottom: 4 }}>Your hospital</h3>
      <p className="field-hint" style={{ marginBottom: 14 }}>Visible to every patient and staff member linked to this hospital.</p>
      {error && <div className="auth-banner auth-banner-error">{error}</div>}
      {saved && <div className="auth-banner auth-banner-success">Hospital updated.</div>}
      <form onSubmit={submit}>
        <FormRow label="Name">
          <input required value={values.name} onChange={(e) => setForm({ ...values, name: e.target.value })} />
        </FormRow>
        <FormRow label="Address">
          <input value={values.address} onChange={(e) => setForm({ ...values, address: e.target.value })} />
        </FormRow>
        <Button type="submit" loading={loading}>Save changes</Button>
      </form>
    </Card>
  );
}

function ProfileForm({ user, onSaved }) {
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    address: user?.address || '',
    profession: user?.profession || '',
    yearsOfExperience: user?.yearsOfExperience ?? '',
    degrees: user?.degrees || '',
    dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSaved(false);
    try {
      const body = { ...form };
      if (!body.dateOfBirth) delete body.dateOfBirth;
      await authService.updateMe(body);
      await onSaved();
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Could not save your profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <h3 style={{ marginBottom: 14 }}>Your profile</h3>
      {error && <div className="auth-banner auth-banner-error">{error}</div>}
      {saved && <div className="auth-banner auth-banner-success">Profile updated.</div>}
      <form onSubmit={submit}>
        <FormRow label="First name"><input required value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} /></FormRow>
        <FormRow label="Last name"><input required value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} /></FormRow>
        <FormRow label="Email"><input value={user?.email || ''} disabled /></FormRow>
        <FormRow label="Phone"><input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="e.g. 555-0199" /></FormRow>
        <FormRow label="Address"><input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></FormRow>
        <FormRow label="Profession"><input value={form.profession} onChange={(e) => setForm((f) => ({ ...f, profession: e.target.value }))} /></FormRow>
        <FormRow label="Years of experience"><input type="number" min="0" value={form.yearsOfExperience} onChange={(e) => setForm((f) => ({ ...f, yearsOfExperience: e.target.value === '' ? '' : Number(e.target.value) }))} /></FormRow>
        <FormRow label="Degrees"><input value={form.degrees} onChange={(e) => setForm((f) => ({ ...f, degrees: e.target.value }))} /></FormRow>
        <FormRow label="Date of birth"><input type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} /></FormRow>
        {user?.updatedAt && (
          <p className="field-hint" style={{ marginBottom: 14 }}>
            Last updated {new Date(user.updatedAt).toLocaleString()}
          </p>
        )}
        <Button type="submit" loading={loading}>Save changes</Button>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSaved(false);
    try {
      await authService.changePassword(form.currentPassword, form.newPassword);
      setForm({ currentPassword: '', newPassword: '' });
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Could not change your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <h3 style={{ marginBottom: 14 }}>Change password</h3>
      {error && <div className="auth-banner auth-banner-error">{error}</div>}
      {saved && <div className="auth-banner auth-banner-success">Password changed.</div>}
      <form onSubmit={submit}>
        <FormRow label="Current password">
          <input required type="password" value={form.currentPassword} onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))} />
        </FormRow>
        <FormRow label="New password" hint="At least 8 characters.">
          <input required type="password" minLength={8} value={form.newPassword} onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))} />
        </FormRow>
        <Button type="submit" loading={loading}>Update password</Button>
      </form>
    </Card>
  );
}
