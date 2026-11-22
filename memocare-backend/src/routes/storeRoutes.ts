import { Router } from 'express';
import * as storeController from '../controllers/storeController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { upsertStoreSchema, addMedicineSchema, updateMedicineSchema, nearbyQuerySchema } from '../validators/storeValidators';

// Mounted at /api/v1/stores
const router = Router();
router.use(authenticate);

/**
 * @openapi
 * /stores/nearby:
 *   get:
 *     tags: [Medical Stores]
 *     summary: Find nearby medical stores, optionally filtered to ones stocking a specific medicine
 *     description: >
 *       Uses real great-circle distance from the given point to every
 *       store (the same math used for the location tracker's safe
 *       zones), sorted closest first.
 *     parameters:
 *       - name: latitude
 *         in: query
 *         required: true
 *         schema: { type: number, example: 40.7128 }
 *       - name: longitude
 *         in: query
 *         required: true
 *         schema: { type: number, example: -74.0060 }
 *       - name: radiusKm
 *         in: query
 *         required: false
 *         schema: { type: number, example: 20, default: 20 }
 *       - name: medicine
 *         in: query
 *         required: false
 *         schema: { type: string, example: Donepezil }
 *         description: Only return stores that stock a medicine whose name contains this text
 *     responses:
 *       '200': { description: List of nearby stores, closest first, with distanceKm and any matching medicines }
 */
router.get('/nearby', validate(nearbyQuerySchema, 'query'), storeController.findNearbyStores);

/**
 * @openapi
 * /stores/me:
 *   get:
 *     tags: [Medical Stores]
 *     summary: Get your own store profile and full medicine catalog (medical-store accounts only)
 *     responses:
 *       '200': { description: Your store }
 *       '404': { description: You have not set up a store yet }
 *   post:
 *     tags: [Medical Stores]
 *     summary: Create or update your store's profile (medical-store accounts only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [storeName, address, latitude, longitude]
 *             properties:
 *               storeName: { type: string, example: Riverside Pharmacy }
 *               address: { type: string, example: 12 Market St, Springfield }
 *               latitude: { type: number, example: 40.7128 }
 *               longitude: { type: number, example: -74.0060 }
 *               phone: { type: string, example: 555-0199 }
 *     responses:
 *       '200': { description: Store created or updated }
 */
router.get('/me', requireRole('MEDICAL_STORE'), storeController.getMyStore);
router.post('/me', requireRole('MEDICAL_STORE'), validate(upsertStoreSchema), storeController.upsertMyStore);

/**
 * @openapi
 * /stores/me/medicines:
 *   get:
 *     tags: [Medical Stores]
 *     summary: List your store's medicines
 *     responses:
 *       '200': { description: List of medicines }
 *   post:
 *     tags: [Medical Stores]
 *     summary: Add a medicine to your store (capped at 50 per store)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price]
 *             properties:
 *               name: { type: string, example: Donepezil 5mg }
 *               price: { type: number, example: 12.5 }
 *     responses:
 *       '201': { description: Medicine added }
 *       '400': { description: Store already has 50 medicines, the maximum allowed }
 */
router.get('/me/medicines', requireRole('MEDICAL_STORE'), storeController.listMyMedicines);
router.post(
  '/me/medicines',
  requireRole('MEDICAL_STORE'),
  validate(addMedicineSchema),
  storeController.addMedicine
);

/**
 * @openapi
 * /stores/me/medicines/{medicineId}:
 *   patch:
 *     tags: [Medical Stores]
 *     summary: Update a medicine's name or price
 *     parameters:
 *       - name: medicineId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               price: { type: number }
 *     responses:
 *       '200': { description: Medicine updated }
 *   delete:
 *     tags: [Medical Stores]
 *     summary: Remove a medicine from your store
 *     parameters:
 *       - name: medicineId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '204': { description: Medicine removed }
 */
router.patch(
  '/me/medicines/:medicineId',
  requireRole('MEDICAL_STORE'),
  validate(updateMedicineSchema),
  storeController.updateMedicine
);
router.delete('/me/medicines/:medicineId', requireRole('MEDICAL_STORE'), storeController.deleteMedicine);

/**
 * @openapi
 * /stores/{storeId}:
 *   get:
 *     tags: [Medical Stores]
 *     summary: Get a specific store's public profile and medicine catalog
 *     parameters:
 *       - name: storeId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: Store details }
 *       '404': { description: Store not found }
 */
router.get('/:storeId', storeController.getStoreById);

export default router;
