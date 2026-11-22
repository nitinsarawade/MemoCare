import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as progressService from '../services/progressService';

function parseFilters(req: Request) {
  const { from, to } = req.query as { from?: string; to?: string };
  return { from: from ? new Date(from) : undefined, to: to ? new Date(to) : undefined };
}

export const getTimeline = asyncHandler(async (req: Request, res: Response) => {
  const timeline = await progressService.getPatientTimeline(req.params.patientId, parseFilters(req));
  res.status(200).json({ data: timeline });
});

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const summary = await progressService.buildProgressSummary(req.params.patientId, parseFilters(req));
  res.status(200).json({ data: summary });
});
