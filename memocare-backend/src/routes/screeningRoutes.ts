import { Router } from 'express';
import * as screeningController from '../controllers/screeningController';
import { authenticate } from '../middleware/auth';
import { requireRole, requirePatientAccess } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { submitAttemptSchema, createTestSchema } from '../validators/screeningValidators';

// Catalog of tests — mounted at /api/v1/screening-tests
export const screeningCatalogRouter = Router();
screeningCatalogRouter.use(authenticate);

/**
 * @openapi
 * /screening-tests:
 *   get:
 *     tags: [Screening]
 *     summary: List available screening tests
 *     responses:
 *       '200': { description: List of tests (without correct answers) }
 *   post:
 *     tags: [Screening]
 *     summary: Create a new screening test (hospital staff/admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, testType, items]
 *             properties:
 *               title: { type: string, example: Monthly Cognitive Screen }
 *               description: { type: string, example: Short MMSE-style screening }
 *               testType:
 *                 type: string
 *                 enum: [MMSE_STYLE, MOCA_STYLE, NAME_THE_OBJECTS, WORD_RECALL, ORIENTATION, CUSTOM]
 *                 example: MMSE_STYLE
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [order, prompt, itemType, correctAnswer]
 *                   properties:
 *                     order: { type: integer, example: 0 }
 *                     prompt: { type: string, example: What year is it? }
 *                     itemType:
 *                       type: string
 *                       enum: [text_answer, multiple_choice, image_naming, word_recall]
 *                       example: text_answer
 *                     choices: { type: array, items: { type: string } }
 *                     correctAnswer: { example: "2026" }
 *                     mediaKey: { type: string }
 *                     points: { type: integer, default: 1, example: 1 }
 *     responses:
 *       '201': { description: Test created }
 */
screeningCatalogRouter.get('/', screeningController.listTests);

/**
 * @openapi
 * /screening-tests/{testId}:
 *   get:
 *     tags: [Screening]
 *     summary: Get a screening test's items by id (without correct answers)
 *     parameters:
 *       - name: testId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: Test with items }
 */
screeningCatalogRouter.get('/all', requireRole('ADMIN', 'HOSPITAL_STAFF'), screeningController.listAllTestsForAdmin);
screeningCatalogRouter.get('/:testId', screeningController.getTest);
screeningCatalogRouter.post(
  '/',
  requireRole('ADMIN', 'HOSPITAL_STAFF'),
  validate(createTestSchema),
  screeningController.createTest
);
screeningCatalogRouter.patch(
  '/:testId/active',
  requireRole('ADMIN', 'HOSPITAL_STAFF'),
  screeningController.setTestActive
);

// Per-patient attempts — mounted at /api/v1/patients/:patientId/screening-attempts
export const patientScreeningRouter = Router({ mergeParams: true });
patientScreeningRouter.use(authenticate, requirePatientAccess());

/**
 * @openapi
 * /patients/{patientId}/screening-attempts:
 *   get:
 *     tags: [Screening]
 *     summary: List a patient's screening test attempts
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: List of attempts with scores }
 *   post:
 *     tags: [Screening]
 *     summary: Submit answers for a screening test attempt (scored server-side)
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [testId, answers]
 *             properties:
 *               testId: { type: string, format: uuid }
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [itemId, givenAnswer]
 *                   properties:
 *                     itemId: { type: string, format: uuid }
 *                     givenAnswer: { example: "2026" }
 *     responses:
 *       '201': { description: Attempt scored and saved }
 */
patientScreeningRouter.get('/', screeningController.listAttemptsForPatient);
patientScreeningRouter.post('/', validate(submitAttemptSchema), screeningController.submitAttempt);

/**
 * @openapi
 * /patients/{patientId}/screening-attempts/{attemptId}:
 *   get:
 *     tags: [Screening]
 *     summary: Get a specific screening attempt with per-item results
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: attemptId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: Attempt detail with scored answers }
 */
patientScreeningRouter.get('/:attemptId', screeningController.getAttempt);
