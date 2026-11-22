import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, CalendarDays } from 'lucide-react';
import { appointmentService } from '../../../api';
import { Card, Button, Badge, FormRow, LoadingState, EmptyState, ErrorState } from '../../../components/ui/primitives';
import { useAuth, canScheduleAppointments } from '../../../auth/AuthContext';

export default function AppointmentsTab({ patient }) {
  const { role } = useAuth();
  const canManage = canScheduleAppointments(role);
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // null | 'create' | appointment object

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['appointments', patient.id],
    queryFn: () => appointmentService.list(patient.id),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['appointments', patient.id] });

  const remove = async (id) => {
    if (!window.confirm('Delete this appointment?')) return;
    await appointmentService.remove(patient.id, id);
    invalidate();
  };

  const sorted = [...(data || [])].sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Appointments</h3>
        {canManage && <Button size="sm" onClick={() => setModal('create')}><Plus size={14} /> New appointment</Button>}
      </div>

      {isLoading && <LoadingState rows={3} />}
      {isError && <ErrorState error={error} onRetry={refetch} />}
      {sorted.length === 0 && !isLoading && (
        <EmptyState icon={<CalendarDays size={26} />} title="No appointments scheduled" description={canManage ? 'Create one to get started.' : 'Nothing scheduled right now.'} />
      )}
      {sorted.map((a) => (
        <div className="list-row" key={a.id}>
          <div>
            <div style={{ fontWeight: 600 }}>{a.title || a.reason}</div>
            <div className="field-hint">{new Date(a.scheduledFor).toLocaleString()} {a.location ? `· ${a.location}` : ''}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Badge tone={statusTone(a.status)}>{a.status || 'Scheduled'}</Badge>
            {canManage && (
              <>
                <Button size="sm" variant="ghost" onClick={() => setModal(a)}><Pencil size={13} /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(a.id)}><Trash2 size={13} /></Button>
              </>
            )}
          </div>
        </div>
      ))}

      {modal && (
        <AppointmentModal
          patient={patient}
          existing={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); invalidate(); }}
        />
      )}
    </Card>
  );
}

function statusTone(status) {
  if (status === 'COMPLETED') return 'success';
  if (status === 'CANCELLED') return 'danger';
  return 'info';
}

function AppointmentModal({ patient, existing, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: existing?.title || '',
    scheduledFor: existing?.scheduledFor ? existing.scheduledFor.slice(0, 16) : '',
    location: existing?.location || '',
    notes: existing?.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const body = { ...form, scheduledFor: new Date(form.scheduledFor).toISOString() };
      if (existing) await appointmentService.update(patient.id, existing.id, body);
      else await appointmentService.create(patient.id, body);
      onSaved();
    } catch (err) {
      setError(err.message || 'Could not save the appointment.');
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h3>{existing ? 'Edit appointment' : 'New appointment'}</h3>
        {error && <div className="auth-banner auth-banner-error">{error}</div>}
        <form onSubmit={submit}>
          <FormRow label="Title"><input required value={form.title} onChange={set('title')} placeholder="e.g. Neurology follow-up" /></FormRow>
          <FormRow label="Date & time"><input required type="datetime-local" value={form.scheduledFor} onChange={set('scheduledFor')} /></FormRow>
          <FormRow label="Location (optional)"><input value={form.location} onChange={set('location')} /></FormRow>
          <FormRow label="Notes (optional)"><textarea rows={2} value={form.notes} onChange={set('notes')} /></FormRow>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>{existing ? 'Save changes' : 'Create'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
