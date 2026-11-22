import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowRight, UserPlus } from 'lucide-react';
import { patientService } from '../../api';
import { PageHeader, Card, RiskBadge, Badge, LoadingState, EmptyState, ErrorState, Button, FormRow } from '../../components/ui/primitives';
import { useAuth, ROLES } from '../../auth/AuthContext';

const RISK_FILTERS = ['ALL', 'LOW', 'MODERATE', 'HIGH', 'UNKNOWN'];

export default function PatientsListPage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { data: patients, isLoading, isError, error, refetch } = useQuery({ queryKey: ['patients'], queryFn: patientService.list });
  const [q, setQ] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [showCreate, setShowCreate] = useState(false);

  const filtered = useMemo(() => {
    if (!patients) return [];
    const s = q.trim().toLowerCase();
    return patients.filter((p) => {
      // Dismissed patients belong only in the Dismissed archive — never in
      // the active patients dashboard, even if the API ever includes them.
      if (p.status === 'DISMISSED') return false;
      const matchesName = !s || `${p.firstName} ${p.lastName}`.toLowerCase().includes(s);
      const risk = (p.latestRiskLevel || 'UNKNOWN').toUpperCase();
      const matchesRisk = riskFilter === 'ALL' || risk === riskFilter;
      return matchesName && matchesRisk;
    });
  }, [patients, q, riskFilter]);

  return (
    <div>
      <PageHeader
        eyebrow="Patients"
        title="All patients"
        description="Patients visible to you, scoped by your hospital and role."
        actions={
          role === ROLES.HOSPITAL_STAFF || role === ROLES.ADMIN ? (
            <Button onClick={() => setShowCreate(true)}>
              <UserPlus size={15} /> Register patient
            </Button>
          ) : null
        }
      />

      <div className="table-toolbar" style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-md) var(--radius-md) 0 0', background: 'var(--paper-raised)' }}>
        <div className="search-input">
          <Search size={15} />
          <input placeholder="Search by name…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Button as={Link} to="/patients/dismissed" size="sm" variant="ghost" title="Open the dismiss archive">
            Dismissed patients
          </Button>
          {RISK_FILTERS.map((r) => (
            <button
              key={r}
              onClick={() => setRiskFilter(r)}
              className="btn btn-sm"
              style={{
                background: riskFilter === r ? 'var(--primary)' : 'transparent',
                color: riskFilter === r ? '#fff' : 'var(--ink-soft)',
                border: '1px solid var(--line)',
              }}
            >
              {r === 'ALL' ? 'All' : r.charAt(0) + r.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <Card style={{ padding: 0, borderRadius: '0 0 var(--radius-md) var(--radius-md)', borderTop: 'none' }}>
        {isLoading && <div style={{ padding: 20 }}><LoadingState rows={6} /></div>}
        {isError && <div style={{ padding: 20 }}><ErrorState error={error} onRetry={refetch} /></div>}
        {!isLoading && !isError && filtered.length === 0 && (
          <div style={{ padding: 20 }}>
            <EmptyState title="No patients match" description="Try clearing your search or filters." />
          </div>
        )}
        {!isLoading && filtered.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Risk</th>
                <th>Doctor</th>
                <th>Hospital</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="clickable-row" onClick={() => navigate(`/patients/${p.id}`)}>
                  <td style={{ fontWeight: 600 }}>{p.firstName} {p.lastName}</td>
                  <td><RiskBadge level={p.latestRiskLevel} size="sm" /></td>
                  <td>{p.assignedDoctor ? `${p.assignedDoctor.firstName} ${p.assignedDoctor.lastName}` : <Badge tone="neutral">Unassigned</Badge>}</td>
                  <td>{p.hospital?.name || '—'}</td>
                  <td style={{ textAlign: 'right' }}><ArrowRight size={15} color="var(--ink-faint)" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {showCreate && <CreatePatientModal onClose={() => setShowCreate(false)} onCreated={(p) => { setShowCreate(false); refetch(); navigate(`/patients/${p.id}`); }} />}
    </div>
  );
}

function CreatePatientModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', dateOfBirth: '', sex: '', phone: '', address: '', relativeName: '', relativePhone: '', relativeRelationship: '', medicalHistoryNotes: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = { firstName: form.firstName, lastName: form.lastName, dateOfBirth: form.dateOfBirth };
      if (form.sex) payload.sex = form.sex;
      if (form.phone) payload.phone = form.phone;
      if (form.address) payload.address = form.address;
      if (form.relativeName) payload.relatives = [{ name: form.relativeName, phone: form.relativePhone || undefined, relationship: form.relativeRelationship || undefined }];
      if (form.medicalHistoryNotes) payload.medicalHistoryNotes = form.medicalHistoryNotes;
      const patient = await patientService.create(payload);
      onCreated(patient);
    } catch (err) {
      setError(err.message || 'Could not register the patient.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h3>Register a new patient</h3>
        {error && <div className="auth-banner auth-banner-error">{error}</div>}
        <form onSubmit={submit}>
          <div style={{ display: 'flex', gap: 10 }}>
            <FormRow label="First name"><input required value={form.firstName} onChange={set('firstName')} /></FormRow>
            <FormRow label="Last name"><input required value={form.lastName} onChange={set('lastName')} /></FormRow>
          </div>
          <FormRow label="Patient phone"><input value={form.phone} onChange={set('phone')} placeholder="Patient contact number" /></FormRow>
          <FormRow label="Patient address"><input value={form.address} onChange={set('address')} placeholder="Full address" /></FormRow>
          <div style={{ display: 'flex', gap: 10 }}>
            <FormRow label="Relative name"><input value={form.relativeName} onChange={set('relativeName')} /></FormRow>
            <FormRow label="Relative phone"><input value={form.relativePhone} onChange={set('relativePhone')} /></FormRow>
          </div>
          <FormRow label="Relationship"><input value={form.relativeRelationship} onChange={set('relativeRelationship')} placeholder="e.g. daughter, spouse" /></FormRow>
          <div style={{ display: 'flex', gap: 10 }}>
            <FormRow label="Date of birth"><input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} /></FormRow>
            <FormRow label="Gender">
              <select value={form.sex} onChange={set('sex')}>
                <option value="">Prefer not to say</option>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="OTHER">Other</option>
              </select>
            </FormRow>
          </div>
          <FormRow label="Medical history" hint="Stored encrypted at rest.">
            <textarea rows={3} value={form.medicalHistoryNotes} onChange={set('medicalHistoryNotes')} />
          </FormRow>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>Register patient</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
