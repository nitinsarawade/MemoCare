import { z } from 'zod';
import { Role } from '@prisma/client';

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.nativeEnum(Role).refine((r) => r !== 'ADMIN', 'Cannot self-register as ADMIN'),
  hospitalInviteCode: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().min(3, 'Email or phone is required'),
  password: z.string().min(1),
});

export const managementCodeSchema = z.object({ code: z.string().min(1).max(100) });

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
  profession: z.string().max(150).optional(),
  yearsOfExperience: z.number().int().min(0).max(100).optional(),
  degrees: z.string().max(500).optional(),
  dateOfBirth: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), 'dateOfBirth must be a valid date')
    .optional(),
  profilePhotoKey: z.string().optional(),
});
