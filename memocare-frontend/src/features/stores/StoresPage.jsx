import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Store, MapPin, Search } from 'lucide-react';
import { storeService } from '../../api';
import { PageHeader, Card, Button, Badge, LoadingState, EmptyState, ErrorState } from '../../components/ui/primitives';

export default function StoresPage() {
  const [coords, setCoords] = useState(null);
  const [locError, setLocError] = useState('');
  const [selected, setSelected] = useState(null);
  const [radiusKm, setRadiusKm] = useState(5);

  const useMyLocation = () => {
    setLocError('');
    if (!navigator.geolocation) {
      setLocError('Location is not available in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => setLocError('Could not get your location. You can still browse once a location is set.')
    );
  };

  const storesQuery = useQuery({
    queryKey: ['stores-nearby', coords, radiusKm],
    queryFn: () => storeService.nearby({ latitude: coords.latitude, longitude: coords.longitude, radiusKm }),
    enabled: !!coords,
  });

  return (
    <div>
      <PageHeader
        eyebrow="Care"
        title="Medical Stores"
        description="Find nearby medical stores and check medicine availability."
        actions={<Button variant="secondary" onClick={useMyLocation}><MapPin size={15} /> Use my location</Button>}
      />

      {locError && <div className="auth-banner auth-banner-error" style={{ maxWidth: 480 }}>{locError}</div>}

      {!coords && !locError && (
        <EmptyState icon={<Store size={28} />} title="Share your location to see nearby stores" description="Nothing is shared until you choose to." />
      )}

      {coords && (
        <div className="overview-grid">
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Nearby stores</h3>
              <select value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--line)' }}>
                <option value={2}>2 km</option>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
              </select>
            </div>
            {storesQuery.isLoading && <LoadingState rows={4} />}
            {storesQuery.isError && <ErrorState error={storesQuery.error} onRetry={storesQuery.refetch} />}
            {storesQuery.data?.length === 0 && <EmptyState title="No stores found nearby" description="Try a larger radius." />}
            {storesQuery.data?.map((s) => (
              <div key={s.id} className="list-row" style={{ cursor: 'pointer' }} onClick={() => setSelected(s)}>
                <div>
                  <div style={{ fontWeight: 600 }}>{s.storeName}</div>
                  <div className="field-hint">{[s.address, s.city, s.taluka ? `Taluka: ${s.taluka}` : null].filter(Boolean).join(', ')}</div>
                </div>
                {s.distanceKm != null && <Badge tone="info">{s.distanceKm.toFixed(1)} km</Badge>}
              </div>
            ))}
          </Card>

          <Card>
            <h3 style={{ marginBottom: 12 }}>{selected ? selected.name : 'Store details'}</h3>
            {!selected && <p className="field-hint">Select a store to view its medicine availability.</p>}
            {selected && <StoreDetail storeId={selected.id} />}
          </Card>
        </div>
      )}
    </div>
  );
}

function StoreDetail({ storeId }) {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['store', storeId], queryFn: () => storeService.get(storeId) });

  if (isLoading) return <LoadingState rows={3} />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  if (!data) return null;

  return (
    <div>
      <p style={{ fontSize: 13.5, marginBottom: 4 }}>{data.address}</p>
      {data.phone && <p className="field-hint" style={{ marginBottom: 12 }}>{data.phone}</p>}
      <h4 style={{ marginBottom: 8 }}>Medicine availability</h4>
      {(!data.medicines || data.medicines.length === 0) && <p className="field-hint">No catalog listed for this store.</p>}
      {data.medicines?.map((m) => (
        <div className="mini-row" key={m.id}>
          <span>{m.name}</span>
          <Badge tone={m.inStock ? 'success' : 'neutral'}>{m.inStock ? 'In stock' : 'Out of stock'}</Badge>
        </div>
      ))}
    </div>
  );
}
