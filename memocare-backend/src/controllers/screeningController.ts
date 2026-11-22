import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as screeningService from '../services/screeningService';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { recordAuditLog } from '../services/auditService';

export const listTests = asyncHandler(async (_req: Request, res: Response) => {
  const tests = await screeningService.listActiveTests();
  res.status(200).json({ data: tests });
});

// "Mind games" catalog — a friendlier subset view of the same tests
// (Orientation, Word Recall, Name-the-Objects/"Guess the Thing", and
// Pattern Memory). Taking one still goes through the normal
// /screening-tests/{id} and /patients/{id}/screening-attempts endpoints.
export const listGames = asyncHandler(async (_req: Request, res: Response) => {
  const games = await screeningService.listGameTests();
  res.status(200).json({ data: games });
});

export const getTest = asyncHandler(async (req: Request, res: Response) => {
  const test = await screeningService.getTestForTaking(req.params.testId);
  res.status(200).json({ data: test });
});

export const listAllTestsForAdmin = asyncHandler(async (_req: Request, res: Response) => {
  const tests = await screeningService.listAllTestsForAdmin();
  res.status(200).json({ data: tests.map((t) => ({ ...t, itemCount: t._count.items })) });
});

export const createTest = asyncHandler(async (req: Request, res: Response) => {
  const { items, ...rest } = req.body;
  if (rest.itemsPerAttempt != null && rest.itemsPerAttempt > items.length) {
    throw AppError.badRequest('itemsPerAttempt cannot be larger than the number of items in the test.');
  }
  const test = await prisma.screeningTest.create({
    data: { ...rest, items: { create: items } },
    include: { items: true },
  });
  res.status(201).json({ data: test });
});

export const setTestActive = asyncHandler(async (req: Request, res: Response) => {
  const test = await screeningService.setTestActive(req.params.testId, req.body.isActive);
  res.status(200).json({ data: test });
});

export const submitAttempt = asyncHandler(async (req: Request, res: Response) => {
  const attempt = await screeningService.submitAttempt(
    req.params.patientId,
    req.body.testId,
    req.auth!.userId,
    req.body.answers
  );
  res.status(201).json({ data: attempt });
});

export const listAttemptsForPatient = asyncHandler(async (req: Request, res: Response) => {
  const attempts = await screeningService.listAttemptsForPatient(req.params.patientId);
  await recordAuditLog({
    actorId: req.auth!.userId,
    patientId: req.params.patientId,
    action: 'VIEW_SCREENING_RESULT',
    resourceType: 'ScreeningAttempt',
  });
  res.status(200).json({ data: attempts });
});

export const getAttempt = asyncHandler(async (req: Request, res: Response) => {
  const attempt = await screeningService.getAttempt(req.params.attemptId);
  res.status(200).json({ data: attempt });
});
