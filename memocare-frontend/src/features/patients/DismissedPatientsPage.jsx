import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Archive, RotateCcw, ChevronDown, ChevronRight, Users, ClipboardList, Activity } from 'lucide-react';
import { patientService } from '../../api';
import { PageHeader, Card, RiskBadge, Badge, LoadingState, EmptyState, ErrorState, Button } from '../../components/ui/primitives';
import './patients.css';

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DismissedPatientsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState(null);

  const { data: patients, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dismissed-patients'],
    queryFn: patientService.listDismissed,
  });

  const readmitMutation = useMutation({
    mutationFn: (id) => patientService.readmit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dismissed-patients'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  const filtered = useMemo(() => {
    if (!patients) return [];
    const s = q.trim().toLowerCase();
    if (!s) return patients;
    return patients.filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(s));
  }, [patients, q]);

  return (
    <div>
      <PageHeader
        eyebrow="Patients"
        title="Dismissed patients"
        description="Every dismissed patient with their full record, screening results and speech-analysis results, plus the dates they joined and were dismissed."
        actions={<Badge tone="info">{patients?.length ?? 0} dismissed</Badge>}
      />

      <div className="table-toolbar" style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-md) var(--radius-md) 0 0', background: 'var(--paper-raised)' }}>
        <div className="search-input">
          <Search size={15} />
          <input placeholder="Search by name…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <Card style={{ padding: 0, borderRadius: '0 0 var(--radius-md) var(--radius-md)', borderTop: 'none' }}>
        {isLoading && <div style={{ padding: 20 }}><LoadingState rows={6} /></div>}
        {isError && <div style={{ padding: 20 }}><ErrorState error={error} onRetry={refetch} /></div>}
        {!isLoading && !isError && filtered.length === 0 && (
          <div style={{ padding: 20 }}>
            <EmptyState
              icon={<Archive size={30} />}
              title="No dismissed patients"
              description="Patients you dismiss from their workspace page appear here, with all their history and results."
            />
          </div>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 30 }} />
                <th>Patient</th>
                <th>Joined</th>
                <th>Dismissed</th>
                <th>Reason</th>
                <th>Latest risk</th>
                <th>Screenings</th>
                <th>Doctor</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <FragmentRow
                  key={p.id}
                  patient={p}
                  expanded={expanded === p.id}
                  onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
                  onOpen={() => navigate(`/patients/${p.id}`)}
                  onReadmit={() => readmitMutation.mutate(p.id)}
                  readmitPending={readmitMutation.isPending && readmitMutation.variables === p.id}
                />
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function FragmentRow({ patient: p, expanded, onToggle, onOpen, onReadmit, readmitPending }) {
  return (
    <>
      <tr className="clickable-row" onClick={onToggle}>
        <td>{expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</td>
        <td style={{ fontWeight: 600 }}>
          <div>{p.firstName} {p.lastName}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontWeight: 400 }}>
            {p.sex || '—'} · DOB {fmt(p.dateOfBirth)}
          </div>
        </td>
        <td>{fmt(p.createdAt)}</td>
        <td>{fmt(p.dismissedAt)}</td>
        <td style={{ maxWidth: 180 }}>{p.dismissReason || <Badge tone="neutral">No reason given</Badge>}</td>
        <td><RiskBadge level={p.latestRiskLevel} size="sm" /></td>
        <td>{p.screeningAttempts?.length ?? 0}</td>
        <td>{p.assignedDoctor ? `${p.assignedDoctor.firstName} ${p.assignedDoctor.lastName}` : <Badge tone="neutral">Unassigned</Badge>}</td>
        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); onReadmit(); }}
            loading={readmitPending}
            title="Move this patient back to the active list"
          >
            <RotateCcw size={14} /> Readmit
          </Button>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={9} style={{ background: 'var(--paper-2, #fafafa)', padding: 16 }}>
            <DismissedDetail patient={p} onOpen={onOpen} />
          </td>
        </tr>
      )}
    </>
  );
}

