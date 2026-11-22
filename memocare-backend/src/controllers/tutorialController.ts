import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as tutorialService from '../services/tutorialService';

export const listTutorials = asyncHandler(async (_req: Request, res: Response) => {
  const tutorials = await tutorialService.listPublishedTutorials();
  res.status(200).json({ data: tutorials });
});

export const getTutorial = asyncHandler(async (req: Request, res: Response) => {
  const tutorial = await tutorialService.getTutorialBySlug(req.params.slug);
  res.status(200).json({ data: tutorial });
});

export const completeTutorial = asyncHandler(async (req: Request, res: Response) => {
  const progress = await tutorialService.markTutorialComplete(req.auth!.userId, req.params.articleId);
  res.status(200).json({ data: progress });
});

export const getMyProgress = asyncHandler(async (req: Request, res: Response) => {
  const progress = await tutorialService.getUserProgress(req.auth!.userId);
  res.status(200).json({ data: progress });
});

export const createTutorial = asyncHandler(async (req: Request, res: Response) => {
  const tutorial = await tutorialService.createTutorial(req.body);
  res.status(201).json({ data: tutorial });
});

export const updateTutorial = asyncHandler(async (req: Request, res: Response) => {
  const tutorial = await tutorialService.updateTutorial(req.params.id, req.body);
  res.status(200).json({ data: tutorial });
});

export const deleteTutorial = asyncHandler(async (req: Request, res: Response) => {
  await tutorialService.deleteTutorial(req.params.id);
  res.status(204).send();
});
