import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as reportService from '../services/reportService';
import { renderClinicalReportPdf } from '../services/pdfReportService';
import { recordAuditLog } from '../services/auditService';

export const getReport = asyncHandler(async (req: Request, res: Response) => {
  const isStaff = req.auth!.role === 'HOSPITAL_STAFF' || req.auth!.role === 'ADMIN';
  const report = isStaff
    ? await reportService.buildClinicalReport(req.params.patientId)
    : await reportService.buildSimplifiedReport(req.params.patientId);

  await recordAuditLog({
    actorId: req.auth!.userId,
    patientId: req.params.patientId,
    action: 'VIEW_REPORT',
    resourceType: 'Report',
    metadata: { reportType: report.reportType },
  });

  res.status(200).json({ data: report });
});

export const exportReport = asyncHandler(async (req: Request, res: Response) => {
  // Staff-only route (enforced in routes). Returns a real downloadable
  // PDF file, generated from the full clinical report.
  const report = await reportService.buildClinicalReport(req.params.patientId);
  const pdfBuffer = await renderClinicalReportPdf(report);

  await recordAuditLog({
    actorId: req.auth!.userId,
    patientId: req.params.patientId,
    action: 'EXPORT_REPORT',
    resourceType: 'Report',
  });

  const filename = `memocare-report-${report.patient.lastName}-${new Date().toISOString().slice(0, 10)}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(pdfBuffer);
});

export const listNotes = asyncHandler(async (req: Request, res: Response) => {
  const notes = await reportService.listNotesForRole(req.params.patientId, req.auth!.role);
  res.status(200).json({ data: notes });
});

export const createNote = asyncHandler(async (req: Request, res: Response) => {
  const note = await reportService.createNote(req.params.patientId, req.auth!.userId, req.body.body, req.body.visibleToFamily);
  await recordAuditLog({
    actorId: req.auth!.userId,
    patientId: req.params.patientId,
    action: 'CREATE_NOTE',
    resourceType: 'PatientNote',
    resourceId: note.id,
  });
  res.status(201).json({ data: note });
});
