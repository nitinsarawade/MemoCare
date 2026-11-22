import { Role, AccountStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { hashPassword, verifyPassword } from '../utils/password';
import {
  signAccessToken,
  generateRawRefreshToken,
  hashToken,
  refreshTokenExpiryDate,
  generateRandomToken,
} from '../utils/tokens';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { sendEmail, emailTemplates } from './emailService';
import { trackEvent } from './analyticsService';

export interface SignupInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  hospitalInviteCode?: string; // required when role === HOSPITAL_STAFF
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

async function issueTokenPair(userId: string, role: Role, hospitalId: string | null, meta: { ip?: string; userAgent?: string }): Promise<TokenPair> {
  const accessToken = signAccessToken({ sub: userId, role, hospitalId });
  const rawRefresh = generateRawRefreshToken();
  await prisma.refreshToken.create({
    data: {
      token: hashToken(rawRefresh),
      userId,
      expiresAt: refreshTokenExpiryDate(),
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    },
  });
  return { accessToken, refreshToken: rawRefresh };
}

export async function signup(input: SignupInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) throw AppError.conflict('An account with this email already exists');

  const passwordHash = await hashPassword(input.password);

  let hospitalId: string | undefined;
  let status: AccountStatus = 'PENDING_VERIFICATION';

  if (input.role === 'HOSPITAL_STAFF') {
    if (env.hospitalStaffInviteRequired) {
      if (!input.hospitalInviteCode) {
        throw AppError.badRequest('hospitalInviteCode is required for hospital staff signup');
      }
      const hospital = await prisma.hospital.findUnique({ where: { inviteCode: input.hospitalInviteCode } });
      if (!hospital) throw AppError.badRequest('Invalid hospital invite code');
      hospitalId = hospital.id;
    }
    // Hospital staff always require manual admin/hospital approval regardless
    // of invite code validity, in addition to email verification.
    status = 'PENDING_VERIFICATION';
  }

  if (input.role === 'ADMIN') {
    throw AppError.forbidden('Admin accounts cannot be created via public signup');
  }

  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      role: input.role,
      status,
      firstName: input.firstName,
      lastName: input.lastName,
      hospitalId,
      hospitalInviteCodeUsed: input.hospitalInviteCode,
    },
  });

  const verifyToken = generateRandomToken();
  await prisma.emailVerificationToken.create({
    data: { token: verifyToken, userId: user.id, expiresAt: new Date(Date.now() + 24 * 3600 * 1000) },
  });
  const verifyUrl = `${env.clientUrl}/verify-email?token=${verifyToken}`;
  const tmpl = emailTemplates.verifyEmail(verifyUrl);
  await sendEmail({ to: user.email, subject: tmpl.subject, html: tmpl.html });

  let finalStatus = user.status;
  if (!env.smtp.configured && !env.isTest) {
    // No real SMTP configured (local/dev setup) — nothing was actually
    // emailed, so don't leave the account stuck waiting on a link that
    // will never arrive. Skip straight to the same state a real click on
    // that link would produce, and print the link too in case it's wanted.
    logger.info({ verifyUrl }, 'SMTP not configured — auto-verifying new account. Verification link (for reference):');
    finalStatus = await autoVerifyIfUnconfiguredEmail(user.id, user.role);
  }

  await trackEvent('user_signup', user.id, { role: user.role });

  return { userId: user.id, email: user.email, role: user.role, status: finalStatus };
}

async function autoVerifyIfUnconfiguredEmail(userId: string, role: Role): Promise<AccountStatus> {
  const nextStatus: AccountStatus = role === 'HOSPITAL_STAFF' ? 'PENDING_APPROVAL' : 'ACTIVE';
  await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date(), status: nextStatus } });
  return nextStatus;
}

export async function verifyEmail(token: string) {
  const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw AppError.badRequest('Verification link is invalid or has expired');
  }
  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user) throw AppError.notFound('User not found');

  await prisma.$transaction([
    prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        // Hospital staff move to PENDING_APPROVAL after verifying email;
        // everyone else becomes ACTIVE immediately.
        status: user.role === 'HOSPITAL_STAFF' ? 'PENDING_APPROVAL' : 'ACTIVE',
      },
    }),
  ]);

  return { verified: true, requiresApproval: user.role === 'HOSPITAL_STAFF' };
}

export async function login(email: string, password: string, meta: { ip?: string; userAgent?: string }) {
  const user = email.includes('@')
    ? await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    : await prisma.user.findFirst({ where: { phone: email } });
  if (!user) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

  if (user.status === 'PENDING_VERIFICATION') {
    throw new AppError(403, 'ACCOUNT_NOT_VERIFIED', 'Please verify your email before logging in');
  }
  if (user.status === 'PENDING_APPROVAL') {
    throw new AppError(403, 'ACCOUNT_PENDING_APPROVAL', 'Your hospital staff account is awaiting admin approval');
  }
  if (user.status === 'SUSPENDED' || user.status === 'REJECTED') {
    throw new AppError(403, 'ACCOUNT_SUSPENDED', 'This account is not active. Contact support.');
  }

  const tokens = await issueTokenPair(user.id, user.role, user.hospitalId, meta);
  await trackEvent('user_login', user.id);

  return {
    ...tokens,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      hospitalId: user.hospitalId,
    },
  };
}

export async function loginByManagementCode(code: string, meta: { ip?: string; userAgent?: string }) {
  if (code !== env.hospitalManagementCode) {
    throw new AppError(401, 'INVALID_CODE', 'The hospital management code is invalid');
  }
  const user = await prisma.user.findFirst({ where: { role: 'ADMIN', status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } });
  if (!user) throw new AppError(503, 'ACCOUNT_INACTIVE', 'No active hospital management account exists');
  const tokens = await issueTokenPair(user.id, user.role, user.hospitalId, meta);
  return { ...tokens, user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName, hospitalId: user.hospitalId, phone: user.phone } };
}

export async function refreshTokens(rawRefreshToken: string, meta: { ip?: string; userAgent?: string }) {
  const hashed = hashToken(rawRefreshToken);
  const record = await prisma.refreshToken.findUnique({ where: { token: hashed }, include: { user: true } });
  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    throw new AppError(401, 'TOKEN_INVALID', 'Refresh token is invalid or has expired');
  }

  // Rotate: revoke the old token and issue a new pair (mitigates replay).
  await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });

  if (record.user.status !== 'ACTIVE') {
    throw new AppError(403, 'ACCOUNT_SUSPENDED', 'Account is not active');
  }

  return issueTokenPair(record.user.id, record.user.role, record.user.hospitalId, meta);
}

export async function logout(rawRefreshToken: string) {
  const hashed = hashToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: { token: hashed, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  // Always respond success-shaped to avoid leaking which emails exist.
  if (!user) return;

  const token = generateRandomToken();
  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt: new Date(Date.now() + 3600 * 1000) },
  });
  const resetUrl = `${env.clientUrl}/reset-password?token=${token}`;
  const tmpl = emailTemplates.passwordReset(resetUrl);
  await sendEmail({ to: user.email, subject: tmpl.subject, html: tmpl.html });
}

export async function resetPassword(token: string, newPassword: string) {
  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw AppError.badRequest('Reset link is invalid or has expired');
  }
  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    // Revoke all existing sessions on password change.
    prisma.refreshToken.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound('User not found');
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) throw new AppError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect');
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}
