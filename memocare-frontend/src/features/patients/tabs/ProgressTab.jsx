import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { progressService } from '../../../api';
import { Card, Badge, LoadingState, EmptyState, ErrorState } from '../../../components/ui/primitives';

const RISK_TO_SCORE = { LOW: 1, MODERATE: 2, HIGH: 3 };
const SCORE_TO_LABEL = { 1: 'Low', 2: 'Moderate', 3: 'High' };

export default function ProgressTab({ patient }) {
  const timelineQuery = useQuery({ queryKey: ['progress-timeline', patient.id], queryFn: () => progressService.timeline(patient.id) });
  const summaryQuery = useQuery({ queryKey: ['progress-summary', patient.id], queryFn: () => progressService.summary(patient.id) });

  const timelineEntries = timelineQuery.data?.timeline || [];

  const points = timelineEntries.map((entry) => ({
    date: new Date(entry.date || entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    score: RISK_TO_SCORE[(entry.riskLevel || '').toUpperCase()] ?? null,
    source: entry.source,
  }));

  return (
    <div>
      <div className="progress-metric-row">
        <Card style={{ flex: 1, minWidth: 220 }}>
          <div className="field-hint">Trend</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
            {summaryQuery.data?.trends?.overall ? (
              <Badge tone={trendTone(summaryQuery.data.trends.overall)}>{trendLabel(summaryQuery.data.trends.overall)}</Badge>
            ) : summaryQuery.isLoading ? '—' : 'Not enough data yet'}
          </div>
        </Card>
        <Card style={{ flex: 2, minWidth: 220 }}>
          <div className="field-hint">Summary</div>
          <p style={{ marginTop: 4, marginBottom: 0, fontSize: 13.5 }}>
            {summaryQuery.data?.summaryText || 'A trend will appear once there are a few assessments to compare.'}
          </p>
        </Card>
      </div>

      <Card>
        <h3 style={{ marginBottom: 4 }}>Risk score over time</h3>
        <p className="field-hint" style={{ marginBottom: 16 }}>From speech analysis and screening history — higher means more indicators observed, not a diagnosis.</p>

        {timelineQuery.isLoading && <LoadingState rows={4} />}
        {timelineQuery.isError && <ErrorState error={timelineQuery.error} onRetry={timelineQuery.refetch} />}
        {timelineQuery.data && timelineEntries.length === 0 && (
          <EmptyState title="No history yet" description="Record a speech sample or complete a screening test to start building this timeline." />
        )}
        {points.length > 0 && (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={points} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--ink-faint)' }} />
              <YAxis
                domain={[0.5, 3.5]}
                ticks={[1, 2, 3]}
                tickFormatter={(v) => SCORE_TO_LABEL[v] || ''}
                tick={{ fontSize: 12, fill: 'var(--ink-faint)' }}
                width={70}
              />
              <Tooltip
                formatter={(value) => SCORE_TO_LABEL[value] || value}
                contentStyle={{ borderRadius: 10, border: '1px solid var(--line)', fontSize: 13 }}
              />
              <Line type="monotone" dataKey="score" stroke="#17645E" strokeWidth={2.5} dot={{ r: 4, fill: '#107078' }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}

function trendTone(trend) {
  const t = (trend || '').toUpperCase();
  if (t === 'IMPROVING') return 'success';
  if (t === 'DECLINING') return 'danger';
  return 'neutral';
}
function trendLabel(trend) {
  const t = (trend || '').toUpperCase();
  return { IMPROVING: 'Improving', STABLE: 'Stable', DECLINING: 'Declining', INSUFFICIENT_DATA: 'Not enough data yet' }[t] || trend;
}
