import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { storageService } from './storageService';

const MAX_FAMILY_MEMBERS = 10;
const DEFAULT_QUIZ_SIZE = 5;

export async function addFamilyMember(input: {
  patientId: string;
  uploadedById: string;
  fullName: string;
  file: Express.Multer.File;
}) {
  const count = await prisma.patientFamilyMember.count({ where: { patientId: input.patientId } });
  if (count >= MAX_FAMILY_MEMBERS) {
    throw AppError.badRequest(`Up to ${MAX_FAMILY_MEMBERS} family members can be added. Remove one before adding another.`);
  }

  const ref = await storageService.putObject(input.file.buffer, input.file.originalname, 'family-photos');

  return prisma.patientFamilyMember.create({
    data: {
      patientId: input.patientId,
      uploadedById: input.uploadedById,
      fullName: input.fullName,
      storageKey: ref.key,
      storageProvider: ref.provider,
    },
  });
}

export async function listFamilyMembers(patientId: string) {
  const members = await prisma.patientFamilyMember.findMany({
    where: { patientId },
    orderBy: { createdAt: 'asc' },
  });
  return Promise.all(
    members.map(async (m) => ({
      id: m.id,
      fullName: m.fullName,
      createdAt: m.createdAt,
      photoUrl: await storageService.getSignedUrl({ key: m.storageKey, provider: m.storageProvider as 'local' | 's3' }),
    }))
  );
}

export async function removeFamilyMember(patientId: string, memberId: string) {
  const member = await prisma.patientFamilyMember.findFirst({ where: { id: memberId, patientId } });
  if (!member) throw AppError.notFound('Family member not found');
  await storageService.deleteObject({ key: member.storageKey, provider: member.storageProvider as 'local' | 's3' });
  await prisma.patientFamilyMember.delete({ where: { id: memberId } });
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export async function startQuiz(patientId: string, administeredById: string) {
  const members = await prisma.patientFamilyMember.findMany({ where: { patientId } });
  if (members.length === 0) {
    throw AppError.badRequest('Add at least one family member before starting the quiz.');
  }

  // A different random selection (and order) every time — the whole point
  // of "the photo should change position" each attempt.
  const chosen = shuffle(members).slice(0, Math.min(DEFAULT_QUIZ_SIZE, members.length));

  const attempt = await prisma.familyQuizAttempt.create({
    data: { patientId, administeredById, issuedMemberIds: chosen.map((m) => m.id) },
  });

  return {
    attemptId: attempt.id,
    items: await Promise.all(
      chosen.map(async (m) => ({
        familyMemberId: m.id,
        photoUrl: await storageService.getSignedUrl({ key: m.storageKey, provider: m.storageProvider as 'local' | 's3' }),
      }))
    ),
  };
}

const norm = (x: string) => x.trim().toLowerCase();

function nameMatches(fullName: string, given: string): boolean {
  const g = norm(given);
  if (!g) return false;
  const full = norm(fullName);
  if (g === full) return true;
  const tokens = full.split(/\s+/).filter(Boolean);
  return tokens.includes(g); // first name, last name, or any middle name alone also counts
}

export async function submitQuiz(
  patientId: string,
  attemptId: string,
  answers: { familyMemberId: string; givenAnswer: string }[]
) {
  const attempt = await prisma.familyQuizAttempt.findFirst({ where: { id: attemptId, patientId } });
  if (!attempt) throw AppError.notFound('Quiz attempt not found');
  if (attempt.completedAt) throw AppError.badRequest('This quiz attempt was already submitted.');

  // Only the members actually issued for this attempt can be answered, each
  // at most once — otherwise repeated or foreign ids could inflate the score.
  const issued = new Set(attempt.issuedMemberIds);
  const seen = new Set<string>();
  for (const a of answers) {
    if (!issued.has(a.familyMemberId)) {
      throw AppError.badRequest(`Family member ${a.familyMemberId} was not part of this quiz.`);
    }
    if (seen.has(a.familyMemberId)) {
      throw AppError.badRequest('Each photo can only be answered once.');
    }
    seen.add(a.familyMemberId);
  }

  const members = await prisma.patientFamilyMember.findMany({
    where: { id: { in: attempt.issuedMemberIds }, patientId },
  });
  const byId = new Map(members.map((m) => [m.id, m]));

  // Score against everything that was issued; a skipped photo counts as wrong.
  const answerById = new Map(answers.map((a) => [a.familyMemberId, a.givenAnswer]));
  let totalScore = 0;
  const scored = attempt.issuedMemberIds
    .filter((id) => byId.has(id)) // a member deleted mid-quiz can no longer be asked about
    .map((id) => {
      const given = answerById.get(id) ?? '';
      const isCorrect = nameMatches(byId.get(id)!.fullName, given);
      if (isCorrect) totalScore += 1;
      return { attemptId, familyMemberId: id, givenAnswer: given, isCorrect };
    });

  await prisma.familyQuizAnswer.createMany({ data: scored });

  const maxPossibleScore = scored.length;
  const scorePercentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;

  await prisma.familyQuizAttempt.update({
    where: { id: attemptId },
    data: { completedAt: new Date(), totalScore, maxPossibleScore, scorePercentage },
  });

  return getQuizAttempt(patientId, attemptId);
}

export async function listQuizAttempts(patientId: string) {
  return prisma.familyQuizAttempt.findMany({
    where: { patientId },
    orderBy: { startedAt: 'desc' },
  });
}

export async function getQuizAttempt(patientId: string, attemptId: string) {
  const attempt = await prisma.familyQuizAttempt.findFirst({
    where: { id: attemptId, patientId },
    include: { answers: { include: { familyMember: true } } },
  });
  if (!attempt) throw AppError.notFound('Quiz attempt not found');

  return {
    id: attempt.id,
    startedAt: attempt.startedAt,
    completedAt: attempt.completedAt,
    totalScore: attempt.totalScore,
    maxPossibleScore: attempt.maxPossibleScore,
    scorePercentage: attempt.scorePercentage,
    answers: attempt.answers.map((a) => ({
      familyMemberId: a.familyMemberId,
      fullName: a.familyMember.fullName,
      givenAnswer: a.givenAnswer,
      isCorrect: a.isCorrect,
    })),
  };
}
