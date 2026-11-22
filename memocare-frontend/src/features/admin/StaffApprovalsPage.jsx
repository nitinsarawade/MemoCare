import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserCheck } from 'lucide-react';
import { adminService } from '../../api';
import { PageHeader, Card, Button, LoadingState, EmptyState, ErrorState } from '../../components/ui/primitives';

export default function StaffApprovalsPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['admin-pending-staff'], queryFn: adminService.listPendingStaff });
  const [busyId, setBusyId] = useState(null);
  const [titleDraft, setTitleDraft] = useState({});

  const approve = async (userId) => {
    setBusyId(userId);
    try {
      await adminService.approveStaff(userId, titleDraft[userId] || 'CLINICIAN');
      qc.invalidateQueries({ queryKey: ['admin-pending-staff'] });
    } finally {
      setBusyId(null);
    }
  };
  const reject = async (userId) => {
    setBusyId(userId);
    try {
      await adminService.rejectStaff(userId);
      qc.invalidateQueries({ queryKey: ['admin-pending-staff'] });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Staff approvals" description="Hospital staff signups awaiting admin approval." />
      <Card style={{ padding: 0 }}>
        {isLoading && <div style={{ padding: 20 }}><LoadingState rows={3} /></div>}
        {isError && <div style={{ padding: 20 }}><ErrorState error={error} onRetry={refetch} /></div>}
        {data?.length === 0 && <div style={{ padding: 20 }}><EmptyState icon={<UserCheck size={26} />} title="No pending approvals" /></div>}
        {data?.map((u) => (
          <div className="list-row" key={u.id} style={{ padding: '14px 20px' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{u.firstName} {u.lastName}</div>
              <div className="field-hint">{u.email} · {u.hospital?.name || 'Hospital not set'}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 13, width: 150 }}
                value={titleDraft[u.id] || ''}
                onChange={(e) => setTitleDraft((d) => ({ ...d, [u.id]: e.target.value }))}
              >
                <option value="">Choose profession</option>
                <option value="DOCTOR">Doctor</option>
                <option value="NURSE">Nurse</option>
                <option value="CLINICIAN">Clinician</option>
                <option value="ADMIN_STAFF">Admin staff</option>
              </select>
              <Button size="sm" loading={busyId === u.id} onClick={() => approve(u.id)}>Approve</Button>
              <Button size="sm" variant="danger" loading={busyId === u.id} onClick={() => reject(u.id)}>Reject</Button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
