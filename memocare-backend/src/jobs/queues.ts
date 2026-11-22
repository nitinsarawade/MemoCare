import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { env } from '../config/env';

export const SPEECH_ANALYSIS_QUEUE = 'speech-analysis';

// Route tests exercise request validation and authorization without needing a
// live Redis server. Avoid constructing BullMQ queues in that environment so
// the test process does not leave a reconnect timer behind.
const testQueue = { add: async () => undefined } as unknown as Queue;

export const speechAnalysisQueue = env.isTest
  ? testQueue
  : new Queue(SPEECH_ANALYSIS_QUEUE, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 500,
        removeOnFail: 1000,
      },
    });

export interface SpeechAnalysisJobData {
  mediaSessionId: string;
  patientId: string;
}

export async function enqueueSpeechAnalysis(data: SpeechAnalysisJobData) {
  await speechAnalysisQueue.add('analyze', data);
}

// --- Reminders (appointments + medications) ---
// A single repeatable job that ticks on an interval and checks both
// appointment reminders and medication doses due right now. Real,
// server-driven reminders — not dependent on any client polling.

export const REMINDERS_QUEUE = 'reminders-check';

export const remindersQueue = env.isTest
  ? testQueue
  : new Queue(REMINDERS_QUEUE, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 2,
        removeOnComplete: 50,
        removeOnFail: 50,
      },
    });

const REMINDER_CHECK_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

/**
 * Registers the repeatable "tick" job. BullMQ deduplicates repeatable
 * jobs by their (name + repeat options) key, so calling this on every
 * process start is safe and won't create duplicate schedules.
 */
export async function scheduleReminderChecks() {
  await remindersQueue.add(
    'check-due-reminders',
    {},
    { repeat: { every: REMINDER_CHECK_INTERVAL_MS }, jobId: 'reminders-tick' }
  );
}
