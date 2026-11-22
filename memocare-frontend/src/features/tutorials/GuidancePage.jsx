import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2 } from 'lucide-react';
import { guidanceService } from '../../api';
import { PageHeader, Card, Badge, LoadingState, EmptyState, ErrorState } from '../../components/ui/primitives';

export default function GuidancePage() {
  const listQuery = useQuery({ queryKey: ['guidance'], queryFn: guidanceService.list });
  const progressQuery = useQuery({ queryKey: ['tutorials-progress'], queryFn: guidanceService.myProgress });

  const completedIds = new Set((progressQuery.data?.completed || []).map((p) => p.articleId));

  return (
    <div>
      <PageHeader eyebrow="Resources" title="Guidance" description="Educational articles on cognitive health, caregiving, and using MemoCare." />

      {listQuery.isLoading && <LoadingState rows={4} />}
      {listQuery.isError && <ErrorState error={listQuery.error} onRetry={listQuery.refetch} />}
      {listQuery.data?.length === 0 && <EmptyState icon={<BookOpen size={28} />} title="No guidance articles published yet" />}

      <div className="patient-card-grid">
        {listQuery.data?.map((t) => (
          <Card key={t.id} as={Link} to={`/guidance/${t.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{t.title}</h3>
              {completedIds.has(t.id) && <CheckCircle2 size={18} color="var(--risk-low)" />}
            </div>
            {t.summary && <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginBottom: 8 }}>{t.summary}</p>}
            {t.hasVideo && <Badge tone="info">Includes video</Badge>}
          </Card>
        ))}
      </div>
    </div>
  );
}
