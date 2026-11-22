import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2, Users } from 'lucide-react';
import { patientService } from '../../../api';
import { Card, Button, Badge, FormRow, LoadingState, EmptyState, ErrorState } from '../../../components/ui/primitives';
import { useAuth, isClinical } from '../../../auth/AuthContext';

export default function AccessTab({ patient }) {
  const { role, user } = useAuth();
  const canManage = isClinical(role);
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['patient-links', patient.id],
    queryFn: () => patientService.listLinks(patient.id),
  });

  const unlink = async (userId) => {
    if (!window.confirm('Remove this person\u2019s access to the patient?')) return;
    await patientService.unlink(patient.id, userId);
    qc.invalidateQueries({ queryKey: ['patient-links', patient.id] });
  };

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Linked family & caretakers</h3>
        {canManage && <Button size="sm" onClick={() => setShowInvite(true)}><UserPlus size={14} /> Invite by email</Button>}
      </div>

      {isLoading && <LoadingState rows={3} />}
      {isError && <ErrorState error={error} onRetry={refetch} />}
      {data?.length === 0 && !isLoading && (
        <EmptyState icon={<Users size={26} />} title="No one linked yet" description={canManage ? 'Invite a family member or caretaker by email.' : undefined} />
      )}
      {data?.map((link) => (
        <div className="list-row" key={link.userId || link.id}>
          <div>
            <div style={{ fontWeight: 600 }}>{link.firstName} {link.lastName}</div>
            <div className="field-hint">{link.email}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Badge tone="info">{link.role}</Badge>
            {canManage && link.userId !== user?.id && (
              <Button size="sm" variant="ghost" onClick={() => unlink(link.userId)}><Trash2 size={13} /></Button>
            )}
          </div>
        </div>
      ))}

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSend={async (body) => {
            await patientService.invite(patient.id, body);
            setShowInvite(false);
            qc.invalidateQueries({ queryKey: ['patient-links', patient.id] });
          }}
        />
      )}
    </Card>
  );
}

function InviteModal({ onClose, onSend }) {
  const [email, setEmail] = useState('');
  const [linkRole, setLinkRole] = useState('FAMILY_MEMBER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSend({ email, linkRole });
    } catch (err) {
      setError(err.message || 'Could not send the invite.');
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h3>Invite by email</h3>
        {error && <div className="auth-banner auth-banner-error">{error}</div>}
        <form onSubmit={submit}>
          <FormRow label="Email"><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></FormRow>
          <FormRow label="Role">
            <select value={linkRole} onChange={(e) => setLinkRole(e.target.value)}>
              <option value="FAMILY_MEMBER">Family</option>
              <option value="CARETAKER">Caretaker</option>
              <option value="ATTENDING_STAFF">Attending staff</option>
            </select>
          </FormRow>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>Send invite</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
