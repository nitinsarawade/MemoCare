import { prisma } from '../config/prisma';
import { logger } from '../config/logger';

/**
 * Fire-and-forget event log for future admin dashboards (DAU, tests
 * completed, uploads per day, etc). Intentionally schema-light
 * (eventName + JSON metadata) so new event types never require a
 * migration.
 */
export async function trackEvent(eventName: string, userId?: string | null, metadata?: Record<string, unknown>) {
  try {
    await prisma.analyticsEvent.create({
      data: { eventName, userId: userId ?? undefined, metadata: metadata as any },
    });
  } catch (err) {
    logger.warn({ err, eventName }, 'Failed to record analytics event');
  }
}
