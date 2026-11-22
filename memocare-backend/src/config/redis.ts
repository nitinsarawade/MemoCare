import IORedis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

// BullMQ requires maxRetriesPerRequest: null on the connection it manages.
export const redisConnection = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  enableOfflineQueue: false,
  retryStrategy: (attempt) => Math.min(attempt * 250, 5_000),
});

let redisWarned = false;
redisConnection.on('error', (err) => {
  if (redisWarned) return;
  redisWarned = true;
  logger.warn({ err: err?.message || err }, 'Redis is not running: background jobs (reminders, queued analysis) are off. The rest of the app works normally.');
});
