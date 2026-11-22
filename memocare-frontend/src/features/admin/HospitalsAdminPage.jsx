import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, Copy, Building2 } from 'lucide-react';
import { adminService } from '../../api';
import { PageHeader, Card, Button, Badge, FormRow, LoadingState, EmptyState, ErrorState } from '../../components/ui/primitives';

export default function HospitalsAdminPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [rotatingId, setRotatingId] = useState(null);
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['admin-hospitals'], queryFn: adminService.listHospitals });

  const rotate = async (id) => {
    setRotatingId(id);
    try {
      await adminService.rotateInviteCode(id);
      refetch();
    } finally {
      setRotatingId(null);
    }
  };

  const copyCode = (code) => navigator.clipboard?.writeText(code);

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Hospitals" actions={<Button onClick={() => setShowCreate(true)}><Plus size={15} /> New hospital</Button>} />
      <Card style={{ padding: 0 }}>
        {isLoading && <div style={{ padding: 20 }}><LoadingState rows={3} /></div>}
        {isError && <div style={{ padding: 20 }}><ErrorState error={error} onRetry={refetch} /></div>}
        {data?.length === 0 && <div style={{ padding: 20 }}><EmptyState icon={<Building2 size={26} />} title="No hospitals yet" /></div>}
        {data?.map((h) => (
          <div className="list-row" key={h.id} style={{ padding: '14px 20px' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{h.name}</div>
              <div className="field-hint" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Invite code: <code>{h.inviteCode}</code>
                <button onClick={() => copyCode(h.inviteCode)} className="icon-btn" style={{ width: 22, height: 22 }} aria-label="Copy code"><Copy size={12} /></button>
              </div>
            </div>
            <Button size="sm" variant="secondary" loading={rotatingId === h.id} onClick={() => rotate(h.id)}>
              <RefreshCw size={13} /> Rotate code
            </Button>
          </div>
        ))}
      </Card>

      {showCreate && (
        <CreateHospitalModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['admin-hospitals'] }); }} />
      )}
    </div>
  );
}

function CreateHospitalModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', address: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await adminService.createHospital(form);
      onCreated();
    } catch (err) {
      setError(err.message || 'Could not create the hospital.');
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h3>New hospital</h3>
        {error && <div className="auth-banner auth-banner-error">{error}</div>}
        <form onSubmit={submit}>
          <FormRow label="Name"><input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></FormRow>
          <FormRow label="Address (optional)"><input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></FormRow>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>Create</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
