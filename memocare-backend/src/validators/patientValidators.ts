import { z } from 'zod';

export const createPatientSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().refine((v) => !isNaN(Date.parse(v)), 'dateOfBirth must be a valid date'),
  sex: z.string().max(30).optional(),
  emergencyContactName: z.string().max(150).optional(),
  emergencyContactPhone: z.string().max(30).optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
  relatives: z.array(z.object({ name: z.string().min(1).max(150), phone: z.string().max(30).optional(), relationship: z.string().max(80).optional() })).max(20).optional(),
  medicalHistoryNotes: z.string().max(10000).optional(),
  diagnosisStatus: z.string().max(100).optional(),
  assignedDoctorId: z.string().uuid().optional(),
});

export const updatePatientSchema = createPatientSchema.partial();

export const inviteLinkSchema = z.object({
  email: z.string().email(),
  linkRole: z.enum(['FAMILY_MEMBER', 'CARETAKER', 'ATTENDING_STAFF']),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(10),
});

export const patientIdParamSchema = z.object({
  patientId: z.string().uuid(),
});

export const dismissPatientSchema = z.object({
  reason: z.string().max(500).optional(),
});
