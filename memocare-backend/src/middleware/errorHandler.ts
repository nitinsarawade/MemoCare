import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../config/logger';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { MulterError } from 'multer';
import { env } from '../config/env';

/**
 * Every error in the app funnels through here, producing a single
 * consistent JSON shape:
 *   { error: { code, message, details? }, requestId }
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req.headers['x-request-id'] as string) ?? undefined;

  if (err instanceof AppError) {
    if (err.statusCode >= 500) logger.error({ err, requestId }, 'AppError (5xx)');
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
      requestId,
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
      requestId,
    });
  }

  if (err instanceof MulterError) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    return res.status(tooBig ? 413 : 400).json({
      error: {
        code: tooBig ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR',
        message: tooBig ? 'That file is too large (200MB maximum).' : `Upload failed: ${err.message}`,
      },
      requestId,
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: { code: 'CONFLICT', message: 'A record with these unique fields already exists' },
        requestId,
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Record not found' }, requestId });
    }
  }

  logger.error({ err, requestId }, 'Unhandled error');
  // In development, say what actually went wrong instead of hiding it.
  const devDetail = !env.isProduction && err instanceof Error ? ` (${err.message.split('\n').filter(Boolean).pop()})` : '';
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: `An unexpected error occurred${devDetail}` },
    requestId,
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `No route matches ${req.method} ${req.originalUrl}` },
  });
}
