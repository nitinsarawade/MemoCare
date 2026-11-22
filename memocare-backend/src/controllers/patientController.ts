import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as patientService from '../services/patientService';
import { recordAuditLog } from '../services/auditService';
import { prisma } from '../config/prisma';

export const createPatient = asyncHandler(async (req: Request, res: Response) => {
  const patient = await patientService.createPatient(req.body, req.auth!);
  res.status(201).json({ data: patient });
});

export const listPatients = asyncHandler(async (req: Request, res: Response) => {
  const includeDismissed = req.query.includeDismissed === 'true';
  const patients = await patientService.listPatientsForUser(req.auth!, { includeDismissed });
  res.status(200).json({ data: patients });
});

export const listDismissed = asyncHandler(async (req: Request, res: Response) => {
  const patients = await patientService.listDismissedPatients(req.auth!);
  res.status(200).json({ data: patients });
});

export const dismissPatient = asyncHandler(async (req: Request, res: Response) => {
  const patient = await patientService.dismissPatient(req.params.patientId, req.auth!, req.body?.reason);
  await recordAuditLog({
    actorId: req.auth!.userId,
    patientId: patient.id,
    action: 'DISMISS_PATIENT',
    resourceType: 'Patient',
    resourceId: patient.id,
    metadata: { reason: req.body?.reason ?? null },
  });
  res.status(200).json({ data: patient });
});

export const readmitPatient = asyncHandler(async (req: Request, res: Response) => {
  const patient = await patientService.readmitPatient(req.params.patientId, req.auth!);
  await recordAuditLog({
    actorId: req.auth!.userId,
    patientId: patient.id,
    action: 'READMIT_PATIENT',
    resourceType: 'Patient',
    resourceId: patient.id,
  });
  res.status(200).json({ data: patient });
});

export const getPatient = asyncHandler(async (req: Request, res: Response) => {
  const patient = await patientService.getPatientById(req.params.patientId);
  await recordAuditLog({
    actorId: req.auth!.userId,
    patientId: patient.id,
    action: 'VIEW_PATIENT',
    resourceType: 'Patient',
    resourceId: patient.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] as string,
  });
  res.status(200).json({ data: patient });
});

export const updatePatient = asyncHandler(async (req: Request, res: Response) => {
  const patient = await patientService.updatePatient(req.params.patientId, req.body);
  await recordAuditLog({
    actorId: req.auth!.userId,
    patientId: patient.id,
    action: 'UPDATE_PATIENT',
    resourceType: 'Patient',
    resourceId: patient.id,
  });
  res.status(200).json({ data: patient });
});

export const assignDoctor = asyncHandler(async (req: Request, res: Response) => {
  const patient = await patientService.assignDoctor(req.params.patientId, req.body.doctorId, req.auth!.hospitalId);
  res.status(200).json({ data: patient });
});

export const listStaffOptions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth!.hospitalId) return res.status(200).json({ data: [] });
  const staff = await patientService.listStaffOptions(req.auth!.hospitalId);
  res.status(200).json({ data: staff });
});

export const listLinks = asyncHandler(async (req: Request, res: Response) => {
  const links = await patientService.listLinksForPatient(req.params.patientId);
  res.status(200).json({ data: links });
});

export const inviteLink = asyncHandler(async (req: Request, res: Response) => {
  const inviter = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  const inviterName = inviter ? `${inviter.firstName} ${inviter.lastName}` : 'A MemoCare user';
  const result = await patientService.inviteUserToPatient(
    req.params.patientId,
    req.body.email,
    req.body.linkRole,
    req.auth!.userId,
    inviterName
  );
  await recordAuditLog({
    actorId: req.auth!.userId,
    patientId: req.params.patientId,
    action: 'LINK_USER',
    resourceType: 'PatientLink',
    metadata: { email: req.body.email, linkRole: req.body.linkRole },
  });
  res.status(201).json({ data: result });
});

export const unlinkUser = asyncHandler(async (req: Request, res: Response) => {
  await patientService.unlinkUser(req.params.patientId, req.params.userId);
  await recordAuditLog({
    actorId: req.auth!.userId,
    patientId: req.params.patientId,
    action: 'UNLINK_USER',
    resourceType: 'PatientLink',
    resourceId: req.params.userId,
  });
  res.status(204).send();
});

export const acceptInvite = asyncHandler(async (req: Request, res: Response) => {
  const result = await patientService.acceptPatientLinkInvite(req.body.token, req.auth!.userId);
  res.status(200).json({ data: result });
});