function DismissedDetail({ patient: p, onOpen }) {
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        <DetailBlock title="Registration">
          <DetailRow label="Registered by" value={p.createdBy ? `${p.createdBy.firstName} ${p.createdBy.lastName}` : '—'} />
          <DetailRow label="Registered on" value={fmt(p.createdAt)} />
          <DetailRow label="Hospital" value={p.hospital?.name || '—'} />
          <DetailRow label="Diagnosis status" value={p.diagnosisStatus || '—'} />
          <DetailRow label="Phone" value={p.phone || '—'} />
          <DetailRow label="Address" value={p.address || '—'} />
          <DetailRow label="Emergency contact" value={p.emergencyContactName ? `${p.emergencyContactName}${p.emergencyContactPhone ? ` · ${p.emergencyContactPhone}` : ''}` : '—'} />
        </DetailBlock>
        <DetailBlock title="Dismissal">
          <DetailRow label="Dismissed on" value={fmt(p.dismissedAt)} />
          <DetailRow label="Reason" value={p.dismissReason || '—'} />
          <DetailRow label="Time in care" value={`${Math.max(0, Math.round(((p.dismissedAt ? new Date(p.dismissedAt) : new Date()) - new Date(p.createdAt)) / 86400000))} days`} />
          <DetailRow label="Linked users" value={(p.links || []).map((l) => l.user ? `${l.user.firstName} ${l.user.lastName} (${l.user.role})` : null).filter(Boolean).join(', ') || 'None'} />
        </DetailBlock>
      </div>

      <div>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 8 }}>
          <ClipboardList size={15} /> Screening results
        </h4>
        {(p.screeningAttempts?.length ?? 0) === 0 ? (
          <p style={{ color: 'var(--ink-faint)', fontSize: 13 }}>No screening attempts recorded.</p>
        ) : (
          <table className="data-table" style={{ borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)' }}>
            <thead>
              <tr>
                <th>Test</th>
                <th>Date</th>
                <th>Score</th>
                <th>%</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {p.screeningAttempts.map((a) => (
                <tr key={a.id}>
                  <td>{a.test?.title || a.test?.testType || '—'}</td>
                  <td>{fmt(a.startedAt)}</td>
                  <td>{a.totalScore != null ? `${a.totalScore} / ${a.maxPossibleScore ?? '?'}` : '—'}</td>
                  <td>{a.scorePercentage != null ? `${Math.round(a.scorePercentage)}%` : '—'}</td>
                  <td>{a.completedAt ? <Badge tone="success">Completed</Badge> : <Badge tone="neutral">Incomplete</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 8 }}>
          <Activity size={15} /> Speech analysis results
        </h4>
        {(p.mediaSessions?.length ?? 0) === 0 ? (
          <p style={{ color: 'var(--ink-faint)', fontSize: 13 }}>No analyzed speech sessions recorded.</p>
        ) : (
          <table className="data-table" style={{ borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)' }}>
            <thead>
              <tr>
                <th>Session</th>
                <th>Recorded</th>
                <th>Analyzed</th>
                <th>Risk score</th>
                <th>Risk level</th>
                <th>Speech rate</th>
                <th>Coherence</th>
                <th>Pauses</th>
              </tr>
            </thead>
            <tbody>
              {p.mediaSessions.map((m) => (
                <tr key={m.id}>
                  <td>{m.assessmentTag || 'Speech sample'}</td>
                  <td>{fmt(m.createdAt)}</td>
                  <td>{fmt(m.analyzedAt)}</td>
                  <td>{m.riskScore != null ? Math.round(m.riskScore) : '—'}</td>
                  <td><RiskBadge level={m.riskLevel} size="sm" /></td>
                  <td>{m.speechRateWpm != null ? `${Math.round(m.speechRateWpm)} wpm` : '—'}</td>
                  <td>{m.coherenceScore != null ? m.coherenceScore.toFixed(2) : '—'}</td>
                  <td>{m.pauseCount ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <Button size="sm" variant="secondary" onClick={onOpen}>
          <Users size={14} /> Open the patient record
        </Button>
      </div>
    </div>
  );
}

function DetailBlock({ title, children }) {
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
      <h4 style={{ fontSize: 13, marginBottom: 8 }}>{title}</h4>
      {children}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, padding: '3px 0' }}>
      <span style={{ color: 'var(--ink-faint)' }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}
