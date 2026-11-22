import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePatientAccess } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { submitFamilyQuizSchema } from '../validators/familyQuizValidators';
import { photoUpload } from '../middleware/photoUpload';
import * as familyQuizController from '../controllers/familyQuizController';

// Mounted at /api/v1/patients/:patientId/family-members and
// /api/v1/patients/:patientId/family-quiz — up to 10 named family-member
// photos per patient, plus a "who is this?" recognition quiz. Anyone with
// access to the patient (family, caretaker, or hospital staff) can manage
// the photos and take the quiz; scoring happens server-side, same trust
// boundary as screening tests.

export const familyMemberRouter = Router({ mergeParams: true });
familyMemberRouter.use(authenticate, requirePatientAccess());
familyMemberRouter.get('/', familyQuizController.listMembers);
familyMemberRouter.post('/', photoUpload.single('file'), familyQuizController.addMember);
familyMemberRouter.delete('/:memberId', familyQuizController.removeMember);

export const familyQuizRouter = Router({ mergeParams: true });
familyQuizRouter.use(authenticate, requirePatientAccess());
familyQuizRouter.post('/new', familyQuizController.startQuiz);
familyQuizRouter.post('/:attemptId/submit', validate(submitFamilyQuizSchema), familyQuizController.submitQuiz);
familyQuizRouter.get('/attempts', familyQuizController.listAttempts);
familyQuizRouter.get('/attempts/:attemptId', familyQuizController.getAttempt);
