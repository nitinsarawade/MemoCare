import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { dispatchLocationAlert } from './notificationService';

// --- Safe zones ---

export interface CreateSafeZoneInput {
  patientId: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  createdById: string;
}

export async function createSafeZone(input: CreateSafeZoneInput) {
  return prisma.safeZone.create({
    data: {
      patientId: input.patientId,
      name: input.name,
      centerLat: input.centerLat,
      centerLng: input.centerLng,
      radiusMeters: input.radiusMeters,
      createdById: input.createdById,
    },
  });
}

export async function listSafeZones(patientId: string) {
  return prisma.safeZone.findMany({ where: { patientId }, orderBy: { createdAt: 'desc' } });
}

export async function updateSafeZone(
  safeZoneId: string,
  input: Partial<{ name: string; centerLat: number; centerLng: number; radiusMeters: number; isActive: boolean }>
) {
  const zone = await prisma.safeZone.findUnique({ where: { id: safeZoneId } });
  if (!zone) throw AppError.notFound('Safe zone not found');
  return prisma.safeZone.update({ where: { id: safeZoneId }, data: input });
}

export async function deleteSafeZone(safeZoneId: string) {
  const zone = await prisma.safeZone.findUnique({ where: { id: safeZoneId } });
  if (!zone) throw AppError.notFound('Safe zone not found');
  await prisma.safeZone.delete({ where: { id: safeZoneId } });
}

// --- Distance math (real, not simulated) ---

const EARTH_RADIUS_METERS = 6371000;

/** Real great-circle distance between two lat/lng points, in meters. */
export function haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

// --- Check-ins ---

export interface RecordCheckInInput {
  patientId: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  source: string;
}

/**
 * Records a real GPS check-in and evaluates it against every active
 * safe zone for the patient. If the point falls outside ALL active
 * zones (or none are configured, in which case there's nothing to
 * violate), a LOCATION_ALERT is sent to linked family/caretakers/staff.
 */
export async function recordCheckIn(input: RecordCheckInInput) {
  const checkIn = await prisma.locationCheckIn.create({
    data: {
      patientId: input.patientId,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracyMeters: input.accuracyMeters,
      source: input.source,
    },
  });

  const activeZones = await prisma.safeZone.findMany({ where: { patientId: input.patientId, isActive: true } });

  if (activeZones.length > 0) {
    const insideAnyZone = activeZones.some(
      (zone) =>
        haversineDistanceMeters(input.latitude, input.longitude, zone.centerLat, zone.centerLng) <=
        zone.radiusMeters
    );
    if (!insideAnyZone) {
      const patient = await prisma.patient.findUnique({ where: { id: input.patientId } });
      if (patient) {
        await dispatchLocationAlert(input.patientId, `${patient.firstName} ${patient.lastName}`, {
          latitude: input.latitude,
          longitude: input.longitude,
        });
      }
    }
  }

  return checkIn;
}

export async function getLatestLocation(patientId: string) {
  return prisma.locationCheckIn.findFirst({ where: { patientId }, orderBy: { recordedAt: 'desc' } });
}

export async function getLocationHistory(patientId: string, limit = 200) {
  return prisma.locationCheckIn.findMany({
    where: { patientId },
    orderBy: { recordedAt: 'desc' },
    take: limit,
  });
}

// --- Share tokens (for the no-login browser page) ---

export async function createShareToken(patientId: string, createdById: string) {
  // Revoke any previous active tokens so only one link is valid at a time.
  await prisma.locationShareToken.updateMany({
    where: { patientId, isActive: true },
    data: { isActive: false, revokedAt: new Date() },
  });

  const token = crypto.randomBytes(32).toString('hex');
  return prisma.locationShareToken.create({
    data: { patientId, token, createdById },
  });
}

export async function revokeShareToken(patientId: string, tokenId: string) {
  const token = await prisma.locationShareToken.findUnique({ where: { id: tokenId } });
  if (!token || token.patientId !== patientId) throw AppError.notFound('Share link not found');
  await prisma.locationShareToken.update({
    where: { id: tokenId },
    data: { isActive: false, revokedAt: new Date() },
  });
}

export async function listShareTokens(patientId: string) {
  return prisma.locationShareToken.findMany({ where: { patientId }, orderBy: { createdAt: 'desc' } });
}

/** Validates a public share token and returns the patientId it belongs to, or null. */
export async function resolvePatientIdFromShareToken(token: string): Promise<string | null> {
  const record = await prisma.locationShareToken.findUnique({ where: { token } });
  if (!record || !record.isActive || record.revokedAt) return null;
  return record.patientId;
}
