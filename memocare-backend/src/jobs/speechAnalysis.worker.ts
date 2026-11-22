import { Job, Worker } from 'bullmq';
import { redisConnection } from '../config/redis';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { SPEECH_ANALYSIS_QUEUE, SpeechAnalysisJobData } from './queues';
import { featureExtractor, mlRiskService } from '../services/mlRiskService';
import { notifyRiskAlertIfNeeded } from '../services/notificationService';

/**
 * The full pipeline for a single media session:
 *   1. Mark session PROCESSING
 *   2. Extract acoustic/linguistic features (pauses, rate, fillers, coherence)
 *   3. Run the pluggable ML risk-scoring service on those features
 *   4. Persist a SpeechAnalysisResult row
 *   5. Mark session COMPLETED (or FAILED on error, with reason)
 *   6. Fire a risk-alert notification if the score crosses a threshold
 */
async function processJob(job: Job<SpeechAnalysisJobData>) {
  const { mediaSessionId, patientId } = job.data;

  const session = await prisma.mediaSession.findUnique({ where: { id: mediaSessionId } });
  if (!session) throw new Error(`MediaSession ${mediaSessionId} not found`);

  await prisma.mediaSession.update({ where: { id: mediaSessionId }, data: { status: 'PROCESSING' } });

  const features = await featureExtractor.extract(session.storageKey);
  const risk = await mlRiskService.score(features);

  await prisma.$transaction([
    prisma.speechAnalysisResult.upsert({
      where: { mediaSessionId },
      update: {
        ...features,
        transcriptText: features.transcriptText ?? null,
        rawFeatureJson: features.rawFeatureJson as any,
        riskScore: risk.riskScore,
        riskLevel: risk.riskLevel,
        modelVersion: risk.modelVersion,
        modelRawResponse: risk.modelRawResponse as any,
        analyzedAt: new Date(),
      },
      create: {
        mediaSessionId,
        patientId,
        ...features,
        transcriptText: features.transcriptText ?? null,
        rawFeatureJson: features.rawFeatureJson as any,
        riskScore: risk.riskScore,
        riskLevel: risk.riskLevel,
        modelVersion: risk.modelVersion,
        modelRawResponse: risk.modelRawResponse as any,
        analyzedAt: new Date(),
      },
    }),
    prisma.mediaSession.update({ where: { id: mediaSessionId }, data: { status: 'COMPLETED' } }),
  ]);

  await notifyRiskAlertIfNeeded(patientId, risk.riskLevel, risk.riskScore);
}

export const speechAnalysisWorker = new Worker<SpeechAnalysisJobData>(
  SPEECH_ANALYSIS_QUEUE,
  async (job) => {
    try {
      await processJob(job);
    } catch (err) {
      await prisma.mediaSession.update({
        where: { id: job.data.mediaSessionId },
        data: { status: 'FAILED', failureReason: err instanceof Error ? err.message : 'Unknown error' },
      }).catch(() => undefined);
      throw err;
    }
  },
  { connection: redisConnection, concurrency: 4 }
);

speechAnalysisWorker.on('completed', (job) => {
  logger.info({ jobId: job.id, mediaSessionId: job.data.mediaSessionId }, 'Speech analysis job completed');
});

speechAnalysisWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Speech analysis job failed');
});
