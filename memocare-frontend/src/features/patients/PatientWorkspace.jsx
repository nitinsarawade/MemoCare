import { NavLink, Route, Routes, useParams } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserMinus, RotateCcw } from 'lucide-react';
import { patientService } from '../../api';
import { PageHeader, RiskBadge, LoadingState, ErrorState, Button, Badge, FormRow } from '../../components/ui/primitives';
import NavItemInfo from '../../components/ui/NavItemInfo';
import { NAV_INFO } from '../../components/ui/navInfoCatalog';
import { useAuth, ROLES, isClinical } from '../../auth/AuthContext';
import './patients.css';

import OverviewTab from './tabs/OverviewTab';
import ProgressTab from './tabs/ProgressTab';
import RecordingsTab from './tabs/RecordingsTab';
import ScreeningTab from './tabs/ScreeningTab';
import MedicationsTab from './tabs/MedicationsTab';
import AppointmentsTab from './tabs/AppointmentsTab';
import LocationTab from './tabs/LocationTab';
import ReportTab from './tabs/ReportTab';
import AccessTab from './tabs/AccessTab';

export default function PatientWorkspace() {
  const { patientId } = useParams();
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [dismissOpen, setDismissOpen] = useState(false);
  const { data: patient, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientService.get(patientId),
  });

  const dismissMutation = useMutation({
    mutationFn: (reason) => patientService.dismiss(patientId, reason),
    onSuccess: () => {
      setDismissOpen(false);
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['dismissed-patients'] });
    },
  });

  const readmitMutation = useMutation({
    mutationFn: () => patientService.readmit(patientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['dismissed-patients'] });
    },
  });

  const tabs = [
    { to: '', label: 'Overview', end: true },
    { to: 'progress', label: 'Progress' },
    { to: 'recordings', label: 'Recordings' },
    { to: 'screening', label: 'Screening' },
    { to: 'medications', label: 'Medications' },
    { to: 'appointments', label: 'Appointments' },
    { to: 'location', label: 'Location & Safety' },
    { to: 'report', label: 'Report' },
    ...(isClinical(role) || role === ROLES.CARETAKER || role === ROLES.FAMILY ? [{ to: 'access', label: 'Access' }] : []),
  ];

  if (isLoading) return <LoadingState rows={5} />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  if (!patient) return null;

  return (
    <div>
      {patient.status === 'DISMISSED' && (
        <div className="auth-banner auth-banner-error" style={{ marginBottom: 12 }}>
          This patient was dismissed on {patient.dismissedAt ? new Date(patient.dismissedAt).toLocaleString() : '—'}{patient.dismissReason ? ` — reason: ${patient.dismissReason}` : ''}. The record stays in the dismiss archive.
          {isClinical(role) && (
            <Button size="sm" variant="ghost" style={{ marginLeft: 10 }} onClick={() => readmitMutation.mutate()} loading={readmitMutation.isPending}>
              <RotateCcw size={14} /> Readmit
            </Button>
          )}
        </div>
      )}
      <PageHeader
        eyebrow="Patient"
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            {patient.firstName} {patient.lastName}
            {patient.status === 'DISMISSED' && <Badge tone="warning">Dismissed</Badge>}
          </span>
        }
        description={patient.hospital?.name ? `${patient.hospital.name}` : undefined}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <RiskBadge level={patient.latestRiskLevel} />
            {isClinical(role) && patient.status !== 'DISMISSED' && (
              <Button size="sm" variant="ghost" onClick={() => setDismissOpen(true)}>
                <UserMinus size={15} /> Dismiss patient
              </Button>
            )}
          </div>
        }
      />

      <nav className="tab-strip tab-strip-info">
        {tabs.map((t) => (
          <NavLink key={t.to || 'overview'} to={t.to} end={t.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            {t.label}
            <NavItemInfo info={NAV_INFO[`tab:${t.to || 'overview'}`]} />
          </NavLink>
        ))}
      </nav>

      <Routes>
        <Route index element={<OverviewTab patient={patient} onUpdated={refetch} />} />
        <Route path="progress" element={<ProgressTab patient={patient} />} />
        <Route path="recordings/*" element={<RecordingsTab patient={patient} />} />
        <Route path="screening/*" element={<ScreeningTab patient={patient} />} />
        <Route path="medications" element={<MedicationsTab patient={patient} />} />
        <Route path="appointments" element={<AppointmentsTab patient={patient} />} />
        <Route path="location" element={<LocationTab patient={patient} />} />
        <Route path="report" element={<ReportTab patient={patient} />} />
        <Route path="access" element={<AccessTab patient={patient} />} />
      </Routes>

      {dismissOpen && (
        <DismissModal
          patient={patient}
          error={dismissMutation.error?.message}
          loading={dismissMutation.isPending}
          onClose={() => setDismissOpen(false)}
          onConfirm={(reason) => dismissMutation.mutate(reason)}
        />
      )}
    </div>
  );
}

function DismissModal({ patient, error, loading, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h3>Dismiss {patient.firstName} {patient.lastName}?</h3>
        <p style={{ color: 'var(--ink-soft)', fontSize: 13.5 }}>
          The patient is moved out of the active lists but their full record,
          results and history are kept in <strong>Dismissed patients</strong>.
        </p>
        {error && <div className="auth-banner auth-banner-error">{error}</div>}
        <FormRow label="Reason for dismissing (optional)">
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. treatment completed, transferred to another facility…" />
        </FormRow>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" loading={loading} onClick={() => onConfirm(reason)}>Dismiss patient</Button>
        </div>
      </div>
    </div>
  );
}
