import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { patientService, progressService, mediaService } from '../../../api';
import { Card, Button, FormRow, RiskBadge, Badge, LoadingState } from '../../../components/ui/primitives';
import { useAuth, isClinical, ROLES } from '../../../auth/AuthContext';

export default function OverviewTab({ patient, onUpdated }) {
  const { role } = useAuth();
  const editable = isClinical(role);
  const management = role === ROLES.ADMIN;
  const [editing, setEditing] = useState(false);

  const summaryQuery = useQuery({ queryKey: ['progress-summary', patient.id], queryFn: () => progressService.summary(patient.id) });
  const mediaQuery = useQuery({ queryKey: ['media', patient.id, 'recent'], queryFn: () => mediaService.list(patient.id) });

  const recentMedia = mediaQuery.data?.slice(0, 3) || [];

  return (
    <div className="overview-grid">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h3 style={{ marginBottom: 14 }}>Patient information</h3>
          {editable && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil size={13} /> Edit
            </Button>
          )}
        </div>
        {editing ? (
          <EditForm patient={patient} management={management} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onUpdated(); }} />
        ) : (
          <dl className="info-grid">
            <dt>Date of birth</dt><dd>{patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : '—'}</dd>
            <dt>Gender</dt><dd>{patient.sex ? patient.sex.charAt(0).toUpperCase() + patient.sex.slice(1).toLowerCase() : '—'}</dd>
            <dt>Assigned doctor</dt><dd>{patient.assignedDoctor ? `${patient.assignedDoctor.firstName} ${patient.assignedDoctor.lastName}` : <Badge tone="neutral">Unassigned</Badge>}</dd>
            <dt>Patient phone</dt><dd>{patient.phone || '—'}</dd>
            <dt>Address</dt><dd>{patient.address || '—'}</dd>
            <dt>Relatives</dt><dd>{Array.isArray(patient.relatives) && patient.relatives.length ? patient.relatives.map((r) => `${r.name}${r.phone ? ` (${r.phone})` : ''}`).join(', ') : '—'}</dd>
            <dt>Hospital</dt><dd>{patient.hospital?.name || '—'}</dd>
            {editable && (
              <>
                <dt>Medical history</dt>
                <dd>{patient.medicalHistoryNotes || '—'}</dd>
              </>
            )}
          </dl>
        )}
      </Card>

      <Card>
        <h3 style={{ marginBottom: 14 }}>Current status</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <RiskBadge level={patient.latestRiskLevel} />
          {summaryQuery.data?.trends?.overall && <Badge tone={trendTone(summaryQuery.data.trends.overall)}>{trendLabel(summaryQuery.data.trends.overall)}</Badge>}
        </div>
        {summaryQuery.isLoading && <LoadingState rows={2} />}
        {summaryQuery.data?.summaryText && <p style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>{summaryQuery.data.summaryText}</p>}
        <p className="field-hint" style={{ marginTop: 10 }}>
          This is a risk assessment based on a transparent heuristic — not a clinical diagnosis.
        </p>
      </Card>

      <Card className="overview-span-2">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Recent recordings</h3>
          <Link to="recordings" style={{ fontSize: 13, fontWeight: 600 }}>View all →</Link>
        </div>
        {mediaQuery.isLoading && <LoadingState rows={2} />}
        {!mediaQuery.isLoading && recentMedia.length === 0 && <p style={{ color: 'var(--ink-faint)', fontSize: 13.5 }}>No recordings yet.</p>}
        {recentMedia.map((m) => (
          <div key={m.id} className="mini-row">
            <span>{new Date(m.createdAt).toLocaleDateString()}</span>
            <RiskBadge level={m.analysisResult?.riskLevel} size="sm" />
            <span className="field-hint">{m.status}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function trendTone(trend) {
  const t = (trend || '').toUpperCase();
  if (t === 'IMPROVING') return 'success';
  if (t === 'DECLINING') return 'danger';
  return 'neutral';
}
function trendLabel(trend) {
  const t = (trend || '').toUpperCase();
  return { IMPROVING: 'Improving', STABLE: 'Stable', DECLINING: 'Declining', INSUFFICIENT_DATA: 'Not enough data yet' }[t] || trend;
}

// Backend rejects empty dateOfBirth and treats '' as a real value, so only send what's filled in.
function cleanPatientPayload(form) {
  const out = {};
  if (form.dateOfBirth) out.dateOfBirth = form.dateOfBirth;
  if (form.sex) out.sex = form.sex;
  if (form.phone) out.phone = form.phone;
  if (form.address) out.address = form.address;
  out.relatives = form.relativeName ? [{ name: form.relativeName, phone: form.relativePhone || undefined, relationship: form.relativeRelationship || undefined }] : [];
  out.medicalHistoryNotes = form.medicalHistoryNotes || '';
  return out;
}

function EditForm({ patient, management, onClose, onSaved }) {
  const [form, setForm] = useState({
    dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.slice(0, 10) : '',
    sex: patient.sex || '',
    assignedDoctorId: patient.assignedDoctor?.id || '',
    medicalHistoryNotes: patient.medicalHistoryNotes || '',
    phone: patient.phone || '',
    address: patient.address || '',
    relativeName: patient.relatives?.[0]?.name || '',
    relativePhone: patient.relatives?.[0]?.phone || '',
    relativeRelationship: patient.relatives?.[0]?.relationship || '',
  });
  const staffQuery = useQuery({ queryKey: ['staff-options'], queryFn: patientService.listStaffOptions });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (management && form.assignedDoctorId) await patientService.assignDoctor(patient.id, form.assignedDoctorId);
      await patientService.update(patient.id, cleanPatientPayload(form));
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit}>
      {error && <div className="auth-banner auth-banner-error">{error}</div>}
      <FormRow label="Date of birth"><input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} /></FormRow>
      <FormRow label="Gender">
        <select value={form.sex} onChange={set('sex')}>
          <option value="">Prefer not to say</option>
          <option value="FEMALE">Female</option>
          <option value="MALE">Male</option>
          <option value="OTHER">Other</option>
        </select>
      </FormRow>
      {management && <FormRow label="Assigned doctor">
        <select value={form.assignedDoctorId} onChange={set('assignedDoctorId')}>
          <option value="">Unassigned</option>
          {staffQuery.data?.map((d) => (
            <option key={d.id} value={d.id}>{d.firstName} {d.lastName}{d.staffTitle ? ` (${d.staffTitle})` : ''}</option>
          ))}
        </select>
      </FormRow>}
      <FormRow label="Patient phone"><input value={form.phone} onChange={set('phone')} /></FormRow>
      <FormRow label="Address"><input value={form.address} onChange={set('address')} /></FormRow>
      <div style={{ display: 'flex', gap: 10 }}><FormRow label="Relative"><input value={form.relativeName} onChange={set('relativeName')} /></FormRow><FormRow label="Relative phone"><input value={form.relativePhone} onChange={set('relativePhone')} /></FormRow></div>
      <FormRow label="Relationship"><input value={form.relativeRelationship} onChange={set('relativeRelationship')} /></FormRow>
      <FormRow label="Medical history"><textarea rows={3} value={form.medicalHistoryNotes} onChange={set('medicalHistoryNotes')} /></FormRow>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button type="submit" size="sm" loading={loading}>Save</Button>
      </div>
    </form>
  );
}
