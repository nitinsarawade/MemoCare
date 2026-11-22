import { Router } from 'express';
import * as screeningController from '../controllers/screeningController';
import { authenticate } from '../middleware/auth';

// Mounted at /api/v1/games — a friendlier discovery view over the same
// screening-test system, filtered to the four "mind game" types:
// Orientation, Word Recall, Guess the Thing (name-the-objects), and
// Pattern Memory. Taking a game and submitting answers reuses the
// existing generic endpoints:
//   GET  /screening-tests/{testId}                 — load questions
//   POST /patients/{patientId}/screening-attempts   — submit answers
// This router only adds the "what games are available" listing.
const router = Router();
router.use(authenticate);

/**
 * @openapi
 * /games:
 *   get:
 *     tags: [Mind Games]
 *     summary: List available mind games (Orientation, Word Recall, Guess the Thing, Pattern Memory)
 *     description: >
 *       Returns the subset of screening tests tagged as casual games.
 *       To play one, call GET /screening-tests/{testId} for its
 *       questions, then POST /patients/{patientId}/screening-attempts
 *       to submit answers and get a score — the same endpoints used
 *       for formal clinical screening tests.
 *     responses:
 *       '200': { description: List of available games }
 */
router.get('/', screeningController.listGames);

export default router;
