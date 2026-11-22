import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { haversineDistanceMeters } from './locationService';

export const MAX_MEDICINES_PER_STORE = 50;

export interface UpsertStoreInput {
  storeName: string;
  address: string;
  city?: string;
  taluka?: string;
  latitude: number;
  longitude: number;
  phone?: string;
  openTime?: string;
  closeTime?: string;
}

/**
 * Creates the store for this owner if they don't have one yet, or
 * updates their existing one — a MEDICAL_STORE account has exactly
 * one store, matching the @unique ownerId constraint in the schema.
 */
export async function upsertMyStore(ownerId: string, input: UpsertStoreInput) {
  return prisma.medicalStore.upsert({
    where: { ownerId },
    update: input,
    create: { ownerId, ...input },
  });
}

export async function getMyStore(ownerId: string) {
  const store = await prisma.medicalStore.findUnique({
    where: { ownerId },
    include: { medicines: { orderBy: { name: 'asc' } } },
  });
  if (!store) throw AppError.notFound('You have not set up a store yet — create one first');
  return store;
}

async function getOwnedStoreOrThrow(ownerId: string) {
  const store = await prisma.medicalStore.findUnique({ where: { ownerId } });
  if (!store) throw AppError.notFound('You have not set up a store yet — create one first');
  return store;
}

export async function addMedicine(ownerId: string, name: string, price: number, quantity = 0) {
  const store = await getOwnedStoreOrThrow(ownerId);

  const count = await prisma.storeMedicine.count({ where: { storeId: store.id } });
  if (count >= MAX_MEDICINES_PER_STORE) {
    throw AppError.badRequest(
      `This store already lists ${MAX_MEDICINES_PER_STORE} medicines, the maximum allowed. Remove one before adding another.`
    );
  }

  return prisma.storeMedicine.create({ data: { storeId: store.id, name, price, quantity } });
}

export async function updateMedicine(
  ownerId: string,
  medicineId: string,
  input: Partial<{ name: string; price: number; quantity: number }>
) {
  const store = await getOwnedStoreOrThrow(ownerId);
  const medicine = await prisma.storeMedicine.findUnique({ where: { id: medicineId } });
  if (!medicine || medicine.storeId !== store.id) throw AppError.notFound('Medicine not found in your store');
  return prisma.storeMedicine.update({ where: { id: medicineId }, data: input });
}

export async function deleteMedicine(ownerId: string, medicineId: string) {
  const store = await getOwnedStoreOrThrow(ownerId);
  const medicine = await prisma.storeMedicine.findUnique({ where: { id: medicineId } });
  if (!medicine || medicine.storeId !== store.id) throw AppError.notFound('Medicine not found in your store');
  await prisma.storeMedicine.delete({ where: { id: medicineId } });
}

export async function listMyMedicines(ownerId: string) {
  const store = await getOwnedStoreOrThrow(ownerId);
  return prisma.storeMedicine.findMany({ where: { storeId: store.id }, orderBy: { name: 'asc' } });
}

export async function getStoreById(storeId: string) {
  const store = await prisma.medicalStore.findUnique({
    where: { id: storeId },
    include: { medicines: { orderBy: { name: 'asc' } } },
  });
  if (!store) throw AppError.notFound('Store not found');
  return store;
}

export interface NearbyStoreResult {
  id: string;
  storeName: string;
  address: string;
  city: string | null;
  taluka: string | null;
  phone: string | null;
  openTime: string | null;
  closeTime: string | null;
  latitude: number;
  longitude: number;
  distanceKm: number;
  matchingMedicines: { id: string; name: string; price: number; quantity: number }[];
}

/**
 * Real nearby search: computes an actual great-circle distance (see
 * locationService.haversineDistanceMeters — the same math used for
 * safe-zone geofencing) from the given point to every store, filters
 * by radius, and sorts closest-first. Optionally filters to only
 * stores that stock a medicine matching the given name.
 */
export async function findNearbyStores(
  latitude: number,
  longitude: number,
  radiusKm = 20,
  medicineQuery?: string
): Promise<NearbyStoreResult[]> {
  const stores = await prisma.medicalStore.findMany({
    include: {
      medicines: medicineQuery
        ? { where: { name: { contains: medicineQuery, mode: 'insensitive' } } }
        : true,
    },
  });

  const results: NearbyStoreResult[] = [];
  for (const store of stores) {
    if (medicineQuery && store.medicines.length === 0) continue; // doesn't stock the searched medicine

    const distanceMeters = haversineDistanceMeters(latitude, longitude, store.latitude, store.longitude);
    const distanceKm = distanceMeters / 1000;
    if (distanceKm > radiusKm) continue;

    results.push({
      id: store.id,
      storeName: store.storeName,
      address: store.address,
      city: store.city ?? null,
      taluka: store.taluka ?? null,
      phone: store.phone,
      openTime: store.openTime,
      closeTime: store.closeTime,
      latitude: store.latitude,
      longitude: store.longitude,
      distanceKm: Math.round(distanceKm * 10) / 10,
      matchingMedicines: store.medicines.map((m) => ({ id: m.id, name: m.name, price: m.price, quantity: m.quantity })),
    });
  }

  return results.sort((a, b) => a.distanceKm - b.distanceKm);
}
