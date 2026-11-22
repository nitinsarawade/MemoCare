import { prisma } from '../config/prisma';

export interface ProgressFilters {
  from?: Date;
  to?: Date;
}

type TrendDirection = 'improving' | 'declining' | 'stable' | 'insufficient_data';

interface TimelineEntry {
  date: Date;
  source: 'speech' | 'video' | 'screening';
  label: string;
  // Normalized 0-100 "concern" score so risk (speech/video) and
  // performance (screening, inverted) can be compared on one axis.
  concernScore: number;
  raw: Record<string, unknown>;
}

function computeTrend(scoresOldToNew: number[]): TrendDirection {
  if (scoresOldToNew.length < 2) return 'insufficient_data';
  const midpoint = Math.floor(scoresOldToNew.length / 2);
  const firstHalf = scoresOldToNew.slice(0, midpoint || 1);
  const secondHalf = scoresOldToNew.slice(midpoint || 1);
  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const before = avg(firstHalf);
  const after = avg(secondHalf.length ? secondHalf : firstHalf);
  const delta = after - before;
  // concernScore: lower is better. A meaningful drop = improving.
  if (Math.abs(delta) < 3) return 'stable';
  return delta < 0 ? 'improving' : 'declining';
}

export async function getPatientTimeline(patientId: string, filters: ProgressFilters = {}) {
  const dateFilter = {
    ...(filters.from ? { gte: filters.from } : {}),
    ...(filters.to ? { lte: filters.to } : {}),
  };
  const hasDateFilter = Object.keys(dateFilter).length > 0;

  const [speechResults, screeningAttempts] = await Promise.all([
    prisma.speechAnalysisResult.findMany({
      where: {
        patientId,
        analyzedAt: hasDateFilter ? (dateFilter as any) : undefined,
        riskScore: { not: null },
      },
      include: { mediaSession: { select: { mediaType: true, assessmentTag: true } } },
      orderBy: { analyzedAt: 'asc' },
    }),
    prisma.screeningAttempt.findMany({
      where: {
        patientId,
        completedAt: hasDateFilter ? (dateFilter as any) : { not: null },
      },
      include: { test: { select: { title: true, testType: true } } },
      orderBy: { completedAt: 'asc' },
    }),
  ]);

  const timeline: TimelineEntry[] = [];

  for (const r of speechResults) {
    timeline.push({
      date: r.analyzedAt!,
      source: r.mediaSession.mediaType === 'VIDEO' ? 'video' : 'speech',
      label: r.mediaSession.assessmentTag ?? 'Speech sample',
      concernScore: r.riskScore ?? 0,
      raw: { riskScore: r.riskScore, riskLevel: r.riskLevel, id: r.id },
    });
  }

  for (const a of screeningAttempts) {
    // Invert: lower screening percentage = higher concern.
    const concernScore = 100 - (a.scorePercentage ?? 100);
    timeline.push({
      date: a.completedAt!,
      source: 'screening',
      label: a.test.title,
      concernScore,
      raw: { scorePercentage: a.scorePercentage, totalScore: a.totalScore, id: a.id },
    });
  }

  timeline.sort((a, b) => a.date.getTime() - b.date.getTime());

  const speechTrend = computeTrend(speechResults.map((r) => r.riskScore ?? 0));
  const screeningTrend = computeTrend(screeningAttempts.map((a) => 100 - (a.scorePercentage ?? 100)));
  const overallTrend = computeTrend(timeline.map((t) => t.concernScore));

  return {
    patientId,
    entryCount: timeline.length,
    timeline,
    trends: {
      speech: speechTrend,
      screening: screeningTrend,
      overall: overallTrend,
    },
  };
}

/**
 * Builds the structured "summary report" object described in the spec —
 * a single JSON payload combining all data sources, ready to be handed
 * to a future PDF/chart renderer without further querying.
 */
export async function buildProgressSummary(patientId: string, filters: ProgressFilters = {}) {
  const timeline = await getPatientTimeline(patientId, filters);
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });

  const latestSpeech = [...timeline.timeline].reverse().find((t) => t.source === 'speech');
  const latestScreening = [...timeline.timeline].reverse().find((t) => t.source === 'screening');

  return {
    generatedAt: new Date().toISOString(),
    patient: patient ? { id: patient.id, name: `${patient.firstName} ${patient.lastName}` } : null,
    period: { from: filters.from ?? null, to: filters.to ?? null },
    latestSpeechRisk: latestSpeech ?? null,
    latestScreeningResult: latestScreening ?? null,
    trends: timeline.trends,
    entryCount: timeline.entryCount,
    timeline: timeline.timeline,
    summaryText: buildSummaryText(timeline.entryCount, timeline.trends.overall),
  };
}

function buildSummaryText(entryCount: number, overallTrend: TrendDirection): string {
  if (entryCount === 0) return 'No speech samples or screening tests recorded yet.';
  if (overallTrend === 'insufficient_data') {
    return `${entryCount} ${entryCount === 1 ? 'entry' : 'entries'} recorded so far — a trend will appear once there are a few more to compare.`;
  }
  const phrase =
    overallTrend === 'improving'
      ? 'trending toward fewer observed indicators'
      : overallTrend === 'declining'
      ? 'trending toward more observed indicators'
      : 'holding steady';
  return `Based on ${entryCount} recorded ${entryCount === 1 ? 'entry' : 'entries'}, this patient is ${phrase}.`;
}
