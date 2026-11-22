import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import * as familyQuizService from '../services/familyQuizService';

export const addMember = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw AppError.badRequest('A photo is required.');
  if (!req.body.fullName) throw AppError.badRequest('A full name is required.');
  const member = await familyQuizService.addFamilyMember({
    patientId: req.params.patientId,
    uploadedById: req.auth!.userId,
    fullName: req.body.fullName,
    file: req.file,
  });
  res.status(201).json({ data: member });
});

export const listMembers = asyncHandler(async (req: Request, res: Response) => {
  const members = await familyQuizService.listFamilyMembers(req.params.patientId);
  res.status(200).json({ data: members });
});

export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  await familyQuizService.removeFamilyMember(req.params.patientId, req.params.memberId);
  res.status(204).send();
});

export const startQuiz = asyncHandler(async (req: Request, res: Response) => {
  const quiz = await familyQuizService.startQuiz(req.params.patientId, req.auth!.userId);
  res.status(201).json({ data: quiz });
});

export const submitQuiz = asyncHandler(async (req: Request, res: Response) => {
  const result = await familyQuizService.submitQuiz(req.params.patientId, req.params.attemptId, req.body.answers || []);
  res.status(200).json({ data: result });
});

export const listAttempts = asyncHandler(async (req: Request, res: Response) => {
  const attempts = await familyQuizService.listQuizAttempts(req.params.patientId);
  res.status(200).json({ data: attempts });
});

export const getAttempt = asyncHandler(async (req: Request, res: Response) => {
  const attempt = await familyQuizService.getQuizAttempt(req.params.patientId, req.params.attemptId);
  res.status(200).json({ data: attempt });
});
