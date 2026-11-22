import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as appointmentService from '../services/appointmentService';

export const createAppointment = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await appointmentService.createAppointment({
    patientId: req.params.patientId,
    title: req.body.title,
    notes: req.body.notes,
    scheduledFor: req.body.scheduledFor,
    createdById: req.auth!.userId,
  });
  res.status(201).json({ data: appointment });
});

export const listAppointments = asyncHandler(async (req: Request, res: Response) => {
  const appointments = await appointmentService.listAppointmentsForPatient(req.params.patientId);
  res.status(200).json({ data: appointments });
});

export const updateAppointment = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await appointmentService.updateAppointment(req.params.appointmentId, req.body);
  res.status(200).json({ data: appointment });
});

export const deleteAppointment = asyncHandler(async (req: Request, res: Response) => {
  await appointmentService.deleteAppointment(req.params.appointmentId);
  res.status(204).send();
});
