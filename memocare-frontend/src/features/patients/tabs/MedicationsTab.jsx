import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X, Clock3, Plus, Trash2 } from 'lucide-react';
import { medicationService } from '../../../api';
import { Card, Button, Badge, FormRow, LoadingState, EmptyState, ErrorState } from '../../../components/ui/primitives';
import { useAuth, canScheduleAppointments } from '../../../auth/AuthContext';

function formatSchedule(med) {
  if (med.scheduleType === 'SPECIFIC_DATES') {
    const count = med.specificDateTimes?.length ?? 0;
    return count === 1 ? '1 scheduled dose' : `${count} scheduled doses`;
  }
  if (med.timesOfDay?.length) {
    return `Daily at ${med.timesOfDay.join(', ')}`;
  }
  return 'No schedule set';
}

export default function MedicationsTab({ patient }) {
  const { role } = useAuth();
  const canManage = canScheduleAppointments(role);
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const todayQuery = useQuery({ queryKey: ['meds-today', patient.id], queryFn: () => medicationService.today(patient.id) });
  const listQuery = useQuery({ queryKey: ['meds', patient.id], queryFn: () => medicationService.list(patient.id) });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['meds-today', patient.id] });
    qc.invalidateQueries({ queryKey: ['meds', patient.id] });
  };

  const logDose = async (medicationId, scheduledFor, status) => {
    await medicationService.logDose(patient.id, medicationId, { scheduledFor, status });
    invalidate();
  };

  return (
    <div className="overview-grid">
      <Card className="overview-span-2">
        <h3 style={{ marginBottom: 12 }}>Today's doses</h3>
        {todayQuery.isLoading && <LoadingState rows={3} />}
        {todayQuery.isError && <ErrorState error={todayQuery.error} onRetry={todayQuery.refetch} />}
        {todayQuery.data?.length === 0 && <p className="field-hint">No doses scheduled for today.</p>}
        {todayQuery.data?.map((dose) => (
          <div className="list-row" key={`${dose.medicationId}-${dose.scheduledFor}`}>
            <div>
              <div style={{ fontWeight: 600 }}>{dose.medicationName}</div>
              <div className="field-hint">{dose.dosage} · {new Date(dose.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            {dose.status && dose.status !== 'PENDING' ? (
              <Badge tone={dose.status === 'TAKEN' ? 'success' : dose.status === 'MISSED' ? 'danger' : 'neutral'}>{dose.status}</Badge>
            ) : (
              <div style={{ display: 'flex', gap: 6 }}>
                <Button size="sm" variant="secondary" onClick={() => logDose(dose.medicationId, dose.scheduledFor, 'TAKEN')}><Check size={13} /> Taken</Button>
                <Button size="sm" variant="ghost" onClick={() => logDose(dose.medicationId, dose.scheduledFor, 'SKIPPED')}><Clock3 size={13} /> Skip</Button>
                <Button size="sm" variant="ghost" onClick={() => logDose(dose.medicationId, dose.scheduledFor, 'MISSED')}><X size={13} /> Missed</Button>
              </div>
            )}
          </div>
        ))}
      </Card>

      <Card className="overview-span-2">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>All medications</h3>
          {canManage && <Button size="sm" onClick={() => setShowAdd(true)}><Plus size={14} /> Add medication</Button>}
        </div>
        {listQuery.isLoading && <LoadingState rows={3} />}
        {listQuery.data?.length === 0 && (
          <EmptyState title="No medications on file" description={canManage ? 'Add the first one to start tracking doses.' : 'A caretaker or hospital staff can add medications here.'} />
        )}
        {listQuery.data?.map((med) => (
          <div className="list-row" key={med.id}>
            <div>
              <div style={{ fontWeight: 600 }}>{med.name}</div>
              <div className="field-hint">{med.dosage} · {formatSchedule(med)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge tone={med.isActive === false ? 'neutral' : 'success'}>{med.isActive === false ? 'Inactive' : 'Active'}</Badge>
              {canManage && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    if (!window.confirm(`Remove ${med.name}?`)) return;
                    await medicationService.remove(patient.id, med.id);
                    invalidate();
                  }}
                >
                  <Trash2 size={13} />
                </Button>
              )}
            </div>
          </div>
        ))}
      </Card>

      {showAdd && (
        <AddMedicationModal
          onClose={() => setShowAdd(false)}
          onCreate={async (body) => {
            await medicationService.create(patient.id, body);
            setShowAdd(false);
            invalidate();
          }}
        />
      )}
    </div>
  );
}

function AddMedicationModal({ onClose, onCreate }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ name: '', dosage: '', startDate: today, times: '08:00', instructions: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const timesOfDay = form.times
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    try {
      await onCreate({
        name: form.name,
        dosage: form.dosage || undefined,
        instructions: form.instructions || undefined,
        startDate: form.startDate,
        scheduleType: 'RECURRING_DAILY',
        timesOfDay,
      });
    } catch (err) {
      setError(err.message || 'Could not add the medication.');
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h3>Add medication</h3>
        {error && <div className="auth-banner auth-banner-error">{error}</div>}
        <form onSubmit={submit}>
          <FormRow label="Name"><input required value={form.name} onChange={set('name')} /></FormRow>
          <FormRow label="Dosage" hint="e.g. 10mg"><input value={form.dosage} onChange={set('dosage')} /></FormRow>
          <FormRow label="Start date"><input type="date" required value={form.startDate} onChange={set('startDate')} /></FormRow>
          <FormRow label="Times of day" hint='24-hour "HH:mm", comma-separated for more than one dose — e.g. 08:00, 20:00'>
            <input required value={form.times} onChange={set('times')} placeholder="08:00" />
          </FormRow>
          <FormRow label="Instructions (optional)"><textarea rows={2} value={form.instructions} onChange={set('instructions')} /></FormRow>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>Add</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
