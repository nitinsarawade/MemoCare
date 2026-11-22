import { z } from 'zod';

const timeOfDayRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // "HH:mm", 24h

export const upsertStoreSchema = z.object({
  storeName: z.string().min(1).max(200),
  address: z.string().min(1).max(300),
  city: z.string().min(1).max(100),
  taluka: z.string().min(1).max(100),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  phone: z.string().max(30).optional(),
  openTime: z.string().regex(timeOfDayRegex, 'must be "HH:mm" 24-hour time').optional(),
  closeTime: z.string().regex(timeOfDayRegex, 'must be "HH:mm" 24-hour time').optional(),
});

export const addMedicineSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.number().nonnegative(),
  quantity: z.number().int().nonnegative().optional(),
});

export const updateMedicineSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  price: z.number().nonnegative().optional(),
  quantity: z.number().int().nonnegative().optional(),
});

export const nearbyQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().positive().max(500).optional(),
  medicine: z.string().max(200).optional(),
});
