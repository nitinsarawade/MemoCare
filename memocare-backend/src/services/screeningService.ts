import { ScreeningTestType } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { trackEvent } from './analyticsService';
import { env } from '../config/env';

// Built-in screening/game media ships in /public/assets and is served
// statically, unlike user-uploaded content which goes through
// storageService/S3. Turn a bare mediaKey like "sample-object-watch.svg"
// into a real, loadable URL the frontend can put straight into an <img src>.
function resolveMediaUrl(mediaKey: string | null | undefined): string | undefined {
  if (!mediaKey) return undefined;
  if (/^https?:\/\//i.test(mediaKey)) return mediaKey;
  return `${env.appUrl}/assets/${mediaKey}`;
}

export async function listActiveTests() {
  return prisma.screeningTest.findMany({
    where: { isActive: true },
    select: { id: true, title: true, description: true, testType: true },
  });
}

// Admin management view: every test regardless of active status, so a
// deactivated test doesn't just vanish from the page that manages it.
export async function listAllTestsForAdmin() {
  return prisma.screeningTest.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { items: true } } },
  });
}

// "Mind games" are just the friendlier, casual-framed subset of screening
// tests — same underlying test/item/attempt/scoring pipeline as the
// clinical MMSE/MOCA-style tests, just a different discovery view so the
// app can present them as games (Orientation, Word Recall, Guess the
// Thing / name-the-objects, and Pattern Memory) rather than a formal exam.
const GAME_TEST_TYPES: ScreeningTestType[] = ['ORIENTATION', 'WORD_RECALL', 'NAME_THE_OBJECTS', 'PATTERN_MEMORY'];

export async function listGameTests() {
  return prisma.screeningTest.findMany({
    where: { isActive: true, testType: { in: GAME_TEST_TYPES } },
    select: { id: true, title: true, description: true, testType: true },
  });
}

/**
 * Returns a test with its items, but WITHOUT correctAnswer — that would
 * let a client cheat. Scoring happens server-side in submitAttempt().
 */
export async function setTestActive(testId: string, isActive: boolean) {
  const test = await prisma.screeningTest.update({ where: { id: testId }, data: { isActive } });
  return test;
}

export async function getTestForTaking(testId: string) {
  const test = await prisma.screeningTest.findUnique({
    where: { id: testId },
    include: { items: { orderBy: { order: 'asc' } } },
  });
  if (!test || !test.isActive) throw AppError.notFound('Screening test not found');

  // A test with itemsPerAttempt set draws a fresh random subset from its
  // full item pool every time it's taken (e.g. 10 of 50 pictures), rather
  // than always serving the same items in the same order.
  const items =
    test.itemsPerAttempt && test.itemsPerAttempt < test.items.length
      ? shuffle(test.items).slice(0, test.itemsPerAttempt)
      : test.items;

  return {
    id: test.id,
    title: test.title,
    description: test.description,
    testType: test.testType,
    items: items.map((i) => ({
      id: i.id,
      order: i.order,
      prompt: i.prompt,
      itemType: i.itemType,
      choices: i.choices,
      mediaKey: i.mediaKey,
      mediaUrl: resolveMediaUrl(i.mediaKey),
      points: i.points,
      // Pattern games need the sequence to display; it is shown to the player
      // anyway, so sending it does not leak the answer to a memory test.
      ...(i.itemType === 'pattern_sequence' && Array.isArray(i.correctAnswer)
        ? { sequence: (i.correctAnswer as unknown[]).map((c) => String(c).charAt(0).toUpperCase() + String(c).slice(1)) }
        : {}),
    })),
  };
}

export interface SubmitAnswerInput {
  itemId: string;
  givenAnswer: unknown;
}

// Fisher-Yates — unbiased and doesn't mutate the input array.
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const norm = (x: unknown) => String(x).trim().toLowerCase();

// The UI sends typed answers as plain strings ("Red, Blue, Green" or
// "apple table penny"), while list-type questions store their correct
// answer as an array. Turn a typed string into a list so they can be compared.
function toList(given: unknown): string[] {
  if (Array.isArray(given)) return given.map(norm).filter(Boolean);
  const text = String(given ?? '');
  const byPunctuation = text.split(/[,;\n]+/).map(norm).filter(Boolean);
  if (byPunctuation.length > 1) return byPunctuation;
  return text.split(/\s+/).map(norm).filter(Boolean);
}

/**
 * Date/time questions are marked with the sentinel correctAnswer
 * 'DYNAMIC_DATE_QUESTION' when seeded. Their real correct answer is
 * computed from the CURRENT date at scoring time, so "What day is it
 * today?" is correct every day — not only on the day the database was
 * seeded. Multiple wordings share the sentinel; each is validated against
 * the respective part of the current date below.
 */
const DYNAMIC_DATE_SENTINEL = 'DYNAMIC_DATE_QUESTION';

