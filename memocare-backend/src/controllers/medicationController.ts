import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as medicationService from '../services/medicationService';

export const createMedication = asyncHandler(async (req: Request, res: Response) => {
  const medication = await medicationService.createMedication({
    patientId: req.params.patientId,
    ...req.body,
    createdById: req.auth!.userId,
  });
  res.status(201).json({ data: medication });
});

export const listMedications = asyncHandler(async (req: Request, res: Response) => {
  const activeOnly = req.query.activeOnly === 'true';
  const medications = await medicationService.listMedicationsForPatient(req.params.patientId, activeOnly);
  res.status(200).json({ data: medications });
});

export const updateMedication = asyncHandler(async (req: Request, res: Response) => {
  const medication = await medicationService.updateMedication(req.params.medicationId, req.body);
  res.status(200).json({ data: medication });
});

export const deleteMedication = asyncHandler(async (req: Request, res: Response) => {
  await medicationService.deleteMedication(req.params.medicationId);
  res.status(204).send();
});

export const getTodaysSchedule = asyncHandler(async (req: Request, res: Response) => {
  const schedule = await medicationService.getTodaysSchedule(req.params.patientId);
  res.status(200).json({ data: schedule });
});

export const logDose = asyncHandler(async (req: Request, res: Response) => {
  const { scheduledFor, status, takenAt } = req.body;
  const log = await medicationService.logDose(
    req.params.patientId,
    req.params.medicationId,
    scheduledFor,
    status,
    req.auth!.userId,
    takenAt
  );
  res.status(200).json({ data: log });
});

export const listDoseHistory = asyncHandler(async (req: Request, res: Response) => {
  const history = await medicationService.listDoseHistory(req.params.patientId);
  res.status(200).json({ data: history });
});
