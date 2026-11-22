import { NextFunction, Request, Response } from 'express';
import { AuditAction } from '@prisma/client';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';

interface AuditEntryInput {
  actorId: string;
  patientId?: string | null;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Writes an audit log row. Failures here are logged but never block the
 * request — audit logging must not become an availability risk, though
 * in a stricter compliance posture this could be made blocking/queued.
 */
export async function recordAuditLog(entry: AuditEntryInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        patientId: entry.patientId ?? undefined,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        metadata: entry.metadata as any,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  } catch (err) {
    logger.error({ err, entry }, 'Failed to write audit log');
  }
}

/**
 * Express middleware factory: fires an audit log entry for the current
 * request after a successful (2xx) response, scoped to the patient in
 * req.params.patientId. Attach this to any route that reads sensitive
 * patient data (reports, speech results, video sessions, screening
 * results).
 */
export function auditPatientAccess(action: AuditAction, resourceType?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      if (!req.auth) return;
      if (res.statusCode >= 200 && res.statusCode < 300) {
        void recordAuditLog({
          actorId: req.auth.userId,
          patientId: req.params.patientId,
          action,
          resourceType,
          resourceId: req.params.patientId,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
      }
    });
    next();
  };
}
