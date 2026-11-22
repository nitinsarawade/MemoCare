import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePatientAccess } from '../middleware/rbac';
import { documentUpload } from '../middleware/documentUpload';
import * as patientDocumentController from '../controllers/patientDocumentController';

// Mounted at /api/v1/patients/:patientId/documents — external/legacy reports
// (PDFs, lab results, scanned notes) attached to a patient, separate from
// the app's own generated media sessions and clinical report.
export const patientDocumentRouter = Router({ mergeParams: true });
patientDocumentRouter.use(authenticate, requirePatientAccess());

patientDocumentRouter.get('/', patientDocumentController.list);
patientDocumentRouter.post('/', documentUpload.single('file'), patientDocumentController.upload);
patientDocumentRouter.delete('/:documentId', patientDocumentController.remove);
