import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { buildProgressSummary } from './progressService';
import { decryptField } from '../utils/encryption';

/**
 * Full clinical report: everything — complete score history, flagged
 * risk periods, all staff notes, media session metadata. For
 * HOSPITAL_STAFF and ADMIN only (enforced at the route layer).
 */
export async function buildClinicalReport(patientId: string) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw AppError.notFound('Patient not found');

  const [summary, mediaSessions, screeningAttempts, notes] = await Promise.all([
    buildProgressSummary(patientId),
    prisma.mediaSession.findMany({ where: { patientId }, include: { analysisResult: true }, orderBy: { createdAt: 'desc' } }),
    prisma.screeningAttempt.findMany({ where: { patientId }, include: { test: true }, orderBy: { startedAt: 'desc' } }),
    prisma.patientNote.findMany({ where: { patientId }, include: { author: { select: { firstName: true, lastName: true, role: true } } }, orderBy: { createdAt: 'desc' } }),
  ]);

  const flaggedRiskPeriods = mediaSessions
    .filter((m) => m.analysisResult && (m.analysisResult.riskLevel === 'HIGH' || (m.analysisResult.riskScore ?? 0) >= 66))
    .map((m) => ({
      mediaSessionId: m.id,
      date: m.analysisResult?.analyzedAt,
      riskScore: m.analysisResult?.riskScore,
      riskLevel: m.analysisResult?.riskLevel,
      assessmentTag: m.assessmentTag,
    }));

  return {
    reportType: 'clinical' as const,
    generatedAt: new Date().toISOString(),
    patient: {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      sex: patient.sex,
      diagnosisStatus: patient.diagnosisStatus,
      medicalHistoryNotes: (() => { try { return decryptField(patient.medicalHistoryNotes); } catch { return patient.medicalHistoryNotes ? '[unable to decrypt — encryption key changed]' : null; } })(),
      emergencyContactName: patient.emergencyContactName,
      emergencyContactPhone: patient.emergencyContactPhone,
    },
    summary,
    flaggedRiskPeriods,
    mediaSessions,
    screeningAttempts,
    notes,
  };
}

/**
 * Simplified report for FAMILY / CARETAKER: trends and headline
 * numbers only — no raw clinical notes (unless individually marked
 * visibleToFamily), no full feature vectors.
 */
export async function buildSimplifiedReport(patientId: string) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw AppError.notFound('Patient not found');

  const [summary, sharedNotes] = await Promise.all([
    buildProgressSummary(patientId),
    prisma.patientNote.findMany({
      where: { patientId, visibleToFamily: true },
      include: { author: { select: { firstName: true, lastName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    reportType: 'simplified' as const,
    generatedAt: new Date().toISOString(),
    patient: { id: patient.id, firstName: patient.firstName, lastName: patient.lastName },
    trends: summary.trends,
    latestSpeechRisk: summary.latestSpeechRisk,
    latestScreeningResult: summary.latestScreeningResult,
    sharedNotes,
  };
}

export async function createNote(patientId: string, authorId: string, body: string, visibleToFamily: boolean) {
  return prisma.patientNote.create({ data: { patientId, authorId, body, visibleToFamily } });
}

export async function listNotesForRole(patientId: string, role: string) {
  return prisma.patientNote.findMany({
    where: { patientId, ...(role === 'HOSPITAL_STAFF' || role === 'ADMIN' ? {} : { visibleToFamily: true }) },
    include: { author: { select: { firstName: true, lastName: true, role: true } } },
    orderBy: { createdAt: 'desc' },
  });
}
