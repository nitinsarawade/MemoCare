import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, MapPin, ShieldCheck, Link2 } from 'lucide-react';
import { locationService, safeZoneService } from '../../../api';
import { Card, Button, Badge, FormRow, LoadingState, EmptyState, ErrorState } from '../../../components/ui/primitives';
import { useAuth, isClinical } from '../../../auth/AuthContext';

export default function LocationTab({ patient }) {
  const { role } = useAuth();
  const canManageZones = isClinical(role) || role === 'CARETAKER';
  const qc = useQueryClient();
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState('');
  const [shareUrl, setShareUrl] = useState('');

  const latestQuery = useQuery({ queryKey: ['location-latest', patient.id], queryFn: () => locationService.latest(patient.id) });
  const historyQuery = useQuery({ queryKey: ['location-history', patient.id], queryFn: () => locationService.history(patient.id) });
  const zonesQuery = useQuery({ queryKey: ['safe-zones', patient.id], queryFn: () => safeZoneService.list(patient.id) });

  const removeZone = async (zoneId) => {
    if (!window.confirm('Remove this safe zone?')) return;
    await safeZoneService.remove(patient.id, zoneId);
    qc.invalidateQueries({ queryKey: ['safe-zones', patient.id] });
  };

  const recordMyLocation = () => {
    setShareError('');
    if (!navigator.geolocation) {
      setShareError('This browser does not support GPS location.');
      return;
    }
    setSharing(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        await locationService.checkIn(patient.id, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        });
        await Promise.all([
          latestQuery.refetch(),
          historyQuery.refetch(),
        ]);
      } catch (err) {
        setShareError(err.message || 'Could not save your location.');
      } finally {
        setSharing(false);
      }
    }, (error) => {
      setSharing(false);
      setShareError(error.code === 1 ? 'Location permission was denied.' : 'Could not read your current location.');
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };

  const createShareLink = async () => {
    setShareError('');
    try {
      const result = await locationService.createShareLink(patient.id);
      setShareUrl(result.shareUrl);
      await navigator.clipboard?.writeText(result.shareUrl);
    } catch (err) {
      setShareError(err.message || 'Could not create a location link.');
    }
  };

  return (
    <div className="overview-grid">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><MapPin size={17} /> Latest location</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button size="sm" variant="secondary" onClick={recordMyLocation} loading={sharing}><MapPin size={14} /> Share current GPS</Button>
            {canManageZones && <Button size="sm" variant="ghost" onClick={createShareLink}><Link2 size={14} /> Device link</Button>}
          </div>
        </div>
        {shareError && <div className="auth-banner auth-banner-error">{shareError}</div>}
        {shareUrl && <div className="auth-banner auth-banner-success" style={{ wordBreak: 'break-all' }}>Location link created and copied: {shareUrl}</div>}
        {latestQuery.isLoading && <LoadingState rows={2} />}
        {latestQuery.isError && <ErrorState error={latestQuery.error} onRetry={latestQuery.refetch} />}
        {latestQuery.data ? (
          <>
            <p style={{ fontSize: 14, marginBottom: 4 }}>{latestQuery.data.address || `${latestQuery.data.latitude?.toFixed(4)}, ${latestQuery.data.longitude?.toFixed(4)}`}</p>
            <p className="field-hint">Recorded {new Date(latestQuery.data.recordedAt || latestQuery.data.createdAt).toLocaleString()}</p>
            {latestQuery.data.zoneStatus && (
              <Badge tone={latestQuery.data.zoneStatus === 'INSIDE' ? 'success' : 'danger'} style={{ marginTop: 8 }}>
                {latestQuery.data.zoneStatus === 'INSIDE' ? 'Inside a safe zone' : 'Outside all safe zones'}
              </Badge>
            )}
          </>
        ) : (
          !latestQuery.isLoading && <EmptyState title="No location shared yet" description="Location will appear here once check-ins start." />
        )}
      </Card>

      <Card>
        <h3 style={{ marginBottom: 10 }}>Recent history</h3>
        {historyQuery.isLoading && <LoadingState rows={3} />}
        {historyQuery.data?.length === 0 && <p className="field-hint">No location history yet.</p>}
        {historyQuery.data?.slice(0, 6).map((h) => (
          <div className="mini-row" key={h.id}>
            <span>{new Date(h.recordedAt || h.createdAt).toLocaleString()}</span>
            <span className="field-hint">{h.address || `${h.latitude?.toFixed(3)}, ${h.longitude?.toFixed(3)}`}</span>
          </div>
        ))}
      </Card>

      <Card className="overview-span-2">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><ShieldCheck size={17} /> Safe zones</h3>
          {canManageZones && <Button size="sm" onClick={() => setShowZoneModal(true)}><Plus size={14} /> Add zone</Button>}
        </div>
        {zonesQuery.isLoading && <LoadingState rows={2} />}
        {zonesQuery.data?.length === 0 && <p className="field-hint">No safe zones configured.</p>}
        {zonesQuery.data?.map((z) => (
          <div className="list-row" key={z.id}>
            <div>
              <div style={{ fontWeight: 600 }}>{z.name}</div>
              <div className="field-hint">{z.radiusMeters ? `${z.radiusMeters}m radius` : ''} · {z.centerLat?.toFixed(3)}, {z.centerLng?.toFixed(3)}</div>
            </div>
            {canManageZones && (
              <Button size="sm" variant="ghost" onClick={() => removeZone(z.id)}><Trash2 size={13} /></Button>
            )}
          </div>
        ))}
      </Card>

      {showZoneModal && (
        <SafeZoneModal
          onClose={() => setShowZoneModal(false)}
          onCreate={async (body) => {
            await safeZoneService.create(patient.id, body);
            setShowZoneModal(false);
            qc.invalidateQueries({ queryKey: ['safe-zones', patient.id] });
          }}
        />
      )}
    </div>
  );
}

function SafeZoneModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', address: '', latitude: '', longitude: '', radiusMeters: '200' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
        await onCreate({
          name: form.name,
          centerLat: Number(form.latitude),
          centerLng: Number(form.longitude),
          radiusMeters: Number(form.radiusMeters),
        });
    } catch (err) {
      setError(err.message || 'Could not add the safe zone.');
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h3>Add safe zone</h3>
        {error && <div className="auth-banner auth-banner-error">{error}</div>}
        <form onSubmit={submit}>
          <FormRow label="Name"><input required value={form.name} onChange={set('name')} placeholder="e.g. Home" /></FormRow>
          <FormRow label="Address (optional)"><input value={form.address} onChange={set('address')} /></FormRow>
          <div style={{ display: 'flex', gap: 10 }}>
            <FormRow label="Latitude"><input required type="number" step="any" value={form.latitude} onChange={set('latitude')} /></FormRow>
            <FormRow label="Longitude"><input required type="number" step="any" value={form.longitude} onChange={set('longitude')} /></FormRow>
          </div>
          <FormRow label="Radius (meters)"><input required type="number" min="20" value={form.radiusMeters} onChange={set('radiusMeters')} /></FormRow>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>Add zone</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
