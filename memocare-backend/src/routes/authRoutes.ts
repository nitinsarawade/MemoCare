import { Router } from 'express';
import * as authController from '../controllers/authController';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimit';
import {
  signupSchema,
  loginSchema,
  refreshSchema,
  verifyEmailSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  managementCodeSchema,
} from '../validators/authValidators';

const router = Router();

/**
 * @openapi
 * /auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new account (family, caretaker, or hospital staff)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName, role]
 *             properties:
 *               email: { type: string, format: email, example: family@example.com }
 *               password: { type: string, minLength: 8, example: Password123! }
 *               firstName: { type: string, example: Sam }
 *               lastName: { type: string, example: Chen }
 *               role: { type: string, enum: [FAMILY, CARETAKER, HOSPITAL_STAFF, MEDICAL_STORE], example: FAMILY }
 *               hospitalInviteCode:
 *                 type: string
 *                 description: Required when role is HOSPITAL_STAFF
 *                 example: DEMO-HOSPITAL-001
 *     responses:
 *       '201': { description: Account created }
 *       '400': { description: Validation error }
 *       '409': { description: Email already in use }
 */
router.post('/signup', authRateLimiter, validate(signupSchema), authController.signup);

/**
 * @openapi
 * /auth/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Verify an email address using the token emailed at signup
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string, example: <token from verification email> }
 *     responses:
 *       '200': { description: Email verified }
 *       '400': { description: Invalid or expired token }
 */
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in and receive an access + refresh token pair
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: doctor@memocare.dev }
 *               password: { type: string, example: Password123! }
 *     responses:
 *       '200': { description: Login successful, returns accessToken/refreshToken/user }
 *       '401': { description: Invalid credentials }
 *       '403': { description: Account not verified, pending approval, or suspended }
 */
router.post('/login', authRateLimiter, validate(loginSchema), authController.login);
router.post('/management/code-login', authRateLimiter, validate(managementCodeSchema), authController.loginByManagementCode);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Exchange a valid refresh token for a new token pair (rotates the refresh token)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       '200': { description: New token pair issued }
 *       '401': { description: Invalid or expired refresh token }
 */
router.post('/refresh', validate(refreshSchema), authController.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Revoke a refresh token (logs out the current session)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       '204': { description: Logged out }
 */
router.post('/logout', validate(refreshSchema), authController.logout);

/**
 * @openapi
 * /auth/password/forgot:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset email
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       '200': { description: If the email exists, a reset link has been sent }
 */
router.post(
  '/password/forgot',
  authRateLimiter,
  validate(requestPasswordResetSchema),
  authController.requestPasswordReset
);

/**
 * @openapi
 * /auth/password/reset:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using the token emailed via /auth/password/forgot
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token: { type: string }
 *               newPassword: { type: string, minLength: 8 }
 *     responses:
 *       '200': { description: Password reset }
 *       '400': { description: Invalid or expired token }
 */
router.post('/password/reset', authRateLimiter, validate(resetPasswordSchema), authController.resetPassword);

/**
 * @openapi
 * /auth/password/change:
 *   post:
 *     tags: [Auth]
 *     summary: Change password while authenticated
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 8 }
 *     responses:
 *       '200': { description: Password updated }
 *       '401': { description: Current password is incorrect }
 */
router.post('/password/change', authenticate, validate(changePasswordSchema), authController.changePassword);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the current authenticated user's profile
 *     responses:
 *       '200': { description: Current user profile }
 *   patch:
 *     tags: [Auth]
 *     summary: Update the current authenticated user's profile
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               phone: { type: string }
 *               profilePhotoKey: { type: string }
 *     responses:
 *       '200': { description: Updated profile }
 */
router.get('/me', authenticate, authController.getMe);
router.patch('/me', authenticate, validate(updateProfileSchema), authController.updateProfile);

export default router;
