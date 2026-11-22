import { z } from 'zod';

export const createHospitalSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(300).optional(),
});

export const approveStaffSchema = z.object({
  staffTitle: z.enum(['DOCTOR', 'NURSE', 'CLINICIAN', 'ADMIN_STAFF']),
});

export const listUsersQuerySchema = z.object({
  role: z.enum(['FAMILY', 'CARETAKER', 'HOSPITAL_STAFF', 'ADMIN']).optional(),
  status: z.enum(['PENDING_VERIFICATION', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'REJECTED']).optional(),
});
