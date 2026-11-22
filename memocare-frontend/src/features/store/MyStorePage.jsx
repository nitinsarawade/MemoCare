import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Store, Plus, Trash2, Pencil, MapPin } from 'lucide-react';
import { storeService } from '../../api';
import { PageHeader, Card, Button, Badge, FormRow, LoadingState, EmptyState, ErrorState } from '../../components/ui/primitives';

const MAX_MEDICINES = 50;

export default function MyStorePage() {
  const qc = useQueryClient();
  const [showMedicineForm, setShowMedicineForm] = useState(null); // null | 'new' | medicine object

  const storeQuery = useQuery({
    queryKey: ['my-store'],
    queryFn: storeService.mine,
    retry: false,
  });

  const notSetUp = storeQuery.isError && /have not set up/i.test(storeQuery.error?.message || '');

  const invalidate = () => qc.invalidateQueries({ queryKey: ['my-store'] });

  if (storeQuery.isLoading) return <LoadingState rows={5} />;

  if (notSetUp) {
    return (
      <div>
        <PageHeader eyebrow="Medical Store" title="Set up your store" description="Create your store profile to start listing medicines." />
        <StoreProfileForm store={null} onSaved={invalidate} />
      </div>
    );
  }

  if (storeQuery.isError) {
    return <ErrorState error={storeQuery.error} onRetry={storeQuery.refetch} />;
  }

  const store = storeQuery.data;
  const medicines = store?.medicines || [];

  return (
    <div>
      <PageHeader
        eyebrow="Medical Store"
        title={store.storeName}
        description={`${store.address}${store.city ? `, ${store.city}` : ''}${store.taluka ? ` (${store.taluka})` : ''}${store.openTime && store.closeTime ? ` · Open ${store.openTime}–${store.closeTime}` : ''}`}
      />

      <div className="overview-grid">
        <StoreProfileForm store={store} onSaved={invalidate} />

        <Card className="overview-span-2">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Medicines <span className="field-hint">({medicines.length} / {MAX_MEDICINES})</span></h3>
            <Button size="sm" onClick={() => setShowMedicineForm('new')} disabled={medicines.length >= MAX_MEDICINES}>
              <Plus size={14} /> Add medicine
            </Button>
          </div>

          {medicines.length === 0 && (
            <EmptyState icon={<Store size={26} />} title="No medicines listed yet" description="Add your first medicine to appear in nearby searches." />
          )}

          {medicines.map((m) => (
            <div className="list-row" key={m.id}>
              <div>
                <div style={{ fontWeight: 600 }}>{m.name}</div>
                <div className="field-hint">₹{m.price} · {m.quantity ?? 0} in stock</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Button size="sm" variant="ghost" onClick={() => setShowMedicineForm(m)}><Pencil size={13} /></Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    if (!window.confirm(`Remove ${m.name} from your store?`)) return;
                    await storeService.removeMedicine(m.id);
                    invalidate();
                  }}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {showMedicineForm && (
        <MedicineModal
          medicine={showMedicineForm === 'new' ? null : showMedicineForm}
          onClose={() => setShowMedicineForm(null)}
          onSave={async (body) => {
            if (showMedicineForm === 'new') {
              await storeService.addMedicine(body);
            } else {
              await storeService.updateMedicine(showMedicineForm.id, body);
            }
            setShowMedicineForm(null);
            invalidate();
          }}
        />
      )}
    </div>
  );
}

function StoreProfileForm({ store, onSaved }) {
  const [form, setForm] = useState({
    storeName: store?.storeName || '',
    address: store?.address || '',
    city: store?.city || '',
    taluka: store?.taluka || '',
    latitude: store?.latitude ?? '',
    longitude: store?.longitude ?? '',
    phone: store?.phone || '',
    openTime: store?.openTime || '',
    closeTime: store?.closeTime || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setForm((f) => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSaved(false);
    try {
      await storeService.saveMine({
        storeName: form.storeName,
        address: form.address,
        city: form.city,
        taluka: form.taluka,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        phone: form.phone || undefined,
        openTime: form.openTime || undefined,
        closeTime: form.closeTime || undefined,
      });
      await onSaved();
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Could not save your store.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <h3 style={{ marginBottom: 14 }}>Store profile</h3>
      {error && <div className="auth-banner auth-banner-error">{error}</div>}
      {saved && <div className="auth-banner auth-banner-success">Store saved.</div>}
      <form onSubmit={submit}>
        <FormRow label="Store name"><input required value={form.storeName} onChange={set('storeName')} /></FormRow>
        <FormRow label="Address"><input required value={form.address} onChange={set('address')} /></FormRow>
        <div style={{ display: 'flex', gap: 10 }}>
          <FormRow label="City"><input required value={form.city} onChange={set('city')} placeholder="e.g. Pune" /></FormRow>
          <FormRow label="Taluka"><input required value={form.taluka} onChange={set('taluka')} placeholder="e.g. Haveli" /></FormRow>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <FormRow label="Latitude"><input required type="number" step="any" value={form.latitude} onChange={set('latitude')} /></FormRow>
          <FormRow label="Longitude"><input required type="number" step="any" value={form.longitude} onChange={set('longitude')} /></FormRow>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={useMyLocation} style={{ marginBottom: 14 }}>
          <MapPin size={13} /> Use my current location
        </Button>
        <FormRow label="Phone (optional)"><input value={form.phone} onChange={set('phone')} /></FormRow>
        <div style={{ display: 'flex', gap: 10 }}>
          <FormRow label="Opens at"><input type="time" value={form.openTime} onChange={set('openTime')} /></FormRow>
          <FormRow label="Closes at"><input type="time" value={form.closeTime} onChange={set('closeTime')} /></FormRow>
        </div>
        <Button type="submit" loading={loading}>Save store</Button>
      </form>
    </Card>
  );
}

function MedicineModal({ medicine, onClose, onSave }) {
  const [form, setForm] = useState({
    name: medicine?.name || '',
    price: medicine?.price ?? '',
    quantity: medicine?.quantity ?? 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSave({ name: form.name, price: Number(form.price), quantity: Number(form.quantity) });
    } catch (err) {
      setError(err.message || 'Could not save this medicine.');
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h3>{medicine ? 'Edit medicine' : 'Add medicine'}</h3>
        {error && <div className="auth-banner auth-banner-error">{error}</div>}
        <form onSubmit={submit}>
          <FormRow label="Name"><input required value={form.name} onChange={set('name')} /></FormRow>
          <div style={{ display: 'flex', gap: 10 }}>
            <FormRow label="Price"><input required type="number" step="0.01" min="0" value={form.price} onChange={set('price')} /></FormRow>
            <FormRow label="Quantity in stock"><input required type="number" step="1" min="0" value={form.quantity} onChange={set('quantity')} /></FormRow>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>{medicine ? 'Save' : 'Add'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
