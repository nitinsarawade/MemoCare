import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Settings2 } from 'lucide-react';
import { notificationService } from '../../api';
import { PageHeader, Card, Button, LoadingState, EmptyState, ErrorState } from '../../components/ui/primitives';

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [showPrefs, setShowPrefs] = useState(false);
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['notifications', 'all'], queryFn: () => notificationService.list() });

  const markRead = async (id) => {
    await notificationService.markRead(id);
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Resources"
        title="Notifications"
        actions={<Button variant="secondary" onClick={() => setShowPrefs(true)}><Settings2 size={15} /> Preferences</Button>}
      />
      <Card style={{ padding: 0 }}>
        {isLoading && <div style={{ padding: 20 }}><LoadingState rows={4} /></div>}
        {isError && <div style={{ padding: 20 }}><ErrorState error={error} onRetry={refetch} /></div>}
        {data?.length === 0 && <div style={{ padding: 20 }}><EmptyState icon={<Bell size={26} />} title="No notifications yet" /></div>}
        {data?.map((n) => (
          <div
            key={n.id}
            className="list-row"
            style={{ padding: '14px 20px', background: n.isRead ? 'transparent' : 'var(--primary-tint)', cursor: n.isRead ? 'default' : 'pointer' }}
            onClick={() => !n.isRead && markRead(n.id)}
          >
            <div>
              <div style={{ fontWeight: n.isRead ? 500 : 700 }}>{n.title || n.message}</div>
              {n.title && n.message && <div className="field-hint">{n.message}</div>}
              <div className="field-hint">{new Date(n.createdAt).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </Card>
      {showPrefs && <PreferencesModal onClose={() => setShowPrefs(false)} />}
    </div>
  );
}

const NOTIFICATION_TYPES = [
  { key: 'TEST_REMINDER', label: 'Test reminders' },
  { key: 'RISK_ALERT', label: 'Risk alerts' },
  { key: 'LINK_INVITE', label: 'Invites' },
  { key: 'APPOINTMENT_REMINDER', label: 'Appointment reminders' },
  { key: 'SYSTEM', label: 'System messages' },
];

function PreferencesModal({ onClose }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['notification-prefs'], queryFn: notificationService.listPreferences });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const prefFor = (type) => (data || []).find((p) => p.type === type) || { type, inAppEnabled: true, emailEnabled: false };

  const toggle = async (type, channel, current) => {
    setSaving(true);
    setError('');
    try {
      const pref = prefFor(type);
      await notificationService.setPreference({
        type,
        inAppEnabled: channel === 'inApp' ? !current : pref.inAppEnabled,
        emailEnabled: channel === 'email' ? !current : pref.emailEnabled,
      });
      qc.invalidateQueries({ queryKey: ['notification-prefs'] });
    } catch (err) {
      setError(err.message || 'Could not save that preference.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h3>Notification preferences</h3>
        {error && <div className="auth-banner auth-banner-error">{error}</div>}
        {isLoading ? (
          <LoadingState rows={3} />
        ) : (
          <table style={{ width: '100%', fontSize: 13.5 }}>
            <thead>
              <tr><th style={{ textAlign: 'left' }}>Type</th><th>In-app</th><th>Email</th></tr>
            </thead>
            <tbody>
              {NOTIFICATION_TYPES.map(({ key, label }) => {
                const pref = prefFor(key);
                return (
                  <tr key={key}>
                    <td style={{ padding: '8px 0' }}>{label}</td>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={!!pref.inAppEnabled} disabled={saving} onChange={() => toggle(key, 'inApp', pref.inAppEnabled)} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={!!pref.emailEnabled} disabled={saving} onChange={() => toggle(key, 'email', pref.emailEnabled)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <Button variant="secondary" onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}
