import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import * as adminService from '../services/adminService';

export const createHospital = asyncHandler(async (req: Request, res: Response) => {
  const hospital = await adminService.createHospital(req.body.name, req.body.address);
  res.status(201).json({ data: hospital });
});

export const listHospitals = asyncHandler(async (_req: Request, res: Response) => {
  const hospitals = await adminService.listHospitals();
  res.status(200).json({ data: hospitals });
});

export const getMyHospital = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth!.hospitalId) return res.status(200).json({ data: null });
  const hospital = await adminService.getHospital(req.auth!.hospitalId);
  res.status(200).json({ data: hospital });
});

export const updateMyHospital = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth!.hospitalId) throw AppError.badRequest('Your account is not linked to a hospital');
  const hospital = await adminService.updateHospital(req.auth!.hospitalId, {
    name: req.body.name,
    address: req.body.address,
  });
  res.status(200).json({ data: hospital });
});

export const rotateInviteCode = asyncHandler(async (req: Request, res: Response) => {
  const hospital = await adminService.rotateHospitalInviteCode(req.params.hospitalId);
  res.status(200).json({ data: hospital });
});

export const listPendingStaff = asyncHandler(async (_req: Request, res: Response) => {
  const staff = await adminService.listPendingStaff();
  res.status(200).json({ data: staff });
});

export const approveStaff = asyncHandler(async (req: Request, res: Response) => {
  const user = await adminService.approveStaff(req.params.userId, req.body.staffTitle);
  res.status(200).json({ data: user });
});

export const rejectStaff = asyncHandler(async (req: Request, res: Response) => {
  const user = await adminService.rejectStaff(req.params.userId);
  res.status(200).json({ data: user });
});

export const suspendUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await adminService.suspendUser(req.params.userId);
  res.status(200).json({ data: user });
});

export const reactivateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await adminService.reactivateUser(req.params.userId);
  res.status(200).json({ data: user });
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await adminService.listUsers(req.query as any);
  res.status(200).json({ data: users });
});
