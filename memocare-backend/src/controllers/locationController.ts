import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import * as locationService from '../services/locationService';

// --- Safe zones (authenticated, patient-scoped) ---

export const createSafeZone = asyncHandler(async (req: Request, res: Response) => {
  const zone = await locationService.createSafeZone({
    patientId: req.params.patientId,
    ...req.body,
    createdById: req.auth!.userId,
  });
  res.status(201).json({ data: zone });
});

export const listSafeZones = asyncHandler(async (req: Request, res: Response) => {
  const zones = await locationService.listSafeZones(req.params.patientId);
  res.status(200).json({ data: zones });
});

export const updateSafeZone = asyncHandler(async (req: Request, res: Response) => {
  const zone = await locationService.updateSafeZone(req.params.safeZoneId, req.body);
  res.status(200).json({ data: zone });
});

export const deleteSafeZone = asyncHandler(async (req: Request, res: Response) => {
  await locationService.deleteSafeZone(req.params.safeZoneId);
  res.status(204).send();
});

// --- Location (authenticated, patient-scoped) ---

export const recordAuthenticatedCheckIn = asyncHandler(async (req: Request, res: Response) => {
  const checkIn = await locationService.recordCheckIn({
    patientId: req.params.patientId,
    ...req.body,
    source: 'authenticated-app',
  });
  res.status(201).json({ data: checkIn });
});

export const getLatestLocation = asyncHandler(async (req: Request, res: Response) => {
  const location = await locationService.getLatestLocation(req.params.patientId);
  res.status(200).json({ data: location });
});

export const getLocationHistory = asyncHandler(async (req: Request, res: Response) => {
  const history = await locationService.getLocationHistory(req.params.patientId);
  res.status(200).json({ data: history });
});

export const createShareToken = asyncHandler(async (req: Request, res: Response) => {
  const record = await locationService.createShareToken(req.params.patientId, req.auth!.userId);
  const shareUrl = `${req.protocol}://${req.get('host')}/share/location.html?token=${record.token}`;
  res.status(201).json({ data: { ...record, shareUrl } });
});

export const listShareTokens = asyncHandler(async (req: Request, res: Response) => {
  const tokens = await locationService.listShareTokens(req.params.patientId);
  res.status(200).json({ data: tokens });
});

export const revokeShareToken = asyncHandler(async (req: Request, res: Response) => {
  await locationService.revokeShareToken(req.params.patientId, req.params.tokenId);
  res.status(204).send();
});

// --- Public, token-based ping (no login — used by the standalone browser page) ---

export const publicPing = asyncHandler(async (req: Request, res: Response) => {
  const { token, latitude, longitude, accuracyMeters } = req.body;
  const patientId = await locationService.resolvePatientIdFromShareToken(token);
  if (!patientId) throw AppError.unauthorized('Invalid or revoked share link');

  const checkIn = await locationService.recordCheckIn({
    patientId,
    latitude,
    longitude,
    accuracyMeters,
    source: 'browser-share-link',
  });
  res.status(201).json({ data: { received: true, recordedAt: checkIn.recordedAt } });
});
