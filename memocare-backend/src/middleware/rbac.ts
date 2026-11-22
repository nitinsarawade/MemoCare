import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { AppError } from '../utils/errors';
import { prisma } from '../config/prisma';

/**
 * Restricts a route to one or more roles. Must run after `authenticate`.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(AppError.unauthorized());
    if (!roles.includes(req.auth.role)) {
      return next(AppError.forbidden(`This action requires one of the following roles: ${roles.join(', ')}`));
    }
    return next();
  };
}

/**
 * Enforces per-patient access control. This is the backend authorization
 * layer described in the spec: it is NOT UI hiding, it is a hard check
 * that runs on every patient-scoped route.
 *
 * Rules:
 *  - ADMIN: full access.
 *  - HOSPITAL_STAFF: access allowed only if the patient belongs to the
 *    staff member's hospital.
 *  - FAMILY / CARETAKER: access allowed only if a PatientLink row exists
 *    linking them to this exact patient.
 *
 * Expects the patient id as `req.params.patientId` (routes should name
 * the param consistently).
 */
export function requirePatientAccess() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.auth) return next(AppError.unauthorized());
      const patientId = req.params.patientId;
      if (!patientId) return next(AppError.badRequest('patientId parameter is required'));

      const patient = await prisma.patient.findUnique({ where: { id: patientId } });
      if (!patient) return next(AppError.notFound('Patient not found'));

      if (req.auth.role === 'ADMIN') return next();

      if (req.auth.role === 'HOSPITAL_STAFF') {
        if (patient.hospitalId && patient.hospitalId === req.auth.hospitalId) {
          return next();
        }
        return next(AppError.forbidden('You are not authorized to access this patient'));
      }

      // FAMILY or CARETAKER
      const link = await prisma.patientLink.findUnique({
        where: { patientId_userId: { patientId, userId: req.auth.userId } },
      });
      if (!link) {
        return next(AppError.forbidden('You are not linked to this patient'));
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

/**
 * Same authorization rules as requirePatientAccess(), but for routes
 * keyed by a child resource id (e.g. /media/:mediaSessionId) rather
 * than /patients/:patientId directly. `resolvePatientId` loads the
 * resource and returns its owning patientId (or null if not found).
 */
export function requireResourcePatientAccess(resolvePatientId: (req: Request) => Promise<string | null>) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.auth) return next(AppError.unauthorized());
      const patientId = await resolvePatientId(req);
      if (!patientId) return next(AppError.notFound('Resource not found'));

      if (req.auth.role === 'ADMIN') return next();

      const patient = await prisma.patient.findUnique({ where: { id: patientId } });
      if (!patient) return next(AppError.notFound('Resource not found'));

      if (req.auth.role === 'HOSPITAL_STAFF') {
        if (patient.hospitalId && patient.hospitalId === req.auth.hospitalId) return next();
        return next(AppError.forbidden('You are not authorized to access this resource'));
      }

      const link = await prisma.patientLink.findUnique({
        where: { patientId_userId: { patientId, userId: req.auth.userId } },
      });
      if (!link) return next(AppError.forbidden('You are not linked to this patient'));
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

/**
 * Builds a Prisma `where` clause restricting a Patient query to only
 * the patients the current user is allowed to see. Used by list
 * endpoints (e.g. GET /patients) so we never rely on filtering results
 * after the fact.
 */
export function patientVisibilityWhere(auth: NonNullable<Request['auth']>) {
  if (auth.role === 'ADMIN') return {};
  if (auth.role === 'HOSPITAL_STAFF') {
    return { hospitalId: auth.hospitalId ?? '__none__' };
  }
  // FAMILY / CARETAKER
  return { links: { some: { userId: auth.userId } } };
}
