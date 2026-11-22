import { z } from 'zod';

export const createSafeZoneSchema = z.object({
  name: z.string().min(1).max(150),
  centerLat: z.number().min(-90).max(90),
  centerLng: z.number().min(-180).max(180),
  radiusMeters: z.number().positive().max(50000),
});

export const updateSafeZoneSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  centerLat: z.number().min(-90).max(90).optional(),
  centerLng: z.number().min(-180).max(180).optional(),
  radiusMeters: z.number().positive().max(50000).optional(),
  isActive: z.boolean().optional(),
});

// Authenticated check-in (e.g. from a caretaker's own logged-in app)
export const authenticatedLocationPingSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().nonnegative().optional(),
});

// Public, token-based check-in — used by the standalone browser page
// so a patient's own device can share real GPS without logging in.
export const publicLocationPingSchema = z.object({
  token: z.string().min(10),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().nonnegative().optional(),
});
