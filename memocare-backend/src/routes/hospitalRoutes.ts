import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import * as adminController from '../controllers/adminController';

// Mounted at /api/v1/hospitals/me — lets a HOSPITAL_STAFF member (or admin)
// view/edit the name and address of the hospital their own account belongs
// to. This is separate from /api/v1/admin/hospitals, which lets an ADMIN
// manage every hospital in the system.
const router = Router();
router.use(authenticate, requireRole('HOSPITAL_STAFF', 'ADMIN'));

router.get('/me', adminController.getMyHospital);
router.patch('/me', adminController.updateMyHospital);

export default router;
