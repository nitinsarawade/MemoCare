import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UsersRound } from 'lucide-react';
import { adminService } from '../../api';
import { PageHeader, Card, Button, Badge, LoadingState, EmptyState, ErrorState } from '../../components/ui/primitives';

const ROLES = ['', 'FAMILY', 'CARETAKER', 'HOSPITAL_STAFF', 'ADMIN'];
const STATUSES = ['', 'ACTIVE', 'SUSPENDED', 'PENDING'];

export default function UsersAdminPage() {
  const qc = useQueryClient();
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [busyId, setBusyId] = useState(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-users', role, status],
    queryFn: () => adminService.listUsers({ role: role || undefined, status: status || undefined }),
  });

  const act = async (fn, userId) => {
    setBusyId(userId);
    try {
      await fn(userId);
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Users" description="All accounts across the system." />

      <div className="table-toolbar" style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-md) var(--radius-md) 0 0', background: 'var(--paper-raised)' }}>
        <select value={role} onChange={(e) => setRole(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--line)' }}>
          {ROLES.map((r) => <option key={r} value={r}>{r || 'All roles'}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--line)' }}>
          {STATUSES.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
        </select>
      </div>

      <Card style={{ padding: 0, borderRadius: '0 0 var(--radius-md) var(--radius-md)', borderTop: 'none' }}>
        {isLoading && <div style={{ padding: 20 }}><LoadingState rows={4} /></div>}
        {isError && <div style={{ padding: 20 }}><ErrorState error={error} onRetry={refetch} /></div>}
        {data?.length === 0 && <div style={{ padding: 20 }}><EmptyState icon={<UsersRound size={26} />} title="No users match" /></div>}
        {data?.length > 0 && (
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th /></tr></thead>
            <tbody>
              {data.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.firstName} {u.lastName}</td>
                  <td>{u.email}</td>
                  <td><Badge tone="info">{u.role}</Badge></td>
                  <td><Badge tone={u.status === 'SUSPENDED' ? 'danger' : 'success'}>{u.status}</Badge></td>
                  <td style={{ textAlign: 'right' }}>
                    {u.status === 'SUSPENDED' ? (
                      <Button size="sm" variant="secondary" loading={busyId === u.id} onClick={() => act(adminService.reactivateUser, u.id)}>Reactivate</Button>
                    ) : (
                      <Button size="sm" variant="danger" loading={busyId === u.id} onClick={() => act(adminService.suspendUser, u.id)}>Suspend</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
