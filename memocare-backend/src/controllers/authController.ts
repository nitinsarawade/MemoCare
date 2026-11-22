import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as authService from '../services/authService';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';

export const signup = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.signup(req.body);
  res.status(201).json({ data: result });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.verifyEmail(req.body.token);
  res.status(200).json({ data: result });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body.email, req.body.password, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  res.status(200).json({ data: result });
});

export const loginByManagementCode = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.loginByManagementCode(req.body.code, { ip: req.ip, userAgent: req.headers['user-agent'] });
  res.status(200).json({ data: result });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.refreshTokens(req.body.refreshToken, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  res.status(200).json({ data: result });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(req.body.refreshToken);
  res.status(204).send();
});

export const requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  await authService.requestPasswordReset(req.body.email);
  // Always 200 to avoid leaking account existence.
  res.status(200).json({ data: { message: 'If that email exists, a reset link has been sent.' } });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  res.status(200).json({ data: { message: 'Password has been reset. Please log in again.' } });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.changePassword(req.auth!.userId, req.body.currentPassword, req.body.newPassword);
  res.status(200).json({ data: { message: 'Password updated.' } });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user) throw AppError.notFound('User not found');
  const { passwordHash, ...safe } = user;
  res.status(200).json({ data: safe });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  // Prisma DateTime columns reject bare "YYYY-MM-DD" strings, so convert first.
  const { dateOfBirth, ...rest } = req.body;
  const data: Record<string, unknown> = { ...rest };
  if (dateOfBirth) data.dateOfBirth = new Date(dateOfBirth);
  const user = await prisma.user.update({ where: { id: req.auth!.userId }, data });
  const { passwordHash, ...safe } = user;
  res.status(200).json({ data: safe });
});