function dynamicCorrectAnswer(prompt: string): string[] {
  const now = new Date();
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const dayOfMonth = String(now.getDate());
  const month = now.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
  const year = String(now.getFullYear());
  const season = getSeason(now);

  const p = prompt.toLowerCase();
  if (/what (day|day of the week) is it today|what day is today|today is what day/.test(p)) return [weekday];
  if (/date/.test(p) && /day-number|day number|of this month/.test(p)) return [dayOfMonth];
  if (/what month/.test(p)) return [month];
  if (/what year/.test(p)) return [year];
  if (/season/.test(p)) return [season];
  // Fallback: accept the weekday.
  return [weekday];
}

// Meteorological seasons (northern hemisphere — matches the seed data's
// en-US formatting).
function getSeason(d: Date): string {
  const m = d.getMonth() + 1; // 1-12
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

function answersMatch(correct: unknown, given: unknown, itemType?: string): boolean {
  if (Array.isArray(correct)) {
    // Naming / short-answer questions: the array is a list of acceptable synonyms.
    if ((itemType === 'image_naming' || itemType === 'text_answer') && typeof given === 'string') {
      return correct.map(norm).includes(norm(given));
    }
    const c = correct.map(norm);
    const g = toList(given);
    if (c.length !== g.length) return false;
    // Pattern Memory: order matters (it's a sequence, e.g. a repeated
    // tap/color pattern) — must NOT be sorted before comparing, unlike
    // word-recall where any order of the recalled words counts.
    if (itemType === 'pattern_sequence') return c.every((v, i) => v === g[i]);
    const cs = [...c].sort();
    const gs = [...g].sort();
    return cs.every((v, i) => v === gs[i]);
  }
  if (typeof correct === 'string' && typeof given === 'string') {
    return norm(correct) === norm(given);
  }
  return JSON.stringify(correct) === JSON.stringify(given);
}

export async function submitAttempt(
  patientId: string,
  testId: string,
  administeredById: string,
  answers: SubmitAnswerInput[]
) {
  const test = await prisma.screeningTest.findUnique({ where: { id: testId }, include: { items: true } });
  if (!test) throw AppError.notFound('Screening test not found');

  const itemsById = new Map(test.items.map((i) => [i.id, i]));

  // The GET endpoint is stateless (nothing is stored when a test is served),
  // so validate the submission against what the test could have issued:
  // no repeated items, and exactly as many answers as one attempt contains.
  const submittedIds = answers.map((a) => a.itemId);
  if (new Set(submittedIds).size !== submittedIds.length) {
    throw AppError.badRequest('Each question can only be answered once.');
  }
  const expectedCount =
    test.itemsPerAttempt && test.itemsPerAttempt < test.items.length ? test.itemsPerAttempt : test.items.length;
  if (answers.length !== expectedCount) {
    throw AppError.badRequest(`Expected ${expectedCount} answers but received ${answers.length}.`);
  }

  let totalScore = 0;
  // Computed from the items in this attempt, not every item the test owns —
  // a test with a random pool (itemsPerAttempt) only shows a subset.
  let maxPossibleScore = 0;

  const scoredAnswers = answers.map((a) => {
    const item = itemsById.get(a.itemId);
    if (!item) throw AppError.badRequest(`Unknown item id: ${a.itemId}`);
    const effectiveCorrect =
      typeof item.correctAnswer === 'string' && item.correctAnswer === DYNAMIC_DATE_SENTINEL
        ? dynamicCorrectAnswer(item.prompt)
        : item.correctAnswer;
    const isCorrect = answersMatch(effectiveCorrect, a.givenAnswer, item.itemType);
    const pointsAwarded = isCorrect ? item.points : 0;
    totalScore += pointsAwarded;
    maxPossibleScore += item.points;
    return { itemId: a.itemId, givenAnswer: a.givenAnswer as any, isCorrect, pointsAwarded };
  });

  const scorePercentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;

  const attempt = await prisma.screeningAttempt.create({
    data: {
      patientId,
      testId,
      administeredById,
      totalScore,
      maxPossibleScore,
      scorePercentage,
      completedAt: new Date(),
      answers: { create: scoredAnswers },
    },
    include: { answers: true },
  });

  await trackEvent('screening_test_completed', administeredById, { patientId, testId, scorePercentage });

  return attempt;
}

export async function listAttemptsForPatient(patientId: string) {
  return prisma.screeningAttempt.findMany({
    where: { patientId },
    include: { test: { select: { title: true, testType: true } } },
    orderBy: { startedAt: 'desc' },
  });
}

export async function getAttempt(attemptId: string) {
  const attempt = await prisma.screeningAttempt.findUnique({
    where: { id: attemptId },
    include: { answers: { include: { item: true } }, test: true },
  });
  if (!attempt) throw AppError.notFound('Attempt not found');
  return attempt;
}
