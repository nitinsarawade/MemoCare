import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Gamepad2, Compass, BookOpen, Brain, Grid3x3 } from 'lucide-react';
import { screeningService, patientService } from '../../api';
import { PageHeader, Card, Button, LoadingState, EmptyState, ErrorState } from '../../components/ui/primitives';

const GAME_ICONS = {
  ORIENTATION: Compass,
  WORD_RECALL: BookOpen,
  NAME_THE_OBJECTS: Brain,
  PATTERN_MEMORY: Grid3x3,
};

export default function MindGamesPage() {
  const navigate = useNavigate();
  const gamesQuery = useQuery({ queryKey: ['games'], queryFn: screeningService.listGames });
  const patientsQuery = useQuery({ queryKey: ['patients'], queryFn: patientService.list });
  const [patientId, setPatientId] = useState('');

  const patients = patientsQuery.data || [];
  const games = (gamesQuery.data || []).filter((game, index, all) => game.testType !== 'PATTERN_MEMORY' || index === all.findIndex((candidate) => candidate.testType === 'PATTERN_MEMORY'));
  const effectivePatientId = patientId || patients[0]?.id || '';

  const play = (gameId) => {
    if (!effectivePatientId) return;
    navigate(`/patients/${effectivePatientId}/screening/take/${gameId}`);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Mind Games"
        title="Mind Games"
        description="Short, game-like cognitive exercises — scored the same way as formal screening tests."
      />

      {patients.length > 1 && (
        <Card style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontSize: 13.5, fontWeight: 600 }}>Playing as patient:</label>
          <select value={effectivePatientId} onChange={(e) => setPatientId(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)' }}>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
          </select>
        </Card>
      )}

      {gamesQuery.isLoading && <LoadingState rows={3} />}
      {gamesQuery.isError && <ErrorState error={gamesQuery.error} onRetry={gamesQuery.refetch} />}
      {games.length === 0 && !gamesQuery.isLoading && <EmptyState icon={<Gamepad2 size={28} />} title="No games available yet" />}
      {!patients.length && !patientsQuery.isLoading && (
        <EmptyState title="No linked patients" description="Games are played on behalf of a linked patient." />
      )}

      {games.length > 0 && patients.length > 0 && (
        <div className="game-card-grid">
          {games.map((g) => {
            const Icon = GAME_ICONS[g.testType] || Gamepad2;
            return (
              <Card className="game-card" key={g.id}>
                <div className="game-card-icon"><Icon size={19} /></div>
                <div style={{ fontWeight: 700 }}>{g.title}</div>
                <p className="field-hint" style={{ margin: 0 }}>{g.items?.length ?? g.itemCount ?? '—'} quick questions</p>
                <Button size="sm" onClick={() => play(g.id)} style={{ marginTop: 4 }}>Play</Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Opened from the sidebar (/mind-games/:gameId): starts that game straight away
// for the only linked patient, or asks which patient is playing.
export function GameLaunch() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const patientsQuery = useQuery({ queryKey: ['patients'], queryFn: patientService.list });
  const [patientId, setPatientId] = useState('');
  const patients = patientsQuery.data || [];

  if (patientsQuery.isLoading) return <LoadingState rows={2} />;
  if (patientsQuery.isError) return <ErrorState error={patientsQuery.error} onRetry={patientsQuery.refetch} />;
  if (!patients.length) return <EmptyState title="No linked patients" description="Games are played on behalf of a linked patient." />;
  if (patients.length === 1) return <Navigate to={`/patients/${patients[0].id}/screening/take/${gameId}`} replace />;

  const chosen = patientId || patients[0].id;
  return (
    <div>
      <PageHeader eyebrow="Mind Games" title="Who is playing?" description="Choose the patient this game is played for." />
      <Card style={{ maxWidth: 420, display: 'flex', gap: 12, alignItems: 'center' }}>
        <select value={chosen} onChange={(e) => setPatientId(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)' }}>
          {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
        </select>
        <Button onClick={() => navigate(`/patients/${chosen}/screening/take/${gameId}`)}>Play</Button>
      </Card>
    </div>
  );
}
