import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as storeService from '../services/storeService';

export const upsertMyStore = asyncHandler(async (req: Request, res: Response) => {
  const store = await storeService.upsertMyStore(req.auth!.userId, req.body);
  res.status(200).json({ data: store });
});

export const getMyStore = asyncHandler(async (req: Request, res: Response) => {
  const store = await storeService.getMyStore(req.auth!.userId);
  res.status(200).json({ data: store });
});

export const addMedicine = asyncHandler(async (req: Request, res: Response) => {
  const medicine = await storeService.addMedicine(req.auth!.userId, req.body.name, req.body.price, req.body.quantity);
  res.status(201).json({ data: medicine });
});

export const updateMedicine = asyncHandler(async (req: Request, res: Response) => {
  const medicine = await storeService.updateMedicine(req.auth!.userId, req.params.medicineId, req.body);
  res.status(200).json({ data: medicine });
});

export const deleteMedicine = asyncHandler(async (req: Request, res: Response) => {
  await storeService.deleteMedicine(req.auth!.userId, req.params.medicineId);
  res.status(204).send();
});

export const listMyMedicines = asyncHandler(async (req: Request, res: Response) => {
  const medicines = await storeService.listMyMedicines(req.auth!.userId);
  res.status(200).json({ data: medicines });
});

export const getStoreById = asyncHandler(async (req: Request, res: Response) => {
  const store = await storeService.getStoreById(req.params.storeId);
  res.status(200).json({ data: store });
});

export const findNearbyStores = asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude, radiusKm, medicine } = req.query as unknown as {
    latitude: number;
    longitude: number;
    radiusKm?: number;
    medicine?: string;
  };
  const results = await storeService.findNearbyStores(latitude, longitude, radiusKm, medicine);
  res.status(200).json({ data: results });
});
