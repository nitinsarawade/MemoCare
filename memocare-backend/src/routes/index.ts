import { Router } from 'express';
import authRoutes from './authRoutes';
import adminRoutes from './adminRoutes';
import patientRoutes from './patientRoutes';
import { patientMediaRouter, mediaByIdRouter } from './mediaRoutes';
import { screeningCatalogRouter, patientScreeningRouter } from './screeningRoutes';
import { progressRouter } from './progressRoutes';
import { reportRouter } from './reportRoutes';
import tutorialRoutes from './tutorialRoutes';
import notificationRoutes from './notificationRoutes';
import { appointmentRouter } from './appointmentRoutes';
import localMediaRoutes from './localMediaRoutes';
import { medicationRouter } from './medicationRoutes';
import { patientLocationRouter, safeZoneRouter, publicLocationRouter } from './locationRoutes';
import gameRoutes from './gameRoutes';
import storeRoutes from './storeRoutes';
import { patientDocumentRouter } from './patientDocumentRoutes';
import hospitalRoutes from './hospitalRoutes';
import { familyMemberRouter, familyQuizRouter } from './familyQuizRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/hospitals', hospitalRoutes);
router.use('/tutorials', tutorialRoutes);
router.use('/notifications', notificationRoutes);
router.use('/screening-tests', screeningCatalogRouter);
router.use('/games', gameRoutes);
router.use('/stores', storeRoutes);

router.use('/media', mediaByIdRouter);
router.use('/media', localMediaRoutes);

// Public, token-guarded (not JWT-guarded) — see locationRoutes.ts.
router.use('/location', publicLocationRouter);

router.use('/patients', patientRoutes);
// Nested, patient-scoped sub-resources. Mounted separately (rather than
// inside patientRoutes.ts) to keep each module's routes colocated with
// its own controller/service, while still living under /patients/:id/*.
router.use('/patients/:patientId/media', patientMediaRouter);
router.use('/patients/:patientId/screening-attempts', patientScreeningRouter);
router.use('/patients/:patientId/progress', progressRouter);
router.use('/patients/:patientId/report', reportRouter);
router.use('/patients/:patientId/appointments', appointmentRouter);
router.use('/patients/:patientId/medications', medicationRouter);
router.use('/patients/:patientId/location', patientLocationRouter);
router.use('/patients/:patientId/safe-zones', safeZoneRouter);
router.use('/patients/:patientId/documents', patientDocumentRouter);
router.use('/patients/:patientId/family-members', familyMemberRouter);
router.use('/patients/:patientId/family-quiz', familyQuizRouter);

export default router;
