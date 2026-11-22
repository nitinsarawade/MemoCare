import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Mic, ClipboardList, FileText, ArrowRight, Users, Activity, Bell } from 'lucide-react';
import { useAuth, ROLES } from '../../auth/AuthContext';
import { patientService, notificationService } from '../../api';
import { PageHeader, Card, RiskBadge, Badge, LoadingState, EmptyState, ErrorState, Button } from '../../components/ui/primitives';
import NavItemInfo from '../../components/ui/NavItemInfo';
import './dashboard.css';

// One-line explanation for each dashboard stat card, opened by its small arrow.
const STAT_INFO = {
  patients: 'Total number of active patients currently in your care. Dismissed patients are not counted here — they live only in the Dismissed archive.',
  high: 'Patients whose most recent screening placed them at HIGH risk of cognitive decline. These should be reviewed by a doctor as soon as possible.',
  moderate: 'Patients whose most recent screening placed them at MODERATE risk. Worth monitoring closely and scheduling a follow-up screening.',
  low: 'Patients whose most recent screening placed them at LOW risk. Keep up routine screenings to catch any future change early.',
};

export default function DashboardPage() {
  const { user, role } = useAuth();
  const isStaff = role === ROLES.HOSPITAL_STAFF || role === ROLES.ADMIN;

  const patientsQuery = useQuery({ queryKey: ['patients'], queryFn: patientService.list });
  const notifQuery = useQuery({ queryKey: ['notifications', 'recent'], queryFn: () => notificationService.list() });

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${user?.firstName || ''}`}
        description={
          isStaff
            ? 'Here is what needs your attention across your patients today.'
            : "Here's the latest on the people you're caring for."
        }
      />

      {isStaff ? (
        <StaffDashboard query={patientsQuery} />
      ) : (
        <FamilyDashboard query={patientsQuery} />
      )}

      <div className="dash-notif-strip">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
          <Bell size={16} /> Recent notifications
        </h3>
        {notifQuery.isLoading && <LoadingState rows={2} />}
        {notifQuery.data && notifQuery.data.length === 0 && <p style={{ color: 'var(--ink-faint)', fontSize: 13.5 }}>You're all caught up.</p>}
        {notifQuery.data && notifQuery.data.slice(0, 4).map((n) => (
          <div className="dash-notif-row" key={n.id}>
            <span className={n.isRead ? '' : 'dash-notif-dot'} />
            <span>{n.title || n.message}</span>
          </div>
        ))}
        {notifQuery.data?.length > 0 && (
          <Link to="/notifications" style={{ fontSize: 13, fontWeight: 600 }}>View all notifications →</Link>
        )}
      </div>
    </div>
  );
}

function FamilyDashboard({ query }) {
  const { data: patients, isLoading, isError, error, refetch } = query;

  if (isLoading) return <LoadingState rows={4} />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  if (!patients?.length) {
    return (
      <EmptyState
        icon={<Users size={30} />}
        title="No linked patients yet"
        description="Once a hospital or family member links you to a patient, they'll show up here."
      />
    );
  }

  return (
    <div className="patient-card-grid">
      {patients.map((p) => (
        <PatientQuickCard key={p.id} patient={p} />
      ))}
    </div>
  );
}

function PatientQuickCard({ patient }) {
  return (
    <Card className="patient-quick-card">
      <div className="patient-quick-head">
        <div className="patient-quick-avatar">{(patient.firstName?.[0] || '') + (patient.lastName?.[0] || '')}</div>
        <div>
          <div className="patient-quick-name">{patient.firstName} {patient.lastName}</div>
          <RiskBadge level={patient.latestRiskLevel} size="sm" />
        </div>
      </div>
      <div className="patient-quick-actions">
        <Button as={Link} to={`/patients/${patient.id}/recordings`} size="sm" variant="secondary">
          <Mic size={14} /> Record
        </Button>
        <Button as={Link} to={`/patients/${patient.id}/screening`} size="sm" variant="secondary">
          <ClipboardList size={14} /> Screening
        </Button>
        <Button as={Link} to={`/patients/${patient.id}/report`} size="sm" variant="secondary">
          <FileText size={14} /> Report
        </Button>
      </div>
      <Link className="patient-quick-open" to={`/patients/${patient.id}`}>
        Open patient <ArrowRight size={14} />
      </Link>
    </Card>
  );
}

function StaffDashboard({ query }) {
  const navigate = useNavigate();
  const { data: allPatients, isLoading, isError, error, refetch } = query;
  const [q, setQ] = useState('');

  // Dismissed patients live only in the Dismissed archive — keep them out of
  // the active dashboard entirely (stats and list).
  const patients = useMemo(
    () => (allPatients || []).filter((p) => p.status !== 'DISMISSED'),
    [allPatients]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return patients;
    return patients.filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(s));
  }, [patients, q]);

  const riskCounts = useMemo(() => {
    const counts = { LOW: 0, MODERATE: 0, HIGH: 0, UNKNOWN: 0 };
    (patients || []).forEach((p) => {
      const key = (p.latestRiskLevel || 'UNKNOWN').toUpperCase();
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [patients]);

  return (
    <div>
      <div className="stat-row">
        <Card className="stat-card">
          <div className="stat-icon"><Users size={18} /></div>
          <div>
            <div className="stat-value">{patients?.length ?? '—'}</div>
            <div className="stat-label">Patients</div>
          </div>
          <NavItemInfo info={STAT_INFO.patients} />
        </Card>
        <Card className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--risk-high-bg)', color: 'var(--risk-high)' }}><Activity size={18} /></div>
          <div>
            <div className="stat-value">{riskCounts.HIGH}</div>
            <div className="stat-label">High risk</div>
          </div>
          <NavItemInfo info={STAT_INFO.high} />
        </Card>
        <Card className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--risk-moderate-bg)', color: 'var(--risk-moderate)' }}><Activity size={18} /></div>
          <div>
            <div className="stat-value">{riskCounts.MODERATE}</div>
            <div className="stat-label">Moderate risk</div>
          </div>
          <NavItemInfo info={STAT_INFO.moderate} />
        </Card>
        <Card className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--risk-low-bg)', color: 'var(--risk-low)' }}><Activity size={18} /></div>
          <div>
            <div className="stat-value">{riskCounts.LOW}</div>
            <div className="stat-label">Low risk</div>
          </div>
          <NavItemInfo info={STAT_INFO.low} />
        </Card>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-toolbar">
          <div className="search-input">
            <Search size={15} />
            <input placeholder="Search patients by name…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button as={Link} to="/patients" size="sm" variant="ghost">
            Full patient list <ArrowRight size={14} />
          </Button>
        </div>

        {isLoading && <div style={{ padding: 20 }}><LoadingState rows={5} /></div>}
        {isError && <div style={{ padding: 20 }}><ErrorState error={error} onRetry={refetch} /></div>}
        {!isLoading && !isError && filtered.length === 0 && (
          <div style={{ padding: 20 }}>
            <EmptyState title="No patients found" description="Try a different search, or check back once patients are registered." />
          </div>
        )}
        {!isLoading && filtered.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Risk</th>
                <th>Doctor</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 8).map((p) => (
                <tr key={p.id} className="clickable-row" onClick={() => navigate(`/patients/${p.id}`)}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.firstName} {p.lastName}</div>
                  </td>
                  <td><RiskBadge level={p.latestRiskLevel} size="sm" /></td>
                  <td>{p.assignedDoctor ? `${p.assignedDoctor.firstName} ${p.assignedDoctor.lastName}` : <Badge tone="neutral">Unassigned</Badge>}</td>
                  <td style={{ textAlign: 'right' }}><ArrowRight size={15} color="var(--ink-faint)" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
