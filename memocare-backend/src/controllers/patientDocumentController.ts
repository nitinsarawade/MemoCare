import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import * as patientDocumentService from '../services/patientDocumentService';

export const upload = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw AppError.badRequest('No file was uploaded.');
  const doc = await patientDocumentService.uploadDocument({
    patientId: req.params.patientId,
    uploadedById: req.auth!.userId,
    title: req.body.title,
    file: req.file,
  });
  res.status(201).json({ data: doc });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const docs = await patientDocumentService.listDocuments(req.params.patientId);
  res.status(200).json({ data: docs });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await patientDocumentService.deleteDocument(req.params.documentId, req.auth!.userId);
  res.status(204).send();
});
